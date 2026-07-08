# LedgerJack — Server Integration Roadmap

The server is a "dumb", privacy-preserving backend: it stores end-to-end-
ENCRYPTED data and relays it. It can never read the user's books. Adding it
unlocks a lot without weakening the privacy promise.

---

## 1. What the server makes easier for users

### Backup & devices (highest value)
- **Automatic, invisible backup** — the synced encrypted copy IS the backup. No
  manual step, no nag. Fixes the single-device data-loss risk (our biggest gap).
- **Multi-device** — snap a receipt on the phone, review it on the laptop; phone,
  tablet, desktop and web all show the same live data.
- **Effortless device migration / disaster recovery** — new phone: install, sign
  in, enter recovery key, done.

### Working with others
- **Accountant portal** — a read-only, time-limited, client-authorised view your
  accountant opens; revoke anytime. Turns "accountants will accept my data" into
  "accountants recommend the app".
- **Shared books** — a spouse on a joint rental, or a bookkeeper helping.

### Invoicing (big professionalism win)
- **Email invoices with the PDF attached** — a server can send real email with an
  attachment, fixing today's mailto limitation (mailto can't attach files).
- **Hosted invoice view/pay link** — send a link; the client opens a clean page to
  view (and later, pay) the invoice. The invoice data can be stored encrypted and
  unlocked by the link key.

### Automation & reminders
- **Push/email reminders even when the app is closed** — MTD quarterly deadlines,
  overdue invoices, "back up" nudges. (A scheduled server function.)
- **Email-in receipts** — forward a receipt email to a personal address; the
  server drops it (encrypted) into the review queue.

### Trust & records
- **Version history + audit trail + undo** — the server keeps encrypted revisions,
  giving "restore a deleted transaction" and a real audit trail (supports HMRC's
  6-year record-keeping).

### Also enabled (already-scoped backend features)
- **Live bank feeds** (server holds the aggregator secrets + consent flow).
- **AI relay** (optional shared/rate-limited AI so users needn't bring a key).
- **One-tap Google Drive / Dropbox / iCloud** backup (OAuth on the server).

### Honest trade-offs
- Reintroduces an online dependency FOR THESE FEATURES only; core bookkeeping
  stays fully offline.
- Needs a device identity (use passkeys to keep it privacy-friendly, avoid
  passwords, and keep close to "no account" feel).
- The server can't read data but sees metadata (that a device synced, when, blob
  sizes). Minor, but state it plainly.
- You're now running a service (uptime, maintenance, a bit more compliance).

---

## 2. Recommended provider

Priorities for LedgerJack: privacy + UK/EU data residency (trust story), low cost
(supporter-funded), low ops overhead, and built-in email/push (for the invoice
and reminder wins). The workload is light (encrypted blobs), so we do NOT need
Postgres muscle.

### Primary recommendation: Appwrite, self-hosted on a European VPS (Hetzner)
- **Why:** open-source; one Docker Compose stack gives auth (incl. passkeys/OAuth),
  storage, functions, realtime, AND messaging (email/SMS/push) out of the box —
  which directly powers the invoice-email and reminder features. Self-hosting on
  an EU VPS keeps data in the EU and avoids US CLOUD-Act exposure, which supports
  the privacy positioning better than a US-based managed cloud.
- **Cost:** a small Hetzner VPS is roughly €5–18/month; Appwrite itself is free
  (open-source). Object storage for encrypted blobs adds a few euros.
- **Effort:** moderate — you run and update a Docker stack. Budget a little ops time.

### Simplest / cheapest alternative: PocketBase on a Hetzner VPS
- Single Go binary (auth + storage + realtime + admin UI). Lowest ops overhead —
  "a VPS, a systemd unit, hourly backup to object storage" is the whole stack.
  Ideal for the dumb-server blob store.
- **Caveat:** pre-v1.0 (currently ~v0.39); its own docs advise care for
  production-critical use and note manual migrations between versions. Low risk
  for a ciphertext-blob store, but worth knowing. Fewer built-ins (no native
  email/push, so those features need a small add-on).

### Lowest-effort managed, still EU-friendly
- **Appwrite Cloud** (~$15/month) — managed, same features, less control.
- **Nhost** — "Supabase but European" (Sweden-incorporated, EU regions), GraphQL;
  managed Postgres if you later want relational power.
- (Supabase and Firebase are capable but US-based — a weaker fit for the privacy
  story; fine technically if you accept that.)

### My pick
Start with **Appwrite self-hosted on Hetzner** for the best privacy + features +
cost balance. If you want the absolute simplest thing first, stand up
**PocketBase on Hetzner** for the backup/sync MVP and add email/push later.

Confirm current prices on hetzner.com, appwrite.io and pocketbase.io before you
commit — they change.

---

## 3. How the app is already prepared (the seam)

`src/lib/remote/` is provider-agnostic scaffolding, live in the codebase now but
inert until a server is configured:
- `types.ts` — the `RemoteAdapter` interface (upload/download an opaque encrypted
  snapshot; never sees keys or plaintext).
