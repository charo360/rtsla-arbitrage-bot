import { MultiTokenMonitor } from './monitors/multi-token-monitor';
import { logger, logStartup } from './utils/logger';
import { config } from './config/config';
import { startDashboard } from './dashboard/server';

class MultiTokenArbitrageBot {
  private monitor: MultiTokenMonitor;
  private isRunning: boolean = false;
  
  constructor() {
    this.monitor = new MultiTokenMonitor();
  }
  
  async start(): Promise<void> {
    try {
      // Show startup banner
      console.log('\n' + '='.repeat(80));
      console.log('  🤖 MULTI-TOKEN ARBITRAGE BOT');
      console.log('='.repeat(80));
      console.log(`  Mode: ${config.autoExecute ? 'AUTO-TRADE' : 'MONITOR'}`);
      console.log(`  Min Spread: ${config.minSpreadPercent}%`);
      console.log(`  Trade Amount: $${config.tradeAmountUsdc} USDC`);
      console.log(`  Poll Interval: ${config.pollIntervalMs / 1000}s`);
      console.log(`  Auto Execute: ${config.autoExecute ? 'YES' : 'NO (Monitor Only)'}`);
      console.log('='.repeat(80) + '\n');
      
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
      
      // Start dashboard server
      startDashboard();
      
      // Start monitoring all tokens
      await this.monitor.startMonitoring();
      
      // Keep process alive
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
      
    } catch (error: any) {
      logger.error('Fatal error starting bot:', error);
      process.exit(1);
    }
  }
  
  private async shutdown(): Promise<void> {
    if (!this.isRunning) return;
    
    logger.info('\n🛑 Shutting down gracefully...');
    
    // Get final stats for all tokens
    const stats = this.monitor.getStats();
    
    logger.info('\n📊 Final Session Stats by Token:');
    logger.info('='.repeat(80));
    
    stats.forEach((tokenStats, symbol) => {
      logger.info(`\n${symbol}:`);
      logger.info(`  Total Checks: ${tokenStats.totalChecks}`);
      logger.info(`  Opportunities Found: ${tokenStats.opportunitiesFound}`);
      logger.info(`  Avg Spread: ${tokenStats.avgSpread.toFixed(2)}%`);
      logger.info(`  Max Spread: ${tokenStats.maxSpread.toFixed(2)}%`);
      logger.info(`  Total Est. Profit: $${tokenStats.totalEstimatedProfit.toFixed(2)}`);
    });
    
    logger.info('\n' + '='.repeat(80));
    
    // Show wallet summary if wallets are configured
    const walletManager = this.monitor.getWalletManager();
    if (walletManager) {
      logger.info('\n💼 Updating final wallet balances...');
      await this.monitor.updateWalletBalances();
      this.monitor.printWalletSummary();
    }
    
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
const bot = new MultiTokenArbitrageBot();
bot.start().catch(error => {
  logger.error('Failed to start bot:', error);
  process.exit(1);
});
