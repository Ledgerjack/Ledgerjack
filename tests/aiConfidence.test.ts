import { describe, it, expect, vi } from "vitest";

// ai.ts pulls in several browser/db modules at load; stub what's needed so we
// can test the pure confidence helpers against the real source.
vi.mock("../src/lib/ledger", () => ({ makeSimpleSplits: vi.fn() }));
vi.mock("../src/lib/db", () => ({}));
vi.mock("../src/lib/regions", () => ({ TAX_REGIONS: {}, }));
vi.mock("../src/lib/currency", () => ({ parseCurrencyInput: vi.fn() }));
vi.mock("../src/lib/ai/aiUsage", () => ({ recordUsage: vi.fn() }));
vi.mock("../src/lib/ai/openrouterClient", () => ({ callOpenRouter: vi.fn() }));

import { confidenceOf, needsReview, CONFIDENCE_THRESHOLD } from "../src/lib/ai";

const base = { description: "x", date: "2026-01-01", amount: 1, debit_account: "a", credit_account: "b" };

describe("confidenceOf", () => {
  it("treats a missing/invalid confidence as zero (unsure)", () => {
    expect(confidenceOf(undefined)).toBe(0);
    expect(confidenceOf(NaN)).toBe(0);
  });
  it("clamps to 0..1", () => {
    expect(confidenceOf(1.5)).toBe(1);
    expect(confidenceOf(-1)).toBe(0);
  });
});

describe("needsReview flags a scan for a human when unsure", () => {
  it("does not flag when both are confident", () => {
    expect(needsReview({ ...base, amount_confidence: 0.9, category_confidence: 0.9 })).toBe(false);
  });
  it("flags a shaky amount", () => {
    expect(needsReview({ ...base, amount_confidence: 0.5, category_confidence: 0.9 })).toBe(true);
  });
  it("flags a shaky category", () => {
    expect(needsReview({ ...base, amount_confidence: 0.9, category_confidence: 0.3 })).toBe(true);
  });
  it("flags when the model gave no confidence at all", () => {
    expect(needsReview({ ...base })).toBe(true);
  });
  it("accepts exactly the threshold", () => {
    expect(needsReview({ ...base, amount_confidence: CONFIDENCE_THRESHOLD, category_confidence: CONFIDENCE_THRESHOLD })).toBe(false);
  });
});
