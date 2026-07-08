/**
 * deadlines — the tax dates that matter, jurisdiction-aware.
 * We only have specific dates for the UK; elsewhere we show a general note and
 * the fiscal year end from the region config rather than inventing local dates.
 */

import { TAX_REGIONS, type TaxRegion } from "../regions";

export interface Deadline {
  date: string;   // YYYY-MM-DD
  title: string;
  note?: string;
}

/** Next occurrence of a month/day on/after `now`. */
function nextOccurrence(month0: number, day: number, now: Date): string {
  const y = now.getUTCFullYear();
  let d = new Date(Date.UTC(y, month0, day));
  if (d.getTime() < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) {
    d = new Date(Date.UTC(y + 1, month0, day));
  }
  return d.toISOString().slice(0, 10);
}

export interface DeadlineResult {
  hasSpecificDates: boolean;
  deadlines: Deadline[];
  note?: string;
}

export function getDeadlines(region: TaxRegion, now = new Date()): DeadlineResult {
  if (region === "uk") {
    const d: Deadline[] = [
      { title: "Payment on account", date: nextOccurrence(0, 31, now), note: "Second/next Self Assessment payment on account (also balancing payment)." },
      { title: "Payment on account", date: nextOccurrence(6, 31, now), note: "Second Self Assessment payment on account." },
      { title: "Final declaration & tax due", date: nextOccurrence(0, 31, now), note: "MTD final declaration and any tax owed for the year." },
      { title: "Quarterly update — Q1 (Apr–Jul)", date: nextOccurrence(7, 7, now) },
      { title: "Quarterly update — Q2 (Aug–Oct)", date: nextOccurrence(10, 7, now) },
      { title: "Quarterly update — Q3 (Nov–Jan)", date: nextOccurrence(1, 7, now) },
      { title: "Quarterly update — Q4 (Feb–Mar)", date: nextOccurrence(4, 7, now) },
    ];
    // de-dup identical dates+titles, sort by date
    const seen = new Set<string>();
    const deadlines = d
      .filter((x) => { const k = x.date + x.title; if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => a.date.localeCompare(b.date));
    return {
      hasSpecificDates: true,
      deadlines,
      note: "VAT return (if registered): usually one month and seven days after each VAT quarter — check your VAT dates.",
    };
  }

  // Other regions: no specific dates baked in — show fiscal year end only.
  const cfg = TAX_REGIONS[region];
  const fyStart = cfg.fiscalYearStart;
  const fyEnd = nextOccurrence(
    (fyStart.month - 1 + 11) % 12,
    Math.max(1, fyStart.day - 1),
    now,
  );
  return {
    hasSpecificDates: false,
    deadlines: [{ title: "End of your tax year", date: fyEnd }],
    note: `We don't have ${cfg.label}'s specific tax deadlines built in yet — check your local tax authority for exact dates.`,
  };
}
