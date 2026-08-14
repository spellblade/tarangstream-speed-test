import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRateLimiter,
  getClientIp,
  isTrustProxyEnabled,
} from "./rateLimit";

describe("getClientIp", () => {
  const reqWithXff = {
    headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    socket: { remoteAddress: "127.0.0.1" },
  };

  it("ignores X-Forwarded-For unless trustProxy is enabled", () => {
    expect(getClientIp(reqWithXff, { trustProxy: false })).toBe("127.0.0.1");
  });

  it("uses the first X-Forwarded-For hop when trustProxy is true", () => {
    expect(getClientIp(reqWithXff, { trustProxy: true })).toBe("203.0.113.10");
  });

  it("trims whitespace around the first hop when trustProxy is true", () => {
    expect(
      getClientIp(
        {
          headers: { "x-forwarded-for": "  198.51.100.7  " },
          socket: { remoteAddress: "127.0.0.1" },
        },
        { trustProxy: true },
      ),
    ).toBe("198.51.100.7");
  });

  it("handles X-Forwarded-For as a string array when trustProxy is true", () => {
    expect(
      getClientIp(
        {
          headers: { "x-forwarded-for": ["203.0.113.5, 10.1.1.1"] },
          socket: { remoteAddress: "127.0.0.1" },
        },
        { trustProxy: true },
      ),
    ).toBe("203.0.113.5");
  });

  it("falls back to socket.remoteAddress when XFF is missing even with trustProxy", () => {
    expect(
      getClientIp(
        {
          headers: {},
          socket: { remoteAddress: "::ffff:192.0.2.1" },
        },
        { trustProxy: true },
      ),
    ).toBe("::ffff:192.0.2.1");
  });

  it("returns unknown when no address is available", () => {
    expect(
      getClientIp(
        {
          headers: {},
          socket: {},
        },
        { trustProxy: false },
      ),
    ).toBe("unknown");
  });
});

describe("isTrustProxyEnabled", () => {
  it("is false when unset or invalid", () => {
    expect(isTrustProxyEnabled({})).toBe(false);
    expect(isTrustProxyEnabled({ TRUST_PROXY: "maybe" })).toBe(false);
  });

  it("is true for 1 / true / yes", () => {
    expect(isTrustProxyEnabled({ TRUST_PROXY: "1" })).toBe(true);
    expect(isTrustProxyEnabled({ TRUST_PROXY: "TRUE" })).toBe(true);
    expect(isTrustProxyEnabled({ TRUST_PROXY: "yes" })).toBe(true);
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
