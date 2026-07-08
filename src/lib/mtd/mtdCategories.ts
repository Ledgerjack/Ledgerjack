/**
 * mtdCategories — maps LedgerJack account paths to HMRC's self-employment
 * period-summary categories.
 *
 * The category KEYS below are HMRC's own field names, taken from the
 * Self Employment Business API (periodIncome / periodExpenses). Do not rename
 * them. The authoritative box mapping lives in the GitHub repo
 * hmrc/income-tax-mtd-changelog (mapping-csv-files) — check it if HMRC adds or
 * renames a category.
 *
 * How mapping works: we look at the account path (e.g. "Expenses:Travel:Fuel")
 * and match keywords to the right HMRC bucket. Anything unmatched falls into
 * `otherExpenses`, which is always safe. Users can later override per-account.
 */

// HMRC periodExpenses field names (itemised set).
export type HmrcExpenseKey =
  | "costOfGoods"
  | "paymentsToSubcontractors"
  | "wagesAndStaffCosts"
  | "carVanTravelExpenses"
  | "premisesRunningCosts"
  | "maintenanceCosts"
  | "adminCosts"
  | "businessEntertainmentCosts"
  | "advertisingCosts"
  | "interestOnBankOtherLoans"
  | "financeCharges"
  | "irrecoverableDebts"
  | "professionalFees"
  | "depreciation"
  | "otherExpenses";

// HMRC periodIncome field names.
export type HmrcIncomeKey = "turnover" | "other";

/** Keyword → HMRC expense category. First match wins (checked in order). */
const EXPENSE_RULES: Array<{ test: RegExp; key: HmrcExpenseKey }> = [
  { test: /subcontract|cis\b/i, key: "paymentsToSubcontractors" },
  { test: /wage|salar|staff|payroll|employee/i, key: "wagesAndStaffCosts" },
  { test: /stock|goods|material|resale|inventory|supplies/i, key: "costOfGoods" },
  { test: /mileage|fuel|petrol|diesel|travel|car|van|vehicle|train|taxi|parking/i, key: "carVanTravelExpenses" },
  { test: /rent|rates|premises|power|electric|gas|water|insurance|utilit/i, key: "premisesRunningCosts" },
  { test: /repair|maintenance|maintain/i, key: "maintenanceCosts" },
  { test: /advertis|marketing|promotion|website|seo/i, key: "advertisingCosts" },
  { test: /entertain|hospitality/i, key: "businessEntertainmentCosts" },
  { test: /accountant|legal|solicitor|professional|consult/i, key: "professionalFees" },
  { test: /bank\s?charge|interest|loan|overdraft/i, key: "interestOnBankOtherLoans" },
  { test: /finance\s?charge|lease|hire\s?purchase|hp\b/i, key: "financeCharges" },
  { test: /bad\s?debt|irrecoverable|write.?off/i, key: "irrecoverableDebts" },
  { test: /depreciat/i, key: "depreciation" },
  { test: /admin|office|phone|mobile|software|subscription|stationery|postage|print/i, key: "adminCosts" },
];

/** Keyword → HMRC income category. Default is `turnover`. */
const INCOME_OTHER = /interest|grant|refund|rebate|other/i;

export function expenseCategoryFor(accountPath: string): HmrcExpenseKey {
  for (const rule of EXPENSE_RULES) {
    if (rule.test.test(accountPath)) return rule.key;
  }
  return "otherExpenses";
}

export function incomeCategoryFor(accountPath: string): HmrcIncomeKey {
  return INCOME_OTHER.test(accountPath) ? "other" : "turnover";
}

/** All itemised expense keys, useful for building a zeroed accumulator. */
export const ALL_EXPENSE_KEYS: HmrcExpenseKey[] = [
  "costOfGoods", "paymentsToSubcontractors", "wagesAndStaffCosts",
  "carVanTravelExpenses", "premisesRunningCosts", "maintenanceCosts",
  "adminCosts", "businessEntertainmentCosts", "advertisingCosts",
  "interestOnBankOtherLoans", "financeCharges", "irrecoverableDebts",
  "professionalFees", "depreciation", "otherExpenses",
];
