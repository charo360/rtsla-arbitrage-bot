# Flash Trade SDK Integration Plan

## 📦 SDK Found!

**Repository:** https://github.com/flash-trade/flash-sdk-rust

This is the official Flash Trade Rust SDK for on-chain interactions.

---

## 🎯 Integration Strategy

Since we're using TypeScript/JavaScript and the SDK is in Rust, we have two options:

### Option 1: Use Anchor IDL (Recommended)
- Extract the IDL (Interface Definition Language) from the Rust SDK
- Use `@coral-xyz/anchor` in TypeScript to interact with the program
- This is the standard approach for Solana programs

### Option 2: Port Key Functions to TypeScript
- Translate the Rust SDK functions to TypeScript
- Use `@solana/web3.js` directly
- More work but gives us full control

---

## 📋 Steps to Integrate

### Step 1: Get the IDL
```bash
# Clone the SDK
git clone https://github.com/flash-trade/flash-sdk-rust
cd flash-sdk-rust

# Build to generate IDL
cargo build-bpf

# IDL will be in target/idl/flash_trade.json
```

### Step 2: Install Anchor
```bash
npm install @coral-xyz/anchor
```

### Step 3: Create Flash Trade Program Client
```typescript
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import idl from './flash_trade_idl.json';

const programId = new PublicKey('FLASH6Lo6h3iasJKWDs2F8TkW2UKf3s15C8PMGuVfgBn');
const program = new Program(idl, programId, provider);

// Use program methods
await program.methods.spotSwap(...)
```

### Step 4: Implement Swap Function
```typescript
async executeFlashTradeSwap(
  userKeypair: Keypair,
  inputMint: PublicKey,
  outputMint: PublicKey,
  amount: number
) {
  const tx = await program.methods
    .spotSwap(new BN(amount))
    .accounts({
      user: userKeypair.publicKey,
      userInputAccount: ...,
      userOutputAccount: ...,
      pool: ...,
      pythPriceAccount: ...,
    })
    .signers([userKeypair])
    .rpc();
    
  return tx;
}
```

---

## 🚀 Quick Start (Without Full SDK)

For now, we can continue with the current approach:
1. ✅ Get Flash Trade quotes (working)
2. ✅ Calculate expected profit (working)
3. ⚠️ Manual sell on Flash Trade website
4. 🔄 Later: Integrate full SDK for automated swaps

This lets you start making money NOW while we work on full automation!

---

## 💡 Recommendation

**Short term (Today):**
- Use current implementation
- Manual Flash Trade sells
- Start capturing arbitrage opportunities

**Medium term (This week):**
- Get Flash Trade IDL
- Integrate Anchor
- Automate Flash Trade swaps

**Long term:**
- Full SDK integration
- Advanced features (limit orders, etc.)
- Multi-hop arbitrage

---

## 📞 Next Steps

1. Should we proceed with manual sells for now?
2. Or should I try to extract the IDL from the SDK?
3. Or would you like to provide the IDL if you have it?

Let me know which approach you prefer! 🚀
