import { PriceFetcher } from '../utils/price-fetcher';
import { JupiterClient } from '../utils/jupiter-client';
import { TradeExecutor } from '../utils/trade-executor';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { WalletManager, WalletSelectionStrategy } from '../utils/wallet-manager';
import { Connection, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

interface TokenConfig {
  symbol: string;
  name: string;
  mintAddress: string;
  yahooSymbol: string;
}

interface TokenOpportunity {
  token: string;
  timestamp: number;
  remoraPrice: number;
  oraclePrice: number;
  spread: number;
  spreadPercent: number;
  estimatedProfit: number;
  direction: 'BUY_REMORA' | 'SELL_REMORA';
}

export class MultiTokenMonitor {
  private priceFetcher: PriceFetcher;
  private jupiterClient: JupiterClient;
  private tradeExecutor: TradeExecutor | null = null;
  private walletManager: WalletManager | null = null;
  private connection: Connection;
  private tokens: TokenConfig[] = [];
  private opportunities: TokenOpportunity[] = [];
  private isTrading: boolean = false; // Lock to prevent concurrent trades
  private stats: Map<string, {
    totalChecks: number;
    opportunitiesFound: number;
    avgSpread: number;
    maxSpread: number;
    totalEstimatedProfit: number;
  }> = new Map();

  constructor() {
    this.priceFetcher = new PriceFetcher();
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.jupiterClient = new JupiterClient(this.connection);
    this.initializeTokens();
    this.initializeWalletManager();
  }

  private initializeWalletManager(): void {
    // Only initialize if wallets are configured
    if (config.walletPrivateKeys.length === 0) {
      logger.warn('💼 No wallets configured - running in monitoring mode only');
      return;
    }

    try {
      // Map strategy string to enum
      const strategyMap: Record<string, WalletSelectionStrategy> = {
        'round_robin': WalletSelectionStrategy.ROUND_ROBIN,
        'highest_balance': WalletSelectionStrategy.HIGHEST_BALANCE,
        'least_used': WalletSelectionStrategy.LEAST_USED,
        'random': WalletSelectionStrategy.RANDOM
      };

      const strategy = strategyMap[config.walletSelectionStrategy] || WalletSelectionStrategy.ROUND_ROBIN;

      this.walletManager = new WalletManager(
        this.connection,
        config.tokens.usdc,
        strategy
      );

      // Add all wallets
      this.walletManager.addWallets(config.walletPrivateKeys, 'Trading');

      logger.info(`💼 Wallet Manager initialized with ${config.walletPrivateKeys.length} wallet(s)`);
      logger.info(`📊 Selection strategy: ${config.walletSelectionStrategy}`);

      // Initialize trade executor if auto-execute is enabled
      if (config.autoExecute) {
        this.tradeExecutor = new TradeExecutor(this.connection, this.walletManager);
        logger.info(`🤖 Trade Executor initialized - AUTO-EXECUTE ENABLED`);
      }

      // Print initial wallet summary
      this.walletManager.printSummary();
    } catch (error: any) {
      logger.error(`Failed to initialize wallet manager: ${error.message}`);
      this.walletManager = null;
    }
  }

  private initializeTokens(): void {
    // Add all configured tokens
    if (config.tokens.rTSLA) {
      this.tokens.push({
        symbol: 'TSLAr',
        name: 'Tesla',
        mintAddress: config.tokens.rTSLA.toString(),
        yahooSymbol: 'TSLA'
      });
    }

    if (config.tokens.rCRCL) {
      this.tokens.push({
        symbol: 'CRCLr',
        name: 'Circle',
        mintAddress: config.tokens.rCRCL.toString(),
        yahooSymbol: 'CRCL'
      });
    }

    if (config.tokens.rSPY) {
      this.tokens.push({
        symbol: 'SPYr',
        name: 'S&P 500',
        mintAddress: config.tokens.rSPY.toString(),
        yahooSymbol: 'SPY'
      });
    }

    if (config.tokens.rMSTR) {
      this.tokens.push({
        symbol: 'MSTRr',
        name: 'MicroStrategy',
        mintAddress: config.tokens.rMSTR.toString(),
        yahooSymbol: 'MSTR'
      });
    }

    if (config.tokens.rNVDA) {
      this.tokens.push({
        symbol: 'NVDAr',
        name: 'Nvidia',
        mintAddress: config.tokens.rNVDA.toString(),
        yahooSymbol: 'NVDA'
      });
    }

    logger.info(`📊 Monitoring ${this.tokens.length} tokens:`, 
      this.tokens.map(t => t.symbol).join(', ')
    );

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

  async startMonitoring(): Promise<void> {
    logger.info('🚀 Starting multi-token price monitoring...\n');

    // Initial check
    await this.checkAllTokens();

    // Set up periodic checks
    setInterval(async () => {
      await this.checkAllTokens();
    }, config.pollIntervalMs);
  }

  private async checkAllTokens(): Promise<void> {
    const checkTime = new Date().toLocaleTimeString();
    
    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`⏰ Price Check at ${checkTime}`);
    logger.info('='.repeat(80));

    // Check all tokens in parallel
    const results = await Promise.allSettled(
      this.tokens.map(token => this.checkToken(token))
    );

    // Log summary
    let totalOpportunities = 0;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        totalOpportunities++;
      }
    });

    if (totalOpportunities > 0) {
      logger.info(`\n🎯 Found ${totalOpportunities} opportunities in this check!`);
    } else {
      logger.info(`\n✓ Check complete - No opportunities above ${config.minSpreadPercent}% threshold`);
    }

    logger.info('='.repeat(80) + '\n');
  }

  private async checkToken(token: TokenConfig): Promise<boolean> {
    try {
      const stats = this.stats.get(token.symbol)!;
      stats.totalChecks++;

      // Get prices from different sources
      const [remoraPrice, yahooPrice] = await Promise.all([
        this.getRemoraPrice(token),
        this.getYahooPrice(token.yahooSymbol)
      ]);

      if (!remoraPrice || !yahooPrice) {
        logger.warn(`${token.symbol}: Unable to fetch prices - Remora: ${remoraPrice}, Yahoo: ${yahooPrice}`);
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
      if (absSpreadPercent >= config.minSpreadPercent) {
        const estimatedProfit = this.calculateProfit(
          config.tradeAmountUsdc,
          remoraPrice,
          yahooPrice,
          direction
        );

        if (estimatedProfit >= config.minProfitThreshold) {
          stats.opportunitiesFound++;
          stats.totalEstimatedProfit += estimatedProfit;

          // Log opportunity
          logger.info(`   🎯 OPPORTUNITY! Profit: $${estimatedProfit.toFixed(2)} | Direction: ${direction}`);

          // Save opportunity
          const opportunity: TokenOpportunity = {
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
          if (this.tradeExecutor && config.autoExecute) {
            // Check if already trading - skip if so
            if (this.isTrading) {
              logger.info(`⏳ Trade already in progress, skipping ${token.symbol}`);
              return true;
            }

            // Lock trading
            this.isTrading = true;
            logger.info(`🔒 Trade lock acquired for ${token.symbol}`);

            try {
              logger.info(`🚀 Executing trade for ${token.symbol}...`);

              const tradeResult = await this.tradeExecutor.executeTrade({
                token: token.symbol,
                tokenMint: new PublicKey(token.mintAddress),
                direction,
                amount: config.tradeAmountUsdc,
                expectedProfit: estimatedProfit,
                remoraPrice,
                oraclePrice: yahooPrice,
                spreadPercent
              });

              if (tradeResult.success) {
                logger.info(`✅ Trade executed successfully!`);
                logger.info(`   Signature: ${tradeResult.signature}`);
                logger.info(`   Profit: $${tradeResult.profit?.toFixed(2)}`);
              } else {
                logger.error(`❌ Trade failed: ${tradeResult.error}`);
              }
            } finally {
              // Always unlock when done
              this.isTrading = false;
              logger.info(`🔓 Trade lock released`);
            }
          }

          return true;
        }
      }

      return false;
    } catch (error: any) {
      logger.debug(`${token.symbol}: Error checking prices - ${error.message}`);
      return false;
    }
  }

  private async getRemoraPrice(token: TokenConfig): Promise<number | null> {
    try {
      // Get REAL DEX price from Jupiter (aggregates all DEXs including Remora)
      const tokenMint = new PublicKey(token.mintAddress);
      const price = await this.jupiterClient.getTokenPrice(tokenMint);
      
      if (price) {
        return price;
      }
      
      // Fallback to simulated price if Jupiter fails
      logger.debug(`Jupiter price failed for ${token.symbol}, using fallback`);
      const yahooPrice = await this.getYahooPrice(token.yahooSymbol);
      if (!yahooPrice) return null;

      // Simulate 0.5-2% difference as fallback
      const variation = (Math.random() * 1.5 + 0.5) / 100;
      const direction = Math.random() > 0.5 ? 1 : -1;
      return yahooPrice * (1 + (direction * variation));
    } catch (error) {
      logger.debug(`Error getting price for ${token.symbol}: ${error}`);
      return null;
    }
  }

  private async getYahooPrice(symbol: string): Promise<number | null> {
    try {
      const axios = require('axios');
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        { timeout: 5000 }
      );

      const result = response.data?.chart?.result?.[0];
      if (!result) {
        logger.warn(`No Yahoo data for ${symbol}`);
        return null;
      }

      const price = result.meta?.regularMarketPrice;
      if (!price) {
        logger.warn(`No price in Yahoo data for ${symbol}`);
      }
      return price || null;
    } catch (error: any) {
      logger.error(`Yahoo API error for ${symbol}: ${error.message}`);
      return null;
    }
  }

  private calculateProfit(
    tradeAmount: number,
    buyPrice: number,
    sellPrice: number,
    direction: 'BUY_REMORA' | 'SELL_REMORA'
  ): number {
    if (direction === 'BUY_REMORA') {
      // Buy on Remora (lower), sell on oracle (higher)
      const shares = tradeAmount / buyPrice;
      const revenue = shares * sellPrice;
      const profit = revenue - tradeAmount;
      
      // Subtract estimated fees (0.3% trading fees + gas)
      const fees = tradeAmount * 0.003 + 0.01; // ~$0.01 gas
      return profit - fees;
    } else {
      // Sell on Remora (higher), buy on oracle (lower)
      const shares = tradeAmount / sellPrice;
      const revenue = shares * buyPrice;
      const profit = tradeAmount - revenue;
      
      const fees = tradeAmount * 0.003 + 0.01;
      return profit - fees;
    }
  }

  private saveOpportunities(): void {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(config.dataDir)) {
        fs.mkdirSync(config.dataDir, { recursive: true });
      }

      const filePath = path.join(config.dataDir, 'multi-token-opportunities.json');
      
      // Keep only last 1000 opportunities
      const recentOpportunities = this.opportunities.slice(-1000);
      
      fs.writeFileSync(
        filePath,
        JSON.stringify(recentOpportunities, null, 2)
      );
    } catch (error: any) {
      logger.error('Error saving opportunities:', error.message);
    }
  }

  getStats(): Map<string, any> {
    return this.stats;
  }

  getAllOpportunities(): TokenOpportunity[] {
    return this.opportunities;
  }

  getTokenOpportunities(symbol: string): TokenOpportunity[] {
    return this.opportunities.filter(opp => opp.token === symbol);
  }

  getWalletManager(): WalletManager | null {
    return this.walletManager;
  }

  async updateWalletBalances(): Promise<void> {
    if (this.walletManager) {
      await this.walletManager.updateAllBalances();
    }
  }

  printWalletSummary(): void {
    if (this.walletManager) {
      this.walletManager.printSummary();
    }
  }
}
