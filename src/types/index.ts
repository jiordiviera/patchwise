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
export type ProviderName = "groq";

export interface CommitSuggestion {
  type: CommitType;
  scope?: string;
  subject: string;
  body?: string;
}

export interface SuggestionResult {
  summary: string;
  suggestions: CommitSuggestion[];
}

export interface SuggestCommitInput {
  diff: string;
  fileNames: string[];
  language: Language;
  scopeStrategy: ScopeStrategy;
  scope?: string;
  maxSubjectLength: number;
}

export interface AppConfig {
  provider: ProviderName;
  model: string;
  commitConvention: "conventional";
  language: Language;
  maxSubjectLength: number;
  confirmBeforeCommit: boolean;
  confirmBeforePush: boolean;
  scopeStrategy: ScopeStrategy;
  groqApiKey?: string;
  onboardingComplete?: boolean;
}

export interface AIProvider {
  generateCommitSuggestions(
    input: SuggestCommitInput,
  ): Promise<SuggestionResult>;
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
