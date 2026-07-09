/**
 * ThisMonthCard — a compact, glanceable summary of the current month: income,
 * expenses, net, and outstanding invoices. Computed from approved transactions.
 */

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { formatCurrency } from "../lib/currency";
import { db, type DBAccountType } from "../lib/db";
import { getApprovedTransactions } from "../lib/ledger";
import { loadInvoices, computeTotals } from "../lib/invoices/invoices";

export default function ThisMonthCard() {
  const { region } = useApp();
  const m = (c: number) => formatCurrency(c, region);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [outstanding, setOutstanding] = useState(0);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
      const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);

      const [txns, accounts, invoices] = await Promise.all([
        getApprovedTransactions(), db.accounts.toArray(), loadInvoices(),
      ]);
      const types = new Map<string, DBAccountType>();
      for (const a of accounts as any[]) types.set(a.id, a.type);
      const typeOf = (p: string): DBAccountType | undefined =>
        types.get(p) ?? (/^income[:/]/i.test(p) ? "INCOME" : /^expenses?[:/]/i.test(p) ? "EXPENSE" : undefined);

      let inc = 0, exp = 0;
      for (const tx of txns) {
        if (tx.date < from || tx.date > to) continue;
        for (const s of tx.splits) {
          const t = typeOf(s.account_id);
          if (t === "INCOME") inc += -s.amount;
          else if (t === "EXPENSE") exp += s.amount;
        }
      }
      setIncome(inc);
      setExpenses(exp);
      setOutstanding(invoices.filter((i) => (i.kind ?? "invoice") === "invoice" && i.status !== "paid").reduce((s, i) => s + computeTotals(i).total, 0));
    })();
  }, []);

  const net = income - expenses;

  return (
    <div className="bg-card rounded-xl border border-line p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">This month</p>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-income" />
          <div>
            <p className="text-[10px] text-ink-soft">Income</p>
            <p className="text-sm font-bold text-income num">{m(income)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-expense" />
          <div>
            <p className="text-[10px] text-ink-soft">Expenses</p>
            <p className="text-sm font-bold text-expense num">{m(expenses)}</p>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-ink-soft">Net</p>
          <p className={`text-sm font-bold num ${net >= 0 ? "text-ink" : "text-expense"}`}>{m(net)}</p>
        </div>
        <div>
          <p className="text-[10px] text-ink-soft">Invoices outstanding</p>
          <p className="text-sm font-bold text-ink num">{m(outstanding)}</p>
        </div>
      </div>
    </div>
  );
}
