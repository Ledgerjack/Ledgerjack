/**
 * TaxPotView — the "money to set aside for tax" estimate, moved into the More
 * section. The estimate nature is made prominent up top. UK only.
 */

import { PiggyBank, AlertTriangle } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import TaxPotCard from "../components/TaxPotCard";

export default function TaxPotView({ onBack, onNavigate }: { onBack?: () => void; onNavigate: (v: string) => void }) {
  const { region } = useApp();

  return (
    <div className="space-y-4 pb-24">
      {onBack && <button onClick={onBack} className="flex items-center gap-1 text-ink-soft font-semibold text-sm">← Back</button>}

      <div className="flex items-center gap-2">
        <PiggyBank className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-ink">Tax pot</h2>
      </div>

      {/* Estimate — made unmistakable */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800 leading-relaxed">
          <strong>This is an estimate, for planning only.</strong> It's a rough guide to how much to set aside — not tax advice, and not HMRC's official figure. Your actual bill depends on your full circumstances. Check important numbers with a qualified accountant.
        </p>
      </div>

      {region === "uk" ? (
        <TaxPotCard onNavigate={onNavigate} />
      ) : (
        <div className="bg-white rounded-xl border border-line p-6 text-center">
          <p className="text-sm text-ink-soft">A tax-pot estimate isn't available for your region yet. You can still track income and expenses, and export figures for your accountant.</p>
        </div>
      )}
    </div>
  );
}
