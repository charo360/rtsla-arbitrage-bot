/**
 * Quick script to sell tokens back to USDC
 * Recovers funds from test trades
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { JupiterClient } from './src/utils/jupiter-client';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import * as bs58 from 'bs58';

const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=e0a1eba8-99fc-4a5f-b818-554b81603986');

// Token mints
const TOKENS = {
  'MSTRr': new PublicKey('B8GKqTDGYc7F6udTHjYeazZ4dFCRkrwK2mBQNS4igqTv'),
  'TSLAr': new PublicKey('FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe'),
  'NVDAr': new PublicKey('ALTP6gug9wv5mFtx2tSU1YYZ1NrEc2chDdMPoJA8f8pu'),
  'SPYr': new PublicKey('AVw2QGVkXJPRPRjLAceXVoLqU5DVtJ53mdgMXp14yGit'),
  'CRCLr': new PublicKey('5fKr9joRHpioriGmMgRVFdmZge8EVUTbrWyxDVdSrcuG'),
};

async function sellAllTokens() {
  console.log('🔄 Selling all tokens back to USDC...\n');

  // Get wallet from env
  const walletKey = process.env.WALLET_1;
  if (!walletKey) {
    console.error('❌ WALLET_1 not found in .env');
    return;
  }

  const keypair = Keypair.fromSecretKey(bs58.decode(walletKey));
  console.log(`Wallet: ${keypair.publicKey.toBase58()}\n`);

  const jupiterClient = new JupiterClient(connection);

  // Check each token balance
  for (const [symbol, mint] of Object.entries(TOKENS)) {
    try {
      console.log(`\n📊 Checking ${symbol}...`);
      
      const tokenAccount = await getAssociatedTokenAddress(
        mint,
        keypair.publicKey
      );

      const accountInfo = await connection.getAccountInfo(tokenAccount);
      
      if (!accountInfo) {
        console.log(`   No ${symbol} token account found`);
        continue;
      }

      // Parse token balance (Token-2022 format)
      const data = accountInfo.data;
      const balance = data.readBigUInt64LE(64);
      const balanceTokens = Number(balance) / 1_000_000_000;

      if (balanceTokens === 0) {
        console.log(`   Balance: 0 tokens`);
        continue;
      }

      console.log(`   Balance: ${balanceTokens.toFixed(6)} tokens`);
      console.log(`   🔄 Selling...`);

      // Sell on Jupiter
      const result = await jupiterClient.executeSellSwap(
        mint,
        balanceTokens,
        keypair,
        9, // 9 decimals
        100 // 1% slippage
      );

      if (result.success) {
        console.log(`   ✅ Sold for $${result.outputAmount.toFixed(2)} USDC`);
        console.log(`   Signature: ${result.signature}`);
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n✅ Done! Check your wallet for USDC.');
}

// Run
sellAllTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
