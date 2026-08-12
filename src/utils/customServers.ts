import type { ServerOption } from "../types";
import { validatePingHostUrl } from "./urlValidation";

const MAX_STRING = 128;
const MAX_SERVERS = 50;

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asTrimmedString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/**
 * Sanitize custom servers loaded from localStorage.
 * Drops invalid entries, enforces isCustom, re-validates URLs, caps list size.
 */
export function sanitizeCustomServers(raw: unknown): ServerOption[] {
  if (!Array.isArray(raw)) return [];

  const result: ServerOption[] = [];
  const seenIds = new Set<string>();

  for (const item of raw) {
    if (result.length >= MAX_SERVERS) break;
    if (!item || typeof item !== "object") continue;

    const e = item as Record<string, unknown>;
    const name = asTrimmedString(e.name, MAX_STRING);
    const location = asTrimmedString(e.location, MAX_STRING);
    if (!name || !location) continue;

    let id = asTrimmedString(e.id, 64);
    if (!id) id = `custom-${result.length}`;
    if (seenIds.has(id)) {
      id = `${id}-${result.length}`;
    }
    seenIds.add(id);

    const lat = asFiniteNumber(e.lat);
    const lon = asFiniteNumber(e.lon);

    let url: string | undefined;
    const rawUrl = asTrimmedString(e.url, 2048);
    if (rawUrl) {
      const checked = validatePingHostUrl(rawUrl);
      if (!checked.ok) {
        // Drop hostile/private URLs but keep the server entry without a probe URL
        url = undefined;
      } else {
        url = checked.url;
      }
    }

    const server: ServerOption = {
      id,
      name,
      location,
      isCustom: true,
    };
    if (lat !== undefined && lat >= -90 && lat <= 90) server.lat = lat;
    if (lon !== undefined && lon >= -180 && lon <= 180) server.lon = lon;
    if (url) server.url = url;

    result.push(server);
  }

  return result;
}
