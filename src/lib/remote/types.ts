/**
 * remote/types — the provider-agnostic seam for optional server sync.
 *
 * NOTHING here talks to a server yet. This defines the interface a future
 * adapter (PocketBase / Appwrite / custom) will implement, so the app is
 * "server-ready" without committing to a provider. The sync UNIT for the MVP is
 * the same end-to-end-encrypted snapshot the backup feature already produces —
 * the server only ever sees ciphertext. Per-record sync (using each record's
 * last_modified) is a later phase.
 */

export type RemoteState = "disabled" | "configured" | "error";

export interface RemoteStatus {
  state: RemoteState;
  provider: string;      // e.g. "local", "appwrite", "pocketbase"
  lastSync?: number;     // epoch ms
  message?: string;
}

/**
 * A remote backend. Implementations must treat the snapshot as opaque
 * ciphertext and never require the user's key or plaintext.
 */
export interface RemoteAdapter {
  readonly provider: string;
  /** True only when a real server is configured and reachable. */
  isConfigured(): boolean;
  getStatus(): Promise<RemoteStatus>;
  /** Store the latest encrypted snapshot for this account. */
  uploadSnapshot(ciphertext: string): Promise<void>;
  /** Fetch the latest encrypted snapshot, or null if none. */
  downloadSnapshot(): Promise<string | null>;
}
