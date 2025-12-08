// Simple wallet balance checker
const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
const bs58 = require('bs58');
require('dotenv').config();

async function checkWallet() {
  console.log('💼 Wallet Balance Checker\n');
  console.log('='.repeat(70));

  const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
  
  // Get wallet address from env
  const walletAddress = process.env.WALLET_ADDRESS || process.env.WALLET_PUBLIC_KEY;
  
  if (!walletAddress) {
    console.log('\n❌ No wallet address found');
    console.log('   Please set WALLET_ADDRESS in your .env file');
    console.log('   Example: WALLET_ADDRESS=YourSolanaWalletAddressHere\n');
    return;
  }

  try {
    const publicKey = new PublicKey(walletAddress);

    console.log(`\n📍 Wallet Address:`);
    console.log(`   ${publicKey.toBase58()}\n`);

    // Get SOL balance
    console.log('⏳ Fetching balances...\n');
    const solBalance = await connection.getBalance(publicKey);
    const solBalanceFormatted = (solBalance / 1e9).toFixed(4);
    
    console.log(`💰 SOL Balance: ${solBalanceFormatted} SOL`);
    const solUsdValue = (solBalance / 1e9 * 200).toFixed(2); // Assuming $200/SOL
    console.log(`   (~$${solUsdValue} USD at $200/SOL)\n`);

    // Get USDC balance
    const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    
    try {
      const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, publicKey);
      const usdcAccountInfo = await connection.getTokenAccountBalance(usdcTokenAccount);
      
      if (usdcAccountInfo && usdcAccountInfo.value) {
        const usdcBalance = parseFloat(usdcAccountInfo.value.uiAmount || '0');
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
        // Token account doesn't exist, skip
      }
    }

    if (!hasTokens) {
      console.log('   No tokenized stocks found in wallet');
    }

    console.log('\n' + '='.repeat(70));

    // Trading readiness check
    console.log('\n🎯 Trading Readiness Check:');
    console.log('-'.repeat(70));

    const minSol = 0.01;
    const minUsdc = 10;

    if (solBalance / 1e9 < minSol) {
      console.log(`   ❌ SOL: ${solBalanceFormatted} SOL (Need at least ${minSol} SOL)`);
      console.log('      💡 Deposit SOL for transaction fees');
    } else {
      console.log(`   ✅ SOL: ${solBalanceFormatted} SOL (Sufficient for fees)`);
    }

    // Check USDC again for readiness
    try {
      const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, publicKey);
      const usdcAccountInfo = await connection.getTokenAccountBalance(usdcTokenAccount);
      const usdcBalance = usdcAccountInfo ? parseFloat(usdcAccountInfo.value.uiAmount || '0') : 0;

      if (usdcBalance < minUsdc) {
        console.log(`   ❌ USDC: $${usdcBalance.toFixed(2)} (Need at least $${minUsdc})`);
        console.log('      💡 Deposit USDC to start trading');
      } else {
        console.log(`   ✅ USDC: $${usdcBalance.toFixed(2)} (Ready to trade!)`);
      }

      console.log('\n' + '='.repeat(70));

      if (solBalance / 1e9 >= minSol && usdcBalance >= minUsdc) {
        console.log('\n🚀 WALLET IS READY FOR TRADING!');
        console.log(`   You can trade up to $${usdcBalance.toFixed(2)} USDC\n`);
      } else {
        console.log('\n⚠️  WALLET NEEDS FUNDING');
        console.log('   Fund your wallet to start trading:\n');
        if (solBalance / 1e9 < minSol) {
          console.log(`   1. Send at least ${minSol} SOL for transaction fees`);
        }
        if (usdcBalance < minUsdc) {
          console.log(`   2. Send at least $${minUsdc} USDC for trading`);
        }
        console.log('');
      }
    } catch (error) {
      console.log(`   ❌ USDC: $0.00 (No token account)`);
      console.log('      💡 Deposit USDC to create account and start trading\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nMake sure WALLET_ADDRESS is a valid Solana address\n');
  }
}

checkWallet().catch(console.error);
