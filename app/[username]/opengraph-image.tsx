import { ImageResponse } from "next/og";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { APP_NAME } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { brandOgImage, OG_SIZE } from "@/lib/og-image";

export const alt = "Creator page on anything4boys";
export const size = OG_SIZE;
export const contentType = "image/png";

type Props = { params: Promise<{ username: string }> };

export default async function Image({ params }: Props) {
  const { username } = await params;
  const { creator } = await fetchQuery(api.creators.getByUsername, {
    username,
  });
  if (!creator) return brandOgImage();

  const initial = creator.displayName.slice(0, 1).toUpperCase();
  const bio = creator.bio?.trim();
  const shortBio = bio && bio.length > 120 ? `${bio.slice(0, 117)}…` : bio;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          background: "#fffdf7",
          color: "#10201e",
          padding: "56px 64px 42px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -150,
            right: -130,
            width: 440,
            height: 440,
            borderRadius: 999,
            background: "#d7f3ef",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -190,
            left: -120,
            width: 390,
            height: 390,
            borderRadius: 999,
            background: "#f4c45e33",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 54,
                height: 54,
                borderRadius: 16,
                background: "#2f7d75",
                color: "#ffffff",
                fontSize: 22,
                fontWeight: 800,
                transform: "rotate(-3deg)",
              }}
            >
              a4b
            </div>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>
              {APP_NAME}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 18px",
              borderRadius: 999,
              background: "#f4c45e",
              border: "3px solid #10201e",
              fontSize: 19,
              fontWeight: 700,
            }}
          >
            Creator page
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 34,
            marginTop: 62,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 160,
              height: 160,
              borderRadius: 999,
              background: "#2f7d75",
              color: "#ffffff",
              fontSize: 76,
              fontWeight: 800,
              border: "9px solid #ffffff",
              boxShadow: "0 12px 0 #10201e",
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div
              style={{
                display: "flex",
                fontSize: 62,
                fontWeight: 800,
                letterSpacing: -2.4,
                lineHeight: 1.05,
              }}
            >
              {creator.displayName}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 8,
                fontSize: 27,
                color: "#2f7d75",
                fontWeight: 600,
              }}
            >
              @{creator.username}
            </div>
            {shortBio ? (
              <div
                style={{
                  display: "flex",
                  marginTop: 16,
                  fontSize: 23,
                  lineHeight: 1.35,
                  color: "#4b5f5a",
                  maxWidth: 760,
                }}
              >
                {shortBio}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
            paddingTop: 24,
            borderTop: "2px solid #10201e1a",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>
              Tear {creator.displayName} small bread.
            </div>
            <div style={{ display: "flex", fontSize: 19, color: "#4b5f5a" }}>
              {formatMoney(creator.breadPrice, creator.currency)} per bread · no
              app for fans
            </div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "12px 20px",
              borderRadius: 14,
              background: "#10201e",
              color: "#ffffff",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            anything4boys.com/{creator.username}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
