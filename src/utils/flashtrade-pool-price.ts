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
  try {
    const client = getFlashClient(connection);
    const poolConfig = getPoolConfig();

    // Load address lookup table
    await client.loadAddressLookupTable(poolConfig);

    // Get pool account using the SDK's getPool method
    const poolAccount = await client.getPool(poolConfig.poolName);
    
    if (!poolAccount) {
      logger.error(`Failed to load pool account for ${poolConfig.poolName}`);
      return null;
    }

    // Find custody configs for USDC and target token
    const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    const usdcCustodyConfig = poolConfig.custodies.find((c: any) => 
      c.mintKey.toString() === usdcMint.toString()
    );

    const tokenCustodyConfig = poolConfig.custodies.find((c: any) => 
      c.symbol === tokenSymbol
    );

    if (!usdcCustodyConfig || !tokenCustodyConfig) {
      logger.error(`Custody config not found for ${tokenSymbol} or USDC`);
      return null;
    }

    // Fetch custody account data from the blockchain
    const usdcCustodyKey = client.getCustodyKey(poolConfig.poolName, usdcMint);
    const tokenCustodyKey = client.getCustodyKey(poolConfig.poolName, tokenCustodyConfig.mintKey);

    // @ts-ignore - Access the program account
    const [usdcCustodyData, tokenCustodyData] = await Promise.all([
      client.program.account.custody.fetch(usdcCustodyKey),
      client.program.account.custody.fetch(tokenCustodyKey)
    ]);

    if (!usdcCustodyData || !tokenCustodyData) {
      logger.error(`Failed to fetch custody data for ${tokenSymbol}`);
      return null;
    }

    // Amount in USDC (6 decimals)
    const amountIn = new BN(Math.floor(amountUSDC * 1_000_000));

    // Get swap amount and fees using the SDK's method
    // @ts-ignore - Type mismatch between fetched data and expected types
    const result = client.getSwapAmountAndFeesSync(
      amountIn,
      new BN(0), // amountOut = 0 means calculate it
      poolAccount as any,
      usdcCustodyData.oracle as any,
      usdcCustodyData.oracle as any, // Use same for EMA
      usdcCustodyData as any,
      tokenCustodyData.oracle as any,
      tokenCustodyData.oracle as any, // Use same for EMA
      tokenCustodyData as any,
      poolAccount.maxAumUsd,
      poolConfig
    );

    // Convert to human readable
    const tokenDecimals = tokenCustodyConfig.decimals;
    const amountOut = result.minAmountOut.toNumber() / Math.pow(10, tokenDecimals);
    const price = amountUSDC / amountOut;

    logger.debug(`Flash Trade pool price for ${tokenSymbol}: $${price.toFixed(2)} (${amountOut.toFixed(6)} tokens for $${amountUSDC})`);

    return {
      price,
      amountOut
    };

  } catch (error: any) {
    logger.debug(`Error getting Flash Trade pool price for ${tokenSymbol}: ${error.message}`);
    return null;
  }
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
