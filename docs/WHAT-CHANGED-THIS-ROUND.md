# What changed this round (consolidation)

We folded your pending work into ONE clean app instead of adding new features.
Here is exactly what happened, and what's recommended next.

## 1. Applied the pending fixes (from ledgerjack-all-fixes)
These were NEWER than your live app and had never been merged. All 13 files
were applied on top of your app:

Security & correctness
- `crypto.ts` / `CryptoContext.tsx` — vault key-hardening raised to the modern
  standard (600k PBKDF2 iterations), with backward compatibility so existing
  vaults still open without any user action. Encrypt/decrypt helpers exposed
  for API-key storage.
- `supabase/functions/ai-proxy/index.ts` — replaced open CORS with an allowlist
  of your own domains (closes an abuse vector).
- `db.ts` — schema advanced to version 4 (Dexie migrates existing data safely).
- `App.tsx` / `AppContext.tsx` — provider wiring so the API key encrypts/decrypts
  through the vault.
- Also refreshed: `AISettingsPanel.tsx`, `aiService.ts`, `ai.ts`, `backup.ts`,
  `types.ts`, `LockScreen.tsx`, `TransactionEntry.tsx`.

## 2. Kept the MTD work intact
`App.tsx` exists in both the fixes and the MTD merge, so it was hand-merged:
the newer fixed version is the base, and the three MTD edits (import, detect the
HMRC return, finish it after unlock) were re-applied on top. The MTD files
(`src/lib/mtd/*`, `src/views/mtd/*`, `supabase/functions/hmrc-relay/`) and the
UK-only Connect button in Settings are all present.

## 3. Verified
Every source file (42 of them) passed a syntax/JSX check with zero errors, and
the MTD relay's security allowlist now matches the fixed ai-proxy.

## What we deliberately did NOT do
The loose, half-finished feature code from the older session zips
(biometric vault, jurisdiction selector, manual-entry parser, MTD data
aggregator, account suggestions, trip detection, BYOK/API-key screens) was NOT
merged. Each is only part of a feature and needs its full session run to wire in
correctly — that's "adding features", which you asked to defer. They're safe to
bring in later, one at a time, on top of this clean base.

## Recommended next order (highest value first)
1. MTD filing screens — obligations, quarterly update, tax calculation, final
   declaration (finishes what the connection started; needs your `ledger.ts`).
2. Tax estimator + "tax pot" + payment-on-account dates (competitor parity).
3. Invoicing (PDF + payment link).
4. Bank feeds / reconciliation (Open Banking).
5. Property income (needed for landlord MTD).
6. Onboarding polish + biometric login.

Do each as its own step, test, then move on — exactly how we handled MTD.
