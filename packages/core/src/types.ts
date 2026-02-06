/**
 * Core types for the Marginalia book reading engine.
 *
 * Design principles:
 * - All state is serializable to JSON (git-friendly, portable)
 * - Token counts are tracked everywhere (context budget awareness)
 * - Metadata is extensible for future use cases
 */

/** Supported input formats */
export type BookFormat = "epub" | "pdf" | "text" | "markdown";

/** A single chapter extracted from a book */
export interface Chapter {
  /** Zero-based index in reading order */
  index: number;
  /** Chapter title (from TOC or inferred from headings) */
  title: string;
  /** Clean markdown content */
  content: string;
  /** Approximate token count (cl100k_base estimate) */
  tokenCount: number;
  metadata: {
    /** Original filename within EPUB, or page range for PDF */
    source?: string;
    startPage?: number;
    endPage?: number;
    wordCount: number;
  };
}

/** A parsed book ready for reading */
export interface Book {
  /** Unique identifier (derived from title + author hash) */
  id: string;
  title: string;
  author: string;
  chapters: Chapter[];
  totalTokens: number;
  totalWords: number;
  format: BookFormat;
  metadata: {
    /** Original file path */
    sourcePath: string;
    /** ISBN if available from EPUB metadata */
    isbn?: string;
    /** Publication date if available */
    published?: string;
    /** When this book was ingested */
    ingestedAt: string;
  };
}

/** A chunk of text sized for a single context window interaction */
export interface Chunk {
  /** Which chapter this chunk belongs to */
  chapterIndex: number;
  /** Chunk index within the chapter (0 if chapter fits in one chunk) */
  chunkIndex: number;
  /** The text content */
  content: string;
  /** Approximate token count */
  tokenCount: number;
  /** Whether this is the last chunk of its chapter */
  isLastInChapter: boolean;
}

/** Configuration for the chunking engine */
export interface ChunkConfig {
  /** Maximum tokens per chunk (default: 10000) */
  maxTokens: number;
  /** Overlap tokens between consecutive chunks (default: 100) */
  overlapTokens: number;
  /** Minimum tokens for a chunk to stand alone (default: 500) */
  minTokens: number;
}

/** A reflection generated after reading a chapter */
export interface ChapterReflection {
  chapterIndex: number;
  chapterTitle: string;
  /** Core insights extracted from this chapter */
  keyInsights: string[];
  /** Questions raised by this chapter */
  questions: string[];
  /** Connections to other chapters, books, or ideas */
  connections: string[];
  /** What to watch for in upcoming chapters */
  forwardLooking: string[];
  /** Full markdown reflection text */
  rawReflection: string;
  /** When this reflection was generated */
  timestamp: string;
}

/** Persistent state for a reading session */
export interface ReadingState {
  /** Unique ID for this reading session */
  sessionId: string;
  /** Book being read */
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  /** Current position */
  currentChapter: number;
  currentChunk: number;
  totalChapters: number;
  /** Compressed, evolving summary of the book so far */
  runningSummary: string;
  /** All chapter reflections generated so far */
  reflections: ChapterReflection[];
  /** Reading timestamps */
  startedAt: string;
  lastReadAt: string;
  /** Whether the book has been fully read */
  completed: boolean;
}

/** Options for generating a reading context window */
export interface ContextWindowConfig {
  /** Total available tokens (default: 200000) */
  totalBudget: number;
  /** Tokens reserved for system prompt + identity (default: 5000) */
  systemReserve: number;
  /** Tokens reserved for conversation/output (default: 100000) */
  outputReserve: number;
  /** Maximum tokens for running summary (default: 15000) */
  maxSummaryTokens: number;
  /** Maximum tokens for previous reflection (default: 8000) */
  maxReflectionTokens: number;
}

/** A bookmark snapshot for pause/resume */
export interface Bookmark {
  timestamp: string;
  type: "auto" | "pause";
  bookId: string;
  chapterIndex: number;
  chunkIndex: number;
  sessionId: string;
  mkfTokens: number;
  summaryTokens: number;
}

/** A full bookmark with state, MKF, and summary for restoration */
export interface BookmarkSnapshot extends Bookmark {
  state: ReadingState;
  mkf: string;
  summary: string;
}

/** A composed context window ready to send to the model */
export interface ReadingContext {
  /** Running summary (positioned at top for primacy effect) */
  summary: string;
  /** Previous chapter reflection (positioned in middle) */
  previousReflection?: string;
  /** Current chapter/chunk text (positioned at bottom for recency) */
  currentText: string;
  /** Total tokens used */
  totalTokens: number;
  /** Tokens remaining for conversation */
  remainingBudget: number;
}
