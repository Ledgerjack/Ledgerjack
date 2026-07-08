/**
 * budgets — set a spending target per expense category and track actual spend
 * against it for the current period. Computed from the ledger (approved only).
 *
 * A budget on "Expenses:Travel" covers that account and its children
 * (e.g. "Expenses:Travel:Fuel"), so you can budget a whole area or a single line.
 */

import { db, type DBAccountType } from "../db";
import { getApprovedTransactions } from "../ledger";

export type BudgetPeriod = "monthly" | "yearly";

export interface Budget {
  id: string;
  categoryAccount: string;
  amount: number; // cents, per period
  period: BudgetPeriod;
}

export interface BudgetStatus {
  budget: Budget;
  spent: number;     // cents
  remaining: number; // cents (negative if over)
  pct: number;       // 0..>100
  over: boolean;
}

const KEY = "budgets";

export async function loadBudgets(): Promise<Budget[]> {
  const row = await db.settings.get(KEY);
  if (!row?.value) return [];
  try { return JSON.parse(row.value) as Budget[]; } catch { return []; }
}
export async function saveBudgets(b: Budget[]): Promise<void> {
  await db.settings.put({ key: KEY, value: JSON.stringify(b) });
}

function windowFor(period: BudgetPeriod, now: Date): { from: string; to: string } {
  const y = now.getUTCFullYear();
  if (period === "yearly") {
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  const m = now.getUTCMonth();
  const from = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
  return { from, to };
}

function isExpense(path: string, types: Map<string, DBAccountType>): boolean {
  const t = types.get(path);
  if (t) return t === "EXPENSE";
  return /^expenses?[:/]/i.test(path);
}

/** Spend for each budget in its current period. */
export async function budgetStatus(now = new Date()): Promise<BudgetStatus[]> {
  const budgets = await loadBudgets();
  if (budgets.length === 0) return [];

  const [txns, accounts] = await Promise.all([getApprovedTransactions(), db.accounts.toArray()]);
  const types = new Map<string, DBAccountType>();
  for (const a of accounts as any[]) types.set(a.id, a.type);

  return budgets.map((b) => {
    const win = windowFor(b.period, now);
    let spent = 0;
    for (const tx of txns) {
      if (tx.date < win.from || tx.date > win.to) continue;
      for (const s of tx.splits) {
        if (!isExpense(s.account_id, types)) continue;
        if (s.account_id === b.categoryAccount || s.account_id.startsWith(b.categoryAccount + ":")) {
          spent += s.amount;
        }
      }
    }
    const remaining = b.amount - spent;
    const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
    return { budget: b, spent, remaining, pct, over: spent > b.amount };
  });
}
