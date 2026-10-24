import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { PrefsProvider } from "@/i18n/client";
import { getPrefs, getT } from "@/i18n/server";
import "./globals.css";

// One family; the width axis gives display headings their wide, race-number look.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("common.appName"), description: t("meta.description") };
}

export const viewport: Viewport = {
  themeColor: "#f8f9fb",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const prefs = await getPrefs();
  return (
    <html lang={prefs.locale} className={archivo.variable}>
      <body className="antialiased">
        <PrefsProvider prefs={prefs}>
          <AppHeader />
          <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 sm:px-6">{children}</main>
          <Toaster position="top-center" />
        </PrefsProvider>
      </body>
    </html>
  );
}
