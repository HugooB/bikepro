import { describe, expect, it } from "vitest";
import { partName, partNameToStore } from "@/lib/default-parts";
import { formatAge } from "@/lib/age";
import { computeStatus } from "@/lib/status";
import { formatDate, formatDistance, formatMoney } from "@/lib/units";
import { hasKey, localeFromHeader, makeT, translate } from "./index";

const en = makeT("en");
const nl = makeT("nl");

describe("t", () => {
  it("fills in placeholders", () => {
    expect(en("costs.entryRoundAt", { shop: "De Spaak" })).toBe("Service round at De Spaak");
    expect(nl("costs.entryRoundAt", { shop: "De Spaak" })).toBe("Onderhoudsbeurt bij De Spaak");
  });

  it("picks the plural form for the count", () => {
    expect(en("settings.data.bikes", { count: 1 })).toBe("1 bike");
    expect(en("settings.data.bikes", { count: 3 })).toBe("3 bikes");
    expect(en("settings.data.bikes", { count: 0 })).toBe("0 bikes");
    expect(nl("settings.data.parts", { count: 1 })).toBe("1 onderdeel");
    expect(nl("settings.data.parts", { count: 41 })).toBe("41 onderdelen");
  });

  it("leaves a placeholder without a value as it is", () => {
    expect(en("costs.entryRoundAt")).toBe("Service round at {shop}");
  });

  it("falls back to English for an unknown language, and to the key for an unknown key", () => {
    expect(translate("xx" as "en", "nav.settings")).toBe("Settings");
    expect(translate("nl", "no.such.key")).toBe("no.such.key");
    expect(hasKey("partKinds.chain")).toBe(true);
    expect(hasKey("partKinds.custom")).toBe(false);
    // A group with an `other` key isn't a plural.
    expect(hasKey("bikeTypes")).toBe(false);
    expect(nl("bikeTypes.other.name")).toBe("Anders");
  });
});

describe("part names", () => {
  const chain = { kind: "chain", name: "Chain" };

  it("translates template names and keeps names the user typed", () => {
    expect(partName(chain, nl)).toBe("Ketting");
    expect(partName(chain, en)).toBe("Chain");
    expect(partName({ kind: "chain", name: "KMC X11 chain" }, nl)).toBe("KMC X11 chain");
    expect(partName({ kind: "custom", name: "Power meter" }, nl)).toBe("Power meter");
  });

  it("stores the English template name when the translated one wasn't changed", () => {
    expect(partNameToStore("chain", "Ketting", nl)).toBe("Chain");
    expect(partNameToStore("chain", "Ketting KMC", nl)).toBe("Ketting KMC");
    expect(partNameToStore("custom", "Vermogensmeter", nl)).toBe("Vermogensmeter");
  });
});

describe("Accept-Language", () => {
  it.each([
    ["nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7", "nl"],
    ["en-GB,en;q=0.9", "en"],
    ["de-DE,de;q=0.9,nl;q=0.5", "nl"],
    ["fr-FR", "en"],
    ["en;q=0.5,nl;q=0.8", "nl"],
    ["nl;q=0", "en"],
    ["", "en"],
    [null, "en"],
  ])("%s gives %s", (header, locale) => {
    expect(localeFromHeader(header)).toBe(locale);
  });
});

describe("Dutch formatting", () => {
  it("formats numbers, amounts and dates the Dutch way", () => {
    expect(formatDistance(12_345, "km", "nl")).toBe("12.345 km");
    // Intl puts a non-breaking space between the symbol and the amount.
    expect(formatMoney(1234.5, "EUR", "nl")).toBe("€\u00a01.234,50");
    expect(formatDate("2026-10-03", "d MMM yyyy", "nl")).toBe("3 okt. 2026");
    expect(formatDate("2026-10-03", "d MMM yyyy", "en")).toBe("3 Oct 2026");
  });

  it("translates ages and status hints", () => {
    const now = new Date(2026, 9, 19);
    expect(formatAge("2026-10-12", now, nl)).toBe("7 dagen");
    expect(formatAge("2024-07-01", now, nl)).toBe("2 jr 3 mnd");
    const part = {
      installedAt: "2026-01-01",
      installedKm: 0,
      serviceIntervalKm: 1000,
      serviceIntervalDays: null,
      replaceIntervalKm: null,
      replaceIntervalDays: null,
    };
    expect(computeStatus(part, null, 400, { now, locale: "nl" })).toMatchObject({
      condition: "Goede staat",
      service: { hint: "over 600 km" },
    });
  });
});
