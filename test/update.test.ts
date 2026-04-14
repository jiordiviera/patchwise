import { describe, expect, it } from "vitest";

import { getUpdateCommand, isNewer as checkIsNewer } from "@/core/cli/update";

describe("update helpers", () => {
  describe("getUpdateCommand", () => {
    it("returns pnpm command", () => {
      expect(getUpdateCommand("pnpm")).toBe("pnpm add -g patchwise");
    });

    it("returns yarn command", () => {
      expect(getUpdateCommand("yarn")).toBe("yarn global add patchwise");
    });

    it("returns bun command", () => {
      expect(getUpdateCommand("bun")).toBe("bun add -g patchwise");
    });

    it("returns npm command as default", () => {
      expect(getUpdateCommand("npm")).toBe("npm install -g patchwise");
      expect(getUpdateCommand("unknown")).toBe("npm install -g patchwise");
    });
  });

  describe("isNewer", () => {
    const isNewer = checkIsNewer;

    it("detects major version bump", () => {
      expect(isNewer("2.0.0", "1.0.0")).toBe(true);
    });

    it("detects minor version bump", () => {
      expect(isNewer("1.1.0", "1.0.0")).toBe(true);
    });

    it("detects patch version bump", () => {
      expect(isNewer("1.0.1", "1.0.0")).toBe(true);
    });

    it("returns false for same version", () => {
      expect(isNewer("1.0.0", "1.0.0")).toBe(false);
    });

    it("returns false for older version", () => {
      expect(isNewer("0.9.0", "1.0.0")).toBe(false);
    });

    it("handles partial versions", () => {
      expect(isNewer("1.1", "1.0.0")).toBe(true);
      expect(isNewer("1", "1.0.0")).toBe(false);
    });
  });
});
