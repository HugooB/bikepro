// Bike type names and hints are in the dictionary under bikeTypes, colour names under colors.

/** Frame colours offered for the bike drawing; an empty value uses the brand colour. */
export const frameColors = [
  { value: "", id: "cobalt" },
  { value: "#1a1d24", id: "black" },
  { value: "#c8322b", id: "red" },
  { value: "#e2711d", id: "orange" },
  { value: "#2e8a57", id: "green" },
  { value: "#1f8fa6", id: "petrol" },
  { value: "#7a4fc4", id: "purple" },
  { value: "#8a8f9c", id: "carbon" },
] as const;

export type FrameColorId = (typeof frameColors)[number]["id"];
