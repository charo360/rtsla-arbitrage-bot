# Quick spread checker
Write-Host "`n=== CURRENT SPREADS ===" -ForegroundColor Cyan
Write-Host "Time: $(Get-Date -Format 'HH:mm:ss')`n" -ForegroundColor Yellow

$logs = Get-Content logs\combined.log -Tail 10 | Select-String -Pattern "Spread:"

foreach ($log in $logs) {
    if ($log -match '(\w+)\s+\|\s+Jupiter:\s+\$\s*([\d.]+)\s+\|\s+.*:\s+\$\s*([\d.]+)\s+\|\s+Spread:\s+([-\d.]+)%') {
        $token = $matches[1]
        $jupiter = [decimal]$matches[2]
        $flash = [decimal]$matches[3]
        $spread = [decimal]$matches[4]
        
        $color = if ($spread -gt 0) { "Green" } else { "Red" }
        $direction = if ($spread -gt 0) { "✅ BUY Jupiter → SELL Flash" } else { "❌ BUY Flash → SELL Jupiter (not supported)" }
        
        Write-Host "$token : " -NoNewline
        Write-Host "Jupiter `$$jupiter | Flash `$$flash | " -NoNewline
        Write-Host "Spread: $spread%" -ForegroundColor $color -NoNewline
        Write-Host " | $direction"
    }
}

Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
$positiveCount = ($logs | Select-String -Pattern "Spread:\s+[0-9]").Count
$negativeCount = ($logs | Select-String -Pattern "Spread:\s+-").Count

Write-Host "Positive spreads (tradeable): $positiveCount" -ForegroundColor Green
Write-Host "Negative spreads (waiting): $negativeCount" -ForegroundColor Red

if ($positiveCount -gt 0) {
    Write-Host "`n🎉 OPPORTUNITIES AVAILABLE!" -ForegroundColor Green
} else {
    Write-Host "`n⏳ Waiting for market conditions to change..." -ForegroundColor Yellow
}
