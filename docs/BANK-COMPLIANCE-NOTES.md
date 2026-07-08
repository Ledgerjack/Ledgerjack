# Bank & compliance section — status

## VAT return (item 5) — DONE (bridge)
- Settings -> VAT (Making Tax Digital) (UK only). Connects via the same relay/vault
  as income-tax MTD. Fetches obligations; shows the 9-box return; the user enters/
  confirms figures from their VAT records; submits to HMRC. Sandbox-first.
- Box 3 (= box1 + box2) and Box 5 (= |box3 - box4|) are derived automatically;
  boxes 6-9 are rounded to integers as HMRC requires. Verified by self-test.
- 9-box field names are HMRC's own (github.com/hmrc/vat-api + community clients).
- Honest scope: this is a BRIDGE — the user supplies/checks figures. Automatic
  9-box calculation would need VAT tracking on every transaction (a separate,
  larger feature). CONFIRM endpoint version against the VAT (MTD) OpenAPI.

## Bank connection + reconciliation (item 6) — DONE
- Settings -> Bank & reconciliation. Import a bank CSV; it matches lines against
  recorded transactions by amount within a 4-day window; unmatched lines can be
  added. Verified by self-test (2 matched / 1 unmatched; date-window match).
- Live Open Banking feed is signposted as needing a regulated provider (kept
  off by default to preserve the offline/no-backend, privacy-first model).

## Property / landlord income (item 7) — COVERED
- Handled by the multi-trade feature: add a trade of type "property" and tag its
  transactions; its P&L is tracked separately (as MTD treats property as its own
  source). Deeper property-specific tax rules (property allowance, finance-cost
  restriction) remain a possible future refinement.
