# Subcontractors (CIS) — the light "paying others" feature

For a UK contractor paying subcontractors under the Construction Industry Scheme.
On-brand and low-risk: it RECORDS CIS correctly but does not file returns.

## What the user does
Settings -> Subcontractors (CIS) (UK only). Enter the subcontractor, labour,
materials and their status (registered 20% / unregistered 30% / gross 0%). It
shows the deduction and net-to-pay live, then records the payment. A running
"CIS deducted this tax year" total is shown.

## The accounting (verified balanced)
Each payment posts a balanced 3-split transaction into the review queue:
- Debit  Expenses:Cost of Sales:Subcontractors  (gross = labour + materials)
- Credit Assets:Cash                             (net actually paid)
- Credit Liabilities:CIS Deductions              (deduction owed to HMRC)
The CIS deduction applies to LABOUR ONLY, never materials. Self-test confirmed
the deduction rates and that every split set sums to zero (balances).

## What it deliberately does NOT do (signposted in the UI)
- It does not file the monthly CIS return (CIS300) to HMRC.
- It does not verify subcontractors with HMRC.
Those remain the contractor's responsibility. Not tax advice.

## Files
- src/lib/cis/cis.ts (rates, calcCis, recordSubcontractorPayment, YTD total,
  ensureCisAccount which creates Liabilities:CIS Deductions if missing)
- src/views/CisPayment.tsx (form + live calc + signpost)
- Wired into App, Navigation, Settings (UK only)

## Why this instead of payroll
Most self-employed users pay subcontractors, not employees. This fits the
offline/no-backend architecture and the SA103 "subcontractor costs" box we
already had. Full payroll stays parked (it needs a backend for RTI, carries
much higher stakes, and targets employers rather than the self-employed).
