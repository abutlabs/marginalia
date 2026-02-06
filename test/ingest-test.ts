/**
 * Quick integration test: ingest an EPUB and print chapter info.
 * Run with: npx tsx test/ingest-test.ts
 */

import { ingestBook } from "../packages/core/dist/index.js";

const epub = process.argv[2] || "test/fixtures/frankenstein.epub";

console.log(`Ingesting: ${epub}\n`);

try {
  const book = await ingestBook(epub);

  console.log(`Title:    ${book.title}`);
  console.log(`Author:   ${book.author}`);
  console.log(`Format:   ${book.format}`);
  console.log(`Chapters: ${book.chapters.length}`);
  console.log(`Total tokens: ~${book.totalTokens.toLocaleString()}`);
  console.log(`Total words:  ~${book.totalWords.toLocaleString()}`);
  console.log();

  console.log("Table of Contents:");
  console.log("─".repeat(70));
  for (const ch of book.chapters) {
    const tokens = ch.tokenCount.toLocaleString().padStart(8);
    const words = ch.metadata.wordCount.toLocaleString().padStart(8);
    console.log(
      `  ${String(ch.index + 1).padStart(3)}. ${ch.title.slice(0, 45).padEnd(45)} ${tokens} tok  ${words} words`,
    );
  }
  console.log("─".repeat(70));

  // Show first 200 chars of first chapter as sanity check
  if (book.chapters.length > 0) {
    console.log(`\nFirst 200 chars of Chapter 1:\n`);
    console.log(book.chapters[0].content.slice(0, 200));
    console.log("...");
  }
} catch (err) {
  console.error("Ingestion failed:", err);
  process.exit(1);
}
