"use client";

// Last resort when the root layout itself fails, so it can't use the app's styles or header.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          maxWidth: 420,
          margin: "15vh auto",
          padding: "0 16px",
          color: "#1a1d24",
        }}
      >
        <h1 style={{ fontSize: 24 }}>BikePro couldn&apos;t load</h1>
        <p style={{ color: "#5b6070" }}>Your data is safe. Try again in a moment.</p>
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
          Try again
        </button>
      </body>
    </html>
  );
}
