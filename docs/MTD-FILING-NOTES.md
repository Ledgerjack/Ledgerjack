# MTD filing screens — what was added (roadmap item #1)

The HMRC connection now has the screens that actually file. All new, all in
sandbox/"practice mode" until you switch `HMRC_ENV`.

## New files
Logic (src/lib/mtd/)
- `mtdCategories.ts` — maps your account paths (e.g. "Expenses:Travel:Fuel") to
  HMRC's period-summary categories. The category names are HMRC's own field
  names (turnover, other; costOfGoods, carVanTravelExpenses, premisesRunningCosts…).
- `mtdAggregator.ts` — adds up approved transactions in a quarter into those
  categories, from signed-cents to pounds.
- `mtdEndpoints.ts` — all HMRC paths + API versions in one place.
- `mtdApi.ts` — the calls: list business, obligations, submit quarterly update,
  trigger/get calculation, final declaration. Each goes through the relay.

Screens (src/views/mtd/)
- `MtdHub.tsx` — connect → enter NINO → list quarterly obligations. Reached from
  Settings → "Making Tax Digital ›" (UK only).
- `SubmitQuarter.tsx` — shows the figures, a "what we'll send to HMRC" preview of
  the exact JSON, itemised-vs-single-figure choice, then submit.
- `TaxCalculation.tsx` — trigger and show HMRC's estimate, read-only.
- `FinalDeclaration.tsx` — the year-end "confirm correct" step (typed CONFIRM).

## Inspiration from GitHub (as requested)
- `hmrc/self-employment-business-api` — HMRC's own reference implementation of
  the exact period-summary endpoint. Best source for the payload shape.
- `hmrc/income-tax-mtd-changelog` (mapping-csv-files) — the authoritative
  category → Self Assessment box mapping. Use it to refine `mtdCategories.ts`.
- `ac000/libmtdac` — a real open-source ITSA client that reached production;
  good for the end-to-end call sequence.

## MUST CONFIRM before switching to production
The exact endpoint PATHS and API version numbers in `mtdEndpoints.ts` are our
best-known values and need checking against the live HMRC OpenAPI specs. They're
all in that one file with CONFIRM notes. Because everything runs through the
relay in sandbox, a wrong path fails safely in testing — it can't cause a bad
real submission. Also validate the fraud headers with HMRC's Test Fraud
Prevention Headers API (see docs/MTD-START-HERE.md, Phase 4).

## How the money maps (plain English)
Your books use double-entry: every transaction has matching +/- splits. The
aggregator only counts INCOME and EXPENSE splits (your bank/cash side is
ignored, since it's the other half of the same entry). Income becomes
`turnover` (or `other`); each expense lands in the closest HMRC category by
keyword, with anything unmatched going to `otherExpenses`, which is always safe.
