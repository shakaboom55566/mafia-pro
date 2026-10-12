/* ============================================================
   Mafia Pro backend — Cloudflare Worker + D1.
   - POST /webhook            Telegram updates (guarded by X-Telegram-Bot-Api-Secret-Token)
   - POST /api/me             who am I + purchases + rating (initData)
   - POST /api/invoice        create a Telegram Stars invoice link (initData, kind, id, title, description)
   - POST /api/game/result    record a finished game, update ratings of Telegram-linked players
   - POST /api/lobby          open a table: players join via t.me/<bot>?start=join_<code>
   - POST /api/lobby/status   who has joined
   - POST /api/lobby/deal     send each player their card in a private message
   - POST /api/friends        my friends + my invite link (t.me/<bot>?start=friend_<code>)
   - POST /api/friends/accept accept an invite code opened inside the Mini App (?startapp=friend_<code>)
   - POST /api/friends/remove drop a friend (both directions)
   - POST /api/friends/invite DM selected friends a "join table" button for my open lobby
   - GET  /api/leaderboard    top ratings (public)
   - GET  /                   health
   ============================================================ */
import { Bot, verifyInitData, esc } from './tg.js';
import { t, pickLang } from './texts.js';

const VERSION = '0.1.0';
const KINDS = ['role', 'scenario', 'pack'];
const ID_RE = /^[a-z][a-z0-9_]{1,31}$/;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const now = () => Math.floor(Date.now() / 1000);

function stars(env, kind) { // prices in Telegram Stars; overridable with STARS_ROLE / STARS_SCENARIO / STARS_PACK vars
  const d = { role: 100, scenario: 500, pack: 1750 };
  const v = Number(env['STARS_' + kind.toUpperCase()]); return Number.isFinite(v) && v > 0 ? Math.round(v) : d[kind];
}
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra) });
}
function corsHeaders(env, req) {
  const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.get('Origin') || '';
  const ok = allowed.length === 0 || allowed.includes(origin) || allowed.includes('*');
  return ok ? { 'Access-Control-Allow-Origin': origin || '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' } : {};
}
function randomCode(n = 6) { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join(''); }
function randomId(n = 16) { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, '0')).join(''); }

/* ---------- users / data ---------- */
async function touchUser(env, u) {
  const ts = now();
  await env.DB.prepare(`INSERT INTO users (tg_id, username, first_name, last_name, lang, photo_url, created_at, seen_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
    ON CONFLICT(tg_id) DO UPDATE SET username = ?2, first_name = ?3, last_name = ?4, lang = ?5, photo_url = COALESCE(?6, photo_url), seen_at = ?7`)
    .bind(u.id, u.username || null, u.first_name || null, u.last_name || null, u.language_code || null, u.photo_url || null, ts).run();
}
async function ownedFor(env, tgId) {
  const rows = (await env.DB.prepare('SELECT kind, item FROM purchases WHERE tg_id = ?1 AND status = ?2').bind(tgId, 'paid').all()).results || [];
  const owned = { roles: [], scenarios: [], packs: [] };
  for (const r of rows) { const k = r.kind === 'role' ? 'roles' : r.kind === 'scenario' ? 'scenarios' : 'packs'; if (!owned[k].includes(r.item)) owned[k].push(r.item); }
  return owned;
}
async function ratingFor(env, tgId) {
  const r = await env.DB.prepare('SELECT points, games, wins, hosted FROM ratings WHERE tg_id = ?1').bind(tgId).first();
  return r ? { points: r.points, games: r.games, wins: r.wins, hosted: r.hosted } : { points: 0, games: 0, wins: 0, hosted: 0 };
}
async function bumpRating(env, tgId, dPoints, dGames, dWins, dHosted) {
  await env.DB.prepare(`INSERT INTO ratings (tg_id, points, games, wins, hosted, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    ON CONFLICT(tg_id) DO UPDATE SET points = points + ?2, games = games + ?3, wins = wins + ?4, hosted = hosted + ?5, updated_at = ?6`)
    .bind(tgId, dPoints | 0, dGames | 0, dWins | 0, dHosted | 0, now()).run();
}

