"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = require("../config/config");
const dataFile = path.join(config_1.config.dataDir, 'opportunities.json');
function analyzeOpportunities() {
    console.log('\n' + '='.repeat(70));
    console.log('  📊 OPPORTUNITY ANALYSIS');
    console.log('='.repeat(70) + '\n');
    // Check if data file exists
    if (!fs.existsSync(dataFile)) {
        console.log('❌ No opportunity data found.');
        console.log('   Run the monitoring bot first: npm run monitor\n');
        return;
    }
    // Read opportunities
    const opportunities = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    if (opportunities.length === 0) {
        console.log('❌ No opportunities recorded yet.');
        console.log('   Keep the monitoring bot running to collect data.\n');
        return;
    }
    // Calculate statistics
    const totalOpps = opportunities.length;
    const avgSpread = opportunities.reduce((sum, opp) => sum + opp.spreadPercent, 0) / totalOpps;
    const maxSpread = Math.max(...opportunities.map(opp => opp.spreadPercent));
    const minSpread = Math.min(...opportunities.map(opp => opp.spreadPercent));
    const totalProfit = opportunities.reduce((sum, opp) => sum + opp.estimatedProfit, 0);
    const avgProfit = totalProfit / totalOpps;
    // Time analysis
    const firstTime = opportunities[0].timestamp;
    const lastTime = opportunities[opportunities.length - 1].timestamp;
    const totalHours = (lastTime - firstTime) / (1000 * 60 * 60);
    const oppsPerHour = totalOpps / totalHours;
    const oppsPerDay = oppsPerHour * 24;
    // Direction analysis
    const buyRemora = opportunities.filter(o => o.direction === 'BUY_REMORA').length;
    const sellRemora = opportunities.filter(o => o.direction === 'SELL_REMORA').length;
    // Profit brackets
    const under50c = opportunities.filter(o => o.estimatedProfit < 0.5).length;
    const between50cAnd1 = opportunities.filter(o => o.estimatedProfit >= 0.5 && o.estimatedProfit < 1).length;
    const between1And2 = opportunities.filter(o => o.estimatedProfit >= 1 && o.estimatedProfit < 2).length;
    const over2 = opportunities.filter(o => o.estimatedProfit >= 2).length;
    // Display results
    console.log('📈 BASIC STATISTICS');
    console.log('-'.repeat(70));
    console.log(`Total Opportunities Found:     ${totalOpps}`);
    console.log(`Time Period:                   ${totalHours.toFixed(1)} hours`);
    console.log(`First Detected:                ${new Date(firstTime).toLocaleString()}`);
    console.log(`Last Detected:                 ${new Date(lastTime).toLocaleString()}`);
    console.log();
    console.log('⏱️  FREQUENCY ANALYSIS');
    console.log('-'.repeat(70));
    console.log(`Opportunities per Hour:        ${oppsPerHour.toFixed(1)}`);
    console.log(`Opportunities per Day (est):   ${oppsPerDay.toFixed(1)}`);
    console.log(`Average Time Between:          ${(60 / oppsPerHour).toFixed(1)} minutes`);
    console.log();
    console.log('📊 SPREAD STATISTICS');
    console.log('-'.repeat(70));
    console.log(`Average Spread:                ${avgSpread.toFixed(2)}%`);
    console.log(`Maximum Spread:                ${maxSpread.toFixed(2)}%`);
    console.log(`Minimum Spread:                ${minSpread.toFixed(2)}%`);
    console.log();
    console.log('🎯 DIRECTION BREAKDOWN');
    console.log('-'.repeat(70));
    console.log(`Buy on Remora:                 ${buyRemora} (${(buyRemora / totalOpps * 100).toFixed(1)}%)`);
    console.log(`Sell on Remora:                ${sellRemora} (${(sellRemora / totalOpps * 100).toFixed(1)}%)`);
    console.log();
    console.log('💰 PROFIT ANALYSIS');
    console.log('-'.repeat(70));
    console.log(`Average Profit per Trade:      $${avgProfit.toFixed(2)}`);
    console.log(`Total Potential Profit:        $${totalProfit.toFixed(2)}`);
    console.log();
    console.log(`Profit Distribution:`);
    console.log(`  Under $0.50:                 ${under50c} (${(under50c / totalOpps * 100).toFixed(1)}%)`);
    console.log(`  $0.50 - $1.00:               ${between50cAnd1} (${(between50cAnd1 / totalOpps * 100).toFixed(1)}%)`);
    console.log(`  $1.00 - $2.00:               ${between1And2} (${(between1And2 / totalOpps * 100).toFixed(1)}%)`);
    console.log(`  Over $2.00:                  ${over2} (${(over2 / totalOpps * 100).toFixed(1)}%)`);
    console.log();
    console.log('💵 REVENUE PROJECTIONS');
    console.log('-'.repeat(70));
    console.log(`Daily (if all executed):       $${(totalProfit / totalHours * 24).toFixed(2)}`);
    console.log(`Weekly (if all executed):      $${(totalProfit / totalHours * 24 * 7).toFixed(2)}`);
    console.log(`Monthly (if all executed):     $${(totalProfit / totalHours * 24 * 30).toFixed(2)}`);
    console.log();
    console.log('⚙️  CONFIGURATION USED');
    console.log('-'.repeat(70));
    console.log(`Min Spread Threshold:          ${config_1.config.minSpreadPercent}%`);
    console.log(`Trade Amount:                  $${config_1.config.tradeAmountUsdc} USDC`);
    console.log(`Poll Interval:                 ${config_1.config.pollIntervalMs / 1000}s`);
    console.log();
    console.log('✅ RECOMMENDATIONS');
    console.log('-'.repeat(70));
    if (oppsPerDay < 5) {
        console.log('⚠️  Low opportunity frequency detected');
        console.log('   Consider: Lowering MIN_SPREAD_PERCENT to 0.6%');
    }
    else if (oppsPerDay > 30) {
        console.log('✅ High opportunity frequency - excellent!');
        console.log('   Current settings are optimal');
    }
    else {
        console.log('✅ Moderate opportunity frequency');
        console.log('   Settings look good for profitable trading');
    }
    if (avgProfit < 0.5) {
        console.log('⚠️  Average profit is low');
        console.log('   Consider: Increasing TRADE_AMOUNT_USDC');
    }
    else if (avgProfit > 2) {
        console.log('✅ Excellent profit per trade!');
        console.log('   Ready to scale up trade amounts');
    }
    if (totalHours < 2) {
        console.log('⏱️  Limited data collected');
        console.log('   Recommendation: Run bot for at least 4-6 hours for better analysis');
    }
    console.log();
    console.log('='.repeat(70));
    console.log('  Analysis complete!');
    console.log('  Data saved in: ' + dataFile);
    console.log('='.repeat(70) + '\n');
}
// Run analysis
analyzeOpportunities();
//# sourceMappingURL=analyze-opportunities.js.map