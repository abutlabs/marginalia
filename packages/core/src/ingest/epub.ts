import JSZip from "jszip";
import { parseDocument } from "htmlparser2";
import { textContent } from "domutils";
import type { Chapter } from "../types.js";
import { estimateTokens } from "../tokens.js";

interface EpubResult {
  title: string;
  author: string;
  chapters: Chapter[];
}

/** Parse OPF metadata for title and author */
function parseOpfMetadata(opfXml: string): { title: string; author: string } {
  const doc = parseDocument(opfXml, { xmlMode: true });
  let title = "Untitled";
  let author = "Unknown";

  function walk(nodes: any[]): void {
    for (const node of nodes) {
      if (node.type === "tag") {
        const localName = node.name.split(":").pop()?.toLowerCase();
        if (localName === "title" && !title.includes("Untitled") === false) {
          const text = textContent(node).trim();
          if (text) title = text;
        }
        if (localName === "creator") {
          const text = textContent(node).trim();
          if (text) author = text;
        }
        if (node.children) walk(node.children);
      }
    }
  }

  walk(doc.children as any[]);
  // Fix the title extraction — always take the first dc:title found
  title = "Untitled";
  author = "Unknown";
  walk(doc.children as any[]);

  return { title, author };
}

/** Extract spine reading order from OPF */
function parseSpine(
  opfXml: string,
): Array<{ id: string; idref: string; href: string }> {
  const items: Map<string, string> = new Map();
  const spineOrder: string[] = [];

  const doc = parseDocument(opfXml, { xmlMode: true });

  function walk(nodes: any[]): void {
    for (const node of nodes) {
      if (node.type === "tag") {
        const localName = node.name.split(":").pop()?.toLowerCase();
        if (localName === "item") {
          const id = node.attribs?.id;
          const href = node.attribs?.href;
          const mediaType = node.attribs?.["media-type"];
          if (
            id &&
            href &&
            (mediaType?.includes("html") || mediaType?.includes("xml"))
          ) {
            items.set(id, href);
          }
        }
        if (localName === "itemref") {
          const idref = node.attribs?.idref;
          if (idref) spineOrder.push(idref);
        }
        if (node.children) walk(node.children);
      }
    }
  }

  walk(doc.children as any[]);

  return spineOrder
    .filter((idref) => items.has(idref))
    .map((idref) => ({
      id: idref,
      idref,
      href: items.get(idref)!,
    }));
}

/** Strip HTML tags and extract clean text from XHTML content */
function htmlToMarkdown(html: string): string {
  const doc = parseDocument(html);
  const parts: string[] = [];

  function walk(nodes: any[]): void {
    for (const node of nodes) {
      if (node.type === "text") {
        parts.push(node.data);
      } else if (node.type === "tag") {
        const name = node.name.toLowerCase();

        // Block elements get newlines
        if (["p", "div", "br", "li"].includes(name)) {
          parts.push("\n");
        }
        if (name.match(/^h[1-6]$/)) {
          const level = parseInt(name[1]);
          parts.push("\n" + "#".repeat(level) + " ");
        }

        if (node.children) walk(node.children);

        if (["p", "div", "li", "blockquote"].includes(name)) {
          parts.push("\n");
        }
        if (name.match(/^h[1-6]$/)) {
          parts.push("\n");
        }
      }
    }
  }

  walk(doc.children as any[]);

  // Clean up excessive whitespace while preserving paragraph breaks
  return parts
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Extract chapter title from XHTML content (first heading) */
function extractTitle(html: string): string | null {
  const doc = parseDocument(html);

  function findHeading(nodes: any[]): string | null {
    for (const node of nodes) {
      if (node.type === "tag" && node.name.match(/^h[1-3]$/i)) {
        return textContent(node).trim();
      }
      if (node.children) {
        const found = findHeading(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  return findHeading(doc.children as any[]);
}

/**
 * Parse an EPUB file buffer into structured chapters.
 */
export async function parseEpub(buffer: Buffer): Promise<EpubResult> {
  const zip = await JSZip.loadAsync(buffer);

  // Find the OPF file (usually content.opf or package.opf)
  let opfPath: string | null = null;
  let opfContent: string | null = null;

  // Check container.xml first (standard EPUB location)
  const containerFile = zip.file("META-INF/container.xml");
  if (containerFile) {
    const containerXml = await containerFile.async("string");
    const rootfileMatch = containerXml.match(/full-path="([^"]+\.opf)"/);
    if (rootfileMatch) {
      opfPath = rootfileMatch[1];
    }
  }

  // Fallback: search for .opf file
  if (!opfPath) {
    for (const path of Object.keys(zip.files)) {
      if (path.endsWith(".opf")) {
        opfPath = path;
        break;
      }
    }
  }

  if (!opfPath) {
    throw new Error("Could not find OPF manifest in EPUB");
  }

  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error(`OPF file not found at ${opfPath}`);
  }
  opfContent = await opfFile.async("string");

  // Parse metadata
  const { title, author } = parseOpfMetadata(opfContent);

  // Parse spine (reading order)
  const spine = parseSpine(opfContent);

  // Resolve paths relative to OPF directory
  const opfDir = opfPath.includes("/")
    ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1)
    : "";

  // Extract chapters in reading order
  const chapters: Chapter[] = [];

  for (let i = 0; i < spine.length; i++) {
    const item = spine[i];
    const fullPath = opfDir + item.href;
    const file = zip.file(fullPath);

    if (!file) continue;

    const html = await file.async("string");
    const content = htmlToMarkdown(html);

    // Skip very short content (likely copyright pages, blank pages)
    if (content.length < 100) continue;

    const chapterTitle =
      extractTitle(html) || `Chapter ${chapters.length + 1}`;
    const wordCount = content.split(/\s+/).length;

    chapters.push({
      index: chapters.length,
      title: chapterTitle,
      content,
      tokenCount: estimateTokens(content),
      metadata: {
        source: item.href,
        wordCount,
      },
    });
  }

  return { title, author, chapters };
}
