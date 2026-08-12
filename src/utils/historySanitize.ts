import type { HistoryEntry } from "../types";

const MAX_STRING = 256;
const MAX_ID = 64;
const DEFAULT_MAX_ENTRIES = 500;

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function asTrimmedString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function uniqueId(
  candidate: string,
  seen: Set<string>,
  index: number,
  timestamp: string,
): string {
  let id =
    candidate.length > 0
      ? candidate.slice(0, MAX_ID)
      : `entry-${index}-${timestamp.slice(0, 19) || index}`;
  if (!seen.has(id)) return id;
  let n = 0;
  while (seen.has(`${id}-${n}`)) n += 1;
  return `${id}-${n}`.slice(0, MAX_ID);
}

/**
 * Coerce and filter untrusted history payloads from localStorage (or imports).
 * Drops non-objects and entries with non-numeric metrics; deduplicates ids.
 */
export function sanitizeHistoryEntries(
  raw: unknown,
  maxEntries: number = DEFAULT_MAX_ENTRIES,
): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];

  const seenIds = new Set<string>();
  const result: HistoryEntry[] = [];

  for (let i = 0; i < raw.length; i++) {
    if (result.length >= maxEntries) break;
    const item = raw[i];
    if (!item || typeof item !== "object") continue;

    const e = item as Record<string, unknown>;
    const download = asFiniteNumber(e.download);
    const upload = asFiniteNumber(e.upload);
    const ping = asFiniteNumber(e.ping);
    const jitter = asFiniteNumber(e.jitter);
    if (
      download === null ||
      upload === null ||
      ping === null ||
      jitter === null
    ) {
      continue;
    }
    if (download < 0 || upload < 0 || ping < 0 || jitter < 0) continue;

    const timestamp =
      typeof e.timestamp === "string" && e.timestamp.length > 0
        ? e.timestamp.slice(0, 40)
        : new Date(0).toISOString();

    const id = uniqueId(
      asTrimmedString(e.id, MAX_ID),
      seenIds,
      i,
      timestamp,
    );
    seenIds.add(id);

    const entry: HistoryEntry = {
      id,
      timestamp,
      download,
      upload,
      ping,
      jitter,
      isp: asTrimmedString(e.isp, MAX_STRING) || "Unknown",
      server: asTrimmedString(e.server, MAX_STRING) || "Unknown",
    };

    const packetLoss = asFiniteNumber(e.packetLoss);
    if (packetLoss !== null && packetLoss >= 0) {
      entry.packetLoss = packetLoss;
    }
    const maxStreams = asFiniteNumber(e.maxStreams);
    if (maxStreams !== null && maxStreams >= 0) {
      entry.maxStreams = Math.floor(maxStreams);
    }

    result.push(entry);
  }

  return result;
}
