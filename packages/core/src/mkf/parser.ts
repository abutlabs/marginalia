/**
 * MKF text → MkfDocument parser.
 *
 * Splits on section dividers, then parses each section with
 * block-aware line parsing. Tolerant of formatting variations.
 */

import type {
  MkfDocument,
  MkfHeader,
  MkfTier1,
  MkfTier2,
  MkfMeta,
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

/** Parse an MKF text string into a structured document */
export function parseMkf(text: string): MkfDocument {
  const sections = splitSections(text);
  return {
    header: parseHeader(sections[0] ?? ""),
    tier1: parseTier1(sections[1] ?? ""),
    tier2: parseTier2(sections[2] ?? ""),
    meta: parseMeta(sections[3] ?? ""),
  };
}

/** Split text into 4 sections on `\n---\n` boundaries */
function splitSections(text: string): string[] {
  // Handle both \n---\n and ---\n at the start, and trailing ---
  return text.split(/\n---\n|^---\n/m).map((s) => s.trim());
}

/** Parse header section: line-by-line key: value */
function parseHeader(text: string): MkfHeader {
  const lines = nonEmptyLines(text);
  const kv = parseKeyValueLines(lines);

  // Parse the combined "tokens: 110K | words: 78K | chapters: 31" line
  let tokens = kv["tokens"] ?? "";
  let words = kv["words"] ?? "";
  let chapters = 0;

  // Handle combined stats line
  if (tokens.includes("|")) {
    const parts = tokens.split("|").map((p) => p.trim());
    tokens = parts[0] ?? tokens;
    for (const part of parts.slice(1)) {
      const [k, v] = part.split(":").map((s) => s.trim());
      if (k === "words") words = v ?? "";
      if (k === "chapters") chapters = parseInt(v ?? "0", 10);
    }
  }

  if (!chapters && kv["chapters"]) {
    chapters = parseInt(kv["chapters"], 10);
  }

  return {
    book: kv["book"] ?? "",
    by: kv["by"] ?? "",
    id: kv["id"] ?? "",
    tokens,
    words,
    chapters,
    read: kv["read"] ?? "",
    reader: kv["reader"],
  };
}

/** Parse Tier-1 section: detect @block types, parse indented properties */
function parseTier1(text: string): MkfTier1 {
  const blocks = splitBlocks(text);
  const themes: MkfTheme[] = [];
  const relationships: MkfRelationship[] = [];
  let structure: MkfStructure = { properties: {} };
  const concepts: MkfConcept[] = [];
  let facts: MkfFacts = { entries: {} };

  for (const block of blocks) {
    const { type, name, body } = block;
    switch (type) {
      case "theme":
        themes.push({ name: name ?? "", properties: parseIndentedKV(body) });
        break;
      case "rel":
        relationships.push(...parseRelationships(body));
        break;
      case "struct":
        structure = { properties: parseIndentedKV(body) };
        break;
      case "concept":
        concepts.push({
          name: name ?? "",
          properties: parseIndentedKV(body),
        });
        break;
      case "facts":
      case "fact":
        facts = { entries: parseIndentedKV(body) };
        break;
    }
  }

  return { themes, relationships, structure, concepts, facts };
}

/** Parse Tier-2 section: detect @block types, parse prefixed items */
function parseTier2(text: string): MkfTier2 {
  const blocks = splitBlocks(text);
  const insights: MkfInsight[] = [];
  const questions: MkfQuestion[] = [];
  const connections: MkfConnection[] = [];
  const frameworks: MkfFramework[] = [];

  for (const block of blocks) {
    const { type, name, body } = block;
    switch (type) {
      case "insights":
        insights.push(...parseInsights(body));
        break;
      case "questions":
        questions.push(...parseQuestions(body));
        break;
      case "connections":
        connections.push(...parseConnections(body));
        break;
      case "fw":
        frameworks.push({
          name: name ?? "",
          properties: parseIndentedKV(body),
        });
        break;
    }
  }

  return { insights, questions, connections, frameworks };
}

/** Parse Meta section */
function parseMeta(text: string): MkfMeta {
  // Meta may be inside a @meta block or just raw key-value
  const blocks = splitBlocks(text);
  let kv: Record<string, string>;

  if (blocks.length > 0 && blocks[0].type === "meta") {
    kv = parseIndentedKV(blocks[0].body);
  } else {
    // Try raw key-value parse
    kv = parseIndentedKV(nonEmptyLines(text));
  }

  return {
    session: kv["session"] ?? "",
    chaptersRead: kv["chapters_read"] ?? "",
    confidence: parseFloat(kv["confidence"] ?? "0"),
    compressionRatio: kv["compression_ratio"] ?? "",
    needsReread: kv["needs_reread"],
    distilledFrom: kv["distilled_from"],
    format: kv["format"] ?? "",
  };
}

// --- Block parsing helpers ---

interface ParsedBlock {
  type: string;
  name?: string;
  body: string[];
}

/** Split text into @-prefixed blocks */
function splitBlocks(text: string): ParsedBlock[] {
  const lines = text.split("\n");
  const blocks: ParsedBlock[] = [];
  let current: ParsedBlock | null = null;

  for (const line of lines) {
    const blockMatch = line.match(/^@(\w+)\s*(.*)?$/);
    if (blockMatch) {
      if (current) blocks.push(current);
      current = {
        type: blockMatch[1],
        name: blockMatch[2]?.trim() || undefined,
        body: [],
      };
    } else if (current && line.trim()) {
      current.body.push(line);
    }
  }
  if (current) blocks.push(current);

  return blocks;
}

/** Parse indented key: value lines into a record */
function parseIndentedKV(lines: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();
      result[key] = value;
    }
  }
  return result;
}

