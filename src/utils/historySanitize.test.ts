import { describe, expect, it } from "vitest";
import { sanitizeHistoryEntries } from "./historySanitize";

describe("sanitizeHistoryEntries", () => {
  it("returns empty array for non-arrays", () => {
    expect(sanitizeHistoryEntries(null)).toEqual([]);
    expect(sanitizeHistoryEntries({})).toEqual([]);
    expect(sanitizeHistoryEntries("nope")).toEqual([]);
  });

  it("keeps well-formed entries", () => {
    const out = sanitizeHistoryEntries([
      {
        id: "a1",
        timestamp: "2026-01-01T00:00:00.000Z",
        download: 100,
        upload: 50,
        ping: 12,
        jitter: 2,
        isp: "Test ISP",
        server: "Optimal",
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: "a1",
      download: 100,
      upload: 50,
      ping: 12,
      jitter: 2,
      isp: "Test ISP",
      server: "Optimal",
    });
  });

  it("drops entries missing numeric metrics", () => {
    const out = sanitizeHistoryEntries([
      { id: "x", download: "fast", upload: 1, ping: 1, jitter: 1 },
      { id: "y", download: 1, upload: 1, ping: 1, jitter: 1, isp: "ok", server: "s" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("y");
  });

  it("drops negative metrics", () => {
    expect(
      sanitizeHistoryEntries([
        {
          id: "n",
          download: -1,
          upload: 1,
          ping: 1,
          jitter: 1,
          isp: "i",
          server: "s",
        },
      ]),
    ).toHaveLength(0);
  });

  it("coerces numeric strings", () => {
    const out = sanitizeHistoryEntries([
      {
        id: "c",
        download: "10.5",
        upload: "3",
        ping: "8",
        jitter: "1",
        isp: "i",
        server: "s",
        timestamp: "2026-02-01T00:00:00.000Z",
      },
    ]);
    expect(out[0].download).toBe(10.5);
    expect(out[0].upload).toBe(3);
  });

  it("deduplicates ids", () => {
    const out = sanitizeHistoryEntries([
      {
        id: "dup",
        download: 1,
        upload: 1,
        ping: 1,
        jitter: 1,
        isp: "i",
        server: "s",
        timestamp: "t1",
      },
      {
        id: "dup",
        download: 2,
        upload: 2,
        ping: 2,
        jitter: 2,
        isp: "i",
        server: "s",
        timestamp: "t2",
      },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe("dup");
    expect(out[1].id).not.toBe("dup");
    expect(new Set(out.map((e) => e.id)).size).toBe(2);
  });

  it("truncates long isp/server strings", () => {
    const long = "x".repeat(500);
    const out = sanitizeHistoryEntries([
      {
        id: "t",
        download: 1,
        upload: 1,
        ping: 1,
        jitter: 1,
        isp: long,
        server: long,
        timestamp: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(out[0].isp.length).toBe(256);
    expect(out[0].server.length).toBe(256);
  });

  it("respects maxEntries", () => {
    const raw = Array.from({ length: 10 }, (_, i) => ({
      id: `id-${i}`,
      download: i,
      upload: i,
      ping: i,
      jitter: i,
      isp: "i",
      server: "s",
      timestamp: `2026-01-0${i}T00:00:00.000Z`,
    }));
    expect(sanitizeHistoryEntries(raw, 3)).toHaveLength(3);
  });

  it("ignores non-object array elements", () => {
    const out = sanitizeHistoryEntries([
      null,
      "x",
      1,
      {
        id: "ok",
        download: 1,
        upload: 1,
        ping: 1,
        jitter: 1,
        isp: "i",
        server: "s",
      },
    ]);
    expect(out).toHaveLength(1);
  });
});
