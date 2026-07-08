/**
 * encryptedBackup — wraps the ledger export in an AES-GCM layer so a backup can
 * be stored anywhere (including someone else's cloud) without exposing data.
 *
 * WHY THIS EXISTS: exportBackup() produces plaintext JSON (transactions/splits
 * are not encrypted at rest). That's fine on your own device, but must NOT be
 * uploaded anywhere in the clear. This encrypts it end-to-end with a passphrase;
 * the cloud only ever sees ciphertext.
 *
 * Format (JSON): { magic:"LJENC1", v:1, salt, iv, ct }  (all base64)
 * Key: PBKDF2-SHA256(passphrase, salt, 210k) -> AES-GCM-256.
 */

import { exportBackup, importBackup } from "../backup";

const MAGIC = "LJENC1";
const ITERATIONS = 210000;

/* chunked base64 (safe for large backups) */
function b64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase) as BufferSource, "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Produce an encrypted backup blob (safe to store anywhere). */
export async function exportEncryptedBackup(passphrase: string): Promise<string> {
  if (!passphrase || passphrase.length < 8) throw new Error("Backup passphrase must be at least 8 characters.");
  const plainJson = await exportBackup();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, new TextEncoder().encode(plainJson) as BufferSource);
  return JSON.stringify({ magic: MAGIC, v: 1, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) });
}

/** Restore from a blob — handles both encrypted (LJENC1) and legacy plain backups. */
export async function importEncryptedBackup(blob: string, passphrase: string): Promise<void> {
  let outer: any;
  try {
    outer = JSON.parse(blob);
  } catch {
    throw new Error("Backup file is not valid.");
  }
  if (outer?.magic !== MAGIC) {
    // Legacy plaintext backup — import directly.
    await importBackup(blob);
    return;
  }
  const key = await deriveKey(passphrase, unb64(outer.salt));
  let ptBuf: ArrayBuffer;
  try {
    ptBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(outer.iv) as BufferSource }, key, unb64(outer.ct) as BufferSource);
  } catch {
    throw new Error("Wrong passphrase, or the backup file is corrupted.");
  }
  await importBackup(new TextDecoder().decode(new Uint8Array(ptBuf)));
}

/** True if a blob is an encrypted LedgerJack backup. */
export function isEncryptedBackup(blob: string): boolean {
  try { return JSON.parse(blob)?.magic === MAGIC; } catch { return false; }
}
