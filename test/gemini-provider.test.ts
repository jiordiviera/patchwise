import { beforeEach, describe, expect, it, vi } from "vitest";

const buildPromptMock = vi.hoisted(() => vi.fn(() => "prompt"));

vi.mock("@/core/ai/prompt", () => ({
  buildPrompt: buildPromptMock,
}));

const { GeminiAIProvider, listGeminiModels } = await import(
  "@/core/ai/providers/gemini"
);

describe("gemini provider", () => {
  const input = {
    diff: "diff --git a/file.ts b/file.ts",
    fileNames: ["file.ts"],
    language: "en" as const,
    scopeStrategy: "auto" as const,
    maxSubjectLength: 72,
    allowEmoji: false,
    rules: [],
    allowedScopes: [],
    forbiddenPatterns: [],
    fewShotExamples: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed suggestions on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      summary: "summary",
                      suggestions: [
                        { emoji: "✨", type: "feat", subject: "add feature" },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );

    const provider = new GeminiAIProvider("key", "gemini-2.5-flash");

    await expect(provider.generateCommitSuggestions(input)).resolves.toEqual({
      summary: "summary",
      suggestions: [
        {
          emoji: "✨",
          type: "feat",
          subject: "add feature",
          scope: undefined,
          body: undefined,
        },
      ],
    });
  });

  it("sends the api key via the x-goog-api-key header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: "summary",
                    suggestions: [{ type: "feat", subject: "add feature" }],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiAIProvider("secret-key", "gemini-2.5-flash");
    await provider.generateCommitSuggestions(input);

    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    );
    expect(requestInit.headers["x-goog-api-key"]).toBe("secret-key");
  });

  it("maps network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const provider = new GeminiAIProvider("key", "gemini-2.5-flash");

    await expect(provider.generateCommitSuggestions(input)).rejects.toMatchObject({
      code: "AI_NETWORK_ERROR",
    });
  });

  it("maps authentication failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({
            error: { code: 401, message: "API key not valid", status: "UNAUTHENTICATED" },
          }),
        ),
      }),
    );

    const provider = new GeminiAIProvider("key", "gemini-2.5-flash");

    await expect(provider.generateCommitSuggestions(input)).rejects.toMatchObject({
      code: "AI_AUTH_FAILED",
      details: ["UNAUTHENTICATED: API key not valid"],
    });
  });

  it("maps rate limiting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: vi.fn().mockResolvedValue("too many requests"),
      }),
    );

    const provider = new GeminiAIProvider("key", "gemini-2.5-flash");

    await expect(provider.generateCommitSuggestions(input)).rejects.toMatchObject({
      code: "AI_RATE_LIMITED",
    });
  });

  it("reports a blocked prompt as an empty response with the block reason", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          promptFeedback: { blockReason: "SAFETY" },
        }),
      }),
    );

    const provider = new GeminiAIProvider("key", "gemini-2.5-flash");

    await expect(provider.generateCommitSuggestions(input)).rejects.toMatchObject({
      code: "AI_EMPTY_RESPONSE",
      message: "Gemini blocked the response (SAFETY).",
    });
  });

  it("maps invalid json payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: "{not-json" }] } }],
        }),
      }),
    );

    const provider = new GeminiAIProvider("key", "gemini-2.5-flash");

    await expect(provider.generateCommitSuggestions(input)).rejects.toMatchObject({
      code: "AI_INVALID_RESPONSE",
    });
  });
});

describe("listGeminiModels", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns only models that support generateContent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          models: [
            {
              name: "models/gemini-2.5-flash",
              displayName: "Gemini 2.5 Flash",
              supportedGenerationMethods: ["generateContent"],
            },
            {
              name: "models/embedding-001",
              displayName: "Embedding",
              supportedGenerationMethods: ["embedContent"],
            },
          ],
        }),
      }),
    );

    await expect(listGeminiModels("secret")).resolves.toEqual([
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    ]);
  });

  it("maps authentication failures to AppError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: vi.fn().mockResolvedValue("forbidden"),
      }),
    );

    await expect(listGeminiModels("secret")).rejects.toMatchObject({
      code: "AI_AUTH_FAILED",
    });
  });

  it("maps network failures to AppError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(listGeminiModels("secret")).rejects.toMatchObject({
      code: "AI_NETWORK_ERROR",
    });
  });
});
