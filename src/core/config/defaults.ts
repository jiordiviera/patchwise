import type { AppConfig } from "@/types";

export const DEFAULT_CONFIG: AppConfig = {
  provider: "groq",
  model: "llama-3.3-70b-versatile",
  commitConvention: "conventional",
  language: "en",
  maxSubjectLength: 72,
  confirmBeforeCommit: true,
  confirmBeforePush: true,
  scopeStrategy: "auto",
  onboardingComplete: false,
};

export const CONFIG_FILE_NAME = "patchwise.config.json";
