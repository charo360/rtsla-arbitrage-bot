import express from 'express';
import path from 'path';
import fs from 'fs';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// API endpoint to get opportunities
app.get('/api/opportunities', (req, res) => {
  try {
    // Try multi-token data first, fallback to single token
    const multiTokenPath = path.join(config.dataDir, 'multi-token-opportunities.json');
    const singleTokenPath = path.join(config.dataDir, 'opportunities.json');
    
    let dataPath = multiTokenPath;
    let isMultiToken = true;
    
    if (!fs.existsSync(multiTokenPath)) {
      if (fs.existsSync(singleTokenPath)) {
        dataPath = singleTokenPath;
        isMultiToken = false;
      } else {
        return res.json({
          success: true,
          count: 0,
          opportunities: [],
          isMultiToken: false,
          message: 'No data yet. Start monitoring to collect opportunities.'
        });
      }
    }
    
    const data = fs.readFileSync(dataPath, 'utf-8');
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
  } catch (error: any) {
    logger.error('Error serving opportunities:', error);
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
    const multiTokenPath = path.join(config.dataDir, 'multi-token-opportunities.json');
    const singleTokenPath = path.join(config.dataDir, 'opportunities.json');
    
    let dataPath = multiTokenPath;
    if (!fs.existsSync(multiTokenPath)) {
      if (fs.existsSync(singleTokenPath)) {
        dataPath = singleTokenPath;
      } else {
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

    const data = fs.readFileSync(dataPath, 'utf-8');
    const opportunities = JSON.parse(data);

    // Calculate stats
    const totalOpportunities = opportunities.length;
    
    // Today's opportunities
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOpportunities = opportunities.filter((opp: any) => 
      new Date(opp.timestamp) >= today
    ).length;

    // Spread stats
    const avgSpread = opportunities.reduce((sum: number, opp: any) => 
      sum + opp.spreadPercent, 0
    ) / totalOpportunities;
    
    const maxSpread = Math.max(...opportunities.map((opp: any) => opp.spreadPercent));
    
    // Profit
    const totalProfit = opportunities.reduce((sum: number, opp: any) => 
      sum + opp.estimatedProfit, 0
    );

    // Stats by token (for multi-token)
    const byToken: any = {};
    opportunities.forEach((opp: any) => {
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
  } catch (error: any) {
    logger.error('Error calculating stats:', error);
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
      minSpread: config.minSpreadPercent,
      tradeAmount: config.tradeAmountUsdc,
      pollInterval: config.pollIntervalMs,
      autoExecute: config.autoExecute
    },
    timestamp: Date.now()
  });
});

// Serve dashboard
app.get('/', (req, res) => {
  // Check if multi-token data exists, serve appropriate dashboard
  const multiTokenPath = path.join(config.dataDir, 'multi-token-opportunities.json');
  const dashboardFile = fs.existsSync(multiTokenPath) ? 'dashboard-multi.html' : 'dashboard.html';
  res.sendFile(path.join(__dirname, '..', '..', dashboardFile));
});

// Start server
export function startDashboard() {
  app.listen(PORT, () => {
    logger.info(`📊 Dashboard available at: http://localhost:${PORT}`);
    logger.info(`   Open this URL in your browser to view the dashboard`);
  });
}

// If run directly
if (require.main === module) {
  startDashboard();
}
