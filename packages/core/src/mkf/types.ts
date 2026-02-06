/**
 * MKF (Marginalia Knowledge Format) type definitions.
 *
 * MKF is a structured, non-prose format for compressing book knowledge
 * into token-efficient representations. Two tiers:
 * - Tier-1: Structural knowledge (themes, relationships, concepts, facts)
 * - Tier-2: Personal knowledge (insights, questions, connections, frameworks)
 */

/** A complete MKF document */
export interface MkfDocument {
  header: MkfHeader;
  tier1: MkfTier1;
  tier2: MkfTier2;
  meta: MkfMeta;
}

/** Book identification header (~30-50 tokens) */
export interface MkfHeader {
  book: string;
  by: string;
  id: string;
  tokens: string;
  words: string;
  chapters: number;
  read: string;
  reader?: string;
}

/** File envelope for .mkf files */
export interface MkfFileEnvelope {
  version: string;
  sha256?: string;
  content: string;
}

/** Tier-1: Structural knowledge — highly compressed */
export interface MkfTier1 {
  themes: MkfTheme[];
  relationships: MkfRelationship[];
  structure: MkfStructure;
  concepts: MkfConcept[];
  facts: MkfFacts;
}

/** A theme block with named properties */
export interface MkfTheme {
  name: string;
  properties: Record<string, string>;
}

/** A single typed relationship: From →arrow→ To: annotation */
export interface MkfRelationship {
  from: string;
  arrow: string;
  to: string;
  annotation: string;
}

/** Narrative/argumentative structure */
export interface MkfStructure {
  properties: Record<string, string>;
}

/** A concept block with named properties */
export interface MkfConcept {
  name: string;
  properties: Record<string, string>;
}

/** Key-value factual claims */
export interface MkfFacts {
  entries: Record<string, string>;
}

/** Tier-2: Personal knowledge — less compressed */
export interface MkfTier2 {
  insights: MkfInsight[];
  questions: MkfQuestion[];
  connections: MkfConnection[];
  frameworks: MkfFramework[];
}

/** An insight with optional significance flag */
export interface MkfInsight {
  significant: boolean;
  text: string;
}

/** An open question */
export interface MkfQuestion {
  text: string;
}

/** A cross-reference connection with target */
export interface MkfConnection {
  target: string;
  text: string;
}

/** An extracted reasoning framework */
export interface MkfFramework {
  name: string;
  properties: Record<string, string>;
}

/** Reading metadata */
export interface MkfMeta {
  session: string;
  chaptersRead: string;
  confidence: number;
  compressionRatio: string;
  needsReread?: string;
  distilledFrom?: string;
  format: string;
}
