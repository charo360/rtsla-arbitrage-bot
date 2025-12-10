"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlashTradeIntegration = void 0;
exports.getFlashTradeUrl = getFlashTradeUrl;
exports.isFlashTradeProgram = isFlashTradeProgram;
const web3_js_1 = require("@solana/web3.js");
const config_1 = require("../config/config");
const logger_1 = require("./logger");
class FlashTradeIntegration {
    constructor() {
        this.connection = new web3_js_1.Connection(config_1.config.rpcUrl, 'confirmed');
    }
    /**
     * Get Flash Trade pool data
     * This includes the oracle price (Pyth NASDAQ price)
     */
    async getPoolData() {
        try {
            if (!config_1.config.platforms.flashTradePool) {
                logger_1.logger.warn('Flash Trade pool address not configured');
                return null;
            }
            // Query the Flash Trade pool account
            const poolAddress = new web3_js_1.PublicKey(config_1.config.platforms.flashTradePool);
            const accountInfo = await this.connection.getAccountInfo(poolAddress);
            if (!accountInfo) {
                logger_1.logger.error('Flash Trade pool account not found');
                return null;
            }
            // TODO: Parse the account data based on Flash Trade's program structure
            // This requires knowing their account data layout
            // For now, return null and use Pyth directly
            logger_1.logger.debug('Flash Trade pool data fetch attempted', {
                poolAddress: poolAddress.toString(),
                dataLength: accountInfo.data.length,
            });
            return null;
        }
        catch (error) {
            logger_1.logger.error('Error fetching Flash Trade pool data:', error);
            return null;
        }
    }
    /**
     * Check if Flash Trade pool is accessible
     */
    async isPoolAccessible() {
        try {
            if (!config_1.config.platforms.flashTradePool) {
                return false;
            }
            const poolAddress = new web3_js_1.PublicKey(config_1.config.platforms.flashTradePool);
            const accountInfo = await this.connection.getAccountInfo(poolAddress);
            return accountInfo !== null;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Estimate swap output on Flash Trade
     * Uses oracle price (Pyth) for calculation
     */
    estimateSwapOutput(inputAmount, inputToken, oraclePrice) {
        if (inputToken === 'USDC') {
            // Buying TSLAr with USDC at oracle price
            return inputAmount / oraclePrice;
        }
        else {
            // Selling TSLAr for USDC at oracle price
            return inputAmount * oraclePrice;
        }
    }
    /**
     * Calculate fees for Flash Trade swap
     */
    calculateFees(swapAmount) {
        // Flash Trade typically charges ~0.02% for swaps
        const tradingFee = swapAmount * 0.0002;
        return {
            tradingFee,
            total: tradingFee,
        };
    }
}
exports.FlashTradeIntegration = FlashTradeIntegration;
/**
 * Helper to format Flash Trade URL for a specific pair
 */
function getFlashTradeUrl(pair = 'TSLAr/USDC') {
    return `https://flash.trade/trade/${pair}`;
}
/**
 * Helper to check if address is valid Flash Trade program
 */
function isFlashTradeProgram(programId) {
    try {
        const pubkey = new web3_js_1.PublicKey(programId);
        return pubkey.toString() === config_1.config.platforms.flashTradeProgramId;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=flash-trade.js.map