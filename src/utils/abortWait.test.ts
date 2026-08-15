import { describe, expect, it } from "vitest";
import { waitForTimeout } from "./abortWait";

describe("waitForTimeout", () => {
  it("resolves after the delay", async () => {
    const start = Date.now();
    await waitForTimeout(20);
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });

  it("rejects immediately if the signal is already aborted", async () => {
    const c = new AbortController();
    c.abort();
    await expect(waitForTimeout(1000, c.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("rejects if aborted while waiting", async () => {
    const c = new AbortController();
    const pending = waitForTimeout(5_000, c.signal);
    c.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("does not reject later abort after the timer has resolved", async () => {
    const c = new AbortController();
    await waitForTimeout(15, c.signal);
    c.abort();
    await expect(waitForTimeout(15)).resolves.toBeUndefined();
  });
});
