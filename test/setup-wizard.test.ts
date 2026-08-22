import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.hoisted(() => vi.fn());
const passwordMock = vi.hoisted(() => vi.fn());
const inputMock = vi.hoisted(() => vi.fn());
const confirmMock = vi.hoisted(() => vi.fn());
const checkboxMock = vi.hoisted(() => vi.fn());

vi.mock("@inquirer/prompts", () => ({
  select: selectMock,
  password: passwordMock,
  input: inputMock,
  confirm: confirmMock,
  checkbox: checkboxMock,
}));

const listModelsForProviderMock = vi.hoisted(() => vi.fn());

vi.mock("@/core/ai/create-provider", () => ({
  listModelsForProvider: listModelsForProviderMock,
  getProviderLabel: (provider: string) =>
    provider === "groq" ? "Groq" : "Gemini",
  DEFAULT_MODEL_BY_PROVIDER: {
    gemini: "gemini-2.5-flash",
    groq: "llama-3.3-70b-versatile",
  },
}));

const outputMock = vi.hoisted(() => ({
  printSetupSummary: vi.fn(),
  printWarning: vi.fn(),
}));

vi.mock("@/core/ui/output", () => outputMock);

const { promptForSetup } = await import("@/core/ui/prompts");

describe("promptForSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listModelsForProviderMock.mockResolvedValue([
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    ]);
  });

  it("resolves a primary provider, key, and model with no fallback configured", async () => {
    selectMock
      .mockResolvedValueOnce("gemini") // provider
      .mockResolvedValueOnce("gemini-2.5-flash") // model
      .mockResolvedValueOnce("en"); // language
    passwordMock.mockResolvedValueOnce("gemini-secret");
    confirmMock
      .mockResolvedValueOnce(false) // "Configure a fallback provider?" -> No
      .mockResolvedValueOnce(true); // "Use emoji in commit messages?" -> Yes

    const answers = await promptForSetup({});

    expect(answers).toEqual({
      provider: "gemini",
      model: "gemini-2.5-flash",
      language: "en",
      allowEmoji: true,
      apiKeys: { gemini: "gemini-secret" },
      fallbackProvider: undefined,
    });
    expect(outputMock.printSetupSummary).toHaveBeenCalledWith({
      provider: "Gemini",
      model: "gemini-2.5-flash",
      fallbackProvider: undefined,
      language: "English",
      allowEmoji: true,
    });
  });

  it("falls back to manual model entry and reports why the fetch failed", async () => {
    listModelsForProviderMock.mockRejectedValue(new Error("network down"));
    selectMock.mockResolvedValueOnce("gemini").mockResolvedValueOnce("en");
    passwordMock.mockResolvedValueOnce("gemini-secret");
    inputMock.mockResolvedValueOnce("gemini-2.0-flash");
    confirmMock.mockResolvedValueOnce(false).mockResolvedValueOnce(false);

    const answers = await promptForSetup({});

    expect(outputMock.printWarning).toHaveBeenCalledWith(
      "Could not fetch Gemini models: network down",
    );
    expect(answers.model).toBe("gemini-2.0-flash");
  });

  it("configures a new fallback provider and prompts for its api key", async () => {
    selectMock
      .mockResolvedValueOnce("gemini") // primary provider
      .mockResolvedValueOnce("gemini-2.5-flash") // primary model
      .mockResolvedValueOnce("groq") // fallback provider choice
      .mockResolvedValueOnce("en"); // language
    passwordMock
      .mockResolvedValueOnce("gemini-secret") // primary key
      .mockResolvedValueOnce("groq-secret"); // fallback key (none on file)
    confirmMock
      .mockResolvedValueOnce(true) // "Configure a fallback provider?" -> Yes
      .mockResolvedValueOnce(false); // emoji

    const answers = await promptForSetup({});

    expect(answers.fallbackProvider).toBe("groq");
    expect(answers.apiKeys).toEqual({
      gemini: "gemini-secret",
      groq: "groq-secret",
    });
  });

  it("does not re-prompt for a fallback provider's key when one is already stored", async () => {
    selectMock
      .mockResolvedValueOnce("gemini")
      .mockResolvedValueOnce("gemini-2.5-flash")
      .mockResolvedValueOnce("groq")
      .mockResolvedValueOnce("en");
    passwordMock.mockResolvedValueOnce("gemini-secret");
    confirmMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const answers = await promptForSetup({
      apiKeys: { groq: "already-stored" },
    });

    expect(passwordMock).toHaveBeenCalledTimes(1);
    expect(answers.fallbackProvider).toBe("groq");
    expect(answers.apiKeys).toEqual({ gemini: "gemini-secret" });
  });

  it("offers keep/change/remove when a fallback is already configured", async () => {
    selectMock
      .mockResolvedValueOnce("gemini") // primary provider
      .mockResolvedValueOnce("gemini-2.5-flash") // primary model
      .mockResolvedValueOnce("keep") // fallback action
      .mockResolvedValueOnce("en"); // language
    passwordMock.mockResolvedValueOnce("gemini-secret");
    confirmMock.mockResolvedValueOnce(false); // emoji only - no fallback y/n asked

    const answers = await promptForSetup({
      fallbackProvider: "groq",
      apiKeys: { groq: "already-stored" },
    });

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(answers.fallbackProvider).toBeUndefined();
    expect(outputMock.printSetupSummary).toHaveBeenCalledWith(
      expect.objectContaining({ fallbackProvider: "Groq" }),
    );
  });

  it("clears the fallback provider when the wizard removes it", async () => {
    selectMock
      .mockResolvedValueOnce("gemini")
      .mockResolvedValueOnce("gemini-2.5-flash")
      .mockResolvedValueOnce("remove")
      .mockResolvedValueOnce("en");
    passwordMock.mockResolvedValueOnce("gemini-secret");
    confirmMock.mockResolvedValueOnce(false); // emoji only

    const answers = await promptForSetup({
      fallbackProvider: "groq",
      apiKeys: { groq: "already-stored" },
    });

    expect(answers.fallbackProvider).toBeNull();
    expect(outputMock.printSetupSummary).toHaveBeenCalledWith(
      expect.objectContaining({ fallbackProvider: undefined }),
    );
  });
});
