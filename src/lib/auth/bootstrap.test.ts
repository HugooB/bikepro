import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { getAppSetting, setAppSetting } from "@/db/app-settings";
import { runMigrations } from "@/db/migrate";
import { appSettings } from "@/db/schema";
import { countUsers, createUser, findUserByEmail, registrationOpen } from "@/db/users";
import { bootstrapAccounts } from "./bootstrap";
import { verifyPassword } from "./password";

const log = () => ({ info: vi.fn(), warn: vi.fn() });

beforeAll(() => {
  runMigrations();
});

// The steps share one in-memory database and run in order, like successive server starts.
describe("bootstrapAccounts", () => {
  it("warns on an empty install without ADMIN_EMAIL, and creates nobody", async () => {
    const l = log();
    await bootstrapAccounts({}, l);
    expect(countUsers()).toBe(0);
    expect(l.warn).toHaveBeenCalledWith(expect.stringContaining("ADMIN_EMAIL isn't set"));
  });

  it("refuses to start without a usable ADMIN_PASSWORD", async () => {
    await expect(bootstrapAccounts({ ADMIN_EMAIL: "admin@example.com" }, log())).rejects.toThrow(
      /ADMIN_PASSWORD/,
    );
    await expect(
      bootstrapAccounts({ ADMIN_EMAIL: "not-an-email", ADMIN_PASSWORD: "long enough" }, log()),
    ).rejects.toThrow(/valid email/);
    expect(countUsers()).toBe(0);
  });

  it("creates the admin on an empty install, which closes registration", async () => {
    await bootstrapAccounts(
      { ADMIN_EMAIL: " Admin@Example.com ", ADMIN_PASSWORD: "correct horse", ADMIN_NAME: "Hugo" },
      log(),
    );
    const admin = findUserByEmail("admin@example.com");
    expect(admin).toMatchObject({ name: "Hugo", isAdmin: true });
    expect(await verifyPassword("correct horse", admin!.passwordHash)).toBe(true);
    expect(registrationOpen()).toBe(false);
  });

  it("leaves the admin's password alone when ADMIN_PASSWORD changes later", async () => {
    await bootstrapAccounts(
      { ADMIN_EMAIL: "admin@example.com", ADMIN_PASSWORD: "a different one" },
      log(),
    );
    const admin = findUserByEmail("admin@example.com")!;
    expect(await verifyPassword("correct horse", admin.passwordHash)).toBe(true);
    expect(countUsers()).toBe(1);
  });

  it("makes an existing account with ADMIN_EMAIL an admin", async () => {
    setAppSetting("registrationOpen", true);
    const rider = createUser({ email: "rider@example.com", name: "Rider", passwordHash: "x" });
    setAppSetting("registrationOpen", false);
    expect(rider.isAdmin).toBe(false);
    const l = log();
    await bootstrapAccounts({ ADMIN_EMAIL: "RIDER@example.com" }, l);
    expect(findUserByEmail("rider@example.com")?.isAdmin).toBe(true);
    expect(l.info).toHaveBeenCalledWith(expect.stringContaining("is now an admin"));
  });

  it("carries ALLOW_REGISTRATION over once and warns that it's no longer used", async () => {
    db.delete(appSettings).run(); // as on an install from before v0.1.0
    const l = log();
    await bootstrapAccounts({ ALLOW_REGISTRATION: "true" }, l);
    expect(getAppSetting("registrationOpen")).toBe(true);
    expect(l.warn).toHaveBeenCalledWith(expect.stringContaining("no longer used"));
    // The admin's later choice wins over the old variable.
    await bootstrapAccounts({ ALLOW_REGISTRATION: "false" }, log());
    expect(getAppSetting("registrationOpen")).toBe(true);
  });
});
