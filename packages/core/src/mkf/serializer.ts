/**
 * MkfDocument → canonical MKF text serializer.
 *
 * Inverse of the parser. Outputs the exact format from the spec,
 * ensuring consistency regardless of LLM output variations.
 */

import type {
  MkfDocument,
  MkfHeader,
  MkfTier1,
  MkfTier2,
  MkfMeta,
  MkfTheme,
  MkfRelationship,
  MkfConcept,
  MkfFacts,
  MkfInsight,
  MkfQuestion,
  MkfConnection,
  MkfFramework,
  MkfStructure,
} from "./types.js";

/** Serialize an MkfDocument to canonical MKF text */
export function serializeMkf(doc: MkfDocument): string {
  const sections = [
    serializeHeader(doc.header),
    serializeTier1(doc.tier1),
    serializeTier2(doc.tier2),
    serializeMeta(doc.meta),
  ];
  return sections.join("\n---\n");
}

function serializeHeader(h: MkfHeader): string {
  const lines: string[] = [];
  lines.push(`book: ${h.book}`);
  lines.push(`by: ${h.by}`);
  lines.push(`id: ${h.id}`);
  lines.push(`tokens: ${h.tokens} | words: ${h.words} | chapters: ${h.chapters}`);
  lines.push(`read: ${h.read}`);
  if (h.reader) {
    lines.push(`reader: ${h.reader}`);
  }
  return lines.join("\n");
}

function serializeTier1(t: MkfTier1): string {
  const parts: string[] = [];

  for (const theme of t.themes) {
    parts.push(serializeTheme(theme));
  }

  if (t.relationships.length > 0) {
    parts.push(serializeRelationships(t.relationships));
  }

  if (Object.keys(t.structure.properties).length > 0) {
    parts.push(serializeStructure(t.structure));
  }

  for (const concept of t.concepts) {
    parts.push(serializeConcept(concept));
  }

  if (Object.keys(t.facts.entries).length > 0) {
    parts.push(serializeFacts(t.facts));
  }

  return parts.join("\n\n");
}

function serializeTheme(theme: MkfTheme): string {
  const lines = [`@theme ${theme.name}`];
  for (const [key, value] of Object.entries(theme.properties)) {
    lines.push(`  ${key}: ${value}`);
  }
  return lines.join("\n");
}

function serializeRelationships(rels: MkfRelationship[]): string {
  const lines = ["@rel"];
  for (const rel of rels) {
    const annotation = rel.annotation ? `: ${rel.annotation}` : "";
    lines.push(`  ${rel.from} →${rel.arrow}→ ${rel.to}${annotation}`);
  }
  return lines.join("\n");
}

function serializeStructure(struct: MkfStructure): string {
  const lines = ["@struct"];
  for (const [key, value] of Object.entries(struct.properties)) {
    lines.push(`  ${key}: ${value}`);
  }
  return lines.join("\n");
}

function serializeConcept(concept: MkfConcept): string {
  const lines = [`@concept ${concept.name}`];
  for (const [key, value] of Object.entries(concept.properties)) {
    lines.push(`  ${key}: ${value}`);
  }
  return lines.join("\n");
}

function serializeFacts(facts: MkfFacts): string {
  const lines = ["@facts"];
  for (const [key, value] of Object.entries(facts.entries)) {
    lines.push(`  ${key}: ${value}`);
  }
  return lines.join("\n");
}

function serializeTier2(t: MkfTier2): string {
  const parts: string[] = [];

  if (t.insights.length > 0) {
    parts.push(serializeInsights(t.insights));
  }

  if (t.questions.length > 0) {
    parts.push(serializeQuestions(t.questions));
  }

  if (t.connections.length > 0) {
    parts.push(serializeConnections(t.connections));
  }

  for (const fw of t.frameworks) {
    parts.push(serializeFramework(fw));
  }

  return parts.join("\n\n");
}

function serializeInsights(insights: MkfInsight[]): string {
  const lines = ["@insights"];
  for (const insight of insights) {
    const prefix = insight.significant ? "! " : "";
    lines.push(`  ${prefix}${insight.text}`);
  }
  return lines.join("\n");
}

function serializeQuestions(questions: MkfQuestion[]): string {
  const lines = ["@questions"];
  for (const q of questions) {
    lines.push(`  ? ${q.text}`);
  }
  return lines.join("\n");
}

function serializeConnections(connections: MkfConnection[]): string {
  const lines = ["@connections"];
  for (const c of connections) {
    const suffix = c.text ? `: ${c.text}` : "";
    lines.push(`  ~ ${c.target}${suffix}`);
  }
  return lines.join("\n");
}

function serializeFramework(fw: MkfFramework): string {
  const lines = [`@fw ${fw.name}`];
  for (const [key, value] of Object.entries(fw.properties)) {
    lines.push(`  ${key}: ${value}`);
  }
  return lines.join("\n");
}

function serializeMeta(m: MkfMeta): string {
  const lines = ["@meta"];
  lines.push(`  session: ${m.session}`);
  lines.push(`  chapters_read: ${m.chaptersRead}`);
  lines.push(`  confidence: ${m.confidence}`);
  lines.push(`  compression_ratio: ${m.compressionRatio}`);
  if (m.needsReread) {
    lines.push(`  needs_reread: ${m.needsReread}`);
  }
  if (m.distilledFrom) {
    lines.push(`  distilled_from: ${m.distilledFrom}`);
  }
  lines.push(`  format: ${m.format}`);
  return lines.join("\n");
}
