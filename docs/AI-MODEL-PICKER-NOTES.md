# AI model picker + model-info widget (roadmap item #3, step 1)

Foundation for the AI theme: users can see the models, their rough cost, and
what each is best for, with GPT-4o mini as the recommended default.

## New files
- src/lib/ai/aiModels.ts — the model catalogue as DATA (provider, approx price
  per 1M tokens, best-for, recommended flag). Includes an estimateCostUSD()
  helper the cost tracker (next step) reuses.
- src/components/AIModelInfo.tsx — the "AI models & costs" widget shown in
  Settings under the AI scanner panel.

## What already existed (kept)
Your AISettingsPanel already had a smart / economy / quality routing choice and
encrypted key storage. We left those working and added the info widget beside it.

## Honest notes
- Prices are ESTIMATES, dated (January 2026), per 1M tokens; users pay their own
  provider and should check the provider's page. Stated in the widget.
- Opus 4.8 and Fable 5 are listed for the upcoming AI-insights feature. Fable 5
  is labelled honestly: some requests route to Opus 4.8 by a safety mechanism.

## Next steps in this theme
2. AI cost tracker (uses estimateCostUSD to show running estimated spend)
3. Tighten entry confirmation
4. AI tech support (grounded in a help guide; app-usage only; human fallback)
5. AI accountant insights (educational; ratios + deadline calendar + what-if)
