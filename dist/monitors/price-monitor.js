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
exports.PriceMonitor = void 0;
const price_fetcher_1 = require("../utils/price-fetcher");
const logger_1 = require("../utils/logger");
const config_1 = require("../config/config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class PriceMonitor {
    constructor() {
        this.opportunities = [];
        this.stats = {
            totalChecks: 0,
            opportunitiesFound: 0,
            lastOpportunity: null,
        };
        this.priceFetcher = new price_fetcher_1.PriceFetcher();
        this.dataFilePath = path.join(config_1.config.dataDir, 'opportunities.json');
        this.loadExistingOpportunities();
    }
    loadExistingOpportunities() {
        try {
            if (fs.existsSync(this.dataFilePath)) {
                const data = fs.readFileSync(this.dataFilePath, 'utf-8');
                this.opportunities = JSON.parse(data);
                logger_1.logger.info(`Loaded ${this.opportunities.length} historical opportunities`);
            }
        }
        catch (error) {
            logger_1.logger.warn('Could not load historical opportunities:', error.message);
        }
    }
    calculateSpread(price1, price2) {
        const spread = Math.abs(price1 - price2);
        const spreadPercent = (spread / Math.min(price1, price2)) * 100;
        return { spread, spreadPercent };
    }
    estimateProfit(spreadPercent, tradeAmount) {
        const grossProfit = tradeAmount * (spreadPercent / 100);
        // Fees
        const flashLoanFee = tradeAmount * 0.0005; // 0.05%
        const remoraSwapFee = tradeAmount * 0.0015; // ~0.15%
        const flashTradeSwapFee = tradeAmount * 0.0002; // ~0.02%
        const gasCost = 0.03; // ~$0.03 in SOL
        const totalFees = flashLoanFee + remoraSwapFee + flashTradeSwapFee + gasCost;
        return grossProfit - totalFees;
    }
    async checkSpread() {
        this.stats.totalChecks++;
        try {
            const [remoraData, pythData] = await Promise.all([
                this.priceFetcher.getRemoraPoolPrice(),
                this.priceFetcher.getPythPrice()
            ]);
            if (!remoraData) {
                logger_1.logger.warn('Could not fetch Remora price');
                return null;
            }
            const pythPrice = pythData?.price || null;
            const comparePrice = pythPrice || remoraData.price;
            const { spread, spreadPercent } = this.calculateSpread(remoraData.price, comparePrice);
            const direction = remoraData.price < comparePrice ? 'BUY_REMORA' : 'SELL_REMORA';
            logger_1.logger.debug('Price Check', {
                remora: `$${remoraData.price.toFixed(2)}`,
                pyth: pythPrice ? `$${pythPrice.toFixed(2)}` : 'N/A',
                spread: `${spreadPercent.toFixed(3)}%`,
                check: this.stats.totalChecks
            });
            if (spreadPercent >= config_1.config.minSpreadPercent) {
                const estimatedProfit = this.estimateProfit(spreadPercent, config_1.config.tradeAmountUsdc);
                const opportunity = {
                    timestamp: Date.now(),
                    remoraPrice: remoraData.price,
                    pythPrice,
                    spread,
                    spreadPercent,
                    direction,
                    estimatedProfit,
                    tradeAmount: config_1.config.tradeAmountUsdc
                };
                this.stats.opportunitiesFound++;
                this.stats.lastOpportunity = new Date();
                logger_1.logger.info('🎯 OPPORTUNITY FOUND!', {
                    spread: `${spreadPercent.toFixed(2)}%`,
                    direction,
                    estimatedProfit: `$${estimatedProfit.toFixed(2)}`,
                    tradeAmount: `$${config_1.config.tradeAmountUsdc}`
                });
                (0, logger_1.logOpportunity)(opportunity);
                this.opportunities.push(opportunity);
                this.saveOpportunities();
                return opportunity;
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error('Error checking spread:', error);
            return null;
        }
    }
    saveOpportunities() {
        try {
            if (!fs.existsSync(config_1.config.dataDir)) {
                fs.mkdirSync(config_1.config.dataDir, { recursive: true });
            }
            fs.writeFileSync(this.dataFilePath, JSON.stringify(this.opportunities, null, 2));
        }
        catch (error) {
            logger_1.logger.error('Error saving opportunities:', error);
        }
    }
    getStats() {
        if (this.opportunities.length === 0) {
            return { ...this.stats, avgSpread: 0, maxSpread: 0, totalEstimatedProfit: 0 };
        }
        const avgSpread = this.opportunities.reduce((sum, opp) => sum + opp.spreadPercent, 0) / this.opportunities.length;
        const maxSpread = Math.max(...this.opportunities.map(opp => opp.spreadPercent));
        const totalEstimatedProfit = this.opportunities.reduce((sum, opp) => sum + opp.estimatedProfit, 0);
        return { ...this.stats, avgSpread, maxSpread, totalEstimatedProfit };
    }
    async startMonitoring() {
        logger_1.logger.info('🚀 Starting price monitoring...');
        await this.checkSpread();
        setInterval(async () => {
            await this.checkSpread();
            if (this.stats.totalChecks % 50 === 0) {
                const stats = this.getStats();
                logger_1.logger.info('📊 Session Stats', {
                    checks: stats.totalChecks,
                    opportunities: stats.opportunitiesFound,
                    avgSpread: `${stats.avgSpread.toFixed(2)}%`,
                    totalProfit: `$${stats.totalEstimatedProfit.toFixed(2)}`
                });
            }
        }, config_1.config.pollIntervalMs);
    }
}
exports.PriceMonitor = PriceMonitor;
if (require.main === module) {
    const monitor = new PriceMonitor();
    monitor.startMonitoring().catch(error => {
        logger_1.logger.error('Fatal error in price monitor:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=price-monitor.js.map