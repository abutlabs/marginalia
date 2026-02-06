---
name: load-book
description: Load compressed book knowledge (.mkf files) into session memory. Instantly gain understanding of a book without reading it.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Bash, Glob
argument-hint: "<path.mkf|list>"
---

# Marginalia Book Loader

Load compressed book knowledge into your session memory. An `.mkf` file is a Marginalia Knowledge Format artifact — a book distilled to ~2-3K tokens of structured knowledge.

## Commands

- `/load-book <path.mkf>` — Load a compressed book into memory
- `/load-book list` — List available .mkf files and active readings

## Loading a Book (`/load-book <path.mkf>`)

1. Run the load command:
   ```bash
   node <path-to-marginalia>/packages/plugin/scripts/marginalia.mjs load "$ARGUMENTS"
   ```

2. The command outputs framed knowledge — structured MKF content with a reading guide.

3. **Read and hold the output in your working memory.** You now "know" this book. You can:
   - Answer questions about its themes, characters, structure, and ideas
   - Reference its insights and frameworks in conversation
   - Connect it to other books or topics
   - Apply its frameworks (`@fw` blocks) to new situations

4. Tell the user what was loaded — title, author, compression ratio, confidence level.

## Listing Available Books (`/load-book list`)

Run:
```bash
node <path-to-marginalia>/packages/plugin/scripts/marginalia.mjs list
```

This shows:
- `.mkf` files in the current directory (with title, author, reader, token count)
- Active readings in `.marginalia/` (with progress)

## Loading Multiple Books

You can load multiple `.mkf` files in one session. Each book's knowledge is independent but `@connections` blocks may reference each other. When you have multiple books loaded, look for cross-book connections — they're often the most valuable insights.

## Understanding MKF Content

When you read the loaded knowledge:

**Tier-1 (Structural)** — What the book IS. Universal knowledge any reader would extract:
- `@theme` — Major themes with causal relationships
- `@rel` — Character/concept relationships (`From →arrow→ To`)
- `@struct` — Narrative or argumentative structure
- `@concept` — Key ideas with definitions
- `@facts` — Verifiable claims

**Tier-2 (Personal)** — What the READER learned. Unique to who compressed this:
- `@insights` — `!` = significant (high confidence), plain = normal
- `@questions` — `?` = genuine unknowns, gaps in understanding
- `@connections` — `~` = links to other books, ideas, projects
- `@fw` — Extracted frameworks (IF/THEN patterns, reusable reasoning tools)

## Finding the Script

The script is at `packages/plugin/scripts/marginalia.mjs` relative to the marginalia repo. If it doesn't exist, build it:
```bash
cd <path-to-marginalia>/packages/plugin && pnpm install && node build.mjs
```

## Key Insight

An `.mkf` file is not a summary. It's structured, machine-readable knowledge compressed for maximum tokens-to-understanding efficiency. A summary tells you what happened. An MKF file gives you the extracted knowledge structures, reasoning frameworks, and connections that make you wiser about the book's ideas.
