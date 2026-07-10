import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  setupCryptoEnvelope,
  sealRawMDK,
  decryptEnvelopeToRaw,
  unlockCryptoEnvelope,
  purgeMemoryWorkspace,
  exportEphemeralMDK,
  clearExportHandle,
  importEphemeralMDK,
  encryptTextPayload,
  decryptTextPayload,
  encryptRaw,
  decryptRaw,
} from '../lib/crypto';
import { unlockWithBiometric } from '../lib/biometric/biometric';
import { db } from '../lib/db';

interface CryptoContextValue {
  isUnlocked: boolean;
  hasVault: boolean;
  initializeVault: (password: string) => Promise<string>;
  unlockVault: (password: string) => Promise<void>;
  unlockWithRecoveryKey: (recoveryKey: string) => Promise<void>;
  unlockViaBiometric: () => Promise<boolean>;
  lockVault: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  verifyPassword: (password: string) => Promise<boolean>;
  exportRecoveryKey: (password: string) => Promise<string | null>;
  resetPasswordWithRecoveryKey: (recoveryKey: string, newPassword: string) => Promise<void>;
  // FIX #2 — expose encrypt/decrypt for API key storage
  encryptString_: (plaintext: string) => Promise<{ iv: Uint8Array; ciphertext: Uint8Array }>;
  decryptString_: (iv: Uint8Array, ciphertext: Uint8Array) => Promise<string>;
  encryptBlob: (data: Uint8Array) => Promise<{ iv: Uint8Array; ciphertext: Uint8Array }>;
  decryptBlob: (iv: Uint8Array, ciphertext: Uint8Array) => Promise<Uint8Array>;
}

const CryptoContext = createContext<CryptoContextValue | null>(null);

