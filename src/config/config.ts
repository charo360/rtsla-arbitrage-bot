import dotenv from 'dotenv';
import { PublicKey } from '@solana/web3.js';
import * as path from 'path';

// Load environment variables
dotenv.config();

export interface Config {
  // Network
  rpcUrl: string;
  
  // Wallet
  walletPrivateKey: string;
  
  // Trading Parameters
  minSpreadPercent: number;
  tradeAmountUsdc: number;
  pollIntervalMs: number;
  maxSlippagePercent: number;
  minProfitThreshold: number;
  
  // Token Addresses
  tokens: {
    // USDC on Solana mainnet
    usdc: PublicKey;
    // Tokenized stocks
    rTSLA: PublicKey | null;
    rCRCL: PublicKey | null;
    rSPY: PublicKey | null;
    rMSTR: PublicKey | null;
    rNVDA: PublicKey | null;
  };
  
  // Platform Addresses
  platforms: {
    remoraPool: string;
    flashTradeProgramId: string;
    flashTradePool: string;
    portFinanceProgramId: string;
    portFinancePool: string;
  };
  
  // Pyth Oracle
  pyth: {
    programId: PublicKey;
    tslaFeedId: string;
  };
  
  // APIs
  pythApiUrl: string;
  birdeyeApiKey: string;
  
  // Safety
  maxGasPriceLamports: number;
  maxConsecutiveFailures: number;
  
  // Monitoring
  logLevel: string;
  enableTelegramAlerts: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  
  // Advanced
  autoExecute: boolean;
  useJitoBundles: boolean;
  maxConcurrentTrades: number;
  retryFailedTransactions: boolean;
  maxRetries: number;
  
  // Paths
  logsDir: string;
  dataDir: string;
}

function loadConfig(): Config {
  // Validate required environment variables
  if (!process.env.WALLET_PRIVATE_KEY) {
    console.warn('⚠️  WALLET_PRIVATE_KEY not set. Bot will run in monitoring-only mode.');
  }
  
  return {
    // Network
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    
    // Wallet
    walletPrivateKey: process.env.WALLET_PRIVATE_KEY || '',
    
    // Trading Parameters
    minSpreadPercent: parseFloat(process.env.MIN_SPREAD_PERCENT || '0.8'),
    tradeAmountUsdc: parseFloat(process.env.TRADE_AMOUNT_USDC || '100'),
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '10000'),
    maxSlippagePercent: parseFloat(process.env.MAX_SLIPPAGE_PERCENT || '0.5'),
    minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.5'),
    
    // Token Addresses (Mainnet)
    tokens: {
      // USDC on Solana mainnet
      usdc: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      // Tokenized stocks
      rTSLA: process.env.RTSLA_MINT_ADDRESS 
        ? new PublicKey(process.env.RTSLA_MINT_ADDRESS)
        : null,
      rCRCL: process.env.CRCL_MINT_ADDRESS 
        ? new PublicKey(process.env.CRCL_MINT_ADDRESS)
        : null,
      rSPY: process.env.SPY_MINT_ADDRESS 
        ? new PublicKey(process.env.SPY_MINT_ADDRESS)
        : null,
      rMSTR: process.env.MSTR_MINT_ADDRESS 
        ? new PublicKey(process.env.MSTR_MINT_ADDRESS)
        : null,
      rNVDA: process.env.NVDA_MINT_ADDRESS 
        ? new PublicKey(process.env.NVDA_MINT_ADDRESS)
        : null,
    },
    
    // Platform Addresses
    platforms: {
      remoraPool: process.env.REMORA_POOL_ADDRESS || '',
      flashTradeProgramId: process.env.FLASH_TRADE_PROGRAM_ID || '',
      flashTradePool: process.env.FLASH_TRADE_POOL_ADDRESS || '',
      portFinanceProgramId: process.env.PORT_FINANCE_PROGRAM_ID || '',
      portFinancePool: process.env.PORT_FINANCE_POOL_ADDRESS || '',
    },
    
    // Pyth Oracle
    pyth: {
      // Pyth program on Solana mainnet
      programId: new PublicKey(
        process.env.PYTH_PROGRAM_ID || 'FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH'
      ),
      // TSLA/USD price feed ID
      tslaFeedId: process.env.PYTH_TSLA_FEED_ID || '',
    },
    
    // APIs
    pythApiUrl: process.env.PYTH_API_URL || 'https://hermes.pyth.network/api',
    birdeyeApiKey: process.env.BIRDEYE_API_KEY || '',
    
    // Safety
    maxGasPriceLamports: parseInt(process.env.MAX_GAS_PRICE_LAMPORTS || '5000'),
    maxConsecutiveFailures: parseInt(process.env.MAX_CONSECUTIVE_FAILURES || '3'),
    
    // Monitoring
    logLevel: process.env.LOG_LEVEL || 'info',
    enableTelegramAlerts: process.env.ENABLE_TELEGRAM_ALERTS === 'true',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    
    // Advanced
    autoExecute: process.env.AUTO_EXECUTE === 'true',
    useJitoBundles: process.env.USE_JITO_BUNDLES === 'true',
    maxConcurrentTrades: parseInt(process.env.MAX_CONCURRENT_TRADES || '1'),
    retryFailedTransactions: process.env.RETRY_FAILED_TRANSACTIONS !== 'false',
    maxRetries: parseInt(process.env.MAX_RETRIES || '2'),
    
    // Paths
    logsDir: path.join(__dirname, '../../logs'),
    dataDir: path.join(__dirname, '../../data'),
  };
}

export const config = loadConfig();

// Validation warnings
if (!config.walletPrivateKey) {
  console.warn('\n⚠️  WARNING: No wallet configured. Running in MONITORING-ONLY mode.');
  console.warn('   To enable trading, set WALLET_PRIVATE_KEY in .env file\n');
}

if (config.autoExecute && !config.walletPrivateKey) {
  console.error('❌ ERROR: AUTO_EXECUTE is true but no wallet configured!');
  process.exit(1);
}
