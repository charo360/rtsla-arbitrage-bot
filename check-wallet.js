/**
 * Check all token accounts for a wallet
 */

const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58');
require('dotenv').config();

async function main() {
  const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
  
  // Load wallet
  const privateKey = process.env.WALLET_1 || process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) {
    console.error('No wallet key in .env');
    return;
  }
  
  let keypair;
  if (privateKey.startsWith('[')) {
    keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(privateKey)));
  } else {
    keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  }
  
  console.log(`Wallet: ${keypair.publicKey.toBase58()}`);
  
  // Get SOL balance
  const solBalance = await connection.getBalance(keypair.publicKey);
  console.log(`\nSOL: ${(solBalance / 1e9).toFixed(4)}`);
  
  // Get all token accounts (both SPL Token and Token-2022)
  console.log('\n📊 All Token Accounts:\n');

  // SPL Token program
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(keypair.publicKey, {
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
  });

  // Token-2022 program
  const token2022Accounts = await connection.getParsedTokenAccountsByOwner(keypair.publicKey, {
    programId: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
  });

  const allAccounts = [...tokenAccounts.value, ...token2022Accounts.value];

  if (allAccounts.length === 0) {
    console.log('No token accounts found');
    return;
  }

  for (const account of allAccounts) {
    const info = account.account.data.parsed.info;
    const mint = info.mint;
    const balance = info.tokenAmount.uiAmount;
    const decimals = info.tokenAmount.decimals;
    const program = account.account.owner.toBase58().startsWith('Tokenz') ? 'Token-2022' : 'SPL Token';

    if (balance > 0) {
      console.log(`Mint: ${mint}`);
      console.log(`  Balance: ${balance} (${decimals} decimals)`);
      console.log(`  Account: ${account.pubkey.toBase58()}`);
      console.log(`  Program: ${program}`);
      console.log('');
    }
  }
  
  // Check recent transactions
  console.log('\n📜 Recent Transactions (last 5):\n');
  const sigs = await connection.getSignaturesForAddress(keypair.publicKey, { limit: 5 });
  for (const sig of sigs) {
    const date = new Date(sig.blockTime * 1000).toLocaleString();
    console.log(`${date}: ${sig.signature.slice(0, 20)}...`);
    if (sig.err) {
      console.log(`  ❌ Error: ${JSON.stringify(sig.err)}`);
    }
  }
}

main().catch(console.error);

