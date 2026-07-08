# Provisional statements (roadmap List A)

A "Provisional statements" screen (Settings -> Provisional statements) with:
- Profit & Loss (income & expenses by category, net profit)
- Simple balance sheet (assets, liabilities, equity, retained profit, balance check)
- Cash flow (cash at start/end, net movement)
- SA103 summary (UK only) — turnover + expenses in HMRC's categories + net profit
- Downloads: statements summary CSV, and a transactions CSV — both for the accountant

## The provisional framing (as agreed)
- A prominent amber banner and a footer both say: "Provisional - prepared by you
  in LedgerJack, not by a qualified accountant. Take these figures to your
  accountant to check before relying on or filing them. Keeping a professional in
  the loop is standard practice."
- The SAME disclaimer is written into the TOP of every exported CSV, so it travels
  with the numbers after they leave the app.

## Computed, not guessed
All figures come from the ledger (approved transactions only). Verified: the
balance sheet actually balances (assets = liabilities + equity + retained profit,
difference 0) on a double-entry test set. If a real book doesn't balance (e.g.
missing opening balances), it shows an honest "unexplained difference" line rather
than hiding it.

## Files
- src/lib/statements/statements.ts (P&L, balance sheet, cash flow)
- src/lib/statements/sa103.ts (UK SA103 summary)
- src/lib/statements/exporters.ts (CSV downloads via papaparse)
- src/views/Statements.tsx; wired into App, Navigation, Settings.

## Notes
- Export is CSV (opens in Excel/Sheets) — no new dependency. XLSX could be added
  later with a spreadsheet library if you want native .xlsx.
- Period is the region's fiscal year (6 April for the UK).
- SA103 shows for UK users only; other regions get the P&L/balance sheet/cash flow.
