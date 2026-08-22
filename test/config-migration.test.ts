import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig, saveUserConfig } from "@/core/config/load-config";

const tempDirs: string[] = [];
const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
const originalGroqApiKey = process.env.GROQ_API_KEY;
const originalGeminiApiKey = process.env.GEMINI_API_KEY;
const originalProvider = process.env.PATCHWISE_PROVIDER;

beforeEach(() => {
  delete process.env.GROQ_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.PATCHWISE_PROVIDER;
});

afterEach(async () => {
  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
  tempDirs.length = 0;
  restoreEnv("XDG_CONFIG_HOME", originalXdgConfigHome);
  restoreEnv("GROQ_API_KEY", originalGroqApiKey);
  restoreEnv("GEMINI_API_KEY", originalGeminiApiKey);
  restoreEnv("PATCHWISE_PROVIDER", originalProvider);
});

describe("config migration", () => {
  it("migrates a legacy groqApiKey in the user config to apiKeys.groq", async () => {
    const dir = await makeTempDir();
    const configHome = await useUserConfigHome();
    const userConfigPath = path.join(configHome, "patchwise", "config.json");
    await mkdir(path.dirname(userConfigPath), { recursive: true });
    await writeFile(
      userConfigPath,
      JSON.stringify({ provider: "groq", groqApiKey: "legacy-secret" }),
      "utf8",
    );

    const config = await loadConfig(dir);

    expect(config.apiKeys.groq).toBe("legacy-secret");
  });

  it("ignores a legacy groqApiKey found in the project config", async () => {
    const dir = await makeTempDir();
    await useUserConfigHome();
    await writeFile(
      path.join(dir, "patchwise.config.json"),
      JSON.stringify({ groqApiKey: "should-not-be-used" }),
      "utf8",
    );

    const config = await loadConfig(dir);

    expect(config.apiKeys.groq).toBeUndefined();
  });

  it("respects the provider chosen in project/user config, not just the default", async () => {
    const dir = await makeTempDir();
    await useUserConfigHome();
    await writeFile(
      path.join(dir, "patchwise.config.json"),
      JSON.stringify({ provider: "gemini" }),
      "utf8",
    );

    const config = await loadConfig(dir);

    expect(config.provider).toBe("gemini");
  });

  it("lets PATCHWISE_PROVIDER override the configured provider", async () => {
    const dir = await makeTempDir();
    await useUserConfigHome();
    await writeFile(
      path.join(dir, "patchwise.config.json"),
      JSON.stringify({ provider: "gemini" }),
      "utf8",
    );
    process.env.PATCHWISE_PROVIDER = "groq";

    const config = await loadConfig(dir);

    expect(config.provider).toBe("groq");
  });

  it("resolves api keys from env vars over the user config file", async () => {
    const dir = await makeTempDir();
    const configHome = await useUserConfigHome();
    const userConfigPath = path.join(configHome, "patchwise", "config.json");
    await mkdir(path.dirname(userConfigPath), { recursive: true });
    await writeFile(
      userConfigPath,
      JSON.stringify({ apiKeys: { gemini: "file-key" } }),
      "utf8",
    );
    process.env.GEMINI_API_KEY = "env-key";

    const config = await loadConfig(dir);

    expect(config.apiKeys.gemini).toBe("env-key");
  });

  it("saveUserConfig merges new fields instead of overwriting the file", async () => {
    const configHome = await useUserConfigHome();
    const userConfigPath = path.join(configHome, "patchwise", "config.json");
    await mkdir(path.dirname(userConfigPath), { recursive: true });
    await writeFile(
      userConfigPath,
      JSON.stringify({
        apiKeys: { gemini: "gemini-secret" },
        rules: ["keep me"],
      }),
      "utf8",
    );

    await saveUserConfig({
      provider: "groq",
      apiKeys: { groq: "groq-secret" },
      onboardingComplete: true,
    });

    const saved = JSON.parse(await readFile(userConfigPath, "utf8"));

    expect(saved.apiKeys).toEqual({
      gemini: "gemini-secret",
      groq: "groq-secret",
    });
    expect(saved.rules).toEqual(["keep me"]);
    expect(saved.onboardingComplete).toBe(true);
  });
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "patchwise-"));
  tempDirs.push(dir);
  return dir;
}

async function useUserConfigHome(): Promise<string> {
  const configHome = await makeTempDir();
  process.env.XDG_CONFIG_HOME = configHome;
  return configHome;
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
