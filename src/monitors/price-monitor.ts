import { PriceFetcher, PriceData } from '../utils/price-fetcher';
import { logger, logOpportunity } from '../utils/logger';
import { config } from '../config/config';
import * as fs from 'fs';
import * as path from 'path';

export interface SpreadOpportunity {
  timestamp: number;
  remoraPrice: number;
  pythPrice: number | null;
  spread: number;
  spreadPercent: number;
  direction: 'BUY_REMORA' | 'SELL_REMORA';
  estimatedProfit: number;
  tradeAmount: number;
}

export class PriceMonitor {
  private priceFetcher: PriceFetcher;
  private opportunities: SpreadOpportunity[] = [];
  private dataFilePath: string;
  private stats = {
    totalChecks: 0,
    opportunitiesFound: 0,
    lastOpportunity: null as Date | null,
  };
  
  constructor() {
    this.priceFetcher = new PriceFetcher();
    this.dataFilePath = path.join(config.dataDir, 'opportunities.json');
    this.loadExistingOpportunities();
  }
  
  private loadExistingOpportunities(): void {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const data = fs.readFileSync(this.dataFilePath, 'utf-8');
        this.opportunities = JSON.parse(data);
        logger.info(`Loaded ${this.opportunities.length} historical opportunities`);
      }
    } catch (error: any) {
      logger.warn('Could not load historical opportunities:', error.message);
    }
  }
  
  private calculateSpread(price1: number, price2: number): { spread: number; spreadPercent: number } {
    const spread = Math.abs(price1 - price2);
    const spreadPercent = (spread / Math.min(price1, price2)) * 100;
    return { spread, spreadPercent };
  }
  
  private estimateProfit(spreadPercent: number, tradeAmount: number): number {
    const grossProfit = tradeAmount * (spreadPercent / 100);
    
    // Fees
    const flashLoanFee = tradeAmount * 0.0005; // 0.05%
    const remoraSwapFee = tradeAmount * 0.0015; // ~0.15%
    const flashTradeSwapFee = tradeAmount * 0.0002; // ~0.02%
    const gasCost = 0.03; // ~$0.03 in SOL
    
    const totalFees = flashLoanFee + remoraSwapFee + flashTradeSwapFee + gasCost;
    return grossProfit - totalFees;
  }
  
  async checkSpread(): Promise<SpreadOpportunity | null> {
    this.stats.totalChecks++;
    
    try {
      const [remoraData, pythData] = await Promise.all([
        this.priceFetcher.getRemoraPoolPrice(),
        this.priceFetcher.getPythPrice()
      ]);
      
      if (!remoraData) {
        logger.warn('Could not fetch Remora price');
        return null;
      }
      
      const pythPrice = pythData?.price || null;
      const comparePrice = pythPrice || remoraData.price;
      
      const { spread, spreadPercent } = this.calculateSpread(remoraData.price, comparePrice);
      
      const direction = remoraData.price < comparePrice ? 'BUY_REMORA' : 'SELL_REMORA';
      
      logger.debug('Price Check', {
        remora: `$${remoraData.price.toFixed(2)}`,
        pyth: pythPrice ? `$${pythPrice.toFixed(2)}` : 'N/A',
        spread: `${spreadPercent.toFixed(3)}%`,
        check: this.stats.totalChecks
      });
      
      if (spreadPercent >= config.minSpreadPercent) {
        const estimatedProfit = this.estimateProfit(spreadPercent, config.tradeAmountUsdc);
        
        const opportunity: SpreadOpportunity = {
          timestamp: Date.now(),
          remoraPrice: remoraData.price,
          pythPrice,
          spread,
          spreadPercent,
          direction,
          estimatedProfit,
          tradeAmount: config.tradeAmountUsdc
        };
        
        this.stats.opportunitiesFound++;
        this.stats.lastOpportunity = new Date();
        
        logger.info('🎯 OPPORTUNITY FOUND!', {
          spread: `${spreadPercent.toFixed(2)}%`,
          direction,
          estimatedProfit: `$${estimatedProfit.toFixed(2)}`,
          tradeAmount: `$${config.tradeAmountUsdc}`
        });
        
        logOpportunity(opportunity);
        this.opportunities.push(opportunity);
        this.saveOpportunities();
        
        return opportunity;
      }
      
      return null;
    } catch (error: any) {
      logger.error('Error checking spread:', error);
      return null;
    }
  }
  
  private saveOpportunities(): void {
    try {
      if (!fs.existsSync(config.dataDir)) {
        fs.mkdirSync(config.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.dataFilePath, JSON.stringify(this.opportunities, null, 2));
    } catch (error: any) {
      logger.error('Error saving opportunities:', error);
    }
  }
  
  getStats(): typeof this.stats & {
    avgSpread: number;
    maxSpread: number;
    totalEstimatedProfit: number;
  } {
    if (this.opportunities.length === 0) {
      return { ...this.stats, avgSpread: 0, maxSpread: 0, totalEstimatedProfit: 0 };
    }
    
    const avgSpread = this.opportunities.reduce((sum, opp) => sum + opp.spreadPercent, 0) / this.opportunities.length;
    const maxSpread = Math.max(...this.opportunities.map(opp => opp.spreadPercent));
    const totalEstimatedProfit = this.opportunities.reduce((sum, opp) => sum + opp.estimatedProfit, 0);
    
    return { ...this.stats, avgSpread, maxSpread, totalEstimatedProfit };
  }
  
  async startMonitoring(): Promise<void> {
    logger.info('🚀 Starting price monitoring...');
    await this.checkSpread();
    
    setInterval(async () => {
      await this.checkSpread();
      
      if (this.stats.totalChecks % 50 === 0) {
        const stats = this.getStats();
        logger.info('📊 Session Stats', {
          checks: stats.totalChecks,
          opportunities: stats.opportunitiesFound,
          avgSpread: `${stats.avgSpread.toFixed(2)}%`,
          totalProfit: `$${stats.totalEstimatedProfit.toFixed(2)}`
        });
      }
    }, config.pollIntervalMs);
  }
}

if (require.main === module) {
  const monitor = new PriceMonitor();
  monitor.startMonitoring().catch(error => {
    logger.error('Fatal error in price monitor:', error);
    process.exit(1);
  });
}
