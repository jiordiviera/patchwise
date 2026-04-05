import type { CommandContext } from "@/cli/context";
import {
  initConfigFile,
  loadConfig,
  saveUserConfig,
} from "@/core/config/load-config";
import { promptForSetup } from "@/core/ui/prompts";

export async function runConfigInitCommand(
  context: CommandContext,
): Promise<void> {
  const configPath = await initConfigFile(context.cwd);
  console.log(`Config ready at ${configPath}`);
}

export async function runSetupCommand(
  context: CommandContext,
  options?: { silentWhenNonInteractive?: boolean },
): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    if (options?.silentWhenNonInteractive) {
      return;
    }

    throw new Error(
      "Interactive setup requires a TTY. Run `patchwise setup` in a terminal.",
    );
  }

  const currentConfig = await loadConfig(context.cwd);
  const answers = await promptForSetup(currentConfig);
  const configPath = await saveUserConfig({
    provider: answers.provider,
    model: answers.model,
    language: answers.language,
    groqApiKey: answers.groqApiKey,
    onboardingComplete: true,
  });

  context.config = await loadConfig(context.cwd);
  console.log(`User config saved to ${configPath}`);
}
