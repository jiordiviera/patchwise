import type { CommandContext } from "@/cli/context";
import { generateSuggestionsFromDiff } from "@/cli/services";
import { AppError } from "@/core/errors/app-error";
import { assertGitRepository, getStagedDiff } from "@/core/git/client";
import { printSuggestionResult } from "@/core/ui/output";

export async function runSuggestCommand(
  context: CommandContext,
): Promise<void> {
  await assertGitRepository(context.cwd);

  const diff = await getStagedDiff(context.cwd);

  if (!diff) {
    throw new AppError({
      code: "NO_STAGED_CHANGES",
      message: "No staged changes found.",
      hint: "Stage files before running `patchwise suggest`.",
    });
  }

  const result = await generateSuggestionsFromDiff(diff, context.config);
  printSuggestionResult(result);
}
