import { describe, expect, it } from "vitest";
import { resolveListenPort } from "./listenPort";

describe("resolveListenPort", () => {
  it("defaults to 3000 when unset or empty", () => {
    expect(resolveListenPort(undefined)).toBe(3000);
    expect(resolveListenPort("")).toBe(3000);
    expect(resolveListenPort("   ")).toBe(3000);
  });

  it("parses a valid port string", () => {
    expect(resolveListenPort("4000")).toBe(4000);
    expect(resolveListenPort(" 8080 ")).toBe(8080);
  });

  it("rejects non-digits and out-of-range values", () => {
    expect(resolveListenPort("nope")).toBe(3000);
    expect(resolveListenPort("3000abc")).toBe(3000);
    expect(resolveListenPort("0")).toBe(3000);
    expect(resolveListenPort("65536")).toBe(3000);
  });
});
