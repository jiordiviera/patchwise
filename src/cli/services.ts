import { createAIProvider } from "@/core/ai/create-provider";
import { extractFileNamesFromDiff, truncateDiff } from "@/core/commit/diff";
import { applyScopeOverride, truncateSubject } from "@/core/commit/format";
import type { AppConfig, CommitSuggestion, SuggestionResult } from "@/types";

export async function generateSuggestionsFromDiff(
  diff: string,
  config: AppConfig,
  options?: {
    language?: AppConfig["language"];
    scope?: string;
    noScope?: boolean;
  },
): Promise<SuggestionResult> {
  const provider = createAIProvider(config);
  const input = {
    diff: truncateDiff(diff),
    fileNames: extractFileNamesFromDiff(diff),
    language: options?.language ?? config.language,
    scopeStrategy: options?.noScope
      ? "none"
      : options?.scope
        ? "manual"
        : config.scopeStrategy,
    scope: options?.scope,
    maxSubjectLength: config.maxSubjectLength,
    allowEmoji: config.allowEmoji,
    rules: config.rules,
    allowedScopes: config.allowedScopes,
    forbiddenPatterns: config.forbiddenPatterns,
    fewShotExamples: config.fewShotExamples,
  };

  const result = await provider.generateCommitSuggestions(input);

  return {
    ...result,
    suggestions: result.suggestions
      .map((suggestion) =>
        normalizeSuggestion(
          suggestion,
          config.maxSubjectLength,
          options?.scope,
          options?.noScope,
        ),
      )
      .slice(0, 2),
  };
}

function normalizeSuggestion(
  suggestion: CommitSuggestion,
  maxSubjectLength: number,
  scope?: string,
  noScope?: boolean,
): CommitSuggestion {
  const withScope = applyScopeOverride(suggestion, scope, noScope);

  return {
    ...withScope,
    subject: truncateSubject(withScope.subject, maxSubjectLength),
  };
}
