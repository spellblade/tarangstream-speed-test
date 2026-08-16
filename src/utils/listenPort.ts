const DEFAULT_PORT = 3000;

/** Parse PORT (digits only). Empty or invalid → 3000. */
export function resolveListenPort(
  raw: string | undefined = process.env.PORT,
): number {
  if (raw === undefined) return DEFAULT_PORT;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return DEFAULT_PORT;
  const n = Number(trimmed);
  if (n < 1 || n > 65535) return DEFAULT_PORT;
  return n;
}