export function CryptoProvider({ children }: { children: ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasVault, setHasVault]     = useState(false);

  React.useEffect(() => {
    db.crypto_envelope.get('master_mdk_envelope').then((r) => setHasVault(!!r));
  }, []);

  const initializeVault = useCallback(async (password: string): Promise<string> => {
    const envelope = await setupCryptoEnvelope(password);
    await db.crypto_envelope.put({
      id:            'master_mdk_envelope',
      salt:          envelope.salt,
      iv:            envelope.iv,
      encrypted_mdk: envelope.encryptedMDK,
      // FIX #5 — persist iteration count so future unlocks use the right derivation
      iterations:    envelope.iterations,
    });

    // Export the recovery key from the short-lived extractable handle, then clear it
    const recoveryKey = await exportEphemeralMDK();
    clearExportHandle();

    setIsUnlocked(true);
    setHasVault(true);
    return recoveryKey;
  }, []);

  const unlockVault = useCallback(async (password: string) => {
    const envelope = await db.crypto_envelope.get('master_mdk_envelope');
    if (!envelope) throw new Error('No vault found.');

    // FIX #5 — pass stored iteration count so legacy 100k vaults still open
    const iterations = (envelope as { iterations?: number }).iterations ?? 100_000;

    const ok = await unlockCryptoEnvelope(
      password,
      envelope.salt,
      envelope.iv,
      envelope.encrypted_mdk,
      iterations,
    );
    if (!ok) throw new Error('Invalid password.');

    setIsUnlocked(true);
  }, []);

  const unlockWithRecoveryKey = useCallback(async (recoveryKey: string) => {
    await importEphemeralMDK(recoveryKey);
    setIsUnlocked(true);
  }, []);

  // Biometric unlock: unwrap the recovery key via the authenticator, then load it
  // through the same path as a manual recovery-key unlock. Returns false if the
  // ceremony didn't complete (caller falls back to passphrase).
  const unlockViaBiometric = useCallback(async () => {
    const recoveryKey = await unlockWithBiometric();
    if (!recoveryKey) return false;
    await importEphemeralMDK(recoveryKey);
    setIsUnlocked(true);
    return true;
  }, []);

  const lockVault = useCallback(() => {
    purgeMemoryWorkspace();
    setIsUnlocked(false);
  }, []);

  // FIX #1 — verify the current password before re-sealing with the new one.
  // Previously _currentPassword was prefixed with _ and never used, meaning any
  // authenticated session could silently rotate the vault password.
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const envelope = await db.crypto_envelope.get('master_mdk_envelope');
    if (!envelope) throw new Error('No vault found.');

    const iterations = (envelope as { iterations?: number }).iterations ?? 100_000;

    // Verify the current password by decrypting the envelope to the raw MDK.
    const raw = await decryptEnvelopeToRaw(
      currentPassword, envelope.salt, envelope.iv, envelope.encrypted_mdk, iterations,
    );
    if (!raw) throw new Error('Current password is incorrect.');

    // Re-seal the same key under the new password.
    const newEnvelope = await sealRawMDK(raw, newPassword);
    raw.fill(0);
    await db.crypto_envelope.put({
      id:            'master_mdk_envelope',
      salt:          newEnvelope.salt,
      iv:            newEnvelope.iv,
      encrypted_mdk: newEnvelope.encryptedMDK,
      iterations:    newEnvelope.iterations,
    });
  }, []);

  // Reset the password using the recovery key (for a forgotten password).
  // The recovery key IS the master key, so it proves ownership; we re-wrap the
  // vault under the new password. No old password or server needed, and this
  // preserves end-to-end encryption.
  // Verify a password against the stored vault without changing anything.
  // Used to gate destructive actions (e.g. delete-all-data).
  const verifyPassword = useCallback(async (password: string): Promise<boolean> => {
    const envelope = await db.crypto_envelope.get('master_mdk_envelope');
    if (!envelope) return false;
    const iterations = (envelope as { iterations?: number }).iterations ?? 100_000;
    const raw = await decryptEnvelopeToRaw(password, envelope.salt, envelope.iv, envelope.encrypted_mdk, iterations);
    if (raw) { raw.fill(0); return true; }
    return false;
  }, []);

  // Re-derive the recovery key (base64 of the master key) by unlocking the
  // envelope with the password. Lets the user back it up any time — gated by
  // their password so a passer-by at an unlocked screen can't grab it.
  const exportRecoveryKey = useCallback(async (password: string): Promise<string | null> => {
    const envelope = await db.crypto_envelope.get('master_mdk_envelope');
    if (!envelope) return null;
    const iterations = (envelope as { iterations?: number }).iterations ?? 100_000;
    const raw = await decryptEnvelopeToRaw(password, envelope.salt, envelope.iv, envelope.encrypted_mdk, iterations);
    if (!raw) return null;
    const key = btoa(String.fromCharCode(...raw));
    raw.fill(0);
    return key;
  }, []);

  const resetPasswordWithRecoveryKey = useCallback(async (recoveryKey: string, newPassword: string) => {
    // The recovery key is the raw MDK in base64. Decode it, re-seal under the new
    // password, then load it into memory so the session is unlocked.
    let raw: Uint8Array;
    try {
      raw = Uint8Array.from(atob(recoveryKey.trim()), (c) => c.charCodeAt(0));
    } catch {
      throw new Error('Invalid recovery key.');
    }
    if (raw.length !== 32) throw new Error('Invalid recovery key.');

    const newEnvelope = await sealRawMDK(raw, newPassword);
    raw.fill(0);
    await db.crypto_envelope.put({
      id:            'master_mdk_envelope',
      salt:          newEnvelope.salt,
      iv:            newEnvelope.iv,
      encrypted_mdk: newEnvelope.encryptedMDK,
      iterations:    newEnvelope.iterations,
    });
    await importEphemeralMDK(recoveryKey.trim());
    setIsUnlocked(true);
  }, []);

  const encryptString_ = useCallback(async (plaintext: string) => {
    const { ciphertext, iv } = await encryptTextPayload(plaintext);
    return {
      iv:         Uint8Array.from(atob(iv),         (c) => c.charCodeAt(0)),
      ciphertext: Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0)),
    };
  }, []);

  const decryptString_ = useCallback(async (iv: Uint8Array, ciphertext: Uint8Array) => {
    const ivB64 = btoa(String.fromCharCode(...iv));
    const ctB64 = btoa(String.fromCharCode(...ciphertext));
    return decryptTextPayload(ctB64, ivB64);
  }, []);

  const encryptBlob = useCallback(async (data: Uint8Array) => encryptRaw(data), []);
  const decryptBlob = useCallback(
    async (iv: Uint8Array, ciphertext: Uint8Array) => decryptRaw(iv, ciphertext),
    [],
  );

  return (
    <CryptoContext.Provider
      value={{
        isUnlocked,
        hasVault,
        initializeVault,
        unlockVault,
        unlockWithRecoveryKey,
        unlockViaBiometric,
        lockVault,
        changePassword,
        verifyPassword,
        exportRecoveryKey,
        resetPasswordWithRecoveryKey,
        encryptString_,
        decryptString_,
        encryptBlob,
        decryptBlob,
      }}
    >
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto(): CryptoContextValue {
  const ctx = useContext(CryptoContext);
  if (!ctx) throw new Error('useCrypto must be used within CryptoProvider');
  return ctx;
}
