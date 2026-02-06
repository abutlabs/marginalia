import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { Book, ReadingState, ChapterReflection } from "../types.js";

/**
 * Create a new reading session for a book.
 */
export function createSession(book: Book): ReadingState {
  return {
    sessionId: randomUUID(),
    bookId: book.id,
    bookTitle: book.title,
    bookAuthor: book.author,
    currentChapter: 0,
    currentChunk: 0,
    totalChapters: book.chapters.length,
    runningSummary: "",
    reflections: [],
    startedAt: new Date().toISOString(),
    lastReadAt: new Date().toISOString(),
    completed: false,
  };
}

/**
 * Load a reading session from a JSON file.
 */
export async function loadSession(filePath: string): Promise<ReadingState> {
  const content = await readFile(filePath, "utf-8");
  return JSON.parse(content) as ReadingState;
}

/**
 * Save a reading session to a JSON file.
 */
export async function saveSession(
  state: ReadingState,
  filePath: string,
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const content = JSON.stringify(state, null, 2);
  await writeFile(filePath, content, "utf-8");
}

/**
 * Advance reading position after processing a chunk.
 * Returns updated state (does not mutate input).
 */
export function advancePosition(
  state: ReadingState,
  opts: {
    /** Move to next chapter (after finishing all chunks in current) */
    nextChapter?: boolean;
    /** Move to next chunk within current chapter */
    nextChunk?: boolean;
    /** Updated running summary */
    runningSummary?: string;
    /** New reflection to add */
    reflection?: ChapterReflection;
  },
): ReadingState {
  const updated = { ...state, lastReadAt: new Date().toISOString() };

  if (opts.runningSummary !== undefined) {
    updated.runningSummary = opts.runningSummary;
  }

  if (opts.reflection) {
    updated.reflections = [...state.reflections, opts.reflection];
  }

  if (opts.nextChapter) {
    updated.currentChapter = state.currentChapter + 1;
    updated.currentChunk = 0;
    if (updated.currentChapter >= state.totalChapters) {
      updated.completed = true;
    }
  } else if (opts.nextChunk) {
    updated.currentChunk = state.currentChunk + 1;
  }

  return updated;
}
