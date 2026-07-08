export type TaxRegion = string;

export interface AccountTemplate {
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY';
  parent?: string;
  placeholder: boolean;
  sort_order: number;
}

export interface TaxRegionConfig {
  id: TaxRegion;
  label: string;
  countryCode: string;
  currencySymbol: string;
  currencyCode: string;
  fiscalYearStart: { month: number; day: number };
  mileageRate: number;
  mileageUnit: 'miles' | 'km';
  accounts: AccountTemplate[];
  grossIncomeAccount: string;
  allowableExpensesParent: string;
  softwareExpenseAccount: string;
  travelExpenseAccount: string;
  ownersEquityAccount: string;
  cashAccount: string;
}

const GENERIC_ACCOUNTS = (incomeLabel: string): AccountTemplate[] => [
  { name: 'Assets', type: 'ASSET', placeholder: true, sort_order: 1 },
  { name: 'Assets:Cash', type: 'ASSET', parent: 'Assets', placeholder: false, sort_order: 1.1 },
  { name: 'Assets:Bank', type: 'ASSET', parent: 'Assets', placeholder: false, sort_order: 1.2 },
  { name: 'Assets:Receivables', type: 'ASSET', parent: 'Assets', placeholder: false, sort_order: 1.3 },
  { name: 'Liabilities', type: 'LIABILITY', placeholder: true, sort_order: 2 },
  { name: 'Liabilities:Payables', type: 'LIABILITY', parent: 'Liabilities', placeholder: false, sort_order: 2.1 },
  { name: 'Liabilities:Tax Payable', type: 'LIABILITY', parent: 'Liabilities', placeholder: false, sort_order: 2.2 },
  { name: 'Income', type: 'INCOME', placeholder: true, sort_order: 3 },
  { name: `Income:${incomeLabel}`, type: 'INCOME', parent: 'Income', placeholder: false, sort_order: 3.1 },
  { name: 'Income:Other Income', type: 'INCOME', parent: 'Income', placeholder: false, sort_order: 3.2 },
  { name: 'Expenses', type: 'EXPENSE', placeholder: true, sort_order: 4 },
  { name: 'Expenses:Cost of Sales', type: 'EXPENSE', parent: 'Expenses', placeholder: true, sort_order: 4.1 },
  { name: 'Expenses:Cost of Sales:Materials', type: 'EXPENSE', parent: 'Expenses:Cost of Sales', placeholder: false, sort_order: 4.11 },
  { name: 'Expenses:Cost of Sales:Subcontractors', type: 'EXPENSE', parent: 'Expenses:Cost of Sales', placeholder: false, sort_order: 4.12 },
  { name: 'Expenses:Travel', type: 'EXPENSE', parent: 'Expenses', placeholder: true, sort_order: 4.2 },
  { name: 'Expenses:Travel:Mileage', type: 'EXPENSE', parent: 'Expenses:Travel', placeholder: false, sort_order: 4.21 },
  { name: 'Expenses:Travel:Parking', type: 'EXPENSE', parent: 'Expenses:Travel', placeholder: false, sort_order: 4.22 },
  { name: 'Expenses:Travel:Fuel', type: 'EXPENSE', parent: 'Expenses:Travel', placeholder: false, sort_order: 4.23 },
  { name: 'Expenses:Office', type: 'EXPENSE', parent: 'Expenses', placeholder: true, sort_order: 4.3 },
  { name: 'Expenses:Office:Stationery', type: 'EXPENSE', parent: 'Expenses:Office', placeholder: false, sort_order: 4.31 },
  { name: 'Expenses:Office:Phone & Internet', type: 'EXPENSE', parent: 'Expenses:Office', placeholder: false, sort_order: 4.32 },
  { name: 'Expenses:Office:Rent', type: 'EXPENSE', parent: 'Expenses:Office', placeholder: false, sort_order: 4.33 },
  { name: 'Expenses:Software & IT', type: 'EXPENSE', parent: 'Expenses', placeholder: false, sort_order: 4.4 },
  { name: 'Expenses:Professional Fees', type: 'EXPENSE', parent: 'Expenses', placeholder: false, sort_order: 4.5 },
  { name: 'Expenses:Insurance', type: 'EXPENSE', parent: 'Expenses', placeholder: false, sort_order: 4.6 },
  { name: 'Expenses:Utilities', type: 'EXPENSE', parent: 'Expenses', placeholder: false, sort_order: 4.7 },
  { name: 'Equity', type: 'EQUITY', placeholder: true, sort_order: 5 },
  { name: "Equity:Owner's Capital", type: 'EQUITY', parent: 'Equity', placeholder: false, sort_order: 5.1 },
  { name: "Equity:Owner's Draw", type: 'EQUITY', parent: 'Equity', placeholder: false, sort_order: 5.2 },
  { name: 'Equity:Retained Earnings', type: 'EQUITY', parent: 'Equity', placeholder: false, sort_order: 5.3 },
];

