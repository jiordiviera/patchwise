import { beforeEach, describe, expect, it, vi } from "vitest";

const gitClientMock = vi.hoisted(() => ({
  assertGitRepository: vi.fn(),
  createCommit: vi.fn(),
  getCurrentBranch: vi.fn(),
  getModifiedFiles: vi.fn(),
  getStagedDiff: vi.fn(),
  pushCurrentBranch: vi.fn(),
  stageAll: vi.fn(),
  stageFiles: vi.fn(),
}));

const promptsMock = vi.hoisted(() => ({
  confirmAction: vi.fn(),
  promptForFiles: vi.fn(),
  promptForSuggestion: vi.fn(),
}));

const outputMock = vi.hoisted(() => ({
  printCancelled: vi.fn(),
  printCommitCreated: vi.fn(),
  printPushed: vi.fn(),
  printSuggestionResult: vi.fn(),
}));

const servicesMock = vi.hoisted(() => ({
  generateSuggestionsFromDiff: vi.fn(),
}));

const formatMock = vi.hoisted(() => ({
  formatCommitMessageWithBody: vi.fn(),
}));

vi.mock("@/core/git/client", () => gitClientMock);
vi.mock("@/core/ui/prompts", () => promptsMock);
vi.mock("@/core/ui/output", () => outputMock);
vi.mock("@/cli/services", () => servicesMock);
vi.mock("@/core/commit/format", () => formatMock);

const { runCommitCommand } = await import("@/cli/commands/commit");
const { runStageCommand } = await import("@/cli/commands/stage");
const { runSuggestCommand } = await import("@/cli/commands/suggest");

const baseContext = {
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
    groqApiKey: "test-key",
    onboardingComplete: true,
  },
};

describe("cli commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gitClientMock.assertGitRepository.mockResolvedValue(undefined);
    gitClientMock.getCurrentBranch.mockResolvedValue("feature/test");
    gitClientMock.getStagedDiff.mockResolvedValue("diff --git a/file.ts b/file.ts");
    servicesMock.generateSuggestionsFromDiff.mockResolvedValue({
      summary: "summary",
      suggestions: [{ type: "feat", subject: "add feature" }],
    });
    promptsMock.promptForSuggestion.mockResolvedValue("feat: add feature");
    promptsMock.confirmAction.mockResolvedValue(true);
    formatMock.formatCommitMessageWithBody.mockReturnValue("feat: add feature");
  });

  it("commits the first suggestion automatically with --yes", async () => {
    await runCommitCommand(baseContext, { yes: true });

    expect(formatMock.formatCommitMessageWithBody).toHaveBeenCalled();
    expect(gitClientMock.createCommit).toHaveBeenCalledWith("feat: add feature", "/repo");
    expect(outputMock.printCommitCreated).toHaveBeenCalledWith("feat: add feature", "feature/test");
    expect(promptsMock.promptForSuggestion).not.toHaveBeenCalled();
  });

  it("stages all changes when --all is enabled", async () => {
    await runCommitCommand(baseContext, { all: true, yes: true });

    expect(gitClientMock.stageAll).toHaveBeenCalledWith("/repo");
  });

  it("fails when selecting files with no modified files", async () => {
    gitClientMock.getModifiedFiles.mockResolvedValue([]);

    await expect(runCommitCommand(baseContext, { select: true })).rejects.toMatchObject({
      code: "NO_MODIFIED_FILES",
    });
  });

  it("cancels commit when confirmation is declined", async () => {
    promptsMock.confirmAction.mockResolvedValue(false);

    await runCommitCommand(baseContext, {});

    expect(outputMock.printCancelled).toHaveBeenCalled();
    expect(gitClientMock.createCommit).not.toHaveBeenCalled();
  });

  it("pushes after commit when requested and confirmed", async () => {
    promptsMock.confirmAction
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    await runCommitCommand(baseContext, { push: true });

    expect(gitClientMock.pushCurrentBranch).toHaveBeenCalledWith("/repo");
    expect(outputMock.printPushed).toHaveBeenCalledWith("feature/test");
  });

  it("cancels push when push confirmation is declined", async () => {
    promptsMock.confirmAction
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await runCommitCommand(baseContext, { push: true });

    expect(outputMock.printCancelled).toHaveBeenCalled();
    expect(gitClientMock.pushCurrentBranch).not.toHaveBeenCalled();
  });

  it("fails when no staged changes are available for commit", async () => {
    gitClientMock.getStagedDiff.mockResolvedValue("");

    await expect(runCommitCommand(baseContext, {})).rejects.toMatchObject({
      code: "NO_STAGED_CHANGES",
    });
  });

  it("stages selected files in stage command", async () => {
    gitClientMock.getModifiedFiles.mockResolvedValue([{ path: "src/a.ts" }]);
    promptsMock.promptForFiles.mockResolvedValue(["src/a.ts"]);

    await runStageCommand(baseContext);

    expect(gitClientMock.stageFiles).toHaveBeenCalledWith(["src/a.ts"], "/repo");
  });

  it("fails in stage command when no files are modified", async () => {
    gitClientMock.getModifiedFiles.mockResolvedValue([]);

    await expect(runStageCommand(baseContext)).rejects.toMatchObject({
      code: "NO_MODIFIED_FILES",
    });
  });

  it("prints suggestions in suggest command", async () => {
    await runSuggestCommand(baseContext);

    expect(servicesMock.generateSuggestionsFromDiff).toHaveBeenCalledWith(
      "diff --git a/file.ts b/file.ts",
      baseContext.config,
    );
    expect(outputMock.printSuggestionResult).toHaveBeenCalled();
  });

  it("fails in suggest command when no staged diff exists", async () => {
    gitClientMock.getStagedDiff.mockResolvedValue("");

    await expect(runSuggestCommand(baseContext)).rejects.toMatchObject({
      code: "NO_STAGED_CHANGES",
    });
  });
});
