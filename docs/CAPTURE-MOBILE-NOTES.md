# Capture & mobile section — DONE

## Quick / voice one-line entry (dashboard "Quick add")
- Type or speak a line like "£20 fuel" or "150 client deposit"; it's parsed
  offline (no AI, instant, free), the category is filled by your rules, and it
  lands in the review queue.
- Voice uses the browser's speech recognition where available (feature-detected).
- Verified: parseLine handles amount + description + income/expense detection;
  returns null on junk.
- Files: src/lib/quickentry/parseLine.ts, src/components/QuickEntry.tsx.

## Glanceable "This month" card (dashboard)
- Compact: this month's income, expenses, net, and outstanding invoices.
- Files: src/components/ThisMonthCard.tsx.

## Bulk receipt upload (dashboard "Bulk receipts")
- Upload several photos at once; each is AI-scanned one at a time into the review
  queue, with per-file progress and errors.
- Files: src/views/BulkReceipts.tsx.

## GPS mileage tracking (Mileage screen)
- A foreground "Track a trip with GPS" start/stop that accumulates distance via
  watchPosition + haversine (with jitter filtering), filling the distance field.
- Honest flag in the UI: keep the app open while driving; background tracking
  isn't reliable on phones; distance is an estimate to check before saving.
- Manual entry is unchanged.

## Capture & mobile COMPLETE.
