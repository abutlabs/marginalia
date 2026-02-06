import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ingestBook } from "@abutlabs/marginalia-core";

export async function ingest(filePath: string): Promise<void> {
  const absPath = resolve(filePath);
  const book = await ingestBook(absPath);

  // Output a slim version without chapter content (just metadata + token counts)
  const slim = {
    id: book.id,
    title: book.title,
    author: book.author,
    format: book.format,
    totalTokens: book.totalTokens,
    totalWords: book.totalWords,
    sourcePath: book.metadata.sourcePath,
    chapters: book.chapters.map((ch) => ({
      index: ch.index,
      title: ch.title,
      tokenCount: ch.tokenCount,
    })),
  };

  console.log(JSON.stringify(slim, null, 2));
}
