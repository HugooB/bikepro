import type { MetadataRoute } from "next";

// Makes BikePro installable: Next serves this as /manifest.webmanifest and links it from every
// page. The text stays English, because browsers fetch the manifest without the user's session.
// The icons in public/ are rendered from docs/logo/app-icon.svg; iOS uses src/app/apple-icon.png.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BikePro",
    short_name: "BikePro",
    description: "Keep track of maintenance and part wear on your bikes.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // The app's own background, so the splash screen and the first page match.
    background_color: "#f8f9fb",
    theme_color: "#f8f9fb",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Full bleed with the bike inside the safe zone, for Android's round and squircle masks.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
