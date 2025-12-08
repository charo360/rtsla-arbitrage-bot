// Test Jupiter API with raw HTTP to see actual error messages
const axios = require('axios');
require('dotenv').config();

async function testRawJupiter() {
  console.log('🔍 Testing Raw Jupiter API Calls\n');
  console.log('='.repeat(70));

  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const TSLAR_MINT = 'FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe';
  const WALLET_ADDRESS = 'GhyyPVNs2SfRybTWvvXB4HWttzp9RNNeXr5D8oQGhYdz';

  try {
    // Step 1: Get Quote
    console.log('\n📊 Step 1: Getting quote via raw HTTP...');
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${USDC_MINT}&outputMint=${TSLAR_MINT}&amount=1000000&slippageBps=100`;
    
    const quoteResponse = await axios.get(quoteUrl);
    const quote = quoteResponse.data;

    console.log(`✅ Quote received:`);
    console.log(`   Input: ${parseInt(quote.inAmount) / 1_000_000} USDC`);
    console.log(`   Output: ${parseInt(quote.outAmount) / 1_000_000_000} TSLAr`);
    console.log(`   Routes: ${quote.routePlan?.length || 0}`);

    // Step 2: Get Swap Transaction
    console.log('\n🔄 Step 2: Getting swap transaction via raw HTTP...');
    
    const swapPayload = {
      quoteResponse: quote,
      userPublicKey: WALLET_ADDRESS,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
    };

    console.log(`\n📤 Sending swap request...`);
    console.log(`   URL: https://quote-api.jup.ag/v6/swap`);
    console.log(`   Payload keys: ${Object.keys(swapPayload)}`);

    try {
      const swapResponse = await axios.post('https://quote-api.jup.ag/v6/swap', swapPayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`\n✅ Swap transaction received!`);
      console.log(`   Response keys: ${Object.keys(swapResponse.data)}`);
      
      if (swapResponse.data.swapTransaction) {
        console.log(`   ✅ swapTransaction present (${swapResponse.data.swapTransaction.length} chars)`);
      }
      
    } catch (swapError) {
      console.log(`\n❌ Swap request failed:`);
      console.log(`   Status: ${swapError.response?.status}`);
      console.log(`   Status Text: ${swapError.response?.statusText}`);
      console.log(`   Error Data: ${JSON.stringify(swapError.response?.data, null, 2)}`);
      console.log(`   Error Message: ${swapError.message}`);
      
      // Try to get more details
      if (swapError.response?.data) {
        console.log(`\n📋 Full Error Response:`);
        console.log(JSON.stringify(swapError.response.data, null, 2));
      }
    }

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }

  console.log('\n' + '='.repeat(70));
}

testRawJupiter().catch(console.error);
