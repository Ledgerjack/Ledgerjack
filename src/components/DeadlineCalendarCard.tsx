/**
 * DeadlineCalendarCard — hands the user a calendar file for their own calendar.
 * No push permissions, no notification server, no account. Their calendar app
 * does the reminding, offline, on whatever device they actually look at.
 */

import { useState } from "react";
import { CalendarPlus, Check, AlertTriangle } from "lucide-react";
import { buildDeadlineCalendar, taxYearStartFor } from "../lib/deadlines";
import { downloadFile } from "../lib/backup";

export default function DeadlineCalendarCard() {
  const [done, setDone] = useState(false);
  const start = taxYearStartFor();
  const label = `${start}/${(start + 1).toString().slice(2)}`;

  const add = () => {
    downloadFile(buildDeadlineCalendar(), `ledgerjack-tax-dates-${label.replace("/", "-")}.ics`, "text/calendar");
    setDone(true);
    setTimeout(() => setDone(false), 4000);
  };

  return (
    <div className="bg-white rounded-xl border border-line p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarPlus className="w-5 h-5 text-brand-600" />
        <h3 className="font-bold text-slate-900">Put the dates in your calendar</h3>
      </div>

      <p className="text-xs text-ink-soft leading-relaxed">
        Download the key dates for {label} and next year, and open the file to add them to whatever calendar you already use — phone, laptop, Google, Apple, Outlook. Each one reminds you a week before and again on the day.
      </p>

      <p className="text-xs text-ink-soft leading-relaxed">
        We don't send emails or push notifications, and we don't need your calendar account — <strong>it's your calendar doing the reminding, not us.</strong> Works offline, and keeps working even if you stop using LedgerJack.
      </p>

      <button
        onClick={add}
        className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-lg text-sm"
      >
        {done ? <><Check className="w-4 h-4" /> Downloaded — open it to add the dates</> : <><CalendarPlus className="w-4 h-4" /> Download tax dates (.ics)</>}
      </button>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800 leading-relaxed">
          <strong>These are dates, not advice.</strong> The quarterly ones only apply if you're signed up for Making Tax Digital — plenty of people aren't yet. Check what applies to you on GOV.UK or with your accountant.
        </p>
      </div>
    </div>
  );
}
