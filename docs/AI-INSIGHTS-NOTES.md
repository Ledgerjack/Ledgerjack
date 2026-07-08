# AI accountant insights + deadline calendar (roadmap item, AI theme step 5)

The differentiator: helps a layman UNDERSTAND their numbers, in plain English,
framed in their currency/region, light on tax. Reached from the dashboard
("Insights ›") and Settings.

## The discipline (your key requirement)
- LedgerJack COMPUTES every figure from the ledger (src/lib/insights/metrics.ts).
  Those are the authoritative numbers shown on screen.
- The AI only EXPLAINS them. The prompt (src/lib/ai/insightService.ts) forbids it
  to invent, calculate, estimate or extrapolate any number — it must copy figures
  exactly from the data provided. Temperature 0 (least drift).
- Verified: metrics self-test gave income 1200 / expenses 400 / net 800 / 67%
  margin, and correctly EXCLUDED a pending (unapproved) transaction — only real,
  approved figures are used.

## What it shows (four sections)
1. How the business is doing — income, expenses, net, margin, income concentration.
2. Where your money went — top expense categories with %.
3. Your cash flow — last months, money in vs out.
4. Things to look into — the AI's plain-English narration + "take it to your accountant".

## Warnings & jurisdiction
- Prominent banner: "Educational only — not tax/accounting/financial advice…
  keeping a professional in the loop is standard practice." Footer repeats it.
- Currency and tax term (VAT/GST/sales tax) follow the user's region.
- Deadlines: real UK dates (quarterly updates, 31 Jan/Jul payments on account,
  final declaration; VAT note). Other regions show a general note + fiscal year
  end, not invented local dates.

## Model choice & cost
- A model picker offers the OpenAI models now (GPT-4o mini default). Opus 4.8 /
  Fable 5 are listed but disabled with "needs Anthropic key — soon": they require
  a separate Anthropic key + endpoint, which is the next enhancement. Shipping the
  working OpenAI path now rather than a broken heavyweight one.
- Cost logs into the AI spend tracker; explanation is opt-in per run.

## Files
- src/lib/insights/metrics.ts, src/lib/insights/deadlines.ts
- src/lib/ai/insightService.ts
- src/components/DeadlineCalendar.tsx, src/views/Insights.tsx
- wired into App, Navigation, Dashboard (entry button).

## Parked (agreed): what-if scenarios — revisit once the educational core is proven.
