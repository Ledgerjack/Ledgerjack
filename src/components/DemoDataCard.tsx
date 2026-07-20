/**
 * DemoDataCard — "see it work before you trust it with anything real."
 *
 * Only appears when the ledger is empty, or when demo rows are present (so they
 * can be cleared). It will not mix example figures into real books.
 */

import { useState, useEffect, useCallback } from "react";
import { PlayCircle, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { isLedgerEmpty, hasDemoData, loadDemoData, clearDemoData } from "../lib/demoData";

export default function DemoDataCard({ onChanged }: { onChanged?: () => void }) {
  const [empty, setEmpty] = useState(false);
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => {
    try {
      setEmpty(await isLedgerEmpty());
      setDemo(await hasDemoData());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const load = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await loadDemoData();
      setMsg(`Added ${r.added} example entries. Have a look around — then clear them before you start for real.`);
      await refresh();
      onChanged?.();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Couldn't load the example data.");
    } finally { setBusy(false); }
  };

  const clear = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await clearDemoData();
      setMsg(`Removed ${r.removed} example entries. Your books are empty and ready.`);
      await refresh();
      onChanged?.();
    } catch {
      setMsg("Couldn't clear the example data.");
    } finally { setBusy(false); }
  };

  // Nothing to offer once there's real data and no demo rows left.
  if (!empty && !demo) return null;

  return (
    <div className="bg-white rounded-xl border border-line p-4 space-y-3">
      <div className="flex items-center gap-2">
        <PlayCircle className="w-5 h-5 text-brand-600" />
        <h3 className="font-bold text-slate-900">{demo ? "Example data is loaded" : "Try it with example data"}</h3>
      </div>

      {demo ? (
        <>
          <p className="text-xs text-ink-soft leading-relaxed">
            These figures are made up — a few jobs, some fuel and materials — so you can see how the reports and totals behave. <strong>Clear them before you start entering anything real</strong>, so they can't muddle your books.
          </p>
          <button onClick={clear} disabled={busy} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Clearing…</> : <><Trash2 className="w-4 h-4" /> Clear example data</>}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-ink-soft leading-relaxed">
            Not sure if this is for you? Load a few made-up entries and see the whole thing work — totals, reports, tax-year figures — in about ten seconds. Nothing is sent anywhere, and you can clear it with one tap.
          </p>
          <button onClick={load} disabled={busy} className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</> : <><PlayCircle className="w-4 h-4" /> Load example data</>}
          </button>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Only available while your books are empty — we won't mix invented figures into real records.
            </p>
          </div>
        </>
      )}

      {msg && <p className="text-xs text-brand-700 font-medium">{msg}</p>}
    </div>
  );
}
