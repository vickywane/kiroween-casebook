# Spec: Map and UI

## Goal

A web app that shows a Leaflet map centred on the user's location, with two switchable layers and a case detail panel.

## Pages

### `/` — Map view

- Leaflet map, full viewport.
- Geolocation on load: ask permission, centre map on user, show a compass pin.
- Two layer toggles in a top-right control: **Historical** (default on) and **Recent** (default on).
- Historical layer: dark casebook pins. Clicking opens the case file panel.
- Recent layer: neutral grey cluster circles showing area counts. No click-to-individual for recent.
- A "Then & Now" button that, for the visible map area, shows a comparison panel.

### Case file panel (slide-up sheet on mobile, right panel on desktop)

Historical cases only. Shows:
- Offence category and year
- Verdict (always shown, prominently)
- Location confidence badge ("Exact address", "Street", "Area")
- AI plain-English summary
- Collapsible: original testimony excerpt
- Source link
- Content note at the top for violent crimes

### "Then & Now" panel

For the current map bounds, shows:
- Historical count by category (from `historical_cases`)
- Recent count by category (from `recent_area_counts`, last 12 months)
- Side-by-side comparison with the caveat: "These counts measure different things. 18th-century trials and modern police recording are not directly comparable."

## Styling

- Historical layer: dark background (#1a1a1a), aged-paper card texture, serif font (Playfair Display or similar), amber/sepia accents.
- Recent layer: clean white cards, sans-serif, neutral grey, no Halloween aesthetic.
- Mobile-first. The map is the primary surface on a phone.

## Technical notes

- Map tiles: OpenStreetMap (default) + NLS historical map tiles as an optional overlay (`.kiro/steering/tone-and-data-rules.md` governs which layer gets which overlay).
- All data fetched from Next.js API routes (`/api/cases`, `/api/area-counts`, `/api/then-and-now`).
- No client-side SQLite. API routes read from `data/sherlock.db` at request time.
- Leaflet must be loaded client-side only (use `dynamic` import with `ssr: false`).
