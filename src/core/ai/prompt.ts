import type { SuggestCommitInput } from "@/types";

export function buildPrompt(input: SuggestCommitInput): string {
  const categories = categorizeFiles(input.fileNames);

  return [
    "Task:",
    "Generate Conventional Commit suggestions from this Git diff.",
    "Return strict JSON only. Do not include markdown, prose, or code fences.",
    "",
    "Output schema:",
    input.allowEmoji
      ? `{"summary":"string","suggestions":[{"emoji":"✨","type":"feat","scope":"string","subject":"string","body":"string"}]}`
      : `{"summary":"string","suggestions":[{"type":"feat","scope":"string","subject":"string","body":"string"}]}`,
    "",
    "Language:",
    `- ${formatLanguageInstruction(input.language)}`,
    "",
    "Commit rules:",
    "- Each suggestion covers ALL changes, never a subset.",
    "- Return 2 suggestions with distinct types or scopes.",
    "- Use Conventional Commit types only: feat, fix, refactor, docs, test, chore, perf, build, ci.",
    "- Subject must be imperative, lower-case, and concise.",
    `- Subject max length: ${input.maxSubjectLength} characters.`,
    "- Body must be brief bullet points grouped by changed area.",
    `- Changed areas: ${Array.from(categories).join(", ") || "unknown"}.`,
    `- Changed files: ${input.fileNames.join(", ") || "unknown"}.`,
    input.allowEmoji
      ? "- Emoji is required. Set `emoji` to one relevant gitmoji-style emoji such as ✨, 🐛, ♻️, 📝, ✅, 🔧, 🚀, 🔒."
      : "- Emoji is forbidden. Do not include the `emoji` field.",
    "",
    input.rules.length > 0 ? formatList("Project rules", input.rules) : "",
    input.allowedScopes.length > 0
      ? `Allowed scopes only: ${input.allowedScopes.join(", ")}.`
      : "",
    input.forbiddenPatterns.length > 0
      ? formatList("Forbidden patterns", input.forbiddenPatterns)
      : "",
    input.scope ? `- Scope: ${input.scope}.` : "",
    input.diff.includes("[diff truncated")
      ? "Note: diff was truncated. Use the file list to infer full scope."
      : "",
    input.fewShotExamples.length > 0
      ? formatFewShotExamples(input.fewShotExamples)
      : "",
    "",
    "Diff:",
    input.diff,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatLanguageInstruction(language: SuggestCommitInput["language"]): string {
  if (language === "fr") {
    return "Language: French. Write `summary`, `subject`, and `body` in French.";
  }

  return "Language: English. Write `summary`, `subject`, and `body` in English.";
}

function formatList(label: string, values: string[]): string {
  return [`- ${label}:`, ...values.map((value) => `  - ${value}`)].join("\n");
}

function formatFewShotExamples(
  examples: Array<{ summary?: string; commit: string }>,
): string {
  return [
    "Preferred commit style examples:",
    ...examples.map((example, index) => {
      const summary = example.summary ? `summary: ${example.summary}; ` : "";
      return `${index + 1}. ${summary}commit: ${example.commit}`;
    }),
  ].join("\n");
}

function categorizeFiles(files: string[]): Set<string> {
  const categories = new Set<string>();

  for (const f of files) {
    if (f.startsWith("src/") || f.startsWith("lib/")) categories.add("code");
    else if (
      f.startsWith("test/") ||
      f.startsWith("tests/") ||
      f.startsWith("spec/")
    )
      categories.add("test");
    else if (f.startsWith("docs/") || f.endsWith(".md")) categories.add("docs");
    else if (f.includes(".config.") || f.endsWith("rc") || f.endsWith(".json"))
      categories.add("config");
    else if (
      f.startsWith(".github/") ||
      f.endsWith(".yml") ||
      f.endsWith(".yaml")
    )
      categories.add("ci");
    else categories.add("other");
  }

  return categories;
}
