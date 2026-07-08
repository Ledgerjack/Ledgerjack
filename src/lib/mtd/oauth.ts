/**
 * OAuth (authorization-code + PKCE) helpers.
 * Token exchange/refresh go through the relay so the client_secret stays server-side.
 */

import { RELAY_BASE, REDIRECT_URI, SUPABASE_ANON_KEY } from "./hmrcConfig";

function base64url(bytes: Uint8Array): string {
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** URL-safe random string for the PKCE verifier and the OAuth `state`. */
export function randomString(len = 64): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/** SHA-256 challenge from the verifier (S256). */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64url(new Uint8Array(digest));
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

function relayHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (SUPABASE_ANON_KEY) h["apikey"] = SUPABASE_ANON_KEY;
  return h;
}

export async function exchangeCode(
  code: string,
  codeVerifier: string,
): Promise<OAuthTokenResponse> {
  const resp = await fetch(`${RELAY_BASE}/oauth/token`, {
    method: "POST",
    headers: relayHeaders(),
    body: JSON.stringify({ code, redirect_uri: REDIRECT_URI, code_verifier: codeVerifier }),
  });
  if (!resp.ok) throw new Error(`token_exchange_failed_${resp.status}`);
  return resp.json();
}

export async function refreshTokens(
  refreshToken: string,
): Promise<OAuthTokenResponse> {
  const resp = await fetch(`${RELAY_BASE}/oauth/refresh`, {
    method: "POST",
    headers: relayHeaders(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!resp.ok) throw new Error(`token_refresh_failed_${resp.status}`);
  return resp.json();
}
