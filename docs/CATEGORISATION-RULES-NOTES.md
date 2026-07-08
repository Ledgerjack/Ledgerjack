# Categorisation rules (Power bookkeeping — item 1 of 4)

User-defined rules that auto-file transactions by their description. Deterministic,
offline, and free — no AI call, so it reduces AI cost for routine entries.

## What the user does
Settings -> Categorisation rules. Add rules like:
- if description CONTAINS "BP" -> Travel
- if description STARTS WITH "Uber" -> Travel
- if description IS EXACTLY "Stripe payout" -> Sales
Toggle rules on/off or delete them.

## Where it applies
In manual entry, as the user types a description, the first matching enabled rule
auto-fills the category (and flips income/expense to match), with a small
"Auto-filled from your rule — you can change it" hint. The user can always override.

## Files
- src/lib/rules/rules.ts — types, storage (JSON in db.settings), matchRule().
- src/views/RulesManager.tsx — add/toggle/delete UI.
- Wired into TransactionEntry (auto-fill), App, Navigation, Settings.

## Verified
matchRule self-test passed all cases: contains / starts-with match, disabled rules
ignored, and non-matches return nothing. First enabled rule wins.

## Notes
- Rules aren't sensitive (just text patterns), so stored plainly in settings.
- Match is case-insensitive. Regex intentionally not offered (avoids user regex
  errors); contains/startsWith/equals cover the common cases.

## Next in the cluster
2. Recurring transactions
3. Budgets / spending targets
4. Multiple income sources / trades
