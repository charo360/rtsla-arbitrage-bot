@echo off
REM rTSLA Arbitrage Bot - Windows Setup Script

echo.
echo ============================================================
echo   rTSLA ARBITRAGE BOT - SETUP (WINDOWS)
echo ============================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo X Node.js is not installed!
    echo   Please install Node.js 18+ from: https://nodejs.org/
    pause
    exit /b 1
)

echo Checking Node.js version...
node --version
echo.

REM Install dependencies
echo Installing dependencies...
echo This may take 2-3 minutes...
call npm install

if %errorlevel% neq 0 (
    echo X Failed to install dependencies
    pause
    exit /b 1
)

echo Dependencies installed successfully
echo.

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo .env file created
    echo    Edit .env and add your configuration
) else (
    echo .env file already exists (not overwriting)
)
echo.

REM Create directories
echo Creating necessary directories...
if not exist logs mkdir logs
if not exist data mkdir data
echo Directories created
echo.

REM Build TypeScript
echo Building TypeScript...
call npm run build

if %errorlevel% neq 0 (
    echo X Build failed
    pause
    exit /b 1
)

echo Build successful
echo.

echo ============================================================
echo   SETUP COMPLETE!
echo ============================================================
echo.
echo Next steps:
echo.
echo 1. Configure your environment:
echo    notepad .env
echo.
echo 2. Add your wallet private key (optional for monitoring):
echo    WALLET_PRIVATE_KEY=[123,45,67,...]
echo.
echo 3. Start the bot:
echo    npm run dev      # Development mode
echo    npm start        # Production mode
echo    npm run monitor  # Monitoring only
echo.
echo For help, see README.md
echo.
echo ============================================================
echo.

pause
