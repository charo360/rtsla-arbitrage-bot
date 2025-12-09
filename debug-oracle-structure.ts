import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, BN } from '@coral-xyz/anchor';
import { PerpetualsClient, PoolConfig, CustodyAccount } from 'flash-sdk';
import dotenv from 'dotenv';

dotenv.config();

const FLASH_PROGRAM_ID = new PublicKey('FLASH6Lo6h3iasJKWDs2F8TkW2UKf3s15C8PMGuVfgBn');
const PERP_COMPOSABILITY_ID = new PublicKey('PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu');
const FBNFT_REWARD_ID = new PublicKey('FBRWDXSLysNbFQk64MQJcpkXP8e4fjezsGabV8jV7d7o');
const REWARD_DISTRIBUTION_ID = new PublicKey('FARNT7LL119pmy9vSkN9q1ApZESPaKHuuX5Acz1oBoME');

async function debugOracleStructure() {
  const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
  
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

  // @ts-ignore
  const client = new PerpetualsClient(
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

  const poolConfig = PoolConfig.fromIdsByName('Remora.1', 'mainnet-beta');
  
  console.log('\n🔍 Loading pool and custody data...\n');
  
  await client.loadAddressLookupTable(poolConfig);
  const poolAccount = await client.getPool(poolConfig.poolName);
  
  // Get TSLA custody
  const tslaCustodyConfig = poolConfig.custodies.find((c: any) => c.symbol === 'TSLAr');
  if (!tslaCustodyConfig) {
    console.error('TSLAr custody not found!');
    return;
  }
  const tslaCustodyKey = client.getCustodyKey(poolConfig.poolName, tslaCustodyConfig.mintKey);
  
  // @ts-ignore
  const tslaCustodyData = await client.program.account.custody.fetch(tslaCustodyKey);
  
  console.log('📊 TSLA Custody Data Structure:');
  console.log('================================\n');
  
  // Print all fields
  for (const [key, value] of Object.entries(tslaCustodyData)) {
    console.log(`${key}:`, value);
  }
  
  console.log('\n🔍 Oracle Field Detail:');
  console.log('========================\n');
  console.log('Oracle:', tslaCustodyData.oracle);
  
  // Try to fetch the internal oracle account
  console.log('\n🔍 Fetching Internal Oracle Account...\n');
  const intOracleData = await connection.getAccountInfo(tslaCustodyData.oracle.intOracleAccount);
  
  if (intOracleData) {
    console.log('Internal Oracle Account Size:', intOracleData.data.length, 'bytes');
    console.log('Owner:', intOracleData.owner.toString());
    console.log('First 100 bytes (hex):', intOracleData.data.slice(0, 100).toString('hex'));
    
    // Try to parse as different structures
    console.log('\n📊 Trying to parse internal oracle data:');
    console.log('========================================\n');
    
    // Check if it's a Flash internal oracle
    console.log('This is a Flash internal oracle account');
    console.log('\nTrying different offsets:');
    // Try to read price from different offsets
    for (let offset = 0; offset < Math.min(72, intOracleData.data.length - 8); offset += 8) {
      try {
        const value = intOracleData.data.readBigInt64LE(offset);
        const asInt32_1 = intOracleData.data.readInt32LE(offset);
        const asInt32_2 = intOracleData.data.readInt32LE(offset + 4);
        console.log(`Offset ${offset}: i64=${value} | i32[0]=${asInt32_1} | i32[1]=${asInt32_2}`);
      } catch (e) {
        // Skip
      }
    }
  }
  
  // Try external oracle
  console.log('\n🔍 Fetching External Oracle Account (Pyth)...\n');
  const extOracleData = await connection.getAccountInfo(tslaCustodyData.oracle.extOracleAccount);
  
  if (extOracleData) {
    console.log('External Oracle Account Size:', extOracleData.data.length, 'bytes');
    console.log('Owner:', extOracleData.owner.toString());
    
    // This should be a Pyth oracle
    if (extOracleData.data.length > 200) {
      console.log('\n📊 Parsing Pyth Oracle Data:');
      console.log('============================\n');
      
      // Pyth v2 format offsets
      try {
        const price = extOracleData.data.readBigInt64LE(208);
        const conf = extOracleData.data.readBigUInt64LE(224);
        const expo = extOracleData.data.readInt32LE(216);
        const publishTime = extOracleData.data.readBigInt64LE(240);
        
        console.log('Price (raw):', price.toString());
        console.log('Exponent:', expo);
        console.log('Confidence:', conf.toString());
        console.log('Publish Time:', new Date(Number(publishTime) * 1000).toISOString());
        
        const actualPrice = Number(price) * Math.pow(10, expo);
        console.log('\n💰 Calculated Price: $', actualPrice.toFixed(2));
      } catch (e: any) {
        console.log('Error parsing Pyth data:', e.message);
      }
    }
  }
  
  console.log('\n✅ Debug complete!\n');
}

debugOracleStructure().catch(console.error);
