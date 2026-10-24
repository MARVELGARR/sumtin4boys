import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The build script runs TypeScript 7 before Next.js. Next still needs the
  // older TypeScript compiler API for configuration and editor tooling.
  typescript: {
    ignoreBuildErrors: true,
  },
  // Next blocks dev-only assets (`/_next/*`) requested from origins other than
  // localhost. Without this, opening the app through a tunnel serves the HTML
  // but every chunk fetch 403s, so React never hydrates and pages sit on their
  // loading skeletons. Only applies in development.
  allowedDevOrigins: ["*.trycloudflare.com", "*.loca.lt"],
};

export default nextConfig;
