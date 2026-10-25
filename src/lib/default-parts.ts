import type { BikeType, BrakeType, PartCategory, TireType } from "@/db/schema";
import { hasKey, type T } from "@/i18n";
import { monthsToDays } from "./format";

/** Interval values in km and days; whichever comes first. Leave both out for "none". */
export type Intervals = {
  serviceIntervalKm?: number;
  serviceIntervalDays?: number;
  replaceIntervalKm?: number;
  replaceIntervalDays?: number;
};

export type PartTemplate = Intervals & {
  kind: string;
  /** Stored with the part, in English; shown translated (see partName). */
  name: string;
  category: PartCategory;
  /** Zone in the bike illustration (M5) this part highlights. */
  svgZone: string;
};

const YEAR = 365;
const months = monthsToDays;

// Default intervals for a road rider doing roughly 5,000 km a year in mixed weather: the middle
// of the ranges in these guides (October 2026). Ride more, or in rain and grit, and they come
// sooner; every value can be changed per part.
// - BikeGremlin, bicycle maintenance service intervals (bike.bikegremlin.com/19342)
// - The Service Course, bike maintenance schedule (theservicecourse.net/bike-maintenance-schedule)
// - watchmy.bike, how long do bike parts last (watchmy.bike/blog/how-long-do-bike-parts-last)
// - SRAM support: bleed DOT brakes at least once a year (support.sram.com)
// Where no guide gives a fixed number (derailleurs, wheels, saddle, pedals), there is no
// replacement interval: those parts are replaced when inspection says so.

/** Where the brake and tire parts go in each template. */
const BRAKES = "brakes" as const;
const TIRES = "tires" as const;
type Slot = PartTemplate | typeof BRAKES | typeof TIRES;

const brakeParts: Record<BrakeType, PartTemplate[]> = {
  disc: [
    // Inspect and clean every ~1,000 km; resin/sintered pads last 800–5,600 km.
    {
      kind: "brake_pads_front",
      name: "Front brake pads",
      category: "brakes",
      svgZone: "brake_front",
      serviceIntervalKm: 1000,
      replaceIntervalKm: 2500,
    },
    {
      kind: "brake_pads_rear",
      name: "Rear brake pads",
      category: "brakes",
      svgZone: "brake_rear",
      serviceIntervalKm: 1000,
      replaceIntervalKm: 2500,
    },
    // Clean twice a year; replace at the stamped minimum thickness, 16,000–32,000 km.
    {
      kind: "rotors",
      name: "Brake rotors",
      category: "brakes",
      svgZone: "brake_front",
      serviceIntervalDays: months(6),
      replaceIntervalKm: 20000,
    },
    // A bleed replaces the fluid: yearly (SRAM, Shimano).
    {
      kind: "brake_fluid",
      name: "Brake fluid",
      category: "brakes",
      svgZone: "brake_rear",
      replaceIntervalDays: YEAR,
    },
  ],
  rim: [
    // Rim pads wear faster than disc pads: 800–2,000 km, and they wear the rims too.
    {
      kind: "brake_pads_front",
      name: "Front brake pads",
      category: "brakes",
      svgZone: "brake_front",
      serviceIntervalKm: 1000,
      replaceIntervalKm: 2000,
    },
    {
      kind: "brake_pads_rear",
      name: "Rear brake pads",
      category: "brakes",
      svgZone: "brake_rear",
      serviceIntervalKm: 1000,
      replaceIntervalKm: 2000,
    },
    // Lube and adjust twice a year; replace yearly or every ~5,000 km.
    {
      kind: "brake_cables",
      name: "Brake cables & housing",
      category: "brakes",
      svgZone: "cables",
      serviceIntervalDays: months(6),
      replaceIntervalKm: 5000,
      replaceIntervalDays: YEAR,
    },
  ],
};

const tireParts: Record<TireType, PartTemplate[]> = {
  tubeless: [
    // Check and top up every 2 months; it dries out in 2–6 months.
    {
      kind: "sealant",
      name: "Tubeless sealant",
      category: "wheels",
      svgZone: "tire_rear",
      serviceIntervalDays: months(2),
      replaceIntervalDays: months(6),
    },
  ],
  // Inner tubes are replaced when they puncture, not on a schedule.
  tubes: [],
};

