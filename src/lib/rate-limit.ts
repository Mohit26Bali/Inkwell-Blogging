import "server-only";

/**
 * In-memory sliding-window rate limiter. Deliberately simple: no external store,
 * resets on server restart, and doesn't share state across serverless instances.
 * Good enough to blunt casual brute-forcing/spam; not a substitute for a real
 * rate-limiting service (e.g. Upstash) if this ever runs multi-instance.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();

// Periodically drop expired entries so the map doesn't grow unbounded.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }
}, CLEANUP_INTERVAL_MS).unref?.();

export function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count += 1;
  return true;
}
