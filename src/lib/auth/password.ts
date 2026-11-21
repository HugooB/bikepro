import { randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { z } from "zod";
import type { T } from "@/i18n";

// Passwords are hashed with scrypt (built into Node) using OWASP's recommended cost:
// N=2^17, r=8, p=1. The parameters are stored with each hash so they can be raised later.
const COST = { N: 2 ** 17, r: 8, p: 1 };
const KEY_LENGTH = 64;
// scrypt needs 128 * N * r bytes; Node's default memory cap (32 MiB) is too low for N=2^17.
const MAX_MEM = 256 * 1024 * 1024;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** Rules for a password someone chooses, when registering or changing it. */
export const newPasswordSchema = (t: T) =>
  z
    .string()
    .min(PASSWORD_MIN, t("validation.passwordMin", { count: PASSWORD_MIN }))
    .max(PASSWORD_MAX, t("validation.passwordMax", { count: PASSWORD_MAX }));

function derive(password: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(
      password.normalize("NFKC"),
      salt,
      KEY_LENGTH,
      { ...opts, maxmem: MAX_MEM },
      (err, key) => (err ? reject(err) : resolve(key)),
    ),
  );
}

/** Hash in the form `scrypt$N$r$p$salt$key` (salt and key base64). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, COST);
  return ["scrypt", COST.N, COST.r, COST.p, salt.toString("base64"), key.toString("base64")].join(
    "$",
  );
}

// The scrypt cost a stored hash may ask for. A hash with a higher (or nonsense) cost is refused
// rather than computed, so a tampered or corrupt row can't tie up the server. Raise these when
// COST goes up.
const MAX_N = COST.N;
const MAX_R = COST.r;
const MAX_P = COST.p;

const inRange = (value: number, max: number) =>
  Number.isSafeInteger(value) && value >= 1 && value <= max;

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, N, r, p, salt, key] = stored.split("$");
  if (algo !== "scrypt" || !salt || !key) return false;
  const cost = { N: Number(N), r: Number(r), p: Number(p) };
  if (!inRange(cost.N, MAX_N) || !inRange(cost.r, MAX_R) || !inRange(cost.p, MAX_P)) return false;
  const expected = Buffer.from(key, "base64");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = await derive(password, Buffer.from(salt, "base64"), cost);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// No 0/o, 1/l/i: easy to read out or type over from a screen.
const TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** A random password like "k7mp-2xq9-hd4w-p8nc" (about 79 bits), for an admin reset. */
export function temporaryPassword(): string {
  const chars = Array.from({ length: 16 }, () => TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)]);
  return chars.join("").match(/.{4}/g)!.join("-");
}

// Checked when an email is unknown, so a failed sign-in takes as long either way and
// response times don't reveal which emails have an account.
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword("not-a-real-password");
  await verifyPassword(password, await dummyHash);
}
