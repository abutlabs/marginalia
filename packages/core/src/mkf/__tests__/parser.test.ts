import { describe, it, expect } from "vitest";
import { parseMkf } from "../parser.js";

const LETTER_1_MKF = `book: Frankenstein; Or, The Modern Prometheus
by: Mary Wollstonecraft Shelley
id: deb1a5c64a36
tokens: 110K | words: 78K | chapters: 31
read: 2026-02-06 (in progress, 1/31)
---
@theme ambition
  drive: glory ↔ destruction
  Walton: failed_poet → Arctic_explorer; same_Promethean_impulse, redirected
  foreshadows: [title=Modern_Prometheus]

@struct
  form: epistolary, nested_narration (depth TBD)
  Walton → sister_Margaret_Saville: asymmetric
  filter: everything through self-presentation_to_worried_sibling

@concept ambition_as_performance
  Walton: repeated_self-justification reveals_doubt
  "do I not deserve to accomplish some great purpose?": convincing_self
  6_years_physical_prep: overcompensation_for_vague_intellectual_goal

@facts
  narrator: Robert_Walton, English_explorer
  destination: Arctic (magnetic_pole, passage, undiscovered_land)
  backstory: Uncle_Thomas_library → childhood_obsession; failed_poet, self-educated
  writing_to: Margaret_Saville (sister)
  setting: St._Petersburg, about_to_depart
---
@insights
  ! Reading_shapes_identity: Walton=explorer_because_books. Uncle_Thomas_library created the obsession. Identity as product of consumption — directly relevant to what marginalia is building.
  ! The letter format creates epistemic asymmetry — we read curated self-presentation. When Frankenstein enters, his story will be filtered through Walton's retelling. Truth ≥ 2_removes.
  Walton is self-aware enough to see his spirits fluctuate, not self-aware enough to see his preparation is overcompensation for an ambition without clear object. He doesn't know what he'll find.

@questions
  ? Is Margaret's silence structural commentary on who speaks in ambition narratives?
  ? How does conscious risk awareness ("If I fail, you will see me again soon, or never") differ from wisdom?
  ? Why a failed poet as frame narrator for scientific overreach?

@connections
  ~ marginalia_project: reading_as_identity_formation is exactly what we're systematizing
  ~ Romantic_sublime: Arctic as "beauty and delight" vs reality of frost/death — imagination vs nature gap

@fw ambition_without_object
  pattern: vague_grand_goal + intense_preparation + no_clear_endpoint
  Walton: doesn't know what's at the pole, just knows he must go
  risk: the drive itself becomes the identity, destination is irrelevant
---
@meta
  session: frank-2026-02-06
  chapters_read: 1/31 (Letter 1)
  confidence: 0.9
  compression_ratio: 110K → ~450 (this partial distillation)
  format: MKF v0.1`;

