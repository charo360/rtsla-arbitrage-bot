import { Connection, PublicKey, VersionedTransaction, Keypair } from '@solana/web3.js';
import { createJupiterApiClient, QuoteGetRequest, QuoteResponse, SwapResponse } from '@jup-ag/api';
import { logger } from './logger';
import { config } from '../config/config';

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  marketInfos: any[];
  otherAmountThreshold: string;
}

export interface SwapResult {
  success: boolean;
  signature?: string;
  inputAmount: number;
  outputAmount: number;
  error?: string;
}

export class JupiterClient {
  private connection: Connection;
  private jupiterApi: ReturnType<typeof createJupiterApiClient>;
  private usdcMint: PublicKey;

  constructor(connection: Connection) {
    this.connection = connection;
    this.jupiterApi = createJupiterApiClient();
    this.usdcMint = config.tokens.usdc;
  }

  /**
   * Get quote for swapping USDC to a token
   */
  async getQuote(
    outputMint: PublicKey,
    amountUsdc: number,
    slippageBps: number = 50 // 0.5% default
  ): Promise<QuoteResponse | null> {
    try {
      const amountInLamports = Math.floor(amountUsdc * 1_000_000); // USDC has 6 decimals

      const quoteRequest: QuoteGetRequest = {
        inputMint: this.usdcMint.toBase58(),
        outputMint: outputMint.toBase58(),
        amount: amountInLamports,
        slippageBps: slippageBps,
        onlyDirectRoutes: false,
        asLegacyTransaction: false,
      };

      logger.debug(`Requesting Jupiter quote: ${amountUsdc} USDC → ${outputMint.toBase58().slice(0, 8)}...`);

      const quote = await this.jupiterApi.quoteGet(quoteRequest);

      if (!quote) {
        logger.warn('No quote received from Jupiter');
        return null;
      }

      logger.debug(`Quote received: ${quote.outAmount} tokens, impact: ${quote.priceImpactPct}%`);

      return quote;
    } catch (error: any) {
      logger.error(`Error getting Jupiter quote: ${error.message}`);
      return null;
    }
  }

  /**
   * Get quote for swapping a token to USDC (reverse)
   */
  async getQuoteReverse(
    inputMint: PublicKey,
    amountTokens: number,
    tokenDecimals: number = 6,
    slippageBps: number = 50
  ): Promise<QuoteResponse | null> {
    try {
      const amountInLamports = Math.floor(amountTokens * Math.pow(10, tokenDecimals));

      const quoteRequest: QuoteGetRequest = {
        inputMint: inputMint.toBase58(),
        outputMint: this.usdcMint.toBase58(),
        amount: amountInLamports,
        slippageBps: slippageBps,
        onlyDirectRoutes: false,
        asLegacyTransaction: false,
      };

      logger.debug(`Requesting Jupiter reverse quote: ${amountTokens} tokens → USDC`);

      const quote = await this.jupiterApi.quoteGet(quoteRequest);

      if (!quote) {
        logger.warn('No reverse quote received from Jupiter');
        return null;
      }

      logger.debug(`Reverse quote received: ${quote.outAmount} USDC`);

      return quote;
    } catch (error: any) {
      logger.error(`Error getting Jupiter reverse quote: ${error.message}`);
      return null;
    }
  }

  /**
   * Get current price for a token in USDC
   */
  async getTokenPrice(tokenMint: PublicKey): Promise<number | null> {
    try {
      // Get quote for buying $100 worth of the token to get accurate price
      const quote = await this.getQuote(tokenMint, 100, 50);

      if (!quote) {
        return null;
      }

      // Calculate price per token
      // inAmount = USDC spent (in lamports, 6 decimals)
      // outAmount = tokens received (in lamports, 6 decimals)
      const usdcSpent = parseInt(quote.inAmount) / 1_000_000;
      const tokensReceived = parseInt(quote.outAmount) / 1_000_000;
      
      if (tokensReceived === 0) {
        return null;
      }
      
      const pricePerToken = usdcSpent / tokensReceived;

      logger.debug(`Jupiter price for ${tokenMint.toBase58().slice(0, 8)}...: $${pricePerToken.toFixed(2)}`);

      return pricePerToken;
    } catch (error: any) {
      logger.error(`Error getting token price: ${error.message}`);
      return null;
    }
  }

