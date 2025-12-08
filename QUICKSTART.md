# ⚡ QUICKSTART GUIDE - Get Running in 5 Minutes

**Complete beginner? Start here! 👇**

---

## Step 1: Install Node.js (2 minutes)

### Windows:
1. Go to: https://nodejs.org/
2. Download "LTS" version (18 or higher)
3. Run installer
4. Click "Next" through all steps
5. Restart your computer

### Mac:
1. Go to: https://nodejs.org/
2. Download "LTS" version
3. Run installer
4. Open Terminal (search for "Terminal" in Spotlight)

### Verify Installation:
```bash
# Open Terminal (Mac) or Command Prompt (Windows)
# Type this and press Enter:
node --version

# You should see: v18.x.x or higher
```

✅ **If you see a version number, you're ready!**

---

## Step 2: Download the Bot

You already have the bot folder! It's called: `rtsla-arbitrage-bot`

Just open it in VS Code or any code editor.

---

## Step 3: Install Bot Dependencies (1 minute)

### Windows:
```cmd
1. Open Command Prompt in the bot folder
   (Shift + Right-click in folder → "Open PowerShell window here")

2. Run:
   setup.bat

3. Wait 2-3 minutes for installation
```

### Mac/Linux:
```bash
1. Open Terminal in the bot folder

2. Run:
   ./setup.sh

3. Wait 2-3 minutes for installation
```

**Or manually:**
```bash
npm install
```

---

## Step 4: Configure the Bot (1 minute)

### Create Your Configuration:

1. **Find the file:** `.env.example`
2. **Copy it** and rename to: `.env`
3. **Edit `.env`** in any text editor

### Absolute Minimum Configuration (Monitoring Only):

```bash
# You can leave everything as-is to just monitor!
# The bot will detect opportunities but NOT trade

# Just verify these lines exist:
MIN_SPREAD_PERCENT=0.8
TRADE_AMOUNT_USDC=100
POLL_INTERVAL_MS=10000
AUTO_EXECUTE=false
```

✅ **That's it! You can run in monitoring mode with zero setup**

---

## Step 5: Run the Bot! (30 seconds)

### Option A: Just Monitor (Safest - No Wallet Needed)

```bash
npm run monitor
```

You'll see:
```
============================================================
  🤖 rTSLA ARBITRAGE BOT
============================================================
  Mode: MONITOR
  Auto Execute: NO (Monitor Only)
============================================================

🚀 Starting price monitoring...
Price Check { remora: '$454.73', pyth: '$459.89', spread: '1.125%' }
🎯 OPPORTUNITY FOUND! { spread: '1.13%', estimatedProfit: '$0.92' }
```

**Let it run for 1-2 hours** to collect opportunity data.

### Option B: Development Mode (Auto-reload)

```bash
npm run dev
```

Same as monitoring, but restarts automatically when you change code.

---

## Step 6: Analyze Results (After Running)

After the bot runs for a while, analyze what it found:

```bash
npm run analyze
```

Output:
```
📊 OPPORTUNITY ANALYSIS
========================
Total Opportunities Found:     23
Opportunities per Day (est):   276.0
Average Profit per Trade:      $0.87
Daily (if all executed):       $240.12
Monthly (if all executed):     $7,203.60
```

**This shows you the potential!**

---

## ❓ Common Issues

### "node: command not found"
**Fix:** Node.js not installed. Go back to Step 1.

### "npm: command not found"
**Fix:** Node.js not installed correctly. Reinstall Node.js.

### "Cannot find module"
**Fix:** Dependencies not installed. Run `npm install`

### No opportunities detected
**Fix:** 
1. Make sure you're **NOT using US VPN** or on US IP
2. Lower `MIN_SPREAD_PERCENT` to `0.6` in `.env`
3. Wait longer (opportunities come every few minutes)

---

## 🚀 Next Steps (After Monitoring Works)

### 1. Get a Phantom Wallet
- Install: https://phantom.app/
- Create new wallet
- **Write down seed phrase** (super important!)

### 2. Buy Some Crypto
- Buy on Coinbase: 0.5 SOL + 100 USDC
- Send to Phantom wallet

### 3. Add Wallet to Bot
```bash
# In .env file:
WALLET_PRIVATE_KEY=[your,private,key,from,phantom]
```

### 4. Test Manual Trading
- Use Remora Markets website
- Try 1-2 manual trades
- Verify you can make profit

### 5. Enable Auto-Trading
```bash
# In .env file:
AUTO_EXECUTE=true
```

---

## 📁 Important Files

```
rtsla-arbitrage-bot/
├── .env                    ← YOUR CONFIGURATION (edit this!)
├── README.md              ← Full documentation
├── QUICKSTART.md          ← This file
├── package.json           ← Dependencies (don't edit)
├── src/                   ← Bot code (don't edit unless you know what you're doing)
├── logs/                  ← Log files (check if errors)
└── data/                  ← Opportunity data (analyze this)
```

---

## 🎯 What Each Command Does

```bash
npm run monitor    # Just watch for opportunities (safe)
npm run dev       # Monitor with auto-reload (for development)
npm run analyze   # Analyze collected data
npm start         # Run in production mode
npm run build     # Build TypeScript (auto-done by setup)
```

---

## ✅ Success Checklist

```
[ ] Node.js installed (v18+)
[ ] Bot dependencies installed (npm install)
[ ] .env file created
[ ] Bot runs (npm run monitor)
[ ] Seeing price checks in console
[ ] Opportunities being detected
[ ] Data saved to data/opportunities.json
[ ] Analysis shows potential profit
```

**If all checked, you're successfully running the bot!** 🎉

---

## 🆘 Need Help?

1. **Check logs:** `logs/combined.log`
2. **Check errors:** `logs/error.log`
3. **Read README.md** for detailed docs

---

## 💡 Pro Tips

1. **Start simple:** Just monitor for a day
2. **Verify opportunities:** Run analysis to see if it's worth it
3. **Test manually first:** Before auto-trading
4. **Start small:** $50-100 trades initially
5. **Scale gradually:** Only increase after success

---

**That's it! You're now running an arbitrage bot!** 🚀

The bot is currently in **safe monitoring mode** - it just watches and logs opportunities without trading.

When you're ready to actually trade, follow the "Next Steps" section above.

**Questions? Check README.md for detailed answers!**
