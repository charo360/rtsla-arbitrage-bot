# 🪐 Jupiter Integration Guide

## Overview

The bot uses **Jupiter Aggregator** for executing trades. Jupiter finds the best prices across all Solana DEXs, including Remora Markets, Raydium, Orca, and more.

---

## Why Jupiter?

### ✅ Advantages:
1. **Best Prices** - Aggregates liquidity from all DEXs
2. **Smart Routing** - Finds optimal swap routes
3. **Better Execution** - Lower slippage, better fills
4. **Proven SDK** - Battle-tested, widely used
5. **Automatic Routing** - No need to know pool addresses

### 🎯 How It Works:
```
Your Bot → Jupiter API → Best Route → Execute Swap
                ↓
        Checks all DEXs:
        - Remora Markets
        - Raydium
        - Orca
        - Meteora
        - Phoenix
        - etc.
```

---

## Features Implemented

### 1. **Quote Fetching**
```typescript
// Get quote for USDC → Token
const quote = await jupiterClient.getQuote(
  tokenMint,
  amountUsdc,
  slippageBps
);
```

### 2. **Price Checking**
```typescript
// Get current token price in USDC
const price = await jupiterClient.getTokenPrice(tokenMint);
```

### 3. **Swap Execution**
```typescript
// Execute the swap
const result = await jupiterClient.executeSwap(
  quote,
  userKeypair
);
```

### 4. **Arbitrage Trading**
```typescript
// Complete arbitrage trade
const result = await jupiterClient.executeArbitrageTrade(
  tokenMint,
  amountUsdc,
  userKeypair,
  'BUY' // or 'SELL'
);
```

---

## Configuration

### Environment Variables

```bash
# Trading parameters
TRADE_AMOUNT_USDC=100
MAX_SLIPPAGE_PERCENT=0.5
MIN_PROFIT_THRESHOLD=0.5

# Enable live trading
AUTO_EXECUTE=true  # Set to false for monitoring only
```

### Slippage Settings

```bash
# Conservative (recommended for large trades)
MAX_SLIPPAGE_PERCENT=0.3

# Balanced (default)
MAX_SLIPPAGE_PERCENT=0.5

# Aggressive (for small trades or high volatility)
MAX_SLIPPAGE_PERCENT=1.0
```

---

## How Trades Work

### Step 1: Opportunity Detection
```
Bot monitors prices:
- Jupiter price (real DEX price)
- Oracle price (Pyth/Yahoo)
- Calculates spread
```

### Step 2: Trade Validation
```
Checks:
✓ Spread > MIN_SPREAD_PERCENT (0.8%)
✓ Profit > MIN_PROFIT_THRESHOLD ($0.50)
✓ Wallet has sufficient balance
✓ Price impact acceptable
```

### Step 3: Quote Request
```
Request quote from Jupiter:
- Input: USDC amount
- Output: Token amount
- Price impact
- Route information
```

### Step 4: Execution
```
If AUTO_EXECUTE=true:
1. Build transaction
2. Sign with wallet
3. Send to Solana
4. Confirm transaction
5. Record results
```

---

## Trade Flow Example

### BUY Opportunity (Buy on DEX, Sell at Oracle Price)

```
1. Detection:
   Jupiter Price: $450.00 (TSLAr)
   Oracle Price:  $455.00
   Spread: 1.10% ✅

2. Quote Request:
   Input:  $100 USDC
   Output: 0.2222 TSLAr
   Impact: 0.15%

3. Execution:
   ✅ Swap $100 USDC → 0.2222 TSLAr
   ✅ Signature: 5Kj8m...
   ✅ Profit: $0.84

4. Result:
   Success: true
   Wallet: Trading-1
   Profit: $0.84
```

---

## API Methods

### JupiterClient Class

#### `getQuote(outputMint, amountUsdc, slippageBps)`
Get quote for swapping USDC to a token.

**Parameters:**
- `outputMint`: Token to buy (PublicKey)
- `amountUsdc`: Amount in USDC (number)
- `slippageBps`: Slippage in basis points (50 = 0.5%)

**Returns:** `QuoteResponse | null`

---

#### `getQuoteReverse(inputMint, amountTokens, tokenDecimals, slippageBps)`
Get quote for swapping token to USDC.

**Parameters:**
- `inputMint`: Token to sell (PublicKey)
- `amountTokens`: Amount of tokens (number)
- `tokenDecimals`: Token decimals (default: 6)
- `slippageBps`: Slippage in basis points

**Returns:** `QuoteResponse | null`

---

#### `getTokenPrice(tokenMint)`
Get current price of a token in USDC.

**Parameters:**
- `tokenMint`: Token address (PublicKey)

**Returns:** `number | null` (price in USDC)

---

#### `executeSwap(quote, userKeypair, priorityFee)`
Execute a swap transaction.

**Parameters:**
- `quote`: Quote from getQuote()
- `userKeypair`: Wallet keypair
- `priorityFee`: Priority fee in SOL (default: 0.0001)

**Returns:** `SwapResult`

---

#### `executeArbitrageTrade(tokenMint, amountUsdc, userKeypair, direction)`
Execute complete arbitrage trade.

**Parameters:**
- `tokenMint`: Token address
- `amountUsdc`: Amount in USDC
- `userKeypair`: Wallet keypair
- `direction`: 'BUY' or 'SELL'

**Returns:** `SwapResult`

---

## Monitoring & Logs

### Transaction Logs

