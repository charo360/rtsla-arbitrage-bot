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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logStartup = exports.logError = exports.logTrade = exports.logOpportunity = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const config_1 = require("../config/config");
// Ensure logs directory exists
if (!fs.existsSync(config_1.config.logsDir)) {
    fs.mkdirSync(config_1.config.logsDir, { recursive: true });
}
// Custom format for console output
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    // Add metadata if present
    const metaKeys = Object.keys(metadata);
    if (metaKeys.length > 0 && metaKeys[0] !== 'service') {
        msg += ` ${JSON.stringify(metadata, null, 2)}`;
    }
    return msg;
}));
// JSON format for file output
const fileFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
exports.logger = winston_1.default.createLogger({
    level: config_1.config.logLevel,
    defaultMeta: { service: 'rtsla-arb-bot' },
    transports: [
        // Console output
        new winston_1.default.transports.Console({
            format: consoleFormat,
        }),
        // Error log file
        new winston_1.default.transports.File({
            filename: path.join(config_1.config.logsDir, 'error.log'),
            level: 'error',
            format: fileFormat,
        }),
        // Combined log file
        new winston_1.default.transports.File({
            filename: path.join(config_1.config.logsDir, 'combined.log'),
            format: fileFormat,
        }),
        // Opportunities log (successful detections)
        new winston_1.default.transports.File({
            filename: path.join(config_1.config.logsDir, 'opportunities.log'),
            level: 'info',
            format: fileFormat,
        }),
        // Trades log (executed trades)
        new winston_1.default.transports.File({
            filename: path.join(config_1.config.logsDir, 'trades.log'),
            level: 'info',
            format: fileFormat,
        }),
    ],
});
// Helper functions for specific log types
const logOpportunity = (data) => {
    exports.logger.info('OPPORTUNITY', data);
};
exports.logOpportunity = logOpportunity;
const logTrade = (data) => {
    exports.logger.info('TRADE', data);
};
exports.logTrade = logTrade;
const logError = (message, error) => {
    exports.logger.error(message, {
        error: error.message,
        stack: error.stack,
    });
};
exports.logError = logError;
// Startup banner
const logStartup = (mode) => {
    console.log('\n' + '='.repeat(60));
    console.log('  🤖 rTSLA ARBITRAGE BOT');
    console.log('='.repeat(60));
    console.log(`  Mode: ${mode.toUpperCase()}`);
    console.log(`  Min Spread: ${config_1.config.minSpreadPercent}%`);
    console.log(`  Trade Amount: $${config_1.config.tradeAmountUsdc} USDC`);
    console.log(`  Poll Interval: ${config_1.config.pollIntervalMs / 1000}s`);
    console.log(`  Auto Execute: ${config_1.config.autoExecute ? 'YES ✅' : 'NO (Monitor Only)'}`);
    console.log('='.repeat(60) + '\n');
};
exports.logStartup = logStartup;
// Export for convenience
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map