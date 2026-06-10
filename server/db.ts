import { Database } from 'bun:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(join(DATA_DIR, 'vault.db'));

db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA foreign_keys = ON');

// Central media cache. Composite PK because TMDB reuses numeric IDs across movies and TV.
db.run(`
  CREATE TABLE IF NOT EXISTS media (
    tmdb_id       INTEGER NOT NULL,
    type          TEXT    NOT NULL CHECK(type IN ('movie', 'tv')),
    name          TEXT    NOT NULL,
    poster        TEXT,
    tmdb_url      TEXT,
    year          TEXT,
    critic_rating REAL,
    PRIMARY KEY (tmdb_id, type)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS user_watched (
    id        TEXT    PRIMARY KEY,
    username  TEXT    NOT NULL,
    tmdb_id   INTEGER NOT NULL,
    type      TEXT    NOT NULL,
    rating    INTEGER NOT NULL DEFAULT 0,
    added_at  TEXT    NOT NULL,
    FOREIGN KEY (tmdb_id, type) REFERENCES media(tmdb_id, type)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS user_watchlist (
    id        TEXT    PRIMARY KEY,
    username  TEXT    NOT NULL,
    tmdb_id   INTEGER NOT NULL,
    type      TEXT    NOT NULL,
    added_at  TEXT    NOT NULL,
    FOREIGN KEY (tmdb_id, type) REFERENCES media(tmdb_id, type)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS room_watched (
    id        TEXT    PRIMARY KEY,
    tmdb_id   INTEGER NOT NULL,
    type      TEXT    NOT NULL,
    rating    INTEGER NOT NULL DEFAULT 0,
    added_at  TEXT    NOT NULL,
    added_by  TEXT    NOT NULL,
    FOREIGN KEY (tmdb_id, type) REFERENCES media(tmdb_id, type)
  )
`);

// Per-user ratings — cascades on room_watched delete
db.run(`
  CREATE TABLE IF NOT EXISTS room_ratings (
    room_watched_id TEXT    NOT NULL REFERENCES room_watched(id) ON DELETE CASCADE,
    username        TEXT    NOT NULL,
    rating          INTEGER NOT NULL,
    PRIMARY KEY (room_watched_id, username)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS room_watchlist (
    id        TEXT    PRIMARY KEY,
    tmdb_id   INTEGER NOT NULL,
    type      TEXT    NOT NULL,
    added_at  TEXT    NOT NULL,
    added_by  TEXT    NOT NULL,
    FOREIGN KEY (tmdb_id, type) REFERENCES media(tmdb_id, type)
  )
`);
