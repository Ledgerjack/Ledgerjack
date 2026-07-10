/**
 * FinalDeclaration — the once-a-year "this is complete and correct" step that
 * replaces the old Self Assessment return. It triggers a fresh calculation,
 * then requires an explicit, typed confirmation before submitting.
 */

import { useState } from "react";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { triggerCalculation, submitFinalDeclaration } from "../../lib/mtd/mtdApi";
import { HMRC_ENV } from "../../lib/mtd/hmrcConfig";

export default function FinalDeclaration({ taxYear, onBack }: { taxYear: string; onBack: () => void }) {
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"ok" | "error" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const ready = confirmText.trim().toUpperCase() === "CONFIRM";

  async function submit() {
    setBusy(true); setResult(null); setMessage(null);
    try {
      const trig = await triggerCalculation(taxYear);
      const id = (trig.data as any)?.calculationId ?? (trig.data as any)?.id;
      if (!id) throw new Error("no_calc_id");
      const res = await submitFinalDeclaration(taxYear, id);
      if (res.status >= 200 && res.status < 300) {
        setResult("ok");
        setMessage("Final declaration submitted for " + taxYear + ".");
      } else {
        setResult("error");
        setMessage(`HMRC rejected the declaration (status ${res.status}). Nothing was filed.`);
      }
    } catch (e) {
      setResult("error");
      setMessage("Couldn't reach HMRC. Nothing was filed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="text-lg font-bold text-slate-900">Final declaration</h2>
      </div>

      <p className="text-sm text-slate-600">Tax year <span className="font-bold">{taxYear}</span></p>

      {result !== "ok" && (
        <>
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800">
              This is the final, legally-binding declaration for the year — it replaces your
              Self Assessment return. Make sure every quarterly update and all your figures are
              complete and correct before submitting. You are declaring the information is
              correct to the best of your knowledge.
            </p>
          </div>

          <label className="block text-sm text-slate-600">
            Type <span className="font-bold">CONFIRM</span> to proceed:
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-1 w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-sm font-medium uppercase"
            />
          </label>

          {message && <p className={`text-sm ${result === "error" ? "text-red-600" : "text-slate-600"}`}>{message}</p>}

          <button
            onClick={submit}
            disabled={!ready || busy}
            className="w-full bg-brand-600 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit final declaration"}
          </button>
          <p className="text-xs text-ink-soft text-center">
            {HMRC_ENV === "sandbox" ? "Practice mode — this is a test submission." : "This is a real, final submission to HMRC."}
          </p>
        </>
      )}

      {result === "ok" && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center space-y-2">
          <p className="font-bold text-emerald-700">{message}</p>
          <button onClick={onBack} className="text-sm text-brand-600 underline">Done</button>
        </div>
      )}
    </div>
  );
}
