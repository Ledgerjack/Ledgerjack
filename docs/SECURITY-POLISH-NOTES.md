# Onboarding & security polish

## Demo-first onboarding + jurisdiction selector — already present
Onboarding.tsx has the animated intro steps and a searchable country/jurisdiction
selector (auto-detects from the browser, flags, 30+ regions). No change needed.

## Biometric login — SECURITY BUG FOUND AND FIXED
The previous biometric button was **false security**: it was gated to only run
when the vault was already unlocked, there was no credential enrolment at all,
and on "success" it merely flipped a UI session flag WITHOUT loading the
encryption key. It protected nothing.

Replaced with a real implementation (src/lib/biometric/biometric.ts) using the
WebAuthn PRF extension:
- Enrol (Settings -> Security -> Biometric unlock -> Enable): the user enters
  their recovery key once. We register a platform authenticator with PRF, derive
  a wrapping key from the authenticator's PRF secret, encrypt the recovery key
  with it, and store only that ciphertext.
- Unlock (lock screen): biometric ceremony -> PRF secret -> unwrap recovery key
  -> load the master key via the existing recovery-key path -> unlocked.
- The stored blob is useless without this exact device's authenticator. The
  in-memory master key stays non-extractable; we never store any key in the clear.
- Feature-gated: the button only appears when enrolled; enrolment only offered
  when a platform authenticator + PRF are available; passphrase is always the
  fallback.

IMPORTANT: WebAuthn/PRF cannot be exercised in the build sandbox. This is written
to spec and type-checks, but MUST be tested on real devices (iOS Face ID/Touch ID,
Android fingerprint, Windows Hello) before being relied on. It is strictly safer
than the previous placeholder regardless.

## QR backup transfer — DEFERRED (deliberate)
Not shipped yet, for two honest reasons:
1. A full encrypted backup (all transactions) is far too big for a QR code
   (QRs hold a few KB at most), so QR can only carry the recovery KEY, not the
   ledger.
2. A QR of the recovery key is sensitive — anyone who photographs the screen
   gets full access. It's viable (same material the app already shows as text at
   setup) but deserves a careful, warned flow and a QR library we can verify on
   device.
Recommendation: build it next as a "show recovery key as QR (private, one-time)"
helper using a vetted QR lib, paired with the existing encrypted backup FILE for
the actual data. Device transfer already works today via: recovery key (text) +
encrypted backup file.
