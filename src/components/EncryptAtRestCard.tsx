/**
 * EncryptAtRestCard — lets the user encrypt any older records that were saved
 * before at-rest encryption was added. New and edited records are already
 * encrypted automatically; this covers legacy data. Idempotent and safe to run.
 */

import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { countPlaintextAtRest, migrateEncryptAtRest } from "../lib/migrateAtRest";

export default function EncryptAtRestCard() {
  const [pending, setPending] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string>("");

  useEffect(() => { refresh(); }, []);
  const refresh = async () => {
    try { setPending(await countPlaintextAtRest()); } catch { setPending(null); }
  };

  const run = async () => {
    setBusy(true); setDone("");
    try {
      const r = await migrateEncryptAtRest();
      setDone(`Encrypted ${r.transactions} record${r.transactions === 1 ? "" : "s"} and ${r.splits} amount${r.splits === 1 ? "" : "s"}.`);
      await refresh();
    } catch {
      setDone("Couldn't complete — make sure your vault is unlocked, then try again.");
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-line p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-brand-600" />
        <h3 className="font-bold text-slate-900">Encrypt older records</h3>
      </div>

      <p className="text-xs text-ink-soft leading-relaxed">
        New and edited entries are always encrypted on your device automatically. This secures any records saved before that was switched on. It's safe to run and can be run again anytime.
      </p>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800 leading-relaxed">
          As a precaution, <strong>take a backup first</strong> (above) before running this the first time.
        </p>
      </div>

      {pending === 0 ? (
        <div className="flex items-center gap-2 text-brand-700 text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" /> All records are already encrypted.
        </div>
      ) : (
        <>
          {pending != null && pending > 0 && (
            <p className="text-xs font-semibold text-ink">{pending} older item{pending === 1 ? "" : "s"} not yet encrypted.</p>
          )}
          <button onClick={run} disabled={busy} className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-lg disabled:opacity-50">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Encrypting…</> : <>Encrypt older records now</>}
          </button>
        </>
      )}

      {done && <p className="text-xs text-brand-700 font-medium">{done}</p>}
    </div>
  );
}
