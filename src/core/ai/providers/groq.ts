import { buildPrompt } from "@/core/ai/prompt";
import { providerResponseSchema } from "@/core/ai/schemas";
import type { AIProvider, SuggestCommitInput, SuggestionResult } from "@/types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface GroqResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class GroqAIProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generateCommitSuggestions(
    input: SuggestCommitInput,
  ): Promise<SuggestionResult> {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a precise commit assistant. Return valid JSON only.",
          },
          {
            role: "user",
            content: buildPrompt(input),
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Groq API error (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as GroqResponse;
    const rawContent = payload.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("Groq API returned an empty response.");
    }

    const parsed = providerResponseSchema.parse(JSON.parse(rawContent));

    return parsed;
  }
}
