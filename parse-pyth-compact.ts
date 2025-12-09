import { Connection, PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { OraclePrice } from 'flash-sdk';
import dotenv from 'dotenv';

dotenv.config();

async function parsePythCompact() {
  const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
  
  // TSLA external oracle account (Pyth)
  const pythAccount = new PublicKey('E8WFH8brgP58arcuW2wwsPHiomYrSvrgWTsRLZLAEZUQ');
  
  console.log('\n🔍 Parsing Pyth Compact Format...\n');
  
  const accountInfo = await connection.getAccountInfo(pythAccount);
  
  if (!accountInfo) {
    console.log('Account not found!');
    return;
  }
  
  console.log('Account size:', accountInfo.data.length, 'bytes');
  console.log('Hex:', accountInfo.data.toString('hex'));
  
  // Pyth compact format structure (based on reverse engineering):
  // Offset 0-3: Magic (0x6323f122)
  // Offset 4-35: Some header data
  // Let me try to find the price by looking at the pattern
  
  console.log('\n📊 Decoding structure:\n');
  
  // Try reading at different offsets
  const offsets = [72, 76, 80, 84, 88, 92, 96, 100];
  
  for (const offset of offsets) {
    if (offset + 12 <= accountInfo.data.length) {
      try {
        const price = accountInfo.data.readBigInt64LE(offset);
        const expo = accountInfo.data.readInt32LE(offset + 8);
        const conf = accountInfo.data.readBigUInt64LE(offset + 12);
        
        const actualPrice = Number(price) * Math.pow(10, expo);
        
        console.log(`Offset ${offset}:`);
        console.log(`  Price (raw): ${price}`);
        console.log(`  Exponent: ${expo}`);
        console.log(`  Confidence: ${conf}`);
        console.log(`  Calculated: $${actualPrice.toFixed(2)}`);
        
        // Check if this looks like a reasonable TSLA price ($300-500)
        if (actualPrice > 300 && actualPrice < 600) {
          console.log(`  ✅ THIS LOOKS CORRECT!`);
          
          // Create OraclePrice object
          const oraclePrice = new OraclePrice({
            price: new BN(price.toString()),
            exponent: new BN(expo),
            confidence: new BN(conf.toString()),
            timestamp: new BN(Date.now() / 1000)
          });
          
          console.log(`\n💰 Final Price: $${oraclePrice.toUiPrice(2)}`);
        }
        console.log();
      } catch (e) {
        // Skip
      }
    }
  }
}

parsePythCompact().catch(console.error);
