import { render } from "@inquirer/testing";
import { afterEach, describe, expect, it } from "vitest";

import { confirmAction, instantConfirm } from "@/core/ui/confirm";

const originalIsTTY = process.stdout.isTTY;

afterEach(() => {
  Object.defineProperty(process.stdout, "isTTY", {
    value: originalIsTTY,
    configurable: true,
  });
});

describe("instantConfirm", () => {
  it("resolves true on a single 'y' keypress, no Enter needed", async () => {
    const { answer, events } = await render(instantConfirm, {
      message: "Proceed?",
      default: true,
    });

    events.keypress("y");

    await expect(answer).resolves.toBe(true);
  });

  it("resolves false on a single 'n' keypress", async () => {
    const { answer, events } = await render(instantConfirm, {
      message: "Proceed?",
      default: true,
    });

    events.keypress("n");

    await expect(answer).resolves.toBe(false);
  });

  it("accepts the default on Enter alone", async () => {
    const { answer, events } = await render(instantConfirm, {
      message: "Proceed?",
      default: false,
    });

    events.keypress("enter");

    await expect(answer).resolves.toBe(false);
  });

  it("ignores unrelated keys until a decision is made", async () => {
    const { answer, events, getScreen } = await render(instantConfirm, {
      message: "Proceed?",
      default: true,
    });

    events.keypress("x");
    events.keypress("space");
    expect(getScreen()).toContain("Proceed?");

    events.keypress("y");

    await expect(answer).resolves.toBe(true);
  });

  it("shows the y/N hint when the default is false", async () => {
    const { getScreen, events } = await render(instantConfirm, {
      message: "Delete it?",
      default: false,
    });

    expect(getScreen()).toContain("y/N");

    events.keypress("n");
  });
});

describe("confirmAction", () => {
  it("returns the default without prompting when stdout is not a TTY", async () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      configurable: true,
    });

    await expect(confirmAction("Proceed?", true)).resolves.toBe(true);
    await expect(confirmAction("Proceed?", false)).resolves.toBe(false);
  });
});
