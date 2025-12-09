import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkTransaction(signature: string) {
  const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
  
  console.log(`\n🔍 Checking transaction: ${signature}\n`);
  
  try {
    // Get transaction details
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed'
    });
    
    if (!tx) {
      console.log('❌ Transaction not found or not confirmed yet');
      return;
    }
    
    console.log(`📊 Transaction Details:\n`);
    console.log(`Slot: ${tx.slot}`);
    console.log(`Block Time: ${tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : 'N/A'}`);
    console.log(`Fee: ${tx.meta?.fee ? (tx.meta.fee / 1e9).toFixed(6) : 'N/A'} SOL`);
    
    // Check if transaction succeeded
    if (tx.meta?.err) {
      console.log(`\n❌ TRANSACTION FAILED!`);
      console.log(`Error: ${JSON.stringify(tx.meta.err, null, 2)}`);
    } else {
      console.log(`\n✅ Transaction succeeded on-chain`);
    }
    
    // Check logs for errors
    console.log(`\n📝 Program Logs:`);
    if (tx.meta?.logMessages) {
      const errorLogs = tx.meta.logMessages.filter(log => 
        log.toLowerCase().includes('error') || 
        log.toLowerCase().includes('failed') ||
        log.toLowerCase().includes('insufficient')
      );
      
      if (errorLogs.length > 0) {
        console.log(`\n⚠️  Error messages found:`);
        errorLogs.forEach(log => console.log(`   ${log}`));
      }
      
      console.log(`\nAll logs (last 20):`);
      tx.meta.logMessages.slice(-20).forEach(log => console.log(`   ${log}`));
    }
    
    // Check token balance changes
    console.log(`\n💰 Token Balance Changes:`);
    if (tx.meta?.preTokenBalances && tx.meta?.postTokenBalances) {
      const preBalances = new Map(tx.meta.preTokenBalances.map(b => [b.accountIndex, b]));
      const postBalances = new Map(tx.meta.postTokenBalances.map(b => [b.accountIndex, b]));
      
      postBalances.forEach((post, index) => {
        const pre = preBalances.get(index);
        if (pre) {
          const preAmount = parseFloat(pre.uiTokenAmount.uiAmountString || '0');
          const postAmount = parseFloat(post.uiTokenAmount.uiAmountString || '0');
          const change = postAmount - preAmount;
          
          if (change !== 0) {
            console.log(`   Account ${index}:`);
            console.log(`      Mint: ${post.mint}`);
            console.log(`      Before: ${preAmount}`);
            console.log(`      After: ${postAmount}`);
            console.log(`      Change: ${change > 0 ? '+' : ''}${change}`);
          }
        }
      });
    }
    
    // Check SOL balance changes
    console.log(`\n💵 SOL Balance Changes:`);
    if (tx.meta?.preBalances && tx.meta?.postBalances) {
      tx.meta.preBalances.forEach((pre, index) => {
        const post = tx.meta!.postBalances[index];
        const change = (post - pre) / 1e9;
        if (change !== 0) {
          console.log(`   Account ${index}: ${change > 0 ? '+' : ''}${change.toFixed(6)} SOL`);
        }
      });
    }
    
  } catch (error: any) {
    console.error(`❌ Error checking transaction: ${error.message}`);
  }
}

// Get signature from command line or use default
const signature = process.argv[2] || '67B8Qn6exPMAnYLhhxDmdjWAUhZARGJLWocv6XRtqkfWHN23GxSx4n9ZLA9nwzb4nWYNNz8pWELynbjSy3F2WSjm';

checkTransaction(signature).catch(console.error);