const roadParts: Slot[] = [
  // Drivetrain
  // Clean and lube every 200–500 km; replace at 0.5% stretch, 2,000–5,000 km.
  {
    kind: "chain",
    name: "Chain",
    category: "drivetrain",
    svgZone: "chain",
    serviceIntervalKm: 400,
    replaceIntervalKm: 4000,
  },
  // Deep clean with the drivetrain every ~2,500 km or half year; lasts 2–3 chains.
  {
    kind: "cassette",
    name: "Cassette",
    category: "drivetrain",
    svgZone: "cassette",
    serviceIntervalKm: 2500,
    serviceIntervalDays: months(6),
    replaceIntervalKm: 12000,
  },
  // Same clean; lasts 4–6 chains, 16,000–24,000 km.
  {
    kind: "chainrings",
    name: "Chainrings",
    category: "drivetrain",
    svgZone: "chainrings",
    serviceIntervalKm: 2500,
    serviceIntervalDays: months(6),
    replaceIntervalKm: 20000,
  },
  // Clean, lube and adjust yearly.
  {
    kind: "derailleur_front",
    name: "Front derailleur",
    category: "drivetrain",
    svgZone: "derailleur_front",
    serviceIntervalKm: 5000,
    serviceIntervalDays: YEAR,
  },
  // Jockey wheels need cleaning and lubing every ~3,000 km or half year.
  {
    kind: "derailleur_rear",
    name: "Rear derailleur",
    category: "drivetrain",
    svgZone: "derailleur_rear",
    serviceIntervalKm: 3000,
    serviceIntervalDays: months(6),
  },
  // Service yearly; lasts 5,000–16,000 km.
  {
    kind: "bottom_bracket",
    name: "Bottom bracket",
    category: "drivetrain",
    svgZone: "bottom_bracket",
    serviceIntervalKm: 5000,
    serviceIntervalDays: YEAR,
    replaceIntervalKm: 15000,
  },

  // Wheels & tires
  // Hub service and truing yearly. Rims are replaced when their wear indicator says so.
  {
    kind: "wheel_front",
    name: "Front wheel",
    category: "wheels",
    svgZone: "wheel_front",
    serviceIntervalKm: 5000,
    serviceIntervalDays: YEAR,
  },
  {
    kind: "wheel_rear",
    name: "Rear wheel",
    category: "wheels",
    svgZone: "wheel_rear",
    serviceIntervalKm: 5000,
    serviceIntervalDays: YEAR,
  },
  // Tires need no service. Rear 3,000–6,000 km, front about twice that; rubber hardens, so
  // replace after about 5 years whatever the km.
  {
    kind: "tire_front",
    name: "Front tire",
    category: "wheels",
    svgZone: "tire_front",
    replaceIntervalKm: 7000,
    replaceIntervalDays: 5 * YEAR,
  },
  {
    kind: "tire_rear",
    name: "Rear tire",
    category: "wheels",
    svgZone: "tire_rear",
    replaceIntervalKm: 4000,
    replaceIntervalDays: 5 * YEAR,
  },
  // Sealant for tubeless tires, see above
  TIRES,

  // Brakes & cables (the brake parts themselves depend on the brake type, see above)
  BRAKES,
  // Lube and adjust twice a year; replace yearly or every ~5,000 km.
  {
    kind: "cables",
    name: "Shift cables & housing",
    category: "brakes",
    svgZone: "cables",
    serviceIntervalDays: months(6),
    replaceIntervalKm: 5000,
    replaceIntervalDays: YEAR,
  },

  // Contact points
  // No service; replace about yearly.
  {
    kind: "bar_tape",
    name: "Bar tape",
    category: "contact",
    svgZone: "handlebar",
    replaceIntervalDays: YEAR,
  },
  // No interval in any guide: replace when worn or uncomfortable.
  { kind: "saddle", name: "Saddle", category: "contact", svgZone: "saddle" },
  // Bearing service yearly.
  {
    kind: "pedals",
    name: "Pedals",
    category: "contact",
    svgZone: "pedals",
    serviceIntervalKm: 5000,
    serviceIntervalDays: YEAR,
  },
  // 5,000–8,000 km, sooner when you walk in them a lot.
  {
    kind: "cleats",
    name: "Cleats",
    category: "contact",
    svgZone: "pedals",
    replaceIntervalKm: 6000,
    replaceIntervalDays: YEAR,
  },
  // Service yearly; bearings last 1–2 years.
  {
    kind: "headset",
    name: "Headset",
    category: "contact",
    svgZone: "headset",
    serviceIntervalKm: 5000,
    serviceIntervalDays: YEAR,
    replaceIntervalDays: 2 * YEAR,
  },
];

// Other bike types reuse the road template until they get their own.
const templates: Record<BikeType, Slot[]> = {
  road: roadParts,
  gravel: roadParts,
  tt: roadParts,
  other: roadParts,
};

/** Default parts for a new bike of the given type, brakes and tires. */
export function defaultPartsFor(
  type: BikeType,
  brakes: BrakeType = "disc",
  tires: TireType = "tubeless",
): PartTemplate[] {
  return templates[type].flatMap((t) =>
    t === BRAKES ? brakeParts[brakes] : t === TIRES ? tireParts[tires] : [t],
  );
}

/** The English template name of every part kind, as parts store it. */
const templateNames = new Map(
  [
    ...roadParts.filter((p) => typeof p !== "string"),
    ...brakeParts.disc,
    ...brakeParts.rim,
    ...tireParts.tubeless,
  ].map((p) => [p.kind, p.name]),
);

/**
 * How a part's name is shown. Parts keep the name they were created with, in English for
 * template parts. While it's still the template name, it's shown in the user's language;
 * a name the user typed is shown as typed.
 */
export function partName(part: { kind: string; name: string }, t: T): string {
  const key = `partKinds.${part.kind}`;
  return templateNames.get(part.kind) === part.name && hasKey(key) ? t(key) : part.name;
}

/** The name to store for a part form: the template name when the shown name wasn't changed. */
export function partNameToStore(kind: string, name: string, t: T): string {
  const template = templateNames.get(kind);
  return template && name === partName({ kind, name: template }, t) ? template : name;
}
