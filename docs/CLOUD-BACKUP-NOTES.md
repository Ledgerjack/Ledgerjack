# Encrypted backup + off-device / cloud destinations

## The gap this closes (and a security fix)
The existing backup exported the ledger as PLAIN JSON — fine for a download to
your own device, but transactions/splits are not encrypted at rest, so uploading
that anywhere would leak readable financial data. This adds an END-TO-END
ENCRYPTION layer so a backup can safely live in any cloud.

- src/lib/cloudbackup/encryptedBackup.ts — wraps the export in AES-GCM
  (PBKDF2-SHA256, 210k iterations) keyed by the user's RECOVERY KEY by default (no new secret to lose); a custom passphrase is optional. Verified:
  ciphertext leaks no plaintext, round-trips correctly, rejects wrong/short
  passphrases. Also restores legacy plain backups.

## Destinations (user chooses; mandatory choice, not a hard block)
- Encrypted file (works now, no backend): download the encrypted .ljbackup and
  store it anywhere — your own cloud drive, email, USB.
- WebDAV / Nextcloud (works when the server allows browser CORS; clear error if
  not): uploads the encrypted blob straight to your server.
- Google Drive / Dropbox / iCloud: one-tap, FLAGGED "coming soon" — their OAuth
  secrets need the LedgerJack backend (same honest constraint as live bank feeds).
- Backup passphrase + any WebDAV password are stored ENCRYPTED on-device (via the
  vault), never in the clear, so backups can run without re-prompting.

## Strong nag (per product decision: nag, don't block)
src/components/BackupReminder.tsx now flashes red until the user has BOTH chosen a
destination AND completed at least one backup, and explains why in plain English
("your books live only on this device... you must keep them for HMRC... a backup
is your safety net"). After setup, it becomes a gentle weekly reminder. It never
blocks app usage.

## Wiring
Settings -> Backup, dashboard nag -> Backup, view 'cloud-backup' in App/Navigation.

## Honest notes
- WebDAV from a browser depends on the server sending CORS headers; many don't.
  The encrypted-file option is the always-works fallback.
- One-tap cloud providers need the backend milestone (funded via supporters).
- If the user loses the backup passphrase, the backup can't be recovered — stated
  clearly in the UI. This is inherent to real end-to-end encryption.

## UPDATE — recovery key is the default backup secret (fix)
To avoid introducing a SECOND secret a user could lose, the backup is now
protected by the RECOVERY KEY they already saved at onboarding — nothing new to
remember, and restore uses that same key. A separate custom passphrase is still
available as an option for those who want it. End-to-end encryption inherently
needs some secret; this makes it the ONE the user already has.
