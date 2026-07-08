// Base URL of the deployed website that hosts /api/featured and
// /api/broadcast-channels. Override with EXPO_PUBLIC_WEB_API_URL for
// local development against a locally-running Next.js server.
export const WEB_API_BASE_URL =
  process.env.EXPO_PUBLIC_WEB_API_URL || "https://alltvlive.vercel.app";
