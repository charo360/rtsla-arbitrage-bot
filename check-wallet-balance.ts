import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import dotenv from 'dotenv';
import bs58 from 'bs58';

dotenv.config();

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

const TOKEN_MINTS = {
  'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'TSLAr': 'FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe',
  'MSTRr': 'B8GKqTDGtJcGNjmKevZmAS3FMPpTvYyXi5K8M8o4mHTr',
  'CRCLr': '5fKr9joRCRYLkVj9FvyJy5ZD2Lzf4EJPvFqWy1YUdqkh',
  'NVDAr': 'AVw2QGVkfZJxvCkjvUYQqHnYYFG4fKjPYPNhD8qYvFrB',
  'SPYr': 'ALTP6gugnJEy9wCnPAsZHKFCMXKPKYSLPCjhvtFEEGm',
};

async function main() {
  const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
  
  const privateKeyStr = process.env.WALLET_1 || process.env.WALLET_PRIVATE_KEY;
  if (!privateKeyStr) {
    console.error('❌ WALLET_1 or WALLET_PRIVATE_KEY not found in .env');
    return;
  }

  const privateKeyBytes = bs58.decode(privateKeyStr);
  const walletPubkey = PublicKey.findProgramAddressSync(
    [privateKeyBytes.slice(32)],
    new PublicKey('11111111111111111111111111111111')
  )[0];
  
  // Simpler: just derive from secret key
  const { Keypair } = await import('@solana/web3.js');
  const keypair = Keypair.fromSecretKey(privateKeyBytes);
  const wallet = keypair.publicKey;

  console.log(`\n🔍 Checking wallet: ${wallet.toString()}\n`);

  // Check SOL balance
  const solBalance = await connection.getBalance(wallet);
  console.log(`💰 SOL Balance: ${(solBalance / 1e9).toFixed(4)} SOL\n`);

  // Check all token accounts
  console.log(`📊 Token Balances:\n`);
  
  let totalUSDC = 0;
  
  for (const [symbol, mintStr] of Object.entries(TOKEN_MINTS)) {
    const mint = new PublicKey(mintStr);
    
    try {
      // Try SPL Token
      const ata = await getAssociatedTokenAddress(mint, wallet, false, TOKEN_PROGRAM_ID);
      const account = await connection.getTokenAccountBalance(ata);
      const balance = parseFloat(account.value.uiAmount?.toString() || '0');
      
      if (balance > 0) {
        console.log(`   ${symbol}: ${balance.toFixed(6)} tokens`);
        console.log(`      Account: ${ata.toString()}`);
        
        if (symbol === 'USDC') {
          totalUSDC += balance;
        }
      }
    } catch (e) {
      // Account doesn't exist or error
    }
    
    try {
      // Try Token-2022
      const ata2022 = await getAssociatedTokenAddress(mint, wallet, false, TOKEN_2022_PROGRAM_ID);
      const account = await connection.getTokenAccountBalance(ata2022);
      const balance = parseFloat(account.value.uiAmount?.toString() || '0');
      
      if (balance > 0) {
        console.log(`   ${symbol} (Token-2022): ${balance.toFixed(6)} tokens`);
        console.log(`      Account: ${ata2022.toString()}`);
        
        if (symbol === 'USDC') {
          totalUSDC += balance;
        }
      }
    } catch (e) {
      // Account doesn't exist or error
    }
  }

  // Check for any other token accounts
  console.log(`\n🔍 Checking for other token accounts...\n`);
  
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet, {
    programId: TOKEN_PROGRAM_ID
  });
  
  const token2022Accounts = await connection.getParsedTokenAccountsByOwner(wallet, {
    programId: TOKEN_2022_PROGRAM_ID
  });

  const allAccounts = [...tokenAccounts.value, ...token2022Accounts.value];
  
  for (const account of allAccounts) {
    const mint = account.account.data.parsed.info.mint;
    const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
    
    if (balance > 0) {
      // Check if it's a known token
      const knownToken = Object.entries(TOKEN_MINTS).find(([_, m]) => m === mint);
      
      if (!knownToken) {
        console.log(`   Unknown Token:`);
        console.log(`      Mint: ${mint}`);
        console.log(`      Balance: ${balance} tokens`);
        console.log(`      Account: ${account.pubkey.toString()}`);
        
        // Check if it's USDC
        if (mint === USDC_MINT.toString()) {
          console.log(`      ⚠️  This is USDC in a non-standard account!`);
          totalUSDC += balance;
        }
      }
    }
  }

  console.log(`\n💰 Total USDC across all accounts: $${totalUSDC.toFixed(2)}\n`);
}

main().catch(console.error);
