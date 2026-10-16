/* v77: official hosts of Mafia Pro.
   - who: a host with more than 50 hosted games fills in the application (анкета) in the app; an admin approves it (the bot's buttons or the app);
     then the host buys the licence — 5 000 emeralds for 30 days, renewable (the days add up). An admin may appoint anyone without an
     application, with a free licence for the days he chooses (/official @user [days] or the app)
   - what for: a game hosted by an official host with a live licence at his own table gives every seated player emeralds — up to 100 a game,
     by the average rank of the seated accounts (2/3) and the player's own rank (1/3); the player's rank counts at most one step above the table's
   - anti-farming: at least 7 players in the game and 5 Telegram accounts seated at the table, at least 15 minutes from the deal to the result,
     a player is rewarded for at most 5 games a day, a host's table for at most 12 games a day; the host himself gets nothing;
     suspicious patterns (mostly new accounts, the same group again and again) are reported to the admins
   - punishment: /cheat @user [days] reason (or the app) — a ban (forever by default) and the account zeroed: emeralds to 0, every item bought
     for emeralds taken back, the rating back to 1000, the official status and applications gone, out of the tournament. Stars purchases stay.
   The reward arithmetic is the same in the app (src/21-official.js, block official:begin … official:end); backend/test/run.js compares them. */
import { rankIdx } from './ranks.js';
import { changeStmts, balanceOf } from './emeralds.js';
import { t, pickLang } from './texts.js';
import { esc } from './tg.js';
import { cleanStr, banKey, unbanKey } from './security.js';

/* official:begin — the same constants and arithmetic as in src/21-official.js */
const OFFICIAL_RANK_K = [20, 30, 40, 50, 60, 70, 85, 100]; // emeralds a game «worth» at each rank: Rookie … Legend
const OFFICIAL_LICENSE = { price: 5000, days: 30, minHosted: 50 }; // the licence: emeralds, days; an applicant needs MORE than minHosted hosted games
const OFFICIAL_LIMITS = { minPlayers: 7, minAccounts: 5, minMinutes: 15, dayGames: 5, hostDay: 12, max: 100 };
/* the «worth» at a fractional rank (the table's average) */
function officialK(x) {
  x = Math.max(0, Math.min(OFFICIAL_RANK_K.length - 1, Number(x) || 0)); const i = Math.floor(x), f = x - i;
  return i >= OFFICIAL_RANK_K.length - 1 ? OFFICIAL_RANK_K[i] : OFFICIAL_RANK_K[i] + (OFFICIAL_RANK_K[i + 1] - OFFICIAL_RANK_K[i]) * f;
}
/* the emeralds of one player for one game: 2/3 the table (the average rank of the seated accounts), 1/3 his own rank — which counts
   at most one step above the table's average (a strong player at a weak table cannot farm it) */
function officialReward(avg, own) {
  const table = officialK(avg); const me = Math.min(officialK(own), officialK(Math.min(OFFICIAL_RANK_K.length - 1, (Number(avg) || 0) + 1)));
  return Math.max(1, Math.min(OFFICIAL_LIMITS.max, Math.round((2 * table + me) / 3)));
}
/* official:end */
export { OFFICIAL_RANK_K, OFFICIAL_LICENSE, OFFICIAL_LIMITS, officialK, officialReward };

