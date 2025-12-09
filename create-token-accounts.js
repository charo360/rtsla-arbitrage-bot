// Create Associated Token Accounts (ATAs) for all trading tokens
const { Connection, Keypair, PublicKey, Transaction } = require('@solana/web3.js');
const { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} = require('@solana/spl-token');
const bs58 = require('bs58');
require('dotenv').config();

async function createTokenAccounts() {
  console.log('🏗️  Creating Token Accounts for Trading\n');
  console.log('='.repeat(70));

  // Setup connection
  const connection = new Connection(
    process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    'confirmed'
  );

  // Load wallet
  const walletKey = process.env.WALLET_1;
  if (!walletKey) {
    console.log('❌ No WALLET_1 found in .env');
    return;
  }

  const keypair = Keypair.fromSecretKey(bs58.decode(walletKey));
  const walletPubkey = keypair.publicKey;

  console.log(`\n💼 Wallet: ${walletPubkey.toBase58()}`);

  // Check SOL balance
  const solBalance = await connection.getBalance(walletPubkey);
  console.log(`💰 SOL Balance: ${(solBalance / 1e9).toFixed(4)} SOL`);

  if (solBalance < 0.01 * 1e9) {
    console.log('\n❌ Insufficient SOL for transaction fees');
    console.log('   Need at least 0.01 SOL\n');
    return;
  }

  // Tokens to create accounts for
  const tokens = {
    'TSLAr': 'FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe',
    'CRCLr': '5fKr9joRHpioriGmMgRVFdmZge8EVUTbrWyxDVdSrcuG',
    'SPYr': 'AVw2QGVkXJPRPRjLAceXVoLqU5DVtJ53mdgMXp14yGit',
    'MSTRr': 'B8GKqTDGYc7F6udTHjYeazZ4dFCRkrwK2mBQNS4igqTv',
    'NVDAr': 'ALTP6gug9wv5mFtx2tSU1YYZ1NrEc2chDdMPoJA8f8pu',
  };

  console.log('\n📋 Checking which accounts need to be created...\n');

  const accountsToCreate = [];

  for (const [symbol, mint] of Object.entries(tokens)) {
    try {
      const mintPubkey = new PublicKey(mint);
      
      // Check which token program this mint uses
      const mintInfo = await connection.getAccountInfo(mintPubkey);
      const tokenProgram = mintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) 
        ? TOKEN_2022_PROGRAM_ID 
        : TOKEN_PROGRAM_ID;
      
      const programName = tokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'SPL Token';
      
      const ata = await getAssociatedTokenAddress(
        mintPubkey, 
        walletPubkey,
        false, // allowOwnerOffCurve
        tokenProgram
      );

      console.log(`${symbol}:`);
      console.log(`  Program: ${programName}`);
      console.log(`  ATA: ${ata.toBase58()}`);

      // Check if account exists
      const accountInfo = await connection.getAccountInfo(ata);

      if (accountInfo) {
        console.log(`  ✅ Already exists\n`);
      } else {
        console.log(`  ⚠️  Needs to be created\n`);
        accountsToCreate.push({
          symbol,
          mint: mintPubkey,
          ata,
          tokenProgram
        });
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }

  if (accountsToCreate.length === 0) {
    console.log('✅ All token accounts already exist!\n');
    console.log('='.repeat(70));
    return;
  }

  console.log('='.repeat(70));
  console.log(`\n🔨 Creating ${accountsToCreate.length} token account(s)...\n`);

  // Create transaction with all account creation instructions
  const transaction = new Transaction();

  for (const { symbol, mint, ata, tokenProgram } of accountsToCreate) {
    console.log(`📝 Adding instruction for ${symbol}...`);
    const instruction = createAssociatedTokenAccountInstruction(
      walletPubkey,  // payer
      ata,           // associated token account
      walletPubkey,  // owner
      mint,          // mint
      tokenProgram   // token program ID
    );
    transaction.add(instruction);
  }

  try {
    console.log('\n📤 Sending transaction...');
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPubkey;

    // Sign transaction
    transaction.sign(keypair);

    // Send transaction
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    console.log(`\n📝 Transaction signature: ${signature}`);
    console.log(`🔗 View on Solscan: https://solscan.io/tx/${signature}`);
    console.log('\n⏳ Waiting for confirmation...');

    // Confirm transaction
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    }, 'confirmed');

    if (confirmation.value.err) {
      console.log('\n❌ Transaction failed!');
      console.log(`Error: ${JSON.stringify(confirmation.value.err)}\n`);
    } else {
      console.log('\n✅ SUCCESS! All token accounts created!\n');
      console.log('='.repeat(70));
      console.log('\n🎉 Your wallet is now ready to trade all tokens!');
      console.log('   You can now run the bot with: npm run multi\n');
      
      // Show created accounts
      console.log('📊 Created accounts:');
      for (const { symbol, ata } of accountsToCreate) {
        console.log(`   ${symbol}: ${ata.toBase58()}`);
      }
      console.log('');
    }

  } catch (error) {
    console.log('\n❌ Error creating token accounts:');
    console.log(`   ${error.message}\n`);
    
    if (error.logs) {
      console.log('Transaction logs:');
      error.logs.forEach(log => console.log(`   ${log}`));
    }
  }

  console.log('='.repeat(70));
}

createTokenAccounts().catch(console.error);
