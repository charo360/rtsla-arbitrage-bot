import { WalletManager } from '../utils/wallet-manager';
interface TokenOpportunity {
    token: string;
    timestamp: number;
    remoraPrice: number;
    oraclePrice: number;
    spread: number;
    spreadPercent: number;
    estimatedProfit: number;
    direction: 'BUY_REMORA' | 'SELL_REMORA';
}
export declare class MultiTokenMonitor {
    private priceFetcher;
    private jupiterClient;
    private tradeExecutor;
    private walletManager;
    private connection;
    private tokens;
    private opportunities;
    private isTrading;
    private stats;
    constructor();
    private initializeWalletManager;
    private initializeTokens;
    startMonitoring(): Promise<void>;
    private checkAllTokens;
    private checkToken;
    private getRemoraPrice;
    private getYahooPrice;
    private calculateProfit;
    private saveOpportunities;
    getStats(): Map<string, any>;
    getAllOpportunities(): TokenOpportunity[];
    getTokenOpportunities(symbol: string): TokenOpportunity[];
    getWalletManager(): WalletManager | null;
    updateWalletBalances(): Promise<void>;
    printWalletSummary(): void;
}
export {};
//# sourceMappingURL=multi-token-monitor.d.ts.map