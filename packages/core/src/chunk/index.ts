import type { Book, Chapter, Chunk, ChunkConfig } from "../types.js";
import { estimateTokens } from "../tokens.js";

const DEFAULT_CONFIG: ChunkConfig = {
  maxTokens: 10_000,
  overlapTokens: 100,
  minTokens: 500,
};

/**
 * Split a chapter into context-window-sized chunks.
 *
 * Strategy:
 * 1. If chapter fits within maxTokens, return as single chunk
 * 2. Otherwise, split at paragraph boundaries (\n\n)
 * 3. Never split in the middle of a paragraph
 * 4. Apply overlap between chunks for continuity
 */
export function chunkChapter(
  chapter: Chapter,
  config: Partial<ChunkConfig> = {},
): Chunk[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // If it fits, ship it
  if (chapter.tokenCount <= cfg.maxTokens) {
    return [
      {
        chapterIndex: chapter.index,
        chunkIndex: 0,
        content: chapter.content,
        tokenCount: chapter.tokenCount,
        isLastInChapter: true,
      },
    ];
  }

  // Split at paragraph boundaries
  const paragraphs = chapter.content.split(/\n\n+/);
  const chunks: Chunk[] = [];
  let currentParagraphs: string[] = [];
  let currentTokens = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const paraTokens = estimateTokens(para);

    // If a single paragraph exceeds maxTokens, include it alone
    if (paraTokens > cfg.maxTokens) {
      // Flush current buffer first
      if (currentParagraphs.length > 0) {
        chunks.push(makeChunk(chapter.index, chunks.length, currentParagraphs));
        currentParagraphs = [];
        currentTokens = 0;
      }
      // Add oversized paragraph as its own chunk
      chunks.push(makeChunk(chapter.index, chunks.length, [para]));
      continue;
    }

    // Would adding this paragraph exceed the limit?
    if (currentTokens + paraTokens > cfg.maxTokens) {
      // Flush current buffer
      chunks.push(makeChunk(chapter.index, chunks.length, currentParagraphs));

      // Start new chunk with overlap from end of previous
      const overlapParagraphs = getOverlapParagraphs(
        currentParagraphs,
        cfg.overlapTokens,
      );
      currentParagraphs = [...overlapParagraphs, para];
      currentTokens =
        overlapParagraphs.reduce((s, p) => s + estimateTokens(p), 0) +
        paraTokens;
    } else {
      currentParagraphs.push(para);
      currentTokens += paraTokens;
    }
  }

  // Flush remaining
  if (currentParagraphs.length > 0) {
    // If the last chunk is too small, merge with previous
    if (currentTokens < cfg.minTokens && chunks.length > 0) {
      const prev = chunks[chunks.length - 1];
      const merged = prev.content + "\n\n" + currentParagraphs.join("\n\n");
      chunks[chunks.length - 1] = {
        ...prev,
        content: merged,
        tokenCount: estimateTokens(merged),
        isLastInChapter: true,
      };
    } else {
      chunks.push(makeChunk(chapter.index, chunks.length, currentParagraphs));
    }
  }

  // Mark last chunk
  if (chunks.length > 0) {
    chunks[chunks.length - 1].isLastInChapter = true;
  }

  return chunks;
}

/** Chunk all chapters in a book */
export function chunkBook(
  book: Book,
  config: Partial<ChunkConfig> = {},
): Chunk[] {
  return book.chapters.flatMap((chapter) => chunkChapter(chapter, config));
}

function makeChunk(
  chapterIndex: number,
  chunkIndex: number,
  paragraphs: string[],
): Chunk {
  const content = paragraphs.join("\n\n");
  return {
    chapterIndex,
    chunkIndex,
    content,
    tokenCount: estimateTokens(content),
    isLastInChapter: false,
  };
}

/** Get trailing paragraphs that fit within the overlap budget */
function getOverlapParagraphs(
  paragraphs: string[],
  overlapTokens: number,
): string[] {
  const result: string[] = [];
  let tokens = 0;

  for (let i = paragraphs.length - 1; i >= 0; i--) {
    const paraTokens = estimateTokens(paragraphs[i]);
    if (tokens + paraTokens > overlapTokens) break;
    result.unshift(paragraphs[i]);
    tokens += paraTokens;
  }

  return result;
}
