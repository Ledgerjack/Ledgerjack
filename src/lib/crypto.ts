// Memory cache for the Master Data Key (MDK) - Scoped to avoid persistent storage exposure (XSS Shield)
//
// Two handles are kept:
//   ephemeralMDK       — non-extractable; used for all encrypt/decrypt/wrapKey operations
//   ephemeralMDKExport — extractable copy, held only during vault initialisation so that
//                        exportEphemeralMDK() can produce the recovery key, then cleared.
//
// Keeping the operational key non-extractable means no JS running in this origin can call
// exportKey('raw', ephemeralMDK) and walk away with the 256-bit secret.
let ephemeralMDK: CryptoKey | null = null;
let ephemeralMDKExport: CryptoKey | null = null;

/** True when the master key is loaded in memory (vault unlocked / just created). */
export function isVaultReady(): boolean {
  return ephemeralMDK !== null;
}

// FIX #5 — PBKDF2 iteration count raised to OWASP 2023 minimum (600k SHA-256).
// The count is also embedded in the envelope so a future upgrade can re-derive
// existing vaults at whatever iteration count they were originally sealed with.
const PBKDF2_ITERATIONS = 600_000;

/**
 * Derives a Key-Encrypting-Key (KEK) from a user password using PBKDF2.
 * `iterations` defaults to the current hardened constant but accepts an override
 * so we can re-derive legacy envelopes that were created at a lower count.
 */
export async function deriveKEK(
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password) as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  );
}

/**
 * Seal raw MDK bytes under a password into an envelope. Uses AES-GCM encrypt on
 * the raw bytes, which is byte-identical to wrapKey('raw', ...) output and can be
 * opened by unlockCryptoEnvelope's unwrapKey — but works regardless of any key
 * handle's extractability (wrapKey requires an extractable key; encrypt does not).
 */
export async function sealRawMDK(rawMDK: Uint8Array, password: string): Promise<{
  salt: string; iv: string; encryptedMDK: string; iterations: number;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const kek  = await deriveKEK(password, salt);
  const ct   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, kek, rawMDK as BufferSource);
  return {
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    encryptedMDK: btoa(String.fromCharCode(...new Uint8Array(ct))),
    iterations: PBKDF2_ITERATIONS,
  };
}

/**
 * Decrypt an envelope back to raw MDK bytes, verifying the password. Returns null
 * if the password is wrong. Used to change the password without needing an
 * extractable in-memory key.
 */
export async function decryptEnvelopeToRaw(
  password: string, saltB64: string, ivB64: string, encryptedMdkB64: string, iterations = PBKDF2_ITERATIONS,
): Promise<Uint8Array | null> {
  try {
    const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
    const iv   = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
    const enc  = Uint8Array.from(atob(encryptedMdkB64), (c) => c.charCodeAt(0));
    const kek  = await deriveKEK(password, salt, iterations);
    const raw  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, kek, enc as BufferSource);
    return new Uint8Array(raw);
  } catch {
    return null;
  }
}

/**
 * Initializes and wraps a brand-new Master Data Key (MDK) for the application.
 * Returns the envelope fields AND stores an extractable copy in `ephemeralMDKExport`
 * so that the caller can immediately call `exportEphemeralMDK()` for the recovery key.
 * That extractable handle is purged as soon as `clearExportHandle()` is called.
 */
export async function setupCryptoEnvelope(password: string): Promise<{
  salt: string;
  iv: string;
  encryptedMDK: string;
  iterations: number;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));

  // FIX #6 — Generate two handles from the same raw key material:
  //   1. A non-extractable operational key stored in `ephemeralMDK`
  //   2. An extractable copy stored in `ephemeralMDKExport` for one-time recovery-key export
  const rawMDK = crypto.getRandomValues(new Uint8Array(32)); // 256-bit

  // Non-extractable operational handle
  ephemeralMDK = await crypto.subtle.importKey(
    'raw',
    rawMDK,
    { name: 'AES-GCM', length: 256 },
    false, // not extractable
    ['encrypt', 'decrypt', 'wrapKey'],
  );

  // Extractable handle — only for recovery key export; cleared by clearExportHandle()
  ephemeralMDKExport = await crypto.subtle.importKey(
    'raw',
    rawMDK,
    { name: 'AES-GCM', length: 256 },
    true, // extractable — intentional, short-lived
    ['encrypt', 'decrypt', 'wrapKey'],
  );

  const kek = await deriveKEK(password, salt);

  // Seal via AES-GCM encrypt on the raw bytes. (wrapKey('raw', ephemeralMDK)
  // would throw InvalidAccessError because ephemeralMDK is non-extractable.)
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    kek,
    rawMDK as BufferSource,
  );

  // Zero-fill the raw bytes now that both handles and the envelope are made.
  rawMDK.fill(0);

  return {
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    encryptedMDK: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
    iterations: PBKDF2_ITERATIONS,
  };
}

