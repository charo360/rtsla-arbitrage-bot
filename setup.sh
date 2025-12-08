#!/bin/bash

# rTSLA Arbitrage Bot - Setup Script
# This script helps you set up the bot quickly

set -e  # Exit on error

echo ""
echo "============================================================"
echo "  🤖 rTSLA ARBITRAGE BOT - SETUP"
echo "============================================================"
echo ""

# Check Node.js version
echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "   Please install Node.js 18+ from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version is too old (need 18+, you have $NODE_VERSION)"
    echo "   Please update Node.js from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Install dependencies
echo "Installing dependencies..."
echo "This may take 2-3 minutes..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo "   📝 Edit .env and add your configuration"
else
    echo "ℹ️  .env file already exists (not overwriting)"
fi
echo ""

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p logs data
echo "✅ Directories created"
echo ""

# Build TypeScript
echo "Building TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi
echo ""

# Final instructions
echo "============================================================"
echo "  ✅ SETUP COMPLETE!"
echo "============================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure your environment:"
echo "   nano .env    # or open in your editor"
echo ""
echo "2. Add your wallet private key (optional for monitoring):"
echo "   WALLET_PRIVATE_KEY=[123,45,67,...]"
echo ""
echo "3. Start the bot:"
echo "   npm run dev      # Development mode with hot reload"
echo "   npm start        # Production mode"
echo "   npm run monitor  # Monitoring only"
echo ""
echo "4. View logs:"
echo "   tail -f logs/combined.log"
echo ""
echo "For help, see README.md"
echo ""
echo "============================================================"
echo ""
