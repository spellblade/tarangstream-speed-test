import { describe, expect, it } from "vitest";
import { getSpeedPercent } from "./Gauge";

describe("getSpeedPercent", () => {
  it("maps non-positive speeds to 0", () => {
    expect(getSpeedPercent(0)).toBe(0);
    expect(getSpeedPercent(-5)).toBe(0);
  });

  it("maps band edges used by the dial (Ookla-style segments)", () => {
    expect(getSpeedPercent(10)).toBeCloseTo(0.2, 5);
    expect(getSpeedPercent(100)).toBeCloseTo(0.45, 5);
    expect(getSpeedPercent(500)).toBeCloseTo(0.75, 5);
    expect(getSpeedPercent(1000)).toBeCloseTo(1.0, 5);
  });

  it("interpolates within the 0–10 Mbps band", () => {
    expect(getSpeedPercent(5)).toBeCloseTo(0.1, 5);
  });

  it("clamps above 1000 Mbps to 1.0", () => {
    expect(getSpeedPercent(5000)).toBe(1);
  });
});
