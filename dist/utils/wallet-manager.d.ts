import { Connection, Keypair, PublicKey } from '@solana/web3.js';
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
export declare enum WalletSelectionStrategy {
    ROUND_ROBIN = "round_robin",// Rotate through wallets sequentially
    HIGHEST_BALANCE = "highest_balance",// Use wallet with most USDC
    LEAST_USED = "least_used",// Use wallet with fewest trades
    RANDOM = "random"
}
export declare class WalletManager {
    private wallets;
    private connection;
    private currentIndex;
    private strategy;
    private usdcMint;
    constructor(connection: Connection, usdcMint: PublicKey, strategy?: WalletSelectionStrategy);
    /**
     * Add a wallet to the manager
     */
    addWallet(privateKey: string, name?: string): void;
    /**
     * Add multiple wallets from array
     */
    addWallets(privateKeys: string[], namePrefix?: string): void;
    /**
     * Get total number of wallets
     */
    getWalletCount(): number;
    /**
     * Update balances for all wallets
     */
    updateAllBalances(): Promise<void>;
    /**
     * Update balance for a specific wallet
     */
    private updateWalletBalance;
    /**
     * Select next wallet based on strategy
     */
    selectWallet(): Promise<WalletInfo | null>;
    /**
     * Round-robin selection
     */
    private selectRoundRobin;
    /**
     * Select wallet with highest USDC balance
     */
    private selectHighestBalance;
    /**
     * Select wallet with least trades
     */
    private selectLeastUsed;
    /**
     * Random selection
     */
    private selectRandom;
    /**
     * Record a trade for a wallet
     */
    recordTrade(publicKey: string, success: boolean, profit?: number): void;
    /**
     * Get statistics for all wallets
     */
    getAllStats(): WalletStats[];
    /**
     * Get statistics for a specific wallet
     */
    getWalletStats(publicKey: string): WalletStats | null;
    /**
     * Get total balances across all wallets
     */
    getTotalBalances(): {
        totalSOL: number;
        totalUSDC: number;
    };
    /**
     * Get total profit across all wallets
     */
    getTotalProfit(): number;
    /**
     * Get wallet by public key
     */
    getWallet(publicKey: string): WalletInfo | undefined;
    /**
     * Get all wallet public keys
     */
    getAllPublicKeys(): string[];
    /**
     * Check if wallet has sufficient balance
     */
    hasInsufficientBalance(publicKey: string, requiredUSDC: number): Promise<boolean>;
    /**
     * Set wallet selection strategy
     */
    setStrategy(strategy: WalletSelectionStrategy): void;
    /**
     * Print wallet summary
     */
    printSummary(): void;
}
//# sourceMappingURL=wallet-manager.d.ts.map