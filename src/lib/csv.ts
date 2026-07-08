import Papa from 'papaparse';
import { TAX_REGIONS, type TaxRegion } from './regions';
import { makeSimpleSplits } from './ledger';
import { matchRule, type CategoryRule } from './rules/rules';
import type { DBTransaction, DBSplit, TransactionWithSplits } from './db';

export interface CSVRow {
  date: string;
  description: string;
  amount: string;
  type?: string;
}

export function parseCSV(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: CSVRow[] = results.data.map((row) => {
          const dateKey = Object.keys(row).find((k) => /date/i.test(k)) || 'date';
          const descKey = Object.keys(row).find((k) => /desc|memo|narrative|reference/i.test(k)) || 'description';
          const amtKey  = Object.keys(row).find((k) => /amount|amt|value/i.test(k)) || 'amount';
          const typeKey = Object.keys(row).find((k) => /type|credit|debit|direction/i.test(k));
          return {
            date: row[dateKey] || '',
            description: row[descKey] || '',
            amount: row[amtKey] || '',
            type: typeKey ? row[typeKey] : undefined,
          };
        });
        resolve(rows);
      },
      error: (err: Error) => reject(err),
    });
  });
}

export function csvRowToPendingTransaction(
  row: CSVRow,
  region: TaxRegion,
  rules: CategoryRule[] = [],
): { txFields: Omit<DBTransaction, 'id' | 'last_modified' | 'is_locked'>; splits: Omit<DBSplit, 'id' | 'transaction_id'>[] } {
  const cfg = TAX_REGIONS[region];
  const rawAmount = parseFloat(row.amount.replace(/[^0-9.-]/g, ''));
  const amountCents = Math.abs(Math.round(rawAmount * 100));
  const isCredit = row.type?.toLowerCase().includes('credit') || rawAmount > 0;

  let debitAccount  = isCredit ? cfg.cashAccount : cfg.allowableExpensesParent;
  let creditAccount = isCredit ? cfg.grossIncomeAccount : cfg.cashAccount;

  // Smarter import: if one of the user's rules matches, use its category.
  const rule = matchRule(row.description || '', rules);
  if (rule) {
    if (/^income/i.test(rule.accountId)) creditAccount = rule.accountId;
    else debitAccount = rule.accountId;
  }

  return {
    txFields: {
      date: row.date,
      description: row.description,
      pending_review: true,
      job_tag: undefined,
      attachment_id: undefined,
    },
    splits: makeSimpleSplits(debitAccount, creditAccount, amountCents),
  };
}

export function transactionsToCSV(
  transactions: TransactionWithSplits[],
  region: TaxRegion,
): string {
  const cfg = TAX_REGIONS[region];
  const rows = transactions.map((tx) => {
    const debitSplit  = tx.splits.find((s) => s.amount > 0);
    const creditSplit = tx.splits.find((s) => s.amount < 0);
    return {
      Date: tx.date,
      Description: tx.description,
      'Debit Account':  debitSplit?.account_id || '',
      'Credit Account': creditSplit?.account_id || '',
      Amount: (Math.abs(debitSplit?.amount || 0)) / 100,
      Currency: cfg.currencyCode,
      'Job Tag': tx.job_tag || '',
      Status: tx.pending_review ? 'Pending' : 'Approved',
    };
  });
  return Papa.unparse(rows);
}
