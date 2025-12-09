import { Connection, PublicKey, Transaction, TransactionInstruction, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { logger } from './logger';
import { PYTH_CONFIG, getFeedId } from '../config/pyth-config';
import axios from 'axios';

/**
 * Flash.trade Client for Oracle-Priced Spot Swaps
 * 
 * Enables selling rTokens (tokenized stocks) at Pyth oracle prices
 * Complete arbitrage flow: Buy low on Jupiter → Sell high on Flash.trade
 */

// Flash.trade Program IDs (mainnet)
const FLASHTRADE_PROGRAM_ID = new PublicKey('FLASH6Lo6h3iasJKWDs2F8TkW2UKf3s15C8PMGuVfgBn'); // Confirmed mainnet program
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
   * Get Pyth price feed ID for a token symbol
   * Uses the new Pyth Hermes API configuration
   */
  getPythFeedId(symbol: string): string | null {
    try {
      // Normalize symbol to match config (e.g., 'MSTRr' -> 'rMSTR')
      let normalizedSymbol = symbol;
      if (!symbol.startsWith('r')) {
        normalizedSymbol = 'r' + symbol;
      }
      
      const feedId = getFeedId(normalizedSymbol);
      logger.debug(`Pyth feed ID for ${symbol}: ${feedId}`);
      return feedId;
    } catch (error: any) {
      logger.warn(`No Pyth feed ID found for ${symbol}: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch price from Pyth Hermes API
   * This is the new recommended way to get Pyth prices
   */
  async getPythPriceFromHermes(symbol: string): Promise<number | null> {
    try {
      const feedId = this.getPythFeedId(symbol);
      if (!feedId) {
        return null;
      }

      const url = `${PYTH_CONFIG.hermesUrl}/api/latest_price_feeds?ids[]=${feedId}`;
      const response = await axios.get(url);
      
      if (!response.data || response.data.length === 0) {
        logger.warn(`No price data returned from Hermes for ${symbol}`);
        return null;
      }

      const priceData = response.data[0];
      const price = parseFloat(priceData.price.price);
      const expo = priceData.price.expo;
      const actualPrice = price * Math.pow(10, expo);
      
      logger.debug(`Pyth Hermes price for ${symbol}: $${actualPrice.toFixed(2)}`);
      return actualPrice;
    } catch (error: any) {
      logger.error(`Error fetching Pyth price from Hermes for ${symbol}: ${error.message}`);
      return null;
    }
  }

  /**
   * Legacy method - kept for backwards compatibility
   * Now returns null since we use Hermes API instead
   */
  getPythPriceAccount(symbol: string): PublicKey | null {
    logger.warn(`getPythPriceAccount is deprecated - use getPythPriceFromHermes instead`);
    return null;
  }

  /**
   * Helper to get token balance with retry logic
   * Uses getTokenAccountsByOwner for more reliable account discovery
   */
  private async getTokenBalanceWithRetry(
    tokenMint: PublicKey,
    owner: PublicKey,
    maxRetries: number = 15,
    delayMs: number = 2000
  ): Promise<bigint> {
    // Token program IDs
    const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check both SPL Token and Token-2022 programs (rStocks use Token-2022)
        const [splAccounts, token2022Accounts] = await Promise.all([
          this.connection.getTokenAccountsByOwner(owner, { mint: tokenMint, programId: TOKEN_PROGRAM_ID }),
          this.connection.getTokenAccountsByOwner(owner, { mint: tokenMint, programId: TOKEN_2022_PROGRAM_ID })
        ]);

        const allAccounts = [...splAccounts.value, ...token2022Accounts.value];

        if (allAccounts.length > 0) {
          // Parse the account data to get balance
          const accountInfo = allAccounts[0];
          // Token account data: first 64 bytes are mint, then 32 bytes owner, then 8 bytes amount
          const data = accountInfo.account.data;
          const amount = data.readBigUInt64LE(64);

          if (amount > BigInt(0)) {
            const programType = token2022Accounts.value.length > 0 ? 'Token-2022' : 'SPL Token';
            logger.info(`✅ Token balance fetched (${programType}): ${Number(amount) / 1_000_000_000} tokens`);
            return amount;
          }
        }

        if (attempt === maxRetries) {
          logger.error(`No token balance found after ${maxRetries} attempts`);
          return BigInt(0);
        }

        logger.info(`⏳ Token balance fetch attempt ${attempt}/${maxRetries} - waiting for account to appear...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        if (attempt === maxRetries) {
          logger.error(`Failed to fetch token balance after ${maxRetries} attempts: ${errorMsg}`);
          throw error;
        }
        logger.info(`⏳ Token balance fetch attempt ${attempt}/${maxRetries} failed, retrying in ${delayMs/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    return BigInt(0);
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

      // Wait for Jupiter buy to settle on-chain - increased to 5 seconds
      logger.info('⏳ Waiting for Jupiter transaction to settle (5s)...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Get user's token balance (how much we bought) with retry
      logger.info(`📊 Fetching token balance for ${symbol}...`);
      const tokenAmount = await this.getTokenBalanceWithRetry(tokenMint, userKeypair.publicKey);

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
        logger.warn('⚠️  Could not get Flash.trade quote - tokens held in wallet');
        logger.info(`💡 Manually sell ${Number(tokenAmount) / 1_000_000_000} ${symbol} tokens on Flash.trade`);
        logger.info(`   Visit: https://www.flash.trade/USDC-${symbol.replace(/r$/i, '')}r`);
        return {
          success: true, // Jupiter buy succeeded
          profit: 0 // Unknown until manual sell
        };
      }

      // Calculate expected profit at oracle price
      const expectedUsdcReceived = quote.outputAmount / 1_000_000;
      const expectedProfit = expectedUsdcReceived - amountUSDC;

      logger.info(`📊 Flash.trade Quote:`);
      logger.info(`   Oracle Price: $${quote.oraclePrice.toFixed(2)}`);
      logger.info(`   Expected USDC: $${expectedUsdcReceived.toFixed(2)}`);
      logger.info(`   Expected Profit: $${expectedProfit.toFixed(2)}`);

      // NOTE: Flash.trade on-chain spot swap integration is not yet complete
      // The buildSpotSwapInstruction() function is placeholder code
      // For now, we log the opportunity and let user manually sell on Flash.trade web UI
      logger.warn('⚠️  Flash.trade on-chain sell not yet implemented');
      logger.info(`💡 To complete arbitrage, manually sell on Flash.trade:`);
      logger.info(`   1. Visit: https://www.flash.trade/USDC-${symbol.replace(/r$/i, '')}r`);
      logger.info(`   2. Sell ${Number(tokenAmount) / 1_000_000_000} ${symbol} tokens`);
      logger.info(`   3. Expected to receive: ~$${expectedUsdcReceived.toFixed(2)} USDC`);

      // Return success since Jupiter buy worked - tokens are in wallet
      return {
        success: true,
        profit: expectedProfit // Expected profit if user sells at oracle price
      };

    } catch (error: any) {
      logger.error(`Error executing arbitrage: ${error.message}`);
      return { success: false };
    }
  }
}
