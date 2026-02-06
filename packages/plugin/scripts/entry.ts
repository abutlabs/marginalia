/**
 * Marginalia bundled script for Claude Code plugin.
 *
 * Subcommands:
 *   ingest <path>                 — Parse EPUB, extract chapters, create state
 *   chapter <id> <n>              — Load chapter text + context as JSON
 *   save <id> <n>                 — Save reflection + MKF from pending-save.json
 *   export <id> [--output path]   — Export finalized .mkf artifact
 *   load <path.mkf>              — Load .mkf file for context injection
 *   list                          — List .mkf files and active readings
 *   bookmark list|create|load <id> [timestamp]
 *   progress <id>                 — Print formatted progress bar
 */

import { resolve, join, basename } from "node:path";
import { readFile, writeFile, readdir } from "node:fs/promises";
import {
  ingestBook,
  createSession,
  LocalStorage,
  type ReadingState,
} from "marginalia-ai-core";
import {
  parseMkf,
  serializeMkf,
  mergeMkf,
  emptyMkf,
  parseMkfFile,
  serializeMkfFile,
  validateMkfFile,
  frameMkfForContext,
  finalizeCompression,
} from "marginalia-ai-core/mkf";
import {
  createBookmark,
  listBookmarks,
  loadBookmark,
} from "marginalia-ai-core";

const MARGINALIA_DIR = ".marginalia";

function getStorage(): LocalStorage {
  return new LocalStorage(resolve(MARGINALIA_DIR));
}

// --- Subcommand: ingest ---

async function cmdIngest(filePath: string): Promise<void> {
  const absPath = resolve(filePath);
  const book = await ingestBook(absPath);
  const storage = getStorage();
  await storage.init(book.id);
  await storage.saveBookMeta(book);

  // Extract all chapters to chapters/
  for (const chapter of book.chapters) {
    await storage.saveChapter(book.id, chapter.index, chapter.content);
  }

  // Create initial state
  const state = createSession(book);
  await storage.saveState(state);
  await storage.saveSummary(book.id, "");
  await storage.saveMkf(book.id, "");

  // Output TOC as JSON
  const toc = {
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
    })),
  };
  console.log(JSON.stringify(toc, null, 2));
}

// --- Subcommand: chapter ---

async function cmdChapter(bookId: string, chapterIndex: number): Promise<void> {
  const storage = getStorage();
  const chapterText = await storage.loadChapter(bookId, chapterIndex);
  if (!chapterText) {
    console.error(`Chapter ${chapterIndex} not found for book ${bookId}`);
    process.exit(1);
  }

  const summary = await storage.loadSummary(bookId);
  const mkf = await storage.loadMkf(bookId);

  // Try to load the most recent reflection
  let previousReflection: string | null = null;
  if (chapterIndex > 0) {
    previousReflection = await storage.loadReflection(bookId, chapterIndex - 1);
  }

  const result = {
    chapterIndex,
    text: chapterText,
    summary,
    mkf,
    previousReflection,
  };
  console.log(JSON.stringify(result, null, 2));
}

// --- Subcommand: save ---

async function cmdSave(bookId: string, chapterIndex: number): Promise<void> {
  const storage = getStorage();

  // Read pending save data from temp file
  const pendingPath = join(resolve(MARGINALIA_DIR), bookId, "pending-save.json");
  let pendingContent: string;
  try {
    pendingContent = await readFile(pendingPath, "utf-8");
  } catch {
    console.error(`No pending save found at ${pendingPath}`);
    console.error("Write the save data to this file before running save.");
    process.exit(1);
  }

  const pending = JSON.parse(pendingContent) as {
    reflection: string;
    summary: string;
    mkfExtraction: string;
  };

  // Save timestamped reflection (immutable)
  const reflectionFilename = await storage.saveTimestampedReflection(
    bookId,
    chapterIndex,
    pending.reflection,
  );

  // Also save to the standard reflection location for backward compat
  await writeFile(
    join(
      resolve(MARGINALIA_DIR),
      bookId,
      "reflections",
      `chapter-${String(chapterIndex + 1).padStart(2, "0")}.md`,
    ),
    pending.reflection,
    "utf-8",
  );

  // Update summary
  await storage.saveSummary(bookId, pending.summary);

  // Merge MKF
  const existingMkfText = await storage.loadMkf(bookId);
  const existingMkf = existingMkfText ? parseMkf(existingMkfText) : emptyMkf();
  const chapterMkf = parseMkf(pending.mkfExtraction);
  const mergedMkf = mergeMkf(existingMkf, chapterMkf);
  await storage.saveMkf(bookId, serializeMkf(mergedMkf));

  // Update state
  const state = await storage.loadState(bookId);
  const totalChapters = state.totalChapters;
  const nextChapter = chapterIndex + 1;
  const updatedState: ReadingState = {
    ...state,
    currentChapter: nextChapter,
    currentChunk: 0,
    lastReadAt: new Date().toISOString(),
    completed: nextChapter >= totalChapters,
  };
  await storage.saveState(updatedState);

  // Auto-bookmark
  await createBookmark(storage, bookId, updatedState, "auto");

  console.log(
    JSON.stringify({
      saved: true,
      reflectionFile: reflectionFilename,
      chapterIndex,
      nextChapter,
      completed: updatedState.completed,
      mkfTokens: serializeMkf(mergedMkf).length / 4,
    }),
  );
}

