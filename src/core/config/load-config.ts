import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

import {
  PROVIDER_NAMES,
  type ApiKeys,
  type AppConfig,
  type Language,
  type ProviderName,
  type ScopeStrategy,
} from "@/types";
import { CONFIG_FILE_NAME, DEFAULT_CONFIG } from "@/core/config/defaults";
import { printWarning } from "@/core/ui/output";

const stringArraySchema = z.array(z.string().min(1)).optional();

const baseConfigShape = {
  $schema: z.string().min(1).optional(),
  provider: z.enum(PROVIDER_NAMES).optional(),
  model: z.string().min(1).optional(),
  commitConvention: z.literal("conventional").optional(),
  language: z.enum(["en", "fr"]).optional(),
  maxSubjectLength: z.number().int().positive().optional(),
  allowEmoji: z.boolean().optional(),
  confirmBeforeCommit: z.boolean().optional(),
  confirmBeforePush: z.boolean().optional(),
  scopeStrategy: z.enum(["auto", "manual", "none"]).optional(),
  fallbackProvider: z.enum(PROVIDER_NAMES).optional(),
  onboardingComplete: z.boolean().optional(),
  rules: stringArraySchema,
  allowedScopes: stringArraySchema,
  forbiddenPatterns: stringArraySchema,
  fewShotExamples: z
    .array(
      z.object({
        summary: z.string().min(1).optional(),
        commit: z.string().min(1),
      }),
    )
    .optional(),
};

// API keys are intentionally excluded from the project-level schema: they
// must only live in the user-level config file or environment variables.
const projectConfigSchema = z.object(baseConfigShape);

const apiKeysSchema = z
  .object({
    gemini: z.string().min(1).optional(),
    groq: z.string().min(1).optional(),
  })
  .optional();

const userConfigSchema = z.object({
  ...baseConfigShape,
  apiKeys: apiKeysSchema,
});

type PartialConfig = Partial<AppConfig>;
type PartialProjectConfig = Omit<PartialConfig, "apiKeys">;

let legacyApiKeyNoticeShown = false;

export async function loadConfig(cwd = process.cwd()): Promise<AppConfig> {
  const fileConfig = await loadProjectConfig(cwd);
  const userConfig = await loadUserConfig();

  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    ...fileConfig,
    provider: readEnv(
      "PATCHWISE_PROVIDER",
      fileConfig.provider ?? userConfig.provider ?? DEFAULT_CONFIG.provider,
    ),
    model:
      process.env.PATCHWISE_MODEL ??
      fileConfig.model ??
      userConfig.model ??
      DEFAULT_CONFIG.model,
    language: readEnv(
      "PATCHWISE_LANGUAGE",
      fileConfig.language ?? userConfig.language ?? DEFAULT_CONFIG.language,
    ),
    allowEmoji:
      fileConfig.allowEmoji ??
      userConfig.allowEmoji ??
      DEFAULT_CONFIG.allowEmoji,
    fallbackProvider:
      fileConfig.fallbackProvider ?? userConfig.fallbackProvider,
    apiKeys: resolveApiKeys(userConfig.apiKeys),
    onboardingComplete:
      fileConfig.onboardingComplete ??
      userConfig.onboardingComplete ??
      DEFAULT_CONFIG.onboardingComplete,
    rules: mergeStringArrays(userConfig.rules, fileConfig.rules),
    allowedScopes: mergeAllowedScopes(userConfig, fileConfig),
    forbiddenPatterns: mergeStringArrays(
      userConfig.forbiddenPatterns,
      fileConfig.forbiddenPatterns,
    ),
    fewShotExamples: [
      ...(userConfig.fewShotExamples ?? []),
      ...(fileConfig.fewShotExamples ?? []),
    ],
  };
}

function resolveApiKeys(userApiKeys: ApiKeys | undefined): ApiKeys {
  const apiKeys: ApiKeys = {
    gemini: process.env.GEMINI_API_KEY ?? userApiKeys?.gemini,
    groq: process.env.GROQ_API_KEY ?? userApiKeys?.groq,
  };

  return Object.fromEntries(
    Object.entries(apiKeys).filter(([, value]) => value !== undefined),
  ) as ApiKeys;
}

export interface InitConfigFileResult {
  path: string;
  created: boolean;
}

