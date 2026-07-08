/**
 * AIModelInfo — a plain-English guide to the AI models and roughly what they
 * cost, so users choose with their eyes open. Prices are estimates (see the
 * catalogue), labelled as such. Purely informational.
 */

import { Cpu, Star, Info } from "lucide-react";
import { AI_MODELS, PRICES_AS_OF, type AIModel } from "../lib/ai/aiModels";

function price(m: AIModel): string {
  if (m.inputPerM === null || m.outputPerM === null) return "see provider";
  return `~$${m.inputPerM.toFixed(2)} in / $${m.outputPerM.toFixed(2)} out`;
}

export default function AIModelInfo() {
  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Cpu className="w-5 h-5 text-brand-600" />
        <h3 className="font-bold text-slate-900">AI models &amp; costs</h3>
      </div>

      <div className="space-y-2">
        {AI_MODELS.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg p-3 border ${
              m.recommended ? "border-brand-200 bg-brand-50" : "border-slate-100 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm">{m.label}</span>
                {m.recommended && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-brand-700 bg-brand-100 rounded px-1.5 py-0.5">
                    <Star className="w-3 h-3" /> Recommended
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold text-slate-500">{price(m)}</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">{m.bestFor}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Used for: {m.role === "scanning" ? "Scanning & entries" : "Insights"}</p>
            {m.note && <p className="text-[10px] text-amber-700 mt-1">{m.note}</p>}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-400 flex items-start gap-1">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        Prices are approximate, per 1,000,000 tokens (~750,000 words), as of {PRICES_AS_OF}.
        You pay your provider directly with your own key — always check their pricing page for the current rate.
      </p>
    </div>
  );
}
