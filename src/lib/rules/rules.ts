/**
 * rules — user-defined categorisation rules. "If the description contains X,
 * file it as account Y." Deterministic, offline, free — no AI needed.
 *
 * Stored as JSON in db.settings (not sensitive). First enabled match wins.
 */

import { db } from "../db";

export type MatchType = "contains" | "startsWith" | "equals";

export interface CategoryRule {
  id: string;
  pattern: string;
  matchType: MatchType;
  accountId: string; // the category to assign (e.g. "Expenses:Travel:Fuel")
  enabled: boolean;
}

const KEY = "categorization_rules";

export async function loadRules(): Promise<CategoryRule[]> {
  const row = await db.settings.get(KEY);
  if (!row?.value) return [];
  try {
    return JSON.parse(row.value) as CategoryRule[];
  } catch {
    return [];
  }
}

export async function saveRules(rules: CategoryRule[]): Promise<void> {
  await db.settings.put({ key: KEY, value: JSON.stringify(rules) });
}

function matches(description: string, rule: CategoryRule): boolean {
  const d = description.toLowerCase();
  const p = rule.pattern.toLowerCase().trim();
  if (!p) return false;
  switch (rule.matchType) {
    case "startsWith": return d.startsWith(p);
    case "equals": return d.trim() === p;
    case "contains":
    default: return d.includes(p);
  }
}

/** Return the first enabled rule that matches, or null. */
export function matchRule(description: string, rules: CategoryRule[]): CategoryRule | null {
  for (const r of rules) {
    if (r.enabled && matches(description, r)) return r;
  }
  return null;
}
