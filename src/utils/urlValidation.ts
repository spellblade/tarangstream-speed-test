/**
 * Validate user-supplied HTTP(S) URLs used for custom speed-test / ping hosts.
 * Rejects non-http schemes, credentials, and common SSRF / loopback targets.
 */

export type UrlValidationResult =
  | { ok: true; url: string }
  | { ok: false; reason: string };

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "0.0.0.0",
  "127.0.0.1",
  "::1",
  "[::1]",
  "metadata.google.internal",
]);

function isIpv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}

/** Decimal / dotted forms that map to loopback or RFC1918 / link-local / CGNAT. */
function isBlockedIpv4(host: string): boolean {
  if (!isIpv4(host)) return false;
  const [a, b] = host.split(".").map(Number);
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isBlockedIpv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "::1") return true;
  // IPv4-mapped IPv6 (::ffff:a.b.c.d)
  const mapped = h.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) return isBlockedIpv4(mapped[1]);
  // Unique local / link-local prefixes
  if (h.startsWith("fc") || h.startsWith("fd")) return true;
  if (h.startsWith("fe80:")) return true;
  return false;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (isBlockedIpv4(host)) return true;
  if (host.includes(":") || host.startsWith("[")) {
    if (isBlockedIpv6(host)) return true;
  }
  // Decimal / integer IPv4 tricks (e.g. 2130706433 → 127.0.0.1)
  if (/^\d+$/.test(host)) {
    const n = Number(host);
    if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) return true;
    const a = (n >>> 24) & 0xff;
    const b = (n >>> 16) & 0xff;
    const c = (n >>> 8) & 0xff;
    const d = n & 0xff;
    return isBlockedIpv4(`${a}.${b}.${c}.${d}`);
  }
  return false;
}

/**
 * Normalize optional scheme (default https) and validate for outbound probe use.
 */
export function validatePingHostUrl(input: string): UrlValidationResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: "empty" };

  let candidate = trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "protocol" };
  }
  if (!parsed.hostname) {
    return { ok: false, reason: "hostname" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: "credentials" };
  }
  if (isBlockedHostname(parsed.hostname)) {
    return { ok: false, reason: "blocked_host" };
  }

  return { ok: true, url: parsed.toString() };
}
