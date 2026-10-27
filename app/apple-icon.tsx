import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon for home-screen bookmarks and share sheets. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fffdf7",
        }}
      >
        <div
          style={{
            width: 148,
            height: 148,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 40,
            background: "#2f7d75",
            color: "#ffffff",
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: -2,
            transform: "rotate(-3deg)",
          }}
        >
          a4b
        </div>
      </div>
    ),
    size,
  );
}
