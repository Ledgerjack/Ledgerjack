/**
 * clients — a saved client book for reuse when creating invoices.
 * Stored as JSON in db.settings.
 */

import { db } from "../db";

export interface Client {
  id: string;
  name: string;
  email?: string;
  address?: string;
  taxRatePct?: number;
}

const KEY = "clients";

export async function loadClients(): Promise<Client[]> {
  const row = await db.settings.get(KEY);
  if (!row?.value) return [];
  try { return JSON.parse(row.value) as Client[]; } catch { return []; }
}
export async function saveClients(list: Client[]): Promise<void> {
  await db.settings.put({ key: KEY, value: JSON.stringify(list) });
}
