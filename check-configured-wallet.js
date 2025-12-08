// Check wallet that's actually configured in the bot
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
require('dotenv').config();

async function checkConfiguredWallet() {
  console.log('💼 Checking Configured Wallet Balance\n');
  console.log('='.repeat(70));

  const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
  
  // Try to find wallet from various env variables
  let walletKey = null;
  let walletSource = '';
  
  if (process.env.WALLET_1) {
    walletKey = process.env.WALLET_1;
    walletSource = 'WALLET_1';
  } else if (process.env.WALLET_PRIVATE_KEY) {
    walletKey = process.env.WALLET_PRIVATE_KEY;
    walletSource = 'WALLET_PRIVATE_KEY';
  } else if (process.env.WALLET_PRIVATE_KEYS) {
    const keys = process.env.WALLET_PRIVATE_KEYS.split(',');
    walletKey = keys[0].trim();
    walletSource = 'WALLET_PRIVATE_KEYS (first wallet)';
  }
  
  if (!walletKey) {
    console.log('\n❌ No wallet configured');
    console.log('   Checked: WALLET_1, WALLET_PRIVATE_KEY, WALLET_PRIVATE_KEYS');
    console.log('   Bot is running in monitoring-only mode\n');
    return;
  }

  console.log(`\n✅ Found wallet from: ${walletSource}\n`);

  try {
    // Try to parse as JSON array first
    let keypair;
    try {
      const secretKey = JSON.parse(walletKey);
      keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    } catch (e) {
      // Try as base58 string
      const bs58 = require('bs58');
      const decoded = bs58.decode(walletKey);
      keypair = Keypair.fromSecretKey(decoded);
    }

    const publicKey = keypair.publicKey;

    console.log(`📍 Wallet Address:`);
    console.log(`   ${publicKey.toBase58()}\n`);

    // Get SOL balance
    console.log('⏳ Fetching balances...\n');
    const solBalance = await connection.getBalance(publicKey);
    const solBalanceFormatted = (solBalance / 1e9).toFixed(4);
    
    console.log(`💰 SOL Balance: ${solBalanceFormatted} SOL`);
    const solUsdValue = (solBalance / 1e9 * 200).toFixed(2);
    console.log(`   (~$${solUsdValue} USD at $200/SOL)\n`);

    // Get USDC balance
    const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    
    let usdcBalance = 0;
    try {
      const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, publicKey);
      const usdcAccountInfo = await connection.getTokenAccountBalance(usdcTokenAccount);
      
      if (usdcAccountInfo && usdcAccountInfo.value) {
        usdcBalance = parseFloat(usdcAccountInfo.value.uiAmount || '0');
        console.log(`💵 USDC Balance: $${usdcBalance.toFixed(2)} USDC\n`);
      } else {
        console.log(`💵 USDC Balance: $0.00 USDC\n`);
      }
    } catch (error) {
      console.log(`💵 USDC Balance: $0.00 USDC (No token account)\n`);
    }

    // Check token balances
    console.log('📊 Tokenized Stock Balances:');
    console.log('-'.repeat(70));

    const tokens = {
      'TSLAr': 'FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe',
      'CRCLr': '5fKr9joRHpioriGmMgRVFdmZge8EVUTbrWyxDVdSrcuG',
      'SPYr': 'AVw2QGVkXJPRPRjLAceXVoLqU5DVtJ53mdgMXp14yGit',
      'MSTRr': 'B8GKqTDGYc7F6udTHjYeazZ4dFCRkrwK2mBQNS4igqTv',
      'NVDAr': 'ALTP6gug9wv5mFtx2tSU1YYZ1NrEc2chDdMPoJA8f8pu',
    };

    let hasTokens = false;

    for (const [symbol, mintAddress] of Object.entries(tokens)) {
      try {
        const mint = new PublicKey(mintAddress);
        const tokenAccount = await getAssociatedTokenAddress(mint, publicKey);
        const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
        
        if (accountInfo && accountInfo.value) {
          const balance = parseFloat(accountInfo.value.uiAmount || '0');
          if (balance > 0) {
            console.log(`   ✅ ${symbol.padEnd(7)} ${balance.toFixed(6)} tokens`);
            hasTokens = true;
          }
        }
      } catch (error) {
        // Token account doesn't exist
      }
    }

    if (!hasTokens) {
      console.log('   No tokenized stocks in wallet');
    }

    console.log('\n' + '='.repeat(70));

    // Trading readiness
    console.log('\n🎯 Trading Readiness:');
    console.log('-'.repeat(70));

    const minSol = 0.01;
    const minUsdc = 10;

    if (solBalance / 1e9 < minSol) {
      console.log(`   ❌ SOL: ${solBalanceFormatted} SOL (Need ≥ ${minSol} SOL for fees)`);
    } else {
      console.log(`   ✅ SOL: ${solBalanceFormatted} SOL (Sufficient for fees)`);
    }

    if (usdcBalance < minUsdc) {
      console.log(`   ❌ USDC: $${usdcBalance.toFixed(2)} (Need ≥ $${minUsdc} to trade)`);
    } else {
      console.log(`   ✅ USDC: $${usdcBalance.toFixed(2)} (Ready to trade!)`);
    }

    console.log('\n' + '='.repeat(70));

    if (solBalance / 1e9 >= minSol && usdcBalance >= minUsdc) {
      console.log('\n🚀 WALLET IS READY FOR TRADING!');
      console.log(`   Max trade size: $${Math.min(usdcBalance, 1000).toFixed(2)} USDC`);
      console.log('   Set AUTO_EXECUTE=true to enable live trading\n');
    } else {
      console.log('\n⚠️  WALLET NEEDS FUNDING');
      console.log('   To start trading, fund your wallet:\n');
      if (solBalance / 1e9 < minSol) {
        console.log(`   1. Send ≥ ${minSol} SOL for transaction fees`);
      }
      if (usdcBalance < minUsdc) {
        console.log(`   2. Send ≥ $${minUsdc} USDC for trading`);
      }
      console.log(`\n   Send to: ${publicKey.toBase58()}\n`);
    }

  } catch (error) {
    console.error('\n❌ Error reading wallet:', error.message);
    console.log('   Wallet key format may be incorrect\n');
  }
}

checkConfiguredWallet().catch(console.error);
