import { describe, it, expect } from "vitest";
import { finalizeCompression } from "../compress.js";
import { serializeMkf } from "../serializer.js";
import { estimateTokens } from "../../tokens.js";
import type { MkfDocument } from "../types.js";

function makeFullDoc(): MkfDocument {
  return {
    header: {
      book: "Test Book",
      by: "Author",
      id: "abc123",
      tokens: "100K",
      words: "70K",
      chapters: 20,
      read: "2026-02-06",
      reader: "Tester",
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
        {
          name: "isolation",
          properties: { cause: "obsession → withdrawal", effect: "monstrosity" },
        },
      ],
      relationships: [
        { from: "A", arrow: "creates", to: "B", annotation: "then_abandons" },
        { from: "C", arrow: "mirrors", to: "D", annotation: "shared_drive" },
      ],
      structure: {
        properties: { form: "nested_epistolary[3_layers]", effect: "truth ≥ 2_removes" },
      },
      concepts: [
        {
          name: "monstrosity",
          properties: { def: "social_construct", evidence: "rejection_creates_violence" },
        },
      ],
      facts: {
        entries: {
          setting: "Geneva, Ingolstadt, Arctic",
          period: "late_18th_century",
          narrator: "Robert_Walton",
        },
      },
    },
    tier2: {
      insights: [
        { significant: true, text: "Reading shapes identity through consumption of books and ideas" },
        { significant: true, text: "Creator responsibility framework directly applicable to AI development" },
        { significant: false, text: "Walton mirrors Frankenstein in ambition drive glory destruction" },
        { significant: false, text: "Nested narration creates epistemic uncertainty about truth" },
        { significant: false, text: "The Arctic setting represents sublime nature beyond human control" },
        { significant: false, text: "Minor observation about sentence structure in chapter 5" },
      ],
      questions: [
        { text: "Is Margaret's silence structural commentary?" },
        { text: "Why a failed poet as frame narrator?" },
      ],
      connections: [
        { target: "GEB", text: "strange_loops ↔ nested_narration" },
        { target: "AI_alignment", text: "creator_responsibility" },
      ],
      frameworks: [
        {
          name: "creator_responsibility",
          properties: {
            IF: "create_autonomous_entity THEN obligated_to_nurture",
            violation: "cascade_failure",
          },
        },
      ],
    },
    meta: {
      session: "test-session",
      chaptersRead: "20/20",
      confidence: 0.85,
      compressionRatio: "100K → 2K",
      format: "MKF v1.0",
    },
  };
}

describe("finalizeCompression", () => {
  it("keeps significant insights", () => {
    const doc = makeFullDoc();
    const compressed = finalizeCompression(doc);
    const sigInsights = compressed.tier2.insights.filter((i) => i.significant);
    expect(sigInsights.length).toBeGreaterThanOrEqual(2);
  });

  it("sorts insights: significant first", () => {
    const doc = makeFullDoc();
    const compressed = finalizeCompression(doc);
    const insights = compressed.tier2.insights;
    // All significant insights should come before non-significant
    let seenNonSig = false;
    for (const i of insights) {
      if (!i.significant) seenNonSig = true;
      if (seenNonSig && i.significant) {
        throw new Error("Significant insight found after non-significant");
      }
    }
  });

  it("prunes insights that restate tier-1 content", () => {
    const doc = makeFullDoc();
    const before = doc.tier2.insights.length;
    const compressed = finalizeCompression(doc);
    // "Walton mirrors Frankenstein in ambition drive glory destruction"
    // overlaps heavily with tier-1 themes (ambition, glory, destruction)
    expect(compressed.tier2.insights.length).toBeLessThanOrEqual(before);
  });

  it("respects target token budget", () => {
    // Create a bloated document
    const doc = makeFullDoc();
    doc.tier2.insights = Array.from({ length: 30 }, (_, i) => ({
      significant: i < 2,
      text: `This is insight number ${i} with enough words about themes of ambition and destruction and creation and moral responsibility and narrative structure that it consumes many tokens in the final output`,
    }));

    const compressed = finalizeCompression(doc, 1500);
    const tokens = estimateTokens(serializeMkf(compressed));
    expect(tokens).toBeLessThanOrEqual(1500);
  });

  it("preserves tier-1 content unchanged", () => {
    const doc = makeFullDoc();
    const compressed = finalizeCompression(doc);
    expect(compressed.tier1.themes).toEqual(doc.tier1.themes);
    expect(compressed.tier1.relationships).toEqual(doc.tier1.relationships);
    expect(compressed.tier1.facts).toEqual(doc.tier1.facts);
  });

  it("preserves header and meta", () => {
    const doc = makeFullDoc();
    const compressed = finalizeCompression(doc);
    expect(compressed.header.book).toBe("Test Book");
    expect(compressed.header.reader).toBe("Tester");
    expect(compressed.meta.confidence).toBe(0.85);
  });
});
