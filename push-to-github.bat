@echo off
echo ========================================
echo GitHub Repository Push Script
echo ========================================
echo.

echo Step 1: First, create a NEW repository on GitHub
echo   1. Go to https://github.com/new
echo   2. Repository name: rtsla-arbitrage-bot
echo   3. Make it Public or Private
echo   4. DO NOT initialize with README
echo   5. Click "Create repository"
echo.

set /p username="Enter your GitHub username (charo360): "
if "%username%"=="" set username=charo360

echo.
echo Step 2: Adding GitHub remote...
git remote add origin https://github.com/%username%/rtsla-arbitrage-bot.git

echo.
echo Step 3: Renaming branch to main...
git branch -M main

echo.
echo Step 4: Pushing to GitHub...
git push -u origin main

echo.
echo ========================================
echo Done! Check your repository at:
echo https://github.com/%username%/rtsla-arbitrage-bot
echo ========================================
echo.

pause
