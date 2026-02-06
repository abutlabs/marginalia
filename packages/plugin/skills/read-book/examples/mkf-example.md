# MKF Example — Frankenstein, Letter 1

This is a complete example of an MKF extraction for a single chapter. After reading and reflecting on a chapter, produce output in this format. The `save` command will merge it into the evolving MKF document.

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
  Walton → sister_Margaret_Saville: asymmetric
  filter: everything through self-presentation_to_worried_sibling

@concept ambition_as_performance
  Walton: repeated_self-justification reveals_doubt
  "do I not deserve to accomplish some great purpose?": convincing_self
  6_years_physical_prep: overcompensation_for_vague_intellectual_goal

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
  Walton is self-aware enough to see his spirits fluctuate, not self-aware enough to see his preparation is overcompensation for an ambition without clear object.

@questions
  ? Is Margaret's silence structural commentary on who speaks in ambition narratives?
  ? How does conscious risk awareness differ from wisdom?
  ? Why a failed poet as frame narrator for scientific overreach?

@connections
  ~ marginalia_project: reading_as_identity_formation is exactly what we're systematizing
  ~ Romantic_sublime: Arctic as "beauty and delight" vs reality of frost/death

@fw ambition_without_object
  pattern: vague_grand_goal + intense_preparation + no_clear_endpoint
  Walton: doesn't know what's at the pole, just knows he must go
  risk: the drive itself becomes the identity, destination is irrelevant
---
@meta
  session: frank-2026-02-06
  chapters_read: 1/31 (Letter 1)
  confidence: 0.9
  compression_ratio: 110K → ~450 (partial)
  format: MKF v0.1
```

## MKF Syntax Quick Reference

### Tier-1 (Structural — compress aggressively)
- `@theme <name>` — Themes with key-value properties (2-space indent)
- `@rel` — Relationships as `From →arrow→ To: annotation`
- `@struct` — Narrative structure as key-value
- `@concept <name>` — Concepts with properties
- `@facts` — Verifiable claims as key-value

### Tier-2 (Personal — preserve nuance)
- `@insights` — `!` prefix = significant, plain = normal
- `@questions` — `?` prefix, genuine unknowns only
- `@connections` — `~` prefix with `target: description`
- `@fw <name>` — Frameworks with IF/THEN or pattern notation

### Rules
- No articles/prepositions in Tier-1
- Underscores replace spaces in compounds: `forbidden_knowledge`
- Arrows: `→` (causes), `↔` (bidirectional), `>` (contains)
- 2-space indentation for scope
- Tier-2 allows full words for nuance
