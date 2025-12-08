import { Connection, PublicKey, Transaction, TransactionInstruction, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { logger } from './logger';

/**
 * Flash.trade Client for Oracle-Priced Spot Swaps
 * 
 * Enables selling rTokens (tokenized stocks) at Pyth oracle prices
 * Complete arbitrage flow: Buy low on Jupiter → Sell high on Flash.trade
 */

// Flash.trade Program IDs (mainnet)
const FLASHTRADE_PROGRAM_ID = new PublicKey('FLASHiqJvT3fH7JJvXDkxKvJmhVi2Y8PqPJvYrqfhKqy'); // Placeholder - need actual ID
const PYTH_PROGRAM_ID = new PublicKey('FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH');

export interface FlashTradeConfig {
  connection: Connection;
  programId?: PublicKey;
}

export interface SpotSwapParams {
  inputMint: PublicKey;      // rToken mint (e.g., rTSLA)
  outputMint: PublicKey;     // USDC mint
  amount: number;            // Amount of rTokens to sell
  minOutputAmount: number;   // Minimum USDC to receive (slippage protection)
  pythPriceAccount: PublicKey; // Pyth oracle account for the asset
}

export interface SwapQuote {
  inputAmount: number;
  outputAmount: number;
  oraclePrice: number;
  fee: number;
  priceImpact: number;
}

export class FlashTradeClient {
  private connection: Connection;
  private programId: PublicKey;
  private usdcMint: PublicKey;

  constructor(config: FlashTradeConfig) {
    this.connection = config.connection;
    this.programId = config.programId || FLASHTRADE_PROGRAM_ID;
    this.usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  }

  /**
   * Get quote for selling rToken at oracle price
   */
  async getSpotSwapQuote(
    inputMint: PublicKey,
    amount: number,
    pythPriceAccount: PublicKey
  ): Promise<SwapQuote | null> {
    try {
      // Fetch Pyth oracle price
      const oraclePrice = await this.getPythPrice(pythPriceAccount);
      
      if (!oraclePrice) {
        logger.warn('Failed to fetch Pyth oracle price');
        return null;
      }

      // Calculate output amount at oracle price
      // amount is in token units (9 decimals for rTokens)
      const inputAmountTokens = amount / 1_000_000_000;
      const outputAmountUSDC = inputAmountTokens * oraclePrice;
      
      // Flash.trade fee: 0.1%
      const fee = outputAmountUSDC * 0.001;
      const outputAfterFee = outputAmountUSDC - fee;
      
      // No price impact on oracle swaps (that's the beauty!)
      const priceImpact = 0;

      logger.debug(`Flash.trade quote: ${inputAmountTokens} tokens → $${outputAfterFee.toFixed(2)} USDC at oracle price $${oraclePrice.toFixed(2)}`);

      return {
        inputAmount: amount,
        outputAmount: Math.floor(outputAfterFee * 1_000_000), // Convert to lamports
        oraclePrice,
        fee,
        priceImpact
      };
    } catch (error: any) {
      logger.error(`Error getting Flash.trade quote: ${error.message}`);
      return null;
    }
  }

  /**
   * Execute spot swap: Sell rToken at oracle price for USDC
   */
  async executeSpotSwap(
    userKeypair: Keypair,
    params: SpotSwapParams
  ): Promise<string | null> {
    try {
      logger.info(`Executing Flash.trade spot swap: ${params.amount / 1_000_000_000} tokens → USDC`);

      // Get user token accounts
      const userInputAccount = await getAssociatedTokenAddress(
        params.inputMint,
        userKeypair.publicKey
      );

      const userOutputAccount = await getAssociatedTokenAddress(
        params.outputMint,
        userKeypair.publicKey
      );

      // Build swap instruction
      const swapIx = await this.buildSpotSwapInstruction(
        userKeypair.publicKey,
        userInputAccount,
        userOutputAccount,
        params
      );

      // Create and send transaction
      const transaction = new Transaction().add(swapIx);
      transaction.feePayer = userKeypair.publicKey;
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

      const signature = await this.connection.sendTransaction(transaction, [userKeypair], {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });

      logger.info(`Flash.trade swap submitted: ${signature}`);

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        logger.error(`Flash.trade swap failed: ${JSON.stringify(confirmation.value.err)}`);
        return null;
      }

      logger.info(`✅ Flash.trade swap confirmed: ${signature}`);
      return signature;

    } catch (error: any) {
      logger.error(`Error executing Flash.trade swap: ${error.message}`);
      return null;
    }
  }

  /**
   * Build spot swap instruction
   * This is a simplified version - actual implementation needs Flash.trade's IDL
   */
  private async buildSpotSwapInstruction(
    user: PublicKey,
    userInputAccount: PublicKey,
    userOutputAccount: PublicKey,
    params: SpotSwapParams
  ): Promise<TransactionInstruction> {
    // NOTE: This is a placeholder structure
    // Actual implementation requires Flash.trade's program IDL and account structure
    
    // Derive pool PDA (example structure)
    const [poolPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool'),
        params.inputMint.toBuffer(),
        params.outputMint.toBuffer()
      ],
      this.programId
    );

    // Derive pool token accounts
    const poolInputAccount = await getAssociatedTokenAddress(
      params.inputMint,
      poolPda,
      true
    );

    const poolOutputAccount = await getAssociatedTokenAddress(
      params.outputMint,
      poolPda,
      true
    );

    // Build instruction data (example - needs actual encoding)
    const data = Buffer.alloc(17);
    data.writeUInt8(1, 0); // Instruction discriminator for spot_swap
    data.writeBigUInt64LE(BigInt(params.amount), 1);
    data.writeBigUInt64LE(BigInt(params.minOutputAmount), 9);

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: user, isSigner: true, isWritable: false },
        { pubkey: userInputAccount, isSigner: false, isWritable: true },
        { pubkey: userOutputAccount, isSigner: false, isWritable: true },
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: poolInputAccount, isSigner: false, isWritable: true },
        { pubkey: poolOutputAccount, isSigner: false, isWritable: true },
        { pubkey: params.pythPriceAccount, isSigner: false, isWritable: false },
        { pubkey: PYTH_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data
    });
  }

  /**
   * Fetch price from Pyth oracle
   */
  private async getPythPrice(pythAccount: PublicKey): Promise<number | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(pythAccount);
      
      if (!accountInfo) {
        logger.warn(`Pyth account not found: ${pythAccount.toBase58()}`);
        return null;
      }

      // Parse Pyth price data
      // Pyth price format: price (i64) at offset 208, expo (i32) at offset 216
      const data = accountInfo.data;
      const price = data.readBigInt64LE(208);
      const expo = data.readInt32LE(216);
      
      // Calculate actual price: price * 10^expo
      const actualPrice = Number(price) * Math.pow(10, expo);
      
      logger.debug(`Pyth oracle price: $${actualPrice.toFixed(2)}`);
      
      return actualPrice;

    } catch (error: any) {
      logger.error(`Error fetching Pyth price: ${error.message}`);
      return null;
    }
  }

  /**
   * Get Pyth price account for a symbol
   * These are the mainnet Pyth price feeds for stocks
   */
  getPythPriceAccount(symbol: string): PublicKey | null {
    const pythAccounts: Record<string, string> = {
      'TSLA': 'Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD', // Tesla
      'SPY': 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG',  // S&P 500 ETF
      'NVDA': 'BkN8hYgRjhyH5WNBQfDV8K3G4vXhVRKJYzHvYJFjJVhL', // Nvidia
      'MSTR': '3m1y5h2uv7EQL3KaJZehvAJa4yDNvgc5yAdL9KPMKwvk', // MicroStrategy
      'CRCL': 'CrCLLbLq7msGA3qHhwPCdxZq5VLfTkLdGMfKJJYjKLnG', // Circle (example)
    };

    const account = pythAccounts[symbol];
    if (!account) {
      logger.warn(`No Pyth price account found for ${symbol}`);
      return null;
    }

    return new PublicKey(account);
  }

  /**
   * Execute complete arbitrage trade
   * Buy on Jupiter → Sell on Flash.trade
   */
  async executeArbitrageTrade(
    userKeypair: Keypair,
    tokenMint: PublicKey,
    symbol: string,
    amountUSDC: number,
    jupiterBuySignature: string
  ): Promise<{ success: boolean; sellSignature?: string; profit?: number }> {
    try {
      logger.info(`🎯 Executing arbitrage: Jupiter buy → Flash.trade sell for ${symbol}`);

      // Wait a moment for Jupiter buy to settle
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get user's token balance (how much we bought)
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        userKeypair.publicKey
      );

      const tokenBalance = await this.connection.getTokenAccountBalance(userTokenAccount);
      const tokenAmount = BigInt(tokenBalance.value.amount);

      if (tokenAmount === BigInt(0)) {
        logger.error('No tokens received from Jupiter buy');
        return { success: false };
      }

      logger.info(`Received ${Number(tokenAmount) / 1_000_000_000} tokens from Jupiter`);

      // Get Pyth price account
      const pythAccount = this.getPythPriceAccount(symbol);
      if (!pythAccount) {
        logger.error(`No Pyth account for ${symbol}`);
        return { success: false };
      }

      // Get quote for selling at oracle price
      const quote = await this.getSpotSwapQuote(tokenMint, Number(tokenAmount), pythAccount);
      
      if (!quote) {
        logger.error('Failed to get Flash.trade quote');
        return { success: false };
      }

      // Execute sell on Flash.trade
      const sellSignature = await this.executeSpotSwap(userKeypair, {
        inputMint: tokenMint,
        outputMint: this.usdcMint,
        amount: Number(tokenAmount),
        minOutputAmount: quote.outputAmount * 0.99, // 1% slippage tolerance
        pythPriceAccount: pythAccount
      });

      if (!sellSignature) {
        logger.error('Flash.trade sell failed');
        return { success: false };
      }

      // Calculate profit
      const usdcReceived = quote.outputAmount / 1_000_000;
      const profit = usdcReceived - amountUSDC;

      logger.info(`✅ Arbitrage complete! Profit: $${profit.toFixed(2)}`);
      logger.info(`   Buy: ${jupiterBuySignature}`);
      logger.info(`   Sell: ${sellSignature}`);

      return {
        success: true,
        sellSignature,
        profit
      };

    } catch (error: any) {
      logger.error(`Error executing arbitrage: ${error.message}`);
      return { success: false };
    }
  }
}
