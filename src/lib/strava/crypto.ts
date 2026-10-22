import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Strava tokens are stored encrypted with a key derived from STRAVA_CLIENT_SECRET, which lives
// in .env rather than the database: a copy of the database file alone can't act as the user.
// Changing the client secret makes stored tokens unreadable; users then reconnect Strava.

function key(secret = process.env.STRAVA_CLIENT_SECRET): Buffer {
  if (!secret) throw new Error("STRAVA_CLIENT_SECRET is not set");
  return createHash("sha256").update(`bikepro:strava-tokens:${secret}`).digest();
}

/** AES-256-GCM; returns "iv.tag.ciphertext" in base64url. */
export function encryptToken(plain: string, secret?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

/** Throws when the value was tampered with or encrypted with another secret. */
export function decryptToken(stored: string, secret?: string): string {
  const [iv, tag, data] = stored.split(".").map((p) => Buffer.from(p, "base64url"));
  if (!iv || !tag || !data) throw new Error("Malformed encrypted token");
  const decipher = createDecipheriv("aes-256-gcm", key(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