/** Parse relationship lines: From →arrow→ To: annotation */
function parseRelationships(lines: string[]): MkfRelationship[] {
  const results: MkfRelationship[] = [];
  // Match: From →arrow→ To: annotation  OR  From →arrow→ To
  const relPattern = /^\s*(\S+)\s+→(\w+)→\s+(\S+?)(?::?\s+(.*))?$/;

  for (const line of lines) {
    const match = line.match(relPattern);
    if (match) {
      results.push({
        from: match[1],
        arrow: match[2],
        to: match[3],
        annotation: match[4]?.trim() ?? "",
      });
    }
  }
  return results;
}

/** Parse insight lines: ! or plain text */
function parseInsights(lines: string[]): MkfInsight[] {
  const results: MkfInsight[] = [];
  let currentText = "";
  let currentSignificant = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // New insight starts with ! or a non-indented line
    const isNewInsight = trimmed.startsWith("!") || trimmed.startsWith("! ");
    const isPlainInsight = !trimmed.startsWith(" ") && !trimmed.startsWith("\t") && !isNewInsight && trimmed.length > 0;
    const isContinuation = (trimmed.startsWith(" ") || trimmed.startsWith("\t")) && !isNewInsight && !isPlainInsight;

    if (isNewInsight) {
      if (currentText) {
        results.push({ significant: currentSignificant, text: currentText });
      }
      currentSignificant = true;
      currentText = trimmed.replace(/^!\s*/, "");
    } else if (isPlainInsight && currentText) {
      // Flush previous, start new non-significant
      results.push({ significant: currentSignificant, text: currentText });
      currentSignificant = false;
      currentText = trimmed;
    } else if (isPlainInsight) {
      currentSignificant = false;
      currentText = trimmed;
    } else if (isContinuation && currentText) {
      currentText += " " + trimmed;
    }
  }
  if (currentText) {
    results.push({ significant: currentSignificant, text: currentText });
  }
  return results;
}

/** Parse question lines: ? prefix */
function parseQuestions(lines: string[]): MkfQuestion[] {
  const results: MkfQuestion[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("?")) {
      results.push({ text: trimmed.replace(/^\?\s*/, "") });
    }
  }
  return results;
}

/** Parse connection lines: ~ prefix with target extraction */
function parseConnections(lines: string[]): MkfConnection[] {
  const results: MkfConnection[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("~")) {
      const content = trimmed.replace(/^~\s*/, "");
      // Target is everything before the first colon
      const colonIdx = content.indexOf(":");
      if (colonIdx > 0) {
        results.push({
          target: content.slice(0, colonIdx).trim(),
          text: content.slice(colonIdx + 1).trim(),
        });
      } else {
        results.push({ target: content, text: "" });
      }
    }
  }
  return results;
}

// --- Utility helpers ---

function nonEmptyLines(text: string): string[] {
  return text.split("\n").filter((l) => l.trim().length > 0);
}

function parseKeyValueLines(lines: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      result[key] = value;
    }
  }
  return result;
}
