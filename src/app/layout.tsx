import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { UnitsProvider } from "@/components/UnitsProvider";
import { getCurrentUser } from "@/lib/auth/session";
import { DEFAULT_PREFS } from "@/lib/units";
import "./globals.css";

// One family; the width axis gives display headings their wide, race-number look.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "BikePro",
  description: "Keep track of maintenance and part wear on your bikes.",
};

export const viewport: Viewport = {
  themeColor: "#f8f9fb",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const prefs = user ? { distanceUnit: user.distanceUnit, currency: user.currency } : DEFAULT_PREFS;
  return (
    <html lang="en" className={archivo.variable}>
      <body className="antialiased">
        <AppHeader />
        <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 sm:px-6">
          <UnitsProvider prefs={prefs}>{children}</UnitsProvider>
        </main>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