const BASE_CONFIG = (incomeLabel: string) => ({
  accounts: GENERIC_ACCOUNTS(incomeLabel),
  grossIncomeAccount: `Income:${incomeLabel}`,
  allowableExpensesParent: 'Expenses',
  softwareExpenseAccount: 'Expenses:Software & IT',
  travelExpenseAccount: 'Expenses:Travel',
  ownersEquityAccount: "Equity:Owner's Capital",
  cashAccount: 'Assets:Cash',
});

export const COUNTRY_REGIONS: TaxRegionConfig[] = [
  {
    id: 'uk', label: 'United Kingdom', countryCode: 'GB',
    currencySymbol: '£', currencyCode: 'GBP',
    fiscalYearStart: { month: 4, day: 6 },
    mileageRate: 0.45, mileageUnit: 'miles',
    ...BASE_CONFIG('Turnover'),
    accounts: [
      { name: 'Assets', type: 'ASSET', placeholder: true, sort_order: 1 },
      { name: 'Assets:Cash', type: 'ASSET', parent: 'Assets', placeholder: false, sort_order: 1.1 },
      { name: 'Assets:Bank', type: 'ASSET', parent: 'Assets', placeholder: false, sort_order: 1.2 },
      { name: 'Assets:Debtors', type: 'ASSET', parent: 'Assets', placeholder: false, sort_order: 1.3 },
      { name: 'Liabilities', type: 'LIABILITY', placeholder: true, sort_order: 2 },
      { name: 'Liabilities:Creditors', type: 'LIABILITY', parent: 'Liabilities', placeholder: false, sort_order: 2.1 },
      { name: 'Liabilities:VAT', type: 'LIABILITY', parent: 'Liabilities', placeholder: false, sort_order: 2.2 },
      { name: 'Income', type: 'INCOME', placeholder: true, sort_order: 3 },
      { name: 'Income:Turnover', type: 'INCOME', parent: 'Income', placeholder: false, sort_order: 3.1 },
      { name: 'Income:Other Income', type: 'INCOME', parent: 'Income', placeholder: false, sort_order: 3.2 },
      { name: 'Expenses', type: 'EXPENSE', placeholder: true, sort_order: 4 },
      { name: 'Expenses:Cost of Sales', type: 'EXPENSE', parent: 'Expenses', placeholder: true, sort_order: 4.1 },
      { name: 'Expenses:Cost of Sales:Materials', type: 'EXPENSE', parent: 'Expenses:Cost of Sales', placeholder: false, sort_order: 4.11 },
      { name: 'Expenses:Cost of Sales:Subcontractors', type: 'EXPENSE', parent: 'Expenses:Cost of Sales', placeholder: false, sort_order: 4.12 },
      { name: 'Expenses:Travel', type: 'EXPENSE', parent: 'Expenses', placeholder: true, sort_order: 4.2 },
      { name: 'Expenses:Travel:Mileage', type: 'EXPENSE', parent: 'Expenses:Travel', placeholder: false, sort_order: 4.21 },
      { name: 'Expenses:Travel:Parking', type: 'EXPENSE', parent: 'Expenses:Travel', placeholder: false, sort_order: 4.22 },
      { name: 'Expenses:Travel:Fuel', type: 'EXPENSE', parent: 'Expenses:Travel', placeholder: false, sort_order: 4.23 },
      { name: 'Expenses:Travel:Other', type: 'EXPENSE', parent: 'Expenses:Travel', placeholder: false, sort_order: 4.24 },
      { name: 'Expenses:Office', type: 'EXPENSE', parent: 'Expenses', placeholder: true, sort_order: 4.3 },
      { name: 'Expenses:Office:Stationery', type: 'EXPENSE', parent: 'Expenses:Office', placeholder: false, sort_order: 4.31 },
      { name: 'Expenses:Office:Phone & Internet', type: 'EXPENSE', parent: 'Expenses:Office', placeholder: false, sort_order: 4.32 },
      { name: 'Expenses:Office:Rent', type: 'EXPENSE', parent: 'Expenses:Office', placeholder: false, sort_order: 4.33 },
      { name: 'Expenses:Software & IT', type: 'EXPENSE', parent: 'Expenses', placeholder: false, sort_order: 4.4 },
      { name: 'Expenses:Professional Fees', type: 'EXPENSE', parent: 'Expenses', placeholder: false, sort_order: 4.5 },
      { name: 'Expenses:Insurance', type: 'EXPENSE', parent: 'Expenses', placeholder: false, sort_order: 4.6 },
      { name: 'Expenses:Utilities', type: 'EXPENSE', parent: 'Expenses', placeholder: false, sort_order: 4.7 },
      { name: 'Expenses:Capital Allowances', type: 'EXPENSE', parent: 'Expenses', placeholder: false, sort_order: 4.8 },
      { name: 'Equity', type: 'EQUITY', placeholder: true, sort_order: 5 },
      { name: "Equity:Owner's Capital", type: 'EQUITY', parent: 'Equity', placeholder: false, sort_order: 5.1 },
      { name: 'Equity:Drawings', type: 'EQUITY', parent: 'Equity', placeholder: false, sort_order: 5.2 },
      { name: 'Equity:Retained Earnings', type: 'EQUITY', parent: 'Equity', placeholder: false, sort_order: 5.3 },
    ],
    grossIncomeAccount: 'Income:Turnover',
  },
  {
    id: 'us', label: 'United States', countryCode: 'US',
    currencySymbol: '$', currencyCode: 'USD',
    fiscalYearStart: { month: 1, day: 1 },
    mileageRate: 0.67, mileageUnit: 'miles',
    ...BASE_CONFIG('Gross Receipts'),
    accounts: [
      { name: 'Assets', type: 'ASSET', placeholder: true, sort_order: 1 },
      { name: 'Assets:Cash', type: 'ASSET', parent: 'Assets', placeholder: false, sort_order: 1.1 },
      { name: 'Assets:Bank', type: 'ASSET', parent: 'Assets', placeholder: false, sort_order: 1.2 },
      { name: 'Assets:Accounts Receivable', type: 'ASSET', parent: 'Assets', placeholder: false, sort_order: 1.3 },
      { name: 'Liabilities', type: 'LIABILITY', placeholder: true, sort_order: 2 },
      { name: 'Liabilities:Accounts Payable', type: 'LIABILITY', parent: 'Liabilities', placeholder: false, sort_order: 2.1 },
      { name: 'Liabilities:Sales Tax', type: 'LIABILITY', parent: 'Liabilities', placeholder: false, sort_order: 2.2 },
      { name: 'Income', type: 'INCOME', placeholder: true, sort_order: 3 },
      { name: 'Income:Gross Receipts', type: 'INCOME', parent: 'Income', placeholder: false, sort_order: 3.1 },
      { name: 'Income:Other Income', type: 'INCOME', parent: 'Income', placeholder: false, sort_order: 3.2 },
      { name: 'Expenses', type: 'EXPENSE', placeholder: true, sort_order: 4 },
      { name: 'Expenses:Cost of Goods Sold', type: 'EXPENSE', parent: 'Expenses', placeholder: true, sort_order: 4.1 },
      { name: 'Expenses:Cost of Goods Sold:Materials', type: 'EXPENSE', parent: 'Expenses:Cost of Goods Sold', placeholder: false, sort_order: 4.11 },
      { name: 'Expenses:Cost of Goods Sold:Subcontractors', type: 'EXPENSE', parent: 'Expenses:Cost of Goods Sold', placeholder: false, sort_order: 4.12 },
      { name: 'Expenses:Travel', type: 'EXPENSE', parent: 'Expenses', placeholder: true, sort_order: 4.2 },
      { name: 'Expenses:Travel:Mileage', type: 'EXPENSE', parent: 'Expenses:Travel', placeholder: false, sort_order: 4.21 },
      { name: 'Expenses:Travel:Parking', type: 'EXPENSE', parent: 'Expenses:Travel', placeholder: false, sort_order: 4.22 },
      { name: 'Expenses:Travel:Fuel', type: 'EXPENSE', parent: 'Expenses:Travel', placeholder: false, sort_order: 4.23 },
      { name: 'Expenses:Travel:Other', type: 'EXPENSE', parent: 'Expenses:Travel', placeholder: false, sort_order: 4.24 },
      { name: 'Expenses:Office', type: 'EXPENSE', parent: 'Expenses', placeholder: true, sort_order: 4.3 },
      { name: 'Expenses:Office:Stationery', type: 'EXPENSE', parent: 'Expenses:Office', placeholder: false, sort_order: 4.31 },
      { name: 'Expenses:Office:Phone & Internet', type: 'EXPENSE', parent: 'Expenses:Office', placeholder: false, sort_order: 4.32 },
      { name: 'Expenses:Office:Rent', type: 'EXPENSE', parent: 'Expenses:Office', placeholder: false, sort_order: 4.33 },
      { name: 'Expenses:Software & IT', type: 'EXPENSE', parent: 'Expenses', placeholder: false, sort_order: 4.4 },
      { name: 'Expenses:Professional Fees', type: 'EXPENSE', parent: 'Expenses', placeholder: false, sort_order: 4.5 },
      { name: 'Expenses:Insurance', type: 'EXPENSE', parent: 'Expenses', placeholder: false, sort_order: 4.6 },
      { name: 'Expenses:Utilities', type: 'EXPENSE', parent: 'Expenses', placeholder: false, sort_order: 4.7 },
      { name: 'Expenses:Depreciation', type: 'EXPENSE', parent: 'Expenses', placeholder: false, sort_order: 4.8 },
      { name: 'Equity', type: 'EQUITY', placeholder: true, sort_order: 5 },
      { name: "Equity:Owner's Capital", type: 'EQUITY', parent: 'Equity', placeholder: false, sort_order: 5.1 },
      { name: "Equity:Owner's Draw", type: 'EQUITY', parent: 'Equity', placeholder: false, sort_order: 5.2 },
      { name: 'Equity:Retained Earnings', type: 'EQUITY', parent: 'Equity', placeholder: false, sort_order: 5.3 },
    ],
    grossIncomeAccount: 'Income:Gross Receipts',
  },
  { id: 'au', label: 'Australia', countryCode: 'AU', currencySymbol: 'A$', currencyCode: 'AUD', fiscalYearStart: { month: 7, day: 1 }, mileageRate: 0.88, mileageUnit: 'km', ...BASE_CONFIG('Revenue') },
  { id: 'ca', label: 'Canada', countryCode: 'CA', currencySymbol: 'C$', currencyCode: 'CAD', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 0.70, mileageUnit: 'km', ...BASE_CONFIG('Revenue') },
  { id: 'nz', label: 'New Zealand', countryCode: 'NZ', currencySymbol: 'NZ$', currencyCode: 'NZD', fiscalYearStart: { month: 4, day: 1 }, mileageRate: 1.04, mileageUnit: 'km', ...BASE_CONFIG('Revenue') },
  { id: 'ie', label: 'Ireland', countryCode: 'IE', currencySymbol: '€', currencyCode: 'EUR', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 0.43, mileageUnit: 'km', ...BASE_CONFIG('Turnover') },
  { id: 'de', label: 'Germany', countryCode: 'DE', currencySymbol: '€', currencyCode: 'EUR', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 0.30, mileageUnit: 'km', ...BASE_CONFIG('Umsatz') },
  { id: 'fr', label: 'France', countryCode: 'FR', currencySymbol: '€', currencyCode: 'EUR', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 0.529, mileageUnit: 'km', ...BASE_CONFIG('Chiffre d\'affaires') },
  { id: 'es', label: 'Spain', countryCode: 'ES', currencySymbol: '€', currencyCode: 'EUR', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 0.26, mileageUnit: 'km', ...BASE_CONFIG('Ingresos') },
  { id: 'it', label: 'Italy', countryCode: 'IT', currencySymbol: '€', currencyCode: 'EUR', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 0.22, mileageUnit: 'km', ...BASE_CONFIG('Fatturato') },
  { id: 'nl', label: 'Netherlands', countryCode: 'NL', currencySymbol: '€', currencyCode: 'EUR', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 0.23, mileageUnit: 'km', ...BASE_CONFIG('Omzet') },
  { id: 'be', label: 'Belgium', countryCode: 'BE', currencySymbol: '€', currencyCode: 'EUR', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 0.42, mileageUnit: 'km', ...BASE_CONFIG('Revenue') },
  { id: 'ch', label: 'Switzerland', countryCode: 'CH', currencySymbol: 'CHF', currencyCode: 'CHF', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 0.70, mileageUnit: 'km', ...BASE_CONFIG('Ertrag') },
  { id: 'se', label: 'Sweden', countryCode: 'SE', currencySymbol: 'kr', currencyCode: 'SEK', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 2.50, mileageUnit: 'km', ...BASE_CONFIG('Intäkter') },
  { id: 'no', label: 'Norway', countryCode: 'NO', currencySymbol: 'kr', currencyCode: 'NOK', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 4.90, mileageUnit: 'km', ...BASE_CONFIG('Inntekter') },
  { id: 'dk', label: 'Denmark', countryCode: 'DK', currencySymbol: 'kr', currencyCode: 'DKK', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 3.79, mileageUnit: 'km', ...BASE_CONFIG('Omsætning') },
  { id: 'fi', label: 'Finland', countryCode: 'FI', currencySymbol: '€', currencyCode: 'EUR', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 0.28, mileageUnit: 'km', ...BASE_CONFIG('Liikevaihto') },
  { id: 'pl', label: 'Poland', countryCode: 'PL', currencySymbol: 'zł', currencyCode: 'PLN', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 0.89, mileageUnit: 'km', ...BASE_CONFIG('Przychód') },
  { id: 'pt', label: 'Portugal', countryCode: 'PT', currencySymbol: '€', currencyCode: 'EUR', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 0.36, mileageUnit: 'km', ...BASE_CONFIG('Volume de negócios') },
  { id: 'at', label: 'Austria', countryCode: 'AT', currencySymbol: '€', currencyCode: 'EUR', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 0.42, mileageUnit: 'km', ...BASE_CONFIG('Umsatz') },
  { id: 'sg', label: 'Singapore', countryCode: 'SG', currencySymbol: 'S$', currencyCode: 'SGD', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 0.60, mileageUnit: 'km', ...BASE_CONFIG('Revenue') },
  { id: 'hk', label: 'Hong Kong', countryCode: 'HK', currencySymbol: 'HK$', currencyCode: 'HKD', fiscalYearStart: { month: 4, day: 1 }, mileageRate: 5.00, mileageUnit: 'km', ...BASE_CONFIG('Revenue') },
  { id: 'in', label: 'India', countryCode: 'IN', currencySymbol: '₹', currencyCode: 'INR', fiscalYearStart: { month: 4, day: 1 }, mileageRate: 16.00, mileageUnit: 'km', ...BASE_CONFIG('Revenue') },
  { id: 'za', label: 'South Africa', countryCode: 'ZA', currencySymbol: 'R', currencyCode: 'ZAR', fiscalYearStart: { month: 3, day: 1 }, mileageRate: 4.64, mileageUnit: 'km', ...BASE_CONFIG('Revenue') },
  { id: 'br', label: 'Brazil', countryCode: 'BR', currencySymbol: 'R$', currencyCode: 'BRL', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 1.00, mileageUnit: 'km', ...BASE_CONFIG('Receita') },
  { id: 'mx', label: 'Mexico', countryCode: 'MX', currencySymbol: 'MX$', currencyCode: 'MXN', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 7.00, mileageUnit: 'km', ...BASE_CONFIG('Ingresos') },
  { id: 'ae', label: 'UAE', countryCode: 'AE', currencySymbol: 'د.إ', currencyCode: 'AED', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 1.00, mileageUnit: 'km', ...BASE_CONFIG('Revenue') },
  { id: 'jp', label: 'Japan', countryCode: 'JP', currencySymbol: '¥', currencyCode: 'JPY', fiscalYearStart: { month: 4, day: 1 }, mileageRate: 15.00, mileageUnit: 'km', ...BASE_CONFIG('売上高') },
  { id: 'generic', label: 'Other / International', countryCode: 'XX', currencySymbol: '$', currencyCode: 'USD', fiscalYearStart: { month: 1, day: 1 }, mileageRate: 0.50, mileageUnit: 'km', ...BASE_CONFIG('Revenue') },
];

