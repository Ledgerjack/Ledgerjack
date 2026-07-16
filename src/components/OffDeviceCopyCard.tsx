/**
 * OffDeviceCopyCard — the backup habit, spelled out.
 *
 * DESIGN DECISION (deliberate): LedgerJack does not connect to Google Drive,
 * Dropbox or iCloud, and won't. Every phone and laptop already has a
 * "Share"/"Save to Files" sheet that reaches all of them — plus email and a USB
 * stick, which no OAuth integration covers. Building it would mean client IDs,
 * brand verification, refresh tokens in browser storage, and a dependency that
 * breaks silently whenever a provider changes policy — all to do a worse job of
 * what the operating system already does well.
 *
 * So we don't integrate. We remind. An app that never touches your cloud account
 * can't leak one either.
 */

import { CalendarClock, AlertTriangle, ShieldCheck } from "lucide-react";

export default function OffDeviceCopyCard() {
  return (
    <div className="bg-white rounded-xl border border-line p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="w-5 h-5 text-brand-600" />
        <h3 className="font-bold text-slate-900">Back up every week — in two places</h3>
      </div>

      <p className="text-xs text-ink-soft leading-relaxed">
        Make it a weekly habit. Pick a day that suits you — payday, or whenever you catch up on paperwork — and keep <strong>two copies in two places</strong>:
      </p>

      <ol className="text-xs text-ink-soft leading-relaxed space-y-1.5 list-decimal pl-4">
        <li><strong>On this device</strong> — save the backup file here, so it's quick to restore.</li>
        <li><strong>In a cloud drive of your choice</strong> — iCloud, Google Drive, Dropbox, OneDrive, an email to yourself, or a USB stick. Use your phone's <strong>Share</strong> or <strong>Save to Files</strong> button; it reaches all of them.</li>
      </ol>

      <p className="text-xs text-ink-soft leading-relaxed">
        <strong>A backup that only lives on this phone isn't a backup.</strong> If it's lost, stolen, dropped down a drain or wiped, you lose your books and the backup together. That's why the second copy matters.
      </p>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800 leading-relaxed">
          <strong>Use the encrypted backup for the cloud copy.</strong> Your cloud provider can read an ordinary file; the encrypted one is just scrambled text to them.
        </p>
      </div>

      <div className="bg-brand-50 border border-brand-200 rounded-lg p-2.5 flex gap-2">
        <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-brand-800 leading-relaxed">
          <strong>We don't connect to your cloud account, and we never see your backup.</strong> That's on purpose — we can't lose, leak or read what we never hold. The trade is that the second copy is your job, and we'll keep nudging you about it.
        </p>
      </div>

      <p className="text-[11px] text-ink-soft leading-relaxed">
        <strong>Remember:</strong> only you can open an encrypted backup. If you lose both your password and your recovery key, nobody can get your books back — not us, not anyone. Keep the recovery key somewhere separate from the backup itself.
      </p>
    </div>
  );
}
