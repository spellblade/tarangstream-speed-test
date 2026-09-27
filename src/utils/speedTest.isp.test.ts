import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchIspDetails, fetchWithTimeout } from "./speedTest";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 502,
    json: async () => body,
  } as Response;
}

/** A fetch that stays pending until the caller aborts it. */
function hangUntilAbort(_url: string, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    const signal = init?.signal;
    const abort = () => reject(new DOMException("Aborted", "AbortError"));
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchWithTimeout", () => {
  it("rejects when the request is still pending at the deadline", async () => {
    vi.stubGlobal("fetch", hangUntilAbort);
    await expect(fetchWithTimeout("https://ipapi.co/json/", 30)).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});

describe("fetchIspDetails", () => {
  it("abandons a hung provider and uses the next one", async () => {
    const calls: string[] = [];
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
      calls.push(url);
      if (url.includes("ipapi.co")) return hangUntilAbort(url, init);
      return Promise.resolve(
        jsonResponse({
          ip: "203.0.113.10",
          org: "Example ISP",
          city: "Pune",
          region: "Maharashtra",
          country: "IN",
          loc: "18.5204,73.8567",
        }),
      );
    });

    const info = await fetchIspDetails(30);

    expect(calls).toEqual([
      "https://ipapi.co/json/",
      "https://ipinfo.io/json",
    ]);
    expect(info).toMatchObject({
      ip: "203.0.113.10",
      isp: "Example ISP",
      city: "Pune",
      region: "Maharashtra",
      country: "IN",
      lat: 18.5204,
      lon: 73.8567,
      countryCode: "IN",
    });
    expect(info.isFallback).toBeUndefined();
  });

  it("returns the timezone guess when every provider fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));

    const info = await fetchIspDetails(30);

    expect(info.isFallback).toBe(true);
    expect(info.ip).toBe("192.168.1.185");
    expect(info.city.length).toBeGreaterThan(0);
  });
});
