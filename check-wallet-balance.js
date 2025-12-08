// Check wallet balance
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
require('dotenv').config();

async function checkWalletBalance() {
  console.log('💼 Checking Wallet 1 Balance...\n');
  console.log('='.repeat(70));

  const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
  
  // Get wallet 1 private key (try multiple formats)
  const wallet1Key = process.env.WALLET_1 || process.env.WALLET_PRIVATE_KEY;
  
  if (!wallet1Key) {
    console.log('❌ No wallet found in .env file');
    console.log('   Looking for: WALLET_1 or WALLET_PRIVATE_KEY');
    console.log('   Please configure a wallet in your .env file\n');
    return;
  }

  try {
    // Parse private key
    const secretKey = JSON.parse(wallet1Key);
    const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    const publicKey = keypair.publicKey;

    console.log(`\n📍 Wallet 1 Address:`);
    console.log(`   ${publicKey.toBase58()}\n`);

    // Get SOL balance
    const solBalance = await connection.getBalance(publicKey);
    const solBalanceFormatted = (solBalance / 1e9).toFixed(4);
    
    console.log(`💰 SOL Balance: ${solBalanceFormatted} SOL`);
    console.log(`   (${(solBalance / 1e9 * 100).toFixed(2)} USD at $100/SOL)\n`);

    // Get USDC balance
    const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    
    try {
      const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, publicKey);
      const usdcAccountInfo = await connection.getTokenAccountBalance(usdcTokenAccount);
      
      if (usdcAccountInfo && usdcAccountInfo.value) {
        const usdcBalance = parseFloat(usdcAccountInfo.value.uiAmount || '0');
        console.log(`💵 USDC Balance: ${usdcBalance.toFixed(2)} USDC\n`);
      } else {
        console.log(`💵 USDC Balance: 0.00 USDC (No token account)\n`);
      }
    } catch (error) {
      console.log(`💵 USDC Balance: 0.00 USDC (No token account created yet)\n`);
    }

    // Check token balances
    console.log('📊 Token Balances:');
    console.log('-'.repeat(70));

    const tokens = {
      'TSLAr': process.env.RTSLA_MINT_ADDRESS || 'FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe',
      'CRCLr': process.env.CRCL_MINT_ADDRESS || '5fKr9joRHpioriGmMgRVFdmZge8EVUTbrWyxDVdSrcuG',
      'SPYr': process.env.SPY_MINT_ADDRESS || 'AVw2QGVkXJPRPRjLAceXVoLqU5DVtJ53mdgMXp14yGit',
      'MSTRr': process.env.MSTR_MINT_ADDRESS || 'B8GKqTDGYc7F6udTHjYeazZ4dFCRkrwK2mBQNS4igqTv',
      'NVDAr': process.env.NVDA_MINT_ADDRESS || 'ALTP6gug9wv5mFtx2tSU1YYZ1NrEc2chDdMPoJA8f8pu',
    };

    for (const [symbol, mintAddress] of Object.entries(tokens)) {
      try {
        const mint = new PublicKey(mintAddress);
        const tokenAccount = await getAssociatedTokenAddress(mint, publicKey);
        const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
        
        if (accountInfo && accountInfo.value) {
          const balance = parseFloat(accountInfo.value.uiAmount || '0');
          if (balance > 0) {
            console.log(`   ${symbol.padEnd(7)} ${balance.toFixed(6)} tokens`);
          } else {
            console.log(`   ${symbol.padEnd(7)} 0.000000 tokens`);
          }
        } else {
          console.log(`   ${symbol.padEnd(7)} 0.000000 tokens (No account)`);
        }
      } catch (error) {
        console.log(`   ${symbol.padEnd(7)} 0.000000 tokens (No account)`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Balance check complete!\n');

    // Show trading readiness
    const usdcMintPub = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    const usdcTokenAccountPub = await getAssociatedTokenAddress(usdcMintPub, publicKey);
    const usdcInfo = await connection.getTokenAccountBalance(usdcTokenAccountPub).catch(() => null);
    const usdcBal = usdcInfo ? parseFloat(usdcInfo.value.uiAmount || '0') : 0;

    console.log('🎯 Trading Readiness:');
    if (solBalance < 0.01e9) {
      console.log('   ⚠️  Low SOL balance - Need at least 0.01 SOL for transaction fees');
    } else {
      console.log('   ✅ SOL balance sufficient for transaction fees');
    }

    if (usdcBal < 10) {
      console.log('   ⚠️  Low USDC balance - Need at least $10 USDC to trade');
      console.log('   💡 Fund wallet with USDC to start trading');
    } else {
      console.log(`   ✅ USDC balance sufficient (${usdcBal.toFixed(2)} USDC)`);
      console.log('   🚀 Ready to trade!');
    }

    console.log('');

  } catch (error) {
    console.error('❌ Error checking wallet balance:', error.message);
  }
}

checkWalletBalance().catch(console.error);
