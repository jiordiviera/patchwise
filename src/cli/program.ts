import { Command } from "commander";
import chalk from "chalk";

import { runCommitCommand } from "@/cli/commands/commit";
import { runConfigInitCommand, runSetupCommand } from "@/cli/commands/config";
import { runStageCommand } from "@/cli/commands/stage";
import { runSuggestCommand } from "@/cli/commands/suggest";
import type { CommandContext } from "@/cli/context";
import type { VersionCheck } from "@/core/cli/update";
import {
  checkForUpdates,
  getUpdateCommand,
  runUpdate,
} from "@/core/cli/update";
import { loadConfig } from "@/core/config/load-config";
import { toAppError } from "@/core/errors/app-error";
import { printAppError } from "@/core/ui/output";
import { confirmAction } from "@/core/ui/prompts";
import type { CommitCommandOptions, ProviderName } from "@/types";
import { version } from "../../package.json";

export async function createProgram(cwd = process.cwd()): Promise<Command> {
  const context: CommandContext = { cwd, config: await loadConfig(cwd) };

  const program = new Command();

  program
    .name("patchwise")
    .description("AI-assisted Git commits with explicit human validation.")
    .version(version);

  program
    .command("suggest")
    .description("Generate commit suggestions from staged changes.")
    .action(async () => handleCommand(() => runSuggestCommand(context)));

  program
    .command("stage")
    .description("Interactively select files to stage.")
    .action(async () => handleCommand(() => runStageCommand(context)));

  program
    .command("commit")
    .description(
      "Generate suggestions and create a commit from staged changes.",
    )
    .option("--all", "Stage all changes before generating a commit.")
    .option(
      "--select",
      "Select files interactively before generating a commit.",
    )
    .option("--push", "Push after creating the commit.")
    .option("--yes", "Skip commit and push confirmations.")
    .option("--lang <lang>", "Commit message language (en|fr).")
    .option("--provider <provider>", "AI provider to use.")
    .option("--model <model>", "Model name to use.")
    .option("--scope <scope>", "Force a commit scope.")
    .option("--no-scope", "Disable commit scope.")
    .action(async (options: CommitCommandOptions) =>
      handleCommand(() =>
        runCommitCommand(context, sanitizeCommitOptions(options)),
      ),
    );

  program
    .command("setup")
    .description(
      "Run the one-time interactive setup and store user configuration.",
    )
    .action(async () => handleCommand(async () => runSetupCommand(context)));

  const configCommand = program
    .command("config")
    .description("Manage project configuration.");
  configCommand
    .command("init")
    .description("Create patchwise.config.json if it does not exist.")
    .action(async () => handleCommand(() => runConfigInitCommand(context)));

  program.hook("preAction", async (_, actionCommand) => {
    if (actionCommand.name() === "setup" || actionCommand.name() === "init") {
      return;
    }

    // Check for updates in background
    const updateCheck = checkForUpdates();

    context.config = await loadConfig(cwd);

    if (context.config.onboardingComplete && context.config.groqApiKey) {
      return;
    }

    await runSetupCommand(context, { silentWhenNonInteractive: true });
    context.config = await loadConfig(cwd);

    // Prompt for update after setup is done
    await handleUpdatePrompt(updateCheck);
  });

  async function handleUpdatePrompt(
    updateCheck: Promise<VersionCheck>,
  ): Promise<void> {
    try {
      const result = await updateCheck;
      if (!result.updateAvailable) return;

      console.log();
      console.log(
        chalk.dim(
          `  Update available: ${chalk.green(result.latest)} (current: ${result.current})`,
        ),
      );

      if (process.stdin.isTTY && process.stdout.isTTY) {
        const shouldUpdate = await confirmAction(
          `Update to v${result.latest}?`,
          true,
        );

        if (shouldUpdate) {
          console.log(
            chalk.dim(`  Running: ${getUpdateCommand(result.packageManager)}`),
          );
          const success = await runUpdate(result.packageManager);
          if (success) {
            console.log(chalk.green("  ✔ patchwise updated successfully."));
          } else {
            console.log(
              chalk.yellow(
                `  Update failed. Run \`${getUpdateCommand(result.packageManager)}\` manually.`,
              ),
            );
          }
        }
      } else {
        console.log(
          chalk.dim(
            `  Run \`${getUpdateCommand(result.packageManager)}\` to update.`,
          ),
        );
      }
    } catch {
      // Silently ignore update check failures
    }
  }

  return program;
}

function sanitizeCommitOptions(
  options: CommitCommandOptions,
): CommitCommandOptions {
  return {
    ...options,
    lang: options.lang === "fr" ? "fr" : "en",
    provider: (options.provider ?? "groq") as ProviderName,
  };
}

async function handleCommand(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    const appError = toAppError(error);
    printAppError(appError);
    console.error();
    console.error(`If this error persists, please report it:`);
    console.error(
      chalk.blue("  https://github.com/jiordiviera/patchwise/issues/new"),
    );
    process.exitCode = 1;
  }
}
