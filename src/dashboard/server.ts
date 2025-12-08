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
    const dataPath = path.join(config.dataDir, 'opportunities.json');
    
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf-8');
      const opportunities = JSON.parse(data);
      
      res.json({
        success: true,
        count: opportunities.length,
        opportunities: opportunities
      });
    } else {
      res.json({
        success: true,
        count: 0,
        opportunities: [],
        message: 'No data yet. Start monitoring to collect opportunities.'
      });
    }
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
    const dataPath = path.join(config.dataDir, 'opportunities.json');
    
    if (!fs.existsSync(dataPath)) {
      return res.json({
        success: true,
        stats: {
          totalOpportunities: 0,
          todayOpportunities: 0,
          avgSpread: 0,
          maxSpread: 0,
          totalProfit: 0
        }
      });
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

    res.json({
      success: true,
      stats: {
        totalOpportunities,
        todayOpportunities,
        avgSpread: parseFloat(avgSpread.toFixed(2)),
        maxSpread: parseFloat(maxSpread.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2))
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
  res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
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
