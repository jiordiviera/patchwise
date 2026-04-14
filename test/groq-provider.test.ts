import { beforeEach, describe, expect, it, vi } from "vitest";

const buildPromptMock = vi.hoisted(() => vi.fn(() => "prompt"));

vi.mock("@/core/ai/prompt", () => ({
  buildPrompt: buildPromptMock,
}));

const { GroqAIProvider } = await import("@/core/ai/providers/groq");

describe("groq provider", () => {
  const input = {
    diff: "diff --git a/file.ts b/file.ts",
    fileNames: ["file.ts"],
    language: "en" as const,
    scopeStrategy: "auto" as const,
    maxSubjectLength: 72,
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
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "summary",
                  suggestions: [{ type: "feat", subject: "add feature" }],
                }),
              },
            },
          ],
        }),
      }),
    );

    const provider = new GroqAIProvider("key", "model");

    await expect(provider.generateCommitSuggestions(input)).resolves.toEqual({
      summary: "summary",
      suggestions: [{ type: "feat", subject: "add feature", scope: undefined, body: undefined }],
    });
  });

  it("maps network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const provider = new GroqAIProvider("key", "model");

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
        text: vi.fn().mockResolvedValue("invalid api key"),
      }),
    );

    const provider = new GroqAIProvider("key", "model");

    await expect(provider.generateCommitSuggestions(input)).rejects.toMatchObject({
      code: "AI_AUTH_FAILED",
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

    const provider = new GroqAIProvider("key", "model");

    await expect(provider.generateCommitSuggestions(input)).rejects.toMatchObject({
      code: "AI_RATE_LIMITED",
    });
  });

  it("maps invalid json payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: "{not-json",
              },
            },
          ],
        }),
      }),
    );

    const provider = new GroqAIProvider("key", "model");

    await expect(provider.generateCommitSuggestions(input)).rejects.toMatchObject({
      code: "AI_INVALID_RESPONSE",
    });
  });

  it("maps schema validation failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: 42,
                  suggestions: [],
                }),
              },
            },
          ],
        }),
      }),
    );

    const provider = new GroqAIProvider("key", "model");

    await expect(provider.generateCommitSuggestions(input)).rejects.toMatchObject({
      code: "AI_INVALID_RESPONSE",
    });
  });

  it("fails on empty model output", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "" } }],
        }),
      }),
    );

    const provider = new GroqAIProvider("key", "model");

    await expect(provider.generateCommitSuggestions(input)).rejects.toMatchObject({
      code: "AI_EMPTY_RESPONSE",
    });
  });
});