export const TAX_REGIONS: Record<string, TaxRegionConfig> = Object.fromEntries(
  COUNTRY_REGIONS.map((r) => [r.id, r])
);

const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  'Europe/London': 'GB', 'Europe/Belfast': 'GB', 'Europe/Jersey': 'GB', 'Europe/Guernsey': 'GB',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US',
  'America/Phoenix': 'US', 'America/Anchorage': 'US', 'Pacific/Honolulu': 'US',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
  'Australia/Adelaide': 'AU', 'Australia/Perth': 'AU', 'Australia/Darwin': 'AU',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Winnipeg': 'CA',
  'America/Halifax': 'CA', 'America/St_Johns': 'CA', 'America/Edmonton': 'CA',
  'Pacific/Auckland': 'NZ', 'Pacific/Chatham': 'NZ',
  'Europe/Dublin': 'IE',
  'Europe/Berlin': 'DE', 'Europe/Paris': 'FR', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH',
  'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI', 'Europe/Warsaw': 'PL', 'Europe/Lisbon': 'PT', 'Europe/Vienna': 'AT',
  'Asia/Singapore': 'SG', 'Asia/Hong_Kong': 'HK', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN',
  'Africa/Johannesburg': 'ZA', 'America/Sao_Paulo': 'BR',
  'America/Mexico_City': 'MX', 'America/Monterrey': 'MX',
  'Asia/Dubai': 'AE', 'Asia/Tokyo': 'JP',
};

