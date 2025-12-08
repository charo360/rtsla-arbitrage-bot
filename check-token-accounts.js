// Check if wallet has token accounts for the tokens we're trading
const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
const bs58 = require('bs58');
require('dotenv').config();

async function checkTokenAccounts() {
  console.log('🔍 Checking Token Accounts\n');
  console.log('='.repeat(70));

  const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
  
  const walletKey = process.env.WALLET_1;
  if (!walletKey) {
    console.log('❌ No WALLET_1 found');
    return;
  }

  const walletPubkey = new PublicKey('GhyyPVNs2SfRybTWvvXB4HWttzp9RNNeXr5D8oQGhYdz');
  console.log(`\n💼 Wallet: ${walletPubkey.toBase58()}\n`);

  const tokens = {
    'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'TSLAr': 'FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe',
    'CRCLr': '5fKr9joRHpioriGmMgRVFdmZge8EVUTbrWyxDVdSrcuG',
    'SPYr': 'AVw2QGVkXJPRPRjLAceXVoLqU5DVtJ53mdgMXp14yGit',
    'MSTRr': 'B8GKqTDGYc7F6udTHjYeazZ4dFCRkrwK2mBQNS4igqTv',
    'NVDAr': 'ALTP6gug9wv5mFtx2tSU1YYZ1NrEc2chDdMPoJA8f8pu',
  };

  for (const [symbol, mint] of Object.entries(tokens)) {
    try {
      const mintPubkey = new PublicKey(mint);
      const ata = await getAssociatedTokenAddress(mintPubkey, walletPubkey);
      
      console.log(`\n📊 ${symbol}:`);
      console.log(`   Mint: ${mint}`);
      console.log(`   ATA: ${ata.toBase58()}`);
      
      // Check if account exists
      const accountInfo = await connection.getAccountInfo(ata);
      
      if (accountInfo) {
        console.log(`   ✅ Token account EXISTS`);
        
        // Get balance
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          walletPubkey,
          { mint: mintPubkey }
        );
        
        if (tokenAccounts.value.length > 0) {
          const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
          console.log(`   Balance: ${balance} ${symbol}`);
        }
      } else {
        console.log(`   ❌ Token account DOES NOT EXIST`);
        console.log(`   ⚠️  Need to create ATA before trading this token!`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n💡 If any token accounts are missing, Jupiter should create them');
  console.log('   automatically when wrapAndUnwrapSol=true is set.\n');
}

checkTokenAccounts().catch(console.error);
