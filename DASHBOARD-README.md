# 📊 Dashboard Guide

## Overview

The arbitrage bot includes a beautiful, real-time web dashboard to monitor opportunities across all tokens.

## Features

### 🎯 Real-Time Monitoring
- **Live Updates**: Auto-refreshes every 10 seconds
- **Multi-Token Support**: Monitors TSLAr, CRCLr, SPYr, MSTRr, NVDAr
- **Beautiful UI**: Modern gradient design with glassmorphism effects

### 📈 Statistics Display
- **Total Opportunities**: All-time opportunity count
- **Today's Opportunities**: Last 24 hours
- **Average Spread**: Across all tokens
- **Total Estimated Profit**: Potential earnings

### 🔍 Token-Specific Stats
Each token displays:
- Number of opportunities
- Average spread percentage
- Maximum spread detected
- Total estimated profit

### 🎨 Visual Features
- **Color-Coded Tokens**: Each token has a unique color
- **Direction Indicators**: Buy/Sell badges
- **Profit Highlighting**: Green for positive, red for negative
- **Spread Highlighting**: High spreads highlighted in green

### 🛠️ Interactive Controls
- **Refresh Button**: Manually update data
- **Export CSV**: Download all opportunities
- **Clear Display**: Reset the view
- **Token Filter**: View specific tokens
- **Spread Filter**: Filter by minimum spread

---

## Starting the Dashboard

### Method 1: With Multi-Token Bot (Recommended)

The dashboard automatically starts when you run the multi-token bot:

```bash
npm run multi
```

Then open: **http://localhost:3000**

### Method 2: Standalone Dashboard

Run just the dashboard server:

```bash
npm run dashboard
```

Then open: **http://localhost:3000**

### Method 3: Custom Port

Set a custom port in your `.env`:

```bash
DASHBOARD_PORT=8080
```

Then access at: **http://localhost:8080**

---

## Dashboard Views

### Main Dashboard (`dashboard-multi.html`)

**Features:**
- Multi-token support
- Token-specific statistics
- Advanced filtering
- Color-coded tokens
- Real-time updates

**Best for:**
- Monitoring multiple tokens simultaneously
- Comparing performance across tokens
- Detailed analysis

### Legacy Dashboard (`dashboard.html`)

**Features:**
- Single token (TSLAr) focus
- Simpler interface
- Basic statistics

**Best for:**
- Single token monitoring
- Lightweight view

---

## Using the Dashboard

### 1. View Opportunities

The main table shows:
- **Time**: When opportunity was detected
- **Token**: Which tokenized stock
- **Remora Price**: DEX price
- **Oracle Price**: Real market price
- **Spread**: Price difference percentage
- **Est. Profit**: Potential profit in USDC
- **Direction**: Buy or sell action

### 2. Filter Data

**By Token:**
```
Select from dropdown:
- All Tokens
- TSLAr (Tesla)
- CRCLr (Circle)
- SPYr (S&P 500)
- MSTRr (MicroStrategy)
- NVDAr (Nvidia)
```

**By Spread:**
```
Select minimum spread:
- All
- ≥ 0.5%
- ≥ 0.8%
- ≥ 1.0%
- ≥ 1.5%
- ≥ 2.0%
```

### 3. Export Data

Click **"📥 Export CSV"** to download all opportunities as a CSV file.

**CSV includes:**
- Timestamp
- Token
- Remora Price
- Oracle Price
- Spread %
- Estimated Profit
- Direction

### 4. Refresh Data

- **Auto-refresh**: Every 10 seconds automatically
- **Manual refresh**: Click "🔄 Refresh Data" button

---

## API Endpoints

The dashboard server provides these API endpoints:

### GET `/api/opportunities`

Returns latest opportunities (last 100).

**Response:**
```json
{
  "success": true,
  "count": 150,
  "latest": 100,
  "opportunities": [...],
  "isMultiToken": true
}
```

### GET `/api/stats`

