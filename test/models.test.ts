import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchGroqModels } = await import("@/core/ai/models");

describe("fetchGroqModels", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns active models sorted by formatted name", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [
            { id: "llama-3.3-70b-versatile", active: true },
            { id: "gemma-2-9b-it", active: false },
            { id: "llama-3.1-8b-instant" },
          ],
        }),
      }),
    );

    await expect(fetchGroqModels("secret")).resolves.toEqual([
      {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8b Instant",
        active: true,
      },
      {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70b Versatile",
        active: true,
      },
    ]);
  });

  it("fails when the API rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );

    await expect(fetchGroqModels("secret")).rejects.toThrow(
      /Failed to fetch models \(401\)/,
    );
  });
});
