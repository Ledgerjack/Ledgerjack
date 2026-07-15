/**
 * TaxPotCard — how much to hold back, based on a percentage the user chooses.
 * Deliberately not a tax calculation: we don't hold tax rates. See lib/tax/taxPot.ts.
 */

import { useEffect, useState, useCallback } from "react";
import { PiggyBank, AlertTriangle, Check } from "lucide-react";
import { formatCurrency } from "../lib/currency";
import { computeTaxPot, setSetAsidePercent, type TaxPot } from "../lib/tax/taxPot";

const pence = (pounds: number) => Math.round(pounds * 100);

export default function TaxPotCard() {
  const [pot, setPot] = useState<TaxPot | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setPot(await computeTaxPot()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const n = parseFloat(draft);
    if (!Number.isFinite(n) || n < 0 || n > 100) return;
    setSetAsidePercent(n);
    setEditing(false);
    await load();
  };

  if (loading) return null;
  if (!pot) return null;

  const needsPct = pot.setAsidePercent === null;

  return (
    <div className="bg-white rounded-xl border border-line p-4 space-y-3">
      <div className="flex items-center gap-2">
        <PiggyBank className="w-5 h-5 text-brand-600" />
        <h3 className="font-bold text-slate-900 text-sm">Tax pot ({pot.taxYearLabel})</h3>
      </div>

      {needsPct || editing ? (
        <>
          <p className="text-xs text-ink-soft leading-relaxed">
            How much of your profit do you want to hold back for tax? <strong>You choose this figure</strong> — many people ask their accountant what's sensible for them. We don't set it, because we're not your tax adviser.
          </p>
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              inputMode="decimal"
              placeholder="e.g. the % your accountant suggests"
              className="flex-1 border border-line rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-sm font-bold text-ink">%</span>
            <button onClick={save} className="bg-brand-600 text-white px-3 py-2 rounded-lg text-sm font-bold">
              <Check className="w-4 h-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Hold back</p>
            <p className="text-3xl font-bold text-slate-900 num">{formatCurrency(pence(pot.potPounds), "uk")}</p>
            <p className="text-xs text-ink-soft mt-0.5">
              {pot.setAsidePercent}% of your {formatCurrency(pence(pot.ytdProfit), "uk")} profit so far
            </p>
          </div>
          <button onClick={() => { setDraft(String(pot.setAsidePercent ?? "")); setEditing(true); }} className="text-xs font-bold text-brand-600">
            Change percentage
          </button>
        </>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800 leading-relaxed">
          <strong>This is your own percentage, not a tax calculation.</strong> LedgerJack doesn't work out what you owe and doesn't hold tax rates — your actual bill depends on your full circumstances. Do your own research and check with a qualified accountant.
        </p>
      </div>

      <p className="text-[10px] text-ink-soft">
        Diary note: a Self Assessment payment date falls on {pot.nextPaymentDate}. Check which payments apply to you.
      </p>
    </div>
  );
}
