import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../config/config';

// Ensure logs directory exists
if (!fs.existsSync(config.logsDir)) {
  fs.mkdirSync(config.logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    const metaKeys = Object.keys(metadata);
    if (metaKeys.length > 0 && metaKeys[0] !== 'service') {
      msg += ` ${JSON.stringify(metadata, null, 2)}`;
    }
    
    return msg;
  })
);

// JSON format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: config.logLevel,
  defaultMeta: { service: 'rtsla-arb-bot' },
  transports: [
    // Console output
    new winston.transports.Console({
      format: consoleFormat,
    }),
    
    // Error log file
    new winston.transports.File({
      filename: path.join(config.logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(config.logsDir, 'combined.log'),
      format: fileFormat,
    }),
    
    // Opportunities log (successful detections)
    new winston.transports.File({
      filename: path.join(config.logsDir, 'opportunities.log'),
      level: 'info',
      format: fileFormat,
    }),
    
    // Trades log (executed trades)
    new winston.transports.File({
      filename: path.join(config.logsDir, 'trades.log'),
      level: 'info',
      format: fileFormat,
    }),
  ],
});

// Helper functions for specific log types
export const logOpportunity = (data: any) => {
  logger.info('OPPORTUNITY', data);
};

export const logTrade = (data: any) => {
  logger.info('TRADE', data);
};

export const logError = (message: string, error: any) => {
  logger.error(message, {
    error: error.message,
    stack: error.stack,
  });
};

// Startup banner
export const logStartup = (mode: 'monitor' | 'trade') => {
  console.log('\n' + '='.repeat(60));
  console.log('  🤖 rTSLA ARBITRAGE BOT');
  console.log('='.repeat(60));
  console.log(`  Mode: ${mode.toUpperCase()}`);
  console.log(`  Min Spread: ${config.minSpreadPercent}%`);
  console.log(`  Trade Amount: $${config.tradeAmountUsdc} USDC`);
  console.log(`  Poll Interval: ${config.pollIntervalMs / 1000}s`);
  console.log(`  Auto Execute: ${config.autoExecute ? 'YES ✅' : 'NO (Monitor Only)'}`);
  console.log('='.repeat(60) + '\n');
};

// Export for convenience
export default logger;
