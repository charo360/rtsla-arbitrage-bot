import { Connection, PublicKey, Keypair } from '@solana/web3.js';
export interface FlashTradeConfig {
    connection: Connection;
    programId?: PublicKey;
}
export interface SpotSwapParams {
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number;
    minOutputAmount: number;
    pythPriceAccount: PublicKey;
}
export interface SwapQuote {
    inputAmount: number;
    outputAmount: number;
    oraclePrice: number;
    fee: number;
    priceImpact: number;
}
export declare class FlashTradeClient {
    private connection;
    private programId;
    private usdcMint;
    constructor(config: FlashTradeConfig);
    /**
     * Get quote for selling rToken at oracle price
     */
    getSpotSwapQuote(inputMint: PublicKey, amount: number, pythPriceAccount: PublicKey): Promise<SwapQuote | null>;
    /**
     * Execute spot swap: Sell rToken at oracle price for USDC
     */
    executeSpotSwap(userKeypair: Keypair, params: SpotSwapParams): Promise<string | null>;
    /**
     * Build spot swap instruction
     * This is a simplified version - actual implementation needs Flash.trade's IDL
     */
    private buildSpotSwapInstruction;
    /**
     * Fetch price from Pyth oracle
     */
    private getPythPrice;
    /**
     * Get Pyth price account for a symbol
     * These are the mainnet Pyth price feeds for stocks
     */
    getPythPriceAccount(symbol: string): PublicKey | null;
    /**
     * Helper to get token balance with retry logic
     * Uses getTokenAccountsByOwner for more reliable account discovery
     */
    private getTokenBalanceWithRetry;
    /**
     * Execute complete arbitrage trade
     * Buy on Jupiter → Sell on Flash.trade
     */
    executeArbitrageTrade(userKeypair: Keypair, tokenMint: PublicKey, symbol: string, amountUSDC: number, jupiterBuySignature: string): Promise<{
        success: boolean;
        sellSignature?: string;
        profit?: number;
    }>;
}
//# sourceMappingURL=flashtrade-client.d.ts.map