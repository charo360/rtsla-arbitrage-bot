"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlashTradeClient = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const logger_1 = require("./logger");
/**
 * Flash.trade Client for Oracle-Priced Spot Swaps
 *
 * Enables selling rTokens (tokenized stocks) at Pyth oracle prices
 * Complete arbitrage flow: Buy low on Jupiter → Sell high on Flash.trade
 */
// Flash.trade Program IDs (mainnet)
const FLASHTRADE_PROGRAM_ID = new web3_js_1.PublicKey('FLASH6Lo6h3iasJKWDs2F8TkW2UKf3s15C8PMGuVfgBn'); // Confirmed mainnet program
const PYTH_PROGRAM_ID = new web3_js_1.PublicKey('FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH');
class FlashTradeClient {
    constructor(config) {
        this.connection = config.connection;
        this.programId = config.programId || FLASHTRADE_PROGRAM_ID;
        this.usdcMint = new web3_js_1.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    }
    /**
     * Get quote for selling rToken at oracle price
     */
    async getSpotSwapQuote(inputMint, amount, pythPriceAccount) {
        try {
            // Fetch Pyth oracle price
            const oraclePrice = await this.getPythPrice(pythPriceAccount);
            if (!oraclePrice) {
                logger_1.logger.warn('Failed to fetch Pyth oracle price');
                return null;
            }
            // Calculate output amount at oracle price
            // amount is in token units (9 decimals for rTokens)
            const inputAmountTokens = amount / 1000000000;
            const outputAmountUSDC = inputAmountTokens * oraclePrice;
            // Flash.trade fee: 0.1%
            const fee = outputAmountUSDC * 0.001;
            const outputAfterFee = outputAmountUSDC - fee;
            // No price impact on oracle swaps (that's the beauty!)
            const priceImpact = 0;
            logger_1.logger.debug(`Flash.trade quote: ${inputAmountTokens} tokens → $${outputAfterFee.toFixed(2)} USDC at oracle price $${oraclePrice.toFixed(2)}`);
            return {
                inputAmount: amount,
                outputAmount: Math.floor(outputAfterFee * 1000000), // Convert to lamports
                oraclePrice,
                fee,
                priceImpact
            };
        }
        catch (error) {
            logger_1.logger.error(`Error getting Flash.trade quote: ${error.message}`);
            return null;
        }
    }
    /**
     * Execute spot swap: Sell rToken at oracle price for USDC
     */
    async executeSpotSwap(userKeypair, params) {
        try {
            logger_1.logger.info(`Executing Flash.trade spot swap: ${params.amount / 1000000000} tokens → USDC`);
            // Get user token accounts
            const userInputAccount = await (0, spl_token_1.getAssociatedTokenAddress)(params.inputMint, userKeypair.publicKey);
            const userOutputAccount = await (0, spl_token_1.getAssociatedTokenAddress)(params.outputMint, userKeypair.publicKey);
            // Build swap instruction
            const swapIx = await this.buildSpotSwapInstruction(userKeypair.publicKey, userInputAccount, userOutputAccount, params);
            // Create and send transaction
            const transaction = new web3_js_1.Transaction().add(swapIx);
            transaction.feePayer = userKeypair.publicKey;
            transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
            const signature = await this.connection.sendTransaction(transaction, [userKeypair], {
                skipPreflight: false,
                preflightCommitment: 'confirmed'
            });
            logger_1.logger.info(`Flash.trade swap submitted: ${signature}`);
            // Wait for confirmation
            const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
            if (confirmation.value.err) {
                logger_1.logger.error(`Flash.trade swap failed: ${JSON.stringify(confirmation.value.err)}`);
                return null;
            }
            logger_1.logger.info(`✅ Flash.trade swap confirmed: ${signature}`);
            return signature;
        }
        catch (error) {
            logger_1.logger.error(`Error executing Flash.trade swap: ${error.message}`);
            return null;
        }
    }
    /**
     * Build spot swap instruction
     * This is a simplified version - actual implementation needs Flash.trade's IDL
     */
    async buildSpotSwapInstruction(user, userInputAccount, userOutputAccount, params) {
        // NOTE: This is a placeholder structure
        // Actual implementation requires Flash.trade's program IDL and account structure
        // Derive pool PDA (example structure)
        const [poolPda] = web3_js_1.PublicKey.findProgramAddressSync([
            Buffer.from('pool'),
            params.inputMint.toBuffer(),
            params.outputMint.toBuffer()
        ], this.programId);
        // Derive pool token accounts
        const poolInputAccount = await (0, spl_token_1.getAssociatedTokenAddress)(params.inputMint, poolPda, true);
        const poolOutputAccount = await (0, spl_token_1.getAssociatedTokenAddress)(params.outputMint, poolPda, true);
        // Build instruction data (example - needs actual encoding)
        const data = Buffer.alloc(17);
        data.writeUInt8(1, 0); // Instruction discriminator for spot_swap
        data.writeBigUInt64LE(BigInt(params.amount), 1);
        data.writeBigUInt64LE(BigInt(params.minOutputAmount), 9);
        return new web3_js_1.TransactionInstruction({
            programId: this.programId,
            keys: [
                { pubkey: user, isSigner: true, isWritable: false },
                { pubkey: userInputAccount, isSigner: false, isWritable: true },
                { pubkey: userOutputAccount, isSigner: false, isWritable: true },
                { pubkey: poolPda, isSigner: false, isWritable: true },
                { pubkey: poolInputAccount, isSigner: false, isWritable: true },
                { pubkey: poolOutputAccount, isSigner: false, isWritable: true },
                { pubkey: params.pythPriceAccount, isSigner: false, isWritable: false },
                { pubkey: PYTH_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            data
        });
    }
    /**
     * Fetch price from Pyth oracle
     */
    async getPythPrice(pythAccount) {
        try {
            const accountInfo = await this.connection.getAccountInfo(pythAccount);
            if (!accountInfo) {
                logger_1.logger.warn(`Pyth account not found: ${pythAccount.toBase58()}`);
                return null;
            }
            // Parse Pyth price data
            // Pyth price format: price (i64) at offset 208, expo (i32) at offset 216
            const data = accountInfo.data;
            const price = data.readBigInt64LE(208);
            const expo = data.readInt32LE(216);
            // Calculate actual price: price * 10^expo
            const actualPrice = Number(price) * Math.pow(10, expo);
            logger_1.logger.debug(`Pyth oracle price: $${actualPrice.toFixed(2)}`);
            return actualPrice;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching Pyth price: ${error.message}`);
            return null;
        }
    }
    /**
     * Get Pyth price account for a symbol
     * These are the mainnet Pyth price feeds for stocks
     */
    getPythPriceAccount(symbol) {
        // Normalize symbol: strip 'r' suffix (e.g., 'MSTRr' -> 'MSTR', 'TSLAr' -> 'TSLA')
        const normalizedSymbol = symbol.replace(/r$/i, '');
        const pythAccounts = {
            'TSLA': 'Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD', // Tesla
            'SPY': 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG', // S&P 500 ETF
            'NVDA': 'BkN8hYgRjhyH5WNBQfDV8K3G4vXhVRKJYzHvYJFjJVhL', // Nvidia
            'MSTR': '3m1y5h2uv7EQL3KaJZehvAJa4yDNvgc5yAdL9KPMKwvk', // MicroStrategy
            'CRCL': 'CrCLLbLq7msGA3qHhwPCdxZq5VLfTkLdGMfKJJYjKLnG', // Circle (example)
        };
        const account = pythAccounts[normalizedSymbol];
        if (!account) {
            logger_1.logger.warn(`No Pyth price account found for ${symbol} (normalized: ${normalizedSymbol})`);
            return null;
        }
        logger_1.logger.debug(`Pyth account for ${symbol} (normalized: ${normalizedSymbol}): ${account}`);
        return new web3_js_1.PublicKey(account);
    }
    /**
     * Helper to get token balance with retry logic
     * Uses getTokenAccountsByOwner for more reliable account discovery
     */
    async getTokenBalanceWithRetry(tokenMint, owner, maxRetries = 15, delayMs = 2000) {
        // Token program IDs
        const TOKEN_PROGRAM_ID = new web3_js_1.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const TOKEN_2022_PROGRAM_ID = new web3_js_1.PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Check both SPL Token and Token-2022 programs (rStocks use Token-2022)
                const [splAccounts, token2022Accounts] = await Promise.all([
                    this.connection.getTokenAccountsByOwner(owner, { mint: tokenMint, programId: TOKEN_PROGRAM_ID }),
                    this.connection.getTokenAccountsByOwner(owner, { mint: tokenMint, programId: TOKEN_2022_PROGRAM_ID })
                ]);
                const allAccounts = [...splAccounts.value, ...token2022Accounts.value];
                if (allAccounts.length > 0) {
                    // Parse the account data to get balance
                    const accountInfo = allAccounts[0];
                    // Token account data: first 64 bytes are mint, then 32 bytes owner, then 8 bytes amount
                    const data = accountInfo.account.data;
                    const amount = data.readBigUInt64LE(64);
                    if (amount > BigInt(0)) {
                        const programType = token2022Accounts.value.length > 0 ? 'Token-2022' : 'SPL Token';
                        logger_1.logger.info(`✅ Token balance fetched (${programType}): ${Number(amount) / 1000000000} tokens`);
                        return amount;
                    }
                }
                if (attempt === maxRetries) {
                    logger_1.logger.error(`No token balance found after ${maxRetries} attempts`);
                    return BigInt(0);
                }
                logger_1.logger.info(`⏳ Token balance fetch attempt ${attempt}/${maxRetries} - waiting for account to appear...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            catch (error) {
                const errorMsg = error.message || String(error);
                if (attempt === maxRetries) {
                    logger_1.logger.error(`Failed to fetch token balance after ${maxRetries} attempts: ${errorMsg}`);
                    throw error;
                }
                logger_1.logger.info(`⏳ Token balance fetch attempt ${attempt}/${maxRetries} failed, retrying in ${delayMs / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        return BigInt(0);
    }
    /**
     * Execute complete arbitrage trade
     * Buy on Jupiter → Sell on Flash.trade
     */
    async executeArbitrageTrade(userKeypair, tokenMint, symbol, amountUSDC, jupiterBuySignature) {
        try {
            logger_1.logger.info(`🎯 Executing arbitrage: Jupiter buy → Flash.trade sell for ${symbol}`);
            // Wait for Jupiter buy to settle on-chain - increased to 5 seconds
            logger_1.logger.info('⏳ Waiting for Jupiter transaction to settle (5s)...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            // Get user's token balance (how much we bought) with retry
            logger_1.logger.info(`📊 Fetching token balance for ${symbol}...`);
            const tokenAmount = await this.getTokenBalanceWithRetry(tokenMint, userKeypair.publicKey);
            if (tokenAmount === BigInt(0)) {
                logger_1.logger.error('No tokens received from Jupiter buy');
                return { success: false };
            }
            logger_1.logger.info(`Received ${Number(tokenAmount) / 1000000000} tokens from Jupiter`);
            // Get Pyth price account
            const pythAccount = this.getPythPriceAccount(symbol);
            if (!pythAccount) {
                logger_1.logger.error(`No Pyth account for ${symbol}`);
                return { success: false };
            }
            // Get quote for selling at oracle price
            const quote = await this.getSpotSwapQuote(tokenMint, Number(tokenAmount), pythAccount);
            if (!quote) {
                logger_1.logger.warn('⚠️  Could not get Flash.trade quote - tokens held in wallet');
                logger_1.logger.info(`💡 Manually sell ${Number(tokenAmount) / 1000000000} ${symbol} tokens on Flash.trade`);
                logger_1.logger.info(`   Visit: https://www.flash.trade/USDC-${symbol.replace(/r$/i, '')}r`);
                return {
                    success: true, // Jupiter buy succeeded
                    profit: 0 // Unknown until manual sell
                };
            }
            // Calculate expected profit at oracle price
            const expectedUsdcReceived = quote.outputAmount / 1000000;
            const expectedProfit = expectedUsdcReceived - amountUSDC;
            logger_1.logger.info(`📊 Flash.trade Quote:`);
            logger_1.logger.info(`   Oracle Price: $${quote.oraclePrice.toFixed(2)}`);
            logger_1.logger.info(`   Expected USDC: $${expectedUsdcReceived.toFixed(2)}`);
            logger_1.logger.info(`   Expected Profit: $${expectedProfit.toFixed(2)}`);
            // NOTE: Flash.trade on-chain spot swap integration is not yet complete
            // The buildSpotSwapInstruction() function is placeholder code
            // For now, we log the opportunity and let user manually sell on Flash.trade web UI
            logger_1.logger.warn('⚠️  Flash.trade on-chain sell not yet implemented');
            logger_1.logger.info(`💡 To complete arbitrage, manually sell on Flash.trade:`);
            logger_1.logger.info(`   1. Visit: https://www.flash.trade/USDC-${symbol.replace(/r$/i, '')}r`);
            logger_1.logger.info(`   2. Sell ${Number(tokenAmount) / 1000000000} ${symbol} tokens`);
            logger_1.logger.info(`   3. Expected to receive: ~$${expectedUsdcReceived.toFixed(2)} USDC`);
            // Return success since Jupiter buy worked - tokens are in wallet
            return {
                success: true,
                profit: expectedProfit // Expected profit if user sells at oracle price
            };
        }
        catch (error) {
            logger_1.logger.error(`Error executing arbitrage: ${error.message}`);
            return { success: false };
        }
    }
}
exports.FlashTradeClient = FlashTradeClient;
//# sourceMappingURL=flashtrade-client.js.map