/**
 * JobEstimator — a forward-looking quoting tool for tradespeople. Enter your own
 * materials, labour and overheads plus a target margin, and it works out your
 * cost, a suggested quote, and the profit — so you can decide whether a job is
 * worth taking and what to charge. It uses YOUR OWN rates (remembered between
 * jobs); it never invents or looks up prices.
 */

import { useState, type ReactNode } from "react";
import { Calculator, Hammer } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { formatCurrency } from "../lib/currency";

const LS = {
  rate: "job_labour_rate",
  margin: "job_target_margin",
  overheadPct: "job_overhead_pct",
};
const load = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const save = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export default function JobEstimator({ onBack }: { onBack?: () => void }) {
  const { region } = useApp();
  const m = (pounds: number) => formatCurrency(Math.round(pounds * 100), region);

  const [name, setName] = useState("");
  const [materials, setMaterials] = useState("");
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState(load(LS.rate, ""));
  const [overheads, setOverheads] = useState("");
  const [margin, setMargin] = useState(load(LS.margin, "20"));
  const [yourQuote, setYourQuote] = useState("");

  const nMaterials = parseFloat(materials) || 0;
  const nHours = parseFloat(hours) || 0;
  const nRate = parseFloat(rate) || 0;
  const nOverheads = parseFloat(overheads) || 0;
  const nMargin = Math.min(95, Math.max(0, parseFloat(margin) || 0));

  const labourCost = nHours * nRate;
  const totalCost = nMaterials + labourCost + nOverheads;
  // Suggested quote so that profit is `margin`% of the quote.
  const suggestedQuote = nMargin < 100 ? totalCost / (1 - nMargin / 100) : totalCost;
  const suggestedProfit = suggestedQuote - totalCost;

  // If they type their own quote, check viability against the target margin.
  const nYourQuote = parseFloat(yourQuote) || 0;
  const yourProfit = nYourQuote - totalCost;
  const yourMarginPct = nYourQuote > 0 ? (yourProfit / nYourQuote) * 100 : 0;
  const meetsTarget = nYourQuote > 0 && yourMarginPct >= nMargin;

  const persist = () => { save(LS.rate, rate); save(LS.margin, margin); };

  return (
    <div className="space-y-4 pb-24">
      {onBack && <button onClick={onBack} className="flex items-center gap-1 text-ink-soft font-semibold text-sm">← Back</button>}

      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-ink">Job estimator</h2>
      </div>
      <p className="text-xs text-ink-soft">Work out whether a job is worth taking and what to quote — using your own rates. Nothing here is sent anywhere or invented; it's your numbers.</p>

      <div className="bg-white rounded-xl border border-line p-4 space-y-3">
        <Field label="Job name (optional)"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kitchen re-wire" className="inp" /></Field>
        <Field label={`Materials cost (${cur(region)})`}><input type="number" inputMode="decimal" value={materials} onChange={(e) => setMaterials(e.target.value)} placeholder="0.00" className="inp num" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Labour hours"><input type="number" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="0" className="inp num" /></Field>
          <Field label={`Your rate / hr (${cur(region)})`}><input type="number" inputMode="decimal" value={rate} onChange={(e) => { setRate(e.target.value); save(LS.rate, e.target.value); }} placeholder="0.00" className="inp num" /></Field>
        </div>
        <Field label={`Overheads (${cur(region)}, optional)`}><input type="number" inputMode="decimal" value={overheads} onChange={(e) => setOverheads(e.target.value)} placeholder="0.00" className="inp num" /></Field>
        <Field label="Target profit margin (%)"><input type="number" inputMode="decimal" value={margin} onChange={(e) => { setMargin(e.target.value); save(LS.margin, e.target.value); }} placeholder="20" className="inp num" /></Field>
      </div>

      {/* Result */}
      <div className="bg-brand-600 text-white rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2"><Hammer className="w-4 h-4" /><h3 className="text-[11px] font-bold uppercase tracking-wider text-white/75">Estimate{name ? ` — ${name}` : ""}</h3></div>
        <ResRow label="Materials" value={m(nMaterials)} />
        <ResRow label={`Labour (${nHours || 0} h × ${m(nRate)})`} value={m(labourCost)} />
        {nOverheads > 0 && <ResRow label="Overheads" value={m(nOverheads)} />}
        <div className="border-t border-white/20 pt-2"><ResRow label="Your total cost" value={m(totalCost)} strong /></div>
        <div className="bg-white/10 rounded-lg p-3 mt-1">
          <p className="text-[11px] text-white/75 uppercase tracking-wider font-bold">Suggested quote (for {nMargin}% margin)</p>
          <p className="text-3xl font-bold num mt-1">{m(suggestedQuote)}</p>
          <p className="text-sm text-white/85 mt-1 num">Profit: {m(suggestedProfit)}</p>
        </div>
      </div>

      {/* Go / no-go against your own quote */}
      <div className="bg-white rounded-xl border border-line p-4 space-y-2">
        <Field label={`Thinking of quoting a set price? Enter it (${cur(region)})`}>
          <input type="number" inputMode="decimal" value={yourQuote} onChange={(e) => setYourQuote(e.target.value)} placeholder="0.00" className="inp num" />
        </Field>
        {nYourQuote > 0 && (
          <div className={`rounded-lg p-3 ${meetsTarget ? "bg-income/10 border border-income/30" : "bg-expense/10 border border-expense/30"}`}>
            <p className={`text-sm font-bold ${meetsTarget ? "text-income" : "text-expense"}`}>
              {meetsTarget ? "✓ Worth taking at this price" : "⚠ Below your target margin"}
            </p>
            <p className="text-xs text-ink-soft mt-1 num">
              Profit {m(yourProfit)} · margin {yourMarginPct.toFixed(0)}% (target {nMargin}%)
            </p>
          </div>
        )}
      </div>

      <p className="text-[11px] text-ink-soft text-center" onClick={persist}>
        These are estimates from your own figures — always check materials prices and your time before you quote.
      </p>

      <style>{`.inp{width:100%;border:1px solid var(--tw-line,#E7E2D6);border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem;background:#fff;color:#1B2420}`}</style>
    </div>
  );
}

function cur(region: string): string {
  // lightweight currency symbol lookup via formatCurrency of 0
  return formatCurrency(0, region as never).replace(/[0-9.,\s]/g, "") || "£";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-ink mb-1">{label}</span>
      {children}
    </label>
  );
}

function ResRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${strong ? "font-bold text-white" : "text-white/80"}`}>{label}</span>
      <span className={`num ${strong ? "font-bold text-white" : "text-white/90"}`}>{value}</span>
    </div>
  );
}
