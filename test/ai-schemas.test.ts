import { describe, expect, it } from "vitest";

import { providerResponseSchema, suggestionSchema } from "@/core/ai/schemas";

describe("ai schemas", () => {
  describe("suggestionSchema", () => {
    it("validates a valid suggestion", () => {
      const result = suggestionSchema.safeParse({
        type: "feat",
        scope: "auth",
        subject: "add login",
      });

      expect(result.success).toBe(true);
    });

    it("coerces invalid commit types", () => {
      const result = suggestionSchema.safeParse({
        type: "bugfix",
        subject: "fix crash",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("fix");
      }
    });

    it("coerces feature to feat", () => {
      const result = suggestionSchema.safeParse({
        type: "feature",
        subject: "add thing",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("feat");
      }
    });

    it("handles body as string", () => {
      const result = suggestionSchema.safeParse({
        type: "chore",
        subject: "update deps",
        body: "- bump lodash\n- bump express",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body).toBe("- bump lodash\n- bump express");
      }
    });

    it("handles body as array", () => {
      const result = suggestionSchema.safeParse({
        type: "chore",
        subject: "update deps",
        body: ["- bump lodash", "- bump express"],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body).toBe("- bump lodash\n- bump express");
      }
    });

    it("handles missing body", () => {
      const result = suggestionSchema.safeParse({
        type: "fix",
        subject: "patch bug",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body).toBeUndefined();
      }
    });

    it("normalizes emoji when provided", () => {
      const result = suggestionSchema.safeParse({
        emoji: " ✨ ",
        type: "feat",
        subject: "add config",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emoji).toBe("✨");
      }
    });

    it("handles empty string body", () => {
      const result = suggestionSchema.safeParse({
        type: "fix",
        subject: "patch bug",
        body: "",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body).toBeUndefined();
      }
    });
  });

  describe("providerResponseSchema", () => {
    it("validates a full response", () => {
      const result = providerResponseSchema.safeParse({
        summary: "Update configuration and docs",
        suggestions: [
          { type: "chore", scope: "config", subject: "update settings" },
          { type: "docs", subject: "add setup guide" },
        ],
      });

      expect(result.success).toBe(true);
    });

    it("rejects empty suggestions", () => {
      const result = providerResponseSchema.safeParse({
        summary: "Changes",
        suggestions: [],
      });

      expect(result.success).toBe(false);
    });

    it("coerces all suggestion types", () => {
      const result = providerResponseSchema.safeParse({
        summary: "Various changes",
        suggestions: [
          { type: "bugfix", subject: "fix one" },
          { type: "improvement", subject: "improve two" },
          { type: "docs", subject: "document three" },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.suggestions[0].type).toBe("fix");
        expect(result.data.suggestions[1].type).toBe("refactor");
        expect(result.data.suggestions[2].type).toBe("docs");
      }
    });
  });
});
