export function truncateDiff(diff: string, maxChars = 12_000): string {
  if (diff.length <= maxChars) {
    return diff;
  }

  return `${diff.slice(0, maxChars)}\n\n[diff truncated]`;
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
