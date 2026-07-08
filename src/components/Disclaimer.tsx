import { AlertTriangle } from 'lucide-react';

export default function Disclaimer() {
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-xs text-amber-900 flex items-start gap-2 font-medium leading-relaxed">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
      <span>
        LedgerJack is a pre-accounting organization utility only and does not provide certified
        professional tax advice. Data is encrypted locally and is the user's sole responsibility.
      </span>
    </div>
  );
}