- `localAdapter.ts` — the default "no server" behaviour (unchanged app).
- `index.ts` — `REMOTE_CONFIG` + `getRemoteAdapter()`: the single switch. Set the
  provider and register its adapter to turn sync on.
- `snapshotSync.ts` — `pushSnapshot` / `pullSnapshot`, reusing the VERIFIED
  encrypted-backup crypto as the sync unit (server holds ciphertext only).

Records already carry `last_modified`, so per-record sync is feasible later.

---

## 4. Phased roadmap

### Phase 0 — Decide & provision (no app code)
- Pick provider (Appwrite on Hetzner recommended). Stand up the VPS + backend.
  Enable passkeys/auth. Set up an object bucket for encrypted snapshots.

### Phase 1 — Encrypted snapshot backup (smallest useful step)
- Implement the real adapter behind the existing `RemoteAdapter` interface
  (upload/download the encrypted snapshot). Add a device identity (passkey).
- UI: turn the "Automatic cloud sync — coming soon" note in the Backup screen into
  a real toggle. Snapshot pushed on change / on a schedule.
- Outcome: automatic off-device encrypted backup + one-tap restore on a new device.

### Phase 2 — Multi-device sync
- Move from whole-snapshot to per-record sync using `last_modified`
  (last-write-wins first; a CRDT/Automerge layer later if needed).
- Outcome: live same-data across phone, tablet, desktop, web.

### Phase 3 — Invoicing power-ups
- Server email with PDF attachment; hosted invoice view/pay link.
- Outcome: professional invoice delivery; groundwork for pay-by-bank later.

### Phase 4 — Accountant portal & sharing
- Read-only, time-limited, client-authorised shared views; shared books.
- Outcome: rung 2 of the accountant strategy (drives accountant adoption).

### Phase 5 — Reminders & automation
- Scheduled functions: MTD deadline + overdue-invoice + backup reminders
  (push/email). Optional email-in receipts.

### Phase 6 — Live bank feeds (separate track, can run in parallel)
- Server holds the regulated aggregator's secrets + consent/refresh flow
  (start on Enable Banking's free restricted-production tier). Pull transactions
  into the AI categoriser you already have.

### Cross-cutting
- Keep everything end-to-end encrypted (server sees ciphertext only).
- Use passkeys for identity to protect the "private" promise.
- Make receipt-image sync an optional toggle to keep costs predictable.
- Fund the running cost via the supporter tier.

---

## 5. Hosting & providers (website + encrypted backend)

Two separate jobs, with an important distinction:

- **The website / PWA** is just static files (HTML/JS/CSS). It holds NO personal
  data — the ledger lives on the device / in the encrypted backend. So it can be
  hosted anywhere fast and cheap; residency matters far less here.
- **The backend** holds encrypted user data + auth/identity. This is where EU
  residency and a GDPR data-processing agreement (DPA) matter most.

Because the backend data is END-TO-END ENCRYPTED, even a US provider would only
ever hold unreadable ciphertext — which significantly softens the CLOUD-Act
concern. A fully-EU stack is still the cleaner story.

### Recommended stack (privacy + low cost + one core vendor): Hetzner-centred
- **Backend:** a small **Hetzner Cloud VPS** (Germany, ~€4–6/mo to start) running
  **Appwrite** (auth incl. passkeys, storage, functions, and messaging for
  email/push — which powers invoice-email and reminders). EU data residency,
  Hetzner signs a GDPR DPA.
- **Encrypted blob storage:** **Hetzner Object Storage** (~€5.99/TB, EU) — or
  **DanubeData S3** (€3.99/mo incl. 1 TB, Falkenstein DE, signed Article-28 DPA
  without a sales call).
- **Website / PWA:** **Cloudflare Pages** (free, unlimited bandwidth, 300+ edge
  locations, fastest option) — or, to keep the whole story in the EU,
  **DanubeData Static Sites** (€2.99/mo) or **Bunny.net** (~€1/mo).
- **All-in to start: ~€10–15/month.**

### Simplest / least-ops alternative (managed, still EU-friendly)
- **Appwrite Cloud** (backend) + **Appwrite Sites** (host the PWA on the same
  platform) — one vendor, one bill, no server to run (~$15/mo tier). Or
  **Nhost** (Sweden-incorporated, EU regions) if you want managed Postgres.

### One-provider-does-both option
- **Appwrite Sites** can host the static PWA AND provide the backend services, so
  you can run the whole thing on Appwrite (self-hosted on Hetzner, or Appwrite
  Cloud). Fewer moving parts.

### Cost-optimised variant
- Swap EU object storage for **Cloudflare R2** (zero egress fees — cheapest for a
  download-heavy backup/sync store). Trade-off: US processor, but it only ever
  holds ciphertext.

### My pick
**Hetzner VPS + Appwrite + Hetzner Object Storage for the backend, Cloudflare
Pages (free) for the website.** Best balance of privacy (EU data), cost (~€10–15
/mo), and keeping one core vendor (Hetzner) to manage. If you want the absolute
least ops, use **Appwrite Cloud + Appwrite Sites** instead.

Confirm current prices/features on hetzner.com, appwrite.io, pages.cloudflare.com,
danubedata.ro and bunny.net before committing — they change.
