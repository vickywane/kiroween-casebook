import type { NextConfig } from "next";

// Next.js 15.5. Tailwind runs through postcss.config.mjs, which leaves
// third-party CSS (leaflet, maplibre-gl) alone so the map keeps its sizing.
const nextConfig: NextConfig = {};

export default nextConfig;
