# Switched AI to OpenRouter (one key, per-feature models)

All AI now goes through ONE OpenRouter key (OpenAI-compatible gateway), so users
reach both OpenAI and Anthropic models with a single key. No per-token markup.

## Who uses which model
- Receipt scanning / AI text box / numbers -> double-entry: OPENAI models.
  Default openai/gpt-4o-mini; openai/gpt-4o for images/handwritten; openai/gpt-4.1
  available. (Kept the smart/economy/quality toggle; it maps to these.)
- Accounts analysis (insights): ANTHROPIC models — default anthropic/claude-opus-4.8,
  with anthropic/claude-fable-5 selectable. Same strict "explain our numbers,
  never invent" discipline, temperature 0.

## What changed
- New src/lib/ai/openrouterClient.ts — one call site (endpoint, key, headers,
  error handling) returning content + tokens + REAL cost.
- src/lib/ai/aiModels.ts — OpenRouter slugs, roles (scanning/insights), prices,
  SCANNING_DEFAULT / INSIGHTS_DEFAULT. Opus 4.8 priced ~$5/$25.
- ai.ts (scanning), supportService.ts, insightService.ts now call OpenRouter.
- aiUsage.ts records OpenRouter's REAL cost; the cost card shows actual spend
  ("from OpenRouter") instead of an estimate when available.
- AISettingsPanel: key field relabelled "OpenRouter API Key" (sk-or-v1-...),
  with a note about per-model privacy controls in the user's OpenRouter account.
- Insights model picker now offers the Anthropic models (enabled), default Opus 4.8.

## Honest notes / to verify
- Model SLUGS and PRICES are in aiModels.ts as data — verify against
  openrouter.ai/models (Opus 4.8, Fable 5 especially, as they're new).
- Existing users switch from an OpenAI key to an OpenRouter key (one-time).
- Fable 5 may be routed to Opus 4.8 by a safety mechanism (labelled).
- Privacy: figures pass through OpenRouter to the model; OpenRouter data policy is
  per-model — surfaced to the user in Settings.

## Verified
Typecheck of the whole AI layer passes; real-cost tracking self-test passed
(mini $0.00031 + Opus 4.8 $0.0325 = $0.03281, marked actual).
