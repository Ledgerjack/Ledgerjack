/**
 * BudgetHomeCard — a glanceable budget summary for the dashboard: for each budget
 * you've set, shows spend vs target with an over/under indicator. Hidden entirely
 * if you haven't set any budgets, so it never clutters a fresh install.
 */

import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { budgetStatus, type BudgetStatus } from "../lib/budgets/budgets";
import { formatCurrency } from "../lib/currency";
import { useApp } from "../contexts/AppContext";

export default function BudgetHomeCard({ onNavigate }: { onNavigate?: (v: string) => void }) {
  const { region } = useApp();
  const [rows, setRows] = useState<BudgetStatus[]>([]);
  const m = (c: number) => formatCurrency(c, region);

  useEffect(() => { budgetStatus().then(setRows).catch(() => setRows([])); }, []);

  if (rows.length === 0) return null; // no budgets set → don't show

  const label = (acc: string) => acc.split(":").slice(1).join(" › ") || acc;

  return (
    <button
      onClick={() => onNavigate?.("budgets")}
      className="w-full text-left bg-card rounded-xl border border-line p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-brand-600" />
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Budgets</h3>
      </div>
      {rows.slice(0, 4).map((r) => {
        const pct = Math.min(100, Math.round(r.pct));
        return (
          <div key={r.budget.id} className="space-y-1">
            <div className="flex justify-between items-baseline text-sm">
              <span className="text-ink font-semibold">{label(r.budget.categoryAccount)}</span>
              <span className={`num font-bold ${r.over ? "text-expense" : "text-ink"}`}>
                {m(r.spent)} <span className="text-ink-soft font-medium">/ {m(r.budget.amount)}</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-brand-50 overflow-hidden">
              <div
                className={`h-full rounded-full ${r.over ? "bg-expense" : "bg-brand-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className={`text-[11px] font-medium ${r.over ? "text-expense" : "text-ink-soft"}`}>
              {r.over
                ? `Over by ${m(-r.remaining)}`
                : `${m(r.remaining)} left this ${r.budget.period === "monthly" ? "month" : "year"}`}
            </p>
          </div>
        );
      })}
    </button>
  );
}
