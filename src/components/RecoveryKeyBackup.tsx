/**
 * RecoveryKeyBackup — lets the user back up their recovery key to their device
 * (a downloaded file) or email/share it. Gated by their password, since the
 * recovery key unlocks the vault WITHOUT a password. Clear warnings included.
 */

import { useState } from "react";
import { Key, Download, Mail, AlertTriangle, Copy, Check } from "lucide-react";
import { useCrypto } from "../contexts/CryptoContext";
import { downloadFile } from "../lib/backup";
import { nativeShareFile } from "../lib/share/share";

export default function RecoveryKeyBackup() {
  const { exportRecoveryKey } = useCrypto();
  const [password, setPassword] = useState("");
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const unlock = async () => {
    if (!password) { setError("Enter your password."); return; }
    setBusy(true); setError("");
    try {
      const k = await exportRecoveryKey(password);
      if (!k) { setError("Incorrect password."); return; }
      setKey(k); setPassword("");
    } finally { setBusy(false); }
  };

  const filename = `ledgerjack-recovery-key-${new Date().toISOString().slice(0, 10)}.txt`;
  const fileBody = (k: string) =>
    `LedgerJack recovery key\n\nKEEP THIS SAFE AND PRIVATE. Anyone with this key can open your LedgerJack data WITHOUT your password.\nDo NOT store it in the same place as your data backup.\n\n${k}\n`;

  const saveToDevice = (k: string) => { downloadFile(fileBody(k), filename, "text/plain"); setMsg("Saved to your device. Move it somewhere safe and private."); };

  const emailOrShare = async (k: string) => {
    const shared = await nativeShareFile(filename, fileBody(k), "text/plain");
    if (shared) setMsg("Pick your email app and send it to yourself. Keep it separate from your data backup.");
    else { downloadFile(fileBody(k), filename, "text/plain"); setMsg("Downloaded — attach it to an email to yourself, kept separate from your data backup."); }
  };

  const copy = async (k: string) => { try { await navigator.clipboard.writeText(k); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } };

  return (
    <div className="bg-white rounded-xl border border-line p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Key className="w-5 h-5 text-brand-600" />
        <h3 className="font-bold text-slate-900">Back up your recovery key</h3>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800 leading-relaxed">
          Your recovery key is the <strong>only way back in</strong> if you forget your password — but it also <strong>unlocks your data without a password</strong>. Keep it private, and ideally store it <strong>somewhere different from your data backup</strong> (if both sit in the same inbox, anyone with that inbox has everything).
        </p>
      </div>

      {!key ? (
        <>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") unlock(); }}
            placeholder="Enter your password to reveal it"
            className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white text-ink"
          />
          {error && <p className="text-xs font-bold text-red-700">{error}</p>}
          <button onClick={unlock} disabled={busy} className="w-full bg-brand-600 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">
            {busy ? "Checking…" : "Show recovery key"}
          </button>
        </>
      ) : (
        <>
          <div className="bg-slate-50 border border-line rounded-lg p-3 flex items-center justify-between gap-2">
            <code className="text-xs text-ink break-all font-mono">{key}</code>
            <button onClick={() => copy(key)} className="shrink-0 text-brand-600" aria-label="Copy">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => saveToDevice(key)} className="flex items-center justify-center gap-1.5 bg-brand-50 text-brand-700 border border-line py-2.5 rounded-lg text-sm font-bold">
              <Download className="w-4 h-4" /> Save to device
            </button>
            <button onClick={() => emailOrShare(key)} className="flex items-center justify-center gap-1.5 bg-brand-50 text-brand-700 border border-line py-2.5 rounded-lg text-sm font-bold">
              <Mail className="w-4 h-4" /> Email it
            </button>
          </div>
          <button onClick={() => { setKey(null); setMsg(""); }} className="w-full text-xs font-bold text-ink-soft py-1">Hide key</button>
        </>
      )}

      {msg && <p className="text-xs text-brand-700 font-medium">{msg}</p>}
    </div>
  );
}
