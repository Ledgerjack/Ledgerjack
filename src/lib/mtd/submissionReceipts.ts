/**
 * submissionReceipts — keeps a permanent record of every successful submission
 * to HMRC, including HMRC's own correlation ID.
 *
 * WHY THIS MATTERS: if HMRC later says "we never received your quarterly
 * update", the correlation ID is the user's evidence. It's HMRC's own reference
 * for that exact request. Without it the user is arguing from memory against a
 * tax authority — a fight they lose.
 *
 * Stored in the settings table (so no schema migration) as a JSON list, oldest
 * first. Receipts are facts about the past: we never rewrite one, only append.
 *
 * NOTE: this is plumbing. Nothing writes receipts until the HMRC relay exists,
 * because no submission can happen without it. It is deliberately NOT surfaced
 * as a feature in the UI until it can actually do something.
 */

import { db } from "../db";

const KEY = "mtd_submission_receipts";

export interface SubmissionReceipt {
  /** HMRC's own reference for the request — the thing that settles disputes. */
  correlationId: string;
  /** What was sent: e.g. "quarterly-update", "final-declaration". */
  kind: string;
  /** Period covered, if applicable — e.g. "2026-04-06/2026-07-05". */
  period?: string;
  /** When we sent it (device clock, ISO). */
  submittedAt: string;
  /** HTTP status HMRC returned. */
  status: number;
  /** Any HMRC-issued id for the submission itself. */
  submissionId?: string;
}

/** Pull the correlation ID out of a response, whichever case HMRC used. */
export function correlationIdFrom(headers: Headers): string | null {
  return (
    headers.get("X-CorrelationId") ??
    headers.get("x-correlationid") ??
    headers.get("CorrelationId") ??
    headers.get("correlationid") ??
    null
  );
}

export async function listReceipts(): Promise<SubmissionReceipt[]> {
  const row = await db.settings.get(KEY);
  if (!row?.value) return [];
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? (parsed as SubmissionReceipt[]) : [];
  } catch {
    return [];
  }
}

/** Append a receipt. Never modifies or removes an existing one. */
export async function recordReceipt(r: SubmissionReceipt): Promise<void> {
  const all = await listReceipts();
  all.push(r);
  await db.settings.put({ key: KEY, value: JSON.stringify(all) });
}

/** Human-readable proof the user can save or send to HMRC. */
export function formatReceipt(r: SubmissionReceipt): string {
  const lines = [
    "LedgerJack — HMRC submission receipt",
    "",
    `Submission:     ${r.kind}`,
    r.period ? `Period covered: ${r.period}` : null,
    `Sent at:        ${r.submittedAt}`,
    `HMRC response:  ${r.status}`,
    r.submissionId ? `Submission ID:  ${r.submissionId}` : null,
    `Correlation ID: ${r.correlationId}`,
    "",
    "Keep this. The correlation ID is HMRC's own reference for this exact",
    "submission — quote it if there is ever any question about what was sent",
    "or whether it arrived.",
  ];
  return lines.filter((l) => l !== null).join("\n");
}
