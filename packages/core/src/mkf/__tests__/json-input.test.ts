import { describe, it, expect } from "vitest";
import { buildMkfFromJson } from "../json-input.js";
import type { MkfJsonExtraction, MkfBuildContext } from "../json-input.js";
import { serializeMkf } from "../serializer.js";
import { parseMkf } from "../parser.js";
import { mergeMkf, emptyMkf } from "../merger.js";
import { estimateTokens } from "../../tokens.js";

const DEFAULT_CONTEXT: MkfBuildContext = {
  bookTitle: "Frankenstein; Or, The Modern Prometheus",
  bookAuthor: "Mary Wollstonecraft Shelley",
  bookId: "deb1a5c64a36",
  totalTokens: 110000,
  totalWords: 78000,
  totalChapters: 31,
  chapterIndex: 2,
  sessionId: "test-session-abc123",
  reader: "Aiden@abutlabs",
};

function fullExtraction(): MkfJsonExtraction {
  return {
    themes: [
      { name: "ambition", properties: { drive: "glory ↔ destruction", pattern: "creator_neglects_creation" } },
      { name: "isolation", properties: { cause: "obsession → withdrawal" } },
    ],
    relationships: [
      { from: "Victor", arrow: "creates", to: "Creature", annotation: "then_abandons" },
      { from: "Walton", arrow: "mirrors", to: "Frankenstein" },
    ],
    structure: { form: "nested_epistolary", layers: "3" },
    concepts: [
      { name: "monstrosity", properties: { def: "social_construct", evidence: "rejection_creates_violence" } },
    ],
    facts: { setting: "Geneva, Ingolstadt, Arctic", period: "late_18th_century" },
    insights: [
      { significant: true, text: "Reading shapes identity through consumption of books" },
      { significant: true, text: "Creator responsibility directly applicable to AI" },
      { text: "Walton mirrors Frankenstein in ambition" },
    ],
    questions: [
      "Is Margaret's silence structural commentary?",
      "Why a failed poet as frame narrator?",
    ],
    connections: [
      { target: "GEB", text: "strange_loops ↔ nested_narration" },
      { target: "AI_alignment", text: "creator_responsibility" },
    ],
    frameworks: [
      { name: "creator_responsibility", properties: { IF: "create_autonomous_entity THEN obligated_to_nurture", violation: "cascade_failure" } },
    ],
    confidence: 0.85,
  };
}

describe("buildMkfFromJson", () => {
  it("builds a valid MkfDocument from full extraction", () => {
    const doc = buildMkfFromJson(fullExtraction(), DEFAULT_CONTEXT);

    expect(doc.header.book).toBe("Frankenstein; Or, The Modern Prometheus");
    expect(doc.header.by).toBe("Mary Wollstonecraft Shelley");
    expect(doc.header.id).toBe("deb1a5c64a36");
    expect(doc.header.tokens).toBe("110K");
    expect(doc.header.words).toBe("78K");
    expect(doc.header.chapters).toBe(31);
    expect(doc.header.reader).toBe("Aiden@abutlabs");

    expect(doc.tier1.themes).toHaveLength(2);
    expect(doc.tier1.themes[0].name).toBe("ambition");
    expect(doc.tier1.relationships).toHaveLength(2);
    expect(doc.tier1.structure.properties.form).toBe("nested_epistolary");
    expect(doc.tier1.concepts).toHaveLength(1);
    expect(doc.tier1.facts.entries.setting).toBe("Geneva, Ingolstadt, Arctic");

    expect(doc.tier2.insights).toHaveLength(3);
    expect(doc.tier2.insights[0].significant).toBe(true);
    expect(doc.tier2.insights[2].significant).toBe(false);
    expect(doc.tier2.questions).toHaveLength(2);
    expect(doc.tier2.connections).toHaveLength(2);
    expect(doc.tier2.frameworks).toHaveLength(1);

    expect(doc.meta.confidence).toBe(0.85);
    expect(doc.meta.chaptersRead).toBe("3/31");
    expect(doc.meta.format).toBe("MKF v1.0");
  });

  it("handles empty extraction gracefully", () => {
    const doc = buildMkfFromJson({}, DEFAULT_CONTEXT);

    expect(doc.header.book).toBe("Frankenstein; Or, The Modern Prometheus");
    expect(doc.tier1.themes).toHaveLength(0);
    expect(doc.tier1.relationships).toHaveLength(0);
    expect(doc.tier1.concepts).toHaveLength(0);
    expect(doc.tier2.insights).toHaveLength(0);
    expect(doc.tier2.questions).toHaveLength(0);
    expect(doc.meta.confidence).toBe(0.7); // default
  });

  it("handles partial extraction (only themes + insights)", () => {
    const doc = buildMkfFromJson(
      {
        themes: [{ name: "ambition", properties: { drive: "glory" } }],
        insights: [{ significant: true, text: "Key insight" }],
      },
      DEFAULT_CONTEXT,
    );

    expect(doc.tier1.themes).toHaveLength(1);
    expect(doc.tier1.relationships).toHaveLength(0);
    expect(doc.tier2.insights).toHaveLength(1);
    expect(doc.tier2.questions).toHaveLength(0);
  });

  it("defaults relationship annotation to empty string", () => {
    const doc = buildMkfFromJson(
      { relationships: [{ from: "A", arrow: "creates", to: "B" }] },
      DEFAULT_CONTEXT,
    );
    expect(doc.tier1.relationships[0].annotation).toBe("");
  });

  it("defaults insight significance to false", () => {
    const doc = buildMkfFromJson(
      { insights: [{ text: "Some insight" }] },
      DEFAULT_CONTEXT,
    );
    expect(doc.tier2.insights[0].significant).toBe(false);
  });

  it("formats token/word counts with K suffix", () => {
    const doc = buildMkfFromJson({}, {
      ...DEFAULT_CONTEXT,
      totalTokens: 500,
      totalWords: 350,
    });
    expect(doc.header.tokens).toBe("500");
    expect(doc.header.words).toBe("350");

    const doc2 = buildMkfFromJson({}, DEFAULT_CONTEXT);
    expect(doc2.header.tokens).toBe("110K");
    expect(doc2.header.words).toBe("78K");
  });
});

