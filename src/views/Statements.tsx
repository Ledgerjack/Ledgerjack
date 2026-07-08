/**
 * Statements — PROVISIONAL Profit & Loss, balance sheet, cash flow, and (UK)
 * SA103 summary, with prominent "take it to your accountant" warnings and CSV
 * downloads for the accountant.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, FileText, AlertTriangle, Download } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { formatCurrency } from "../lib/currency";
import { TAX_REGIONS } from "../lib/regions";
import { computeStatements, type ProvisionalStatements } from "../lib/statements/statements";
import { computeSA103, type SA103Summary } from "../lib/statements/sa103";
import { exportTransactionsCSV, exportStatementsCSV } from "../lib/statements/exporters";

function fyWindow(startMonth: number, startDay: number, now = new Date()) {
  const m0 = startMonth - 1;
  const after = now.getUTCMonth() > m0 || (now.getUTCMonth() === m0 && now.getUTCDate() >= startDay);
  const sy = after ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return {
    from: new Date(Date.UTC(sy, m0, startDay)).toISOString().slice(0, 10),
    to: new Date(Date.UTC(sy + 1, m0, startDay - 1)).toISOString().slice(0, 10),
  };
}

export default function Statements({ onBack }: { onBack: () => void }) {
  const { region } = useApp();
  const cfg = TAX_REGIONS[region];
  const m = (cents: number) => formatCurrency(cents, region);
  const win = fyWindow(cfg.fiscalYearStart.month, cfg.fiscalYearStart.day);

  const [st, setSt] = useState<ProvisionalStatements | null>(null);
  const [sa, setSa] = useState<SA103Summary | null>(null);

  useEffect(() => {
    computeStatements(win.from, win.to).then(setSt);
    if (region === "uk") computeSA103(win.from, win.to).then(setSa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
        <FileText className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-slate-900">Provisional statements</h2>
      </div>

      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800">
          <span className="font-bold">Provisional</span> — prepared by you in LedgerJack, not by a
          qualified accountant. Take these figures to your accountant to check before relying on or
          filing them. Keeping a professional in the loop is standard practice.
        </p>
      </div>

      {!st && <p className="text-sm text-slate-400">Preparing your figures…</p>}

      {st && (
        <>
          <p className="text-xs text-slate-400">Period: {st.from} to {st.to}</p>

          {/* P&L */}
          <Section title="Profit & Loss">
            <SubHead>Income</SubHead>
            {st.pnl.income.map((i) => <Line key={i.name} label={i.name} value={m(i.amount)} />)}
            <Line label="Total income" value={m(st.pnl.totalIncome)} strong />
            <SubHead>Expenses</SubHead>
            {st.pnl.expenses.map((e) => <Line key={e.name} label={e.name} value={m(e.amount)} />)}
            <Line label="Total expenses" value={m(st.pnl.totalExpenses)} strong />
            <div className="border-t border-slate-200 mt-1 pt-1">
              <Line label="Net profit" value={m(st.pnl.netProfit)} strong />
            </div>
          </Section>

          {/* Balance sheet */}
          <Section title={`Balance sheet (as at ${st.to})`}>
            {st.balanceSheet.assets.map((a) => <Line key={a.name} label={a.name} value={m(a.amount)} />)}
            <Line label="Total assets" value={m(st.balanceSheet.totalAssets)} strong />
            {st.balanceSheet.liabilities.map((l) => <Line key={l.name} label={l.name} value={m(l.amount)} />)}
            <Line label="Total liabilities" value={m(st.balanceSheet.totalLiabilities)} strong />
            {st.balanceSheet.equity.map((e) => <Line key={e.name} label={e.name} value={m(e.amount)} />)}
            <Line label="Retained profit" value={m(st.balanceSheet.retainedProfit)} />
            {Math.abs(st.balanceSheet.difference) > 0 && (
              <Line label="Unexplained difference (check with accountant)" value={m(st.balanceSheet.difference)} warn />
            )}
          </Section>

          {/* Cash flow */}
          <Section title="Cash flow">
            <Line label="Cash at start" value={m(st.cashFlow.cashStart)} />
            <Line label="Cash at end" value={m(st.cashFlow.cashEnd)} />
            <Line label="Net movement" value={m(st.cashFlow.netMovement)} strong />
          </Section>

          {/* SA103 (UK) */}
          {sa && (
            <Section title="SA103 summary (UK, provisional)">
              <Line label="Turnover" value={m(sa.turnover)} />
              {sa.otherIncome > 0 && <Line label="Other business income" value={m(sa.otherIncome)} />}
              {sa.expenses.map((e) => <Line key={e.key} label={e.label} value={m(e.amount)} />)}
              <Line label="Total expenses" value={m(sa.totalExpenses)} strong />
              <div className="border-t border-slate-200 mt-1 pt-1">
                <Line label="Net profit" value={m(sa.netProfit)} strong />
              </div>
            </Section>
          )}

          {/* Downloads */}
          <div className="space-y-2">
            <button
              onClick={() => exportStatementsCSV(st, sa)}
              className="w-full flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-lg text-sm font-bold"
            >
              <Download className="w-4 h-4" /> Download statements (CSV)
            </button>
            <button
              onClick={() => exportTransactionsCSV(st.from, st.to)}
              className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-semibold"
            >
              <Download className="w-4 h-4" /> Download transactions (CSV)
            </button>
            <p className="text-[10px] text-slate-400 text-center">CSV files open in Excel or Google Sheets. Every file is labelled provisional.</p>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Provisional figures for discussion with a qualified accountant — keeping a professional in the loop is standard practice.
          </p>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-1">
      <h3 className="font-bold text-slate-900 text-sm mb-1">{title}</h3>
      {children}
    </div>
  );
}
function SubHead({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-1">{children}</p>;
}
function Line({ label, value, strong, warn }: { label: string; value: string; strong?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-sm ${warn ? "text-amber-700" : strong ? "font-semibold text-slate-800" : "text-slate-600"}`}>{label}</span>
      <span className={`text-sm ${warn ? "text-amber-700 font-semibold" : strong ? "font-bold text-slate-900" : "text-slate-700"}`}>{value}</span>
    </div>
  );
}
