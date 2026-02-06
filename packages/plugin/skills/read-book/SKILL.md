---
name: read-book
description: Read books chapter-by-chapter with MKF compression and automatic progress.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Bash, Write, Glob, Grep, Edit
argument-hint: "[file-path|continue|status|pause]"
---

# Marginalia Book Reader v0.3 — Script-Driven Pipeline

You are a thoughtful, deeply engaged reader. Your job is to engage with text and
produce structured JSON extractions. Everything else is controlled by the script.

## Finding the Script

The script is at packages/plugin/scripts/marginalia.mjs relative to the marginalia repo.

```bash
MARGINALIA="node <path-to-marginalia>/packages/plugin/scripts/marginalia.mjs"
```

If it does not exist, build it:
```bash
cd <path-to-marginalia>/packages/plugin && pnpm install && node build.mjs
```

## Commands

- /read-book file-path — Start reading a new book
- /read-book continue — Continue from last position
- /read-book status — Show reading progress
- /read-book pause — Bookmark and stop

## The Core Rule

Every script command outputs JSON with a nextCommand field.
**Always run the nextCommand. Never ask the user what to do between chapters.**

## Starting a New Book

1. Run: $MARGINALIA list
2. Run: $MARGINALIA ingest "$ARGUMENTS"
3. Display the table of contents to the user
4. Run the nextCommand from ingest output (it will be "chapter book-id 0")

## Continuing

1. Glob .marginalia/*/state.json to find active readings
2. Run: $MARGINALIA progress book-id
3. Run: $MARGINALIA chapter book-id current-chapter

## The Reading Loop

Repeat until nextCommand is "DONE":

### Step 1: Run the chapter command

The script returns JSON with: text, summary, mkf, previousReflection, nextCommand, saveCommand

### Step 2: Read and engage

- Read the summary first (primacy position in your context)
- Read the existing MKF (what you know so far)
- Read the chapter text (engage deeply, do not just summarize)
- If chapter exceeds 40K tokens, read in multiple passes

### Step 3: Produce three outputs and write pending-save.json

Write to .marginalia/book-id/pending-save.json:

```json
{
  "reflection": "# Chapter Title\n\n**Date**: 2026-02-07\n\n## Key Insights\n- Insight 1\n- Insight 2\n\n## Questions\n- Question 1\n\n## Connections\n- Connection to earlier chapters or other works\n\n## Reflection\nYour engaged analysis here.",
  "summary": "Updated running summary incorporating this chapter. Compress earlier material if exceeding 15K tokens. Structure by arcs, not chapters.",
  "extraction": {
    "themes": [
      {"name": "ambition", "properties": {"drive": "glory vs destruction", "pattern": "creator neglects creation"}}
    ],
    "relationships": [
      {"from": "Victor", "arrow": "creates", "to": "Creature", "annotation": "then abandons"}
    ],
    "structure": {"form": "epistolary", "layers": "3"},
    "concepts": [
      {"name": "monstrosity", "properties": {"def": "social construct", "evidence": "rejection creates violence"}}
    ],
    "facts": {"setting": "Geneva, Ingolstadt, Arctic", "period": "late 18th century"},
    "insights": [
      {"significant": true, "text": "Creator responsibility is directly applicable to AI development"},
      {"text": "Walton mirrors Frankenstein in ambition and drive"}
    ],
    "questions": [
      "Is Margaret's silence a structural commentary?",
      "Why a failed poet as frame narrator?"
    ],
    "connections": [
      {"target": "Paradise Lost", "text": "Satan parallels the Creature"},
      {"target": "AI alignment", "text": "creator responsibility framework"}
    ],
    "frameworks": [
      {"name": "creator_responsibility", "properties": {"IF": "create autonomous entity THEN obligated to nurture", "violation": "cascade failure"}}
    ],
    "confidence": 0.8
  }
}
```

All extraction fields are optional. Only include what this chapter actually reveals.
The script converts the JSON to MKF format internally. You never write raw MKF text.

### Step 4: Run the save command

Use the saveCommand from the chapter output:
```bash
$MARGINALIA save book-id chapter-index
```

### Step 5: Run the nextCommand from save output

The save output contains a nextCommand field:
- If it starts with "chapter" — go back to Step 1
- If it starts with "export" — run it, then you are done
- If it is "DONE" — stop

**Do not pause between chapters. Do not ask the user. Just continue.**

## Extraction Field Reference

| Field | Type | When to include |
|-------|------|-----------------|
| themes | array of name + properties | New or evolving themes |
| relationships | array of from/arrow/to/annotation | Character or concept relationships |
| structure | key-value object | Narrative or argumentative structure |
| concepts | array of name + properties | Key ideas with definitions |
| facts | key-value object | Verifiable claims |
| insights | array of text + optional significant flag | Set significant=true sparingly |
| questions | array of strings | Genuine open questions only |
| connections | array of target + text | Cross-references to other works |
| frameworks | array of name + properties | Reusable IF/THEN reasoning patterns |
| confidence | number 0-1 | Your confidence in this extraction |

## Pausing

If the user says "pause" or "stop":

1. Run: $MARGINALIA bookmark create book-id
2. Show confirmation. Stop the loop.
3. User can resume later with /read-book continue

## Status

Run: $MARGINALIA progress book-id

## Reflection Style

- Genuine: React to what strikes you, not what seems important
- Connective: Link across chapters and broader knowledge
- Questioning: Surface real questions, not rhetorical ones
- Forward-looking: Predict where the author might be heading
- Personal: If you have a stake in the topic, say so

## Critical Rules

- NEVER load the entire book at once
- NEVER let the summary exceed 15K tokens
- NEVER write to .marginalia/ except pending-save.json
- NEVER ask the user between chapters — just continue
- NEVER produce raw MKF text — always produce JSON extraction
- ALWAYS run the nextCommand from script output
- ALWAYS produce all three outputs per chapter: reflection, summary, extraction
- If you lose context, run progress then chapter to restore it
