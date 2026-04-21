import { describe, expect, it } from "vitest";

import { buildPrompt } from "@/core/ai/prompt";

describe("buildPrompt", () => {
  const defaultInput = {
    diff: "diff --git a/src/index.ts b/src/index.ts\n+console.log('hello');",
    fileNames: ["src/index.ts"],
    language: "en" as const,
    scopeStrategy: "auto" as const,
    maxSubjectLength: 72,
    allowEmoji: false,
    rules: [],
    allowedScopes: [],
    forbiddenPatterns: [],
    fewShotExamples: [],
  };

  it("builds a prompt with basic info", () => {
    const prompt = buildPrompt(defaultInput);

    expect(prompt).toContain("Conventional Commit");
    expect(prompt).toContain("Return strict JSON only");
    expect(prompt).toContain("src/index.ts");
    expect(prompt).toContain("diff --git");
  });

  it("instructs the model to use the configured language", () => {
    const prompt = buildPrompt({
      ...defaultInput,
      language: "fr",
    });

    expect(prompt).toContain(
      "Language: French. Write `summary`, `subject`, and `body` in French.",
    );
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

    expect(prompt).toContain("Changed areas:");
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

  it("includes configured rules, scopes, forbidden patterns, and examples", () => {
    const prompt = buildPrompt({
      ...defaultInput,
      rules: ["Use team wording", "Mention ticket only when present"],
      allowedScopes: ["auth", "api"],
      forbiddenPatterns: ["wip", "misc"],
      fewShotExamples: [
        {
          summary: "Adds token refresh",
          commit: "feat(auth): refresh expired tokens",
        },
      ],
    });

    expect(prompt).toContain("Project rules:");
    expect(prompt).toContain("Use team wording");
    expect(prompt).toContain("Allowed scopes only: auth, api.");
    expect(prompt).toContain("Forbidden patterns:");
    expect(prompt).toContain("wip");
    expect(prompt).toContain("Preferred commit style examples:");
    expect(prompt).toContain("feat(auth): refresh expired tokens");
  });

  it("allows gitmoji-style emoji when configured", () => {
    const prompt = buildPrompt({
      ...defaultInput,
      allowEmoji: true,
    });

    expect(prompt).toContain(`"emoji":"✨"`);
    expect(prompt).toContain("Emoji is required");
    expect(prompt).toContain("gitmoji-style emoji");
  });

  it("forbids emoji when disabled", () => {
    const prompt = buildPrompt(defaultInput);

    expect(prompt).not.toContain(`"emoji":"✨"`);
    expect(prompt).toContain("Emoji is forbidden");
    expect(prompt).toContain("Do not include the `emoji` field");
  });
});
