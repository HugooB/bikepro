import { en, type Dictionary } from "./en";
import { nl } from "./nl";

// A home-grown dictionary per language, with no library. en.ts is the source of truth; every
// other language is typed as its Dictionary, so a missing key fails `npm run typecheck`.
// To add a language: copy en.ts, translate it, and add it to `dictionaries` below.

const dictionaries = { en, nl } satisfies Record<string, Dictionary>;

export type Locale = keyof typeof dictionaries;
export const locales = Object.keys(dictionaries) as Locale[];
export const DEFAULT_LOCALE: Locale = "en";

/** Each language's name in that language, for the language picker. */
export const localeNames: Record<Locale, string> = { en: "English", nl: "Nederlands" };

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && value in dictionaries;

/** Text that depends on a count, in the forms `Intl.PluralRules` picks between. */
export type Plural = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

type Leaf = string | Plural;
type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends Leaf ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Every key in the dictionary, e.g. "settings.title". */
export type MessageKey = Paths<Dictionary>;
export type Vars = Record<string, string | number>;

/** Translates `key`, filling in `{name}` placeholders. A plural entry is picked by `vars.count`. */
export type T = (key: MessageKey, vars?: Vars) => string;

// A plural has a string `other`; a group can have a key named "other" too (bikeTypes.other).
const isPlural = (node: unknown): node is Plural =>
  typeof node === "object" && node !== null && typeof (node as Plural).other === "string";

function lookup(dict: Dictionary, key: string): Leaf | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" || isPlural(node) ? (node as Leaf) : undefined;
}

/** Whether `key` exists, for keys built at runtime such as `partKinds.${kind}`. */
export function hasKey(key: string): key is MessageKey {
  return lookup(en, key) !== undefined;
}

const pluralRules = new Map<Locale, Intl.PluralRules>();

function fill(text: string, vars?: Vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function translate(locale: Locale, key: string, vars?: Vars): string {
  // A key missing from a translation falls back to English, then to the key itself.
  const leaf = lookup(dictionaries[locale], key) ?? lookup(en, key);
  if (leaf === undefined) return key;
  if (typeof leaf === "string") return fill(leaf, vars);

  let rules = pluralRules.get(locale);
  if (!rules) pluralRules.set(locale, (rules = new Intl.PluralRules(locale)));
  const count = Number(vars?.count ?? 0);
  return fill(leaf[rules.select(count)] ?? leaf.other, vars);
}

export function makeT(locale: Locale): T {
  return (key, vars) => translate(locale, key, vars);
}

/** English, for code that runs without a user, and the default in tests. */
export const tEn: T = makeT("en");

/** The active dictionary, for passing to client components. */
export const dictionaryFor = (locale: Locale): Dictionary => dictionaries[locale];

/**
 * The best supported language for an Accept-Language header, e.g. "nl-NL,nl;q=0.9,en;q=0.8"
 * gives "nl". Falls back to English.
 */
export function localeFromHeader(header: string | null | undefined): Locale {
  const wanted = (header ?? "")
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((w) => w.tag && w.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of wanted) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export type { Dictionary };
