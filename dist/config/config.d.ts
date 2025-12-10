import { PublicKey } from '@solana/web3.js';
export interface Config {
    rpcUrl: string;
    walletPrivateKey: string;
    walletPrivateKeys: string[];
    walletSelectionStrategy: 'round_robin' | 'highest_balance' | 'least_used' | 'random';
    minSpreadPercent: number;
    tradeAmountUsdc: number;
    pollIntervalMs: number;
    maxSlippagePercent: number;
    minProfitThreshold: number;
    tokens: {
        usdc: PublicKey;
        rTSLA: PublicKey | null;
        rCRCL: PublicKey | null;
        rSPY: PublicKey | null;
        rMSTR: PublicKey | null;
        rNVDA: PublicKey | null;
    };
    platforms: {
        remoraPool: string;
        flashTradeProgramId: string;
        flashTradePool: string;
        portFinanceProgramId: string;
        portFinancePool: string;
    };
    pyth: {
        programId: PublicKey;
        tslaFeedId: string;
    };
    pythApiUrl: string;
    birdeyeApiKey: string;
    maxGasPriceLamports: number;
    maxConsecutiveFailures: number;
    logLevel: string;
    enableTelegramAlerts: boolean;
    telegramBotToken: string;
    telegramChatId: string;
    autoExecute: boolean;
    useJitoBundles: boolean;
    maxConcurrentTrades: number;
    retryFailedTransactions: boolean;
    maxRetries: number;
    logsDir: string;
    dataDir: string;
}
export declare const config: Config;
//# sourceMappingURL=config.d.ts.map