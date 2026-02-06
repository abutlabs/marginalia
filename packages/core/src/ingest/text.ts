import type { Chapter } from "../types.js";
import type { BookFormat } from "../types.js";
import { estimateTokens } from "../tokens.js";

interface TextResult {
  title: string | null;
  author: string | null;
  chapters: Chapter[];
}

/**
 * Split plain text or markdown into chapters.
 *
 * Strategies:
 * 1. For markdown: split on top-level headings (# or ##)
 * 2. For plain text: split on "Chapter" patterns or large whitespace gaps
 * 3. Fallback: treat entire content as one chapter
 */
export function parsePlainText(
  content: string,
  format: BookFormat,
): TextResult {
  let title: string | null = null;
  let author: string | null = null;

  if (format === "markdown") {
    return parseMarkdown(content);
  }

  // Try to detect chapter boundaries in plain text
  const chapterPattern =
    /^(?:chapter|part|book|section)\s+(?:\d+|[ivxlcdm]+|[a-z])\b[.:)—\-\s]/im;
  const lines = content.split("\n");

  // Find chapter start lines
  const chapterStarts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (chapterPattern.test(lines[i].trim())) {
      chapterStarts.push(i);
    }
  }

  if (chapterStarts.length >= 2) {
    // We found chapter markers
    return buildChaptersFromSplits(lines, chapterStarts);
  }

  // Fallback: single chapter
  const wordCount = content.split(/\s+/).length;
  return {
    title,
    author,
    chapters: [
      {
        index: 0,
        title: "Full Text",
        content: content.trim(),
        tokenCount: estimateTokens(content),
        metadata: { wordCount },
      },
    ],
  };
}

function parseMarkdown(content: string): TextResult {
  const lines = content.split("\n");
  const headingStarts: Array<{ line: number; title: string; level: number }> =
    [];

  // Find top-level headings (# or ##)
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,2})\s+(.+)/);
    if (match) {
      headingStarts.push({
        line: i,
        title: match[2].trim(),
        level: match[1].length,
      });
    }
  }

  // Extract title from first # heading if present
  let title: string | null = null;
  if (headingStarts.length > 0 && headingStarts[0].level === 1) {
    title = headingStarts[0].title;
  }

  if (headingStarts.length < 2) {
    // Not enough headings to split
    const wordCount = content.split(/\s+/).length;
    return {
      title,
      author: null,
      chapters: [
        {
          index: 0,
          title: title || "Full Text",
          content: content.trim(),
          tokenCount: estimateTokens(content),
          metadata: { wordCount },
        },
      ],
    };
  }

  // Split at headings
  const chapters: Chapter[] = [];
  for (let i = 0; i < headingStarts.length; i++) {
    const start = headingStarts[i].line;
    const end =
      i + 1 < headingStarts.length ? headingStarts[i + 1].line : lines.length;
    const chapterContent = lines.slice(start, end).join("\n").trim();
    const wordCount = chapterContent.split(/\s+/).length;

    // Skip very short sections
    if (wordCount < 20) continue;

    chapters.push({
      index: chapters.length,
      title: headingStarts[i].title,
      content: chapterContent,
      tokenCount: estimateTokens(chapterContent),
      metadata: { wordCount },
    });
  }

  return { title, author: null, chapters };
}

function buildChaptersFromSplits(
  lines: string[],
  starts: number[],
): TextResult {
  const chapters: Chapter[] = [];

  for (let i = 0; i < starts.length; i++) {
    const startLine = starts[i];
    const endLine = i + 1 < starts.length ? starts[i + 1] : lines.length;
    const chapterLines = lines.slice(startLine, endLine);
    const content = chapterLines.join("\n").trim();
    const title = lines[startLine].trim();
    const wordCount = content.split(/\s+/).length;

    chapters.push({
      index: i,
      title,
      content,
      tokenCount: estimateTokens(content),
      metadata: { wordCount },
    });
  }

  return { title: null, author: null, chapters };
}
