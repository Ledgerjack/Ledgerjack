/**
 * recurringInvoices — templates that auto-generate invoices on a schedule
 * (e.g. monthly retainers). Generated invoices are created as DRAFTS so the user
 * reviews and sends them. Reuses advanceDate from the recurring-transactions lib.
 */

import { db } from "../db";
import { advanceDate, type Frequency } from "../recurring/recurring";
import {
  loadInvoices, saveInvoices, nextInvoiceNumber,
  type Invoice, type InvoiceLine,
} from "./invoices";

export interface RecurringInvoice {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  lines: InvoiceLine[];
  taxRatePct?: number;
  notes?: string;
  frequency: Frequency;
  nextDate: string;   // YYYY-MM-DD
  dueInDays: number;  // due date = issue + this many days
  enabled: boolean;
}

const KEY = "recurring_invoices";

export async function loadRecurringInvoices(): Promise<RecurringInvoice[]> {
  const row = await db.settings.get(KEY);
  if (!row?.value) return [];
  try { return JSON.parse(row.value) as RecurringInvoice[]; } catch { return []; }
}
export async function saveRecurringInvoices(list: RecurringInvoice[]): Promise<void> {
  await db.settings.put({ key: KEY, value: JSON.stringify(list) });
}

const uid = () => "inv_" + Math.random().toString(36).slice(2, 10);
const addDays = (iso: string, n: number) =>
  new Date(new Date(iso + "T00:00:00Z").getTime() + n * 86400000).toISOString().slice(0, 10);

/** Generate any due recurring invoices (as drafts). Returns how many. */
export async function processRecurringInvoices(now = new Date()): Promise<number> {
  const templates = await loadRecurringInvoices();
  if (templates.length === 0) return 0;
  const today = now.toISOString().slice(0, 10);

  let invoices = await loadInvoices();
  let created = 0;
  let changed = false;

  for (const t of templates) {
    if (!t.enabled) continue;
    let guard = 0;
    while (t.nextDate <= today && guard < 24) {
      const inv: Invoice = {
        id: uid(),
        number: nextInvoiceNumber(invoices),
        clientName: t.clientName,
        clientEmail: t.clientEmail,
        clientAddress: t.clientAddress,
        issueDate: t.nextDate,
        dueDate: addDays(t.nextDate, t.dueInDays),
        lines: t.lines.map((l) => ({ ...l })),
        notes: t.notes,
        status: "draft",
        taxRatePct: t.taxRatePct,
      };
      invoices = [inv, ...invoices];
      t.nextDate = advanceDate(t.nextDate, t.frequency);
      created++;
      changed = true;
      guard++;
    }
  }

  if (changed) {
    await saveInvoices(invoices);
    await saveRecurringInvoices(templates);
  }
  return created;
}
