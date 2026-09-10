import { createAIProvider, getProviderLabel } from "@/core/ai/create-provider";
import { describeFallbackReason } from "@/core/ai/fallback-provider";
import { extractFileNamesFromDiff, truncateDiff } from "@/core/commit/diff";
import { applyScopeOverride, truncateSubject } from "@/core/commit/format";
import { printSuccess, printWarning } from "@/core/ui/output";
import { withSpinner } from "@/core/ui/spinner";
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
  const fallbackNotices: string[] = [];

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

  const result = await withSpinner(
    spinnerMessages(getProviderLabel(config.provider)),
    (spinner) => {
      const provider = createAIProvider(config, {
        onFallback: (from, to, reason) => {
          activeProvider = to;
          fallbackNotices.push(
            `${getProviderLabel(from)} unavailable (${describeFallbackReason(reason.code)}) — falling back to ${getProviderLabel(to)}...`,
          );
          spinner.update(spinnerMessages(getProviderLabel(to)));
        },
      });

      return provider.generateCommitSuggestions(input);
    },
  );

  for (const notice of fallbackNotices) {
    printWarning(notice);
  }

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

function spinnerMessages(providerLabel: string): string[] {
  return [
    `Sending the diff to ${providerLabel}...`,
    `${providerLabel} is analyzing the changes...`,
    `Generating commit suggestions...`,
    `${providerLabel} is still working...`,
  ];
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
