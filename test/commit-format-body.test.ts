import { describe, expect, it } from "vitest";

import { formatCommitMessageWithBody } from "@/core/commit/format";

describe("formatCommitMessageWithBody", () => {
  it("formats header without body", () => {
    expect(
      formatCommitMessageWithBody({
        type: "feat",
        scope: "auth",
        subject: "add login",
      }),
    ).toBe("feat(auth): add login");
  });

  it("formats header with body", () => {
    expect(
      formatCommitMessageWithBody({
        type: "chore",
        scope: "config",
        subject: "update gitignore",
        body: "- Add node_modules\n- Add dist",
      }),
    ).toBe("chore(config): update gitignore\n\n- Add node_modules\n- Add dist");
  });

  it("handles empty body", () => {
    expect(
      formatCommitMessageWithBody({
        type: "fix",
        subject: "patch bug",
        body: "",
      }),
    ).toBe("fix: patch bug");
  });
});
