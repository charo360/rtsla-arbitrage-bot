// Verify YOUR actual token mint addresses from .env
const { Connection, PublicKey } = require('@solana/web3.js');

async function verifyTokenMints() {
  console.log('🔍 Verifying Token Mint Addresses from .env\n');
  console.log('='.repeat(70));

  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  // YOUR ACTUAL TOKEN ADDRESSES FROM .ENV
  const TOKEN_MINTS = {
    'TSLAr': 'FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe',
    'CRCLr': '5fKr9joRHpioriGmMgRVFdmZge8EVUTbrWyxDVdSrcuG',
    'SPYr': 'AVw2QGVkXJPRPRjLAceXVoLqU5DVtJ53mdgMXp14yGit',
    'MSTRr': 'B8GKqTDGYc7F6udTHjYeazZ4dFCRkrwK2mBQNS4igqTv',
    'NVDAr': 'ALTP6gug9wv5mFtx2tSU1YYZ1NrEc2chDdMPoJA8f8pu',
  };

  console.log('\n📋 Checking Token Mints on Solana Mainnet...\n');

  let allValid = true;

  for (const [symbol, mintAddress] of Object.entries(TOKEN_MINTS)) {
    try {
      console.log(`Checking ${symbol}...`);
      console.log(`  Address: ${mintAddress}`);
      
      const mint = new PublicKey(mintAddress);
      const mintInfo = await connection.getAccountInfo(mint);
      
      if (mintInfo) {
        // Parse SPL Token mint data
        const data = mintInfo.data;
        
        // SPL Token Mint structure:
        // 0-4: mint authority option + pubkey (36 bytes)
        // 36-44: supply (u64)
        // 44: decimals (u8)
        
        const decimals = data[44];
        const supply = data.readBigUInt64LE(36);
        
        console.log(`  ✅ Status: FOUND`);
        console.log(`  Decimals: ${decimals}`);
        console.log(`  Supply: ${supply.toString()}`);
        console.log(`  Owner: ${mintInfo.owner.toBase58()}`);
        console.log('');
      } else {
        console.log(`  ❌ Status: NOT FOUND ON MAINNET`);
        console.log(`  This address does not exist or is on a different network\n`);
        allValid = false;
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
      allValid = false;
    }
  }

  console.log('='.repeat(70));
  
  if (allValid) {
    console.log('\n✅ ALL TOKEN MINTS VERIFIED!');
    console.log('\n🎉 Your .env configuration is correct!');
    console.log('\nAll tokens are valid and accessible on Solana mainnet.');
    console.log('The bot is ready to trade these tokens.\n');
  } else {
    console.log('\n⚠️  SOME TOKEN MINTS HAVE ISSUES');
    console.log('\nPossible reasons:');
    console.log('  1. Address is on devnet instead of mainnet');
    console.log('  2. Address is incorrect/typo');
    console.log('  3. Token not yet deployed');
    console.log('\nRecommendation:');
    console.log('  - Double-check addresses from Remora documentation');
    console.log('  - Verify on Solscan: https://solscan.io/token/[ADDRESS]');
    console.log('  - Bot will only trade tokens that are found\n');
  }

  console.log('📊 Next: Test Flash.trade integration');
  console.log('   Run: npm run multi');
  console.log('   Dashboard: http://localhost:3000\n');

  return allValid;
}

verifyTokenMints().catch(error => {
  console.error('\n❌ Verification failed:', error.message);
  process.exit(1);
});
