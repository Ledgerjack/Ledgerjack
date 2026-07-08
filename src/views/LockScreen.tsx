// FIX #4 — brute-force throttling on the lock screen.
//
// Previously there was no delay, counter, or lockout after failed attempts, meaning
// a local script (e.g. from XSS) could iterate millions of guesses overnight.
//
// Changes:
//  - Track failed attempt count in component state
//  - After MAX_FREE_ATTEMPTS failures, calculate an exponential back-off delay
//    (2^n seconds, capped at MAX_DELAY_MS)
//  - Disable the Unlock button and show a countdown during the cooldown period
//  - Back-off state is in-memory only (clears on page reload) so it doesn't
//    persist legitimate users after a browser restart

import { useState, useEffect, useRef } from 'react';
import { Key, Fingerprint } from 'lucide-react';
import { useCrypto } from '../contexts/CryptoContext';
import { useSession } from '../contexts/SessionContext';
import { isBiometricEnrolled } from '../lib/biometric/biometric';

// After this many consecutive failures the back-off kicks in
const MAX_FREE_ATTEMPTS = 3;
// Delay in ms = 2^(attempts - MAX_FREE_ATTEMPTS) * BASE_DELAY_MS, capped at MAX_DELAY_MS
const BASE_DELAY_MS  = 1_000;
const MAX_DELAY_MS   = 30_000;

function calcDelay(attempts: number): number {
  if (attempts <= MAX_FREE_ATTEMPTS) return 0;
  const exp = attempts - MAX_FREE_ATTEMPTS;
  return Math.min(BASE_DELAY_MS * Math.pow(2, exp - 1), MAX_DELAY_MS);
}

export default function LockScreen() {
  const [password,     setPassword]     = useState('');
  const [recoveryKey,  setRecoveryKey]  = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [error,        setError]        = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [loading,      setLoading]      = useState(false);

  // FIX #4 — throttle state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownMs,     setCooldownMs]     = useState(0);
  const [cooldownLeft,   setCooldownLeft]   = useState(0); // seconds remaining
  const [bioEnrolled,    setBioEnrolled]     = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const { unlockVault, unlockWithRecoveryKey, unlockViaBiometric, resetPasswordWithRecoveryKey } = useCrypto();
  useEffect(() => { isBiometricEnrolled().then(setBioEnrolled); }, []);
  const { unlockSession } = useSession();

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimer.current)    clearTimeout(cooldownTimer.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, []);

  const startCooldown = (attempts: number) => {
    const delay = calcDelay(attempts);
    if (delay === 0) return;

    setCooldownMs(delay);
    const seconds = Math.ceil(delay / 1000);
    setCooldownLeft(seconds);

    // Countdown ticker
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    countdownInterval.current = setInterval(() => {
      setCooldownLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // End of cooldown
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    cooldownTimer.current = setTimeout(() => {
      setCooldownMs(0);
      setCooldownLeft(0);
    }, delay);
  };

  const handleUnlock = async () => {
    if (cooldownMs > 0) return; // button should be disabled, but guard anyway
    setError('');
    setLoading(true);
    try {
      await unlockVault(password);
      unlockSession();
      setFailedAttempts(0);
    } catch {
      const next = failedAttempts + 1;
      setFailedAttempts(next);
      startCooldown(next);

      const delay = calcDelay(next);
      if (delay > 0) {
        setError(`Invalid password. Please wait ${Math.ceil(delay / 1000)}s before trying again.`);
      } else {
        setError(`Invalid password. Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryUnlock = async () => {
    setError('');
    setLoading(true);
    try {
      if (resetNewPassword) {
        if (resetNewPassword.length < 8) { setError('New password must be at least 8 characters.'); setLoading(false); return; }
        await resetPasswordWithRecoveryKey(recoveryKey, resetNewPassword);
      } else {
        await unlockWithRecoveryKey(recoveryKey);
      }
      unlockSession();
      setFailedAttempts(0);
    } catch {
      setError('Invalid recovery key.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    setError('');
    try {
      const ok = await unlockViaBiometric();
      if (ok) {
        unlockSession();
      } else {
        setError('Biometric unlock didn\u2019t complete. Use your password.');
      }
    } catch {
      setError('Biometric unlock failed. Use your password.');
    }
  };

  const isThrottled  = cooldownMs > 0;
  const unlockDisabled = loading || !password || isThrottled;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-brand-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-xl font-bold">LJ</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">LedgerJack Locked</h1>
          <p className="text-slate-500 mt-1 text-sm">Enter your password to unlock</p>
        </div>

        {!showRecovery ? (
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && !unlockDisabled && handleUnlock()}
              placeholder="Vault password"
              disabled={isThrottled}
              className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none font-medium disabled:opacity-50"
              autoFocus
            />

            {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

            {/* FIX #4 — cooldown indicator */}
            {isThrottled && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm font-medium text-center">
                Too many attempts — try again in {cooldownLeft}s
              </div>
            )}

            <button
              onClick={handleUnlock}
              disabled={unlockDisabled}
              className="w-full bg-brand-500 text-white font-bold py-3 rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Unlocking...' : isThrottled ? `Locked (${cooldownLeft}s)` : 'Unlock'}
            </button>

            <div className="flex items-center gap-3">
              {bioEnrolled && (
                <button
                  onClick={handleBiometric}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-slate-300 text-slate-600 py-3 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-colors"
                >
                  <Fingerprint className="w-5 h-5" />
                  <span className="text-sm font-semibold">Biometric</span>
                </button>
              )}
              <button
                onClick={() => setShowRecovery(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-slate-300 text-slate-600 py-3 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-colors"
              >
                <Key className="w-5 h-5" />
                <span className="text-sm font-semibold">Recovery Key</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              value={recoveryKey}
              onChange={(e) => { setRecoveryKey(e.target.value); setError(''); }}
              placeholder="Paste your recovery key"
              className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-slate-900 text-xs font-mono placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              autoFocus
            />
            {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3 space-y-2">
              <label className="text-xs font-semibold text-slate-600">Forgot your password? Set a new one (optional)</label>
              <input
                type="password"
                value={resetNewPassword}
                onChange={(e) => { setResetNewPassword(e.target.value); setError(''); }}
                placeholder="New password (at least 8 characters)"
                className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 outline-none"
              />
              <p className="text-[10px] text-slate-400">Leave blank to just unlock. Your recovery key proves it's you, so this resets the password without needing the old one — and your data stays end-to-end encrypted.</p>
            </div>
            <button
              onClick={handleRecoveryUnlock}
              disabled={loading || !recoveryKey}
              className="w-full bg-brand-500 text-white font-bold py-3 rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Working…' : resetNewPassword ? 'Reset password & unlock' : 'Unlock with Recovery Key'}
            </button>
            <button
              onClick={() => setShowRecovery(false)}
              className="w-full text-slate-500 text-sm hover:text-slate-700 transition-colors font-medium"
            >
              Back to password
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
