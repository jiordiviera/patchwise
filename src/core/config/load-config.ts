import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

import type { AppConfig, Language, ProviderName, ScopeStrategy } from "@/types";
import { CONFIG_FILE_NAME, DEFAULT_CONFIG } from "@/core/config/defaults";

const configSchema = z.object({
  provider: z.literal("groq").optional(),
  model: z.string().min(1).optional(),
  commitConvention: z.literal("conventional").optional(),
  language: z.enum(["en", "fr"]).optional(),
  maxSubjectLength: z.number().int().positive().optional(),
  confirmBeforeCommit: z.boolean().optional(),
  confirmBeforePush: z.boolean().optional(),
  scopeStrategy: z.enum(["auto", "manual", "none"]).optional(),
  groqApiKey: z.string().min(1).optional(),
  onboardingComplete: z.boolean().optional(),
});

export async function loadConfig(cwd = process.cwd()): Promise<AppConfig> {
  const fileConfig = await loadProjectConfig(cwd);
  const userConfig = await loadUserConfig();

  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    ...fileConfig,
    provider: readEnv("PATCHWISE_PROVIDER", DEFAULT_CONFIG.provider),
    model:
      process.env.PATCHWISE_MODEL ??
      fileConfig.model ??
      userConfig.model ??
      DEFAULT_CONFIG.model,
    language: readEnv(
      "PATCHWISE_LANGUAGE",
      fileConfig.language ?? userConfig.language ?? DEFAULT_CONFIG.language,
    ),
    groqApiKey:
      process.env.GROQ_API_KEY ??
      fileConfig.groqApiKey ??
      userConfig.groqApiKey,
    onboardingComplete:
      fileConfig.onboardingComplete ??
      userConfig.onboardingComplete ??
      DEFAULT_CONFIG.onboardingComplete,
  };
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

  await writeFile(
    `${configPath}`,
    `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`,
    "utf8",
  );

  return {
    path: configPath,
    created: true,
  };
}

export async function loadUserConfig(): Promise<Partial<AppConfig>> {
  const configPath = getUserConfigPath();

  try {
    const raw = await readFile(configPath, "utf8");
    return configSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (!isMissingFile(error)) {
      throw error;
    }
  }

  return {};
}

export async function saveUserConfig(
  config: Partial<AppConfig>,
): Promise<string> {
  const configPath = getUserConfigPath();
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
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

async function loadProjectConfig(cwd: string): Promise<Partial<AppConfig>> {
  const configPath = path.join(cwd, CONFIG_FILE_NAME);

  try {
    const raw = await readFile(configPath, "utf8");
    return configSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (!isMissingFile(error)) {
      throw error;
    }
  }

  return {};
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
