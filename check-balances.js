const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

const wallets = [
  { name: 'Wallet 1', address: 'GhyyPVNs2SfRybTWvvXB4HWttzp9RNNeXr5D8oQGhYdz' },
  { name: 'Wallet 2', address: 'DxLvLNxJxvxKZpYBKYRKFjkfEXCaKJGhCrCXvzJTpump' },
  { name: 'Wallet 3', address: '2xbszHawVPSnLx1FaYNnypCW335etYVbiP6GTt254dzy' },
  { name: 'Wallet 4', address: '41GqfSEyRsuVBir4cUSZSZNjDevFLxnZuspKQQe9F4qP' },
  { name: 'Wallet 5', address: 'GGJvZLBgngQHvh8D9av7CiJ7HLhpfMT5K6xnxtSfMf5s' }
];

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

async function checkBalances() {
  console.log('\n💼 CHECKING ALL WALLET BALANCES');
  console.log('='.repeat(80));
  
  let totalSOL = 0;
  let totalUSDC = 0;
  
  for (const wallet of wallets) {
    try {
      const publicKey = new PublicKey(wallet.address);
      
      // Get SOL balance
      const solBalance = await connection.getBalance(publicKey);
      const solAmount = solBalance / LAMPORTS_PER_SOL;
      
      // Get USDC balance
      let usdcAmount = 0;
      try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: usdcMint });
        if (tokenAccounts.value.length > 0) {
          usdcAmount = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        }
      } catch (e) {
        // No USDC account
      }
      
      totalSOL += solAmount;
      totalUSDC += usdcAmount;
      
      console.log(`\n${wallet.name}:`);
      console.log(`  Address: ${wallet.address}`);
      console.log(`  SOL:  ${solAmount.toFixed(4)} SOL`);
      console.log(`  USDC: $${usdcAmount.toFixed(2)} USDC`);
      
      if (solAmount < 0.01) {
        console.log(`  ⚠️  Low SOL - need at least 0.01 SOL for fees`);
      }
      if (usdcAmount < 100) {
        console.log(`  ⚠️  Low USDC - need at least $100 for trading`);
      }
      
    } catch (error) {
      console.log(`\n${wallet.name}:`);
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('TOTALS:');
  console.log(`  Total SOL:  ${totalSOL.toFixed(4)} SOL`);
  console.log(`  Total USDC: $${totalUSDC.toFixed(2)} USDC`);
  console.log('='.repeat(80) + '\n');
}

checkBalances().catch(console.error);
