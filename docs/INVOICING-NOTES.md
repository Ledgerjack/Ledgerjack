# Invoicing + PDF (Invoicing suite — item 1)

Create, edit and send invoices, and save them as PDF. Reached from the dashboard
("Invoices") and works for any region (uses your region's currency).

## What the user does
- Set business details once (name, address, email, VAT/tax no., payment details).
- New invoice: client details, issue/due dates, line items (description, qty, unit
  price), optional tax %, notes. Totals calculate live.
- Save as draft; mark sent/paid; produce a PDF.

## PDF approach (no dependency)
"PDF" opens a clean, self-contained printable invoice in a new window and triggers
the browser's print dialog — the user chooses "Save as PDF" to download or send.
This keeps the app dependency-free and offline-friendly (no bundled PDF library).
All user content is HTML-escaped.

## Verified
Self-test: totals correct (subtotal 13000 + 20% tax 2600 = 15600; no-tax = 3000),
sequential numbering (INV-0008 after INV-0007; INV-0001 when empty).

## Files
- src/lib/invoices/invoices.ts (types, storage in db.settings, totals, numbering,
  business profile)
- src/lib/invoices/invoicePrint.ts (printable HTML invoice + print())
- src/views/Invoices.tsx (list + editor + profile)
- Wired into App, Navigation, Dashboard (entry button)

## Notes
- Invoices + profile stored as JSON in db.settings (no schema migration).
- Multi-currency and recurring invoices are later items in the suite; this is the
  core. Client book, quotes, and late-fee reminders come next.

## Next in the suite
2. Client book + recurring invoices
3. Quotes + multi-currency
4. Advanced invoicing (late fees, client statements)
