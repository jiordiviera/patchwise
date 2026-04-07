import { describe, expect, it } from "vitest";

import { buildPrompt } from "@/core/ai/prompt";

describe("buildPrompt", () => {
  const defaultInput = {
    diff: "diff --git a/src/index.ts b/src/index.ts\n+console.log('hello');",
    fileNames: ["src/index.ts"],
    language: "en" as const,
    scopeStrategy: "auto" as const,
    maxSubjectLength: 72,
  };

  it("builds a prompt with basic info", () => {
    const prompt = buildPrompt(defaultInput);

    expect(prompt).toContain("Conventional Commit");
    expect(prompt).toContain("JSON");
    expect(prompt).toContain("src/index.ts");
    expect(prompt).toContain("diff --git");
  });

  it("includes scope when provided", () => {
    const prompt = buildPrompt({ ...defaultInput, scope: "auth" });

    expect(prompt).toContain("Scope: auth");
  });

  it("includes truncation note when diff is truncated", () => {
    const prompt = buildPrompt({
      ...defaultInput,
      diff: "[diff truncated — remaining files omitted]",
    });

    expect(prompt).toContain("diff was truncated");
    expect(prompt).toContain("Use the file list to infer full scope");
  });

  it("includes file categories in areas", () => {
    const prompt = buildPrompt({
      ...defaultInput,
      fileNames: ["src/app.ts", "test/app.test.ts", "docs/guide.md"],
    });

    expect(prompt).toContain("Areas:");
    expect(prompt).toContain("code");
    expect(prompt).toContain("test");
    expect(prompt).toContain("docs");
  });

  it("filters out empty lines", () => {
    const prompt = buildPrompt({
      ...defaultInput,
      diff: "small diff",
    });

    // Should not have double newlines from empty conditional lines
    expect(prompt).not.toContain("\n\n\n");
  });
});
