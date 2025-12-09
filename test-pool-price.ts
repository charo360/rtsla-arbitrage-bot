import { Connection } from '@solana/web3.js';
import { FlashTradeClient } from './src/utils/flashtrade-client';
import dotenv from 'dotenv';

dotenv.config();

async function testPoolPrice() {
  const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
  const flashClient = new FlashTradeClient({ connection });

  console.log('\n🧪 Testing Flash Trade Pool Price Query\n');
  console.log('='.repeat(60));

  const tokens = ['MSTRr', 'TSLAr', 'CRCLr'];

  for (const token of tokens) {
    try {
      console.log(`\n📊 ${token}:`);
      
      // Get oracle price (what we used before)
      const oraclePrice = await flashClient.getPythPriceFromHermes(token);
      console.log(`   Oracle Price: $${oraclePrice?.toFixed(2) || 'N/A'}`);
      
      // Get actual pool execution price (what we'll actually get)
      const poolPrice = await flashClient.getActualPoolPrice(token, 0.1);
      console.log(`   Pool Price:   $${poolPrice?.toFixed(2) || 'N/A'}`);
      
      if (oraclePrice && poolPrice) {
        const diff = oraclePrice - poolPrice;
        const diffPercent = (diff / oraclePrice) * 100;
        console.log(`   Difference:   $${diff.toFixed(2)} (${diffPercent.toFixed(2)}%)`);
        
        if (Math.abs(diffPercent) > 0.5) {
          console.log(`   ⚠️  Significant gap! This would cause ${diffPercent > 0 ? 'losses' : 'unexpected gains'}`);
        } else {
          console.log(`   ✅ Small gap, oracle price is accurate`);
        }
      }
      
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Test complete!\n');
}

testPoolPrice().catch(console.error);
