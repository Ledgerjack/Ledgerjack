/**
 * remote/index — resolves which backend adapter to use. Until the owner sets
 * REMOTE_CONFIG.provider to a real backend, this returns the local no-op adapter
 * and the app is unchanged. This is the single switch that turns on server sync.
 */

import type { RemoteAdapter } from "./types";
import { localAdapter } from "./localAdapter";

export interface RemoteConfig {
  provider: "local" | "appwrite" | "pocketbase" | "custom";
  endpoint?: string; // set when a server exists
  projectId?: string;
}

// Default: no server. The owner edits this (or wires an env var) after
// provisioning a backend, and registers the matching adapter below.
export const REMOTE_CONFIG: RemoteConfig = { provider: "local" };

export function getRemoteAdapter(): RemoteAdapter {
  switch (REMOTE_CONFIG.provider) {
    // case "appwrite":   return appwriteAdapter(REMOTE_CONFIG);
    // case "pocketbase": return pocketbaseAdapter(REMOTE_CONFIG);
    case "local":
    default:
      return localAdapter;
  }
}

export function isRemoteEnabled(): boolean {
  return getRemoteAdapter().isConfigured();
}

export type { RemoteAdapter, RemoteStatus } from "./types";
