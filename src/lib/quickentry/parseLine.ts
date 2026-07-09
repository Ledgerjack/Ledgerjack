/**
 * parseLine — a tiny offline parser for one-line / voice entry like "£20 fuel"
 * or "paid 150 from client". Extracts an amount and description and guesses
 * income vs expense. No AI, no network — instant and free. The category is then
 * filled by the user's categorisation rules.
 */

import { parseCurrencyInput } from "../currency";

export interface ParsedLine {
  amountCents: number;
  description: string;
  isIncome: boolean;
}

const INCOME_HINTS = /\b(income|invoice|paid me|received|received from|payment from|client paid|deposit|sale|sales|earned)\b/i;

export function parseLine(input: string): ParsedLine | null {
  const text = input.trim();
  if (!text) return null;

  // First number, optionally with a currency symbol and decimals.
  const amtMatch = text.match(/(?:[£$€]\s*)?(\d+(?:[.,]\d{1,2})?)/);
  if (!amtMatch) return null;

  const amountCents = parseCurrencyInput(amtMatch[1]);
  if (!amountCents) return null;

  let description = text
    .replace(amtMatch[0], " ")
    .replace(/[£$€]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(for|on|at|from|to|-)\s+/i, "")
    .trim();

  return {
    amountCents,
    description: description,
    isIncome: INCOME_HINTS.test(text),
  };
}
