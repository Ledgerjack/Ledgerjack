/**
 * BackupReminder — a strong, self-explaining backup nag.
 *
 * Flashing red until the user has BOTH chosen a backup destination AND completed
 * at least one backup. It doesn't block usage (per product decision), but it's
 * unmissable and explains why backing up is in the user's interest. Once set up,
 * it falls back to a gentle "back up again" reminder after a week.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, UploadCloud } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { isBackupConfigured } from '../lib/cloudbackup/destinations';

export default function BackupReminder({ onSetup }: { onSetup: () => void }) {
  const { lastBackupTimestamp } = useApp();
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => { isBackupConfigured().then(setConfigured); }, [lastBackupTimestamp]);

  if (configured === null) return null;

  const neverBackedUp = !lastBackupTimestamp;
  const daysSince = lastBackupTimestamp
    ? Math.floor((Date.now() - lastBackupTimestamp) / (1000 * 60 * 60 * 24))
    : 999;

  // Strong flashing nag: no destination chosen, or never actually backed up.
  if (!configured || neverBackedUp) {
    return (
      <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 animate-pulse">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-800">Set up a backup — please don't skip this</p>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">
              Your books live only on this device. If you lose or wipe it with no backup, your records are gone —
              and you must keep them for HMRC. Choose where your encrypted backup goes; it stays private to you.
            </p>
            <button
              onClick={onSetup}
              className="mt-2 inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Set up backup now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gentle reminder once set up but stale.
  if (daysSince >= 7) {
    return (
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
        <p className="text-sm text-amber-800 flex-1 font-semibold">
          Your last backup was {daysSince} days ago. Back up again to stay safe.
        </p>
        <button
          onClick={onSetup}
          className="flex items-center gap-1.5 bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors shrink-0"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          Back up
        </button>
      </div>
    );
  }

  return null;
}
