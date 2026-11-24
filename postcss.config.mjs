// Tailwind v4 via PostCSS. Only CSS that imports "tailwindcss" (globals.css)
// is changed by it; Leaflet and MapLibre CSS pass through untouched.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
