import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { logger } from './logger';
import bs58 from 'bs58';

export interface WalletInfo {
  keypair: Keypair;
  publicKey: PublicKey;
  name: string;
  solBalance: number;
  usdcBalance: number;
  lastUsed: Date;
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: number;
}

export interface WalletStats {
  name: string;
  publicKey: string;
  solBalance: number;
  usdcBalance: number;
  totalTrades: number;
  successRate: number;
  totalProfit: number;
  lastUsed: string;
}

export enum WalletSelectionStrategy {
  ROUND_ROBIN = 'round_robin',      // Rotate through wallets sequentially
  HIGHEST_BALANCE = 'highest_balance', // Use wallet with most USDC
  LEAST_USED = 'least_used',        // Use wallet with fewest trades
  RANDOM = 'random'                  // Random selection
}

export class WalletManager {
  private wallets: Map<string, WalletInfo> = new Map();
  private connection: Connection;
  private currentIndex: number = 0;
  private strategy: WalletSelectionStrategy;
  private usdcMint: PublicKey;

  constructor(
    connection: Connection,
    usdcMint: PublicKey,
    strategy: WalletSelectionStrategy = WalletSelectionStrategy.ROUND_ROBIN
  ) {
    this.connection = connection;
    this.usdcMint = usdcMint;
    this.strategy = strategy;
  }

