import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import {
  createApiApp,
  GENERIC_UPLOAD_ERROR,
  sendGenericUploadError,
} from "./apiApp";
import { createRateLimiter } from "../utils/rateLimit";

describe("createApiApp routes", () => {
  const apps: ReturnType<typeof createApiApp>[] = [];
  const servers: http.Server[] = [];

  afterEach(async () => {
    apps.length = 0;
    await Promise.all(
      servers.splice(0).map(
        (s) =>
          new Promise<void>((resolve, reject) => {
            s.close((err) => (err ? reject(err) : resolve()));
          }),
      ),
    );
  });

  function app(opts?: Parameters<typeof createApiApp>[0]) {
    const instance = createApiApp(opts);
    apps.push(instance);
    return instance;
  }

  function listen(instance: ReturnType<typeof createApiApp>): Promise<{
    port: number;
    server: http.Server;
  }> {
    return new Promise((resolve, reject) => {
      const server = http.createServer(instance);
      servers.push(server);
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address() as AddressInfo;
        resolve({ port: addr.port, server });
      });
      server.on("error", reject);
    });
  }

  /** Open a download stream and pause it so the connection stays counted. */
  function holdDownload(
    port: number,
  ): Promise<{ req: http.ClientRequest; res: http.IncomingMessage }> {
    return new Promise((resolve, reject) => {
      const req = http.get(
        `http://127.0.0.1:${port}/api/download`,
        (res) => {
          if (res.statusCode !== 200) {
            res.resume();
            reject(new Error(`expected 200, got ${res.statusCode}`));
            return;
          }
          res.pause();
          resolve({ req, res });
        },
      );
      req.on("error", reject);
    });
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

  it("returns 429 when concurrent download streams exceed the per-IP cap", async () => {
    const instance = app({
      maxDownloadConnections: 2,
      downloadStreamMaxMs: 10_000,
      // Room for concurrent opens without hitting request-rate limits
      rateLimiter: createRateLimiter(50, 60_000),
    });
    const { port } = await listen(instance);

    const held1 = await holdDownload(port);
    const held2 = await holdDownload(port);

    const third = await new Promise<{
      status: number;
      body: string;
    }>((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${port}/api/download`, (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(Buffer.from(c)));
          res.on("end", () =>
            resolve({
              status: res.statusCode ?? 0,
              body: Buffer.concat(chunks).toString("utf8"),
            }),
          );
        })
        .on("error", reject);
    });

    expect(third.status).toBe(429);
    expect(third.body).toMatch(/concurrent download streams/i);

    held1.req.destroy();
    held2.req.destroy();
    held1.res.destroy();
    held2.res.destroy();
  });

  it("returns 429 when concurrent upload streams exceed the per-IP cap", async () => {
    const instance = app({
      maxUploadConnections: 2,
      rateLimiter: createRateLimiter(50, 60_000),
    });
    const { port } = await listen(instance);

    const holdUpload = () =>
      new Promise<http.ClientRequest>((resolve, reject) => {
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port,
            path: "/api/upload",
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Transfer-Encoding": "chunked",
            },
          },
          () => {
            /* keep open until we destroy */
          },
        );
        req.on("error", reject);
        req.write("x");
        req.on("socket", () => {
          // Give the server a tick to increment the connection map
          setImmediate(() => resolve(req));
        });
      });

    const held1 = await holdUpload();
    const held2 = await holdUpload();

    const third = await new Promise<{ status: number; body: string }>(
      (resolve, reject) => {
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port,
            path: "/api/upload",
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Length": "1",
            },
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (c) => chunks.push(Buffer.from(c)));
            res.on("end", () =>
              resolve({
                status: res.statusCode ?? 0,
                body: Buffer.concat(chunks).toString("utf8"),
              }),
            );
          },
        );
        req.on("error", reject);
        req.end("y");
      },
    );

    expect(third.status).toBe(429);
    expect(third.body).toMatch(/concurrent upload streams/i);

    held1.destroy();
    held2.destroy();
  });
});

describe("sendGenericUploadError", () => {
  it("sends a generic 500 body and does not leak err.message", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { headersSent: false, status } as any;

    sendGenericUploadError(res, new Error("secret-internal-detail"));

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: GENERIC_UPLOAD_ERROR });
    expect(json.mock.calls[0][0].error).not.toContain("secret-internal-detail");
    errorSpy.mockRestore();
  });

  it("does not write if headers were already sent", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { headersSent: true, status } as any;

    sendGenericUploadError(res, new Error("late"));

    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
