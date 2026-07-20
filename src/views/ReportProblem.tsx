/**
 * ReportProblem — the user's way to tell us something's wrong, without any of
 * their data leaving the device unless they choose to share it.
 *
 * Two paths, deliberately separated (the "technical vs business" distinction):
 *   - "Something's wrong with the app" → gather diagnostics, let the user read
 *     the whole report, then copy it or open a GitHub issue. This is the signal
 *     a solo maintainer is otherwise blind to.
 *   - "I need help using it" → point at the guide; no report needed.
 *
 * Nothing is transmitted automatically. The report is shown in full first —
 * what you read is what you send.
 */

import { useState } from "react";
import { ArrowLeft, Bug, HelpCircle, Copy, Check, ExternalLink, ShieldCheck, Loader2, LifeBuoy } from "lucide-react";
import { collectDiagnostics, formatDiagnostics, ISSUES_URL } from "../lib/diagnostics";

export default function ReportProblem({ onBack, onNavigate }: { onBack: () => void; onNavigate?: (v: string) => void }) {
  const [mode, setMode] = useState<"choose" | "bug">("choose");
  const [note, setNote] = useState("");
  const [report, setReport] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [copied, setCopied] = useState(false);

  const build = async () => {
    setBuilding(true);
    try {
      const d = await collectDiagnostics();
      setReport(formatDiagnostics(d, note));
    } finally {
      setBuilding(false);
    }
  };

  const copy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* the text is on screen to copy manually */ }
  };

  return (
    <div className="space-y-4 pb-24">
      <button onClick={mode === "bug" ? () => { setMode("choose"); setReport(null); } : onBack} className="flex items-center gap-1 text-ink-soft font-semibold text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center gap-2">
        <LifeBuoy className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-ink">Report a problem</h2>
      </div>

      {mode === "choose" && (
        <>
          <p className="text-xs text-ink-soft leading-relaxed">
            We don't track anything or collect data in the background, so we can't see problems ourselves — telling us is the only way we find out. Which is it?
          </p>

          <button onClick={() => setMode("bug")} className="w-full bg-white rounded-xl border border-line p-4 flex items-start gap-3 text-left hover:border-brand-300">
            <Bug className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Something's wrong with the app</h3>
              <p className="text-xs text-ink-soft mt-0.5">Something looks broken, a number seems off, or it did something unexpected. We'll put together a technical report you can check and share.</p>
            </div>
          </button>

          <button onClick={() => onNavigate?.("support")} className="w-full bg-white rounded-xl border border-line p-4 flex items-start gap-3 text-left hover:border-brand-300">
            <HelpCircle className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">I need help using it</h3>
              <p className="text-xs text-ink-soft mt-0.5">Not sure how something works, or how to do a task. This is a question, not a fault — the guide is the quickest way.</p>
            </div>
          </button>
        </>
      )}

      {mode === "bug" && (
        <>
          <div className="bg-brand-50 border border-brand-200 rounded-lg p-2.5 flex gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-brand-800 leading-relaxed">
              <strong>Your books stay private.</strong> This report holds no transactions, amounts or names — only the app version, your browser, and which health checks passed or failed. You'll see the whole thing before anything is shared, and nothing is sent automatically.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">What went wrong? (optional, but it helps)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="e.g. The monthly total looked wrong after I added a receipt. Please don't include client names or amounts here."
              className="w-full border border-line rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-[11px] text-ink-soft mt-1">Whatever you type here is included in the report, so keep it about the behaviour — not the contents of your books.</p>
          </div>

          {!report ? (
            <button onClick={build} disabled={building} className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">
              {building ? <><Loader2 className="w-4 h-4 animate-spin" /> Building report…</> : <>Build the report</>}
            </button>
          ) : (
            <>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">This is exactly what will be shared — nothing else:</p>
                <pre className="bg-slate-900 text-slate-100 text-[10px] leading-relaxed rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-72 overflow-y-auto">{report}</pre>
              </div>

              <button onClick={copy} className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 border border-line text-slate-700 py-2.5 rounded-lg text-sm font-bold">
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy report</>}
              </button>

              <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-lg text-sm">
                Open an issue on GitHub <ExternalLink className="w-4 h-4" />
              </a>
              <p className="text-[11px] text-ink-soft leading-relaxed">
                GitHub issues are public, so paste the report there only if you're comfortable with that — it's the best way for a fix to help others too. If the problem involves anything sensitive, use the security contact in the guide instead.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