const now = () => Math.floor(Date.now() / 1000);
const DAY = 86400;
const num = (env, k, d) => { const v = Number(env && env[k]); return Number.isFinite(v) && v >= 0 ? v : d; };
export const limits = env => ({ minPlayers: num(env, 'OFFICIAL_MIN_PLAYERS', OFFICIAL_LIMITS.minPlayers), minAccounts: num(env, 'OFFICIAL_MIN_ACCOUNTS', OFFICIAL_LIMITS.minAccounts), minMinutes: num(env, 'OFFICIAL_MIN_MINUTES', OFFICIAL_LIMITS.minMinutes), dayGames: num(env, 'OFFICIAL_DAY_GAMES', OFFICIAL_LIMITS.dayGames), hostDay: num(env, 'OFFICIAL_HOST_DAY', OFFICIAL_LIMITS.hostDay), max: OFFICIAL_LIMITS.max });
export const license = env => ({ price: num(env, 'OFFICIAL_PRICE', OFFICIAL_LICENSE.price), days: OFFICIAL_LICENSE.days, minHosted: OFFICIAL_LICENSE.minHosted });
export const adminIds = env => String(env.ADMIN_IDS || '').split(',').map(x => Number(x.trim())).filter(Boolean);
const rowName = r => (r ? ([r.first_name, r.last_name].filter(Boolean).join(' ') || r.username || String(r.tg_id)) : '');
const fmtDate = (sec, lang) => { try { return new Date(sec * 1000).toLocaleDateString({ ru: 'ru-RU', uk: 'uk-UA', en: 'en-GB', pl: 'pl-PL', hy: 'hy-AM' }[lang] || 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return new Date(sec * 1000).toISOString().slice(0, 10); } };
const playBtn = (env, lang, sp) => ({ reply_markup: { inline_keyboard: [[{ text: t(lang, 'play'), web_app: { url: `${env.APP_URL}${String(env.APP_URL || '').includes('?') ? '&' : '?'}startapp=${sp || 'official'}` } }]] } });

/* ---------- status ---------- */
export async function officialRow(env, tgId) { return env.DB.prepare('SELECT * FROM official_hosts WHERE tg_id = ?1').bind(tgId).first(); }
export const isActive = (row, ts) => !!(row && row.status === 'ok' && row.until > (ts || now()));
/* the active official hosts (a Set of tg ids) — small: read once per request */
export async function officialSet(env) {
  const rows = (await env.DB.prepare("SELECT tg_id FROM official_hosts WHERE status = 'ok' AND until > ?1").bind(now()).all()).results || [];
  return new Set(rows.map(r => r.tg_id));
}
async function hostedOf(env, tgId) { return (await env.DB.prepare('SELECT hosted FROM ratings WHERE tg_id = ?1').bind(tgId).first('hosted')) || 0; }
/* my side of it, for the app: the state (none | pending | rejected | approved | active | expired | revoked), the licence, my application */
export async function officialInfo(env, tgId) {
  const ts = now(); const row = await officialRow(env, tgId); const hosted = await hostedOf(env, tgId); const lic = license(env);
  const app = await env.DB.prepare('SELECT id, status, form, created_at, decided_at, note FROM host_applications WHERE tg_id = ?1 ORDER BY id DESC LIMIT 1').bind(tgId).first();
  let state = 'none';
  if (row && row.status === 'revoked') state = 'revoked';
  else if (isActive(row, ts)) state = 'active';
  else if (row && row.status === 'ok') state = row.until ? 'expired' : 'approved';
  else if (app && app.status === 'pending') state = 'pending';
  else if (app && app.status === 'rejected') state = 'rejected';
  const today = await env.DB.prepare("SELECT COUNT(*) AS n FROM emerald_ledger WHERE tg_id = ?1 AND kind = 'game' AND created_at > ?2").bind(tgId, ts - DAY).first('n');
  return { state, until: row && row.until ? row.until * 1000 : 0, source: row ? row.source : '', games: row ? row.games || 0 : 0, hosted, eligible: hosted > lic.minHosted, price: lic.price, days: lic.days, minHosted: lic.minHosted,
    app: app ? { id: app.id, status: app.status, at: app.created_at * 1000, decidedAt: app.decided_at ? app.decided_at * 1000 : 0, note: app.note || '', form: parse(app.form) } : null,
    rewardedToday: today || 0, limits: limits(env) };
}
const parse = s => { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } };

