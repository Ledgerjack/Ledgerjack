/**
 * Insights — educational view. LedgerJack computes the numbers; the AI only
 * explains them in plain English (opt-in, on the user's own key). Warnings and
 * "discuss with your accountant" are front and centre. Jurisdiction-aware.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, Lightbulb, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { TAX_REGIONS } from "../lib/regions";
import { computeMetrics, type FinancialMetrics } from "../lib/insights/metrics";
import { generateInsight } from "../lib/ai/insightService";
import { modelsForRole, INSIGHTS_DEFAULT } from "../lib/ai/aiModels";
import DeadlineCalendar from "../components/DeadlineCalendar";

function fiscalYearWindow(startMonth: number, startDay: number, now = new Date()) {
  const m0 = startMonth - 1;
  const afterStart =
    now.getUTCMonth() > m0 || (now.getUTCMonth() === m0 && now.getUTCDate() >= startDay);
  const startYear = afterStart ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const from = new Date(Date.UTC(startYear, m0, startDay));
  const to = new Date(Date.UTC(startYear + 1, m0, startDay - 1));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function Insights({ onBack }: { onBack: () => void }) {
  const { region, apiKey } = useApp();
  const cfg = TAX_REGIONS[region];
  const money = (n: number) => `${cfg.currencySymbol}${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [modelId, setModelId] = useState(INSIGHTS_DEFAULT);
  const [narration, setNarration] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const win = fiscalYearWindow(cfg.fiscalYearStart.month, cfg.fiscalYearStart.day);

  useEffect(() => {
    computeMetrics(win.from, win.to).then(setMetrics);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function explain() {
    if (!metrics) return;
    setBusy(true); setError(null); setNarration(null);
    try {
      const text = await generateInsight(metrics, region, apiKey, modelId);
      setNarration(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate the explanation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
        <Lightbulb className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-slate-900">Insights</h2>
      </div>

      {/* Educational warning — front and centre */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800">
          Educational information only — not tax, accounting or financial advice. Figures are based
          only on the transactions you've entered, and AI explanations can be wrong. Keeping a
          professional in the loop is standard practice — discuss anything important with a qualified accountant.
        </p>
      </div>

      {!metrics && <p className="text-sm text-slate-400">Adding up your numbers…</p>}

      {metrics && (
        <>
          <p className="text-xs text-slate-400">
            Based on {metrics.transactionCount} approved transactions
            {metrics.pendingCount > 0 ? `, with ${metrics.pendingCount} still in your review queue` : ""}.
          </p>

          {/* How the business is doing */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-2">
            <h3 className="font-bold text-slate-900 text-sm">How the business is doing</h3>
            <Row label="Income" value={money(metrics.income)} />
            <Row label="Expenses" value={money(metrics.expenses)} />
            <Row label="Net profit" value={money(metrics.net)} strong />
            {metrics.netMarginPct !== null && (
              <p className="text-xs text-slate-500">You keep about <span className="font-semibold">{metrics.netMarginPct}p of every {cfg.currencySymbol}1</span> of income (net margin).</p>
            )}
            {metrics.incomeConcentrationPct !== null && metrics.topIncome.length > 0 && (
              <p className="text-xs text-slate-500">Your largest income source is <span className="font-semibold">{metrics.incomeConcentrationPct}%</span> of income ({metrics.topIncome[0].category}).</p>
            )}
          </div>

          {/* Where money went */}
          {metrics.topExpenses.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-1.5">
              <h3 className="font-bold text-slate-900 text-sm">Where your money went</h3>
              {metrics.topExpenses.map((e) => (
                <div key={e.category} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{e.category} <span className="text-slate-400">· {e.pct}%</span></span>
                  <span className="font-semibold text-slate-800">{money(e.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Cash flow */}
          {metrics.monthly.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-1.5">
              <h3 className="font-bold text-slate-900 text-sm">Your cash flow (last months)</h3>
              {metrics.monthly.map((m) => (
                <div key={m.month} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{m.month}</span>
                  <span className="text-emerald-600">+{money(m.income)}</span>
                  <span className="text-red-500">-{money(m.expenses)}</span>
                </div>
              ))}
            </div>
          )}

          {/* AI explanation (opt-in) */}
          <div className="bg-white rounded-xl border-2 border-brand-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <h3 className="font-bold text-slate-900 text-sm">Explain this in plain English</h3>
            </div>
            <label className="block text-xs text-slate-500">
              Model
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="mt-1 w-full border-2 border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
              >
                {modelsForRole("insights").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={explain}
              disabled={busy}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Thinking…</> : "Explain my numbers"}
            </button>
            <p className="text-[10px] text-slate-400">Uses your own AI key; the cost shows in your AI spend tracker. The AI explains the figures above — it can't change or invent them.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {narration && (
              <div className="text-sm text-slate-700 whitespace-pre-wrap border-t border-slate-100 pt-3">{narration}</div>
            )}
          </div>

          <DeadlineCalendar />

          <p className="text-[11px] text-slate-400 text-center">
            Take anything important to a qualified accountant — keeping a professional in the loop is standard practice.
          </p>
        </>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${strong ? "font-semibold text-slate-800" : "text-slate-500"}`}>{label}</span>
      <span className={`text-sm ${strong ? "font-bold text-slate-900" : "text-slate-700"}`}>{value}</span>
    </div>
  );
}
