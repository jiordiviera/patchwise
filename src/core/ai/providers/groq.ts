import { buildPrompt } from "@/core/ai/prompt";
import { AppError } from "@/core/errors/app-error";
import { providerResponseSchema } from "@/core/ai/schemas";
import type { AIProvider, SuggestCommitInput, SuggestionResult } from "@/types";
import { ZodError } from "zod";

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
    let response: Response;
    try {
      response = await fetch(GROQ_API_URL, {
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
    } catch (error) {
      throw new AppError({
        code: "AI_NETWORK_ERROR",
        message: "Could not reach the Groq API.",
        hint: "Check your network connection and try again.",
        cause: error,
      });
    }

    if (!response.ok) {
      const body = await response.text();
      throw mapGroqApiError(response.status, body);
    }

    let payload: GroqResponse;

    try {
      payload = (await response.json()) as GroqResponse;
    } catch (error) {
      throw new AppError({
        code: "AI_INVALID_RESPONSE",
        message: "Groq returned a response that could not be parsed as JSON.",
        hint: "Try again. If it persists, switch model or retry later.",
        cause: error,
      });
    }

    const rawContent = payload.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new AppError({
        code: "AI_EMPTY_RESPONSE",
        message: "Groq returned an empty response.",
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
          message: "Groq returned malformed JSON.",
          hint: "Try again. If it persists, switch model or retry later.",
          details: [truncateText(rawContent, 300)],
          cause: error,
        });
      }

      if (error instanceof ZodError) {
        throw new AppError({
          code: "AI_INVALID_RESPONSE",
          message: "Groq returned JSON in an unexpected format.",
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

function mapGroqApiError(status: number, body: string): AppError {
  const detail = truncateText(body, 300);

  if (status === 401 || status === 403) {
    return new AppError({
      code: "AI_AUTH_FAILED",
      message: "Groq rejected the API credentials.",
      hint: "Run `patchwise setup` and verify your Groq API key.",
      details: detail ? [detail] : undefined,
    });
  }

  if (status === 429) {
    return new AppError({
      code: "AI_RATE_LIMITED",
      message: "Groq rate limit reached.",
      hint: "Wait a bit and retry, or switch to a lighter model.",
      details: detail ? [detail] : undefined,
    });
  }

  if (status === 413) {
    return new AppError({
      code: "AI_REQUEST_TOO_LARGE",
      message: "The staged diff is too large for Groq.",
      hint: "Commit fewer files, use `patchwise commit --select`, or split this change into smaller commits.",
      details: detail ? [detail] : undefined,
    });
  }

  if (status >= 500) {
    return new AppError({
      code: "AI_PROVIDER_ERROR",
      message: "Groq is currently unavailable.",
      hint: "Retry in a moment.",
      details: detail ? [detail] : undefined,
    });
  }

  return new AppError({
    code: "AI_REQUEST_FAILED",
    message: `Groq request failed with status ${status}.`,
    hint: "Check your setup and retry.",
    details: detail ? [detail] : undefined,
  });
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}
