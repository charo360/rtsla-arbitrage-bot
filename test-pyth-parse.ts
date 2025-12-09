import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

async function testPythParse() {
  const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
  
  // TSLA external oracle account (Pyth)
  const pythAccount = new PublicKey('E8WFH8brgP58arcuW2wwsPHiomYrSvrgWTsRLZLAEZUQ');
  
  console.log('\n🔍 Fetching Pyth account data...\n');
  
  const accountInfo = await connection.getAccountInfo(pythAccount);
  
  if (!accountInfo) {
    console.log('Account not found!');
    return;
  }
  
  console.log('Account size:', accountInfo.data.length, 'bytes');
  console.log('Owner:', accountInfo.owner.toString());
  console.log('\nFirst 134 bytes (hex):');
  console.log(accountInfo.data.toString('hex'));
  
  // Skip Pyth SDK for now, do manual parsing
  
  // Manual parsing
  console.log('\n📊 Manual parsing attempt...\n');
  
  // Check the magic number at the start
  const magic = accountInfo.data.readUInt32LE(0);
  console.log('Magic number:', '0x' + magic.toString(16));
  
  // Try different offsets for price data
  console.log('\nTrying to find price data:');
  for (let i = 0; i < Math.min(100, accountInfo.data.length - 16); i += 4) {
    const val = accountInfo.data.readInt32LE(i);
    // Look for values that might be an exponent (typically -8 to -6 for USD prices)
    if (val >= -10 && val <= -5) {
      console.log(`\nPotential exponent at offset ${i}: ${val}`);
      // Check if there's a reasonable price before it
      if (i >= 8) {
        const price = accountInfo.data.readBigInt64LE(i - 8);
        const actualPrice = Number(price) * Math.pow(10, val);
        console.log(`  Price at offset ${i-8}: ${price}`);
        console.log(`  Calculated price: $${actualPrice.toFixed(2)}`);
      }
    }
  }
}

testPythParse().catch(console.error);
