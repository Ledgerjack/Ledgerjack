/**
 * sa103 — a PROVISIONAL UK Self Assessment self-employment (SA103) summary:
 * turnover, allowable expenses grouped into HMRC's categories, and net profit.
 * Provisional only — for the user to check with their accountant. Cents.
 */

import { getApprovedTransactions } from "../ledger";
import { db, type DBAccountType } from "../db";
import { expenseCategoryFor, incomeCategoryFor, type HmrcExpenseKey } from "../mtd/mtdCategories";

const EXPENSE_LABELS: Record<HmrcExpenseKey, string> = {
  costOfGoods: "Cost of goods bought for resale",
  paymentsToSubcontractors: "Construction industry — subcontractors",
  wagesAndStaffCosts: "Wages, salaries and staff costs",
  carVanTravelExpenses: "Car, van and travel expenses",
  premisesRunningCosts: "Rent, rates, power and insurance",
  maintenanceCosts: "Repairs and maintenance",
  adminCosts: "Phone, office and admin costs",
  businessEntertainmentCosts: "Business entertainment",
  advertisingCosts: "Advertising and business promotion",
  interestOnBankOtherLoans: "Interest on bank and other loans",
  financeCharges: "Bank, credit card and other financial charges",
  irrecoverableDebts: "Irrecoverable debts written off",
  professionalFees: "Accountancy, legal and professional fees",
  depreciation: "Depreciation and loss on assets",
  otherExpenses: "Other business expenses",
};

export interface SA103Expense { key: HmrcExpenseKey; label: string; amount: number }
export interface SA103Summary {
  from: string;
  to: string;
  turnover: number;
  otherIncome: number;
  expenses: SA103Expense[];
  totalExpenses: number;
  netProfit: number;
}

async function typeMap(): Promise<Map<string, DBAccountType>> {
  const accounts = await db.accounts.toArray();
  const m = new Map<string, DBAccountType>();
  for (const a of accounts) m.set(a.id, a.type);
  return m;
}
function inferType(path: string): DBAccountType | undefined {
  if (/^income[:/]/i.test(path)) return "INCOME";
  if (/^expenses?[:/]/i.test(path)) return "EXPENSE";
  return undefined;
}

export async function computeSA103(from: string, to: string): Promise<SA103Summary> {
  const [txns, types] = await Promise.all([getApprovedTransactions(), typeMap()]);

  let turnover = 0;
  let otherIncome = 0;
  const byKey: Partial<Record<HmrcExpenseKey, number>> = {};

  for (const tx of txns) {
    if (tx.date < from || tx.date > to) continue;
    for (const s of tx.splits) {
      const type = types.get(s.account_id) ?? inferType(s.account_id);
      if (type === "INCOME") {
        const v = -s.amount;
        if (incomeCategoryFor(s.account_id) === "turnover") turnover += v;
        else otherIncome += v;
      } else if (type === "EXPENSE") {
        const key = expenseCategoryFor(s.account_id);
        byKey[key] = (byKey[key] ?? 0) + s.amount;
      }
    }
  }

  const expenses: SA103Expense[] = (Object.keys(byKey) as HmrcExpenseKey[])
    .map((key) => ({ key, label: EXPENSE_LABELS[key], amount: byKey[key]! }))
    .filter((e) => e.amount !== 0)
    .sort((a, b) => b.amount - a.amount);

  const totalExpenses = expenses.reduce((a, b) => a + b.amount, 0);
  return {
    from,
    to,
    turnover,
    otherIncome,
    expenses,
    totalExpenses,
    netProfit: turnover + otherIncome - totalExpenses,
  };
}
