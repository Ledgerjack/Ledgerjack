/**
 * mtdAggregator — turns your ledger into the numbers HMRC wants for a quarter.
 *
 * It reads approved (non-pending) transactions in a date range, walks their
 * splits, and sums INCOME and EXPENSE amounts into HMRC's period-summary
 * categories. Bank/cash (ASSET) and other non-P&L splits are ignored — they're
 * the double-entry counterpart, not income or expenditure.
 *
 * Money is stored as signed integer cents (debit > 0, credit < 0). HMRC wants
 * pounds with up to 2 decimals, so we divide by 100 and round.
 */

import { db, type DBAccountType } from "../db";
import { getTransactionsByDateRange } from "../ledger";
import {
  expenseCategoryFor, incomeCategoryFor,
  type HmrcExpenseKey, type HmrcIncomeKey,
} from "./mtdCategories";

export interface PeriodSummary {
  periodDates: { periodStartDate: string; periodEndDate: string };
  periodIncome: Partial<Record<HmrcIncomeKey, number>>;
  /** Itemised expenses (each category). */
  periodExpenses: Partial<Record<HmrcExpenseKey, number>>;
  /** Single-figure alternative allowed under the turnover threshold. */
  consolidatedExpenses: number;
  meta: {
    transactionCount: number;
    totalIncome: number;
    totalExpenses: number;
    net: number;
  };
}

function toPounds(cents: number): number {
  return Math.round(cents) / 100;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Build a path -> account-type lookup once. */
async function accountTypeMap(): Promise<Map<string, DBAccountType>> {
  const accounts = await db.accounts.toArray();
  const m = new Map<string, DBAccountType>();
  for (const a of accounts) m.set(a.id, a.type);
  return m;
}

/** Fallback when an account isn't in the table: infer from its path prefix. */
function inferType(path: string): DBAccountType | undefined {
  if (/^income[:/]/i.test(path)) return "INCOME";
  if (/^expenses?[:/]/i.test(path)) return "EXPENSE";
  return undefined;
}

export async function aggregatePeriod(
  periodStartDate: string,
  periodEndDate: string,
): Promise<PeriodSummary> {
  const [txns, typeMap] = await Promise.all([
    getTransactionsByDateRange(periodStartDate, periodEndDate),
    accountTypeMap(),
  ]);

  const incomeCents: Partial<Record<HmrcIncomeKey, number>> = {};
  const expenseCents: Partial<Record<HmrcExpenseKey, number>> = {};
  let totalIncomeCents = 0;
  let totalExpenseCents = 0;
  let counted = 0;

  for (const tx of txns) {
    if (tx.pending_review) continue; // only approved figures go to HMRC
    counted++;
    for (const s of tx.splits) {
      const type = typeMap.get(s.account_id) ?? inferType(s.account_id);
      if (type === "INCOME") {
        // income sits on the credit side (negative); flip to positive
        const v = -s.amount;
        if (v === 0) continue;
        const key = incomeCategoryFor(s.account_id);
        incomeCents[key] = (incomeCents[key] ?? 0) + v;
        totalIncomeCents += v;
      } else if (type === "EXPENSE") {
        const v = s.amount; // expenses on the debit side (positive)
        if (v === 0) continue;
        const key = expenseCategoryFor(s.account_id);
        expenseCents[key] = (expenseCents[key] ?? 0) + v;
        totalExpenseCents += v;
      }
    }
  }

  const periodIncome: Partial<Record<HmrcIncomeKey, number>> = {};
  for (const k of Object.keys(incomeCents) as HmrcIncomeKey[]) {
    periodIncome[k] = round2(toPounds(incomeCents[k]!));
  }
  const periodExpenses: Partial<Record<HmrcExpenseKey, number>> = {};
  for (const k of Object.keys(expenseCents) as HmrcExpenseKey[]) {
    periodExpenses[k] = round2(toPounds(expenseCents[k]!));
  }

  return {
    periodDates: { periodStartDate, periodEndDate },
    periodIncome,
    periodExpenses,
    consolidatedExpenses: round2(toPounds(totalExpenseCents)),
    meta: {
      transactionCount: counted,
      totalIncome: round2(toPounds(totalIncomeCents)),
      totalExpenses: round2(toPounds(totalExpenseCents)),
      net: round2(toPounds(totalIncomeCents - totalExpenseCents)),
    },
  };
}
