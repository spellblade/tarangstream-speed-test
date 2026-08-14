import { describe, expect, it } from "vitest";
import {
  PROGRESS_COMPLETE,
  PROGRESS_DOWNLOAD_END,
  PROGRESS_LATENCY_END,
  PROGRESS_UPLOAD_END,
  applyDialColdStart,
  clamp01,
  mapPhaseProgress,
} from "./progressMap";

describe("clamp01", () => {
  it("clamps out-of-range values", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(2)).toBe(1);
  });
});

describe("mapPhaseProgress", () => {
  it("maps latency to 0–33", () => {
    expect(mapPhaseProgress("latency", 0)).toBe(0);
    expect(mapPhaseProgress("latency", 0.5)).toBe(
      Math.round(0.5 * PROGRESS_LATENCY_END),
    );
    expect(mapPhaseProgress("latency", 1)).toBe(PROGRESS_LATENCY_END);
  });

  it("maps download to 33–66", () => {
    expect(mapPhaseProgress("download", 0)).toBe(PROGRESS_LATENCY_END);
    expect(mapPhaseProgress("download", 1)).toBe(PROGRESS_DOWNLOAD_END);
    expect(mapPhaseProgress("download", 0.5)).toBe(
      Math.round(
        PROGRESS_LATENCY_END +
          0.5 * (PROGRESS_DOWNLOAD_END - PROGRESS_LATENCY_END),
      ),
    );
  });

  it("maps upload to 66–99", () => {
    expect(mapPhaseProgress("upload", 0)).toBe(PROGRESS_DOWNLOAD_END);
    expect(mapPhaseProgress("upload", 1)).toBe(PROGRESS_UPLOAD_END);
  });

  it("segments are equal thirds before complete", () => {
    expect(PROGRESS_LATENCY_END).toBe(33);
    expect(PROGRESS_DOWNLOAD_END - PROGRESS_LATENCY_END).toBe(33);
    expect(PROGRESS_UPLOAD_END - PROGRESS_DOWNLOAD_END).toBe(33);
    expect(PROGRESS_COMPLETE).toBe(100);
  });
});

describe("applyDialColdStart", () => {
  it("returns 0 before the cold window ends", () => {
    expect(applyDialColdStart(1000, 250, 1500, 1000)).toBe(0);
  });

  it("returns the speed after the cold window", () => {
    expect(applyDialColdStart(1000, 250, 2000, 1000)).toBe(250);
  });

  it("returns 0 when phase start is unknown", () => {
    expect(applyDialColdStart(null, 100, 5000)).toBe(0);
  });
});
