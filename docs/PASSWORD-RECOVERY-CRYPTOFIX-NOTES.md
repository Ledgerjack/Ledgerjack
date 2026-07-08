# Password recovery + a critical crypto fix

## Password recovery (new)
Forgot your password? On the lock screen, choose "Recovery Key" and enter a new
password in the optional field. Because the recovery key IS your master key, it
proves ownership, so the vault is re-sealed under the new password WITHOUT the old
one — and everything stays end-to-end encrypted. No server needed for this.
- New: CryptoContext.resetPasswordWithRecoveryKey(recoveryKey, newPassword).
- Note: a server does NOT enable "magic" email password reset in a zero-knowledge
  system (the server can't decrypt your data). The recovery key is the secure
  recovery mechanism.

## CRITICAL BUG FOUND AND FIXED (surfaced while building the above)
The vault sealed its master key with `crypto.subtle.wrapKey('raw', ephemeralMDK)`,
but `ephemeralMDK` is deliberately NON-EXTRACTABLE. Proven by test: wrapKey throws
`InvalidAccessException` on a non-extractable key (the WebCrypto spec requires
extractable). A code comment claimed "wrapKey works fine without extractable" —
it does not.

Impact: this broke BOTH vault CREATION (setupCryptoEnvelope) and PASSWORD CHANGE
(resealEnvelope/changePassword). It never surfaced because the app had only been
tested statically, never run in a browser — it would have failed on first use.

Fix: seal the envelope with AES-GCM `encrypt` over the raw key bytes instead of
`wrapKey`. This is byte-identical to wrapKey output, so `unlockCryptoEnvelope`
(which uses unwrapKey) still opens it — but it works regardless of extractability,
so the operational key stays non-extractable (defence-in-depth preserved).
- deriveKEK now grants encrypt/decrypt usage.
- New: sealRawMDK(raw, password), decryptEnvelopeToRaw(password, ...).
- setupCryptoEnvelope + changePassword + reset now use these.
- Removed the broken resealEnvelope (a landmine for future devs).
- Verified by an 11-check end-to-end lifecycle test: create -> unlock -> wrong-
  password rejected -> change password -> reset via recovery key -> same key
  preserved. crypto.ts now fully typechecks.

## Data destination choice
The Backup screen now states the choice plainly: our encrypted server (coming
soon), a cloud you control (WebDAV now; Drive/Dropbox/iCloud later), or only this
device. Always end-to-end encrypted.

## Automatic + multi-device backup
Delivered by the server roadmap (Phase 1 auto snapshot backup, Phase 2 sync). The
`src/lib/remote/` seam is in place so this drops in when the server exists.
