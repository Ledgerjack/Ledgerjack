/**
 * taxEstimator — estimate a sole trader's Income Tax + Class 4 NI from profit.
 *
 * Pure functions, all in whole/decimal pounds. This is an ESTIMATE for planning
 * (a "set aside" figure), not HMRC's official calculation — for that, use the
 * MTD tax-calculation screen which asks HMRC directly.
 */

import { UK_TAX_YEARS, CURRENT_UK_TAX_YEAR, type UkTaxYear } from "./ukTaxRates";

export interface TaxEstimate {
  taxYear: string;
  profit: number;
  personalAllowance: number;
  taxableIncome: number;
  incomeTax: number;
  class4NI: number;
  totalTax: number;
  /** totalTax / profit, as a fraction (0–1). */
  effectiveRateOnProfit: number;
  breakdown: Array<{ label: string; amount: number }>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Personal allowance after the £100k taper. */
export function effectivePersonalAllowance(profit: number, ty: UkTaxYear): number {
  if (profit <= ty.paTaperStart) return ty.personalAllowance;
  const reduction = Math.floor((profit - ty.paTaperStart) / 2);
  return Math.max(0, ty.personalAllowance - reduction);
}

export function estimateSelfEmployedTax(
  profit: number,
  taxYear: string = CURRENT_UK_TAX_YEAR,
): TaxEstimate {
  const ty = UK_TAX_YEARS[taxYear] ?? UK_TAX_YEARS[CURRENT_UK_TAX_YEAR];
  const p = Math.max(0, profit);
  const pa = effectivePersonalAllowance(p, ty);
  const bands = ty.incomeTaxBands;

  // Band WIDTHS (fixed) derived from the configured gross thresholds.
  const basicWidth = bands[1].threshold - bands[0].threshold;   // e.g. 37,700
  const higherWidth = bands[2].threshold - bands[1].threshold;  // e.g. 74,870
  const taxable = Math.max(0, p - pa);

  const t1 = Math.min(taxable, basicWidth) * bands[0].rate;
  const t2 = Math.min(Math.max(taxable - basicWidth, 0), higherWidth) * bands[1].rate;
  const t3 = Math.max(taxable - basicWidth - higherWidth, 0) * bands[2].rate;
  const incomeTax = round2(t1 + t2 + t3);

  const c = ty.class4;
  const n1 = Math.min(Math.max(p - c.lowerLimit, 0), c.upperLimit - c.lowerLimit) * c.mainRate;
  const n2 = Math.max(p - c.upperLimit, 0) * c.upperRate;
  const class4NI = round2(n1 + n2);

  const totalTax = round2(incomeTax + class4NI);

  return {
    taxYear,
    profit: round2(p),
    personalAllowance: pa,
    taxableIncome: round2(taxable),
    incomeTax,
    class4NI,
    totalTax,
    effectiveRateOnProfit: p > 0 ? totalTax / p : 0,
    breakdown: [
      { label: "Income Tax", amount: incomeTax },
      { label: "Class 4 National Insurance", amount: class4NI },
    ],
  };
}
