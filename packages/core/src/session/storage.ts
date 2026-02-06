import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { ReadingState, ChapterReflection, Book } from "../types.js";

/**
 * Filesystem-based storage for reading sessions.
 * Manages the .marginalia/ directory structure:
 *
 *   .marginalia/
 *   └── <book-id>/
 *       ├── book.json          # Cached book metadata (no full content)
 *       ├── state.json         # Reading position + session data
 *       ├── summary.md         # Evolving running summary
 *       └── reflections/
 *           ├── chapter-01.md
 *           ├── chapter-02.md
 *           └── ...
 */

export class LocalStorage {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private bookDir(bookId: string): string {
    return join(this.baseDir, bookId);
  }

  /** Ensure the directory structure exists for a book */
  async init(bookId: string): Promise<void> {
    await mkdir(join(this.bookDir(bookId), "reflections"), { recursive: true });
  }

  /** Save book metadata (TOC, token counts — not full chapter text) */
  async saveBookMeta(book: Book): Promise<void> {
    const meta = {
      id: book.id,
      title: book.title,
      author: book.author,
      format: book.format,
      totalTokens: book.totalTokens,
      totalWords: book.totalWords,
      chapters: book.chapters.map((ch) => ({
        index: ch.index,
        title: ch.title,
        tokenCount: ch.tokenCount,
        wordCount: ch.metadata.wordCount,
        source: ch.metadata.source,
      })),
      metadata: book.metadata,
    };
    await writeFile(
      join(this.bookDir(book.id), "book.json"),
      JSON.stringify(meta, null, 2),
      "utf-8",
    );
  }

  /** Save reading state */
  async saveState(state: ReadingState): Promise<void> {
    await writeFile(
      join(this.bookDir(state.bookId), "state.json"),
      JSON.stringify(state, null, 2),
      "utf-8",
    );
  }

  /** Load reading state */
  async loadState(bookId: string): Promise<ReadingState> {
    const content = await readFile(
      join(this.bookDir(bookId), "state.json"),
      "utf-8",
    );
    return JSON.parse(content) as ReadingState;
  }

  /** Save or update the running summary */
  async saveSummary(bookId: string, summary: string): Promise<void> {
    await writeFile(
      join(this.bookDir(bookId), "summary.md"),
      summary,
      "utf-8",
    );
  }

  /** Load the running summary */
  async loadSummary(bookId: string): Promise<string> {
    try {
      return await readFile(
        join(this.bookDir(bookId), "summary.md"),
        "utf-8",
      );
    } catch {
      return "";
    }
  }

  /** Save a chapter reflection as markdown */
  async saveReflection(
    bookId: string,
    reflection: ChapterReflection,
  ): Promise<void> {
    const filename = `chapter-${String(reflection.chapterIndex + 1).padStart(2, "0")}.md`;
    const content = formatReflectionMarkdown(reflection);
    await writeFile(
      join(this.bookDir(bookId), "reflections", filename),
      content,
      "utf-8",
    );
  }

  /** Load a chapter reflection */
  async loadReflection(
    bookId: string,
    chapterIndex: number,
  ): Promise<string | null> {
    const filename = `chapter-${String(chapterIndex + 1).padStart(2, "0")}.md`;
    try {
      return await readFile(
        join(this.bookDir(bookId), "reflections", filename),
        "utf-8",
      );
    } catch {
      return null;
    }
  }

  /** List all book IDs that have reading state */
  async listBooks(): Promise<string[]> {
    try {
      const entries = await readdir(this.baseDir, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }

  /** Check if a book has existing state */
  async hasState(bookId: string): Promise<boolean> {
    try {
      await readFile(join(this.bookDir(bookId), "state.json"), "utf-8");
      return true;
    } catch {
      return false;
    }
  }
}

/** Format a reflection as a readable markdown file */
function formatReflectionMarkdown(reflection: ChapterReflection): string {
  const parts: string[] = [];

  parts.push(`# ${reflection.chapterTitle}`);
  parts.push("");
  parts.push(`**Date**: ${new Date(reflection.timestamp).toLocaleDateString()}`);
  parts.push("");

  parts.push("## Key Insights");
  parts.push("");
  for (const insight of reflection.keyInsights) {
    parts.push(`- ${insight}`);
  }
  parts.push("");

  if (reflection.questions.length > 0) {
    parts.push("## Questions");
    parts.push("");
    for (const q of reflection.questions) {
      parts.push(`- ${q}`);
    }
    parts.push("");
  }

  if (reflection.connections.length > 0) {
    parts.push("## Connections");
    parts.push("");
    for (const c of reflection.connections) {
      parts.push(`- ${c}`);
    }
    parts.push("");
  }

  if (reflection.forwardLooking.length > 0) {
    parts.push("## Watch For Next");
    parts.push("");
    for (const f of reflection.forwardLooking) {
      parts.push(`- ${f}`);
    }
    parts.push("");
  }

  parts.push("## Reflection");
  parts.push("");
  parts.push(reflection.rawReflection);
  parts.push("");

  return parts.join("\n");
}
