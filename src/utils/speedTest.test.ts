import { describe, expect, it } from "vitest";
import {
  calculateDistance,
  calculateWMA,
  getSpeedCurveValue,
} from "./speedTest";

describe("calculateDistance", () => {
  it("returns 0 for the same coordinates", () => {
    expect(calculateDistance(47.6062, -122.3321, 47.6062, -122.3321)).toBe(0);
  });

  it("computes a plausible London–Paris distance (km)", () => {
    // London ≈ 51.5074°N, 0.1278°W; Paris ≈ 48.8566°N, 2.3522°E
    const km = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(km).toBeGreaterThan(300);
    expect(km).toBeLessThan(400);
  });

  it("is symmetric for a given pair of points", () => {
    const a = calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
    const b = calculateDistance(34.0522, -118.2437, 40.7128, -74.006);
    expect(a).toBe(b);
  });
});

describe("calculateWMA", () => {
  it("returns 0 for an empty series", () => {
    expect(calculateWMA([])).toBe(0);
  });

  it("returns the sole sample when only one is present", () => {
    expect(calculateWMA([42])).toBe(42);
  });

  it("weights recent samples more heavily", () => {
    // samples [10, 20, 30], window 3 → weights 1,2,3 → (10+40+90)/6
    expect(calculateWMA([10, 20, 30], 3)).toBeCloseTo(140 / 6, 5);
  });

  it("uses only the last windowSize samples", () => {
    // last 2: [20, 30] → weights 1,2 → (20+60)/3 = 26.666…
    expect(calculateWMA([10, 20, 30], 2)).toBeCloseTo(80 / 3, 5);
  });
});

describe("getSpeedCurveValue", () => {
  it("never returns below the floor of 0.1", () => {
    const v = getSpeedCurveValue(0, 0, 0, false);
    expect(v).toBeGreaterThanOrEqual(0.1);
  });

  it("scales roughly with the target during the mid ramp", () => {
    const low = getSpeedCurveValue(0.5, 50, 0, false);
    const high = getSpeedCurveValue(0.5, 200, 0, false);
    expect(high).toBeGreaterThan(low);
  });

  it("applies a lower factor for upload vs download at the same point", () => {
    const dl = getSpeedCurveValue(0.5, 100, 5, false);
    const ul = getSpeedCurveValue(0.5, 100, 5, true);
    expect(ul).toBeLessThan(dl);
  });

  it("is deterministic for identical inputs", () => {
    const a = getSpeedCurveValue(0.33, 120, 8, false);
    const b = getSpeedCurveValue(0.33, 120, 8, false);
    expect(a).toBe(b);
  });
});
