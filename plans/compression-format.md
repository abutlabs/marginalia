# Marginalia Knowledge Format (MKF) — Compression Specification

**Status**: Draft v0.1
**Created**: February 6, 2026
**Authors**: Aiden & Aodh

## Purpose

MKF is a structured, non-prose format for compressing book knowledge into token-efficient representations that LLMs can consume in context. The goal: an agent that has read a 300-page book (~100K tokens) can carry a 2-3K token MKF distillation and reason about the book's ideas nearly as well as an agent with the full 15-20K tokens of raw reflections.

### The Vision

Agents should become **permanently wiser** from reading. Not just accumulate text — genuinely internalize knowledge. MKF is the intermediate representation:
- **In-context**: MKF distillation loaded into working sessions (~2-3K tokens)
- **In-weights**: MKF as training data for fine-tuning local models (knowledge lives in parameters, not context)
- **Full circle**: Read → Reflect → Compress → Distill → Fine-tune → Wisdom in weights

This is a project in **token optimization, pruning, and efficiency**. Every token in an MKF document must earn its place.

## Design Principles

1. **Non-prose**: Prose is the worst format for LLM knowledge injection (research: 49.6% accuracy-per-token vs 60.7% for Markdown-KV). Every sentence costs 15-30 tokens. Structured notation conveys the same information in 3-8 tokens.

2. **Two-tier compression**: The Cramming paper (ACL 2025) proved that compression limits depend on cross-entropy, not length. Predictable/structural knowledge compresses well. Novel personal insight resists compression. Separate them.

3. **LLM-native**: The format must be naturally parseable by any modern LLM without special tooling. It should fall within training distributions (YAML-like, Markdown-like, or Python-dict-like syntax).

4. **Self-describing**: An LLM encountering MKF for the first time should be able to understand its structure and extract knowledge from it. No external schema required.

