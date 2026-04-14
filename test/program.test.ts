import { beforeEach, describe, expect, it, vi } from "vitest";

const loadConfigMock = vi.hoisted(() => vi.fn());
const runSuggestCommandMock = vi.hoisted(() => vi.fn());
const runStageCommandMock = vi.hoisted(() => vi.fn());
const runCommitCommandMock = vi.hoisted(() => vi.fn());
const runSetupCommandMock = vi.hoisted(() => vi.fn());
const runConfigInitCommandMock = vi.hoisted(() => vi.fn());
const checkForUpdatesMock = vi.hoisted(() => vi.fn());
const getUpdateCommandMock = vi.hoisted(() => vi.fn(() => "pnpm dlx patchwise@latest"));
const runUpdateMock = vi.hoisted(() => vi.fn());
const confirmActionMock = vi.hoisted(() => vi.fn());
const printAppErrorMock = vi.hoisted(() => vi.fn());
const toAppErrorMock = vi.hoisted(() => vi.fn((error) => error));

vi.mock("@/core/config/load-config", () => ({
  loadConfig: loadConfigMock,
}));
vi.mock("@/cli/commands/suggest", () => ({
  runSuggestCommand: runSuggestCommandMock,
}));
vi.mock("@/cli/commands/stage", () => ({
  runStageCommand: runStageCommandMock,
}));
vi.mock("@/cli/commands/commit", () => ({
  runCommitCommand: runCommitCommandMock,
}));
vi.mock("@/cli/commands/config", () => ({
  runSetupCommand: runSetupCommandMock,
  runConfigInitCommand: runConfigInitCommandMock,
}));
vi.mock("@/core/cli/update", () => ({
  checkForUpdates: checkForUpdatesMock,
  getUpdateCommand: getUpdateCommandMock,
  runUpdate: runUpdateMock,
}));
vi.mock("@/core/ui/prompts", () => ({
  confirmAction: confirmActionMock,
}));
vi.mock("@/core/ui/output", () => ({
  printAppError: printAppErrorMock,
}));
vi.mock("@/core/errors/app-error", async () => {
  const actual = await vi.importActual("@/core/errors/app-error");
  return {
    ...actual,
    toAppError: toAppErrorMock,
  };
});

const { createProgram } = await import("@/cli/program");

describe("program", () => {
  const originalArgv = process.argv;
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    process.argv = ["node", "patchwise"];
    loadConfigMock.mockResolvedValue({
      provider: "groq",
      model: "llama-test",
      commitConvention: "conventional",
      language: "en",
      maxSubjectLength: 72,
      confirmBeforeCommit: true,
      confirmBeforePush: true,
      scopeStrategy: "auto",
      groqApiKey: "key",
      onboardingComplete: true,
    });
    checkForUpdatesMock.mockResolvedValue({
      updateAvailable: false,
      latest: "1.3.0",
      current: "1.2.0",
      packageManager: "pnpm",
    });
    confirmActionMock.mockResolvedValue(false);
    runUpdateMock.mockResolvedValue(true);
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  it("routes suggest command execution", async () => {
    const program = await createProgram("/repo");

    await program.parseAsync(["node", "patchwise", "suggest"]);

    expect(runSuggestCommandMock).toHaveBeenCalled();
  });

  it("runs setup automatically when onboarding is incomplete", async () => {
    loadConfigMock
      .mockResolvedValueOnce({
        provider: "groq",
        model: "llama-test",
        commitConvention: "conventional",
        language: "en",
        maxSubjectLength: 72,
        confirmBeforeCommit: true,
        confirmBeforePush: true,
        scopeStrategy: "auto",
        onboardingComplete: false,
      })
      .mockResolvedValueOnce({
        provider: "groq",
        model: "llama-test",
        commitConvention: "conventional",
        language: "en",
        maxSubjectLength: 72,
        confirmBeforeCommit: true,
        confirmBeforePush: true,
        scopeStrategy: "auto",
        onboardingComplete: false,
      })
      .mockResolvedValueOnce({
        provider: "groq",
        model: "llama-test",
        commitConvention: "conventional",
        language: "en",
        maxSubjectLength: 72,
        confirmBeforeCommit: true,
        confirmBeforePush: true,
        scopeStrategy: "auto",
        groqApiKey: "key",
        onboardingComplete: true,
      });

    const program = await createProgram("/repo");

    await program.parseAsync(["node", "patchwise", "suggest"]);

    expect(runSetupCommandMock).toHaveBeenCalledWith(
      expect.any(Object),
      { silentWhenNonInteractive: true },
    );
  });

  it("prints structured errors through the central handler", async () => {
    const appError = { code: "TEST", message: "boom" };
    runSuggestCommandMock.mockRejectedValue(appError);

    const program = await createProgram("/repo");

    await program.parseAsync(["node", "patchwise", "suggest"]);

    expect(toAppErrorMock).toHaveBeenCalledWith(appError);
    expect(printAppErrorMock).toHaveBeenCalledWith(appError);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("shows update information when available in non-interactive mode", async () => {
    const originalInTTY = process.stdin.isTTY;
    const originalOutTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true });
    Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });

    checkForUpdatesMock.mockResolvedValue({
      updateAvailable: true,
      latest: "1.4.0",
      current: "1.3.0",
      packageManager: "pnpm",
    });

    loadConfigMock
      .mockResolvedValueOnce({
        provider: "groq",
        model: "llama-test",
        commitConvention: "conventional",
        language: "en",
        maxSubjectLength: 72,
        confirmBeforeCommit: true,
        confirmBeforePush: true,
        scopeStrategy: "auto",
        onboardingComplete: false,
      })
      .mockResolvedValueOnce({
        provider: "groq",
        model: "llama-test",
        commitConvention: "conventional",
        language: "en",
        maxSubjectLength: 72,
        confirmBeforeCommit: true,
        confirmBeforePush: true,
        scopeStrategy: "auto",
        onboardingComplete: false,
      })
      .mockResolvedValueOnce({
        provider: "groq",
        model: "llama-test",
        commitConvention: "conventional",
        language: "en",
        maxSubjectLength: 72,
        confirmBeforeCommit: true,
        confirmBeforePush: true,
        scopeStrategy: "auto",
        groqApiKey: "key",
        onboardingComplete: true,
      });

    const program = await createProgram("/repo");
    await program.parseAsync(["node", "patchwise", "suggest"]);

    expect(logSpy).toHaveBeenCalled();

    Object.defineProperty(process.stdin, "isTTY", { value: originalInTTY, configurable: true });
    Object.defineProperty(process.stdout, "isTTY", { value: originalOutTTY, configurable: true });
  });
});
