import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPublicDownloadTestUrl,
  isLocalEnvironment,
} from "./speedTest.local";
import type { ServerOption } from "../types";

describe("isLocalEnvironment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when window is undefined (Node)", () => {
    expect(isLocalEnvironment()).toBe(false);
  });

  it.each(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"])(
    "returns true for hostname %s",
    (hostname) => {
      vi.stubGlobal("window", {
        location: { hostname },
      });
      expect(isLocalEnvironment()).toBe(true);
    },
  );

  it("returns false for a public hostname", () => {
    vi.stubGlobal("window", {
      location: { hostname: "speed.tarangstream.example" },
    });
    expect(isLocalEnvironment()).toBe(false);
  });
});

describe("getPublicDownloadTestUrl", () => {
  const hetznerEu = "https://fsn1-speed.hetzner.com/1GB.bin";
  const hetznerUs = "https://ash-speed.hetzner.com/1GB.bin";

  it("returns the default EU mirror when no server is given", () => {
    expect(getPublicDownloadTestUrl()).toBe(hetznerEu);
  });

  it("returns the default mirror for the optimal server id", () => {
    const server: ServerOption = {
      id: "optimal",
      name: "Auto",
      location: "Auto",
    };
    expect(getPublicDownloadTestUrl(server)).toBe(hetznerEu);
  });

  it("selects a US mirror for virginia / west-style ids", () => {
    const server: ServerOption = {
      id: "virginia-1",
      name: "Virginia",
      location: "Ashburn, VA",
    };
    expect(getPublicDownloadTestUrl(server)).toBe(hetznerUs);
  });

  it("selects an EU mirror for frankfurt-style ids", () => {
    const server: ServerOption = {
      id: "frankfurt-edge",
      name: "Frankfurt",
      location: "Frankfurt, DE",
    };
    expect(getPublicDownloadTestUrl(server)).toBe(hetznerEu);
  });
});
