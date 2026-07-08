/**
 * helpGuide — the ONLY source the support assistant may answer from.
 * Keep it accurate to what the app actually does. If a feature changes, update
 * this. The assistant is instructed to say "I'm not sure" for anything not here.
 */

export const HELP_GUIDE = `
# LedgerJack help

## What LedgerJack is
A free, offline-first, privacy-focused bookkeeping app for self-employed people.
Your data is stored encrypted on your own device. AI features use YOUR OWN API
key, and your financial data stays on your device.

## Getting started
- On first open you go through a short setup (onboarding) and set up your vault.
- Your data is protected by an encrypted vault with a lock screen. Unlock it to
  use the app.

## Adding transactions
- AI Parse: type a note or add a receipt photo, and the AI reads the amount,
  date, description and category.
- After an AI scan you'll see a "Check the scanned details" card. Confirm the
  amount is correct, tap "Edit" to fix it, or discard. Confirmed items go to your
  review queue.
- Manual entry: switch to the "Manual" tab to type a transaction yourself.
- Mixed receipts (business + personal) can be split into separate entries.

## Review queue (pending review)
- AI-scanned and imported items land in the review queue marked for a final
  check. Approve them there when you're happy.

## Mileage
- The mileage logger lets you record business trips by typing the numbers.

## Reports & file cabinet
- Reports show income and expense summaries. The file cabinet holds your stored
  receipts and attachments.

## Importing bank data
- You can import transactions from a CSV file exported from your bank.

## Backups
- Use the encrypted backup option in Settings to export and restore your data.
  You'll get reminders to back up.

## Regions
- LedgerJack supports several regions (currency, tax year, tax labels). Choose
  yours in Settings.

## Tax pot (UK)
- UK users see a "tax pot" on the dashboard: an ESTIMATE of Income Tax + Class 4
  National Insurance to set aside, plus the next payment-on-account date. It's an
  estimate to help you plan, not tax advice.

## Making Tax Digital (UK)
- In Settings, UK users can open "Making Tax Digital" to connect to HMRC and file
  quarterly updates, view a tax calculation, and submit the final declaration.
- Everything runs in "practice mode" (sandbox) until it's switched to live.
- To connect you sign in with your Government Gateway on HMRC's own page, then
  enter your National Insurance number (stored encrypted on your device).

## AI settings & cost
- Add your own AI provider key in Settings. Keys are stored in your encrypted
  vault, never sent to any LedgerJack server.
- The "AI models & costs" panel shows each model, its rough price and best use.
  GPT-4o mini is the recommended cheap default.
- The "AI spend this month" panel shows an estimate of what the AI has cost.

## Privacy
- Offline-first and end-to-end encrypted. Your financial data stays on your
  device. AI runs on your own key; you pay your provider directly.
`;
