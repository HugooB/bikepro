/**
 * Where to go after signing in. Only same-site paths are allowed, so a crafted link like
 * /login?next=//evil.example can't send someone to another site.
 */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/")) return "/";
  // "//host" and "/\host" are treated as other sites by browsers; control characters can hide them.
  if (next.startsWith("//") || next.startsWith("/\\") || /[\u0000-\u001f\\]/.test(next)) return "/";
  try {
    const url = new URL(next, "http://bikepro.invalid");
    if (url.origin !== "http://bikepro.invalid") return "/";
    // Resolving dot segments can turn "/.//evil.example" into "//evil.example", so check the result too.
    const path = url.pathname + url.search;
    if (path.startsWith("//") || path.startsWith("/\\")) return "/";
    if (new URL(path, "http://bikepro.invalid").origin !== "http://bikepro.invalid") return "/";
    return path;
  } catch {
    return "/";
  }
}
