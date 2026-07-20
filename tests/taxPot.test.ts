import { describe, it, expect, vi, beforeEach } from "vitest";

// taxPot imports the aggregator (which reads the db); stub it out.
vi.mock("../src/lib/mtd/mtdAggregator", () => ({
  aggregatePeriod: vi.fn(async () => ({
    meta: { transactionCount: 0, totalIncome: 0, totalExpenses: 0, net: 0 },
  })),
}));

import {
  currentUkTaxYearWindow,
  nextPaymentDate,
  getSetAsidePercent,
  setSetAsidePercent,
} from "../src/lib/tax/taxPot";

describe("UK tax-year window", () => {
  it("runs 6 April to 5 April and labels correctly", () => {
    const w = currentUkTaxYearWindow(new Date("2026-07-15T12:00:00Z"));
    expect(w.from).toBe("2026-04-06");
    expect(w.to).toBe("2027-04-05");
    expect(w.label).toBe("2026/27");
  });

  it("puts 5 April in the OLD year", () => {
    expect(currentUkTaxYearWindow(new Date("2026-04-05T12:00:00Z")).label).toBe("2025/26");
  });
});

describe("nextPaymentDate", () => {
  it("returns a 31 Jan or 31 Jul date on/after now", () => {
    const d = nextPaymentDate(new Date("2026-03-01T12:00:00Z"));
    expect(d).toBe("2026-07-31");
  });
});

describe("set-aside percentage (the app never guesses one)", () => {
  beforeEach(() => localStorage.clear());

  it("returns null until the user sets one", () => {
    expect(getSetAsidePercent()).toBeNull();
  });

  it("stores and reads back a chosen percentage", () => {
    setSetAsidePercent(25);
    expect(getSetAsidePercent()).toBe(25);
  });

  it("clamps out-of-range values into 0..100", () => {
    setSetAsidePercent(150);
    expect(getSetAsidePercent()).toBe(100);
  });
});