```
🚀 EXECUTING TRADE
================================================================================
Token: TSLAr
Wallet: Trading-1 (GhyyPVNs...)
Direction: BUY_REMORA
Amount: $100 USDC
Spread: 1.10%
Expected Profit: $0.84
================================================================================

📝 Building transaction with Jupiter...
🚀 Executing real trade via Jupiter...

📊 Jupiter Quote:
   Input: 100 USDC
   Output: 0.222222 tokens
   Price Impact: 0.15%

🔄 Building swap transaction...
📝 Signing and sending transaction...
📤 Transaction sent: 5Kj8m...
⏳ Waiting for confirmation...
✅ Transaction confirmed: 5Kj8m...

✅ Trade executed successfully via Jupiter!
   Signature: 5Kj8m...
   Input: 100 USDC
   Output: 0.222222 tokens
```

---

## Error Handling

### Common Errors

#### 1. "No quote received from Jupiter"
**Cause:** Token not supported or no liquidity

**Solution:**
- Check token address is correct
- Verify token has liquidity on Solana DEXs
- Try smaller amount

---

#### 2. "High price impact"
**Cause:** Trade size too large for available liquidity

**Solution:**
- Reduce trade amount
- Increase slippage tolerance
- Wait for better liquidity

---

#### 3. "Insufficient balance"
**Cause:** Wallet doesn't have enough USDC or SOL

**Solution:**
- Add USDC to wallet
- Add SOL for transaction fees (min 0.01 SOL)

---

#### 4. "Transaction failed"
**Cause:** Various (slippage, network, etc.)

**Solution:**
- Check slippage settings
- Verify wallet has SOL for fees
- Retry with higher priority fee

---

## Testing

### Test Mode (Monitoring Only)

```bash
# .env
AUTO_EXECUTE=false
```

**What happens:**
- Bot monitors prices ✅
- Detects opportunities ✅
- Simulates trades ✅
- Does NOT execute real trades ❌

**Use for:**
- Testing configuration
- Monitoring performance
- Verifying opportunities

---

### Live Trading Mode

```bash
# .env
AUTO_EXECUTE=true
```

**What happens:**
- Bot monitors prices ✅
- Detects opportunities ✅
- Executes REAL trades ✅
- Uses REAL money ⚠️

**Before enabling:**
1. Test in monitoring mode first
2. Start with small amounts ($10-50)
3. Verify wallet has funds
4. Monitor closely

---

## Safety Features

### Built-in Protections

1. **Minimum Spread Check**
   - Only trades if spread > 0.8%

2. **Minimum Profit Check**
   - Only trades if profit > $0.50

3. **Balance Verification**
   - Checks wallet balance before trade

4. **Price Impact Warning**
   - Warns if impact > 2%

5. **Slippage Protection**
   - Enforces max slippage limit

6. **Transaction Confirmation**
   - Waits for blockchain confirmation

---

## Performance Optimization

### Tips for Better Results

1. **Use Multiple Wallets**
   - Distribute capital across 5+ wallets
   - Faster execution, less waiting

2. **Optimize Slippage**
   - Lower for large trades (0.3%)
   - Higher for small trades (0.5-1%)

3. **Priority Fees**
   - Higher fees = faster execution
   - Default: 0.0001 SOL

4. **Trade Size**
   - Start small ($50-100)
   - Scale up as profitable
   - Watch price impact

5. **RPC Endpoint**
   - Use paid RPC for faster execution
   - Recommended: Helius, QuickNode

---

## Supported Tokens

All tokenized stocks from Remora Markets:

- ✅ **TSLAr** (Tesla)
- ✅ **CRCLr** (Corcept)
- ✅ **SPYr** (S&P 500)
- ✅ **MSTRr** (MicroStrategy)
- ✅ **NVDAr** (NVIDIA)

Jupiter automatically routes through best available liquidity.

---

## Cost Structure

### Transaction Costs

1. **Solana Network Fee**
   - ~0.000005 SOL per transaction
   - Very cheap (~$0.001)

2. **Priority Fee**
   - Default: 0.0001 SOL
   - Adjustable based on urgency

3. **DEX Fees**
   - Varies by DEX (0.1-0.3%)
   - Included in Jupiter quote

4. **Total Cost**
   - Typically $0.10-0.30 per trade
   - Factored into profit calculations

---

## Troubleshooting

### Issue: No trades executing

**Check:**
1. `AUTO_EXECUTE=true` in .env
2. Wallet has USDC balance
3. Wallet has SOL for fees
4. Opportunities meet thresholds

---

### Issue: All trades failing

**Check:**
1. RPC endpoint working
2. Slippage not too low
3. Trade amount not too large
4. Token has liquidity

---

### Issue: Low profit

**Adjust:**
1. Lower MIN_SPREAD_PERCENT
2. Lower MIN_PROFIT_THRESHOLD
3. Increase trade amount
4. Use better RPC endpoint

---

## Next Steps

### To Start Live Trading:

1. **Fund Wallet**
   ```
   - Add USDC for trading
   - Add SOL for fees (0.05+ SOL)
   ```

2. **Configure Settings**
   ```bash
   AUTO_EXECUTE=true
   TRADE_AMOUNT_USDC=100
   MAX_SLIPPAGE_PERCENT=0.5
   ```

3. **Start Bot**
   ```bash
   npm run multi
   ```

4. **Monitor Dashboard**
   ```
   http://localhost:3000
   ```

5. **Watch Logs**
   ```bash
   tail -f logs/combined.log
   ```

---

## Resources

- **Jupiter Docs:** https://station.jup.ag/docs
- **Jupiter API:** https://quote-api.jup.ag/docs
- **Remora Markets:** https://remoramarkets.xyz
- **Solana Explorer:** https://solscan.io

---

## Summary

✅ **Jupiter integration complete!**
✅ **Ready for live trading**
✅ **All safety features enabled**
✅ **Multi-wallet support**
✅ **Real-time monitoring**

**Start with small amounts and scale up as you verify profitability!** 🚀💰
