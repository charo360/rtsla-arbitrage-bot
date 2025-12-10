import { Connection, PublicKey } from '@solana/web3.js';
import { config } from './src/config/config';
import { WalletManager } from './src/utils/wallet-manager';

const connection = new Connection(config.rpcUrl);

async function checkTokens() {
  const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  const walletManager = new WalletManager(connection, USDC_MINT);
  
  // Add wallet from config
  if (config.walletPrivateKeys && config.walletPrivateKeys.length > 0) {
    walletManager.addWallets(config.walletPrivateKeys, 'Trading');
  }
  
  const wallet = await walletManager.selectWallet();
  
  if (!wallet) {
    console.error('No wallet found');
    return;
  }
  
  console.log(`\nWallet: ${wallet.publicKey.toBase58()}`);
  
  // Check SOL
  const solBalance = await connection.getBalance(wallet.publicKey);
  console.log(`SOL: ${(solBalance / 1e9).toFixed(4)}`);
  
  // Check USDC
  const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  
  const usdcAccounts = await connection.getTokenAccountsByOwner(wallet.publicKey, {
    mint: USDC_MINT,
    programId: TOKEN_PROGRAM
  });
  
  let totalUSDC = 0;
  for (const acc of usdcAccounts.value) {
    const amount = Number(acc.account.data.readBigUInt64LE(64));
    totalUSDC += amount / 1e6;
  }
  
  console.log(`USDC: $${totalUSDC.toFixed(2)}`);
  
  // Check rTokens
  const tokens = [
    { name: 'CRCLr', mint: '5fKr9joRHpioriGmMgRVFdmZge8EVUTbrWyxDVdSrcuG' },
    { name: 'MSTRr', mint: 'B8GKqTDGYc7F6udTHjYeazZ4dFCRkrwK2mBQNS4igqTv' },
    { name: 'NVDAr', mint: 'ALTP6gug9wv5mFtx2tSU1YYZ1NrEc2chDdMPoJA8f8pu' },
    { name: 'TSLAr', mint: 'FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe' },
    { name: 'SPYr', mint: 'AVw2QGVkXJPRPRjLAceXVoLqU5DVtJ53mdgMXp14yGit' }
  ];
  
  console.log('\nToken Balances:');
  for (const token of tokens) {
    try {
      const tokenMint = new PublicKey(token.mint);
      const accounts = await connection.getTokenAccountsByOwner(wallet.publicKey, {
        mint: tokenMint,
        programId: TOKEN_PROGRAM
      });
      
      let totalBalance = 0;
      for (const acc of accounts.value) {
        const amount = Number(acc.account.data.readBigUInt64LE(64));
        totalBalance += amount / 1e9;
      }
      
      if (totalBalance > 0) {
        console.log(`${token.name}: ${totalBalance.toFixed(6)} tokens`);
      }
    } catch (e) {
      // Skip
    }
  }
  
  console.log('\n');
}

checkTokens().catch(console.error);
