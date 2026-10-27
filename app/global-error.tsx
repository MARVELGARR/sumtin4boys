"use client";

/**
 * Last-resort error boundary. It replaces the root layout, so it must render
 * its own document and cannot rely on the app's CSS variables or providers.
 * Kept dependency-free so a root-layout failure still produces a readable page.
 */
export default function GlobalError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html lang="en-NG">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Something went wrong · anything4boys</title>
        <meta name="robots" content="noindex" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#fffdf7",
          color: "#10201e",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: "460px", textAlign: "center" }}>
          <div
            aria-hidden="true"
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 20px",
              borderRadius: "20px",
              background: "#2f7d75",
              color: "#ffffff",
              display: "grid",
              placeItems: "center",
              fontSize: "22px",
              fontWeight: 800,
              transform: "rotate(-3deg)",
            }}
          >
            a4b
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "30px",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
            }}
          >
            Something went wrong.
          </h1>
          <p
            style={{
              margin: "12px 0 24px",
              fontSize: "15px",
              lineHeight: 1.6,
              color: "#4b5f5a",
            }}
          >
            The page could not load. Your support records are safe. Try again,
            or head back to the home page.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => retry()}
              style={{
                border: "2px solid #10201e",
                borderRadius: "12px",
                background: "#2f7d75",
                color: "#ffffff",
                padding: "11px 20px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                // Intentionally a full reload, not next/link: global-error
                // replaces the root layout and may not have router context.
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.href = "/";
              }}
              style={{
                border: "2px solid #10201e1a",
                borderRadius: "12px",
                background: "#ffffff",
                color: "#10201e",
                padding: "11px 20px",
                fontSize: "14px",
                fontWeight: 700,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              Go home
            </button>
          </div>
          <p style={{ margin: "22px 0 0", fontSize: "12px", color: "#4b5f5a" }}>
            anything4boys · Small bread, big love.
          </p>
        </main>
      </body>
    </html>
  );
}
