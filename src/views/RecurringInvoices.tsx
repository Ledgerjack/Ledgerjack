/**
 * RecurringInvoices — templates that auto-generate draft invoices on a schedule
 * (e.g. monthly retainers). Kept to a single line item, which covers most
 * retainers; the generated invoice can be edited before sending.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Repeat } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { formatCurrency, parseCurrencyInput } from "../lib/currency";
import {
  loadRecurringInvoices, saveRecurringInvoices, type RecurringInvoice,
} from "../lib/invoices/recurringInvoices";
import { type Frequency } from "../lib/recurring/recurring";

const uid = () => "rin_" + Math.random().toString(36).slice(2, 10);

export default function RecurringInvoices({ onBack }: { onBack: () => void }) {
  const { region } = useApp();
  const [items, setItems] = useState<RecurringInvoice[]>([]);
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [taxRatePct, setTaxRatePct] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [nextDate, setNextDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueInDays, setDueInDays] = useState("30");

  useEffect(() => { loadRecurringInvoices().then(setItems); }, []);

  async function persist(list: RecurringInvoice[]) { setItems(list); await saveRecurringInvoices(list); }
  async function add() {
    const price = parseCurrencyInput(amount);
    if (!clientName.trim() || !description.trim() || !price) return;
    await persist([...items, {
      id: uid(), clientName: clientName.trim(),
      lines: [{ description: description.trim(), quantity: 1, unitPrice: price }],
      taxRatePct: taxRatePct ? parseFloat(taxRatePct) : undefined,
      frequency, nextDate, dueInDays: parseInt(dueInDays, 10) || 30, enabled: true,
    }]);
    setClientName(""); setDescription(""); setAmount(""); setTaxRatePct("");
  }
  const toggle = (id: string) => persist(items.map((t) => t.id === id ? { ...t, enabled: !t.enabled } : t));
  const remove = (id: string) => persist(items.filter((t) => t.id !== id));

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
        <Repeat className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-slate-900">Recurring invoices</h2>
      </div>

      <p className="text-sm text-slate-500">
        Auto-create invoices on a schedule (e.g. a monthly retainer). New ones appear as drafts for
        you to review and send.
      </p>

      <div className="bg-white rounded-xl border border-line p-4 space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">New recurring invoice</p>
        <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (e.g. Monthly retainer)" className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Amount" className="flex-1 border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input value={taxRatePct} onChange={(e) => setTaxRatePct(e.target.value)} inputMode="decimal" placeholder="Tax %" className="w-20 border-2 border-slate-300 rounded-lg px-2 py-2 text-sm" />
        </div>
        <div className="flex gap-2">
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className="flex-1 border-2 border-slate-300 rounded-lg px-2 py-2 text-sm bg-white">
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input value={dueInDays} onChange={(e) => setDueInDays(e.target.value)} inputMode="numeric" placeholder="Due in days" className="w-28 border-2 border-slate-300 rounded-lg px-2 py-2 text-sm" />
        </div>
        <label className="block text-xs text-slate-500">First / next date
          <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="mt-1 w-full border-2 border-slate-300 rounded-lg px-2 py-2 text-sm" />
        </label>
        <button onClick={add} disabled={!clientName.trim() || !description.trim() || !amount} className="w-full flex items-center justify-center gap-1.5 bg-brand-600 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50"><Plus className="w-4 h-4" /> Add</button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-soft text-center">No recurring invoices yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-line p-3 flex items-center gap-2">
              <label className="flex items-center gap-2 flex-1 min-w-0">
                <input type="checkbox" checked={t.enabled} onChange={() => toggle(t.id)} />
                <span className="min-w-0">
                  <span className="text-sm font-semibold text-slate-800 truncate block">{t.clientName} — {t.lines[0]?.description}</span>
                  <span className="text-[11px] text-ink-soft">{formatCurrency(t.lines[0]?.unitPrice ?? 0, region)} · {t.frequency} · next {t.nextDate}</span>
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
