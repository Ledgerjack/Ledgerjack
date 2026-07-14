/**
 * migrateAtRest — one-time (idempotent) migration that encrypts any legacy
 * plaintext records already in the database, so existing data gets the same
 * at-rest protection as newly-written data.
 *
 * Safety:
 *  - Idempotent: already-encrypted rows are skipped, so it can be re-run.
 *  - Per-row atomic updates: each transaction/split is updated in one write, so
 *    an interruption can never leave a split with a zeroed plaintext amount and
 *    no encrypted copy.
 *  - Backward compatible: rows it hasn't reached yet remain readable as plaintext.
 *
 * Requires the vault to be unlocked (uses the in-memory master key).
 */

import { db } from "./db";
import { encField, encAmount, isEncrypted } from "./atRest";

export async function countPlaintextAtRest(): Promise<number> {
  let n = 0;
  const txs = await db.transactions.toArray();
  for (const t of txs) if (t.description && !isEncrypted(t.description)) n++;
  const sps = await db.splits.toArray();
  for (const s of sps) if (!s.amount_enc) n++;
  return n;
}

export async function migrateEncryptAtRest(): Promise<{ transactions: number; splits: number }> {
  let txDone = 0;
  let spDone = 0;

  const txs = await db.transactions.toArray();
  for (const t of txs) {
    if (t.description && !isEncrypted(t.description)) {
      await db.transactions.update(t.id, { description: await encField(t.description) });
      txDone++;
    }
  }

  const sps = await db.splits.toArray();
  for (const s of sps) {
    if (!s.amount_enc) {
      // Single atomic update: set the encrypted copy AND zero the plaintext together.
      await db.splits.update(s.id, { amount_enc: await encAmount(s.amount), amount: 0 });
      spDone++;
    }
  }

  return { transactions: txDone, splits: spDone };
}
