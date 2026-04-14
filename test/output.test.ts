import { beforeEach, describe, expect, it, vi } from "vitest";

const output = await import("@/core/ui/output");

describe("ui output", () => {
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prints suggestion results", () => {
    output.printSuggestionResult({
      summary: "summary",
      suggestions: [
        { type: "feat", scope: "auth", subject: "add login", body: "- line 1" },
        { type: "fix", subject: "fix bug" },
      ],
    });

    expect(logSpy).toHaveBeenCalled();
  });

  it("prints success/info/warning/error helpers", () => {
    output.printSuccess("done");
    output.printInfo("info");
    output.printWarning("warn");
    output.printError("err");

    expect(logSpy).toHaveBeenCalledTimes(3);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("prints a structured app error with hint and details", () => {
    output.printAppError({
      name: "AppError",
      message: "Boom",
      code: "TEST",
      hint: "Try again",
      details: ["detail 1", "detail 2"],
    });

    expect(errorSpy).toHaveBeenCalled();
  });

  it("prints commit and push success blocks", () => {
    output.printCommitCreated("feat: add feature", "feature/test");
    output.printPushed("feature/test");
    output.printCancelled();

    expect(logSpy).toHaveBeenCalled();
  });
});
