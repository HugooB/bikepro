// Slows down password guessing: after too many failed sign-ins for one email, further
// attempts are refused for a while. Kept in memory, which suits a single self-hosted server;
// a restart clears it.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

const failures = new Map<string, { count: number; since: number }>();

function entry(key: string, now: number) {
  const e = failures.get(key);
  if (!e || now - e.since > WINDOW_MS) {
    failures.delete(key);
    return undefined;
  }
  return e;
}

export function isThrottled(key: string, now = Date.now()): boolean {
  return (entry(key, now)?.count ?? 0) >= MAX_FAILURES;
}

export function recordFailure(key: string, now = Date.now()) {
  const e = entry(key, now);
  if (e) e.count += 1;
  else failures.set(key, { count: 1, since: now });
}

export function clearFailures(key: string) {
  failures.delete(key);
}
