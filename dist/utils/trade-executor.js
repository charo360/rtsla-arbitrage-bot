"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeExecutor = void 0;
const web3_js_1 = require("@solana/web3.js");
const jupiter_client_1 = require("./jupiter-client");
const flashtrade_client_1 = require("./flashtrade-client");
const logger_1 = require("./logger");
const config_1 = require("../config/config");
// Token program IDs for balance checking
const TOKEN_PROGRAM_ID = new web3_js_1.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new web3_js_1.PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
class TradeExecutor {
    constructor(connection, walletManager) {
        this.TOKEN_2022_PROGRAM_ID = new web3_js_1.PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
        this.connection = connection;
        this.walletManager = walletManager;
        this.jupiterClient = new jupiter_client_1.JupiterClient(connection);
        this.flashTradeClient = new flashtrade_client_1.FlashTradeClient({ connection });
    }
    /**
     * Get token balance for a wallet (supports both SPL Token and Token-2022)
     */
    async getTokenBalance(owner, tokenMint) {
        try {
            // Try both token programs (rTokens use Token-2022)
            const [splAccounts, token2022Accounts] = await Promise.all([
                this.connection.getTokenAccountsByOwner(owner, { mint: tokenMint, programId: TOKEN_PROGRAM_ID }),
                this.connection.getTokenAccountsByOwner(owner, { mint: tokenMint, programId: TOKEN_2022_PROGRAM_ID })
            ]);
            const allAccounts = [...splAccounts.value, ...token2022Accounts.value];
            if (allAccounts.length === 0) {
                logger_1.logger.debug(`No token accounts found for ${tokenMint.toBase58()}`);
                return null;
            }
            // Parse the token account data to get balance
            // Token account data: amount is at offset 64, 8 bytes (u64)
            let totalBalance = BigInt(0);
            for (const account of allAccounts) {
                const data = account.account.data;
                const amount = data.readBigUInt64LE(64);
                totalBalance += amount;
            }
            // rTokens use 9 decimals
            const balance = Number(totalBalance) / 1000000000;
            logger_1.logger.debug(`Token balance for ${tokenMint.toBase58().slice(0, 8)}...: ${balance}`);
            return balance;
        }
        catch (error) {
            logger_1.logger.error(`Error getting token balance: ${error.message}`);
            return null;
        }
    }
    /**
     * Execute an arbitrage trade
     */
    async executeTrade(params) {
        try {
            // Select wallet for this trade
            const wallet = await this.walletManager.selectWallet();
            if (!wallet) {
                return {
                    success: false,
                    error: 'No wallet available for trading'
                };
            }
            logger_1.logger.info(`\n${'='.repeat(80)}`);
            logger_1.logger.info(`🚀 EXECUTING TRADE`);
            logger_1.logger.info(`${'='.repeat(80)}`);
            logger_1.logger.info(`Token: ${params.token}`);
            logger_1.logger.info(`Wallet: ${wallet.name} (${wallet.publicKey.toBase58().slice(0, 8)}...)`);
            logger_1.logger.info(`Direction: ${params.direction}`);
            logger_1.logger.info(`Amount: $${params.amount} USDC`);
            logger_1.logger.info(`Spread: ${params.spreadPercent.toFixed(2)}%`);
            logger_1.logger.info(`Expected Profit: $${params.expectedProfit.toFixed(2)}`);
            logger_1.logger.info(`${'='.repeat(80)}\n`);
            // Check if wallet has sufficient balance
            const hasInsufficientBalance = await this.walletManager.hasInsufficientBalance(wallet.publicKey.toBase58(), params.amount);
            if (hasInsufficientBalance) {
                logger_1.logger.warn(`⚠️  Wallet ${wallet.name} has insufficient balance, skipping trade`);
                return {
                    success: false,
                    error: 'Insufficient balance',
                    walletUsed: wallet.name
                };
            }
            // Validate trade parameters
            if (params.spreadPercent < config_1.config.minSpreadPercent) {
                logger_1.logger.warn(`⚠️  Spread ${params.spreadPercent.toFixed(2)}% below minimum ${config_1.config.minSpreadPercent}%`);
                return {
                    success: false,
                    error: 'Spread below minimum threshold',
                    walletUsed: wallet.name
                };
            }
            if (params.expectedProfit < config_1.config.minProfitThreshold) {
                logger_1.logger.warn(`⚠️  Profit $${params.expectedProfit.toFixed(2)} below minimum $${config_1.config.minProfitThreshold}`);
                return {
                    success: false,
                    error: 'Profit below minimum threshold',
                    walletUsed: wallet.name
                };
            }
            // Execute the trade (placeholder - implement actual trading logic)
            const result = await this.executeTradeTransaction(wallet.keypair, params);
            // Record trade in wallet manager
            this.walletManager.recordTrade(wallet.publicKey.toBase58(), result.success, result.profit || 0);
            if (result.success) {
                logger_1.logger.info(`✅ Trade executed successfully!`);
                logger_1.logger.info(`   Signature: ${result.signature}`);
                logger_1.logger.info(`   Actual Profit: $${result.profit?.toFixed(2)}`);
                logger_1.logger.info(`   Wallet: ${wallet.name}`);
            }
            else {
                logger_1.logger.error(`❌ Trade failed: ${result.error}`);
            }
            return {
                ...result,
                walletUsed: wallet.name
            };
        }
        catch (error) {
            logger_1.logger.error(`Trade execution error: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Execute the actual blockchain transaction using Jupiter
     */
    async executeTradeTransaction(keypair, params) {
        try {
            logger_1.logger.info('📝 Building transaction with Jupiter...');
            // Simulated result for monitoring mode
            if (!config_1.config.autoExecute) {
                logger_1.logger.info('ℹ️  AUTO_EXECUTE is disabled - trade simulated only');
                return {
                    success: true,
                    signature: 'SIMULATED_' + Date.now(),
                    profit: params.expectedProfit
                };
            }
            // Real trading with Jupiter
            logger_1.logger.info('🚀 Executing real trade via Jupiter...');
            // Get quote from Jupiter
            const slippageBps = Math.floor(config_1.config.maxSlippagePercent * 100); // Convert % to basis points
            const quote = await this.jupiterClient.getQuote(params.tokenMint, params.amount, slippageBps);
            if (!quote) {
                throw new Error('Failed to get quote from Jupiter');
            }
            // Log quote details
            const outputAmount = parseInt(quote.outAmount) / 1000000;
            const priceImpact = parseFloat(quote.priceImpactPct);
            logger_1.logger.info(`📊 Jupiter Quote:`);
            logger_1.logger.info(`   Input: ${params.amount} USDC`);
            logger_1.logger.info(`   Output: ${outputAmount.toFixed(6)} tokens`);
            logger_1.logger.info(`   Price Impact: ${priceImpact.toFixed(2)}%`);
            // Check price impact
            if (priceImpact > 2.0) {
                logger_1.logger.warn(`⚠️  High price impact: ${priceImpact.toFixed(2)}% - trade may not be profitable`);
            }
            // Execute swap on Jupiter (BUY side)
            const swapResult = await this.jupiterClient.executeSwap(quote, keypair);
            if (!swapResult.success) {
                throw new Error(swapResult.error || 'Jupiter swap failed');
            }
            logger_1.logger.info(`✅ Jupiter buy executed!`);
            logger_1.logger.info(`   Signature: ${swapResult.signature}`);
            logger_1.logger.info(`   Input: ${swapResult.inputAmount} USDC`);
            logger_1.logger.info(`   Output: ${swapResult.outputAmount} tokens`);
            // REAL CROSS-PLATFORM ARBITRAGE
            // Buy on Jupiter (cheap DEX price) → Sell on Flash Trade (oracle price)
            if (params.direction === 'BUY_REMORA') {
                const tokensReceived = swapResult.outputAmount;
                const buyPrice = swapResult.inputAmount / tokensReceived;
                logger_1.logger.info(`✅ Jupiter buy complete: ${tokensReceived.toFixed(6)} tokens at $${buyPrice.toFixed(2)}`);
                logger_1.logger.info(`📊 Oracle price: $${params.oraclePrice.toFixed(2)}`);
                logger_1.logger.info(`💡 Arbitrage opportunity: Buy at $${buyPrice.toFixed(2)} → Sell at $${params.oraclePrice.toFixed(2)}`);
                // PROPER CONVERGENCE STRATEGY:
                // Buy low on Jupiter, monitor continuously, sell when profitable
                logger_1.logger.info(`💡 Convergence Strategy: Buy low → Monitor → Sell when profitable`);
                logger_1.logger.info(`   Entry price: $${buyPrice.toFixed(2)}`);
                logger_1.logger.info(`   Oracle target: $${params.oraclePrice.toFixed(2)}`);
                logger_1.logger.info(`   Initial spread: ${((params.oraclePrice - buyPrice) / buyPrice * 100).toFixed(2)}%`);
                // CONVERGENCE MONITORING LOOP (2-10 minutes)
                const entryTime = Date.now();
                const MIN_HOLD_TIME = 120; // 2 minutes minimum
                const MAX_HOLD_TIME = 600; // 10 minutes maximum
                const CHECK_INTERVAL = 15; // Check every 15 seconds
                const TAKE_PROFIT = 0.008; // 0.8% profit target
                const STOP_LOSS = -0.005; // -0.5% stop loss
                logger_1.logger.info(`\n📊 MONITORING POSITION:`);
                logger_1.logger.info(`   Min hold: ${MIN_HOLD_TIME}s (${(MIN_HOLD_TIME / 60).toFixed(1)} min)`);
                logger_1.logger.info(`   Max hold: ${MAX_HOLD_TIME}s (${(MAX_HOLD_TIME / 60).toFixed(1)} min)`);
                logger_1.logger.info(`   Check interval: ${CHECK_INTERVAL}s`);
                logger_1.logger.info(`   Take profit: ${(TAKE_PROFIT * 100).toFixed(1)}%`);
                logger_1.logger.info(`   No stop loss - waiting for convergence\n`);
                let sellResult;
                let checkCount = 0;
                let failedQuotes = 0;
                const MAX_FAILED_QUOTES = 5;
                // Wait minimum hold time before first check to avoid immediate stop loss from spread
                logger_1.logger.info(`⏳ Waiting ${MIN_HOLD_TIME}s before first price check...`);
                await new Promise(resolve => setTimeout(resolve, MIN_HOLD_TIME * 1000));
                while (true) {
                    checkCount++;
                    const holdTime = (Date.now() - entryTime) / 1000;
                    // Wait between checks (except first check, already waited MIN_HOLD_TIME)
                    if (checkCount > 1) {
                        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL * 1000));
                    }
                    // Get current sell quote (token → USDC)
                    const currentQuote = await this.jupiterClient.getQuoteReverse(params.tokenMint, tokensReceived, 9, // 9 decimals for rTokens
                    100 // 1% slippage
                    );
                    if (!currentQuote) {
                        failedQuotes++;
                        logger_1.logger.warn(`⚠️ Failed to get sell quote (${failedQuotes}/${MAX_FAILED_QUOTES}), retrying...`);
                        // If too many failed quotes, exit with emergency sell attempt
                        if (failedQuotes >= MAX_FAILED_QUOTES) {
                            logger_1.logger.error(`❌ Too many failed quotes, attempting emergency sell...`);
                            sellResult = await this.jupiterClient.executeSellSwap(params.tokenMint, tokensReceived, keypair, 9, 500 // 5% slippage for emergency
                            );
                            break;
                        }
                        continue;
                    }
                    // Reset failed quote counter on success
                    failedQuotes = 0;
                    // Calculate current sell price and profit
                    const usdcOut = parseInt(currentQuote.outAmount) / 1000000;
                    const currentSellPrice = usdcOut / tokensReceived;
                    const profit = (usdcOut - buyPrice * tokensReceived) / (buyPrice * tokensReceived);
                    const profitUSD = usdcOut - (buyPrice * tokensReceived);
                    logger_1.logger.info(`[${holdTime.toFixed(0)}s] Check #${checkCount}: Price $${currentSellPrice.toFixed(2)} | Profit: ${(profit * 100).toFixed(2)}% ($${profitUSD.toFixed(2)})`);
                    // EXIT CONDITION 1: Take Profit
                    if (profit >= TAKE_PROFIT && holdTime >= MIN_HOLD_TIME) {
                        logger_1.logger.info(`\n✅ TAKE PROFIT: ${(profit * 100).toFixed(2)}% profit reached!`);
                        sellResult = await this.jupiterClient.executeSellSwap(params.tokenMint, tokensReceived, keypair, 9, 100);
                        break;
                    }
                    // EXIT CONDITION 2: Maximum Hold Time
                    if (holdTime >= MAX_HOLD_TIME) {
                        logger_1.logger.info(`\n⏰ MAX HOLD TIME: ${(holdTime / 60).toFixed(1)} minutes - exiting position`);
                        logger_1.logger.info(`   Final profit: ${(profit * 100).toFixed(2)}%`);
                        sellResult = await this.jupiterClient.executeSellSwap(params.tokenMint, tokensReceived, keypair, 9, 100);
                        break;
                    }
                    // EXIT CONDITION 3: Minimum hold time met + any positive profit
                    if (holdTime >= MIN_HOLD_TIME && profit > 0.002) {
                        logger_1.logger.info(`\n💰 PROFITABLE EXIT: ${(profit * 100).toFixed(2)}% profit after ${(holdTime / 60).toFixed(1)} min`);
                        sellResult = await this.jupiterClient.executeSellSwap(params.tokenMint, tokensReceived, keypair, 9, 100);
                        break;
                    }
                }
                if (!sellResult.success) {
                    logger_1.logger.error(`⚠️  Sell failed: ${sellResult.error}`);
                    logger_1.logger.info(`💡 Tokens held in wallet. Options:`);
                    logger_1.logger.info(`   1. Sell manually on Jupiter: https://jup.ag/`);
                    logger_1.logger.info(`   2. Sell on Flash Trade: https://www.flash.trade/USDC-${params.token.replace(/r$/i, '')}r`);
                    logger_1.logger.info(`   3. Hold and wait for better price`);
                    return {
                        success: false,
                        signature: swapResult.signature,
                        error: `Sell failed: ${sellResult.error}`,
                        profit: 0
                    };
                }
                // Calculate actual profit
                const usdcReceived = sellResult.outputAmount;
                const usdcSpent = swapResult.inputAmount;
                const actualProfit = usdcReceived - usdcSpent;
                const profitPercent = (actualProfit / usdcSpent) * 100;
                logger_1.logger.info(`✅ ARBITRAGE COMPLETE!`);
                logger_1.logger.info(`   Buy:  ${swapResult.signature}`);
                logger_1.logger.info(`   Sell: ${sellResult.signature}`);
                logger_1.logger.info(`   📊 Results:`);
                logger_1.logger.info(`      USDC In:  $${usdcSpent.toFixed(2)}`);
                logger_1.logger.info(`      USDC Out: $${usdcReceived.toFixed(2)}`);
                logger_1.logger.info(`      💰 Profit: $${actualProfit.toFixed(2)} (${profitPercent.toFixed(2)}%)`);
                // Log profitability analysis
                if (actualProfit > 0) {
                    logger_1.logger.info(`   ✅ PROFITABLE TRADE!`);
                }
                else if (actualProfit > -0.10) {
                    logger_1.logger.warn(`   ⚠️  Small loss (likely fees) - consider larger trade sizes`);
                }
                else {
                    logger_1.logger.error(`   ❌ LOSS - price moved against us`);
                }
                return {
                    success: true,
                    signature: `${swapResult.signature}|${sellResult.signature}`,
                    profit: actualProfit
                };
            }
            else {
                // SELL_REMORA: Jupiter price > Oracle price
                // Strategy: Buy on Flash Trade (oracle) → Sell on Jupiter (higher)
                logger_1.logger.warn('⚠️  SELL_REMORA (reverse arbitrage) not yet implemented');
                logger_1.logger.info(`💡 Opportunity: Jupiter price ($${params.remoraPrice.toFixed(2)}) > Oracle ($${params.oraclePrice.toFixed(2)})`);
                logger_1.logger.info(`   Strategy: Buy on Flash Trade → Sell on Jupiter`);
                return {
                    success: false,
                    error: 'Reverse arbitrage not implemented'
                };
            }
        }
        catch (error) {
            logger_1.logger.error(`Transaction error: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Batch execute multiple trades
     */
    async executeBatchTrades(trades) {
        logger_1.logger.info(`\n🔄 Executing ${trades.length} trades in batch...\n`);
        const results = [];
        for (const trade of trades) {
            const result = await this.executeTrade(trade);
            results.push(result);
            // Small delay between trades
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // Summary
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const totalProfit = results
            .filter(r => r.success)
            .reduce((sum, r) => sum + (r.profit || 0), 0);
        logger_1.logger.info(`\n${'='.repeat(80)}`);
        logger_1.logger.info(`📊 BATCH TRADE SUMMARY`);
        logger_1.logger.info(`${'='.repeat(80)}`);
        logger_1.logger.info(`Total Trades: ${trades.length}`);
        logger_1.logger.info(`Successful: ${successful}`);
        logger_1.logger.info(`Failed: ${failed}`);
        logger_1.logger.info(`Success Rate: ${((successful / trades.length) * 100).toFixed(1)}%`);
        logger_1.logger.info(`Total Profit: $${totalProfit.toFixed(2)}`);
        logger_1.logger.info(`${'='.repeat(80)}\n`);
        return results;
    }
    /**
     * Get wallet manager instance
     */
    getWalletManager() {
        return this.walletManager;
    }
}
exports.TradeExecutor = TradeExecutor;
//# sourceMappingURL=trade-executor.js.map