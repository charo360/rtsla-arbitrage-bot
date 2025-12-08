# 🧪 Testing the Dashboard

## Quick Start

### 1. Start the Multi-Token Bot with Dashboard

```bash
npm run multi
```

This will:
- ✅ Start monitoring all 5 tokens (TSLAr, CRCLr, SPYr, MSTRr, NVDAr)
- ✅ Start the dashboard server on port 3000
- ✅ Begin collecting opportunity data

### 2. Open the Dashboard

Open your browser and go to:
```
http://localhost:3000
```

You should see:
- 📊 Statistics cards at the top
- 🎨 Token-specific stats (once data is collected)
- 📋 Opportunities table
- 🔄 Auto-refresh every 10 seconds

---

## What to Expect

### First Launch (0-5 minutes)

**Dashboard will show:**
```
Total Opportunities: 0
Today's Opportunities: 0
Average Spread: 0.00%
Total Est. Profit: $0.00

Table: "No opportunities found. Start the bot to collect data."
```

**This is normal!** The bot needs time to:
1. Fetch prices from Remora DEX
2. Fetch prices from Yahoo Finance (oracle)
3. Calculate spreads
4. Detect opportunities (spread ≥ 0.8%)

### After 5-10 Minutes

**You should start seeing:**
- Opportunities appearing in the table
- Statistics updating
- Token-specific cards showing data
- Real-time updates every 10 seconds

### Example Opportunity

```
Time: 1:30:45 AM
Token: TSLAr
Remora Price: $385.50
Oracle Price: $388.00
Spread: 0.64%
Est. Profit: $0.64
Direction: BUY_REMORA
```

---

## Testing Features

### 1. Test Auto-Refresh

1. Keep dashboard open
2. Watch the "Last updated" timestamp at bottom
3. Should update every 10 seconds automatically
4. New opportunities should appear automatically

### 2. Test Manual Refresh

1. Click the **"🔄 Refresh Data"** button
2. Data should reload immediately
3. "Last updated" timestamp should change

### 3. Test Token Filter

1. Select a specific token from dropdown (e.g., "TSLAr")
2. Table should show only TSLAr opportunities
3. Statistics should remain for all tokens
4. Select "All Tokens" to show everything again

### 4. Test Spread Filter

1. Select "≥ 1.0%" from spread filter
2. Table should show only opportunities with spread ≥ 1.0%
3. Try different thresholds (0.5%, 0.8%, 1.5%, 2.0%)

### 5. Test CSV Export

1. Wait for some opportunities to be collected
2. Click **"📥 Export CSV"** button
3. A CSV file should download
4. Open in Excel/Google Sheets to verify data

**CSV should contain:**
```csv
Timestamp,Token,Remora Price,Oracle Price,Spread %,Est. Profit,Direction
2025-12-08T06:30:45.000Z,TSLAr,385.50,388.00,0.64,0.64,BUY_REMORA
...
```

### 6. Test Clear Display

1. Click **"🗑️ Clear Display"** button
2. Confirm the dialog
3. Dashboard should reset to 0 stats
4. Table should show "No opportunities found"
5. Click refresh to reload data from file

---

## Testing API Endpoints

### Test `/api/opportunities`

```bash
# Windows PowerShell
Invoke-WebRequest -Uri http://localhost:3000/api/opportunities | Select-Object -Expand Content

# Or in browser
http://localhost:3000/api/opportunities
```

**Expected Response:**
```json
{
  "success": true,
  "count": 45,
  "latest": 45,
  "opportunities": [...],
  "isMultiToken": true
}
```

### Test `/api/stats`

```bash
# Windows PowerShell
Invoke-WebRequest -Uri http://localhost:3000/api/stats | Select-Object -Expand Content

# Or in browser
http://localhost:3000/api/stats
```

**Expected Response:**
```json
{
  "success": true,
  "stats": {
    "totalOpportunities": 45,
    "todayOpportunities": 45,
    "avgSpread": 0.92,
    "maxSpread": 1.85,
    "totalProfit": 42.50,
    "byToken": {
      "TSLAr": { "count": 12, "avgSpread": 0.85, ... },
      "NVDAr": { "count": 8, "avgSpread": 1.05, ... },
      ...
    }
  }
}
```

### Test `/api/status`

```bash
# Windows PowerShell
Invoke-WebRequest -Uri http://localhost:3000/api/status | Select-Object -Expand Content

# Or in browser
http://localhost:3000/api/status
```

**Expected Response:**
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
  "timestamp": 1733637045000
}
```

---

## Verifying Data Files

### Check Multi-Token Opportunities File

```bash
# View the file
cat data/multi-token-opportunities.json

