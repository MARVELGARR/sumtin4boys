import { brandOgImage, OG_SIZE } from "@/lib/og-image";

export const alt = "anything4boys — Tear small bread. Make somebody's day.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return brandOgImage();
}
