import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApiApp } from "./apiApp";
import { createRateLimiter } from "../utils/rateLimit";

describe("createApiApp routes", () => {
  const apps: ReturnType<typeof createApiApp>[] = [];

  afterEach(() => {
    apps.length = 0;
  });

  function app(opts?: Parameters<typeof createApiApp>[0]) {
    const instance = createApiApp(opts);
    apps.push(instance);
    return instance;
  }

  it("GET /api/health returns ok and security headers", async () => {
    const res = await request(app()).get("/api/health").expect(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.time).toBe("string");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
  });

  it("POST /api/upload accepts octet-stream within size limit", async () => {
    const body = Buffer.alloc(64, 1);
    const res = await request(app())
      .post("/api/upload")
      .set("Content-Type", "application/octet-stream")
      .send(body)
      .expect(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.bytesReceived).toBe(64);
  });

  it("POST /api/upload rejects non-octet-stream content type", async () => {
    const res = await request(app())
      .post("/api/upload")
      .set("Content-Type", "application/json")
      .send("{}")
      .expect(400);
    expect(res.body.error).toMatch(/content type/i);
  });

  it("POST /api/upload rejects Content-Length over max", async () => {
    const res = await request(app())
      .post("/api/upload")
      .set("Content-Type", "application/octet-stream")
      .set("Content-Length", String(3 * 1024 * 1024))
      .send(Buffer.alloc(0))
      .expect(413);
    expect(res.body.error).toMatch(/too large/i);
  });

  it("GET /api/download streams binary data", async () => {
    const res = await request(app({ downloadStreamMaxMs: 50 }))
      .get("/api/download")
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.from(c)));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(res.headers["content-type"]).toMatch(/octet-stream/);
    expect(Buffer.isBuffer(res.body) || res.body instanceof Uint8Array).toBe(
      true,
    );
    const len = Buffer.isBuffer(res.body)
      ? res.body.length
      : (res.body as Uint8Array).length;
    expect(len).toBeGreaterThan(0);
  });

  it("returns 429 when rate limited on upload", async () => {
    // /api/health is not rate-limited; upload/download share the limiter
    const tight = createRateLimiter(1, 60_000);
    const limitedApp = app({ rateLimiter: tight });
    await request(limitedApp)
      .post("/api/upload")
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from([1, 2, 3]))
      .expect(200);
    const blocked = await request(limitedApp)
      .post("/api/upload")
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from([4]))
      .expect(429);
    expect(blocked.body.error).toMatch(/too many requests/i);
  });
});
