# Entry confirmation for AI scans (roadmap item, AI theme step 3)

Small, high-trust change: after the AI reads a receipt/entry, the app now asks
the user to CONFIRM the amount before it's saved — instead of saving straight to
the review queue.

## What changed
- src/views/TransactionEntry.tsx
  - A simple AI parse no longer auto-saves. It now shows a "Check the scanned
    details" card with the amount shown large, plus description, date and
    category.
  - Three actions: "Confirm & save" (saves to the review queue as before),
    "Edit" (pre-fills the manual form so the user can fix anything, e.g. a
    misread amount), and discard.
  - The mixed-receipt split flow is unchanged (it already had a review step).

## Why
The user explicitly wanted the app to ask "is the number the AI scanned
correct?" before committing. This adds that checkpoint at the exact moment it
matters, reinforcing the human-in-the-loop principle the competitors also rely
on — stated more plainly.

## Notes
- Nothing about storage or the review queue changed; confirmed items are still
  saved with pending_review = true for a final check later.
- No new dependencies; reuses existing formatCurrency and the manual-entry form.

## Next in the theme
4. AI tech support (help-guide grounded, app-usage only, human fallback)
5. AI accountant insights (educational; ratios + deadline calendar + what-if)