const displayName = u => [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || String(u.id);
async function inviteCodeFor(env, tgId) {
  const r = await env.DB.prepare('SELECT code FROM invites WHERE tg_id = ?1').bind(tgId).first();
  if (r) return r.code;
  for (let i = 0; i < 5; i++) {
    const code = randomCode(8);
    const ins = await env.DB.prepare('INSERT OR IGNORE INTO invites (code, tg_id, created_at) VALUES (?1, ?2, ?3)').bind(code, tgId, now()).run();
    if (ins.meta && ins.meta.changes > 0) return code;
    const again = await env.DB.prepare('SELECT code FROM invites WHERE tg_id = ?1').bind(tgId).first(); if (again) return again.code;
  }
  throw new Error('invite code');
}
async function befriend(env, a, b) { // symmetric; returns true when the pair is new
  if (!a || !b || a === b) return false;
  const ts = now();
  const r = await env.DB.prepare('INSERT OR IGNORE INTO friends (tg_id, friend_id, created_at) VALUES (?1, ?2, ?3)').bind(a, b, ts).run();
  await env.DB.prepare('INSERT OR IGNORE INTO friends (tg_id, friend_id, created_at) VALUES (?1, ?2, ?3)').bind(b, a, ts).run();
  return !!(r.meta && r.meta.changes > 0);
}
async function userRow(env, tgId) { return env.DB.prepare('SELECT tg_id, username, first_name, last_name, lang, photo_url FROM users WHERE tg_id = ?1').bind(tgId).first(); }
const rowName = r => (r ? ([r.first_name, r.last_name].filter(Boolean).join(' ') || r.username || String(r.tg_id)) : '');
async function friendsOf(env, tgId) {
  const rows = (await env.DB.prepare(`SELECT u.tg_id, u.username, u.first_name, u.last_name, u.lang, u.photo_url, f.created_at, r.points, r.games, r.wins
    FROM friends f JOIN users u ON u.tg_id = f.friend_id LEFT JOIN ratings r ON r.tg_id = f.friend_id WHERE f.tg_id = ?1 ORDER BY f.created_at DESC`).bind(tgId).all()).results || [];
  return rows.map(r => ({ tgId: r.tg_id, name: rowName(r), username: r.username || '', photo: r.photo_url || '', lang: r.lang || 'ru', since: r.created_at, points: 1000 + (r.points || 0), games: r.games || 0, wins: r.wins || 0 }));
}
let botUsernameCache = null;
async function botUsername(env, bot) {
  if (env.BOT_USERNAME) return env.BOT_USERNAME;
  if (botUsernameCache) return botUsernameCache;
  const me = await bot.call('getMe'); if (me && me.ok && me.result && me.result.username) botUsernameCache = me.result.username;
  return botUsernameCache || 'MafiaProBot';
}

/* ---------- Telegram updates ---------- */
async function handleUpdate(env, bot, upd) {
  const msg = upd.message;
  if (upd.pre_checkout_query) return onPreCheckout(env, bot, upd.pre_checkout_query);
  if (msg && msg.successful_payment) return onPaid(env, bot, msg);
  if (msg && msg.text && msg.chat && msg.chat.type === 'private') return onText(env, bot, msg);
}
async function onText(env, bot, msg) {
  const u = msg.from || {}; const lang = pickLang(u.language_code); const chat = msg.chat.id;
  const text = msg.text.trim();
  await touchUser(env, u);
  const play = bot.playButton(t(lang, 'play'), env.APP_URL);
  const m = /^\/start(?:@\w+)?(?:\s+(\S+))?/.exec(text);
  if (m) {
    const param = m[1] || '';
    const j = /^join_([A-Z0-9]{4,8})$/i.exec(param);
    if (j) return joinLobby(env, bot, chat, u, lang, j[1].toUpperCase());
    const f = /^friend_([A-Z0-9]{6,10})$/i.exec(param);
    if (f) return acceptFriend(env, bot, chat, u, lang, f[1].toUpperCase(), play);
    return bot.send(chat, t(lang, 'welcome'), play);
  }
  if (/^\/(help|rules)/.test(text)) return bot.send(chat, t(lang, 'help'), play);
  return bot.send(chat, t(lang, 'unknown'), play);
}
async function acceptFriend(env, bot, chat, u, lang, code, play) {
  const inv = await env.DB.prepare('SELECT tg_id FROM invites WHERE code = ?1').bind(code).first();
  if (!inv) return bot.send(chat, t(lang, 'inviteNotFound'), play);
  if (inv.tg_id === u.id) return bot.send(chat, t(lang, 'friendSelf'), play);
  const isNew = await befriend(env, u.id, inv.tg_id);
  const inviter = await userRow(env, inv.tg_id);
  await bot.send(chat, t(lang, 'friendAccepted', { name: esc(rowName(inviter) || '…') }), play);
  if (isNew && inviter) { const il = pickLang(inviter.lang); await bot.send(inv.tg_id, t(il, 'friendJoined', { name: esc(displayName(u)) }), bot.playButton(t(il, 'play'), env.APP_URL)); }
}
async function joinLobby(env, bot, chat, u, lang, code) {
  const lobby = await env.DB.prepare('SELECT code, status, host_id FROM lobbies WHERE code = ?1').bind(code).first();
  if (!lobby) return bot.send(chat, t(lang, 'lobbyNotFound', { code }));
  if (lobby.status !== 'open') return bot.send(chat, t(lang, 'lobbyClosed', { code }));
  const name = displayName(u);
  const r = await env.DB.prepare('INSERT OR IGNORE INTO lobby_players (code, tg_id, name, username, lang, joined_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
    .bind(code, u.id, name, u.username || null, lang, now()).run();
  const inserted = r.meta && r.meta.changes > 0;
  await bot.send(chat, t(lang, inserted ? 'joined' : 'alreadyJoined', { code }));
  if (inserted && lobby.host_id !== u.id) { // tell the host who sat down
    const host = await userRow(env, lobby.host_id); const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM lobby_players WHERE code = ?1').bind(code).first('n');
    await bot.send(lobby.host_id, t(pickLang(host && host.lang), 'hostJoined', { code, name: esc(name), n }));
  }
}
async function onPreCheckout(env, bot, q) {
  const p = await env.DB.prepare('SELECT id, status, stars FROM purchases WHERE payload = ?1').bind(q.invoice_payload || '').first();
  const ok = !!p && p.status === 'pending' && q.currency === 'XTR' && Number(q.total_amount) === p.stars;
  const lang = pickLang(q.from && q.from.language_code);
  return bot.call('answerPreCheckoutQuery', ok ? { pre_checkout_query_id: q.id, ok: true } : { pre_checkout_query_id: q.id, ok: false, error_message: t(lang, 'payFail') });
}
async function onPaid(env, bot, msg) {
  const sp = msg.successful_payment; const u = msg.from || {}; const lang = pickLang(u.language_code);
  const r = await env.DB.prepare('UPDATE purchases SET status = ?1, charge_id = ?2, paid_at = ?3 WHERE payload = ?4 AND status = ?5')
    .bind('paid', sp.telegram_payment_charge_id || null, now(), sp.invoice_payload || '', 'pending').run();
  if (!(r.meta && r.meta.changes > 0)) { // unknown payload: still record it so nothing paid is ever lost
    await env.DB.prepare('INSERT OR IGNORE INTO purchases (tg_id, kind, item, stars, payload, status, charge_id, created_at, paid_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)')
      .bind(u.id, 'unknown', 'unknown', Number(sp.total_amount) || 0, sp.invoice_payload || ('orphan_' + randomId(6)), 'paid', sp.telegram_payment_charge_id || null, now()).run();
  }
  return bot.send(msg.chat.id, t(lang, 'paid'), bot.playButton(t(lang, 'play'), env.APP_URL));
}

/* ---------- Mini App API ---------- */
async function auth(env, body) {
  const v = await verifyInitData(body && body.initData, env.BOT_TOKEN);
  if (!v) return null;
  await touchUser(env, v.user);
  return v;
}
async function apiMe(env, bot, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const [owned, rating, code, username] = await Promise.all([ownedFor(env, v.user.id), ratingFor(env, v.user.id), inviteCodeFor(env, v.user.id), botUsername(env, bot)]);
  const u = v.user;
  return json({ ok: true, user: { id: u.id, name: displayName(u), username: u.username || '', lang: u.language_code || '', photo: u.photo_url || '' }, owned, rating, startParam: v.startParam, bot: username, invite: { code, link: `https://t.me/${username}?start=friend_${code}` } });
}
/* ---------- friends ---------- */
async function apiFriends(env, bot, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const [list, code, username] = await Promise.all([friendsOf(env, v.user.id), inviteCodeFor(env, v.user.id), botUsername(env, bot)]);
  return json({ ok: true, friends: list, bot: username, invite: { code, link: `https://t.me/${username}?start=friend_${code}` } });
}
async function apiFriendAccept(env, bot, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const code = String(body.code || '').toUpperCase(); if (!/^[A-Z0-9]{6,10}$/.test(code)) return json({ ok: false, error: 'bad_code' }, 400);
  const inv = await env.DB.prepare('SELECT tg_id FROM invites WHERE code = ?1').bind(code).first();
  if (!inv) return json({ ok: false, error: 'not_found' }, 404);
  if (inv.tg_id === v.user.id) return json({ ok: true, self: true });
  const isNew = await befriend(env, v.user.id, inv.tg_id);
  const inviter = await userRow(env, inv.tg_id);
  if (isNew && inviter) { const il = pickLang(inviter.lang); await bot.send(inv.tg_id, t(il, 'friendJoined', { name: esc(displayName(v.user)) }), bot.playButton(t(il, 'play'), env.APP_URL)); }
  return json({ ok: true, isNew, friend: { tgId: inv.tg_id, name: rowName(inviter) } });
}
async function apiFriendRemove(env, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const fid = Number(body.friendId); if (!fid) return json({ ok: false, error: 'bad_friend' }, 400);
  await env.DB.prepare('DELETE FROM friends WHERE (tg_id = ?1 AND friend_id = ?2) OR (tg_id = ?2 AND friend_id = ?1)').bind(v.user.id, fid).run();
  return json({ ok: true });
}
async function apiFriendInvite(env, bot, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const lobby = await hostLobby(env, v, body); if (!lobby || lobby.status !== 'open') return json({ ok: false, error: 'no_lobby' }, 404);
  const ids = (Array.isArray(body.friendIds) ? body.friendIds : []).map(Number).filter(Boolean).slice(0, 40);
  const mine = new Set((await friendsOf(env, v.user.id)).map(f => f.tgId));
  const username = await botUsername(env, bot); const me = esc(displayName(v.user));
  const sent = [], failed = [];
  for (const fid of ids) {
    if (!mine.has(fid)) { failed.push({ tgId: fid, error: 'not_friend' }); continue; }
    const fr = await userRow(env, fid); const fl = pickLang(fr && fr.lang);
    const r = await bot.send(fid, t(fl, 'friendInvite', { name: me, code: lobby.code }), { reply_markup: { inline_keyboard: [[{ text: t(fl, 'btnJoin', { code: lobby.code }), url: `https://t.me/${username}?start=join_${lobby.code}` }]] } });
    if (r && r.ok) sent.push(fid); else failed.push({ tgId: fid, error: (r && r.description) || 'send_failed' });
  }
  return json({ ok: true, sent, failed });
}
async function apiInvoice(env, bot, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const kind = String(body.kind || ''), item = String(body.id || '');
  if (!KINDS.includes(kind) || !ID_RE.test(item)) return json({ ok: false, error: 'bad_item' }, 400);
  const owned = await ownedFor(env, v.user.id);
  if ((kind === 'role' && owned.roles.includes(item)) || (kind === 'scenario' && owned.scenarios.includes(item)) || (kind === 'pack' && owned.packs.includes(item))) return json({ ok: true, owned: true });
  const amount = stars(env, kind);
  const title = String(body.title || item).slice(0, 32) || item, description = String(body.description || 'Mafia Pro').slice(0, 255) || 'Mafia Pro';
  const payload = 'p_' + randomId(12);
  await env.DB.prepare('INSERT INTO purchases (tg_id, kind, item, stars, payload, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)').bind(v.user.id, kind, item, amount, payload, 'pending', now()).run();
  const r = await bot.call('createInvoiceLink', { title, description, payload, currency: 'XTR', prices: [{ label: title, amount }] });
  if (!r || !r.ok) return json({ ok: false, error: 'telegram', detail: r && r.description }, 502);
  return json({ ok: true, link: r.result, stars: amount, payload });
}
async function apiResult(env, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const g = body.game || {};
  const gameId = String(g.id || '').slice(0, 64); if (!gameId) return json({ ok: false, error: 'bad_game' }, 400);
  const players = Array.isArray(g.players) ? g.players.slice(0, 40) : [];
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO games (game_id, host_id, code, mode, players, winner, summary, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)')
    .bind(gameId, v.user.id, g.code ? String(g.code).slice(0, 8) : null, String(g.mode || '').slice(0, 16), players.length, String(g.winner || '').slice(0, 32), JSON.stringify(players).slice(0, 20000), now()).run();
  const ratings = {};
  if (ins.meta && ins.meta.changes > 0) { // first report of this game → credit the players
    await bumpRating(env, v.user.id, 0, 0, 0, 1);
    for (const p of players) {
      const tgId = Number(p.tgId); if (!tgId) continue;
      const pts = Math.max(-60, Math.min(90, Number(p.points) || 0));
      await bumpRating(env, tgId, pts, 1, p.won ? 1 : 0, 0);
    }
  }
  for (const p of players) { const tgId = Number(p.tgId); if (tgId && !ratings[tgId]) ratings[tgId] = await ratingFor(env, tgId); }
  return json({ ok: true, recorded: !!(ins.meta && ins.meta.changes > 0), ratings });
}
async function apiLobbyCreate(env, bot, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  // one open lobby per host: reuse it
  let lobby = await env.DB.prepare('SELECT code FROM lobbies WHERE host_id = ?1 AND status = ?2 ORDER BY created_at DESC LIMIT 1').bind(v.user.id, 'open').first();
  if (!lobby || body.fresh) {
    if (lobby) await env.DB.prepare('UPDATE lobbies SET status = ?1 WHERE code = ?2').bind('closed', lobby.code).run();
    let code = randomCode(); for (let i = 0; i < 5; i++) { const ex = await env.DB.prepare('SELECT 1 FROM lobbies WHERE code = ?1').bind(code).first(); if (!ex) break; code = randomCode(); }
    await env.DB.prepare('INSERT INTO lobbies (code, host_id, status, created_at) VALUES (?1, ?2, ?3, ?4)').bind(code, v.user.id, 'open', now()).run();
    lobby = { code };
  }
  const username = await botUsername(env, bot);
  return json({ ok: true, code: lobby.code, link: `https://t.me/${username}?start=join_${lobby.code}`, players: await lobbyPlayers(env, lobby.code) });
}
async function lobbyPlayers(env, code) {
  return ((await env.DB.prepare('SELECT tg_id, name, username, lang, joined_at FROM lobby_players WHERE code = ?1 ORDER BY joined_at').bind(code).all()).results || [])
    .map(r => ({ tgId: r.tg_id, name: r.name, username: r.username || '', lang: r.lang || 'ru', joinedAt: r.joined_at }));
}
async function hostLobby(env, v, body) {
  const code = String(body.code || '').toUpperCase(); if (!/^[A-Z0-9]{4,8}$/.test(code)) return null;
  const lobby = await env.DB.prepare('SELECT code, host_id, status FROM lobbies WHERE code = ?1').bind(code).first();
  return lobby && lobby.host_id === v.user.id ? lobby : null;
}
async function apiLobbyStatus(env, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const lobby = await hostLobby(env, v, body); if (!lobby) return json({ ok: false, error: 'no_lobby' }, 404);
  return json({ ok: true, code: lobby.code, status: lobby.status, players: await lobbyPlayers(env, lobby.code) });
}
async function apiLobbyDeal(env, bot, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const lobby = await hostLobby(env, v, body); if (!lobby) return json({ ok: false, error: 'no_lobby' }, 404);
  const members = new Map((await lobbyPlayers(env, lobby.code)).map(p => [p.tgId, p]));
  const cards = Array.isArray(body.cards) ? body.cards.slice(0, 40) : [];
  const sent = [], failed = [];
  for (const c of cards) {
    const tgId = Number(c.tgId); const m = members.get(tgId);
    if (!m) { failed.push({ tgId, error: 'not_in_lobby' }); continue; }
    const text = t(m.lang, 'card', { code: lobby.code, seat: esc(c.seat), text: String(c.text || '').slice(0, 3500) });
    const r = await bot.send(tgId, text);
    if (r && r.ok) sent.push(tgId); else failed.push({ tgId, error: (r && r.description) || 'send_failed' });
  }
  if (sent.length) await env.DB.prepare('UPDATE lobbies SET status = ?1 WHERE code = ?2').bind('dealt', lobby.code).run();
  return json({ ok: true, sent, failed });
}
async function apiLeaderboard(env, url) {
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 20));
  const rows = (await env.DB.prepare('SELECT r.tg_id, r.points, r.games, r.wins, u.first_name, u.username, u.photo_url FROM ratings r LEFT JOIN users u ON u.tg_id = r.tg_id WHERE r.games > 0 ORDER BY r.points DESC, r.wins DESC LIMIT ?1').bind(limit).all()).results || [];
  return json({ ok: true, top: rows.map((r, i) => ({ rank: i + 1, tgId: r.tg_id, name: r.first_name || r.username || '—', username: r.username || '', photo: r.photo_url || '', points: 1000 + r.points, games: r.games, wins: r.wins })) });
}

