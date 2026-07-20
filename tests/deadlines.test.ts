import { describe, it, expect } from "vitest";
import {
  mtdDeadlinesForTaxYear,
  taxYearStartFor,
  buildIcs,
  buildDeadlineCalendar,
} from "../src/lib/deadlines";

describe("MTD deadline dates", () => {
  const d = mtdDeadlinesForTaxYear(2026);

  it("puts the four quarterly updates on the 7th", () => {
    expect(d[0].date).toBe("2026-08-07");
    expect(d[1].date).toBe("2026-11-07");
    expect(d[2].date).toBe("2027-02-07");
    expect(d[3].date).toBe("2027-05-07");
  });

  it("puts the Final Declaration on 31 Jan AFTER the year ends (not the same Jan)", () => {
    expect(d[4].date).toBe("2028-01-31");
  });

  it("includes the 31 July payment date", () => {
    expect(d[5].date).toBe("2028-07-31");
  });

  it("attaches a not-tax-advice caveat to every event", () => {
    expect(d.every((e) => /tax advice/i.test(e.detail))).toBe(true);
  });
});

describe("tax year boundary (6 April)", () => {
  it("treats 5 April as the old year and 6 April as the new one", () => {
    expect(taxYearStartFor(new Date("2026-04-05T12:00:00Z"))).toBe(2025);
    expect(taxYearStartFor(new Date("2026-04-06T12:00:00Z"))).toBe(2026);
  });

  it("keeps 31 March in the previous tax year, not the calendar year", () => {
    expect(taxYearStartFor(new Date("2027-03-31T12:00:00Z"))).toBe(2026);
  });
});

describe("iCalendar output (RFC 5545)", () => {
  const now = new Date("2026-07-16T12:00:00Z");
  const ics = buildIcs(mtdDeadlinesForTaxYear(2026), now);

  it("is wrapped in VCALENDAR", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("uses CRLF line endings", () => {
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });

  it("emits six events, each closed, each with two alarms", () => {
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(6);
    expect((ics.match(/END:VEVENT/g) || []).length).toBe(6);
    expect((ics.match(/BEGIN:VALARM/g) || []).length).toBe(12);
    expect((ics.match(/END:VALARM/g) || []).length).toBe(12);
  });

  it("uses an exclusive next-day DTEND for all-day events", () => {
    expect(ics.includes("DTSTART;VALUE=DATE:20260807")).toBe(true);
    expect(ics.includes("DTEND;VALUE=DATE:20260808")).toBe(true);
  });

  it("never exceeds 75 octets per line (byte-measured folding)", () => {
    const enc = new TextEncoder();
    const longest = Math.max(...ics.split("\r\n").map((l) => enc.encode(l).length));
    expect(longest).toBeLessThanOrEqual(75);
  });

  it("escapes semicolons, commas, backslashes and newlines", () => {
    const evil = buildIcs([{ date: "2026-08-07", title: "A; B, C\\D", detail: "l1\nl2" }], now);
    expect(evil.includes("SUMMARY:A\\; B\\, C\\\\D")).toBe(true);
    expect(evil.includes("DESCRIPTION:l1\\nl2")).toBe(true);
  });

  it("folded text reassembles to the original when unfolded", () => {
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded.includes("Making Tax Digital")).toBe(true);
  });
});

describe("buildDeadlineCalendar", () => {
  it("covers two tax years (12 events)", () => {
    const ics = buildDeadlineCalendar(new Date("2026-07-16T12:00:00Z"));
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(12);
  });
});
