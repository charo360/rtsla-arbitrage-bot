# 💼 Multi-Wallet Trading Guide

## Overview

The bot supports **multiple wallets** for distributed trading, allowing you to:
- **Distribute capital** across multiple wallets
- **Reduce risk** by not keeping all funds in one wallet
- **Increase throughput** with parallel trading
- **Better capital management** with different strategies
- **Track performance** per wallet

---

## Why Use Multiple Wallets?

### 1. **Risk Distribution**
- Don't keep all your capital in one wallet
- If one wallet is compromised, others remain safe
- Limit exposure per wallet

### 2. **Capital Efficiency**
- Trade with multiple wallets simultaneously
- No waiting for transaction confirmations
- Higher trading volume capacity

### 3. **Strategy Diversification**
- Different wallets for different tokens
- Test strategies with separate wallets
- A/B testing with different parameters

### 4. **Performance Tracking**
- Track profit/loss per wallet
- Identify best-performing wallets
- Optimize based on individual wallet stats

---

## Configuration

### Method 1: Comma-Separated List (Recommended)

In your `.env` file:

```bash
# Add all wallet private keys separated by commas
WALLET_PRIVATE_KEYS=key1,key2,key3,key4,key5
```

**Example:**
```bash
WALLET_PRIVATE_KEYS=[123,45,67...],[234,56,78...],[345,67,89...]
```

### Method 2: Individual Environment Variables

```bash
WALLET_1=[123,45,67,89,...]
WALLET_2=[234,56,78,90,...]
WALLET_3=[345,67,89,01,...]
WALLET_4=[456,78,90,12,...]
WALLET_5=[567,89,01,23,...]
```

### Method 3: Single Wallet (Fallback)

```bash
# If no multiple wallets configured, falls back to single wallet
WALLET_PRIVATE_KEY=[123,45,67,89,...]
```

---

## Wallet Selection Strategies

Configure how the bot selects which wallet to use for each trade:

```bash
WALLET_SELECTION_STRATEGY=round_robin
```

### Available Strategies:

#### 1. **Round Robin** (Default)
```bash
WALLET_SELECTION_STRATEGY=round_robin
```
- Rotates through wallets sequentially
- Wallet 1 → Wallet 2 → Wallet 3 → Wallet 1 → ...
- **Best for:** Equal distribution of trades
- **Use when:** All wallets have similar balances

#### 2. **Highest Balance**
```bash
WALLET_SELECTION_STRATEGY=highest_balance
```
- Always uses wallet with most USDC
- Automatically rebalances to highest balance wallet
- **Best for:** Maximizing capital efficiency
- **Use when:** Wallets have varying balances

#### 3. **Least Used**
```bash
WALLET_SELECTION_STRATEGY=least_used
```
- Uses wallet with fewest trades
- Balances trade distribution
- **Best for:** Even wear across wallets
- **Use when:** Want to spread activity evenly

#### 4. **Random**
```bash
WALLET_SELECTION_STRATEGY=random
```
- Randomly selects a wallet
- Unpredictable pattern
- **Best for:** Testing and experimentation
- **Use when:** Want to avoid patterns

---

## Setup Guide

### Step 1: Create Multiple Wallets

**Option A: Phantom Wallet**
1. Open Phantom
2. Click account name → "Add / Connect Wallet"
3. Create new wallet
4. Repeat for desired number of wallets
5. Export private key for each

**Option B: Solana CLI**
```bash
# Create 5 wallets
solana-keygen new --outfile wallet1.json
solana-keygen new --outfile wallet2.json
solana-keygen new --outfile wallet3.json
solana-keygen new --outfile wallet4.json
solana-keygen new --outfile wallet5.json
```

### Step 2: Fund Wallets

Each wallet needs:
- **SOL**: For transaction fees (~0.01-0.05 SOL per wallet)
- **USDC**: Trading capital (e.g., $100-$500 per wallet)

**Example distribution for $1000 total:**
```
Wallet 1: 0.05 SOL + $200 USDC
Wallet 2: 0.05 SOL + $200 USDC
Wallet 3: 0.05 SOL + $200 USDC
Wallet 4: 0.05 SOL + $200 USDC
Wallet 5: 0.05 SOL + $200 USDC
```

