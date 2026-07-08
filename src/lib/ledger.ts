import { v4 as uuidv4 } from 'uuid';
import { db, loadWithSplits, type DBTransaction, type DBSplit, type TransactionWithSplits } from './db';

export type { DBTransaction, DBSplit, TransactionWithSplits };

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerError';
  }
}

/**
 * Validates that all splits sum to exactly zero (debits positive, credits negative).
 * Uses integer arithmetic to avoid IEEE-754 drift.
 */
export function validateBalance(splits: Pick<DBSplit, 'amount'>[]): boolean {
  return splits.reduce((sum, s) => sum + s.amount, 0) === 0;
}

/**
 * Returns two balanced splits for a simple debit/credit pair.
 * amountCents must be a positive integer (e.g. £10.50 → 1050).
 */
export function makeSimpleSplits(
  debitAccount: string,
  creditAccount: string,
  amountCents: number,
): Omit<DBSplit, 'id' | 'transaction_id'>[] {
  return [
    { account_id: debitAccount,  amount: amountCents,  memo: null },
    { account_id: creditAccount, amount: -amountCents, memo: null },
  ];
}

/**
 * Atomically writes a transaction header + its splits.
 * Enforces: period-lock guard, ≥2 splits, zero-sum balance.
 */
export async function commitBalancedTransaction(
  tx: DBTransaction,
  splits: Omit<DBSplit, 'id' | 'transaction_id'>[],
): Promise<void> {
  if (tx.is_locked) {
    throw new LedgerError('Write rejected: this accounting period is frozen.');
  }
  if (splits.length < 2) {
    throw new LedgerError('Write rejected: a valid entry requires at least 2 splits.');
  }
  if (!validateBalance(splits)) {
    const imbalance = splits.reduce((s, sp) => s + sp.amount, 0);
    throw new LedgerError(
      `Write rejected: ledger imbalance of ${imbalance} subunits detected.`,
    );
  }

  await db.transaction('rw', [db.transactions, db.splits], async () => {
    await db.transactions.put(tx);
    await db.splits.where('transaction_id').equals(tx.id).delete();
    await db.splits.bulkPut(
      splits.map((s) => ({ ...s, id: uuidv4(), transaction_id: tx.id })),
    );
  });
}

/**
 * Creates a new transaction and its splits, returning the saved transaction.
 */
export async function createTransaction(
  txFields: Omit<DBTransaction, 'id' | 'last_modified' | 'is_locked'>,
  splits: Omit<DBSplit, 'id' | 'transaction_id'>[],
): Promise<DBTransaction> {
  const record: DBTransaction = {
    ...txFields,
    id: uuidv4(),
    is_locked: false,
    last_modified: Date.now(),
  };
  await commitBalancedTransaction(record, splits);
  return record;
}

export async function updateTransaction(
  id: string,
  changes: Partial<Omit<DBTransaction, 'id' | 'last_modified'>>,
  splits?: Omit<DBSplit, 'id' | 'transaction_id'>[],
): Promise<void> {
  const existing = await db.transactions.get(id);
  if (!existing) throw new LedgerError('Transaction not found.');
  if (existing.is_locked) throw new LedgerError('Cannot modify a locked transaction.');

  const updated: DBTransaction = { ...existing, ...changes, last_modified: Date.now() };

  if (splits !== undefined) {
    await commitBalancedTransaction(updated, splits);
  } else {
    await db.transactions.put(updated);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const existing = await db.transactions.get(id);
  if (!existing) throw new LedgerError('Transaction not found.');
  if (existing.is_locked) throw new LedgerError('Cannot delete a locked transaction.');

  await db.transaction('rw', [db.transactions, db.splits, db.attachments], async () => {
    await db.splits.where('transaction_id').equals(id).delete();
    await db.transactions.delete(id);
    if (existing.attachment_id) await db.attachments.delete(existing.attachment_id);
  });
}

export async function approveTransaction(id: string): Promise<void> {
  await db.transactions.update(id, { pending_review: false, last_modified: Date.now() });
}

export async function lockTransaction(id: string): Promise<void> {
  await db.transactions.update(id, { is_locked: true, last_modified: Date.now() });
}

export async function getApprovedTransactions(): Promise<TransactionWithSplits[]> {
  const txns = await db.transactions.where('pending_review').equals(0).toArray();
  return loadWithSplits(txns);
}

export async function getPendingTransactions(): Promise<TransactionWithSplits[]> {
  const txns = await db.transactions.filter((tx) => tx.pending_review).toArray();
  return loadWithSplits(txns);
}

export async function getTransactionsByDateRange(
  startDate: string,
  endDate: string,
): Promise<TransactionWithSplits[]> {
  const txns = await db.transactions
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray();
  return loadWithSplits(txns);
}

export async function getTransactionsByJobTag(jobTag: string): Promise<TransactionWithSplits[]> {
  const txns = await db.transactions.where('job_tag').equals(jobTag).toArray();
  return loadWithSplits(txns);
}
