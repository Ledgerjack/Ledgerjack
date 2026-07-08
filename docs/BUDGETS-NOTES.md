# Budgets / spending targets (Power bookkeeping — item 3 of 4)

Set a spending target per category and see how much is spent against it this
period, with a colour-coded progress bar.

## What the user does
Settings -> Budgets. Pick a category, a target amount, and per month or per year.
Each budget shows a progress bar (green / amber at 80% / red when over) with
"spent of target" and "left" or "over".

## How it works
Computed from approved transactions in the current period (calendar month or
calendar year). A budget on a parent category (e.g. "Expenses:Travel") covers its
children (Fuel, Parking, ...), so you can budget a whole area or a single line.

## Verified
Self-test: a Travel budget correctly summed its children (Fuel 300 + Parking 100 =
400 of 500 -> 80%, 100 left), an over-budget category showed 180% / over, and
previous-month spending was excluded.

## Files
- src/lib/budgets/budgets.ts (targets, period window, budgetStatus)
- src/views/BudgetsManager.tsx (set + track UI)
- Wired into App, Navigation, Settings.

## Notes
- Budgets stored as JSON in db.settings (not sensitive).
- Monthly = current calendar month; yearly = current calendar year.

## Next in the cluster
4. Multiple income sources / trades
