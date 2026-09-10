import { afterEach, describe, expect, it, vi } from "vitest";

import { withSpinner } from "@/core/ui/spinner";

const originalIsTTY = process.stderr.isTTY;

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  Object.defineProperty(process.stderr, "isTTY", {
    value: originalIsTTY,
    configurable: true,
  });
});

function setTTY(value: boolean): void {
  Object.defineProperty(process.stderr, "isTTY", {
    value,
    configurable: true,
  });
}

describe("withSpinner", () => {
  it("returns the task result without writing anything on a non-TTY stream", async () => {
    setTTY(false);
    const write = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    const result = await withSpinner("working", async (spinner) => {
      spinner.update("still working");
      return 42;
    });

    expect(result).toBe(42);
    expect(write).not.toHaveBeenCalled();
  });

  it("propagates task rejection on a non-TTY stream", async () => {
    setTTY(false);

    await expect(
      withSpinner("working", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });

  it("animates, rotates the message, and clears the line on a TTY stream", async () => {
    setTTY(true);
    vi.useFakeTimers();
    const write = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const promise = withSpinner(
      ["first message", "second message"],
      () => gate.then(() => "done"),
    );

    // Initial frame rendered synchronously with the first message.
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][0]).toContain("first message");

    // After the message interval the label advances to the next entry.
    await vi.advanceTimersByTimeAsync(2000);
    expect(write.mock.calls.at(-1)?.[0]).toContain("second message");
    expect(write.mock.calls.length).toBeGreaterThan(1);

    release();
    const result = await promise;

    expect(result).toBe("done");
    expect(write.mock.calls.at(-1)?.[0]).toBe("\r\x1b[2K");
  });

  it("resets to the first message when update() is called", async () => {
    setTTY(true);
    vi.useFakeTimers();
    const write = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const promise = withSpinner(["a", "b"], (spinner) => {
      spinner.update(["switched", "later"]);
      return gate.then(() => "ok");
    });

    // Next frame after update() shows the new first message.
    await vi.advanceTimersByTimeAsync(80);
    expect(write.mock.calls.at(-1)?.[0]).toContain("switched");

    release();
    await promise;
  });
});