/* ---------- the application (анкета) ---------- */
const EXP = ['lt1', '1to3', 'gt3'], FORMATS = ['online', 'offline'], GAMES = ['classic', 'role'], LANGS = ['ru', 'uk', 'en', 'pl', 'hy'];
const pickList = (v, allowed) => [...new Set((Array.isArray(v) ? v : []).map(String).filter(x => allowed.includes(x)))];
const str = (v, max) => cleanStr(String(v == null ? '' : v)).replace(/\s+/g, ' ').trim().slice(0, max);
export function cleanForm(f) {
  f = f && typeof f === 'object' ? f : {};
  const form = { name: str(f.name, 64), city: str(f.city, 48), exp: EXP.includes(f.exp) ? f.exp : '', formats: pickList(f.formats, FORMATS), games: pickList(f.games, GAMES), langs: pickList(f.langs, LANGS), schedule: str(f.schedule, 160), about: cleanStr(String(f.about == null ? '' : f.about)).trim().slice(0, 600), rules: f.rules === true };
  const errors = [];
  if (form.name.length < 2) errors.push('name'); if (!form.exp) errors.push('exp'); if (!form.formats.length) errors.push('formats'); if (!form.games.length) errors.push('games');
  if (!form.langs.length) errors.push('langs'); if (form.schedule.length < 3) errors.push('schedule'); if (form.about.length < 20) errors.push('about'); if (!form.rules) errors.push('rules');
  return { form, errors };
}
export async function applyForm(env, bot, u, body, banned) {
  const ts = now(); const lic = license(env);
  if (banned) return { ok: false, error: 'blocked' };
  if (body.withdraw) { await env.DB.prepare("UPDATE host_applications SET status = 'withdrawn', decided_at = ?2 WHERE tg_id = ?1 AND status = 'pending'").bind(u.id, ts).run(); return { ok: true, withdrawn: true }; }
  const row = await officialRow(env, u.id);
  if (row && row.status === 'revoked') return { ok: false, error: 'revoked' };
  if (row && row.status === 'ok') return { ok: false, error: 'already' };
  const hosted = await hostedOf(env, u.id); if (hosted <= lic.minHosted) return { ok: false, error: 'few_games', hosted, need: lic.minHosted + 1 };
  const pend = await env.DB.prepare("SELECT id FROM host_applications WHERE tg_id = ?1 AND status = 'pending'").bind(u.id).first(); if (pend) return { ok: false, error: 'pending' };
  const { form, errors } = cleanForm(body.form); if (errors.length) return { ok: false, error: 'bad_form', fields: errors };
  const ins = await env.DB.prepare("INSERT INTO host_applications (tg_id, status, form, hosted, created_at) VALUES (?1, 'pending', ?2, ?3, ?4)").bind(u.id, JSON.stringify(form), hosted, ts).run();
  const id = ins.meta.last_row_id;
  if (bot) await tellAdminsApp(env, bot, id, u, form, hosted);
  return { ok: true, id };
}
async function tellAdminsApp(env, bot, id, u, form, hosted) {
  const L = k => t('ru', 'ohExp_' + k);
  const text = [`📝 <b>Анкета на официального ведущего #${id}</b>`, `${esc(form.name)}${u.username ? ' @' + esc(u.username) : ''} (id <code>${u.id}</code>) · проведено партий: <b>${hosted}</b>`,
    `Город: ${esc(form.city || '—')} · опыт: ${esc(L(form.exp))}`, `Форматы: ${form.formats.join(', ')} · игры: ${form.games.join(', ')} · языки: ${form.langs.join(', ')}`,
    `Когда: ${esc(form.schedule)}`, `О себе: ${esc(form.about)}`, '', `Одобрить или отклонить — кнопками ниже или в приложении («Официальные ведущие» → панель администратора).`].join('\n');
  for (const a of adminIds(env)) { try { await bot.send(a, text.slice(0, 3900), { reply_markup: { inline_keyboard: [[{ text: '✅ Одобрить', callback_data: `oh_ok_${id}` }, { text: '✖ Отклонить', callback_data: `oh_no_${id}` }]] } }); } catch (e) {} }
}
/* the admin's decision (the bot's buttons or the app) */
export async function decideApp(env, bot, id, approve, adminId, note) {
  const app = await env.DB.prepare('SELECT * FROM host_applications WHERE id = ?1').bind(id).first();
  if (!app || app.status !== 'pending') return { ok: false, error: 'gone' };
  const ts = now(); note = str(note, 200);
  await env.DB.prepare('UPDATE host_applications SET status = ?2, decided_at = ?3, decided_by = ?4, note = ?5 WHERE id = ?1').bind(id, approve ? 'approved' : 'rejected', ts, adminId, note).run();
  if (approve) await env.DB.prepare("INSERT INTO official_hosts (tg_id, status, until, source, by, games, created_at, updated_at) VALUES (?1, 'ok', 0, 'application', ?2, 0, ?3, ?3) ON CONFLICT(tg_id) DO UPDATE SET status = 'ok', source = 'application', by = ?2, updated_at = ?3").bind(app.tg_id, adminId, ts).run();
  const u = await env.DB.prepare('SELECT lang FROM users WHERE tg_id = ?1').bind(app.tg_id).first(); const lang = pickLang(u && u.lang); const lic = license(env);
  if (bot) { try { await bot.send(app.tg_id, approve ? t(lang, 'ohApproved', { price: lic.price, days: lic.days }) : t(lang, 'ohRejected', { note: note ? '\n' + esc(note) : '' }), playBtn(env, lang)); } catch (e) {} }
  return { ok: true, tgId: app.tg_id, status: approve ? 'approved' : 'rejected' };
}

