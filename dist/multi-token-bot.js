"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const multi_token_monitor_1 = require("./monitors/multi-token-monitor");
const logger_1 = require("./utils/logger");
const config_1 = require("./config/config");
const server_1 = require("./dashboard/server");
class MultiTokenArbitrageBot {
    constructor() {
        this.isRunning = false;
        this.monitor = new multi_token_monitor_1.MultiTokenMonitor();
    }
    async start() {
        try {
            // Show startup banner
            console.log('\n' + '='.repeat(80));
            console.log('  🤖 MULTI-TOKEN ARBITRAGE BOT');
            console.log('='.repeat(80));
            console.log(`  Mode: ${config_1.config.autoExecute ? 'AUTO-TRADE' : 'MONITOR'}`);
            console.log(`  Min Spread: ${config_1.config.minSpreadPercent}%`);
            console.log(`  Trade Amount: $${config_1.config.tradeAmountUsdc} USDC`);
            console.log(`  Poll Interval: ${config_1.config.pollIntervalMs / 1000}s`);
            console.log(`  Auto Execute: ${config_1.config.autoExecute ? 'YES' : 'NO (Monitor Only)'}`);
            console.log('='.repeat(80) + '\n');
            if (!config_1.config.walletPrivateKey) {
                logger_1.logger.warn('⚠️  Running in MONITORING MODE (no wallet configured)');
                logger_1.logger.warn('   Bot will detect opportunities but NOT execute trades');
                logger_1.logger.warn('   To enable trading: Set WALLET_PRIVATE_KEY in .env file\n');
            }
            if (config_1.config.autoExecute) {
                logger_1.logger.info('🤖 AUTO-EXECUTION ENABLED');
                logger_1.logger.info('   Bot will automatically execute profitable trades');
                logger_1.logger.info(`   Minimum profit threshold: $${config_1.config.minProfitThreshold}\n`);
            }
            this.isRunning = true;
            // Start dashboard server
            (0, server_1.startDashboard)();
            // Start monitoring all tokens
            await this.monitor.startMonitoring();
            // Keep process alive
            process.on('SIGINT', () => this.shutdown());
            process.on('SIGTERM', () => this.shutdown());
        }
        catch (error) {
            logger_1.logger.error('Fatal error starting bot:', error);
            process.exit(1);
        }
    }
    async shutdown() {
        if (!this.isRunning)
            return;
        logger_1.logger.info('\n🛑 Shutting down gracefully...');
        // Get final stats for all tokens
        const stats = this.monitor.getStats();
        logger_1.logger.info('\n📊 Final Session Stats by Token:');
        logger_1.logger.info('='.repeat(80));
        stats.forEach((tokenStats, symbol) => {
            logger_1.logger.info(`\n${symbol}:`);
            logger_1.logger.info(`  Total Checks: ${tokenStats.totalChecks}`);
            logger_1.logger.info(`  Opportunities Found: ${tokenStats.opportunitiesFound}`);
            logger_1.logger.info(`  Avg Spread: ${tokenStats.avgSpread.toFixed(2)}%`);
            logger_1.logger.info(`  Max Spread: ${tokenStats.maxSpread.toFixed(2)}%`);
            logger_1.logger.info(`  Total Est. Profit: $${tokenStats.totalEstimatedProfit.toFixed(2)}`);
        });
        logger_1.logger.info('\n' + '='.repeat(80));
        // Show wallet summary if wallets are configured
        const walletManager = this.monitor.getWalletManager();
        if (walletManager) {
            logger_1.logger.info('\n💼 Updating final wallet balances...');
            await this.monitor.updateWalletBalances();
            this.monitor.printWalletSummary();
        }
        this.isRunning = false;
        process.exit(0);
    }
}
// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (error) => {
    logger_1.logger.error('Unhandled Rejection:', error);
    process.exit(1);
});
// Start the bot
const bot = new MultiTokenArbitrageBot();
bot.start().catch(error => {
    logger_1.logger.error('Failed to start bot:', error);
    process.exit(1);
});
//# sourceMappingURL=multi-token-bot.js.map