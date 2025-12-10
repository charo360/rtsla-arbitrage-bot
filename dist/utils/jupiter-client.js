"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JupiterClient = void 0;
const web3_js_1 = require("@solana/web3.js");
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("./logger");
const config_1 = require("../config/config");
// Jupiter API base URL - using public API endpoint (quote-api.jup.ag has DNS issues)
const JUPITER_API_URL = 'https://public.jupiterapi.com';
class JupiterClient {
    constructor(connection) {
        this.connection = connection;
        this.usdcMint = config_1.config.tokens.usdc;
    }
    /**
     * Get quote for swapping USDC to a token
     * Uses raw HTTP to preserve all fields including feeAmount
     */
    async getQuote(outputMint, amountUsdc, slippageBps = 50 // 0.5% default
    ) {
        try {
            const amountInLamports = Math.floor(amountUsdc * 1000000); // USDC has 6 decimals
            const params = new URLSearchParams({
                inputMint: this.usdcMint.toBase58(),
                outputMint: outputMint.toBase58(),
                amount: amountInLamports.toString(),
                slippageBps: slippageBps.toString(),
                onlyDirectRoutes: 'false',
                restrictIntermediateTokens: 'true',
            });
            logger_1.logger.debug(`Requesting Jupiter quote: ${amountUsdc} USDC → ${outputMint.toBase58()}`);
            const response = await axios_1.default.get(`${JUPITER_API_URL}/quote?${params.toString()}`);
            const quote = response.data;
            if (!quote) {
                logger_1.logger.warn(`No quote received from Jupiter for ${outputMint.toBase58()}`);
                return null;
            }
            logger_1.logger.debug(`Quote received for ${outputMint.toBase58().slice(0, 8)}...: ${quote.outAmount} tokens, impact: ${quote.priceImpactPct}%`);
            return quote;
        }
        catch (error) {
            logger_1.logger.error(`Error getting Jupiter quote for ${outputMint.toBase58()}: ${error.message}`);
            if (error.response) {
                logger_1.logger.error(`Jupiter API response: ${JSON.stringify(error.response.data)}`);
            }
            return null;
        }
    }
    /**
     * Get quote for swapping a token to USDC (reverse)
     * Uses raw HTTP to preserve all fields including feeAmount
     */
    async getQuoteReverse(inputMint, amountTokens, tokenDecimals = 9, // rTokens use 9 decimals
    slippageBps = 100 // 1% default for sells
    ) {
        try {
            const amountInLamports = Math.floor(amountTokens * Math.pow(10, tokenDecimals));
            const params = new URLSearchParams({
                inputMint: inputMint.toBase58(),
                outputMint: this.usdcMint.toBase58(),
                amount: amountInLamports.toString(),
                slippageBps: slippageBps.toString(),
                onlyDirectRoutes: 'false',
                restrictIntermediateTokens: 'true',
            });
            logger_1.logger.debug(`Requesting Jupiter reverse quote: ${amountTokens} tokens → USDC`);
            const response = await axios_1.default.get(`${JUPITER_API_URL}/quote?${params.toString()}`);
            const quote = response.data;
            if (!quote) {
                logger_1.logger.warn('No reverse quote received from Jupiter');
                return null;
            }
            const usdcOut = parseInt(quote.outAmount) / 1000000;
            logger_1.logger.debug(`Reverse quote received: ${usdcOut.toFixed(2)} USDC`);
            return quote;
        }
        catch (error) {
            logger_1.logger.error(`Error getting Jupiter reverse quote: ${error.message}`);
            if (error.response) {
                logger_1.logger.error(`Jupiter API response: ${JSON.stringify(error.response.data)}`);
            }
            return null;
        }
    }
    /**
     * Execute a sell swap (token → USDC) using Jupiter
     */
    async executeSellSwap(tokenMint, tokenAmount, userKeypair, tokenDecimals = 9, slippageBps = 100) {
        try {
            logger_1.logger.info(`🔄 Getting sell quote for ${tokenAmount} tokens...`);
            // Get quote for selling tokens to USDC
            const quote = await this.getQuoteReverse(tokenMint, tokenAmount, tokenDecimals, slippageBps);
            if (!quote) {
                throw new Error('Failed to get sell quote from Jupiter');
            }
            const usdcOut = parseInt(quote.outAmount) / 1000000;
            const priceImpact = parseFloat(quote.priceImpactPct || '0');
            logger_1.logger.info(`📊 Jupiter Sell Quote:`);
            logger_1.logger.info(`   Input: ${tokenAmount} tokens`);
            logger_1.logger.info(`   Output: ${usdcOut.toFixed(2)} USDC`);
            logger_1.logger.info(`   Price Impact: ${priceImpact.toFixed(2)}%`);
            // Execute the swap
            return await this.executeSwap(quote, userKeypair);
        }
        catch (error) {
            logger_1.logger.error(`Sell swap failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                inputAmount: 0,
                outputAmount: 0,
            };
        }
    }
    /**
     * Get current price for a token in USDC
     */
    async getTokenPrice(tokenMint) {
        try {
            // Get quote for buying $100 worth of the token to get accurate price
            logger_1.logger.debug(`Getting price for token: ${tokenMint.toBase58()}`);
            const quote = await this.getQuote(tokenMint, 100, 50);
            if (!quote) {
                logger_1.logger.warn(`No quote available for ${tokenMint.toBase58()}`);
                return null;
            }
            // Calculate price per token
            // inAmount = USDC spent (in lamports, 6 decimals)
            // outAmount = tokens received (in lamports, typically 9 decimals for these tokens)
            const usdcSpent = parseInt(quote.inAmount) / 1000000;
            // Remora tokenized stocks use 9 decimals
            const tokensReceived = parseInt(quote.outAmount) / 1000000000;
            logger_1.logger.debug(`Quote details: ${usdcSpent} USDC → ${tokensReceived} tokens`);
            if (tokensReceived === 0) {
                logger_1.logger.warn(`Zero tokens received in quote for ${tokenMint.toBase58()}`);
                return null;
            }
            const pricePerToken = usdcSpent / tokensReceived;
            logger_1.logger.info(`✅ Jupiter price for ${tokenMint.toBase58().slice(0, 8)}...: $${pricePerToken.toFixed(2)} (${usdcSpent} USDC / ${tokensReceived} tokens)`);
            return pricePerToken;
        }
        catch (error) {
            logger_1.logger.error(`Error getting token price for ${tokenMint.toBase58()}: ${error.message}`);
            return null;
        }
    }
    /**
     * Execute a swap using raw HTTP to preserve all quote fields
     */
    async executeSwap(quote, // Use any to preserve all fields from raw HTTP response
    userKeypair, _priorityFee = 0.0001 // SOL (unused, using priorityLevelWithMaxLamports instead)
    ) {
        try {
            logger_1.logger.info('🔄 Building swap transaction...');
            // Get swap transaction using raw HTTP to preserve all quote fields
            let swapResponse;
            try {
                // Remove platformFee from quote if present (public.jupiterapi.com adds this)
                // The swap endpoint requires a feeAccount if platformFee is present
                const cleanQuote = { ...quote };
                if (cleanQuote.platformFee) {
                    delete cleanQuote.platformFee;
                    logger_1.logger.debug('Removed platformFee from quote for swap request');
                }
                // Build swap request with the cleaned quote (preserves feeAmount and other fields)
                const swapRequestBody = {
                    quoteResponse: cleanQuote, // Quote with platformFee removed
                    userPublicKey: userKeypair.publicKey.toBase58(),
                    wrapAndUnwrapSol: true,
                    dynamicComputeUnitLimit: true,
                    prioritizationFeeLamports: {
                        priorityLevelWithMaxLamports: {
                            priorityLevel: 'high',
                            maxLamports: 1000000, // Max 0.001 SOL
                        }
                    },
                };
                logger_1.logger.debug(`Swap request: ${JSON.stringify({
                    userPublicKey: swapRequestBody.userPublicKey,
                    inputMint: quote.inputMint,
                    outputMint: quote.outputMint,
                    amount: quote.inAmount,
                    slippage: quote.slippageBps
                })}`);
                // Use raw HTTP POST to preserve all fields
                const response = await axios_1.default.post(`${JUPITER_API_URL}/swap`, swapRequestBody, {
                    headers: { 'Content-Type': 'application/json' },
                });
                swapResponse = response.data;
            }
            catch (swapError) {
                logger_1.logger.error(`Jupiter swap API error: ${swapError.message}`);
                // Extract error details from axios error
                let errorDetails = '';
                if (swapError.response) {
                    const status = swapError.response.status;
                    logger_1.logger.error(`Error status: ${status}`);
                    logger_1.logger.error(`Error data: ${JSON.stringify(swapError.response.data)}`);
                    errorDetails = JSON.stringify(swapError.response.data);
                    // Check for specific error codes
                    if (status === 400) {
                        throw new Error(`Jupiter swap failed: Insufficient liquidity or invalid route. ${errorDetails}`);
                    }
                    if (status === 422) {
                        throw new Error(`Jupiter swap failed: Invalid request parameters. ${errorDetails}`);
                    }
                }
                throw new Error(`Jupiter swap failed: ${swapError.message}. ${errorDetails}`);
            }
            if (!swapResponse || !swapResponse.swapTransaction) {
                logger_1.logger.error(`Swap response: ${JSON.stringify(swapResponse)}`);
                throw new Error('Failed to get swap transaction from Jupiter');
            }
            logger_1.logger.info('📝 Signing and sending transaction...');
            // Deserialize the transaction
            const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
            const transaction = web3_js_1.VersionedTransaction.deserialize(swapTransactionBuf);
            // Sign the transaction
            transaction.sign([userKeypair]);
            // Send transaction
            const rawTransaction = transaction.serialize();
            const txid = await this.connection.sendRawTransaction(rawTransaction, {
                skipPreflight: false,
                maxRetries: 3,
            });
            logger_1.logger.info(`📤 Transaction sent: ${txid}`);
            logger_1.logger.info('⏳ Waiting for confirmation...');
            // Confirm transaction
            const confirmation = await this.connection.confirmTransaction(txid, 'confirmed');
            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }
            logger_1.logger.info(`✅ Transaction confirmed: ${txid}`);
            // Calculate amounts based on input/output mints
            // USDC has 6 decimals, rTokens have 9 decimals
            const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
            // Determine decimals based on mint addresses
            const inputDecimals = quote.inputMint === USDC_MINT ? 6 : 9;
            const outputDecimals = quote.outputMint === USDC_MINT ? 6 : 9;
            const inputAmount = parseInt(quote.inAmount) / Math.pow(10, inputDecimals);
            const outputAmount = parseInt(quote.outAmount) / Math.pow(10, outputDecimals);
            return {
                success: true,
                signature: txid,
                inputAmount,
                outputAmount,
            };
        }
        catch (error) {
            logger_1.logger.error(`❌ Swap execution failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                inputAmount: 0,
                outputAmount: 0,
            };
        }
    }
    /**
     * Execute a complete arbitrage trade
     */
    async executeArbitrageTrade(tokenMint, amountUsdc, userKeypair, direction) {
        try {
            logger_1.logger.info(`\n${'='.repeat(80)}`);
            logger_1.logger.info(`🎯 EXECUTING ARBITRAGE TRADE`);
            logger_1.logger.info(`${'='.repeat(80)}`);
            logger_1.logger.info(`Direction: ${direction}`);
            logger_1.logger.info(`Token: ${tokenMint.toBase58()}`);
            logger_1.logger.info(`Amount: $${amountUsdc} USDC`);
            logger_1.logger.info(`${'='.repeat(80)}\n`);
            let quote;
            if (direction === 'BUY') {
                // Buy token with USDC
                quote = await this.getQuote(tokenMint, amountUsdc);
            }
            else {
                // Sell token for USDC
                // First get how many tokens we have
                const tokenAmount = amountUsdc; // Placeholder - should get actual token balance
                quote = await this.getQuoteReverse(tokenMint, tokenAmount);
            }
            if (!quote) {
                throw new Error('Failed to get quote from Jupiter');
            }
            // Check price impact
            const priceImpact = parseFloat(quote.priceImpactPct);
            if (priceImpact > 2.0) {
                logger_1.logger.warn(`⚠️  High price impact: ${priceImpact.toFixed(2)}%`);
            }
            // Execute swap
            const result = await this.executeSwap(quote, userKeypair);
            return result;
        }
        catch (error) {
            logger_1.logger.error(`Arbitrage trade failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                inputAmount: 0,
                outputAmount: 0,
            };
        }
    }
    /**
     * Get best route info for a swap
     */
    async getRouteInfo(quote) {
        try {
            const routes = quote.routePlan || [];
            const routeNames = routes.map((r) => r.swapInfo?.label || 'Unknown').join(' → ');
            return routeNames || 'Direct';
        }
        catch (error) {
            return 'Unknown';
        }
    }
    /**
     * Check if a token is supported by Jupiter
     */
    async isTokenSupported(tokenMint) {
        try {
            const quote = await this.getQuote(tokenMint, 1);
            return quote !== null;
        }
        catch (error) {
            return false;
        }
    }
}
exports.JupiterClient = JupiterClient;
//# sourceMappingURL=jupiter-client.js.map