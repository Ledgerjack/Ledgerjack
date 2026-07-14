/**
 * Browser-side fraud-prevention headers for HMRC MTD (web-app-via-server).
 *
 * HMRC legally requires these on every Making Tax Digital call. This module
 * collects the browser-side Gov-Client-* values in the format HMRC expects.
 * It mirrors the scope of Intuit's open-source `user-data-for-fraud-prevention`
 * library (Gov-Client-Timezone, Screens, Window-Size, Browser-Plugins,
 * Browser-Do-Not-Track, Local-IPs, Local-IPs-Timestamp, Browser-JS-User-Agent),
 * plus the Device-ID / User-IDs LedgerJack already tracks.
 *
 * The server-only headers (Gov-Vendor-*, Gov-Client-Public-IP/Port,
 * Gov-Vendor-Version, Connection-Method, Gov-Vendor-Forwarded) are added by
 * the relay before forwarding to HMRC — a browser cannot see them.
 *
 * IMPORTANT: before production, validate the exact set and formatting against
 * HMRC's "Test Fraud Prevention Headers" API, and (optionally) swap this module
 * for the Intuit npm package once it can be installed and tested. The formats
 * here follow HMRC's fraud-prevention spec for the web-app-via-server method.
 */

import { getOrCreateDeviceId, getStableUserId } from "./mtdVault";

function pct(s: string): string {
  return encodeURIComponent(s);
}

/** Gov-Client-Timezone — local timezone as UTC±HH:MM. */
function timezone(): string {
  const offsetMin = -new Date().getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
}

/** Gov-Client-Screens — width, height, scaling-factor, colour-depth. */
function screens(): string {
  const s = window.screen;
  const scaling = window.devicePixelRatio || 1;
  const depth = s.colorDepth || 24;
  return `width=${s.width}&height=${s.height}&scaling-factor=${scaling}&colour-depth=${depth}`;
}

/** Gov-Client-Window-Size — inner width and height of the window. */
function windowSize(): string {
  return `width=${window.innerWidth}&height=${window.innerHeight}`;
}

/**
 * Gov-Client-Browser-Plugins — comma-separated, percent-encoded plugin names.
 * Modern browsers usually expose an empty list (the API is deprecated); an
 * empty value is valid per HMRC's spec.
 */
function browserPlugins(): string {
  try {
    const names: string[] = [];
    const plugins = navigator.plugins;
    for (let i = 0; i < plugins.length; i++) {
      const name = plugins[i]?.name;
      if (name) names.push(pct(name));
    }
    return names.join(",");
  } catch {
    return "";
  }
}

/** Gov-Client-Browser-Do-Not-Track — "true" or "false". */
function doNotTrack(): string {
  const dnt =
    (navigator as unknown as { doNotTrack?: string }).doNotTrack ??
    (window as unknown as { doNotTrack?: string }).doNotTrack;
  return dnt === "1" || dnt === "yes" ? "true" : "false";
}

/**
 * Gov-Client-Local-IPs — a list of the device's local IPv4/IPv6 addresses,
 * discovered via WebRTC ICE candidates. This is privacy-invasive and is
 * therefore OPT-IN: it only runs when `includeLocalIPs` is true.
 *
 * NOTE for approval: HMRC's spec for the web-app-via-server connection method
 * expects local IPs. LedgerJack's default is privacy-first (off), but this
 * MUST be enabled for real submissions or HMRC may reject the headers. Present
 * it to the user with a clear explanation before enabling.
 *
 * Resolves to a comma-separated list (may be empty if blocked/unavailable).
 */
async function localIPs(timeoutMs = 800): Promise<string> {
  if (typeof RTCPeerConnection === "undefined") return "";
  return new Promise<string>((resolve) => {
    const found = new Set<string>();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { pc.close(); } catch { /* ignore */ }
      resolve(Array.from(found).join(","));
    };
    let pc: RTCPeerConnection;
    try {
      pc = new RTCPeerConnection({ iceServers: [] });
    } catch {
      resolve("");
      return;
    }
    try { pc.createDataChannel(""); } catch { /* ignore */ }
    const ipRe =
      /([0-9]{1,3}(?:\.[0-9]{1,3}){3})|([a-f0-9]{0,4}(?::[a-f0-9]{0,4}){2,7})/gi;
    pc.onicecandidate = (e) => {
      if (!e.candidate) { finish(); return; }
      const cand = e.candidate.candidate || "";
      const matches = cand.match(ipRe);
      if (matches) {
        for (const m of matches) {
          // skip mDNS placeholders and obvious non-IPs
          if (m && !m.endsWith(".local") && m.length > 2) found.add(m);
        }
      }
    };
    pc.createOffer()
      .then((o) => pc.setLocalDescription(o))
      .catch(() => finish());
    setTimeout(finish, timeoutMs);
  });
}

export interface ClientHeaderOptions {
  /** Opt-in: collect local IPs via WebRTC. Off by default for privacy. */
  includeLocalIPs?: boolean;
}

/**
 * Collect the browser-side Gov-Client-* headers. The relay is responsible for
 * adding the server-side (Gov-Vendor-*, public IP) headers before forwarding.
 */
export async function collectClientHeaders(
  opts: ClientHeaderOptions = {},
): Promise<Record<string, string>> {
  const deviceId = await getOrCreateDeviceId();
  const userId = await getStableUserId();

  const headers: Record<string, string> = {
    "Gov-Client-Device-ID": deviceId,
    "Gov-Client-Timezone": timezone(),
    "Gov-Client-Screens": screens(),
    "Gov-Client-Window-Size": windowSize(),
    "Gov-Client-Browser-Plugins": browserPlugins(),
    "Gov-Client-Browser-JS-User-Agent": navigator.userAgent,
    "Gov-Client-Browser-Do-Not-Track": doNotTrack(),
    "Gov-Client-User-IDs": `ledgerjack=${pct(userId)}`,
  };

  if (opts.includeLocalIPs) {
    const ips = await localIPs();
    if (ips) {
      headers["Gov-Client-Local-IPs"] = ips;
      headers["Gov-Client-Local-IPs-Timestamp"] = new Date().toISOString();
    }
  }

  return headers;
}
