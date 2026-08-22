import { z, ZodError } from "zod";

import { buildPrompt } from "@/core/ai/prompt";
import { AppError } from "@/core/errors/app-error";
import { providerResponseSchema } from "@/core/ai/schemas";
import type {
  AIProvider,
  ModelOption,
  SuggestCommitInput,
  SuggestionResult,
} from "@/types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com";
const GEMINI_RESPONSE_SCHEMA = toGeminiSchema(
  z.toJSONSchema(providerResponseSchema, { io: "input" }) as JsonSchemaNode,
);

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  promptFeedback?: { blockReason?: string };
}

export class GeminiAIProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generateCommitSuggestions(
    input: SuggestCommitInput,
  ): Promise<SuggestionResult> {
    let response: Response;

    try {
      response = await fetch(
        `${GEMINI_API_BASE}/v1beta/models/${this.model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: "You are a precise commit assistant. Return valid JSON only.",
                },
              ],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: buildPrompt(input) }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
              responseSchema: GEMINI_RESPONSE_SCHEMA,
            },
          }),
        },
      );
    } catch (error) {
      throw new AppError({
        code: "AI_NETWORK_ERROR",
        message: "Could not reach the Gemini API.",
        hint: "Check your network connection and try again.",
        cause: error,
      });
    }

    if (!response.ok) {
      const body = await response.text();
      throw mapGeminiApiError(response.status, body);
    }

    let payload: GeminiGenerateContentResponse;

    try {
      payload = (await response.json()) as GeminiGenerateContentResponse;
    } catch (error) {
      throw new AppError({
        code: "AI_INVALID_RESPONSE",
        message: "Gemini returned a response that could not be parsed as JSON.",
        hint: "Try again. If it persists, switch model or retry later.",
        cause: error,
      });
    }

    const rawContent = payload.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawContent) {
      const blockReason = payload.promptFeedback?.blockReason;
      throw new AppError({
        code: "AI_EMPTY_RESPONSE",
        message: blockReason
          ? `Gemini blocked the response (${blockReason}).`
          : "Gemini returned an empty response.",
        hint: "Try again. If it persists, switch model or retry later.",
      });
    }

    try {
      const parsed = providerResponseSchema.parse(JSON.parse(rawContent));
      return parsed;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new AppError({
          code: "AI_INVALID_RESPONSE",
          message: "Gemini returned malformed JSON.",
          hint: "Try again. If it persists, switch model or retry later.",
          details: [truncateText(rawContent, 300)],
          cause: error,
        });
      }

      if (error instanceof ZodError) {
        throw new AppError({
          code: "AI_INVALID_RESPONSE",
          message: "Gemini returned JSON in an unexpected format.",
          hint: "Try again. If it persists, switch model or retry later.",
          details: error.issues.map((issue) => {
            const path = issue.path.length > 0 ? issue.path.join(".") : "root";
            return `${path}: ${issue.message}`;
          }),
          cause: error,
        });
      }

      throw error;
    }
  }
}

export async function listGeminiModels(apiKey: string): Promise<ModelOption[]> {
  let response: Response;

  try {
    response = await fetch(`${GEMINI_API_BASE}/v1beta/models`, {
      headers: {
        "x-goog-api-key": apiKey,
      },
    });
  } catch (error) {
    throw new AppError({
      code: "AI_NETWORK_ERROR",
      message: "Could not reach the Gemini API.",
      hint: "Check your network connection and try again.",
      cause: error,
    });
  }

  if (!response.ok) {
    const body = await response.text();
    throw mapGeminiApiError(response.status, body);
  }

  const data = (await response.json()) as {
    models?: Array<{
      name: string;
      displayName?: string;
      supportedGenerationMethods?: string[];
    }>;
  };

  return (data.models ?? [])
    .filter((model) =>
      (model.supportedGenerationMethods ?? []).includes("generateContent"),
    )
    .map((model) => {
      const id = model.name.replace(/^models\//, "");
      return { id, name: model.displayName ?? id };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function mapGeminiApiError(status: number, body: string): AppError {
  const detail = extractGeminiErrorMessage(body) ?? truncateText(body, 300);
  const details = detail ? [detail] : undefined;

  if (status === 401 || status === 403) {
    return new AppError({
      code: "AI_AUTH_FAILED",
      message: "Gemini rejected the API credentials.",
      hint: "Run `patchwise setup` and verify your Gemini API key.",
      details,
    });
  }

  if (status === 429) {
    return new AppError({
      code: "AI_RATE_LIMITED",
      message: "Gemini rate limit reached.",
      hint: "Wait a bit and retry, or switch to a lighter model.",
      details,
    });
  }

  if (status === 413) {
    return new AppError({
      code: "AI_REQUEST_TOO_LARGE",
      message: "The staged diff is too large for Gemini.",
      hint: "Commit fewer files, use `patchwise commit --select`, or split this change into smaller commits.",
      details,
    });
  }

  if (status >= 500) {
    return new AppError({
      code: "AI_PROVIDER_ERROR",
      message: "Gemini is currently unavailable.",
      hint: "Retry in a moment.",
      details,
    });
  }

  return new AppError({
    code: "AI_REQUEST_FAILED",
    message: `Gemini request failed with status ${status}.`,
    hint: "Check your setup and retry.",
    details,
  });
}

function extractGeminiErrorMessage(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; status?: string };
    };

    if (!parsed.error?.message) {
      return undefined;
    }

    return parsed.error.status
      ? `${parsed.error.status}: ${parsed.error.message}`
      : parsed.error.message;
  } catch {
    return undefined;
  }
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

// Gemini's structured-output schema is a small subset of JSON Schema:
// only `type` (upper-cased), `properties`, `items`, and `required` are
// forwarded. Derived from providerResponseSchema so the two can't drift.
interface JsonSchemaNode {
  type?: string;
  properties?: Record<string, JsonSchemaNode>;
  items?: JsonSchemaNode;
  required?: string[];
}

function toGeminiSchema(node: JsonSchemaNode): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: (node.type ?? "string").toUpperCase(),
  };

  if (node.properties) {
    schema.properties = Object.fromEntries(
      Object.entries(node.properties).map(([key, value]) => [
        key,
        toGeminiSchema(value),
      ]),
    );
  }

  if (node.items) {
    schema.items = toGeminiSchema(node.items);
  }

  if (node.required) {
    schema.required = node.required;
  }

  return schema;
}
