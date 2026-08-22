import { checkbox, confirm, input, password, select } from "@inquirer/prompts";
import chalk from "chalk";

import {
  DEFAULT_MODEL_BY_PROVIDER,
  getProviderLabel,
  listModelsForProvider,
} from "@/core/ai/create-provider";
import { formatCommitMessageWithBody } from "@/core/commit/format";
import { toAppError } from "@/core/errors/app-error";
import type { FileStatus } from "@/core/git/client";
import { printSetupSummary, printWarning } from "@/core/ui/output";
import {
  PROVIDER_NAMES,
  type ApiKeys,
  type AppConfig,
  type CommitSuggestion,
  type Language,
  type ProviderName,
} from "@/types";

const PROVIDER_KEY_HINTS: Record<ProviderName, string> = {
  gemini: "https://aistudio.google.com/apikey",
  groq: "https://console.groq.com/keys",
};

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
  allowEmoji: boolean;
  apiKeys: ApiKeys;
  // undefined = leave the stored fallback provider untouched, null = clear
  // it, a ProviderName = set/replace it.
  fallbackProvider?: ProviderName | null;
}

export async function promptForSetup(
  defaults: Partial<AppConfig>,
): Promise<SetupAnswers> {
  const provider = await select<ProviderName>({
    message: chalk.bold("Select your AI provider"),
    choices: [
      { name: "Gemini (recommended)", value: "gemini" },
      { name: "Groq", value: "groq" },
    ],
    default: defaults.provider ?? "gemini",
  });

  const primaryApiKey = await promptForProviderApiKey(
    provider,
    defaults.apiKeys?.[provider],
  );

  const model = await promptForModel(
    provider,
    primaryApiKey,
    defaults.provider === provider ? defaults.model : undefined,
  );

  const fallbackSelection = await promptForFallbackProvider(
    provider,
    defaults.fallbackProvider,
    defaults.apiKeys ?? {},
  );

  const language = await select<Language>({
    message: chalk.bold("Default commit language"),
    choices: [
      { name: "🇬🇧  English", value: "en" },
      { name: "🇫🇷  French", value: "fr" },
    ],
    default: defaults.language ?? "en",
  });

  const allowEmoji = await confirmAction(
    "Use emoji in commit messages?",
    defaults.allowEmoji ?? false,
  );

  const apiKeys: ApiKeys = { [provider]: primaryApiKey };

  if (fallbackSelection.provider && fallbackSelection.apiKey) {
    apiKeys[fallbackSelection.provider] = fallbackSelection.apiKey;
  }

  const fallbackForDisplay = resolveFallbackForDisplay(
    fallbackSelection.provider,
    defaults.fallbackProvider,
    provider,
  );

  printSetupSummary({
    provider: getProviderLabel(provider),
    model: model.trim(),
    fallbackProvider: fallbackForDisplay
      ? getProviderLabel(fallbackForDisplay)
      : undefined,
    language: language === "fr" ? "French" : "English",
    allowEmoji,
  });

  return {
    provider,
    model: model.trim(),
    language,
    allowEmoji,
    apiKeys,
    fallbackProvider: fallbackSelection.provider,
  };
}

async function promptForProviderApiKey(
  provider: ProviderName,
  existingApiKey: string | undefined,
): Promise<string> {
  const label = getProviderLabel(provider);

  const entered = await password({
    message:
      chalk.bold(`${label} API key`) +
      chalk.dim(
        existingApiKey
          ? " (press Enter to keep existing key)"
          : ` (${PROVIDER_KEY_HINTS[provider]})`,
      ),
    mask: "*",
    validate(value) {
      if (existingApiKey && value.trim().length === 0) {
        return true;
      }

      return value.trim().length > 0 || "API key is required.";
    },
  });

  const apiKey = entered.trim() || existingApiKey;

  if (!apiKey) {
    throw new Error("API key is required.");
  }

  return apiKey;
}

async function promptForModel(
  provider: ProviderName,
  apiKey: string,
  defaultModel: string | undefined,
): Promise<string> {
  const label = getProviderLabel(provider);
  const fallbackDefault = defaultModel ?? DEFAULT_MODEL_BY_PROVIDER[provider];

  try {
    const models = await listModelsForProvider(provider, apiKey);

    if (models.length === 0) {
      throw new Error(`${label} returned no available models.`);
    }

    const defaultChoice = models.find((m) => m.id === fallbackDefault);

    return await select({
      message: chalk.bold(`Select a ${label} model`),
      choices: models.map((m) => ({ name: m.name, value: m.id })),
      default: defaultChoice?.id,
    });
  } catch (error) {
    const appError = toAppError(error);
    printWarning(`Could not fetch ${label} models: ${appError.message}`);

    if (appError.hint) {
      printWarning(appError.hint);
    }

    return input({
      message: chalk.bold(`${label} model`) + chalk.dim(" (enter manually)"),
      default: fallbackDefault,
      validate(value) {
        return value.trim().length > 0 || "Model is required.";
      },
    });
  }
}

interface FallbackSelection {
  provider: ProviderName | null | undefined;
  apiKey?: string;
}

async function promptForFallbackProvider(
  primaryProvider: ProviderName,
  existingFallback: ProviderName | undefined,
  existingApiKeys: ApiKeys,
): Promise<FallbackSelection> {
  const otherProviders = PROVIDER_NAMES.filter((p) => p !== primaryProvider);

  if (otherProviders.length === 0) {
    return { provider: undefined };
  }

  const currentFallback =
    existingFallback && existingFallback !== primaryProvider
      ? existingFallback
      : undefined;

  if (!currentFallback) {
    const wantsFallback = await confirmAction(
      "Configure a fallback provider?",
      false,
    );

    if (!wantsFallback) {
      return { provider: undefined };
    }

    return promptForFallbackChoice(otherProviders, existingApiKeys);
  }

  const action = await select<"keep" | "change" | "remove">({
    message: chalk.bold(
      `Fallback provider is currently ${getProviderLabel(currentFallback)}`,
    ),
    choices: [
      { name: "Keep current", value: "keep" },
      { name: "Change", value: "change" },
      { name: "Remove", value: "remove" },
    ],
  });

  if (action === "keep") {
    return { provider: undefined };
  }

  if (action === "remove") {
    return { provider: null };
  }

  return promptForFallbackChoice(otherProviders, existingApiKeys, currentFallback);
}

async function promptForFallbackChoice(
  choices: readonly ProviderName[],
  existingApiKeys: ApiKeys,
  defaultChoice?: ProviderName,
): Promise<FallbackSelection> {
  const chosen = await select<ProviderName>({
    message: chalk.bold("Select a fallback provider"),
    choices: choices.map((p) => ({ name: getProviderLabel(p), value: p })),
    default: defaultChoice,
  });

  if (existingApiKeys[chosen]) {
    return { provider: chosen };
  }

  const apiKey = await promptForProviderApiKey(chosen, undefined);
  return { provider: chosen, apiKey };
}

function resolveFallbackForDisplay(
  selection: ProviderName | null | undefined,
  existingFallback: ProviderName | undefined,
  primaryProvider: ProviderName,
): ProviderName | undefined {
  if (selection !== undefined) {
    return selection ?? undefined;
  }

  return existingFallback && existingFallback !== primaryProvider
    ? existingFallback
    : undefined;
}
