/**
 * ProvisionalFigures — an educational page showing the user their OWN numbers
 * for the current UK tax year, then handing them to HMRC's own calculator.
 *
 * DESIGN DECISION (deliberate): LedgerJack does not calculate tax and holds no
 * tax rates. What we're good at is organising: totalling up income, expenses and
 * profit from the books the user has actually kept. What HMRC is good at — and
 * uniquely authoritative on — is turning that profit into a tax estimate.
 *
 * So this page does our half properly and then points at theirs. No rates, no
 * estimates, nothing that can go stale.
 */

import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, AlertTriangle, Copy, Check, Loader2 } from "lucide-react";
import { aggregatePeriod } from "../lib/mtd/mtdAggregator";
import { currentUkTaxYearWindow } from "../lib/tax/taxPot";
import { formatCurrency } from "../lib/currency";

const HMRC_CALC = "https://www.gov.uk/self-assessment-tax-calculator";
const pence = (pounds: number) => Math.round(pounds * 100);

interface Figures {
  label: string;
  from: string;
  to: string;
  income: number;
  expenses: number;
  profit: number;
  count: number;
}

export default function ProvisionalFigures({ onBack }: { onBack?: () => void }) {
  const [fig, setFig] = useState<Figures | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const w = currentUkTaxYearWindow();
        const s = await aggregatePeriod(w.from, w.to);
        setFig({
          label: w.label,
          from: w.from,
          to: w.to,
          income: s.meta.totalIncome,
          expenses: s.meta.totalExpenses,
          profit: s.meta.net,
          count: s.meta.transactionCount,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copyProfit = async () => {
    if (!fig) return;
    try {
      await navigator.clipboard.writeText(fig.profit.toFixed(2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the figure is on screen anyway */
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1 text-ink-soft font-semibold text-sm">
          ← Back
        </button>
      )}

      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-ink">Your provisional figures</h2>
      </div>

      <p className="text-xs text-ink-soft leading-relaxed">
        These are <strong>your own numbers</strong>, added up from the records you've kept. They're
        provisional — they'll change as you add more entries, and they're only as complete as your books.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-ink-soft animate-spin" />
        </div>
      ) : !fig ? null : (
        <>
          <div className="bg-white rounded-xl border border-line p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              Tax year {fig.label} · 6 Apr – 5 Apr
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Income</p>
                <p className="text-lg font-bold text-brand-700 num">{formatCurrency(pence(fig.income), "uk")}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Expenses</p>
                <p className="text-lg font-bold text-slate-900 num">{formatCurrency(pence(fig.expenses), "uk")}</p>
              </div>
            </div>

            <div className="border-t border-line pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Profit so far</p>
              <p className="text-3xl font-bold text-slate-900 num">{formatCurrency(pence(fig.profit), "uk")}</p>
              <p className="text-[11px] text-ink-soft mt-0.5">
                From {fig.count} record{fig.count === 1 ? "" : "s"} you've entered.
              </p>
            </div>

            <button
              onClick={copyProfit}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 border border-line text-slate-700 py-2 rounded-lg text-xs font-bold"
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy profit figure</>}
            </button>
          </div>

          {/* Hand off to the authority */}
          <div className="bg-white rounded-xl border border-line p-4 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Want to know what tax that might mean?</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              <strong>We don't work that out for you.</strong> We're an organiser, not a tax adviser — and
              tax rates change. HMRC publishes its own free calculator, which is always current because
              they maintain it. Copy your profit above and paste it in there.
            </p>
            <a
              href={HMRC_CALC}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-lg text-sm"
            >
              Open HMRC's tax calculator <ExternalLink className="w-4 h-4" />
            </a>
            <p className="text-[10px] text-ink-soft">
              Opens gov.uk in a new tab. Also available in Welsh.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-[11px] text-amber-800 leading-relaxed font-semibold">
                Please read before relying on any of this.
              </p>
              <ul className="text-[11px] text-amber-800 leading-relaxed space-y-1 list-disc pl-4">
                <li>These figures come from <strong>your</strong> records. If something's missing or miscategorised, they're wrong.</li>
                <li>HMRC's calculator gives an <strong>estimate</strong>. It assumes you get the standard Personal Allowance, and it doesn't cover the High Income Child Benefit Charge, income from savings and investments, or other payments you've made.</li>
                <li>Scotland has different income tax bands.</li>
                <li>Whether an expense is allowable depends on your circumstances — do your own research on GOV.UK.</li>
                <li>None of this is tax advice. <strong>Discuss anything you're unsure about with a qualified accountant.</strong></li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
