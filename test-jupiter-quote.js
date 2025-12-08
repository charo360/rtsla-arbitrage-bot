// Quick test to check Jupiter quote for TSLAr
const { createJupiterApiClient } = require('@jup-ag/api');
const { Connection, PublicKey } = require('@solana/web3.js');

async function testQuote() {
  const jupiterApi = createJupiterApiClient();
  
  const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const TSLAr = 'FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe';
  
  console.log('Testing Jupiter quote for TSLAr...\n');
  
  try {
    const quote = await jupiterApi.quoteGet({
      inputMint: USDC,
      outputMint: TSLAr,
      amount: 100_000_000, // 100 USDC (6 decimals)
      slippageBps: 50,
    });
    
    console.log('Quote received:');
    console.log('Input (USDC):', quote.inAmount);
    console.log('Output (TSLAr):', quote.outAmount);
    console.log('Price Impact:', quote.priceImpactPct);
    console.log('\nRoute Plan:', JSON.stringify(quote.routePlan, null, 2));
    
    // Try to calculate price
    const usdcIn = parseInt(quote.inAmount) / 1_000_000;
    const tokensOut = parseInt(quote.outAmount) / 1_000_000;
    console.log(`\nWith 6 decimals: ${usdcIn} USDC → ${tokensOut} tokens = $${(usdcIn/tokensOut).toFixed(2)} per token`);
    
    // Try with 9 decimals
    const tokensOut9 = parseInt(quote.outAmount) / 1_000_000_000;
    console.log(`With 9 decimals: ${usdcIn} USDC → ${tokensOut9} tokens = $${(usdcIn/tokensOut9).toFixed(2)} per token`);
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testQuote();
