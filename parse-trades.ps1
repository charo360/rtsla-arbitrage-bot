# Parse all trades from logs
$logContent = Get-Content logs\combined.log -Raw

# Extract all actual profit entries with timestamps
$pattern = '"timestamp":"([^"]+)"[^}]*"message":"[^"]*Actual Profit:\s*\$(-?\d+\.\d+)"'
$matches = [regex]::Matches($logContent, $pattern)

Write-Host "`n=== TRADE SUMMARY ===" -ForegroundColor Cyan
Write-Host "Total Trades: $($matches.Count)" -ForegroundColor Yellow

$trades = @()
foreach ($match in $matches) {
    $timestamp = $match.Groups[1].Value
    $profit = [decimal]$match.Groups[2].Value
    
    $trades += [PSCustomObject]@{
        Time = ([DateTime]$timestamp).ToLocalTime().ToString("MM/dd HH:mm:ss")
        Profit = $profit
    }
}

# Calculate statistics
$profitable = ($trades | Where-Object { $_.Profit -gt 0 }).Count
$losing = ($trades | Where-Object { $_.Profit -lt 0 }).Count
$breakeven = ($trades | Where-Object { $_.Profit -eq 0 }).Count
$totalProfit = ($trades | Measure-Object -Property Profit -Sum).Sum
$avgProfit = ($trades | Measure-Object -Property Profit -Average).Average

Write-Host "`nProfitable Trades: $profitable" -ForegroundColor Green
Write-Host "Losing Trades: $losing" -ForegroundColor Red
Write-Host "Break-even Trades: $breakeven" -ForegroundColor Gray
Write-Host "`nTotal Profit: `$$([math]::Round($totalProfit, 2))" -ForegroundColor $(if ($totalProfit -gt 0) { "Green" } else { "Red" })
Write-Host "Average Profit per Trade: `$$([math]::Round($avgProfit, 3))" -ForegroundColor Yellow

Write-Host "`n=== ALL TRADES ===" -ForegroundColor Cyan
$trades | Format-Table -AutoSize

# Show profit distribution
Write-Host "`n=== PROFIT DISTRIBUTION ===" -ForegroundColor Cyan
$trades | Group-Object { [math]::Round($_.Profit, 2) } | 
    Sort-Object Name | 
    Select-Object @{N='Profit';E={"`$$($_.Name)"}}, Count | 
    Format-Table -AutoSize
