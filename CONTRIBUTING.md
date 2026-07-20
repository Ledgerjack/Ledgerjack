# Contributing to LedgerJack

Thanks for helping build a free, private bookkeeping tool. A few principles keep
LedgerJack true to its promise — please read these before a big change.

## Core principles (please don't break these)

1. **Private by default.** No feature should send a user's financial data to a
   server we control. Sensitive data is encrypted client-side. If a feature needs
   a backend (bank feeds, live share links, chat bots), it must be optional,
   clearly signposted, and must not route readable financial data through us.
2. **Offline-first.** Core bookkeeping must work with no network. Online features
   are additive, never required for the basics.
3. **Honest figures.** The app must not invent numbers. Anything estimated or
   provisional must be labelled, and AI must only explain figures we computed —
   never calculate or guess them.
4. **Human-in-the-loop.** AI-scanned, imported, and auto-generated items land in
   the review queue; nothing posts silently.

## Dev setup

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test          # unit tests (Vitest)
```

## Money & tax logic — always add a self-test

Money is stored as **signed integer pence** (debit +, credit −), and every
transaction must balance (splits sum to zero). Any change to money, tax, VAT,
CIS, statements, budgets, or date maths **must** come with a unit test that
proves the arithmetic. Tests live in `tests/` and run with `npm test` (Vitest);
see the existing specs (e.g. `tests/cis.test.ts`, `tests/deadlines.test.ts`) for
the style — mock the data-layer deps and assert exact numbers. PRs that touch
these areas without a test will be asked for one. **New code requires new tests**,
and CI runs the whole suite on every push and pull request.

## Security-sensitive areas (extra review)

Changes to the crypto vault, key handling, backups, WebAuthn/biometric, or the
HMRC relay get extra scrutiny. Don't store keys or secrets in plaintext, don't
weaken the "server can't read your data" property, and flag anything you couldn't
test on a real device.

## Style

- TypeScript, functional React components, Tailwind utility classes.
- Prefer small, focused modules; keep view logic thin and put maths in `src/lib`.
- Match the existing plain-English, non-alarming tone in user-facing copy.

## Pull requests

- Describe what changed and why, and note anything you couldn't verify.
- Keep PRs focused. One feature/fix per PR where possible.
- If you found and fixed a bug, add a test that would have caught it.

## Good first areas

- Per-bank CSV import presets (Monzo/Starling/Barclays column shapes).
- More categorisation-rule learning heuristics.
- Accessibility and mobile polish.
- Translations / additional jurisdictions.

## Reporting security issues

Please **do not** open a public issue for vulnerabilities — see
[`SECURITY.md`](./SECURITY.md) for responsible disclosure.