/**
 * Clears the short-lived extractable MDK export handle after recovery key has been shown.
 * Call this immediately after exportEphemeralMDK() during vault initialisation.
 */
export function clearExportHandle(): void {
  ephemeralMDKExport = null;
}

/**
 * Unseals the Master Data Key envelope during login/unlock and commits it to memory.
 * Reads `iterations` from the stored envelope so legacy 100k vaults still open correctly.
 */
export async function unlockCryptoEnvelope(
  password: string,
  saltB64: string,
  ivB64: string,
  encryptedMdkB64: string,
  iterations = PBKDF2_ITERATIONS, // FIX #5 — accepts legacy iteration counts
): Promise<boolean> {
  try {
    const salt         = Uint8Array.from(atob(saltB64),         (c) => c.charCodeAt(0));
    const iv           = Uint8Array.from(atob(ivB64),           (c) => c.charCodeAt(0));
    const encryptedMDK = Uint8Array.from(atob(encryptedMdkB64), (c) => c.charCodeAt(0));

    const kek = await deriveKEK(password, salt, iterations);

    // FIX #6 — unwrap as non-extractable; wrapKey works fine without extractable: true
    ephemeralMDK = await crypto.subtle.unwrapKey(
      'raw',
      encryptedMDK,
      kek,
      { name: 'AES-GCM', iv },
      { name: 'AES-GCM', length: 256 },
      false, // NOT extractable — no JS in this origin can call exportKey() on this handle
      ['encrypt', 'decrypt', 'wrapKey'],
    );

    return true;
  } catch (error) {
    console.error('[Crypto] Unwrapping engine failure. Check signature or pass phrases.', error);
    return false;
  }
}

/**
 * Wipes the in-memory keys completely during lock cycles or background timeouts.
 */
export function purgeMemoryWorkspace(): void {
  ephemeralMDK       = null;
  ephemeralMDKExport = null;
}

/**
 * Exports the MDK as base64 for the recovery key shown at vault creation.
 * Reads from the short-lived extractable handle. Call clearExportHandle() immediately after.
 */
export async function exportEphemeralMDK(): Promise<string> {
  if (!ephemeralMDKExport) {
    throw new Error('Export handle unavailable. Recovery key can only be generated at vault creation.');
  }
  const buf = await crypto.subtle.exportKey('raw', ephemeralMDKExport);
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

/**
 * Imports a raw base64 MDK directly into memory (recovery key unlock path).
 * Imported as non-extractable — it came from the user's clipboard, not from storage.
 */
export async function importEphemeralMDK(base64: string): Promise<void> {
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  ephemeralMDK = await crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: 256 },
    false, // FIX #6 — non-extractable once it's in memory
    ['encrypt', 'decrypt', 'wrapKey'],
  );
}

/**
 * Encrypts arbitrary strings (JSON records) using the operational MDK.
 */
export async function encryptTextPayload(text: string): Promise<{ ciphertext: string; iv: string }> {
  if (!ephemeralMDK) throw new Error('Cryptographic context missing. Authenticate workspace first.');

  const iv          = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(text);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    ephemeralMDK,
    encodedData,
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
    iv:         btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Decrypts string records back to primitive readable JSON.
 */
export async function decryptTextPayload(ciphertextB64: string, ivB64: string): Promise<string> {
  if (!ephemeralMDK) throw new Error('Cryptographic context missing. Authenticate workspace first.');

  const iv         = Uint8Array.from(atob(ivB64),         (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0));

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    ephemeralMDK,
    ciphertext,
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Encrypts raw binary data (attachments/media blobs) using the operational MDK.
 */
export async function encryptRaw(data: Uint8Array): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
  if (!ephemeralMDK) throw new Error('Cryptographic context missing. Authenticate workspace first.');

  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, ephemeralMDK, data as BufferSource);
  return { iv, ciphertext: new Uint8Array(buf) };
}

/**
 * Decrypts raw binary data (attachments/media blobs) using the operational MDK.
 */
export async function decryptRaw(iv: Uint8Array, ciphertext: Uint8Array): Promise<Uint8Array> {
  if (!ephemeralMDK) throw new Error('Cryptographic context missing. Authenticate workspace first.');

  const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, ephemeralMDK, ciphertext as BufferSource);
  return new Uint8Array(buf);
}

export async function sha256(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data as BufferSource);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
