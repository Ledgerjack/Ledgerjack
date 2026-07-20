/**
 * deadlines — generates a calendar file (.ics) of MTD and Self Assessment dates
 * that the user adds to whatever calendar they already use.
 *
 * DESIGN DECISION (deliberate): we don't email reminders, run a notification
 * server, or ask for a push permission. We hand over a standard calendar file
 * and the user's own calendar app does the reminding — on their phone, offline,
 * forever, with no account and nothing of ours in the loop.
 *
 * This is also the honest answer to a real research finding: the people who most
 * need to track their money are the least likely to open an app to do it
 * (Zhang & Sussman, J. Consumer Affairs 2024). A deadline that arrives in the
 * calendar they already look at beats a nag inside an app they've forgotten.
 *
 * These are DATES, not tax advice. We don't say whether you're mandated, what
 * you owe, or what to submit — only when the deadlines fall, so you can plan.
 */

/** One dated entry in the calendar. */
export interface DeadlineEvent {
  /** YYYY-MM-DD */
  date: string;
  title: string;
  detail: string;
}

/**
 * MTD for Income Tax quarterly update deadlines plus the year-end dates, for the
 * tax year beginning 6 April `startYear`.
 *
 * Standard tax-year quarters run 6 Apr–5 Jul, 6 Jul–5 Oct, 6 Oct–5 Jan and
 * 6 Jan–5 Apr, due on the 7th of the following month. The Final Declaration for
 * a tax year is due on 31 January after it ends.
 */
export function mtdDeadlinesForTaxYear(startYear: number): DeadlineEvent[] {
  const y = startYear;
  const label = `${y}/${(y + 1).toString().slice(2)}`;
  const caveat =
    "Only applies if you're signed up for Making Tax Digital for Income Tax. Check whether it applies to you on GOV.UK, or ask your accountant. LedgerJack doesn't give tax advice.";

  return [
    {
      date: `${y}-08-07`,
      title: `MTD quarterly update due (${label} Q1)`,
      detail: `Covers 6 April to 5 July ${y}. A quarterly update is a summary of income and expenses — it is not a tax return and doesn't finalise your tax. ${caveat}`,
    },
    {
      date: `${y}-11-07`,
      title: `MTD quarterly update due (${label} Q2)`,
      detail: `Covers 6 July to 5 October ${y}. ${caveat}`,
    },
    {
      date: `${y + 1}-02-07`,
      title: `MTD quarterly update due (${label} Q3)`,
      detail: `Covers 6 October ${y} to 5 January ${y + 1}. ${caveat}`,
    },
    {
      date: `${y + 1}-05-07`,
      title: `MTD quarterly update due (${label} Q4)`,
      detail: `Covers 6 January to 5 April ${y + 1}. ${caveat}`,
    },
    {
      date: `${y + 2}-01-31`,
      title: `Final Declaration / Self Assessment deadline (${label})`,
      detail: `The deadline to finalise the ${label} tax year and pay what's owed. Under MTD the Final Declaration replaces the old Self Assessment return. ${caveat}`,
    },
    {
      date: `${y + 2}-07-31`,
      title: `Self Assessment payment date (${label})`,
      detail: `A second payment date falls on 31 July. Whether a payment is due — and how much — depends on your circumstances. Check with HMRC or your accountant. ${caveat}`,
    },
  ];
}

/** The tax year (start year) containing a given date. UK year starts 6 April. */
export function taxYearStartFor(now = new Date()): number {
  const y = now.getUTCFullYear();
  return now.getUTCMonth() > 3 || (now.getUTCMonth() === 3 && now.getUTCDate() >= 6) ? y : y - 1;
}

/* ---------- iCalendar formatting ----------------------------------------- */

/** Escape text per RFC 5545: backslash, semicolon, comma, and newlines. */
function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold lines to 75 octets per RFC 5545. Continuation lines begin with a space.
 * Folding is measured in BYTES, not characters — a £ sign is two bytes in UTF-8,
 * so counting characters would silently produce an over-long line.
 */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;

  const out: string[] = [];
  let cur = "";
  let curBytes = 0;
  // First line allows 75 octets; continuations allow 74 (the leading space counts).
  let limit = 75;

  for (const ch of line) {
    const chBytes = enc.encode(ch).length;
    if (curBytes + chBytes > limit) {
      out.push(cur);
      cur = ch;
      curBytes = chBytes;
      limit = 74;
    } else {
      cur += ch;
      curBytes += chBytes;
    }
  }
  if (cur) out.push(cur);
  return out.join("\r\n ");
}

const stamp = (d: Date) => `${d.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;
const dateOnly = (iso: string) => iso.replace(/-/g, "");

/** Next calendar day, for the exclusive DTEND of an all-day event. */
function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Build a standards-compliant iCalendar file. All-day events, each with two
 * alarms (a week before, and on the day) so the user's own calendar nags them.
 */
export function buildIcs(events: DeadlineEvent[], now = new Date()): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LedgerJack//Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:LedgerJack tax dates",
  ];

  for (const ev of events) {
    lines.push(
      "BEGIN:VEVENT",
      fold(`UID:${dateOnly(ev.date)}-${esc(ev.title).slice(0, 20).replace(/\s/g, "")}@ledgerjack`),
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${dateOnly(ev.date)}`,
      `DTEND;VALUE=DATE:${dateOnly(nextDay(ev.date))}`,
      fold(`SUMMARY:${esc(ev.title)}`),
      fold(`DESCRIPTION:${esc(ev.detail)}`),
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "TRIGGER:-P7D",
      "ACTION:DISPLAY",
      fold(`DESCRIPTION:${esc(`One week until: ${ev.title}`)}`),
      "END:VALARM",
      "BEGIN:VALARM",
      "TRIGGER:-PT9H",
      "ACTION:DISPLAY",
      fold(`DESCRIPTION:${esc(`Today: ${ev.title}`)}`),
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** Calendar covering the current tax year and the next one. */
export function buildDeadlineCalendar(now = new Date()): string {
  const start = taxYearStartFor(now);
  return buildIcs([...mtdDeadlinesForTaxYear(start), ...mtdDeadlinesForTaxYear(start + 1)], now);
}
