/**
 * Invoices — create, edit, and produce invoices (PDF via print). List + editor
 * in one screen, plus a small business-details profile used on the invoice.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, FileText, Printer, Check, Pencil, Building2, Users, Repeat } from "lucide-react";
import { useRegionConfig } from "../contexts/AppContext";
import { parseCurrencyInput } from "../lib/currency";
import {
  loadInvoices, saveInvoices, loadProfile, saveProfile, computeTotals, nextInvoiceNumber,
  formatMoney, CURRENCIES, isOverdue,
  type Invoice, type InvoiceLine, type BusinessProfile, type InvoiceStatus, type InvoiceKind,
} from "../lib/invoices/invoices";
import { printInvoice, printStatement } from "../lib/invoices/invoicePrint";
import { shareViaWhatsApp, shareViaEmail } from "../lib/share/share";
import QRCode from "../components/QRCode";
import { loadClients, type Client } from "../lib/invoices/clients";
import type { View } from "../components/Navigation";

const uid = () => "inv_" + Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
};

export default function Invoices({ onBack, onNavigate }: { onBack: () => void; onNavigate: (v: View) => void }) {
  const cfg = useRegionConfig();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profile, setProfile] = useState<BusinessProfile>({ name: "" });
  const [clients, setClients] = useState<Client[]>([]);
  const [mode, setMode] = useState<"list" | "edit" | "profile" | "statements">("list");
  const [draft, setDraft] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState<InvoiceKind>("invoice");
  const [qrInvoice, setQrInvoice] = useState<Invoice | null>(null);

  const symOf = (inv: { currencySymbol?: string }) => inv.currencySymbol ?? cfg.currencySymbol;

  function remind(inv: Invoice) {
    const total = formatMoney(computeTotals(inv).total, symOf(inv));
    const subject = `Reminder: invoice ${inv.number} (${total})`;
    const body = `Hi ${inv.clientName || ""},\n\nA friendly reminder that invoice ${inv.number} for ${total} was due on ${inv.dueDate} and appears unpaid.\n\nThank you,\n${profile.name || ""}`;
    const to = inv.clientEmail ? encodeURIComponent(inv.clientEmail) : "";
    window.open(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  }

  async function refresh() {
    setInvoices(await loadInvoices());
    setProfile(await loadProfile());
    setClients(await loadClients());
  }
  useEffect(() => { refresh(); }, []);

  function newInvoice() {
    setDraft({
      id: uid(), number: nextInvoiceNumber(invoices, filter), kind: filter, clientName: "",
      issueDate: today(), dueDate: plusDays(30), lines: [{ description: "", quantity: 1, unitPrice: 0 }],
      status: "draft", currencyCode: cfg.currencyCode, currencySymbol: cfg.currencySymbol,
    });
    setMode("edit");
  }
  function convertToInvoice(q: Invoice) {
    const inv: Invoice = { ...q, id: uid(), kind: "invoice", number: nextInvoiceNumber(invoices, "invoice"), status: "draft" };
    persist([inv, ...invoices]);
  }
  function editInvoice(inv: Invoice) { setDraft({ ...inv, lines: inv.lines.map((l) => ({ ...l })) }); setMode("edit"); }

  async function persist(list: Invoice[]) { setInvoices(list); await saveInvoices(list); }

  async function saveDraft() {
    if (!draft) return;
    const exists = invoices.some((i) => i.id === draft.id);
    const list = exists ? invoices.map((i) => (i.id === draft.id ? draft : i)) : [draft, ...invoices];
    await persist(list);
    setMode("list"); setDraft(null);
  }
  async function del(id: string) { await persist(invoices.filter((i) => i.id !== id)); }
  async function setStatus(id: string, status: InvoiceStatus) {
    await persist(invoices.map((i) => (i.id === id ? { ...i, status } : i)));
  }

  // ---------- Profile editor ----------
  if (mode === "profile") {
    return (
      <div className="space-y-4 pb-24">
        <Header onBack={() => setMode("list")} icon={<Building2 className="w-5 h-5 text-brand-600" />} title="Your business details" />
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-2">
          {(["name", "address", "email", "phone", "taxNumber", "bankDetails"] as const).map((f) => (
            <label key={f} className="block text-xs text-slate-500 capitalize">
              {f === "taxNumber" ? "VAT / tax number" : f === "bankDetails" ? "Payment / bank details" : f}
              {f === "address" || f === "bankDetails" ? (
                <textarea value={profile[f] ?? ""} onChange={(e) => setProfile({ ...profile, [f]: e.target.value })} rows={2} className="mt-1 w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
              ) : (
                <input value={profile[f] ?? ""} onChange={(e) => setProfile({ ...profile, [f]: e.target.value })} className="mt-1 w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
              )}
            </label>
          ))}
          <button onClick={async () => { await saveProfile(profile); setMode("list"); }} className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-bold">Save details</button>
        </div>
      </div>
    );
  }

  // ---------- Client statements ----------
  if (mode === "statements") {
    const byClient = new Map<string, Invoice[]>();
    invoices.filter((i) => (i.kind ?? "invoice") === "invoice").forEach((inv) => {
      const k = inv.clientName || "—";
      byClient.set(k, [...(byClient.get(k) ?? []), inv]);
    });
    return (
      <div className="space-y-4 pb-24">
        <Header onBack={() => setMode("list")} icon={<FileText className="w-5 h-5 text-brand-600" />} title="Client statements" />
        {byClient.size === 0 ? (
          <p className="text-sm text-slate-400 text-center">No invoices yet.</p>
        ) : [...byClient.entries()].map(([name, list]) => {
          const outstanding = list.filter((i) => i.status !== "paid").reduce((s, i) => s + computeTotals(i).total, 0);
          const sym = symOf(list[0]);
          return (
            <div key={name} className="bg-white rounded-xl border-2 border-slate-200 p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                <p className="text-[11px] text-slate-400">{list.length} invoices · outstanding {formatMoney(outstanding, sym)}</p>
              </div>
              <button onClick={() => printStatement(name, list, profile, sym)} className="text-brand-600 text-sm font-semibold flex items-center gap-1 shrink-0"><Printer className="w-4 h-4" /> Statement</button>
            </div>
          );
        })}
      </div>
    );
  }

  // ---------- Invoice editor ----------
  if (mode === "edit" && draft) {
    const t = computeTotals(draft);
    const setLine = (i: number, patch: Partial<InvoiceLine>) =>
      setDraft({ ...draft, lines: draft.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });
    return (
      <div className="space-y-4 pb-24">
        <Header onBack={() => { setMode("list"); setDraft(null); }} icon={<FileText className="w-5 h-5 text-brand-600" />} title={draft.number} />

        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-2">
          {clients.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => { const c = clients.find((x) => x.id === e.target.value); if (c) setDraft({ ...draft, clientName: c.name, clientEmail: c.email, clientAddress: c.address, taxRatePct: c.taxRatePct ?? draft.taxRatePct }); }}
              className="w-full border-2 border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
            >
              <option value="">Choose saved client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <input value={draft.clientName} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} placeholder="Client name" className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input value={draft.clientEmail ?? ""} onChange={(e) => setDraft({ ...draft, clientEmail: e.target.value })} placeholder="Client email (optional)" className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <textarea value={draft.clientAddress ?? ""} onChange={(e) => setDraft({ ...draft, clientAddress: e.target.value })} placeholder="Client address (optional)" rows={2} className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-slate-500">Issued<input type="date" value={draft.issueDate} onChange={(e) => setDraft({ ...draft, issueDate: e.target.value })} className="mt-1 w-full border-2 border-slate-300 rounded-lg px-2 py-2 text-sm" /></label>
            <label className="flex-1 text-xs text-slate-500">Due<input type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} className="mt-1 w-full border-2 border-slate-300 rounded-lg px-2 py-2 text-sm" /></label>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Items</p>
          {draft.lines.map((l, i) => (
            <div key={`${i}-of-${draft.lines.length}`} className="space-y-1 border-b border-slate-100 pb-2 last:border-0">
              <input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Description" className="w-full border-2 border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
              <div className="flex gap-2 items-center">
                <input type="number" min="0" value={l.quantity} onChange={(e) => setLine(i, { quantity: parseFloat(e.target.value) || 0 })} placeholder="Qty" className="w-16 border-2 border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
                <span className="text-slate-400 text-sm">×</span>
                <input inputMode="decimal" defaultValue={l.unitPrice ? (l.unitPrice / 100).toFixed(2) : ""} onBlur={(e) => setLine(i, { unitPrice: parseCurrencyInput(e.target.value) })} placeholder="Unit price" className="flex-1 border-2 border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
                <span className="text-sm font-semibold text-slate-700 w-20 text-right">{formatMoney(Math.round(l.quantity * l.unitPrice), symOf(draft))}</span>
                {draft.lines.length > 1 && <button onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, idx) => idx !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
          ))}
          <button onClick={() => setDraft({ ...draft, lines: [...draft.lines, { description: "", quantity: 1, unitPrice: 0 }] })} className="flex items-center gap-1 text-sm text-brand-600 font-semibold"><Plus className="w-4 h-4" /> Add item</button>
        </div>

        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-2">
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-slate-500">Tax rate % (optional)
              <input type="number" min="0" value={draft.taxRatePct ?? ""} onChange={(e) => setDraft({ ...draft, taxRatePct: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="e.g. 20" className="mt-1 w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="w-28 text-xs text-slate-500">Currency
              <select
                value={draft.currencyCode ?? cfg.currencyCode}
                onChange={(e) => { const c = CURRENCIES.find((x) => x.code === e.target.value); setDraft({ ...draft, currencyCode: c?.code, currencySymbol: c?.symbol }); }}
                className="mt-1 w-full border-2 border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
              >
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </label>
          </div>
          <textarea value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes (optional)" rows={2} className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <div className="flex justify-between text-sm pt-1"><span className="text-slate-500">Total</span><span className="font-bold text-slate-900">{formatMoney(t.total, symOf(draft))}</span></div>
        </div>

        <div className="flex gap-2">
          <button onClick={saveDraft} disabled={!draft.clientName.trim()} className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">Save</button>
          <button onClick={() => printInvoice(draft, profile, symOf(draft))} className="flex items-center gap-1.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold"><Printer className="w-4 h-4" /> PDF</button>
        </div>
      </div>
    );
  }

  // ---------- List ----------
  return (
    <div className="space-y-4 pb-24">
      <Header onBack={onBack} icon={<FileText className="w-5 h-5 text-brand-600" />} title="Invoices" />

      <button onClick={() => setMode("profile")} className="w-full flex items-center gap-2 text-left bg-white rounded-xl border-2 border-slate-200 p-3">
        <Building2 className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-600 flex-1">{profile.name ? `From: ${profile.name}` : "Set your business details"}</span>
        <Pencil className="w-4 h-4 text-slate-400" />
      </button>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => onNavigate('clients')} className="flex items-center justify-center gap-1 bg-white border-2 border-slate-200 text-slate-700 py-2 rounded-lg text-xs font-semibold">
          <Users className="w-4 h-4" /> Clients
        </button>
        <button onClick={() => onNavigate('invoices-recurring')} className="flex items-center justify-center gap-1 bg-white border-2 border-slate-200 text-slate-700 py-2 rounded-lg text-xs font-semibold">
          <Repeat className="w-4 h-4" /> Recurring
        </button>
        <button onClick={() => setMode('statements')} className="flex items-center justify-center gap-1 bg-white border-2 border-slate-200 text-slate-700 py-2 rounded-lg text-xs font-semibold">
          <FileText className="w-4 h-4" /> Statements
        </button>
      </div>

      <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
        <button onClick={() => setFilter('invoice')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${filter === 'invoice' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-500'}`}>Invoices</button>
        <button onClick={() => setFilter('quote')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${filter === 'quote' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-500'}`}>Quotes</button>
      </div>

      <button onClick={newInvoice} className="w-full flex items-center justify-center gap-1.5 bg-brand-600 text-white py-2.5 rounded-lg text-sm font-bold"><Plus className="w-4 h-4" /> {filter === 'quote' ? 'New quote' : 'New invoice'}</button>

      {filter === 'invoice' && (() => {
        const overdue = invoices.filter((i) => isOverdue(i));
        if (overdue.length === 0) return null;
        const amt = overdue.reduce((s, i) => s + computeTotals(i).total, 0);
        return (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-sm text-red-700 font-semibold">
            {overdue.length} overdue · {formatMoney(amt, symOf(overdue[0]))} outstanding
          </div>
        );
      })()}

      {invoices.filter((i) => (i.kind ?? "invoice") === filter).length === 0 ? (
        <p className="text-sm text-slate-400 text-center">No {filter === "quote" ? "quotes" : "invoices"} yet.</p>
      ) : (
        <div className="space-y-2">
          {invoices.filter((i) => (i.kind ?? "invoice") === filter).map((inv) => {
            const t = computeTotals(inv);
            const isQuote = (inv.kind ?? "invoice") === "quote";
            return (
              <div key={inv.id} className="bg-white rounded-xl border-2 border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{inv.number}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${STATUS_STYLE[inv.status]}`}>{inv.status}</span>
                      {isOverdue(inv) && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-red-100 text-red-700">Overdue</span>}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{inv.clientName || "—"} · due {inv.dueDate}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-900 shrink-0">{formatMoney(t.total, symOf(inv))}</span>
                </div>
                <div className="flex gap-2 text-xs flex-wrap">
                  <button onClick={() => editInvoice(inv)} className="flex items-center gap-1 text-slate-600 font-semibold"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                  <button onClick={() => printInvoice(inv, profile, symOf(inv))} className="flex items-center gap-1 text-slate-600 font-semibold"><Printer className="w-3.5 h-3.5" /> PDF</button>
                  <button onClick={() => shareViaWhatsApp(`${isQuote ? "Quote" : "Invoice"} ${inv.number} for ${formatMoney(t.total, symOf(inv))}${inv.status !== "paid" && !isQuote ? `, due ${inv.dueDate}` : ""}.${profile.name ? ` — ${profile.name}` : ""}`)} className="flex items-center gap-1 text-emerald-600 font-semibold">WhatsApp</button>
                  <button
                    onClick={() => shareViaEmail(
                      `${isQuote ? "Quote" : "Invoice"} ${inv.number}${profile.name ? ` from ${profile.name}` : ""}`,
                      `Hi ${inv.clientName || ""},\n\nPlease find ${isQuote ? "your quote" : `invoice ${inv.number}`} for ${formatMoney(t.total, symOf(inv))}${inv.status !== "paid" && !isQuote ? `, due ${inv.dueDate}` : ""}.\n\n${profile.bankDetails ? `Payment details:\n${profile.bankDetails}\n\n` : ""}Thank you,\n${profile.name || ""}`,
                      inv.clientEmail || "",
                    )}
                    className="flex items-center gap-1 text-blue-600 font-semibold"
                  >
                    Email
                  </button>
                  <button onClick={() => setQrInvoice(inv)} className="flex items-center gap-1 text-slate-600 font-semibold">QR</button>
                  {isQuote ? (
                    <button onClick={() => convertToInvoice(inv)} className="flex items-center gap-1 text-brand-600 font-semibold"><Check className="w-3.5 h-3.5" /> To invoice</button>
                  ) : inv.status !== "paid"
                    ? <button onClick={() => setStatus(inv.id, "paid")} className="flex items-center gap-1 text-emerald-600 font-semibold"><Check className="w-3.5 h-3.5" /> Mark paid</button>
                    : <button onClick={() => setStatus(inv.id, "sent")} className="text-slate-400 font-semibold">Mark unpaid</button>}
                  {isOverdue(inv) && <button onClick={() => remind(inv)} className="flex items-center gap-1 text-red-600 font-semibold">Remind</button>}
                  <button onClick={() => del(inv.id)} className="flex items-center gap-1 text-slate-400 hover:text-red-500 ml-auto"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-slate-400 text-center">"PDF" opens a print view — choose "Save as PDF" to download or send.</p>

      {qrInvoice && (() => {
        const t = computeTotals(qrInvoice);
        const payload = [
          `${(qrInvoice.kind ?? "invoice") === "quote" ? "Quote" : "Invoice"} ${qrInvoice.number}`,
          profile.name ? `Payee: ${profile.name}` : "",
          `Amount: ${formatMoney(t.total, symOf(qrInvoice))}`,
          `Reference: ${qrInvoice.number}`,
          profile.bankDetails ? `Pay to:\n${profile.bankDetails}` : "",
        ].filter(Boolean).join("\n");
        return (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setQrInvoice(null)}>
            <div className="bg-white rounded-2xl p-5 max-w-xs w-full flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-slate-900">{qrInvoice.number}</h3>
              <QRCode value={payload} size={220} />
              <p className="text-[11px] text-slate-500 text-center">Your client can scan this to see the payment details{profile.bankDetails ? "" : " (add bank details in your business profile to include them)"}.</p>
              <button onClick={() => setQrInvoice(null)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-bold">Close</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function Header({ onBack, icon, title }: { onBack: () => void; icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onBack} className="p-1 -ml-1 text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
      {icon}
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
    </div>
  );
}
