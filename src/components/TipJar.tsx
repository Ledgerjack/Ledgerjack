/**
 * TipJar → the Supporter tier. Voluntary contributions towards running costs and
 * future improvements. Nothing in the app is ever paywalled.
 *
 * Payment links are set by the owner in src/lib/supportConfig.ts (no keys here).
 */

import { useState } from 'react';
import { Heart, ExternalLink } from 'lucide-react';
import { SUPPORT_LINKS, SUPPORT_SUGGESTIONS } from '../lib/supportConfig';

export default function TipJar() {
  const [mode, setMode] = useState<'oneOff' | 'recurring'>('oneOff');

  const url = mode === 'oneOff' ? SUPPORT_LINKS.oneOff : SUPPORT_LINKS.recurring;
  const suggestion = mode === 'oneOff' ? SUPPORT_SUGGESTIONS.oneOff : SUPPORT_SUGGESTIONS.recurring;
  const configured = url.trim() !== '';

  return (
    <div className="bg-white rounded-xl border border-line p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-brand-600" />
        <h3 className="font-bold text-slate-900">Support LedgerJack</h3>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        LedgerJack is free, and always will be. If it's helped you, we'd appreciate a
        contribution towards running costs and future improvements — entirely up to you.
        Everything works either way.
      </p>

      {/* One-off / recurring toggle */}
      <div className="flex p-0.5 bg-slate-100 rounded-lg border border-line">
        <button
          onClick={() => setMode('oneOff')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            mode === 'oneOff' ? 'bg-white shadow-sm text-slate-900 border border-line' : 'text-slate-500'
          }`}
        >
          One-off
        </button>
        <button
          onClick={() => setMode('recurring')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            mode === 'recurring' ? 'bg-white shadow-sm text-slate-900 border border-line' : 'text-slate-500'
          }`}
        >
          Monthly
        </button>
      </div>

      <p className="text-[11px] text-ink-soft text-center">
        Choose any amount you like — many people give {suggestion}.
      </p>

      {configured ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-bold transition-colors"
        >
          <Heart className="w-4 h-4" /> Contribute{mode === 'recurring' ? ' monthly' : ''}
        </a>
      ) : (
        <div className="text-center py-2 px-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
          <p className="text-[11px] text-ink-soft">
            Contribution link not set yet. Add your payment link in
            <span className="font-mono"> src/lib/supportConfig.ts</span>.
          </p>
        </div>
      )}

      <p className="text-[10px] text-ink-soft text-center">
        Contributions go towards hosting, the domain, and paying developers to fix bugs and add features.
      </p>

      {SUPPORT_LINKS.github.trim() !== '' && (
        <a
          href={SUPPORT_LINKS.github}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2 bg-slate-100 hover:bg-slate-200 border border-line text-slate-600 hover:text-slate-900 rounded-lg text-xs font-semibold transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> View source on GitHub
        </a>
      )}
    </div>
  );
}
