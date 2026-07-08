import {
  parseWithAI,
  aiParsedToPendingTransaction,
} from '../lib/ai';
import type { AIParserRequest, AIParsedTransaction } from '../lib/ai';
import type { TaxRegion } from '../lib/regions';

export type { AIParserRequest, AIParsedTransaction };
export { aiParsedToPendingTransaction };

/**
 * Full transaction parser (description, date, amount, accounts).
 * Requires an OpenAI API key saved in Settings.
 */
export async function parseTransaction(
  receiptText: string,
  apiKey: string,
  region: TaxRegion,
  imageData?: string,
): Promise<AIParsedTransaction> {
  const request: AIParserRequest = { text: receiptText, apiKey, region, imageData };
  return parseWithAI(request);
}