  /**
   * Add a wallet to the manager
   */
  addWallet(privateKey: string, name?: string): void {
    try {
      // Decode private key (supports both base58 and array format)
      let secretKey: Uint8Array;
      
      if (privateKey.startsWith('[')) {
        // Array format: [1,2,3,...]
        const keyArray = JSON.parse(privateKey);
        secretKey = Uint8Array.from(keyArray);
      } else {
        // Base58 format
        secretKey = bs58.decode(privateKey);
      }

      const keypair = Keypair.fromSecretKey(secretKey);
      const publicKey = keypair.publicKey;
      const walletName = name || `Wallet-${this.wallets.size + 1}`;

      const walletInfo: WalletInfo = {
        keypair,
        publicKey,
        name: walletName,
        solBalance: 0,
        usdcBalance: 0,
        lastUsed: new Date(),
        totalTrades: 0,
        successfulTrades: 0,
        failedTrades: 0,
        totalProfit: 0
      };

      this.wallets.set(publicKey.toBase58(), walletInfo);
      
      logger.info(`✅ Wallet added: ${walletName} (${publicKey.toBase58()})`);
    } catch (error: any) {
      logger.error(`Failed to add wallet: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add multiple wallets from array
   */
  addWallets(privateKeys: string[], namePrefix?: string): void {
    privateKeys.forEach((key, index) => {
      const name = namePrefix ? `${namePrefix}-${index + 1}` : undefined;
      this.addWallet(key, name);
    });
  }

  /**
   * Get total number of wallets
   */
  getWalletCount(): number {
    return this.wallets.size;
  }

  /**
   * Update balances for all wallets
   */
  async updateAllBalances(): Promise<void> {
    logger.info('📊 Updating balances for all wallets...');
    
    const updatePromises = Array.from(this.wallets.values()).map(wallet =>
      this.updateWalletBalance(wallet)
    );

    await Promise.all(updatePromises);
    
    logger.info('✅ All wallet balances updated');
  }

  /**
   * Update balance for a specific wallet
   */
  private async updateWalletBalance(wallet: WalletInfo): Promise<void> {
    try {
      // Get SOL balance
      const solBalance = await this.connection.getBalance(wallet.publicKey);
      wallet.solBalance = solBalance / LAMPORTS_PER_SOL;

      // Get USDC balance (token account)
      // FIX: Check ALL USDC token accounts, not just the first one
      try {
        logger.debug(`Fetching USDC balance for ${wallet.name}, mint: ${this.usdcMint.toBase58()}`);
        const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
          wallet.publicKey,
          { mint: this.usdcMint }
        );

        logger.debug(`Found ${tokenAccounts.value.length} USDC token accounts`);

        if (tokenAccounts.value.length > 0) {
          // Sum up USDC across ALL token accounts
          let totalUSDC = 0;
          for (const account of tokenAccounts.value) {
            const usdcAccount = account.account.data.parsed.info;
            const balance = parseFloat(usdcAccount.tokenAmount.uiAmount || '0');
            totalUSDC += balance;
            logger.debug(`  Account ${account.pubkey.toBase58()}: ${balance} USDC`);
          }
          wallet.usdcBalance = totalUSDC;
          logger.debug(`Total USDC balance: ${wallet.usdcBalance}`);
        } else {
          logger.warn(`No USDC token account found for ${wallet.name}`);
          wallet.usdcBalance = 0;
        }
      } catch (error: any) {
        logger.error(`Error fetching USDC balance: ${error.message}`);
        wallet.usdcBalance = 0;
      }

      logger.debug(`${wallet.name}: SOL=${wallet.solBalance.toFixed(4)}, USDC=${wallet.usdcBalance.toFixed(2)}`);
    } catch (error: any) {
      logger.error(`Failed to update balance for ${wallet.name}: ${error.message}`);
    }
  }

  /**
   * Select next wallet based on strategy
   */
  async selectWallet(): Promise<WalletInfo | null> {
    if (this.wallets.size === 0) {
      logger.error('No wallets available');
      return null;
    }

    // Update balances before selection
    await this.updateAllBalances();

    const walletArray = Array.from(this.wallets.values());

    switch (this.strategy) {
      case WalletSelectionStrategy.ROUND_ROBIN:
        return this.selectRoundRobin(walletArray);

      case WalletSelectionStrategy.HIGHEST_BALANCE:
        return this.selectHighestBalance(walletArray);

      case WalletSelectionStrategy.LEAST_USED:
        return this.selectLeastUsed(walletArray);

      case WalletSelectionStrategy.RANDOM:
        return this.selectRandom(walletArray);

      default:
        return this.selectRoundRobin(walletArray);
    }
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(wallets: WalletInfo[]): WalletInfo {
    const wallet = wallets[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % wallets.length;
    logger.info(`🔄 Selected wallet (Round Robin): ${wallet.name}`);
    return wallet;
  }

  /**
   * Select wallet with highest USDC balance
   */
  private selectHighestBalance(wallets: WalletInfo[]): WalletInfo {
    const wallet = wallets.reduce((prev, current) =>
      current.usdcBalance > prev.usdcBalance ? current : prev
    );
    logger.info(`💰 Selected wallet (Highest Balance): ${wallet.name} (${wallet.usdcBalance.toFixed(2)} USDC)`);
    return wallet;
  }

  /**
   * Select wallet with least trades
   */
  private selectLeastUsed(wallets: WalletInfo[]): WalletInfo {
    const wallet = wallets.reduce((prev, current) =>
      current.totalTrades < prev.totalTrades ? current : prev
    );
    logger.info(`📉 Selected wallet (Least Used): ${wallet.name} (${wallet.totalTrades} trades)`);
    return wallet;
  }

  /**
   * Random selection
   */
  private selectRandom(wallets: WalletInfo[]): WalletInfo {
    const randomIndex = Math.floor(Math.random() * wallets.length);
    const wallet = wallets[randomIndex];
    logger.info(`🎲 Selected wallet (Random): ${wallet.name}`);
    return wallet;
  }

  /**
   * Record a trade for a wallet
   */
  recordTrade(publicKey: string, success: boolean, profit: number = 0): void {
    const wallet = this.wallets.get(publicKey);
    if (!wallet) {
      logger.error(`Wallet not found: ${publicKey}`);
      return;
    }

    wallet.totalTrades++;
    wallet.lastUsed = new Date();

    if (success) {
      wallet.successfulTrades++;
      wallet.totalProfit += profit;
    } else {
      wallet.failedTrades++;
    }

    logger.debug(`Trade recorded for ${wallet.name}: ${success ? 'SUCCESS' : 'FAILED'}, Profit: $${profit.toFixed(2)}`);
  }

  /**
   * Get statistics for all wallets
   */
  getAllStats(): WalletStats[] {
    return Array.from(this.wallets.values()).map(wallet => ({
      name: wallet.name,
      publicKey: wallet.publicKey.toBase58(),
      solBalance: wallet.solBalance,
      usdcBalance: wallet.usdcBalance,
      totalTrades: wallet.totalTrades,
      successRate: wallet.totalTrades > 0
        ? (wallet.successfulTrades / wallet.totalTrades) * 100
        : 0,
      totalProfit: wallet.totalProfit,
      lastUsed: wallet.lastUsed.toISOString()
    }));
  }

  /**
   * Get statistics for a specific wallet
   */
  getWalletStats(publicKey: string): WalletStats | null {
    const wallet = this.wallets.get(publicKey);
    if (!wallet) return null;

    return {
      name: wallet.name,
      publicKey: wallet.publicKey.toBase58(),
      solBalance: wallet.solBalance,
      usdcBalance: wallet.usdcBalance,
      totalTrades: wallet.totalTrades,
      successRate: wallet.totalTrades > 0
        ? (wallet.successfulTrades / wallet.totalTrades) * 100
        : 0,
      totalProfit: wallet.totalProfit,
      lastUsed: wallet.lastUsed.toISOString()
    };
  }

  /**
   * Get total balances across all wallets
   */
  getTotalBalances(): { totalSOL: number; totalUSDC: number } {
    let totalSOL = 0;
    let totalUSDC = 0;

    this.wallets.forEach(wallet => {
      totalSOL += wallet.solBalance;
      totalUSDC += wallet.usdcBalance;
    });

    return { totalSOL, totalUSDC };
  }

  /**
   * Get total profit across all wallets
   */
  getTotalProfit(): number {
    let totalProfit = 0;
    this.wallets.forEach(wallet => {
      totalProfit += wallet.totalProfit;
    });
    return totalProfit;
  }

  /**
   * Get wallet by public key
   */
  getWallet(publicKey: string): WalletInfo | undefined {
    return this.wallets.get(publicKey);
  }

  /**
   * Get all wallet public keys
   */
  getAllPublicKeys(): string[] {
    return Array.from(this.wallets.keys());
  }

  /**
   * Check if wallet has sufficient balance
   */
  async hasInsufficientBalance(publicKey: string, requiredUSDC: number): Promise<boolean> {
    const wallet = this.wallets.get(publicKey);
    if (!wallet) {
      logger.error(`Wallet not found: ${publicKey}`);
      return true;
    }

    await this.updateWalletBalance(wallet);
    
    logger.info(`💰 Balance Check for ${wallet.name}:`);
    logger.info(`   SOL: ${wallet.solBalance.toFixed(4)}`);
    logger.info(`   USDC: $${wallet.usdcBalance.toFixed(2)}`);
    logger.info(`   Required: $${requiredUSDC.toFixed(2)}`);
    
    // Check USDC balance
    if (wallet.usdcBalance < requiredUSDC) {
      logger.warn(`❌ Insufficient USDC: ${wallet.usdcBalance.toFixed(2)} < ${requiredUSDC.toFixed(2)}`);
      return true;
    }

    // Check SOL balance for transaction fees (minimum 0.01 SOL)
    if (wallet.solBalance < 0.01) {
      logger.warn(`❌ Insufficient SOL for fees: ${wallet.solBalance.toFixed(4)}`);
      return true;
    }

    logger.info(`✅ Balance sufficient for trade`);
    return false;
  }

  /**
   * Set wallet selection strategy
   */
  setStrategy(strategy: WalletSelectionStrategy): void {
    this.strategy = strategy;
    logger.info(`Wallet selection strategy changed to: ${strategy}`);
  }

  /**
   * Print wallet summary
   */
  printSummary(): void {
    logger.info('\n' + '='.repeat(80));
    logger.info('💼 WALLET MANAGER SUMMARY');
    logger.info('='.repeat(80));
    logger.info(`Total Wallets: ${this.wallets.size}`);
    logger.info(`Selection Strategy: ${this.strategy}`);
    
    const { totalSOL, totalUSDC } = this.getTotalBalances();
    logger.info(`Total SOL: ${totalSOL.toFixed(4)}`);
    logger.info(`Total USDC: ${totalUSDC.toFixed(2)}`);
    logger.info(`Total Profit: $${this.getTotalProfit().toFixed(2)}`);
    
    logger.info('\nWallet Details:');
    logger.info('-'.repeat(80));
    
    this.wallets.forEach(wallet => {
      const successRate = wallet.totalTrades > 0
        ? ((wallet.successfulTrades / wallet.totalTrades) * 100).toFixed(1)
        : '0.0';
      
      logger.info(`${wallet.name}:`);
      logger.info(`  Address: ${wallet.publicKey.toBase58()}`);
      logger.info(`  SOL: ${wallet.solBalance.toFixed(4)} | USDC: ${wallet.usdcBalance.toFixed(2)}`);
      logger.info(`  Trades: ${wallet.totalTrades} (${successRate}% success)`);
      logger.info(`  Profit: $${wallet.totalProfit.toFixed(2)}`);
      logger.info(`  Last Used: ${wallet.lastUsed.toLocaleString()}`);
      logger.info('');
    });
    
    logger.info('='.repeat(80) + '\n');
  }
}
