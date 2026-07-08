/**
 * AI model catalogue — kept as DATA. All models are reached through ONE
 * OpenRouter key (OpenAI-compatible gateway), so `id` is an OpenRouter slug.
 *
 * Roles: "scanning" models handle receipts / the AI text box / turning entries
 * into double-entry; "insights" models handle the educational accounts analysis.
 *
 * Prices are approximate USD per 1,000,000 tokens and CHANGE — verify current
 * slugs and rates at https://openrouter.ai/models. OpenRouter charges no
 * per-token markup (same rate as the provider direct), and returns the real
 * cost per call, which we prefer over these estimates when available.
 */

export const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";
export const PRICES_AS_OF = "January 2026";

export type AIProvider = "openai" | "anthropic";
export type AIRole = "scanning" | "insights";

export interface AIModel {
  id: string;            // OpenRouter slug, e.g. "openai/gpt-4o-mini"
  label: string;
  provider: AIProvider;
  role: AIRole;
  inputPerM: number | null;
  outputPerM: number | null;
  bestFor: string;
  recommended?: boolean;
  note?: string;
}

export const AI_MODELS: AIModel[] = [
  // --- Scanning / entry / double-entry (OpenAI) ---
  {
    id: "openai/gpt-4o-mini", label: "GPT-4o mini", provider: "openai", role: "scanning",
    inputPerM: 0.15, outputPerM: 0.60, recommended: true,
    bestFor: "Everyday receipt scanning and quick entries. Cheap and fast.",
  },
  {
    id: "openai/gpt-4o", label: "GPT-4o", provider: "openai", role: "scanning",
    inputPerM: 2.50, outputPerM: 10.0,
    bestFor: "Photos, handwritten or complex receipts where accuracy matters.",
  },
  {
    id: "openai/gpt-4.1", label: "GPT-4.1", provider: "openai", role: "scanning",
    inputPerM: 2.0, outputPerM: 8.0,
    bestFor: "Stronger reasoning for tricky entries.",
    note: "Verify slug/price on openrouter.ai/models.",
  },

  // --- Accounts analysis / insights (Anthropic via OpenRouter) ---
  {
    id: "anthropic/claude-opus-4.8", label: "Claude Opus 4.8", provider: "anthropic", role: "insights",
    inputPerM: 5.0, outputPerM: 25.0, recommended: true,
    bestFor: "Deep, accountant-style explanation of your numbers.",
    note: "Verify slug/price on openrouter.ai/models.",
  },
  {
    id: "anthropic/claude-fable-5", label: "Claude Fable 5", provider: "anthropic", role: "insights",
    inputPerM: null, outputPerM: null,
    bestFor: "Anthropic's newest Mythos-class model for deep analysis.",
    note: "May be routed to Opus 4.8 by a safety mechanism. Verify slug/price on openrouter.ai/models.",
  },
];

export const SCANNING_DEFAULT = "openai/gpt-4o-mini";
export const INSIGHTS_DEFAULT = "anthropic/claude-opus-4.8";
/** Kept for older imports. */
export const RECOMMENDED_MODEL_ID = SCANNING_DEFAULT;

export function getModel(id: string): AIModel | undefined {
  return AI_MODELS.find((m) => m.id === id);
}
export function modelsForRole(role: AIRole): AIModel[] {
  return AI_MODELS.filter((m) => m.role === role);
}

/** Estimate a call's cost in USD from token counts (fallback when no real cost). */
export function estimateCostUSD(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const m = getModel(modelId);
  if (!m || m.inputPerM === null || m.outputPerM === null) return null;
  return (inputTokens / 1_000_000) * m.inputPerM + (outputTokens / 1_000_000) * m.outputPerM;
}
