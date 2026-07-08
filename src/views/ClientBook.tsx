/**
 * ClientBook — manage saved clients for reuse on invoices.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Users } from "lucide-react";
import { loadClients, saveClients, type Client } from "../lib/invoices/clients";

const uid = () => "cli_" + Math.random().toString(36).slice(2, 10);

export default function ClientBook({ onBack }: { onBack: () => void }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxRatePct, setTaxRatePct] = useState("");

  useEffect(() => { loadClients().then(setClients); }, []);

  async function persist(list: Client[]) { setClients(list); await saveClients(list); }
  async function add() {
    if (!name.trim()) return;
    await persist([...clients, {
      id: uid(), name: name.trim(), email: email.trim() || undefined,
      address: address.trim() || undefined, taxRatePct: taxRatePct ? parseFloat(taxRatePct) : undefined,
    }]);
    setName(""); setEmail(""); setAddress(""); setTaxRatePct("");
  }
  async function remove(id: string) { await persist(clients.filter((c) => c.id !== id)); }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
        <Users className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-slate-900">Clients</h2>
      </div>

      <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">New client</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" rows={2} className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <input value={taxRatePct} onChange={(e) => setTaxRatePct(e.target.value)} inputMode="decimal" placeholder="Default tax rate % (optional)" className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <button onClick={add} disabled={!name.trim()} className="w-full flex items-center justify-center gap-1.5 bg-brand-600 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50"><Plus className="w-4 h-4" /> Add client</button>
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-slate-400 text-center">No clients yet.</p>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border-2 border-slate-200 p-3 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                {c.email && <p className="text-[11px] text-slate-400 truncate">{c.email}</p>}
              </div>
              <button onClick={() => remove(c.id)} className="text-slate-400 hover:text-red-500 shrink-0" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
