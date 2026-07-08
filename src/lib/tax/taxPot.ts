/**
 * taxPot — the "set aside for tax" figure for the dashboard.
 *
 * Reuses the MTD aggregator to get profit for the current UK tax year so far,
 * runs the estimator, and works out the next payment-on-account date. Values in
 * pounds; the card converts to pence for display.
 */

import { aggregatePeriod } from "../mtd/mtdAggregator";
import { estimateSelfEmployedTax, type TaxEstimate } from "./taxEstimator";
import { CURRENT_UK_TAX_YEAR } from "./ukTaxRates";

/** UK tax year window (6 April → 5 April) containing today. */
export function currentUkTaxYearWindow(now = new Date()): { from: string; to: string; label: string } {
  const y = now.getUTCFullYear();
  const startYear = (now.getUTCMonth() > 3 || (now.getUTCMonth() === 3 && now.getUTCDate() >= 6)) ? y : y - 1;
  return {
    from: `${startYear}-04-06`,
    to: `${startYear + 1}-04-05`,
    label: `${startYear}/${(startYear + 1).toString().slice(2)}`,
  };
}

/** Next Self Assessment payment-on-account date (31 Jan or 31 Jul). */
export function nextPaymentOnAccountDate(now = new Date()): string {
  const y = now.getUTCFullYear();
  const candidates = [
    new Date(Date.UTC(y, 0, 31)),   // 31 Jan
    new Date(Date.UTC(y, 6, 31)),   // 31 Jul
    new Date(Date.UTC(y + 1, 0, 31)),
  ];
  const next = candidates.find((d) => d.getTime() >= now.getTime()) ?? candidates[2];
  return next.toISOString().slice(0, 10);
}

export interface TaxPot {
  taxYearLabel: string;
  ytdProfit: number;
  ytdIncome: number;
  estimate: TaxEstimate;
  /** The amount to set aside now (= estimated tax on profit so far). */
  potPounds: number;
  /** Rough share of income to reserve, as a whole percentage. */
  setAsidePercent: number;
  transactionCount: number;
  nextPaymentOnAccount: { date: string; indicativeAmount: number };
}

export async function computeTaxPot(now = new Date()): Promise<TaxPot> {
  const w = currentUkTaxYearWindow(now);
  const summary = await aggregatePeriod(w.from, w.to);
  const profit = summary.meta.net;
  const income = summary.meta.totalIncome;
  const estimate = estimateSelfEmployedTax(profit, CURRENT_UK_TAX_YEAR);
  const setAside = income > 0 ? Math.round((estimate.totalTax / income) * 100) : 0;

  return {
    taxYearLabel: w.label,
    ytdProfit: profit,
    ytdIncome: income,
    estimate,
    potPounds: estimate.totalTax,
    setAsidePercent: setAside,
    transactionCount: summary.meta.transactionCount,
    nextPaymentOnAccount: {
      date: nextPaymentOnAccountDate(now),
      // Each instalment is ~half your last year's bill; we show half the current
      // estimate as an indicative figure only.
      indicativeAmount: Math.round((estimate.totalTax / 2) * 100) / 100,
    },
  };
}
