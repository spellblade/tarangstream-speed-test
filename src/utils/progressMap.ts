/**
 * Overall test progress bar mapping: equal thirds for latency / download / upload.
 * unit01 is progress within the active phase, clamped to [0, 1].
 */

export const PROGRESS_LATENCY_END = 33;
export const PROGRESS_DOWNLOAD_END = 66;
export const PROGRESS_UPLOAD_END = 99;
export const PROGRESS_COMPLETE = 100;

/** Hold dial needles at 0 while the bar may still advance (TCP / sampling warm-up). */
export const DIAL_COLD_START_MS = 1000;

export type ProgressPhase = "latency" | "download" | "upload";

export function clamp01(unit01: number): number {
  if (!Number.isFinite(unit01)) return 0;
  return Math.min(1, Math.max(0, unit01));
}

/**
 * Map phase-local progress (0–1) onto the overall 0–99 bar segments.
 */
export function mapPhaseProgress(
  phase: ProgressPhase,
  unit01: number,
): number {
  const t = clamp01(unit01);
  if (phase === "latency") {
    return Math.round(t * PROGRESS_LATENCY_END);
  }
  if (phase === "download") {
    const span = PROGRESS_DOWNLOAD_END - PROGRESS_LATENCY_END;
    return Math.round(PROGRESS_LATENCY_END + t * span);
  }
  const span = PROGRESS_UPLOAD_END - PROGRESS_DOWNLOAD_END;
  return Math.round(PROGRESS_DOWNLOAD_END + t * span);
}

/**
 * During the first coldMs of a phase, return 0 so dials do not jump before samples settle.
 */
export function applyDialColdStart(
  phaseStartedAt: number | null,
  speedMbps: number,
  now: number = performance.now(),
  coldMs: number = DIAL_COLD_START_MS,
): number {
  if (phaseStartedAt === null) return 0;
  if (now - phaseStartedAt < coldMs) return 0;
  return speedMbps;
}
