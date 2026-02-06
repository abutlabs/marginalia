/**
 * MKF merge algorithm.
 *
 * Merges a chapter-level MKF extraction into an existing evolving
 * MKF document. Handles: theme merging, relationship dedup,
 * insight dedup, question promotion, and token budget enforcement.
 */

import type {
  MkfDocument,
  MkfTheme,
  MkfRelationship,
  MkfConcept,
  MkfInsight,
  MkfQuestion,
  MkfConnection,
  MkfFramework,
} from "./types.js";
import { estimateTokens } from "../tokens.js";
import { serializeMkf } from "./serializer.js";

const MAX_MKF_TOKENS = 3200;

/** Merge a chapter MKF extraction into the existing document */
export function mergeMkf(
  existing: MkfDocument,
  chapter: MkfDocument,
): MkfDocument {
  const merged: MkfDocument = {
    header: mergeHeaders(existing.header, chapter.header),
    tier1: {
      themes: mergeThemes(existing.tier1.themes, chapter.tier1.themes),
      relationships: mergeRelationships(
        existing.tier1.relationships,
        chapter.tier1.relationships,
      ),
      structure: mergeProperties(existing.tier1.structure, chapter.tier1.structure),
      concepts: mergeConcepts(existing.tier1.concepts, chapter.tier1.concepts),
      facts: {
        entries: mergeRecords(
          existing.tier1.facts.entries,
          chapter.tier1.facts.entries,
        ),
      },
    },
    tier2: {
      insights: mergeInsights(existing.tier2.insights, chapter.tier2.insights),
      questions: promoteQuestions(
        existing.tier2.questions,
        chapter.tier2.questions,
        chapter.tier2.insights,
      ),
      connections: mergeConnections(
        existing.tier2.connections,
        chapter.tier2.connections,
      ),
      frameworks: mergeFrameworks(
        existing.tier2.frameworks,
        chapter.tier2.frameworks,
      ),
    },
    meta: {
      session: existing.meta.session || chapter.meta.session,
      chaptersRead: chapter.meta.chaptersRead || existing.meta.chaptersRead,
      confidence: existing.meta.confidence > 0
        ? Math.min(1, (existing.meta.confidence + chapter.meta.confidence) / 2)
        : chapter.meta.confidence,
      compressionRatio: chapter.meta.compressionRatio || existing.meta.compressionRatio,
      needsReread: chapter.meta.needsReread || existing.meta.needsReread,
      distilledFrom: chapter.meta.distilledFrom || existing.meta.distilledFrom,
      format: existing.meta.format || chapter.meta.format,
    },
  };

  return enforceTokenBudget(merged);
}

/** Create an empty MKF document as a merge base */
export function emptyMkf(): MkfDocument {
  return {
    header: { book: "", by: "", id: "", tokens: "", words: "", chapters: 0, read: "" },
    tier1: {
      themes: [],
      relationships: [],
      structure: { properties: {} },
      concepts: [],
      facts: { entries: {} },
    },
    tier2: {
      insights: [],
      questions: [],
      connections: [],
      frameworks: [],
    },
    meta: {
      session: "",
      chaptersRead: "",
      confidence: 0,
      compressionRatio: "",
      format: "MKF v0.1",
    },
  };
}

// --- Header merging ---

function mergeHeaders(
  existing: MkfDocument["header"],
  incoming: MkfDocument["header"],
): MkfDocument["header"] {
  return {
    book: existing.book || incoming.book,
    by: existing.by || incoming.by,
    id: existing.id || incoming.id,
    tokens: existing.tokens || incoming.tokens,
    words: existing.words || incoming.words,
    chapters: existing.chapters || incoming.chapters,
    read: incoming.read || existing.read,
    reader: existing.reader || incoming.reader,
  };
}

// --- Theme merging ---

function mergeThemes(existing: MkfTheme[], incoming: MkfTheme[]): MkfTheme[] {
  const merged = [...existing];

  for (const theme of incoming) {
    const match = merged.findIndex(
      (t) => normalize(t.name) === normalize(theme.name),
    );
    if (match >= 0) {
      // Merge properties, keeping longer/more specific values
      merged[match] = {
        name: merged[match].name,
        properties: mergeRecords(merged[match].properties, theme.properties),
      };
    } else {
      merged.push(theme);
    }
  }

  return merged;
}

// --- Relationship dedup ---

function mergeRelationships(
  existing: MkfRelationship[],
  incoming: MkfRelationship[],
): MkfRelationship[] {
  const merged = [...existing];

  for (const rel of incoming) {
    const match = merged.findIndex(
      (r) =>
        normalize(r.from) === normalize(rel.from) &&
        normalize(r.arrow) === normalize(rel.arrow) &&
        normalize(r.to) === normalize(rel.to),
    );
    if (match >= 0) {
      // Keep longer annotation
      if (rel.annotation.length > merged[match].annotation.length) {
        merged[match] = { ...merged[match], annotation: rel.annotation };
      }
    } else {
      merged.push(rel);
    }
  }

  return merged;
}

// --- Structure merging ---

function mergeProperties(
  existing: { properties: Record<string, string> },
  incoming: { properties: Record<string, string> },
): { properties: Record<string, string> } {
  return {
    properties: mergeRecords(existing.properties, incoming.properties),
  };
}

// --- Concept merging ---

