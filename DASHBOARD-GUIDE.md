# 📊 DASHBOARD GUIDE

**Your bot now includes a beautiful web dashboard to monitor opportunities in real-time!**

---

## 🎯 What the Dashboard Shows

### **Real-Time Monitoring:**
- ✅ Total opportunities detected
- ✅ Opportunities found today
- ✅ Average spread percentage
- ✅ Estimated total profit
- ✅ Current prices (Remora vs Pyth/NASDAQ)
- ✅ Recent opportunities (last 10)
- ✅ Live updates every 10 seconds

---

## 🚀 HOW TO USE THE DASHBOARD

### **Method 1: With Dashboard Server (Recommended)**

**Step 1: Start the bot**
```bash
# In terminal 1
npm run monitor
```

**Step 2: Start dashboard server**
```bash
# In terminal 2  
npm run dashboard
```

**Step 3: Open in browser**
```
http://localhost:3000
```

**You should see:**
```
📊 Dashboard available at: http://localhost:3000
   Open this URL in your browser to view the dashboard
```

---

### **Method 2: Direct File Access (Simple)**

**Step 1: Start the bot**
```bash
npm run monitor
```

**Step 2: Open dashboard.html**
```bash
# macOS
open dashboard.html

# Windows
start dashboard.html

# Linux
xdg-open dashboard.html

# Or just double-click dashboard.html in your file explorer
```

**Note:** This method works but won't have real-time API updates.

---

## 📱 DASHBOARD FEATURES

### **Statistics Cards**

```
┌─────────────────────┐  ┌─────────────────────┐
│ Total Opportunities │  │ Opportunities Today │
│        45           │  │         12          │
└─────────────────────┘  └─────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐
│  Average Spread     │  │  Estimated Profit   │
│       1.05%         │  │      $39.15         │
└─────────────────────┘  └─────────────────────┘
```

### **Live Price Display**

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Remora Pool    │  │  Pyth Oracle    │  │ Current Spread  │
│    $454.73      │  │    $459.89      │  │      1.13%      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### **Recent Opportunities List**

Each opportunity shows:
- ⏰ Time detected
- 💰 Remora price
- 📊 Oracle price  
- 📈 Spread percentage
- 💵 Estimated profit
- ↕️ Direction (Buy/Sell)

---

## 🎨 DASHBOARD APPEARANCE

**Beautiful gradient design:**
- 🔵 Blue gradient background
- ✨ Glass-morphism cards
- 🟢 Green for profits
- 🔴 Red for alerts
- 📊 Real-time animations

**Responsive layout:**
- Works on desktop
- Works on tablet
- Works on mobile
- Auto-adjusts to screen size

---

## 🔄 DASHBOARD CONTROLS

### **Refresh Button**
```
🔄 Refresh Data
```
Manually refresh to see latest opportunities

