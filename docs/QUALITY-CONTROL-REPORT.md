# Quality Control Report

A systematic audit of the whole app: wiring, types, money/date math, security,
and race conditions. Verification is static analysis + logic self-tests (no
network in the build environment), so runtime behaviour should still be smoke-
tested with `npm run dev` after unzip.

## What was audited and PASSED
- Navigation wiring: every View union member has a render in App, and vice versa.
- Whole-app syntax sweep: 176 files, 0 errors.
- Lib-wide strict typecheck: passes (remaining messages are environment
  artifacts — papaparse/uuid types absent in the audit sandbox — plus one item
  noted under Known limitations).
- Money math re-verified this session: statements balance to zero; VAT box 3/5
  derivation; CIS labour-only deduction with balanced 3-splits; invoice totals,
  kind-aware numbering; budgets (incl. child-category coverage); recurring
  catch-up without duplicates; reconcile matching + date window; quick-entry
  parser.
- XSS review of the print pipeline: every user-supplied string in invoice and
  statement HTML goes through esc()/nl2br(); remaining interpolations are
  numeric or derived constants. mailto reminder fully URI-encoded.
- Key handling: OpenRouter key and HMRC tokens live in the encrypted vault; no
  key/token logging found; nothing sensitive in localStorage.
- Backups: all new features store JSON in db.settings, which the existing
  backup/restore covers automatically.
- Review-queue integrity: quick add, voice, bulk receipts, recurring items and
  CIS payments all land as pending_review, and PendingReview lists every
  pending transaction, so nothing bypasses human review.

## Bugs FOUND and FIXED in this pass
1. Quote -> "To invoice" kept the quote's id, creating two records with the same
   id (editing/deleting one hit both). Converted invoices now get a fresh id.
2. GPS mileage compared the unit to 'mi' but the config value is 'miles' — UK
   trips would have been measured in kilometres (about 38% short). Fixed.
3. CSV formula injection (security): a description like "=SUM(...)" or "+44..."
   would execute/misbehave when the exported CSV was opened in Excel/Sheets.
   All user text in both exporters is now neutralised (verified by self-test);
   this also fixed a latent bug where a double-quote in a category name could
   corrupt the summary CSV.
4. Multi-tab double-posting: with two tabs open, the recurring schedulers could
   both run and post duplicates. Now guarded with the Web Locks API (single
   runner; graceful fallback where unsupported).
5. Invoice editor: after deleting a line, the price inputs of later lines could
   show stale values (defaultValue + index keys). Inputs now remount on line-
   count change.
6. Robustness: malformed AI JSON now produces a friendly error instead of a raw
   parse error; explicit types added in the CIS period sum.

## Known limitations / accepted risks (documented, not hidden)
- crypto.ts triggers a benign type complaint under very new TypeScript lib
  definitions (Uint8Array vs BufferSource generics). It compiles and runs in the
  project as-is; deliberately left untouched because editing working crypto
  blind is riskier than the nit. If your local tsc ever flags it, the fix is a
  `as BufferSource` cast at the flagged lines.
- Last-write-wins on JSON-in-settings lists (invoices, rules, budgets, ...): two
  tabs editing the same list simultaneously can lose one tab's change. The
  scheduler race is fixed; a full multi-tab merge story would need per-record
  storage. Low risk for a single-user app; worth knowing.
- "Outstanding" invoice figures include drafts (anything not marked paid). If
  you'd rather drafts not count until marked sent, that's a one-line change —
  flagging the semantics rather than silently choosing.
- AI-returned dates are trusted after parsing; the entry-confirmation step is
  the human check. Could add strict date validation later.
- Voice entry uses the browser's speech recognition, which may send audio to
  the browser vendor (how Chrome implements it) — inherent to the Web Speech
  API; the text parser itself is fully offline.
- GPS distance is foreground-only and an estimate (stated in the UI).
- The PDF path uses a popup window; aggressive popup blockers may require the
  user to allow it once.
- External facts to confirm before launch (already marked in code/docs): HMRC
  MTD/VAT endpoint versions, OpenRouter model slugs/prices, CIS rates, and the
  2026/27 tax-rate data table.

## Verdict
No known critical issues remain. The five real defects found (two functional
bugs, one security issue, one race, one UI bug) are fixed and re-verified. The
codebase is in good shape to proceed to Onboarding & security polish and the
launch section.
