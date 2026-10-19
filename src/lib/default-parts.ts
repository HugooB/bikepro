import type { BikeType, PartCategory } from "@/db/schema";

export type PartTemplate = {
  kind: string;
  name: string;
  category: PartCategory;
  /** Zone in the bike illustration (M5) this part highlights. */
  svgZone: string;
  intervalKm?: number;
  intervalDays?: number;
};

export const categoryLabels: Record<PartCategory, string> = {
  drivetrain: "Drivetrain",
  wheels: "Wheels & tires",
  brakes: "Brakes & cables",
  contact: "Contact points",
};

const YEAR = 365;

const roadParts: PartTemplate[] = [
  // Drivetrain
  {
    kind: "chain",
    name: "Chain",
    category: "drivetrain",
    svgZone: "chain",
    intervalKm: 3000,
    intervalDays: YEAR,
  },
  {
    kind: "cassette",
    name: "Cassette",
    category: "drivetrain",
    svgZone: "cassette",
    intervalKm: 9000,
  },
  {
    kind: "chainrings",
    name: "Chainrings",
    category: "drivetrain",
    svgZone: "chainrings",
    intervalKm: 20000,
  },
  {
    kind: "derailleur_front",
    name: "Front derailleur",
    category: "drivetrain",
    svgZone: "derailleur_front",
  },
  {
    kind: "derailleur_rear",
    name: "Rear derailleur",
    category: "drivetrain",
    svgZone: "derailleur_rear",
  },
  {
    kind: "bottom_bracket",
    name: "Bottom bracket",
    category: "drivetrain",
    svgZone: "bottom_bracket",
    intervalDays: 2 * YEAR,
  },

  // Wheels & tires
  {
    kind: "wheel_front",
    name: "Front wheel",
    category: "wheels",
    svgZone: "wheel_front",
    intervalDays: YEAR,
  },
  {
    kind: "wheel_rear",
    name: "Rear wheel",
    category: "wheels",
    svgZone: "wheel_rear",
    intervalDays: YEAR,
  },
  {
    kind: "tire_front",
    name: "Front tire",
    category: "wheels",
    svgZone: "tire_front",
    intervalKm: 5000,
    intervalDays: 2 * YEAR,
  },
  {
    kind: "tire_rear",
    name: "Rear tire",
    category: "wheels",
    svgZone: "tire_rear",
    intervalKm: 3500,
    intervalDays: 2 * YEAR,
  },
  {
    kind: "sealant",
    name: "Tubeless sealant",
    category: "wheels",
    svgZone: "tire_rear",
    intervalDays: 120,
  },

  // Brakes & cables
  {
    kind: "brake_pads_front",
    name: "Front brake pads",
    category: "brakes",
    svgZone: "brake_front",
    intervalKm: 2500,
  },
  {
    kind: "brake_pads_rear",
    name: "Rear brake pads",
    category: "brakes",
    svgZone: "brake_rear",
    intervalKm: 2500,
  },
  {
    kind: "rotors",
    name: "Brake rotors",
    category: "brakes",
    svgZone: "brake_front",
    intervalKm: 10000,
  },
  {
    kind: "brake_fluid",
    name: "Brake fluid",
    category: "brakes",
    svgZone: "brake_rear",
    intervalDays: YEAR,
  },
  {
    kind: "cables",
    name: "Shift cables & housing",
    category: "brakes",
    svgZone: "cables",
    intervalDays: YEAR,
  },

  // Contact points
  {
    kind: "bar_tape",
    name: "Bar tape",
    category: "contact",
    svgZone: "handlebar",
    intervalDays: YEAR,
  },
  { kind: "saddle", name: "Saddle", category: "contact", svgZone: "saddle" },
  { kind: "pedals", name: "Pedals", category: "contact", svgZone: "pedals" },
  { kind: "cleats", name: "Cleats", category: "contact", svgZone: "pedals", intervalDays: 180 },
  { kind: "headset", name: "Headset", category: "contact", svgZone: "headset", intervalDays: YEAR },
];

// Other bike types reuse the road template until they get their own.
const templates: Record<BikeType, PartTemplate[]> = {
  road: roadParts,
  gravel: roadParts,
  tt: roadParts,
  other: roadParts,
};

/** Default parts for a new bike of the given type. */
export function defaultPartsFor(type: BikeType): PartTemplate[] {
  return templates[type];
}
