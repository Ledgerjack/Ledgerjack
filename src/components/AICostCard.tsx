/**
 * AICostCard — "AI spend this month", an estimate so users stay in control.
 * Shown in Settings under the AI panels. Amounts in USD (how providers bill),
 * clearly labelled an estimate.
 */

import { useEffect, useState } from "react";
import { Coins, Info } from "lucide-react";
import { getMonthUsage, estimateMonthCost, type MonthCost } from "../lib/ai/aiUsage";
import { getModel } from "../lib/ai/aiModels";

function usd(n: number): string {
  if (n === 0) return "$0.00";
  return n < 0.1 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

function thisMonthLabel(): string {
  return new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export default function AICostCard() {
  const [cost, setCost] = useState<MonthCost | null>(null);

  useEffect(() => {
    getMonthUsage().then((u) => setCost(estimateMonthCost(u)));
  }, []);

  if (!cost) return null;

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Coins className="w-5 h-5 text-brand-600" />
        <h3 className="font-bold text-slate-900">AI spend — {thisMonthLabel()}</h3>
      </div>

      <div>
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
          {cost.anyActual ? "Cost this month (from OpenRouter)" : "Estimated cost this month"}
        </p>
        <p className="text-2xl font-bold text-slate-900">{usd(cost.totalUSD)}</p>
        <p className="text-xs text-slate-500 mt-0.5">{cost.calls} AI {cost.calls === 1 ? "request" : "requests"}</p>
      </div>

      {cost.rows.length > 0 && (
        <div className="space-y-1.5 border-t border-slate-100 pt-2">
          {cost.rows.map((r) => (
            <div key={r.modelId} className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{getModel(r.modelId)?.label ?? r.modelId}
                <span className="text-slate-400"> · {r.calls}×</span>
              </span>
              <span className="font-semibold text-slate-800">
                {r.costUSD === null ? "—" : usd(r.costUSD)}
              </span>
            </div>
          ))}
        </div>
      )}

      {cost.rows.length === 0 && (
        <p className="text-sm text-slate-400">No AI usage yet this month.</p>
      )}

      <p className="text-[10px] text-slate-400 flex items-start gap-1">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        {cost.anyActual
          ? "Actual cost reported by OpenRouter for your calls"
          : "Estimate (tokens × published price)"}
        {cost.hasUnpriced ? "; some models show “—” with no listed price" : ""}.
        You're billed directly by OpenRouter on your own key — check your OpenRouter dashboard for the exact figure.
      </p>
    </div>
  );
}