### **Clear History Button**
```
🗑️ Clear History
```
Clear dashboard display (doesn't delete actual data file)

### **Export Button**
```
📥 Export CSV
```
Download all opportunities as CSV file for Excel/Google Sheets

---

## 📊 USING THE DASHBOARD

### **While Monitoring:**

**1. Start bot**
```bash
npm run monitor
```

**2. Open dashboard**
```bash
npm run dashboard
# Then open: http://localhost:3000
```

**3. Watch opportunities appear in real-time!**
```
[Dashboard updates every 10 seconds]

🎯 New opportunity detected!
  Time: 2:45:30 PM
  Spread: 1.15%
  Profit: $0.95
```

---

### **Analyzing Data:**

**1. Let bot run for 2-4 hours**

**2. Check dashboard stats:**
```
Total Opportunities: 45
Today: 18
Avg Spread: 1.05%
Total Profit: $39.15
```

**3. Export data:**
```
Click "📥 Export CSV"
Opens in Excel
Analyze trends
```

---

## 🎯 DASHBOARD vs TERMINAL

### **Terminal Output:**
```bash
npm run monitor

Price Check { remora: '$454.73', pyth: '$459.89', spread: '1.125%' }
🎯 OPPORTUNITY FOUND! { spread: '1.13%', estimatedProfit: '$0.92' }
Price Check { remora: '$455.20', pyth: '$459.89', spread: '1.025%' }
```

✅ Good for: Detailed logs, debugging
❌ Hard to: See overall trends, track stats

### **Dashboard:**
```
[Beautiful web interface]

Total: 45 opportunities
Today: 18
Avg Spread: 1.05%
Total Profit: $39.15

[Visual cards, graphs, tables]
```

✅ Good for: Overview, trends, presentation
❌ Missing: Detailed error logs

**Use BOTH!**
- Terminal for monitoring
- Dashboard for analysis

---

## 🔧 DASHBOARD CONFIGURATION

### **Change Dashboard Port:**

**Edit .env:**
```bash
DASHBOARD_PORT=3000  # Default
# Or use any port: 3001, 8080, etc.
```

**Then restart:**
```bash
npm run dashboard
```

### **Auto-Refresh Interval:**

Dashboard auto-refreshes every **10 seconds**.

**To change:**
Edit `dashboard.html` line ~400:
```javascript
// Change 10000 to desired milliseconds
setInterval(loadData, 10000);  // 10 seconds
setInterval(loadData, 5000);   // 5 seconds
setInterval(loadData, 30000);  // 30 seconds
```

---

## 📱 DASHBOARD ON MOBILE

### **Access from Phone:**

**Step 1:** Find your computer's IP address
```bash
# macOS/Linux
ifconfig | grep inet

# Windows
ipconfig

# Look for something like: 192.168.1.XXX
```

**Step 2:** Start dashboard on computer
```bash
npm run dashboard
```

**Step 3:** On phone browser:
```
http://192.168.1.XXX:3000
```

**Works great for monitoring while away from computer!**

---

## 🎯 EXAMPLE WORKFLOW

### **Morning Routine:**

```bash
# 1. Start bot
npm run monitor

# 2. Start dashboard
npm run dashboard

# 3. Open browser
http://localhost:3000

# 4. Minimize terminal
# 5. Keep dashboard open all day
# 6. Check periodically for opportunities
```

### **Evening Analysis:**

```bash
# 1. Check dashboard stats
Total opportunities: 87
Today: 23
Avg spread: 1.08%
Total profit: $75.60

# 2. Export data
Click "📥 Export CSV"

# 3. Analyze in Excel
Open CSV
Create charts
Find patterns

# 4. Adjust bot settings if needed
Edit .env
Lower MIN_SPREAD_PERCENT if needed
```

---

## 🐛 TROUBLESHOOTING

### **"Cannot connect to server"**

**Problem:** Dashboard server not running

**Solution:**
```bash
# Start dashboard server
npm run dashboard

# Should see:
📊 Dashboard available at: http://localhost:3000
```

---

### **"No data yet"**

**Problem:** Bot hasn't detected opportunities

**Solution:**
```bash
# 1. Check bot is running
npm run monitor

# 2. Wait 10-30 minutes
# Opportunities come in bursts

# 3. Check MIN_SPREAD_PERCENT in .env
# Lower to 0.6% if too high
```

---

### **Dashboard won't update**

**Problem:** Old data showing

**Solutions:**
```bash
# 1. Click "🔄 Refresh Data"

# 2. Hard refresh browser
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (macOS)

# 3. Check data file exists
ls data/opportunities.json
```

---

### **Port already in use**

**Problem:** Port 3000 already taken

**Solution:**
```bash
# In .env, change port:
DASHBOARD_PORT=3001

# Restart dashboard
npm run dashboard

# Open: http://localhost:3001
```

---

## 📊 DASHBOARD DATA

### **Where Data Comes From:**

```
Bot monitors prices
    ↓
Detects opportunities
    ↓
Saves to: data/opportunities.json
    ↓
Dashboard reads file
    ↓
Displays in browser
```

### **Data File Format:**

```json
[
  {
    "timestamp": 1702068000000,
    "remoraPrice": 454.73,
    "pythPrice": 459.89,
    "spread": 5.16,
    "spreadPercent": 1.13,
    "direction": "BUY_REMORA",
    "estimatedProfit": 0.92,
    "tradeAmount": 100
  }
]
```

---

## 🎉 DASHBOARD BENEFITS

### **Visualization:**
✅ See trends at a glance
✅ Beautiful, professional interface
✅ Easy to show others

### **Analysis:**
✅ Export to Excel
✅ Track performance
✅ Optimize settings

### **Monitoring:**
✅ Real-time updates
✅ Works on mobile
✅ No terminal needed

### **Presentation:**
✅ Impress investors
✅ Show profitability
✅ Professional look

---

## ✅ QUICK REFERENCE

### **Start Everything:**
```bash
# Terminal 1: Bot
npm run monitor

# Terminal 2: Dashboard
npm run dashboard

# Browser
http://localhost:3000
```

### **Key Shortcuts:**
```
🔄 Refresh: Click refresh or Ctrl+R
📥 Export: Click export button
🗑️ Clear: Click clear button
```

### **Best Practices:**
```
✅ Keep dashboard open while bot runs
✅ Export data daily
✅ Analyze weekly
✅ Show dashboard to partners/investors
```

---

## 🎯 NEXT LEVEL

### **Advanced Dashboard Features (Future):**

Want even more? You could add:
- 📈 Charts and graphs
- 🔔 Browser notifications
- 📱 Mobile app
- 🌐 Remote access
- 📊 Advanced analytics
- 💾 Database storage

**For now, this dashboard gives you everything you need!**

---

## 📞 SUMMARY

**You now have:**
- ✅ Beautiful web dashboard
- ✅ Real-time monitoring
- ✅ Statistics tracking
- ✅ Export capabilities
- ✅ Mobile access

**Start it:**
```bash
npm run dashboard
```

**Open it:**
```
http://localhost:3000
```

**Enjoy monitoring your opportunities in style!** 🚀📊

---

**Questions? Check the dashboard interface - it's self-explanatory!**
