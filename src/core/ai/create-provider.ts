import { GroqAIProvider } from "@/core/ai/providers/groq";
import type { AIProvider, AppConfig } from "@/types";

export function createAIProvider(config: AppConfig): AIProvider {
  if (config.provider === "groq") {
    const apiKey = config.groqApiKey;

    if (!apiKey) {
      throw new Error(
        "Missing Groq API key. Run `patchwise setup` to configure it.",
      );
    }

    return new GroqAIProvider(apiKey, config.model);
  }

  throw new Error(`Unsupported provider: ${config.provider}`);
}
