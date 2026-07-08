# Security Policy

## Reporting a vulnerability

Please report security issues **privately**, not via public GitHub issues.
Email: `security@ledgerjack.app` (replace with your real contact before launch).
We aim to acknowledge reports quickly and will credit responsible disclosure.
Please give us reasonable time to fix an issue before disclosing it publicly.

## Security model

- **On-device, end-to-end encrypted.** The ledger lives in the browser's
  IndexedDB. Sensitive fields, attachments, and backups are encrypted with keys
  derived (PBKDF2) from the user's password. The master key is held in memory as
  a non-extractable WebCrypto key while unlocked.
- **No server that can read your data.** The optional HMRC relay
  (`supabase/functions/hmrc-relay`) is zero-knowledge: it forwards signed requests
  and never sees decrypted financial data. There is no analytics or data sale.
- **Backups are encrypted before leaving the device.** Cloud/off-device backups
  are wrapped in AES-GCM (PBKDF2, 210k iterations) so a provider only ever sees
  ciphertext. By default the backup is protected by the user's recovery key (no
  new secret to lose).
- **Biometric unlock** uses the WebAuthn PRF extension to wrap the recovery key
  with an authenticator-bound secret — the stored blob is useless on another
  device, and no key is stored in the clear.
- **AI** runs on the user's own OpenRouter key; figures pass to the chosen model
  under the user's OpenRouter data settings. AI is opt-in and cost is shown.

## Known limitations (be honest with users)

- **Biometric (WebAuthn PRF)** could not be exercised in the build environment —
  it must be tested on real devices before being relied upon.
- **WebDAV backup** from a browser depends on the server allowing CORS; the
  encrypted-file option is the always-works fallback.
- **Lost recovery key / backup passphrase = unrecoverable data.** This is
  inherent to real end-to-end encryption; the UI states it clearly.
- **Transactions are not individually encrypted at rest** in IndexedDB (only
  attachments, certain settings, and exports are). Treat device access as the
  trust boundary; use device-level encryption too.
- **Not independently audited yet.** An external review is recommended before
  handling real users' tax data at scale.
- **External facts to verify** before production: HMRC MTD/VAT endpoint versions,
  OpenRouter model slugs/prices, CIS rates, tax-rate tables.

## Scope

In scope: the client app, crypto/backup, the HMRC relay. Out of scope: the user's
own device security, their OpenRouter/HMRC accounts, and third-party providers
(OpenRouter, Supabase hosting, any cloud they choose for backups).
