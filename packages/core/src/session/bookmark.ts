/**
 * Bookmark operations for pause/resume reading sessions.
 *
 * Bookmarks snapshot the full reading state (including MKF and summary)
 * so a session can be restored exactly where it left off.
 */

import type { ReadingState, Bookmark, BookmarkSnapshot } from "../types.js";
import type { LocalStorage } from "./storage.js";
import { estimateTokens } from "../tokens.js";

/** Create a bookmark from the current reading state */
export async function createBookmark(
  storage: LocalStorage,
  bookId: string,
  state: ReadingState,
  type: "auto" | "pause",
): Promise<string> {
  const mkf = await storage.loadMkf(bookId);
  const summary = await storage.loadSummary(bookId);

  const snapshot: BookmarkSnapshot = {
    timestamp: new Date().toISOString(),
    type,
    bookId,
    chapterIndex: state.currentChapter,
    chunkIndex: state.currentChunk,
    sessionId: state.sessionId,
    mkfTokens: estimateTokens(mkf),
    summaryTokens: estimateTokens(summary),
    state,
    mkf,
    summary,
  };

  return storage.saveBookmark(bookId, snapshot);
}

/** List bookmarks for a book, newest first */
export async function listBookmarks(
  storage: LocalStorage,
  bookId: string,
): Promise<Bookmark[]> {
  const filenames = await storage.listBookmarks(bookId);
  const bookmarks: Bookmark[] = [];

  for (const filename of filenames) {
    const snapshot = await storage.loadBookmark(bookId, filename);
    if (snapshot) {
      // Return just the Bookmark fields (not the full snapshot with state/mkf/summary)
      const { state: _, mkf: _m, summary: _s, ...bookmark } = snapshot;
      bookmarks.push(bookmark);
    }
  }

  return bookmarks;
}

/** Load a full bookmark snapshot by timestamp prefix */
export async function loadBookmark(
  storage: LocalStorage,
  bookId: string,
  timestampPrefix: string,
): Promise<BookmarkSnapshot | null> {
  const filenames = await storage.listBookmarks(bookId);
  const match = filenames.find((f) => f.startsWith(timestampPrefix));
  if (!match) return null;
  return storage.loadBookmark(bookId, match);
}
