import { Connection, PublicKey } from '@solana/web3.js';
import { WalletManager } from './wallet-manager';
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
export declare class TradeExecutor {
    private connection;
    private jupiterClient;
    private flashTradeClient;
    private walletManager;
    private TOKEN_2022_PROGRAM_ID;
    constructor(connection: Connection, walletManager: WalletManager);
    /**
     * Get token balance for a wallet (supports both SPL Token and Token-2022)
     */
    private getTokenBalance;
    /**
     * Execute an arbitrage trade
     */
    executeTrade(params: TradeParams): Promise<TradeResult>;
    /**
     * Execute the actual blockchain transaction using Jupiter
     */
    private executeTradeTransaction;
    /**
     * Batch execute multiple trades
     */
    executeBatchTrades(trades: TradeParams[]): Promise<TradeResult[]>;
    /**
     * Get wallet manager instance
     */
    getWalletManager(): WalletManager;
}
//# sourceMappingURL=trade-executor.d.ts.map