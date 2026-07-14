/**
 * atRest — backward-compatible field-level encryption for data stored in
 * IndexedDB, so that sensitive ledger values (transaction descriptions and
 * split amounts) are encrypted at rest under the vault's master key, not just
 * receipts and backups.
 *
 * Design goals (safety first):
 *  - BACKWARD COMPATIBLE: any stored value WITHOUT the marker is treated as
 *    legacy plaintext and returned unchanged. Existing data can never become
 *    unreadable — at worst an old row stays plaintext until it is next saved.
 *  - IDEMPOTENT: encrypting an already-encrypted value returns it unchanged, so
 *    re-saving a record never double-encrypts.
 *  - FAIL-SAFE ON READ: a decryption error returns the stored value rather than
 *    throwing, so a single bad row cannot crash a whole view.
 *
 * Encryption uses the in-memory master key via crypto.ts, so it only works
 * while the vault is unlocked (which is always true when data is being shown).
 */

import { encryptTextPayload, decryptTextPayload, isVaultReady } from "./crypto";

// Control-character sentinel — will not occur in text a user types.
const MARKER = "\u0002LJE1\u0002";

export function isEncrypted(v: string | undefined | null): boolean {
  return typeof v === "string" && v.startsWith(MARKER);
}

/** True when at-rest encryption is available (vault key loaded). */
export function canEncryptAtRest(): boolean {
  return isVaultReady();
}

/**
 * Encrypt a string field for storage. Idempotent; empty stays empty.
 * If no vault key is loaded (no vault / locked session) it returns the plaintext
 * unchanged rather than throwing — saving must never fail. Such rows encrypt
 * later, when re-saved or via the "Encrypt older records" migration.
 */
export async function encField(plain: string | undefined | null): Promise<string> {
  const s = plain ?? "";
  if (s === "") return "";
  if (isEncrypted(s)) return s;
  if (!isVaultReady()) return s;
  const { ciphertext, iv } = await encryptTextPayload(s);
  return `${MARKER}${iv}.${ciphertext}`;
}

/** Decrypt a stored string field. Legacy plaintext passes through unchanged. */
export async function decField(stored: string | undefined | null): Promise<string> {
  const s = stored ?? "";
  if (!isEncrypted(s)) return s;
  const body = s.slice(MARKER.length);
  const dot = body.indexOf(".");
  if (dot < 0) return s;
  const iv = body.slice(0, dot);
  const ct = body.slice(dot + 1);
  try {
    return await decryptTextPayload(ct, iv);
  } catch {
    return s; // fail-safe: never throw on read
  }
}

/** Encrypt a numeric amount (pence) into a marker string for the amount_enc field. */
export async function encAmount(n: number): Promise<string> {
  return encField(String(n));
}

/**
 * Decrypt an encrypted amount back to a number. If the stored value isn't
 * encrypted (legacy row), the caller's plaintext fallback is used.
 */
export async function decAmount(
  storedEnc: string | undefined | null,
  fallback: number,
): Promise<number> {
  if (!isEncrypted(storedEnc ?? "")) return fallback;
  const v = Number(await decField(storedEnc));
  return Number.isFinite(v) ? v : fallback;
}
