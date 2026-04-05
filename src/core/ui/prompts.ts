import { checkbox, confirm, input, password, select } from "@inquirer/prompts";
import chalk from "chalk";

import { fetchGroqModels } from "@/core/ai/models";
import { formatCommitMessageWithBody } from "@/core/commit/format";
import type { FileStatus } from "@/core/git/client";
import type {
  AppConfig,
  CommitSuggestion,
  Language,
  ProviderName,
} from "@/types";

export async function promptForFiles(files: FileStatus[]): Promise<string[]> {
  return checkbox({
    message: chalk.bold("Select files to stage"),
    choices: files.map((file) => ({
      name: `${getStatusIcon(file.indexStatus, file.workingTreeStatus)} ${file.path}`,
      value: file.path,
    })),
    required: false,
  });
}

function getStatusIcon(index: string, working: string): string {
  if (index !== " ") return chalk.green(`[${index}]`);
  if (working !== " ") return chalk.yellow(`[${working}]`);
  return chalk.dim(`[·]`);
}

export async function promptForSuggestion(
  suggestions: CommitSuggestion[],
): Promise<string> {
  const selected = await select({
    message: chalk.bold("Select a commit message"),
    choices: [
      ...suggestions.map((suggestion, index) => ({
        name: `${chalk.bold(`${index + 1}.`)} ${formatCommitMessageWithBody(suggestion)}`,
        value: formatCommitMessageWithBody(suggestion),
      })),
      {
        name: chalk.italic("✏️  Write a custom message"),
        value: "__custom__",
      },
    ],
  });

  if (selected !== "__custom__") {
    return selected;
  }

  return input({
    message: chalk.bold("Commit message"),
    validate(value) {
      return value.trim().length > 0 || "Commit message cannot be empty.";
    },
  });
}

export async function confirmAction(
  message: string,
  defaultValue = true,
): Promise<boolean> {
  return confirm({
    message: chalk.yellow(`? ${message}`),
    default: defaultValue,
  });
}

export interface SetupAnswers {
  provider: ProviderName;
  model: string;
  language: Language;
  groqApiKey: string;
}

export async function promptForSetup(
  defaults: Partial<AppConfig>,
): Promise<SetupAnswers> {
  const provider = await select<ProviderName>({
    message: chalk.bold("Select your AI provider"),
    choices: [{ name: "Groq", value: "groq" }],
    default: defaults.provider ?? "groq",
  });

  const groqApiKey = await password({
    message:
      chalk.bold("Groq API key") +
      chalk.dim(" (https://console.groq.com/keys)"),
    mask: "*",
    validate(value) {
      return value.trim().length > 0 || "API key is required.";
    },
  });

  const trimmedApiKey = groqApiKey.trim();

  // Fetch available models from Groq
  let modelChoices: Array<{ name: string; value: string }> = [];

  try {
    const models = await fetchGroqModels(trimmedApiKey);
    modelChoices = models.map((m) => ({
      name: `${m.name}`,
      value: m.id,
    }));
  } catch {
    // Fallback to manual input if fetch fails
  }

  let model: string;

  if (modelChoices.length > 0) {
    const defaultModel = defaults.model ?? "llama-3.3-70b-versatile";
    const defaultChoice = modelChoices.find((c) => c.value === defaultModel);

    model = await select({
      message: chalk.bold("Select a Groq model"),
      choices: modelChoices,
      default: defaultChoice?.value,
    });
  } else {
    model = await input({
      message: chalk.bold("Groq model") + chalk.dim(" (enter manually)"),
      default: defaults.model ?? "llama-3.3-70b-versatile",
      validate(value) {
        return value.trim().length > 0 || "Model is required.";
      },
    });
  }

  const language = await select<Language>({
    message: chalk.bold("Default commit language"),
    choices: [
      { name: "🇬🇧  English", value: "en" },
      { name: "🇫🇷  French", value: "fr" },
    ],
    default: defaults.language ?? "en",
  });

  return {
    provider,
    model: model.trim(),
    language,
    groqApiKey: trimmedApiKey,
  };
}
