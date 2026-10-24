import type { NextConfig } from "next";

// Sent with every response, static files included. The Content Security Policy and HSTS
// depend on the request and on APP_URL at runtime, so src/proxy.ts sets those.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Older browsers' version of the CSP's frame-ancestors 'none'.
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

// `npm run dev` only serves its live-reload connection to localhost. Opened from a phone on
// the same network (http://192.168.x.x:3000) the page then never hydrates, so every button
// that needs JavaScript does nothing. Allow the private network ranges and .local names.
// Development only: production builds ignore this.
const privateNetworkOrigins = [
  "192.168.*.*",
  "10.*.*.*",
  ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
  "*.local",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: privateNetworkOrigins,
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  // Room for a JSON import (Settings → Your data), which allows files up to 5 MB.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
