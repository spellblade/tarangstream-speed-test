import { describe, expect, it } from "vitest";
import {
  isBlockedHostname,
  validatePingHostUrl,
} from "./urlValidation";

describe("isBlockedHostname", () => {
  it.each([
    "localhost",
    "LOCALHOST",
    "127.0.0.1",
    "10.0.0.5",
    "192.168.1.1",
    "172.16.0.1",
    "169.254.169.254",
    "0.0.0.0",
    "foo.localhost",
    "printer.local",
  ])("blocks %s", (host) => {
    expect(isBlockedHostname(host)).toBe(true);
  });

  it("blocks decimal loopback (2130706433 → 127.0.0.1)", () => {
    expect(isBlockedHostname("2130706433")).toBe(true);
  });

  it("allows public hostnames", () => {
    expect(isBlockedHostname("example.com")).toBe(false);
    expect(isBlockedHostname("fsn1-speed.hetzner.com")).toBe(false);
  });
});

describe("validatePingHostUrl", () => {
  it("rejects empty input", () => {
    expect(validatePingHostUrl("")).toEqual({ ok: false, reason: "empty" });
    expect(validatePingHostUrl("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("accepts bare hostnames by defaulting to https", () => {
    const r = validatePingHostUrl("example.com");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.url).toMatch(/^https:\/\/example\.com\/?$/);
    }
  });

  it("accepts explicit https URLs", () => {
    const r = validatePingHostUrl("https://cdn.example.org/path");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.url).toContain("https://cdn.example.org/path");
    }
  });

  it("rejects non-http schemes", () => {
    expect(validatePingHostUrl("javascript:alert(1)").ok).toBe(false);
    expect(validatePingHostUrl("file:///etc/passwd").ok).toBe(false);
    expect(validatePingHostUrl("ftp://example.com").ok).toBe(false);
  });

  it("rejects URLs with embedded credentials", () => {
    const r = validatePingHostUrl("https://user:pass@example.com/");
    expect(r).toEqual({ ok: false, reason: "credentials" });
  });

  it("rejects loopback and private hosts", () => {
    expect(validatePingHostUrl("http://127.0.0.1/").ok).toBe(false);
    expect(validatePingHostUrl("https://192.168.0.10").ok).toBe(false);
    expect(validatePingHostUrl("localhost:3000").ok).toBe(false);
  });

  it("rejects garbage that is not a URL", () => {
    expect(validatePingHostUrl("http://").ok).toBe(false);
  });
});
