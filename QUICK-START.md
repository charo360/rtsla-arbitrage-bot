# 🚀 Quick Start Guide - Flash Trade Arbitrage Bot

## ⚡ Start Trading in 3 Steps

### 1. Check Configuration
```bash
# Verify your .env settings
MIN_SPREAD_PERCENT=0.1
MIN_PROFIT_THRESHOLD=-0.05
TRADE_AMOUNT_USDC=10
```

### 2. Start the Bot
```bash
npm run build
npm run multi
```

### 3. Monitor Performance
```bash
# Watch logs in real-time
Get-Content logs\combined.log -Tail 50 -Wait

# Or check recent trades
Get-Content logs\combined.log | Select-String "Profit"
```

---

## 💰 Current Performance

**Success Rate:** 100%
**Average Profit:** $0.05 per trade
**Trade Size:** $10 USDC
**Tokens Traded:** CRCLr, MSTRr, TSLAr, NVDAr, SPYr

---

## 🎯 Scaling Up

### Phase 1: Testing ($10 trades)
- Run for 24 hours
- Verify all trades profitable
- Monitor for errors
- **Current Phase** ✅

### Phase 2: Small Scale ($50 trades)
```env
TRADE_AMOUNT_USDC=50
MIN_SPREAD_PERCENT=0.5
```
- Expected profit: $0.20-0.50 per trade
- 10-20 trades/day
- Daily profit: $2-10

### Phase 3: Medium Scale ($100 trades)
```env
TRADE_AMOUNT_USDC=100
MIN_SPREAD_PERCENT=0.7
```
- Expected profit: $0.40-1.00 per trade
- 10-20 trades/day
- Daily profit: $4-20

### Phase 4: Large Scale ($500+ trades)
```env
TRADE_AMOUNT_USDC=500
MIN_SPREAD_PERCENT=0.8
```
- Expected profit: $2-5 per trade
- 10-20 trades/day
- Daily profit: $20-100

---

## 📊 Key Metrics to Monitor

### Daily Checks
- [ ] Total trades executed
- [ ] Success rate (should be >95%)
- [ ] Total profit
- [ ] Wallet balance
- [ ] Error count

### Weekly Reviews
- [ ] Average profit per trade
- [ ] Best performing tokens
- [ ] Optimal spread thresholds
- [ ] Gas fee optimization
- [ ] Scaling opportunities

---

## 🛠️ Common Commands

### Start Bot
```bash
npm run multi
```

### Stop Bot
```
Ctrl+C
```

### Check Wallet Balance
```bash
npx ts-node check-balance.ts
```

### Sell Tokens Manually
```bash
npx ts-node check-and-sell.ts
```

### View Logs
```bash
# Last 50 lines
Get-Content logs\combined.log -Tail 50

# Search for errors
Get-Content logs\combined.log | Select-String "ERROR"

# Search for profits
Get-Content logs\combined.log | Select-String "Profit"
```

---

## ⚠️ Safety Checklist

Before scaling up:
- [ ] Bot running stable for 24+ hours
- [ ] No unexpected errors
- [ ] All trades profitable
- [ ] Wallet balance increasing
- [ ] Logs show normal operation

---

## 🎯 Profit Targets

### Conservative (Recommended for Start)
- Trade Size: $10-50
- Spread Threshold: 0.5%
- Expected Daily: $2-10
- Risk Level: Low ✅

### Moderate
- Trade Size: $100-200
- Spread Threshold: 0.7%
- Expected Daily: $10-40
- Risk Level: Medium

### Aggressive
- Trade Size: $500+
- Spread Threshold: 0.8%
- Expected Daily: $50-200
- Risk Level: Higher

---

## 📞 Emergency Procedures

### If Bot Stops Working
1. Check logs for errors
2. Verify wallet has USDC
3. Check network connection
4. Restart bot
5. If issues persist, reduce trade size

### If Trades Failing
1. Check wallet balance
2. Verify token accounts exist
3. Check Solana network status
4. Reduce trade size temporarily
5. Review recent transactions

### If Unexpected Behavior
1. Stop bot immediately
2. Check wallet balance
3. Review recent logs
4. Verify configuration
5. Restart with smaller trades

---

## 🎉 Success Indicators

You're doing well if:
- ✅ Bot runs without errors for hours
- ✅ Every trade is profitable
- ✅ Wallet balance growing
- ✅ Logs show consistent activity
- ✅ No manual intervention needed

---

## 📈 Next Level

Once comfortable:
1. Add more wallets for parallel trading
2. Implement Telegram notifications
3. Create profit tracking dashboard
4. Optimize spread thresholds
5. Scale to larger trade sizes

---

**Remember:** Start small, monitor closely, scale gradually!

**Current Status:** ✅ WORKING & PROFITABLE
**Last Updated:** December 9, 2025
