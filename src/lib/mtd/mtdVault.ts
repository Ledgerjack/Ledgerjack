/**
 * MTD vault storage — wraps LedgerJack's existing crypto + db so HMRC tokens
 * live encrypted in the vault, exactly like your API key does.
 *
 * Uses your real APIs:
 *   crypto.ts  -> encryptTextPayload / decryptTextPayload / sha256
 *   db.ts      -> db.settings (put/get/delete on { key, value })
 *
 * Encrypted values are stored as two keys, matching your api_key pattern:
 *   <name>_ct  (ciphertext, base64)   and   <name>_iv  (iv, base64)
 */

import { db } from "../db";
import { encryptTextPayload, decryptTextPayload, sha256 } from "../crypto";

const TOKENS_KEY = "hmrc_tokens";
const DEVICE_ID_KEY = "mtd_device_id";

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  /** epoch ms when the access token expires */
  expires_at: number;
  scope?: string;
}

/* ---------- encrypted put/get helpers ---------- */

async function putEncrypted(name: string, plaintext: string): Promise<void> {
  const { ciphertext, iv } = await encryptTextPayload(plaintext);
  await db.settings.put({ key: `${name}_ct`, value: ciphertext });
  await db.settings.put({ key: `${name}_iv`, value: iv });
}

async function getEncrypted(name: string): Promise<string | null> {
  const ct = await db.settings.get(`${name}_ct`);
  const iv = await db.settings.get(`${name}_iv`);
  if (!ct?.value || !iv?.value) return null;
  return decryptTextPayload(ct.value, iv.value);
}

async function deleteEncrypted(name: string): Promise<void> {
  await db.settings.delete(`${name}_ct`);
  await db.settings.delete(`${name}_iv`);
}

/* ---------- tokens ---------- */

export async function saveTokens(t: StoredTokens): Promise<void> {
  await putEncrypted(TOKENS_KEY, JSON.stringify(t));
}

export async function loadTokens(): Promise<StoredTokens | null> {
  const raw = await getEncrypted(TOKENS_KEY);
  return raw ? (JSON.parse(raw) as StoredTokens) : null;
}

export async function clearTokens(): Promise<void> {
  await deleteEncrypted(TOKENS_KEY);
}

export async function isConnected(): Promise<boolean> {
  return (await loadTokens()) !== null;
}

/* ---------- NINO (National Insurance number) ---------- */
// Personal data → stored encrypted like the tokens.
const NINO_KEY = "hmrc_nino";

export async function saveNino(nino: string): Promise<void> {
  await putEncrypted(NINO_KEY, nino.toUpperCase().replace(/\s+/g, ""));
}
export async function loadNino(): Promise<string | null> {
  return getEncrypted(NINO_KEY);
}
/** Basic UK NINO shape check (two letters, six digits, one suffix letter). */
export function isValidNino(nino: string): boolean {
  return /^[A-Z]{2}\d{6}[A-D]$/.test(nino.toUpperCase().replace(/\s+/g, ""));
}

/* ---------- VRN (VAT registration number) ---------- */
const VRN_KEY = "hmrc_vrn";

export async function saveVrn(vrn: string): Promise<void> {
  await putEncrypted(VRN_KEY, vrn.replace(/\s+/g, ""));
}
export async function loadVrn(): Promise<string | null> {
  return getEncrypted(VRN_KEY);
}
/** UK VRN is 9 digits. */
export function isValidVrn(vrn: string): boolean {
  return /^\d{9}$/.test(vrn.replace(/\s+/g, ""));
}

/* ---------- device id + stable user id (for fraud headers) ---------- */

/** A per-device UUID, generated once and kept. Non-sensitive, stored plain. */
export async function getOrCreateDeviceId(): Promise<string> {
  const row = await db.settings.get(DEVICE_ID_KEY);
  if (row?.value) return row.value;
  const id = crypto.randomUUID();
  await db.settings.put({ key: DEVICE_ID_KEY, value: id });
  return id;
}

/**
 * A stable, non-PII identifier for HMRC's Gov-Client-User-IDs header.
 * LedgerJack has no username (biometric vault), so we derive an opaque,
 * consistent value by hashing the device id. It reveals nothing about the user.
 */
export async function getStableUserId(): Promise<string> {
  const deviceId = await getOrCreateDeviceId();
  return sha256(new TextEncoder().encode(`ledgerjack:${deviceId}`));
}
