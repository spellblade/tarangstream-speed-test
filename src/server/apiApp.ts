import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import {
  createRateLimiter,
  getClientIp,
  DEFAULT_MAX_API_REQUESTS_PER_MINUTE,
  DEFAULT_RATE_WINDOW_MS,
  type RateLimiter,
} from "../utils/rateLimit";

export const MAX_DOWNLOAD_CONNECTIONS_PER_IP = 8;
export const DOWNLOAD_STREAM_MAX_MS = 30_000;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export type ApiAppOptions = {
  /** Inject a limiter (tests); default is a fresh instance per app. */
  rateLimiter?: RateLimiter;
  maxDownloadConnections?: number;
  downloadStreamMaxMs?: number;
  maxUploadBytes?: number;
};

function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
}

/**
 * Express app with TarangStream API routes only (no Vite / static UI).
 * Safe for unit/integration tests via supertest.
 */
export function createApiApp(options: ApiAppOptions = {}): Express {
  const maxDownloadConnections =
    options.maxDownloadConnections ?? MAX_DOWNLOAD_CONNECTIONS_PER_IP;
  const downloadStreamMaxMs =
    options.downloadStreamMaxMs ?? DOWNLOAD_STREAM_MAX_MS;
  const maxUploadBytes = options.maxUploadBytes ?? MAX_UPLOAD_BYTES;

  const downloadConnections = new Map<string, number>();
  const apiRateLimiter =
    options.rateLimiter ??
    createRateLimiter(
      DEFAULT_MAX_API_REQUESTS_PER_MINUTE,
      DEFAULT_RATE_WINDOW_MS,
    );

  const app = express();
  app.use(securityHeaders);

  function apiRateLimit(req: Request, res: Response, next: NextFunction) {
    const ip = getClientIp(req);
    if (apiRateLimiter.isLimited(ip)) {
      res
        .status(429)
        .json({ error: "Too many requests. Please try again later." });
      return;
    }
    next();
  }

  app.get("/api/download", apiRateLimit, (req, res) => {
    const ip = getClientIp(req);
    const current = downloadConnections.get(ip) || 0;
    if (current >= maxDownloadConnections) {
      res.status(429).json({
        error: "Too many concurrent download streams from this client.",
      });
      return;
    }
    downloadConnections.set(ip, current + 1);

    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": "attachment; filename=speedtest_download.bin",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    });

    const chunkSize = 128 * 1024;
    const chunk = Buffer.alloc(chunkSize, 0);

    let isClosed = false;
    const streamStarted = Date.now();

    const releaseConnection = () => {
      if (isClosed) return;
      isClosed = true;
      const count = downloadConnections.get(ip) || 1;
      if (count <= 1) downloadConnections.delete(ip);
      else downloadConnections.set(ip, count - 1);
    };

    req.on("close", releaseConnection);
    res.on("close", releaseConnection);

    const streamTimeout = setTimeout(() => {
      if (!isClosed) {
        res.end();
        releaseConnection();
      }
    }, downloadStreamMaxMs);

    function sendStream() {
      if (isClosed || Date.now() - streamStarted >= downloadStreamMaxMs) {
        if (!isClosed) {
          res.end();
          releaseConnection();
        }
        return;
      }
      const ok = res.write(chunk);
      if (ok) {
        setImmediate(sendStream);
      } else {
        res.once("drain", sendStream);
      }
    }

    sendStream();

    res.on("finish", () => {
      clearTimeout(streamTimeout);
      releaseConnection();
    });
  });

  app.post("/api/upload", apiRateLimit, (req, res) => {
    const contentType = req.headers["content-type"];
    if (!contentType || !contentType.includes("application/octet-stream")) {
      res.status(400).json({
        error:
          "Invalid content type. Only application/octet-stream is allowed.",
      });
      return;
    }

    const contentLengthHeader = req.headers["content-length"];

    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (isNaN(contentLength) || contentLength > maxUploadBytes) {
        res
          .status(413)
          .json({ error: "Payload too large. Max size allowed is 2MB." });
        return;
      }
    }

    let bytesReceived = 0;
    let limitExceeded = false;

    req.on("data", (chunk) => {
      if (limitExceeded) return;

      bytesReceived += chunk.length;
      if (bytesReceived > maxUploadBytes) {
        limitExceeded = true;
        req.destroy();
        if (!res.headersSent) {
          res.status(413).json({ error: "Payload too large. Upload aborted." });
        }
      }
    });

    req.on("end", () => {
      if (limitExceeded) return;

      res.json({
        status: "ok",
        bytesReceived,
        message: "Upload processed successfully",
      });
    });

    req.on("error", (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    });
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  return app;
}