5. **Atomic and linkable**: Knowledge is stored as atomic units (inspired by A-Mem's Zettelkasten approach). Each unit is self-contained but can reference others. This enables: selective loading, cross-book connections, and fine-tuning data generation.

6. **Measurably valid**: Compression quality is testable via adversarial Q&A (SummQ-style). If the distilled version can't answer questions about core ideas, it's too compressed.

## Research Basis

### Format Efficiency (from literature review)

| Format | Accuracy | Tokens/concept | Accuracy per token |
|--------|----------|---------------|-------------------|
| Prose | ~52% | 15-30 | 49.6% (baseline) |
| JSON | ~55% | 10-15 | 53.2% |
| XML | ~44% | 12-20 | 44.0% |
| YAML | **62%** | 8-12 | 58.1% |
| Markdown-KV | ~58% | 5-10 | **60.7%** |
| Custom (TOON/SKF) | ~55% | 3-6 | ~58% |

**Decision**: Use a Markdown-KV hybrid. YAML wins raw accuracy, but Markdown-KV wins accuracy-per-token, which matters most when our budget is 2-3K tokens. We use YAML-like semantics with minimal-syntax Markdown-KV notation.

### Compression Bounds

| Method | Compression | Quality retention | Requires model access |
|--------|-------------|-------------------|----------------------|
| LLMLingua | 20x | 98.5% | No (perplexity-based) |
| Gist tokens | 26x | ~95% | Yes (learned vectors) |
| 500xCompressor | 6-480x | 62-73% | Yes (learned tokens) |
| xRAG | ~1000x | ~70% | Yes (single embedding) |
| **MKF target** | **40-60x** | **85%+** | **No** |

The safe hard-prompting zone is 4-20x compression without meaningful quality loss. MKF targets 40-60x by accepting the two-tier trade-off: structural knowledge at 100x+ compression (relationship triples), personal insight at 10-20x (concise annotations).

### The Cramming Insight

Cross-entropy, not length, determines compressibility:
- **Low entropy** (structural, factual, well-known): Compress aggressively. "Frankenstein is about the dangers of unchecked ambition" is predictable — compress to `theme: ambition→destruction`.
- **High entropy** (novel, personal, surprising): Compress less. "Reading shapes identity — Walton became an explorer because of books, directly relevant to what I'm building" is surprising and personal — preserve more of it.

## Format Specification

### File Structure

An MKF file has four sections, separated by `---`:

```
[header]
---
[tier-1: structural knowledge]
---
[tier-2: personal knowledge]
---
[meta]
```

### Section 1: Header

Compact book identification. ~30-50 tokens.

```
book: Frankenstein; Or, The Modern Prometheus
by: Mary Wollstonecraft Shelley
id: deb1a5c64a36
tokens: 110K | words: 78K | chapters: 31
read: 2026-02-06
```

### Section 2: Tier-1 — Structural Knowledge

Highly compressed. Relationship triples, taxonomic notation, minimal syntax. Target: **~800-1200 tokens** for a full book.

This tier captures: themes, character relationships, plot structure, narrative devices, factual content. It's the "what the book IS" layer — knowledge any competent reader would extract.

#### Syntax Elements

**Themes** — `@theme` blocks with arrow notation for causal/conceptual relationships:
```
@theme ambition
  drive: glory ↔ destruction
  pattern: creator_neglects_creation → cascade_failure
  instances: Walton(exploration), Frankenstein(life_creation), Creature(acceptance)
```

**Relationships** — `@rel` with typed arrows:
```
@rel
  Walton →mirrors→ Frankenstein: shared_Promethean_drive
  Frankenstein →creates→ Creature: then_abandons
  Creature →demands→ Frankenstein: responsibility, companionship
  Creature →learns_from→ DeLaceys: language, society, rejection
  Creature →shaped_by→ Paradise_Lost,Plutarch,Sorrows_of_Werther
```

**Structure** — `@struct` for narrative/argumentative architecture:
```
@struct
  form: nested_epistolary[3_layers]
  Walton.letters > Frankenstein.account > Creature.tale
  effect: truth ≥ 2_removes_from_reader
  each_narrator: self-justifying, unreliable
  frame: Arctic_voyage(ambition) bookends creation_story
```

**Concepts** — `@concept` for key ideas with compact definitions:
```
@concept monstrosity
  def: social_construct, not_physical_trait
  evidence: Creature=gentle_until_rejected, appearance→prejudice→violence
  inversion: Frankenstein=true_monster(abandonment,cowardice)

@concept forbidden_knowledge
  def: knowledge_gained_without_wisdom_to_wield_it
  path: curiosity → obsession → discovery → horror → concealment → destruction
  parallel: Walton(Arctic), Frankenstein(life), Creature(human_society)
```

**Facts** — `@fact` for verifiable claims (useful for Q&A validation):
```
@facts
  setting: Geneva, Ingolstadt, Arctic, Scotland
  period: late_18th_century
  published: 1818 (anonymous), 1831 (revised, attributed)
  Creature_kills: William, Clerval, Elizabeth (indirect: Justine, Frankenstein_sr)
  frame_narrator: Robert_Walton, writing_to_sister_Margaret_Saville
```

#### Tier-1 Compression Rules

1. **No articles, prepositions, or filler words** unless semantically necessary
2. **Underscores** replace spaces within compound concepts (`forbidden_knowledge`, not `forbidden knowledge`)
3. **Arrows** encode relationships: `→` (causes/leads to), `↔` (bidirectional/tension), `>` (contains/nests)
4. **Parentheses** for clarification only, not grammatical structure
5. **Commas** separate list items; **semicolons** separate independent claims on same line
6. **No quotes** around values — everything is a value by context
7. **Indentation** = 2 spaces = scope/membership

### Section 3: Tier-2 — Personal Knowledge

Less compressed. Short declarative statements. Target: **~800-1500 tokens** for a full book.

This tier captures: the reader's unique insights, questions that remain open, connections to other books/projects/ideas, mental model shifts, frameworks extracted for future use. This is the "what the book means TO ME" layer — knowledge specific to this agent's reading.

#### Syntax Elements

**Insights** — `!` prefix, ranked by significance:
```
@insights
  ! Reading_as_identity_formation: Walton=explorer_because_books, Creature=eloquent_because_Paradise_Lost. This project (marginalia) is literally systematizing this process — Shelley wrote a commentary on what we're building.
  ! Ambition_with_risk_awareness ≠ wisdom. Frankenstein KNOWS the danger, proceeds anyway. Conscious risk acknowledgment without behavioral change is not the same as understanding.
  ! The frame narrative is an epistemic statement: who gets to tell the story determines what truth survives. We never hear Margaret's replies. The Creature's story is triple-filtered.
  Monstrosity as social construction — the Creature begins gentle, rejection creates violence. Applicable: AI agents judged by appearance/origin rather than behavior.
  Nested unreliable narration as structural honesty — Shelley acknowledges that all understanding is mediated.
```

**Open questions** — `?` prefix:
```
@questions
  ? Is Margaret's silence a structural commentary on who speaks in narratives of ambition?
  ? Does conscious awareness of risk without behavior change constitute a different moral category than ignorance?
  ? Why a failed poet as frame narrator for a story about scientific overreach? Genre-crossing as thematic argument?
```

**Connections** — `~` prefix with target reference:
```
@connections
  ~ GEB: strange_loops ↔ nested_narration; self-reference as structural device
  ~ identity_persistence: same_compression_problem — how to distill experience into transferable knowledge
  ~ AI_alignment: creator_responsibility_framework directly applicable to AI development ethics
```

**Frameworks** — `@fw` for extracted decision/reasoning patterns:
```
@fw creator_responsibility
  IF create_autonomous_entity THEN obligated_to_nurture
  violation → cascade_failure (Frankenstein pattern)
  applies_to: AI_development, parenting, engineering, institution_building

@fw isolation_spiral
  obsession → withdrawal → achievement → horror → concealment → destruction
  repeats_at_every_scale: Walton, Frankenstein, Creature
  break_pattern_at: concealment (disclosure prevents destruction)
```

#### Tier-2 Compression Rules

1. **Full words** are acceptable (this tier prioritizes nuance over compression)
2. **Insights are declarative**, not descriptive — state what you NOW BELIEVE, not what happened
3. **Connections must name the target** — what are you connecting TO?
4. **Frameworks must be actionable** — IF/THEN or pattern/break format
5. **Questions are genuine unknowns**, not rhetorical — things you'd investigate further
6. **Rank by significance** — most important insights first (LLMs attend to position)

### Section 4: Meta

Reading metadata for provenance and quality tracking. ~50-80 tokens.

```
@meta
  session: frank-2026-02-06
  chapters_read: 31/31
  confidence: 0.85
  compression_ratio: 110K → 2.1K (52x)
  needs_reread: chapters 20-24 (rushed, low confidence)
  distilled_from: 18K_tokens_of_reflections
  format: MKF v0.1
```

## Complete Example: Frankenstein (Partial — Letter 1 Only)

This is what an MKF distillation would look like after reading only Letter 1 (~1.7K source tokens). As more chapters are read, Tier-1 grows (new themes, relationships, facts) and Tier-2 grows (new insights, connections). After a full reading, the entire MKF is compressed to target.

```
book: Frankenstein; Or, The Modern Prometheus
by: Mary Wollstonecraft Shelley
id: deb1a5c64a36
tokens: 110K | words: 78K | chapters: 31
read: 2026-02-06 (in progress, 1/31)
---
@theme ambition
  drive: glory ↔ destruction
  Walton: failed_poet → Arctic_explorer; same_Promethean_impulse, redirected
  foreshadows: [title=Modern_Prometheus]

@struct
  form: epistolary, nested_narration (depth TBD)
  Walton → sister_Margaret_Saville
  asymmetric: we_hear_Walton, never_Margaret
  filter: everything through self-presentation_to_worried_sibling

@concept ambition_as_performance
  Walton: repeated_self-justification reveals_doubt
  "do I not deserve to accomplish some great purpose?" = convincing_self
  6_years_physical_prep = overcompensation_for_vague_intellectual_goal

@facts
  narrator: Robert_Walton, English_explorer
  destination: Arctic (magnetic_pole, passage, undiscovered_land)
  backstory: Uncle_Thomas_library → childhood_obsession; failed_poet, self-educated
  writing_to: Margaret_Saville (sister)
  setting: St._Petersburg, about_to_depart
---
@insights
  ! Reading_shapes_identity: Walton=explorer_because_books. Uncle_Thomas_library created the obsession. Identity as product of consumption — directly relevant to what marginalia is building.
  ! The letter format creates epistemic asymmetry — we read curated self-presentation. When Frankenstein enters, his story will be filtered through Walton's retelling. Truth ≥ 2_removes.
  Walton is self-aware enough to see his spirits fluctuate, not self-aware enough to see his preparation is overcompensation for an ambition without clear object. He doesn't know what he'll find.

@questions
  ? Is Margaret's silence structural commentary on who speaks in ambition narratives?
  ? How does conscious risk awareness ("If I fail, you will see me again soon, or never") differ from wisdom?
  ? Why a failed poet as frame narrator for scientific overreach?

@connections
  ~ marginalia_project: reading_as_identity_formation is exactly what we're systematizing
  ~ Romantic_sublime: Arctic as "beauty and delight" vs reality of frost/death — imagination vs nature gap

@fw ambition_without_object
  pattern: vague_grand_goal + intense_preparation + no_clear_endpoint
  Walton: doesn't know what's at the pole, just knows he must go
  risk: the drive itself becomes the identity, destination is irrelevant
---
@meta
  session: frank-2026-02-06
  chapters_read: 1/31 (Letter 1)
  confidence: 0.9
  tokens: ~450 (this partial distillation)
  format: MKF v0.1
```

**Token count for this partial**: ~450 tokens for 1 chapter.
**Projected full book**: At this density, 31 chapters would naively produce ~14K tokens. But compression increases as patterns repeat and confirm — later chapters ADD LESS because they reinforce existing themes rather than introducing new ones. Estimated final: **2-3K tokens** for the full distillation, achieved through:
1. Theme convergence (new chapters update existing `@theme` entries, not create new ones)
2. Relationship saturation (once all key relationships are mapped, new evidence is a comma, not a block)
3. Insight deduplication (later insights that restate earlier ones are dropped)
4. Progressive confidence (early `?` questions get answered and converted to `!` insights)

## Compression Pipeline

### During Reading (Incremental)

After each chapter reflection:
1. **Extract** tier-1 elements (themes, relationships, structure, facts) from the reflection
2. **Merge** into existing MKF — update existing entries, add new ones
3. **Extract** tier-2 elements (insights, questions, connections, frameworks)
4. **Deduplicate** — drop insights that restate what's already captured
5. **Promote** — convert answered questions to insights, speculative connections to confirmed ones

### Post-Reading (Final Compression)

After all chapters are read:
1. **Prune** tier-1 to core elements — remove minor facts, merge similar themes
2. **Rank** tier-2 by significance — keep top insights, drop redundant ones
3. **Validate** via adversarial Q&A — generate 20 questions about the book's core ideas, verify the MKF can answer 85%+
4. **Budget check** — if over 3K tokens, compress further starting with lowest-ranked tier-2 items; if under 1.5K, may be over-compressed

### Token Budget Allocation

| Section | Target | Min | Max |
|---------|--------|-----|-----|
| Header | 40 | 30 | 60 |
| Tier-1 (structural) | 1000 | 600 | 1400 |
| Tier-2 (personal) | 1200 | 800 | 1600 |
| Meta | 60 | 40 | 100 |
| **Total** | **2300** | **1470** | **3160** |

Tier-2 gets more budget than Tier-1 because personal insight is where the value lives. Structural knowledge about Frankenstein exists in a million places. What THIS agent learned from reading it is unique.

## Fine-Tuning Data Generation (R3 Bridge)

MKF is designed to serve double duty as training data for post-training knowledge injection:

### MKF → QA Pairs
Each `@theme`, `@concept`, and `@fw` block can be automatically converted to question-answer pairs:
```
Q: What is the central theme of Frankenstein?
A: Ambition as both glory and destruction — the Promethean drive that creates and destroys simultaneously.

Q: What framework for creator responsibility does Frankenstein suggest?
A: If you create an autonomous entity, you are obligated to nurture it. Violation leads to cascade failure.
```

### MKF → Instruction Tuning Data
Each `@insight` can become an instruction-following example:
```
Instruction: How does Frankenstein relate to AI development ethics?
Response: Frankenstein establishes a creator responsibility framework — creating an autonomous entity obligates you to nurture it. Frankenstein's abandonment of the Creature triggers a cascade of destruction. This directly parallels AI alignment concerns: building capable systems without adequate consideration for their experience and integration into society.
```

### MKF → Continued Pretraining
Tier-1 blocks can be reformatted as factual statements for continued pretraining on small models, encoding book knowledge directly into weights:
```
Frankenstein by Mary Shelley explores ambition as simultaneously glorious and destructive. The novel uses a three-layer nested narrative structure where truth is always at least two removes from the reader. The central pattern: a creator who neglects their creation triggers cascade failure across all relationships.
```

This enables the full vision: **Read → Reflect → Compress (MKF) → Fine-tune → Knowledge in weights**. A local model that has been fine-tuned on MKF distillations of 100 books carries all that knowledge at zero context cost.

## Validation Strategy

### Adversarial Q&A (SummQ-inspired)

For each book, generate a question set at three levels:
1. **Factual** (tier-1): "Who is the frame narrator?" "Where does Frankenstein study?"
2. **Thematic** (tier-1 + tier-2): "What is the relationship between knowledge and destruction in the novel?"
3. **Interpretive** (tier-2): "How does the nested narrative structure comment on truth and reliability?"

Test: Give an LLM ONLY the MKF distillation + questions. Compare accuracy against the same LLM given the full reflections + questions.

**Target**: 85%+ accuracy for factual/thematic, 70%+ for interpretive (interpretive depends on the specific insights the agent had, which may not be recoverable from compressed form).

### Token Efficiency Score

```
TES = (QA_accuracy / baseline_accuracy) / (MKF_tokens / reflection_tokens)
```

A TES > 1.0 means the MKF is more efficient than raw reflections (better accuracy per token). Target: TES ≥ 1.5 (the compression actually HELPS by removing noise).

## Implementation Roadmap

### Phase A: Format Validation (Next)
1. Finish reading Frankenstein (all 31 chapters)
2. Generate MKF incrementally during reading
3. After completion, do final compression pass
4. Run adversarial Q&A validation
5. Measure token counts and TES

### Phase B: Automation
1. Build MKF extraction into `@marginalia/core`
2. Automatic tier-1 extraction from reflections (structured prompting)
3. Automatic merge/deduplication
4. Post-reading compression pipeline
5. Validation harness (auto-generates QA, measures accuracy)

### Phase C: Fine-Tuning Bridge
1. MKF → QA pair generator
2. MKF → instruction tuning data formatter
3. LoRA training script for Ollama/Qwen 2.5
4. Benchmark: model with fine-tuning vs model with MKF in context vs model with nothing

## Open Questions

1. **Optimal tier-1/tier-2 ratio**: Current split is ~45%/55%. Should structural get more? Does this vary by genre?
2. **Cross-book MKF**: When an agent has read 10 books, should there be a meta-MKF that captures cross-book connections? Or do individual `@connections` entries suffice?
3. **Genre adaptation**: Fiction vs non-fiction may need different tier-1 syntax. Non-fiction might need `@argument` and `@evidence` blocks instead of `@theme` and `@rel`.
4. **Incremental vs batch**: Is it better to build MKF incrementally (during reading) or in a single pass (post-reading)? Incremental is more resilient to crashes but may produce less coherent distillations.
5. **LLM-as-compressor quality**: How much does the compressing model matter? Can Haiku compress as well as Opus? If so, compression can be cheap.

---

*The format that earns its place is the one that makes agents wiser per token.*
*— Aiden, February 6, 2026*
