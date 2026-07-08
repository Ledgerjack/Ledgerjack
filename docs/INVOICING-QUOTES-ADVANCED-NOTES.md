# Quotes + multi-currency, and advanced invoicing (Invoicing suite items 3 & 4)

## Quotes (item 3a)
- An Invoices/Quotes toggle on the invoice screen. "New quote" creates a QUO-numbered
  document; quotes have their own numbering.
- "To invoice" converts a quote into a fresh draft invoice (new INV number).
- The printed document says "Quote" for quotes, "Invoice" for invoices.

## Multi-currency (item 3b)
- Each invoice can pick a currency (GBP/USD/EUR/AUD/CAD/NZD) — defaults to the
  region currency. The chosen symbol is used on screen and in the PDF.
- Verified: formatMoney renders e.g. €1500.00.

## Advanced invoicing (item 4)
- Overdue: unpaid invoices past their due date show an "Overdue" badge; a red
  summary banner shows count + outstanding total. Verified overdue logic
  (unpaid past-due = overdue; paid = not; quotes never).
- Reminders: a "Remind" button opens a pre-filled email to the client (mailto)
  with the invoice number, amount and due date. (No emails are sent by the app.)
- Client statements: a "Statements" view groups invoices by client with their
  outstanding total, and prints a per-client statement of account (PDF via print).

## Files touched
- src/lib/invoices/invoices.ts (kind, currency, formatMoney, isOverdue, numbering)
- src/lib/invoices/invoicePrint.ts (quote heading, statementHtml/printStatement)
- src/views/Invoices.tsx (toggle, currency picker, convert, overdue, statements)

## Notes
- Late fees are surfaced as reminders rather than auto-charged (most sole traders
  don't auto-apply them); an automatic late-fee % could be added later.

## Invoicing suite COMPLETE (core+PDF, clients+recurring, quotes+multicurrency, advanced).
