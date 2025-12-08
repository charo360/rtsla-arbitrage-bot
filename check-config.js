// Check current bot configuration
require('dotenv').config();

console.log('\n🔧 Current Bot Configuration\n');
console.log('='.repeat(70));

console.log('\n💰 Trading Settings:');
console.log(`   Trade Amount: $${process.env.TRADE_AMOUNT_USDC} USDC`);
console.log(`   Auto Execute: ${process.env.AUTO_EXECUTE}`);
console.log(`   Min Spread: ${process.env.MIN_SPREAD_PERCENT}%`);
console.log(`   Min Profit: $${process.env.MIN_PROFIT_THRESHOLD}`);
console.log(`   Max Slippage: ${process.env.MAX_SLIPPAGE_PERCENT}%`);

console.log('\n📊 With $10 trades:');
const tradeAmount = parseFloat(process.env.TRADE_AMOUNT_USDC || '10');
const minSpread = parseFloat(process.env.MIN_SPREAD_PERCENT || '0.3');

// TSLAr current opportunity: 0.66% spread
const currentSpread = 0.66;
const profitPerTrade = (tradeAmount * currentSpread / 100).toFixed(2);

console.log(`   Current TSLAr spread: ${currentSpread}%`);
console.log(`   Profit per trade: $${profitPerTrade}`);
console.log(`   Max trades with $112.49: ${Math.floor(112.49 / tradeAmount)} trades`);
console.log(`   Estimated daily profit: $${(parseFloat(profitPerTrade) * 10).toFixed(2)} (10 trades)`);

console.log('\n🎯 Trading Status:');
if (process.env.AUTO_EXECUTE === 'true') {
  console.log('   ✅ AUTO-EXECUTE ENABLED');
  console.log('   🤖 Bot will automatically execute trades!');
  console.log('   ⚠️  Make sure you are ready for live trading');
} else {
  console.log('   ⚠️  AUTO-EXECUTE DISABLED');
  console.log('   Bot is in monitoring mode only');
  console.log('   Set AUTO_EXECUTE=true to enable trading');
}

console.log('\n' + '='.repeat(70));
console.log('\n✅ Configuration loaded successfully!\n');
