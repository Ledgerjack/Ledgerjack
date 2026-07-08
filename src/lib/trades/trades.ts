/**
 * trades — track more than one business/trade (or a trade plus property).
 * Each transaction can carry a `trade` id; this computes a separate P&L per
 * trade. Matters for MTD, which supports multiple self-employment businesses
 * and property income as separate sources.
 */

import { db, type DBAccountType } from "../db";
import { getApprovedTransactions } from "../ledger";

export type TradeType = "self-employment" | "property";

export interface Trade {
  id: string;
  name: string;
  type: TradeType;
}

export interface TradeSummary {
  tradeId: string | null; // null = unassigned
  name: string;
  income: number;    // cents
  expenses: number;  // cents
  net: number;       // cents
  transactionCount: number;
}

const KEY = "trades";

export async function loadTrades(): Promise<Trade[]> {
  const row = await db.settings.get(KEY);
  if (!row?.value) return [];
  try { return JSON.parse(row.value) as Trade[]; } catch { return []; }
}
export async function saveTrades(t: Trade[]): Promise<void> {
  await db.settings.put({ key: KEY, value: JSON.stringify(t) });
}

/** Per-trade income/expenses/net for a period, plus an "Unassigned" bucket. */
export async function computeTradeSummaries(from: string, to: string): Promise<TradeSummary[]> {
  const [trades, txns, accounts] = await Promise.all([
    loadTrades(), getApprovedTransactions(), db.accounts.toArray(),
  ]);
  const types = new Map<string, DBAccountType>();
  for (const a of accounts as any[]) types.set(a.id, a.type);
  const typeOf = (p: string): DBAccountType | undefined =>
    types.get(p) ?? (/^income[:/]/i.test(p) ? "INCOME" : /^expenses?[:/]/i.test(p) ? "EXPENSE" : undefined);

  // Seed a bucket per trade + unassigned.
  const buckets = new Map<string | null, TradeSummary>();
  const ensure = (id: string | null, name: string) => {
    if (!buckets.has(id)) buckets.set(id, { tradeId: id, name, income: 0, expenses: 0, net: 0, transactionCount: 0 });
    return buckets.get(id)!;
  };
  for (const t of trades) ensure(t.id, t.name);
  ensure(null, "Unassigned");

  for (const tx of txns) {
    if (tx.date < from || tx.date > to) continue;
    const id = tx.trade ?? null;
    const trade = trades.find((t) => t.id === id);
    const b = ensure(id, trade?.name ?? "Unassigned");
    let touched = false;
    for (const s of tx.splits) {
      const type = typeOf(s.account_id);
      if (type === "INCOME") { b.income += -s.amount; touched = true; }
      else if (type === "EXPENSE") { b.expenses += s.amount; touched = true; }
    }
    if (touched) b.transactionCount++;
  }

  const rows = [...buckets.values()].map((b) => ({ ...b, net: b.income - b.expenses }));
  // Keep trades in defined order, unassigned last; drop empty unassigned.
  const order = new Map(trades.map((t, i) => [t.id, i] as const));
  return rows
    .filter((r) => r.tradeId !== null || r.transactionCount > 0)
    .sort((a, b) => {
      if (a.tradeId === null) return 1;
      if (b.tradeId === null) return -1;
      return (order.get(a.tradeId!) ?? 0) - (order.get(b.tradeId!) ?? 0);
    });
}