export async function initConfigFile(
  cwd = process.cwd(),
): Promise<InitConfigFileResult> {
  const configPath = path.join(cwd, CONFIG_FILE_NAME);

  try {
    await access(configPath);
    return {
      path: configPath,
      created: false,
    };
  } catch (error) {
    if (!isMissingFile(error)) {
      throw error;
    }
  }

  // apiKeys are deliberately omitted: they must never be written to a
  // project-level config file that could end up committed to Git.
  const projectDefaults: Record<string, unknown> = { ...DEFAULT_CONFIG };
  delete projectDefaults.apiKeys;

  await writeFile(
    `${configPath}`,
    `${JSON.stringify(projectDefaults, null, 2)}\n`,
    "utf8",
  );

  return {
    path: configPath,
    created: true,
  };
}

export async function loadUserConfig(): Promise<PartialConfig> {
  const configPath = getUserConfigPath();

  try {
    const raw = await readFile(configPath, "utf8");
    const { config, migratedApiKey } = migrateLegacyApiKey(JSON.parse(raw));

    if (migratedApiKey) {
      notifyLegacyApiKeyMigration();
    }

    return userConfigSchema.parse(config);
  } catch (error) {
    if (!isMissingFile(error)) {
      throw error;
    }
  }

  return {};
}

export async function saveUserConfig(config: PartialConfig): Promise<string> {
  const configPath = getUserConfigPath();
  const existing = await loadUserConfig();

  const merged: PartialConfig = {
    ...existing,
    ...config,
    apiKeys: { ...existing.apiKeys, ...config.apiKeys },
  };

  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  return configPath;
}

export function getUserConfigPath(): string {
  if (process.platform === "win32") {
    const appData =
      process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "patchwise", "config.json");
  }

  if (process.platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "patchwise",
      "config.json",
    );
  }

  const xdgConfigHome =
    process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  return path.join(xdgConfigHome, "patchwise", "config.json");
}

async function loadProjectConfig(cwd: string): Promise<PartialProjectConfig> {
  const configPath = path.join(cwd, CONFIG_FILE_NAME);

  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (typeof parsed.groqApiKey === "string" && parsed.groqApiKey.length > 0) {
      notifyLegacyApiKeyMigration({ inProject: true });
    }

    return projectConfigSchema.parse(parsed);
  } catch (error) {
    if (!isMissingFile(error)) {
      throw error;
    }
  }

  return {};
}

/**
 * Legacy configs stored a single `groqApiKey` string field. Fold it into
 * `apiKeys.groq` so callers only ever deal with the new shape.
 */
function migrateLegacyApiKey(raw: unknown): {
  config: Record<string, unknown>;
  migratedApiKey: boolean;
} {
  if (typeof raw !== "object" || raw === null) {
    return { config: {}, migratedApiKey: false };
  }

  const config = { ...(raw as Record<string, unknown>) };
  const legacyGroqApiKey = config.groqApiKey;

  if (typeof legacyGroqApiKey === "string" && legacyGroqApiKey.length > 0) {
    const apiKeys =
      typeof config.apiKeys === "object" && config.apiKeys !== null
        ? (config.apiKeys as Record<string, unknown>)
        : {};

    config.apiKeys = { groq: legacyGroqApiKey, ...apiKeys };
    delete config.groqApiKey;

    return { config, migratedApiKey: true };
  }

  delete config.groqApiKey;
  return { config, migratedApiKey: false };
}

function notifyLegacyApiKeyMigration(options?: { inProject?: boolean }): void {
  if (legacyApiKeyNoticeShown) {
    return;
  }

  legacyApiKeyNoticeShown = true;

  printWarning(
    options?.inProject
      ? "Found a legacy `groqApiKey` in patchwise.config.json — project-level API keys are no longer supported and this key is being ignored."
      : "Migrated legacy `groqApiKey` to the new `apiKeys` format.",
  );
  printWarning("Run `patchwise setup` to store your API key(s) properly.");
}

function mergeStringArrays(
  userValue: string[] | undefined,
  projectValue: string[] | undefined,
): string[] {
  return [...new Set([...(userValue ?? []), ...(projectValue ?? [])])];
}

function mergeAllowedScopes(
  userConfig: PartialConfig,
  projectConfig: PartialProjectConfig,
): string[] {
  if (projectConfig.allowedScopes && projectConfig.allowedScopes.length > 0) {
    return [...new Set(projectConfig.allowedScopes)];
  }

  return [...new Set(userConfig.allowedScopes ?? [])];
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function readEnv<T extends Language | ProviderName | ScopeStrategy>(
  name: string,
  fallback: T,
): T {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  return value as T;
}
