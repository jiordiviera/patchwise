import type { AppConfig } from "@/types";

export const DEFAULT_CONFIG: AppConfig = {
  provider: "gemini",
  model: "gemini-2.5-flash",
  commitConvention: "conventional",
  language: "en",
  maxSubjectLength: 72,
  allowEmoji: false,
  confirmBeforeCommit: true,
  confirmBeforePush: true,
  scopeStrategy: "auto",
  apiKeys: {},
  onboardingComplete: false,
  rules: [],
  allowedScopes: [],
  forbiddenPatterns: [],
  fewShotExamples: [],
};

export const CONFIG_FILE_NAME = "patchwise.config.json";
