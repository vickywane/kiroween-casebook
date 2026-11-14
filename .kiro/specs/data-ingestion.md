# Spec: Data Ingestion

## Goal

Pre-process Old Bailey XML data and police.uk CSV data into a local SQLite database at build time.

## Inputs

- Old Bailey Online XML dump (CC BY 4.0) from https://figshare.shef.ac.uk/articles/dataset/Old_Bailey_Online_XML_Data/4775434
- police.uk street-level crime CSV from https://data.police.uk/data/

## Output

A SQLite database at `data/sherlock.db` with two tables:

### `historical_cases`

| column | type | notes |
|---|---|---|
| id | TEXT PRIMARY KEY | Old Bailey trial reference |
| year | INTEGER | trial year |
| offence_category | TEXT | e.g. "theft", "murder" |
| verdict | TEXT | REQUIRED, never null |
| defendant_name | TEXT | null if year >= (current_year - 100) |
| victim_name | TEXT | null if year >= (current_year - 100) |
| location_raw | TEXT | as recorded in the transcript |
| lat | REAL | geocoded |
| lon | REAL | geocoded |
| geocode_confidence | TEXT | "exact" / "street" / "area" |
| summary | TEXT | AI-generated plain-English summary |
| source_url | TEXT | REQUIRED |
| testimony_excerpt | TEXT | verbatim witness statement excerpt |

### `recent_area_counts`

| column | type | notes |
|---|---|---|
| id | TEXT PRIMARY KEY | |
| category | TEXT | police.uk category slug |
| month | TEXT | YYYY-MM |
| lat | REAL | police.uk approximate point |
| lon | REAL | police.uk approximate point |
| count | INTEGER | always >= 3, or null (suppressed) |
| force | TEXT | police force name |

## Rules

- Any record with `year >= (current_year - 100)` must have `defendant_name = null` and `victim_name = null` unless it also has `concluded = true` and a non-null `source_url`.
- `verdict` must never be null in `historical_cases`.
- `count` in `recent_area_counts` must be null when the raw value is 1 or 2.
- Every row in `historical_cases` must have a non-null `source_url`.

## Tasks

1. Write a Node.js script `scripts/ingest-oldbailey.ts` that parses Old Bailey XML and writes to `historical_cases`.
2. Write a Node.js script `scripts/ingest-police.ts` that reads police.uk CSV and writes to `recent_area_counts`.
3. Write a Node.js script `scripts/geocode-historical.ts` that calls Nominatim to resolve `location_raw` to `lat`/`lon`.
4. Add `npm run ingest` to `package.json` that runs all three in order.
