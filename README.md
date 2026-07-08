# LedgerJack

**Free, private, AI-powered — files to HMRC, never sells your data.**

LedgerJack is a free, offline-first, end-to-end-encrypted bookkeeping app for
UK self-employed people (sole traders, subcontractors, landlords). It keeps your
records on your device, helps you stay MTD-ready, and files to HMRC — without ads,
paywalls, or selling your data.

> **Status: pre-launch.** Feature-complete against its roadmap and self-tested,
> but not yet independently audited or on HMRC's recognised-software list. Read
> "Before you rely on it" below. Figures the app prepares are **provisional** —
> discuss anything important with a qualified accountant.

---

## What it does

- **Bookkeeping**: double-entry ledger, receipts, mileage, CSV import, review queue.
- **Making Tax Digital (Income Tax)**: connect to HMRC, quarterly updates, final
  declaration (sandbox-first).
- **VAT (MTD)**: a 9-box return bridge — you confirm the figures, it submits.
- **Tax estimate + tax pot**: know roughly what to set aside, and when it's due.
- **AI (your own key)**: scans receipts, one-line/voice entry, and explains your
  numbers in plain English — on your OpenRouter key, with the cost shown, and it
  never invents figures.
- **Invoicing suite**: invoices + quotes, PDF, client book, recurring invoices,
  multi-currency, overdue reminders, statements, share via email/WhatsApp/Telegram.
- **Power bookkeeping**: categorisation rules (with learning), recurring
  transactions, budgets, multiple trades/property.
- **CIS**: record subcontractor payments and deductions (labour-only).
- **Statements**: provisional P&L, balance sheet, cash flow, SA103, CSV for your
  accountant.
- **Backup**: end-to-end-encrypted backup to a file, your own cloud, or WebDAV.
- **Security**: on-device AES-GCM vault, recovery key, optional biometric unlock.

## Tech stack

React 18 + TypeScript + Vite + Tailwind, Dexie.js (IndexedDB) for local storage,
an optional Supabase Edge Function as a zero-knowledge relay for HMRC calls.
Everything sensitive is encrypted client-side; there is no server that can read
your data.

## Getting started

```bash
npm install
npm run dev        # local dev server
npm run build      # production build (PWA)
npm run typecheck  # TypeScript checks
npm run lint       # lint
```

The HMRC relay lives in `supabase/functions/hmrc-relay`. Deploy it to your own
Supabase project and set the allowed origins before using live MTD features.
See `docs/` for feature-by-feature notes.

## Privacy & security model (short version)

- Your ledger lives in your browser's IndexedDB; sensitive fields and backups are
  encrypted with a key derived from your password and never leave the device.
- The HMRC relay is zero-knowledge: it forwards signed requests and cannot read
  your data.
- AI runs on **your** OpenRouter key; your figures pass to the model you choose,
  governed by your OpenRouter data settings. AI is opt-in and cost is shown.

Full details and threat model: [`SECURITY.md`](./SECURITY.md).

## Before you rely on it (launch checklist)

- [ ] **HMRC recognition**: not yet on GOV.UK's recognised MTD-software list.
      Don't present it as recognised until it is.
- [ ] **Verify external facts**: HMRC MTD/VAT endpoint versions, OpenRouter model
      slugs/prices, CIS rates, and the 2026/27 tax-rate tables (all flagged in code).
- [ ] **Device-test biometric unlock** (WebAuthn PRF) on real iOS/Android/Windows.
- [ ] **Smoke-test in a browser** — automated checks here are static + logic tests.
- [ ] **Independent security review** before handling real users' tax data.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). In short: keep it private-by-default
and offline-first, add a self-test for any money/tax logic, and never introduce a
server dependency for core features without discussion.

## Licence

LedgerJack is licensed under the **GNU Affero General Public License v3.0
(AGPL-3.0-or-later)** — see [`LICENSE`](./LICENSE). In short: it's free to use and
modify, but anyone who distributes it **or runs a modified version as a network
service** must release their source under the same licence. This keeps LedgerJack
free and open and stops it being turned into a closed, proprietary product.

The copyright holder retains all ownership and, as the rights holder, may also
offer LedgerJack under separate commercial terms (dual licensing). The AGPL
applies to everyone else; it does not restrict the owner.

## Disclaimer

LedgerJack is bookkeeping software, not a substitute for professional advice. It
produces **provisional** figures to help you keep good records and stay MTD-ready.
Always check important numbers with a qualified accountant, and confirm your
obligations with HMRC.
