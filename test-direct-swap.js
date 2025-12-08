// Test direct swap using Jupiter API exactly like the UI does
const { Connection, Keypair, VersionedTransaction, PublicKey } = require('@solana/web3.js');
const { createJupiterApiClient } = require('@jup-ag/api');
const bs58 = require('bs58');
require('dotenv').config();

async function testDirectSwap() {
  console.log('🧪 Testing Direct Jupiter Swap\n');
  console.log('='.repeat(70));

  // Setup
  const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
  const jupiterApi = createJupiterApiClient();
  
  // Load wallet
  const walletKey = process.env.WALLET_1;
  if (!walletKey) {
    console.log('❌ No WALLET_1 found in .env');
    return;
  }
  
  const keypair = Keypair.fromSecretKey(bs58.decode(walletKey));
  console.log(`\n💼 Wallet: ${keypair.publicKey.toBase58()}\n`);

  // Token addresses
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const TSLAR_MINT = 'FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe';

  try {
    // Step 1: Get Quote
    console.log('📊 Step 1: Getting quote...');
    const quote = await jupiterApi.quoteGet({
      inputMint: USDC_MINT,
      outputMint: TSLAR_MINT,
      amount: 1000000, // 1 USDC
      slippageBps: 100, // 1%
    });

    if (!quote) {
      console.log('❌ No quote received');
      return;
    }

    console.log(`✅ Quote received:`);
    console.log(`   Input: ${parseInt(quote.inAmount) / 1_000_000} USDC`);
    console.log(`   Output: ${parseInt(quote.outAmount) / 1_000_000_000} TSLAr`);
    console.log(`   Price Impact: ${quote.priceImpactPct}%`);
    console.log(`   Routes: ${quote.routePlan?.length || 0}`);

    // Step 2: Get Swap Transaction (try different configurations)
    console.log('\n🔄 Step 2: Getting swap transaction...\n');

    const configs = [
      {
        name: 'Config 1: Basic',
        request: {
          quoteResponse: quote,
          userPublicKey: keypair.publicKey.toBase58(),
        }
      },
      {
        name: 'Config 2: With wrapSol',
        request: {
          quoteResponse: quote,
          userPublicKey: keypair.publicKey.toBase58(),
          wrapAndUnwrapSol: true,
        }
      },
      {
        name: 'Config 3: With compute units',
        request: {
          quoteResponse: quote,
          userPublicKey: keypair.publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
        }
      },
      {
        name: 'Config 4: Legacy transaction',
        request: {
          quoteResponse: quote,
          userPublicKey: keypair.publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          asLegacyTransaction: true,
        }
      },
      {
        name: 'Config 5: With priority fee',
        request: {
          quoteResponse: quote,
          userPublicKey: keypair.publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          computeUnitPriceMicroLamports: 100000,
        }
      },
    ];

    for (const config of configs) {
      try {
        console.log(`\n🧪 Testing: ${config.name}`);
        console.log(`   Request: ${JSON.stringify(Object.keys(config.request))}`);
        
        const swapResponse = await jupiterApi.swapPost({
          swapRequest: config.request
        });

        if (swapResponse && swapResponse.swapTransaction) {
          console.log(`   ✅ SUCCESS! Got swap transaction`);
          console.log(`   Transaction length: ${swapResponse.swapTransaction.length} bytes`);
          
          // Try to deserialize and sign
          try {
            const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
            const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
            transaction.sign([keypair]);
            console.log(`   ✅ Transaction signed successfully`);
            console.log(`\n🎉 THIS CONFIG WORKS! Use this in the bot.\n`);
            return; // Exit on first success
          } catch (signError) {
            console.log(`   ⚠️  Transaction received but signing failed: ${signError.message}`);
          }
        } else {
          console.log(`   ❌ No swap transaction in response`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        if (error.response) {
          console.log(`   Status: ${error.response.status}`);
          console.log(`   Data: ${JSON.stringify(error.response.data)}`);
        }
      }
    }

    console.log('\n❌ All configurations failed');

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    console.error(error);
  }

  console.log('\n' + '='.repeat(70));
}

testDirectSwap().catch(console.error);
