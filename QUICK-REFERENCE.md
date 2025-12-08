# 🚀 Quick Reference Card

## 📊 Current Setup

✅ **5 Tokens Active**: TSLAr, CRCLr, SPYr, MSTRr, NVDAr  
✅ **Multi-Token Monitor**: Running  
✅ **Opportunities**: Being detected every 10 seconds  
✅ **Data**: Saving to JSON files  

---

## ⚡ Quick Commands

```bash
# Multi-Token Monitor (ALL 5 tokens)
npm run multi

# Single Token (TSLAr only)
npm start

# Development mode (auto-reload)
npm run multi-dev

# Stop bot
Ctrl + C

# View logs
Get-Content logs\combined.log -Tail 50 -Wait

# View opportunities
Get-Content data\multi-token-opportunities.json
```

---

## 📈 Token Addresses

```
TSLAr:  FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe
CRCLr:  5fKr9joRHpioriGmMgRVFdmZge8EVUTbrWyxDVdSrcuG
SPYr:   AVw2QGVkXJPRPRjLAceXVoLqU5DVtJ53mdgMXp14yGit
MSTRr:  B8GKqTDGYc7F6udTHjYeazZ4dFCRkrwK2mBQNS4igqTv
NVDAr:  ALTP6gug9wv5mFtx2tSU1YYZ1NrEc2chDdMPoJA8f8pu
```

---

## 🎯 Key Settings (.env)

```bash
MIN_SPREAD_PERCENT=0.8          # Minimum spread to alert
TRADE_AMOUNT_USDC=100           # Trade size
POLL_INTERVAL_MS=10000          # Check every 10 seconds
MIN_PROFIT_THRESHOLD=0.5        # Minimum $0.50 profit
AUTO_EXECUTE=false              # Set true to enable trading
```

---

## 💰 Profit Estimates (per $100 trade)

| Token | Avg Profit | Range |
|-------|------------|-------|
| TSLAr | $1.00 | $0.50 - $2.00 |
| CRCLr | $1.20 | $0.60 - $1.80 |
| SPYr | $0.90 | $0.40 - $1.50 |
| MSTRr | $1.40 | $0.70 - $2.50 |
| NVDAr | $1.10 | $0.60 - $2.00 |

**Combined**: 50-100 opportunities/day = $30-150/day potential

---

## 📊 Understanding Output

```
TSLAr    | Remora: $  452.18 | Oracle: $  455.00 | Spread:   0.62%
   🎯 OPPORTUNITY! Profit: $1.04 | Direction: BUY_REMORA
```

- **Remora**: DEX price
- **Oracle**: Real stock price
- **Spread**: % difference
- **BUY_REMORA**: Buy low on Remora, sell high on oracle

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| No opportunities | Lower MIN_SPREAD_PERCENT to 0.6% |
| Bot crashes | Check logs/combined.log |
| Prices not updating | Check VPN connection |
| "0 tokens" message | Verify .env has MINT_ADDRESS entries |

---

## 📁 Important Files

- **`.env`** - Configuration (DO NOT commit!)
- **`logs/combined.log`** - All activity logs
- **`data/multi-token-opportunities.json`** - Detected opportunities
- **`MULTI-TOKEN-GUIDE.md`** - Full documentation
- **`SETUP-COMPLETE.md`** - Setup guide

---

## 🎯 Next Steps

1. ✅ **Monitor**: Let bot run 2-4 hours, collect data
2. ⏳ **Analyze**: Review opportunities, identify best tokens
3. ⏳ **Test**: Manual trades to verify profitability
4. ⏳ **Automate**: Add wallet key, enable AUTO_EXECUTE
5. ⏳ **Scale**: Increase trade size gradually

---

## ⚠️ Safety Reminders

- Start with $100 trades
- Use VPN (non-US IP)
- Monitor closely at first
- Withdraw profits regularly
- Never invest more than you can lose

---

## 📞 Quick Help

**Bot running?** Check process: `Get-Process node`  
**View opportunities:** `Get-Content data\multi-token-opportunities.json | ConvertFrom-Json | Select-Object -Last 10`  
**Count by token:** `Get-Content data\multi-token-opportunities.json | ConvertFrom-Json | Group-Object token`  
**Live monitoring:** `Get-Content logs\combined.log -Tail 50 -Wait`  

---

**Status**: ✅ RUNNING - Monitoring 5 tokens every 10 seconds!
