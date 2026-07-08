/**
 * VatHub — MTD-VAT bridge. Connect to HMRC, enter VRN, list VAT obligations,
 * and submit the 9-box return. Figures are entered/confirmed by the user from
 * their VAT records (boxes 3 and 5 are computed). Sandbox-first.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";
import ConnectHmrc from "../mtd/ConnectHmrc";
import { isConnected, loadVrn, saveVrn, isValidVrn } from "../../lib/mtd/mtdVault";
import { HMRC_ENV } from "../../lib/mtd/hmrcConfig";
import {
  getVatObligations, submitVatReturn, buildVatPayload,
  type VatObligation, type VatReturnInput,
} from "../../lib/vat/vatApi";

const BOXES: { key: keyof VatReturnInput; label: string; integer?: boolean }[] = [
  { key: "vatDueSales", label: "Box 1 — VAT due on sales" },
  { key: "vatDueAcquisitions", label: "Box 2 — VAT due on acquisitions" },
  { key: "vatReclaimedCurrPeriod", label: "Box 4 — VAT reclaimed on purchases" },
  { key: "totalValueSalesExVAT", label: "Box 6 — Total sales ex VAT", integer: true },
  { key: "totalValuePurchasesExVAT", label: "Box 7 — Total purchases ex VAT", integer: true },
  { key: "totalValueGoodsSuppliedExVAT", label: "Box 8 — Goods supplied ex VAT", integer: true },
  { key: "totalAcquisitionsExVAT", label: "Box 9 — Acquisitions ex VAT", integer: true },
];

export default function VatHub({ onBack }: { onBack: () => void }) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [vrn, setVrn] = useState<string | null>(null);
  const [vrnInput, setVrnInput] = useState("");
  const [obligations, setObligations] = useState<VatObligation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<"list" | "submit">("list");
  const [selected, setSelected] = useState<VatObligation | null>(null);

  // 9-box form values (strings for input)
  const [vals, setVals] = useState<Record<string, string>>({});
  const [finalised, setFinalised] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"ok" | "error" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const now = new Date();
  const from = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().slice(0, 10);

  useEffect(() => {
    (async () => {
      setConnected(await isConnected());
      setVrn(await loadVrn());
    })();
  }, []);

  async function loadObs() {
    setLoading(true); setError(null);
    try {
      setObligations(await getVatObligations(from, to));
    } catch {
      setError("Couldn't load VAT obligations from HMRC.");
    } finally { setLoading(false); }
  }
  useEffect(() => { if (connected && vrn) loadObs(); /* eslint-disable-next-line */ }, [connected, vrn]);

  async function submitVrn() {
    if (!isValidVrn(vrnInput)) { setError("A VAT number is 9 digits."); return; }
    await saveVrn(vrnInput);
    setVrn(vrnInput.replace(/\s+/g, "")); setError(null);
  }

  const num = (k: string) => parseFloat(vals[k] || "0") || 0;
  const box3 = num("vatDueSales") + num("vatDueAcquisitions");
  const box5 = Math.abs(box3 - num("vatReclaimedCurrPeriod"));

  async function submit() {
    if (!selected) return;
    setBusy(true); setResult(null); setMessage(null);
    try {
      const input: VatReturnInput = {
        periodKey: selected.periodKey,
        vatDueSales: num("vatDueSales"),
        vatDueAcquisitions: num("vatDueAcquisitions"),
        vatReclaimedCurrPeriod: num("vatReclaimedCurrPeriod"),
        totalValueSalesExVAT: num("totalValueSalesExVAT"),
        totalValuePurchasesExVAT: num("totalValuePurchasesExVAT"),
        totalValueGoodsSuppliedExVAT: num("totalValueGoodsSuppliedExVAT"),
        totalAcquisitionsExVAT: num("totalAcquisitionsExVAT"),
      };
      const res = await submitVatReturn(buildVatPayload(input, finalised));
      if (res.status >= 200 && res.status < 300) { setResult("ok"); setMessage("VAT return submitted."); }
      else { setResult("error"); setMessage(`HMRC rejected the return (status ${res.status}). Nothing was filed.`); }
    } catch {
      setResult("error"); setMessage("Couldn't reach HMRC. Nothing was filed.");
    } finally { setBusy(false); }
  }

  // ---- Submit screen ----
  if (screen === "submit" && selected) {
    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-center gap-2">
          <button onClick={() => { setScreen("list"); loadObs(); }} className="p-1 -ml-1 text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-lg font-bold text-slate-900">VAT return</h2>
        </div>
        <p className="text-sm text-slate-600">Period <span className="font-bold">{selected.start} → {selected.end}</span></p>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800">Enter each box from your VAT records and check them carefully. Boxes 3 and 5 are calculated for you. Take anything you're unsure about to your accountant before submitting.</p>
        </div>

        {result !== "ok" && (
          <>
            <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-2">
              {BOXES.map((b) => (
                <label key={b.key} className="block text-xs text-slate-500">{b.label}
                  <input inputMode="decimal" value={vals[b.key] ?? ""} onChange={(e) => setVals({ ...vals, [b.key]: e.target.value })} placeholder={b.integer ? "0" : "0.00"} className="mt-1 w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </label>
              ))}
              <div className="border-t border-slate-100 pt-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Box 3 — Total VAT due</span><span className="font-bold">{box3.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Box 5 — Net VAT due</span><span className="font-bold">{box5.toFixed(2)}</span></div>
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={finalised} onChange={(e) => setFinalised(e.target.checked)} className="mt-0.5" />
              I confirm these figures are correct and complete (this is a final declaration to HMRC).
            </label>
            {message && <p className={`text-sm ${result === "error" ? "text-red-600" : "text-slate-600"}`}>{message}</p>}
            <button onClick={submit} disabled={busy || !finalised} className="w-full bg-brand-600 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">{busy ? "Submitting…" : "Submit to HMRC"}</button>
            <p className="text-xs text-slate-400 text-center">{HMRC_ENV === "sandbox" ? "Practice mode — test submission." : "This is a real submission to HMRC."}</p>
          </>
        )}
        {result === "ok" && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center space-y-2">
            <p className="font-bold text-emerald-700">{message}</p>
            <button onClick={() => { setScreen("list"); loadObs(); }} className="text-sm text-brand-600 underline">Back to obligations</button>
          </div>
        )}
      </div>
    );
  }

  // ---- List / connect ----
  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="text-lg font-bold text-slate-900">VAT (Making Tax Digital)</h2>
        {HMRC_ENV === "sandbox" && <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">Practice mode</span>}
      </div>

      {connected === null && <p className="text-sm text-slate-400">Loading…</p>}
      {connected === false && <div className="bg-white rounded-xl border-2 border-slate-200 p-4"><ConnectHmrc /></div>}

      {connected && !vrn && (
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-3">
          <h3 className="font-bold text-slate-900">Your VAT number (VRN)</h3>
          <p className="text-xs text-slate-500">9 digits. Stored encrypted on your device.</p>
          <input value={vrnInput} onChange={(e) => setVrnInput(e.target.value)} placeholder="e.g. 123456789" className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-sm font-medium" />
          <button onClick={submitVrn} className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-bold">Save</button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {connected && vrn && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">VAT obligations</p>
            <button onClick={loadObs} className="flex items-center gap-1 text-sm text-brand-600 font-semibold"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {loading && <p className="text-sm text-slate-400">Checking with HMRC…</p>}
          {!loading && obligations.length === 0 && !error && <p className="text-sm text-slate-500">No VAT obligations found in this window.</p>}
          {obligations.map((o, i) => (
            <div key={i} className="bg-white rounded-xl border-2 border-slate-200 p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 text-sm">{o.start} → {o.end}</p>
                <p className="text-xs text-slate-500">Due {o.due}</p>
              </div>
              {o.status === "F"
                ? <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Submitted</span>
                : <button onClick={() => { setSelected(o); setVals({}); setFinalised(false); setResult(null); setMessage(null); setScreen("submit"); }} className="bg-brand-600 text-white text-sm font-bold px-3 py-1.5 rounded-lg">Complete</button>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
