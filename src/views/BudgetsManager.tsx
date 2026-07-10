/**
 * BudgetsManager — set spending targets per category and see progress this period.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Target } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { db } from "../lib/db";
import { formatCurrency, parseCurrencyInput } from "../lib/currency";
import {
  loadBudgets, saveBudgets, budgetStatus,
  type Budget, type BudgetPeriod, type BudgetStatus,
} from "../lib/budgets/budgets";

const uid = () => "bud_" + Math.random().toString(36).slice(2, 10);

export default function BudgetsManager({ onBack }: { onBack: () => void }) {
  const { region } = useApp();
  const m = (c: number) => formatCurrency(c, region);

  const [rows, setRows] = useState<BudgetStatus[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [categoryAccount, setCategoryAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");

  async function refresh() {
    setRows(await budgetStatus());
  }

  useEffect(() => {
    refresh();
    db.accounts.toArray().then((accs: any[]) => {
      const cats = accs.filter((a) => a.type === "EXPENSE").map((a) => ({ id: a.id, name: a.name ?? a.id }));
      setAccounts(cats);
      if (cats[0]) setCategoryAccount(cats[0].id);
    });
  }, []);

  async function add() {
    const cents = parseCurrencyInput(amount);
    if (!categoryAccount || !cents) return;
    const next: Budget[] = [...(await loadBudgets()), { id: uid(), categoryAccount, amount: cents, period }];
    await saveBudgets(next);
    setAmount("");
    await refresh();
  }
  async function remove(id: string) {
    await saveBudgets((await loadBudgets()).filter((b) => b.id !== id));
    await refresh();
  }
  const nameFor = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
        <Target className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-slate-900">Budgets</h2>
      </div>

      <p className="text-sm text-slate-500">
        Set a spending target for a category and track how much you've spent this period.
      </p>

      {/* Add */}
      <div className="bg-white rounded-xl border border-line p-4 space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">New budget</p>
        <label className="block text-xs text-slate-500">Category
          <select value={categoryAccount} onChange={(e) => setCategoryAccount(e.target.value)} className="mt-1 w-full border-2 border-slate-300 rounded-lg px-2 py-2 text-sm bg-white">
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <div className="flex gap-2">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Target amount" inputMode="decimal" className="flex-1 border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <select value={period} onChange={(e) => setPeriod(e.target.value as BudgetPeriod)} className="border-2 border-slate-300 rounded-lg px-2 py-2 text-sm bg-white">
            <option value="monthly">per month</option>
            <option value="yearly">per year</option>
          </select>
        </div>
        <button onClick={add} disabled={!categoryAccount || !amount} className="w-full flex items-center justify-center gap-1.5 bg-brand-600 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50">
          <Plus className="w-4 h-4" /> Add budget
        </button>
      </div>

      {/* List with progress */}
      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft text-center">No budgets yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ budget, spent, remaining, pct, over }) => (
            <div key={budget.id} className="bg-white rounded-xl border border-line p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800 truncate">{nameFor(budget.categoryAccount)}</span>
                <button onClick={() => remove(budget.id)} className="text-ink-soft hover:text-red-500 shrink-0" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${over ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">{m(spent)} of {m(budget.amount)} · {budget.period === "monthly" ? "this month" : "this year"}</span>
                <span className={over ? "text-red-600 font-semibold" : "text-slate-500"}>
                  {over ? `${m(-remaining)} over` : `${m(remaining)} left`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
