/**
 * supportConfig — where the "Support LedgerJack" buttons send people.
 *
 * You (the owner) create your OWN payment links and paste them here. No API
 * keys, no backend, nothing secret — these are just public URLs. Good options:
 *   - Stripe Payment Links (make one "one-off, customer chooses amount" and one
 *     recurring/subscription link) — dashboard.stripe.com/payment-links
 *   - Ko-fi, Buy Me a Coffee, or GitHub Sponsors
 *
 * Leave a field as "" to hide that button. Contributions are always voluntary;
 * nothing in the app is ever locked behind them.
 */

export const SUPPORT_LINKS = {
  /** One-off contribution (ideally "customer chooses amount"). */
  oneOff: "",
  /** Recurring / subscription contribution. */
  recurring: "",
  /** Optional: source code or GitHub Sponsors page. */
  github: "",
};

/** Gentle, non-pushy suggestions shown as guidance (people pick any amount). */
export const SUPPORT_SUGGESTIONS = {
  oneOff: "around £30 a year",
  recurring: "around £3 a month",
};