// --- Subcommand: bookmark ---

async function cmdBookmark(
  action: string,
  bookId: string,
  timestamp?: string,
): Promise<void> {
  const storage = getStorage();

  switch (action) {
    case "list": {
      const bookmarks = await listBookmarks(storage, bookId);
      console.log(JSON.stringify(bookmarks, null, 2));
      break;
    }
    case "create": {
      const state = await storage.loadState(bookId);
      const filename = await createBookmark(storage, bookId, state, "pause");
      console.log(JSON.stringify({ created: filename }));
      break;
    }
    case "load": {
      if (!timestamp) {
        console.error("Usage: bookmark load <book-id> <timestamp>");
        process.exit(1);
      }
      const snapshot = await loadBookmark(storage, bookId, timestamp);
      if (!snapshot) {
        console.error(`Bookmark not found: ${timestamp}`);
        process.exit(1);
      }
      // Restore state, MKF, and summary
      await storage.saveState(snapshot.state);
      await storage.saveMkf(bookId, snapshot.mkf);
      await storage.saveSummary(bookId, snapshot.summary);
      console.log(
        JSON.stringify({
          restored: true,
          chapterIndex: snapshot.chapterIndex,
          chunkIndex: snapshot.chunkIndex,
          type: snapshot.type,
        }),
      );
      break;
    }
    default:
      console.error(`Unknown bookmark action: ${action}`);
      process.exit(1);
  }
}

// --- Subcommand: progress ---

async function cmdProgress(bookId: string): Promise<void> {
  const storage = getStorage();

  let state: ReadingState;
  try {
    state = await storage.loadState(bookId);
  } catch {
    console.error(`No reading state found for book: ${bookId}`);
    process.exit(1);
  }

  const current = state.currentChapter;
  const total = state.totalChapters;
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const barWidth = 30;
  const filled = Math.round((current / total) * barWidth);
  const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);

  const mkfText = await storage.loadMkf(bookId);
  const mkfTokens = mkfText ? Math.ceil(mkfText.length / 4) : 0;
  const summaryText = await storage.loadSummary(bookId);
  const summaryTokens = summaryText ? Math.ceil(summaryText.length / 4) : 0;

  const lines = [
    `${state.bookTitle} by ${state.bookAuthor}`,
    `${bar} ${current}/${total} (${pct}%)`,
    `Session: ${state.sessionId.slice(0, 8)}`,
    `MKF: ~${mkfTokens} tokens | Summary: ~${summaryTokens} tokens`,
    `Last read: ${state.lastReadAt}`,
    state.completed ? "Status: COMPLETED" : `Next: Chapter ${current + 1}`,
  ];

  console.log(lines.join("\n"));
}

// --- Subcommand: export ---

async function cmdExport(bookId: string, args: string[]): Promise<void> {
  const storage = getStorage();

  let state: ReadingState;
  try {
    state = await storage.loadState(bookId);
  } catch {
    console.error(`No reading state found for book: ${bookId}`);
    process.exit(1);
  }

  if (!state.completed) {
    console.error(
      `Warning: Book not fully read (${state.currentChapter}/${state.totalChapters}). Exporting partial MKF.`,
    );
  }

  const mkfText = await storage.loadMkf(bookId);
  if (!mkfText) {
    console.error("No MKF data found. Read at least one chapter first.");
    process.exit(1);
  }

  // Parse, finalize compression, serialize with envelope
  const doc = parseMkf(mkfText);
  const compressed = finalizeCompression(doc);

  // Parse --output and --reader flags
  let outputPath: string | undefined;
  let reader: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output" && args[i + 1]) outputPath = args[++i];
    if (args[i] === "--reader" && args[i + 1]) reader = args[++i];
  }

  const file = serializeMkfFile(compressed, reader);

  // Default output: <title-slug>.mkf in cwd
  if (!outputPath) {
    const slug = state.bookTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    outputPath = `${slug}.mkf`;
  }

  await writeFile(resolve(outputPath), file, "utf-8");

  const envelope = parseMkfFile(file);
  console.log(
    JSON.stringify({
      exported: true,
      path: resolve(outputPath),
      sha256: envelope.sha256,
      tokens: Math.ceil(envelope.content.length / 4),
      book: state.bookTitle,
      author: state.bookAuthor,
    }),
  );
}

