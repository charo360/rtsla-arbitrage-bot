"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const multi_token_monitor_1 = require("./monitors/multi-token-monitor");
const logger_1 = require("./utils/logger");
const config_1 = require("./config/config");
class ArbitrageBot {
    constructor() {
        this.isRunning = false;
        this.monitor = new multi_token_monitor_1.MultiTokenMonitor();
    }
    async start() {
        try {
            // Show startup banner
            (0, logger_1.logStartup)(config_1.config.autoExecute ? 'trade' : 'monitor');
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
            // Start monitoring
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
    shutdown() {
        if (!this.isRunning)
            return;
        logger_1.logger.info('\n🛑 Shutting down gracefully...');
        // Get final stats for all tokens
        const stats = this.monitor.getStats();
        logger_1.logger.info('📊 Final Session Stats:');
        stats.forEach((tokenStats, symbol) => {
            logger_1.logger.info(`  ${symbol}: ${tokenStats.opportunitiesFound} opportunities, avg spread: ${tokenStats.avgSpread.toFixed(2)}%`);
        });
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
const bot = new ArbitrageBot();
bot.start().catch(error => {
    logger_1.logger.error('Failed to start bot:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map