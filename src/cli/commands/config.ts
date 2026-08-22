import type { CommandContext } from "@/cli/context";
import { AppError } from "@/core/errors/app-error";
import {
  initConfigFile,
  loadConfig,
  saveUserConfig,
} from "@/core/config/load-config";
import { promptForSetup } from "@/core/ui/prompts";
import type { AppConfig } from "@/types";

export async function runConfigInitCommand(
  context: CommandContext,
): Promise<void> {
  const result = await initConfigFile(context.cwd);

  if (result.created) {
    console.log(`Created config at ${result.path}`);
    return;
  }

  console.log(`Config already exists at ${result.path}`);
}

export async function runSetupCommand(
  context: CommandContext,
  options?: { silentWhenNonInteractive?: boolean },
): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    if (options?.silentWhenNonInteractive) {
      return;
    }

    throw new AppError({
      code: "TTY_REQUIRED",
      message: "Interactive setup requires a TTY.",
      hint: "Run `patchwise setup` directly in a terminal session.",
    });
  }

  const currentConfig = await loadConfig(context.cwd);
  const answers = await promptForSetup(currentConfig);

  const configToSave: Partial<AppConfig> = {
    provider: answers.provider,
    model: answers.model,
    language: answers.language,
    allowEmoji: answers.allowEmoji,
    apiKeys: answers.apiKeys,
    onboardingComplete: true,
  };

  // undefined = leave the stored fallback provider untouched (the key is
  // omitted so saveUserConfig's merge keeps whatever was already there);
  // null means "remove it", which must still be written as an explicit
  // undefined value so it overwrites (and JSON.stringify drops) the
  // existing key.
  if (answers.fallbackProvider !== undefined) {
    configToSave.fallbackProvider = answers.fallbackProvider ?? undefined;
  }

  const configPath = await saveUserConfig(configToSave);

  context.config = await loadConfig(context.cwd);
  console.log(`User config saved to ${configPath}`);
}
