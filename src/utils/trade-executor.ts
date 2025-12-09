import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { JupiterClient } from './jupiter-client';
import { FlashTradeClient } from './flashtrade-client';
import { WalletManager } from './wallet-manager';
import { logger } from './logger';
import { config } from '../config/config';
import { executeFlashTradeSwap, getPythFeedIdForToken } from './flashtrade-swap';
import BN from 'bn.js';

// Token program IDs for balance checking
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

export interface TradeParams {
  token: string;
  tokenMint: PublicKey;
  direction: 'BUY_REMORA' | 'SELL_REMORA';
  amount: number;
  expectedProfit: number;
  remoraPrice: number;
  oraclePrice: number;
  spreadPercent: number;
}

export interface TradeResult {
  success: boolean;
  signature?: string;
  profit?: number;
  error?: string;
  walletUsed?: string;
}

export class TradeExecutor {
  private connection: Connection;
  private jupiterClient: JupiterClient;
  private flashTradeClient: FlashTradeClient;
  private walletManager: WalletManager;
  private TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

  constructor(connection: Connection, walletManager: WalletManager) {
    this.connection = connection;
    this.walletManager = walletManager;
    this.jupiterClient = new JupiterClient(connection);
    this.flashTradeClient = new FlashTradeClient({ connection });
  }

  /**
   * Get token balance for a wallet (supports both SPL Token and Token-2022)
   */
  private async getTokenBalance(owner: PublicKey, tokenMint: PublicKey): Promise<number | null> {
    try {
      // Try both token programs (rTokens use Token-2022)
      const [splAccounts, token2022Accounts] = await Promise.all([
        this.connection.getTokenAccountsByOwner(owner, { mint: tokenMint, programId: TOKEN_PROGRAM_ID }),
        this.connection.getTokenAccountsByOwner(owner, { mint: tokenMint, programId: TOKEN_2022_PROGRAM_ID })
      ]);

      const allAccounts = [...splAccounts.value, ...token2022Accounts.value];

      if (allAccounts.length === 0) {
        logger.debug(`No token accounts found for ${tokenMint.toBase58()}`);
        return null;
      }

      // Parse the token account data to get balance
      // Token account data: amount is at offset 64, 8 bytes (u64)
      let totalBalance = BigInt(0);
      for (const account of allAccounts) {
        const data = account.account.data;
        const amount = data.readBigUInt64LE(64);
        totalBalance += amount;
      }

      // rTokens use 9 decimals
      const balance = Number(totalBalance) / 1_000_000_000;
      logger.debug(`Token balance for ${tokenMint.toBase58().slice(0, 8)}...: ${balance}`);
      return balance;
    } catch (error: any) {
      logger.error(`Error getting token balance: ${error.message}`);
      return null;
    }
  }

