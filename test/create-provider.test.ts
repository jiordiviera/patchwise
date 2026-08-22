import { describe, expect, it, vi } from "vitest";

const groqProviderCtor = vi.hoisted(() => vi.fn());
const listGroqModelsMock = vi.hoisted(() => vi.fn());

vi.mock("@/core/ai/providers/groq", () => ({
  GroqAIProvider: groqProviderCtor,
  listGroqModels: listGroqModelsMock,
}));

const { createAIProvider, listModelsForProvider } = await import(
  "@/core/ai/create-provider"
);

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
      apiKeys: { groq: "secret" },
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
      apiKeys: {},
      rules: [],
      allowedScopes: [],
      forbiddenPatterns: [],
      fewShotExamples: [],
    };

    expect(() => createAIProvider(config)).toThrowError(/Missing Groq API key/);
  });

  it("fails with UNSUPPORTED_PROVIDER for a provider not yet registered", () => {
    const config = {
      provider: "gemini" as const,
      model: "gemini-2.5-flash",
      commitConvention: "conventional" as const,
      language: "en" as const,
      maxSubjectLength: 72,
      allowEmoji: false,
      confirmBeforeCommit: true,
      confirmBeforePush: true,
      scopeStrategy: "auto" as const,
      apiKeys: { gemini: "secret" },
      rules: [],
      allowedScopes: [],
      forbiddenPatterns: [],
      fewShotExamples: [],
    };

    expect(() => createAIProvider(config)).toThrowError(/Unsupported provider: gemini/);
  });
});

describe("listModelsForProvider", () => {
  it("delegates to the registered provider's listModels", async () => {
    listGroqModelsMock.mockResolvedValue([{ id: "llama", name: "Llama" }]);

    await expect(listModelsForProvider("groq", "secret")).resolves.toEqual([
      { id: "llama", name: "Llama" },
    ]);
    expect(listGroqModelsMock).toHaveBeenCalledWith("secret");
  });

  it("fails with UNSUPPORTED_PROVIDER for a provider not yet registered", async () => {
    await expect(
      listModelsForProvider("gemini", "secret"),
    ).rejects.toThrowError(/Unsupported provider: gemini/);
  });
});