/* ---------- the licence ---------- */
export async function buyLicense(env, u) {
  const row = await officialRow(env, u.id); const lic = license(env); const ts = now();
  if (!row || row.status !== 'ok') return { ok: false, error: row && row.status === 'revoked' ? 'revoked' : 'not_approved' };
  const bal = await balanceOf(env, u.id); if (bal < lic.price) return { ok: false, error: 'not_enough', price: lic.price, balance: bal, short: lic.price - bal };
  const until = Math.max(ts, row.until || 0) + lic.days * DAY;
  await env.DB.batch([...changeStmts(env, u.id, -lic.price, 'license', 'official', ts), env.DB.prepare('UPDATE official_hosts SET until = ?2, paid = COALESCE(paid, 0) + ?3, updated_at = ?4 WHERE tg_id = ?1').bind(u.id, until, lic.price, ts)]);
  return { ok: true, until: until * 1000, balance: await balanceOf(env, u.id) };
}
/* an admin appoints a host without an application: a free licence for `days` (added to what is left) */
export async function appoint(env, bot, adminId, target, days) {
  const ts = now(); days = Math.max(1, Math.min(365, Math.round(Number(days) || OFFICIAL_LICENSE.days)));
  const row = await officialRow(env, target.tg_id); const until = Math.max(ts, row && row.status === 'ok' ? row.until || 0 : 0) + days * DAY;
  await env.DB.prepare("INSERT INTO official_hosts (tg_id, status, until, source, by, games, created_at, updated_at) VALUES (?1, 'ok', ?2, 'admin', ?3, 0, ?4, ?4) ON CONFLICT(tg_id) DO UPDATE SET status = 'ok', until = ?2, source = 'admin', by = ?3, updated_at = ?4").bind(target.tg_id, until, adminId, ts).run();
  await env.DB.prepare("UPDATE host_applications SET status = 'approved', decided_at = ?2, decided_by = ?3 WHERE tg_id = ?1 AND status = 'pending'").bind(target.tg_id, ts, adminId).run();
  const lang = pickLang(target.lang);
  if (bot) { try { await bot.send(target.tg_id, t(lang, 'ohAppointed', { until: fmtDate(until, lang) }), playBtn(env, lang)); } catch (e) {} }
  return { ok: true, until: until * 1000 };
}
export async function revoke(env, bot, target, note) {
  const ts = now(); const r = await env.DB.prepare("UPDATE official_hosts SET status = 'revoked', until = 0, updated_at = ?2 WHERE tg_id = ?1").bind(target.tg_id, ts).run();
  if (!(r.meta && r.meta.changes)) return { ok: false, error: 'not_official' };
  const lang = pickLang(target.lang);
  if (bot) { try { await bot.send(target.tg_id, t(lang, 'ohRevoked', { note: note ? '\n' + esc(str(note, 200)) : '' })); } catch (e) {} }
  return { ok: true };
}
/* the official hosts for the app's list: who, rating, games, their open table if any */
export async function officialList(env, all) {
  const ts = now();
  const rows = (await env.DB.prepare(`SELECT o.tg_id, o.status, o.until, o.source, o.games, u.username, u.first_name, u.last_name, u.photo_url, u.seen_at, r.points, r.games AS rgames, r.hosted, uc.city, uco.country FROM official_hosts o JOIN users u ON u.tg_id = o.tg_id LEFT JOIN ratings r ON r.tg_id = o.tg_id LEFT JOIN user_cities uc ON uc.tg_id = o.tg_id LEFT JOIN user_countries uco ON uco.tg_id = o.tg_id ${all ? '' : "WHERE o.status = 'ok' AND o.until > ?1"} ORDER BY o.until DESC LIMIT 200`).bind(...(all ? [] : [ts])).all()).results || [];
  const out = [];
  for (const r of rows) {
    const table = await env.DB.prepare("SELECT l.code, l.status, (SELECT COUNT(*) FROM lobby_players p WHERE p.code = l.code) AS n, o.online FROM lobbies l LEFT JOIN lobby_opts o ON o.code = l.code WHERE l.host_id = ?1 AND l.status IN ('open', 'dealt', 'live') AND l.created_at > ?2 ORDER BY l.created_at DESC LIMIT 1").bind(r.tg_id, ts - 8 * 3600).first();
    out.push({ tgId: r.tg_id, name: rowName(r), username: r.username || '', photo: r.photo_url || '', online: ts - (r.seen_at || 0) <= 180, points: 1000 + (r.points || 0), games: r.rgames || 0, hosted: r.hosted || 0, city: r.city || '', country: r.country || '', official: { status: r.status, until: (r.until || 0) * 1000, source: r.source, games: r.games || 0, active: r.status === 'ok' && r.until > ts },
      table: table && table.online ? { code: table.code, status: table.status, players: table.n || 0 } : null });
  }
  return out.sort((a, b) => (b.table && b.table.status !== 'live' ? 1 : 0) - (a.table && a.table.status !== 'live' ? 1 : 0) || (b.online ? 1 : 0) - (a.online ? 1 : 0) || b.official.games - a.official.games);
}
export async function pendingApps(env) {
  const rows = (await env.DB.prepare("SELECT a.id, a.tg_id, a.form, a.hosted, a.created_at, u.username, u.first_name, u.last_name, u.photo_url FROM host_applications a LEFT JOIN users u ON u.tg_id = a.tg_id WHERE a.status = 'pending' ORDER BY a.id LIMIT 50").all()).results || [];
  return rows.map(r => ({ id: r.id, tgId: r.tg_id, name: rowName(r) || String(r.tg_id), username: r.username || '', photo: r.photo_url || '', hosted: r.hosted, at: r.created_at * 1000, form: parse(r.form) || {} }));
}

