import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import {
  getUserConfigPath,
  initConfigFile,
  loadConfig,
} from "@/core/config/load-config";

const tempDirs: string[] = [];
const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;

afterEach(async () => {
  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
  tempDirs.length = 0;
  if (originalXdgConfigHome === undefined) {
    delete process.env.XDG_CONFIG_HOME;
  } else {
    process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
  }
});

describe("config", () => {
  it("loads defaults when no file exists", async () => {
    const dir = await makeTempDir();
    const config = await loadConfig(dir);

    expect(config.provider).toBe("groq");
    expect(config.language).toBe("en");
  });

  it("creates the default config file", async () => {
    const dir = await makeTempDir();
    const result = await initConfigFile(dir);
    const filePath = result.path;
    const content = await readFile(filePath, "utf8");

    expect(result.created).toBe(true);
    expect(path.basename(filePath)).toBe("patchwise.config.json");
    expect(content).toContain('"provider": "groq"');
  });

  it("does not overwrite an existing config file", async () => {
    const dir = await makeTempDir();
    const first = await initConfigFile(dir);
    const second = await initConfigFile(dir);

    expect(first.created).toBe(true);
    expect(second).toEqual({
      path: first.path,
      created: false,
    });
  });

  it("resolves a user config path", () => {
    expect(path.basename(getUserConfigPath())).toBe("config.json");
  });

  it("merges global and project rules while project overrides scalar values and allowed scopes", async () => {
    const dir = await makeTempDir();
    const configHome = await makeTempDir();
    process.env.XDG_CONFIG_HOME = configHome;

    const userConfigPath = path.join(configHome, "patchwise", "config.json");
    await mkdir(path.dirname(userConfigPath), { recursive: true });
    await writeFile(
      userConfigPath,
      JSON.stringify({
        language: "fr",
        allowEmoji: true,
        rules: ["global rule"],
        allowedScopes: ["global"],
        forbiddenPatterns: ["global forbidden"],
        fewShotExamples: [{ commit: "chore(global): keep user style" }],
      }),
      "utf8",
    );

    await writeFile(
      path.join(dir, "patchwise.config.json"),
      JSON.stringify({
        language: "en",
        rules: ["project rule"],
        allowedScopes: ["api", "auth"],
        forbiddenPatterns: ["project forbidden"],
        fewShotExamples: [
          {
            summary: "Adds auth endpoint",
            commit: "feat(auth): add login endpoint",
          },
        ],
      }),
      "utf8",
    );

    const config = await loadConfig(dir);

    expect(config.language).toBe("en");
    expect(config.allowEmoji).toBe(true);
    expect(config.rules).toEqual(["global rule", "project rule"]);
    expect(config.allowedScopes).toEqual(["api", "auth"]);
    expect(config.forbiddenPatterns).toEqual([
      "global forbidden",
      "project forbidden",
    ]);
    expect(config.fewShotExamples).toEqual([
      { commit: "chore(global): keep user style" },
      {
        summary: "Adds auth endpoint",
        commit: "feat(auth): add login endpoint",
      },
    ]);
  });
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "patchwise-"));
  tempDirs.push(dir);
  return dir;
}
