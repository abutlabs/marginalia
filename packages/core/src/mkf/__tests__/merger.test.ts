import { describe, it, expect } from "vitest";
import { mergeMkf, emptyMkf, wordOverlap } from "../merger.js";
import { serializeMkf } from "../serializer.js";
import { estimateTokens } from "../../tokens.js";
import type { MkfDocument } from "../types.js";

function makeChapterMkf(overrides: Partial<MkfDocument> = {}): MkfDocument {
  return {
    header: { book: "Test", by: "Author", id: "abc", tokens: "50K", words: "35K", chapters: 10, read: "2026-02-06" },
    tier1: {
      themes: [],
      relationships: [],
      structure: { properties: {} },
      concepts: [],
      facts: { entries: {} },
      ...overrides.tier1,
    },
    tier2: {
      insights: [],
      questions: [],
      connections: [],
      frameworks: [],
      ...overrides.tier2,
    },
    meta: {
      session: "test",
      chaptersRead: "1/10",
      confidence: 0.8,
      compressionRatio: "",
      format: "MKF v0.1",
      ...overrides.meta,
    },
  };
}

describe("mergeMkf", () => {
  describe("theme merging", () => {
    it("adds new themes", () => {
      const existing = makeChapterMkf({
        tier1: {
          themes: [{ name: "ambition", properties: { drive: "glory" } }],
          relationships: [],
          structure: { properties: {} },
          concepts: [],
          facts: { entries: {} },
        },
      });
      const chapter = makeChapterMkf({
        tier1: {
          themes: [{ name: "isolation", properties: { cause: "obsession" } }],
          relationships: [],
          structure: { properties: {} },
          concepts: [],
          facts: { entries: {} },
        },
      });

      const merged = mergeMkf(existing, chapter);
      expect(merged.tier1.themes).toHaveLength(2);
      expect(merged.tier1.themes[0].name).toBe("ambition");
      expect(merged.tier1.themes[1].name).toBe("isolation");
    });

    it("merges matching themes by normalized name", () => {
      const existing = makeChapterMkf({
        tier1: {
          themes: [{ name: "ambition", properties: { drive: "glory" } }],
          relationships: [],
          structure: { properties: {} },
          concepts: [],
          facts: { entries: {} },
        },
      });
      const chapter = makeChapterMkf({
        tier1: {
          themes: [
            {
              name: "Ambition",
              properties: { drive: "glory ↔ destruction", pattern: "overreach" },
            },
          ],
          relationships: [],
          structure: { properties: {} },
          concepts: [],
          facts: { entries: {} },
        },
      });

      const merged = mergeMkf(existing, chapter);
      expect(merged.tier1.themes).toHaveLength(1);
      // Keeps existing name
      expect(merged.tier1.themes[0].name).toBe("ambition");
      // Takes longer value
      expect(merged.tier1.themes[0].properties["drive"]).toBe("glory ↔ destruction");
      // Adds new property
      expect(merged.tier1.themes[0].properties["pattern"]).toBe("overreach");
    });
  });

  describe("relationship dedup", () => {
    it("deduplicates by (from, arrow, to) triple", () => {
      const existing = makeChapterMkf({
        tier1: {
          themes: [],
          relationships: [
            { from: "A", arrow: "creates", to: "B", annotation: "short" },
          ],
          structure: { properties: {} },
          concepts: [],
          facts: { entries: {} },
        },
      });
      const chapter = makeChapterMkf({
        tier1: {
          themes: [],
          relationships: [
            { from: "A", arrow: "creates", to: "B", annotation: "longer annotation here" },
            { from: "C", arrow: "mirrors", to: "D", annotation: "new" },
          ],
          structure: { properties: {} },
          concepts: [],
          facts: { entries: {} },
        },
      });

      const merged = mergeMkf(existing, chapter);
      expect(merged.tier1.relationships).toHaveLength(2);
      // Keeps longer annotation
      expect(merged.tier1.relationships[0].annotation).toBe("longer annotation here");
    });
  });

  describe("insight dedup", () => {
    it("deduplicates insights with >60% word overlap", () => {
      const existing = makeChapterMkf({
        tier2: {
          insights: [
            {
              significant: false,
              text: "Reading shapes identity through consumption of books and literature",
            },
          ],
          questions: [],
          connections: [],
          frameworks: [],
        },
      });
      const chapter = makeChapterMkf({
        tier2: {
          insights: [
            {
              significant: true,
              text: "Reading shapes identity through consumption of books and literary works",
            },
          ],
          questions: [],
          connections: [],
          frameworks: [],
        },
      });

      const merged = mergeMkf(existing, chapter);
      expect(merged.tier2.insights).toHaveLength(1);
      // Promotes significance
      expect(merged.tier2.insights[0].significant).toBe(true);
      // Keeps longer text
      expect(merged.tier2.insights[0].text).toContain("literary works");
    });

    it("keeps distinct insights", () => {
      const existing = makeChapterMkf({
        tier2: {
          insights: [
            { significant: true, text: "Ambition drives destruction" },
          ],
          questions: [],
          connections: [],
          frameworks: [],
        },
      });
      const chapter = makeChapterMkf({
        tier2: {
          insights: [
            { significant: false, text: "Isolation creates monstrosity through rejection" },
          ],
          questions: [],
          connections: [],
          frameworks: [],
        },
      });

      const merged = mergeMkf(existing, chapter);
      expect(merged.tier2.insights).toHaveLength(2);
    });
  });

  describe("question promotion", () => {
    it("removes questions answered by new insights", () => {
      const existing = makeChapterMkf({
        tier2: {
          insights: [],
          questions: [
            { text: "Is Margaret's silence commentary on who speaks in ambition narratives?" },
          ],
          connections: [],
          frameworks: [],
        },
      });
      const chapter = makeChapterMkf({
        tier2: {
          insights: [
            {
              significant: true,
              text: "Margaret's silence is commentary on who speaks and who listens in narratives of ambition",
            },
          ],
          questions: [],
          connections: [],
          frameworks: [],
        },
      });

      const merged = mergeMkf(existing, chapter);
      expect(merged.tier2.questions).toHaveLength(0);
    });

    it("keeps unanswered questions", () => {
      const existing = makeChapterMkf({
        tier2: {
          insights: [],
          questions: [
            { text: "Why a failed poet as frame narrator?" },
          ],
          connections: [],
          frameworks: [],
        },
      });
      const chapter = makeChapterMkf({
        tier2: {
          insights: [
            { significant: false, text: "Ambition destroys relationships" },
          ],
          questions: [],
          connections: [],
          frameworks: [],
        },
      });

      const merged = mergeMkf(existing, chapter);
      expect(merged.tier2.questions).toHaveLength(1);
    });
  });

  describe("token budget enforcement", () => {
    it("trims document to stay under 3200 tokens", () => {
      // Create a document with lots of insights to exceed budget
      const longInsights = Array.from({ length: 50 }, (_, i) => ({
        significant: i < 3,
        text: `This is a moderately long insight number ${i} about various thematic elements in the novel including character development and narrative structure and symbolic meaning and literary analysis and historical context which adds many tokens to the total document`,
      }));

      const existing = makeChapterMkf({
        tier1: {
          themes: [
            { name: "ambition", properties: { drive: "glory ↔ destruction", pattern: "creator_neglects_creation" } },
            { name: "isolation", properties: { cause: "obsession", effect: "monstrosity" } },
          ],
          relationships: [
            { from: "A", arrow: "creates", to: "B", annotation: "then_abandons" },
          ],
          structure: { properties: { form: "epistolary" } },
          concepts: [{ name: "hubris", properties: { def: "overreach" } }],
          facts: { entries: { setting: "Geneva" } },
        },
        tier2: {
          insights: longInsights,
          questions: [
            { text: "Why does this happen?" },
            { text: "What does this mean?" },
          ],
          connections: [{ target: "other_book", text: "shared theme" }],
          frameworks: [],
        },
      });

      const chapter = makeChapterMkf();
      const merged = mergeMkf(existing, chapter);

      const text = serializeMkf(merged);
      const tokens = estimateTokens(text);
      expect(tokens).toBeLessThanOrEqual(3200);
    });
  });

  describe("concept merging", () => {
    it("merges matching concepts by normalized name", () => {
      const existing = makeChapterMkf({
        tier1: {
          themes: [],
          relationships: [],
          structure: { properties: {} },
          concepts: [{ name: "monstrosity", properties: { def: "social_construct" } }],
          facts: { entries: {} },
        },
      });
      const chapter = makeChapterMkf({
        tier1: {
          themes: [],
          relationships: [],
          structure: { properties: {} },
          concepts: [
            {
              name: "monstrosity",
              properties: {
                def: "social_construct, not_physical_trait",
                evidence: "Creature=gentle_until_rejected",
              },
            },
          ],
          facts: { entries: {} },
        },
      });

      const merged = mergeMkf(existing, chapter);
      expect(merged.tier1.concepts).toHaveLength(1);
      expect(merged.tier1.concepts[0].properties["def"]).toBe(
        "social_construct, not_physical_trait",
      );
      expect(merged.tier1.concepts[0].properties["evidence"]).toBe(
        "Creature=gentle_until_rejected",
      );
    });
  });
});

describe("wordOverlap", () => {
  it("returns 1 for identical texts", () => {
    expect(wordOverlap("reading shapes identity", "reading shapes identity")).toBe(1);
  });

  it("returns 0 for completely different texts", () => {
    expect(wordOverlap("apples oranges bananas", "rockets planets galaxies")).toBe(0);
  });

  it("returns value between 0 and 1 for partial overlap", () => {
    const score = wordOverlap(
      "reading shapes identity through books",
      "reading shapes knowledge through literature",
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it("ignores stop words", () => {
    const withStops = wordOverlap(
      "the quick brown fox jumps over the lazy dog",
      "a quick brown fox leaps over a lazy cat",
    );
    // "quick", "brown", "fox", "lazy" overlap; "jumps"/"leaps", "dog"/"cat" differ
    expect(withStops).toBeGreaterThan(0.3);
  });
});

describe("emptyMkf", () => {
  it("creates a valid empty document", () => {
    const empty = emptyMkf();
    expect(empty.tier1.themes).toHaveLength(0);
    expect(empty.tier2.insights).toHaveLength(0);
    expect(empty.meta.format).toBe("MKF v0.1");
  });
});
