import { describe, expect, it } from "vitest";

import {
  applyScopeOverride,
  formatCommitMessage,
  truncateSubject,
} from "@/core/commit/format";

describe("commit format helpers", () => {
  it("formats a conventional commit message", () => {
    expect(
      formatCommitMessage({
        type: "feat",
        scope: "auth",
        subject: "add login flow",
      }),
    ).toBe("feat(auth): add login flow");
  });

  it("removes scope when disabled", () => {
    expect(
      applyScopeOverride(
        {
          type: "fix",
          scope: "api",
          subject: "handle timeout",
        },
        undefined,
        true,
      ),
    ).toEqual({
      type: "fix",
      scope: undefined,
      subject: "handle timeout",
    });
  });

  it("truncates long subjects", () => {
    expect(truncateSubject("a very long commit subject", 10)).toBe("a very lo");
  });
});
