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
   - POST /api/friends/search find players by @username / name (who opened the bot)
   - POST /api/friends/request send a friend request (accepted in the bot or in the app)
   - POST /api/friends/requests incoming / outgoing requests
   - POST /api/friends/respond accept or decline a request in the app
   - POST /api/ping            presence heartbeat (online = seen in the last few minutes)
   - POST /api/profile         a player's public game profile (rating, per-role stats, recent games)
   - POST /api/players         everyone who opened the bot: name, @username, presence, rating (paged, optional prefix filter)
   - POST /api/admin/grant|revoke|grants  full access for a player (admins only, ADMIN_IDS var)
   - POST /api/referrals       my referral link, invited / qualified counts, milestones, credits
   - POST /api/partner         partner programme: status, link, stats, earnings; /apply to join
   - POST /api/admin/partners|partner  list / approve / reject partner applications
   - POST /api/clubs, /api/club, /api/club/apply|update|join|leave|respond|invite|kick|approve|requests, /api/club/chat, /api/club/chat/send
   - POST /api/admin/clubs|club    list / approve / reject club applications
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
const ONLINE_SEC = 180; // seen within 3 minutes = online (the app pings every minute while open)
const isAdmin = (env, tgId) => String(env.ADMIN_IDS || '').split(',').map(x => x.trim()).filter(Boolean).includes(String(tgId));
async function grantFor(env, tgId) { const g = await env.DB.prepare('SELECT until, granted_by FROM grants WHERE tg_id = ?1 AND until > ?2').bind(tgId, now()).first(); return g ? { until: g.until } : null; }
async function ownedFor(env, tgId) {
  const rows = (await env.DB.prepare("SELECT kind, item FROM purchases WHERE tg_id = ?1 AND status IN ('paid', 'reward')").bind(tgId).all()).results || [];
  const owned = { roles: [], scenarios: [], packs: [], allUntil: 0 };
  for (const r of rows) { const k = r.kind === 'role' ? 'roles' : r.kind === 'scenario' ? 'scenarios' : 'packs'; if (!owned[k].includes(r.item)) owned[k].push(r.item); }
  const g = await grantFor(env, tgId); if (g) owned.allUntil = g.until * 1000;
  return owned;
}
const fmtDate = (sec, lang) => { try { return new Date(sec * 1000).toLocaleDateString({ ru: 'ru-RU', uk: 'uk-UA', en: 'en-GB', pl: 'pl-PL', hy: 'hy-AM' }[lang] || 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return new Date(sec * 1000).toISOString().slice(0, 10); } };
async function findUser(env, q) { // "@name", "name" or a numeric id
  q = String(q || '').trim().replace(/^@/, ''); if (!q) return null;
  if (/^\d+$/.test(q)) return userRow(env, Number(q));
  return env.DB.prepare('SELECT tg_id, username, first_name, last_name, lang, photo_url FROM users WHERE lower(username) = ?1').bind(q.toLowerCase()).first();
}
async function setGrant(env, bot, adminId, target, days, revoke) {
  const lang = pickLang(target.lang);
  if (revoke) { await env.DB.prepare('DELETE FROM grants WHERE tg_id = ?1').bind(target.tg_id).run(); await bot.send(target.tg_id, t(lang, 'grantRevoked')); return null; }
  const until = now() + Math.max(1, Math.min(3650, days | 0)) * 86400;
  await env.DB.prepare('INSERT INTO grants (tg_id, until, granted_by, created_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(tg_id) DO UPDATE SET until = ?2, granted_by = ?3, created_at = ?4').bind(target.tg_id, until, adminId, now()).run();
  await bot.send(target.tg_id, t(lang, 'grantGiven', { until: fmtDate(until, lang) }), bot.playButton(t(lang, 'play'), env.APP_URL));
  return until;
}
async function listGrants(env) {
  return ((await env.DB.prepare('SELECT g.tg_id, g.until, g.created_at, u.username, u.first_name, u.last_name FROM grants g LEFT JOIN users u ON u.tg_id = g.tg_id WHERE g.until > ?1 ORDER BY g.until').bind(now()).all()).results || [])
    .map(r => ({ tgId: r.tg_id, name: rowName(r) || String(r.tg_id), username: r.username || '', until: r.until * 1000 }));
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
  const rows = (await env.DB.prepare(`SELECT u.tg_id, u.username, u.first_name, u.last_name, u.lang, u.photo_url, u.seen_at, f.created_at, r.points, r.games, r.wins
    FROM friends f JOIN users u ON u.tg_id = f.friend_id LEFT JOIN ratings r ON r.tg_id = f.friend_id WHERE f.tg_id = ?1 ORDER BY (u.seen_at > ?2) DESC, u.seen_at DESC`).bind(tgId, now() - ONLINE_SEC).all()).results || [];
  const ts = now();
  return rows.map(r => ({ tgId: r.tg_id, name: rowName(r), username: r.username || '', photo: r.photo_url || '', lang: r.lang || 'ru', since: r.created_at, points: 1000 + (r.points || 0), games: r.games || 0, wins: r.wins || 0, online: ts - (r.seen_at || 0) <= ONLINE_SEC, seenAgo: Math.max(0, ts - (r.seen_at || 0)) }));
}
let botUsernameCache = null;
/* ---------- referrals & rewards ---------- */
const REF_WELCOME_DAYS = 7;
// milestones by number of qualified invitees (played at least one game through the bot)
const MILESTONES = [
  { n: 1, kind: 'days', days: 7 }, { n: 3, kind: 'days', days: 30 }, { n: 5, kind: 'role' }, { n: 10, kind: 'scenario' }, { n: 25, kind: 'pack', item: 'diplomacy' }, { n: 50, kind: 'days', days: 365 }
];
async function extendGrant(env, tgId, days, by) {
  const cur = await env.DB.prepare('SELECT until FROM grants WHERE tg_id = ?1').bind(tgId).first();
  const base = Math.max(now(), cur ? cur.until : 0); const until = base + days * 86400;
  await env.DB.prepare('INSERT INTO grants (tg_id, until, granted_by, created_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(tg_id) DO UPDATE SET until = ?2, granted_by = ?3, created_at = ?4').bind(tgId, until, by, now()).run();
  return until;
}
async function addCredit(env, tgId, kind, n = 1) { await env.DB.prepare('INSERT INTO credits (tg_id, kind, count) VALUES (?1, ?2, ?3) ON CONFLICT(tg_id, kind) DO UPDATE SET count = count + ?3').bind(tgId, kind, n).run(); }
async function creditsFor(env, tgId) { const rows = (await env.DB.prepare('SELECT kind, count FROM credits WHERE tg_id = ?1').bind(tgId).all()).results || []; const c = { role: 0, scenario: 0 }; rows.forEach(r => { c[r.kind] = r.count; }); return c; }
/* attribute a brand-new user to an inviter (by invite code); gives the invitee a welcome trial */
async function attachReferral(env, bot, u, code, lang) {
  const inv = await env.DB.prepare('SELECT tg_id FROM invites WHERE code = ?1').bind(code).first();
  if (!inv || inv.tg_id === u.id) return false;
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO referrals (tg_id, ref_by, code, created_at) VALUES (?1, ?2, ?3, ?4)').bind(u.id, inv.tg_id, code, now()).run();
  if (!(ins.meta && ins.meta.changes > 0)) return false;
  await extendGrant(env, u.id, REF_WELCOME_DAYS, inv.tg_id);
  const by = await userRow(env, inv.tg_id);
  await bot.send(u.id, t(lang, 'refWelcome', { name: esc(rowName(by) || 'Mafia Pro') }), bot.playButton(t(lang, 'play'), env.APP_URL));
  return true;
}
/* the invitee played: count it once, then pay the inviter every milestone reached */
async function qualifyReferral(env, bot, tgId) {
  const r = await env.DB.prepare('SELECT ref_by, qualified_at FROM referrals WHERE tg_id = ?1').bind(tgId).first();
  if (!r || r.qualified_at) return;
  await env.DB.prepare('UPDATE referrals SET qualified_at = ?1 WHERE tg_id = ?2').bind(now(), tgId).run();
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM referrals WHERE ref_by = ?1 AND qualified_at IS NOT NULL').bind(r.ref_by).first('n');
  const inviter = await userRow(env, r.ref_by); const il = pickLang(inviter && inviter.lang); const who = await userRow(env, tgId);
  await bot.send(r.ref_by, t(il, 'refQualified', { name: esc(rowName(who)), n }));
  for (const m of MILESTONES) {
    if (n < m.n) continue;
    const done = await env.DB.prepare('INSERT OR IGNORE INTO milestones (tg_id, level, created_at) VALUES (?1, ?2, ?3)').bind(r.ref_by, m.n, now()).run();
    if (!(done.meta && done.meta.changes > 0)) continue;
    let reward = '';
    if (m.kind === 'days') { await extendGrant(env, r.ref_by, m.days, 0); reward = t(il, 'rwDays', { d: m.days }); }
    else if (m.kind === 'role') { await addCredit(env, r.ref_by, 'role'); reward = t(il, 'rwCard'); }
    else if (m.kind === 'scenario') { await addCredit(env, r.ref_by, 'scenario'); reward = t(il, 'rwScen'); }
    else if (m.kind === 'pack') { await env.DB.prepare('INSERT OR IGNORE INTO purchases (tg_id, kind, item, stars, payload, status, created_at, paid_at) VALUES (?1, ?2, ?3, 0, ?4, ?5, ?6, ?6)').bind(r.ref_by, 'pack', m.item, 'rw_' + r.ref_by + '_' + m.n, 'reward', now()).run(); reward = t(il, 'rwPack'); }
    await bot.send(r.ref_by, t(il, 'refReward', { n: m.n, reward }), bot.playButton(t(il, 'play'), env.APP_URL));
  }
}
async function referralStats(env, tgId) {
  const rows = (await env.DB.prepare('SELECT r.tg_id, r.created_at, r.qualified_at, u.first_name, u.last_name, u.username FROM referrals r LEFT JOIN users u ON u.tg_id = r.tg_id WHERE r.ref_by = ?1 ORDER BY r.created_at DESC LIMIT 200').bind(tgId).all()).results || [];
  const qualified = rows.filter(r => r.qualified_at).length;
  const next = MILESTONES.find(m => m.n > qualified) || null;
  return { invited: rows.length, qualified, next, milestones: MILESTONES, credits: await creditsFor(env, tgId), list: rows.slice(0, 50).map(r => ({ tgId: r.tg_id, name: rowName(r) || String(r.tg_id), username: r.username || '', at: r.created_at * 1000, qualified: !!r.qualified_at })) };
}
/* ---------- clubs ---------- */
const CLUB_LOGO_MAX = 24000; // data URL bytes (the app resizes to 96px)
async function clubRow(env, id) { return env.DB.prepare('SELECT * FROM clubs WHERE id = ?1').bind(id).first(); }
async function membershipOf(env, tgId) { return env.DB.prepare('SELECT m.club_id, m.role, c.name, c.status FROM club_members m JOIN clubs c ON c.id = m.club_id WHERE m.tg_id = ?1').bind(tgId).first(); }
async function clubMembers(env, clubId) {
  const ts = now();
  const rows = (await env.DB.prepare('SELECT m.tg_id, m.role, m.joined_at, u.username, u.first_name, u.last_name, u.photo_url, u.seen_at, r.points, r.games, r.wins FROM club_members m LEFT JOIN users u ON u.tg_id = m.tg_id LEFT JOIN ratings r ON r.tg_id = m.tg_id WHERE m.club_id = ?1 ORDER BY (m.role = ?2) DESC, (u.seen_at > ?3) DESC, u.seen_at DESC').bind(clubId, 'owner', ts - ONLINE_SEC).all()).results || [];
  return rows.map(r => ({ tgId: r.tg_id, role: r.role, name: rowName(r) || String(r.tg_id), username: r.username || '', photo: r.photo_url || '', online: ts - (r.seen_at || 0) <= ONLINE_SEC, seenAgo: Math.max(0, ts - (r.seen_at || 0)), points: 1000 + (r.points || 0), games: r.games || 0, wins: r.wins || 0, joinedAt: r.joined_at * 1000 }));
}
async function clubCard(env, c) {
  const ts = now();
  const m = await env.DB.prepare('SELECT COUNT(*) AS n, SUM(CASE WHEN u.seen_at > ?2 THEN 1 ELSE 0 END) AS online FROM club_members m LEFT JOIN users u ON u.tg_id = m.tg_id WHERE m.club_id = ?1').bind(c.id, ts - ONLINE_SEC).first();
  return { id: c.id, name: c.name, city: c.city || '', about: c.about || '', link: c.link || '', logo: c.logo || '', ownerId: c.owner_id, status: c.status, members: m.n || 0, online: m.online || 0, createdAt: c.created_at * 1000 };
}
async function addMember(env, clubId, tgId, role) { // one club per player: an existing membership is replaced only when explicitly leaving
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO club_members (tg_id, club_id, role, joined_at) VALUES (?1, ?2, ?3, ?4)').bind(tgId, clubId, role, now()).run();
  return !!(ins.meta && ins.meta.changes > 0);
}
async function clubSystem(env, clubId, text) { await env.DB.prepare('INSERT INTO club_messages (club_id, tg_id, kind, text, created_at) VALUES (?1, 0, ?2, ?3, ?4)').bind(clubId, 'system', text, now()).run(); }
function cleanClubFields(body) {
  const name = String(body.name || '').trim().slice(0, 48), city = String(body.city || '').trim().slice(0, 48), about = String(body.about || '').trim().slice(0, 300), link = String(body.link || '').trim().slice(0, 160);
  let logo = String(body.logo || ''); if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo) || logo.length > CLUB_LOGO_MAX) logo = '';
  return { name, city, about, link, logo };
}
async function notifyAdmins(env, bot, key, vars) {
  for (const adm of String(env.ADMIN_IDS || '').split(',').map(x => Number(x.trim())).filter(Boolean)) { const a = await userRow(env, adm); try { await bot.send(adm, t(pickLang(a && a.lang), key, vars)); } catch (e) {} }
}
async function apiClubs(env, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const rows = (await env.DB.prepare('SELECT * FROM clubs WHERE status = ?1 ORDER BY created_at').bind('active').all()).results || [];
  const clubs = []; for (const c of rows) clubs.push(await clubCard(env, c));
  clubs.sort((a, b) => b.online - a.online || b.members - a.members || a.name.localeCompare(b.name));
  const mine = await membershipOf(env, v.user.id);
  const own = await env.DB.prepare('SELECT id, name, status FROM clubs WHERE owner_id = ?1 ORDER BY created_at DESC LIMIT 1').bind(v.user.id).first();
  const invites = (await env.DB.prepare('SELECT r.club_id, c.name, c.city, c.logo FROM club_requests r JOIN clubs c ON c.id = r.club_id WHERE r.tg_id = ?1 AND r.kind = ?2 AND r.status = ?3').bind(v.user.id, 'invite', 'pending').all()).results || [];
  return json({ ok: true, clubs, mine: mine ? { id: mine.club_id, role: mine.role, name: mine.name } : null, own: own ? { id: own.id, name: own.name, status: own.status } : null, invites: invites.map(r => ({ id: r.club_id, name: r.name, city: r.city || '', logo: r.logo || '' })) });
}
async function apiClub(env, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const c = await clubRow(env, Number(body.id)); if (!c) return json({ ok: false, error: 'not_found' }, 404);
  const mine = await membershipOf(env, v.user.id); const myRole = mine && mine.club_id === c.id ? mine.role : null;
  if (c.status !== 'active' && !myRole && c.owner_id !== v.user.id && !isAdmin(env, v.user.id)) return json({ ok: false, error: 'not_found' }, 404);
  const card = await clubCard(env, c); const members = await clubMembers(env, c.id);
  const canManage = myRole === 'owner' || myRole === 'admin' || isAdmin(env, v.user.id);
  const requests = canManage ? ((await env.DB.prepare('SELECT r.tg_id, r.kind, r.created_at, u.username, u.first_name, u.last_name, u.photo_url FROM club_requests r LEFT JOIN users u ON u.tg_id = r.tg_id WHERE r.club_id = ?1 AND r.status = ?2 ORDER BY r.created_at').bind(c.id, 'pending').all()).results || []).map(r => ({ tgId: r.tg_id, kind: r.kind, name: rowName(r) || String(r.tg_id), username: r.username || '', photo: r.photo_url || '', at: r.created_at * 1000 })) : [];
  const myReq = await env.DB.prepare('SELECT kind, status FROM club_requests WHERE club_id = ?1 AND tg_id = ?2').bind(c.id, v.user.id).first();
  return json({ ok: true, club: card, members, myRole, canManage, requests, myRequest: myReq && myReq.status === 'pending' ? myReq.kind : null, inOtherClub: !!(mine && mine.club_id !== c.id) });
}
async function apiClubApply(env, bot, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const f = cleanClubFields(body); if (f.name.length < 2) return json({ ok: false, error: 'bad_name' }, 400);
  const mine = await membershipOf(env, v.user.id); if (mine) return json({ ok: false, error: 'in_club' }, 409);
  const existing = await env.DB.prepare('SELECT id, status FROM clubs WHERE owner_id = ?1 AND status != ?2').bind(v.user.id, 'rejected').first();
  if (existing) return json({ ok: false, error: 'has_club', id: existing.id, status: existing.status }, 409);
  const ins = await env.DB.prepare('INSERT INTO clubs (name, city, about, link, logo, owner_id, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)').bind(f.name, f.city, f.about, f.link, f.logo, v.user.id, 'pending', now()).run();
  const id = ins.meta.last_row_id;
  const lang = pickLang(v.user.language_code);
  await bot.send(v.user.id, t(lang, 'clubApplied', { name: esc(f.name) }));
  await notifyAdmins(env, bot, 'adminClubNew', { name: esc(f.name), city: esc(f.city || '—'), owner: esc(displayName(v.user)), username: v.user.username ? ' @' + esc(v.user.username) : '', about: esc(f.about || ''), id });
  return json({ ok: true, id, status: 'pending' });
}
async function apiClubUpdate(env, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const c = await clubRow(env, Number(body.id)); if (!c) return json({ ok: false, error: 'not_found' }, 404);
  if (c.owner_id !== v.user.id && !isAdmin(env, v.user.id)) return json({ ok: false, error: 'forbidden' }, 403);
  const f = cleanClubFields(Object.assign({ name: c.name, city: c.city, about: c.about, link: c.link, logo: c.logo }, body)); if (f.name.length < 2) return json({ ok: false, error: 'bad_name' }, 400);
  if (body.logo === '') f.logo = '';
  await env.DB.prepare('UPDATE clubs SET name = ?1, city = ?2, about = ?3, link = ?4, logo = ?5 WHERE id = ?6').bind(f.name, f.city, f.about, f.link, f.logo, c.id).run();
  return json({ ok: true, club: await clubCard(env, await clubRow(env, c.id)) });
}
async function setClubStatus(env, bot, c, approve) {
  await env.DB.prepare('UPDATE clubs SET status = ?1, approved_at = ?2 WHERE id = ?3').bind(approve ? 'active' : 'rejected', approve ? now() : null, c.id).run();
  const owner = await userRow(env, c.owner_id); const lang = pickLang(owner && owner.lang);
  if (approve) { await addMember(env, c.id, c.owner_id, 'owner'); await clubSystem(env, c.id, '🏛'); await bot.send(c.owner_id, t(lang, 'clubApproved', { name: esc(c.name) }), bot.playButton(t(lang, 'play'), env.APP_URL)); }
  else await bot.send(c.owner_id, t(lang, 'clubRejected', { name: esc(c.name) }));
}
async function listClubsAdmin(env) {
  const rows = (await env.DB.prepare('SELECT c.*, u.username, u.first_name, u.last_name FROM clubs c LEFT JOIN users u ON u.tg_id = c.owner_id ORDER BY (c.status = ?1) DESC, c.created_at DESC LIMIT 200').bind('pending').all()).results || [];
  const out = []; for (const c of rows) { const card = await clubCard(env, c); out.push(Object.assign(card, { owner: rowName(c) || String(c.owner_id), ownerUsername: c.username || '' })); }
  return out;
}
async function apiAdminClubs(env, bot, body, action) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!isAdmin(env, v.user.id)) return json({ ok: false, error: 'forbidden' }, 403);
  if (action === 'list') return json({ ok: true, clubs: await listClubsAdmin(env) });
  const c = await clubRow(env, Number(body.id)); if (!c) return json({ ok: false, error: 'not_found' }, 404);
  await setClubStatus(env, bot, c, !!body.approve);
  return json({ ok: true, clubs: await listClubsAdmin(env) });
}
/* invitations (from the club) and applications (from players) */
async function apiClubInvite(env, bot, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const mine = await membershipOf(env, v.user.id); if (!mine || (mine.role !== 'owner' && mine.role !== 'admin')) return json({ ok: false, error: 'forbidden' }, 403);
  const c = await clubRow(env, mine.club_id); const target = await findUser(env, body.q || body.tgId); if (!target) return json({ ok: false, error: 'not_found' }, 404);
  const tm = await membershipOf(env, target.tg_id); if (tm) return json({ ok: false, error: tm.club_id === c.id ? 'already_member' : 'in_other_club' }, 409);
  const pending = await env.DB.prepare('SELECT kind, status FROM club_requests WHERE club_id = ?1 AND tg_id = ?2').bind(c.id, target.tg_id).first();
  if (pending && pending.status === 'pending' && pending.kind === 'apply') { // they already asked to join → accept right away
    await env.DB.prepare('UPDATE club_requests SET status = ?1 WHERE club_id = ?2 AND tg_id = ?3').bind('accepted', c.id, target.tg_id).run();
    await addMember(env, c.id, target.tg_id, 'member'); await clubSystem(env, c.id, '+' + rowName(target));
    await bot.send(target.tg_id, t(pickLang(target.lang), 'clubApplyOk', { club: esc(c.name) }), bot.playButton(t(pickLang(target.lang), 'play'), env.APP_URL));
    return json({ ok: true, status: 'joined' });
  }
  await env.DB.prepare('INSERT INTO club_requests (club_id, tg_id, kind, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(club_id, tg_id) DO UPDATE SET kind = ?3, status = ?4, created_at = ?5').bind(c.id, target.tg_id, 'invite', 'pending', now()).run();
  const tl = pickLang(target.lang);
  await bot.send(target.tg_id, t(tl, 'clubInvite', { name: esc(displayName(v.user)), club: esc(c.name), city: c.city ? ' (' + esc(c.city) + ')' : '' }), { reply_markup: { inline_keyboard: [[{ text: t(tl, 'btnAccept'), callback_data: `cl_acc_${c.id}` }, { text: t(tl, 'btnDecline'), callback_data: `cl_dec_${c.id}` }]] } });
  return json({ ok: true, status: 'invited' });
}
async function respondClubInvite(env, bot, u, clubId, accept) { // returns 'gone' | { name }
  const r = await env.DB.prepare('SELECT status FROM club_requests WHERE club_id = ?1 AND tg_id = ?2 AND kind = ?3').bind(clubId, u.id, 'invite').first();
  if (!r || r.status !== 'pending') return 'gone';
  const c = await clubRow(env, clubId); if (!c) return 'gone';
  if (accept) { const mine = await membershipOf(env, u.id); if (mine) return 'in_club'; }
  await env.DB.prepare('UPDATE club_requests SET status = ?1 WHERE club_id = ?2 AND tg_id = ?3').bind(accept ? 'accepted' : 'declined', clubId, u.id).run();
  if (accept) {
    await addMember(env, clubId, u.id, 'member'); await clubSystem(env, clubId, '+' + displayName(u));
    const owner = await userRow(env, c.owner_id); await bot.send(c.owner_id, t(pickLang(owner && owner.lang), 'clubMemberJoined', { name: esc(displayName(u)), club: esc(c.name) }));
  }
  return { name: c.name };
}
async function apiClubRespond(env, bot, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const r = await respondClubInvite(env, bot, v.user, Number(body.id), !!body.accept);
  if (r === 'in_club') return json({ ok: false, error: 'in_club' }, 409);
  return json({ ok: true, gone: r === 'gone', club: r === 'gone' ? null : r });
}
async function apiClubJoin(env, bot, body) { // a player asks to join
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const c = await clubRow(env, Number(body.id)); if (!c || c.status !== 'active') return json({ ok: false, error: 'not_found' }, 404);
  const mine = await membershipOf(env, v.user.id); if (mine) return json({ ok: false, error: 'in_club' }, 409);
  const pending = await env.DB.prepare('SELECT kind, status FROM club_requests WHERE club_id = ?1 AND tg_id = ?2').bind(c.id, v.user.id).first();
  if (pending && pending.status === 'pending' && pending.kind === 'invite') { await respondClubInvite(env, bot, v.user, c.id, true); return json({ ok: true, status: 'joined' }); }
  await env.DB.prepare('INSERT INTO club_requests (club_id, tg_id, kind, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(club_id, tg_id) DO UPDATE SET kind = ?3, status = ?4, created_at = ?5').bind(c.id, v.user.id, 'apply', 'pending', now()).run();
  const owner = await userRow(env, c.owner_id); await bot.send(c.owner_id, t(pickLang(owner && owner.lang), 'clubApplyNew', { name: esc(displayName(v.user)), club: esc(c.name) }), bot.playButton(t(pickLang(owner && owner.lang), 'play'), env.APP_URL));
  return json({ ok: true, status: 'applied' });
}
async function apiClubApprove(env, bot, body) { // the head answers an application
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const mine = await membershipOf(env, v.user.id); if (!mine || (mine.role !== 'owner' && mine.role !== 'admin')) return json({ ok: false, error: 'forbidden' }, 403);
  const c = await clubRow(env, mine.club_id); const tgId = Number(body.tgId);
  const r = await env.DB.prepare('SELECT status FROM club_requests WHERE club_id = ?1 AND tg_id = ?2 AND kind = ?3').bind(c.id, tgId, 'apply').first();
  if (!r || r.status !== 'pending') return json({ ok: true, gone: true });
  const accept = !!body.accept; const target = await userRow(env, tgId); const tl = pickLang(target && target.lang);
  if (accept && await membershipOf(env, tgId)) { await env.DB.prepare('UPDATE club_requests SET status = ?1 WHERE club_id = ?2 AND tg_id = ?3').bind('declined', c.id, tgId).run(); return json({ ok: false, error: 'in_other_club' }, 409); }
  await env.DB.prepare('UPDATE club_requests SET status = ?1 WHERE club_id = ?2 AND tg_id = ?3').bind(accept ? 'accepted' : 'declined', c.id, tgId).run();
  if (accept) { await addMember(env, c.id, tgId, 'member'); await clubSystem(env, c.id, '+' + rowName(target)); }
  await bot.send(tgId, t(tl, accept ? 'clubApplyOk' : 'clubApplyNo', { club: esc(c.name) }), accept ? bot.playButton(t(tl, 'play'), env.APP_URL) : undefined);
  return json({ ok: true });
}
async function apiClubKick(env, bot, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const mine = await membershipOf(env, v.user.id); if (!mine || (mine.role !== 'owner' && mine.role !== 'admin')) return json({ ok: false, error: 'forbidden' }, 403);
  const tgId = Number(body.tgId); const tm = await membershipOf(env, tgId); if (!tm || tm.club_id !== mine.club_id || tm.role === 'owner') return json({ ok: false, error: 'bad_member' }, 400);
  await env.DB.prepare('DELETE FROM club_members WHERE tg_id = ?1').bind(tgId).run();
  const target = await userRow(env, tgId); await bot.send(tgId, t(pickLang(target && target.lang), 'clubKicked', { club: esc(mine.name) }));
  return json({ ok: true });
}
async function apiClubLeave(env, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const mine = await membershipOf(env, v.user.id); if (!mine) return json({ ok: true });
  if (mine.role === 'owner') return json({ ok: false, error: 'owner' }, 400);
  await env.DB.prepare('DELETE FROM club_members WHERE tg_id = ?1').bind(v.user.id).run();
  return json({ ok: true });
}
/* chat: last 100 messages, or everything after `since`; a lobby message carries a join code */
async function apiClubChat(env, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const mine = await membershipOf(env, v.user.id); if (!mine) return json({ ok: false, error: 'no_club' }, 403);
  const since = Number(body.since) || 0;
  const rows = since
    ? (await env.DB.prepare('SELECT m.*, u.username, u.first_name, u.last_name FROM club_messages m LEFT JOIN users u ON u.tg_id = m.tg_id WHERE m.club_id = ?1 AND m.id > ?2 ORDER BY m.id LIMIT 200').bind(mine.club_id, since).all()).results || []
    : ((await env.DB.prepare('SELECT m.*, u.username, u.first_name, u.last_name FROM club_messages m LEFT JOIN users u ON u.tg_id = m.tg_id WHERE m.club_id = ?1 ORDER BY m.id DESC LIMIT 100').bind(mine.club_id).all()).results || []).reverse();
  return json({ ok: true, messages: rows.map(m => ({ id: m.id, tgId: m.tg_id, name: m.tg_id ? (rowName(m) || String(m.tg_id)) : '', kind: m.kind, text: m.text || '', code: m.code || '', at: m.created_at * 1000, me: m.tg_id === v.user.id })) });
}
async function apiClubChatSend(env, bot, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const mine = await membershipOf(env, v.user.id); if (!mine) return json({ ok: false, error: 'no_club' }, 403);
  const last = await env.DB.prepare('SELECT created_at FROM club_messages WHERE club_id = ?1 AND tg_id = ?2 ORDER BY id DESC LIMIT 1').bind(mine.club_id, v.user.id).first();
  if (last && now() - last.created_at < 1) return json({ ok: false, error: 'slow_down' }, 429);
  let kind = 'text', text = String(body.text || '').trim().slice(0, 500), code = '';
  if (body.lobby) { code = String(body.lobby).toUpperCase(); if (!/^[A-Z0-9]{4,8}$/.test(code)) return json({ ok: false, error: 'bad_code' }, 400); const lob = await env.DB.prepare('SELECT host_id, status FROM lobbies WHERE code = ?1').bind(code).first(); if (!lob || lob.host_id !== v.user.id || lob.status !== 'open') return json({ ok: false, error: 'no_lobby' }, 404); kind = 'lobby'; text = ''; }
  else if (!text) return json({ ok: false, error: 'empty' }, 400);
  const ins = await env.DB.prepare('INSERT INTO club_messages (club_id, tg_id, kind, text, code, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(mine.club_id, v.user.id, kind, text, code || null, now()).run();
  await env.DB.prepare('DELETE FROM club_messages WHERE club_id = ?1 AND id < (SELECT MIN(id) FROM (SELECT id FROM club_messages WHERE club_id = ?1 ORDER BY id DESC LIMIT 300))').bind(mine.club_id).run();
  if (kind === 'lobby') { // a table call also goes to every online member's Telegram, with a join button
    const members = await clubMembers(env, mine.club_id); const username = await botUsername(env, bot);
    for (const m of members) { if (m.tgId === v.user.id || !m.online) continue; const ml = await userRow(env, m.tgId); const l = pickLang(ml && ml.lang); try { await bot.send(m.tgId, t(l, 'clubLobby', { name: esc(displayName(v.user)), code }), { reply_markup: { inline_keyboard: [[{ text: t(l, 'btnJoin', { code }), url: `https://t.me/${username}?start=join_${code}` }]] } }); } catch (e) {} }
  }
  return json({ ok: true, id: ins.meta.last_row_id });
}
/* ---------- partners ---------- */
async function partnerRow(env, tgId) { return env.DB.prepare('SELECT * FROM partners WHERE tg_id = ?1').bind(tgId).first(); }
async function partnerStats(env, tgId, share) {
  const since = now() - 365 * 86400;
  const ref = await env.DB.prepare('SELECT COUNT(*) AS n, SUM(CASE WHEN qualified_at IS NOT NULL THEN 1 ELSE 0 END) AS q FROM referrals WHERE ref_by = ?1').bind(tgId).first();
  const buy = await env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(p.stars), 0) AS stars FROM purchases p JOIN referrals r ON r.tg_id = p.tg_id WHERE r.ref_by = ?1 AND p.status = 'paid' AND p.paid_at >= ?2 AND p.paid_at >= r.created_at AND p.paid_at <= r.created_at + 365 * 86400`).bind(tgId, since).first();
  const paid = await env.DB.prepare('SELECT COALESCE(SUM(stars), 0) AS s FROM payouts WHERE tg_id = ?1').bind(tgId).first('s');
  const earned = Math.floor((buy.stars || 0) * share / 100);
  return { invited: ref.n || 0, qualified: ref.q || 0, purchases: buy.n || 0, purchasedStars: buy.stars || 0, earnedStars: earned, paidStars: paid || 0, balanceStars: earned - (paid || 0) };
}
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
  if (upd.callback_query) return onCallback(env, bot, upd.callback_query);
}
async function onCallback(env, bot, q) {
  const u = q.from || {}; const lang = pickLang(u.language_code);
  const cm = /^cl_(acc|dec)_(\d+)$/.exec(q.data || '');
  if (cm) {
    const r = await respondClubInvite(env, bot, u, Number(cm[2]), cm[1] === 'acc');
    const text = r === 'gone' ? t(lang, 'clubInviteGone') : r === 'in_club' ? t(lang, 'clubInvite', { name: '', club: '', city: '' }).split('.').pop().trim() || t(lang, 'clubInviteGone') : cm[1] === 'acc' ? t(lang, 'clubJoined', { club: esc(r.name) }) : t(lang, 'clubInviteDeclined');
    await bot.call('answerCallbackQuery', { callback_query_id: q.id, text: text.replace(/<[^>]+>/g, '') });
    if (q.message) await bot.call('editMessageText', { chat_id: q.message.chat.id, message_id: q.message.message_id, text, parse_mode: 'HTML' });
    return;
  }
  const m = /^fr_(acc|dec)_(\d+)$/.exec(q.data || '');
  if (!m) return bot.call('answerCallbackQuery', { callback_query_id: q.id });
  const fromId = Number(m[2]); const accept = m[1] === 'acc';
  const r = await respondRequest(env, bot, u, fromId, accept);
  const text = r === 'gone' ? t(lang, 'requestGone') : accept ? t(lang, 'requestAccepted', { name: esc(r.name) }) : t(lang, 'requestDeclined');
  await bot.call('answerCallbackQuery', { callback_query_id: q.id, text: text.replace(/<[^>]+>/g, '') });
  if (q.message) await bot.call('editMessageText', { chat_id: q.message.chat.id, message_id: q.message.message_id, text, parse_mode: 'HTML' });
}
/* accept / decline a pending request addressed to `u` from `fromId`; returns 'gone' or { name } of the requester */
async function respondRequest(env, bot, u, fromId, accept) {
  const req = await env.DB.prepare('SELECT status FROM friend_requests WHERE from_id = ?1 AND to_id = ?2').bind(fromId, u.id).first();
  if (!req || req.status !== 'pending') return 'gone';
  await env.DB.prepare('UPDATE friend_requests SET status = ?1 WHERE from_id = ?2 AND to_id = ?3').bind(accept ? 'accepted' : 'declined', fromId, u.id).run();
  const from = await userRow(env, fromId);
  if (accept) { await befriend(env, u.id, fromId); if (from) { const fl = pickLang(from.lang); await bot.send(fromId, t(fl, 'requestAcceptedBy', { name: esc(displayName(u)) }), bot.playButton(t(fl, 'play'), env.APP_URL)); } }
  return { name: rowName(from) };
}
async function sendRequest(env, bot, me, target) { // me: Telegram user object; target: users row
  if (me.id === target.tg_id) return 'self';
  const already = await env.DB.prepare('SELECT 1 FROM friends WHERE tg_id = ?1 AND friend_id = ?2').bind(me.id, target.tg_id).first();
  if (already) return 'friends';
  const incoming = await env.DB.prepare('SELECT status FROM friend_requests WHERE from_id = ?1 AND to_id = ?2').bind(target.tg_id, me.id).first();
  if (incoming && incoming.status === 'pending') { await respondRequest(env, bot, me, target.tg_id, true); return 'friends'; }
  const ins = await env.DB.prepare('INSERT INTO friend_requests (from_id, to_id, status, created_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(from_id, to_id) DO UPDATE SET status = ?3, created_at = ?4 WHERE status != ?3').bind(me.id, target.tg_id, 'pending', now()).run();
  if (!(ins.meta && ins.meta.changes > 0)) return 'pending';
  const tl = pickLang(target.lang);
  await bot.send(target.tg_id, t(tl, 'friendRequest', { name: esc(displayName(me)) }), { reply_markup: { inline_keyboard: [[{ text: t(tl, 'btnAccept'), callback_data: `fr_acc_${me.id}` }, { text: t(tl, 'btnDecline'), callback_data: `fr_dec_${me.id}` }]] } });
  return 'sent';
}
async function onText(env, bot, msg) {
  const u = msg.from || {}; const lang = pickLang(u.language_code); const chat = msg.chat.id;
  const text = msg.text.trim();
  const isNew = !(await userRow(env, u.id));
  await touchUser(env, u);
  const play = bot.playButton(t(lang, 'play'), env.APP_URL);
  const m = /^\/start(?:@\w+)?(?:\s+(\S+))?/.exec(text);
  if (m) {
    const param = m[1] || '';
    const j = /^join_([A-Z0-9]{4,8})$/i.exec(param);
    if (j) return joinLobby(env, bot, chat, u, lang, j[1].toUpperCase());
    const f = /^(friend|ref)_([A-Z0-9]{6,10})$/i.exec(param);
    if (f) {
      if (isNew) await attachReferral(env, bot, u, f[2].toUpperCase(), lang);
      if (f[1].toLowerCase() === 'friend') return acceptFriend(env, bot, chat, u, lang, f[2].toUpperCase(), play);
      return isNew ? undefined : bot.send(chat, t(lang, 'welcome'), play);
    }
    return bot.send(chat, t(lang, 'welcome'), play);
  }
  if (/^\/(help|rules)/.test(text)) return bot.send(chat, isAdmin(env, u.id) ? t(lang, 'help') + '\n\n' + t(lang, 'adminHelp') + '\n' + t(lang, 'adminHelpPartner') + '\n' + t(lang, 'adminHelpClub') : t(lang, 'help'), play);
  if (isAdmin(env, u.id)) {
    const g = /^\/(grant|revoke)(?:@\w+)?\s+(\S+)(?:\s+(\d+))?/.exec(text);
    if (g) {
      const target = await findUser(env, g[2]); if (!target) return bot.send(chat, t(lang, 'adminNoUser', { q: esc(g[2]) }));
      if (g[1] === 'revoke') { await setGrant(env, bot, u.id, target, 0, true); return bot.send(chat, t(lang, 'adminRevoked', { name: esc(rowName(target)) })); }
      const until = await setGrant(env, bot, u.id, target, Number(g[3]) || 30, false);
      return bot.send(chat, t(lang, 'adminGranted', { name: esc(rowName(target)), until: fmtDate(until, lang) }));
    }
    const pc = /^\/(partner|partner_no)(?:@\w+)?\s+(\S+)/.exec(text);
    if (pc) { const target = await findUser(env, pc[2]); if (!target) return bot.send(chat, t(lang, 'adminNoUser', { q: esc(pc[2]) })); await setPartner(env, bot, target, pc[1] === 'partner'); return bot.send(chat, t(lang, pc[1] === 'partner' ? 'adminPartnerOk' : 'adminPartnerNo', { name: esc(rowName(target)) })); }
    const cc = /^\/(club_ok|club_no)(?:@\w+)?\s+(\d+)/.exec(text);
    if (cc) { const c = await clubRow(env, Number(cc[2])); if (!c) return bot.send(chat, t(lang, 'adminNoUser', { q: cc[2] })); await setClubStatus(env, bot, c, cc[1] === 'club_ok'); return bot.send(chat, t(lang, cc[1] === 'club_ok' ? 'adminClubOk' : 'adminClubNo', { name: esc(c.name) })); }
    if (/^\/clubs/.test(text)) { const list = await listClubsAdmin(env); return bot.send(chat, list.length ? t(lang, 'adminClubs', { list: list.map(x => `• #${x.id} ${esc(x.name)}${x.city ? ' (' + esc(x.city) + ')' : ''} — ${x.status} · ${x.members} · ${esc(x.owner)}${x.ownerUsername ? ' @' + esc(x.ownerUsername) : ''}`).join('\n') }) : t(lang, 'adminClubsNone')); }
    if (/^\/partners/.test(text)) { const list = await listPartners(env); return bot.send(chat, list.length ? t(lang, 'adminPartners', { list: list.map(x => `• ${esc(x.name)}${x.username ? ' @' + esc(x.username) : ''} — ${x.status}${x.stats ? ` · ${x.stats.invited} / ${x.stats.qualified} · ${x.stats.earnedStars}⭐` : ''}`).join('\n') }) : t(lang, 'adminPartnersNone')); }
    if (/^\/grants/.test(text)) { const list = await listGrants(env); return bot.send(chat, list.length ? t(lang, 'adminGrants', { list: list.map(x => `• ${esc(x.name)}${x.username ? ' @' + esc(x.username) : ''} — ${fmtDate(x.until / 1000, lang)}`).join('\n') }) : t(lang, 'adminNone')); }
  }
  // partners can write to the team straight through the bot: the text is forwarded to the admins
  const pr = await partnerRow(env, u.id);
  if (pr && pr.status === 'active' && !text.startsWith('/')) {
    for (const adm of String(env.ADMIN_IDS || '').split(',').map(x => Number(x.trim())).filter(Boolean)) { const a = await userRow(env, adm); await bot.send(adm, t(pickLang(a && a.lang), 'adminFwd', { name: esc(displayName(u)), username: u.username ? ' @' + esc(u.username) : '', id: u.id, text: esc(text).slice(0, 3000) })); }
    return bot.send(chat, t(lang, 'fwd'));
  }
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
  if (isAdmin(env, u.id)) owned.allUntil = Math.max(owned.allUntil || 0, Date.now() + 3650 * 86400000); // admins own everything
  const credits = await creditsFor(env, u.id); const club = await membershipOf(env, u.id);
  return json({ ok: true, user: { id: u.id, name: displayName(u), username: u.username || '', lang: u.language_code || '', photo: u.photo_url || '' }, owned, rating, startParam: v.startParam, bot: username, invite: { code, link: `https://t.me/${username}?start=friend_${code}`, ref: `https://t.me/${username}?start=ref_${code}` }, admin: isAdmin(env, u.id), credits, club: club ? { id: club.club_id, role: club.role, name: club.name } : null });
}
/* a Mini App opened directly with ?startapp=ref_<code> (no /start in the bot): attribute if this account is brand new */
async function apiRefAttach(env, bot, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const code = String(body.code || '').toUpperCase(); if (!/^[A-Z0-9]{6,10}$/.test(code)) return json({ ok: false, error: 'bad_code' }, 400);
  const u = await env.DB.prepare('SELECT created_at FROM users WHERE tg_id = ?1').bind(v.user.id).first();
  const fresh = u && now() - u.created_at < 600;
  const existing = await env.DB.prepare('SELECT ref_by FROM referrals WHERE tg_id = ?1').bind(v.user.id).first();
  if (!fresh || existing) return json({ ok: true, attached: false });
  const done = await attachReferral(env, bot, v.user, code, pickLang(v.user.language_code));
  return json({ ok: true, attached: done, welcomeDays: REF_WELCOME_DAYS });
}
async function apiReferrals(env, bot, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const [code, username, st] = await Promise.all([inviteCodeFor(env, v.user.id), botUsername(env, bot), referralStats(env, v.user.id)]);
  return json(Object.assign({ ok: true, code, link: `https://t.me/${username}?start=ref_${code}`, welcomeDays: REF_WELCOME_DAYS }, st));
}
async function apiPartner(env, bot, body, action) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  let p = await partnerRow(env, v.user.id);
  if (action === 'apply') {
    if (p && p.status === 'active') return json({ ok: true, status: 'active' });
    const name = String(body.name || displayName(v.user)).slice(0, 80), channel = String(body.channel || '').slice(0, 160), audience = String(body.audience || '').slice(0, 160);
    await env.DB.prepare('INSERT INTO partners (tg_id, status, name, channel, audience, share, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 20, ?6) ON CONFLICT(tg_id) DO UPDATE SET status = ?2, name = ?3, channel = ?4, audience = ?5, created_at = ?6').bind(v.user.id, 'pending', name, channel, audience, now()).run();
    const lang = pickLang(v.user.language_code);
    await bot.send(v.user.id, t(lang, 'partnerApplied'));
    for (const adm of String(env.ADMIN_IDS || '').split(',').map(x => Number(x.trim())).filter(Boolean)) { const a = await userRow(env, adm); await bot.send(adm, t(pickLang(a && a.lang), 'adminPartnerNew', { name: esc(name), username: v.user.username ? ' @' + esc(v.user.username) : '', channel: esc(channel || '—'), audience: esc(audience || '—'), id: v.user.id })); }
    p = await partnerRow(env, v.user.id);
  }
  const [code, username] = await Promise.all([inviteCodeFor(env, v.user.id), botUsername(env, bot)]);
  const share = p ? p.share : 20;
  const stats = p && p.status === 'active' ? await partnerStats(env, v.user.id, share) : null;
  return json({ ok: true, status: p ? p.status : 'none', share, name: p ? p.name : '', channel: p ? p.channel : '', link: `https://t.me/${username}?start=ref_${code}`, appLink: `${env.APP_URL}?startapp=ref_${code}`, stats, minPayout: 1000, support: env.SUPPORT_USERNAME || username });
}
async function setPartner(env, bot, target, approve) {
  const lang = pickLang(target.lang);
  if (approve) {
    await env.DB.prepare('INSERT INTO partners (tg_id, status, name, share, created_at, approved_at) VALUES (?1, ?2, ?3, 20, ?4, ?4) ON CONFLICT(tg_id) DO UPDATE SET status = ?2, approved_at = ?4').bind(target.tg_id, 'active', rowName(target), now()).run();
    const p = await partnerRow(env, target.tg_id);
    await bot.send(target.tg_id, t(lang, 'partnerApproved', { share: p.share }), bot.playButton(t(lang, 'play'), env.APP_URL));
  } else {
    await env.DB.prepare('UPDATE partners SET status = ?1 WHERE tg_id = ?2').bind('rejected', target.tg_id).run();
    await bot.send(target.tg_id, t(lang, 'partnerRejected'));
  }
}
async function listPartners(env) {
  const rows = (await env.DB.prepare('SELECT p.*, u.username, u.first_name, u.last_name FROM partners p LEFT JOIN users u ON u.tg_id = p.tg_id ORDER BY p.created_at DESC LIMIT 100').all()).results || [];
  const out = [];
  for (const r of rows) out.push({ tgId: r.tg_id, name: rowName(r) || r.name || String(r.tg_id), username: r.username || '', status: r.status, share: r.share, channel: r.channel || '', audience: r.audience || '', at: r.created_at * 1000, stats: r.status === 'active' ? await partnerStats(env, r.tg_id, r.share) : null });
  return out;
}
async function apiAdminPartners(env, bot, body, action) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!isAdmin(env, v.user.id)) return json({ ok: false, error: 'forbidden' }, 403);
  if (action === 'list') return json({ ok: true, partners: await listPartners(env) });
  const target = await findUser(env, body.q || body.tgId); if (!target) return json({ ok: false, error: 'not_found' }, 404);
  await setPartner(env, bot, target, !!body.approve);
  return json({ ok: true, partners: await listPartners(env) });
}
async function apiProfile(env, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const id = Number(body.tgId); if (!id) return json({ ok: false, error: 'bad_id' }, 400);
  const u = await userRow(env, id); if (!u) return json({ ok: false, error: 'not_found' }, 404);
  const seen = await env.DB.prepare('SELECT seen_at, created_at FROM users WHERE tg_id = ?1').bind(id).first();
  const rating = await ratingFor(env, id);
  const rows = (await env.DB.prepare("SELECT game_id, mode, winner, summary, created_at FROM games WHERE summary LIKE ?1 ORDER BY created_at DESC LIMIT 300").bind('%"tgId":' + id + ',%').all()).results || [];
  const byRole = {}; const recent = [];
  for (const g of rows) {
    let players = []; try { players = JSON.parse(g.summary || '[]'); } catch (e) { continue; }
    const p = players.find(x => Number(x.tgId) === id); if (!p) continue;
    const r = byRole[p.roleId] = byRole[p.roleId] || { roleId: p.roleId, games: 0, wins: 0, points: 0 };
    r.games++; if (p.won) r.wins++; r.points += Number(p.points) || 0;
    if (recent.length < 12) recent.push({ at: g.created_at * 1000, mode: g.mode, roleId: p.roleId, won: !!p.won, points: Number(p.points) || 0, n: players.length, winner: g.winner });
  }
  const roles = Object.values(byRole).sort((a, b) => b.wins - a.wins || b.games - a.games || b.points - a.points);
  const isFriend = !!(await env.DB.prepare('SELECT 1 FROM friends WHERE tg_id = ?1 AND friend_id = ?2').bind(v.user.id, id).first());
  const ts = now();
  return json({ ok: true, user: { tgId: id, name: rowName(u), username: u.username || '', photo: u.photo_url || '', lang: u.lang || 'ru', online: ts - (seen.seen_at || 0) <= ONLINE_SEC, seenAgo: Math.max(0, ts - (seen.seen_at || 0)), since: (seen.created_at || 0) * 1000 },
    rating: Object.assign({}, rating, { points: 1000 + rating.points }), roles, recent, isFriend, grant: !!(await grantFor(env, id)) });
}
async function apiPlayers(env, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const limit = Math.max(1, Math.min(100, Number(body.limit) || 50)), offset = Math.max(0, Number(body.offset) || 0);
  const q = String(body.q || '').trim().replace(/^@/, '').toLowerCase().replace(/[%_]/g, '');
  const cap = q ? q.charAt(0).toUpperCase() + q.slice(1) : '';
  const where = q ? 'WHERE (lower(u.username) LIKE ?3 OR lower(u.first_name) LIKE ?3 OR u.first_name LIKE ?4 OR u.first_name LIKE ?5)' : '';
  const args = q ? [limit, offset, q + '%', cap + '%', q.toUpperCase() + '%'] : [limit, offset];
  const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users u ${where}`).bind(...args.slice(2)).first('n');
  const online = await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE seen_at > ?1').bind(now() - ONLINE_SEC).first('n');
  const rows = (await env.DB.prepare(`SELECT u.tg_id, u.username, u.first_name, u.last_name, u.photo_url, u.seen_at, u.created_at, r.points, r.games, r.wins FROM users u LEFT JOIN ratings r ON r.tg_id = u.tg_id ${where} ORDER BY u.seen_at DESC LIMIT ?1 OFFSET ?2`).bind(...args).all()).results || [];
  const ts = now(); const mine = new Set((await friendsOf(env, v.user.id)).map(f => f.tgId));
  return json({ ok: true, total, online, offset, players: rows.map(r => ({ tgId: r.tg_id, name: rowName(r), username: r.username || '', photo: r.photo_url || '', online: ts - (r.seen_at || 0) <= ONLINE_SEC, seenAgo: Math.max(0, ts - (r.seen_at || 0)), points: 1000 + (r.points || 0), games: r.games || 0, wins: r.wins || 0, isFriend: mine.has(r.tg_id), me: r.tg_id === v.user.id })) });
}
async function apiPing(env, body) { const v = await auth(env, body); return v ? json({ ok: true }) : json({ ok: false, error: 'unauthorized' }, 401); }
async function apiFriendSearch(env, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const q = String(body.q || '').trim().replace(/^@/, '').toLowerCase().replace(/[%_]/g, ''); if (q.length < 2) return json({ ok: true, results: [] });
  // SQLite lower()/LIKE are case-insensitive for ASCII only, so non-Latin names are matched by their capitalised form too
  const cap = q.charAt(0).toUpperCase() + q.slice(1);
  const rows = (await env.DB.prepare(`SELECT tg_id, username, first_name, last_name, photo_url, seen_at FROM users WHERE tg_id != ?2 AND (lower(username) LIKE ?1 OR lower(first_name) LIKE ?1 OR first_name LIKE ?4 OR first_name LIKE ?5) ORDER BY (lower(username) = ?3) DESC, seen_at DESC LIMIT 10`).bind(q + '%', v.user.id, q, cap + '%', q.toUpperCase() + '%').all()).results || [];
  const mine = new Set((await friendsOf(env, v.user.id)).map(f => f.tgId));
  const reqs = (await env.DB.prepare('SELECT from_id, to_id, status FROM friend_requests WHERE (from_id = ?1 OR to_id = ?1) AND status = ?2').bind(v.user.id, 'pending').all()).results || [];
  const out = new Set(reqs.filter(r => r.from_id === v.user.id).map(r => r.to_id)), inc = new Set(reqs.filter(r => r.to_id === v.user.id).map(r => r.from_id));
  const ts = now();
  return json({ ok: true, results: rows.map(r => ({ tgId: r.tg_id, name: rowName(r), username: r.username || '', photo: r.photo_url || '', online: ts - (r.seen_at || 0) <= ONLINE_SEC, seenAgo: Math.max(0, ts - (r.seen_at || 0)), isFriend: mine.has(r.tg_id), requested: out.has(r.tg_id), incoming: inc.has(r.tg_id) })) });
}
async function apiFriendRequest(env, bot, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const target = await userRow(env, Number(body.tgId)); if (!target) return json({ ok: false, error: 'not_found' }, 404);
  const status = await sendRequest(env, bot, v.user, target);
  return json({ ok: true, status });
}
async function apiFriendRequests(env, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const rows = (await env.DB.prepare(`SELECT r.from_id, r.to_id, r.created_at, u.tg_id, u.username, u.first_name, u.last_name, u.photo_url FROM friend_requests r JOIN users u ON u.tg_id = CASE WHEN r.from_id = ?1 THEN r.to_id ELSE r.from_id END WHERE (r.from_id = ?1 OR r.to_id = ?1) AND r.status = ?2 ORDER BY r.created_at DESC`).bind(v.user.id, 'pending').all()).results || [];
  const item = r => ({ tgId: r.tg_id, name: rowName(r), username: r.username || '', photo: r.photo_url || '', at: r.created_at });
  return json({ ok: true, incoming: rows.filter(r => r.to_id === v.user.id).map(item), outgoing: rows.filter(r => r.from_id === v.user.id).map(item) });
}
async function apiFriendRespond(env, bot, body) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  const r = await respondRequest(env, bot, v.user, Number(body.tgId), !!body.accept);
  return json({ ok: true, gone: r === 'gone', friend: r === 'gone' ? null : r });
}
async function apiAdmin(env, bot, body, action) {
  const v = await auth(env, body); if (!v) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!isAdmin(env, v.user.id)) return json({ ok: false, error: 'forbidden' }, 403);
  if (action === 'grants') return json({ ok: true, grants: await listGrants(env) });
  const target = await findUser(env, body.q || body.tgId); if (!target) return json({ ok: false, error: 'not_found' }, 404);
  if (action === 'revoke') { await setGrant(env, bot, v.user.id, target, 0, true); return json({ ok: true, revoked: { tgId: target.tg_id, name: rowName(target) }, grants: await listGrants(env) }); }
  const until = await setGrant(env, bot, v.user.id, target, Number(body.days) || 30, false);
  return json({ ok: true, granted: { tgId: target.tg_id, name: rowName(target), username: target.username || '', until: until * 1000 }, grants: await listGrants(env) });
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
  if (body.useCredit && (kind === 'role' || kind === 'scenario')) { // a free card / scenario earned through referrals
    const c = await creditsFor(env, v.user.id); if (!c[kind]) return json({ ok: false, error: 'no_credit' }, 400);
    await env.DB.prepare('UPDATE credits SET count = count - 1 WHERE tg_id = ?1 AND kind = ?2 AND count > 0').bind(v.user.id, kind).run();
    await env.DB.prepare('INSERT INTO purchases (tg_id, kind, item, stars, payload, status, created_at, paid_at) VALUES (?1, ?2, ?3, 0, ?4, ?5, ?6, ?6)').bind(v.user.id, kind, item, 'cr_' + randomId(8), 'reward', now()).run();
    return json({ ok: true, owned: true, credit: true, credits: await creditsFor(env, v.user.id) });
  }
  const amount = stars(env, kind);
  const title = String(body.title || item).slice(0, 32) || item, description = String(body.description || 'Mafia Pro').slice(0, 255) || 'Mafia Pro';
  const payload = 'p_' + randomId(12);
  await env.DB.prepare('INSERT INTO purchases (tg_id, kind, item, stars, payload, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)').bind(v.user.id, kind, item, amount, payload, 'pending', now()).run();
  const r = await bot.call('createInvoiceLink', { title, description, payload, currency: 'XTR', prices: [{ label: title, amount }] });
  if (!r || !r.ok) return json({ ok: false, error: 'telegram', detail: r && r.description }, 502);
  return json({ ok: true, link: r.result, stars: amount, payload });
}
async function apiResult(env, bot, body) {
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
      try { await qualifyReferral(env, bot, tgId); } catch (e) { console.error('qualify', e); }
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
  for (const id of sent) { try { await qualifyReferral(env, bot, id); } catch (e) { console.error('qualify', e); } }
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
          case '/api/friends/search': return wrap(apiFriendSearch(env, body));
          case '/api/friends/request': return wrap(apiFriendRequest(env, bot, body));
          case '/api/friends/requests': return wrap(apiFriendRequests(env, body));
          case '/api/friends/respond': return wrap(apiFriendRespond(env, bot, body));
          case '/api/ping': return wrap(apiPing(env, body));
          case '/api/profile': return wrap(apiProfile(env, body));
          case '/api/players': return wrap(apiPlayers(env, body));
          case '/api/admin/grant': return wrap(apiAdmin(env, bot, body, 'grant'));
          case '/api/admin/revoke': return wrap(apiAdmin(env, bot, body, 'revoke'));
          case '/api/admin/grants': return wrap(apiAdmin(env, bot, body, 'grants'));
          case '/api/referrals': return wrap(apiReferrals(env, bot, body));
          case '/api/ref/attach': return wrap(apiRefAttach(env, bot, body));
          case '/api/partner': return wrap(apiPartner(env, bot, body, 'get'));
          case '/api/partner/apply': return wrap(apiPartner(env, bot, body, 'apply'));
          case '/api/admin/partners': return wrap(apiAdminPartners(env, bot, body, 'list'));
          case '/api/admin/partner': return wrap(apiAdminPartners(env, bot, body, 'set'));
          case '/api/clubs': return wrap(apiClubs(env, body));
          case '/api/club': return wrap(apiClub(env, body));
          case '/api/club/apply': return wrap(apiClubApply(env, bot, body));
          case '/api/club/update': return wrap(apiClubUpdate(env, body));
          case '/api/club/invite': return wrap(apiClubInvite(env, bot, body));
          case '/api/club/respond': return wrap(apiClubRespond(env, bot, body));
          case '/api/club/join': return wrap(apiClubJoin(env, bot, body));
          case '/api/club/approve': return wrap(apiClubApprove(env, bot, body));
          case '/api/club/kick': return wrap(apiClubKick(env, bot, body));
          case '/api/club/leave': return wrap(apiClubLeave(env, body));
          case '/api/club/chat': return wrap(apiClubChat(env, body));
          case '/api/club/chat/send': return wrap(apiClubChatSend(env, bot, body));
          case '/api/admin/clubs': return wrap(apiAdminClubs(env, bot, body, 'list'));
          case '/api/admin/club': return wrap(apiAdminClubs(env, bot, body, 'set'));
          case '/api/invoice': return wrap(apiInvoice(env, bot, body));
          case '/api/game/result': return wrap(apiResult(env, bot, body));
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