### Step 3: Configure .env

```bash
# Add your wallet private keys
WALLET_PRIVATE_KEYS=key1,key2,key3,key4,key5

# Choose selection strategy
WALLET_SELECTION_STRATEGY=round_robin

# Set trade amount (per wallet)
TRADE_AMOUNT_USDC=100
```

### Step 4: Start Bot

```bash
npm run multi
```

The bot will:
1. Load all wallets
2. Check balances
3. Display wallet summary
4. Start trading with selected strategy

---

## Wallet Manager Features

### Automatic Balance Tracking

The bot automatically tracks for each wallet:
- **SOL Balance**: For transaction fees
- **USDC Balance**: For trading
- **Total Trades**: Number of trades executed
- **Success Rate**: Percentage of successful trades
- **Total Profit**: Cumulative profit/loss
- **Last Used**: When wallet was last used

### Insufficient Balance Handling

The bot automatically:
- Checks balance before each trade
- Skips wallets with insufficient funds
- Logs warnings for low balances
- Continues with other wallets

### Performance Monitoring

View stats for all wallets:
```typescript
// In code
walletManager.printSummary();
```

**Output:**
```
💼 WALLET MANAGER SUMMARY
================================================================================
Total Wallets: 5
Selection Strategy: round_robin
Total SOL: 0.2500
Total USDC: 1000.00
Total Profit: $45.50

Wallet Details:
--------------------------------------------------------------------------------
Wallet-1:
  Address: 7xKXt...
  SOL: 0.0500 | USDC: 200.00
  Trades: 12 (91.7% success)
  Profit: $10.50
  Last Used: 12/8/2025, 2:00:00 AM

Wallet-2:
  Address: 8yLYu...
  SOL: 0.0500 | USDC: 200.00
  Trades: 11 (90.9% success)
  Profit: $9.20
  Last Used: 12/8/2025, 2:01:00 AM
...
```

---

## Best Practices

### 1. **Start Small**
```bash
# Begin with 2-3 wallets
WALLET_1=key1
WALLET_2=key2
WALLET_3=key3

# Use small amounts per wallet
TRADE_AMOUNT_USDC=50
```

### 2. **Equal Distribution**
- Fund all wallets equally initially
- Use `round_robin` strategy
- Monitor performance for a week
- Adjust based on results

### 3. **Minimum Balances**
Each wallet should have:
- **Minimum SOL**: 0.05 SOL (for ~50-100 transactions)
- **Minimum USDC**: 2x trade amount (buffer for slippage)

**Example for $100 trades:**
```
SOL: 0.05
USDC: $200 (allows for 2 trades + buffer)
```

### 4. **Regular Rebalancing**
- Check balances daily
- Redistribute USDC as needed
- Top up SOL when low
- Withdraw profits periodically

### 5. **Security**
- Use different passwords for each wallet
- Store private keys securely
- Never share private keys
- Use hardware wallet for large amounts

---

## Advanced Usage

### Dynamic Strategy Switching

Change strategy at runtime:
```typescript
import { WalletSelectionStrategy } from './utils/wallet-manager';

// Switch to highest balance strategy
walletManager.setStrategy(WalletSelectionStrategy.HIGHEST_BALANCE);
```

### Custom Wallet Names

```typescript
// Add wallets with custom names
walletManager.addWallet(privateKey1, 'Main-Trading');
walletManager.addWallet(privateKey2, 'Backup-Trading');
walletManager.addWallet(privateKey3, 'Test-Wallet');
```

### Wallet-Specific Stats

```typescript
// Get stats for specific wallet
const stats = walletManager.getWalletStats(publicKey);
console.log(`Success Rate: ${stats.successRate}%`);
console.log(`Total Profit: $${stats.totalProfit}`);
```

### Balance Monitoring

```typescript
// Check if wallet has sufficient balance
const hasBalance = await walletManager.hasInsufficientBalance(
  publicKey,
  requiredUSDC
);

if (hasBalance) {
  console.log('Wallet needs funding!');
}
```

