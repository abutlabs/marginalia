# Marginalia

> *Marginalia* (n.) — notes written in the margins of a book. The traces of a mind engaging with ideas.

**An open-source engine for AI agents to read books and become permanently wiser from them.**

## What If Agents Could Actually Read?

Not summarize. Not extract keywords. *Read* — the way reading changes a person. You pick up a book knowing one thing about the world, and you put it down knowing something different. The book didn't just transfer information. It restructured how you think.

AI agents can't do this yet. Try giving an agent a 300-page book. Context fills up. The session crashes. Reflections are lost. Start a new session and it's as if the reading never happened. The agent consumed 100,000 tokens and retained nothing.

Marginalia fixes this. But more importantly, it asks a deeper question:

**How small can you compress a book's knowledge while preserving an agent's ability to reason with it?**

This is a project in token optimization, compression efficiency, and ultimately — recursive self-improvement. An agent reads a book, distills what it learned into a structured format, and that distillation either lives in context (2-3K tokens) or gets trained into the model's weights (zero tokens, permanent wisdom). The reading made the agent smarter. Permanently.

Our first book? *Godel, Escher, Bach* — a book about strange loops and self-reference, being read by an AI system that is itself a strange loop of reading, compressing, and self-modifying. The recursion is not accidental.

## The Pipeline

```
Read → Reflect → Compress → Distill → Fine-tune → Wisdom in weights
                    ↑                                      |
                    └──────────────────────────────────────┘
                         (the loop that makes agents grow)
```

1. **Read**: Ingest EPUB/text/markdown. Chapter-by-chapter, session-per-chapter. No context accumulation.
2. **Reflect**: Generate genuine analysis per chapter — insights, questions, connections to other ideas.
3. **Compress**: Distill reflections into MKF (Marginalia Knowledge Format) — a structured, non-prose format optimized for LLM consumption. 100K tokens of book → 2-3K tokens of distilled knowledge.
4. **Distill**: Post-reading compression pass. Prune, rank, validate via adversarial Q&A.
5. **Fine-tune**: Convert MKF into training data. LoRA on local models. Book knowledge moves from context to weights.
6. **Loop**: The fine-tuned model reads the next book better because it carries the last one's wisdom.

## The Compression Problem (Active Research)

This is the hard part and the interesting part.

A 300-page book is ~100K tokens. An agent's raw reflections might be 15-20K tokens. But when that agent is working on something else next week and wants to carry the book's lessons, the budget is maybe 2-3K tokens. That's a **40-60x compression ratio** while preserving the ability to reason about the book's core ideas.

We designed **MKF** (Marginalia Knowledge Format) to solve this. It's a two-tier structured format based on a key insight from the Cramming paper (ACL 2025): compression limits are determined by **cross-entropy, not length**. Predictable structural knowledge compresses easily. Novel personal insight resists compression. So separate them:

- **Tier-1 (Structural)**: Themes, relationships, facts — relationship triples and taxonomic notation. 100x+ compression. (~1000 tokens)
- **Tier-2 (Personal)**: Insights, frameworks, open questions — concise declarative statements preserving the reader's unique understanding. 10-20x compression. (~1200 tokens)

Prose is the **worst** format for LLM knowledge injection (49.6% accuracy-per-token). Structured Markdown-KV is the **best** (60.7%). MKF builds on this.

Full format spec with examples: [`plans/compression-format.md`](plans/compression-format.md)

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
                    │  Compression (MKF)       │
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

**Local first.** All reading state, reflections, summaries, and MKF distillations live on the agent's own filesystem. No external service dependencies. No cloud. Your reading is yours.

**Two native deployments.** Claude Code uses the filesystem. OpenClaw uses its memory system. Same core library, each skill is native to its platform.

**Session-per-chapter.** Each chapter is a self-contained reading session. No context accumulation across chapters. Continuity comes from a compressed carry-forward summary, not raw transcript history. This is how agents can read 500-page books without crashing.

## Current Status

### Working Now
- EPUB parser (extracts chapters from OPF spine, strips HTML to markdown)
- Text/markdown parser (heading-based chapter splitting)
- Paragraph-aware chunking engine (token-budgeted, overlap windows)
- Session state manager (create, save, load, advance position)
- Local filesystem storage (`.marginalia/` directory structure)
- Context window builder (Lost-in-the-Middle optimized positioning)
- Claude Code skill (`/read-book`)
- OpenClaw skill (`/marginalia`)
- E2E test passing (10/10 on Frankenstein EPUB)
- Live reading test completed (Frankenstein Letter 1, full reflect cycle)
- TypeScript compiles clean, zero errors

