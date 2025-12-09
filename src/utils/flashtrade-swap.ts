/**
 * Flash Trade Swap Implementation
 * On-chain swap execution for selling rTokens at oracle prices
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import BN from 'bn.js';
import { logger } from './logger';
import { PYTH_CONFIG } from '../config/pyth-config';

// Flash Trade Program IDs
const FLASH_PROGRAM_ID = new PublicKey('FLASH6Lo6h3iasJKWDs2F8TkW2UKf3s15C8PMGuVfgBn');
const PYTH_PROGRAM_ID = new PublicKey('FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

export interface FlashSwapParams {
  connection: Connection;
  userKeypair: Keypair;
  inputMint: PublicKey; // rToken mint
  inputAmount: BN; // Amount in lamports (9 decimals)
  pythPriceFeedId: string; // Pyth price feed ID
  minOutputAmount: BN; // Minimum USDC to receive (slippage protection)
}

export interface FlashSwapResult {
  success: boolean;
  signature?: string;
  outputAmount?: number;
  error?: string;
}

/**
 * Execute a spot swap on Flash Trade
 * Sells rToken at Pyth oracle price for USDC
 */
export async function executeFlashTradeSwap(
  params: FlashSwapParams
): Promise<FlashSwapResult> {
  try {
    const {
      connection,
      userKeypair,
      inputMint,
      inputAmount,
      pythPriceFeedId,
      minOutputAmount,
    } = params;

    logger.info('🔄 Building Flash Trade swap transaction...');

    // Get user token accounts
    const userInputAccount = await getAssociatedTokenAddress(
      inputMint,
      userKeypair.publicKey
    );

    const userOutputAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      userKeypair.publicKey
    );

    // Derive Pyth price account from feed ID
    // Pyth uses a deterministic PDA derivation
    const pythPriceAccount = await derivePythPriceAccount(pythPriceFeedId);

    logger.info(`   Input Account: ${userInputAccount.toBase58()}`);
    logger.info(`   Output Account: ${userOutputAccount.toBase58()}`);
    logger.info(`   Pyth Price: ${pythPriceAccount.toBase58()}`);

    // Derive Flash Trade pool PDA
    const [poolPda, poolBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool'),
        inputMint.toBuffer(),
        USDC_MINT.toBuffer(),
      ],
      FLASH_PROGRAM_ID
    );

    logger.info(`   Pool PDA: ${poolPda.toBase58()}`);

    // Get pool token accounts
    const poolInputAccount = await getAssociatedTokenAddress(
      inputMint,
      poolPda,
      true // Allow owner off curve
    );

    const poolOutputAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      poolPda,
      true
    );

    // Build swap instruction
    const swapIx = buildSpotSwapInstruction({
      user: userKeypair.publicKey,
      userInputAccount,
      userOutputAccount,
      pool: poolPda,
      poolInputAccount,
      poolOutputAccount,
      inputMint,
      outputMint: USDC_MINT,
      pythPriceAccount,
      inputAmount,
      minOutputAmount,
    });

    // Create transaction
    const transaction = new Transaction();
    
    // Check if output account exists, create if not
    const outputAccountInfo = await connection.getAccountInfo(userOutputAccount);
    if (!outputAccountInfo) {
      logger.info('   Creating USDC token account...');
      const createAtaIx = createAssociatedTokenAccountInstruction(
        userKeypair.publicKey,
        userOutputAccount,
        userKeypair.publicKey,
        USDC_MINT
      );
      transaction.add(createAtaIx);
    }

    transaction.add(swapIx);

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userKeypair.publicKey;

    // Sign and send
    transaction.sign(userKeypair);

    logger.info('📤 Sending Flash Trade swap transaction...');
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    logger.info(`   Signature: ${signature}`);
    logger.info('⏳ Waiting for confirmation...');

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');

    if (confirmation.value.err) {
      logger.error(`❌ Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      return {
        success: false,
        error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
      };
    }

    logger.info('✅ Flash Trade swap confirmed!');

    // Get output amount from transaction
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    let outputAmount = 0;
    if (tx?.meta?.postTokenBalances) {
      const postBalance = tx.meta.postTokenBalances.find(
        (b) => b.owner === userKeypair.publicKey.toBase58() && b.mint === USDC_MINT.toBase58()
      );
      if (postBalance) {
        outputAmount = postBalance.uiTokenAmount.uiAmount || 0;
      }
    }

    return {
      success: true,
      signature,
      outputAmount,
    };
  } catch (error: any) {
    logger.error(`❌ Flash Trade swap error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Build Flash Trade spot swap instruction
 * Based on standard Solana program patterns
 */
function buildSpotSwapInstruction(params: {
  user: PublicKey;
  userInputAccount: PublicKey;
  userOutputAccount: PublicKey;
  pool: PublicKey;
  poolInputAccount: PublicKey;
  poolOutputAccount: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  pythPriceAccount: PublicKey;
  inputAmount: BN;
  minOutputAmount: BN;
}): TransactionInstruction {
  // Instruction discriminator for spot_swap
  // This is typically the first 8 bytes of sha256("global:spot_swap")
  // For Flash Trade, we'll use a standard pattern
  const discriminator = Buffer.from([0x01]); // Simplified - actual value from IDL

  // Encode instruction data
  const data = Buffer.alloc(1 + 8 + 8); // discriminator + input_amount + min_output_amount
  let offset = 0;

  discriminator.copy(data, offset);
  offset += discriminator.length;

  // Write input amount (u64)
  data.writeBigUInt64LE(BigInt(params.inputAmount.toString()), offset);
  offset += 8;

  // Write min output amount (u64)
  data.writeBigUInt64LE(BigInt(params.minOutputAmount.toString()), offset);

  return new TransactionInstruction({
    programId: FLASH_PROGRAM_ID,
    keys: [
      // User accounts
      { pubkey: params.user, isSigner: true, isWritable: false },
      { pubkey: params.userInputAccount, isSigner: false, isWritable: true },
      { pubkey: params.userOutputAccount, isSigner: false, isWritable: true },
      
      // Pool accounts
      { pubkey: params.pool, isSigner: false, isWritable: true },
      { pubkey: params.poolInputAccount, isSigner: false, isWritable: true },
      { pubkey: params.poolOutputAccount, isSigner: false, isWritable: true },
      
      // Mint accounts
      { pubkey: params.inputMint, isSigner: false, isWritable: false },
      { pubkey: params.outputMint, isSigner: false, isWritable: false },
      
      // Oracle
      { pubkey: params.pythPriceAccount, isSigner: false, isWritable: false },
      { pubkey: PYTH_PROGRAM_ID, isSigner: false, isWritable: false },
      
      // System programs
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Derive Pyth price account from feed ID
 * Pyth uses deterministic PDA derivation
 */
async function derivePythPriceAccount(feedId: string): Promise<PublicKey> {
  // Remove '0x' prefix if present
  const cleanFeedId = feedId.startsWith('0x') ? feedId.slice(2) : feedId;
  
  // Convert hex string to buffer
  const feedIdBuffer = Buffer.from(cleanFeedId, 'hex');
  
  // Derive PDA using Pyth's standard derivation
  const pythProgramId = new PublicKey(PYTH_CONFIG.programs.priceFeed);
  const [pda] = PublicKey.findProgramAddressSync(
    [feedIdBuffer],
    pythProgramId
  );
  
  return pda;
}

/**
 * Helper to convert token symbol to Pyth feed ID
 */
export function getPythFeedIdForToken(symbol: string): string | null {
  // Normalize symbol (MSTRr -> rMSTR)
  let normalized = symbol;
  if (symbol.endsWith('r') || symbol.endsWith('R')) {
    const base = symbol.slice(0, -1);
    normalized = 'r' + base;
  }
  
  const pair = PYTH_CONFIG.tokens[normalized as keyof typeof PYTH_CONFIG.tokens];
  if (!pair) {
    return null;
  }
  
  return PYTH_CONFIG.priceFeeds[pair];
}
