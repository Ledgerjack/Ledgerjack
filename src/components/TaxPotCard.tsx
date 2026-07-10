/**
 * TaxPotCard — the "money to set aside for tax" widget for the dashboard.
 * UK only. It's an estimate for planning; HMRC's own figure is in the MTD screen.
 */

import { useEffect, useState } from "react";
import { PiggyBank, ArrowUpRight, Info } from "lucide-react";
import { formatCurrency } from "../lib/currency";
import { computeTaxPot, type TaxPot } from "../lib/tax/taxPot";

const pence = (pounds: number) => Math.round(pounds * 100);

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function TaxPotCard({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [pot, setPot] = useState<TaxPot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    computeTaxPot().then(setPot).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-line p-4">
        <p className="text-sm text-ink-soft">Working out your tax position…</p>
      </div>
    );
  }
  if (!pot) return null;

  return (
    <div className="bg-white rounded-xl border-2 border-brand-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-brand-600" />
          <h3 className="font-bold text-slate-900 text-sm">Tax pot ({pot.taxYearLabel})</h3>
        </div>
        <button onClick={() => onNavigate("mtd")} className="text-[11px] text-brand-600 font-semibold flex items-center gap-0.5">
          HMRC figure <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      <div>
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Set aside for tax</p>
        <p className="text-3xl font-bold text-slate-900">{formatCurrency(pence(pot.potPounds), "uk")}</p>
        {pot.ytdIncome > 0 && (
          <p className="text-xs text-slate-500 mt-0.5">
            about <span className="font-semibold">{pot.setAsidePercent}%</span> of your income so far
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 rounded-lg p-2.5 border border-line">
          <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">Profit so far</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5">{formatCurrency(pence(pot.ytdProfit), "uk")}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 border border-line">
          <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">Income Tax + NI</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5">
            {formatCurrency(pence(pot.estimate.incomeTax), "uk")} + {formatCurrency(pence(pot.estimate.class4NI), "uk")}
          </p>
        </div>
      </div>

      <div className="bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
        <p className="text-[11px] text-brand-800">
          Next payment on account: <span className="font-bold">{formatDate(pot.nextPaymentOnAccount.date)}</span>
          {" "}— typically half your last year's bill (about {formatCurrency(pence(pot.nextPaymentOnAccount.indicativeAmount), "uk")} on this estimate).
        </p>
      </div>

      <p className="text-[10px] text-ink-soft flex items-start gap-1">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        Estimate for England, Wales &amp; NI to help you plan — not tax advice or HMRC's official figure. Scottish rates differ.
      </p>
    </div>
  );
}
