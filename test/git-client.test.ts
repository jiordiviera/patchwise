import { beforeEach, describe, expect, it, vi } from "vitest";

const execGitMock = vi.fn();

vi.mock("node:util", () => ({
  promisify: vi.fn(() => execGitMock),
}));

const gitClient = await import("@/core/git/client");

describe("git client", () => {
  beforeEach(() => {
    execGitMock.mockReset();
  });

  it("asserts git repository on success", async () => {
    execGitMock.mockResolvedValue({ stdout: "true\n" });

    await expect(gitClient.assertGitRepository("/repo")).resolves.toBeUndefined();
    expect(execGitMock).toHaveBeenCalledWith("git", ["rev-parse", "--is-inside-work-tree"], expect.any(Object));
  });

  it("maps non-git directories to a structured error", async () => {
    execGitMock.mockRejectedValue(new Error("fatal"));

    await expect(gitClient.assertGitRepository("/repo")).rejects.toMatchObject({
      code: "NOT_GIT_REPOSITORY",
    });
  });

  it("parses modified files from git status output", async () => {
    execGitMock.mockResolvedValue({
      stdout: "M  src/index.ts\nA  README.md\n",
    });

    await expect(gitClient.getModifiedFiles("/repo")).resolves.toEqual([
      {
        indexStatus: "M",
        workingTreeStatus: " ",
        path: "src/index.ts",
      },
      {
        indexStatus: "A",
        workingTreeStatus: " ",
        path: "README.md",
      },
    ]);
  });

  it("does not call git add when stageFiles is empty", async () => {
    await gitClient.stageFiles([], "/repo");
    expect(execGitMock).not.toHaveBeenCalled();
  });

  it("stages all changes", async () => {
    execGitMock.mockResolvedValue({ stdout: "" });

    await gitClient.stageAll("/repo");

    expect(execGitMock).toHaveBeenCalledWith("git", ["add", "-A"], expect.any(Object));
  });

  it("returns the current branch", async () => {
    execGitMock.mockResolvedValue({ stdout: "feature/test\n" });

    await expect(gitClient.getCurrentBranch("/repo")).resolves.toBe("feature/test");
  });

  it("maps generic git failures", async () => {
    execGitMock.mockRejectedValue(
      Object.assign(new Error("boom"), { stderr: "fatal: unexpected failure" }),
    );

    await expect(gitClient.getStagedDiff("/repo")).rejects.toMatchObject({
      code: "GIT_COMMAND_FAILED",
      details: ["fatal: unexpected failure"],
    });
  });

  it("maps authentication failures", async () => {
    execGitMock.mockRejectedValue(
      Object.assign(new Error("boom"), {
        stderr: "fatal: Authentication failed for 'origin'",
      }),
    );

    await expect(gitClient.pushCurrentBranch("/repo")).rejects.toMatchObject({
      code: "GIT_AUTH_FAILED",
    });
  });

  it("maps upstream push failures", async () => {
    execGitMock.mockRejectedValue(
      Object.assign(new Error("boom"), {
        stderr: "fatal: The current branch has no upstream branch",
      }),
    );

    await expect(gitClient.pushCurrentBranch("/repo")).rejects.toMatchObject({
      code: "GIT_PUSH_FAILED",
    });
  });

  it("maps nothing-to-commit failures", async () => {
    execGitMock.mockRejectedValue(
      Object.assign(new Error("boom"), {
        stderr: "nothing to commit, working tree clean",
      }),
    );

    await expect(gitClient.createCommit("feat: test", "/repo")).rejects.toMatchObject({
      code: "NOTHING_TO_COMMIT",
    });
  });
});
