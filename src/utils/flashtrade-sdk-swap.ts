/**
 * Flash Trade SDK Swap Implementation
 * Uses the official flash-sdk for spot swaps on Remora pool
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, BN, Wallet } from '@coral-xyz/anchor';
import { PerpetualsClient, PoolConfig } from 'flash-sdk';
import { logger } from './logger';

export interface FlashSDKSwapParams {
  connection: Connection;
  userKeypair: Keypair;
  inputTokenSymbol: string;  // e.g., "MSTRr"
  outputTokenSymbol: string; // e.g., "USDC"
  inputAmount: BN;           // Amount in lamports
  minOutputAmount: BN;       // Minimum output (slippage protection)
}

export interface FlashSDKSwapResult {
  signature: string;
  outputAmount: number;
  success: boolean;
}

/**
 * Execute a spot swap using Flash Trade SDK
 */
export async function executeFlashSDKSwap(
  params: FlashSDKSwapParams
): Promise<FlashSDKSwapResult> {
  try {
    logger.info('🔄 Executing Flash Trade SDK swap...');
    logger.info(`   ${params.inputTokenSymbol} → ${params.outputTokenSymbol}`);
    logger.info(`   Amount: ${params.inputAmount.toString()} lamports`);

    // Create Anchor provider
    const wallet = new Wallet(params.userKeypair);
    const provider = new AnchorProvider(
      params.connection,
      wallet,
      { commitment: 'confirmed' }
    );

    // Flash Trade program IDs
    const FLASH_PROGRAM_ID = new PublicKey('FLASH6Lo6h3iasJKWDs2F8TkW2UKf3s15C8PMGuVfgBn');
    const PERP_COMPOSABILITY_ID = new PublicKey('PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu');
    const FBNFT_REWARD_ID = new PublicKey('FBRWDXSLysNbFQk64MQJcpkXP8e4fjezsGabV8jV7d7o');
    const REWARD_DISTRIBUTION_ID = new PublicKey('FARNT7LL119pmy9vSkN9q1ApZESPaKHuuX5Acz1oBoME');

    // Initialize Perpetuals Client
    // @ts-ignore - Version mismatch between flash-sdk and our @coral-xyz/anchor
    const client = new PerpetualsClient(
      provider as any,
      FLASH_PROGRAM_ID,
      PERP_COMPOSABILITY_ID,
      FBNFT_REWARD_ID,
      REWARD_DISTRIBUTION_ID,
      {
        prioritizationFee: 50000, // 0.00005 SOL
        txConfirmationCommitment: 'confirmed',
      }
    );

    // Get Remora pool config
    const poolConfig = PoolConfig.fromIdsByName('Remora.1', 'mainnet-beta');

    logger.info(`📋 Pool: ${poolConfig.poolName}`);
    logger.info(`📋 Pool Address: ${poolConfig.poolAddress.toString()}`);

    // Execute swap
    logger.info('🔄 Building swap transaction...');
    const { instructions, additionalSigners } = await client.swap(
      params.inputTokenSymbol,
      params.outputTokenSymbol,
      params.inputAmount,
      params.minOutputAmount,
      poolConfig,
      false, // useFeesPool
      true,  // createUserATA
      false, // unWrapSol
      false  // skipBalanceChecks
    );

    logger.info(`📤 Sending swap transaction...`);
    const signature = await client.sendTransaction(instructions, {
      additionalSigners,
    });

    logger.info(`✅ Flash Trade swap executed!`);
    logger.info(`   Signature: ${signature}`);

    // Calculate approximate output (will be refined after confirmation)
    const outputAmount = params.minOutputAmount.toNumber() / 1_000_000; // Convert to USDC

    return {
      signature,
      outputAmount,
      success: true,
    };
  } catch (error: any) {
    logger.error(`❌ Flash Trade SDK swap error: ${error.message}`);
    throw error;
  }
}

/**
 * Get quote for a swap (estimate output amount)
 */
export async function getFlashSDKQuote(
  connection: Connection,
  inputTokenSymbol: string,
  outputTokenSymbol: string,
  inputAmount: BN
): Promise<{ outputAmount: BN; fee: BN }> {
  try {
    // For now, return a simple estimate
    // In production, you'd fetch actual pool state and calculate
    const estimatedOutput = inputAmount.muln(995).divn(1000); // 0.5% fee estimate
    const fee = inputAmount.muln(5).divn(1000);

    return {
      outputAmount: estimatedOutput,
      fee,
    };
  } catch (error: any) {
    logger.error(`❌ Flash Trade quote error: ${error.message}`);
    throw error;
  }
}
