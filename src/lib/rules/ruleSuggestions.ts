/**
 * ruleSuggestions — learns from what you've already categorised. When the same
 * keyword in a description repeatedly maps to the same category, it suggests a
 * rule so future entries auto-file. Deterministic, offline, no AI.
 */

import { getApprovedTransactions } from "../ledger";
import { db, type DBAccountType } from "../db";
import { loadRules, matchRule } from "./rules";

export interface RuleSuggestion {
  pattern: string;
  accountId: string;
  count: number;
}

const STOPWORDS = new Set([
  "the", "and", "for", "from", "payment", "ltd", "limited", "invoice", "ref",
  "purchase", "card", "contactless", "transfer", "gbp", "with",
]);

function wordsOf(desc: string): string[] {
  return desc
    .split(/[^a-z0-9]+/i)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

export async function suggestRules(minCount = 3, consistency = 0.8): Promise<RuleSuggestion[]> {
  const [txns, accounts, rules] = await Promise.all([getApprovedTransactions(), db.accounts.toArray(), loadRules()]);
  const types = new Map<string, DBAccountType>();
  for (const a of accounts as any[]) types.set(a.id, a.type);
  const isCat = (id: string) => {
    const t = types.get(id) ?? (/^income[:/]/i.test(id) ? "INCOME" : /^expenses?[:/]/i.test(id) ? "EXPENSE" : undefined);
    return t === "EXPENSE" || t === "INCOME";
  };

  // For every significant word in a description, tally which category it maps to.
  const map = new Map<string, Map<string, number>>();
  for (const tx of txns as any[]) {
    const desc = (tx.description || "").trim();
    if (!desc) continue;
    const catSplit = tx.splits.find((s: any) => isCat(s.account_id));
    if (!catSplit) continue;
    for (const word of new Set(wordsOf(desc))) {
      if (!map.has(word)) map.set(word, new Map());
      const inner = map.get(word)!;
      inner.set(catSplit.account_id, (inner.get(catSplit.account_id) ?? 0) + 1);
    }
  }

  const out: RuleSuggestion[] = [];
  for (const [keyword, accCounts] of map) {
    let best = "";
    let bestCount = 0;
    let total = 0;
    for (const [acc, c] of accCounts) {
      total += c;
      if (c > bestCount) { best = acc; bestCount = c; }
    }
    if (bestCount < minCount) continue;
    if (bestCount / total < consistency) continue;
    if (matchRule(keyword, rules)) continue; // already covered by a rule
    out.push({ pattern: keyword, accountId: best, count: bestCount });
  }
  // Prefer higher-count, and drop near-duplicate substrings of a stronger suggestion.
  const sorted = out.sort((a, b) => b.count - a.count);
  const kept: RuleSuggestion[] = [];
  for (const s of sorted) {
    if (kept.some((k) => k.accountId === s.accountId && (k.pattern.includes(s.pattern) || s.pattern.includes(k.pattern)))) continue;
    kept.push(s);
  }
  return kept.slice(0, 8);
}
