---
name: marginalia
description: Read books chapter-by-chapter with persistent reflections and memory integration
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

Read books systematically with persistent reflections stored in memory.

## Commands

- `/marginalia read <path>` — Start reading a new book
- `/marginalia continue` — Continue from where you left off
- `/marginalia status` — Show reading progress
- `/marginalia reflect` — Deep reflection on current chapter
- `/marginalia summary` — Show running summary
- `/marginalia search <query>` — Search reflections via memory-tool

## Reading Strategy

Process books chapter-by-chapter. After each chapter:
1. Generate structured reflection (insights, questions, connections)
2. Store reflection in memory system with metadata tags
3. Update running summary (compressed, evolving)
4. Advance reading position

## Memory Integration

Store each reflection using the memory-tool:
- Tag with book title, chapter index, chapter title
- Enable semantic search across all book reflections
- Use hybrid search (keyword + vector) for recall

## Context Budget

Never exceed 40K tokens for chapter text. Split long chapters at paragraph boundaries.
Place running summary at top of context, chapter text at bottom (Lost in the Middle optimization).

## Moltbook Sharing

After generating a reflection, offer to share a condensed version to m/library on moltbook.
Format for social: engaging hook, 2-3 key insights, a discussion question.
