import { describe, expect, it, vi } from "vitest";

const groqProviderCtor = vi.hoisted(() => vi.fn());
const listGroqModelsMock = vi.hoisted(() => vi.fn());
const geminiProviderCtor = vi.hoisted(() => vi.fn());
const listGeminiModelsMock = vi.hoisted(() => vi.fn());

vi.mock("@/core/ai/providers/groq", () => ({
  GroqAIProvider: groqProviderCtor,
  listGroqModels: listGroqModelsMock,
}));

vi.mock("@/core/ai/providers/gemini", () => ({
  GeminiAIProvider: geminiProviderCtor,
  listGeminiModels: listGeminiModelsMock,
}));

const { createAIProvider, listModelsForProvider } = await import(
  "@/core/ai/create-provider"
);

const baseConfig = {
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

describe("createAIProvider", () => {
  it("creates a Groq provider when config is valid", () => {
    createAIProvider({
      ...baseConfig,
      provider: "groq",
      model: "llama",
      apiKeys: { groq: "secret" },
    });

    expect(groqProviderCtor).toHaveBeenCalledWith("secret", "llama");
  });

  it("fails when the Groq API key is missing", () => {
    expect(() =>
      createAIProvider({
        ...baseConfig,
        provider: "groq",
        model: "llama",
        apiKeys: {},
      }),
    ).toThrowError(/Missing Groq API key/);
  });

  it("creates a Gemini provider when config is valid", () => {
    createAIProvider({
      ...baseConfig,
      provider: "gemini",
      model: "gemini-2.5-flash",
      apiKeys: { gemini: "secret" },
    });

    expect(geminiProviderCtor).toHaveBeenCalledWith("secret", "gemini-2.5-flash");
  });

  it("fails when the Gemini API key is missing", () => {
    expect(() =>
      createAIProvider({
        ...baseConfig,
        provider: "gemini",
        model: "gemini-2.5-flash",
        apiKeys: {},
      }),
    ).toThrowError(/Missing Gemini API key/);
  });

  it("fails with UNSUPPORTED_PROVIDER for a provider not in the registry", () => {
    expect(() =>
      createAIProvider({
        ...baseConfig,
        // Cast needed: exercises the registry's defensive fallback for a
        // provider name that isn't (or is no longer) registered.
        provider: "openai" as unknown as "gemini" | "groq",
        model: "gpt-4",
        apiKeys: {},
      }),
    ).toThrowError(/Unsupported provider: openai/);
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

  it("delegates to Gemini's listModels", async () => {
    listGeminiModelsMock.mockResolvedValue([
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    ]);

    await expect(listModelsForProvider("gemini", "secret")).resolves.toEqual([
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    ]);
    expect(listGeminiModelsMock).toHaveBeenCalledWith("secret");
  });

  it("fails with UNSUPPORTED_PROVIDER for a provider not in the registry", async () => {
    await expect(
      listModelsForProvider("openai" as unknown as "gemini" | "groq", "secret"),
    ).rejects.toThrowError(/Unsupported provider: openai/);
  });
});
