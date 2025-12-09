# Pool Price Implementation Note

## Status: Partially Implemented

The pool price query function has been created but needs Flash SDK API adjustments.

## Current Issue:

The Flash SDK methods don't match the expected API:
- `getPoolAccount()` doesn't exist
- `getCustodyAccount()` doesn't exist  
- Need to use `getPool()` and different methods

## Temporary Solution:

For now, the bot will:
1. Try to get Flash Trade pool price
2. If it fails, fall back to oracle price
3. Log a warning when using oracle price

This means the bot will still work, but may show slightly inaccurate spreads until we fully implement the pool price query.

## To Fully Fix:

Need to study the Flash SDK documentation more carefully and use the correct API methods like:
- `getPool(name: string)`
- Proper custody account access
- Correct swap amount calculation

## Impact:

- Bot will still function ✅
- May detect false opportunities (oracle vs actual price gap)
- Real profit will be slightly less than estimated

## Recommendation:

Run the bot with current implementation and monitor actual vs expected profits to quantify the oracle/pool price gap.

