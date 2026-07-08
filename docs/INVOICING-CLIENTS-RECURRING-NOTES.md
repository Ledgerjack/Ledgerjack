# Client book + recurring invoices (Invoicing suite — item 2)

## Client book
Save clients (name, email, address, default tax rate) for reuse. In the invoice
editor, a "Choose saved client" dropdown fills the client details in one tap.
- Reached from Invoices -> "Clients".
- src/lib/invoices/clients.ts, src/views/ClientBook.tsx.

## Recurring invoices
Templates that auto-create invoices on a schedule (e.g. a monthly retainer). New
invoices are generated as DRAFTS so the user reviews and sends them.
- Reached from Invoices -> "Recurring".
- Runs on app open (once the vault is unlocked), like recurring transactions.
- Single line item per template (covers most retainers); the draft can be edited
  before sending.
- src/lib/invoices/recurringInvoices.ts, src/views/RecurringInvoices.tsx.

## Verified
Self-test: a monthly retainer due since April generated 3 sequential draft
invoices (INV-0001..0003, status draft), set due = issue + 14 days, and advanced
the template to the next month. Catch-up capped, no duplicates.

## Wiring
- Invoices now takes onNavigate; header has Clients / Recurring buttons.
- App renders 'clients' and 'invoices-recurring' views and runs
  processRecurringInvoices() on open.

## Next in the suite
3. Quotes + multi-currency
4. Advanced invoicing (late fees, client statements)
