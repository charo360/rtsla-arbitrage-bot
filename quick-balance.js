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

async function checkBalance() {
  try {
    const balance = await connection.getBalance(wallet);
    console.log(`\nWallet: ${wallet.toBase58()}`);
    console.log(`SOL: ${(balance / 1e9).toFixed(4)}`);
    
    const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const TOKEN_2022_PROGRAM = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    
    const accounts = await connection.getTokenAccountsByOwner(wallet, { mint: USDC_MINT, programId: TOKEN_PROGRAM });
    
    let totalUSDC = 0;
    for (const acc of accounts.value) {
      const amount = acc.account.data.readBigUInt64LE(64);
      totalUSDC += Number(amount) / 1e6;
    }
    
    console.log(`USDC: $${totalUSDC.toFixed(2)}`);
    
    // Check for other tokens (rTokens)
    const CRCLr = new PublicKey('5fKr9joRHpioriGmMgRVFdmZge8EVUTbrWyxDVdSrcuG');
    const MSTRr = new PublicKey('B8GKqTDGYc7F6udTHjYeazZ4dFCRkrwK2mBQNS4igqTv');
    const NVDAr = new PublicKey('ALTP6gug9wv5mFtx2tSU1YYZ1NrEc2chDdMPoJA8f8pu');
    
    const tokens = [
      { name: 'CRCLr', mint: CRCLr },
      { name: 'MSTRr', mint: MSTRr },
      { name: 'NVDAr', mint: NVDAr }
    ];
    
    console.log('\nToken Balances:');
    for (const token of tokens) {
      try {
        const [splAccounts, token2022Accounts] = await Promise.all([
          connection.getTokenAccountsByOwner(wallet, { mint: token.mint, programId: TOKEN_PROGRAM }),
          connection.getTokenAccountsByOwner(wallet, { mint: token.mint, programId: TOKEN_2022_PROGRAM })
        ]);
        
        const allAccounts = [...splAccounts.value, ...token2022Accounts.value];
        let totalBalance = 0;
        for (const acc of allAccounts) {
          const amount = acc.account.data.readBigUInt64LE(64);
          totalBalance += Number(amount) / 1e9;
        }
        
        if (totalBalance > 0) {
          console.log(`${token.name}: ${totalBalance.toFixed(6)} tokens`);
        }
      } catch (e) {
        // Skip if error
      }
    }
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

checkBalance();
