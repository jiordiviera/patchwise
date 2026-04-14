import { GroqAIProvider } from "@/core/ai/providers/groq";
import { AppError } from "@/core/errors/app-error";
import type { AIProvider, AppConfig } from "@/types";

export function createAIProvider(config: AppConfig): AIProvider {
  if (config.provider === "groq") {
    const apiKey = config.groqApiKey;

    if (!apiKey) {
      throw new AppError({
        code: "MISSING_API_KEY",
        message: "Missing Groq API key.",
        hint: "Run `patchwise setup` to configure it.",
      });
    }

    return new GroqAIProvider(apiKey, config.model);
  }

  throw new AppError({
    code: "UNSUPPORTED_PROVIDER",
    message: `Unsupported provider: ${config.provider}`,
    hint: "Select a supported provider in your config or via `patchwise setup`.",
  });
}
