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

-- friends: invite codes (one per user) and symmetric friendships (both directions are stored)
CREATE TABLE IF NOT EXISTS invites (
  code       TEXT PRIMARY KEY,
  tg_id      INTEGER NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS friends (
  tg_id      INTEGER NOT NULL,
  friend_id  INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (tg_id, friend_id)
);

-- friend requests (search by @username → request → accept in the bot or in the app)
CREATE TABLE IF NOT EXISTS friend_requests (
  from_id    INTEGER NOT NULL,
  to_id      INTEGER NOT NULL,
  status     TEXT NOT NULL,          -- pending | accepted | declined
  created_at INTEGER NOT NULL,
  PRIMARY KEY (from_id, to_id)
);
CREATE INDEX IF NOT EXISTS friend_requests_to ON friend_requests (to_id, status);
CREATE INDEX IF NOT EXISTS users_username ON users (username);

-- full access granted by an admin (all cards, scenarios and packs until `until`)
CREATE TABLE IF NOT EXISTS grants (
  tg_id      INTEGER PRIMARY KEY,
  until      INTEGER NOT NULL,       -- unix seconds
  granted_by INTEGER NOT NULL,
  note       TEXT,
  created_at INTEGER NOT NULL
);

-- referrals: who brought whom (attributed on the invitee's first contact with the bot)
CREATE TABLE IF NOT EXISTS referrals (
  tg_id        INTEGER PRIMARY KEY,   -- the invitee
  ref_by       INTEGER NOT NULL,      -- the inviter
  code         TEXT,
  created_at   INTEGER NOT NULL,
  qualified_at INTEGER                -- set when the invitee received a card at a table or finished a game
);
CREATE INDEX IF NOT EXISTS referrals_by ON referrals (ref_by, qualified_at);

-- reward credits: a free premium card / scenario of the player's choice (spent in the shop)
CREATE TABLE IF NOT EXISTS credits (
  tg_id      INTEGER NOT NULL,
  kind       TEXT NOT NULL,           -- role | scenario
  count      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tg_id, kind)
);
-- which referral milestones were already paid out
CREATE TABLE IF NOT EXISTS milestones (
  tg_id      INTEGER NOT NULL,
  level      INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (tg_id, level)
);

-- partner programme (hosts, clubs, bloggers): revenue share on purchases of the people they bring
CREATE TABLE IF NOT EXISTS partners (
  tg_id       INTEGER PRIMARY KEY,
  status      TEXT NOT NULL,          -- pending | active | rejected
  name        TEXT,
  channel     TEXT,
  audience    TEXT,
  share       INTEGER NOT NULL DEFAULT 20,   -- percent of Stars from referred purchases
  created_at  INTEGER NOT NULL,
  approved_at INTEGER
);
CREATE TABLE IF NOT EXISTS payouts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id      INTEGER NOT NULL,
  stars      INTEGER NOT NULL,
  note       TEXT,
  created_at INTEGER NOT NULL
);