Returns aggregated statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalOpportunities": 150,
    "todayOpportunities": 45,
    "avgSpread": 1.23,
    "maxSpread": 2.45,
    "totalProfit": 125.50,
    "byToken": {
      "TSLAr": {
        "count": 30,
        "avgSpread": 1.15,
        "maxSpread": 2.10,
        "totalProfit": 35.20
      },
      ...
    }
  }
}
```

### GET `/api/status`

Returns bot configuration and status.

**Response:**
```json
{
  "success": true,
  "status": "running",
  "config": {
    "minSpread": 0.8,
    "tradeAmount": 100,
    "pollInterval": 10000,
    "autoExecute": false
  },
  "timestamp": 1234567890
}
```

---

## Customization

### Change Dashboard Port

In `.env`:
```bash
DASHBOARD_PORT=3000
```

### Modify Auto-Refresh Interval

In `dashboard-multi.html`, line ~650:
```javascript
// Change 10000 (10 seconds) to your preferred interval
setInterval(loadData, 10000);
```

### Customize Colors

In `dashboard-multi.html`, modify the CSS:
```css
/* Token colors */
.token-card.TSLAr { border-left-color: #ef4444; }
.token-card.CRCLr { border-left-color: #3b82f6; }
/* ... add your colors ... */
```

### Add New Filters

Add to the filter bar in `dashboard-multi.html`:
```html
<select id="yourFilter" onchange="filterOpportunities()">
    <option value="all">All</option>
    <!-- Add options -->
</select>
```

---

## Troubleshooting

### Dashboard Not Loading

**Problem:** Page shows "Cannot GET /"

**Solution:**
1. Make sure bot is running: `npm run multi`
2. Check port is correct: `http://localhost:3000`
3. Check console for errors

### No Data Showing

**Problem:** Dashboard loads but shows "No opportunities found"

**Solution:**
1. Bot needs to run and detect opportunities first
2. Check `data/multi-token-opportunities.json` exists
3. Wait for bot to collect data (may take a few minutes)

### API Errors

**Problem:** "Error loading data"

**Solution:**
1. Ensure dashboard server is running
2. Check `src/dashboard/server.ts` compiled correctly
3. Run `npm run build` to recompile

### Port Already in Use

**Problem:** "Port 3000 already in use"

**Solution:**
1. Change port in `.env`: `DASHBOARD_PORT=8080`
2. Or kill process using port 3000:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

---

## Performance Tips

### For Large Datasets

If you have thousands of opportunities:

1. **Limit Display**: Dashboard shows last 100 by default
2. **Use Filters**: Filter by token or spread to reduce data
3. **Export Old Data**: Export and clear old opportunities
4. **Increase Refresh Interval**: Reduce auto-refresh frequency

### Browser Performance

- **Use Modern Browser**: Chrome, Firefox, Edge (latest versions)
- **Close Unused Tabs**: Free up memory
- **Disable Extensions**: Some extensions may interfere

---

## Mobile Access

### Access from Phone/Tablet

1. Find your computer's IP address:
   ```bash
   # Windows
   ipconfig
   # Look for IPv4 Address
   ```

2. On mobile browser, go to:
   ```
   http://YOUR_IP_ADDRESS:3000
   ```

3. Make sure firewall allows connections on port 3000

### Responsive Design

The dashboard is responsive and works on:
- ✅ Desktop (1920x1080+)
- ✅ Laptop (1366x768+)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667+)

---

## Security Notes

### Local Network Only

By default, dashboard is accessible only on localhost.

To allow network access, modify `server.ts`:
```typescript
app.listen(PORT, '0.0.0.0', () => {
  // Now accessible from network
});
```

⚠️ **Warning**: Only do this on trusted networks!

### No Authentication

Dashboard has no authentication by default.

To add basic auth, install `express-basic-auth`:
```bash
npm install express-basic-auth
```

Then in `server.ts`:
```typescript
import basicAuth from 'express-basic-auth';

app.use(basicAuth({
  users: { 'admin': 'your-password' },
  challenge: true
}));
```

---

## Advanced Features

### WebSocket Support (Future)

For real-time updates without polling, consider adding WebSocket support:

```typescript
import { Server } from 'socket.io';
// Emit opportunities as they're detected
```

### Historical Charts

Add charting library like Chart.js:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

Then create spread/profit charts over time.

### Alerts

Add browser notifications:

```javascript
if (opp.spreadPercent > 2.0) {
  new Notification('High Spread Alert!', {
    body: `${opp.token}: ${opp.spreadPercent}%`
  });
}
```

---

## Screenshots

### Main View
- Overview statistics
- Token-specific cards
- Opportunities table

### Filtered View
- Single token display
- High spread opportunities only

### Mobile View
- Responsive layout
- Touch-friendly controls

---

## Contributing

Want to improve the dashboard?

1. Fork the repository
2. Create a feature branch
3. Make your changes to `dashboard-multi.html` or `server.ts`
4. Test thoroughly
5. Submit a pull request

---

## Support

**Issues?**
- Check this guide first
- Review console errors (F12 in browser)
- Check bot logs in `logs/` directory
- Open an issue on GitHub

**Feature Requests?**
- Open an issue with [Feature Request] tag
- Describe the feature and use case
- Include mockups if possible

---

## Summary

The dashboard provides:
- ✅ Real-time monitoring
- ✅ Multi-token support
- ✅ Beautiful, modern UI
- ✅ Interactive filtering
- ✅ CSV export
- ✅ Auto-refresh
- ✅ Mobile responsive
- ✅ Easy to use

**Start monitoring:** `npm run multi` → Open `http://localhost:3000` 🚀
