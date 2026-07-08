/**
 * remote/snapshotSync — the MVP sync path: push/pull the SAME end-to-end-
 * encrypted snapshot the backup feature already produces. Reuses the verified
 * encryptedBackup crypto, so the server only ever holds ciphertext.
 *
 * These are safe no-ops until a real server is configured (they throw a clear
 * message via the local adapter), so nothing changes for today's users.
 */

import { getRemoteAdapter, isRemoteEnabled } from "./index";
import { exportEncryptedBackup, importEncryptedBackup } from "../cloudbackup/encryptedBackup";

/** Encrypt the whole ledger and store it on the server. */
export async function pushSnapshot(passphrase: string): Promise<void> {
  if (!isRemoteEnabled()) throw new Error("Cloud sync isn't set up yet.");
  const ciphertext = await exportEncryptedBackup(passphrase);
  await getRemoteAdapter().uploadSnapshot(ciphertext);
}

/** Pull the latest server snapshot and restore it (decrypts locally). */
export async function pullSnapshot(passphrase: string): Promise<boolean> {
  if (!isRemoteEnabled()) throw new Error("Cloud sync isn't set up yet.");
  const ciphertext = await getRemoteAdapter().downloadSnapshot();
  if (!ciphertext) return false;
  await importEncryptedBackup(ciphertext, passphrase);
  return true;
}
