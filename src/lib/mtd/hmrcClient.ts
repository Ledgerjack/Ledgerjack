/**
 * hmrcClient — the single place the app calls HMRC.
 *
 * - loads tokens from the vault, refreshes them if expired
 * - attaches the browser fraud headers
 * - sends the HMRC access token in X-Hmrc-Token (not Authorization, so it
 *   doesn't clash with Supabase's gateway); the relay maps it to a Bearer token
 *
 * Every ITSA feature (obligations, quarterly update, calculation, final
 * declaration) should call through callHmrc().
 */

import { RELAY_BASE, SUPABASE_ANON_KEY } from "./hmrcConfig";
import { collectClientHeaders } from "./fraudHeaders";
import { loadTokens, saveTokens, clearTokens, StoredTokens } from "./mtdVault";
import { refreshTokens } from "./oauth";
import { correlationIdFrom } from "./submissionReceipts";

export interface HmrcCallOptions {
  method: "GET" | "POST" | "PUT";
  path: string; // HMRC path, e.g. "/individuals/business/details/{nino}"
  body?: unknown;
  acceptVersion?: string; // e.g. "application/vnd.hmrc.2.0+json" — check per endpoint
  govTestScenario?: string; // sandbox only
}

export interface HmrcResult {
  status: number;
  data: unknown;
  /** HMRC's own reference for this request — evidence a submission happened. */
  correlationId?: string | null;
}

/** True while there is at least 60s of life left on the access token. */
function stillValid(t: StoredTokens): boolean {
  return t.expires_at - Date.now() > 60_000;
}

async function ensureFreshToken(): Promise<StoredTokens> {
  const t = await loadTokens();
  if (!t) throw new Error("hmrc_not_connected");
  if (stillValid(t)) return t;

  // refresh
  const r = await refreshTokens(t.refresh_token);
  const fresh: StoredTokens = {
    access_token: r.access_token,
    refresh_token: r.refresh_token ?? t.refresh_token,
    expires_at: Date.now() + r.expires_in * 1000,
    scope: r.scope ?? t.scope,
  };
  await saveTokens(fresh);
  return fresh;
}

export async function callHmrc(opts: HmrcCallOptions): Promise<HmrcResult> {
  const tokens = await ensureFreshToken();
  const fraud = await collectClientHeaders();

  const headers: Record<string, string> = {
    "X-Hmrc-Token": tokens.access_token,
    Accept: opts.acceptVersion || "application/vnd.hmrc.1.0+json",
    ...fraud,
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.govTestScenario) headers["Gov-Test-Scenario"] = opts.govTestScenario;
  if (SUPABASE_ANON_KEY) headers["apikey"] = SUPABASE_ANON_KEY;

  const resp = await fetch(`${RELAY_BASE}/hmrc${opts.path}`, {
    method: opts.method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  // If HMRC rejects the token even after refresh, disconnect so the user
  // is cleanly prompted to reconnect rather than hitting silent failures.
  if (resp.status === 401) {
    await clearTokens();
  }

  const text = await resp.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  // HMRC's correlation ID is the user's evidence that a submission happened.
  // Surface it on every result so callers can record a receipt.
  return { status: resp.status, data, correlationId: correlationIdFrom(resp.headers) };
}
