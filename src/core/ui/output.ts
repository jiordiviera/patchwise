import chalk from "chalk";

import { formatCommitMessage } from "@/core/commit/format";
import type { CommitSuggestion, SuggestionResult } from "@/types";

const BORDER = "─";
const WIDTH = 56;

function divider(label?: string): string {
  const line = chalk.dim(BORDER.repeat(WIDTH));
  if (!label) return line;
  const padded = ` ${label} `;
  const remaining = Math.max(0, WIDTH - padded.length);
  const half = Math.floor(remaining / 2);
  return (
    chalk.dim(BORDER.repeat(half)) +
    chalk.dim(padded) +
    chalk.dim(BORDER.repeat(remaining - half))
  );
}

function typeBadge(type: string): string {
  const colors: Record<string, typeof chalk.green> = {
    feat: chalk.cyan,
    fix: chalk.yellow,
    refactor: chalk.magenta,
    docs: chalk.blue,
    test: chalk.green,
    chore: chalk.gray,
    perf: chalk.red,
    build: chalk.yellow,
    ci: chalk.blueBright,
  };
  const color = colors[type] ?? chalk.white;
  return color(` ${type.toUpperCase()} `);
}

function formatSuggestionLine(
  suggestion: CommitSuggestion,
  index: number,
): string {
  const header = formatCommitMessage(suggestion);
  const badge = typeBadge(suggestion.type);
  const number = chalk.bold(`${index + 1}.`);
  const line = `  ${number} ${badge} ${chalk.white(header)}`;

  if (suggestion.body) {
    const bodyPreview = suggestion.body.split("\n").slice(0, 1).join("");
    return `${line}\n${chalk.dim(`     ${bodyPreview}`)}`;
  }

  return line;
}

export function printSuggestionResult(result: SuggestionResult): void {
  console.log();

  result.suggestions.forEach((suggestion, index) => {
    console.log(formatSuggestionLine(suggestion, index));
  });

  console.log();
}

export function printSuccess(message: string): void {
  console.log(`  ${chalk.green("✔")} ${chalk.green(message)}`);
}

export function printInfo(message: string): void {
  console.log(`  ${chalk.blue("ℹ")} ${chalk.blue(message)}`);
}

export function printWarning(message: string): void {
  console.log(`  ${chalk.yellow("⚠")} ${chalk.yellow(message)}`);
}

export function printError(message: string): void {
  console.error(`  ${chalk.red("✖")} ${chalk.red(message)}`);
}

export function printCommitCreated(message: string, branch?: string): void {
  console.log();
  console.log(divider());
  console.log(`  ${chalk.green("✔")} ${chalk.green("Commit created:")}`);
  console.log(`    ${chalk.white(message)}`);
  if (branch) {
    console.log(`    ${chalk.dim(`on branch ${branch}`)}`);
  }
  console.log(divider());
  console.log();
}

export function printPushed(branch: string): void {
  console.log();
  console.log(divider());
  console.log(
    `  ${chalk.green("✔")} ${chalk.green(`Pushed to origin/${branch}`)}`,
  );
  console.log(divider());
  console.log();
}

export function printCancelled(): void {
  console.log(`  ${chalk.yellow("↩")} ${chalk.yellow("Cancelled.")}`);
}
