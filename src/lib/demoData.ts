/**
 * demoData — seeds a handful of example entries so someone can see the app work
 * in about ten seconds, before committing any real data to it.
 *
 * SAFETY (the whole point): this must never contaminate real books.
 *  - It refuses to run if ANY transaction already exists.
 *  - Every entry it creates is tagged, so they can all be found and removed.
 *  - Removal deletes only tagged rows, never anything the user typed.
 */

import { db } from "./db";
import { createTransaction, makeSimpleSplits } from "./ledger";

/** Marker written to job_tag so demo rows are always identifiable. */
export const DEMO_TAG = "__demo__";

/** True when the ledger has no transactions at all. */
export async function isLedgerEmpty(): Promise<boolean> {
  return (await db.transactions.count()) === 0;
}

/** True when demo rows are present. */
export async function hasDemoData(): Promise<boolean> {
  const rows = await db.transactions.filter((t) => t.job_tag === DEMO_TAG).toArray();
  return rows.length > 0;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Seed example data. Refuses if the ledger isn't empty — we will not mix made-up
 * numbers into someone's real records.
 */
export async function loadDemoData(): Promise<{ added: number }> {
  if (!(await isLedgerEmpty())) {
    throw new Error("Example data can only be loaded into an empty ledger.");
  }

  const rows: Array<{ date: string; description: string; debit: string; credit: string; pence: number }> = [
    { date: daysAgo(28), description: "Payment from Miller job",   debit: "Assets:Bank",                      credit: "Income:Sales",  pence: 145000 },
    { date: daysAgo(24), description: "Fuel — Shell",              debit: "Expenses:Travel:Fuel",             credit: "Assets:Bank",   pence: 6240 },
    { date: daysAgo(21), description: "Timber & fixings",          debit: "Expenses:Cost of Sales:Materials", credit: "Assets:Bank",   pence: 18715 },
    { date: daysAgo(18), description: "Payment from Okafor job",   debit: "Assets:Bank",                      credit: "Income:Sales",  pence: 82000 },
    { date: daysAgo(14), description: "Phone bill",                debit: "Expenses:Office:Phone",            credit: "Assets:Bank",   pence: 3200 },
    { date: daysAgo(11), description: "Fuel — BP",                 debit: "Expenses:Travel:Fuel",             credit: "Assets:Bank",   pence: 5890 },
    { date: daysAgo(7),  description: "Van service",               debit: "Expenses:Travel:Vehicle",          credit: "Assets:Bank",   pence: 24500 },
    { date: daysAgo(3),  description: "Payment from Reid job",     debit: "Assets:Bank",                      credit: "Income:Sales",  pence: 96500 },
  ];

  for (const r of rows) {
    await createTransaction(
      { date: r.date, description: r.description, pending_review: false, job_tag: DEMO_TAG },
      makeSimpleSplits(r.debit, r.credit, r.pence),
    );
  }

  return { added: rows.length };
}

/** Remove every demo row. Only touches rows carrying the demo tag. */
export async function clearDemoData(): Promise<{ removed: number }> {
  const rows = await db.transactions.filter((t) => t.job_tag === DEMO_TAG).toArray();
  for (const t of rows) {
    await db.splits.where("transaction_id").equals(t.id).delete();
    await db.transactions.delete(t.id);
  }
  return { removed: rows.length };
}
