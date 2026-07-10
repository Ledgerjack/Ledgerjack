/**
 * TrustView — a plain-English privacy/trust explainer. Reinforces the motto and
 * gives the user a one-tap way to export their data (a trust signal).
 */

import { ArrowLeft, ShieldCheck, Download, Lock } from "lucide-react";
import { APP_MOTTO, APP_PROMISES } from "../lib/brand";
import { exportTransactionsCSV } from "../lib/statements/exporters";

export default function TrustView({ onBack, onOpenBackup }: { onBack: () => void; onOpenBackup: () => void }) {
  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
        <ShieldCheck className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-slate-900">Privacy &amp; trust</h2>
      </div>

      <div className="bg-brand-50 border-2 border-brand-200 rounded-xl p-4">
        <p className="text-sm font-bold text-brand-900">{APP_MOTTO}</p>
      </div>

      <div className="space-y-2">
        {APP_PROMISES.map((p) => (
          <div key={p.title} className="bg-white rounded-xl border border-line p-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Lock className="w-4 h-4 text-brand-600" /> {p.title}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-line p-4 space-y-2">
        <h3 className="text-sm font-bold text-slate-900">Your data is yours</h3>
        <p className="text-xs text-slate-500">Export it anytime, no lock-in.</p>
        <button onClick={() => exportTransactionsCSV("0000-01-01", "9999-12-31")} className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-semibold">
          <Download className="w-4 h-4" /> Export all transactions (CSV)
        </button>
        <button onClick={onOpenBackup} className="w-full flex items-center justify-center gap-1.5 bg-brand-600 text-white py-2 rounded-lg text-sm font-bold">
          <ShieldCheck className="w-4 h-4" /> Full encrypted backup
        </button>
      </div>
    </div>
  );
}
