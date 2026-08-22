import { GeminiAIProvider, listGeminiModels } from "@/core/ai/providers/gemini";
import { GroqAIProvider, listGroqModels } from "@/core/ai/providers/groq";
import { AppError } from "@/core/errors/app-error";
import type { AIProvider, AppConfig, ModelOption, ProviderName } from "@/types";

interface ProviderRegistryEntry {
  label: string;
  createProvider(apiKey: string, model: string): AIProvider;
  listModels(apiKey: string): Promise<ModelOption[]>;
}

const PROVIDER_REGISTRY: Partial<Record<ProviderName, ProviderRegistryEntry>> = {
  gemini: {
    label: "Gemini",
    createProvider: (apiKey, model) => new GeminiAIProvider(apiKey, model),
    listModels: listGeminiModels,
  },
  groq: {
    label: "Groq",
    createProvider: (apiKey, model) => new GroqAIProvider(apiKey, model),
    listModels: listGroqModels,
  },
};

export function createAIProvider(config: AppConfig): AIProvider {
  const entry = getProviderEntry(config.provider);
  const apiKey = config.apiKeys[config.provider];

  if (!apiKey) {
    throw new AppError({
      code: "MISSING_API_KEY",
      message: `Missing ${entry.label} API key.`,
      hint: "Run `patchwise setup` to configure it.",
    });
  }

  return entry.createProvider(apiKey, config.model);
}

export async function listModelsForProvider(
  provider: ProviderName,
  apiKey: string,
): Promise<ModelOption[]> {
  return getProviderEntry(provider).listModels(apiKey);
}

function getProviderEntry(provider: ProviderName): ProviderRegistryEntry {
  const entry = PROVIDER_REGISTRY[provider];

  if (!entry) {
    throw new AppError({
      code: "UNSUPPORTED_PROVIDER",
      message: `Unsupported provider: ${provider}`,
      hint: "Select a supported provider in your config or via `patchwise setup`.",
    });
  }

  return entry;
}
