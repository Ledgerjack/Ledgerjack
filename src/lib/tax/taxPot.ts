/**
 * taxPot — "money to set aside" based on a percentage the USER chooses.
 *
 * DESIGN DECISION (deliberate): LedgerJack does not calculate your tax.
 * We are an organiser, not a tax adviser. Tax rates, bands and thresholds
 * change, and a stale hardcoded rate is worse than none — it would assert a
 * wrong number with the app's authority behind it.
 *
 * So instead of estimating a tax bill from rates we'd have to maintain forever,
 * the user tells us what share of their profit they want to hold back (their
 * accountant may suggest a figure), and we do the arithmetic and keep track.
 * No rates. Nothing to go out of date. Values in pounds.
 */

import { aggregatePeriod } from "../mtd/mtdAggregator";

const PCT_KEY = "tax_pot_set_aside_pct";

/** The user's chosen set-aside percentage. null = not set yet. */
export function getSetAsidePercent(): number | null {
  try {
    const raw = localStorage.getItem(PCT_KEY);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
  } catch {
    return null;
  }
}

export function setSetAsidePercent(pct: number): void {
  try {
    localStorage.setItem(PCT_KEY, String(Math.max(0, Math.min(100, pct))));
  } catch {
    /* ignore */
  }
}

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

/** Next Self Assessment payment date (31 Jan or 31 Jul) — a diary reminder only. */
export function nextPaymentDate(now = new Date()): string {
  const y = now.getUTCFullYear();
  const candidates = [
    new Date(Date.UTC(y, 0, 31)),
    new Date(Date.UTC(y, 6, 31)),
    new Date(Date.UTC(y + 1, 0, 31)),
  ];
  const next = candidates.find((d) => d.getTime() >= now.getTime()) ?? candidates[2];
  return next.toISOString().slice(0, 10);
}

export interface TaxPot {
  taxYearLabel: string;
  ytdProfit: number;
  ytdIncome: number;
  /** The percentage the user chose, or null if they haven't set one. */
  setAsidePercent: number | null;
  /** profit × the user's percentage. 0 when no percentage is set. */
  potPounds: number;
  transactionCount: number;
  nextPaymentDate: string;
}

export async function computeTaxPot(now = new Date()): Promise<TaxPot> {
  const w = currentUkTaxYearWindow(now);
  const summary = await aggregatePeriod(w.from, w.to);
  const profit = summary.meta.net;
  const pct = getSetAsidePercent();
  const pot = pct !== null && profit > 0 ? Math.round(profit * (pct / 100) * 100) / 100 : 0;

  return {
    taxYearLabel: w.label,
    ytdProfit: profit,
    ytdIncome: summary.meta.totalIncome,
    setAsidePercent: pct,
    potPounds: pot,
    transactionCount: summary.meta.transactionCount,
    nextPaymentDate: nextPaymentDate(now),
  };
}