# Or open in VS Code
code data/multi-token-opportunities.json
```

**Should contain array of opportunities:**
```json
[
  {
    "timestamp": "2025-12-08T06:30:45.123Z",
    "token": "TSLAr",
    "remoraPrice": 385.50,
    "oraclePrice": 388.00,
    "spreadPercent": 0.64,
    "estimatedProfit": 0.64,
    "direction": "BUY_REMORA"
  },
  ...
]
```

---

## Common Issues & Solutions

### Issue: Dashboard Shows "Error loading data"

**Cause:** Dashboard server not running or API endpoints failing

**Solution:**
1. Check bot is running: `npm run multi`
2. Check console for errors
3. Verify port 3000 is not blocked
4. Try rebuilding: `npm run build`

### Issue: No Opportunities Appearing

**Cause:** Spreads are below threshold (0.8%)

**Solution:**
1. Wait longer (10-15 minutes)
2. Lower threshold in `.env`: `MIN_SPREAD_PERCENT=0.5`
3. Check bot console for price fetching errors
4. Verify internet connection (for Yahoo Finance API)

### Issue: Only Some Tokens Showing

**Cause:** Some tokens may not have opportunities yet

**Solution:**
1. This is normal - not all tokens have opportunities at once
2. Wait for more data collection
3. Check which tokens are configured in `.env`
4. Verify all token addresses are correct

### Issue: Dashboard Not Auto-Refreshing

**Cause:** JavaScript error or browser issue

**Solution:**
1. Open browser console (F12)
2. Check for JavaScript errors
3. Try hard refresh: Ctrl+Shift+R
4. Clear browser cache
5. Try different browser

### Issue: CSV Export Not Working

**Cause:** No data or browser blocking download

**Solution:**
1. Ensure opportunities exist (check table)
2. Allow downloads in browser settings
3. Check browser's download folder
4. Try different browser

---

## Performance Testing

### Test with Large Dataset

1. Let bot run for several hours
2. Collect 500+ opportunities
3. Test dashboard performance:
   - Loading speed
   - Filter responsiveness
   - Auto-refresh smoothness
   - CSV export time

### Expected Performance

- **Load time**: < 2 seconds for 1000 opportunities
- **Filter time**: < 100ms
- **Refresh time**: < 1 second
- **Export time**: < 3 seconds for 1000 rows

---

## Mobile Testing

### Test on Mobile Device

1. Find your computer's IP:
   ```bash
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   ```

2. On mobile browser, go to:
   ```
   http://192.168.1.100:3000
   ```

3. Test:
   - ✅ Layout is responsive
   - ✅ Cards stack vertically
   - ✅ Table is scrollable
   - ✅ Buttons are touch-friendly
   - ✅ Filters work on mobile

---

## Browser Compatibility

Test on multiple browsers:

- ✅ **Chrome** (recommended)
- ✅ **Firefox**
- ✅ **Edge**
- ✅ **Safari** (Mac/iOS)
- ⚠️ **IE11** (not supported)

---

## Success Criteria

Dashboard is working correctly if:

1. ✅ Loads without errors
2. ✅ Shows statistics correctly
3. ✅ Displays opportunities in table
4. ✅ Auto-refreshes every 10 seconds
5. ✅ Filters work (token and spread)
6. ✅ CSV export downloads correctly
7. ✅ Token-specific stats display
8. ✅ Responsive on mobile
9. ✅ API endpoints return valid JSON
10. ✅ No console errors

---

## Next Steps After Testing

### If Everything Works:

1. ✅ Dashboard is ready to use!
2. ✅ Monitor opportunities in real-time
3. ✅ Export data for analysis
4. ✅ Share dashboard URL with team (if needed)

### If Issues Found:

1. 📝 Document the issue
2. 🔍 Check logs in `logs/` directory
3. 🐛 Open issue on GitHub
4. 💬 Ask for help in discussions

---

## Advanced Testing

### Load Testing

Test with multiple concurrent users:

```bash
# Install Apache Bench
# Then test 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:3000/api/opportunities
```

### Stress Testing

1. Let bot run for 24+ hours
2. Collect 5000+ opportunities
3. Test dashboard performance
4. Monitor memory usage

### API Testing with Postman

1. Import API endpoints into Postman
2. Test all endpoints
3. Verify response schemas
4. Test error handling

---

## Monitoring Dashboard Health

### Check Dashboard Logs

```bash
# View logs
cat logs/bot.log | grep "Dashboard"

# Should see:
# "📊 Dashboard available at: http://localhost:3000"
```

### Check Process

```bash
# Windows
netstat -ano | findstr :3000

# Should show process listening on port 3000
```

### Check Memory Usage

```bash
# Windows Task Manager
# Look for "node.exe" process
# Should use < 200MB RAM
```

---

## Summary

**To test the dashboard:**

1. ✅ Run `npm run multi`
2. ✅ Open `http://localhost:3000`
3. ✅ Wait 5-10 minutes for data
4. ✅ Test all features (filters, export, refresh)
5. ✅ Verify API endpoints
6. ✅ Check data files
7. ✅ Test on mobile (optional)

**Dashboard is working if:**
- Shows opportunities in real-time
- Auto-refreshes every 10 seconds
- Filters work correctly
- CSV export works
- No console errors

**Happy testing!** 🚀📊
