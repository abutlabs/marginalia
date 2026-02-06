import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { createHash } from "node:crypto";
import type { Book, BookFormat, Chapter } from "../types.js";
import { estimateTokens } from "../tokens.js";
import { parseEpub } from "./epub.js";
import { parsePlainText } from "./text.js";

/** Detect book format from file extension */
function detectFormat(filePath: string): BookFormat {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case ".epub":
      return "epub";
    case ".pdf":
      return "pdf";
    case ".md":
    case ".markdown":
      return "markdown";
    case ".txt":
    default:
      return "text";
  }
}

/** Generate a stable book ID from title and author */
function generateBookId(title: string, author: string): string {
  const hash = createHash("sha256")
    .update(`${title}:${author}`)
    .digest("hex")
    .slice(0, 12);
  return hash;
}

/**
 * Ingest a book from a file path.
 * Returns a structured Book object with chapters extracted and token counts computed.
 */
export async function ingestBook(filePath: string): Promise<Book> {
  const format = detectFormat(filePath);

  let title: string;
  let author: string;
  let chapters: Chapter[];

  switch (format) {
    case "epub": {
      const buffer = await readFile(filePath);
      const result = await parseEpub(buffer);
      title = result.title;
      author = result.author;
      chapters = result.chapters;
      break;
    }
    case "pdf": {
      // PDF support requires external tooling (pdftotext)
      // For now, fall through to text parsing of extracted content
      throw new Error(
        "PDF ingestion not yet implemented. Convert to EPUB or text first, " +
          "or use: pdftotext input.pdf output.txt",
      );
    }
    case "markdown":
    case "text": {
      const content = await readFile(filePath, "utf-8");
      const result = parsePlainText(content, format);
      title = result.title || basename(filePath, extname(filePath));
      author = result.author || "Unknown";
      chapters = result.chapters;
      break;
    }
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  const totalTokens = chapters.reduce((sum, ch) => sum + ch.tokenCount, 0);
  const totalWords = chapters.reduce(
    (sum, ch) => sum + ch.metadata.wordCount,
    0,
  );

  return {
    id: generateBookId(title, author),
    title,
    author,
    chapters,
    totalTokens,
    totalWords,
    format,
    metadata: {
      sourcePath: filePath,
      ingestedAt: new Date().toISOString(),
    },
  };
}
