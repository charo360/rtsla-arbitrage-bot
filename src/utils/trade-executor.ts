import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { WalletManager } from './wallet-manager';
import { JupiterClient } from './jupiter-client';
import { FlashTradeClient } from './flashtrade-client';
import { logger } from './logger';
import { config } from '../config/config';

export interface TradeParams {
  token: string;
  tokenMint: PublicKey;
  direction: 'BUY_REMORA' | 'SELL_REMORA';
  amount: number;
  expectedProfit: number;
  remoraPrice: number;
  oraclePrice: number;
  spreadPercent: number;
}

export interface TradeResult {
  success: boolean;
  signature?: string;
  profit?: number;
  error?: string;
  walletUsed?: string;
}

export class TradeExecutor {
  private connection: Connection;
  private walletManager: WalletManager;
  private jupiterClient: JupiterClient;
  private flashTradeClient: FlashTradeClient;

  constructor(connection: Connection, walletManager: WalletManager) {
    this.connection = connection;
    this.walletManager = walletManager;
    this.jupiterClient = new JupiterClient(connection);
    this.flashTradeClient = new FlashTradeClient({ connection });
  }

  /**
   * Execute an arbitrage trade
   */
  async executeTrade(params: TradeParams): Promise<TradeResult> {
    try {
      // Select wallet for this trade
      const wallet = await this.walletManager.selectWallet();
      
      if (!wallet) {
        return {
          success: false,
          error: 'No wallet available for trading'
        };
      }

      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`🚀 EXECUTING TRADE`);
      logger.info(`${'='.repeat(80)}`);
      logger.info(`Token: ${params.token}`);
      logger.info(`Wallet: ${wallet.name} (${wallet.publicKey.toBase58().slice(0, 8)}...)`);
      logger.info(`Direction: ${params.direction}`);
      logger.info(`Amount: $${params.amount} USDC`);
      logger.info(`Spread: ${params.spreadPercent.toFixed(2)}%`);
      logger.info(`Expected Profit: $${params.expectedProfit.toFixed(2)}`);
      logger.info(`${'='.repeat(80)}\n`);

      // Check if wallet has sufficient balance
      const hasInsufficientBalance = await this.walletManager.hasInsufficientBalance(
        wallet.publicKey.toBase58(),
        params.amount
      );

      if (hasInsufficientBalance) {
        logger.warn(`⚠️  Wallet ${wallet.name} has insufficient balance, skipping trade`);
        return {
          success: false,
          error: 'Insufficient balance',
          walletUsed: wallet.name
        };
      }

      // Validate trade parameters
      if (params.spreadPercent < config.minSpreadPercent) {
        logger.warn(`⚠️  Spread ${params.spreadPercent.toFixed(2)}% below minimum ${config.minSpreadPercent}%`);
        return {
          success: false,
          error: 'Spread below minimum threshold',
          walletUsed: wallet.name
        };
      }

      if (params.expectedProfit < config.minProfitThreshold) {
        logger.warn(`⚠️  Profit $${params.expectedProfit.toFixed(2)} below minimum $${config.minProfitThreshold}`);
        return {
          success: false,
          error: 'Profit below minimum threshold',
          walletUsed: wallet.name
        };
      }

      // Execute the trade (placeholder - implement actual trading logic)
      const result = await this.executeTradeTransaction(wallet.keypair, params);

      // Record trade in wallet manager
      this.walletManager.recordTrade(
        wallet.publicKey.toBase58(),
        result.success,
        result.profit || 0
      );

      if (result.success) {
        logger.info(`✅ Trade executed successfully!`);
        logger.info(`   Signature: ${result.signature}`);
        logger.info(`   Actual Profit: $${result.profit?.toFixed(2)}`);
        logger.info(`   Wallet: ${wallet.name}`);
      } else {
        logger.error(`❌ Trade failed: ${result.error}`);
      }

      return {
        ...result,
        walletUsed: wallet.name
      };

    } catch (error: any) {
      logger.error(`Trade execution error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute the actual blockchain transaction using Jupiter
   */
  private async executeTradeTransaction(
    keypair: any,
    params: TradeParams
  ): Promise<TradeResult> {
    try {
      logger.info('📝 Building transaction with Jupiter...');
      
      // Simulated result for monitoring mode
      if (!config.autoExecute) {
        logger.info('ℹ️  AUTO_EXECUTE is disabled - trade simulated only');
        return {
          success: true,
          signature: 'SIMULATED_' + Date.now(),
          profit: params.expectedProfit
        };
      }

      // Real trading with Jupiter
      logger.info('🚀 Executing real trade via Jupiter...');

      // Get quote from Jupiter
      const slippageBps = Math.floor(config.maxSlippagePercent * 100); // Convert % to basis points
      const quote = await this.jupiterClient.getQuote(
        params.tokenMint,
        params.amount,
        slippageBps
      );

      if (!quote) {
        throw new Error('Failed to get quote from Jupiter');
      }

      // Log quote details
      const outputAmount = parseInt(quote.outAmount) / 1_000_000;
      const priceImpact = parseFloat(quote.priceImpactPct);
      
      logger.info(`📊 Jupiter Quote:`);
      logger.info(`   Input: ${params.amount} USDC`);
      logger.info(`   Output: ${outputAmount.toFixed(6)} tokens`);
      logger.info(`   Price Impact: ${priceImpact.toFixed(2)}%`);

      // Check price impact
      if (priceImpact > 2.0) {
        logger.warn(`⚠️  High price impact: ${priceImpact.toFixed(2)}% - trade may not be profitable`);
      }

      // Execute swap on Jupiter (BUY side)
      const swapResult = await this.jupiterClient.executeSwap(quote, keypair);

      if (!swapResult.success) {
        throw new Error(swapResult.error || 'Jupiter swap failed');
      }

      logger.info(`✅ Jupiter buy executed!`);
      logger.info(`   Signature: ${swapResult.signature}`);
      logger.info(`   Input: ${swapResult.inputAmount} USDC`);
      logger.info(`   Output: ${swapResult.outputAmount} tokens`);

      // Execute complete arbitrage: Jupiter buy → Flash.trade sell
      if (params.direction === 'BUY_REMORA') {
        logger.info('🔄 Executing sell side on Flash.trade...');
        
        const arbResult = await this.flashTradeClient.executeArbitrageTrade(
          keypair,
          params.tokenMint,
          params.token,
          params.amount,
          swapResult.signature!
        );

        if (!arbResult.success) {
          logger.error('⚠️  Flash.trade sell failed - tokens remain in wallet');
          // Note: Jupiter buy succeeded, but sell failed
          // Tokens are in user's wallet, can try to sell manually
          return {
            success: false,
            signature: swapResult.signature,
            error: 'Flash.trade sell failed after successful Jupiter buy'
          };
        }

        logger.info(`✅ Complete arbitrage executed!`);
        logger.info(`   Buy (Jupiter): ${swapResult.signature}`);
        logger.info(`   Sell (Flash.trade): ${arbResult.sellSignature}`);
        logger.info(`   💰 Profit: $${arbResult.profit?.toFixed(2)}`);

        return {
          success: true,
          signature: `${swapResult.signature}|${arbResult.sellSignature}`, // Both signatures
          profit: arbResult.profit
        };
      } else {
        // SELL_REMORA direction (reverse arbitrage - less common)
        // For now, just return Jupiter result
        logger.warn('SELL_REMORA direction not fully implemented yet');
        
        return {
          success: true,
          signature: swapResult.signature,
          profit: params.expectedProfit
        };
      }

    } catch (error: any) {
      logger.error(`Transaction error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Batch execute multiple trades
   */
  async executeBatchTrades(trades: TradeParams[]): Promise<TradeResult[]> {
    logger.info(`\n🔄 Executing ${trades.length} trades in batch...\n`);
    
    const results: TradeResult[] = [];
    
    for (const trade of trades) {
      const result = await this.executeTrade(trade);
      results.push(result);
      
      // Small delay between trades
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalProfit = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + (r.profit || 0), 0);
    
    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`📊 BATCH TRADE SUMMARY`);
    logger.info(`${'='.repeat(80)}`);
    logger.info(`Total Trades: ${trades.length}`);
    logger.info(`Successful: ${successful}`);
    logger.info(`Failed: ${failed}`);
    logger.info(`Success Rate: ${((successful / trades.length) * 100).toFixed(1)}%`);
    logger.info(`Total Profit: $${totalProfit.toFixed(2)}`);
    logger.info(`${'='.repeat(80)}\n`);
    
    return results;
  }

  /**
   * Get wallet manager instance
   */
  getWalletManager(): WalletManager {
    return this.walletManager;
  }
}
