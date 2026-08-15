export type SmoothingMethod = "EMA" | "WMA" | "Hybrid";

/**
 * Pick display speed from EMA / WMA samples according to the user's filter mode.
 */
export function pickPreferredSpeed(
  method: SmoothingMethod,
  ema: number,
  wma: number,
): number {
  let value: number;
  if (method === "EMA") value = ema;
  else if (method === "WMA") value = wma;
  else value = (ema + wma) / 2;
  return parseFloat(value.toFixed(2));
}

/** Blend previous and new packet-loss estimates (equal weight). */
export function blendPacketLoss(
  previous: number | undefined,
  next: number,
): number {
  return parseFloat(((previous || 0) * 0.5 + next * 0.5).toFixed(2));
}
