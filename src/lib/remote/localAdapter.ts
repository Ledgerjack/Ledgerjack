/**
 * remote/localAdapter — the default "no server" adapter. The app behaves exactly
 * as it does today: everything stays on the device. When the owner provisions a
 * server, a real adapter replaces this one via config.
 */

import type { RemoteAdapter, RemoteStatus } from "./types";

export const localAdapter: RemoteAdapter = {
  provider: "local",
  isConfigured() { return false; },
  async getStatus(): Promise<RemoteStatus> {
    return { state: "disabled", provider: "local", message: "Cloud sync is not set up. Everything stays on this device." };
  },
  async uploadSnapshot(): Promise<void> {
    throw new Error("No cloud server is configured.");
  },
  async downloadSnapshot(): Promise<string | null> {
    return null;
  },
};
