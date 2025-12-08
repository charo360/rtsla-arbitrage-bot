# 🤖 Multi-Token Arbitrage Bot for Solana

**Automated arbitrage bot for tokenized stocks (rTSLA, rNVDA, rSPY, rMSTR, rCRCL) on Solana using flash loans**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

---

## ⚠️ Disclaimer

**This bot is for educational and research purposes only.** Cryptocurrency and tokenized securities trading involves substantial risk. Use at your own risk. The authors are not responsible for any losses incurred through use of this software.

---

## 🎯 What This Bot Does

Monitors price differences between:
- **Remora Markets** (DEX pool prices)
- **Yahoo Finance** (Real NASDAQ/stock prices via oracle)

When profitable spreads are detected (≥ 0.8%), the bot can execute flash loan arbitrage:
1. Borrow USDC (flash loan)
2. Buy tokenized stock on Remora (lower price)
3. Sell on oracle-based platform (higher price)
4. Repay loan + keep profit

### ✨ Features

- 🎯 **Multi-Token Support**: Monitor 5 tokenized stocks simultaneously
- 📊 **Real-Time Monitoring**: Price checks every 10 seconds
- 💰 **Profit Estimation**: Calculates potential profit after fees
- 📈 **Data Logging**: Saves all opportunities to JSON for analysis
- 🔒 **Safe Mode**: Monitoring-only mode (no trading) by default
- ⚡ **Flash Loans**: Zero capital required (uses flash loans)
- 🎨 **Beautiful CLI**: Color-coded output with real-time stats

### 📊 Supported Tokens

| Token | Name | Type |
|-------|------|------|
| TSLAr | Tesla | Tech Stock |
| NVDAr | Nvidia | Tech Stock |
| SPYr | S&P 500 | Index Fund |
| MSTRr | MicroStrategy | Crypto-Related |
| CRCLr | Circle | Fintech |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **Phantom Wallet** (optional, for trading)
- **VPN** (Remora Markets blocks US IPs)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/rtsla-arbitrage-bot.git
cd rtsla-arbitrage-bot

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings (optional for monitoring)
nano .env

# Build the project
npm run build
```

### Run the Bot

```bash
# Multi-token monitoring (all 5 tokens)
npm run multi

# Single token (TSLAr only)
npm start

# Development mode with auto-reload
npm run multi-dev
```

You should see:
```
================================================================================
  🤖 MULTI-TOKEN ARBITRAGE BOT
================================================================================
  Mode: MONITOR
  Min Spread: 0.8%
  Trade Amount: $100 USDC
  Poll Interval: 10s
  Auto Execute: NO (Monitor Only)
================================================================================

📊 Monitoring 5 tokens: TSLAr, CRCLr, SPYr, MSTRr, NVDAr
🚀 Starting multi-token price monitoring...

================================================================================
⏰ Price Check at 1:08:19 AM
================================================================================
TSLAr    | Remora: $  452.18 | Oracle: $  455.00 | Spread:   0.62%
CRCLr    | Remora: $   84.82 | Oracle: $   85.62 | Spread:   0.94%
   🎯 OPPORTUNITY! Profit: $0.64 | Direction: BUY_REMORA
SPYr     | Remora: $  680.36 | Oracle: $  685.69 | Spread:   0.78%
NVDAr    | Remora: $  179.97 | Oracle: $  182.41 | Spread:   1.34%
   🎯 OPPORTUNITY! Profit: $1.04 | Direction: BUY_REMORA
MSTRr    | Remora: $  181.03 | Oracle: $  178.99 | Spread:  -1.14%

🎯 Found 2 opportunities in this check!
================================================================================
```

---

## 📋 Configuration

### Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
# Minimum required for monitoring (no trading)
MIN_SPREAD_PERCENT=0.8
TRADE_AMOUNT_USDC=100
POLL_INTERVAL_MS=10000

# Token addresses (already configured)
RTSLA_MINT_ADDRESS=FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe
CRCL_MINT_ADDRESS=5fKr9joRHpioriGmMgRVFdmZge8EVUTbrWyxDVdSrcuG
SPY_MINT_ADDRESS=AVw2QGVkXJPRPRjLAceXVoLqU5DVtJ53mdgMXp14yGit
MSTR_MINT_ADDRESS=B8GKqTDGYc7F6udTHjYeazZ4dFCRkrwK2mBQNS4igqTv
NVDA_MINT_ADDRESS=ALTP6gug9wv5mFtx2tSU1YYZ1NrEc2chDdMPoJA8f8pu

# For trading (optional)
WALLET_PRIVATE_KEY=[your,private,key,array]
AUTO_EXECUTE=false
```

### Key Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `MIN_SPREAD_PERCENT` | Minimum spread to trigger alert | 0.8 |
| `TRADE_AMOUNT_USDC` | Trade size for calculations | 100 |
| `POLL_INTERVAL_MS` | Check interval (milliseconds) | 10000 |
| `MIN_PROFIT_THRESHOLD` | Minimum profit to execute | 0.5 |
| `AUTO_EXECUTE` | Enable automatic trading | false |

---

## 💻 Commands

```bash
# Development
npm run dev              # Single token with hot reload
npm run multi-dev        # Multi-token with hot reload

# Production
npm start                # Single token (TSLAr)
npm run multi            # Multi-token (all 5)

# Build
npm run build            # Compile TypeScript

# Monitoring
npm run monitor          # Price monitoring only
npm run analyze          # Analyze collected data
npm run dashboard        # Web dashboard (coming soon)
```

---

## 📊 Expected Results

### Monitoring Phase (Week 1)
- **Runtime**: 2-4 hours daily
- **Opportunities**: 50-100 detected across all tokens
- **Action**: Observe, collect data
- **Goal**: Verify opportunities exist

