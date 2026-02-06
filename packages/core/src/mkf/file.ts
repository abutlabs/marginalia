/**
 * .mkf file format: envelope operations.
 *
 * An .mkf file wraps MKF content in an envelope with:
 *   %MKF-1.0         — format identification (like %PDF-1.7)
 *   %sha256:<hash>   — integrity hash of content below %---
 *   %---              — envelope delimiter
 *   <MKF content>    — the actual knowledge artifact
 */

import { createHash } from "node:crypto";
import type { MkfDocument, MkfFileEnvelope } from "./types.js";
import { parseMkf } from "./parser.js";
import { serializeMkf } from "./serializer.js";

const MKF_MAGIC = "%MKF-1.0";
const ENVELOPE_DELIMITER = "%---";

/** Parse a .mkf file (with envelope) into its components */
export function parseMkfFile(raw: string): MkfFileEnvelope {
  const lines = raw.split("\n");
  let version = "";
  let sha256: string | undefined;
  let delimiterIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === ENVELOPE_DELIMITER) {
      delimiterIdx = i;
      break;
    }
    if (line.startsWith("%MKF-")) {
      version = line.slice(5); // "1.0"
    } else if (line.startsWith("%sha256:")) {
      sha256 = line.slice(8);
    }
  }

  // If no envelope found, treat entire file as raw MKF content
  if (delimiterIdx < 0) {
    return { version: "", content: raw };
  }

  const content = lines.slice(delimiterIdx + 1).join("\n");
  return { version, sha256, content };
}

/** Serialize an MkfDocument into a complete .mkf file with envelope */
export function serializeMkfFile(doc: MkfDocument, reader?: string): string {
  // Set reader on header if provided and not already set
  const docWithReader: MkfDocument = reader && !doc.header.reader
    ? { ...doc, header: { ...doc.header, reader } }
    : doc;

  const content = serializeMkf(docWithReader);
  const hash = createHash("sha256").update(content).digest("hex");

  return [
    MKF_MAGIC,
    `%sha256:${hash}`,
    ENVELOPE_DELIMITER,
    content,
  ].join("\n");
}

/** Validate the integrity of a .mkf file */
export function validateMkfFile(raw: string): { valid: boolean; error?: string } {
  const envelope = parseMkfFile(raw);

  if (!envelope.version) {
    return { valid: false, error: "Missing %MKF version header" };
  }

  if (!envelope.version.startsWith("1.")) {
    return { valid: false, error: `Unsupported MKF version: ${envelope.version}` };
  }

  if (envelope.sha256) {
    const computed = createHash("sha256").update(envelope.content).digest("hex");
    if (computed !== envelope.sha256) {
      return { valid: false, error: "SHA-256 integrity check failed" };
    }
  }

  return { valid: true };
}

/** Generate the context injection framing for a loaded .mkf file */
export function frameMkfForContext(raw: string): string {
  const envelope = parseMkfFile(raw);
  const doc = parseMkf(envelope.content);

  const h = doc.header;
  const m = doc.meta;

  const lines = [
    `## Book Knowledge: ${h.book} by ${h.by}`,
    "",
  ];

  const metaParts: string[] = [];
  if (h.reader) metaParts.push(`Compressed by ${h.reader}`);
  if (h.read) metaParts.push(`on ${h.read}`);
  if (m.chaptersRead) metaParts.push(`${m.chaptersRead} chapters`);
  if (m.compressionRatio) metaParts.push(`Compression: ${m.compressionRatio}`);
  if (m.confidence) metaParts.push(`Confidence: ${m.confidence}`);
  if (metaParts.length > 0) {
    lines.push(metaParts.join(". ") + ".");
    lines.push("");
  }

  lines.push("### Reading Guide");
  lines.push("- Tier-1 (@theme, @rel, @struct, @concept, @facts) = structural knowledge");
  lines.push("- Tier-2 (@insights ! = significant, @questions ? = open, @connections ~ = cross-references, @fw = frameworks)");
  lines.push("");
  lines.push("### Knowledge");
  lines.push(envelope.content);

  return lines.join("\n");
}
