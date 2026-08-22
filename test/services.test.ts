import { beforeEach, describe, expect, it, vi } from "vitest";

const providerMock = vi.hoisted(() => ({
  generateCommitSuggestions: vi.fn(),
}));

interface CreateAIProviderMockOptions {
  onFallback?: (from: string, to: string, reason: { code: string }) => void;
}

const createAIProviderMock = vi.hoisted(() =>
  vi.fn<
    (
      config: unknown,
      options?: CreateAIProviderMockOptions,
    ) => typeof providerMock
  >(() => providerMock),
);
const getProviderLabelMock = vi.hoisted(() =>
  vi.fn((provider: string) => (provider === "groq" ? "Groq" : "Gemini")),
);

vi.mock("@/core/ai/create-provider", () => ({
  createAIProvider: createAIProviderMock,
  getProviderLabel: getProviderLabelMock,
}));

const outputMock = vi.hoisted(() => ({
  printSuccess: vi.fn(),
  printWarning: vi.fn(),
}));

vi.mock("@/core/ui/output", () => outputMock);

const { generateSuggestionsFromDiff } = await import("@/cli/services");

describe("generateSuggestionsFromDiff", () => {
  const config = {
    provider: "groq" as const,
    model: "llama",
    commitConvention: "conventional" as const,
    language: "en" as const,
    maxSubjectLength: 10,
    allowEmoji: true,
    confirmBeforeCommit: true,
    confirmBeforePush: true,
    scopeStrategy: "auto" as const,
    apiKeys: { groq: "secret" },
    rules: ["Use imperative mood"],
    allowedScopes: ["auth", "api"],
    forbiddenPatterns: ["wip"],
    fewShotExamples: [{ commit: "feat(api): add webhook handler" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    providerMock.generateCommitSuggestions.mockResolvedValue({
      summary: "summary",
      suggestions: [
        {
          type: "feat",
          scope: "api",
          subject: "add a very long feature subject",
        },
        { type: "fix", subject: "fix issue" },
        { type: "docs", subject: "write docs" },
      ],
    });
  });

  it("builds provider input from the diff and truncates output to two suggestions", async () => {
    const diff = `diff --git a/src/app.ts b/src/app.ts\n+hello`;

    const result = await generateSuggestionsFromDiff(diff, config);

    expect(createAIProviderMock).toHaveBeenCalledWith(
      config,
      expect.objectContaining({ onFallback: expect.any(Function) }),
    );
    expect(providerMock.generateCommitSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        diff,
        fileNames: ["src/app.ts"],
        language: "en",
        scopeStrategy: "auto",
        maxSubjectLength: 10,
        allowEmoji: true,
        rules: ["Use imperative mood"],
        allowedScopes: ["auth", "api"],
        forbiddenPatterns: ["wip"],
        fewShotExamples: [{ commit: "feat(api): add webhook handler" }],
      }),
    );
    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions[0].subject.length).toBeLessThanOrEqual(10);
  });

  it("uses manual scope strategy when scope is forced", async () => {
    const diff = `diff --git a/src/app.ts b/src/app.ts\n+hello`;

    const result = await generateSuggestionsFromDiff(diff, config, {
      scope: "auth",
    });

    expect(providerMock.generateCommitSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeStrategy: "manual",
        scope: "auth",
      }),
    );
    expect(result.suggestions[0].scope).toBe("auth");
  });

  it("disables scope when noScope is enabled", async () => {
    const diff = `diff --git a/src/app.ts b/src/app.ts\n+hello`;

    const result = await generateSuggestionsFromDiff(diff, config, {
      noScope: true,
    });

    expect(providerMock.generateCommitSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeStrategy: "none",
      }),
    );
    expect(result.suggestions[0].scope).toBeUndefined();
  });

  it("prints a warning and success message when the provider mock reports a fallback", async () => {
    createAIProviderMock.mockImplementationOnce((_config, options) => {
      options?.onFallback?.("groq", "gemini", { code: "AI_RATE_LIMITED" });
      return providerMock;
    });

    const diff = `diff --git a/src/app.ts b/src/app.ts\n+hello`;

    await generateSuggestionsFromDiff(diff, config);

    expect(outputMock.printWarning).toHaveBeenCalledWith(
      "Groq unavailable (rate limited) — falling back to Gemini...",
    );
    expect(outputMock.printSuccess).toHaveBeenCalledWith(
      "Suggestions generated via Gemini",
    );
  });

  it("stays silent about the provider when no fallback occurs", async () => {
    const diff = `diff --git a/src/app.ts b/src/app.ts\n+hello`;

    await generateSuggestionsFromDiff(diff, config);

    expect(outputMock.printWarning).not.toHaveBeenCalled();
    expect(outputMock.printSuccess).not.toHaveBeenCalled();
  });
});