describe("parseMkf", () => {
  const doc = parseMkf(LETTER_1_MKF);

  describe("header", () => {
    it("parses book title", () => {
      expect(doc.header.book).toBe("Frankenstein; Or, The Modern Prometheus");
    });

    it("parses author", () => {
      expect(doc.header.by).toBe("Mary Wollstonecraft Shelley");
    });

    it("parses id", () => {
      expect(doc.header.id).toBe("deb1a5c64a36");
    });

    it("parses tokens from combined stats line", () => {
      expect(doc.header.tokens).toBe("110K");
    });

    it("parses words from combined stats line", () => {
      expect(doc.header.words).toBe("78K");
    });

    it("parses chapters from combined stats line", () => {
      expect(doc.header.chapters).toBe(31);
    });

    it("parses read date", () => {
      expect(doc.header.read).toBe("2026-02-06 (in progress, 1/31)");
    });
  });

  describe("tier-1 themes", () => {
    it("finds one theme", () => {
      expect(doc.tier1.themes).toHaveLength(1);
    });

    it("parses theme name", () => {
      expect(doc.tier1.themes[0].name).toBe("ambition");
    });

    it("parses theme properties", () => {
      expect(doc.tier1.themes[0].properties["drive"]).toBe(
        "glory ↔ destruction",
      );
      expect(doc.tier1.themes[0].properties["foreshadows"]).toBe(
        "[title=Modern_Prometheus]",
      );
    });
  });

  describe("tier-1 structure", () => {
    it("parses structure properties", () => {
      expect(doc.tier1.structure.properties["form"]).toBe(
        "epistolary, nested_narration (depth TBD)",
      );
      expect(doc.tier1.structure.properties["filter"]).toBe(
        "everything through self-presentation_to_worried_sibling",
      );
    });
  });

  describe("tier-1 concepts", () => {
    it("finds one concept", () => {
      expect(doc.tier1.concepts).toHaveLength(1);
    });

    it("parses concept name and properties", () => {
      expect(doc.tier1.concepts[0].name).toBe("ambition_as_performance");
      expect(doc.tier1.concepts[0].properties["6_years_physical_prep"]).toBe(
        "overcompensation_for_vague_intellectual_goal",
      );
    });
  });

  describe("tier-1 facts", () => {
    it("parses all fact entries", () => {
      expect(doc.tier1.facts.entries["narrator"]).toBe(
        "Robert_Walton, English_explorer",
      );
      expect(doc.tier1.facts.entries["setting"]).toBe(
        "St._Petersburg, about_to_depart",
      );
      expect(doc.tier1.facts.entries["writing_to"]).toBe(
        "Margaret_Saville (sister)",
      );
    });
  });

  describe("tier-2 insights", () => {
    it("finds three insights", () => {
      expect(doc.tier2.insights).toHaveLength(3);
    });

    it("marks significant insights", () => {
      expect(doc.tier2.insights[0].significant).toBe(true);
      expect(doc.tier2.insights[1].significant).toBe(true);
      expect(doc.tier2.insights[2].significant).toBe(false);
    });

    it("strips ! prefix from text", () => {
      expect(doc.tier2.insights[0].text).toContain("Reading_shapes_identity");
      expect(doc.tier2.insights[0].text).not.toMatch(/^!/);
    });
  });

  describe("tier-2 questions", () => {
    it("finds three questions", () => {
      expect(doc.tier2.questions).toHaveLength(3);
    });

    it("strips ? prefix from text", () => {
      expect(doc.tier2.questions[0].text).toContain("Margaret's silence");
      expect(doc.tier2.questions[0].text).not.toMatch(/^\?/);
    });
  });

  describe("tier-2 connections", () => {
    it("finds two connections", () => {
      expect(doc.tier2.connections).toHaveLength(2);
    });

    it("extracts target and text", () => {
      expect(doc.tier2.connections[0].target).toBe("marginalia_project");
      expect(doc.tier2.connections[0].text).toContain(
        "reading_as_identity_formation",
      );
    });
  });

  describe("tier-2 frameworks", () => {
    it("finds one framework", () => {
      expect(doc.tier2.frameworks).toHaveLength(1);
    });

    it("parses framework name and properties", () => {
      expect(doc.tier2.frameworks[0].name).toBe("ambition_without_object");
      expect(doc.tier2.frameworks[0].properties["risk"]).toBe(
        "the drive itself becomes the identity, destination is irrelevant",
      );
    });
  });

  describe("meta", () => {
    it("parses session", () => {
      expect(doc.meta.session).toBe("frank-2026-02-06");
    });

    it("parses chapters_read", () => {
      expect(doc.meta.chaptersRead).toBe("1/31 (Letter 1)");
    });

    it("parses confidence as number", () => {
      expect(doc.meta.confidence).toBe(0.9);
    });

    it("parses format", () => {
      expect(doc.meta.format).toBe("MKF v0.1");
    });
  });

  describe("edge cases", () => {
    it("handles empty input", () => {
      const empty = parseMkf("");
      expect(empty.header.book).toBe("");
      expect(empty.tier1.themes).toHaveLength(0);
      expect(empty.tier2.insights).toHaveLength(0);
    });

    it("handles missing sections", () => {
      const headerOnly = parseMkf("book: Test\nby: Author\nid: abc");
      expect(headerOnly.header.book).toBe("Test");
      expect(headerOnly.tier1.themes).toHaveLength(0);
    });
  });
});
