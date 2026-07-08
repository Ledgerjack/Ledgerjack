/**
 * UK tax rates — kept as DATA, not hardcoded in the calculator, so a new tax
 * year is a data edit, not a code change. (Approach borrowed from the
 * open-source loglux/tax_calculator, which stores bands/thresholds as data.)
 *
 * Figures below are England, Wales & Northern Ireland for 2026/27. Scotland has
 * different income-tax bands; National Insurance is UK-wide. These are public
 * HMRC thresholds — verify against GOV.UK each April and add a new entry.
 *
 * All amounts are in whole pounds.
 */

export interface IncomeTaxBand {
  /** Lower gross-income boundary of the band (£). */
  threshold: number;
  /** Marginal rate applied within the band. */
  rate: number;
}

export interface UkTaxYear {
  label: string;
  personalAllowance: number;
  /** Personal allowance is reduced £1 for every £2 of income above this. */
  paTaperStart: number;
  /** Personal allowance reaches £0 at this income. */
  paTaperEnd: number;
  /** Marginal income-tax bands (first threshold equals the personal allowance). */
  incomeTaxBands: IncomeTaxBand[];
  /** Self-employed Class 4 National Insurance. */
  class4: { lowerLimit: number; upperLimit: number; mainRate: number; upperRate: number };
  /** Voluntary Class 2 weekly rate (Class 2 is no longer compulsory). */
  class2WeeklyVoluntary: number;
  smallProfitsThreshold: number;
  region: string;
  note: string;
}

export const UK_TAX_YEARS: Record<string, UkTaxYear> = {
  "2026-27": {
    label: "2026/27",
    personalAllowance: 12570,
    paTaperStart: 100000,
    paTaperEnd: 125140,
    incomeTaxBands: [
      { threshold: 12570, rate: 0.20 },   // basic rate
      { threshold: 50270, rate: 0.40 },   // higher rate
      { threshold: 125140, rate: 0.45 },  // additional rate
    ],
    class4: { lowerLimit: 12570, upperLimit: 50270, mainRate: 0.06, upperRate: 0.02 },
    class2WeeklyVoluntary: 3.65,
    smallProfitsThreshold: 7105,
    region: "England, Wales & Northern Ireland",
    note: "Scotland has different income-tax bands. This is an estimate, not HMRC's official calculation.",
  },
};

export const CURRENT_UK_TAX_YEAR = "2026-27";
