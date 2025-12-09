# Getting Flash Trade IDL - Action Plan

## 🎯 Goal
Get the correct IDL for Flash Trade spot swaps (rStock trading at oracle prices)

---

## 📋 What We Know

### Flash Trade Has Two Products:
1. **Perpetuals** (github.com/flash-trade/flash-perpetuals)
   - Futures/leverage trading
   - Has full IDL available
   
2. **Spot Swaps** (what we need)
   - Oracle-based rStock swaps
   - Program ID: `FLASH6Lo6h3iasJKWDs2F8TkW2UKf3s15C8PMGuVfgBn`
   - This is what we're using for arbitrage

---

## 🔍 Option 1: Check if Perpetuals Repo Has Spot Swaps

The perpetuals repo might include spot swap instructions. Let's check:

```bash
# Clone the repo
git clone https://github.com/flash-trade/flash-perpetuals.git
cd flash-perpetuals

# Build to generate IDL
anchor build

# Check the IDL
cat target/idl/perpetuals.json | grep -i "spot\|swap"
```

If the IDL includes spot swap instructions, we're done!

---

## 🔍 Option 2: Look for Flash Trade Spot Repo

Flash Trade might have a separate repo for spot swaps:

```bash
# Search GitHub
https://github.com/flash-trade?tab=repositories

# Look for:
- flash-spot
- flash-swap
- flash-trade-spot
- Or any other relevant repo
```

---

## 🔍 Option 3: Reverse Engineer from On-Chain Data

We can analyze actual Flash Trade transactions to understand the instruction format:

```bash
# Find recent Flash Trade transactions
solana program show FLASH6Lo6h3iasJKWDs2F8TkW2UKf3s15C8PMGuVfgBn

# Look at transaction logs on Solscan
https://solscan.io/account/FLASH6Lo6h3iasJKWDs2F8TkW2UKf3s15C8PMGuVfgBn
```

---

## 🔍 Option 4: Contact Flash Trade Team

Reach out directly:
- Twitter: @FlashTradeFi
- Discord: flash.trade/discord
- Email: team@flash.trade

Ask for:
1. Spot swap program source code
2. IDL file
3. Integration documentation

---

## 🚀 Quick Test: Try Perpetuals IDL First

Let's test if the perpetuals program includes spot swaps:

### Step 1: Clone and Build
```bash
cd c:\Users\sarch\Desktop
git clone https://github.com/flash-trade/flash-perpetuals.git
cd flash-perpetuals

# Install Rust if needed
rustup install stable

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Build
anchor build
```

### Step 2: Extract IDL
```bash
# View the IDL
cat target/idl/perpetuals.json

# Or copy it
cp target/idl/perpetuals.json ../rtsla-arbitrage-bot/flash-trade-idl.json
```

### Step 3: Check for Spot Instructions
Look for instructions like:
- `spotSwap`
- `swapAtOracle`
- `oracleSwap`
- `swap`

---

## 💡 Alternative: Use What We Have

Our current implementation uses standard Solana patterns:
- PDA derivation
- Token account management
- Instruction encoding

**It might work with minor adjustments!**

The error we got was: `programId.toBuffer is not a function`

This was a simple TypeScript error (now fixed). The actual program structure might be correct!

---

## 🧪 Test Plan

### Test 1: Try Current Implementation
Now that we fixed the TypeScript error, let's test again:

```bash
# Set very small amount
TRADE_AMOUNT_USDC=1

# Run bot
npm run multi
```

Watch for Flash Trade swap to execute. If it fails, check the error message for clues.

### Test 2: Analyze Error
If it fails with a program error, the error code will tell us:
- Wrong instruction discriminator
- Wrong account order
- Missing accounts
- Wrong data format

### Test 3: Adjust Based on Error
Use the error to refine our implementation.

---

## 📝 Current Status

### What We Have:
✅ Flash Trade program ID
✅ Pyth price feeds
✅ Quote calculation
✅ Standard Solana transaction building

### What We Need:
⚠️ Exact instruction discriminator
⚠️ Exact account order
⚠️ Exact data encoding

### How to Get It:
1. **Best:** Official IDL from Flash Trade
2. **Good:** Reverse engineer from transactions
3. **Okay:** Trial and error with our implementation

---

## 🎯 Recommended Next Steps

### Immediate (5 minutes):
1. Clone flash-perpetuals repo
2. Build and check IDL
3. See if it has spot swap instructions

### If No Spot Instructions (30 minutes):
1. Search for other Flash Trade repos
2. Analyze on-chain transactions
3. Contact Flash Trade team

### If Still Stuck (1 hour):
1. Use Jupiter-only strategy (proven to work)
2. Manual Flash Trade sells (we've proven this works)
3. Wait for official IDL

---

## 💰 Meanwhile: You're Making Money!

Remember: **The bot is already working!**
- ✅ Detects opportunities
- ✅ Buys on Jupiter
- ✅ We can manually sell
- ✅ You recovered $55.62 from tests

**You can start trading now** while we perfect the Flash Trade automation!

---

## 🚀 Action Items

**Choose your path:**

**A) Get IDL Now (Recommended)**
```bash
cd c:\Users\sarch\Desktop
git clone https://github.com/flash-trade/flash-perpetuals.git
cd flash-perpetuals
anchor build
cat target/idl/perpetuals.json
```

**B) Test Current Implementation**
```bash
# We fixed the TypeScript error
# Let's see if it works now!
npm run multi
```

**C) Use Jupiter-Only (Safe)**
```bash
# Proven profitable strategy
# No Flash Trade needed
# Works right now
```

**Which would you like to try first?** 🎯
