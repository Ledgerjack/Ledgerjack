/**
 * DeadlineCalendar — upcoming tax dates, jurisdiction-aware.
 */

import { useApp } from "../contexts/AppContext";
import { CalendarClock, Info } from "lucide-react";
import { getDeadlines } from "../lib/insights/deadlines";

function fmt(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function daysUntil(iso: string): number {
  const ms = new Date(iso + "T00:00:00Z").getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export default function DeadlineCalendar() {
  const { region } = useApp();
  const { deadlines, note, hasSpecificDates } = getDeadlines(region);

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="w-5 h-5 text-brand-600" />
        <h3 className="font-bold text-slate-900">Key dates</h3>
      </div>

      <div className="space-y-1.5">
        {deadlines.map((d, i) => {
          const dd = daysUntil(d.date);
          return (
            <div key={i} className="flex items-center justify-between gap-2 border-b border-slate-100 last:border-0 pb-1.5 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{d.title}</p>
                {d.note && <p className="text-[11px] text-slate-400">{d.note}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-900">{fmt(d.date)}</p>
                <p className="text-[10px] text-slate-400">{dd >= 0 ? `in ${dd} days` : "passed"}</p>
              </div>
            </div>
          );
        })}
      </div>

      {note && (
        <p className="text-[10px] text-slate-400 flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          {note}
        </p>
      )}
      {!hasSpecificDates && (
        <p className="text-[10px] text-slate-400">Detailed dates are shown for the UK today; other regions are coming.</p>
      )}
    </div>
  );
}