const LANG_TO_COUNTRY: Record<string, string> = {
  'en-GB': 'GB', 'en-US': 'US', 'en-AU': 'AU', 'en-CA': 'CA', 'en-NZ': 'NZ',
  'en-IE': 'IE', 'en-SG': 'SG', 'en-ZA': 'ZA', 'en-IN': 'IN',
  'de': 'DE', 'de-DE': 'DE', 'de-AT': 'AT', 'de-CH': 'CH',
  'fr': 'FR', 'fr-FR': 'FR', 'fr-BE': 'BE',
  'es': 'ES', 'es-ES': 'ES', 'es-MX': 'MX',
  'it': 'IT', 'it-IT': 'IT',
  'nl': 'NL', 'nl-NL': 'NL', 'nl-BE': 'BE',
  'sv': 'SE', 'nb': 'NO', 'da': 'DK', 'fi': 'FI', 'pl': 'PL', 'pt': 'PT', 'pt-BR': 'BR',
  'ja': 'JP', 'zh-HK': 'HK',
};

export function detectRegionFromBrowser(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzCountry = TIMEZONE_TO_COUNTRY[tz];
    if (tzCountry) {
      const match = COUNTRY_REGIONS.find((r) => r.countryCode === tzCountry);
      if (match) return match.id;
    }
  } catch { /* ignore */ }

  try {
    const lang = navigator.language;
    const langCountry = LANG_TO_COUNTRY[lang];
    if (langCountry) {
      const match = COUNTRY_REGIONS.find((r) => r.countryCode === langCountry);
      if (match) return match.id;
    }
    const langBase = lang.split('-')[0];
    const baseCountry = LANG_TO_COUNTRY[langBase];
    if (baseCountry) {
      const match = COUNTRY_REGIONS.find((r) => r.countryCode === baseCountry);
      if (match) return match.id;
    }
  } catch { /* ignore */ }

  return 'us';
}

export function getFlagEmoji(countryCode: string): string {
  if (countryCode === 'XX') return '🌐';
  return countryCode.toUpperCase().replace(/./g, (c) =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  );
}

export function getFiscalYearRange(region: TaxRegion, year: number): { start: string; end: string } {
  const cfg = TAX_REGIONS[region] ?? TAX_REGIONS['generic'];
  const { month, day } = cfg.fiscalYearStart;
  const start = new Date(year, month - 1, day);
  const end = new Date(year + 1, month - 1, day - 1);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function getCurrentFiscalYear(region: TaxRegion): number {
  const cfg = TAX_REGIONS[region] ?? TAX_REGIONS['generic'];
  const now = new Date();
  const { month, day } = cfg.fiscalYearStart;
  const fyStart = new Date(now.getFullYear(), month - 1, day);
  return now >= fyStart ? now.getFullYear() : now.getFullYear() - 1;
}
