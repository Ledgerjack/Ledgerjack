/**
 * recurring — auto-create regular transactions (rent, subscriptions, insurance).
 *
 * Templates are stored as JSON in db.settings. On app open, processRecurring()
 * creates any due transactions (into the REVIEW QUEUE, so the user still gives
 * each a glance) and advances each template's next date. Deterministic, no AI.
 */

import { db } from "../db";
import { createTransaction, makeSimpleSplits } from "../ledger";

export type Frequency = "weekly" | "monthly" | "yearly";

export interface RecurringTemplate {
  id: string;
  description: string;
  amount: number;        // cents
  categoryAccount: string; // e.g. "Expenses:Premises:Rent" or "Income:Sales"
  cashAccount: string;
  isIncome: boolean;
  frequency: Frequency;
  nextDate: string;      // YYYY-MM-DD
  jobTag?: string;
  trade?: string;
  enabled: boolean;
}

const KEY = "recurring_templates";

export async function loadTemplates(): Promise<RecurringTemplate[]> {
  const row = await db.settings.get(KEY);
  if (!row?.value) return [];
  try { return JSON.parse(row.value) as RecurringTemplate[]; } catch { return []; }
}
export async function saveTemplates(t: RecurringTemplate[]): Promise<void> {
  await db.settings.put({ key: KEY, value: JSON.stringify(t) });
}

export function advanceDate(dateIso: string, freq: Frequency): string {
  const d = new Date(dateIso + "T00:00:00Z");
  if (freq === "weekly") {
    d.setUTCDate(d.getUTCDate() + 7);
  } else if (freq === "yearly") {
    d.setUTCFullYear(d.getUTCFullYear() + 1);
  } else {
    // monthly, clamping the day to the target month's length
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, lastDay));
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Create any due recurring transactions and advance their next dates.
 * Returns how many transactions were created.
 */
export async function processRecurring(now = new Date()): Promise<number> {
  const templates = await loadTemplates();
  if (templates.length === 0) return 0;
  const today = now.toISOString().slice(0, 10);

  let created = 0;
  let changed = false;

  for (const t of templates) {
    if (!t.enabled) continue;
    let guard = 0;
    while (t.nextDate <= today && guard < 24) {
      const debit = t.isIncome ? t.cashAccount : t.categoryAccount;
      const credit = t.isIncome ? t.categoryAccount : t.cashAccount;
      await createTransaction(
        {
          date: t.nextDate,
          description: t.description,
          pending_review: true, // land in the review queue for a glance
          job_tag: t.jobTag?.trim() || undefined,
          trade: t.trade || undefined,
        },
        makeSimpleSplits(debit, credit, t.amount),
      );
      t.nextDate = advanceDate(t.nextDate, t.frequency);
      created++;
      changed = true;
      guard++;
    }
  }

  if (changed) await saveTemplates(templates);
  return created;
}
