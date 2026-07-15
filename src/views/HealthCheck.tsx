/**
 * HealthCheck — the andon board for your books.
 *
 * Shows a single stack-light status plus the individual checks, in plain
 * English, with a way to act on anything that needs attention. Read-only: it
 * inspects, it never changes your data.
 */

import { useState, useEffect, useCallback } from "react";
import { Activity, CheckCircle2, AlertTriangle, XCircle, HelpCircle, Loader2, RefreshCw } from "lucide-react";
import { runSelfCheck, type SelfCheckReport, type CheckStatus } from "../lib/selfCheck";

const STATUS_UI: Record<CheckStatus, { icon: typeof CheckCircle2; text: string; bg: string; border: string }> = {
  ok:      { icon: CheckCircle2,  text: "text-brand-700",  bg: "bg-brand-50",  border: "border-brand-200" },
  warn:    { icon: AlertTriangle, text: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200" },
  fail:    { icon: XCircle,       text: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
  unknown: { icon: HelpCircle,    text: "text-ink-soft",   bg: "bg-slate-50",  border: "border-line" },
};

const HEADLINE: Record<CheckStatus, { title: string; sub: string }> = {
  ok:      { title: "Everything looks right",   sub: "No problems found with your records." },
  warn:    { title: "A couple of things to do", sub: "Nothing is broken, but some items need your attention." },
  fail:    { title: "Something needs fixing",   sub: "Your figures may not be reliable until this is sorted." },
  unknown: { title: "Couldn't check everything", sub: "Some checks need your vault unlocked." },
};

export default function HealthCheck({ onBack, onNavigate }: { onBack?: () => void; onNavigate: (v: string) => void }) {
  const [report, setReport] = useState<SelfCheckReport | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setReport(await runSelfCheck());
    } catch (e: unknown) {
      setError(e instanceof Error ? `Couldn't run the check: ${e.message}` : "Couldn't run the check.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { run(); }, [run]);

  const head = report ? HEADLINE[report.overall] : null;
  const headUI = report ? STATUS_UI[report.overall] : null;
  const HeadIcon = headUI?.icon ?? Activity;

  return (
    <div className="space-y-4 pb-24">
      {onBack && <button onClick={onBack} className="flex items-center gap-1 text-ink-soft font-semibold text-sm">← Back</button>}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-600" />
          <h2 className="text-lg font-bold text-ink">Health check</h2>
        </div>
        <button onClick={run} disabled={busy} className="flex items-center gap-1 text-xs font-bold text-brand-600 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} /> Re-check
        </button>
      </div>

      <p className="text-xs text-ink-soft leading-relaxed">
        Checks your records for problems — so a wrong figure can't sit there quietly looking correct. This only reads your data; it changes nothing.
      </p>

      {busy && !report ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-ink-soft animate-spin" /></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs font-bold text-red-700">{error}</p>
        </div>
      ) : report && head && headUI ? (
        <>
          {/* Stack light */}
          <div className={`${headUI.bg} ${headUI.border} border rounded-xl p-4 flex items-start gap-3`}>
            <HeadIcon className={`w-6 h-6 ${headUI.text} shrink-0`} />
            <div>
              <p className={`font-bold ${headUI.text}`}>{head.title}</p>
              <p className="text-xs text-ink-soft mt-0.5">{head.sub}</p>
            </div>
          </div>

          {/* Individual checks */}
          <div className="space-y-2">
            {report.checks.map((c) => {
              const ui = STATUS_UI[c.status];
              const Icon = ui.icon;
              return (
                <div key={c.id} className="bg-white rounded-xl border border-line p-3">
                  <div className="flex items-start gap-2.5">
                    <Icon className={`w-4 h-4 ${ui.text} shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">{c.label}</p>
                      <p className="text-xs text-ink-soft leading-relaxed mt-0.5">{c.detail}</p>
                      {c.action && (
                        <button
                          onClick={() => onNavigate(c.action!.view)}
                          className="mt-2 text-xs font-bold text-brand-600 hover:text-brand-700"
                        >
                          {c.action.label} →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-ink-soft">
            Checked {new Date(report.ranAt).toLocaleTimeString()}. Run this after restoring a backup, or any time your figures look off.
          </p>
        </>
      ) : null}
    </div>
  );
}
