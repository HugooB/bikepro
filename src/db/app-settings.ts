import { eq } from "drizzle-orm";
import { db } from "./index";
import { appSettings } from "./schema";

// Install-wide settings, changed by an admin in Settings → Admin. Values are stored as text.

type Settings = {
  /** Whether people without an account may register. */
  registrationOpen: boolean;
};

const defaults: Settings = { registrationOpen: false };

export function getAppSetting<K extends keyof Settings>(key: K): Settings[K] {
  const row = db.select().from(appSettings).where(eq(appSettings.key, key)).get();
  return row ? (JSON.parse(row.value) as Settings[K]) : defaults[key];
}

export function setAppSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  const stored = JSON.stringify(value);
  db.insert(appSettings)
    .values({ key, value: stored })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: stored } })
    .run();
}
