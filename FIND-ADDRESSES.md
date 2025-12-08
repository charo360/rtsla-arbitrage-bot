# 🔍 HOW TO FIND CONTRACT ADDRESSES

**This guide shows you exactly how to find all the addresses needed for the bot.**

---

## 📋 What You Need to Find

```
✅ TSLAr Token Mint Address
✅ Flash Trade Program ID
✅ Flash Trade Pool Address  
✅ Pyth TSLA Price Feed ID
✅ Remora Pool Address
✅ Port Finance Addresses
```

---

## 1️⃣ Finding TSLAr Token Mint Address

### Method A: Via Solscan (Easiest)

**Step 1:** Go to https://solscan.io/

**Step 2:** In search bar, try these searches:
```
TSLAr
Tesla tokenized
Tesla token
rTSLA
```

**Step 3:** Look for token with:
- Name: TSLAr or similar
- Symbol: TSLAr
- Decimals: 6 or 9
- Supply: Should be reasonable (not billions)

**Step 4:** Copy the **Token Address** (mint address)

**Example format:**
```
8qJSyQprMC57TWKaYEmetUR3UUiTP2M3hXdcvFhkZdmv
```

### Method B: Via Flash Trade Transaction

**Step 1:** Go to https://flash.trade/

**Step 2:** Make a tiny swap (even $1 worth)
- Connect Phantom wallet
- Swap USDC → TSLAr
- Execute transaction

**Step 3:** View transaction in Phantom
- Click on recent transaction
- Click "View on Solscan"

**Step 4:** In Solscan transaction details:
- Look for "Token Transfers" section
- Find TSLAr token
- Click on it
- Copy the mint address

### Method C: Check Flash Trade Documentation

**Step 1:** Visit https://docs.flash.trade/ (if available)

**Step 2:** Look for:
- Supported Assets
- Token Addresses
- Contract Addresses

**Step 3:** Find TSLAr mint address

---

## 2️⃣ Finding Pyth TSLA Price Feed ID

### Official Pyth Price Feed IDs

**Step 1:** Go to https://pyth.network/developers/price-feed-ids

**Step 2:** Search for "TSLA" or "Tesla"

**Step 3:** Copy the **Price Feed ID** (hex format)

**Example format:**
```
0x16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1
```

### Alternative: Pyth API

**Step 1:** Query Pyth API:
```bash
curl "https://hermes.pyth.network/api/price_feed_ids"
```

**Step 2:** Search JSON response for:
```
"symbol": "Equity.US.TSLA/USD"
```

**Step 3:** Copy the corresponding `id` field

---

## 3️⃣ Finding Flash Trade Addresses

### Method A: Transaction Inspection (Most Reliable)

**Step 1:** Make a small swap on Flash Trade
- Amount: $1-5 USDC
- Record transaction signature

**Step 2:** View on Solscan
```
https://solscan.io/tx/YOUR_TRANSACTION_SIGNATURE
```

**Step 3:** Find addresses in transaction:

**Program ID (Flash Trade):**
- Look for "Program" section
- Find the main program (not Token Program or System Program)
- This is Flash Trade's program ID

**Pool Address:**
- Look for "Account Inputs" section
- Find accounts that:
  - Are not your wallet
  - Are not token accounts
  - Have significant data size
- This is likely the pool address

**Example transaction structure:**
```
Program: FLASHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (Flash Trade)
  └─ Account: POOLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (Pool)
      └─ Token Transfer: TSLAr → Your Wallet
```

### Method B: Flash Trade Documentation

**Check these URLs:**
```
https://docs.flash.trade/
https://docs.flash.trade/contracts
https://docs.flash.trade/developers
https://flash.trade/developers (if exists)
```

**Look for:**
- Contract Addresses
- Program IDs
- Pool Addresses
- Developer Documentation

### Method C: Flash Trade Discord/Twitter

**Discord:**
- Join Flash Trade Discord (if available)
- Check #announcements or #contracts channels
- Ask in #support channel

**Twitter:**
- Search: @FlashTrade contract addresses
- Check pinned tweets
- Check recent announcements

---

## 4️⃣ Finding Remora Pool Address

### Method A: Remora Markets Website

