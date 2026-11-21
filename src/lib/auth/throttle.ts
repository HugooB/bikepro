// Slows down password guessing: after too many failed sign-ins for one email, further
// attempts are refused for a while. Kept in memory, which suits a single self-hosted server;
// a restart clears it.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
// Every failed email gets an entry, so cap the map to keep a flood of made-up emails from
// growing memory without limit. At the cap, expired entries go first, then the oldest.
const MAX_KEYS = 10_000;

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
  if (e) {
    e.count += 1;
    return;
  }
  if (failures.size >= MAX_KEYS) makeRoom(now);
  failures.set(key, { count: 1, since: now });
}

function makeRoom(now: number) {
  for (const [k, e] of failures) {
    if (now - e.since > WINDOW_MS) failures.delete(k);
  }
  // Still full: drop the oldest entries (a Map keeps insertion order).
  for (const k of failures.keys()) {
    if (failures.size < MAX_KEYS) break;
    failures.delete(k);
  }
}

/** For tests: how many emails are being tracked. */
export function trackedCount(): number {
  return failures.size;
}

export function clearFailures(key: string) {
  failures.delete(key);
}
