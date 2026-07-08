/**
 * statements — builds a PROVISIONAL Profit & Loss, a simple balance sheet, and a
 * simple cash-flow summary from the ledger. Amounts are in integer cents (use
 * formatCurrency to display). These are provisional figures for the user to take
 * to their accountant — not final accounts.
 */

import { db, type DBAccountType, type TransactionWithSplits } from "../db";
import { getApprovedTransactions } from "../ledger";

export interface LineItem { name: string; amount: number } // cents

export interface ProvisionalStatements {
  from: string;
  to: string;
  pnl: {
    income: LineItem[];
    expenses: LineItem[];
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
  };
  balanceSheet: {
    assets: LineItem[];
    liabilities: LineItem[];
    equity: LineItem[];
    retainedProfit: number;   // all-time net income up to `to`
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    difference: number;       // should be ~0 if the books balance
  };
  cashFlow: {
    cashStart: number;
    cashEnd: number;
    netMovement: number;
  };
}

async function accountMeta(): Promise<Map<string, { type: DBAccountType; name: string }>> {
  const accounts = await db.accounts.toArray();
  const m = new Map<string, { type: DBAccountType; name: string }>();
  for (const a of accounts) m.set(a.id, { type: a.type, name: a.name ?? a.id });
  return m;
}

function typeOf(path: string, meta: Map<string, { type: DBAccountType; name: string }>): DBAccountType | undefined {
  const t = meta.get(path)?.type;
  if (t) return t;
  if (/^income[:/]/i.test(path)) return "INCOME";
  if (/^expenses?[:/]/i.test(path)) return "EXPENSE";
  if (/^assets?[:/]/i.test(path)) return "ASSET";
  if (/^liabilit/i.test(path)) return "LIABILITY";
  if (/^equity[:/]/i.test(path)) return "EQUITY";
  return undefined;
}
const nameOf = (path: string, meta: Map<string, { type: DBAccountType; name: string }>) =>
  meta.get(path)?.name ?? path.split(":").slice(1).join(" · ") ?? path;

function toItems(map: Record<string, number>): LineItem[] {
  return Object.entries(map)
    .map(([name, amount]) => ({ name, amount }))
    .filter((x) => x.amount !== 0)
    .sort((a, b) => b.amount - a.amount);
}

export async function computeStatements(from: string, to: string): Promise<ProvisionalStatements> {
  const [txns, meta] = await Promise.all([getApprovedTransactions(), accountMeta()]);

  const inRange = (d: string) => d >= from && d <= to;
  const upTo = (d: string) => d <= to;
  const isCash = (path: string) => /bank|cash/i.test(path);

  // ---- P&L (period) ----
  const incomeByAcc: Record<string, number> = {};
  const expenseByAcc: Record<string, number> = {};
  // ---- Balances as-at `to` (all approved up to `to`) ----
  const assetBal: Record<string, number> = {};
  const liabBal: Record<string, number> = {};
  const equityBal: Record<string, number> = {};
  let incomeAllTime = 0, expenseAllTime = 0;
  let cashStart = 0, cashEnd = 0;

  for (const tx of txns as TransactionWithSplits[]) {
    for (const s of tx.splits) {
      const type = typeOf(s.account_id, meta);
      // P&L within period
      if (inRange(tx.date)) {
        if (type === "INCOME") incomeByAcc[nameOf(s.account_id, meta)] = (incomeByAcc[nameOf(s.account_id, meta)] ?? 0) + -s.amount;
        else if (type === "EXPENSE") expenseByAcc[nameOf(s.account_id, meta)] = (expenseByAcc[nameOf(s.account_id, meta)] ?? 0) + s.amount;
      }
      // Balances up to `to`
      if (upTo(tx.date)) {
        if (type === "ASSET") assetBal[nameOf(s.account_id, meta)] = (assetBal[nameOf(s.account_id, meta)] ?? 0) + s.amount;
        else if (type === "LIABILITY") liabBal[nameOf(s.account_id, meta)] = (liabBal[nameOf(s.account_id, meta)] ?? 0) + -s.amount;
        else if (type === "EQUITY") equityBal[nameOf(s.account_id, meta)] = (equityBal[nameOf(s.account_id, meta)] ?? 0) + -s.amount;
        else if (type === "INCOME") incomeAllTime += -s.amount;
        else if (type === "EXPENSE") expenseAllTime += s.amount;
        // cash movement
        if (type === "ASSET" && isCash(s.account_id)) {
          cashEnd += s.amount;
          if (tx.date < from) cashStart += s.amount;
        }
      }
    }
  }

  const income = toItems(incomeByAcc);
  const expenses = toItems(expenseByAcc);
  const totalIncome = income.reduce((a, b) => a + b.amount, 0);
  const totalExpenses = expenses.reduce((a, b) => a + b.amount, 0);

  const assets = toItems(assetBal);
  const liabilities = toItems(liabBal);
  const equity = toItems(equityBal);
  const totalAssets = assets.reduce((a, b) => a + b.amount, 0);
  const totalLiabilities = liabilities.reduce((a, b) => a + b.amount, 0);
  const totalEquity = equity.reduce((a, b) => a + b.amount, 0);
  const retainedProfit = incomeAllTime - expenseAllTime;

  return {
    from,
    to,
    pnl: { income, expenses, totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses },
    balanceSheet: {
      assets, liabilities, equity, retainedProfit,
      totalAssets, totalLiabilities, totalEquity,
      difference: totalAssets - (totalLiabilities + totalEquity + retainedProfit),
    },
    cashFlow: { cashStart, cashEnd, netMovement: cashEnd - cashStart },
  };
}
