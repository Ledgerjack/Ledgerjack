/**
 * exporters — plain CSV downloads for the accountant. CSV opens in Excel/Sheets.
 * Every file carries the provisional disclaimer at the top.
 */

import Papa from "papaparse";
import { getApprovedTransactions } from "../ledger";
import type { ProvisionalStatements } from "./statements";
import type { SA103Summary } from "./sa103";

export const PROVISIONAL_DISCLAIMER =
  "PROVISIONAL - prepared by you in LedgerJack, not by a qualified accountant. " +
  "Take these figures to your accountant to check before relying on or filing them. " +
  "Keeping a professional in the loop is standard practice.";

const pounds = (cents: number) => (cents / 100).toFixed(2);

/**
 * Neutralise spreadsheet formula injection: a cell starting with = + - @ or a
 * tab/CR is prefixed with an apostrophe so Excel/Sheets treat it as text.
 */
export function safeCell(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

export function downloadText(filename: string, text: string, mime = "text/csv"): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Every approved transaction (line by line) in the period. */
export async function exportTransactionsCSV(from: string, to: string): Promise<void> {
  const txns = await getApprovedTransactions();
  const rows: Record<string, string>[] = [];
  for (const tx of txns) {
    if (tx.date < from || tx.date > to) continue;
    for (const s of tx.splits) {
      rows.push({
        Date: tx.date,
        Description: safeCell(tx.description ?? ""),
        Account: safeCell(s.account_id),
        Amount: pounds(s.amount),
        Memo: safeCell(s.memo ?? ""),
      });
    }
  }
  const csv = Papa.unparse(rows);
  downloadText(`ledgerjack-transactions-${from}_to_${to}.csv`, `"${PROVISIONAL_DISCLAIMER}"\n\n${csv}`);
}

/** A one-file summary of the provisional statements (+ SA103 if provided). */
export function exportStatementsCSV(st: ProvisionalStatements, sa: SA103Summary | null): void {
  const lines: string[] = [];
  const row = (a: string, b: string | number = "") => lines.push(`"${safeCell(a).replace(/"/g, '""')}",${typeof b === "number" ? pounds(b) : `"${safeCell(b).replace(/"/g, '""')}"`}`);

  row(PROVISIONAL_DISCLAIMER);
  row("");
  row(`Period`, `${st.from} to ${st.to}`);
  row("");
  row("PROFIT & LOSS");
  row("Income");
  st.pnl.income.forEach((i) => row(`  ${i.name}`, i.amount));
  row("Total income", st.pnl.totalIncome);
  row("Expenses");
  st.pnl.expenses.forEach((e) => row(`  ${e.name}`, e.amount));
  row("Total expenses", st.pnl.totalExpenses);
  row("Net profit", st.pnl.netProfit);
  row("");
  row("BALANCE SHEET (as at " + st.to + ")");
  st.balanceSheet.assets.forEach((a) => row(`  Asset: ${a.name}`, a.amount));
  row("Total assets", st.balanceSheet.totalAssets);
  st.balanceSheet.liabilities.forEach((l) => row(`  Liability: ${l.name}`, l.amount));
  row("Total liabilities", st.balanceSheet.totalLiabilities);
  st.balanceSheet.equity.forEach((e) => row(`  Equity: ${e.name}`, e.amount));
  row("Retained profit", st.balanceSheet.retainedProfit);
  if (Math.abs(st.balanceSheet.difference) > 0)
    row("Unexplained difference (check with accountant)", st.balanceSheet.difference);
  row("");
  row("CASH FLOW");
  row("Cash at start", st.cashFlow.cashStart);
  row("Cash at end", st.cashFlow.cashEnd);
  row("Net movement", st.cashFlow.netMovement);

  if (sa) {
    row("");
    row("SA103 SUMMARY (provisional)");
    row("Turnover", sa.turnover);
    if (sa.otherIncome) row("Other business income", sa.otherIncome);
    sa.expenses.forEach((e) => row(`  ${e.label}`, e.amount));
    row("Total expenses", sa.totalExpenses);
    row("Net profit", sa.netProfit);
  }

  downloadText(`ledgerjack-provisional-statements-${st.from}_to_${st.to}.csv`, lines.join("\n"));
}