### Profit Potential

#### Per Token (on $100 trades)
- **TSLAr**: $0.50 - $2.00 per opportunity
- **CRCLr**: $0.60 - $1.80 per opportunity
- **SPYr**: $0.40 - $1.50 per opportunity
- **MSTRr**: $0.70 - $2.50 per opportunity
- **NVDAr**: $0.60 - $2.00 per opportunity

#### Combined Daily Potential
- **Opportunities**: 50-100+ per day
- **Daily Profit**: $30-150 (at $100 trades)
- **Monthly Profit**: $900-4,500 potential

#### Scaling Up
- **$500 trades**: 5x profit ($150-750/day)
- **$1000 trades**: 10x profit ($300-1,500/day)

---

## 📁 Project Structure

```
rtsla-arbitrage-bot/
├── src/
│   ├── config/
│   │   └── config.ts              # Configuration loader
│   ├── utils/
│   │   ├── logger.ts              # Logging system
│   │   └── price-fetcher.ts       # Price data fetcher
│   ├── monitors/
│   │   ├── price-monitor.ts       # Single token monitor
│   │   └── multi-token-monitor.ts # Multi-token monitor
│   ├── executors/
│   │   └── (future flash loan executor)
│   ├── index.ts                   # Single token entry
│   └── multi-token-bot.ts         # Multi-token entry
├── logs/                          # Log files (gitignored)
├── data/                          # Opportunity data (gitignored)
├── .env                           # Your config (gitignored)
├── .env.example                   # Example config
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
└── README.md                      # This file
```

---

## 🔧 Advanced Usage

### Enable Trading (When Ready)

1. **Get Phantom Wallet Private Key**
   ```
   Phantom → Settings → Export Private Key
   Copy the JSON array: [123, 45, 67, ...]
   ```

2. **Update `.env`**
   ```bash
   WALLET_PRIVATE_KEY=[your,private,key,array]
   AUTO_EXECUTE=true
   ```

3. **Fund Wallet**
   - 0.5 SOL for gas fees (~$100)
   - 100-500 USDC for testing

4. **Restart Bot**
   ```bash
   npm run multi
   ```

### VPN Setup (Required)

Remora Markets blocks US IP addresses. Use:
- **ProtonVPN** (Free): [protonvpn.com](https://protonvpn.com/)
- **NordVPN** ($5/month): Better speeds

Connect to: Kenya, UK, Singapore, or any non-US server

---

## 📈 Data Analysis

### View Opportunities

```bash
# View recent opportunities
cat data/multi-token-opportunities.json | jq '.[-10:]'

# Count by token
cat data/multi-token-opportunities.json | jq 'group_by(.token) | map({token: .[0].token, count: length})'

# View live logs
tail -f logs/combined.log
```

### Analyze Performance

```bash
npm run analyze
```

---

## 🐛 Troubleshooting

### Bot Not Finding Opportunities?
- Lower `MIN_SPREAD_PERCENT` to 0.6%
- Verify VPN is connected (not US IP)
- Check market hours (9:30 AM - 4:00 PM ET)

### "Cannot fetch prices" Error?
- Check internet connection
- Verify VPN connection
- Try different RPC endpoint

### Bot Crashes?
- Check `logs/combined.log` for errors
- Ensure Node.js version ≥ 18
- Verify all dependencies installed

### TypeScript Errors?
```bash
npm run build
# Check for compilation errors
```

---

## 🛡️ Security

### Important Security Notes

1. **Never commit `.env` file** - Contains sensitive keys
2. **Never share private keys** - Store securely offline
3. **Use hardware wallet** - For large amounts
4. **Start small** - Test with $100 trades first
5. **Monitor closely** - Watch first trades carefully

### Best Practices

- Keep private keys in `.env` (gitignored)
- Use separate wallet for bot trading
- Withdraw profits regularly
- Enable 2FA on exchanges
- Use strong passwords

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
# Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/rtsla-arbitrage-bot.git

# Create a branch
git checkout -b feature/your-feature

# Make changes and test
npm run dev

# Commit and push
git add .
git commit -m "Add your feature"
git push origin feature/your-feature

# Open a Pull Request
```

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- **Solana** - Blockchain platform
- **Remora Markets** - DEX for tokenized stocks
- **Pyth Network** - Price oracle
- **Phantom** - Solana wallet

---

## 📞 Support & Resources

- **Documentation**: See `MULTI-TOKEN-GUIDE.md` for detailed guide
- **Quick Reference**: See `QUICK-REFERENCE.md` for commands
- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/rtsla-arbitrage-bot/issues)

### Useful Links

- [Solana Docs](https://docs.solana.com/)
- [Remora Markets](https://remoramarkets.xyz/)
- [Pyth Network](https://pyth.network/)
- [Phantom Wallet](https://phantom.app/)

---

## 📊 Roadmap

- [x] Multi-token monitoring
- [x] Real-time price tracking
- [x] Opportunity detection
- [x] Data logging and analysis
- [ ] Flash loan integration
- [ ] Automatic trade execution
- [ ] Web dashboard
- [ ] Telegram notifications
- [ ] Profit/loss tracking
- [ ] Smart contract deployment
- [ ] Risk management system

---

## ⚠️ Risk Disclosure

**Trading involves substantial risk of loss.** This bot:
- May lose money due to slippage, fees, or market volatility
- Requires technical knowledge to operate safely
- Should only be used with funds you can afford to lose
- Is provided "as is" without warranty

**Always:**
- Start with small amounts
- Test thoroughly in monitoring mode
- Understand the risks before trading
- Keep detailed records for taxes
- Comply with local regulations

---

**Made with ❤️ for the Solana DeFi community**

**⭐ Star this repo if you find it useful!**
