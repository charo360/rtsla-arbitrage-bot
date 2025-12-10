const axios = require('axios');

async function testYahoo() {
  try {
    console.log('Testing Yahoo Finance API for TSLA...\n');
    
    const response = await axios.get(
      'https://query1.finance.yahoo.com/v8/finance/chart/TSLA',
      { timeout: 5000 }
    );

    const result = response.data?.chart?.result?.[0];
    if (!result) {
      console.log('❌ No result from Yahoo');
      return;
    }

    const meta = result.meta;
    console.log('Market State:', meta.marketState);
    console.log('Regular Market Price:', meta.regularMarketPrice);
    console.log('Previous Close:', meta.previousClose);
    console.log('Regular Market Time:', new Date(meta.regularMarketTime * 1000).toLocaleString());
    
    if (!meta.regularMarketPrice) {
      console.log('\n⚠️ Market is CLOSED - no current price available');
      console.log('💡 Use previousClose for after-hours trading');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testYahoo();
