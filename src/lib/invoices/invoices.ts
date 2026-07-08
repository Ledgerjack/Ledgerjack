/**
 * invoices — create and store invoices. Stored as JSON in db.settings (same
 * pattern as rules/budgets/trades), so no schema migration. Money in cents.
 */

import { db } from "../db";

export type InvoiceStatus = "draft" | "sent" | "paid";
export type InvoiceKind = "invoice" | "quote";

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number; // cents
}

export interface Invoice {
  id: string;
  number: string;
  kind?: InvoiceKind; // undefined = invoice (back-compat)
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  issueDate: string;
  dueDate: string;
  lines: InvoiceLine[];
  notes?: string;
  status: InvoiceStatus;
  taxRatePct?: number; // optional VAT/GST rate
  currencyCode?: string;
  currencySymbol?: string;
}

/** A small set of common currencies for the picker. */
export const CURRENCIES: { code: string; symbol: string }[] = [
  { code: "GBP", symbol: "£" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "AUD", symbol: "A$" },
  { code: "CAD", symbol: "C$" },
  { code: "NZD", symbol: "NZ$" },
];

/** Format cents with an explicit currency symbol (for invoices). */
export function formatMoney(cents: number, symbol: string): string {
  const neg = cents < 0;
  const v = Math.abs(cents);
  return `${neg ? "-" : ""}${symbol}${Math.floor(v / 100)}.${String(v % 100).padStart(2, "0")}`;
}

export interface BusinessProfile {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  taxNumber?: string; // e.g. VAT registration number
  bankDetails?: string;
}

const INVOICES_KEY = "invoices";
const PROFILE_KEY = "business_profile";

export async function loadInvoices(): Promise<Invoice[]> {
  const row = await db.settings.get(INVOICES_KEY);
  if (!row?.value) return [];
  try { return JSON.parse(row.value) as Invoice[]; } catch { return []; }
}
export async function saveInvoices(list: Invoice[]): Promise<void> {
  await db.settings.put({ key: INVOICES_KEY, value: JSON.stringify(list) });
}

export async function loadProfile(): Promise<BusinessProfile> {
  const row = await db.settings.get(PROFILE_KEY);
  if (!row?.value) return { name: "" };
  try { return JSON.parse(row.value) as BusinessProfile; } catch { return { name: "" }; }
}
export async function saveProfile(p: BusinessProfile): Promise<void> {
  await db.settings.put({ key: PROFILE_KEY, value: JSON.stringify(p) });
}

export interface InvoiceTotals { subtotal: number; tax: number; total: number }

export function computeTotals(inv: Invoice): InvoiceTotals {
  const subtotal = inv.lines.reduce((sum, l) => sum + Math.round(l.quantity * l.unitPrice), 0);
  const tax = inv.taxRatePct ? Math.round((subtotal * inv.taxRatePct) / 100) : 0;
  return { subtotal, tax, total: subtotal + tax };
}

/** An invoice is overdue if it's a real invoice, unpaid, and past its due date. */
export function isOverdue(inv: Invoice, today = new Date().toISOString().slice(0, 10)): boolean {
  return (inv.kind ?? "invoice") === "invoice" && inv.status !== "paid" && inv.dueDate < today;
}

/** Next number like "INV-0007" or "QUO-0003", based on existing items of that kind. */
export function nextInvoiceNumber(list: Invoice[], kind: InvoiceKind = "invoice"): string {
  const prefix = kind === "quote" ? "QUO" : "INV";
  let max = 0;
  for (const inv of list) {
    if ((inv.kind ?? "invoice") !== kind) continue;
    const m = inv.number.match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}
