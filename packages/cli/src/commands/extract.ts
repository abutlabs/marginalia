import { resolve } from "node:path";
import { ingestBook } from "@marginalia/core";

export async function extract(
  filePath: string,
  chapterIndex: number,
): Promise<void> {
  const absPath = resolve(filePath);
  const book = await ingestBook(absPath);

  if (chapterIndex < 0 || chapterIndex >= book.chapters.length) {
    console.error(
      `Error: chapter index ${chapterIndex} out of range (0-${book.chapters.length - 1})`,
    );
    process.exit(1);
  }

  const chapter = book.chapters[chapterIndex];
  console.log(chapter.content);
}
