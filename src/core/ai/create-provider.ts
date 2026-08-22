import { GeminiAIProvider, listGeminiModels } from "@/core/ai/providers/gemini";
import { GroqAIProvider, listGroqModels } from "@/core/ai/providers/groq";
import {
  FallbackAIProvider,
  type FallbackChainEntry,
  type FallbackListener,
} from "@/core/ai/fallback-provider";
import { AppError } from "@/core/errors/app-error";
import type { AIProvider, AppConfig, ModelOption, ProviderName } from "@/types";

interface ProviderRegistryEntry {
  label: string;
  createProvider(apiKey: string, model: string): AIProvider;
  listModels(apiKey: string): Promise<ModelOption[]>;
}

const PROVIDER_REGISTRY: Partial<Record<ProviderName, ProviderRegistryEntry>> =
  {
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

// The fallback provider runs a different model than the one configured for
// the primary provider (config.model is scoped to config.provider only).
// There's no per-provider model setting yet, so fall back to a sensible
// default model per provider.
export const DEFAULT_MODEL_BY_PROVIDER: Record<ProviderName, string> = {
  gemini: "gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile",
};

export interface CreateAIProviderOptions {
  onFallback?: FallbackListener;
}

export function createAIProvider(
  config: AppConfig,
  options?: CreateAIProviderOptions,
): AIProvider {
  const primaryEntry = getProviderEntry(config.provider);
  const primaryApiKey = config.apiKeys[config.provider];

  if (!primaryApiKey) {
    throw new AppError({
      code: "MISSING_API_KEY",
      message: `Missing ${primaryEntry.label} API key.`,
      hint: "Run `patchwise setup` to configure it.",
    });
  }

  const chain: FallbackChainEntry[] = [
    {
      provider: config.provider,
      instance: primaryEntry.createProvider(primaryApiKey, config.model),
    },
  ];

  const fallbackProvider = config.fallbackProvider;

  if (fallbackProvider && fallbackProvider !== config.provider) {
    const fallbackEntry = PROVIDER_REGISTRY[fallbackProvider];
    const fallbackApiKey = config.apiKeys[fallbackProvider];

    // An unregistered or unconfigured fallback provider is skipped
    // silently rather than failing the primary request.
    if (fallbackEntry && fallbackApiKey) {
      chain.push({
        provider: fallbackProvider,
        instance: fallbackEntry.createProvider(
          fallbackApiKey,
          DEFAULT_MODEL_BY_PROVIDER[fallbackProvider],
        ),
      });
    }
  }

  if (chain.length === 1) {
    return chain[0].instance;
  }

  return new FallbackAIProvider(chain, options?.onFallback);
}

export async function listModelsForProvider(
  provider: ProviderName,
  apiKey: string,
): Promise<ModelOption[]> {
  return getProviderEntry(provider).listModels(apiKey);
}

export function getProviderLabel(provider: ProviderName): string {
  return PROVIDER_REGISTRY[provider]?.label ?? provider;
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
