import axios from 'axios';
import { Connection, PublicKey } from '@solana/web3.js';
import { PythHttpClient, getPythProgramKeyForCluster } from '@pythnetwork/client';
import { JupiterClient } from './jupiter-client';
import { logger } from './logger';
import { config } from '../config/config';

export interface PriceData {
  source: string;
  price: number;
  timestamp: number;
  confidence?: number;
}

export class PriceFetcher {
  private connection: Connection;
  private pythClient: PythHttpClient;
  private jupiterClient: JupiterClient;
  private priceCache: Map<string, { price: number; timestamp: number }>;
  private readonly CACHE_DURATION_MS = 2000; // 2 seconds
  
  constructor() {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    
    // Initialize Pyth client
    this.pythClient = new PythHttpClient(
      this.connection,
      getPythProgramKeyForCluster('mainnet-beta')
    );
    
    // Initialize Jupiter client for real DEX prices
    this.jupiterClient = new JupiterClient(this.connection);
    
    this.priceCache = new Map();
  }
  
  /**
   * Get Tesla stock price from Yahoo Finance (real NASDAQ price)
   */
  async getRealTeslaPrice(): Promise<PriceData | null> {
    const cacheKey = 'yahoo_tesla';
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
      return {
        source: 'Yahoo Finance (NASDAQ)',
        price: cached.price,
        timestamp: cached.timestamp,
      };
    }
    
    try {
      const response = await axios.get(
        'https://query1.finance.yahoo.com/v8/finance/chart/TSLA',
        { timeout: 5000 }
      );
      
      const price = response.data.chart.result[0].meta.regularMarketPrice;
      
      this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
      
      return {
        source: 'Yahoo Finance (NASDAQ)',
        price,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      logger.debug('Error fetching Yahoo Finance price:', error.message);
      return null;
    }
  }
  
  /**
   * Get rTSLA price from Birdeye (if API key available)
   */
  async getBirdeyePrice(): Promise<PriceData | null> {
    if (!config.birdeyeApiKey || !config.tokens.rTSLA) {
      return null;
    }
    
    try {
      const response = await axios.get(
        'https://public-api.birdeye.so/public/price',
        {
          params: {
            address: config.tokens.rTSLA.toString()
          },
          headers: {
            'X-API-KEY': config.birdeyeApiKey
          },
          timeout: 5000
        }
      );
      
      return {
        source: 'Birdeye',
        price: response.data.data.value,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      logger.debug('Error fetching Birdeye price:', error.message);
      return null;
    }
  }
  
  /**
   * Get real DEX price from Jupiter (aggregates all DEXs including Remora)
   */
  async getRemoraPoolPrice(tokenMint?: PublicKey): Promise<PriceData | null> {
    try {
      // Default to TSLAr if no token specified
      const mint = tokenMint || config.tokens.rTSLA;
      
      if (!mint) {
        logger.warn('No token mint provided for Jupiter price');
        return null;
      }

      const cacheKey = `jupiter_${mint.toBase58()}`;
      const cached = this.priceCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
        return {
          source: 'Jupiter (Real DEX Price)',
          price: cached.price,
          timestamp: cached.timestamp,
        };
      }
      
      // Get real price from Jupiter
      const price = await this.jupiterClient.getTokenPrice(mint);
      
      if (price) {
        this.priceCache.set(cacheKey, {
          price,
          timestamp: Date.now(),
        });
        
        return {
          source: 'Jupiter (Real DEX Price)',
          price,
          timestamp: Date.now(),
        };
      }
      
      logger.warn('Failed to get Jupiter price, using fallback');
      return null;
    } catch (error: any) {
      logger.error('Error fetching Jupiter price:', error.message);
      return null;
    }
  }
  
  /**
   * Get Pyth oracle price for Tesla (REAL ON-CHAIN DATA)
   * This is the NASDAQ price used by Flash Trade
   */
  async getPythPrice(): Promise<PriceData | null> {
    const cacheKey = 'pyth_tsla';
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
      return {
        source: 'Pyth Oracle (NASDAQ)',
        price: cached.price,
        timestamp: cached.timestamp,
        confidence: 0.01,
      };
    }
    
    try {
      // METHOD 1: If we have the price feed ID configured
      if (config.pyth.tslaFeedId) {
        // Use Pyth HTTP API directly
        const response = await axios.get(
          `${config.pythApiUrl}/latest_price_feeds`,
          {
            params: {
              ids: [config.pyth.tslaFeedId]
            },
            timeout: 5000
          }
        );
        
        if (response.data && response.data.length > 0) {
          const priceData = response.data[0];
          const price = Number(priceData.price.price) * Math.pow(10, priceData.price.expo);
          const confidence = Number(priceData.price.conf) * Math.pow(10, priceData.price.expo);
          
          this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
          
          logger.debug('Pyth oracle price fetched', {
            price: price.toFixed(2),
            confidence: confidence.toFixed(2),
            feedId: config.pyth.tslaFeedId
          });
          
          return {
            source: 'Pyth Oracle (NASDAQ)',
            price,
            timestamp: Date.now(),
            confidence,
          };
        }
      }
      
      // METHOD 2: Fallback to Yahoo Finance as proxy for NASDAQ price
      logger.debug('Pyth feed ID not configured, using Yahoo Finance as proxy');
      const yahooPrice = await this.getRealTeslaPrice();
      
      if (yahooPrice) {
        return {
          ...yahooPrice,
          source: 'Pyth Oracle (via Yahoo proxy)',
        };
      }
      
      return null;
    } catch (error: any) {
      logger.debug('Error fetching Pyth price:', error.message);
      
      // Fallback to Yahoo Finance
      const yahooPrice = await this.getRealTeslaPrice();
      if (yahooPrice) {
        return {
          ...yahooPrice,
          source: 'Yahoo Finance (Pyth fallback)',
        };
      }
      
      return null;
    }
  }
  
  /**
   * Get Flash Trade oracle pool price (should match Pyth)
   */
  async getFlashTradePrice(): Promise<PriceData | null> {
    // Flash Trade uses Pyth oracle, so should match
    const pythPrice = await this.getPythPrice();
    
    if (pythPrice) {
      return {
        ...pythPrice,
        source: 'Flash Trade (Pyth Oracle)',
      };
    }
    
    return null;
  }
  
  /**
   * Get all available prices for comparison
   */
  async getAllPrices(): Promise<{
    remora: PriceData | null;
    pyth: PriceData | null;
    flashTrade: PriceData | null;
    yahoo: PriceData | null;
    birdeye: PriceData | null;
  }> {
    const [remora, pyth, flashTrade, yahoo, birdeye] = await Promise.all([
      this.getRemoraPoolPrice(),
      this.getPythPrice(),
      this.getFlashTradePrice(),
      this.getRealTeslaPrice(),
      this.getBirdeyePrice(),
    ]);
    
    return { remora, pyth, flashTrade, yahoo, birdeye };
  }
}