**Step 1:** Go to https://remoramarkets.xyz/ (with VPN!)

**Step 2:** Connect Phantom wallet

**Step 3:** Navigate to TSLAr pool

**Step 4:** Check browser developer console
```
F12 → Network tab → Look for API calls
Find calls containing "pool" or "tsla"
Pool address should be in response
```

### Method B: Make a Test Swap

**Step 1:** Swap small amount on Remora ($1-2)

**Step 2:** View transaction on Solscan

**Step 3:** Find Remora program and pool in transaction details

**Example:**
```
Program: REMORxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  └─ Pool: poolxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 5️⃣ Finding Port Finance Addresses

### Official Port Finance Addresses

**Website:** https://port.finance/

**Documentation:** https://docs.port.finance/

**Known addresses (Mainnet):**
```
Program ID: Port7uDYB3wk6GJAw4KT1WpTeMtSu9bTcChBHkX2LfR
Pool varies by asset
```

### Finding Specific USDC Pool

**Step 1:** Visit https://docs.port.finance/developers/contract-addresses

**Step 2:** Look for USDC lending pool

**Step 3:** Copy pool address for USDC

---

## 📝 Verification Checklist

After finding addresses, verify they're correct:

### TSLAr Mint Address
```bash
# Check on Solscan
https://solscan.io/token/YOUR_TSLA_ADDRESS

✅ Name contains "Tesla" or "TSLAr"
✅ Has actual supply (not 0)
✅ Has holders
✅ Has trading activity
```

### Flash Trade Program
```bash
# Check on Solscan  
https://solscan.io/account/YOUR_PROGRAM_ID

✅ Account type: Program
✅ Has transactions
✅ Related to TSLAr swaps
```

### Pyth Price Feed
```bash
# Test with Pyth API
curl "https://hermes.pyth.network/api/latest_price_feeds?ids[]=YOUR_FEED_ID"

✅ Returns price data
✅ Symbol is TSLA/USD
✅ Price matches current Tesla stock price
```

---

## 🎯 Final Configuration

Once you have all addresses, update `.env`:

```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env and add:
RTSLA_MINT_ADDRESS=8qJSyQprMC57TWKaYEmetUR3UUiTP2M3hXdcvFhkZdmv

PYTH_TSLA_FEED_ID=0x16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1

FLASH_TRADE_PROGRAM_ID=FLASHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FLASH_TRADE_POOL_ADDRESS=POOLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

REMORA_POOL_ADDRESS=REMORxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

PORT_FINANCE_PROGRAM_ID=Port7uDYB3wk6GJAw4KT1WpTeMtSu9bTcChBHkX2LfR
PORT_FINANCE_POOL_ADDRESS=POOLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## ⚡ Quick Test

After configuration, test that addresses work:

```bash
# Test price fetching
npm run monitor

# Should see:
# "Pyth oracle price fetched"
# "Flash Trade pool accessible"
# Real price data from NASDAQ
```

---

## 🆘 If You Can't Find an Address

### TSLAr Mint:
**Fallback:** Ask in Flash Trade Discord/Telegram

### Pyth Feed ID:
**Fallback:** Use Yahoo Finance proxy (already implemented)

### Flash Trade Addresses:
**Fallback:** Make test swap and inspect transaction

### Remora Pool:
**Fallback:** Contact Remora support

---

## 📞 Where to Ask for Help

**Flash Trade:**
- Discord: (check their website)
- Twitter: @FlashTrade  
- Docs: https://docs.flash.trade/

**Pyth Network:**
- Discord: https://discord.gg/pythnetwork
- Docs: https://docs.pyth.network/

**Remora Markets:**
- Website: https://remoramarkets.xyz/
- Twitter: @RemoraMarkets

**Port Finance:**
- Discord: https://discord.gg/portfinance
- Docs: https://docs.port.finance/

---

## ✅ Success Criteria

You've found all addresses correctly when:

```
✅ Bot starts without errors
✅ Pyth price matches real Tesla stock price
✅ Flash Trade integration shows "accessible"
✅ Remora pool data fetches successfully
✅ No "address not configured" warnings
```

---

**Good luck finding the addresses! This is the last step before the bot becomes fully functional!** 🚀