// --- Subcommand: load ---

async function cmdLoad(filePath: string): Promise<void> {
  const absPath = resolve(filePath);
  let raw: string;
  try {
    raw = await readFile(absPath, "utf-8");
  } catch {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  // Validate if it has an envelope
  const envelope = parseMkfFile(raw);
  if (envelope.version) {
    const validation = validateMkfFile(raw);
    if (!validation.valid) {
      console.error(`Invalid .mkf file: ${validation.error}`);
      process.exit(1);
    }
  }

  // Output framed content for context injection
  console.log(frameMkfForContext(raw));
}

// --- Subcommand: list ---

async function cmdList(): Promise<void> {
  const lines: string[] = [];

  // List .mkf files in current directory
  try {
    const entries = await readdir(resolve("."));
    const mkfFiles = entries.filter((e) => e.endsWith(".mkf")).sort();

    if (mkfFiles.length > 0) {
      lines.push("Compressed books (.mkf files):");
      for (const file of mkfFiles) {
        try {
          const raw = await readFile(resolve(file), "utf-8");
          const envelope = parseMkfFile(raw);
          const doc = parseMkf(envelope.content);
          const tokens = Math.ceil(envelope.content.length / 4);
          const reader = doc.header.reader ? ` by ${doc.header.reader}` : "";
          lines.push(
            `  ${file} — ${doc.header.book} (${doc.header.by})${reader} ~${tokens}tok`,
          );
        } catch {
          lines.push(`  ${file} — (unreadable)`);
        }
      }
    }
  } catch {
    // No cwd access, skip
  }

  // List active readings
  const storage = getStorage();
  const books = await storage.listBooks();
  if (books.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("Active readings:");
    for (const bookId of books) {
      try {
        const state = await storage.loadState(bookId);
        const pct = Math.round(
          (state.currentChapter / state.totalChapters) * 100,
        );
        const status = state.completed ? "DONE" : `${pct}%`;
        lines.push(
          `  ${state.bookTitle} (${state.bookAuthor}) — ${state.currentChapter}/${state.totalChapters} (${status})`,
        );
      } catch {
        lines.push(`  ${bookId} — (state unreadable)`);
      }
    }
  }

  if (lines.length === 0) {
    lines.push("No .mkf files or active readings found.");
  }

  console.log(lines.join("\n"));
}

// --- Main dispatcher ---

const [, , command, ...args] = process.argv;

switch (command) {
  case "ingest":
    if (!args[0]) {
      console.error("Usage: marginalia ingest <path-to-book>");
      process.exit(1);
    }
    await cmdIngest(args[0]);
    break;

  case "chapter":
    if (!args[0] || args[1] === undefined) {
      console.error("Usage: marginalia chapter <book-id> <chapter-index>");
      process.exit(1);
    }
    await cmdChapter(args[0], parseInt(args[1], 10));
    break;

  case "save":
    if (!args[0] || args[1] === undefined) {
      console.error("Usage: marginalia save <book-id> <chapter-index>");
      process.exit(1);
    }
    await cmdSave(args[0], parseInt(args[1], 10));
    break;

  case "bookmark":
    if (!args[0] || !args[1]) {
      console.error(
        "Usage: marginalia bookmark list|create|load <book-id> [timestamp]",
      );
      process.exit(1);
    }
    await cmdBookmark(args[0], args[1], args[2]);
    break;

  case "progress":
    if (!args[0]) {
      console.error("Usage: marginalia progress <book-id>");
      process.exit(1);
    }
    await cmdProgress(args[0]);
    break;

  case "export":
    if (!args[0]) {
      console.error("Usage: marginalia export <book-id> [--output path] [--reader name]");
      process.exit(1);
    }
    await cmdExport(args[0], args.slice(1));
    break;

  case "load":
    if (!args[0]) {
      console.error("Usage: marginalia load <path.mkf>");
      process.exit(1);
    }
    await cmdLoad(args[0]);
    break;

  case "list":
    await cmdList();
    break;

  default:
    console.error(
      "Usage: marginalia <ingest|chapter|save|export|load|list|bookmark|progress> [args...]",
    );
    process.exit(1);
}
