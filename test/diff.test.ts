import { describe, expect, it } from "vitest";

import { extractFileNamesFromDiff, truncateDiff } from "@/core/commit/diff";

describe("diff helpers", () => {
  describe("extractFileNamesFromDiff", () => {
    it("extracts file paths from diff", () => {
      const diff = `diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json`;

      expect(extractFileNamesFromDiff(diff)).toEqual([
        "src/index.ts",
        "package.json",
      ]);
    });

    it("returns empty array for no files", () => {
      expect(extractFileNamesFromDiff("")).toEqual([]);
    });

    it("handles single file", () => {
      const diff = `diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md`;

      expect(extractFileNamesFromDiff(diff)).toEqual(["README.md"]);
    });
  });

  describe("truncateDiff", () => {
    it("returns full diff when under limit", () => {
      const diff = "diff --git a/small.ts b/small.ts\n+hello";
      expect(truncateDiff(diff)).toBe(diff);
    });

    it("truncates large diffs", () => {
      const largeDiff = `diff --git a/big.ts b/big.ts
${"+".repeat(10_000)}`;

      const result = truncateDiff(largeDiff, 1_000);
      expect(result.length).toBeLessThan(1_200);
      expect(result).toContain("[diff truncated");
    });

    it("includes file stats when truncating", () => {
      const diff = `diff --git a/file1.ts b/file1.ts
+++ a/file1.ts
+line1
+line2
+line3
diff --git a/file2.ts b/file2.ts
+++ a/file2.ts
+other line`;

      const result = truncateDiff(diff, 100);
      expect(result).toContain("file1.ts");
      expect(result).toContain("file2.ts");
    });

    it("never returns a diff longer than the requested max chars", () => {
      const diff = Array.from({ length: 200 }, (_, index) => {
        return `diff --git a/file${index}.ts b/file${index}.ts
+++ a/file${index}.ts
+${"x".repeat(100)}`;
      }).join("\n");

      const result = truncateDiff(diff, 500);

      expect(result.length).toBeLessThanOrEqual(500);
      expect(result).toContain("[diff truncated");
    });
  });
});
