/**
 * mtdEndpoints — every HMRC ITSA path and API version in ONE place.
 *
 * IMPORTANT — CONFIRM BEFORE PRODUCTION:
 * The exact paths and version numbers below are our best-known values and MUST
 * be checked against the live HMRC OpenAPI specs on the Developer Hub before you
 * go to production. They are centralised here precisely so that confirming or
 * fixing them is a one-file job. The relay forwards whatever path we pass, so a
 * wrong path fails loudly in sandbox — it cannot cause a bad real submission.
 *
 * Sources to verify against (Developer Hub → API documentation):
 *   - Business Details (MTD)           → list businesses, get businessId
 *   - Obligations (MTD)                → quarterly deadlines & statuses
 *   - Self Employment Business (MTD)   → submit the period summary (quarterly)
 *   - Individual Calculations (MTD)    → trigger/retrieve calc + final declaration
 * Reference implementation: github.com/hmrc/self-employment-business-api
 */

// Accept headers pin the API version. CONFIRM each version on the Dev Hub.
export const ACCEPT = {
  businessDetails: "application/vnd.hmrc.1.0+json",
  obligations: "application/vnd.hmrc.3.0+json",
  selfEmployment: "application/vnd.hmrc.5.0+json",
  calculations: "application/vnd.hmrc.7.0+json",
};

export const endpoints = {
  // List the customer's businesses (to obtain the self-employment businessId).
  listBusinesses: (nino: string) =>
    `/individuals/business/details/${nino}/list`,

  // Income-tax obligations (quarterly periods + final declaration due dates).
  obligations: (nino: string, from: string, to: string) =>
    `/obligations/details/${nino}/income-and-expenditure?fromDate=${from}&toDate=${to}`,

  // Create/amend a self-employment period summary (the quarterly update).
  // ITSA now uses cumulative period summaries — confirm the exact sub-path.
  submitPeriod: (nino: string, businessId: string, taxYear: string) =>
    `/individuals/business/self-employment/${nino}/${businessId}/period/${taxYear}`,

  // Trigger a tax calculation for the year.
  triggerCalculation: (nino: string, taxYear: string) =>
    `/individuals/calculations/${nino}/self-assessment/${taxYear}`,

  // Retrieve a calculation by id.
  getCalculation: (nino: string, calculationId: string) =>
    `/individuals/calculations/${nino}/self-assessment/${calculationId}`,

  // Submit the final declaration (crystallisation) for the year.
  finalDeclaration: (nino: string, taxYear: string, calculationId: string) =>
    `/individuals/calculations/${nino}/self-assessment/${taxYear}/${calculationId}/final-declaration`,
};

/**
 * HMRC tax years are written like "2026-27". Given a date inside the year that
 * starts on 6 April, return the HMRC tax-year string.
 */
export function taxYearFor(dateIso: string): string {
  const d = new Date(dateIso + "T00:00:00");
  const y = d.getUTCFullYear();
  // UK tax year starts 6 April. Before that, we're in the (y-1)/y year.
  const startYear = (d.getUTCMonth() > 3 || (d.getUTCMonth() === 3 && d.getUTCDate() >= 6)) ? y : y - 1;
  const end = (startYear + 1).toString().slice(2);
  return `${startYear}-${end}`;
}
