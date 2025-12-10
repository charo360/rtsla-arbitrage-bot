import winston from 'winston';
export declare const logger: winston.Logger;
export declare const logOpportunity: (data: any) => void;
export declare const logTrade: (data: any) => void;
export declare const logError: (message: string, error: any) => void;
export declare const logStartup: (mode: "monitor" | "trade") => void;
export default logger;
//# sourceMappingURL=logger.d.ts.map