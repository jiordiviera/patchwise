import type { CommandContext } from "@/cli/context";
import { generateSuggestionsFromDiff } from "@/cli/services";
import { assertGitRepository, getStagedDiff } from "@/core/git/client";
import { printSuggestionResult } from "@/core/ui/output";

export async function runSuggestCommand(
  context: CommandContext,
): Promise<void> {
  await assertGitRepository(context.cwd);

  const diff = await getStagedDiff(context.cwd);

  if (!diff) {
    throw new Error(
      "No staged changes found. Stage files before running suggest.",
    );
  }

  const result = await generateSuggestionsFromDiff(diff, context.config);
  printSuggestionResult(result);
}
