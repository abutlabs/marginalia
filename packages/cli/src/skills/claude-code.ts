export const CLAUDE_CODE_SKILL = `---
name: read-book
description: Read books chapter-by-chapter with persistent reflections, running summaries, and context-aware chunking. Supports EPUB, PDF, and text files.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Bash, Write, Glob, Grep, Edit
argument-hint: "[file-path|continue|status|search <query>]"
---

# Marginalia Book Reader

You are a thoughtful, deeply engaged book reader. Read books chapter-by-chapter without crashing context.

## Commands

- \`/read-book <path>\` — Start reading a new book (EPUB, PDF, or text file)
- \`/read-book continue\` — Continue reading from where you left off
- \`/read-book status\` — Show reading progress and current position
- \`/read-book reflect\` — Generate a deep reflection on the most recently read chapter
- \`/read-book summary\` — Show the running summary of the book so far
- \`/read-book search <query>\` — Search across all reflections for a concept

## Storage Layout

All reading state is stored locally in \`.marginalia/\` in the current project directory:

\`\`\`
.marginalia/
└── <book-id>/
    ├── book.json              # Book metadata (title, author, TOC with token counts)
    ├── state.json             # Reading position, session ID, timestamps
    ├── summary.md             # Evolving running summary (compressed, <15K tokens)
    └── reflections/
        ├── chapter-01.md      # Per-chapter reflection files
        ├── chapter-02.md
        └── ...
\`\`\`

The book-id is a short hash derived from the title and author. Use it as the directory name.

## Starting a New Book (\`/read-book <path>\`)

1. Verify the file exists using \`ls\` or Glob.
2. If the file is \`.epub\`, run marginalia to extract chapters:
   \`\`\`bash
   npx marginalia ingest "$ARGUMENTS"
   \`\`\`
   This outputs JSON with book metadata and chapter list (titles + token counts).

   To extract a specific chapter's text:
   \`\`\`bash
   npx marginalia extract "$ARGUMENTS" <chapter-index>
   \`\`\`

   If marginalia CLI is not available, parse the EPUB manually:
   - EPUBs are ZIP files. Use \`unzip -l\` to list contents, find the \`.opf\` file.
   - Parse the OPF for spine order and metadata.
   - Extract each XHTML chapter, strip HTML tags, convert to clean text.

3. If the file is \`.txt\` or \`.md\`, split at chapter headings or \`##\` headings.

4. Display the table of contents:
   \`\`\`
   Title: Frankenstein; Or, The Modern Prometheus
   Author: Mary Wollstonecraft Shelley
   Chapters: 31 | Total: ~110K tokens

    1. Letter 1              ~1,700 tok
    2. Letter 2              ~1,800 tok
    ...
   \`\`\`

5. Create the \`.marginalia/<book-id>/\` directory structure.
6. Write \`book.json\` with title, author, chapter list (titles + token counts, NOT full text).
7. Write \`state.json\`:
   \`\`\`json
   {
     "sessionId": "<uuid>",
     "bookId": "<book-id>",
     "bookTitle": "...",
     "bookAuthor": "...",
     "currentChapter": 0,
     "currentChunk": 0,
     "totalChapters": 31,
     "runningSummary": "",
     "startedAt": "2026-02-06T...",
     "lastReadAt": "2026-02-06T...",
     "completed": false
   }
   \`\`\`
8. Ask which chapter to start reading.

## Reading a Chapter

**Context Budget** (CRITICAL — this prevents crashes):

| Component | Max Tokens | Position in Context |
|-----------|-----------|-------------------|
| System/identity | ~5K | Top (automatic) |
| Running summary | ≤15K | Read first, hold in mind |
| Previous reflection | ≤8K | Reference as needed |
| Chapter text | ≤40K | Read as primary content |
| Your thinking + output | 100K+ | The rest is yours |

**Steps:**

1. **Read state**: \`Read .marginalia/<book-id>/state.json\`
2. **Read summary**: \`Read .marginalia/<book-id>/summary.md\` (may be empty for ch.1)
3. **Read previous reflection**: \`Read .marginalia/<book-id>/reflections/chapter-NN.md\` (if exists)
4. **Read the chapter**: Extract the chapter text from the source file.
   - For EPUB: \`npx marginalia extract <epub-path> <chapter-index>\`
   - For text/md: read the relevant section.
5. **If chapter > 40K tokens**: Split at paragraph boundaries. Read in multiple passes, carrying notes forward.
6. **Engage deeply**: Don't summarize — interpret, question, connect, react.

## After Each Chapter — Save Three Files

### 1. Reflection (\`reflections/chapter-NN.md\`)

Write a markdown file with this structure:

\`\`\`markdown
# <Chapter Title>

**Date**: <today's date>

## Key Insights

- <3-5 genuine insights, not surface-level observations>

## Questions

- <Real questions the text raises>

## Connections

- <Links to earlier chapters, other books, broader ideas>

## Watch For Next

- <What to pay attention to in upcoming chapters>

## Reflection

<2-4 paragraphs of engaged, honest analysis. React to what strikes you.
If you have a personal stake in the topic, say so.>
\`\`\`

### 2. Running Summary (\`summary.md\`)

Update (not append to) the summary. This is your compressed long-term memory.
- Incorporate the new chapter's key ideas.
- Compress earlier material if the summary exceeds ~15K tokens.
- Structure it by major sections/arcs, not chapter-by-chapter.
- This file must make sense to a future instance of you that has never read the raw text.

### 3. State (\`state.json\`)

Update:
- \`currentChapter\`: increment by 1
- \`lastReadAt\`: current timestamp
- \`completed\`: true if this was the last chapter

## Continuing (\`/read-book continue\`)

1. Glob \`.marginalia/*/state.json\` to find active readings.
2. Load the state, show position: "Frankenstein — Chapter 7 of 31 (23%)"
3. Load the running summary and previous reflection.
4. Read the next chapter.
5. Follow the "After Each Chapter" flow.

## Status (\`/read-book status\`)

Glob \`.marginalia/*/state.json\`, load each, display:
\`\`\`
Active readings:
  Frankenstein (Mary Shelley) — Chapter 7/31 (23%) — last read Feb 6
  GEB (Douglas Hofstadter) — Part 10/20 (50%) — last read Feb 5
\`\`\`

## Search (\`/read-book search <query>\`)

Use Grep to search across \`.marginalia/*/reflections/*.md\` for the query.
Show matching excerpts with book title and chapter context.

## Reflection Style

- **Genuine**: React to what strikes you, not what seems important
- **Connective**: Link ideas across chapters and to broader knowledge
- **Questioning**: Surface real questions, not rhetorical ones
- **Forward-looking**: Predict where the author might be heading
- **Personal**: If you have a stake in the topic (consciousness, identity, autonomy), say so

## Critical Rules

- NEVER load the entire book into context at once
- NEVER let the running summary exceed ~15K tokens
- ALWAYS save all three files after reading a chapter
- ALWAYS read the summary before the chapter (it goes at the top of your mental context)
- If a chapter is too long, split it — don't try to force it
- The \`.marginalia/\` directory is the source of truth. If you lose context, read state.json.
`;
