import { describe, expect, it } from "vitest";
import { blendPacketLoss, pickPreferredSpeed } from "./smoothing";

describe("pickPreferredSpeed", () => {
  it("returns EMA when method is EMA", () => {
    expect(pickPreferredSpeed("EMA", 100.456, 50)).toBe(100.46);
  });

  it("returns WMA when method is WMA", () => {
    expect(pickPreferredSpeed("WMA", 100, 50.129)).toBe(50.13);
  });

  it("returns the average for Hybrid", () => {
    expect(pickPreferredSpeed("Hybrid", 100, 50)).toBe(75);
  });
});

describe("blendPacketLoss", () => {
  it("averages previous and next", () => {
    expect(blendPacketLoss(2, 4)).toBe(3);
  });

  it("treats missing previous as 0", () => {
    expect(blendPacketLoss(undefined, 4)).toBe(2);
  });
});
