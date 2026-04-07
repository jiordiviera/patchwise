import { z } from "zod";

import type { CommitType } from "@/types";

const VALID_COMMIT_TYPES: CommitType[] = [
  "feat",
  "fix",
  "refactor",
  "docs",
  "test",
  "chore",
  "perf",
  "build",
  "ci",
];

// Accept any string for type, then coerce to the closest valid type.
// This prevents crashes when the AI returns "bugfix", "feature", etc.
function coerceCommitType(value: string): CommitType {
  if (VALID_COMMIT_TYPES.includes(value as CommitType)) {
    return value as CommitType;
  }

  // Common AI hallucinations → real types
  const aliasMap: Record<string, CommitType> = {
    bugfix: "fix",
    "bug-fix": "fix",
    bug: "fix",
    feature: "feat",
    "new-feature": "feat",
    improvement: "refactor",
    improve: "refactor",
    cleanup: "chore",
    maintenance: "chore",
    style: "refactor",
    formatting: "chore",
    config: "chore",
    configuration: "chore",
    build: "build",
    ci: "ci",
    test: "test",
    tests: "test",
    testing: "test",
    docs: "docs",
    doc: "docs",
    documentation: "docs",
    perf: "perf",
    performance: "perf",
    refactor: "refactor",
    feat: "feat",
    fix: "fix",
    chore: "chore",
  };

  return aliasMap[value.toLowerCase()] ?? "feat";
}

export const suggestionSchema = z.object({
  type: z.string().transform(coerceCommitType),
  scope: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  subject: z.string().min(1),
  // AI sometimes returns body as array of strings instead of a single string.
  // Accept any shape and normalize it.
  body: z
    .any()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      if (typeof v === "string") return v.trim() || undefined;
      if (Array.isArray(v)) {
        const joined = v.filter(Boolean).join("\n").trim();
        return joined || undefined;
      }
      return undefined;
    }),
});

export const providerResponseSchema = z.object({
  summary: z.string().min(1),
  suggestions: z.array(suggestionSchema).min(1).max(3),
});
