import { Connection, PublicKey, Keypair } from '@solana/web3.js';
export interface JupiterQuote {
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    priceImpactPct: number;
    marketInfos: any[];
    otherAmountThreshold: string;
}
export interface SwapResult {
    success: boolean;
    signature?: string;
    inputAmount: number;
    outputAmount: number;
    error?: string;
}
export declare class JupiterClient {
    private connection;
    private usdcMint;
    constructor(connection: Connection);
    /**
     * Get quote for swapping USDC to a token
     * Uses raw HTTP to preserve all fields including feeAmount
     */
    getQuote(outputMint: PublicKey, amountUsdc: number, slippageBps?: number): Promise<any | null>;
    /**
     * Get quote for swapping a token to USDC (reverse)
     * Uses raw HTTP to preserve all fields including feeAmount
     */
    getQuoteReverse(inputMint: PublicKey, amountTokens: number, tokenDecimals?: number, // rTokens use 9 decimals
    slippageBps?: number): Promise<any | null>;
    /**
     * Execute a sell swap (token → USDC) using Jupiter
     */
    executeSellSwap(tokenMint: PublicKey, tokenAmount: number, userKeypair: Keypair, tokenDecimals?: number, slippageBps?: number): Promise<SwapResult>;
    /**
     * Get current price for a token in USDC
     */
    getTokenPrice(tokenMint: PublicKey): Promise<number | null>;
    /**
     * Execute a swap using raw HTTP to preserve all quote fields
     */
    executeSwap(quote: any, // Use any to preserve all fields from raw HTTP response
    userKeypair: Keypair, _priorityFee?: number): Promise<SwapResult>;
    /**
     * Execute a complete arbitrage trade
     */
    executeArbitrageTrade(tokenMint: PublicKey, amountUsdc: number, userKeypair: Keypair, direction: 'BUY' | 'SELL'): Promise<SwapResult>;
    /**
     * Get best route info for a swap
     */
    getRouteInfo(quote: any): Promise<string>;
    /**
     * Check if a token is supported by Jupiter
     */
    isTokenSupported(tokenMint: PublicKey): Promise<boolean>;
}
//# sourceMappingURL=jupiter-client.d.ts.map