import { describe, expect, it, vi } from "vitest";

const groqProviderCtor = vi.hoisted(() => vi.fn());

vi.mock("@/core/ai/providers/groq", () => ({
  GroqAIProvider: groqProviderCtor,
}));

const { createAIProvider } = await import("@/core/ai/create-provider");

describe("createAIProvider", () => {
  it("creates a Groq provider when config is valid", () => {
    const config = {
      provider: "groq" as const,
      model: "llama",
      commitConvention: "conventional" as const,
      language: "en" as const,
      maxSubjectLength: 72,
      allowEmoji: false,
      confirmBeforeCommit: true,
      confirmBeforePush: true,
      scopeStrategy: "auto" as const,
      groqApiKey: "secret",
      rules: [],
      allowedScopes: [],
      forbiddenPatterns: [],
      fewShotExamples: [],
    };

    createAIProvider(config);

    expect(groqProviderCtor).toHaveBeenCalledWith("secret", "llama");
  });

  it("fails when the Groq API key is missing", () => {
    const config = {
      provider: "groq" as const,
      model: "llama",
      commitConvention: "conventional" as const,
      language: "en" as const,
      maxSubjectLength: 72,
      allowEmoji: false,
      confirmBeforeCommit: true,
      confirmBeforePush: true,
      scopeStrategy: "auto" as const,
      rules: [],
      allowedScopes: [],
      forbiddenPatterns: [],
      fewShotExamples: [],
    };

    expect(() => createAIProvider(config)).toThrowError(/Missing Groq API key/);
  });
});
