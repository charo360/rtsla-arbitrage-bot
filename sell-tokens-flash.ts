import { Connection, Keypair } from '@solana/web3.js';
import { executeFlashSDKSwap } from './src/utils/flashtrade-sdk-swap';
import BN from 'bn.js';
import dotenv from 'dotenv';
import bs58 from 'bs58';

dotenv.config();

async function sellTokens() {
  const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
  
  const privateKeyStr = process.env.WALLET_1 || process.env.WALLET_PRIVATE_KEY;
  if (!privateKeyStr) {
    console.error('❌ WALLET_1 not found in .env');
    return;
  }

  const privateKeyBytes = bs58.decode(privateKeyStr);
  const keypair = Keypair.fromSecretKey(privateKeyBytes);

  console.log(`\n🔄 Selling tokens back to USDC...\n`);

  // Sell MSTRr
  try {
    console.log('💰 Selling MSTRr tokens...');
    const mstrAmount = new BN(55741385); // 0.055741385 tokens in lamports
    const minOutput = new BN(9_500_000); // Minimum 9.5 USDC (3% slippage)
    
    const result = await executeFlashSDKSwap({
      connection,
      userKeypair: keypair,
      inputTokenSymbol: 'MSTRr',
      outputTokenSymbol: 'USDC',
      inputAmount: mstrAmount,
      minOutputAmount: minOutput,
    });
    
    console.log(`✅ MSTRr sold!`);
    console.log(`   Signature: ${result.signature}`);
    console.log(`   USDC received: ~$${result.outputAmount.toFixed(2)}\n`);
  } catch (error: any) {
    console.error(`❌ MSTRr sell failed: ${error.message}\n`);
  }

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Sell CRCLr
  try {
    console.log('💰 Selling CRCLr tokens...');
    const crclAmount = new BN(121730150); // 0.12173015 tokens in lamports
    const minOutput = new BN(9_800_000); // Minimum 9.8 USDC (3% slippage)
    
    const result = await executeFlashSDKSwap({
      connection,
      userKeypair: keypair,
      inputTokenSymbol: 'CRCLr',
      outputTokenSymbol: 'USDC',
      inputAmount: crclAmount,
      minOutputAmount: minOutput,
    });
    
    console.log(`✅ CRCLr sold!`);
    console.log(`   Signature: ${result.signature}`);
    console.log(`   USDC received: ~$${result.outputAmount.toFixed(2)}\n`);
  } catch (error: any) {
    console.error(`❌ CRCLr sell failed: ${error.message}\n`);
  }

  console.log('✅ All tokens sold! Check balance with: npx ts-node check-wallet-balance.ts\n');
}

sellTokens().catch(console.error);
