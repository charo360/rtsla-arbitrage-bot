const hex = "22f123639d7ef4cdc314108084f329a43bff2636fbc8c24e9d8ad19f3d65e3eda93106c360edcaad0116dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1acfea60200000000fd6c000000000000fbffffff554138690000000055413869000000004880a4020000000057810000000000004028fb160000000000";

const buffer = Buffer.from(hex, 'hex');

console.log('\nSearching for TSLA price ($300-600) in all possible combinations...\n');
console.log('Total bytes:', buffer.length);

// Try all possible combinations of price (int64) and exponent (int32)
for (let priceOffset = 0; priceOffset < buffer.length - 8; priceOffset++) {
  const price = buffer.readBigInt64LE(priceOffset);
  
  // Try exponents from -10 to -4
  for (let expo = -10; expo <= -4; expo++) {
    const actualPrice = Number(price) * Math.pow(10, expo);
    
    // Check if it's in TSLA range ($300-600)
    if (actualPrice > 300 && actualPrice < 600) {
      console.log(`\n✅ FOUND POTENTIAL MATCH!`);
      console.log(`  Price offset: ${priceOffset}`);
      console.log(`  Price (raw): ${price}`);
      console.log(`  Exponent: ${expo}`);
      console.log(`  Calculated: $${actualPrice.toFixed(2)}`);
      
      // Check if there's an exponent field nearby
      for (let expoOffset = priceOffset + 8; expoOffset < Math.min(priceOffset + 20, buffer.length - 4); expoOffset++) {
        const foundExpo = buffer.readInt32LE(expoOffset);
        if (foundExpo === expo) {
          console.log(`  🎯 EXPONENT FOUND at offset ${expoOffset}!`);
        }
      }
    }
  }
}
