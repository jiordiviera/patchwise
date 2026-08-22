import { AppError, toAppError } from "@/core/errors/app-error";
import type {
  AIProvider,
  ProviderName,
  SuggestCommitInput,
  SuggestionResult,
} from "@/types";

// Only failures that are plausibly transient (and provider-specific) are
// worth retrying with another provider. Auth failures and oversized
// requests almost always have the same root cause on every provider, so
// they bubble up immediately instead of burning a second API call.
const FALLBACK_TRIGGER_CODES = new Set([
  "AI_NETWORK_ERROR",
  "AI_RATE_LIMITED",
  "AI_PROVIDER_ERROR",
]);

const FALLBACK_REASONS: Record<string, string> = {
  AI_NETWORK_ERROR: "network error",
  AI_RATE_LIMITED: "rate limited",
  AI_PROVIDER_ERROR: "provider unavailable",
};

export function describeFallbackReason(code: string): string {
  return FALLBACK_REASONS[code] ?? "request failed";
}

export interface FallbackChainEntry {
  provider: ProviderName;
  instance: AIProvider;
}

export type FallbackListener = (
  from: ProviderName,
  to: ProviderName,
  reason: AppError,
) => void;

interface Attempt {
  provider: ProviderName;
  error: AppError;
}

export class FallbackAIProvider implements AIProvider {
  constructor(
    private readonly chain: FallbackChainEntry[],
    private readonly onFallback?: FallbackListener,
  ) {
    if (chain.length === 0) {
      throw new Error("FallbackAIProvider requires at least one provider.");
    }
  }

  async generateCommitSuggestions(
    input: SuggestCommitInput,
  ): Promise<SuggestionResult> {
    const attempts: Attempt[] = [];

    for (const [index, entry] of this.chain.entries()) {
      try {
        return await entry.instance.generateCommitSuggestions(input);
      } catch (error) {
        const appError = toAppError(error);
        attempts.push({ provider: entry.provider, error: appError });

        const next = this.chain[index + 1];
        const canFallback = next && FALLBACK_TRIGGER_CODES.has(appError.code);

        if (!canFallback) {
          throw aggregateAttempts(attempts);
        }

        this.onFallback?.(entry.provider, next.provider, appError);
      }
    }

    throw aggregateAttempts(attempts);
  }
}

function aggregateAttempts(attempts: Attempt[]): AppError {
  if (attempts.length <= 1) {
    return attempts[0].error;
  }

  return new AppError({
    code: "AI_ALL_PROVIDERS_FAILED",
    message: "All configured AI providers failed to generate suggestions.",
    hint: "Check your API keys and network connection, then try again.",
    details: attempts.map(
      (attempt) => `${attempt.provider}: ${attempt.error.message}`,
    ),
    cause: attempts[attempts.length - 1].error,
  });
}
