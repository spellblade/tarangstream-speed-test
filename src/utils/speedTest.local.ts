/**
 * LOCAL / DEV TESTING OVERRIDES for TarangStream speed test.
 *
 * This file is intentionally separate so that:
 *   - All localhost-specific fixes and behavior live in ONE place.
 *   - Anyone who wants to test or modify the app's speed-test UI/behavior
 *     can edit ONLY this file (change mirrors, force speeds, add debug, etc.).
 *   - Production / deployed behavior (using the app's own /api routes)
 *     is never affected.
 *
 * When running on localhost the app will prefer the runners exported here.
 *
 * Callers can do:
 *   import * as local from './speedTest.local';
 *   const isLocal = local.isLocalEnvironment();
 *   const runner = isLocal ? local : prod;
 *   await runner.runRealDownloadTest(...)
 */
 
import {
  runRealDownloadTest as runProdDownload,
  getSpeedCurveValue,
  calculateWMA,
  calculateDistance,
  measurePing,
  fetchIspDetails,
} from './speedTest';
import type { RealTestResult } from './speedTest';
import { ServerOption } from '../types';
 
// === Detection (callable from anywhere for testing) ===
export function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '[::1]';
}
 
// === Public mirrors for realistic download on localhost ===
const PUBLIC_DL_MIRRORS: Record<string, string> = {
  default: 'https://fsn1-speed.hetzner.com/1GB.bin',
  frankfurt: 'https://fsn1-speed.hetzner.com/1GB.bin',
  europe: 'https://fsn1-speed.hetzner.com/1GB.bin',
  oregon: 'https://ash-speed.hetzner.com/1GB.bin',
  virginia: 'https://ash-speed.hetzner.com/1GB.bin',
  us: 'https://ash-speed.hetzner.com/1GB.bin',
  west: 'https://ash-speed.hetzner.com/1GB.bin',
};
 
export function getPublicDownloadTestUrl(server?: ServerOption): string {
  if (!server || server.id === 'optimal') return PUBLIC_DL_MIRRORS.default;
  const loc = (server.location || '').toLowerCase();
  const key = Object.keys(PUBLIC_DL_MIRRORS).find(k =>
    server.id.toLowerCase().includes(k) || loc.includes(k)
  );
  return PUBLIC_DL_MIRRORS[key || 'default'];
}
 
// === Localhost download runner (uses public mirror via core real impl) ===
// All special localhost download logic lives here.
export async function runLocalDownloadTest(
  durationMs: number,
  onProgressUpdate: (ema: number, wma: number, progress: number, streams: number, loss: number) => void,
  signal?: AbortSignal,
  targetServer?: ServerOption
): Promise<RealTestResult> {
  const url = getPublicDownloadTestUrl(targetServer);
  // Delegate to the real streaming implementation but point it at the public URL.
  // (runProdDownload must support the optional base URL – see change to speedTest.ts)
  return runProdDownload(durationMs, onProgressUpdate, signal, url);
}
 
// === Localhost upload runner (pure simulation – realistic numbers) ===
// All special localhost upload simulation lives here. Devs can edit this for testing.
export async function runLocalUploadTest(
  durationMs: number,
  onProgressUpdate: (ema: number, wma: number, progress: number, streams: number, loss: number) => void,
  signal?: AbortSignal,
  baseTarget: number = 100,
  jitter: number = 5
): Promise<RealTestResult> {
  const start = performance.now();
  let isFinished = false;
  const rawSamples: number[] = [];
  let smoothedSpeedEMA = 0;
  const alpha = 0.22;
  let maxStreamsCount = 1;
 
  let lastSimEMA = 0;
  const simSamples: number[] = [];
 
  // Use same timing style as the inline sims in App (100 ticks)
  const durationTicks = 100;
  let ticks = 0;
 
  return new Promise((resolve, reject) => {
    const abortHandler = () => {
      clearInterval(interval);
      isFinished = true;
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (signal) signal.addEventListener('abort', abortHandler);
 
    const interval = setInterval(() => {
      if (signal?.aborted || isFinished) {
        clearInterval(interval);
        return;
      }
      ticks++;
      const currentPercent = ticks / durationTicks;
      const progressPercent = Math.min(100, (performance.now() - start) / durationMs * 100);
 
      const speed = getSpeedCurveValue(currentPercent, baseTarget, jitter, true);
      simSamples.push(speed);
      rawSamples.push(speed);
 
      const simEMA = lastSimEMA === 0 ? speed : (alpha * speed) + ((1 - alpha) * lastSimEMA);
      lastSimEMA = simEMA;
      const simWMA = calculateWMA(simSamples, 5);
 
      const simLoss = Math.min(6.8, parseFloat((Math.max(0, (jitter / 200) + (Math.sin(ticks / 6) * 0.25))).toFixed(2)));
      const simStreams = speed > 85 ? 6 : speed > 35 ? 4 : speed > 8 ? 2 : 1;
      if (simStreams > maxStreamsCount) maxStreamsCount = simStreams;
 
      onProgressUpdate(
        parseFloat(simEMA.toFixed(2)),
        parseFloat(simWMA.toFixed(2)),
        progressPercent,
        simStreams,
        simLoss
      );
 
      if (ticks >= durationTicks || (performance.now() - start) >= durationMs) {
        clearInterval(interval);
        isFinished = true;
        if (signal) signal.removeEventListener('abort', abortHandler);
 
        // Trim outliers like the real impl
        const sorted = [...rawSamples].sort((a, b) => a - b);
        const discard = Math.floor(sorted.length * 0.1);
        const trimmed = sorted.slice(discard, sorted.length - discard);
 
        const finalEMA = (trimmed.length ? trimmed.reduce((s, v) => s + v, 0) / trimmed.length : simEMA);
        const finalWMA = calculateWMA(trimmed.length ? trimmed : rawSamples, 5);
 
        resolve({
          emaSpeed: parseFloat(finalEMA.toFixed(2)),
          wmaSpeed: parseFloat(finalWMA.toFixed(2)),
          estimatedPacketLoss: simLoss,
          maxStreams: maxStreamsCount,
          rawSamples,
        });
      }
    }, 50);
  });
}
 
// Transparent re-exports so a caller can do:
//   const m = isLocal ? localModule : prodModule;
//   await m.runRealDownloadTest(...)
// without changing call sites much.
export { calculateDistance, measurePing, fetchIspDetails, getSpeedCurveValue, calculateWMA };
export type { RealTestResult };
 
// Also export the local versions under the "runReal*" names for easy aliasing in App
export { runLocalDownloadTest as runRealDownloadTestForLocal, runLocalUploadTest as runRealUploadTestForLocal };
 
// Transparent same-name exports so "const m = isLocal ? localModule : prodModule; m.runRealDownloadTest(...)" just works
export { runLocalDownloadTest as runRealDownloadTest };
export { runLocalUploadTest as runRealUploadTest };
