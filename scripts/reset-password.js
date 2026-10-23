#!/usr/bin/env node
// Gives an account a new temporary password and signs it out everywhere. It's the way back
// into the admin account if its password is lost; other users can also be reset by the admin
// under Settings → Admin.
//
//   docker compose exec bikepro node scripts/reset-password.js <email>
//   node scripts/reset-password.js <email>     (outside Docker, from the project folder)
//
// Plain JavaScript so it runs inside the Docker image without a build step. The hash format
// must match src/lib/auth/password.ts; a test checks that the two agree.

const { randomBytes, randomInt, scryptSync } = require("node:crypto");
const path = require("node:path");

const COST = { N: 2 ** 17, r: 8, p: 1 };
const KEY_LENGTH = 64;
const MAX_MEM = 256 * 1024 * 1024;
const TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function temporaryPassword() {
  const chars = Array.from({ length: 16 }, () => TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)]);
  return chars.join("").match(/.{4}/g).join("-");
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scryptSync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    ...COST,
    maxmem: MAX_MEM,
  });
  return ["scrypt", COST.N, COST.r, COST.p, salt.toString("base64"), key.toString("base64")].join(
    "$",
  );
}

/** Sets a temporary password for `email`; returns it, or null when there's no such account. */
function resetPassword(sqlite, email) {
  const user = sqlite
    .prepare("SELECT id, email FROM users WHERE email = ?")
    .get(email.trim().toLowerCase());
  if (!user) return null;
  const password = temporaryPassword();
  sqlite.transaction(() => {
    sqlite
      .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .run(hashPassword(password), user.id);
    sqlite.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
  })();
  return password;
}

function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/reset-password.js <email>");
    process.exit(1);
  }
  const Database = require("better-sqlite3");
  const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "bikepro.db");
  let sqlite;
  try {
    sqlite = new Database(dbPath, { fileMustExist: true });
  } catch {
    console.error(`Couldn't open the database at ${dbPath}. Set DATABASE_PATH if it's elsewhere.`);
    process.exit(1);
  }
  // The app may be writing at the same time; wait for it rather than failing.
  sqlite.pragma("busy_timeout = 5000");
  try {
    const password = resetPassword(sqlite, email);
    if (!password) {
      console.error(`There's no account with the email ${email}.`);
      process.exit(1);
    }
    console.log(`New temporary password for ${email.trim().toLowerCase()}: ${password}`);
    console.log("Sign in with it, then choose a new password under Settings → Account.");
  } finally {
    sqlite.close();
  }
}

if (require.main === module) main();

module.exports = { hashPassword, resetPassword, temporaryPassword };
