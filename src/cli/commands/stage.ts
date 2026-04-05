import type { CommandContext } from "@/cli/context";
import {
  assertGitRepository,
  getModifiedFiles,
  stageFiles,
} from "@/core/git/client";
import { promptForFiles } from "@/core/ui/prompts";

export async function runStageCommand(context: CommandContext): Promise<void> {
  await assertGitRepository(context.cwd);

  const files = await getModifiedFiles(context.cwd);

  if (files.length === 0) {
    throw new Error("No modified files found.");
  }

  const selected = await promptForFiles(files);

  if (selected.length === 0) {
    console.log("No files selected.");
    return;
  }

  await stageFiles(selected, context.cwd);
  console.log(`Staged ${selected.length} file(s).`);
}
