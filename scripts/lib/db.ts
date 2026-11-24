import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type DB = Database.Database;

/**
 * Schema for the published database. Data rules from
 * .kiro/steering/tone-and-data-rules.md are repeated here as constraints, so a
 * row that breaks them cannot be written even if the transform has a bug.
 */
/** Bump when a table definition changes; generated tables are rebuilt on mismatch. */
const SCHEMA_VERSION = 3;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS recent_area_counts (
  id                TEXT PRIMARY KEY,
  level             TEXT NOT NULL CHECK (level IN ('street', 'neighbourhood')),
  category          TEXT NOT NULL,
  month             TEXT NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  lat               REAL NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lon               REAL NOT NULL CHECK (lon BETWEEN -180 AND 180),
  location_name     TEXT,
  count             INTEGER NOT NULL CHECK (count >= 1),
  force             TEXT NOT NULL,
  neighbourhood     TEXT,
  source            TEXT NOT NULL,
  source_url        TEXT NOT NULL,
  source_query      TEXT NOT NULL,
  licence           TEXT NOT NULL,
  attribution_text  TEXT NOT NULL,
  retrieved_at      TEXT NOT NULL,
  upstream_version  TEXT NOT NULL,
  transform_version TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rac_month_category ON recent_area_counts (month, category);
CREATE INDEX IF NOT EXISTS idx_rac_lat_lon ON recent_area_counts (lat, lon);
CREATE INDEX IF NOT EXISTS idx_rac_force_month ON recent_area_counts (force, month);

CREATE TABLE IF NOT EXISTS ingest_runs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  source            TEXT NOT NULL,
  started_at        TEXT NOT NULL,
  finished_at       TEXT,
  transform_version TEXT NOT NULL,
  stats_json        TEXT
);
`;

export function openDb(path: string): DB {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  // Keep the published artefact a single self-contained file.
  db.pragma("journal_mode = DELETE");
  db.pragma("foreign_keys = ON");
  // recent_area_counts is rebuilt from data/raw, so an old layout is dropped
  // rather than migrated. Re-run the ingest (with --offline) to refill it.
  if (db.pragma("user_version", { simple: true }) !== SCHEMA_VERSION) {
    db.exec("DROP TABLE IF EXISTS recent_area_counts");
    db.pragma(`user_version = ${SCHEMA_VERSION}`);
  }
  db.exec(SCHEMA);
  return db;
}
