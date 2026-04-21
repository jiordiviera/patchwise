import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadConfigMock = vi.hoisted(() => vi.fn());
const initConfigFileMock = vi.hoisted(() => vi.fn());
const saveUserConfigMock = vi.hoisted(() => vi.fn());
const promptForSetupMock = vi.hoisted(() => vi.fn());

vi.mock("@/core/config/load-config", () => ({
  loadConfig: loadConfigMock,
  initConfigFile: initConfigFileMock,
  saveUserConfig: saveUserConfigMock,
}));

vi.mock("@/core/ui/prompts", () => ({
  promptForSetup: promptForSetupMock,
}));

const { runConfigInitCommand, runSetupCommand } = await import(
  "@/cli/commands/config"
);

describe("config command", () => {
  const originalIsTTY = process.stdin.isTTY;
  const originalStdoutIsTTY = process.stdout.isTTY;
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

  const context = {
    cwd: "/repo",
    config: {
      provider: "groq" as const,
      model: "llama-test",
      commitConvention: "conventional" as const,
      language: "en" as const,
      maxSubjectLength: 72,
      confirmBeforeCommit: true,
      confirmBeforePush: true,
      scopeStrategy: "auto" as const,
      groqApiKey: "key",
      onboardingComplete: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      configurable: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    });
    initConfigFileMock.mockResolvedValue({
      path: "/repo/patchwise.config.json",
      created: true,
    });
    loadConfigMock.mockResolvedValue(context.config);
    promptForSetupMock.mockResolvedValue({
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      language: "fr",
      groqApiKey: "new-key",
    });
    saveUserConfigMock.mockResolvedValue("/home/user/.config/patchwise/config.json");
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: originalIsTTY,
      configurable: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalStdoutIsTTY,
      configurable: true,
    });
  });

  it("creates the project config file", async () => {
    await runConfigInitCommand(context);

    expect(initConfigFileMock).toHaveBeenCalledWith("/repo");
    expect(logSpy).toHaveBeenCalledWith("Created config at /repo/patchwise.config.json");
  });

  it("reports when the project config already exists", async () => {
    initConfigFileMock.mockResolvedValue({
      path: "/repo/patchwise.config.json",
      created: false,
    });

    await runConfigInitCommand(context);

    expect(logSpy).toHaveBeenCalledWith("Config already exists at /repo/patchwise.config.json");
  });

  it("runs interactive setup and persists the user config", async () => {
    await runSetupCommand(context);

    expect(loadConfigMock).toHaveBeenCalledWith("/repo");
    expect(promptForSetupMock).toHaveBeenCalledWith(context.config);
    expect(saveUserConfigMock).toHaveBeenCalledWith({
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      language: "fr",
      groqApiKey: "new-key",
      onboardingComplete: true,
    });
    expect(logSpy).toHaveBeenCalledWith(
      "User config saved to /home/user/.config/patchwise/config.json",
    );
  });

  it("does not ask for replacement when setup is incomplete", async () => {
    loadConfigMock.mockResolvedValue({
      ...context.config,
      groqApiKey: undefined,
      onboardingComplete: false,
    });

    await runSetupCommand(context);

    expect(promptForSetupMock).toHaveBeenCalled();
  });

  it("returns silently in non-interactive mode when allowed", async () => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true,
    });

    await expect(
      runSetupCommand(context, { silentWhenNonInteractive: true }),
    ).resolves.toBeUndefined();

    expect(promptForSetupMock).not.toHaveBeenCalled();
  });

  it("fails in non-interactive mode when setup is explicit", async () => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true,
    });

    await expect(runSetupCommand(context)).rejects.toMatchObject({
      code: "TTY_REQUIRED",
    });
  });
});
