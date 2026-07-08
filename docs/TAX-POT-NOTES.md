# Tax estimator + tax pot (roadmap item #2)

Your dashboard now shows UK sole traders a "set aside for tax" figure, updated
from their own books. All new files; no existing behaviour changed.

## What the user sees
A card near the top of the Dashboard (UK region only) showing:
- **Set aside for tax** — the estimated Income Tax + Class 4 NI on profit so far.
- Profit so far, and the tax split (Income Tax + NI).
- Roughly what % of income to reserve.
- The next payment-on-account date (31 Jan / 31 Jul) with an indicative amount.
- A clear "estimate, not advice / not HMRC's official figure" note, and a link to
  the MTD screen for HMRC's own calculation.

## New files
- `src/lib/tax/ukTaxRates.ts` — 2026/27 rates as DATA (personal allowance + £100k
  taper, 20/40/45% bands, Class 4 NI 6%/2%). Update once a year, no code changes.
- `src/lib/tax/taxEstimator.ts` — pure functions: Income Tax (band-width method)
  and Class 4 NI. Verified against hand-computed figures (e.g. £45,000 profit →
  £6,486 Income Tax + £1,945.80 NI).
- `src/lib/tax/taxPot.ts` — pulls profit for the current tax year via the MTD
  aggregator, runs the estimate, works out the next payment-on-account date.
- `src/components/TaxPotCard.tsx` — the dashboard widget.
- Wired into `src/views/Dashboard.tsx` (UK only, near the top).

## Inspiration from GitHub / open source
- `loglux/tax_calculator` — the key idea borrowed: keep tax bands and thresholds
  as DATA (a rates table), not hardcoded in the maths, and be explicit that the
  result is an estimate, not HMRC's official methodology. Both done here.

## Honest limits (by design)
- England, Wales & NI rates only; Scotland's bands differ (noted in the UI).
- It estimates on profit *so far this tax year*; it is a planning aid, not advice.
- Payment-on-account instalments are really half your *previous* year's bill; we
  show half the current estimate as an indicative figure with that caveat.
- For the authoritative number, the MTD tax-calculation screen asks HMRC directly.

## Competitor gaps this closes
From your own competitor notes: Sage's glanceable "tax to set aside", !Coconut's
"tax pot", and QuickBooks' payment-on-account reminders — now all present.
