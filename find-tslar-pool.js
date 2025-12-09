// Find TSLAr liquidity pools on Solana DEXes
const { Connection, PublicKey } = require('@solana/web3.js');
require('dotenv').config();

async function findPools() {
  console.log('🔍 Finding TSLAr Liquidity Pools\n');
  console.log('='.repeat(70));

  const connection = new Connection(process.env.SOLANA_RPC_URL);
  const TSLAR_MINT = new PublicKey('FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe');
  const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

  console.log('Searching for pools containing TSLAr...\n');

  // Known DEX program IDs
  const dexPrograms = {
    'Orca Whirlpool': 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
    'Raydium CLMM': 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
    'Raydium AMM': '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    'Meteora DLMM': 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  };

  for (const [name, programId] of Object.entries(dexPrograms)) {
    try {
      console.log(`\n📊 Checking ${name}...`);
      const program = new PublicKey(programId);
      
      // Get all accounts owned by this program
      const accounts = await connection.getProgramAccounts(program, {
        filters: [
          {
            memcmp: {
              offset: 0, // Adjust based on pool structure
              bytes: TSLAR_MINT.toBase58(),
            },
          },
        ],
      });

      if (accounts.length > 0) {
        console.log(`   ✅ Found ${accounts.length} pool(s)!`);
        accounts.forEach((account, i) => {
          console.log(`   Pool ${i + 1}: ${account.pubkey.toBase58()}`);
        });
      } else {
        console.log(`   ❌ No pools found`);
      }
    } catch (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n💡 Alternative: Check DexScreener or Birdeye for TSLAr pools');
  console.log('   DexScreener: https://dexscreener.com/solana/tslar');
  console.log('   Birdeye: https://birdeye.so/token/FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe\n');
}

findPools().catch(console.error);
