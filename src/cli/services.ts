import { createAIProvider, getProviderLabel } from "@/core/ai/create-provider";
import { describeFallbackReason } from "@/core/ai/fallback-provider";
import { extractFileNamesFromDiff, truncateDiff } from "@/core/commit/diff";
import { applyScopeOverride, truncateSubject } from "@/core/commit/format";
import { printSuccess, printWarning } from "@/core/ui/output";
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
  let activeProvider = config.provider;

  const provider = createAIProvider(config, {
    onFallback: (from, to, reason) => {
      activeProvider = to;
      printWarning(
        `${getProviderLabel(from)} unavailable (${describeFallbackReason(reason.code)}) — falling back to ${getProviderLabel(to)}...`,
      );
    },
  });

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

  if (activeProvider !== config.provider) {
    printSuccess(
      `Suggestions generated via ${getProviderLabel(activeProvider)}`,
    );
  }

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
