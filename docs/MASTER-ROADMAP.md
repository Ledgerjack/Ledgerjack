# LedgerJack — Master Roadmap

One place for everything we're building and why. Written in plain English.
Nothing here is behind a paywall — LedgerJack is free, and stays free.

---

## The promise (never changes)
- **Free forever.** No paywall, no ads. Funding is voluntary support only.
- **Offline-first & end-to-end encrypted.** Your data lives on your device.
- **Plain English.** No "debit/credit/ledger" jargon in anything users see.
- **Honest by design.** Estimates are labelled estimates; anything the AI
  produces is labelled "provisional — take it to your accountant." Neither of us
  is a licensed accountant; the goal is to help people *understand* their numbers
  and have a better conversation with a professional.
- **You're in control of AI.** Bring your own key, choose your model, see the cost.

## Status key
✅ Done   🔜 Building next   ⬜ Planned   💤 Parked (revisit later)

---

## Already in the app (the base)
Encrypted vault + lock screen · AI receipt scanning · manual transactions ·
pending-review queue · mileage logger (manual) · reports · file cabinet ·
dashboard · CSV import · multi-region support · encrypted backups · onboarding ·
bring-your-own-key AI · **HMRC connection + MTD filing** · **tax estimator + tax pot**.

## ✅ Done
1. **MTD filing screens** — obligations, quarterly updates, tax calculation, final declaration (sandbox-first).
2. **Tax estimator + tax pot + payment-on-account dates.**

---

## Build order (agreed sequence)

### Phase 1 — AI foundation & transparency
3. 🔜 **AI model picker + BYO-key + model-info widget** — recommend GPT-4o mini as the default; show each model's rough cost and best use; choice applies *per feature* (cheap model for scanning, heavy model reserved for deep insight). Fable 5 shown honestly as "may use Opus 4.8".
4. ⬜ **AI cost tracker** — running *estimated* spend (tokens × published price), so no bill-shock. Labelled an estimate.

### Phase 2 — Trust in the numbers
5. ⬜ **Tighten entry confirmation** — user confirms AI-scanned amounts are correct before they're saved.
6. ⬜ **Provisional Financial Statement** — provisional P&L + simple balance sheet + cash-flow. Every copy carries: "Provisional — prepared by you in LedgerJack, not by a qualified accountant. Take these figures to your accountant to check before relying on them."
7. ⬜ **Provisional SA103 summary** — one-page income/expenses in HMRC's Self Assessment shape, same provisional labelling.
8. ⬜ **Plain CSV/XLSX export for your accountant** — separate from the encrypted backup; no lock-in.

### Phase 3 — AI help & insight
9. ⬜ **AI tech support** — ask-AI help using the user's own key.
10. ⬜ **AI accountant insights (educational)** — explains what the numbers show and teaches concepts, never gives specific tax/financial advice; heavyweight-model option. Bundled with:
    - **Financial ratios & auto-insights** (margin, effective rate, average invoice, income concentration)
    - **Unified deadline calendar** (quarterly updates, 31 Jan / 31 Jul payments on account, final declaration, VAT dates)
    - **"What-if" tax scenarios** ("buy £2k of equipment before 5 April → estimated tax falls ~£X"), framed as illustration.

### Phase 4 — Sustainability
11. ⬜ **Supporter tier ("Keep LedgerJack free")** — voluntary; a one-off yearly amount *or* a recurring amount, any value the user chooses, gentle suggested amount. Nothing is paywalled — people pay only if they want to. Money funds freelance developers for fixes, updates and features. Transparent about where it goes. Extends the existing TipJar.

---

## Backlog by theme (planned, after the sequence above)

### Power bookkeeping
12. ⬜ **User-defined categorisation rules** — "if description contains X, file as Y". Deterministic, offline, free — reduces AI cost.
13. ⬜ **Recurring transactions** — auto-create regular items (rent, subscriptions).
14. ⬜ **Budgets / spending targets** per category.
15. ⬜ **Multiple income sources / trades** — two trades, or trade + property (MTD supports this).

### Invoicing suite
16. ⬜ **Invoicing + PDF + payment links** (manual links — no gateway fees).
17. ⬜ **Client book + recurring invoices.**
18. ⬜ **Quotes + multi-currency.**
19. ⬜ **Advanced invoicing** — late-fee reminders, client statements.

### Bank & compliance
20. ⬜ **Bank connection choice** — pick CSV *or* a live Open Banking feed; drag-to-match reconciliation screen.
21. ⬜ **VAT return** — separate MTD-VAT track from income tax.
22. ⬜ **Property / landlord income.**

### Capture & mobile
23. ⬜ **GPS mileage auto-detect + trip splitting** — asks the user to switch on GPS or keep typing numbers; manual stays.
24. ⬜ **Voice / one-line entry** — "log £20 fuel", typed or spoken.
25. ⬜ **Bulk receipt upload** — drop 20 photos, process in a queue.
26. ⬜ **Glanceable mobile "this month" card** — income, expenses, tax pot, outstanding invoices at a glance.

### Onboarding & security polish
27. ⬜ **Demo-first onboarding + jurisdiction selector** — value in ~30 seconds.
28. ⬜ **Biometric login** — fingerprint / face unlock.
29. ⬜ **QR backup transfer** — move encrypted data between devices.

### Community & launch
30. ⬜ **Accountant share link** — plus a per-transaction "discuss with accountant" flag.
31. ⬜ **Telegram bot** — log expenses by message.
32. ⬜ **Open-source launch** — public release + contribution setup.

---

## 💤 Parked (revisit later, on the record)
- **Payroll** — most sole traders don't need it; revisit only if targeting employers.
- **Online payment gateways on invoices** — adds fees/KYC that fight the free/privacy model; manual payment links instead.
- **Plugin marketplace** — too heavy for now; consider at open-source launch.

---

## How we build each item (the rhythm)
1. Get inspiration from open-source / competitors.
2. Build on the single consolidated app.
3. Verify (typecheck; verify any maths against known figures).
4. Hand back one updated zip + a plain-English notes file.
5. Move to the next item.

---

## How we compare on AI (positioning)
Researched against Xero, QuickBooks and Sage:
- **Models:** the big players use branded, *hidden and locked* assistants (Xero
  "JAX", Intuit Assist, Sage "CoPilot") — you can't see or change the model.
  LedgerJack's edge is the opposite: **you choose the model, use your own key,
  and see the cost.** (The pattern is real — tools like Tugger already connect
  accounting data to Claude/ChatGPT/Gemini for exactly this.)
- **How much AI:** competitors pour AI into *automation* (extract, categorise,
  match). We do that too, but also use AI as an *educational lens* — explaining
  what the numbers mean — which is under-served.
- **Reliability:** even the leaders are explicitly **human-in-the-loop, not
  final** — AI suggests, a person approves before anything is filed. Our
  "provisional — take it to your accountant" framing is the *same industry
  standard, stated more honestly*, not a weakness.

Net edge (a combination none of them offer): **free, private/offline, your own
key with model choice and visible cost, and AI that helps you understand your
numbers — honestly labelled provisional.**
