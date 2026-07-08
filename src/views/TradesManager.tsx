/**
 * TradesManager — define your businesses/trades and see each one's P&L.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Briefcase, Home } from "lucide-react";
import { useApp, useRegionConfig } from "../contexts/AppContext";
import { formatCurrency } from "../lib/currency";
import {
  loadTrades, saveTrades, computeTradeSummaries,
  type Trade, type TradeType, type TradeSummary,
} from "../lib/trades/trades";

const uid = () => "trade_" + Math.random().toString(36).slice(2, 10);

function fyWindow(startMonth: number, startDay: number, now = new Date()) {
  const m0 = startMonth - 1;
  const after = now.getUTCMonth() > m0 || (now.getUTCMonth() === m0 && now.getUTCDate() >= startDay);
  const sy = after ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return {
    from: new Date(Date.UTC(sy, m0, startDay)).toISOString().slice(0, 10),
    to: new Date(Date.UTC(sy + 1, m0, startDay - 1)).toISOString().slice(0, 10),
  };
}

export default function TradesManager({ onBack }: { onBack: () => void }) {
  const { region } = useApp();
  const cfg = useRegionConfig();
  const m = (c: number) => formatCurrency(c, region);
  const win = fyWindow(cfg.fiscalYearStart.month, cfg.fiscalYearStart.day);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [rows, setRows] = useState<TradeSummary[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<TradeType>("self-employment");

  async function refresh() {
    setTrades(await loadTrades());
    setRows(await computeTradeSummaries(win.from, win.to));
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  async function add() {
    if (!name.trim()) return;
    await saveTrades([...(await loadTrades()), { id: uid(), name: name.trim(), type }]);
    setName("");
    await refresh();
  }
  async function remove(id: string) {
    await saveTrades((await loadTrades()).filter((t) => t.id !== id));
    await refresh();
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
        <Briefcase className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-slate-900">Trades &amp; income sources</h2>
      </div>

      <p className="text-sm text-slate-500">
        Track more than one business — for example two trades, or a trade plus property. Tag
        transactions to a trade when you add them, and see each one's profit here. Handy for MTD,
        which treats each business and property as a separate source.
      </p>

      {/* Add */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">New trade</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Plumbing, or Flat rental)" className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
          <button onClick={() => setType("self-employment")} className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${type === "self-employment" ? "bg-white shadow-sm text-slate-900 border border-slate-200" : "text-slate-500"}`}>Self-employment</button>
          <button onClick={() => setType("property")} className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${type === "property" ? "bg-white shadow-sm text-slate-900 border border-slate-200" : "text-slate-500"}`}>Property</button>
        </div>
        <button onClick={add} disabled={!name.trim()} className="w-full flex items-center justify-center gap-1.5 bg-brand-600 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50">
          <Plus className="w-4 h-4" /> Add trade
        </button>
      </div>

      {/* Per-trade P&L */}
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 text-center">No trades yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">This tax year ({win.from} to {win.to})</p>
          {rows.map((r) => {
            const trade = trades.find((t) => t.id === r.tradeId);
            return (
              <div key={r.tradeId ?? "unassigned"} className="bg-white rounded-xl border-2 border-slate-200 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {trade?.type === "property" ? <Home className="w-4 h-4 text-slate-400" /> : <Briefcase className="w-4 h-4 text-slate-400" />}
                    <span className="text-sm font-semibold text-slate-800 truncate">{r.name}</span>
                  </div>
                  {trade && (
                    <button onClick={() => remove(trade.id)} className="text-slate-400 hover:text-red-500 shrink-0" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-600">Income {m(r.income)}</span>
                  <span className="text-red-500">Expenses {m(r.expenses)}</span>
                  <span className="font-bold text-slate-900">Net {m(r.net)}</span>
                </div>
                <p className="text-[10px] text-slate-400">{r.transactionCount} transactions</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
