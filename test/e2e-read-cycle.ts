/**
 * End-to-end test: Full read-reflect-save cycle.
 *
 * Simulates what the /read-book skill does:
 * 1. Ingest a book
 * 2. Create a session
 * 3. Build a context window for chapter 1
 * 4. Simulate a reflection (in real use, the LLM generates this)
 * 5. Save state, summary, and reflection to .marginalia/
 * 6. Advance to chapter 2, build context with carry-forward summary
 * 7. Verify everything persists correctly
 *
 * Run with: npx tsx test/e2e-read-cycle.ts
 */

import { rm } from "node:fs/promises";
import { join } from "node:path";
import {
  ingestBook,
  createSession,
  advancePosition,
  buildReadingContext,
  chunkChapter,
  LocalStorage,
} from "../packages/core/dist/index.js";
import type { ChapterReflection } from "../packages/core/dist/index.js";

const EPUB = "test/fixtures/frankenstein.epub";
const MARGINALIA_DIR = "test/.marginalia-test";

async function main() {
  // Clean up from previous runs
  await rm(MARGINALIA_DIR, { recursive: true, force: true });

  console.log("=== MARGINALIA END-TO-END TEST ===\n");

  // 1. Ingest
  console.log("1. Ingesting book...");
  const book = await ingestBook(EPUB);
  console.log(`   ${book.title} by ${book.author}`);
  console.log(`   ${book.chapters.length} chapters, ~${book.totalTokens.toLocaleString()} tokens\n`);

  // 2. Create session + storage
  console.log("2. Creating session...");
  const storage = new LocalStorage(MARGINALIA_DIR);
  await storage.init(book.id);
  await storage.saveBookMeta(book);
  let state = createSession(book);
  await storage.saveState(state);
  console.log(`   Session ${state.sessionId.slice(0, 8)}...`);
  console.log(`   Storage: ${MARGINALIA_DIR}/${book.id}/\n`);

  // 3. Build context for chapter 1 (skip preamble, start at Letter 1 which is index 2)
  const readChapter = 2; // Letter 1
  console.log(`3. Building context for: ${book.chapters[readChapter].title}`);
  const chunks = chunkChapter(book.chapters[readChapter]);
  console.log(`   ${chunks.length} chunk(s), ${chunks[0].tokenCount} tokens`);

  const context1 = buildReadingContext(state, chunks[0].content);
  console.log(`   Context window: ${context1.totalTokens.toLocaleString()} tokens used`);
  console.log(`   Remaining budget: ${context1.remainingBudget.toLocaleString()} tokens`);
  console.log(`   Summary: ${context1.summary ? context1.summary.length + " chars" : "(empty — first chapter)"}`);
  console.log(`   Previous reflection: ${context1.previousReflection || "(none — first chapter)"}\n`);

  // 4. Simulate a reflection (in real use, LLM generates this)
  console.log("4. Simulating reflection...");
  const reflection1: ChapterReflection = {
    chapterIndex: readChapter,
    chapterTitle: book.chapters[readChapter].title,
    keyInsights: [
      "Walton's ambition mirrors Frankenstein's — both seek forbidden knowledge at the cost of human connection",
      "The epistolary format establishes multiple layers of narration, each potentially unreliable",
      "The Arctic setting as a liminal space between the known and unknown world",
    ],
    questions: [
      "Is Walton meant to be a parallel or a foil to Frankenstein?",
      "How does the letter format affect our trust in the narrative?",
    ],
    connections: [
      "Walton's loneliness echoes the creature's isolation later in the novel",
      "The Romantic era's fascination with polar exploration as metaphor for intellectual overreach",
    ],
    forwardLooking: [
      "Watch for how Walton's character develops — does he learn from Frankenstein's story?",
      "The nested narration structure may deepen as Frankenstein tells his story",
    ],
    rawReflection:
      "Letter 1 establishes the frame narrative through Robert Walton's correspondence " +
      "with his sister Margaret. Walton is immediately sympathetic — lonely, ambitious, " +
      "yearning for a companion who can understand his aspirations. His Arctic expedition " +
      "is driven by the same Promethean impulse that will animate Frankenstein's work: " +
      "the desire to penetrate nature's secrets regardless of cost.\n\n" +
      "What strikes me most is the theme of isolation. Walton writes that he has no friend, " +
      "no one to temper his ambition with gentle wisdom. This loneliness will echo through " +
      "the entire novel — in Frankenstein's self-imposed exile and especially in the creature's " +
      "desperate search for connection. Shelley is establishing that the real horror is not " +
      "the monster, but the absence of human bonds.",
    timestamp: new Date().toISOString(),
  };

  // 5. Save everything
  console.log("5. Saving state, summary, and reflection...");

  const summary1 =
    "# Frankenstein — Running Summary\n\n" +
    "## Letters (Walton's Frame Narrative)\n\n" +
    "Robert Walton writes to his sister Margaret from an Arctic expedition. " +
    "He is driven by ambition to reach the North Pole and discover unknown lands. " +
    "His deepest pain is loneliness — he yearns for an intellectual equal. " +
    "The epistolary format creates layers of narration. Walton's Promethean ambition " +
    "foreshadows Frankenstein's, and his isolation mirrors what will become the " +
    "creature's central tragedy.";

  state = advancePosition(state, {
    nextChapter: false,
    runningSummary: summary1,
    reflection: reflection1,
  });
  // Move to next chapter
  state = advancePosition(state, { nextChapter: true });

  await storage.saveState(state);
  await storage.saveSummary(book.id, summary1);
  await storage.saveReflection(book.id, reflection1);

  console.log(`   State saved (now at chapter ${state.currentChapter})`);
  console.log(`   Summary: ${summary1.length} chars`);
  console.log(`   Reflection saved: chapter-${String(readChapter + 1).padStart(2, "0")}.md\n`);

  // 6. Build context for next chapter with carry-forward
  const nextChapter = state.currentChapter;
  console.log(`6. Building context for: ${book.chapters[nextChapter].title}`);
  const chunks2 = chunkChapter(book.chapters[nextChapter]);

  const context2 = buildReadingContext(state, chunks2[0].content);
  console.log(`   Context window: ${context2.totalTokens.toLocaleString()} tokens used`);
  console.log(`   Remaining budget: ${context2.remainingBudget.toLocaleString()} tokens`);
  console.log(`   Summary: ${context2.summary.length} chars (carry-forward from Letter 1)`);
  console.log(`   Previous reflection: ${context2.previousReflection ? context2.previousReflection.length + " chars" : "(none)"}\n`);

  // 7. Verify persistence
  console.log("7. Verifying persistence...");
  const loadedState = await storage.loadState(book.id);
  const loadedSummary = await storage.loadSummary(book.id);
  const loadedReflection = await storage.loadReflection(book.id, readChapter);

  const checks = [
    ["State loaded", loadedState.sessionId === state.sessionId],
    ["Position correct", loadedState.currentChapter === nextChapter],
    ["Summary persisted", loadedSummary.length > 0],
    ["Reflection persisted", loadedReflection !== null],
    ["Reflection has insights", loadedReflection?.includes("Walton's ambition") ?? false],
    ["Book list works", (await storage.listBooks()).length > 0],
    ["Has state check", await storage.hasState(book.id)],
    ["Context has summary", context2.summary.length > 0],
    ["Context has prev reflection", (context2.previousReflection?.length ?? 0) > 0],
    ["Budget not exceeded", context2.remainingBudget > 100_000],
  ];

  let passed = 0;
  for (const [name, ok] of checks) {
    console.log(`   ${ok ? "✓" : "✗"} ${name}`);
    if (ok) passed++;
  }

  console.log(`\n=== ${passed}/${checks.length} checks passed ===\n`);

  if (passed === checks.length) {
    console.log("Full read-reflect-save cycle works. Ready for /read-book skill.");
  } else {
    console.log("Some checks failed — investigate before proceeding.");
    process.exit(1);
  }

  // Clean up
  await rm(MARGINALIA_DIR, { recursive: true, force: true });
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