/* ---------- emeralds for a game at an official table ---------- */
/* called by /api/game/result for the first report of a game (not a flood): before — { tgId: rating row before this game } */
export async function rewardGame(env, bot, o) {
  const { gameId, hostId, code, players, before } = o; const ts = now(); const lim = limits(env);
  const host = await officialRow(env, hostId); if (!isActive(host, ts) || !code) return null;
  const lob = await env.DB.prepare('SELECT host_id FROM lobbies WHERE code = ?1').bind(code).first(); if (!lob || lob.host_id !== hostId) return null;
  const out = { official: true, rewards: {}, capped: [], reason: '' };
  if (players.length < lim.minPlayers) { out.reason = 'few_players'; return out; }
  const seated = new Set(((await env.DB.prepare('SELECT tg_id FROM lobby_players WHERE code = ?1').bind(code).all()).results || []).map(r => r.tg_id));
  const trow = await env.DB.prepare('SELECT priv FROM table_state WHERE code = ?1').bind(code).first(); const priv = parse(trow && trow.priv) || {};
  for (const k of Object.keys(priv)) if (Number(k)) seated.add(Number(k));
  seated.delete(hostId);
  const ids = [...new Set(players.map(p => Number(p.tgId)).filter(id => id && seated.has(id)))];
  if (ids.length < lim.minAccounts) { out.reason = 'few_accounts'; return out; }
  const dealt = ids.map(id => Number(priv[id] && priv[id].dealtAt) || 0).filter(Boolean);
  if (!dealt.length) { out.reason = 'no_deal'; return out; }
  if (Date.now() - Math.min(...dealt) < lim.minMinutes * 60000) { out.reason = 'too_short'; return out; }
  const hostToday = await env.DB.prepare('SELECT COUNT(*) AS n FROM official_games WHERE host_id = ?1 AND created_at > ?2').bind(hostId, ts - DAY).first('n');
  if (hostToday >= lim.hostDay) { out.reason = 'host_cap'; await flag(env, bot, hostId, 'host_cap', `ведущий провёл ${hostToday} официальных партий за сутки — следующие без изумрудов`); return out; }
  // ranks before this game; the table's average over every seated account
  const rk = {}; for (const id of ids) { const b = (before && before[id]) || (await env.DB.prepare('SELECT points, games FROM ratings WHERE tg_id = ?1').bind(id).first()) || { points: 0, games: 0 }; rk[id] = rankIdx(1000 + (b.points || 0), b.games || 0); }
  const avg = ids.reduce((a, id) => a + rk[id], 0) / ids.length; out.avg = Math.round(avg * 100) / 100;
  const stmts = []; const bans = new Set(((await env.DB.prepare(`SELECT key FROM security_bans WHERE until > ?1 AND key IN (${ids.map((_, i) => '?' + (i + 2)).join(',')})`).bind(ts, ...ids.map(id => 'tg:' + id)).all()).results || []).map(r => Number(String(r.key).slice(3))));
  for (const id of ids) {
    if (bans.has(id)) continue;
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM emerald_ledger WHERE tg_id = ?1 AND kind = 'game' AND created_at > ?2").bind(id, ts - DAY).first('n');
    if (n >= lim.dayGames) { out.capped.push(id); continue; }
    const em = officialReward(avg, rk[id]); out.rewards[id] = em;
    stmts.push(...changeStmts(env, id, em, 'game', 'og:' + hostId, ts));
  }
  const total = Object.values(out.rewards).reduce((a, b) => a + b, 0);
  stmts.push(env.DB.prepare('INSERT OR IGNORE INTO official_games (game_id, host_id, code, players, accounts, avg, total, rewards, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)').bind(String(gameId).slice(0, 64), hostId, code, players.length, ids.length, out.avg, total, JSON.stringify(out.rewards), ts));
  stmts.push(env.DB.prepare('UPDATE official_hosts SET games = games + 1, updated_at = ?2 WHERE tg_id = ?1').bind(hostId, ts));
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  out.total = total;
  // the players learn it from the bot (and on the table's result screen)
  if (bot) {
    const hu = await env.DB.prepare('SELECT first_name, last_name, username, tg_id FROM users WHERE tg_id = ?1').bind(hostId).first();
    for (const id of Object.keys(out.rewards)) { try { const u = await env.DB.prepare('SELECT lang FROM users WHERE tg_id = ?1').bind(Number(id)).first(); const lang = pickLang(u && u.lang); await bot.send(Number(id), t(lang, 'ohReward', { n: out.rewards[id], host: esc(rowName(hu)), balance: await balanceOf(env, Number(id)) })); } catch (e) {} }
    for (const id of out.capped) { try { const u = await env.DB.prepare('SELECT lang FROM users WHERE tg_id = ?1').bind(id).first(); await bot.send(id, t(pickLang(u && u.lang), 'ohCapped', { n: lim.dayGames })); } catch (e) {} }
  }
  await suspicious(env, bot, hostId, ids, ts);
  return out;
}
/* patterns worth an admin's look (never a penalty by themselves): mostly fresh accounts; the same group again and again with one host */
async function suspicious(env, bot, hostId, ids, ts) {
  const fresh = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE created_at > ?1 AND tg_id IN (${ids.map((_, i) => '?' + (i + 2)).join(',')})`).bind(ts - 3 * DAY, ...ids).first('n')) || 0;
  if (fresh * 2 >= ids.length) await flag(env, bot, hostId, 'fresh', `${fresh} из ${ids.length} наград — аккаунтам младше 3 дней`);
  const prev = (await env.DB.prepare('SELECT rewards FROM official_games WHERE host_id = ?1 AND created_at > ?2 ORDER BY created_at DESC LIMIT 13').bind(hostId, ts - DAY).all()).results || [];
  const set = new Set(ids); let same = 0;
  for (const g of prev) { const r = Object.keys(parse(g.rewards) || {}).map(Number); if (r.length && r.filter(x => set.has(x)).length >= Math.ceil(0.8 * Math.max(r.length, ids.length))) same++; }
  if (same >= 5) await flag(env, bot, hostId, 'same', `один и тот же состав — ${same} партий за сутки`);
}
async function flag(env, bot, hostId, kind, text) {
  const key = `oh:flag:${kind}:${hostId}:${Math.floor(now() / DAY)}`;
  const seen = await env.DB.prepare('SELECT 1 FROM discord_cfg WHERE key = ?1').bind(key).first(); if (seen) return;
  await env.DB.prepare('INSERT INTO discord_cfg (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO NOTHING').bind(key, '1', now()).run();
  const hu = await env.DB.prepare('SELECT tg_id, first_name, last_name, username FROM users WHERE tg_id = ?1').bind(hostId).first();
  if (bot) for (const a of adminIds(env)) { try { await bot.send(a, `⚠️ <b>Официальные игры: проверьте</b>\nВедущий: ${esc(rowName(hu))}${hu && hu.username ? ' @' + esc(hu.username) : ''} (id <code>${hostId}</code>)\n${esc(text)}.\nНаказать: /cheat ${hostId} причина · снять статус: /official_off ${hostId}`); } catch (e) {} }
}

/* ---------- the punishment: a ban and the account zeroed ---------- */
export async function punish(env, bot, adminId, target, reason, days) {
  const id = target.tg_id; const ts = now(); reason = str(reason, 200) || 'нарушение правил';
  const forever = !days || days <= 0; const sec = forever ? 100 * 365 * DAY : Math.max(1, Math.min(3650, Math.round(days))) * DAY;
  const bal = await balanceOf(env, id);
  const items = ((await env.DB.prepare("SELECT item FROM purchases WHERE tg_id = ?1 AND kind = 'skin' AND status = 'paid' AND payload LIKE 'em\\_%' ESCAPE '\\'").bind(id).all()).results || []).map(r => r.item);
  const rating = await env.DB.prepare('SELECT points FROM ratings WHERE tg_id = ?1').bind(id).first('points');
  const stmts = [];
  if (bal) stmts.push(...changeStmts(env, id, -bal, 'penalty', 'cheat', ts));
  stmts.push(env.DB.prepare("UPDATE purchases SET status = 'revoked' WHERE tg_id = ?1 AND kind = 'skin' AND status = 'paid' AND payload LIKE 'em\\_%' ESCAPE '\\'").bind(id));
  for (const it of items) stmts.push(env.DB.prepare('DELETE FROM user_skins WHERE tg_id = ?1 AND skin = ?2').bind(id, it), env.DB.prepare('DELETE FROM skin_serials WHERE tg_id = ?1 AND skin = ?2').bind(id, it));
  stmts.push(env.DB.prepare('UPDATE ratings SET points = 0, updated_at = ?2 WHERE tg_id = ?1').bind(id, ts));
  stmts.push(env.DB.prepare("UPDATE official_hosts SET status = 'revoked', until = 0, updated_at = ?2 WHERE tg_id = ?1").bind(id, ts));
  stmts.push(env.DB.prepare("UPDATE host_applications SET status = 'rejected', decided_at = ?2, decided_by = ?3, note = ?4 WHERE tg_id = ?1 AND status = 'pending'").bind(id, ts, adminId, reason));
  stmts.push(env.DB.prepare("UPDATE tournament_players SET status = 'out', updated_at = ?2 WHERE tg_id = ?1 AND tid IN (SELECT id FROM tournaments WHERE status IN ('reg', 'live'))").bind(id, ts));
  stmts.push(env.DB.prepare("DELETE FROM discord_cfg WHERE key = 'lb:top'"));
  stmts.push(env.DB.prepare('INSERT INTO cheat_penalties (tg_id, reason, by, emeralds, items, rating, until, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)').bind(id, reason, adminId, bal, JSON.stringify(items), rating || 0, ts + sec, ts));
  await env.DB.batch(stmts);
  const lang = pickLang(target.lang);
  if (bot) { try { await bot.send(id, t(lang, 'ohPunished', { reason: esc(reason), until: forever ? t(lang, 'ohForever') : fmtDate(ts + sec, lang) })); } catch (e) {} }
  await banKey(env, 'tg:' + id, sec, 'накрутка: ' + reason, 'admin:' + adminId, sec); // after the message: a banned account gets nothing from the bot
  return { ok: true, emeralds: bal, items: items.length, rating: rating || 0, until: (ts + sec) * 1000, forever };
}
export async function pardon(env, target) { const ok = await unbanKey(env, 'tg:' + target.tg_id); return { ok: true, unbanned: ok }; }
export async function penaltiesList(env) {
  const rows = (await env.DB.prepare('SELECT p.*, u.username, u.first_name, u.last_name FROM cheat_penalties p LEFT JOIN users u ON u.tg_id = p.tg_id ORDER BY p.id DESC LIMIT 30').all()).results || [];
  return rows.map(r => ({ tgId: r.tg_id, name: rowName(r) || String(r.tg_id), username: r.username || '', reason: r.reason, emeralds: r.emeralds, items: (parse(r.items) || []).length, until: r.until * 1000, at: r.created_at * 1000 }));
}
/* the estimate a player sees at an official table: the reward for him if the game ended with this table */
export function estimateFor(profiles, ids, me) {
  const rk = id => { const p = profiles[id]; return p ? rankIdx(p.points, p.games) : 0; };
  const list = ids.filter(Boolean); if (!list.length || !me) return null;
  const avg = list.reduce((a, id) => a + rk(id), 0) / list.length;
  return { est: officialReward(avg, rk(me)), avg: Math.round(avg * 100) / 100, myRank: rk(me) };
}
/* /officials in the bot */
export async function officialsText(env) {
  const list = await officialList(env, true); const apps = await pendingApps(env); const ts = Date.now();
  const lines = [`🎩 <b>Официальные ведущие</b>: активных ${list.filter(x => x.official.active).length}`];
  list.slice(0, 40).forEach(x => lines.push(`${x.official.active ? '✅' : x.official.status === 'revoked' ? '⛔' : '⏳'} ${esc(x.name)}${x.username ? ' @' + esc(x.username) : ''} (<code>${x.tgId}</code>) — ${x.official.active ? 'до ' + new Date(x.official.until).toISOString().slice(0, 10) : x.official.status === 'revoked' ? 'снят' : x.official.until && x.official.until < ts ? 'лицензия истекла' : 'одобрен, без лицензии'} · ${x.official.source === 'admin' ? 'назначен' : 'по анкете'} · официальных партий ${x.official.games}`));
  if (apps.length) { lines.push('', `📝 Анкеты на рассмотрении: ${apps.length}`); apps.forEach(a => lines.push(`#${a.id} ${esc(a.name)}${a.username ? ' @' + esc(a.username) : ''} — партий ${a.hosted}`)); }
  lines.push('', '/official @user [дней] — назначить · /official_off @user — снять · /cheat @user [дней] причина — бан и обнуление · /uncheat @user — разбан');
  return lines.join('\n').slice(0, 3900);
}

