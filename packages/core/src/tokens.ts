/**
 * Lightweight token estimation.
 *
 * We use a simple heuristic rather than pulling in a full tokenizer:
 * ~0.75 tokens per word for English text, or ~4 characters per token.
 * This is accurate enough for budget planning — we're not doing billing.
 */

/** Estimate token count for a string */
export function estimateTokens(text: string): number {
  // Split on whitespace and punctuation boundaries
  // Average English word is ~4.7 chars, average token is ~4 chars
  // This gives us roughly 1.2 tokens per word, or 0.25 tokens per char
  return Math.ceil(text.length / 4);
}

/** Truncate text to approximately the given token count */
export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;

  // Truncate at a word boundary
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.8) {
    return truncated.slice(0, lastSpace) + "\n\n[...truncated]";
  }
  return truncated + "\n\n[...truncated]";
}
