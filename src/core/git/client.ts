import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { AppError } from "@/core/errors/app-error";

const execFileAsync = promisify(execFile);

export interface FileStatus {
  path: string;
  indexStatus: string;
  workingTreeStatus: string;
}

export async function assertGitRepository(cwd = process.cwd()): Promise<void> {
  try {
    await execGit(["rev-parse", "--is-inside-work-tree"], cwd);
  } catch {
    throw new AppError({
      code: "NOT_GIT_REPOSITORY",
      message: "Current directory is not a Git repository.",
      hint: "Run this command inside a Git repository.",
    });
  }
}

export async function getStagedDiff(cwd = process.cwd()): Promise<string> {
  return execGit(["diff", "--cached", "--no-ext-diff"], cwd);
}

export async function getModifiedFiles(
  cwd = process.cwd(),
): Promise<FileStatus[]> {
  const output = await execGit(["status", "--short"], cwd);

  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => ({
      indexStatus: line[0] ?? " ",
      workingTreeStatus: line[1] ?? " ",
      path: line.slice(3).trim(),
    }));
}

export async function stageFiles(
  files: string[],
  cwd = process.cwd(),
): Promise<void> {
  if (files.length === 0) {
    return;
  }

  await execGit(["add", "--", ...files], cwd);
}

export async function stageAll(cwd = process.cwd()): Promise<void> {
  await execGit(["add", "-A"], cwd);
}

export async function createCommit(
  message: string,
  cwd = process.cwd(),
): Promise<void> {
  await execGit(["commit", "-m", message], cwd);
}

export async function pushCurrentBranch(cwd = process.cwd()): Promise<void> {
  await execGit(["push"], cwd);
}

export async function getCurrentBranch(cwd = process.cwd()): Promise<string> {
  return execGit(["branch", "--show-current"], cwd);
}

async function execGit(args: string[], cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10,
    });

    return stdout.trim();
  } catch (error) {
    if (error instanceof Error && "stderr" in error) {
      const stderr = String(error.stderr ?? "").trim();
      throw mapGitError(stderr || "Git command failed.", error);
    }

    throw error;
  }
}

function mapGitError(message: string, cause: unknown): AppError {
  if (message.includes("nothing to commit")) {
    return new AppError({
      code: "NOTHING_TO_COMMIT",
      message: "There is nothing to commit.",
      hint: "Stage some changes first or skip commit creation.",
      cause,
    });
  }

  if (message.includes("could not read Username") || message.includes("Authentication failed")) {
    return new AppError({
      code: "GIT_AUTH_FAILED",
      message: "Git authentication failed while talking to the remote.",
      hint: "Check your Git credentials or remote access.",
      cause,
    });
  }

  if (message.includes("src refspec") || message.includes("has no upstream branch")) {
    return new AppError({
      code: "GIT_PUSH_FAILED",
      message: "Push failed because the current branch is not ready for push.",
      hint: "Set an upstream branch or create the branch on the remote first.",
      details: [message],
      cause,
    });
  }

  return new AppError({
    code: "GIT_COMMAND_FAILED",
    message: "Git command failed.",
    details: [message],
    cause,
  });
}
