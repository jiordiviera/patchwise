export type CommitType =
  | "feat"
  | "fix"
  | "refactor"
  | "docs"
  | "test"
  | "chore"
  | "perf"
  | "build"
  | "ci";

export type ScopeStrategy = "auto" | "manual" | "none";
export type Language = "en" | "fr";
export type ProviderName = "gemini" | "groq";

export const PROVIDER_NAMES = [
  "gemini",
  "groq",
] as const satisfies readonly ProviderName[];

export type ApiKeys = Partial<Record<ProviderName, string>>;

export interface CommitSuggestion {
  type: CommitType;
  emoji?: string;
  scope?: string;
  subject: string;
  body?: string;
}

export interface SuggestionResult {
  summary: string;
  suggestions: CommitSuggestion[];
}

export interface FewShotExample {
  summary?: string;
  commit: string;
}

export interface SuggestCommitInput {
  diff: string;
  fileNames: string[];
  language: Language;
  scopeStrategy: ScopeStrategy;
  scope?: string;
  maxSubjectLength: number;
  allowEmoji: boolean;
  rules: string[];
  allowedScopes: string[];
  forbiddenPatterns: string[];
  fewShotExamples: FewShotExample[];
}

export interface AppConfig {
  provider: ProviderName;
  model: string;
  commitConvention: "conventional";
  language: Language;
  maxSubjectLength: number;
  allowEmoji: boolean;
  confirmBeforeCommit: boolean;
  confirmBeforePush: boolean;
  scopeStrategy: ScopeStrategy;
  apiKeys: ApiKeys;
  fallbackProvider?: ProviderName;
  onboardingComplete?: boolean;
  rules: string[];
  allowedScopes: string[];
  forbiddenPatterns: string[];
  fewShotExamples: FewShotExample[];
}

export interface AIProvider {
  generateCommitSuggestions(
    input: SuggestCommitInput,
  ): Promise<SuggestionResult>;
}

export interface ModelOption {
  id: string;
  name: string;
}

export interface CommitCommandOptions {
  all?: boolean;
  select?: boolean;
  push?: boolean;
  yes?: boolean;
  lang?: Language;
  provider?: ProviderName;
  model?: string;
  scope?: string;
  noScope?: boolean;
}
