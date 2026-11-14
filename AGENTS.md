# Sherlock — Agent Instructions

This is a Next.js web app for the Kiroween 2026 hackathon. It shows historical and recent crime data on a map of London.

## Always read first

`.kiro/steering/tone-and-data-rules.md` — governs all UI copy, data handling, and styling. These rules are non-negotiable.

## Specs

- `.kiro/specs/data-ingestion.md` — SQLite ingestion scripts
- `.kiro/specs/map-and-ui.md` — map, panels, and styling

## Stack

- Next.js 14 (App Router), TypeScript, Tailwind
- Leaflet + react-leaflet for the map
- SQLite (`better-sqlite3`) for data at build/runtime
- Amazon Bedrock for AI summarisation
- Nominatim for geocoding

## Key rules

- Leaflet must always be loaded with `dynamic(..., { ssr: false })`.
- Never query the database from a Client Component. Use API routes.
- Two-tone rule: historical layer gets casebook styling; recent layer is plain and factual.
- Every case record must have a non-null `verdict` and `source_url`.
- Suppress police.uk counts of 1 or 2 (set to null, show "a small number").

## Data sources

- Old Bailey Online XML: CC BY 4.0, credit required.
- police.uk / data.police.uk: Open Government Licence.
- Wikidata: CC0.
- NLS historical map tiles: free for non-commercial use, credit required.
