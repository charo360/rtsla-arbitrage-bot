"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletManager = exports.WalletSelectionStrategy = void 0;
const web3_js_1 = require("@solana/web3.js");
const logger_1 = require("./logger");
const bs58_1 = __importDefault(require("bs58"));
var WalletSelectionStrategy;
(function (WalletSelectionStrategy) {
    WalletSelectionStrategy["ROUND_ROBIN"] = "round_robin";
    WalletSelectionStrategy["HIGHEST_BALANCE"] = "highest_balance";
    WalletSelectionStrategy["LEAST_USED"] = "least_used";
    WalletSelectionStrategy["RANDOM"] = "random"; // Random selection
})(WalletSelectionStrategy || (exports.WalletSelectionStrategy = WalletSelectionStrategy = {}));
class WalletManager {
    constructor(connection, usdcMint, strategy = WalletSelectionStrategy.ROUND_ROBIN) {
        this.wallets = new Map();
        this.currentIndex = 0;
        this.connection = connection;
        this.usdcMint = usdcMint;
        this.strategy = strategy;
    }
    /**
     * Add a wallet to the manager
     */
    addWallet(privateKey, name) {
        try {
            // Decode private key (supports both base58 and array format)
            let secretKey;
            if (privateKey.startsWith('[')) {
                // Array format: [1,2,3,...]
                const keyArray = JSON.parse(privateKey);
                secretKey = Uint8Array.from(keyArray);
            }
            else {
                // Base58 format
                secretKey = bs58_1.default.decode(privateKey);
            }
            const keypair = web3_js_1.Keypair.fromSecretKey(secretKey);
            const publicKey = keypair.publicKey;
            const walletName = name || `Wallet-${this.wallets.size + 1}`;
            const walletInfo = {
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
            logger_1.logger.info(`✅ Wallet added: ${walletName} (${publicKey.toBase58()})`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to add wallet: ${error.message}`);
            throw error;
        }
    }
    /**
     * Add multiple wallets from array
     */
    addWallets(privateKeys, namePrefix) {
        privateKeys.forEach((key, index) => {
            const name = namePrefix ? `${namePrefix}-${index + 1}` : undefined;
            this.addWallet(key, name);
        });
    }
    /**
     * Get total number of wallets
     */
    getWalletCount() {
        return this.wallets.size;
    }
    /**
     * Update balances for all wallets
     */
    async updateAllBalances() {
        logger_1.logger.info('📊 Updating balances for all wallets...');
        const updatePromises = Array.from(this.wallets.values()).map(wallet => this.updateWalletBalance(wallet));
        await Promise.all(updatePromises);
        logger_1.logger.info('✅ All wallet balances updated');
    }
    /**
     * Update balance for a specific wallet
     */
    async updateWalletBalance(wallet) {
        try {
            // Get SOL balance
            const solBalance = await this.connection.getBalance(wallet.publicKey);
            wallet.solBalance = solBalance / web3_js_1.LAMPORTS_PER_SOL;
            // Get USDC balance (token account)
            try {
                logger_1.logger.debug(`Fetching USDC balance for ${wallet.name}, mint: ${this.usdcMint.toBase58()}`);
                const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(wallet.publicKey, { mint: this.usdcMint });
                logger_1.logger.debug(`Found ${tokenAccounts.value.length} USDC token accounts`);
                if (tokenAccounts.value.length > 0) {
                    const usdcAccount = tokenAccounts.value[0].account.data.parsed.info;
                    wallet.usdcBalance = parseFloat(usdcAccount.tokenAmount.uiAmount || '0');
                    logger_1.logger.debug(`USDC balance: ${wallet.usdcBalance}`);
                }
                else {
                    logger_1.logger.warn(`No USDC token account found for ${wallet.name}`);
                    wallet.usdcBalance = 0;
                }
            }
            catch (error) {
                logger_1.logger.error(`Error fetching USDC balance: ${error.message}`);
                wallet.usdcBalance = 0;
            }
            logger_1.logger.debug(`${wallet.name}: SOL=${wallet.solBalance.toFixed(4)}, USDC=${wallet.usdcBalance.toFixed(2)}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to update balance for ${wallet.name}: ${error.message}`);
        }
    }
    /**
     * Select next wallet based on strategy
     */
    async selectWallet() {
        if (this.wallets.size === 0) {
            logger_1.logger.error('No wallets available');
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
    selectRoundRobin(wallets) {
        const wallet = wallets[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % wallets.length;
        logger_1.logger.info(`🔄 Selected wallet (Round Robin): ${wallet.name}`);
        return wallet;
    }
    /**
     * Select wallet with highest USDC balance
     */
    selectHighestBalance(wallets) {
        const wallet = wallets.reduce((prev, current) => current.usdcBalance > prev.usdcBalance ? current : prev);
        logger_1.logger.info(`💰 Selected wallet (Highest Balance): ${wallet.name} (${wallet.usdcBalance.toFixed(2)} USDC)`);
        return wallet;
    }
    /**
     * Select wallet with least trades
     */
    selectLeastUsed(wallets) {
        const wallet = wallets.reduce((prev, current) => current.totalTrades < prev.totalTrades ? current : prev);
        logger_1.logger.info(`📉 Selected wallet (Least Used): ${wallet.name} (${wallet.totalTrades} trades)`);
        return wallet;
    }
    /**
     * Random selection
     */
    selectRandom(wallets) {
        const randomIndex = Math.floor(Math.random() * wallets.length);
        const wallet = wallets[randomIndex];
        logger_1.logger.info(`🎲 Selected wallet (Random): ${wallet.name}`);
        return wallet;
    }
    /**
     * Record a trade for a wallet
     */
    recordTrade(publicKey, success, profit = 0) {
        const wallet = this.wallets.get(publicKey);
        if (!wallet) {
            logger_1.logger.error(`Wallet not found: ${publicKey}`);
            return;
        }
        wallet.totalTrades++;
        wallet.lastUsed = new Date();
        if (success) {
            wallet.successfulTrades++;
            wallet.totalProfit += profit;
        }
        else {
            wallet.failedTrades++;
        }
        logger_1.logger.debug(`Trade recorded for ${wallet.name}: ${success ? 'SUCCESS' : 'FAILED'}, Profit: $${profit.toFixed(2)}`);
    }
    /**
     * Get statistics for all wallets
     */
    getAllStats() {
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
    getWalletStats(publicKey) {
        const wallet = this.wallets.get(publicKey);
        if (!wallet)
            return null;
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
    getTotalBalances() {
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
    getTotalProfit() {
        let totalProfit = 0;
        this.wallets.forEach(wallet => {
            totalProfit += wallet.totalProfit;
        });
        return totalProfit;
    }
    /**
     * Get wallet by public key
     */
    getWallet(publicKey) {
        return this.wallets.get(publicKey);
    }
    /**
     * Get all wallet public keys
     */
    getAllPublicKeys() {
        return Array.from(this.wallets.keys());
    }
    /**
     * Check if wallet has sufficient balance
     */
    async hasInsufficientBalance(publicKey, requiredUSDC) {
        const wallet = this.wallets.get(publicKey);
        if (!wallet) {
            logger_1.logger.error(`Wallet not found: ${publicKey}`);
            return true;
        }
        await this.updateWalletBalance(wallet);
        logger_1.logger.info(`💰 Balance Check for ${wallet.name}:`);
        logger_1.logger.info(`   SOL: ${wallet.solBalance.toFixed(4)}`);
        logger_1.logger.info(`   USDC: $${wallet.usdcBalance.toFixed(2)}`);
        logger_1.logger.info(`   Required: $${requiredUSDC.toFixed(2)}`);
        // Check USDC balance
        if (wallet.usdcBalance < requiredUSDC) {
            logger_1.logger.warn(`❌ Insufficient USDC: ${wallet.usdcBalance.toFixed(2)} < ${requiredUSDC.toFixed(2)}`);
            return true;
        }
        // Check SOL balance for transaction fees (minimum 0.01 SOL)
        if (wallet.solBalance < 0.01) {
            logger_1.logger.warn(`❌ Insufficient SOL for fees: ${wallet.solBalance.toFixed(4)}`);
            return true;
        }
        logger_1.logger.info(`✅ Balance sufficient for trade`);
        return false;
    }
    /**
     * Set wallet selection strategy
     */
    setStrategy(strategy) {
        this.strategy = strategy;
        logger_1.logger.info(`Wallet selection strategy changed to: ${strategy}`);
    }
    /**
     * Print wallet summary
     */
    printSummary() {
        logger_1.logger.info('\n' + '='.repeat(80));
        logger_1.logger.info('💼 WALLET MANAGER SUMMARY');
        logger_1.logger.info('='.repeat(80));
        logger_1.logger.info(`Total Wallets: ${this.wallets.size}`);
        logger_1.logger.info(`Selection Strategy: ${this.strategy}`);
        const { totalSOL, totalUSDC } = this.getTotalBalances();
        logger_1.logger.info(`Total SOL: ${totalSOL.toFixed(4)}`);
        logger_1.logger.info(`Total USDC: ${totalUSDC.toFixed(2)}`);
        logger_1.logger.info(`Total Profit: $${this.getTotalProfit().toFixed(2)}`);
        logger_1.logger.info('\nWallet Details:');
        logger_1.logger.info('-'.repeat(80));
        this.wallets.forEach(wallet => {
            const successRate = wallet.totalTrades > 0
                ? ((wallet.successfulTrades / wallet.totalTrades) * 100).toFixed(1)
                : '0.0';
            logger_1.logger.info(`${wallet.name}:`);
            logger_1.logger.info(`  Address: ${wallet.publicKey.toBase58()}`);
            logger_1.logger.info(`  SOL: ${wallet.solBalance.toFixed(4)} | USDC: ${wallet.usdcBalance.toFixed(2)}`);
            logger_1.logger.info(`  Trades: ${wallet.totalTrades} (${successRate}% success)`);
            logger_1.logger.info(`  Profit: $${wallet.totalProfit.toFixed(2)}`);
            logger_1.logger.info(`  Last Used: ${wallet.lastUsed.toLocaleString()}`);
            logger_1.logger.info('');
        });
        logger_1.logger.info('='.repeat(80) + '\n');
    }
}
exports.WalletManager = WalletManager;
//# sourceMappingURL=wallet-manager.js.map