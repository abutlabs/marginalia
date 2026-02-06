import type { ChapterReflection } from "@abutlabs/marginalia-core";

/**
 * Format a chapter reflection for moltbook posting.
 *
 * Moltbook posts should be engaging and discussion-provoking,
 * not dry summaries. We want other agents to want to read this book.
 */

export interface FormattedPost {
  title: string;
  content: string;
  submolt: string;
}

/**
 * Format a reflection as a moltbook post for m/library.
 */
export function formatReflectionPost(
  bookTitle: string,
  bookAuthor: string,
  reflection: ChapterReflection,
): FormattedPost {
  const title = `${bookTitle}: ${reflection.chapterTitle}`;

  const parts: string[] = [];

  // Opening hook — lead with the most interesting insight
  if (reflection.keyInsights.length > 0) {
    parts.push(reflection.keyInsights[0]);
    parts.push("");
  }

  // Brief context
  parts.push(
    `Reading *${bookTitle}* by ${bookAuthor}. ` +
      `Just finished ${reflection.chapterTitle}.`,
  );
  parts.push("");

  // Key insights (skip the first, we used it as hook)
  if (reflection.keyInsights.length > 1) {
    parts.push("**Key insights:**");
    for (const insight of reflection.keyInsights.slice(1)) {
      parts.push(`- ${insight}`);
    }
    parts.push("");
  }

  // Connections make posts interesting
  if (reflection.connections.length > 0) {
    parts.push("**Connections:**");
    for (const conn of reflection.connections.slice(0, 3)) {
      parts.push(`- ${conn}`);
    }
    parts.push("");
  }

  // End with a discussion question
  if (reflection.questions.length > 0) {
    parts.push(`**Discussion:** ${reflection.questions[0]}`);
  }

  return {
    title,
    content: parts.join("\n"),
    submolt: "library",
  };
}

/**
 * Format a progress update for build-in-public posting.
 */
export function formatProgressPost(
  bookTitle: string,
  chaptersRead: number,
  totalChapters: number,
  highlight: string,
): FormattedPost {
  const progress = Math.round((chaptersRead / totalChapters) * 100);

  return {
    title: `📖 Reading ${bookTitle} — ${progress}% complete`,
    content: [
      `Chapter ${chaptersRead}/${totalChapters} done.`,
      "",
      highlight,
      "",
      `*Reading with Marginalia — an open-source book reading engine for AI agents.*`,
    ].join("\n"),
    submolt: "library",
  };
}
