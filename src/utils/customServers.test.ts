import { describe, expect, it } from "vitest";
import { sanitizeCustomServers, sanitizeServerForUse } from "./customServers";

describe("sanitizeCustomServers", () => {
  it("returns empty for non-arrays", () => {
    expect(sanitizeCustomServers(null)).toEqual([]);
    expect(sanitizeCustomServers({})).toEqual([]);
  });

  it("keeps valid custom servers and forces isCustom", () => {
    const out = sanitizeCustomServers([
      {
        id: "c1",
        name: "Edge",
        location: "Mumbai",
        lat: 19.07,
        lon: 72.87,
        url: "https://example.com/probe",
        isCustom: false,
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: "c1",
      name: "Edge",
      location: "Mumbai",
      lat: 19.07,
      lon: 72.87,
      isCustom: true,
    });
    expect(out[0].url).toMatch(/^https:\/\/example\.com\/probe\/?$/);
  });

  it("drops entries missing name or location", () => {
    expect(
      sanitizeCustomServers([
        { id: "x", name: "", location: "City" },
        { id: "y", name: "Name", location: "  " },
        { id: "z", name: "Ok", location: "City" },
      ]),
    ).toHaveLength(1);
  });

  it("strips blocked / private probe URLs but keeps the server", () => {
    const out = sanitizeCustomServers([
      {
        id: "local",
        name: "Home",
        location: "Lab",
        url: "http://127.0.0.1:3000",
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].url).toBeUndefined();
  });

  it("rejects out-of-range coordinates", () => {
    const out = sanitizeCustomServers([
      {
        id: "bad-lat",
        name: "X",
        location: "Y",
        lat: 200,
        lon: 0,
      },
    ]);
    expect(out[0].lat).toBeUndefined();
    expect(out[0].lon).toBe(0);
  });

  it("deduplicates ids", () => {
    const out = sanitizeCustomServers([
      { id: "dup", name: "A", location: "L1" },
      { id: "dup", name: "B", location: "L2" },
    ]);
    expect(out).toHaveLength(2);
    expect(new Set(out.map((s) => s.id)).size).toBe(2);
  });

  it("caps list length", () => {
    const raw = Array.from({ length: 60 }, (_, i) => ({
      id: `s-${i}`,
      name: `N${i}`,
      location: `L${i}`,
    }));
    expect(sanitizeCustomServers(raw)).toHaveLength(50);
  });

  it("ignores non-object elements", () => {
    expect(
      sanitizeCustomServers([null, "x", { name: "A", location: "B" }]),
    ).toHaveLength(1);
  });
});

describe("sanitizeServerForUse", () => {
  it("leaves a server without a URL unchanged", () => {
    const srv = { id: "oregon", name: "Oregon", location: "US" };
    expect(sanitizeServerForUse(srv)).toBe(srv);
  });

  it("keeps and normalizes a valid public URL", () => {
    const out = sanitizeServerForUse({
      id: "c",
      name: "C",
      location: "L",
      url: "example.com/probe",
    });
    expect(out.url).toMatch(/^https:\/\/example\.com\/probe\/?$/);
  });

  it("strips a blocked or private probe URL", () => {
    const out = sanitizeServerForUse({
      id: "c",
      name: "C",
      location: "L",
      url: "http://127.0.0.1:3000",
    });
    expect(out.url).toBeUndefined();
    expect(out.id).toBe("c");
  });
});
