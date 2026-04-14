import { ZodError } from "zod";

export interface AppErrorOptions {
  code: string;
  message: string;
  hint?: string;
  details?: string[];
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: string;
  readonly hint?: string;
  readonly details?: string[];

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code;
    this.hint = options.hint;
    this.details = options.details;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new AppError({
      code: "INVALID_RESPONSE",
      message: "Received an invalid structured response.",
      hint: "Try again. If this keeps happening, change model or rerun later.",
      details: error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "root";
        return `${path}: ${issue.message}`;
      }),
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new AppError({
      code: "UNEXPECTED_ERROR",
      message: error.message || "An unexpected error occurred.",
      cause: error,
    });
  }

  return new AppError({
    code: "UNKNOWN_ERROR",
    message: "An unknown error occurred.",
    details: [String(error)],
  });
}
