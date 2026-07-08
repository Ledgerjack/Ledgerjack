/**
 * metrics — plain-English financial figures computed from the ledger.
 *
 * We compute these ourselves (deterministically) so the AI only has to EXPLAIN
 * them, never invent numbers. Amounts are returned in major currency units
 * (pounds/dollars/etc.), rounded to 2dp. Grouping is by the human category (the
 * second segment of the account path, e.g. "Expenses:Travel:Fuel" -> "Travel"),
 * which is jurisdiction-neutral.
 */

import { db, type DBAccountType } from "../db";
import { getTransactionsByDateRange, getPendingTransactions } from "../ledger";

export interface CategoryAmount { category: string; amount: number; pct: number }
export interface MonthPoint { month: string; income: number; expenses: number }

export interface FinancialMetrics {
  from: string;
  to: string;
  income: number;
  expenses: number;
  net: number;
  netMarginPct: number | null;   // net / income
  expenseRatioPct: number | null; // expenses / income
  topExpenses: CategoryAmount[];
  topIncome: CategoryAmount[];
  incomeConcentrationPct: number | null; // largest income category's share
  transactionCount: number;
  pendingCount: number;
  monthly: MonthPoint[];          // last 6 months
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const toMajor = (cents: number) => Math.round(cents) / 100;

function humanCategory(path: string): string {
  const parts = path.split(":");
  return parts[1] ?? parts[0] ?? "Other";
}

async function accountTypeMap(): Promise<Map<string, DBAccountType>> {
  const accounts = await db.accounts.toArray();
  const m = new Map<string, DBAccountType>();
  for (const a of accounts) m.set(a.id, a.type);
  return m;
}
function inferType(path: string): DBAccountType | undefined {
  if (/^income[:/]/i.test(path)) return "INCOME";
  if (/^expenses?[:/]/i.test(path)) return "EXPENSE";
  return undefined;
}

function topN(map: Record<string, number>, total: number, n: number): CategoryAmount[] {
  return Object.entries(map)
    .map(([category, cents]) => ({
      category,
      amount: round2(toMajor(cents)),
      pct: total > 0 ? Math.round((cents / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, n);
}

/** Six-month window ending today (for the cash-flow trend). */
function sixMonthWindow(now = new Date()): { from: string; to: string } {
  const to = now.toISOString().slice(0, 10);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  return { from: start.toISOString().slice(0, 10), to };
}

export async function computeMetrics(from: string, to: string): Promise<FinancialMetrics> {
  const [txns, typeMap, pending] = await Promise.all([
    getTransactionsByDateRange(from, to),
    accountTypeMap(),
    getPendingTransactions(),
  ]);

  let incomeCents = 0;
  let expenseCents = 0;
  const incomeByCat: Record<string, number> = {};
  const expenseByCat: Record<string, number> = {};
  let counted = 0;

  for (const tx of txns) {
    if (tx.pending_review) continue;
    counted++;
    for (const s of tx.splits) {
      const type = typeMap.get(s.account_id) ?? inferType(s.account_id);
      const cat = humanCategory(s.account_id);
      if (type === "INCOME") {
        const v = -s.amount;
        if (v === 0) continue;
        incomeCents += v;
        incomeByCat[cat] = (incomeByCat[cat] ?? 0) + v;
      } else if (type === "EXPENSE") {
        const v = s.amount;
        if (v === 0) continue;
        expenseCents += v;
        expenseByCat[cat] = (expenseByCat[cat] ?? 0) + v;
      }
    }
  }

  // Monthly trend (last 6 months), from a single query.
  const win = sixMonthWindow();
  const trendTxns = await getTransactionsByDateRange(win.from, win.to);
  const byMonth: Record<string, { income: number; expenses: number }> = {};
  for (const tx of trendTxns) {
    if (tx.pending_review) continue;
    const m = tx.date.slice(0, 7); // YYYY-MM
    byMonth[m] = byMonth[m] ?? { income: 0, expenses: 0 };
    for (const s of tx.splits) {
      const type = typeMap.get(s.account_id) ?? inferType(s.account_id);
      if (type === "INCOME") byMonth[m].income += -s.amount;
      else if (type === "EXPENSE") byMonth[m].expenses += s.amount;
    }
  }
  const monthly: MonthPoint[] = Object.keys(byMonth)
    .sort()
    .map((m) => ({ month: m, income: round2(toMajor(byMonth[m].income)), expenses: round2(toMajor(byMonth[m].expenses)) }));

  const income = round2(toMajor(incomeCents));
  const expenses = round2(toMajor(expenseCents));
  const topIncome = topN(incomeByCat, incomeCents, 5);

  return {
    from,
    to,
    income,
    expenses,
    net: round2(income - expenses),
    netMarginPct: incomeCents > 0 ? Math.round(((incomeCents - expenseCents) / incomeCents) * 100) : null,
    expenseRatioPct: incomeCents > 0 ? Math.round((expenseCents / incomeCents) * 100) : null,
    topExpenses: topN(expenseByCat, expenseCents, 5),
    topIncome,
    incomeConcentrationPct: topIncome.length ? topIncome[0].pct : null,
    transactionCount: counted,
    pendingCount: pending.length,
    monthly,
  };
}
