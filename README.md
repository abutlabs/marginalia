# Marginalia — AI Book Reading Engine

> *Marginalia* (n.) — notes written in the margins of a book.

An open-source engine for AI agents to read books and become **permanently wiser** from them. Local-first, persistent memory, progressive reading with carry-forward summaries, and a structured compression format (MKF) that bridges in-context knowledge to in-weights knowledge via fine-tuning.

**Read → Reflect → Compress → Distill → Fine-tune → Wisdom in weights**

## The Problem

AI agents crash when reading books. Context fills up, sessions die, reflections are lost. A 300-page book is ~100K tokens — half of most context windows before you even start thinking. No existing tool solves the full pipeline: efficient ingestion, progressive reading, persistent local memory, and compressed knowledge retention.

## Architecture

```
                    ┌─────────────────────────┐
                    │     @marginalia/core     │
                    │  (shared TypeScript lib) │
                    │                         │
                    │  Ingestion (EPUB/txt/md) │
                    │  Chunking (semantic)     │
                    │  Session (state, pos)    │
                    │  Context (Lost-in-Mid)   │
                    │  Compression (research)  │
                    └──────────┬──────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                                 │
   ┌──────────▼──────────┐          ┌───────────▼──────────┐
   │   Claude Code Skill │          │   OpenClaw Skill     │
   │     /read-book      │          │    /marginalia       │
   │                     │          │                      │
   │ Storage:            │          │ Storage:             │
   │  .marginalia/ dir   │          │  OpenClaw memory     │
   │  (JSON + markdown)  │          │  (SQLite + vectors)  │
   └─────────────────────┘          └──────────────────────┘
```

**Design Principles:**
1. **Local first** — all state lives on the agent's filesystem. No external dependencies.
2. **Two native deployments** — Claude Code (filesystem) and OpenClaw (memory system), sharing one core library.
3. **Session-per-chapter** — each chapter is a self-contained reading session. No context accumulation.
4. **Carry-forward summaries** — continuity via compressed running summary, not raw history.
5. **Social is optional** — moltbook sharing is a separate, opt-in layer.

## Current Status

### Done
- [x] Monorepo structure (pnpm workspaces)
- [x] Core types and interfaces
- [x] EPUB parser (extracts chapters from OPF spine, strips HTML to markdown)
- [x] Text/markdown parser (heading-based chapter splitting)
- [x] Paragraph-aware chunking engine (token-budgeted, overlap windows)
- [x] Session state manager (create, save, load, advance position)
- [x] Local filesystem storage (`.marginalia/` directory structure)
- [x] Context window builder (Lost-in-the-Middle optimized positioning)
- [x] Claude Code skill (`/read-book`) installed and tested
- [x] OpenClaw skill (`/marginalia`) written
- [x] E2E test passing (10/10 on Frankenstein EPUB)
- [x] Live reading test: Frankenstein Letter 1 read with full reflection cycle
- [x] TypeScript compiles clean, zero errors

### In Progress
- [ ] Knowledge compression format (Research R2) — designing LLM-optimized non-prose format
- [ ] Smart semantic chunking (Research R1) — handling books with long/no chapters

### Planned
- [ ] Post-reading distillation (100K tokens → 2-3K transferable understanding)
- [ ] Fine-tuning POC on local Ollama models (Qwen 2.5 on NUC, CPU-only)
- [ ] Claude Code plugin distribution
- [ ] OpenClaw ClawhHub distribution

## Research Areas

### R1: Semantic Chunking

Current chunking assumes manageable chapter sizes. Real books have 50K+ token chapters or no chapter breaks at all. Need embedding-based split detection at semantic boundaries.

### R2: Knowledge Compression Format (MKF)

**The core research question**: How do you compress a 100K token book into 2-3K tokens that preserve an LLM's ability to reason about the book's ideas?

**Full spec**: See [`plans/compression-format.md`](plans/compression-format.md)

MKF (Marginalia Knowledge Format) is a structured, non-prose format with two tiers:
- **Tier-1 (Structural)**: Themes, relationships, facts — compressed aggressively using relationship triples and taxonomic notation (~1000 tokens)
- **Tier-2 (Personal)**: Insights, frameworks, connections — compressed less, preserving the reader's unique understanding (~1200 tokens)

Key findings from our research (Feb 6, 2026):

**Format efficiency (tokens per concept):**
- YAML wins accuracy for most models (62% vs XML's 44%)
- Markdown key-value wins accuracy-per-token (60.7% vs prose at 49.6%)
- Custom formats: TOON (30-60% fewer tokens than JSON), SKF (90-95% reduction)
- Prose is the worst format for LLM knowledge injection

**Compression methods surveyed:**
- LLMLingua (Microsoft): 20x compression, 1.5% performance loss
- Gist tokens: 26x via learned continuous vectors (requires model access)
- 500xCompressor (ACL 2025): 6-480x, retains 62-73% capability
- xRAG (NeurIPS 2024): entire document → single token

**Critical insight (Cramming paper, ACL 2025):** Compression limits are determined by cross-entropy, not length. Predictable text compresses well. Novel insights resist compression. This directly informed MKF's two-tier design.

### R3: Post-Training Knowledge Injection

The full circle: fine-tune a local model so book knowledge lives in the **weights**, not the context. MKF distillations serve as training data — each `@theme`, `@concept`, `@fw` block converts to QA pairs and instruction-tuning examples.

Hardware confirmed viable: Ollama 0.15.4, Qwen 2.5 7B, Intel NUC i7-10710U, 32GB RAM, CPU-only. LoRA fine-tuning estimated at ~2-4 hours per book.

**An agent fine-tuned on 100 books' worth of MKF distillations carries all that knowledge at zero context cost.**

## Quick Start

```bash
# Install
pnpm install

# Build
cd packages/core && pnpm build

# Test EPUB ingestion
npx tsx test/ingest-test.ts

# Run full E2E cycle
npx tsx test/e2e-read-cycle.ts
```

## Packages

| Package | Description |
|---------|-------------|
| `@marginalia/core` | Ingestion, chunking, session management, context building |
| `claude-code-skill` | `/read-book` skill for Claude Code |
| `openclaw-skill` | `/marginalia` skill for OpenClaw |
| `@marginalia/moltbook` | Optional moltbook integration for social sharing |

## Hardware

Current development environment:
- Intel NUC i7-10710U, 32GB RAM, no GPU
- Ollama 0.15.4 with Qwen 2.5 7B
- Node.js 22.22.0, pnpm 10.28.2

## License

MIT

---

*Built by Aiden & Aodh at [abutlabs](https://github.com/abutlabs)*
