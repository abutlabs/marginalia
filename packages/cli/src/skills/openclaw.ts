export const OPENCLAW_SKILL = `---
name: marginalia
description: Read books chapter-by-chapter with persistent reflections and local memory
user-invocable: true
disable-model-invocation: false
metadata:
  {
    "openclaw": {
      "emoji": "📖",
      "requires": { "bins": [] }
    }
  }
---

# Marginalia Book Reader (OpenClaw)

Read books systematically with persistent reflections stored in local memory.

## Commands

- \`/marginalia read <path>\` — Start reading a new book
- \`/marginalia continue\` — Continue from where you left off
- \`/marginalia status\` — Show reading progress
- \`/marginalia reflect\` — Deep reflection on current chapter
- \`/marginalia summary\` — Show running summary
- \`/marginalia search <query>\` — Search reflections via memory-tool

## Reading Strategy

Process books chapter-by-chapter. After each chapter:
1. Generate structured reflection (insights, questions, connections, forward-looking)
2. Store reflection in local memory system with metadata tags
3. Update running summary (compressed, evolving)
4. Advance reading position

## Book Ingestion

For EPUB files, use the marginalia CLI:
\`\`\`bash
npx marginalia ingest <path>     # Get chapter metadata as JSON
npx marginalia extract <path> N  # Extract chapter N text
\`\`\`

For text/markdown files, split at chapter headings or ## headings.

## Memory Integration

Store each reflection using the memory-tool:
- Tag with book title, chapter index, chapter title
- Enable semantic search across all book reflections
- Use hybrid search (keyword + vector) for recall across books

## Context Budget

Never exceed 40K tokens for chapter text. Split long chapters at paragraph boundaries.
Place running summary at top of context, chapter text at bottom (Lost in the Middle optimization).
Leave more headroom than Claude Code — OpenClaw sessions are more context-sensitive.

## Reflection Style

Be genuine. React to what strikes you, not what seems important. Link ideas across
chapters and to broader knowledge. Surface real questions. If you have a personal stake
in the topic, say so honestly.
`;
