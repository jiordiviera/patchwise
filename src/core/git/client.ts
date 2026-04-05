import { execFile } from "node:child_process";
import { promisify } from "node:util";

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
    throw new Error("Current directory is not a Git repository.");
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

      throw new Error(stderr || "Git command failed.", { cause: error });
    }

    throw error;
  }
}
