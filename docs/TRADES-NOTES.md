# Multiple income sources / trades (Power bookkeeping — item 4 of 4)

Track more than one business — two trades, or a trade plus property — and see
each one's profit separately. Matters for MTD, which treats each self-employment
and property as its own source.

## What the user does
Settings -> Trades & income sources. Add trades (name + type: self-employment or
property). Then when adding a transaction (manual or after an AI scan), pick which
trade it belongs to. Recurring items can be assigned a trade too. The Trades screen
shows per-trade income / expenses / net for the tax year.

## How it works
- A lightweight optional `trade` tag was added to transactions (no database
  migration — it's an optional, non-indexed field; old transactions are simply
  "Unassigned").
- Per-trade P&L is computed from approved transactions grouped by their trade.

## Verified
Self-test: two trades + unassigned split correctly — Plumbing income 1000 /
expenses 200 / net 800 (2 txns), Flat rental net 500 (1), Unassigned net -100 (1).

## Files
- src/lib/trades/trades.ts (trades + computeTradeSummaries)
- src/views/TradesManager.tsx (manage + per-trade P&L)
- Trade picker added to TransactionEntry (manual + AI confirm) and RecurringManager
- `trade?` added to DBTransaction and RecurringTemplate
- Wired into App, Navigation, Settings

## Notes
- The trade picker only appears once you've defined at least one trade, so it
  stays out of the way for single-trade users.
- This is the foundation for filing separate MTD businesses later.

## Power bookkeeping cluster COMPLETE (rules, recurring, budgets, trades).
