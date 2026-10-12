-- Mafia Pro backend — D1 (SQLite). Idempotent: safe to re-run on every deploy.
CREATE TABLE IF NOT EXISTS users (
  tg_id      INTEGER PRIMARY KEY,
  username   TEXT,
  first_name TEXT,
  last_name  TEXT,
  lang       TEXT,
  photo_url  TEXT,
  created_at INTEGER NOT NULL,
  seen_at    INTEGER NOT NULL
);

-- one row per Stars invoice; status: pending → paid (→ refunded)
CREATE TABLE IF NOT EXISTS purchases (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id      INTEGER NOT NULL,
  kind       TEXT NOT NULL,          -- role | scenario | pack
  item       TEXT NOT NULL,          -- role / scenario / pack id as in the app
  stars      INTEGER NOT NULL,
  payload    TEXT NOT NULL UNIQUE,   -- invoice payload (p_<random>)
  status     TEXT NOT NULL,          -- pending | paid | refunded
  charge_id  TEXT,                   -- telegram_payment_charge_id (needed for refunds)
  created_at INTEGER NOT NULL,
  paid_at    INTEGER
);
CREATE INDEX IF NOT EXISTS purchases_user ON purchases (tg_id, status);

CREATE TABLE IF NOT EXISTS ratings (
  tg_id      INTEGER PRIMARY KEY,
  points     INTEGER NOT NULL DEFAULT 0,
  games      INTEGER NOT NULL DEFAULT 0,
  wins       INTEGER NOT NULL DEFAULT 0,
  hosted     INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- finished games reported by the host app (summary = JSON with seats, roles, results)
CREATE TABLE IF NOT EXISTS games (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id    TEXT NOT NULL UNIQUE,   -- the app's own game id (dedupes re-sends)
  host_id    INTEGER NOT NULL,
  code       TEXT,                   -- lobby code when cards were dealt through the bot
  mode       TEXT,
  players    INTEGER,
  winner     TEXT,
  summary    TEXT,
  created_at INTEGER NOT NULL
);

-- a table the host opens so players can join from Telegram and receive their card privately
CREATE TABLE IF NOT EXISTS lobbies (
  code       TEXT PRIMARY KEY,
  host_id    INTEGER NOT NULL,
  status     TEXT NOT NULL,          -- open | dealt | closed
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS lobby_players (
  code       TEXT NOT NULL,
  tg_id      INTEGER NOT NULL,
  name       TEXT,
  username   TEXT,
  lang       TEXT,
  joined_at  INTEGER NOT NULL,
  PRIMARY KEY (code, tg_id)
);
