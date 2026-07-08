/**
 * BiometricSetup — enable or disable biometric unlock. Enabling asks for the
 * recovery key once (that's the key we wrap with the authenticator). Renders
 * nothing on devices without a platform authenticator + PRF.
 */

import { useEffect, useState } from "react";
import { Fingerprint, CheckCircle2 } from "lucide-react";
import { useCrypto } from "../contexts/CryptoContext";
import { isBiometricSupported, isBiometricEnrolled, enrollBiometric, disableBiometric } from "../lib/biometric/biometric";

export default function BiometricSetup() {
  const { hasVault } = useCrypto();
  const [supported, setSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [opening, setOpening] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    isBiometricSupported().then(setSupported);
    isBiometricEnrolled().then(setEnrolled);
  }, []);

  if (!hasVault || !supported) return null;

  async function enable() {
    if (!recoveryKey.trim()) { setMsg("Enter your recovery key to continue."); return; }
    setBusy(true); setMsg("");
    try {
      await enrollBiometric(recoveryKey.trim());
      setEnrolled(true);
      setOpening(false);
      setRecoveryKey("");
      setMsg("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't enable biometrics.");
    } finally {
      setBusy(false);
    }
  }
  async function disable() {
    await disableBiometric();
    setEnrolled(false);
    setMsg("");
  }

  return (
    <div className="border-t border-slate-100 pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-semibold text-slate-800">Biometric unlock</span>
        </div>
        {enrolled ? (
          <button onClick={disable} className="text-xs font-semibold text-red-500">Turn off</button>
        ) : !opening ? (
          <button onClick={() => setOpening(true)} className="text-xs font-semibold text-brand-600">Enable</button>
        ) : null}
      </div>

      {enrolled && (
        <p className="text-[11px] text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> On for this device.</p>
      )}

      {!enrolled && opening && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-500">
            Enter your recovery key once. We protect it with this device's biometrics — it's never stored in the clear,
            and only your fingerprint/face on this device can unlock it.
          </p>
          <input
            value={recoveryKey}
            onChange={(e) => setRecoveryKey(e.target.value)}
            placeholder="Recovery key"
            className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
          />
          <div className="flex gap-2">
            <button onClick={enable} disabled={busy} className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50">{busy ? "Setting up…" : "Confirm"}</button>
            <button onClick={() => { setOpening(false); setRecoveryKey(""); setMsg(""); }} className="px-4 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold">Cancel</button>
          </div>
        </div>
      )}

      {msg && <p className="text-[11px] text-red-500">{msg}</p>}
    </div>
  );
}
