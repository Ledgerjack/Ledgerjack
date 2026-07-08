/**
 * brand — the app's positioning, kept in one place so it's consistent everywhere.
 */

export const APP_NAME = "LedgerJack";

/** The motto (competitive positioning). */
export const APP_MOTTO = "Free, private, AI-powered — files to HMRC, never sells your data.";

/** Short form for tight spaces. */
export const APP_MOTTO_SHORT = "Free · Private · AI-powered";

/** The promises behind the motto, for the trust/about screen. */
export const APP_PROMISES: { title: string; body: string }[] = [
  { title: "Free, and always will be", body: "Every feature — including filing to HMRC — is free. No paywalls. Contributions are voluntary." },
  { title: "Private by design", body: "Your books live encrypted on your device. We have no server that can read them, and we never sell or share your data." },
  { title: "AI that helps, honestly", body: "AI scans receipts and explains your numbers, on your own key with visible cost. It never invents figures, and you review everything." },
  { title: "You're in control", body: "Export everything anytime. Provisional figures are clearly labelled — the app keeps you MTD-ready and points you to your accountant." },
];
