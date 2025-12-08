import { PriceMonitor } from './monitors/price-monitor';
import { logger, logStartup } from './utils/logger';
import { config } from './config/config';

class ArbitrageBot {
  private monitor: PriceMonitor;
  private isRunning: boolean = false;
  
  constructor() {
    this.monitor = new PriceMonitor();
  }
  
  async start(): Promise<void> {
    try {
      // Show startup banner
      logStartup(config.autoExecute ? 'trade' : 'monitor');
      
      if (!config.walletPrivateKey) {
        logger.warn('⚠️  Running in MONITORING MODE (no wallet configured)');
        logger.warn('   Bot will detect opportunities but NOT execute trades');
        logger.warn('   To enable trading: Set WALLET_PRIVATE_KEY in .env file\n');
      }
      
      if (config.autoExecute) {
        logger.info('🤖 AUTO-EXECUTION ENABLED');
        logger.info('   Bot will automatically execute profitable trades');
        logger.info(`   Minimum profit threshold: $${config.minProfitThreshold}\n`);
      }
      
      this.isRunning = true;
      
      // Start monitoring
      await this.monitor.startMonitoring();
      
      // Keep process alive
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
      
    } catch (error: any) {
      logger.error('Fatal error starting bot:', error);
      process.exit(1);
    }
  }
  
  private shutdown(): void {
    if (!this.isRunning) return;
    
    logger.info('\n🛑 Shutting down gracefully...');
    
    // Get final stats
    const stats = this.monitor.getStats();
    logger.info('📊 Final Session Stats:', {
      totalChecks: stats.totalChecks,
      opportunitiesFound: stats.opportunitiesFound,
      avgSpread: `${stats.avgSpread.toFixed(2)}%`,
      maxSpread: `${stats.maxSpread.toFixed(2)}%`,
      estimatedProfit: `$${stats.totalEstimatedProfit.toFixed(2)}`
    });
    
    this.isRunning = false;
    process.exit(0);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Start the bot
const bot = new ArbitrageBot();
bot.start().catch(error => {
  logger.error('Failed to start bot:', error);
  process.exit(1);
});