  /**
   * Execute an arbitrage trade
   */
  async executeTrade(params: TradeParams): Promise<TradeResult> {
    try {
      // Select wallet for this trade
      const wallet = await this.walletManager.selectWallet();
      
      if (!wallet) {
        return {
          success: false,
          error: 'No wallet available for trading'
        };
      }

      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`🚀 EXECUTING TRADE`);
      logger.info(`${'='.repeat(80)}`);
      logger.info(`Token: ${params.token}`);
      logger.info(`Wallet: ${wallet.name} (${wallet.publicKey.toBase58().slice(0, 8)}...)`);
      logger.info(`Direction: ${params.direction}`);
      logger.info(`Amount: $${params.amount} USDC`);
      logger.info(`Spread: ${params.spreadPercent.toFixed(2)}%`);
      logger.info(`Expected Profit: $${params.expectedProfit.toFixed(2)}`);
      logger.info(`${'='.repeat(80)}\n`);

      // Check if wallet has sufficient balance
      const hasInsufficientBalance = await this.walletManager.hasInsufficientBalance(
        wallet.publicKey.toBase58(),
        params.amount
      );

      if (hasInsufficientBalance) {
        logger.warn(`⚠️  Wallet ${wallet.name} has insufficient balance, skipping trade`);
        return {
          success: false,
          error: 'Insufficient balance',
          walletUsed: wallet.name
        };
      }

      // Validate trade parameters
      if (params.spreadPercent < config.minSpreadPercent) {
        logger.warn(`⚠️  Spread ${params.spreadPercent.toFixed(2)}% below minimum ${config.minSpreadPercent}%`);
        return {
          success: false,
          error: 'Spread below minimum threshold',
          walletUsed: wallet.name
        };
      }

      if (params.expectedProfit < config.minProfitThreshold) {
        logger.warn(`⚠️  Profit $${params.expectedProfit.toFixed(2)} below minimum $${config.minProfitThreshold}`);
        return {
          success: false,
          error: 'Profit below minimum threshold',
          walletUsed: wallet.name
        };
      }

      // Execute the trade (placeholder - implement actual trading logic)
      const result = await this.executeTradeTransaction(wallet.keypair, params);

      // Record trade in wallet manager
      this.walletManager.recordTrade(
        wallet.publicKey.toBase58(),
        result.success,
        result.profit || 0
      );

      if (result.success) {
        logger.info(`✅ Trade executed successfully!`);
        logger.info(`   Signature: ${result.signature}`);
        logger.info(`   Actual Profit: $${result.profit?.toFixed(2)}`);
        logger.info(`   Wallet: ${wallet.name}`);
      } else {
        logger.error(`❌ Trade failed: ${result.error}`);
      }

      return {
        ...result,
        walletUsed: wallet.name
      };

    } catch (error: any) {
      logger.error(`Trade execution error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute the actual blockchain transaction using Jupiter
   */
  private async executeTradeTransaction(
    keypair: any,
    params: TradeParams
  ): Promise<TradeResult> {
    try {
      logger.info('📝 Building transaction with Jupiter...');
      
      // Simulated result for monitoring mode
      if (!config.autoExecute) {
        logger.info('ℹ️  AUTO_EXECUTE is disabled - trade simulated only');
        return {
          success: true,
          signature: 'SIMULATED_' + Date.now(),
          profit: params.expectedProfit
        };
      }

      // Real trading with Jupiter
      logger.info('🚀 Executing real trade via Jupiter...');

      // Get quote from Jupiter
      const slippageBps = Math.floor(config.maxSlippagePercent * 100); // Convert % to basis points
      const quote = await this.jupiterClient.getQuote(
        params.tokenMint,
        params.amount,
        slippageBps
      );

      if (!quote) {
        throw new Error('Failed to get quote from Jupiter');
      }

      // Log quote details
      const outputAmount = parseInt(quote.outAmount) / 1_000_000;
      const priceImpact = parseFloat(quote.priceImpactPct);
      
      logger.info(`📊 Jupiter Quote:`);
      logger.info(`   Input: ${params.amount} USDC`);
      logger.info(`   Output: ${outputAmount.toFixed(6)} tokens`);
      logger.info(`   Price Impact: ${priceImpact.toFixed(2)}%`);

      // Check price impact
      if (priceImpact > 2.0) {
        logger.warn(`⚠️  High price impact: ${priceImpact.toFixed(2)}% - trade may not be profitable`);
      }

      // Execute swap on Jupiter (BUY side)
      const swapResult = await this.jupiterClient.executeSwap(quote, keypair);

      if (!swapResult.success) {
        throw new Error(swapResult.error || 'Jupiter swap failed');
      }

      logger.info(`✅ Jupiter buy executed!`);
      logger.info(`   Signature: ${swapResult.signature}`);
      logger.info(`   Input: ${swapResult.inputAmount} USDC`);
      logger.info(`   Output: ${swapResult.outputAmount} tokens`);

      // REAL CROSS-PLATFORM ARBITRAGE
      // Buy on Jupiter (cheap DEX price) → Sell on Flash Trade (oracle price)
      if (params.direction === 'BUY_REMORA') {
        const tokensReceived = swapResult.outputAmount;
        const buyPrice = swapResult.inputAmount / tokensReceived;

        logger.info(`✅ Jupiter buy complete: ${tokensReceived.toFixed(6)} tokens at $${buyPrice.toFixed(2)}`);
        logger.info(`📊 Oracle price: $${params.oraclePrice.toFixed(2)}`);
        logger.info(`💡 Arbitrage opportunity: Buy at $${buyPrice.toFixed(2)} → Sell at $${params.oraclePrice.toFixed(2)}`);

        // CROSS-PLATFORM ARBITRAGE STRATEGY:
        // Buy low on Jupiter → Sell at oracle price on Flash Trade
        
        logger.info(`💡 Arbitrage Strategy: Buy on Jupiter → Sell on Flash Trade`);
        logger.info(`   Jupiter buy price: $${buyPrice.toFixed(2)}`);
        logger.info(`   Flash Trade oracle: $${params.oraclePrice.toFixed(2)}`);
        logger.info(`   Expected spread: ${((params.oraclePrice - buyPrice) / buyPrice * 100).toFixed(2)}%`);

        // Wait for transaction to settle
        logger.info(`⏳ Waiting 5s for transaction to settle...`);
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Get Pyth feed ID for this token
        const pythFeedId = getPythFeedIdForToken(params.token);
        if (!pythFeedId) {
          logger.error(`❌ No Pyth feed ID for ${params.token}`);
          logger.info(`💡 Tokens held in wallet - sell manually`);
          return {
            success: false,
            signature: swapResult.signature,
            error: 'No Pyth feed ID',
            profit: 0
          };
        }

        // Execute Flash Trade swap
        logger.info(`🔄 Selling ${tokensReceived.toFixed(6)} tokens on Flash Trade...`);
        const tokenAmountLamports = new BN(Math.floor(tokensReceived * 1_000_000_000));
        const minOutputLamports = new BN(Math.floor((tokensReceived * params.oraclePrice * 0.99) * 1_000_000)); // 1% slippage
        
        const sellResult = await executeFlashTradeSwap({
          connection: this.connection,
          userKeypair: keypair,
          inputMint: params.tokenMint,
          inputAmount: tokenAmountLamports,
          pythPriceFeedId: pythFeedId,
          minOutputAmount: minOutputLamports,
        });

        if (!sellResult.success) {
          logger.error(`⚠️  Sell failed: ${sellResult.error}`);
          logger.info(`💡 Tokens held in wallet. Options:`);
          logger.info(`   1. Sell manually on Jupiter: https://jup.ag/`);
          logger.info(`   2. Sell on Flash Trade: https://www.flash.trade/USDC-${params.token.replace(/r$/i, '')}r`);
          logger.info(`   3. Hold and wait for better price`);
          return {
            success: false,
            signature: swapResult.signature,
            error: `Sell failed: ${sellResult.error}`,
            profit: 0
          };
        }

        // Calculate actual profit
        const usdcReceived = sellResult.outputAmount || 0;
        const usdcSpent = swapResult.inputAmount;
        const actualProfit = usdcReceived - usdcSpent;
        const profitPercent = (actualProfit / usdcSpent) * 100;

        logger.info(`✅ ARBITRAGE COMPLETE!`);
        logger.info(`   Buy:  ${swapResult.signature}`);
        logger.info(`   Sell: ${sellResult.signature}`);
        logger.info(`   📊 Results:`);
        logger.info(`      USDC In:  $${usdcSpent.toFixed(2)}`);
        logger.info(`      USDC Out: $${usdcReceived.toFixed(2)}`);
        logger.info(`      💰 Profit: $${actualProfit.toFixed(2)} (${profitPercent.toFixed(2)}%)`);

        // Log profitability analysis
        if (actualProfit > 0) {
          logger.info(`   ✅ PROFITABLE TRADE!`);
        } else if (actualProfit > -0.10) {
          logger.warn(`   ⚠️  Small loss (likely fees) - consider larger trade sizes`);
        } else {
          logger.error(`   ❌ LOSS - price moved against us`);
        }

        return {
          success: true,
          signature: `${swapResult.signature}|${sellResult.signature}`,
          profit: actualProfit
        };
      } else {
        // SELL_REMORA: Jupiter price > Oracle price
        // Strategy: Buy on Flash Trade (oracle) → Sell on Jupiter (higher)
        logger.warn('⚠️  SELL_REMORA (reverse arbitrage) not yet implemented');
        logger.info(`💡 Opportunity: Jupiter price ($${params.remoraPrice.toFixed(2)}) > Oracle ($${params.oraclePrice.toFixed(2)})`);
        logger.info(`   Strategy: Buy on Flash Trade → Sell on Jupiter`);
        return {
          success: false,
          error: 'Reverse arbitrage not implemented'
        };
      }

    } catch (error: any) {
      logger.error(`Transaction error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Batch execute multiple trades
   */
  async executeBatchTrades(trades: TradeParams[]): Promise<TradeResult[]> {
    logger.info(`\n🔄 Executing ${trades.length} trades in batch...\n`);
    
    const results: TradeResult[] = [];
    
    for (const trade of trades) {
      const result = await this.executeTrade(trade);
      results.push(result);
      
      // Small delay between trades
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalProfit = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + (r.profit || 0), 0);
    
    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`📊 BATCH TRADE SUMMARY`);
    logger.info(`${'='.repeat(80)}`);
    logger.info(`Total Trades: ${trades.length}`);
    logger.info(`Successful: ${successful}`);
    logger.info(`Failed: ${failed}`);
    logger.info(`Success Rate: ${((successful / trades.length) * 100).toFixed(1)}%`);
    logger.info(`Total Profit: $${totalProfit.toFixed(2)}`);
    logger.info(`${'='.repeat(80)}\n`);
    
    return results;
  }

  /**
   * Get wallet manager instance
   */
  getWalletManager(): WalletManager {
    return this.walletManager;
  }
}