  /**
   * Execute a swap
   */
  async executeSwap(
    quote: QuoteResponse,
    userKeypair: Keypair,
    priorityFee: number = 0.0001 // SOL
  ): Promise<SwapResult> {
    try {
      logger.info('🔄 Building swap transaction...');

      // Get swap transaction
      const swapResponse = await this.jupiterApi.swapPost({
        swapRequest: {
          quoteResponse: quote,
          userPublicKey: userKeypair.publicKey.toBase58(),
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: {
            priorityLevelWithMaxLamports: {
              maxLamports: Math.floor(priorityFee * 1_000_000_000),
              priorityLevel: 'high'
            }
          },
        },
      });

      if (!swapResponse || !swapResponse.swapTransaction) {
        throw new Error('Failed to get swap transaction from Jupiter');
      }

      logger.info('📝 Signing and sending transaction...');

      // Deserialize the transaction
      const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // Sign the transaction
      transaction.sign([userKeypair]);

      // Send transaction
      const rawTransaction = transaction.serialize();
      const txid = await this.connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false,
        maxRetries: 3,
      });

      logger.info(`📤 Transaction sent: ${txid}`);
      logger.info('⏳ Waiting for confirmation...');

      // Confirm transaction
      const confirmation = await this.connection.confirmTransaction(txid, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      logger.info(`✅ Transaction confirmed: ${txid}`);

      // Calculate amounts
      const inputAmount = parseInt(quote.inAmount) / 1_000_000; // USDC decimals
      const outputAmount = parseInt(quote.outAmount) / 1_000_000; // Assuming 6 decimals

      return {
        success: true,
        signature: txid,
        inputAmount,
        outputAmount,
      };
    } catch (error: any) {
      logger.error(`❌ Swap execution failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        inputAmount: 0,
        outputAmount: 0,
      };
    }
  }

  /**
   * Execute a complete arbitrage trade
   */
  async executeArbitrageTrade(
    tokenMint: PublicKey,
    amountUsdc: number,
    userKeypair: Keypair,
    direction: 'BUY' | 'SELL'
  ): Promise<SwapResult> {
    try {
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`🎯 EXECUTING ARBITRAGE TRADE`);
      logger.info(`${'='.repeat(80)}`);
      logger.info(`Direction: ${direction}`);
      logger.info(`Token: ${tokenMint.toBase58()}`);
      logger.info(`Amount: $${amountUsdc} USDC`);
      logger.info(`${'='.repeat(80)}\n`);

      let quote: QuoteResponse | null;

      if (direction === 'BUY') {
        // Buy token with USDC
        quote = await this.getQuote(tokenMint, amountUsdc);
      } else {
        // Sell token for USDC
        // First get how many tokens we have
        const tokenAmount = amountUsdc; // Placeholder - should get actual token balance
        quote = await this.getQuoteReverse(tokenMint, tokenAmount);
      }

      if (!quote) {
        throw new Error('Failed to get quote from Jupiter');
      }

      // Check price impact
      const priceImpact = parseFloat(quote.priceImpactPct);
      if (priceImpact > 2.0) {
        logger.warn(`⚠️  High price impact: ${priceImpact.toFixed(2)}%`);
      }

      // Execute swap
      const result = await this.executeSwap(quote, userKeypair);

      return result;
    } catch (error: any) {
      logger.error(`Arbitrage trade failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        inputAmount: 0,
        outputAmount: 0,
      };
    }
  }

  /**
   * Get best route info for a swap
   */
  async getRouteInfo(quote: QuoteResponse): Promise<string> {
    try {
      const routes = quote.routePlan || [];
      const routeNames = routes.map((r: any) => r.swapInfo?.label || 'Unknown').join(' → ');
      return routeNames || 'Direct';
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Check if a token is supported by Jupiter
   */
  async isTokenSupported(tokenMint: PublicKey): Promise<boolean> {
    try {
      const quote = await this.getQuote(tokenMint, 1);
      return quote !== null;
    } catch (error) {
      return false;
    }
  }
}
