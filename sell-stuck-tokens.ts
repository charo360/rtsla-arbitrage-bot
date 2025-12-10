import { Connection, PublicKey } from '@solana/web3.js';
import { config } from './src/config/config';
import { WalletManager } from './src/utils/wallet-manager';
import { JupiterClient } from './src/utils/jupiter-client';
import { logger } from './src/utils/logger';

const connection = new Connection(config.rpcUrl);

const STUCK_TOKENS = [
  {
    symbol: 'CRCLr',
    mint: '5fKr9joRHpioriGmMgRVFdmZge8EVUTbrWyxDVdSrcuG',
    amount: 0.458844,
  },
];

async function sellStuckTokens() {
  const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  const walletManager = new WalletManager(connection, USDC_MINT);
  
  if (config.walletPrivateKeys && config.walletPrivateKeys.length > 0) {
    walletManager.addWallets(config.walletPrivateKeys, 'Trading');
  }
  
  const wallet = await walletManager.selectWallet();
  
  if (!wallet) {
    logger.error('No wallet found');
    return;
  }
  
  logger.info(`\n🔧 EMERGENCY TOKEN RECOVERY`);
  logger.info(`Wallet: ${wallet.publicKey.toBase58()}\n`);
  
  const jupiterClient = new JupiterClient(connection);
  
  for (const token of STUCK_TOKENS) {
    logger.info(`\n💰 Selling ${token.symbol}...`);
    logger.info(`   Amount: ${token.amount.toFixed(6)} tokens`);
    logger.info(`   Mint: ${token.mint}`);
    
    try {
      const tokenMint = new PublicKey(token.mint);
      const result = await jupiterClient.executeSellSwap(
        tokenMint,
        token.amount,
        wallet.keypair,
        9, // 9 decimals for rTokens
        1000 // 10% slippage for emergency recovery
      );
      
      if (result.success) {
        logger.info(`✅ ${token.symbol} sold successfully!`);
        logger.info(`   Signature: ${result.signature}`);
      } else {
        logger.error(`❌ Failed to sell ${token.symbol}: ${result.error}`);
      }
    } catch (error: any) {
      logger.error(`❌ Error selling ${token.symbol}: ${error.message}`);
    }
    
    // Wait 2 seconds between sells
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  logger.info(`\n✅ Recovery complete!`);
}

sellStuckTokens().catch(console.error);
