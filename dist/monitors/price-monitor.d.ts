export interface SpreadOpportunity {
    timestamp: number;
    remoraPrice: number;
    pythPrice: number | null;
    spread: number;
    spreadPercent: number;
    direction: 'BUY_REMORA' | 'SELL_REMORA';
    estimatedProfit: number;
    tradeAmount: number;
}
export declare class PriceMonitor {
    private priceFetcher;
    private opportunities;
    private dataFilePath;
    private stats;
    constructor();
    private loadExistingOpportunities;
    private calculateSpread;
    private estimateProfit;
    checkSpread(): Promise<SpreadOpportunity | null>;
    private saveOpportunities;
    getStats(): typeof this.stats & {
        avgSpread: number;
        maxSpread: number;
        totalEstimatedProfit: number;
    };
    startMonitoring(): Promise<void>;
}
//# sourceMappingURL=price-monitor.d.ts.map