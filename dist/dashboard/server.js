"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDashboard = startDashboard;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../config/config");
const logger_1 = require("../utils/logger");
const app = (0, express_1.default)();
const PORT = process.env.DASHBOARD_PORT || 3000;
// Serve static files
app.use(express_1.default.static(path_1.default.join(__dirname, '..')));
// API endpoint to get opportunities
app.get('/api/opportunities', (req, res) => {
    try {
        // Try multi-token data first, fallback to single token
        const multiTokenPath = path_1.default.join(config_1.config.dataDir, 'multi-token-opportunities.json');
        const singleTokenPath = path_1.default.join(config_1.config.dataDir, 'opportunities.json');
        let dataPath = multiTokenPath;
        let isMultiToken = true;
        if (!fs_1.default.existsSync(multiTokenPath)) {
            if (fs_1.default.existsSync(singleTokenPath)) {
                dataPath = singleTokenPath;
                isMultiToken = false;
            }
            else {
                return res.json({
                    success: true,
                    count: 0,
                    opportunities: [],
                    isMultiToken: false,
                    message: 'No data yet. Start monitoring to collect opportunities.'
                });
            }
        }
        const data = fs_1.default.readFileSync(dataPath, 'utf-8');
        const opportunities = JSON.parse(data);
        // Get latest 100 opportunities
        const latest = opportunities.slice(-100).reverse();
        res.json({
            success: true,
            count: opportunities.length,
            latest: latest.length,
            opportunities: latest,
            isMultiToken: isMultiToken
        });
    }
    catch (error) {
        logger_1.logger.error('Error serving opportunities:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// API endpoint to get latest stats
app.get('/api/stats', (req, res) => {
    try {
        // Try multi-token data first
        const multiTokenPath = path_1.default.join(config_1.config.dataDir, 'multi-token-opportunities.json');
        const singleTokenPath = path_1.default.join(config_1.config.dataDir, 'opportunities.json');
        let dataPath = multiTokenPath;
        if (!fs_1.default.existsSync(multiTokenPath)) {
            if (fs_1.default.existsSync(singleTokenPath)) {
                dataPath = singleTokenPath;
            }
            else {
                return res.json({
                    success: true,
                    stats: {
                        totalOpportunities: 0,
                        todayOpportunities: 0,
                        avgSpread: 0,
                        maxSpread: 0,
                        totalProfit: 0,
                        byToken: {}
                    }
                });
            }
        }
        const data = fs_1.default.readFileSync(dataPath, 'utf-8');
        const opportunities = JSON.parse(data);
        // Calculate stats
        const totalOpportunities = opportunities.length;
        // Today's opportunities
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOpportunities = opportunities.filter((opp) => new Date(opp.timestamp) >= today).length;
        // Spread stats
        const avgSpread = opportunities.reduce((sum, opp) => sum + opp.spreadPercent, 0) / totalOpportunities;
        const maxSpread = Math.max(...opportunities.map((opp) => opp.spreadPercent));
        // Profit
        const totalProfit = opportunities.reduce((sum, opp) => sum + opp.estimatedProfit, 0);
        // Stats by token (for multi-token)
        const byToken = {};
        opportunities.forEach((opp) => {
            const token = opp.token || 'TSLAr';
            if (!byToken[token]) {
                byToken[token] = {
                    count: 0,
                    totalProfit: 0,
                    avgSpread: 0,
                    maxSpread: 0
                };
            }
            byToken[token].count++;
            byToken[token].totalProfit += opp.estimatedProfit;
            byToken[token].avgSpread += opp.spreadPercent;
            byToken[token].maxSpread = Math.max(byToken[token].maxSpread, Math.abs(opp.spreadPercent));
        });
        // Calculate averages
        Object.keys(byToken).forEach(token => {
            byToken[token].avgSpread = parseFloat((byToken[token].avgSpread / byToken[token].count).toFixed(2));
            byToken[token].totalProfit = parseFloat(byToken[token].totalProfit.toFixed(2));
            byToken[token].maxSpread = parseFloat(byToken[token].maxSpread.toFixed(2));
        });
        res.json({
            success: true,
            stats: {
                totalOpportunities,
                todayOpportunities,
                avgSpread: parseFloat(avgSpread.toFixed(2)),
                maxSpread: parseFloat(maxSpread.toFixed(2)),
                totalProfit: parseFloat(totalProfit.toFixed(2)),
                byToken
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error calculating stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// API endpoint to get bot status
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        status: 'running',
        config: {
            minSpread: config_1.config.minSpreadPercent,
            tradeAmount: config_1.config.tradeAmountUsdc,
            pollInterval: config_1.config.pollIntervalMs,
            autoExecute: config_1.config.autoExecute
        },
        timestamp: Date.now()
    });
});
// Serve dashboard
app.get('/', (req, res) => {
    // Check if multi-token data exists, serve appropriate dashboard
    const multiTokenPath = path_1.default.join(config_1.config.dataDir, 'multi-token-opportunities.json');
    const dashboardFile = fs_1.default.existsSync(multiTokenPath) ? 'dashboard-multi.html' : 'dashboard.html';
    res.sendFile(path_1.default.join(__dirname, '..', '..', dashboardFile));
});
// Start server
function startDashboard() {
    app.listen(PORT, () => {
        logger_1.logger.info(`📊 Dashboard available at: http://localhost:${PORT}`);
        logger_1.logger.info(`   Open this URL in your browser to view the dashboard`);
    });
}
// If run directly
if (require.main === module) {
    startDashboard();
}
//# sourceMappingURL=server.js.map