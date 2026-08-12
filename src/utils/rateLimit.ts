/**
 * Pure helpers for Express API rate limiting and client IP extraction.
 * Kept free of Express app lifecycle so unit tests can exercise them in isolation.
 */

export const DEFAULT_MAX_API_REQUESTS_PER_MINUTE = 60;
export const DEFAULT_RATE_WINDOW_MS = 60_000;

export type ClientIpRequest = {
  /** Compatible with Express `Request.headers` / Node IncomingHttpHeaders. */
  headers: Record<string, string | string[] | undefined>;
  socket: {
    remoteAddress?: string | undefined;
  };
};

/**
 * Prefer the first X-Forwarded-For hop when present; otherwise socket address.
 * Callers that sit behind untrusted proxies should only enable XFF when proxy trust is configured.
 */
export function getClientIp(req: ClientIpRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    const first = String(forwarded[0] ?? "");
    if (first.length > 0) return first.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

export type RateLimiter = {
  /** Returns true when the IP is over the limit (request is NOT counted). */
  isLimited: (ip: string, now?: number) => boolean;
  /** Clears recorded timestamps (tests / admin). */
  reset: () => void;
  /** Count of requests still inside the sliding window. */
  getRequestCount: (ip: string, now?: number) => number;
};

export function createRateLimiter(
  maxRequests: number = DEFAULT_MAX_API_REQUESTS_PER_MINUTE,
  windowMs: number = DEFAULT_RATE_WINDOW_MS,
): RateLimiter {
  const apiRequestLog = new Map<string, number[]>();

  const prune = (ip: string, now: number): number[] => {
    const timestamps = (apiRequestLog.get(ip) || []).filter(
      (t) => now - t < windowMs,
    );
    return timestamps;
  };

  return {
    isLimited(ip: string, now: number = Date.now()): boolean {
      const timestamps = prune(ip, now);
      if (timestamps.length >= maxRequests) {
        apiRequestLog.set(ip, timestamps);
        return true;
      }
      timestamps.push(now);
      apiRequestLog.set(ip, timestamps);
      return false;
    },
    reset(): void {
      apiRequestLog.clear();
    },
    getRequestCount(ip: string, now: number = Date.now()): number {
      return prune(ip, now).length;
    },
  };
}
