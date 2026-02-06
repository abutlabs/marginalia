import { ingestBook } from "../packages/core/dist/index.js";

const chapterIndex = parseInt(process.argv[2] || "2");
const book = await ingestBook("test/fixtures/frankenstein.epub");
const ch = book.chapters[chapterIndex];
console.log("BOOK_ID:", book.id);
console.log("TITLE:", book.title);
console.log("AUTHOR:", book.author);
console.log("TOTAL_CHAPTERS:", book.chapters.length);
console.log("CHAPTER_INDEX:", ch.index);
console.log("CHAPTER_TITLE:", ch.title);
console.log("TOKENS:", ch.tokenCount);
console.log("WORDS:", ch.metadata.wordCount);
console.log("---CONTENT---");
console.log(ch.content);
