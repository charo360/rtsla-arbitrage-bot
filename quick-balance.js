const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
require('dotenv').config();

const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');

const privateKey = process.env.WALLET_PRIVATE_KEY;
let secretKey;
if (privateKey.startsWith('[')) {
  const keyArray = JSON.parse(privateKey);
  secretKey = Uint8Array.from(keyArray);
} else {
  secretKey = bs58.decode(privateKey);
}

const keypair = Keypair.fromSecretKey(secretKey);
const wallet = keypair.publicKey;
console.log(`Wallet: ${wallet.toBase58()}\n`);

async function checkBalance() {
  try {
    const balance = await connection.getBalance(wallet);
    console.log(`SOL: ${(balance / 1e9).toFixed(4)}`);
    
    const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    
    const accounts = await connection.getTokenAccountsByOwner(wallet, { mint: USDC_MINT, programId: TOKEN_PROGRAM });
    
    let totalUSDC = 0;
    for (const acc of accounts.value) {
      const amount = acc.account.data.readBigUInt64LE(64);
      totalUSDC += Number(amount) / 1e6;
    }
    
    console.log(`USDC: $${totalUSDC.toFixed(2)}`);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

checkBalance();
