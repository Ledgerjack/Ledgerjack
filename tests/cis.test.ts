import { describe, it, expect, vi } from "vitest";

// cis.ts imports db/atRest/ledger at module load; we only test the pure calcCis,
// so stub those modules to keep the import graph browser-free.
vi.mock("../src/lib/db", () => ({ db: {} }));
vi.mock("../src/lib/atRest", () => ({ decAmount: (n: number) => n }));
vi.mock("../src/lib/ledger", () => ({ createTransaction: vi.fn() }));

import { calcCis } from "../src/lib/cis/cis";

describe("CIS deduction uses the USER-supplied rate (app holds no rates)", () => {
  it("deducts the entered rate from labour only, never materials", () => {
    const c = calcCis(100000, 50000, 20); // £1000 labour, £500 materials, 20%
    expect(c.deduction).toBe(20000); // £200, from labour
    expect(c.gross).toBe(150000); // materials included in gross
    expect(c.net).toBe(130000); // £1500 − £200
  });

  it("honours a non-standard rate rather than forcing 20/30", () => {
    expect(calcCis(100000, 0, 17.5).deduction).toBe(17500);
  });

  it("invents nothing when the rate is blank/NaN", () => {
    expect(calcCis(100000, 50000, NaN).deduction).toBe(0);
  });

  it("clamps a negative rate to zero (no negative deduction)", () => {
    expect(calcCis(100000, 50000, -5).deduction).toBe(0);
  });

  it("rounds the deduction to whole pence", () => {
    expect(calcCis(33333, 0, 20).deduction).toBe(6667); // 6666.6 → 6667
  });

  it("0% (gross status) deducts nothing", () => {
    const c = calcCis(100000, 50000, 0);
    expect(c.deduction).toBe(0);
    expect(c.net).toBe(150000);
  });
});