describe("round-trip: JSON → MkfDocument → serialize → parse", () => {
  it("produces parseable MKF from full extraction", () => {
    const doc = buildMkfFromJson(fullExtraction(), DEFAULT_CONTEXT);
    const serialized = serializeMkf(doc);
    const parsed = parseMkf(serialized);

    expect(parsed.header.book).toBe("Frankenstein; Or, The Modern Prometheus");
    expect(parsed.header.reader).toBe("Aiden@abutlabs");
    expect(parsed.tier1.themes).toHaveLength(2);
    expect(parsed.tier1.themes[0].name).toBe("ambition");
    expect(parsed.tier2.insights).toHaveLength(3);
    expect(parsed.tier2.questions).toHaveLength(2);
    expect(parsed.tier2.connections).toHaveLength(2);
    expect(parsed.tier2.frameworks).toHaveLength(1);
    expect(parsed.meta.confidence).toBe(0.85);
  });

  it("survives empty extraction round-trip", () => {
    const doc = buildMkfFromJson({}, DEFAULT_CONTEXT);
    const serialized = serializeMkf(doc);
    const parsed = parseMkf(serialized);

    expect(parsed.header.book).toBe("Frankenstein; Or, The Modern Prometheus");
    expect(parsed.tier1.themes).toHaveLength(0);
  });
});

describe("merge compatibility", () => {
  it("merges JSON-built doc into empty base", () => {
    const base = emptyMkf();
    const chapter = buildMkfFromJson(fullExtraction(), DEFAULT_CONTEXT);
    const merged = mergeMkf(base, chapter);

    expect(merged.header.book).toBe("Frankenstein; Or, The Modern Prometheus");
    expect(merged.tier1.themes).toHaveLength(2);
    expect(merged.tier2.insights.length).toBeGreaterThanOrEqual(2);
  });

  it("merges two JSON-built docs", () => {
    const ch1 = buildMkfFromJson(
      {
        themes: [{ name: "ambition", properties: { drive: "glory" } }],
        insights: [{ significant: true, text: "First chapter key insight" }],
      },
      { ...DEFAULT_CONTEXT, chapterIndex: 0 },
    );

    const ch2 = buildMkfFromJson(
      {
        themes: [{ name: "ambition", properties: { scope: "cosmic" } }],
        themes2: undefined, // ignored
        insights: [{ significant: true, text: "Second chapter different insight" }],
        questions: ["Does this connect to chapter 1?"],
      } as MkfJsonExtraction,
      { ...DEFAULT_CONTEXT, chapterIndex: 1 },
    );

    const merged = mergeMkf(ch1, ch2);

    // Theme "ambition" should be merged (1 theme, combined properties)
    expect(merged.tier1.themes).toHaveLength(1);
    expect(merged.tier1.themes[0].properties.drive).toBe("glory");
    expect(merged.tier1.themes[0].properties.scope).toBe("cosmic");

    // Both insights should survive (different text)
    expect(merged.tier2.insights.length).toBe(2);
  });

  it("serialized merged result is valid MKF", () => {
    const base = emptyMkf();
    const chapter = buildMkfFromJson(fullExtraction(), DEFAULT_CONTEXT);
    const merged = mergeMkf(base, chapter);
    const serialized = serializeMkf(merged);
    const reparsed = parseMkf(serialized);

    expect(reparsed.tier1.themes).toHaveLength(2);
    expect(reparsed.tier2.insights.length).toBeGreaterThanOrEqual(2);
  });
});
