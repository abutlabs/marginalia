/**
 * JSON extraction input for MKF.
 *
 * Agents produce structured JSON instead of raw MKF text.
 * This module converts that JSON into an MkfDocument for
 * deterministic merging — no parsing ambiguity.
 */

import type {
  MkfDocument,
  MkfTheme,
  MkfRelationship,
  MkfStructure,
  MkfConcept,
  MkfFacts,
  MkfInsight,
  MkfQuestion,
  MkfConnection,
  MkfFramework,
} from "./types.js";

/** JSON extraction format the agent produces. All fields optional. */
export interface MkfJsonExtraction {
  themes?: Array<{ name: string; properties?: Record<string, string> }>;
  relationships?: Array<{
    from: string;
    arrow: string;
    to: string;
    annotation?: string;
  }>;
  structure?: Record<string, string>;
  concepts?: Array<{ name: string; properties?: Record<string, string> }>;
  facts?: Record<string, string>;
  insights?: Array<{ significant?: boolean; text: string }>;
  questions?: string[];
  connections?: Array<{ target: string; text: string }>;
  frameworks?: Array<{ name: string; properties?: Record<string, string> }>;
  confidence?: number;
}

/** Context the script already knows — the agent doesn't need to provide this. */
export interface MkfBuildContext {
  bookTitle: string;
  bookAuthor: string;
  bookId: string;
  totalTokens: number;
  totalWords: number;
  totalChapters: number;
  chapterIndex: number;
  sessionId: string;
  reader?: string;
}

function formatTokenCount(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);
}

/** Convert a JSON extraction + context into a full MkfDocument. */
export function buildMkfFromJson(
  extraction: MkfJsonExtraction,
  context: MkfBuildContext,
): MkfDocument {
  const themes: MkfTheme[] = (extraction.themes ?? []).map((t) => ({
    name: t.name,
    properties: t.properties ?? {},
  }));

  const relationships: MkfRelationship[] = (extraction.relationships ?? []).map(
    (r) => ({
      from: r.from,
      arrow: r.arrow,
      to: r.to,
      annotation: r.annotation ?? "",
    }),
  );

  const structure: MkfStructure = {
    properties: extraction.structure ?? {},
  };

  const concepts: MkfConcept[] = (extraction.concepts ?? []).map((c) => ({
    name: c.name,
    properties: c.properties ?? {},
  }));

  const facts: MkfFacts = {
    entries: extraction.facts ?? {},
  };

  const insights: MkfInsight[] = (extraction.insights ?? []).map((i) => ({
    significant: i.significant ?? false,
    text: i.text,
  }));

  const questions: MkfQuestion[] = (extraction.questions ?? []).map((q) => ({
    text: q,
  }));

  const connections: MkfConnection[] = (extraction.connections ?? []).map(
    (c) => ({
      target: c.target,
      text: c.text,
    }),
  );

  const frameworks: MkfFramework[] = (extraction.frameworks ?? []).map(
    (f) => ({
      name: f.name,
      properties: f.properties ?? {},
    }),
  );

  return {
    header: {
      book: context.bookTitle,
      by: context.bookAuthor,
      id: context.bookId,
      tokens: formatTokenCount(context.totalTokens),
      words: formatTokenCount(context.totalWords),
      chapters: context.totalChapters,
      read: new Date().toISOString().slice(0, 10),
      reader: context.reader,
    },
    tier1: {
      themes,
      relationships,
      structure,
      concepts,
      facts,
    },
    tier2: {
      insights,
      questions,
      connections,
      frameworks,
    },
    meta: {
      session: context.sessionId.slice(0, 8),
      chaptersRead: `${context.chapterIndex + 1}/${context.totalChapters}`,
      confidence: extraction.confidence ?? 0.7,
      compressionRatio: "",
      format: "MKF v1.0",
    },
  };
}
