import { describe, expect, it, vi } from "vitest";

import { AppError } from "@/core/errors/app-error";
import {
  describeFallbackReason,
  FallbackAIProvider,
} from "@/core/ai/fallback-provider";
import type { SuggestCommitInput, SuggestionResult } from "@/types";

const input = {
  diff: "diff --git a/file.ts b/file.ts",
  fileNames: ["file.ts"],
  language: "en",
  scopeStrategy: "auto",
  maxSubjectLength: 72,
  allowEmoji: false,
  rules: [],
  allowedScopes: [],
  forbiddenPatterns: [],
  fewShotExamples: [],
} satisfies SuggestCommitInput;

const success: SuggestionResult = {
  summary: "summary",
  suggestions: [{ type: "feat", subject: "add feature" }],
};

function fakeProvider(
  behavior: (() => Promise<SuggestionResult>) | AppError,
) {
  return {
    generateCommitSuggestions: vi.fn(() =>
      behavior instanceof AppError ? Promise.reject(behavior) : behavior(),
    ),
  };
}

describe("FallbackAIProvider", () => {
  it("returns the primary provider's result without calling onFallback", async () => {
    const primary = fakeProvider(() => Promise.resolve(success));
    const onFallback = vi.fn();

    const fallback = new FallbackAIProvider(
      [{ provider: "gemini", instance: primary }],
      onFallback,
    );

    await expect(fallback.generateCommitSuggestions(input)).resolves.toEqual(
      success,
    );
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("falls back on a retryable error and reports the switch", async () => {
    const rateLimited = new AppError({
      code: "AI_RATE_LIMITED",
      message: "Gemini rate limit reached.",
    });
    const primary = fakeProvider(rateLimited);
    const secondary = fakeProvider(() => Promise.resolve(success));
    const onFallback = vi.fn();

    const fallback = new FallbackAIProvider(
      [
        { provider: "gemini", instance: primary },
        { provider: "groq", instance: secondary },
      ],
      onFallback,
    );

    await expect(fallback.generateCommitSuggestions(input)).resolves.toEqual(
      success,
    );
    expect(onFallback).toHaveBeenCalledWith("gemini", "groq", rateLimited);
    expect(secondary.generateCommitSuggestions).toHaveBeenCalledTimes(1);
  });

  it.each(["AI_AUTH_FAILED", "AI_REQUEST_TOO_LARGE"])(
    "does not fall back on %s and bubbles the error immediately",
    async (code) => {
      const nonRetryable = new AppError({ code, message: "boom" });
      const primary = fakeProvider(nonRetryable);
      const secondary = fakeProvider(() => Promise.resolve(success));
      const onFallback = vi.fn();

      const fallback = new FallbackAIProvider(
        [
          { provider: "gemini", instance: primary },
          { provider: "groq", instance: secondary },
        ],
        onFallback,
      );

      await expect(
        fallback.generateCommitSuggestions(input),
      ).rejects.toBe(nonRetryable);
      expect(secondary.generateCommitSuggestions).not.toHaveBeenCalled();
      expect(onFallback).not.toHaveBeenCalled();
    },
  );

  it("aggregates every attempt when the whole chain fails", async () => {
    const geminiError = new AppError({
      code: "AI_RATE_LIMITED",
      message: "Gemini rate limit reached.",
    });
    const groqError = new AppError({
      code: "AI_NETWORK_ERROR",
      message: "Could not reach the Groq API.",
    });

    const fallback = new FallbackAIProvider([
      { provider: "gemini", instance: fakeProvider(geminiError) },
      { provider: "groq", instance: fakeProvider(groqError) },
    ]);

    await expect(fallback.generateCommitSuggestions(input)).rejects.toMatchObject(
      {
        code: "AI_ALL_PROVIDERS_FAILED",
        details: [
          "gemini: Gemini rate limit reached.",
          "groq: Could not reach the Groq API.",
        ],
      },
    );
  });

  it("does not wrap the error when only one provider is in the chain", async () => {
    const error = new AppError({ code: "AI_NETWORK_ERROR", message: "offline" });

    const fallback = new FallbackAIProvider([
      { provider: "groq", instance: fakeProvider(error) },
    ]);

    await expect(fallback.generateCommitSuggestions(input)).rejects.toBe(error);
  });
});

describe("describeFallbackReason", () => {
  it("maps known fallback-triggering codes to a short phrase", () => {
    expect(describeFallbackReason("AI_RATE_LIMITED")).toBe("rate limited");
    expect(describeFallbackReason("AI_NETWORK_ERROR")).toBe("network error");
    expect(describeFallbackReason("AI_PROVIDER_ERROR")).toBe(
      "provider unavailable",
    );
  });

  it("falls back to a generic phrase for unknown codes", () => {
    expect(describeFallbackReason("SOMETHING_ELSE")).toBe("request failed");
  });
});
