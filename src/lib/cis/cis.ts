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

/**
 * NOTE: LedgerJack deliberately does NOT hold CIS deduction rates.
 * Rates change, and we are an organiser — not a tax adviser. The user enters
 * the rate that actually applies to their subcontractor (it's shown on the
 * payment and deduction statement, and verified with HMRC), and we do the
 * arithmetic and the bookkeeping with it.
 */

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

/**
 * Compute the CIS deduction and net payment. All amounts in cents.
 * `ratePct` is the deduction rate the USER supplies (e.g. 20 for 20%).
 */
export function calcCis(labour: number, materials: number, ratePct: number): CisCalc {
  const rate = Number.isFinite(ratePct) ? Math.max(0, ratePct) / 100 : 0;
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
  ratePct: number;
  cashAccount: string;
  date: string;
  trade?: string;
}): Promise<CisCalc> {
  await ensureCisAccount();
  const c = calcCis(params.labour, params.materials, params.ratePct);

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