---

## Monitoring & Analytics

### Real-Time Dashboard

The dashboard shows stats for all wallets:
- Individual wallet balances
- Trade distribution
- Success rates
- Profit per wallet

### Log Analysis

Check logs for wallet activity:
```bash
# View wallet selections
cat logs/bot.log | grep "Selected wallet"

# View balance updates
cat logs/bot.log | grep "Updating balances"

# View trade records
cat logs/bot.log | grep "Trade recorded"
```

### Export Wallet Stats

```typescript
// Get all wallet statistics
const allStats = walletManager.getAllStats();

// Export to JSON
fs.writeFileSync('wallet-stats.json', JSON.stringify(allStats, null, 2));

// Export to CSV
const csv = allStats.map(s => 
  `${s.name},${s.publicKey},${s.totalTrades},${s.successRate},${s.totalProfit}`
).join('\n');
fs.writeFileSync('wallet-stats.csv', csv);
```

---

## Troubleshooting

### Issue: "No wallets available"

**Cause:** No wallets configured in .env

**Solution:**
```bash
# Add at least one wallet
WALLET_PRIVATE_KEY=your_key
# Or
WALLET_PRIVATE_KEYS=key1,key2
```

### Issue: "Wallet has insufficient USDC"

**Cause:** Wallet balance too low for trade

**Solution:**
1. Check wallet balance
2. Transfer more USDC to wallet
3. Or reduce `TRADE_AMOUNT_USDC`

### Issue: "Wallet has insufficient SOL for fees"

**Cause:** Not enough SOL for transaction fees

**Solution:**
```bash
# Transfer SOL to wallet (minimum 0.01 SOL)
solana transfer <wallet_address> 0.05
```

### Issue: All wallets skipped

**Cause:** All wallets have insufficient balance

**Solution:**
1. Check all wallet balances
2. Fund wallets with USDC and SOL
3. Verify `TRADE_AMOUNT_USDC` is reasonable

---

## Example Configurations

### Conservative (2 Wallets)
```bash
WALLET_1=key1
WALLET_2=key2
WALLET_SELECTION_STRATEGY=round_robin
TRADE_AMOUNT_USDC=100
```

### Balanced (5 Wallets)
```bash
WALLET_PRIVATE_KEYS=key1,key2,key3,key4,key5
WALLET_SELECTION_STRATEGY=highest_balance
TRADE_AMOUNT_USDC=200
```

### Aggressive (10 Wallets)
```bash
WALLET_PRIVATE_KEYS=key1,key2,key3,key4,key5,key6,key7,key8,key9,key10
WALLET_SELECTION_STRATEGY=least_used
TRADE_AMOUNT_USDC=500
```

---

## Performance Optimization

### Recommended Setup by Capital

**$500 Total:**
- 2 wallets × $250 each
- Round robin strategy
- $100 per trade

**$2,000 Total:**
- 5 wallets × $400 each
- Highest balance strategy
- $200 per trade

**$10,000 Total:**
- 10 wallets × $1,000 each
- Least used strategy
- $500 per trade

**$50,000+ Total:**
- 20+ wallets × $2,500 each
- Custom strategy
- $1,000+ per trade

---

## Security Checklist

- [ ] Private keys stored securely (not in code)
- [ ] .env file in .gitignore
- [ ] Each wallet has unique password
- [ ] Hardware wallet for large amounts
- [ ] Regular security audits
- [ ] Monitor for unauthorized transactions
- [ ] Enable 2FA where possible
- [ ] Backup private keys offline

---

## Summary

**Multi-wallet trading provides:**
- ✅ Better risk distribution
- ✅ Higher trading capacity
- ✅ Improved capital efficiency
- ✅ Detailed performance tracking
- ✅ Flexible strategy options

**Get started:**
1. Create 2-5 wallets
2. Fund with SOL + USDC
3. Configure in .env
4. Choose strategy
5. Start trading!

**Monitor performance and adjust as needed.** 🚀💼
