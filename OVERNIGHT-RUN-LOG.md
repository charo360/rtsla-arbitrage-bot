# Overnight Bot Run - December 9, 2025

## Starting Conditions:

**Time Started:** ~3:08 AM
**Starting Balance:** $97.57 USDC
**Dust Tokens:** 
- 0.000707915 CRCLr (~$0.06)
- 0.000221914 MSTRr (~$0.04)

## Bot Configuration:

```
MIN_SPREAD_PERCENT=3.0
MIN_PROFIT_THRESHOLD=-0.1 (allows small losses for testing)
TRADE_AMOUNT_USDC=10
```

## Expected Behavior:

With 3% spread threshold:
- Bot will only trade when spread is ≥3%
- Based on historical data: ~4% of opportunities meet this threshold
- Expected: 2-5 trades during overnight run
- Each trade should be profitable (3% spread > 1.5% fees)

## Success Criteria:

**Morning Check:**
1. Final USDC balance > $97.57 ✅
2. No stuck tokens (or minimal dust) ✅
3. Completed full cycles (USDC → Token → USDC) ✅
4. Positive net profit ✅

## Commands to Check in Morning:

```bash
# Check final balance
npx ts-node check-wallet-balance.ts

# Check recent logs
Get-Content logs\combined.log -Tail 100

# Look for completed trades
Get-Content logs\combined.log | Select-String -Pattern "ARBITRAGE COMPLETE"
```

## What to Look For:

### Good Signs:
- ✅ Multiple "ARBITRAGE COMPLETE" messages
- ✅ Positive profit amounts
- ✅ USDC balance increased
- ✅ No error messages

### Warning Signs:
- ⚠️ "Insufficient balance" errors
- ⚠️ Stuck tokens not sold
- ⚠️ Negative profit amounts
- ⚠️ Bot stopped unexpectedly

## Calculations:

**If 3 trades overnight:**
- Expected profit per trade: ~$0.15 (1.5% on $10)
- Total expected profit: ~$0.45
- Final balance target: ~$98.00

**If 5 trades overnight:**
- Expected profit per trade: ~$0.15
- Total expected profit: ~$0.75
- Final balance target: ~$98.30

## Notes:

- Bot uses oracle prices for opportunity detection
- Actual execution happens on Flash Trade at pool prices
- This test will show if oracle prices are "good enough"
- If profitable: No need for complex pool price implementation
- If losing: Need to implement proper pool price queries

---

**Started:** December 9, 2025, 3:08 AM  
**Expected End:** December 9, 2025, 9:00 AM  
**Duration:** ~6 hours  
**Status:** Running...

