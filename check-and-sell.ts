/**
 * Check all token balances and sell everything
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { JupiterClient } from './src/utils/jupiter-client';
import * as bs58 from 'bs58';

const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=e0a1eba8-99fc-4a5f-b818-554b81603986');

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

const TOKENS = {
  'MSTRr': new PublicKey('B8GKqTDGYc7F6udTHjYeazZ4dFCRkrwK2mBQNS4igqTv'),
  'CRCLr': new PublicKey('5fKr9joRHpioriGmMgRVFdmZge8EVUTbrWyxDVdSrcuG'),
};

async function checkAndSell() {
  console.log('🔍 Checking all token accounts...\n');

  const walletKey = process.env.WALLET_1;
  if (!walletKey) {
    console.error('❌ WALLET_1 not found');
    return;
  }

  const keypair = Keypair.fromSecretKey(bs58.decode(walletKey));
  console.log(`Wallet: ${keypair.publicKey.toBase58()}\n`);

  const jupiterClient = new JupiterClient(connection);

  // Get all token accounts for this wallet
  console.log('📊 Fetching all token accounts...');
  
  const [splAccounts, token2022Accounts] = await Promise.all([
    connection.getTokenAccountsByOwner(keypair.publicKey, { programId: TOKEN_PROGRAM_ID }),
    connection.getTokenAccountsByOwner(keypair.publicKey, { programId: TOKEN_2022_PROGRAM_ID })
  ]);

  console.log(`   SPL Token accounts: ${splAccounts.value.length}`);
  console.log(`   Token-2022 accounts: ${token2022Accounts.value.length}\n`);

  const allAccounts = [...splAccounts.value, ...token2022Accounts.value];

  if (allAccounts.length === 0) {
    console.log('✅ No token accounts found - wallet is clean!');
    return;
  }

  // Check each account
  for (const account of allAccounts) {
    try {
      const data = account.account.data;
      
      // Parse token account data
      const mintBytes = data.slice(0, 32);
      const mint = new PublicKey(mintBytes);
      const balance = data.readBigUInt64LE(64);
      const balanceTokens = Number(balance) / 1_000_000_000;

      if (balanceTokens === 0) continue;

      // Find token symbol
      let symbol = 'Unknown';
      for (const [name, tokenMint] of Object.entries(TOKENS)) {
        if (tokenMint.equals(mint)) {
          symbol = name;
          break;
        }
      }

      console.log(`\n💰 Found ${symbol}:`);
      console.log(`   Mint: ${mint.toBase58()}`);
      console.log(`   Balance: ${balanceTokens.toFixed(6)} tokens`);
      console.log(`   Account: ${account.pubkey.toBase58()}`);

      // Sell it
      console.log(`   🔄 Selling on Jupiter...`);
      
      const result = await jupiterClient.executeSellSwap(
        mint,
        balanceTokens,
        keypair,
        9,
        150 // 1.5% slippage
      );

      if (result.success) {
        console.log(`   ✅ SOLD! Received $${result.outputAmount.toFixed(2)} USDC`);
        console.log(`   📝 Signature: ${result.signature}`);
        console.log(`   🔗 https://solscan.io/tx/${result.signature}`);
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n✅ Done!');
}

checkAndSell()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
