import type { CommandContext } from "@/cli/context";
import { generateSuggestionsFromDiff } from "@/cli/services";
import {
  assertGitRepository,
  createCommit,
  getCurrentBranch,
  getModifiedFiles,
  getStagedDiff,
  pushCurrentBranch,
  stageAll,
  stageFiles,
} from "@/core/git/client";
import {
  AppError,
} from "@/core/errors/app-error";
import {
  printCancelled,
  printCommitCreated,
  printPushed,
} from "@/core/ui/output";
import {
  confirmAction,
  promptForFiles,
  promptForSuggestion,
} from "@/core/ui/prompts";
import { formatCommitMessageWithBody } from "@/core/commit/format";
import type { CommitCommandOptions } from "@/types";

export async function runCommitCommand(
  context: CommandContext,
  options: CommitCommandOptions,
): Promise<void> {
  await assertGitRepository(context.cwd);

  if (options.all) {
    await stageAll(context.cwd);
  }

  if (options.select) {
    const files = await getModifiedFiles(context.cwd);

    if (files.length === 0) {
      throw new AppError({
        code: "NO_MODIFIED_FILES",
        message: "No modified files found.",
        hint: "Edit a file first or run the command in the correct repository.",
      });
    }

    const selected = await promptForFiles(files);

    if (selected.length === 0) {
      throw new AppError({
        code: "NO_SELECTED_FILES",
        message: "No files selected for staging.",
        hint: "Select at least one file or run without `--select`.",
      });
    }

    await stageFiles(selected, context.cwd);
  }

  const diff = await getStagedDiff(context.cwd);

  if (!diff) {
    throw new AppError({
      code: "NO_STAGED_CHANGES",
      message: "No staged changes found.",
      hint: "Stage files before running `patchwise commit`.",
    });
  }

  const config = {
    ...context.config,
    language: options.lang ?? context.config.language,
    provider: options.provider ?? context.config.provider,
    model: options.model ?? context.config.model,
  };

  const result = await generateSuggestionsFromDiff(diff, config, {
    language: options.lang,
    scope: options.scope,
    noScope: options.noScope,
  });

  const message = options.yes
    ? formatCommitMessageWithBody(result.suggestions[0])
    : await promptForSuggestion(result.suggestions);
  const shouldCommit =
    options.yes ||
    !config.confirmBeforeCommit ||
    (await confirmAction(`Commit with "${message}"?`));

  if (!shouldCommit) {
    printCancelled();
    return;
  }

  const branch = await getCurrentBranch(context.cwd);
  await createCommit(message, context.cwd);
  printCommitCreated(message, branch);

  if (!options.push) {
    return;
  }

  const shouldPush =
    options.yes ||
    !config.confirmBeforePush ||
    (await confirmAction(`Push to origin/${branch}?`));

  if (!shouldPush) {
    printCancelled();
    return;
  }

  await pushCurrentBranch(context.cwd);
  printPushed(branch);
}
