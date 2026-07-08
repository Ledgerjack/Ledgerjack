/**
 * reconcile — match imported bank lines against recorded transactions by amount
 * and a small date window. Derived (no stored "reconciled" flag), so it's a safe,
 * read-only comparison the user can act on.
 */

import type { CSVRow } from "../csv";
import type { TransactionWithSplits } from "../db";

export interface BankLine {
  row: CSVRow;
  amountCents: number; // absolute
  date: string;
}

export interface ReconcileResult {
  matched: { line: BankLine; txId: string }[];
  unmatched: BankLine[];
  matchedCount: number;
  totalCount: number;
}

function txAmount(tx: TransactionWithSplits): number {
  return tx.splits.reduce((max, s) => Math.max(max, Math.abs(s.amount)), 0);
}
function daysBetween(a: string, b: string): number {
  return Math.abs((new Date(a + "T00:00:00Z").getTime() - new Date(b + "T00:00:00Z").getTime()) / 86400000);
}

/** Turn parsed CSV rows into bank lines (absolute amount in cents). */
export function toBankLines(rows: CSVRow[]): BankLine[] {
  return rows
    .map((row) => {
      const raw = parseFloat((row.amount || "").replace(/[^0-9.-]/g, ""));
      return { row, amountCents: Math.abs(Math.round((raw || 0) * 100)), date: row.date };
    })
    .filter((l) => l.amountCents > 0 && !!l.date);
}

export function reconcile(lines: BankLine[], txns: TransactionWithSplits[], dayWindow = 4): ReconcileResult {
  const used = new Set<string>();
  const matched: { line: BankLine; txId: string }[] = [];
  const unmatched: BankLine[] = [];

  for (const line of lines) {
    const hit = txns.find(
      (t) => !used.has(t.id) && txAmount(t) === line.amountCents && daysBetween(t.date, line.date) <= dayWindow,
    );
    if (hit) { used.add(hit.id); matched.push({ line, txId: hit.id }); }
    else unmatched.push(line);
  }
  return { matched, unmatched, matchedCount: matched.length, totalCount: lines.length };
}
