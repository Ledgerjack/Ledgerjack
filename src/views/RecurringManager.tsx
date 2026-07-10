/**
 * RecurringManager — set up regular transactions that auto-create on schedule.
 * Generated items land in the review queue for a final glance.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Repeat } from "lucide-react";
import { useApp, useRegionConfig } from "../contexts/AppContext";
import { db } from "../lib/db";
import { formatCurrency, parseCurrencyInput } from "../lib/currency";
import {
  loadTemplates, saveTemplates, type RecurringTemplate, type Frequency,
} from "../lib/recurring/recurring";
import { loadTrades, type Trade } from "../lib/trades/trades";

const uid = () => "rec_" + Math.random().toString(36).slice(2, 10);

export default function RecurringManager({ onBack }: { onBack: () => void }) {
  const { region } = useApp();
  const cfg = useRegionConfig();

  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isIncome, setIsIncome] = useState(false);
  const [categoryAccount, setCategoryAccount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [nextDate, setNextDate] = useState(new Date().toISOString().slice(0, 10));
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<string>("");

  useEffect(() => {
    loadTemplates().then(setTemplates);
    loadTrades().then(setTrades);
    db.accounts.toArray().then((accs: any[]) => {
      setAccounts(accs.filter((a) => a.type === "EXPENSE" || a.type === "INCOME").map((a) => ({ id: a.id, name: a.name ?? a.id })));
    });
  }, []);

  const cats = accounts.filter((a) => (isIncome ? a.name.startsWith("Income") : a.name.startsWith("Expenses")));
  useEffect(() => {
    if (cats[0] && !cats.find((c) => c.id === categoryAccount)) setCategoryAccount(cats[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIncome, accounts]);

  async function persist(next: RecurringTemplate[]) {
    setTemplates(next);
    await saveTemplates(next);
  }
  async function add() {
    const cents = parseCurrencyInput(amount);
    if (!description.trim() || !cents || !categoryAccount) return;
    await persist([...templates, {
      id: uid(), description: description.trim(), amount: cents,
      categoryAccount, cashAccount: cfg.cashAccount, isIncome, frequency, nextDate,
      trade: selectedTrade || undefined, enabled: true,
    }]);
    setDescription(""); setAmount("");
  }
  const toggle = (id: string) => persist(templates.map((t) => t.id === id ? { ...t, enabled: !t.enabled } : t));
  const remove = (id: string) => persist(templates.filter((t) => t.id !== id));
  const nameFor = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
        <Repeat className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-slate-900">Recurring transactions</h2>
      </div>

      <p className="text-sm text-slate-500">
        Set up regular items like rent or subscriptions. They're created automatically on schedule
        and appear in your review queue for a final check.
      </p>

      {/* Add */}
      <div className="bg-white rounded-xl border border-line p-4 space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">New recurring item</p>
        <div className="flex p-0.5 bg-slate-100 rounded-lg border border-line">
          <button onClick={() => setIsIncome(false)} className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${!isIncome ? "bg-white shadow-sm text-red-600 border border-line" : "text-slate-500"}`}>Expense</button>
          <button onClick={() => setIsIncome(true)} className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${isIncome ? "bg-white shadow-sm text-income border border-line" : "text-slate-500"}`}>Income</button>
        </div>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (e.g. Office rent)" className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" inputMode="decimal" className="flex-1 border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className="border-2 border-slate-300 rounded-lg px-2 py-2 text-sm bg-white">
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <label className="block text-xs text-slate-500">Category
          <select value={categoryAccount} onChange={(e) => setCategoryAccount(e.target.value)} className="mt-1 w-full border-2 border-slate-300 rounded-lg px-2 py-2 text-sm bg-white">
            {cats.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label className="block text-xs text-slate-500">First / next date
          <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="mt-1 w-full border-2 border-slate-300 rounded-lg px-2 py-2 text-sm" />
        </label>
        {trades.length > 0 && (
          <label className="block text-xs text-slate-500">Trade
            <select value={selectedTrade} onChange={(e) => setSelectedTrade(e.target.value)} className="mt-1 w-full border-2 border-slate-300 rounded-lg px-2 py-2 text-sm bg-white">
              <option value="">Unassigned</option>
              {trades.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        )}
        <button onClick={add} disabled={!description.trim() || !amount || !categoryAccount} className="w-full flex items-center justify-center gap-1.5 bg-brand-600 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* List */}
      {templates.length === 0 ? (
        <p className="text-sm text-ink-soft text-center">No recurring items yet.</p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-line p-3 flex items-center gap-2">
              <label className="flex items-center gap-2 flex-1 min-w-0">
                <input type="checkbox" checked={t.enabled} onChange={() => toggle(t.id)} />
                <span className="min-w-0">
                  <span className="text-sm font-semibold text-slate-800 truncate block">{t.description}</span>
                  <span className="text-[11px] text-ink-soft">
                    {formatCurrency(t.amount, region)} · {t.frequency} · next {t.nextDate} · {nameFor(t.categoryAccount)}
                  </span>
                </span>
              </label>
              <button onClick={() => remove(t.id)} className="text-ink-soft hover:text-red-500 shrink-0" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
