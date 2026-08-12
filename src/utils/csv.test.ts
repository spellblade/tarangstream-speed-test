import { describe, expect, it } from "vitest";
import {
  buildHistoryCsv,
  escapeCsvValue,
  HISTORY_CSV_HEADERS,
} from "./csv";
import type { HistoryEntry } from "../types";

describe("escapeCsvValue", () => {
  it("passes through plain values", () => {
    expect(escapeCsvValue("hello")).toBe("hello");
    expect(escapeCsvValue(42)).toBe("42");
    expect(escapeCsvValue(null)).toBe("");
    expect(escapeCsvValue(undefined)).toBe("");
  });

  it("quotes fields containing commas", () => {
    expect(escapeCsvValue("a,b")).toBe('"a,b"');
  });

  it("escapes embedded double quotes", () => {
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
  });

  it("quotes fields containing newlines", () => {
    expect(escapeCsvValue("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("buildHistoryCsv", () => {
  const sample: HistoryEntry = {
    id: "id-1",
    timestamp: "2026-01-15T12:00:00.000Z",
    download: 100.5,
    upload: 50.25,
    ping: 12,
    jitter: 2,
    isp: 'Fiber, "Metro"',
    server: "Optimal",
  };

  it("includes the header row", () => {
    const csv = buildHistoryCsv([], () => "local");
    expect(csv).toBe(HISTORY_CSV_HEADERS.join(","));
  });

  it("serializes a row with escaped ISP", () => {
    const csv = buildHistoryCsv([sample], () => "LOCAL");
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(HISTORY_CSV_HEADERS.join(","));
    expect(lines[1]).toContain("id-1");
    expect(lines[1]).toContain("2026-01-15T12:00:00.000Z");
    expect(lines[1]).toContain("LOCAL");
    expect(lines[1]).toContain('"Fiber, ""Metro"""');
    expect(lines[1]).toContain("100.5");
    expect(lines[1]).toContain("Optimal");
  });

  it("emits one data line per history entry", () => {
    const csv = buildHistoryCsv(
      [sample, { ...sample, id: "id-2" }],
      () => "L",
    );
    expect(csv.split("\n")).toHaveLength(3);
  });
});
