import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^scrypt\$131072\$8\$1\$[^$]+\$[^$]+$/);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("correct horse battery stapl", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "md5$abc")).toBe(false);
  });

  it("refuses stored hashes that ask for more work than BikePro uses", async () => {
    const [, , , , salt, key] = (await hashPassword("pw")).split("$");
    const withCost = (N: string, r: string, p: string) => ["scrypt", N, r, p, salt, key].join("$");
    expect(await verifyPassword("pw", withCost("131072", "8", "1"))).toBe(true);
    for (const [N, r, p] of [
      ["262144", "8", "1"],
      ["131072", "16", "1"],
      ["131072", "8", "64"],
      ["0", "8", "1"],
      ["abc", "8", "1"],
      ["1e400", "8", "1"],
    ]) {
      expect(await verifyPassword("pw", withCost(N!, r!, p!))).toBe(false);
    }
  });
});
