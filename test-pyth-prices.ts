/**
 * Test Pyth Price Feeds
 * Verifies all price feeds are working correctly
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { PYTH_CONFIG, getFeedId } from './src/config/pyth-config';
import axios from 'axios';

const connection = new Connection('https://api.mainnet-beta.solana.com');

interface PythPrice {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
  ema_price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

async function fetchPythPriceFromHermes(feedId: string): Promise<number | null> {
  try {
    const url = `${PYTH_CONFIG.hermesUrl}/api/latest_price_feeds?ids[]=${feedId}`;
    console.log(`\n📡 Fetching from Hermes: ${url}`);
    
    const response = await axios.get(url);
    
    if (!response.data || response.data.length === 0) {
      console.error('❌ No data returned from Hermes');
      return null;
    }

    const priceData: PythPrice = response.data[0];
    const price = parseFloat(priceData.price.price);
    const expo = priceData.price.expo;
    const actualPrice = price * Math.pow(10, expo);
    
    console.log(`✅ Raw price: ${price}`);
    console.log(`✅ Exponent: ${expo}`);
    console.log(`✅ Actual price: $${actualPrice.toFixed(2)}`);
    console.log(`✅ Confidence: ±$${(parseFloat(priceData.price.conf) * Math.pow(10, expo)).toFixed(2)}`);
    console.log(`✅ Last update: ${new Date(priceData.price.publish_time * 1000).toLocaleString()}`);
    
    return actualPrice;
  } catch (error: any) {
    console.error(`❌ Error fetching from Hermes: ${error.message}`);
    return null;
  }
}

async function testAllPriceFeeds() {
  console.log('🚀 Testing Pyth Price Feeds\n');
  console.log('=' .repeat(80));
  
  const tokens = Object.keys(PYTH_CONFIG.tokens) as Array<keyof typeof PYTH_CONFIG.tokens>;
  const results: Record<string, { price: number | null; success: boolean }> = {};
  
  for (const token of tokens) {
    console.log(`\n📊 Testing ${token}`);
    console.log('-'.repeat(80));
    
    try {
      const feedId = getFeedId(token);
      console.log(`Feed ID: ${feedId}`);
      
      const price = await fetchPythPriceFromHermes(feedId);
      
      results[token] = {
        price,
        success: price !== null
      };
      
      if (price) {
        console.log(`\n✅ ${token} price: $${price.toFixed(2)}`);
      } else {
        console.log(`\n❌ ${token} price fetch failed`);
      }
      
    } catch (error: any) {
      console.error(`❌ Error testing ${token}: ${error.message}`);
      results[token] = {
        price: null,
        success: false
      };
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  
  const successful = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;
  
  console.log(`\n✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  console.log('\n📈 Price Summary:');
  for (const [token, result] of Object.entries(results)) {
    if (result.success && result.price) {
      console.log(`  ${token.padEnd(10)} $${result.price.toFixed(2)}`);
    } else {
      console.log(`  ${token.padEnd(10)} FAILED`);
    }
  }
  
  if (successful === total) {
    console.log('\n🎉 All price feeds working correctly!');
  } else {
    console.log('\n⚠️  Some price feeds failed - check errors above');
  }
}

// Run the test
testAllPriceFeeds()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
