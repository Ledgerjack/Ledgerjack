/**
 * aiUsage — records token usage AND the real cost OpenRouter reports, per month.
 * Stored as a small aggregate in db.settings (ai_usage_YYYY-MM). Token counts
 * and cost aren't sensitive, so stored plainly.
 *
 * Cost shown = the real cost from OpenRouter when available; otherwise a
 * token×price estimate from the catalogue.
 */

import { db } from "../db";
import { estimateCostUSD } from "./aiModels";

const KEY_PREFIX = "ai_usage_";

export interface ModelUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;   // summed real cost from OpenRouter (0 if none reported)
  hasReal: boolean;  // whether any real cost was recorded for this model
}
export interface MonthUsage {
  month: string;
  calls: number;
  byModel: Record<string, ModelUsage>;
}

function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Record one AI call. `costUSD` is OpenRouter's real cost, or null/undefined. */
export async function recordUsage(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  costUSD?: number | null,
  when = new Date(),
): Promise<void> {
  const month = monthKey(when);
  const key = KEY_PREFIX + month;
  const row = await db.settings.get(key);
  const usage: MonthUsage = row?.value
    ? (JSON.parse(row.value) as MonthUsage)
    : { month, calls: 0, byModel: {} };

  usage.calls += 1;
  const m = usage.byModel[modelId] ?? { calls: 0, inputTokens: 0, outputTokens: 0, costUSD: 0, hasReal: false };
  m.calls += 1;
  m.inputTokens += inputTokens || 0;
  m.outputTokens += outputTokens || 0;
  if (typeof costUSD === "number") {
    m.costUSD += costUSD;
    m.hasReal = true;
  }
  usage.byModel[modelId] = m;

  await db.settings.put({ key, value: JSON.stringify(usage) });
}

export async function getMonthUsage(when = new Date()): Promise<MonthUsage | null> {
  const row = await db.settings.get(KEY_PREFIX + monthKey(when));
  return row?.value ? (JSON.parse(row.value) as MonthUsage) : null;
}

export interface CostBreakdownRow {
  modelId: string;
  calls: number;
  costUSD: number | null;
  actual: boolean;
}
export interface MonthCost {
  totalUSD: number;
  hasUnpriced: boolean;
  anyActual: boolean;
  rows: CostBreakdownRow[];
  calls: number;
}

export function estimateMonthCost(usage: MonthUsage | null): MonthCost {
  if (!usage) return { totalUSD: 0, hasUnpriced: false, anyActual: false, rows: [], calls: 0 };
  let total = 0;
  let hasUnpriced = false;
  let anyActual = false;
  const rows: CostBreakdownRow[] = Object.entries(usage.byModel).map(([modelId, m]) => {
    let cost: number | null;
    let actual = false;
    if (m.hasReal) {
      cost = m.costUSD;
      actual = true;
      anyActual = true;
    } else {
      cost = estimateCostUSD(modelId, m.inputTokens, m.outputTokens);
    }
    if (cost === null) hasUnpriced = true;
    else total += cost;
    return { modelId, calls: m.calls, costUSD: cost, actual };
  });
  return { totalUSD: total, hasUnpriced, anyActual, rows, calls: usage.calls };
}
