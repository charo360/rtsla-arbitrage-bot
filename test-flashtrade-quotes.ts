/**
 * Test Flash Trade Quote System
 * Compare Flash Trade (oracle) vs Jupiter (DEX) quotes
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { FlashTradeClient } from './src/utils/flashtrade-client';
import { JupiterClient } from './src/utils/jupiter-client';

const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=e0a1eba8-99fc-4a5f-b818-554b81603986');

// Token mints
const TOKENS = {
  'MSTRr': new PublicKey('B8GKqTDGYc7F6udTHjYeazZ4dFCRkrwK2mBQNS4igqTv'),
  'TSLAr': new PublicKey('FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe'),
  'NVDAr': new PublicKey('ALTP6gug9wv5mFtx2tSU1YYZ1NrEc2chDdMPoJA8f8pu'),
  'SPYr': new PublicKey('AVw2QGVkXJPRPRjLAceXVoLqU5DVtJ53mdgMXp14yGit'),
};

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

async function testQuoteComparison() {
  console.log('🚀 Testing Flash Trade vs Jupiter Quote Comparison\n');
  console.log('='.repeat(80));

  const flashTradeClient = new FlashTradeClient({ connection });
  const jupiterClient = new JupiterClient(connection);

  const tradeAmountUsdc = 100; // $100 test trade

  for (const [symbol, mint] of Object.entries(TOKENS)) {
    console.log(`\n📊 Testing ${symbol}`);
    console.log('-'.repeat(80));

    try {
      // Get Jupiter quote (DEX price)
      console.log('\n🔵 Jupiter (DEX) Quote:');
      const jupiterQuote = await jupiterClient.getQuote(
        mint,
        tradeAmountUsdc
      );

      if (!jupiterQuote) {
        console.log('❌ Failed to get Jupiter quote');
        continue;
      }

      const jupiterTokens = parseFloat(jupiterQuote.outAmount) / 1_000_000_000;
      const jupiterPrice = tradeAmountUsdc / jupiterTokens;

      console.log(`   Input: $${tradeAmountUsdc} USDC`);
      console.log(`   Output: ${jupiterTokens.toFixed(6)} tokens`);
      console.log(`   Price: $${jupiterPrice.toFixed(2)} per token`);
      console.log(`   Price Impact: ${jupiterQuote.priceImpactPct}%`);

      // Get Flash Trade quote (Oracle price)
      console.log('\n🟢 Flash Trade (Oracle) Quote:');
      const tokenAmountLamports = Math.floor(jupiterTokens * 1_000_000_000);
      const flashQuote = await flashTradeClient.getSpotSwapQuote(
        mint,
        tokenAmountLamports,
        symbol
      );

      if (!flashQuote) {
        console.log('❌ Failed to get Flash Trade quote');
        continue;
      }

      const flashUsdcOut = flashQuote.outputAmount / 1_000_000;

      // Calculate arbitrage profit
      const grossProfit = flashUsdcOut - tradeAmountUsdc;
      const jupiterFee = tradeAmountUsdc * 0.003; // 0.3%
      const flashTradeFee = flashQuote.fee;
      const totalFees = jupiterFee + flashTradeFee;
      const netProfit = grossProfit - totalFees;
      const profitPercent = (netProfit / tradeAmountUsdc) * 100;

      // Comparison
      console.log('\n💰 Arbitrage Analysis:');
      console.log(`   Buy on Jupiter:  $${tradeAmountUsdc.toFixed(2)} → ${jupiterTokens.toFixed(6)} tokens at $${jupiterPrice.toFixed(2)}`);
      console.log(`   Sell on Flash:   ${jupiterTokens.toFixed(6)} tokens → $${flashUsdcOut.toFixed(2)} at $${flashQuote.oraclePrice.toFixed(2)}`);
      console.log(`   Gross Profit:    $${grossProfit.toFixed(2)}`);
      console.log(`   Jupiter Fee:     $${jupiterFee.toFixed(2)} (0.3%)`);
      console.log(`   Flash Fee:       $${flashTradeFee.toFixed(2)} (0.1%)`);
      console.log(`   Total Fees:      $${totalFees.toFixed(2)}`);
      console.log(`   Net Profit:      $${netProfit.toFixed(2)} (${profitPercent.toFixed(2)}%)`);

      if (netProfit > 0) {
        console.log(`   ✅ PROFITABLE! +$${netProfit.toFixed(2)}`);
      } else if (netProfit > -0.10) {
        console.log(`   ⚠️  Small loss (likely fees)`);
      } else {
        console.log(`   ❌ LOSS - price moved against us`);
      }

      // Price difference
      const priceDiff = flashQuote.oraclePrice - jupiterPrice;
      const priceDiffPercent = (priceDiff / jupiterPrice) * 100;
      console.log(`\n📈 Price Difference:`);
      console.log(`   Oracle - DEX: $${priceDiff.toFixed(2)} (${priceDiffPercent.toFixed(2)}%)`);
      
      if (priceDiffPercent > 0.5) {
        console.log(`   🎯 Good arbitrage opportunity!`);
      } else if (priceDiffPercent > 0) {
        console.log(`   ⚠️  Small spread - may not cover fees`);
      } else {
        console.log(`   ❌ Negative spread - no opportunity`);
      }

    } catch (error: any) {
      console.error(`❌ Error testing ${symbol}: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Quote comparison complete');
}

// Run the test
testQuoteComparison()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
