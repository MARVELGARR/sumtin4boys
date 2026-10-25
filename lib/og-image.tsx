import { ImageResponse } from "next/og";
import { APP_NAME } from "./constants";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Shared brand card used by the root Open Graph/Twitter image routes.
 * Inline styles only: `ImageResponse` runs in a constrained Satori renderer.
 */
export function brandOgImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#fffdf7",
          color: "#10201e",
          padding: "60px 64px 46px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -150,
            right: -100,
            width: 430,
            height: 430,
            borderRadius: 999,
            background: "#d7f3ef",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -190,
            left: 320,
            width: 380,
            height: 380,
            borderRadius: 999,
            background: "#f4c45e33",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 58,
                height: 58,
                borderRadius: 18,
                background: "#2f7d75",
                color: "#ffffff",
                fontSize: 24,
                fontWeight: 800,
                transform: "rotate(-3deg)",
              }}
            >
              a4b
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: -0.8,
              }}
            >
              {APP_NAME}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 32,
              marginTop: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 720,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 70,
                  fontWeight: 800,
                  letterSpacing: -3.4,
                  lineHeight: 1.02,
                }}
              >
                Tear small bread.
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 70,
                  fontWeight: 800,
                  letterSpacing: -3.4,
                  lineHeight: 1.02,
                  color: "#2f7d75",
                }}
              >
                Make somebody&apos;s day.
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 22,
                  fontSize: 25,
                  color: "#4b5f5a",
                }}
              >
                One link. Three taps. No app for fans.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                position: "relative",
                width: 290,
                height: 230,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: 0,
                  width: 290,
                  height: 176,
                  borderRadius: "110px 110px 56px 56px",
                  background: "#f4c45e",
                  border: "10px solid #10201e",
                  display: "flex",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 83,
                  top: 36,
                  width: 12,
                  height: 58,
                  borderRadius: 999,
                  background: "#b45309",
                  transform: "rotate(-18deg)",
                  display: "flex",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 137,
                  top: 21,
                  width: 12,
                  height: 72,
                  borderRadius: 999,
                  background: "#b45309",
                  display: "flex",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 191,
                  top: 36,
                  width: 12,
                  height: 58,
                  borderRadius: 999,
                  background: "#b45309",
                  transform: "rotate(18deg)",
                  display: "flex",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: -18,
                  top: 4,
                  display: "flex",
                  padding: "9px 16px",
                  borderRadius: 999,
                  background: "#ffffff",
                  border: "4px solid #10201e",
                  fontSize: 20,
                  fontWeight: 700,
                  transform: "rotate(4deg)",
                }}
              >
                No wahala
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 38,
              paddingTop: 20,
              borderTop: "2px solid #10201e1a",
              fontSize: 19,
              color: "#4b5f5a",
            }}
          >
            <div style={{ display: "flex" }}>anything4boys.com</div>
            <div style={{ display: "flex" }}>Naira-ready · built in Nigeria</div>
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
