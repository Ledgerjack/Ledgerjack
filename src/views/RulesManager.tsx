/**
 * RulesManager — create and manage categorisation rules.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Wand2 } from "lucide-react";
import { db } from "../lib/db";
import { loadRules, saveRules, type CategoryRule, type MatchType } from "../lib/rules/rules";
import { suggestRules, type RuleSuggestion } from "../lib/rules/ruleSuggestions";

function uid(): string {
  return "rule_" + Math.random().toString(36).slice(2, 10);
}

export default function RulesManager({ onBack }: { onBack: () => void }) {
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [pattern, setPattern] = useState("");
  const [matchType, setMatchType] = useState<MatchType>("contains");
  const [accountId, setAccountId] = useState("");
  const [suggestions, setSuggestions] = useState<RuleSuggestion[]>([]);

  useEffect(() => {
    loadRules().then(setRules);
    suggestRules().then(setSuggestions).catch(() => setSuggestions([]));
    db.accounts.toArray().then((accs: any[]) => {
      const cats = accs
        .filter((a) => a.type === "EXPENSE" || a.type === "INCOME")
        .map((a) => ({ id: a.id, name: a.name ?? a.id }));
      setAccounts(cats);
      if (cats[0]) setAccountId(cats[0].id);
    });
  }, []);

  async function persist(next: CategoryRule[]) {
    setRules(next);
    await saveRules(next);
  }

  async function addRule() {
    if (!pattern.trim() || !accountId) return;
    await persist([...rules, { id: uid(), pattern: pattern.trim(), matchType, accountId, enabled: true }]);
    setPattern("");
  }
  async function toggle(id: string) {
    await persist(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  }
  async function remove(id: string) {
    await persist(rules.filter((r) => r.id !== id));
  }

  async function addSuggestion(s: RuleSuggestion) {
    const next: CategoryRule[] = [...rules, { id: uid(), pattern: s.pattern, matchType: "contains", accountId: s.accountId, enabled: true }];
    await persist(next);
    setSuggestions((prev) => prev.filter((x) => x.pattern !== s.pattern));
  }

  const nameFor = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  const matchWord = (t: MatchType) => (t === "startsWith" ? "starts with" : t === "equals" ? "is exactly" : "contains");

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
        <Wand2 className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-slate-900">Categorisation rules</h2>
      </div>

      <p className="text-sm text-slate-500">
        Auto-file transactions by their description — no AI needed. For example, if the description
        contains "BP", file it as Travel.
      </p>

      {/* Add a rule */}
      <div className="bg-white rounded-xl border border-line p-4 space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">New rule</p>
        <div className="flex gap-2">
          <select
            value={matchType}
            onChange={(e) => setMatchType(e.target.value as MatchType)}
            className="border-2 border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
          >
            <option value="contains">contains</option>
            <option value="startsWith">starts with</option>
            <option value="equals">is exactly</option>
          </select>
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="e.g. BP, Shell, Uber"
            className="flex-1 border-2 border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <label className="block text-xs text-slate-500">
          File as
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 w-full border-2 border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
          >
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <button
          onClick={addRule}
          disabled={!pattern.trim() || !accountId}
          className="w-full flex items-center justify-center gap-1.5 bg-brand-600 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add rule
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="bg-brand-50 border-2 border-brand-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Suggested from your history</p>
          {suggestions.map((s) => (
            <div key={s.pattern} className="flex items-center gap-2">
              <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">
                "{s.pattern}" → {nameFor(s.accountId)} <span className="text-ink-soft">({s.count}×)</span>
              </span>
              <button onClick={() => addSuggestion(s)} className="text-xs font-bold text-brand-600 shrink-0">Add</button>
            </div>
          ))}
        </div>
      )}

      {/* Existing rules */}
      {rules.length === 0 ? (
        <p className="text-sm text-ink-soft text-center">No rules yet.</p>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-line p-3 flex items-center gap-2">
              <label className="flex items-center gap-2 flex-1 min-w-0">
                <input type="checkbox" checked={r.enabled} onChange={() => toggle(r.id)} />
                <span className="text-sm text-slate-700 truncate">
                  If description {matchWord(r.matchType)} <span className="font-semibold">"{r.pattern}"</span> → {nameFor(r.accountId)}
                </span>
              </label>
              <button onClick={() => remove(r.id)} className="text-ink-soft hover:text-red-500 shrink-0" aria-label="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
