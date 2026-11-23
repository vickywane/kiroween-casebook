import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      // Apply the Tailwind loader only to app-owned CSS files under src/.
      // node_modules CSS (e.g. leaflet, maplibre-gl) must NOT go through
      // the Tailwind loader — it doesn't understand plain third-party CSS
      // and will silently strip rules that MapLibre and Leaflet depend on
      // (the canvas sizing, control positions, etc.), causing a blank map.
      "./src/**/*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
