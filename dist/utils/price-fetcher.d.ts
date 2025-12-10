import { PublicKey } from '@solana/web3.js';
export interface PriceData {
    source: string;
    price: number;
    timestamp: number;
    confidence?: number;
}
export declare class PriceFetcher {
    private connection;
    private pythClient;
    private jupiterClient;
    private priceCache;
    private readonly CACHE_DURATION_MS;
    constructor();
    /**
     * Get Tesla stock price from Yahoo Finance (real NASDAQ price)
     */
    getRealTeslaPrice(): Promise<PriceData | null>;
    /**
     * Get rTSLA price from Birdeye (if API key available)
     */
    getBirdeyePrice(): Promise<PriceData | null>;
    /**
     * Get real DEX price from Jupiter (aggregates all DEXs including Remora)
     */
    getRemoraPoolPrice(tokenMint?: PublicKey): Promise<PriceData | null>;
    /**
     * Get Pyth oracle price for Tesla (REAL ON-CHAIN DATA)
     * This is the NASDAQ price used by Flash Trade
     */
    getPythPrice(): Promise<PriceData | null>;
    /**
     * Get Flash Trade oracle pool price (should match Pyth)
     */
    getFlashTradePrice(): Promise<PriceData | null>;
    /**
     * Get all available prices for comparison
     */
    getAllPrices(): Promise<{
        remora: PriceData | null;
        pyth: PriceData | null;
        flashTrade: PriceData | null;
        yahoo: PriceData | null;
        birdeye: PriceData | null;
    }>;
}
//# sourceMappingURL=price-fetcher.d.ts.map