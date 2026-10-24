import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

const publicFile = (src: string) => readFileSync(join(process.cwd(), "public", src));

/** Width and height from a PNG's header (the IHDR chunk follows the 8-byte signature). */
const pngSize = (png: Buffer) => [png.readUInt32BE(16), png.readUInt32BE(20)].join("x");

describe("web app manifest", () => {
  const m = manifest();

  it("opens BikePro full screen from the home screen", () => {
    expect(m).toMatchObject({ name: "BikePro", start_url: "/", display: "standalone" });
  });

  it("lists 192 and 512 px icons, and a maskable one", () => {
    const icons = m.icons ?? [];
    expect(icons.filter((i) => i.purpose === "any").map((i) => i.sizes)).toEqual([
      "192x192",
      "512x512",
    ]);
    expect(icons.some((i) => i.purpose === "maskable" && i.sizes === "512x512")).toBe(true);
  });

  it("points at PNG files of the size it states", () => {
    for (const icon of m.icons ?? []) {
      const png = publicFile(icon.src);
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      expect(pngSize(png)).toBe(icon.sizes);
    }
  });

  it("has round corners on the regular icons and none on the maskable one", () => {
    // Color type 6 is RGBA, which the transparent corners need; 2 is RGB without alpha.
    const colorType = (src: string) => publicFile(src)[25];
    expect(colorType("icon-192.png")).toBe(6);
    expect(colorType("icon-512.png")).toBe(6);
    expect(colorType("icon-maskable-512.png")).toBe(2);
  });
});
