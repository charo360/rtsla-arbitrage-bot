// Inspect the Jupiter Route Plan to identify underlying DEXes
const { createJupiterApiClient } = require('@jup-ag/api');
require('dotenv').config();

async function inspectRoute() {
  console.log('🔍 Inspecting Jupiter Route Plan for TSLAr\n');
  console.log('='.repeat(70));

  const jupiterApi = createJupiterApiClient();
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const TSLAR_MINT = 'FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe';

  try {
    console.log('📊 Getting quote...');
    const quote = await jupiterApi.quoteGet({
      inputMint: USDC_MINT,
      outputMint: TSLAR_MINT,
      amount: 1000000, // 1 USDC
      slippageBps: 100, // 1%
      onlyDirectRoutes: false,
      asLegacyTransaction: false,
    });

    if (!quote) {
      console.log('❌ No quote received');
      return;
    }

    console.log(`\n✅ Quote received:`);
    console.log(`   In: ${parseInt(quote.inAmount) / 1_000_000} USDC`);
    console.log(`   Out: ${parseInt(quote.outAmount) / 1_000_000_000} TSLAr`);
    console.log(`   Routes: ${quote.routePlan?.length || 0}`);
    
    console.log('\n🛣️  Route Details:');
    quote.routePlan.forEach((step, index) => {
      console.log(`\n   Step ${index + 1}:`);
      console.log(`     DEX: ${step.swapInfo.label}`);
      console.log(`     AMM Key: ${step.swapInfo.ammKey}`);
      console.log(`     Input: ${step.swapInfo.inputMint}`);
      console.log(`     Output: ${step.swapInfo.outputMint}`);
      console.log(`     Fee: ${step.swapInfo.feeAmount}`);
      console.log(`     Fee Mint: ${step.swapInfo.feeMint}`);
    });

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  }

  console.log('\n' + '='.repeat(70));
}

inspectRoute().catch(console.error);