/* ---------- the cron (every 5 minutes): the licence ends in 3 days → a reminder; ended → a notice (each once) ---------- */
export async function runOfficialCron(env, bot) {
  const ts = now(); const lic = license(env); let sent = 0;
  const soon = (await env.DB.prepare("SELECT o.tg_id, o.until, u.lang FROM official_hosts o LEFT JOIN users u ON u.tg_id = o.tg_id WHERE o.status = 'ok' AND o.until > ?1 AND o.until <= ?2").bind(ts, ts + 3 * DAY).all()).results || [];
  for (const r of soon) { const key = `oh:soon:${r.tg_id}:${r.until}`; if (await env.DB.prepare('SELECT 1 FROM discord_cfg WHERE key = ?1').bind(key).first()) continue; await env.DB.prepare('INSERT INTO discord_cfg (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO NOTHING').bind(key, '1', ts).run(); const lang = pickLang(r.lang); try { await bot.send(r.tg_id, t(lang, 'ohExpiring', { until: fmtDate(r.until, lang), price: lic.price, days: lic.days }), playBtn(env, lang)); sent++; } catch (e) {} }
  const ended = (await env.DB.prepare("SELECT o.tg_id, o.until, u.lang FROM official_hosts o LEFT JOIN users u ON u.tg_id = o.tg_id WHERE o.status = 'ok' AND o.until > 0 AND o.until <= ?1 AND o.until > ?2").bind(ts, ts - 2 * DAY).all()).results || [];
  for (const r of ended) { const key = `oh:ended:${r.tg_id}:${r.until}`; if (await env.DB.prepare('SELECT 1 FROM discord_cfg WHERE key = ?1').bind(key).first()) continue; await env.DB.prepare('INSERT INTO discord_cfg (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO NOTHING').bind(key, '1', ts).run(); const lang = pickLang(r.lang); try { await bot.send(r.tg_id, t(lang, 'ohExpired'), playBtn(env, lang)); sent++; } catch (e) {} }
  return { sent };
}
