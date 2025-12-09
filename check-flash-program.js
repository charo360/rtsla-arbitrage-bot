// Check if Flash.trade program holds TSLAr liquidity
const { Connection, PublicKey } = require('@solana/web3.js');
require('dotenv').config();

async function checkFlashProgram() {
  console.log('🔍 Checking Flash.trade Program for TSLAr\n');
  console.log('='.repeat(70));

  const connection = new Connection(process.env.SOLANA_RPC_URL);
  const FLASH_PROGRAM = new PublicKey('FLASH6Lo6h3iasJKWDs2F8TkW2UKf3s15C8PMGuVfgBn');
  const TSLAR_MINT = new PublicKey('FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe');

  console.log('Flash.trade Program:', FLASH_PROGRAM.toBase58());
  console.log('TSLAr Mint:', TSLAR_MINT.toBase58());
  console.log('');

  try {
    // Check if Flash.trade program has TSLAr token accounts
    const tokenAccounts = await connection.getTokenAccountsByOwner(
      FLASH_PROGRAM,
      { mint: TSLAR_MINT }
    );

    if (tokenAccounts.value.length > 0) {
      console.log(`✅ FOUND ${tokenAccounts.value.length} TSLAr account(s) in Flash.trade!`);
      console.log('');
      
      for (let i = 0; i < tokenAccounts.value.length; i++) {
        const account = tokenAccounts.value[i];
        const accountInfo = account.account.data;
        
        console.log(`Account ${i + 1}:`);
        console.log(`  Address: ${account.pubkey.toBase58()}`);
        console.log(`  Data length: ${accountInfo.length} bytes`);
        
        // Try to parse token amount (if it's a standard token account)
        if (accountInfo.length >= 165) {
          try {
            // Token account data structure: amount is at offset 64 (8 bytes, little-endian)
            const amountBuffer = accountInfo.slice(64, 72);
            const amount = amountBuffer.readBigUInt64LE(0);
            const uiAmount = Number(amount) / 1_000_000_000; // 9 decimals
            console.log(`  Balance: ${uiAmount.toFixed(6)} TSLAr`);
          } catch (e) {
            console.log(`  Balance: Unable to parse`);
          }
        }
        console.log('');
      }
      
      console.log('💡 This means Flash.trade DOES hold TSLAr liquidity!');
      console.log('   We might be able to trade directly with Flash.trade program.\n');
      
    } else {
      console.log('❌ No TSLAr accounts found in Flash.trade program');
      console.log('');
      console.log('💡 This means:');
      console.log('   1. Flash.trade uses oracle pricing (no liquidity pool)');
      console.log('   2. OR liquidity is in a different account structure\n');
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  console.log('='.repeat(70));
  console.log('\n📝 Summary:');
  console.log('   - Flash.trade is oracle-based (uses Pyth for pricing)');
  console.log('   - You BUY/SELL at oracle price on Flash.trade');
  console.log('   - The arbitrage is: Buy on DEX (market) → Sell on Flash.trade (oracle)');
  console.log('   - Problem: Jupiter API blocks Token-2022 swaps on DEX side\n');
}

checkFlashProgram().catch(console.error);
