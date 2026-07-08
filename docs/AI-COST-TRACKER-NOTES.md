# AI cost tracker (roadmap item, AI theme step 2)

Users now see a running, estimated "AI spend this month" so there's no bill
shock — important before the heavyweight insight feature arrives.

## New files
- src/lib/ai/aiUsage.ts — records each AI call's real token counts into a small
  per-month aggregate in db.settings (key ai_usage_YYYY-MM). Estimates cost via
  the aiModels catalogue.
- src/components/AICostCard.tsx — the "AI spend this month" widget in Settings,
  with a per-model breakdown and request count.

## How it hooks in
- src/lib/ai.ts now reads result.usage (the token counts OpenAI returns) after
  each parse and logs them fire-and-forget (never blocks or breaks a scan).

## Honest notes
- The figure is an ESTIMATE (actual tokens x the catalogue's published price),
  shown in USD because that's how providers bill. The real charge is on the
  user's own provider dashboard. Clearly stated in the widget.
- Models with no listed price (e.g. Fable 5) show "-" rather than a made-up cost.
- Token counts are not sensitive, so the monthly aggregate is stored plainly.

## Verified
Runtime self-test: 2x GPT-4o mini + 1x GPT-4o aggregated to $0.0086, matching
hand calculation. Typecheck and syntax clean across the app.

## Next in the theme
3. Tighten entry confirmation (confirm AI-scanned numbers)
4. AI tech support (help-guide grounded, app-usage only, human fallback)
5. AI accountant insights (educational; ratios + deadline calendar + what-if)
