import type { SuggestCommitInput } from "@/types";

export function buildPrompt(input: SuggestCommitInput): string {
  const categories = categorizeFiles(input.fileNames);

  return [
    "Generate Conventional Commit messages from this diff. Return JSON only.",
    `Format: {"summary":"string","suggestions":[{"type":"feat","scope?":"string","subject":"string","body?":"string"}]}`,
    "Rules:",
    "- Each suggestion covers ALL changes, never a subset.",
    "- Body: brief bullet points grouping changes by area.",
    `- Areas: ${Array.from(categories).join(", ") || "unknown"}.`,
    `- Files: ${input.fileNames.join(", ") || "unknown"}.`,
    "- Return 2 suggestions with distinct types or scopes.",
    `- Subject: imperative, lower-case, max ${input.maxSubjectLength} chars.`,
    input.scope ? `- Scope: ${input.scope}.` : "",
    input.diff.includes("[diff truncated")
      ? "Note: diff was truncated. Use the file list to infer full scope."
      : "",
    "Diff:",
    input.diff,
  ].filter(Boolean).join("\n");
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
