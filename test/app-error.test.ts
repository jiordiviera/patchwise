import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { AppError, toAppError } from "@/core/errors/app-error";

describe("app error conversion", () => {
  it("returns an AppError unchanged", () => {
    const error = new AppError({
      code: "TEST",
      message: "Test message",
      hint: "Test hint",
    });

    expect(toAppError(error)).toBe(error);
  });

  it("converts zod errors into structured app errors", () => {
    const error = new ZodError([
      {
        code: "invalid_type",
        expected: "string",
        input: 42,
        path: ["summary"],
        message: "Invalid input: expected string, received number",
      },
    ]);

    const converted = toAppError(error);

    expect(converted.code).toBe("INVALID_RESPONSE");
    expect(converted.details).toContain(
      "summary: Invalid input: expected string, received number",
    );
  });
});
