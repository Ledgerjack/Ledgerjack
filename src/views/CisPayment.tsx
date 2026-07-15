/**
 * CisPayment — record a payment to a subcontractor under the UK Construction
 * Industry Scheme (CIS). Shows the deduction (labour only) and net to pay live,
 * records a balanced transaction, and signposts that the monthly CIS return is a
 * separate HMRC obligation LedgerJack does not file.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, HardHat, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useApp, useRegionConfig } from "../contexts/AppContext";
import { formatCurrency, parseCurrencyInput } from "../lib/currency";
import {
  calcCis, recordSubcontractorPayment, cisDeductedInPeriod,
  type CisCalc,
} from "../lib/cis/cis";

function fyWindow(startMonth: number, startDay: number, now = new Date()) {
  const m0 = startMonth - 1;
  const after = now.getUTCMonth() > m0 || (now.getUTCMonth() === m0 && now.getUTCDate() >= startDay);
  const sy = after ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return {
    from: new Date(Date.UTC(sy, m0, startDay)).toISOString().slice(0, 10),
    to: new Date(Date.UTC(sy + 1, m0, startDay - 1)).toISOString().slice(0, 10),
  };
}

export default function CisPayment({ onBack }: { onBack: () => void }) {
  const { region } = useApp();
  const cfg = useRegionConfig();
  const m = (c: number) => formatCurrency(c, region);
  const win = fyWindow(cfg.fiscalYearStart.month, cfg.fiscalYearStart.day);

  const [subcontractor, setSubcontractor] = useState("");
  const [labour, setLabour] = useState("");
  const [materials, setMaterials] = useState("");
  const [ratePct, setRatePct] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [ytd, setYtd] = useState(0);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const labourC = parseCurrencyInput(labour);
  const materialsC = parseCurrencyInput(materials);
  const rateNum = parseFloat(ratePct);
  const calc = calcCis(labourC, materialsC, Number.isFinite(rateNum) ? rateNum : 0);

  async function refreshYtd() {
    setYtd(await cisDeductedInPeriod(win.from, win.to));
  }
  useEffect(() => { refreshYtd(); /* eslint-disable-next-line */ }, []);

  async function record() {
    if (!labourC && !materialsC) return;
    setBusy(true);
    try {
      await recordSubcontractorPayment({
        subcontractor, labour: labourC, materials: materialsC, ratePct: Number.isFinite(rateNum) ? rateNum : 0,
        cashAccount: cfg.cashAccount, date,
      });
      setSaved(true);
      setSubcontractor(""); setLabour(""); setMaterials("");
      await refreshYtd();
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
        <HardHat className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-slate-900">Subcontractors (CIS)</h2>
      </div>

      <p className="text-sm text-slate-500">
        Record a payment to a subcontractor under the Construction Industry Scheme. The deduction
        applies to the <span className="font-semibold">labour</span> part only, not materials.
      </p>

      <div className="bg-white rounded-xl border border-line p-4 space-y-2">
        <input value={subcontractor} onChange={(e) => setSubcontractor(e.target.value)} placeholder="Subcontractor name" className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <label className="flex-1 text-xs text-slate-500">Labour
            <input value={labour} onChange={(e) => setLabour(e.target.value)} inputMode="decimal" placeholder="0.00" className="mt-1 w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="flex-1 text-xs text-slate-500">Materials
            <input value={materials} onChange={(e) => setMaterials(e.target.value)} inputMode="decimal" placeholder="0.00" className="mt-1 w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <label className="block text-xs text-slate-500">CIS deduction rate (%)
          <input
            value={ratePct}
            onChange={(e) => setRatePct(e.target.value)}
            inputMode="decimal"
            placeholder="Enter the rate that applies"
            className="mt-1 w-full border border-line rounded-lg px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-[11px] text-ink-soft">
            Use the rate that actually applies to this subcontractor — it's on their payment and deduction statement, and you can verify their status with HMRC. We don't set this for you.
          </span>
        </label>
        <label className="block text-xs text-slate-500">Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full border-2 border-slate-300 rounded-lg px-2 py-2 text-sm" />
        </label>
      </div>

      {/* Live calculation */}
      <div className="bg-slate-50 border border-line rounded-xl p-4 space-y-1">
        <Row label="Gross (labour + materials)" value={m(calc.gross)} />
        <Row label={`CIS deduction (${Math.round(calc.rate * 100)}% of labour)`} value={`- ${m(calc.deduction)}`} warn />
        <div className="border-t border-line pt-1">
          <Row label="Net to pay subcontractor" value={m(calc.net)} strong />
        </div>
      </div>

      {saved && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-income" />
          <p className="text-sm text-emerald-700 font-semibold">Payment recorded (in your review queue).</p>
        </div>
      )}

      <button
        onClick={record}
        disabled={busy || (!labourC && !materialsC)}
        className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
      >
        {busy ? "Recording…" : "Record payment"}
      </button>

      {/* YTD + signpost */}
      <div className="bg-white rounded-xl border border-line p-4 space-y-1">
        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">CIS deducted this tax year</p>
        <p className="text-2xl font-bold text-slate-900">{m(ytd)}</p>
        <p className="text-[11px] text-ink-soft">Owed to HMRC on behalf of your subcontractors.</p>
      </div>

      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800">
          LedgerJack records CIS deductions so your books and SA103 are right, but it does
          <span className="font-semibold"> not file your monthly CIS return (CIS300)</span> or verify
          subcontractors with HMRC — those remain your responsibility. <span className="font-semibold">We don't set the deduction rate for you</span>: check the subcontractor's status and the current rate with HMRC, and discuss anything you're unsure about with your accountant. This isn't tax advice.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, strong, warn }: { label: string; value: string; strong?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${warn ? "text-amber-700" : strong ? "font-semibold text-slate-800" : "text-slate-500"}`}>{label}</span>
      <span className={`text-sm ${warn ? "text-amber-700" : strong ? "font-bold text-slate-900" : "text-slate-700"}`}>{value}</span>
    </div>
  );
}
