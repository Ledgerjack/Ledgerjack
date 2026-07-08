/**
 * biometric — real biometric unlock for the encrypted vault, using the WebAuthn
 * PRF extension.
 *
 * How it stays secure (no false security):
 *  - The vault's master key is never stored in the clear. To enable biometrics,
 *    the user provides their recovery key once (which is the master key in
 *    portable form). We register a platform authenticator (Face ID / fingerprint)
 *    with the PRF extension, derive a wrapping key from the authenticator's PRF
 *    output, encrypt the recovery key with it, and store only that ciphertext.
 *  - The stored blob is useless without the exact authenticator: reproducing the
 *    PRF secret requires a successful biometric ceremony on this device.
 *  - On unlock, biometric auth -> PRF secret -> unwrap recovery key -> load key.
 *
 * Requires the PRF extension (recent Chrome/Safari + platform authenticator).
 * Where unsupported, enrolment throws and the app falls back to the passphrase.
 *
 * NOTE: WebAuthn/PRF cannot be exercised in the build sandbox — this must be
 * tested on real devices before being relied upon. It is strictly safer than the
 * previous placeholder, which faked an unlock without loading any key.
 */

import { db } from "../db";

const KEY = "biometric_enrollment";

interface Enrollment {
  credentialId: string; // base64
  salt: string;         // base64 (PRF eval input)
  iv: string;           // base64 (AES-GCM iv)
  wrapped: string;      // base64 (encrypted recovery key)
}

/* ---------- base64 helpers ---------- */
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/* ---------- capability + state ---------- */
export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === "undefined" || !("PublicKeyCredential" in window)) return false;
  try {
    const fn = (window.PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable;
    return typeof fn === "function" ? await fn() : false;
  } catch {
    return false;
  }
}
export async function isBiometricEnrolled(): Promise<boolean> {
  const row = await db.settings.get(KEY);
  return !!row?.value;
}
export async function disableBiometric(): Promise<void> {
  await db.settings.delete(KEY);
}

/* ---------- crypto helper: AES key from PRF output ---------- */
async function aesKeyFromPRF(prf: ArrayBuffer): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", prf, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: new TextEncoder().encode("ledgerjack-biometric-v1") },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function prfFirst(cred: PublicKeyCredential): ArrayBuffer | null {
  const ext = cred.getClientExtensionResults() as any;
  const first = ext?.prf?.results?.first;
  return first ? (first as ArrayBuffer) : null;
}

/**
 * Enrol biometric unlock. `recoveryKey` is the key shown at vault creation.
 * Throws if the device/browser doesn't support PRF.
 */
export async function enrollBiometric(recoveryKey: string): Promise<void> {
  if (!(await isBiometricSupported())) throw new Error("Biometrics aren't available on this device.");
  const rpId = window.location.hostname;
  const salt = crypto.getRandomValues(new Uint8Array(32));

  const created = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "LedgerJack", id: rpId },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "ledgerjack", displayName: "LedgerJack" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
      timeout: 60000,
      extensions: { prf: { eval: { first: salt } } } as any,
    },
  })) as PublicKeyCredential | null;
  if (!created) throw new Error("Biometric registration was cancelled.");

  const credentialId = new Uint8Array(created.rawId);

  // Obtain the PRF secret. Prefer create-time results; otherwise do one get().
  let prf = prfFirst(created);
  if (!prf) {
    const asserted = (await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId,
        timeout: 60000,
        userVerification: "required",
        allowCredentials: [{ type: "public-key", id: credentialId }],
        extensions: { prf: { eval: { first: salt } } } as any,
      },
    })) as PublicKeyCredential | null;
    prf = asserted ? prfFirst(asserted) : null;
  }
  if (!prf) throw new Error("This device can't protect a key with biometrics (no PRF support).");

  const wrapKey = await aesKeyFromPRF(prf);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrapKey, new TextEncoder().encode(recoveryKey));

  const enrollment: Enrollment = {
    credentialId: b64(credentialId),
    salt: b64(salt),
    iv: b64(iv),
    wrapped: b64(new Uint8Array(ct)),
  };
  await db.settings.put({ key: KEY, value: JSON.stringify(enrollment) });
}

/**
 * Biometric unlock. Returns the recovery key (the caller loads it via the
 * existing recovery-key path), or null if it couldn't complete.
 */
export async function unlockWithBiometric(): Promise<string | null> {
  const row = await db.settings.get(KEY);
  if (!row?.value) return null;
  const e = JSON.parse(row.value) as Enrollment;
  const rpId = window.location.hostname;

  const asserted = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId,
      timeout: 60000,
      userVerification: "required",
      allowCredentials: [{ type: "public-key", id: unb64(e.credentialId) }],
      extensions: { prf: { eval: { first: unb64(e.salt) } } } as any,
    },
  })) as PublicKeyCredential | null;
  if (!asserted) return null;

  const prf = prfFirst(asserted);
  if (!prf) return null;

  const wrapKey = await aesKeyFromPRF(prf);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(e.iv) }, wrapKey, unb64(e.wrapped));
  return new TextDecoder().decode(pt);
}
