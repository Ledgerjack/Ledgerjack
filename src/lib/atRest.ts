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

/**
 * Attempt to decrypt a stored field. Returns null if it IS encrypted but cannot
 * be decrypted (wrong key, corrupt data, malformed). Legacy plaintext returns
 * as-is. Use this when you need to know whether decryption actually worked.
 */
export async function tryDecField(stored: string | undefined | null): Promise<string | null> {
  const s = stored ?? "";
  if (!isEncrypted(s)) return s;
  const body = s.slice(MARKER.length);
  const dot = body.indexOf(".");
  if (dot < 0) return null;
  const iv = body.slice(0, dot);
  const ct = body.slice(dot + 1);
  try {
    return await decryptTextPayload(ct, iv);
  } catch {
    return null;
  }
}

/**
 * Runtime tally of fields that failed to decrypt during normal reads.
 *
 * Reads stay fail-safe (a single bad row must never crash a whole view), but a
 * silent failure is worse than a loud one: a defect that passes unnoticed is
 * how a wrong number ends up looking like a fact. So every swallowed failure is
 * counted here and surfaced by the self-check / health panel.
 */
let runtimeDecryptFailures = 0;
export function getRuntimeDecryptFailures(): number {
  return runtimeDecryptFailures;
}
export function resetRuntimeDecryptFailures(): void {
  runtimeDecryptFailures = 0;
}

/**
 * Decrypt a stored string field for display. Legacy plaintext passes through
 * unchanged. Fail-safe: on failure it returns the stored value rather than
 * throwing — but the failure is recorded (see getRuntimeDecryptFailures).
 */
export async function decField(stored: string | undefined | null): Promise<string> {
  const s = stored ?? "";
  if (!isEncrypted(s)) return s;
  const v = await tryDecField(s);
  if (v === null) {
    runtimeDecryptFailures++;
    return s; // fail-safe: never throw on read
  }
  return v;
}

/** Encrypt a numeric amount (pence) into a marker string for the amount_enc field. */
export async function encAmount(n: number): Promise<string> {
  return encField(String(n));
}

/**
 * Decrypt an encrypted amount back to a number. If the stored value isn't
 * encrypted (legacy row), the caller's plaintext fallback is used.
 *
 * If it IS encrypted but won't decrypt, we fall back rather than throw — but we
 * record the failure, because an amount that quietly renders as £0.00 is a
 * wrong number wearing the costume of a real one.
 */
export async function decAmount(
  storedEnc: string | undefined | null,
  fallback: number,
): Promise<number> {
  if (!isEncrypted(storedEnc ?? "")) return fallback;
  const plain = await tryDecField(storedEnc);
  if (plain === null) {
    runtimeDecryptFailures++;
    return fallback;
  }
  const v = Number(plain);
  if (!Number.isFinite(v)) {
    runtimeDecryptFailures++;
    return fallback;
  }
  return v;
}
