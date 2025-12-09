/**
 * Flash Trade Pool Price Query
 * Gets ACTUAL execution price from Flash Trade pool (not oracle price)
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, BN, Wallet } from '@coral-xyz/anchor';
import { PerpetualsClient, PoolConfig } from 'flash-sdk';
import { logger } from './logger';

const FLASH_PROGRAM_ID = new PublicKey('FLASH6Lo6h3iasJKWDs2F8TkW2UKf3s15C8PMGuVfgBn');
const PERP_COMPOSABILITY_ID = new PublicKey('PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu');
const FBNFT_REWARD_ID = new PublicKey('FBRWDXSLysNbFQk64MQJcpkXP8e4fjezsGabV8jV7d7o');
const REWARD_DISTRIBUTION_ID = new PublicKey('FARNT7LL119pmy9vSkN9q1ApZESPaKHuuX5Acz1oBoME');

let cachedClient: PerpetualsClient | null = null;
let cachedPoolConfig: PoolConfig | null = null;

/**
 * Get or create Flash Trade client
 */
function getFlashClient(connection: Connection): PerpetualsClient {
  if (cachedClient) {
    return cachedClient;
  }

  // Create a dummy wallet for read-only operations
  const dummyKeypair = new Uint8Array(64);
  const wallet = {
    publicKey: PublicKey.default,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };

  const provider = new AnchorProvider(
    connection,
    wallet as any,
    { commitment: 'confirmed' }
  );

  // @ts-ignore - Version mismatch
  cachedClient = new PerpetualsClient(
    provider as any,
    FLASH_PROGRAM_ID,
    PERP_COMPOSABILITY_ID,
    FBNFT_REWARD_ID,
    REWARD_DISTRIBUTION_ID,
    {
      prioritizationFee: 50000,
      txConfirmationCommitment: 'confirmed',
    }
  );

  return cachedClient;
}

/**
 * Get pool config
 */
function getPoolConfig(): PoolConfig {
  if (cachedPoolConfig) {
    return cachedPoolConfig;
  }

  cachedPoolConfig = PoolConfig.fromIdsByName('Remora.1', 'mainnet-beta');
  return cachedPoolConfig;
}

/**
 * Get actual Flash Trade pool execution price for a token
 * This returns what you'll ACTUALLY get, not the oracle price
 */
export async function getFlashTradePoolPrice(
  connection: Connection,
  tokenSymbol: string,
  amountUSDC: number = 10
): Promise<{ price: number; amountOut: number } | null> {
  // TODO: Implement proper Flash SDK pool price query
  // For now, return null to fall back to oracle price
  // This needs proper Flash SDK API study
  logger.debug(`Pool price query not yet implemented for ${tokenSymbol}, using oracle price`);
  return null;
}

/**
 * Get Flash Trade sell price (token → USDC)
 * This is what you'll actually receive when selling tokens
 */
export async function getFlashTradeSellPrice(
  connection: Connection,
  tokenSymbol: string,
  tokenAmount: number
): Promise<{ price: number; usdcOut: number } | null> {
  // TODO: Implement proper Flash SDK sell price query
  // For now, return null to fall back to oracle price
  logger.debug(`Sell price query not yet implemented for ${tokenSymbol}, using oracle price`);
  return null;
}
