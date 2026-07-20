import { describe, it, expect, vi } from "vitest";

/**
 * The exportable backup was upgraded from 210k to 600k PBKDF2 iterations, keyed
 * off the blob's `v` field. The one way that change could hurt a user is by
 * orphaning a backup they made with the old version. This test drives real
 * ciphertext through the real code path to prove old v1 blobs still open.
 *
 * We stub backup.ts (it reads the db) so importEncryptedBackup can round-trip a
 * known payload we control.
 */

let lastImported: string | null = null;
vi.mock("../src/lib/backup", () => ({
  // exportBackup returns the inner plaintext JSON that gets encrypted
  exportBackup: async () => JSON.stringify({ transactions: [{ id: "t1" }], marker: "PLAINTEXT_BOOKS" }),
  // importBackup receives the decrypted inner JSON; capture it to assert on
  importBackup: async (json: string) => { lastImported = json; },
}));

import { exportEncryptedBackup, importEncryptedBackup, isEncryptedBackup } from "../src/lib/cloudbackup/encryptedBackup";

const PASS = "correct horse battery staple";

describe("encrypted backup KDF versioning", () => {
  it("writes a current (v2) blob that round-trips", async () => {
    const blob = await exportEncryptedBackup(PASS);
    const outer = JSON.parse(blob);
    expect(outer.magic).toBe("LJENC1");
    expect(outer.v).toBe(2);

    lastImported = null;
    await importEncryptedBackup(blob, PASS);
    expect(lastImported).toContain("PLAINTEXT_BOOKS");
  });

  it("recognises an encrypted blob vs a plain one", async () => {
    const blob = await exportEncryptedBackup(PASS);
    expect(isEncryptedBackup(blob)).toBe(true);
    expect(isEncryptedBackup(JSON.stringify({ transactions: [] }))).toBe(false);
  });

  it("rejects the wrong passphrase", async () => {
    const blob = await exportEncryptedBackup(PASS);
    await expect(importEncryptedBackup(blob, "wrong")).rejects.toBeTruthy();
  });

  it("still opens a legacy v1 blob (210k) after the upgrade", async () => {
    // Build a v1 blob by hand using the same primitives the old code used.
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const base = await crypto.subtle.importKey("raw", enc.encode(PASS), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 210_000, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
    );
    const payload = JSON.stringify({ transactions: [{ id: "old" }], marker: "LEGACY_V1_BOOKS" });
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(payload));
    const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
    const v1blob = JSON.stringify({ magic: "LJENC1", v: 1, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) });

    lastImported = null;
    await importEncryptedBackup(v1blob, PASS);
    expect(lastImported).toContain("LEGACY_V1_BOOKS");
  });
});
