import { describe, it, expect, vi } from "vitest";

// diagnostics imports selfCheck/atRest/db; stub them — we test formatDiagnostics,
// which is pure and takes an already-collected object.
vi.mock("../src/lib/selfCheck", () => ({ runSelfCheck: vi.fn() }));
vi.mock("../src/lib/atRest", () => ({
  getRuntimeDecryptFailures: () => 0,
  canEncryptAtRest: () => true,
}));
vi.mock("../src/lib/db", () => ({ db: {} }));

import { formatDiagnostics, type Diagnostics } from "../src/lib/diagnostics";

const sample: Diagnostics = {
  version: "0.1.0",
  when: "2026-07-20T10:00:00.000Z",
  environment: { userAgent: "Mozilla/5.0", language: "en-GB", online: true, storagePersisted: true },
  health: { overall: "ok", checks: [{ label: "Vault", status: "ok" }, { label: "Books balance", status: "ok", count: 0 }] },
  counts: { transactions: 42, accounts: 12, mileageLogs: 3, attachments: 7 },
  signals: { vaultReady: true, runtimeDecryptFailures: 0 },
};

describe("problem report never leaks ledger contents", () => {
  const out = formatDiagnostics(sample, "The monthly total looked wrong");

  it("contains NO client names, amounts, descriptions or API keys", () => {
    // strings that would exist in a real ledger but must never reach the report
    for (const forbidden of ["Miller", "Okafor", "Reid", "145000", "£", "sk-", "Timber", "fuel"]) {
      expect(out.includes(forbidden)).toBe(false);
    }
  });

  it("includes safe COUNTS, not contents", () => {
    expect(out.includes("Transactions:   42")).toBe(true);
    expect(/Description:|Amount:\s*\d/.test(out)).toBe(false);
  });

  it("includes the user's own note verbatim", () => {
    expect(out.includes("The monthly total looked wrong")).toBe(true);
  });

  it("states its own privacy guarantee and ends cleanly (no hidden payload)", () => {
    expect(out.includes("contains no")).toBe(true);
    expect(out.trimEnd().endsWith("— end of report —")).toBe(true);
  });

  it("includes version and browser (needed to reproduce a bug)", () => {
    expect(out.includes("0.1.0")).toBe(true);
    expect(out.includes("Mozilla/5.0")).toBe(true);
  });
});
