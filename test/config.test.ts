import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import {
  getUserConfigPath,
  initConfigFile,
  loadConfig,
} from "@/core/config/load-config";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
  tempDirs.length = 0;
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
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "patchwise-"));
  tempDirs.push(dir);
  return dir;
}
