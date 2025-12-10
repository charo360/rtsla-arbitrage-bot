"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiTokenMonitor = void 0;
const price_fetcher_1 = require("../utils/price-fetcher");
const jupiter_client_1 = require("../utils/jupiter-client");
const trade_executor_1 = require("../utils/trade-executor");
const logger_1 = require("../utils/logger");
const config_1 = require("../config/config");
const wallet_manager_1 = require("../utils/wallet-manager");
const web3_js_1 = require("@solana/web3.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class MultiTokenMonitor {
    constructor() {
        this.tradeExecutor = null;
        this.walletManager = null;
        this.tokens = [];
        this.opportunities = [];
        this.isTrading = false; // Lock to prevent concurrent trades
        this.stats = new Map();
        this.priceFetcher = new price_fetcher_1.PriceFetcher();
        this.connection = new web3_js_1.Connection(config_1.config.rpcUrl, 'confirmed');
        this.jupiterClient = new jupiter_client_1.JupiterClient(this.connection);
        this.initializeTokens();
        this.initializeWalletManager();
    }
    initializeWalletManager() {
        // Only initialize if wallets are configured
        if (config_1.config.walletPrivateKeys.length === 0) {
            logger_1.logger.warn('💼 No wallets configured - running in monitoring mode only');
            return;
        }
        try {
            // Map strategy string to enum
            const strategyMap = {
                'round_robin': wallet_manager_1.WalletSelectionStrategy.ROUND_ROBIN,
                'highest_balance': wallet_manager_1.WalletSelectionStrategy.HIGHEST_BALANCE,
                'least_used': wallet_manager_1.WalletSelectionStrategy.LEAST_USED,
                'random': wallet_manager_1.WalletSelectionStrategy.RANDOM
            };
            const strategy = strategyMap[config_1.config.walletSelectionStrategy] || wallet_manager_1.WalletSelectionStrategy.ROUND_ROBIN;
            this.walletManager = new wallet_manager_1.WalletManager(this.connection, config_1.config.tokens.usdc, strategy);
            // Add all wallets
            this.walletManager.addWallets(config_1.config.walletPrivateKeys, 'Trading');
            logger_1.logger.info(`💼 Wallet Manager initialized with ${config_1.config.walletPrivateKeys.length} wallet(s)`);
            logger_1.logger.info(`📊 Selection strategy: ${config_1.config.walletSelectionStrategy}`);
            // Initialize trade executor if auto-execute is enabled
            if (config_1.config.autoExecute) {
                this.tradeExecutor = new trade_executor_1.TradeExecutor(this.connection, this.walletManager);
                logger_1.logger.info(`🤖 Trade Executor initialized - AUTO-EXECUTE ENABLED`);
            }
            // Print initial wallet summary
            this.walletManager.printSummary();
        }
        catch (error) {
            logger_1.logger.error(`Failed to initialize wallet manager: ${error.message}`);
            this.walletManager = null;
        }
    }
    initializeTokens() {
        // Add all configured tokens
        if (config_1.config.tokens.rTSLA) {
            this.tokens.push({
                symbol: 'TSLAr',
                name: 'Tesla',
                mintAddress: config_1.config.tokens.rTSLA.toString(),
                yahooSymbol: 'TSLA'
            });
        }
        // DISABLED: CRCLr has insufficient liquidity - sells fail with error 0x1788
        // if (config.tokens.rCRCL) {
        //   this.tokens.push({
        //     symbol: 'CRCLr',
        //     name: 'Circle',
        //     mintAddress: config.tokens.rCRCL.toString(),
        //     yahooSymbol: 'CRCL'
        //   });
        // }
        if (config_1.config.tokens.rSPY) {
            this.tokens.push({
                symbol: 'SPYr',
                name: 'S&P 500',
                mintAddress: config_1.config.tokens.rSPY.toString(),
                yahooSymbol: 'SPY'
            });
        }
        if (config_1.config.tokens.rMSTR) {
            this.tokens.push({
                symbol: 'MSTRr',
                name: 'MicroStrategy',
                mintAddress: config_1.config.tokens.rMSTR.toString(),
                yahooSymbol: 'MSTR'
            });
        }
        if (config_1.config.tokens.rNVDA) {
            this.tokens.push({
                symbol: 'NVDAr',
                name: 'Nvidia',
                mintAddress: config_1.config.tokens.rNVDA.toString(),
                yahooSymbol: 'NVDA'
            });
        }
        logger_1.logger.info(`📊 Monitoring ${this.tokens.length} tokens:`, this.tokens.map(t => t.symbol).join(', '));
        // Initialize stats for each token
        this.tokens.forEach(token => {
            this.stats.set(token.symbol, {
                totalChecks: 0,
                opportunitiesFound: 0,
                avgSpread: 0,
                maxSpread: 0,
                totalEstimatedProfit: 0
            });
        });
    }
    async startMonitoring() {
        logger_1.logger.info('🚀 Starting multi-token price monitoring...\n');
        // Initial check
        await this.checkAllTokens();
        // Set up periodic checks
        setInterval(async () => {
            await this.checkAllTokens();
        }, config_1.config.pollIntervalMs);
    }
    async checkAllTokens() {
        const checkTime = new Date().toLocaleTimeString();
        logger_1.logger.info(`\n${'='.repeat(80)}`);
        logger_1.logger.info(`⏰ Price Check at ${checkTime}`);
        logger_1.logger.info('='.repeat(80));
        // Check all tokens in parallel
        const results = await Promise.allSettled(this.tokens.map(token => this.checkToken(token)));
        // Log summary
        let totalOpportunities = 0;
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                totalOpportunities++;
            }
        });
        if (totalOpportunities > 0) {
            logger_1.logger.info(`\n🎯 Found ${totalOpportunities} opportunities in this check!`);
        }
        else {
            logger_1.logger.info(`\n✓ Check complete - No opportunities above ${config_1.config.minSpreadPercent}% threshold`);
        }
        logger_1.logger.info('='.repeat(80) + '\n');
    }
    async checkToken(token) {
        try {
            const stats = this.stats.get(token.symbol);
            stats.totalChecks++;
            // Get prices from different sources
            const [remoraPrice, yahooPrice] = await Promise.all([
                this.getRemoraPrice(token),
                this.getYahooPrice(token.yahooSymbol)
            ]);
            if (!remoraPrice || !yahooPrice) {
                logger_1.logger.warn(`${token.symbol}: Unable to fetch prices - Remora: ${remoraPrice}, Yahoo: ${yahooPrice}`);
                return false;
            }
            // Calculate spread
            const spread = yahooPrice - remoraPrice;
            const spreadPercent = (spread / yahooPrice) * 100;
            const absSpreadPercent = Math.abs(spreadPercent);
            // Update stats
            stats.avgSpread = (stats.avgSpread * (stats.totalChecks - 1) + absSpreadPercent) / stats.totalChecks;
            stats.maxSpread = Math.max(stats.maxSpread, absSpreadPercent);
            // Log price info
            const direction = spread > 0 ? 'BUY_REMORA' : 'SELL_REMORA';
            console.log(`${token.symbol.padEnd(8)} | Remora: $${remoraPrice.toFixed(2).padStart(8)} | Oracle: $${yahooPrice.toFixed(2).padStart(8)} | Spread: ${spreadPercent.toFixed(2).padStart(6)}%`);
            // Check if opportunity exists
            if (absSpreadPercent >= config_1.config.minSpreadPercent) {
                const estimatedProfit = this.calculateProfit(config_1.config.tradeAmountUsdc, remoraPrice, yahooPrice, direction);
                if (estimatedProfit >= config_1.config.minProfitThreshold) {
                    stats.opportunitiesFound++;
                    stats.totalEstimatedProfit += estimatedProfit;
                    // Log opportunity
                    logger_1.logger.info(`   🎯 OPPORTUNITY! Profit: $${estimatedProfit.toFixed(2)} | Direction: ${direction}`);
                    // Save opportunity
                    const opportunity = {
                        token: token.symbol,
                        timestamp: Date.now(),
                        remoraPrice,
                        oraclePrice: yahooPrice,
                        spread,
                        spreadPercent,
                        estimatedProfit,
                        direction
                    };
                    this.opportunities.push(opportunity);
                    this.saveOpportunities();
                    // Execute trade if auto-execute is enabled and not already trading
                    if (this.tradeExecutor && config_1.config.autoExecute) {
                        // Check if already trading - skip if so
                        if (this.isTrading) {
                            logger_1.logger.info(`⏳ Trade already in progress, skipping ${token.symbol}`);
                            return true;
                        }
                        // Lock trading
                        this.isTrading = true;
                        logger_1.logger.info(`🔒 Trade lock acquired for ${token.symbol}`);
                        try {
                            logger_1.logger.info(`🚀 Executing trade for ${token.symbol}...`);
                            const tradeResult = await this.tradeExecutor.executeTrade({
                                token: token.symbol,
                                tokenMint: new web3_js_1.PublicKey(token.mintAddress),
                                direction,
                                amount: config_1.config.tradeAmountUsdc,
                                expectedProfit: estimatedProfit,
                                remoraPrice,
                                oraclePrice: yahooPrice,
                                spreadPercent
                            });
                            if (tradeResult.success) {
                                logger_1.logger.info(`✅ Trade executed successfully!`);
                                logger_1.logger.info(`   Signature: ${tradeResult.signature}`);
                                logger_1.logger.info(`   Profit: $${tradeResult.profit?.toFixed(2)}`);
                            }
                            else {
                                logger_1.logger.error(`❌ Trade failed: ${tradeResult.error}`);
                            }
                        }
                        finally {
                            // Always unlock when done
                            this.isTrading = false;
                            logger_1.logger.info(`🔓 Trade lock released`);
                        }
                    }
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            logger_1.logger.debug(`${token.symbol}: Error checking prices - ${error.message}`);
            return false;
        }
    }
    async getRemoraPrice(token) {
        try {
            // Get REAL DEX price from Jupiter (aggregates all DEXs including Remora)
            const tokenMint = new web3_js_1.PublicKey(token.mintAddress);
            const price = await this.jupiterClient.getTokenPrice(tokenMint);
            if (price) {
                return price;
            }
            // Fallback to simulated price if Jupiter fails
            logger_1.logger.debug(`Jupiter price failed for ${token.symbol}, using fallback`);
            const yahooPrice = await this.getYahooPrice(token.yahooSymbol);
            if (!yahooPrice)
                return null;
            // Simulate 0.5-2% difference as fallback
            const variation = (Math.random() * 1.5 + 0.5) / 100;
            const direction = Math.random() > 0.5 ? 1 : -1;
            return yahooPrice * (1 + (direction * variation));
        }
        catch (error) {
            logger_1.logger.debug(`Error getting price for ${token.symbol}: ${error}`);
            return null;
        }
    }
    async getYahooPrice(symbol) {
        try {
            const axios = require('axios');
            const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, { timeout: 5000 });
            const result = response.data?.chart?.result?.[0];
            if (!result) {
                logger_1.logger.warn(`No Yahoo data for ${symbol}`);
                return null;
            }
            const price = result.meta?.regularMarketPrice;
            if (!price) {
                logger_1.logger.warn(`No price in Yahoo data for ${symbol}`);
            }
            return price || null;
        }
        catch (error) {
            logger_1.logger.error(`Yahoo API error for ${symbol}: ${error.message}`);
            return null;
        }
    }
    calculateProfit(tradeAmount, buyPrice, sellPrice, direction) {
        if (direction === 'BUY_REMORA') {
            // Buy on Remora (lower), sell on oracle (higher)
            const shares = tradeAmount / buyPrice;
            const revenue = shares * sellPrice;
            const profit = revenue - tradeAmount;
            // Subtract estimated fees (0.3% trading fees + gas)
            const fees = tradeAmount * 0.003 + 0.01; // ~$0.01 gas
            return profit - fees;
        }
        else {
            // Sell on Remora (higher), buy on oracle (lower)
            const shares = tradeAmount / sellPrice;
            const revenue = shares * buyPrice;
            const profit = tradeAmount - revenue;
            const fees = tradeAmount * 0.003 + 0.01;
            return profit - fees;
        }
    }
    saveOpportunities() {
        try {
            // Ensure data directory exists
            if (!fs.existsSync(config_1.config.dataDir)) {
                fs.mkdirSync(config_1.config.dataDir, { recursive: true });
            }
            const filePath = path.join(config_1.config.dataDir, 'multi-token-opportunities.json');
            // Keep only last 1000 opportunities
            const recentOpportunities = this.opportunities.slice(-1000);
            fs.writeFileSync(filePath, JSON.stringify(recentOpportunities, null, 2));
        }
        catch (error) {
            logger_1.logger.error('Error saving opportunities:', error.message);
        }
    }
    getStats() {
        return this.stats;
    }
    getAllOpportunities() {
        return this.opportunities;
    }
    getTokenOpportunities(symbol) {
        return this.opportunities.filter(opp => opp.token === symbol);
    }
    getWalletManager() {
        return this.walletManager;
    }
    async updateWalletBalances() {
        if (this.walletManager) {
            await this.walletManager.updateAllBalances();
        }
    }
    printWalletSummary() {
        if (this.walletManager) {
            this.walletManager.printSummary();
        }
    }
}
exports.MultiTokenMonitor = MultiTokenMonitor;
//# sourceMappingURL=multi-token-monitor.js.map