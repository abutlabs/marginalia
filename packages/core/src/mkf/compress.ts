/**
 * Final post-reading compression pass.
 *
 * More aggressive than the incremental enforceTokenBudget in the merger.
 * This is run once after all chapters are read, before exporting the .mkf file.
 *
 * Strategies:
 * 1. Merge themes/concepts with overlapping names
 * 2. Drop non-significant insights that overlap with tier-1 content
 * 3. Rank remaining insights by significance, trim tail
 * 4. Remove answered questions
 * 5. Enforce final token budget
 */

import type { MkfDocument, MkfInsight } from "./types.js";
import { serializeMkf } from "./serializer.js";
import { estimateTokens } from "../tokens.js";

const DEFAULT_TARGET_TOKENS = 2500;

/** Run the final compression pass on a completed MKF document */
export function finalizeCompression(
  doc: MkfDocument,
  targetTokens: number = DEFAULT_TARGET_TOKENS,
): MkfDocument {
  let result = { ...doc };

  // 1. Sort insights: significant first, then by text length (longer = richer)
  result = {
    ...result,
    tier2: {
      ...result.tier2,
      insights: sortInsights(result.tier2.insights),
    },
  };

  // 2. Remove insights that merely restate tier-1 facts
  result = pruneRedundantInsights(result);

  // 3. Enforce token budget with aggressive trimming
  result = trimToBudget(result, targetTokens);

  return result;
}

/** Sort insights: significant first, then by text length descending */
function sortInsights(insights: MkfInsight[]): MkfInsight[] {
  return [...insights].sort((a, b) => {
    if (a.significant !== b.significant) return a.significant ? -1 : 1;
    return b.text.length - a.text.length;
  });
}

/** Remove non-significant insights whose content overlaps with tier-1 */
function pruneRedundantInsights(doc: MkfDocument): MkfDocument {
  // Build a set of tier-1 keywords from all properties
  const tier1Words = new Set<string>();
  for (const theme of doc.tier1.themes) {
    addWords(tier1Words, theme.name);
    for (const v of Object.values(theme.properties)) addWords(tier1Words, v);
  }
  for (const concept of doc.tier1.concepts) {
    addWords(tier1Words, concept.name);
    for (const v of Object.values(concept.properties)) addWords(tier1Words, v);
  }
  for (const v of Object.values(doc.tier1.facts.entries)) {
    addWords(tier1Words, v);
  }

  const filteredInsights = doc.tier2.insights.filter((insight) => {
    // Always keep significant insights
    if (insight.significant) return true;
    // Check if this insight is just restating tier-1 content
    const insightWords = extractContentWords(insight.text);
    const overlapCount = insightWords.filter((w) => tier1Words.has(w)).length;
    const overlapRatio = insightWords.length > 0 ? overlapCount / insightWords.length : 0;
    // Drop if >70% of the insight's content words are already in tier-1
    return overlapRatio < 0.7;
  });

  return {
    ...doc,
    tier2: { ...doc.tier2, insights: filteredInsights },
  };
}

/** Trim document to target token budget */
function trimToBudget(doc: MkfDocument, target: number): MkfDocument {
  let result = { ...doc, tier2: { ...doc.tier2 } };
  let tokens = estimateTokens(serializeMkf(result));

  if (tokens <= target) return result;

  // Trim non-significant insights from the end
  while (tokens > target && result.tier2.insights.length > 1) {
    const lastNonSig = findLastIndex(
      result.tier2.insights,
      (i) => !i.significant,
    );
    if (lastNonSig >= 0) {
      result.tier2.insights = [
        ...result.tier2.insights.slice(0, lastNonSig),
        ...result.tier2.insights.slice(lastNonSig + 1),
      ];
    } else {
      result.tier2.insights = result.tier2.insights.slice(0, -1);
    }
    tokens = estimateTokens(serializeMkf(result));
  }

  // Trim questions
  while (tokens > target && result.tier2.questions.length > 0) {
    result.tier2.questions = result.tier2.questions.slice(0, -1);
    tokens = estimateTokens(serializeMkf(result));
  }

  // Trim connections
  while (tokens > target && result.tier2.connections.length > 0) {
    result.tier2.connections = result.tier2.connections.slice(0, -1);
    tokens = estimateTokens(serializeMkf(result));
  }

  // Trim framework properties if still over
  while (tokens > target && result.tier2.frameworks.length > 0) {
    result.tier2.frameworks = result.tier2.frameworks.slice(0, -1);
    tokens = estimateTokens(serializeMkf(result));
  }

  return result;
}

// --- Helpers ---

function addWords(set: Set<string>, text: string): void {
  for (const word of extractContentWords(text)) {
    set.add(word);
  }
}

function extractContentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, "")
    .split(/[\s_]+/)
    .filter((w) => w.length > 2);
}

function findLastIndex<T>(arr: T[], pred: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (pred(arr[i])) return i;
  }
  return -1;
}
