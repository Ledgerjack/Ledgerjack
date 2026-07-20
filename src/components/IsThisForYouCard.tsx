/**
 * IsThisForYouCard — tells people when LedgerJack ISN'T the right tool, and
 * where to go instead.
 *
 * DESIGN DECISION (deliberate): we are free, so we have nothing to lose by
 * being honest, and everything to gain. Somebody who'd be better served
 * elsewhere and finds out in month one has a bad experience and tells people.
 * Somebody we send away kindly remembers that we did. This is a cost paid
 * ONLY by tools that need the sale — which is a genuine advantage of not
 * needing one.
 */

import { Compass, ExternalLink } from "lucide-react";

export default function IsThisForYouCard() {
  return (
    <div className="bg-white rounded-xl border border-line p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Compass className="w-5 h-5 text-brand-600" />
        <h3 className="font-bold text-slate-900">Is LedgerJack right for you?</h3>
      </div>

      <p className="text-xs text-ink-soft leading-relaxed">
        We're not right for everyone, and we'd rather say so than waste your time.
      </p>

      <div>
        <p className="text-xs font-bold text-brand-700 mb-1">It's a good fit if you…</p>
        <ul className="text-[11px] text-ink-soft leading-relaxed space-y-1 list-disc pl-4">
          <li>want to keep organised records without paying a subscription</li>
          <li>have a manageable number of transactions and mostly work from receipts</li>
          <li>care that nobody — including us — can read your books</li>
          <li>work somewhere with patchy signal, and need it to work anyway</li>
          <li>want to hand your accountant something tidy instead of a carrier bag</li>
        </ul>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-700 mb-1">Look elsewhere if you…</p>
        <ul className="text-[11px] text-ink-soft leading-relaxed space-y-1 list-disc pl-4">
          <li><strong>want your bank to fill the books in for you.</strong> We don't do bank feeds — that would mean a third party reading your account, which is the one thing we promise never happens. If automatic bank transactions matter more to you than privacy, a bank-linked app will genuinely suit you better.</li>
          <li><strong>need someone to phone in January.</strong> We're a small operation. Paid tools have support teams; that's worth real money when you're stuck at 11pm before a deadline.</li>
          <li><strong>have a complicated tax position</strong> — partnerships, a limited company, lots of employees. This is built for sole traders keeping their own records.</li>
          <li><strong>want the software to tell you what tax you owe.</strong> We deliberately don't: we organise your figures, we don't calculate your tax.</li>
        </ul>
      </div>

      <p className="text-[11px] text-ink-soft leading-relaxed">
        HMRC keeps a list of every tool that can file, free and paid, and it's the honest place to compare.
      </p>

      <a
        href="https://www.gov.uk/guidance/find-software-thats-compatible-with-making-tax-digital-for-income-tax"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 border border-line text-slate-700 py-2 rounded-lg text-xs font-bold"
      >
        See HMRC's list of compatible software <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
