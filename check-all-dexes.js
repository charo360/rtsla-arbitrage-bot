// Check ALL possible DEXes for TSLAr liquidity
const { Connection, PublicKey } = require('@solana/web3.js');
require('dotenv').config();

async function checkAllDexes() {
  console.log('🔍 Checking ALL DEXes for TSLAr Liquidity\n');
  console.log('='.repeat(70));

  const connection = new Connection(process.env.SOLANA_RPC_URL);
  const TSLAR_MINT = 'FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe';

  // All known Solana DEX program IDs
  const dexPrograms = {
    'Phoenix': 'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY',
    'OpenBook V2': 'opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb',
    'OpenBook V1': 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX',
    'Lifinity V2': '2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c',
    'Lifinity V1': 'EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S',
    'Aldrin': 'CURVGoZn8zycx6FXwwevgBTB2gVvdbGTEpvMJDbgs2t4',
    'Crema': 'CLMM9tUoggJu2wagPkkqs9eFG4BWhVBZWkP1qv3Sp7tR',
    'Saber': 'SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ',
    'Mercurial': 'MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky',
    'Cykura': 'cysPXAjehMpVKUapzbMCCnpFxUFFryEWEaLgnb9NrR8',
    'Cropper': 'CTMAxxk34HjKWxQ3QLZK1HpaLXmBveao3ESePXbiyfzh',
    'Stepn': 'Dooar9JkhdZ7J3LHN3A7YCuoGRUggXhQaG4kijfLGU2j',
    'Penguin': 'PSwapMdSai8tjrEXcxFeQth87xC4rRsa4VA5mhGhXkP',
    'Saros': 'SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr',
    'Sencha': 'SCHAtsf8mbjyjiv4LkhLKutTf6JnZAbdJKFkXQNMFHZ',
    'Serum (Legacy)': '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
    'Invariant': 'HyaB3W9q6XdA5xwpU4XnSZV94htfmbmqJXZcEbRaJutt',
    'GooseFX': 'GFXsSL5sSaDfNFQUYsHekbWBW1TsFdjDYzACh62tEHxn',
  };

  console.log('Checking token accounts for TSLAr across all DEXes...\n');

  for (const [name, programId] of Object.entries(dexPrograms)) {
    try {
      const program = new PublicKey(programId);
      
      // Get token accounts that hold TSLAr
      const tokenAccounts = await connection.getTokenAccountsByOwner(
        program,
        { mint: new PublicKey(TSLAR_MINT) }
      );

      if (tokenAccounts.value.length > 0) {
        console.log(`✅ ${name}: FOUND ${tokenAccounts.value.length} account(s)`);
        tokenAccounts.value.forEach((account, i) => {
          const balance = account.account.data.length > 0 ? 'Has balance' : 'Empty';
          console.log(`   Account ${i + 1}: ${account.pubkey.toBase58()} (${balance})`);
        });
      } else {
        console.log(`❌ ${name}: No TSLAr accounts`);
      }
    } catch (error) {
      console.log(`⚠️  ${name}: Error - ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n💡 Checking Jupiter route plan would show the actual DEX...');
  console.log('   But since Jupiter API is failing, we need to find it manually.\n');
}

checkAllDexes().catch(console.error);
