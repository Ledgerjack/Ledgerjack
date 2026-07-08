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
  CIS_RATES, type CisStatus,
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
  const [status, setStatus] = useState<CisStatus>("registered");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [ytd, setYtd] = useState(0);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const labourC = parseCurrencyInput(labour);
  const materialsC = parseCurrencyInput(materials);
  const calc = calcCis(labourC, materialsC, status);

  async function refreshYtd() {
    setYtd(await cisDeductedInPeriod(win.from, win.to));
  }
  useEffect(() => { refreshYtd(); /* eslint-disable-next-line */ }, []);

  async function record() {
    if (!labourC && !materialsC) return;
    setBusy(true);
    try {
      await recordSubcontractorPayment({
        subcontractor, labour: labourC, materials: materialsC, status,
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

      <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-2">
        <input value={subcontractor} onChange={(e) => setSubcontractor(e.target.value)} placeholder="Subcontractor name" className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <label className="flex-1 text-xs text-slate-500">Labour
            <input value={labour} onChange={(e) => setLabour(e.target.value)} inputMode="decimal" placeholder="0.00" className="mt-1 w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="flex-1 text-xs text-slate-500">Materials
            <input value={materials} onChange={(e) => setMaterials(e.target.value)} inputMode="decimal" placeholder="0.00" className="mt-1 w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <label className="block text-xs text-slate-500">Subcontractor status
          <select value={status} onChange={(e) => setStatus(e.target.value as CisStatus)} className="mt-1 w-full border-2 border-slate-300 rounded-lg px-2 py-2 text-sm bg-white">
            <option value="registered">Registered — {Math.round(CIS_RATES.registered * 100)}%</option>
            <option value="unregistered">Not registered — {Math.round(CIS_RATES.unregistered * 100)}%</option>
            <option value="gross">Gross payment status — 0%</option>
          </select>
        </label>
        <label className="block text-xs text-slate-500">Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full border-2 border-slate-300 rounded-lg px-2 py-2 text-sm" />
        </label>
      </div>

      {/* Live calculation */}
      <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 space-y-1">
        <Row label="Gross (labour + materials)" value={m(calc.gross)} />
        <Row label={`CIS deduction (${Math.round(calc.rate * 100)}% of labour)`} value={`- ${m(calc.deduction)}`} warn />
        <div className="border-t border-slate-200 pt-1">
          <Row label="Net to pay subcontractor" value={m(calc.net)} strong />
        </div>
      </div>

      {saved && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
      <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-1">
        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">CIS deducted this tax year</p>
        <p className="text-2xl font-bold text-slate-900">{m(ytd)}</p>
        <p className="text-[11px] text-slate-400">Owed to HMRC on behalf of your subcontractors.</p>
      </div>

      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800">
          LedgerJack records CIS deductions so your books and SA103 are right, but it does
          <span className="font-semibold"> not file your monthly CIS return (CIS300)</span> or verify
          subcontractors with HMRC — those remain your responsibility. Rates shown are the standard
          20% / 30% / 0%; check a subcontractor's status with HMRC. This isn't tax advice.
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
