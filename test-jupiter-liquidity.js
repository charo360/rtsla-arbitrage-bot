// Test which tokens have actual liquidity on Jupiter
const { createJupiterApiClient } = require('@jup-ag/api');
const { PublicKey } = require('@solana/web3.js');

async function testLiquidity() {
  console.log('🔍 Testing Token Liquidity on Jupiter\n');
  console.log('='.repeat(70));

  const jupiterApi = createJupiterApiClient();
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

  const tokens = {
    'TSLAr': 'FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe',
    'CRCLr': '5fKr9joRHpioriGmMgRVFdmZge8EVUTbrWyxDVdSrcuG',
    'SPYr': 'AVw2QGVkXJPRPRjLAceXVoLqU5DVtJ53mdgMXp14yGit',
    'MSTRr': 'B8GKqTDGYc7F6udTHjYeazZ4dFCRkrwK2mBQNS4igqTv',
    'NVDAr': 'ALTP6gug9wv5mFtx2tSU1YYZ1NrEc2chDdMPoJA8f8pu',
  };

  for (const [symbol, mint] of Object.entries(tokens)) {
    try {
      console.log(`\n📊 Testing ${symbol}...`);
      
      // Try to get a quote
      const quote = await jupiterApi.quoteGet({
        inputMint: USDC_MINT,
        outputMint: mint,
        amount: 10000000, // 10 USDC
        slippageBps: 100, // 1%
      });

      if (quote) {
        const usdcAmount = 10;
        const tokensOut = parseInt(quote.outAmount) / 1_000_000_000; // 9 decimals
        const pricePerToken = usdcAmount / tokensOut;
        
        console.log(`   ✅ HAS LIQUIDITY`);
        console.log(`   Price: $${pricePerToken.toFixed(2)} per token`);
        console.log(`   Output: ${tokensOut.toFixed(6)} tokens`);
        console.log(`   Routes: ${quote.routePlan?.length || 0}`);
        
        // Try to get swap transaction
        try {
          const swapResponse = await jupiterApi.swapPost({
            swapRequest: {
              quoteResponse: quote,
              userPublicKey: 'GhyyPVNs2SfRybTWvvXB4HWttzp9RNNeXr5D8oQGhYdz',
              dynamicComputeUnitLimit: true,
            },
          });
          
          if (swapResponse && swapResponse.swapTransaction) {
            console.log(`   ✅ SWAP TRANSACTION WORKS`);
          } else {
            console.log(`   ⚠️  Swap transaction failed`);
          }
        } catch (swapError) {
          console.log(`   ❌ Swap transaction error: ${swapError.message}`);
        }
      } else {
        console.log(`   ❌ NO LIQUIDITY - No quote available`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Liquidity test complete!\n');
}

testLiquidity().catch(console.error);
