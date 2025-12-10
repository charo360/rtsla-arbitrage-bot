# Railway Deployment Guide

## Quick Deploy to Railway

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Deploy on Railway:**
   - Go to https://railway.app/
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose this repository
   - Railway will auto-detect and deploy

3. **Set Environment Variables:**
   In Railway dashboard, add these variables:
   
   ```
   RPC_URL=<your-solana-rpc-url>
   WALLET_PRIVATE_KEY=<your-wallet-private-key>
   AUTO_EXECUTE=true
   MIN_SPREAD_PERCENT=1.0
   TRADE_AMOUNT_USDC=20
   LOG_LEVEL=info
   ```

4. **Monitor Logs:**
   - Click on your deployment
   - Go to "Deployments" tab
   - Click "View Logs" to see real-time output

## Important Notes

- Railway will run the bot 24/7
- Logs are available in the Railway dashboard
- The bot will auto-restart on failures (max 10 retries)
- Make sure you have sufficient USDC balance in your wallet

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `RPC_URL` | Solana RPC endpoint | `https://api.mainnet-beta.solana.com` |
| `WALLET_PRIVATE_KEY` | Your wallet private key | `[1,2,3,...]` or base58 |
| `AUTO_EXECUTE` | Enable auto-trading | `true` |
| `MIN_SPREAD_PERCENT` | Minimum spread to trade | `1.0` |
| `TRADE_AMOUNT_USDC` | Amount per trade | `20` |
| `LOG_LEVEL` | Logging level | `info` |

## Monitoring

- Check Railway logs for trade execution
- Monitor your wallet balance
- Review opportunities in logs
- Trades are logged with signatures for verification

## Stopping the Bot

- In Railway dashboard, click "Settings"
- Click "Delete Service" to stop the bot
- Or pause deployment temporarily
