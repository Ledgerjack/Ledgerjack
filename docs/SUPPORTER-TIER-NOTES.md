# Supporter tier (roadmap item)

A voluntary "Support LedgerJack" card in Settings. Nothing is paywalled — it's a
warm thank-you, not a fee.

## Wording (as agreed)
"LedgerJack is free, and always will be. If it's helped you, we'd appreciate a
contribution towards running costs and future improvements — entirely up to you.
Everything works either way."

## What it does
- One-off / Monthly toggle; choose-your-own-amount (with a gentle suggestion,
  e.g. ~£30/year or ~£3/month).
- A "Contribute" button that opens YOUR payment link in a new tab.
- A "where it goes" line (hosting, domain, paying developers).
- Optional "View source on GitHub" link.

## Set-up you need to do (one time)
Open src/lib/supportConfig.ts and paste your own PUBLIC payment links:
- oneOff:    a one-off link (ideally "customer chooses amount")
- recurring: a subscription link
- github:    optional source / GitHub Sponsors
Good options: Stripe Payment Links (dashboard.stripe.com/payment-links), Ko-fi,
Buy Me a Coffee, or GitHub Sponsors. Leave a field blank to hide that button.
Until a link is set, the card shows a gentle "link not set yet" note.

## Honest notes
- No payment keys or backend live in the app — it only links to your public
  pages, so there's nothing secret to protect.
- Once real money flows (e.g. via Stripe), that's a small business activity with
  its own bookkeeping and tax — fittingly, this app is the tool for it.
- Voluntary + nothing gated keeps the free-product positioning intact; worth
  confirming with HMRC's Software Developers Support Team that a supporter tier
  doesn't affect "free product" status (it shouldn't, since filing stays free).
