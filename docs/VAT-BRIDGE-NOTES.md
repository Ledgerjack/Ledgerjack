# VAT return (MTD) — bridge (Bank & compliance item 1)

Files a UK VAT return to HMRC under Making Tax Digital, reusing the same relay and
tokens as income-tax MTD. Reached from Settings -> VAT (Making Tax Digital), UK only.

## Approach (agreed): a bridge, not an auto-calculator
The app does not yet track VAT on every transaction, so it does NOT invent the
figures. Instead the user connects, enters their VRN, picks an open obligation,
and enters the 9 boxes from their VAT records; the app submits to HMRC. Boxes 3
(total VAT due = box1+box2) and 5 (net VAT = |box3-box4|) are computed. Value
boxes 6-9 are rounded to whole pounds as HMRC requires. A "finalised" confirmation
is required before submit. Sandbox-first ("practice mode").

## GitHub / source grounding
9-box field names and the /organisations/vat/{vrn}/returns endpoint confirmed
against HMRC's own hmrc/vat-api repo and community clients (Perl
WebService::HMRC::VAT, Python hmrc). Endpoint paths/version are centralised in
vatApi.ts with a "confirm before production" note.

## Verified
Self-test: box3 205.95, box5 100.80, integer rounding of value boxes, finalised
flag and periodKey preserved.

## Files
- src/lib/vat/vatApi.ts (obligations, buildVatPayload, submitVatReturn)
- src/views/vat/VatHub.tsx (connect + VRN + obligations + 9-box submit)
- VRN storage added to src/lib/mtd/mtdVault.ts (encrypted)
- Wired into App, Navigation, Settings (UK only)

## Honest limits
- Figures are entered/confirmed by the user (a legitimate MTD "bridging" pattern),
  not auto-calculated. Full automatic VAT would need transaction-level VAT tracking
  (a separate, larger feature) — parked unless enough users are VAT-registered.
- Endpoint paths/version must be confirmed against HMRC's VAT (MTD) OpenAPI.
