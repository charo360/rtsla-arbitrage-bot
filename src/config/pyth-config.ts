/**
 * Complete Pyth Oracle Configuration
 * All price feed IDs for tokenized stocks on Solana
 */

export const PYTH_CONFIG = {
  
  // Pyth Programs on Solana
  programs: {
    receiver: 'rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ',
    priceFeed: 'FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH',
  },
  
  // Hermes API for fetching prices
  hermesUrl: 'https://hermes.pyth.network',
  
  // Price Feed IDs (POST MARKET - best for 24/7 trading)
  priceFeeds: {
    'TSLA/USD': '0x16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1',
    'NVDA/USD': '0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593',
    'SPY/USD': '0x19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5',
    'MSTR/USD': '0xd8b856d7e17c467877d2d947f27b832db0d65b362ddb6f728797d46b0a8b54c0',
  },
  
  // Token symbols mapping
  tokens: {
    'rTSLA': 'TSLA/USD',
    'rNVDA': 'NVDA/USD',
    'rSPY': 'NVDA/USD',
    'rMSTR': 'MSTR/USD',
  },
  
} as const;

// Helper to get feed ID by token symbol
export function getFeedId(tokenSymbol: string): string {
  const pair = PYTH_CONFIG.tokens[tokenSymbol as keyof typeof PYTH_CONFIG.tokens];
  if (!pair) {
    throw new Error(`Unknown token: ${tokenSymbol}`);
  }
  return PYTH_CONFIG.priceFeeds[pair];
}

// Type-safe feed IDs
export type TokenSymbol = keyof typeof PYTH_CONFIG.tokens;
export type PricePair = keyof typeof PYTH_CONFIG.priceFeeds;
