import type { SuggestCommitInput } from "@/types";

export function buildPrompt(input: SuggestCommitInput): string {
  const categories = categorizeFiles(input.fileNames);
  const categoryList = Array.from(categories).join(", ");

  return [
    "You generate Conventional Commit messages from a Git diff.",
    "Return strict JSON only.",
    "The JSON shape must be:",
    '{"summary":"string","suggestions":[{"type":"feat","scope":"optional","subject":"string","body":"optional string"}]}',
    "Rules:",
    "- EVERY suggestion must cover ALL changes in the diff, never just a subset.",
    "- The body should list each change group as bullet points.",
    `- This diff touches these areas: ${categoryList}.`,
    "",
    "Suggestion 1 — Primary: the most accurate type/scope for the full change.",
    "Suggestion 2 — Alternative angle: use a different type or scope that also fits.",
    "Suggestion 3 — Broad: a higher-level framing that encompasses everything.",
    "",
    "Each suggestion must have a DISTINCT type, scope, or subject. No rephrasing.",
    "- Subjects must be imperative, concise, and lower-case.",
    `- Subject max length: ${input.maxSubjectLength}.`,
    `- Language: ${input.language}.`,
    `- Scope strategy: ${input.scopeStrategy}.`,
    input.scope
      ? `- Preferred scope: ${input.scope}.`
      : "- Preferred scope: infer only if obvious.",
    `- Files involved: ${input.fileNames.join(", ") || "unknown"}.`,
    "Diff:",
    input.diff,
  ].join("\n");
}

function categorizeFiles(files: string[]): Set<string> {
  const categories = new Set<string>();

  for (const f of files) {
    if (f.startsWith("src/") || f.startsWith("lib/")) categories.add("code");
    else if (f.startsWith("test/") || f.startsWith("tests/") || f.startsWith("spec/")) categories.add("test");
    else if (f.startsWith("docs/") || f.endsWith(".md")) categories.add("docs");
    else if (f.includes(".config.") || f.endsWith("rc") || f.endsWith(".json")) categories.add("config");
    else if (f.startsWith(".github/") || f.endsWith(".yml") || f.endsWith(".yaml")) categories.add("ci");
    else categories.add("other");
  }

  return categories;
}
