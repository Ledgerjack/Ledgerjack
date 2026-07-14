/**
 * cis — UK Construction Industry Scheme support for a contractor paying
 * subcontractors. It calculates the CIS deduction (on the LABOUR portion only,
 * never materials) and records a balanced transaction:
 *   - Debit  Expenses:Cost of Sales:Subcontractors  (gross labour + materials)
 *   - Credit Assets:Cash                             (net actually paid)
 *   - Credit Liabilities:CIS Deductions              (deduction owed to HMRC)
 *
 * IMPORTANT: LedgerJack RECORDS CIS; it does NOT file the monthly CIS return
 * (CIS300) to HMRC — that remains the contractor's separate obligation.
 */

import { db } from "../db";
import { decAmount } from "../atRest";
import { createTransaction } from "../ledger";

export type CisStatus = "registered" | "unregistered" | "gross";

/** Standard CIS deduction rates (data, so they're easy to update). */
export const CIS_RATES: Record<CisStatus, number> = {
  registered: 0.20,   // verified/registered subcontractor
  unregistered: 0.30, // not registered/verified
  gross: 0.0,         // gross payment status
};

export const SUBCONTRACTOR_EXPENSE = "Expenses:Cost of Sales:Subcontractors";
export const CIS_LIABILITY = "Liabilities:CIS Deductions";

export interface CisCalc {
  labour: number;    // cents
  materials: number; // cents
  gross: number;     // cents
  rate: number;
  deduction: number; // cents (on labour only)
  net: number;       // cents actually paid
}

/** Compute the CIS deduction and net payment. All amounts in cents. */
export function calcCis(labour: number, materials: number, status: CisStatus): CisCalc {
  const rate = CIS_RATES[status];
  const deduction = Math.round(labour * rate);
  const gross = labour + materials;
  return { labour, materials, gross, rate, deduction, net: gross - deduction };
}

/** Make sure the CIS liability account exists (create it once if missing). */
export async function ensureCisAccount(): Promise<void> {
  const existing = await db.accounts.get(CIS_LIABILITY);
  if (!existing) {
    await db.accounts.add({
      id: CIS_LIABILITY,
      name: CIS_LIABILITY,
      type: "LIABILITY",
      parent: "Liabilities",
      placeholder: false,
      sort_order: 2.3,
    } as any);
  }
}

/** Record a subcontractor payment as a balanced 3-split transaction. */
export async function recordSubcontractorPayment(params: {
  subcontractor: string;
  labour: number;
  materials: number;
  status: CisStatus;
  cashAccount: string;
  date: string;
  trade?: string;
}): Promise<CisCalc> {
  await ensureCisAccount();
  const c = calcCis(params.labour, params.materials, params.status);

  const splits = [
    { account_id: SUBCONTRACTOR_EXPENSE, amount: c.gross, memo: "Subcontractor cost" },
    { account_id: params.cashAccount, amount: -c.net, memo: "Net paid" },
  ];
  if (c.deduction > 0) {
    splits.push({ account_id: CIS_LIABILITY, amount: -c.deduction, memo: "CIS deduction owed to HMRC" });
  }

  await createTransaction(
    {
      date: params.date,
      description: `Subcontractor: ${params.subcontractor || "payment"}`,
      pending_review: true,
      trade: params.trade || undefined,
    },
    splits,
  );
  return c;
}

/** Total CIS deducted (owed to HMRC) between two dates. */
export async function cisDeductedInPeriod(from: string, to: string): Promise<number> {
  const splits = await db.splits.where("account_id").equals(CIS_LIABILITY).toArray();
  if (splits.length === 0) return 0;
  const txIds = [...new Set(splits.map((s: { transaction_id: string }) => s.transaction_id))];
  const txns = await db.transactions.bulkGet(txIds);
  const dateById = new Map<string, string>();
  txns.forEach((t: { id: string; date: string } | undefined) => { if (t) dateById.set(t.id, t.date); });
  let total = 0;
  for (const s of splits) {
    const d = dateById.get(s.transaction_id);
    if (d && d >= from && d <= to) {
      const amt = s.amount_enc ? await decAmount(s.amount_enc, s.amount) : s.amount;
      total += -amt; // credits are negative
    }
  }
  return total;
}
