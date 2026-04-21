export function truncateDiff(diff: string, maxChars = 4_000): string {
  if (diff.length <= maxChars) {
    return diff;
  }

  // Smart truncation: keep file headers and first N lines per file
  const files = parseDiffFiles(diff);

  if (files.length === 0) {
    return fitToLimit(`${diff.slice(0, maxChars)}\n\n[diff truncated]`, maxChars);
  }

  // Start with a stat summary
  const statLines = files.map((f) => `${f.path} (+${f.added}/-${f.removed})`);
  let result = `Files changed: ${files.length}\n${statLines.join("\n")}\n\n`;

  // Add truncated diffs, limiting lines per file
  const maxLinesPerFile = Math.max(
    10,
    Math.floor((maxChars - result.length) / files.length / 6),
  );

  for (const file of files) {
    const header = `--- ${file.path} ---`;
    const lines = file.diffLines.slice(0, maxLinesPerFile);
    const truncated =
      file.diffLines.length > maxLinesPerFile
        ? `\n[... ${file.diffLines.length - maxLinesPerFile} more lines]`
        : "";
    const fileBlock = `${header}\n${lines.join("\n")}${truncated}\n`;

    if (result.length + fileBlock.length > maxChars) {
      result += "\n[diff truncated — remaining files omitted]";
      return fitToLimit(result, maxChars);
    }

    result += fileBlock;
  }

  return fitToLimit(result, maxChars);
}

interface ParsedFile {
  path: string;
  diffLines: string[];
  added: number;
  removed: number;
}

function parseDiffFiles(diff: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const lines = diff.split("\n");
  let current: ParsedFile | null = null;

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      if (current) files.push(current);
      const parts = line.split(" ");
      const path = parts[2]?.replace(/^a\//, "") ?? "unknown";
      current = { path, diffLines: [], added: 0, removed: 0 };
    } else if (current) {
      current.diffLines.push(line);
      if (line.startsWith("+")) current.added++;
      else if (line.startsWith("-")) current.removed++;
    }
  }

  if (current) files.push(current);
  return files;
}

export function extractFileNamesFromDiff(diff: string): string[] {
  const fileNames = new Set<string>();

  for (const line of diff.split("\n")) {
    if (!line.startsWith("diff --git ")) {
      continue;
    }

    const parts = line.split(" ");
    const filePath = parts[2]?.replace(/^a\//, "");

    if (filePath) {
      fileNames.add(filePath);
    }
  }

  return [...fileNames];
}

function fitToLimit(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }

  const suffix = "\n[diff truncated]";
  return `${value.slice(0, Math.max(0, maxChars - suffix.length))}${suffix}`;
}
