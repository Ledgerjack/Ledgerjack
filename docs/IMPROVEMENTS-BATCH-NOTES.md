# Improvements batch (plan items 1–6 + safe share/QR)

## 1. Motto
"Free, private, AI-powered — files to HMRC, never sells your data."
In src/lib/brand.ts (APP_MOTTO, APP_PROMISES), shown in Settings footer and the
new Privacy & trust screen. (Can also thread into onboarding copy later.)

## 2. Accountant bridge (Settings -> Your accountant)
- Per-transaction "discuss with accountant" flag (new optional DBTransaction
  field flag_accountant — no migration).
- Browse/search transactions to flag; see the flagged list.
- Send an "accountant pack": a plain note (email / WhatsApp / Telegram) + a
  provisional transactions CSV.
- Live read-only share LINK is signposted "coming soon" (needs a backend).

## 3. Trust signals (Settings -> Privacy & trust)
- Plain-English privacy promises + the motto.
- Export-your-data anytime (transactions CSV) + link to full encrypted backup.

## 4. Rule-learning (Categorisation rules -> "Suggested from your history")
- Learns from what you've already categorised: when a description keyword keeps
  mapping to the same category (>=3 times, >=80% consistent), it suggests a rule.
- FIX during QC: the first heuristic picked the longest word and missed the
  shared merchant token (e.g. "shell" across "SHELL GARAGE"/"Shell petrol").
  Rewritten to tally all significant words; verified it now suggests "shell".

## 5. Smarter import
- CSV import (Settings) and reconcile "add line" now apply your categorisation
  rules automatically, so imported items arrive categorised. Verified: a "shell"
  row imports as Fuel; a non-match falls back to Expenses.

## 6. Safe sharing (no backend, no data through us)
- WhatsApp / Telegram share via standard deep links (wa.me / t.me): share an
  invoice or the accountant note straight from the user's own app.
- QR: src/components/QRCode.tsx (uses the `qrcode` lib — run `npm install`).
  Ready for invoice/accountant-link/recovery-key QR. NOTE: rendering can't be
  verified in the sandbox — smoke-test in a browser.
- The conversational Telegram/WhatsApp BOT is intentionally NOT built: it needs a
  backend AND would route financial data through Meta/Telegram, contradicting the
  motto. Dropped per decision.

## Research — a few more improvement ideas (from earlier competitor/OSS scan)
- Optional E2E-encrypted multi-device SYNC (à la Actual Budget) — directly
  answers the single-device weakness while keeping privacy. Backend milestone.
- Bank-feed via a free-tier aggregator (GoCardless/Nordigen) + thin backend —
  the #1 competitive gap; supporter-funded.
- "Explain this like my accountant would" on any number (extends insights).
- Import presets per UK bank (Monzo/Starling/Barclays CSV shapes) to make manual
  import near-automatic.
