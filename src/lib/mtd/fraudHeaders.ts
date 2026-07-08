/**
 * Browser-side fraud-prevention headers for HMRC MTD.
 *
 * HMRC legally requires these on every ITSA call. This collects the
 * browser-side Gov-Client-* headers; the relay adds the server-only ones
 * (public IP, vendor headers) before forwarding to HMRC.
 *
 * Validate the exact set/format against HMRC's "Test Fraud Prevention
 * Headers" API before production.
 */

import { getOrCreateDeviceId, getStableUserId } from "./mtdVault";

function pct(s: string): string {
  return encodeURIComponent(s);
}

function timezone(): string {
  const offsetMin = -new Date().getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
}

function screens(): string {
  const s = window.screen;
  const scaling = window.devicePixelRatio || 1;
  const depth = s.colorDepth || 24;
  return `width=${s.width}&height=${s.height}&scaling-factor=${scaling}&colour-depth=${depth}`;
}

function windowSize(): string {
  return `width=${window.innerWidth}&height=${window.innerHeight}`;
}

/** Collect the browser-side Gov-Client-* headers. */
export async function collectClientHeaders(): Promise<Record<string, string>> {
  const deviceId = await getOrCreateDeviceId();
  const userId = await getStableUserId();
  return {
    "Gov-Client-Device-ID": deviceId,
    "Gov-Client-Timezone": timezone(),
    "Gov-Client-Screens": screens(),
    "Gov-Client-Window-Size": windowSize(),
    "Gov-Client-Browser-JS-User-Agent": navigator.userAgent,
    "Gov-Client-Browser-Do-Not-Track":
      navigator.doNotTrack === "1" ? "true" : "false",
    "Gov-Client-User-IDs": `ledgerjack=${pct(userId)}`,
    // Gov-Client-Local-IPs (WebRTC) is intentionally omitted — privacy-invasive
    // and often blocked. HMRC has documented "missing data" rules. Add an opt-in
    // helper only if approval requires it.
  };
}
