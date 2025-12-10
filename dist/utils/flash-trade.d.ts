/**
 * Flash Trade Platform Integration
 *
 * Flash Trade is a perpetuals/derivatives platform that uses Pyth oracle
 * for real-time NASDAQ pricing of tokenized stocks like TSLAr.
 *
 * Website: https://flash.trade/
 *
 * Key Features:
 * - Oracle-based pricing (Pyth Network)
 * - Tracks real NASDAQ prices
 * - Supports TSLAr/USDC swaps
 * - Leverage trading (1x-10x)
 */
export interface FlashTradePoolData {
    oraclePrice: number;
    poolLiquidity: number;
    volume24h: number;
    timestamp: number;
}
export declare class FlashTradeIntegration {
    private connection;
    constructor();
    /**
     * Get Flash Trade pool data
     * This includes the oracle price (Pyth NASDAQ price)
     */
    getPoolData(): Promise<FlashTradePoolData | null>;
    /**
     * Check if Flash Trade pool is accessible
     */
    isPoolAccessible(): Promise<boolean>;
    /**
     * Estimate swap output on Flash Trade
     * Uses oracle price (Pyth) for calculation
     */
    estimateSwapOutput(inputAmount: number, inputToken: 'TSLAr' | 'USDC', oraclePrice: number): number;
    /**
     * Calculate fees for Flash Trade swap
     */
    calculateFees(swapAmount: number): {
        tradingFee: number;
        total: number;
    };
}
/**
 * Helper to format Flash Trade URL for a specific pair
 */
export declare function getFlashTradeUrl(pair?: string): string;
/**
 * Helper to check if address is valid Flash Trade program
 */
export declare function isFlashTradeProgram(programId: string): boolean;
//# sourceMappingURL=flash-trade.d.ts.map