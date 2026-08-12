import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRateLimiter,
  getClientIp,
} from "./rateLimit";

describe("getClientIp", () => {
  it("uses the first X-Forwarded-For hop when present as a string", () => {
    expect(
      getClientIp({
        headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
        socket: { remoteAddress: "127.0.0.1" },
      }),
    ).toBe("203.0.113.10");
  });

  it("trims whitespace around the first hop", () => {
    expect(
      getClientIp({
        headers: { "x-forwarded-for": "  198.51.100.7  " },
        socket: { remoteAddress: "127.0.0.1" },
      }),
    ).toBe("198.51.100.7");
  });

  it("handles X-Forwarded-For as a string array", () => {
    expect(
      getClientIp({
        headers: { "x-forwarded-for": ["203.0.113.5, 10.1.1.1"] },
        socket: { remoteAddress: "127.0.0.1" },
      }),
    ).toBe("203.0.113.5");
  });

  it("falls back to socket.remoteAddress when XFF is missing", () => {
    expect(
      getClientIp({
        headers: {},
        socket: { remoteAddress: "::ffff:192.0.2.1" },
      }),
    ).toBe("::ffff:192.0.2.1");
  });

  it("returns unknown when no address is available", () => {
    expect(
      getClientIp({
        headers: {},
        socket: {},
      }),
    ).toBe("unknown");
  });
});

describe("createRateLimiter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to maxRequests then blocks", () => {
    const limiter = createRateLimiter(3, 60_000);
    const ip = "203.0.113.1";
    expect(limiter.isLimited(ip, 1_000)).toBe(false);
    expect(limiter.isLimited(ip, 1_001)).toBe(false);
    expect(limiter.isLimited(ip, 1_002)).toBe(false);
    expect(limiter.isLimited(ip, 1_003)).toBe(true);
    expect(limiter.getRequestCount(ip, 1_003)).toBe(3);
  });

  it("tracks IPs independently", () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.isLimited("a", 0)).toBe(false);
    expect(limiter.isLimited("a", 1)).toBe(true);
    expect(limiter.isLimited("b", 1)).toBe(false);
  });

  it("expires entries outside the sliding window", () => {
    const limiter = createRateLimiter(2, 1_000);
    expect(limiter.isLimited("ip", 0)).toBe(false);
    expect(limiter.isLimited("ip", 100)).toBe(false);
    expect(limiter.isLimited("ip", 200)).toBe(true);
    // after window, oldest should drop
    expect(limiter.isLimited("ip", 1_100)).toBe(false);
  });

  it("reset clears all recorded traffic", () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.isLimited("ip", 0)).toBe(false);
    expect(limiter.isLimited("ip", 1)).toBe(true);
    limiter.reset();
    expect(limiter.isLimited("ip", 2)).toBe(false);
  });
});
