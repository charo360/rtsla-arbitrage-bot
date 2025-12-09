/**
 * Script to sell rTokens back to USDC via Jupiter
 * This recovers funds from failed Flash.trade sells
 */

const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
const axios = require('axios');
const bs58 = require('bs58');
require('dotenv').config();

const JUPITER_API = 'https://public.jupiterapi.com';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Token mints (from .env - these are the correct mainnet addresses)
const TOKENS = {
  'CRCLr': process.env.CRCL_MINT_ADDRESS || '5fKr9joRHpioriGmMgRVFdmZge8EVUTbrWyxDVdSrcuG',
  'TSLAr': process.env.RTSLA_MINT_ADDRESS || 'FJug3z58gssSTDhVNkTse5fP8GRZzuidf9SRtfB2RhDe',
  'NVDAr': process.env.NVDA_MINT_ADDRESS || 'ALTP6gug9wv5mFtx2tSU1YYZ1NrEc2chDdMPoJA8f8pu',
  'MSTRr': process.env.MSTR_MINT_ADDRESS || 'B8GKqTDGYc7F6udTHjYeazZ4dFCRkrwK2mBQNS4igqTv',
  'SPYr': process.env.SPY_MINT_ADDRESS || 'AVw2QGVkXJPRPRjLAceXVoLqU5DVtJ53mdgMXp14yGit'
};

// Token program IDs
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

async function main() {
  const connection = new Connection(process.env.SOLANA_RPC_URL || process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');

  // Load wallet - try WALLET_1 first, then WALLET_PRIVATE_KEY
  const privateKey = process.env.WALLET_1 || process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) {
    console.error('No WALLET_1 or WALLET_PRIVATE_KEY in .env');
    return;
  }

  // Handle both base58 and JSON array formats
  let keypair;
  if (privateKey.startsWith('[')) {
    keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(privateKey)));
  } else {
    keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  }
  console.log(`Wallet: ${keypair.publicKey.toBase58()}`);
  
  // Check all token balances
  console.log('\n📊 Checking token balances...\n');
  
  for (const [symbol, mintStr] of Object.entries(TOKENS)) {
    const mint = new PublicKey(mintStr);

    try {
      // Check both SPL Token and Token-2022 programs (rStocks use Token-2022)
      const [splAccounts, token2022Accounts] = await Promise.all([
        connection.getTokenAccountsByOwner(keypair.publicKey, { mint, programId: TOKEN_PROGRAM_ID }),
        connection.getTokenAccountsByOwner(keypair.publicKey, { mint, programId: TOKEN_2022_PROGRAM_ID })
      ]);
      const accounts = { value: [...splAccounts.value, ...token2022Accounts.value] };
      
      if (accounts.value.length > 0) {
        const data = accounts.value[0].account.data;
        const amount = data.readBigUInt64LE(64);
        const balance = Number(amount) / 1_000_000_000;
        
        if (balance > 0) {
          console.log(`${symbol}: ${balance.toFixed(6)} tokens`);
          
          // Get quote to sell
          const amountIn = amount.toString();
          const quoteUrl = `${JUPITER_API}/quote?inputMint=${mintStr}&outputMint=${USDC_MINT}&amount=${amountIn}&slippageBps=100`;
          
          try {
            const quoteRes = await axios.get(quoteUrl);
            const quote = quoteRes.data;
            const usdcOut = Number(quote.outAmount) / 1_000_000;
            console.log(`   → Can sell for ~$${usdcOut.toFixed(2)} USDC`);
            
            // Ask to sell
            console.log(`   → Selling ${symbol}...`);
            
            // Remove platformFee if present
            if (quote.platformFee) {
              delete quote.platformFee;
            }
            
            // Get swap transaction
            const swapRes = await axios.post(`${JUPITER_API}/swap`, {
              quoteResponse: quote,
              userPublicKey: keypair.publicKey.toBase58(),
              wrapAndUnwrapSol: true,
              dynamicComputeUnitLimit: true,
              prioritizationFeeLamports: {
                priorityLevelWithMaxLamports: {
                  maxLamports: 1000000,
                  priorityLevel: 'high'
                }
              }
            });
            
            const { swapTransaction } = swapRes.data;
            
            // Deserialize and sign
            const txBuffer = Buffer.from(swapTransaction, 'base64');
            const { VersionedTransaction } = require('@solana/web3.js');
            const tx = VersionedTransaction.deserialize(txBuffer);
            tx.sign([keypair]);
            
            // Send
            const sig = await connection.sendRawTransaction(tx.serialize(), {
              skipPreflight: true,
              maxRetries: 3
            });
            console.log(`   → Sent: ${sig}`);
            
            // Confirm
            const confirmation = await connection.confirmTransaction(sig, 'confirmed');
            if (confirmation.value.err) {
              console.log(`   ❌ Failed: ${JSON.stringify(confirmation.value.err)}`);
            } else {
              console.log(`   ✅ Confirmed! Received ~$${usdcOut.toFixed(2)} USDC`);
            }
            
          } catch (err) {
            console.log(`   ❌ Error: ${err.message}`);
          }
        }
      }
    } catch (err) {
      // No account for this token
    }
  }
  
  // Check final USDC balance
  console.log('\n📊 Final USDC balance...');
  const usdcMint = new PublicKey(USDC_MINT);
  const usdcAta = await getAssociatedTokenAddress(usdcMint, keypair.publicKey);
  try {
    const balance = await connection.getTokenAccountBalance(usdcAta);
    console.log(`USDC: $${balance.value.uiAmountString}`);
  } catch (err) {
    console.log('No USDC account');
  }
}

main().catch(console.error);

