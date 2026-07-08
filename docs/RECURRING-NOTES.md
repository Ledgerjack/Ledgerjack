# Recurring transactions (Power bookkeeping — item 2 of 4)

Set up regular items (rent, subscriptions, insurance) that create themselves on
schedule. Deterministic, offline, no AI.

## What the user does
Settings -> Recurring transactions. Add an item: expense/income, description,
amount, frequency (weekly/monthly/yearly), category, and the first/next date.
Toggle or delete anytime.

## How it works
On every app open (once the vault is unlocked), processRecurring() creates any due
transactions and advances each template's next date. Generated items go into the
REVIEW QUEUE (pending_review) so the user still gives each a glance before it
counts — consistent with the app's human-in-the-loop approach.

## Verified
- Date math: monthly (with month-end clamp, e.g. 31 Jan -> 28 Feb), weekly, yearly.
- Catch-up: a monthly item due since April created exactly 3 transactions
  (Apr/May/Jun) and advanced to July — no duplicates, capped to avoid runaway.

## Files
- src/lib/recurring/recurring.ts (templates, advanceDate, processRecurring)
- src/views/RecurringManager.tsx (manage UI)
- Wired into App (scheduler on open), Navigation, Settings.

## Notes
- Templates stored as JSON in db.settings (not sensitive).
- Re-running the scheduler is safe: it only creates items whose next date has
  passed, then advances, so it can't double-post.

## Next in the cluster
3. Budgets / spending targets
4. Multiple income sources / trades
