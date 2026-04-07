import { accessSync } from "node:fs";
import { execSync, exec } from "node:child_process";
import path from "node:path";

export interface VersionCheck {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  packageManager: string;
}

export async function checkForUpdates(): Promise<VersionCheck> {
  const pm = await detectPackageManager();

  try {
    const stdout = await new Promise<string>((resolve, reject) => {
      exec(
        "npm view patchwise version --registry=https://registry.npmjs.org",
        { timeout: 5000 },
        (err, out) => (err ? reject(err) : resolve(out)),
      );
    });
    const latest = stdout.trim();
    const current = await getCurrentVersion();

    return {
      current,
      latest,
      updateAvailable: latest !== current && isNewer(latest, current),
      packageManager: pm,
    };
  } catch {
    return {
      current: await getCurrentVersion(),
      latest: null,
      updateAvailable: false,
      packageManager: pm,
    };
  }
}

export async function runUpdate(pm: string): Promise<boolean> {
  const cmd = getUpdateCommand(pm);
  return new Promise((resolve) => {
    exec(cmd, { timeout: 60_000 }, (err) => resolve(!err));
  });
}

export function getUpdateCommand(pm: string): string {
  switch (pm) {
    case "pnpm":
      return "pnpm add -g patchwise";
    case "yarn":
      return "yarn global add patchwise";
    case "bun":
      return "bun add -g patchwise";
    default:
      return "npm install -g patchwise";
  }
}

export function isNewer(latest: string, current: string): boolean {
  const a = latest.split(".").map(Number);
  const b = current.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
    if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
  }

  return false;
}

async function detectPackageManager(): Promise<string> {
  const npmGlobal = process.env.npm_config_prefix;

  if (npmGlobal) {
    if (fileExists(path.join(npmGlobal, "pnpm-lock.yaml"))) return "pnpm";
    if (fileExists(path.join(npmGlobal, "yarn.lock"))) return "yarn";
    if (fileExists(path.join(npmGlobal, "bun.lockb")) || fileExists(path.join(npmGlobal, "bun.lock"))) return "bun";
  }

  try {
    const which = execSync("which patchwise", { encoding: "utf8" }).trim();
    if (which.includes("pnpm")) return "pnpm";
    if (which.includes("yarn")) return "yarn";
    if (which.includes("bun")) return "bun";
  } catch {
    // ignore
  }

  return "npm";
}

async function getCurrentVersion(): Promise<string> {
  try {
    const { version } = (await import("../../../package.json")) as { version: string };
    return version;
  } catch {
    return "unknown";
  }
}

function fileExists(filePath: string): boolean {
  try {
    accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}
