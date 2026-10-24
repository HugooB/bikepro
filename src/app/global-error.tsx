"use client";

import { localeFromHeader, makeT } from "@/i18n";

// Last resort when the root layout itself fails, so it can't use the app's styles, header or
// preferences. It speaks the browser's language instead.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  const locale = localeFromHeader(typeof navigator === "undefined" ? "" : navigator.language);
  const t = makeT(locale);
  return (
    <html lang={locale}>
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          maxWidth: 420,
          margin: "15vh auto",
          padding: "0 16px",
          color: "#1a1d24",
        }}
      >
        <h1 style={{ fontSize: 24 }}>{t("errorPage.globalTitle")}</h1>
        <p style={{ color: "#5b6070" }}>{t("errorPage.globalBody")}</p>
        <button
          onClick={reset}
          style={{
            marginTop: 12,
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            background: "#2f49d1",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {t("errorPage.tryAgain")}
        </button>
      </body>
    </html>
  );
}
