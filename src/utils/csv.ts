import type { HistoryEntry } from "../types";

/**
 * Escape a single CSV field (RFC 4180-style quoting).
 */
export function escapeCsvValue(val: unknown): string {
  const str = String(val ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const HISTORY_CSV_HEADERS = [
  "ID",
  "Timestamp (UTC)",
  "Timestamp (Local)",
  "Download Speed (Mbps)",
  "Upload Speed (Mbps)",
  "Latency / Ping (ms)",
  "Jitter (ms)",
  "ISP",
  "Server",
] as const;

/**
 * Build a full CSV document from history rows.
 * `formatLocalTime` defaults to the runtime locale (injectable for tests).
 */
export function buildHistoryCsv(
  history: HistoryEntry[],
  formatLocalTime: (iso: string) => string = (iso) =>
    new Date(iso).toLocaleString(),
): string {
  const rows = history.map((entry) =>
    [
      entry.id,
      entry.timestamp,
      formatLocalTime(entry.timestamp),
      entry.download,
      entry.upload,
      entry.ping,
      entry.jitter,
      entry.isp,
      entry.server,
    ]
      .map(escapeCsvValue)
      .join(","),
  );
  return [HISTORY_CSV_HEADERS.join(","), ...rows].join("\n");
}