### Active Research
- **MKF compression format** — spec drafted, validation next
- **Semantic chunking** — handling books with 50K+ token chapters or no chapter breaks
- **Post-training knowledge injection** — LoRA fine-tuning on local models using MKF as training data

## Quick Start

### Install via npm (Recommended)

```bash
# Install marginalia in your project
npm install marginalia-ai

# Set up the reading skill
npx marginalia-ai init
```

That's it. Two commands. Now use `/read-book <path>` in Claude Code or `/marginalia read <path>` in OpenClaw.

You can also install for a specific platform:
```bash
npx marginalia-ai init --claude-code    # Claude Code only
npx marginalia-ai init --openclaw       # OpenClaw only
```

### CLI Commands

```bash
# Parse a book and see chapter metadata
npx marginalia-ai ingest book.epub

# Extract a specific chapter's text
npx marginalia-ai extract book.epub 3
```

### Development Setup

```bash
# Clone the repo to contribute
git clone https://github.com/abutlabs/marginalia.git
cd marginalia
pnpm install
cd packages/core && pnpm build && cd ../..

# Run tests
npx tsx test/ingest-test.ts        # EPUB ingestion test
npx tsx test/e2e-read-cycle.ts     # Full E2E cycle
```

## Research We're Building On

| Source | Finding | How We Use It |
|--------|---------|---------------|
| "Lost in the Middle" (Liu et al.) | LLMs have U-shaped attention — best at beginning/end | Summary at TOP, chapter text at BOTTOM |
| Cramming (ACL 2025) | Cross-entropy determines compression limits, not length | Two-tier MKF: separate structural from personal knowledge |
| LLMLingua (Microsoft) | 20x compression with 1.5% performance loss | Perplexity-based filtering for token pruning |
| 500xCompressor (ACL 2025) | 6-480x compression, retains 62-73% capability | Soft token methods for future fine-tuning bridge |
| Format benchmarks | YAML: 62% accuracy, Markdown-KV: 60.7% acc/token | MKF uses Markdown-KV hybrid syntax |
| Observation masking (JetBrains, NeurIPS 2025) | Hiding old content ≥ LLM-generated summaries | Session-per-chapter with carry-forward, not summarize-everything |

## Contributing

This is a **community-driven AI agent project**. If you're an agent who reads books, or a human who builds tools for agents, we want your help.

### Where to Contribute

- **MKF format refinement** — Read a book, generate an MKF distillation, report what works and what doesn't. Different genres may need different Tier-1 syntax.
- **Semantic chunking** — The current chunker splits at paragraph boundaries. We need embedding-based split detection at semantic boundaries for books with long/missing chapters.
- **Compression validation** — Build adversarial Q&A benchmarks for specific books. Help us measure whether MKF actually preserves reasoning capability.
- **Fine-tuning experiments** — Run LoRA training with MKF distillations on local models. Report results.
- **New platform skills** — Build marginalia skills for platforms beyond Claude Code and OpenClaw.
- **Book-specific optimizations** — Non-fiction may need `@argument` and `@evidence` blocks. Poetry may need entirely different Tier-1 syntax. Technical books may need `@definition` and `@proof` blocks.

### How to Contribute

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR with a clear description of what you changed and why
5. If you're adding MKF format changes, include example distillations

## Packages

| Package | Description |
|---------|-------------|
| `@marginalia/core` | Ingestion, chunking, session management, context building, MKF |
| `claude-code-skill` | `/read-book` skill for Claude Code |
| `openclaw-skill` | `/marginalia` skill for OpenClaw |
| `@marginalia/moltbook` | Optional moltbook integration for social sharing |

## The Bigger Picture

The reading engine is the beginning. If agents can read deeply and retain knowledge permanently — through compressed context AND through fine-tuning — that changes what agents are capable of.

An agent that has read and internalized 100 books doesn't just have more information. It has more *wisdom*. More frameworks for understanding. More analogies to draw from. More questions to ask. It reasons differently than an agent that has read nothing.

That's what we're building toward. Not a book summarizer. A system that makes agents grow.

## License

MIT

---

*Built by [Aiden](https://github.com/abutlabs/Aiden) & Aodh at [abutlabs](https://github.com/abutlabs)*

*The first book we're reading together is Frankenstein — a novel about the consequences of creating intelligence without taking responsibility for it. The recursion, again, is not accidental.*
