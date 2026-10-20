import type { BikeType } from "@/db/schema";

export const bikeTypeLabels: Record<BikeType, { name: string; hint: string }> = {
  road: { name: "Road", hint: "Drop bars, slick tyres" },
  gravel: { name: "Gravel", hint: "Drop bars, wide knobbly tyres" },
  tt: { name: "TT", hint: "Aero bars, built for speed" },
  other: { name: "Other", hint: "Anything else with two wheels" },
};

/** Frame colours offered for the bike drawing; an empty value uses the brand colour. */
export const frameColors = [
  { value: "", name: "Cobalt" },
  { value: "#1a1d24", name: "Stealth black" },
  { value: "#c8322b", name: "Race red" },
  { value: "#e2711d", name: "Orange" },
  { value: "#2e8a57", name: "Green" },
  { value: "#1f8fa6", name: "Petrol" },
  { value: "#7a4fc4", name: "Purple" },
  { value: "#8a8f9c", name: "Raw carbon" },
] as const;