-- clubs: a head applies, an admin approves, the club is listed; one club per player
CREATE TABLE IF NOT EXISTS clubs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  city        TEXT,
  about       TEXT,
  link        TEXT,
  logo        TEXT,                   -- small data URL (resized in the app)
  owner_id    INTEGER NOT NULL,
  status      TEXT NOT NULL,          -- pending | active | rejected
  created_at  INTEGER NOT NULL,
  approved_at INTEGER
);
CREATE INDEX IF NOT EXISTS clubs_status ON clubs (status);
CREATE TABLE IF NOT EXISTS club_members (
  tg_id      INTEGER PRIMARY KEY,     -- a player belongs to at most one club
  club_id    INTEGER NOT NULL,
  role       TEXT NOT NULL,           -- owner | admin | member
  joined_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS club_members_club ON club_members (club_id);
-- invitations from the club and applications from players
CREATE TABLE IF NOT EXISTS club_requests (
  club_id    INTEGER NOT NULL,
  tg_id      INTEGER NOT NULL,
  kind       TEXT NOT NULL,           -- invite | apply
  status     TEXT NOT NULL,           -- pending | accepted | declined
  created_at INTEGER NOT NULL,
  PRIMARY KEY (club_id, tg_id)
);
-- club chat
CREATE TABLE IF NOT EXISTS club_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id    INTEGER NOT NULL,
  tg_id      INTEGER NOT NULL,
  kind       TEXT NOT NULL,           -- text | lobby | system
  text       TEXT,
  code       TEXT,                    -- lobby code for kind = lobby
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS club_messages_club ON club_messages (club_id, id);

-- live tables (v27): the host app publishes a public state and per-player private states; players send actions and chat
CREATE TABLE IF NOT EXISTS table_state (
  code       TEXT PRIMARY KEY,
  host_id    INTEGER NOT NULL,
  version    INTEGER NOT NULL DEFAULT 0,
  pub        TEXT,                   -- JSON seen by everyone at the table
  priv       TEXT,                   -- JSON map tg_id → private state (card, prompts, results)
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS table_actions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT NOT NULL,
  tg_id      INTEGER NOT NULL,
  key        TEXT NOT NULL,          -- which prompt this answers (night step / vote round / …)
  payload    TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS table_actions_code ON table_actions (code, id);
CREATE TABLE IF NOT EXISTS table_chat (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT NOT NULL,
  tg_id      INTEGER NOT NULL,
  name       TEXT,
  text       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS table_chat_code ON table_chat (code, id);
-- invitations to a table shown inside the app (a DM goes out only when the player is offline or does not answer)
CREATE TABLE IF NOT EXISTS table_invites (
  code       TEXT NOT NULL,
  tg_id      INTEGER NOT NULL,
  from_id    INTEGER NOT NULL,
  kind       TEXT NOT NULL,          -- friend | club
  status     TEXT NOT NULL,          -- pending | accepted | declined
  created_at INTEGER NOT NULL,
  dm_at      INTEGER,
  PRIMARY KEY (code, tg_id)
);
-- who is looking at a table right now (card notices go only to players who are not)
CREATE TABLE IF NOT EXISTS table_seen (
  code       TEXT NOT NULL,
  tg_id      INTEGER NOT NULL,
  seen_at    INTEGER NOT NULL,
  PRIMARY KEY (code, tg_id)
);
-- city from the player's own profile (shown at the table)
CREATE TABLE IF NOT EXISTS user_cities (
  tg_id      INTEGER PRIMARY KEY,
  city       TEXT,
  updated_at INTEGER NOT NULL
);

-- per-table options (v31): the creator may sit as a player and invite someone else to host; the format chosen for the table
CREATE TABLE IF NOT EXISTS lobby_opts (
  code       TEXT PRIMARY KEY,
  host_plays INTEGER NOT NULL DEFAULT 0,
  online     INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- per-table metadata (v33): the creator's app language gives the table its flag (finder, waiting room, Discord channel)
CREATE TABLE IF NOT EXISTS lobby_meta (
  code       TEXT PRIMARY KEY,
  creator_id INTEGER NOT NULL,
  lang       TEXT NOT NULL DEFAULT 'ru',
  updated_at INTEGER NOT NULL
);
-- Discord voice room of an online table (v33): seats + 1 (the host), an 8-hour invite, the host's "everyone has voice" confirmation
CREATE TABLE IF NOT EXISTS table_voice (
  code       TEXT PRIMARY KEY,
  channel_id TEXT,
  invite     TEXT,
  seats      INTEGER NOT NULL DEFAULT 0,
  confirmed  INTEGER NOT NULL DEFAULT 0,
  status     TEXT NOT NULL,          -- on | error | deleted
  error      TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
-- players who marked "I'm on voice"
CREATE TABLE IF NOT EXISTS table_voice_ok (
  code       TEXT NOT NULL,
  tg_id      INTEGER NOT NULL,
  at         INTEGER NOT NULL,
  PRIMARY KEY (code, tg_id)
);
-- Discord server integration (v33.1): cached webhook ids/tokens, and the messages posted for each table (announcement edited as players sit, result once)
CREATE TABLE IF NOT EXISTS discord_cfg (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS discord_posts (
  code       TEXT NOT NULL,
  kind       TEXT NOT NULL,          -- table | result
  message_id TEXT,
  hash       TEXT,
  seats      INTEGER,
  final      INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (code, kind)
);
-- Telegram channel posts (v34): drafts from posts/ in the repository, approved by an admin in the bot, published at slot_at by the cron
CREATE TABLE IF NOT EXISTS channel_posts (
  id          TEXT PRIMARY KEY,      -- file name, e.g. 2026-10-14-12
  slot_at     INTEGER NOT NULL,      -- unix time to publish
  lang        TEXT NOT NULL,
  rubric      TEXT,
  text        TEXT NOT NULL,         -- Telegram HTML
  status      TEXT NOT NULL,         -- draft | approved | posting | posted | skipped | failed
  admin_msgs  TEXT,                  -- JSON [{chat, msg}] of the draft cards
  channel_msg INTEGER,
  error       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS channel_posts_due ON channel_posts (status, slot_at);
-- Discord server analytics (v35): members seen by the bot (polled every minute), which invite brought them, the Telegram account linked to them
CREATE TABLE IF NOT EXISTS discord_members (
  user_id     TEXT PRIMARY KEY,
  username    TEXT,
  display     TEXT,
  status      TEXT NOT NULL,          -- in | left
  joined_at   INTEGER,
  left_at     INTEGER,
  invite_code TEXT,
  via         TEXT,                   -- human-readable source: who invited / which link
  inviter_id  TEXT,                   -- Discord user who created the invite
  inviter_tg  INTEGER,                -- Telegram user whose personal app link was used
  tg_id       INTEGER,                -- linked Telegram account (personal app link or /link)
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS discord_members_tg ON discord_members (tg_id);
-- invites of the server: uses as last seen; personal app links carry their Telegram owner
CREATE TABLE IF NOT EXISTS discord_invites (
  code        TEXT PRIMARY KEY,
  uses        INTEGER NOT NULL DEFAULT 0,
  inviter_id  TEXT,
  inviter_name TEXT,
  channel_id  TEXT,
  tg_id       INTEGER,
  kind        TEXT,                   -- app | member | bot
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS discord_invites_tg ON discord_invites (tg_id);
CREATE TABLE IF NOT EXISTS discord_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT NOT NULL,          -- join | leave
  user_id     TEXT NOT NULL,
  invite_code TEXT,
  via         TEXT,
  inviter_id  TEXT,
  inviter_tg  INTEGER,
  at          INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS discord_events_at ON discord_events (at);
-- /link: a one-time token that opens the Telegram bot and ties the Discord user to that Telegram account
CREATE TABLE IF NOT EXISTS discord_links (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  username    TEXT,
  created_at  INTEGER NOT NULL
);
-- player growth (v42): where each player came from (first contact with the bot or the app) and the name they play under
CREATE TABLE IF NOT EXISTS player_track (
  tg_id      INTEGER PRIMARY KEY,
  source     TEXT,                   -- ref | friend | table | post | channel | ads | site | discord | app | bot | other; NULL = joined before tracking
  detail     TEXT,                   -- inviter tg id / table code / channel post id / ad tag / site language
  param      TEXT,                   -- the raw /start or startapp parameter
  game_name  TEXT,                   -- the player's name in the last reported game
  game_at    INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS player_track_source ON player_track (source);
-- people who opened the bot through a tracked link (button under a channel post, ads, site, Discord): one row per link and person
CREATE TABLE IF NOT EXISTS start_hits (
  param      TEXT NOT NULL,
  tg_id      INTEGER NOT NULL,
  is_new     INTEGER NOT NULL DEFAULT 0,   -- 1 = the person's first contact with the bot came through this link
  hits       INTEGER NOT NULL DEFAULT 1,
  first_at   INTEGER NOT NULL,
  last_at    INTEGER NOT NULL,
  PRIMARY KEY (param, tg_id)
);
CREATE INDEX IF NOT EXISTS start_hits_last ON start_hits (last_at);
CREATE INDEX IF NOT EXISTS lobby_players_tg ON lobby_players (tg_id, joined_at);
CREATE INDEX IF NOT EXISTS users_created ON users (created_at);
-- a picture above a channel post (front matter "image:"), shown as a large link preview
CREATE TABLE IF NOT EXISTS channel_post_media (
  id         TEXT PRIMARY KEY,       -- channel_posts.id
  image      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
-- Broadcast to every player (broadcast.js): /broadcast → preview to the admin → "Разослать" → portions from the minute cron
CREATE TABLE IF NOT EXISTS broadcasts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT NOT NULL,          -- invite (built-in channel + chat invitation, per language) | custom (the admin's text)
  text        TEXT,                   -- Telegram HTML of a custom broadcast
  status      TEXT NOT NULL,          -- preview | sending | stopped | done | cancelled
  created_by  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  started_at  INTEGER,
  finished_at INTEGER,
  admin_chat  INTEGER,                -- the control card with the progress
  admin_msg   INTEGER,
  retry_at    INTEGER,                -- Telegram flood control: not before this time
  error       TEXT
);
CREATE TABLE IF NOT EXISTS broadcast_queue (
  bid     INTEGER NOT NULL,           -- broadcasts.id
  tg_id   INTEGER NOT NULL,
  lang    TEXT,
  status  TEXT NOT NULL,              -- pending | sent | blocked (blocked the bot / never started it) | failed
  error   TEXT,
  at      INTEGER,
  PRIMARY KEY (bid, tg_id)
);
CREATE INDEX IF NOT EXISTS broadcast_queue_pending ON broadcast_queue (bid, status);
-- Security (v44, security.js): events (IPs only as a salted hash, never the address), per-minute counters, incidents, bans
CREATE TABLE IF NOT EXISTS security_events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  at       INTEGER NOT NULL,
  type     TEXT NOT NULL,              -- auth_forged | webhook_forged | flood_ip | rate_limit | scrape | xss_attempt | admin:<action> | …
  severity TEXT NOT NULL,              -- info | low | medium | high | critical
  ip       TEXT,                       -- salted SHA-256 of the IP, 12 hex
  tg_id    INTEGER,
  path     TEXT,
  country  TEXT,
  n        INTEGER NOT NULL DEFAULT 1, -- events of the same type and source folded into this row (one row per minute)
  detail   TEXT
);
CREATE INDEX IF NOT EXISTS security_events_at ON security_events (at);
CREATE INDEX IF NOT EXISTS security_events_type ON security_events (type, at);
CREATE TABLE IF NOT EXISTS security_stats (
  minute INTEGER NOT NULL,             -- unix time / 60
  key    TEXT NOT NULL,                -- req | req:api | req:webhook | rl | blocked | 5xx | host:<name> | ev:<type>
  n      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (minute, key)
);
CREATE TABLE IF NOT EXISTS security_incidents (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  kind           TEXT NOT NULL,        -- see KINDS in security.js
  severity       TEXT NOT NULL,
  status         TEXT NOT NULL,        -- open | closed (30 quiet minutes)
  opened_at      INTEGER NOT NULL,
  last_at        INTEGER NOT NULL,
  closed_at      INTEGER,
  count          INTEGER NOT NULL DEFAULT 0,
  summary        TEXT,
  actions        TEXT,                 -- JSON list of what was done automatically
  notified_at    INTEGER,
  notified_count INTEGER,
  acked_by       INTEGER,
  acked_at       INTEGER
);
CREATE INDEX IF NOT EXISTS security_incidents_open ON security_incidents (status, kind);
CREATE TABLE IF NOT EXISTS security_bans (
  key        TEXT PRIMARY KEY,         -- ip:<hash> | tg:<id>
  until      INTEGER NOT NULL,
  reason     TEXT,
  by         TEXT,                     -- auto | admin:<id> | agent
  created_at INTEGER NOT NULL
);
-- Privacy (v44): a player's choices — no broadcast messages (/unsubscribe); /support messages per day
CREATE TABLE IF NOT EXISTS user_prefs (
  tg_id        INTEGER PRIMARY KEY,
  no_news      INTEGER NOT NULL DEFAULT 0,
  support_day  INTEGER,
  support_n    INTEGER NOT NULL DEFAULT 0,
  export_at    INTEGER,
  updated_at   INTEGER NOT NULL
);
-- Social media (v45): Instagram + a Facebook Page (platform 'meta') and TikTok, connected by an admin with /social in the bot.
-- Tokens are sealed (AES-GCM, key derived from BOT_TOKEN); the "Social" workflow gets them per run through POST /social/creds.
CREATE TABLE IF NOT EXISTS social_accounts (
  platform     TEXT PRIMARY KEY,       -- meta | tiktok
  account_id   TEXT,                   -- Facebook Page id | TikTok open_id
  name         TEXT,                   -- Page name | TikTok display name
  info         TEXT,                   -- JSON without tokens: linked Instagram account, pages, granted permissions / scope
  secret       TEXT NOT NULL,          -- sealed JSON with the tokens
  expires_at   INTEGER,                -- TikTok: end of the refresh token
  connected_by INTEGER,                -- admin's Telegram id
  updated_at   INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS social_states (   -- one-use consent links from /social (30 minutes)
  state      TEXT PRIMARY KEY,
  platform   TEXT NOT NULL,
  tg_id      INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS social_posts (    -- what the workflow published: social/posts/<id>.md
  id          TEXT PRIMARY KEY,
  rubric      TEXT,
  ig_id       TEXT, ig_url TEXT, ig_status TEXT,   -- status: published | error | deleted
  fb_id       TEXT, fb_url TEXT, fb_status TEXT,
  tt_id       TEXT, tt_status TEXT,                -- PUBLISH_COMPLETE | SEND_TO_USER_INBOX | telegram (posted by hand) | error
  video_bytes INTEGER,
  created_at  INTEGER NOT NULL
);

-- Meta ads (15.10.2026): paid ads in Instagram / Facebook (ads.js). A visit of the ad landing page (mafiapro.app/uk/dnipro/) mints a token for the bot link
-- t.me/<bot>?start=fb_<src>_<token>; the bot ties it to the player and (new players only) sends Meta a "Lead". IP, browser and Meta ids
-- are kept only for that match: erased after 7 days (runAdsCron); rows after 180 days.
CREATE TABLE IF NOT EXISTS ad_clicks (
  token      TEXT PRIMARY KEY,
  src        TEXT NOT NULL,                -- campaign tag: dnp (Dnipro), ua, am
  ad_id      TEXT,                         -- Meta ad id ({{ad.id}} in the ad's link)
  fbc        TEXT, fbp TEXT,               -- Meta click id / browser id
  ip         TEXT, ua TEXT,                -- for the Conversions API match only
  tg_id      INTEGER,                      -- who opened the bot with this token
  is_new     INTEGER NOT NULL DEFAULT 0,
  lead_sent  INTEGER NOT NULL DEFAULT 0,   -- 1 sent to Meta, 2 failed
  created_at INTEGER NOT NULL,
  started_at INTEGER
);
CREATE INDEX IF NOT EXISTS ad_clicks_created ON ad_clicks (created_at);
CREATE INDEX IF NOT EXISTS ad_clicks_tg ON ad_clicks (tg_id);
CREATE INDEX IF NOT EXISTS ad_clicks_ip ON ad_clicks (ip, created_at);