/* ---------- router ---------- */
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url); const path = url.pathname.replace(/\/+$/, '') || '/';
    const bot = new Bot(env);
    try {
      if (path === '/webhook' && req.method === 'POST') {
        if (!env.WEBHOOK_SECRET || req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
        let upd = null; try { upd = await req.json(); } catch (e) { return new Response('bad request', { status: 400 }); }
        try { await handleUpdate(env, bot, upd); } catch (e) { console.error('update failed', e && e.stack || e); }
        return new Response('ok'); // always 200 so Telegram does not retry forever
      }
      if (path.startsWith('/api/')) {
        const cors = corsHeaders(env, req);
        if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
        const wrap = p => p.then(r => { for (const [k, v] of Object.entries(cors)) r.headers.set(k, v); return r; });
        if (req.method === 'GET' && path === '/api/leaderboard') return wrap(apiLeaderboard(env, url));
        if (req.method !== 'POST') return wrap(Promise.resolve(json({ ok: false, error: 'method' }, 405)));
        let body = null; try { body = await req.json(); } catch (e) { return wrap(Promise.resolve(json({ ok: false, error: 'bad_json' }, 400))); }
        switch (path) {
          case '/api/me': return wrap(apiMe(env, bot, body));
          case '/api/friends': return wrap(apiFriends(env, bot, body));
          case '/api/friends/accept': return wrap(apiFriendAccept(env, bot, body));
          case '/api/friends/remove': return wrap(apiFriendRemove(env, body));
          case '/api/friends/invite': return wrap(apiFriendInvite(env, bot, body));
          case '/api/invoice': return wrap(apiInvoice(env, bot, body));
          case '/api/game/result': return wrap(apiResult(env, body));
          case '/api/lobby': return wrap(apiLobbyCreate(env, bot, body));
          case '/api/lobby/status': return wrap(apiLobbyStatus(env, body));
          case '/api/lobby/deal': return wrap(apiLobbyDeal(env, bot, body));
          default: return wrap(Promise.resolve(json({ ok: false, error: 'not_found' }, 404)));
        }
      }
      if (path === '/' && req.method === 'GET') return json({ ok: true, service: 'mafia-pro-api', version: VERSION, app: env.APP_URL || null });
      return new Response('not found', { status: 404 });
    } catch (e) {
      console.error(e && e.stack || e);
      return json({ ok: false, error: 'internal' }, 500);
    }
  }
};
