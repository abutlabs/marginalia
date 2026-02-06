import { describe, it, expect } from "vitest";
import {
  parseMkfFile,
  serializeMkfFile,
  validateMkfFile,
  frameMkfForContext,
} from "../file.js";
import { parseMkf } from "../parser.js";
import type { MkfDocument } from "../types.js";

const SAMPLE_MKF_CONTENT = `book: Frankenstein; Or, The Modern Prometheus
by: Mary Wollstonecraft Shelley
id: deb1a5c64a36
tokens: 110K | words: 78K | chapters: 31
read: 2026-02-06
reader: Aiden@abutlabs
---
@theme ambition
  drive: glory ↔ destruction
---
@insights
  ! Reading_shapes_identity: Walton=explorer_because_books
---
@meta
  session: frank-2026-02-06
  chapters_read: 31/31
  confidence: 0.85
  compression_ratio: 110K → 2.1K (52x)
  format: MKF v1.0`;

function makeSampleDoc(): MkfDocument {
  return parseMkf(SAMPLE_MKF_CONTENT);
}

describe("parseMkfFile", () => {
  it("extracts version from envelope", () => {
    const raw = `%MKF-1.0\n%sha256:abc123\n%---\n${SAMPLE_MKF_CONTENT}`;
    const envelope = parseMkfFile(raw);
    expect(envelope.version).toBe("1.0");
  });

  it("extracts sha256 from envelope", () => {
    const raw = `%MKF-1.0\n%sha256:abc123\n%---\n${SAMPLE_MKF_CONTENT}`;
    const envelope = parseMkfFile(raw);
    expect(envelope.sha256).toBe("abc123");
  });

  it("extracts content below delimiter", () => {
    const raw = `%MKF-1.0\n%sha256:abc123\n%---\n${SAMPLE_MKF_CONTENT}`;
    const envelope = parseMkfFile(raw);
    expect(envelope.content).toBe(SAMPLE_MKF_CONTENT);
  });

  it("handles raw MKF without envelope", () => {
    const envelope = parseMkfFile(SAMPLE_MKF_CONTENT);
    expect(envelope.version).toBe("");
    expect(envelope.sha256).toBeUndefined();
    expect(envelope.content).toBe(SAMPLE_MKF_CONTENT);
  });
});

describe("serializeMkfFile", () => {
  it("produces valid .mkf file with envelope", () => {
    const doc = makeSampleDoc();
    const file = serializeMkfFile(doc);
    expect(file).toMatch(/^%MKF-1\.0\n/);
    expect(file).toContain("%sha256:");
    expect(file).toContain("%---");
    expect(file).toContain("book: Frankenstein");
  });

  it("sets reader on header if provided", () => {
    const doc = makeSampleDoc();
    doc.header.reader = undefined;
    const file = serializeMkfFile(doc, "TestReader@test");
    expect(file).toContain("reader: TestReader@test");
  });

  it("preserves existing reader if not overridden", () => {
    const doc = makeSampleDoc();
    doc.header.reader = "OriginalReader";
    const file = serializeMkfFile(doc, "NewReader");
    expect(file).toContain("reader: OriginalReader");
  });
});

describe("validateMkfFile", () => {
  it("validates a correct .mkf file", () => {
    const doc = makeSampleDoc();
    const file = serializeMkfFile(doc);
    const result = validateMkfFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects file without magic header", () => {
    const result = validateMkfFile(SAMPLE_MKF_CONTENT);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Missing");
  });

  it("rejects file with tampered content", () => {
    const doc = makeSampleDoc();
    const file = serializeMkfFile(doc);
    // Modify one character in the content
    const tampered = file.replace("Frankenstein", "Drankenstein");
    const result = validateMkfFile(tampered);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("integrity");
  });

  it("accepts file with unsupported version gracefully", () => {
    const file = "%MKF-2.0\n%---\nbook: Test";
    const result = validateMkfFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unsupported");
  });
});

describe("round-trip: serialize → parse → validate", () => {
  it("produces parseable MKF after stripping envelope", () => {
    const doc = makeSampleDoc();
    const file = serializeMkfFile(doc);
    const envelope = parseMkfFile(file);
    const parsed = parseMkf(envelope.content);

    expect(parsed.header.book).toBe("Frankenstein; Or, The Modern Prometheus");
    expect(parsed.header.reader).toBe("Aiden@abutlabs");
    expect(parsed.tier1.themes).toHaveLength(1);
    expect(parsed.tier2.insights).toHaveLength(1);
    expect(parsed.meta.confidence).toBe(0.85);
  });
});

describe("frameMkfForContext", () => {
  it("produces framed output with title and reading guide", () => {
    const doc = makeSampleDoc();
    const file = serializeMkfFile(doc);
    const framed = frameMkfForContext(file);

    expect(framed).toContain("## Book Knowledge: Frankenstein");
    expect(framed).toContain("Mary Wollstonecraft Shelley");
    expect(framed).toContain("Aiden@abutlabs");
    expect(framed).toContain("### Reading Guide");
    expect(framed).toContain("### Knowledge");
    expect(framed).toContain("@theme ambition");
  });

  it("works with raw MKF (no envelope)", () => {
    const framed = frameMkfForContext(SAMPLE_MKF_CONTENT);
    expect(framed).toContain("## Book Knowledge: Frankenstein");
    expect(framed).toContain("### Knowledge");
  });
});
