# 📦 INSTALLATION & USAGE GUIDE

Complete guide to install, configure, and run the rTSLA Arbitrage Bot.

---

## 📋 TABLE OF CONTENTS

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running the Bot](#running)
5. [Understanding Output](#output)
6. [Data Analysis](#analysis)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Usage](#advanced)

---

<a name="prerequisites"></a>
## 1️⃣ Prerequisites

### Required Software

- **Node.js 18+** - Download from https://nodejs.org/
- **Code Editor** - VS Code recommended (https://code.visualstudio.com/)
- **Terminal/Command Prompt** - Built into your OS

### Optional but Recommended

- **VPN** - ProtonVPN (free) or NordVPN ($5/month)
  - Required to access Remora Markets (blocks US IPs)
- **Phantom Wallet** - For actual trading (https://phantom.app/)
- **Git** - For version control (optional)

### Verify Prerequisites

```bash
# Check Node.js version
node --version
# Should show v18.x.x or higher

# Check npm version
npm --version
# Should show 9.x.x or higher
```

---

<a name="installation"></a>
## 2️⃣ Installation

### Method 1: Automated Setup (Recommended)

#### Windows:
```cmd
1. Extract the bot folder
2. Open folder in Explorer
3. Double-click: setup.bat
4. Wait for installation to complete
```

#### Mac/Linux:
```bash
1. Extract the bot folder
2. Open Terminal in folder
3. Run: ./setup.sh
4. Wait for installation to complete
```

### Method 2: Manual Installation

```bash
# Navigate to bot folder
cd rtsla-arbitrage-bot

# Install dependencies
npm install

# Build TypeScript
npm run build

# Create .env file
cp .env.example .env
```

### Verify Installation

```bash
# This should complete without errors
npm run build

# Check that dist/ folder was created
ls dist/
```

---

<a name="configuration"></a>
## 3️⃣ Configuration

### Basic Configuration (Monitoring Only)

**File:** `.env`

```bash
# Minimum configuration for monitoring:
MIN_SPREAD_PERCENT=0.8
TRADE_AMOUNT_USDC=100
POLL_INTERVAL_MS=10000
AUTO_EXECUTE=false
```

**That's it!** The bot will run in monitoring mode.

### Full Configuration (For Trading)

```bash
# ==================================================
# WALLET CONFIGURATION (Required for trading)
# ==================================================
WALLET_PRIVATE_KEY=[123,45,67,...]  # From Phantom wallet
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# ==================================================
# TRADING PARAMETERS
# ==================================================
MIN_SPREAD_PERCENT=0.8              # Minimum 0.8% spread to trigger
TRADE_AMOUNT_USDC=100              # Start with $100
POLL_INTERVAL_MS=10000             # Check every 10 seconds
MAX_SLIPPAGE_PERCENT=0.5           # Max 0.5% slippage

# ==================================================
# SAFETY SETTINGS
# ==================================================
MIN_PROFIT_THRESHOLD=0.5           # Minimum $0.50 profit
MAX_CONSECUTIVE_FAILURES=3         # Stop after 3 failures
AUTO_EXECUTE=false                 # Set true for auto-trading

# ==================================================
# MONITORING
# ==================================================
LOG_LEVEL=info                     # info, debug, warn, error
```

### Getting Your Wallet Private Key

**⚠️ IMPORTANT: Only do this when ready to trade!**

1. Open Phantom wallet
2. Settings → Security & Privacy
3. Export Private Key
4. Copy the JSON array: `[123, 45, 67, ...]`
5. Paste into `.env`:
   ```
   WALLET_PRIVATE_KEY=[123,45,67,...]
   ```

---

<a name="running"></a>
## 4️⃣ Running the Bot

### Development Mode (Recommended for Testing)

```bash
npm run dev
```

**Features:**
- Auto-reloads when code changes
- Detailed logging
- Easy to stop (Ctrl+C)

### Monitoring Only Mode

```bash
npm run monitor
```

**Features:**
- Only monitors prices
- No wallet needed
- Safe for testing

### Production Mode

```bash
npm run build
npm start
```

**Features:**
- Optimized performance
- Runs until stopped
- Use for 24/7 operation

### Using PM2 (Advanced - For 24/7 Running)

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start dist/index.js --name rtsla-bot

# View logs
pm2 logs rtsla-bot

# Stop bot
pm2 stop rtsla-bot

# Auto-restart on server reboot
pm2 startup
pm2 save
```

---

<a name="output"></a>
## 5️⃣ Understanding Output

### Console Output

```bash
============================================================
  🤖 rTSLA ARBITRAGE BOT
============================================================
  Mode: MONITOR
  Min Spread: 0.8%
  Trade Amount: $100 USDC
  Poll Interval: 10s
  Auto Execute: NO (Monitor Only)
============================================================

🚀 Starting price monitoring...
```

### Price Checks (Every 10 seconds)

```bash
Price Check {
  remora: '$454.73',
  pyth: '$459.89',
  spread: '1.125%',
  check: 1
}
```

**Meaning:**
- `remora`: Price on Remora pool
- `pyth`: NASDAQ price via Pyth oracle
- `spread`: Percentage difference
- `check`: Check number

### Opportunity Detected

```bash
🎯 OPPORTUNITY FOUND! {
  spread: '1.13%',
  direction: 'BUY_REMORA',
  estimatedProfit: '$0.92',
  tradeAmount: '$100'
}
```

**Meaning:**
- Profitable arbitrage opportunity found
- Buy on Remora (cheaper), sell via Flash Trade (higher price)
- Estimated profit: $0.92 on $100 trade

### Session Statistics (Every 50 checks)

```bash
📊 Session Stats {
  checks: 50,
  opportunities: 8,
  avgSpread: '1.05%',
  totalProfit: '$7.36'
}
```

---

<a name="analysis"></a>
## 6️⃣ Data Analysis

### Running Analysis

```bash
npm run analyze
```

### Sample Output

```
📊 OPPORTUNITY ANALYSIS
========================

📈 BASIC STATISTICS
Total Opportunities Found:     45
Time Period:                   4.0 hours
First Detected:                12/7/2025, 2:30:00 PM
Last Detected:                 12/7/2025, 6:30:00 PM

⏱️  FREQUENCY ANALYSIS
Opportunities per Hour:        11.3
Opportunities per Day (est):   270.0
Average Time Between:          5.3 minutes

📊 SPREAD STATISTICS
Average Spread:                1.05%
Maximum Spread:                2.31%
Minimum Spread:                0.80%

💰 PROFIT ANALYSIS
Average Profit per Trade:      $0.87
Total Potential Profit:        $39.15

💵 REVENUE PROJECTIONS
Daily (if all executed):       $234.90
Weekly (if all executed):      $1,644.30
Monthly (if all executed):     $7,047.00
```

### Interpreting Results

**Good Signs:**
- ✅ 10+ opportunities per day
- ✅ Average spread > 1%
- ✅ Average profit > $0.50
- ✅ Consistent opportunity frequency

**Warning Signs:**
- ⚠️ < 5 opportunities per day → Lower MIN_SPREAD_PERCENT
- ⚠️ Average profit < $0.30 → Increase trade amount
- ⚠️ Erratic spread → Market may be unstable

---

<a name="troubleshooting"></a>
## 7️⃣ Troubleshooting

### Bot Won't Start

**Error:** `Cannot find module...`

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

**Error:** `node: command not found`

**Solution:**
- Install Node.js from https://nodejs.org/
- Restart terminal
- Verify: `node --version`

### No Opportunities Detected

**Possible Causes:**

1. **Spread threshold too high**
   ```bash
   # In .env, change:
   MIN_SPREAD_PERCENT=0.6  # Lower from 0.8
   ```

2. **Not enough time**
   - Run for at least 2-4 hours
   - Opportunities may come in bursts

3. **API issues**
   - Check logs: `logs/error.log`
   - Verify internet connection
   - Try restarting bot

### Price Fetch Errors

**Error:** `Error fetching Remora price`

**Solution:**
```bash
# Check if you're using US IP (should use VPN)
curl ifconfig.me

# If US IP shown, connect VPN to Kenya/UK/Singapore
```

### Wallet Errors

**Error:** `WALLET_PRIVATE_KEY not set`

**This is OK if monitoring only!**

**To fix for trading:**
1. Export private key from Phantom
2. Add to `.env` as JSON array
3. Restart bot

---

<a name="advanced"></a>
## 8️⃣ Advanced Usage

### Custom RPC Endpoint

For faster execution, use premium RPC:

```bash
# In .env:
SOLANA_RPC_URL=https://your-premium-rpc-endpoint.com
```

**Recommended providers:**
- QuickNode: https://quicknode.com/
- Helius: https://helius.xyz/
- Alchemy: https://alchemy.com/

### Telegram Notifications

```bash
# 1. Create Telegram bot via @BotFather
# 2. Get bot token
# 3. Get your chat ID from @userinfobot

# In .env:
ENABLE_TELEGRAM_ALERTS=true
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### Running on Cloud Server

**Deploy to DigitalOcean/AWS/etc:**

```bash
# 1. SSH into server
# 2. Install Node.js
# 3. Clone/upload bot
# 4. Install dependencies
npm install

# 5. Use PM2 for persistence
npm install -g pm2
pm2 start dist/index.js --name rtsla-bot
pm2 startup
pm2 save

# 6. Monitor
pm2 monit
```

### Database Logging (Optional)

For serious usage, log to database:

```bash
# Install PostgreSQL client
npm install pg

# Update config to use database
# (Custom code needed - not included)
```

---

## 📊 Performance Optimization

### Faster Price Checks

```bash
# In .env:
POLL_INTERVAL_MS=5000  # Check every 5s instead of 10s
```

**Note:** More frequent = more API calls = may hit rate limits

### Reduce Logging

```bash
# In .env:
LOG_LEVEL=warn  # Only log warnings and errors
```

### Use Local RPC Node

**Advanced:** Run your own Solana validator for fastest access.

---

## 🔐 Security Best Practices

### Protecting Your Wallet

1. **Never commit `.env` to git**
   - Already in `.gitignore`
   - Double-check before pushing

2. **Use separate wallet for bot**
   - Don't use your main wallet
   - Only keep necessary funds

3. **Regular withdrawals**
   - Withdraw profits weekly
   - Don't accumulate large balances

4. **Backup seed phrase**
   - Write on paper
   - Store in 3 safe locations
   - Never digital copy

---

## 📈 Scaling Strategy

### Week 1: Monitoring
```
Trade Amount: N/A (monitoring only)
Goal: Verify opportunities exist
Action: Analyze data
```

### Week 2: Small Testing
```
Trade Amount: $50-100
Goal: Verify profitability
Action: 5-10 manual trades
```

### Week 3: Automation
```
Trade Amount: $200-500
Goal: Test flash loan automation
Action: Deploy smart contract
```

### Week 4+: Scaling
```
Trade Amount: $1,000-5,000
Goal: Maximize profit
Action: Optimize and monitor
```

---

## 📞 Support

### Log Files

Check these for errors:
```
logs/error.log      # Errors only
logs/combined.log   # All logs
logs/opportunities.log  # Detected opportunities
```

### Common Log Messages

```
"Price Check" - Normal operation
"OPPORTUNITY FOUND" - Profitable spread detected
"Error fetching" - API/network issue
"Circuit breaker" - Too many failures, bot paused
```

---

## ✅ Final Checklist

```
[ ] Node.js 18+ installed
[ ] Dependencies installed (npm install)
[ ] .env file configured
[ ] Bot runs without errors
[ ] Opportunities being detected
[ ] Data analysis shows potential
[ ] Logs are being written
[ ] Ready to proceed to trading
```

---

**This guide covers everything from installation to advanced usage. For quick start, see QUICKSTART.md!**