function mergeConcepts(
  existing: MkfConcept[],
  incoming: MkfConcept[],
): MkfConcept[] {
  const merged = [...existing];

  for (const concept of incoming) {
    const match = merged.findIndex(
      (c) => normalize(c.name) === normalize(concept.name),
    );
    if (match >= 0) {
      merged[match] = {
        name: merged[match].name,
        properties: mergeRecords(merged[match].properties, concept.properties),
      };
    } else {
      merged.push(concept);
    }
  }

  return merged;
}

// --- Insight dedup ---

function mergeInsights(
  existing: MkfInsight[],
  incoming: MkfInsight[],
): MkfInsight[] {
  const merged = [...existing];

  for (const insight of incoming) {
    const duplicate = merged.findIndex(
      (i) => wordOverlap(i.text, insight.text) >= 0.6,
    );
    if (duplicate >= 0) {
      // Promote significance if incoming is significant
      if (insight.significant && !merged[duplicate].significant) {
        merged[duplicate] = { ...merged[duplicate], significant: true };
      }
      // Keep the longer text
      if (insight.text.length > merged[duplicate].text.length) {
        merged[duplicate] = { ...merged[duplicate], text: insight.text };
      }
    } else {
      merged.push(insight);
    }
  }

  return merged;
}

// --- Question promotion ---

function promoteQuestions(
  existingQuestions: MkfQuestion[],
  incomingQuestions: MkfQuestion[],
  newInsights: MkfInsight[],
): MkfQuestion[] {
  // Start with existing questions, filter out any answered by new insights
  const surviving = existingQuestions.filter(
    (q) => !newInsights.some((i) => wordOverlap(q.text, i.text) >= 0.4),
  );

  // Add new questions, dedup against surviving
  for (const q of incomingQuestions) {
    const duplicate = surviving.findIndex(
      (s) => wordOverlap(s.text, q.text) >= 0.6,
    );
    if (duplicate < 0) {
      surviving.push(q);
    }
  }

  return surviving;
}

// --- Connection dedup ---

function mergeConnections(
  existing: MkfConnection[],
  incoming: MkfConnection[],
): MkfConnection[] {
  const merged = [...existing];

  for (const conn of incoming) {
    const match = merged.findIndex(
      (c) => normalize(c.target) === normalize(conn.target),
    );
    if (match >= 0) {
      // Keep longer text
      if (conn.text.length > merged[match].text.length) {
        merged[match] = { ...merged[match], text: conn.text };
      }
    } else {
      merged.push(conn);
    }
  }

  return merged;
}

// --- Framework merging ---

function mergeFrameworks(
  existing: MkfFramework[],
  incoming: MkfFramework[],
): MkfFramework[] {
  const merged = [...existing];

  for (const fw of incoming) {
    const match = merged.findIndex(
      (f) => normalize(f.name) === normalize(fw.name),
    );
    if (match >= 0) {
      merged[match] = {
        name: merged[match].name,
        properties: mergeRecords(merged[match].properties, fw.properties),
      };
    } else {
      merged.push(fw);
    }
  }

  return merged;
}

// --- Token budget enforcement ---

function enforceTokenBudget(doc: MkfDocument): MkfDocument {
  const text = serializeMkf(doc);
  const tokens = estimateTokens(text);

  if (tokens <= MAX_MKF_TOKENS) return doc;

  // Trim lowest-ranked items from tier-2 first
  const trimmed = { ...doc, tier2: { ...doc.tier2 } };

  // Remove non-significant insights from the end
  while (
    estimateTokens(serializeMkf(trimmed)) > MAX_MKF_TOKENS &&
    trimmed.tier2.insights.length > 1
  ) {
    const lastNonSig = findLastIndex(
      trimmed.tier2.insights,
      (i) => !i.significant,
    );
    if (lastNonSig >= 0) {
      trimmed.tier2.insights = [
        ...trimmed.tier2.insights.slice(0, lastNonSig),
        ...trimmed.tier2.insights.slice(lastNonSig + 1),
      ];
    } else {
      // All significant — trim from end
      trimmed.tier2.insights = trimmed.tier2.insights.slice(0, -1);
    }
  }

  // Remove questions from the end
  while (
    estimateTokens(serializeMkf(trimmed)) > MAX_MKF_TOKENS &&
    trimmed.tier2.questions.length > 0
  ) {
    trimmed.tier2.questions = trimmed.tier2.questions.slice(0, -1);
  }

  // Remove connections from the end
  while (
    estimateTokens(serializeMkf(trimmed)) > MAX_MKF_TOKENS &&
    trimmed.tier2.connections.length > 0
  ) {
    trimmed.tier2.connections = trimmed.tier2.connections.slice(0, -1);
  }

  return trimmed;
}

// --- Utility helpers ---

function normalize(s: string): string {
  return s.toLowerCase().replace(/[_\s-]+/g, "").trim();
}

function mergeRecords(
  existing: Record<string, string>,
  incoming: Record<string, string>,
): Record<string, string> {
  const result = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (!result[key] || value.length > result[key].length) {
      result[key] = value;
    }
  }
  return result;
}

/** Calculate word overlap ratio between two texts (Jaccard-like) */
function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(extractWords(a));
  const wordsB = new Set(extractWords(b));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

/** Extract meaningful words (skip short/common ones) */
function extractWords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "can", "shall",
    "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above",
    "below", "between", "and", "but", "or", "nor", "not", "no",
    "so", "if", "then", "than", "that", "this", "it", "its",
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

function findLastIndex<T>(arr: T[], pred: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (pred(arr[i])) return i;
  }
  return -1;
}

export { wordOverlap };
