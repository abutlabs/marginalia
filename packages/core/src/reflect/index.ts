import type {
  ReadingState,
  ReadingContext,
  ContextWindowConfig,
  Chapter,
  Chunk,
} from "../types.js";
import { estimateTokens, truncateToTokens } from "../tokens.js";

const DEFAULT_CONTEXT_CONFIG: ContextWindowConfig = {
  totalBudget: 200_000,
  systemReserve: 5_000,
  outputReserve: 100_000,
  maxSummaryTokens: 15_000,
  maxReflectionTokens: 8_000,
};

/**
 * Build a reading context window optimized for the "Lost in the Middle" effect.
 *
 * Layout (top to bottom):
 * 1. Running summary (top — primacy position, high attention)
 * 2. Previous reflection (middle — lower attention, but provides continuity)
 * 3. Current text (bottom — recency position, high attention)
 *
 * This exploits the U-shaped attention curve: LLMs attend most to content
 * at the beginning and end of context, with degraded attention in the middle.
 */
export function buildReadingContext(
  state: ReadingState,
  currentText: string,
  config: Partial<ContextWindowConfig> = {},
): ReadingContext {
  const cfg = { ...DEFAULT_CONTEXT_CONFIG, ...config };
  const availableTokens = cfg.totalBudget - cfg.systemReserve - cfg.outputReserve;

  // 1. Current text gets priority (it's what we're reading)
  const currentTokens = estimateTokens(currentText);

  // 2. Running summary (truncate if needed)
  let summary = state.runningSummary;
  const summaryTokens = estimateTokens(summary);
  if (summaryTokens > cfg.maxSummaryTokens) {
    summary = truncateToTokens(summary, cfg.maxSummaryTokens);
  }
  const actualSummaryTokens = estimateTokens(summary);

  // 3. Previous reflection (most recent, truncate if needed)
  let previousReflection: string | undefined;
  let reflectionTokens = 0;

  if (state.reflections.length > 0) {
    const lastReflection = state.reflections[state.reflections.length - 1];
    previousReflection = formatReflection(lastReflection);
    reflectionTokens = estimateTokens(previousReflection);

    if (reflectionTokens > cfg.maxReflectionTokens) {
      previousReflection = truncateToTokens(
        previousReflection,
        cfg.maxReflectionTokens,
      );
      reflectionTokens = estimateTokens(previousReflection);
    }
  }

  // Check if everything fits
  const totalUsed = actualSummaryTokens + reflectionTokens + currentTokens;

  if (totalUsed > availableTokens) {
    // Prioritize: current text > summary > reflection
    const textBudget = Math.min(currentTokens, availableTokens * 0.6);
    const summaryBudget = Math.min(
      actualSummaryTokens,
      (availableTokens - textBudget) * 0.7,
    );
    const reflectionBudget = availableTokens - textBudget - summaryBudget;

    if (summaryBudget < actualSummaryTokens) {
      summary = truncateToTokens(summary, summaryBudget);
    }
    if (
      previousReflection &&
      reflectionBudget < reflectionTokens
    ) {
      if (reflectionBudget < 500) {
        previousReflection = undefined;
        reflectionTokens = 0;
      } else {
        previousReflection = truncateToTokens(
          previousReflection,
          reflectionBudget,
        );
        reflectionTokens = estimateTokens(previousReflection);
      }
    }
  }

  const finalTotal =
    estimateTokens(summary) + reflectionTokens + currentTokens;

  return {
    summary,
    previousReflection,
    currentText,
    totalTokens: finalTotal + cfg.systemReserve,
    remainingBudget: cfg.totalBudget - finalTotal - cfg.systemReserve,
  };
}

function formatReflection(
  reflection: import("../types.js").ChapterReflection,
): string {
  const parts = [
    `## Reflection: ${reflection.chapterTitle}`,
    "",
    reflection.rawReflection,
  ];

  if (reflection.forwardLooking.length > 0) {
    parts.push("", "### Watch for next:");
    for (const item of reflection.forwardLooking) {
      parts.push(`- ${item}`);
    }
  }

  return parts.join("\n");
}
