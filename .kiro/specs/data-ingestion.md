# Spec: Data Ingestion

## Goal

Pre-process Old Bailey XML data and police.uk CSV data into a local SQLite database at build time.

## Inputs

- Old Bailey Online XML dump (CC BY-NC 4.0, non-commercial, credit required) from https://figshare.shef.ac.uk/articles/dataset/Old_Bailey_Online_XML_Data/4775434
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

Implemented in `scripts/ingest-police.ts` (schema in `scripts/lib/db.ts`).

| column | type | notes |
|---|---|---|
| id | TEXT PRIMARY KEY | `policeuk:<level>:<month>:<force>:<street or neighbourhood id>:<category>` |
| level | TEXT | `street` or `neighbourhood` |
| category | TEXT | police.uk category slug |
| month | TEXT | YYYY-MM |
| lat | REAL | police.uk approximate point (street) or boundary centroid (neighbourhood) |
| lon | REAL | as above |
| location_name | TEXT | e.g. "On or near Queen Street", or the neighbourhood name |
| count | INTEGER | number of crimes, always >= 1. Enforced by a CHECK constraint |
| force | TEXT | police.uk force id, e.g. `city-of-london`; `btp` for British Transport Police |
| neighbourhood | TEXT | police.uk neighbourhood id used as the query area |
| source, source_url, source_query | TEXT | provenance: where the row came from and the exact request |
| licence, attribution_text | TEXT | shown in the UI's source row |
| retrieved_at | TEXT | when the raw response was downloaded |
| upstream_version | TEXT | `sha256:` of the raw response |
| transform_version | TEXT | git SHA of the ETL code |

## Rules

- Any record with `year >= (current_year - 100)` must have `defendant_name = null` and `victim_name = null` unless it also has `concluded = true` and a non-null `source_url`.
- `verdict` must never be null in `historical_cases`.
- Street rows in a neighbourhood must add up to its total.
- Each crime is counted in the neighbourhood whose boundary contains its point, so ingesting some neighbourhoods gives the same rows as a full run.
- Every row in `historical_cases` must have a non-null `source_url`.

## Tasks

1. Write a Node.js script `scripts/ingest-oldbailey.ts` that parses Old Bailey XML and writes to `historical_cases`.
2. ~~Write a Node.js script `scripts/ingest-police.ts` that reads police.uk CSV and writes to `recent_area_counts`.~~ Done, using the police.uk API with neighbourhood boundaries instead of the CSV download (`yarn ingest:police`). City of London Police only so far.
3. Write a Node.js script `scripts/geocode-historical.ts` that calls Nominatim to resolve `location_raw` to `lat`/`lon`.
4. Add `npm run ingest` to `package.json` that runs all three in order. (`yarn ingest` exists and currently runs the police.uk step only.)
