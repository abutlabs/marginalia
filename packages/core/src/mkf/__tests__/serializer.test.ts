import { describe, it, expect } from "vitest";
import { parseMkf } from "../parser.js";
import { serializeMkf } from "../serializer.js";
import type { MkfDocument } from "../types.js";

describe("serializeMkf", () => {
  it("produces valid MKF text", () => {
    const doc: MkfDocument = {
      header: {
        book: "Test Book",
        by: "Test Author",
        id: "abc123",
        tokens: "50K",
        words: "35K",
        chapters: 10,
        read: "2026-02-06",
      },
      tier1: {
        themes: [
          {
            name: "knowledge",
            properties: { drive: "curiosity → obsession", pattern: "seek_then_suffer" },
          },
        ],
        relationships: [
          { from: "A", arrow: "creates", to: "B", annotation: "then_abandons" },
        ],
        structure: {
          properties: { form: "epistolary", layers: "3" },
        },
        concepts: [
          {
            name: "hubris",
            properties: { def: "overreach_beyond_wisdom" },
          },
        ],
        facts: {
          entries: { setting: "Geneva", period: "18th_century" },
        },
      },
      tier2: {
        insights: [
          { significant: true, text: "Important insight here" },
          { significant: false, text: "Less important" },
        ],
        questions: [{ text: "What drives the protagonist?" }],
        connections: [
          { target: "other_book", text: "shared theme of knowledge" },
        ],
        frameworks: [
          {
            name: "hubris_pattern",
            properties: {
              IF: "overreach THEN suffer",
              applies_to: "science, exploration",
            },
          },
        ],
      },
      meta: {
        session: "test-session",
        chaptersRead: "5/10",
        confidence: 0.85,
        compressionRatio: "50K → 500",
        format: "MKF v0.1",
      },
    };

    const text = serializeMkf(doc);

    // Verify it contains the expected structure
    expect(text).toContain("book: Test Book");
    expect(text).toContain("@theme knowledge");
    expect(text).toContain("@rel");
    expect(text).toContain("A →creates→ B: then_abandons");
    expect(text).toContain("@struct");
    expect(text).toContain("@concept hubris");
    expect(text).toContain("@facts");
    expect(text).toContain("@insights");
    expect(text).toContain("! Important insight here");
    expect(text).toContain("Less important");
    expect(text).toContain("@questions");
    expect(text).toContain("? What drives the protagonist?");
    expect(text).toContain("@connections");
    expect(text).toContain("~ other_book: shared theme of knowledge");
    expect(text).toContain("@fw hubris_pattern");
    expect(text).toContain("@meta");
    expect(text).toContain("session: test-session");
  });

  it("round-trips through parse → serialize → parse", () => {
    const original: MkfDocument = {
      header: {
        book: "Frankenstein; Or, The Modern Prometheus",
        by: "Mary Wollstonecraft Shelley",
        id: "deb1a5c64a36",
        tokens: "110K",
        words: "78K",
        chapters: 31,
        read: "2026-02-06",
      },
      tier1: {
        themes: [
          {
            name: "ambition",
            properties: {
              drive: "glory ↔ destruction",
              pattern: "creator_neglects_creation → cascade_failure",
            },
          },
        ],
        relationships: [
          {
            from: "Walton",
            arrow: "mirrors",
            to: "Frankenstein",
            annotation: "shared_Promethean_drive",
          },
          {
            from: "Frankenstein",
            arrow: "creates",
            to: "Creature",
            annotation: "then_abandons",
          },
        ],
        structure: {
          properties: {
            form: "nested_epistolary[3_layers]",
            effect: "truth ≥ 2_removes_from_reader",
          },
        },
        concepts: [
          {
            name: "monstrosity",
            properties: {
              def: "social_construct, not_physical_trait",
              inversion: "Frankenstein=true_monster(abandonment,cowardice)",
            },
          },
        ],
        facts: {
          entries: {
            setting: "Geneva, Ingolstadt, Arctic, Scotland",
            period: "late_18th_century",
          },
        },
      },
      tier2: {
        insights: [
          {
            significant: true,
            text: "Reading_shapes_identity: Walton=explorer_because_books",
          },
          {
            significant: false,
            text: "Nested unreliable narration as structural honesty",
          },
        ],
        questions: [
          { text: "Is Margaret's silence structural commentary?" },
        ],
        connections: [
          {
            target: "GEB",
            text: "strange_loops ↔ nested_narration",
          },
        ],
        frameworks: [
          {
            name: "creator_responsibility",
            properties: {
              IF: "create_autonomous_entity THEN obligated_to_nurture",
              violation: "cascade_failure (Frankenstein pattern)",
            },
          },
        ],
      },
      meta: {
        session: "frank-2026-02-06",
        chaptersRead: "31/31",
        confidence: 0.85,
        compressionRatio: "110K → 2.1K (52x)",
        format: "MKF v0.1",
      },
    };

    const serialized = serializeMkf(original);
    const parsed = parseMkf(serialized);
    const reserialized = serializeMkf(parsed);

    // The two serializations should be identical
    expect(reserialized).toBe(serialized);

    // Verify key fields survived the round-trip
    expect(parsed.header.book).toBe(original.header.book);
    expect(parsed.header.chapters).toBe(original.header.chapters);
    expect(parsed.tier1.themes).toHaveLength(1);
    expect(parsed.tier1.themes[0].name).toBe("ambition");
    expect(parsed.tier1.relationships).toHaveLength(2);
    expect(parsed.tier2.insights).toHaveLength(2);
    expect(parsed.tier2.insights[0].significant).toBe(true);
    expect(parsed.tier2.questions).toHaveLength(1);
    expect(parsed.tier2.connections).toHaveLength(1);
    expect(parsed.tier2.frameworks).toHaveLength(1);
    expect(parsed.meta.confidence).toBe(0.85);
  });

  it("handles empty tier-2 sections", () => {
    const doc: MkfDocument = {
      header: { book: "Test", by: "Author", id: "x", tokens: "1K", words: "1K", chapters: 1, read: "2026-01-01" },
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
      meta: { session: "s", chaptersRead: "0", confidence: 0, compressionRatio: "", format: "MKF v0.1" },
    };

    const text = serializeMkf(doc);
    expect(text).toContain("book: Test");
    expect(text).toContain("@meta");
    // Empty tier sections should produce empty strings between ---
    expect(text).not.toContain("@insights");
  });
});
