/* v63: the weekly tournament — emeralds are won here (emeralds.js).
   - a tournament per week (week = the Monday's date in Kyiv): registration opens Monday 12:00, the games are on Saturday and Sunday,
     the tournament closes Monday 00:00 (prizes are paid then; the admin may close it earlier from the app)
   - the admin sets the format before the draw: online / offline, the scenario (classic, the role-play preset, an intro theme) and the table size
   - players register as a player or as a host («I can host»); hosts never sit; admins are hosts
   - the draw (the admin, from the app): the players are shuffled into tables (classic — exactly 10 at a table, the rest sit this round out,
     those with the fewest games sit first; other formats — tables of about n, at least 7); a «final» draw seats by the standings instead;
     every table with a host becomes an ordinary table of the app (lobbies / lobby_players, the host's newest), the host deals and plays as usual
   - points: a table's game reported by its host (/api/game/result with the table's code) credits each seated participant with the game's
     points floored at 0 (a loss gives nothing); standings: points, then wins, then who registered first
   - prizes: prizeTable(players who played, fund) → emeralds, a message to every winner; the admins get the summary
   - Epic skins: while the games are on (Saturday 00:00 → the close), every registered participant may wear any Epic skin (index.js, skins.js);
     at the close the borrowed skins come off */
import { kyivMidnight } from './ranks.js';
import { prizeTable, changeStmts, defaultFund } from './emeralds.js';
import { t, pickLang } from './texts.js';
import { esc } from './tg.js';
import { cleanStr } from './security.js';

const now = () => Math.floor(Date.now() / 1000);
const DAY = 86400000;
export const MODES = ['online', 'offline'];
export const SCENARIOS = ['classic', 'preset', 'intro:first', 'intro:detective', 'intro:guard', 'intro:trumps', 'intro:third'];
export const N_MIN = 7, N_MAX = 16; // table sizes the admin may pick for the role-play formats (classic is 10)
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function randomCode(n = 6) { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join(''); }
const rowName = r => r ? [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || (r.username ? '@' + r.username : '') : '';

/* ---------- the week in Kyiv ---------- */
/* the Kyiv calendar date of a moment (ms): { y, m, d, dow } (dow 0 = Sunday) */
export function kyivDate(ms) {
  const g = new Date(ms + 2 * 3600000); let d = { y: g.getUTCFullYear(), m: g.getUTCMonth() + 1, d: g.getUTCDate() };
  const dst = kyivMidnight(d) === Date.UTC(d.y, d.m - 1, d.d) - 3 * 3600000; // summer time: the day began an hour earlier in UTC
  if (dst) { const h = new Date(ms + 3 * 3600000); d = { y: h.getUTCFullYear(), m: h.getUTCMonth() + 1, d: h.getUTCDate() }; }
  return Object.assign(d, { dow: new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay() });
}
const plusDays = (d, k) => { const x = new Date(Date.UTC(d.y, d.m - 1, d.d) + k * DAY); return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() }; };
export const dayKey = d => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
const fmtDay = d => `${String(d.d).padStart(2, '0')}.${String(d.m).padStart(2, '0')}`;
/* the week a moment belongs to: its Monday, when the registration opens, when the games begin and when it closes (ms, UTC) */
export function weekOf(ms) {
  const today = kyivDate(ms); const mon = plusDays(today, -((today.dow + 6) % 7));
  return weekFrom(mon);
}
export function weekFrom(mon) {
  const sat = plusDays(mon, 5), nextMon = plusDays(mon, 7);
  return { week: dayKey(mon), monday: mon, opensAt: kyivMidnight(mon) + 12 * 3600000, gamesAt: kyivMidnight(sat), closesAt: kyivMidnight(nextMon), satDay: sat, sunDay: plusDays(mon, 6) };
}
export const weekNow = env => weekOf(env && env.TRN_NOW_MS ? Number(env.TRN_NOW_MS) : Date.now());
const nowMs = env => (env && env.TRN_NOW_MS ? Number(env.TRN_NOW_MS) : Date.now());
/* the phase by the clock: reg (before the games), games (Saturday + Sunday), over */
export const phaseOf = (tr, ms) => (ms >= tr.closes_at * 1000 ? 'over' : ms >= tr.games_at * 1000 ? 'games' : 'reg');

/* ---------- rows ---------- */
export async function currentTournament(env) {
  // the newest one that is not closed, else the newest of all (for the results view)
  const open = await env.DB.prepare("SELECT * FROM tournaments WHERE status IN ('reg', 'live') ORDER BY opens_at DESC LIMIT 1").first();
  if (open) return open;
  return env.DB.prepare('SELECT * FROM tournaments ORDER BY opens_at DESC LIMIT 1').first();
}
export async function tournamentRow(env, id) { return env.DB.prepare('SELECT * FROM tournaments WHERE id = ?1').bind(id).first(); }
const lastSettings = async env => (await env.DB.prepare('SELECT mode, scenario, n, fund FROM tournaments ORDER BY opens_at DESC LIMIT 1').first()) || null;
/* make this week's tournament (the cron at Monday 12:00, or the admin «open now»); returns the row (existing or new) */
export async function openTournament(env, bot, opts = {}) {
  const w = weekNow(env);
  const ex = await env.DB.prepare('SELECT * FROM tournaments WHERE week = ?1').bind(w.week).first();
  if (ex) return ex;
  const prev = await lastSettings(env);
  const mode = MODES.includes(opts.mode) ? opts.mode : prev && MODES.includes(prev.mode) ? prev.mode : 'online';
  const scenario = SCENARIOS.includes(opts.scenario) ? opts.scenario : prev && SCENARIOS.includes(prev.scenario) ? prev.scenario : 'classic';
  const n = fixN(scenario, Number(opts.n) || (prev && prev.n) || 10);
  const fund = Math.max(0, Math.round(Number(opts.fund) || (prev && prev.fund) || defaultFund(env)));
  const ts = now();
  const ins = await env.DB.prepare('INSERT INTO tournaments (week, status, mode, scenario, n, fund, round, opens_at, games_at, closes_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8, ?9, ?10)')
    .bind(w.week, 'reg', mode, scenario, n, fund, Math.floor(w.opensAt / 1000), Math.floor(w.gamesAt / 1000), Math.floor(w.closesAt / 1000), ts).run();
  const tr = await tournamentRow(env, ins.meta.last_row_id);
  if (bot) for (const a of adminIds(env)) { try { await bot.send(a, t('ru', 'trnOpened', { sat: fmtDay(w.satDay), sun: fmtDay(w.sunDay), mode: t('ru', 'trnMode_' + mode), scen: scenName('ru', scenario), n, fund })); } catch (e) { console.error('trn open', e); } }
  return tr;
}
export const fixN = (scenario, n) => (scenario === 'classic' ? 10 : Math.max(N_MIN, Math.min(N_MAX, Math.round(n) || 10)));
export const adminIds = env => String(env.ADMIN_IDS || '').split(',').map(x => Number(x.trim())).filter(Boolean);
export const scenName = (lang, s) => t(lang, 'trnScen_' + String(s).replace(':', '_')) || s;

/* ---------- players ---------- */
export async function playerRow(env, tid, tgId) { return env.DB.prepare('SELECT * FROM tournament_players WHERE tid = ?1 AND tg_id = ?2').bind(tid, tgId).first(); }
/* register (role: player | host), change the role, or leave; allowed while the tournament is not closed */
export async function joinTournament(env, tr, u, body) {
  if (!tr || !['reg', 'live'].includes(tr.status)) return { ok: false, error: 'closed' };
  if (nowMs(env) >= tr.closes_at * 1000) return { ok: false, error: 'closed' };
  const ts = now(); const leave = body.in === false;
  if (leave) { await env.DB.prepare("UPDATE tournament_players SET status = 'out', updated_at = ?3 WHERE tid = ?1 AND tg_id = ?2").bind(tr.id, u.id, ts).run(); return { ok: true, in: false }; }
  const role = body.host ? 'host' : 'player';
  const name = cleanStr(String([u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.id)).slice(0, 64);
  await env.DB.prepare(`INSERT INTO tournament_players (tid, tg_id, role, status, name, username, lang, points, games, wins, registered_at, updated_at) VALUES (?1, ?2, ?3, 'in', ?4, ?5, ?6, 0, 0, 0, ?7, ?7)
    ON CONFLICT(tid, tg_id) DO UPDATE SET role = ?3, status = 'in', name = ?4, username = ?5, lang = ?6, updated_at = ?7`).bind(tr.id, u.id, role, name, u.username || null, pickLang(u.language_code), ts).run();
  return { ok: true, in: true, role };
}
export async function playersOf(env, tid) {
  return (await env.DB.prepare('SELECT * FROM tournament_players WHERE tid = ?1 ORDER BY registered_at, tg_id').bind(tid).all()).results || [];
}
/* standings of the players (role player, in): points, wins, who registered first; place only for those who played */
export function standingsOf(players) {
  const list = players.filter(p => p.role === 'player' && p.status === 'in').sort((a, b) => b.points - a.points || b.wins - a.wins || a.games - b.games || a.registered_at - b.registered_at || a.tg_id - b.tg_id);
  let place = 0; return list.map(p => Object.assign({}, p, { place: p.games > 0 ? ++place : null }));
}

/* ---------- the draw ---------- */
/* table sizes for N players: fixed n (classic) → whole tables of n, the rest sit out; otherwise tables of about n, none under 7 */
export function tableSizes(N, n, fixed) {
  N = Math.max(0, N | 0); n = Math.max(2, n | 0);
  if (fixed) { const k = Math.floor(N / n); return { sizes: Array(k).fill(n), byes: N - k * n }; }
  if (N < N_MIN) return { sizes: [], byes: N };
  let k = Math.max(1, Math.round(N / n));
  const split = k => { const base = Math.floor(N / k), rem = N % k; return Array.from({ length: k }, (_, i) => base + (i < rem ? 1 : 0)); };
  let sizes = split(k);
  while (k > 1 && Math.min(...sizes) < N_MIN) { k--; sizes = split(k); }
  while (Math.max(...sizes) > 24 && k < N) { k++; sizes = split(k); }
  return { sizes, byes: 0 };
}
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/* the next round: who sits where; final = seat by the standings (table 1 = the leaders); returns { round, tables, byes } */
export async function drawRound(env, bot, tr, opts = {}) {
  if (!tr || !['reg', 'live'].includes(tr.status)) return { ok: false, error: 'closed' };
  const ms = nowMs(env); if (ms >= tr.closes_at * 1000) return { ok: false, error: 'closed' };
  const players = await playersOf(env, tr.id);
  let pool = players.filter(p => p.role === 'player' && p.status === 'in');
  const fixed = tr.scenario === 'classic';
  const { sizes, byes } = tableSizes(pool.length, tr.n, fixed);
  if (!sizes.length) return { ok: false, error: 'few_players', players: pool.length, need: fixed ? tr.n : N_MIN };
  // who sits this round: with fixed tables those with the fewest games first (the bench rotates), ties at random
  if (opts.final) pool = standingsOf(players).map(p => players.find(x => x.tg_id === p.tg_id)); // by the standings
  else { shuffle(pool); if (byes) pool.sort((a, b) => a.games - b.games); }
  const seated = pool.slice(0, pool.length - byes); const bench = pool.slice(pool.length - byes);
  if (!opts.final) shuffle(seated);
  const hosts = await hostPool(env, tr, players); // volunteers (admins first, then by games hosted), free this round
  const round = (tr.round || 0) + 1; const ts = now();
  // the previous round's tables that never played are closed
  await env.DB.prepare("UPDATE tournament_tables SET status = 'skipped' WHERE tid = ?1 AND status = 'open'").bind(tr.id).run();
  const tables = []; let at = 0;
  for (let i = 0; i < sizes.length; i++) {
    const seats = seated.slice(at, at + sizes[i]); at += sizes[i];
    const host = hosts[i] || null;
    await env.DB.prepare("INSERT INTO tournament_tables (tid, round, idx, code, host_id, size, seats, status, created_at) VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?6, 'open', ?7)").bind(tr.id, round, i + 1, host ? host.tg_id : null, seats.length, JSON.stringify(seats.map(p => p.tg_id)), ts).run();
    const tb = { round, idx: i + 1, hostId: host ? host.tg_id : null, host: host ? host.name : '', size: seats.length, seats: seats.map(p => ({ tgId: p.tg_id, name: p.name })), code: null };
    if (host) tb.code = await makeTable(env, tr, tb, seats, host);
    tables.push(tb);
  }
  await env.DB.prepare("UPDATE tournaments SET status = 'live', round = ?2, round_info = ?3, updated_at = ?4 WHERE id = ?1").bind(tr.id, round, JSON.stringify({ byes: bench.map(p => p.tg_id), final: !!opts.final, at: ts }), ts).run();
  if (bot) await tellSeats(env, bot, tr, tables, bench, round);
  return { ok: true, round, tables, byes: bench.map(p => ({ tgId: p.tg_id, name: p.name })) };
}
/* hosts for the round: registered hosts (admins first, then the most experienced), as many as there are tables */
async function hostPool(env, tr, players) {
  const vols = players.filter(p => p.role === 'host' && p.status === 'in');
  const ids = vols.map(p => p.tg_id); const hosted = {};
  if (ids.length) for (const r of (await env.DB.prepare(`SELECT tg_id, hosted FROM ratings WHERE tg_id IN (${ids.map((_, i) => '?' + (i + 1)).join(',')})`).bind(...ids).all()).results || []) hosted[r.tg_id] = r.hosted || 0;
  const admins = adminIds(env);
  return vols.sort((a, b) => (admins.includes(b.tg_id) ? 1 : 0) - (admins.includes(a.tg_id) ? 1 : 0) || (hosted[b.tg_id] || 0) - (hosted[a.tg_id] || 0) || a.registered_at - b.registered_at);
}
/* a tournament table with a host becomes a table of the app: the host's newest open lobby, the players already seated in the drawn order */
async function makeTable(env, tr, tb, seats, host) {
  let code = randomCode(); for (let i = 0; i < 5; i++) { const ex = await env.DB.prepare('SELECT 1 FROM lobbies WHERE code = ?1').bind(code).first(); if (!ex) break; code = randomCode(); }
  const ts = now(); const hostUser = await env.DB.prepare('SELECT lang FROM users WHERE tg_id = ?1').bind(host.tg_id).first();
  const stmts = [
    env.DB.prepare("UPDATE lobbies SET status = 'closed' WHERE host_id = ?1 AND status IN ('open', 'dealt')").bind(host.tg_id), // one table per host
    env.DB.prepare("INSERT INTO lobbies (code, host_id, status, created_at) VALUES (?1, ?2, 'open', ?3)").bind(code, host.tg_id, ts),
    env.DB.prepare('INSERT OR IGNORE INTO lobby_meta (code, creator_id, lang, updated_at) VALUES (?1, ?2, ?3, ?4)').bind(code, host.tg_id, pickLang(host.lang || (hostUser && hostUser.lang)), ts),
    env.DB.prepare('INSERT INTO lobby_opts (code, host_plays, online, updated_at) VALUES (?1, 0, ?2, ?3)').bind(code, tr.mode === 'online' ? 1 : 0, ts),
    env.DB.prepare('UPDATE tournament_tables SET code = ?4, host_id = ?5 WHERE tid = ?1 AND round = ?2 AND idx = ?3').bind(tr.id, tb.round, tb.idx, code, host.tg_id)
  ];
  seats.forEach((p, i) => stmts.push(env.DB.prepare('INSERT OR IGNORE INTO lobby_players (code, tg_id, name, username, lang, joined_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(code, p.tg_id, p.name, p.username || null, p.lang || 'ru', ts + i)));
  await env.DB.batch(stmts);
  return code;
}
/* the admin gives a table its host (a registered host, or any user by id when the admin insists); re-seats the table under the new host */
export async function setTableHost(env, bot, tr, round, idx, hostId) {
  const tb = await env.DB.prepare('SELECT * FROM tournament_tables WHERE tid = ?1 AND round = ?2 AND idx = ?3').bind(tr.id, round, idx).first();
  if (!tb || tb.status !== 'open') return { ok: false, error: 'no_table' };
  const host = await env.DB.prepare('SELECT u.tg_id, u.first_name, u.last_name, u.username, u.lang, p.role FROM users u LEFT JOIN tournament_players p ON p.tid = ?2 AND p.tg_id = u.tg_id WHERE u.tg_id = ?1').bind(hostId, tr.id).first();
  if (!host) return { ok: false, error: 'no_user' };
  const seatIds = JSON.parse(tb.seats || '[]'); if (seatIds.includes(host.tg_id)) return { ok: false, error: 'seated' }; // a player of this table cannot host it
  const players = await playersOf(env, tr.id); const seats = seatIds.map(id => players.find(p => p.tg_id === id)).filter(Boolean);
  if (tb.code) await env.DB.prepare("UPDATE lobbies SET status = 'closed' WHERE code = ?1 AND status IN ('open', 'dealt')").bind(tb.code).run();
  const name = rowName(host) || String(host.tg_id);
  const code = await makeTable(env, tr, { round, idx }, seats, { tg_id: host.tg_id, name, lang: host.lang });
  if (bot) await tellSeats(env, bot, tr, [{ round, idx, hostId: host.tg_id, host: name, size: seats.length, seats: seats.map(p => ({ tgId: p.tg_id, name: p.name })), code }], [], round);
  return { ok: true, code };
}
/* the host takes his table of the round: it becomes his newest open table again (the app opens the newest), the drawn seats are restored */
export async function takeTable(env, tr, hostId) {
  if (!tr || tr.status !== 'live') return { ok: false, error: 'closed' };
  const tb = await env.DB.prepare("SELECT * FROM tournament_tables WHERE tid = ?1 AND round = ?2 AND host_id = ?3 AND status = 'open'").bind(tr.id, tr.round, hostId).first();
  if (!tb || !tb.code) return { ok: false, error: 'no_table' };
  const ts = now(); const lobby = await env.DB.prepare('SELECT status FROM lobbies WHERE code = ?1').bind(tb.code).first();
  const stmts = [env.DB.prepare("UPDATE lobbies SET status = 'closed' WHERE host_id = ?1 AND status IN ('open', 'dealt') AND code != ?2").bind(hostId, tb.code)];
  if (lobby && (lobby.status === 'open' || lobby.status === 'closed')) stmts.push(env.DB.prepare("UPDATE lobbies SET status = 'open', created_at = ?2 WHERE code = ?1").bind(tb.code, ts));
  const players = await playersOf(env, tr.id);
  JSON.parse(tb.seats || '[]').forEach((id, i) => { const p = players.find(x => x.tg_id === id); if (p) stmts.push(env.DB.prepare('INSERT OR IGNORE INTO lobby_players (code, tg_id, name, username, lang, joined_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(tb.code, id, p.name, p.username || null, p.lang || 'ru', tb.created_at + i)); });
  await env.DB.batch(stmts);
  return { ok: true, code: tb.code, round: tb.round, idx: tb.idx, size: tb.size };
}
/* the tables of a round with their hosts and seats (for the app) */
export async function tablesOf(env, tr, round) {
  const rows = (await env.DB.prepare('SELECT * FROM tournament_tables WHERE tid = ?1 AND round = ?2 ORDER BY idx').bind(tr.id, round).all()).results || [];
  const hostIds = rows.map(r => r.host_id).filter(Boolean); const hosts = {};
  if (hostIds.length) for (const r of (await env.DB.prepare(`SELECT tg_id, first_name, last_name, username FROM users WHERE tg_id IN (${hostIds.map((_, i) => '?' + (i + 1)).join(',')})`).bind(...hostIds).all()).results || []) hosts[r.tg_id] = rowName(r) || String(r.tg_id);
  const players = await playersOf(env, tr.id); const nameOf = id => { const p = players.find(x => x.tg_id === id); return p ? p.name : String(id); };
  return rows.map(r => ({ round: r.round, idx: r.idx, code: r.code, hostId: r.host_id, host: r.host_id ? hosts[r.host_id] || String(r.host_id) : '', size: r.size, status: r.status, seats: JSON.parse(r.seats || '[]').map((id, i) => ({ seat: i + 1, tgId: id, name: nameOf(id) })) }));
}
/* a DM to everyone seated (table, seat, host, a button to the table) and to each host (the table's code); the bench is told it sits out */
async function tellSeats(env, bot, tr, tables, bench, round) {
  const btn = (lang, code) => ({ reply_markup: { inline_keyboard: [[{ text: t(lang, 'btnOpenTable', { code }), web_app: { url: `${env.APP_URL}${env.APP_URL.includes('?') ? '&' : '?'}startapp=${tr.mode === 'online' && code ? 'table_' + code : 'tournament'}` } }]] } });
  const players = await playersOf(env, tr.id); const langOf = id => { const p = players.find(x => x.tg_id === id); return pickLang(p && p.lang); };
  for (const tb of tables) {
    for (const s of tb.seats) { const lang = langOf(s.tgId); try { await bot.send(s.tgId, t(lang, 'trnSeat', { round, table: tb.idx, seat: tb.seats.indexOf(s) + 1, host: esc(tb.host || t(lang, 'trnNoHostYet')), code: tb.code || '—', mode: t(lang, 'trnMode_' + tr.mode) }), btn(lang, tb.code || '')); } catch (e) {} }
    if (tb.hostId) { const lang = langOf(tb.hostId); try { await bot.send(tb.hostId, t(lang, 'trnHostTable', { round, table: tb.idx, n: tb.size, code: tb.code, scen: scenName(lang, tr.scenario), mode: t(lang, 'trnMode_' + tr.mode) }), { reply_markup: { inline_keyboard: [[{ text: t(lang, 'btnOpenTable', { code: tb.code }), web_app: { url: `${env.APP_URL}${env.APP_URL.includes('?') ? '&' : '?'}startapp=tournament` } }]] } }); } catch (e) {} }
  }
  for (const b of bench) { const lang = langOf(b.tg_id); try { await bot.send(b.tg_id, t(lang, 'trnBench', { round })); } catch (e) {} }
}

/* ---------- points ---------- */
/* a finished game at a tournament table: the seated participants get the game's points (not below 0); once per table */
export async function creditGame(env, code, hostId, players) {
  if (!code) return null;
  const tb = await env.DB.prepare("SELECT t.*, tr.status AS tstatus, tr.closes_at FROM tournament_tables t JOIN tournaments tr ON tr.id = t.tid WHERE t.code = ?1").bind(code).first();
  if (!tb || tb.tstatus !== 'live' || tb.host_id !== hostId || tb.status === 'played') return null;
  const ts = now(); const seated = new Set(JSON.parse(tb.seats || '[]'));
  const stmts = [env.DB.prepare("UPDATE tournament_tables SET status = 'played', played_at = ?4 WHERE tid = ?1 AND round = ?2 AND idx = ?3").bind(tb.tid, tb.round, tb.idx, ts)];
  const credited = {};
  for (const p of players) {
    const id = Number(p.tgId); if (!id || !seated.has(id)) continue;
    const pts = Math.max(0, Math.round(Number(p.points) || 0)); credited[id] = pts;
    stmts.push(env.DB.prepare("UPDATE tournament_players SET points = points + ?3, games = games + 1, wins = wins + ?4, updated_at = ?5 WHERE tid = ?1 AND tg_id = ?2 AND role = 'player'").bind(tb.tid, id, pts, p.won ? 1 : 0, ts));
  }
  await env.DB.batch(stmts);
  return { tid: tb.tid, round: tb.round, idx: tb.idx, credited };
}

/* ---------- the close ---------- */
export async function closeTournament(env, bot, tr, by) {
  if (!tr || !['reg', 'live'].includes(tr.status)) return { ok: false, error: 'closed' };
  const players = await playersOf(env, tr.id); const st = standingsOf(players); const played = st.filter(p => p.place);
  const prizes = prizeTable(played.length, tr.fund); const ts = now();
  const stmts = [env.DB.prepare("UPDATE tournaments SET status = ?2, closed_at = ?3, updated_at = ?3 WHERE id = ?1").bind(tr.id, played.length ? 'done' : 'cancelled', ts)];
  const won = [];
  played.forEach((p, i) => {
    const prize = prizes[i] || 0;
    stmts.push(env.DB.prepare('UPDATE tournament_players SET place = ?3, prize = ?4, updated_at = ?5 WHERE tid = ?1 AND tg_id = ?2').bind(tr.id, p.tg_id, i + 1, prize, ts));
    if (prize > 0) { stmts.push(...changeStmts(env, p.tg_id, prize, 'prize', 'trn:' + tr.week, ts)); won.push({ tgId: p.tg_id, name: p.name, username: p.username, lang: p.lang, place: i + 1, prize, points: p.points }); }
  });
  stmts.push(env.DB.prepare("UPDATE tournament_tables SET status = 'skipped' WHERE tid = ?1 AND status = 'open'").bind(tr.id));
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  await dropBorrowedSkins(env, players.map(p => p.tg_id));
  if (bot) {
    for (const w of won) { try { const lang = pickLang(w.lang); await bot.send(w.tgId, t(lang, 'trnPrize', { place: w.place, prize: w.prize, points: w.points, n: played.length }), bot.playButton(t(lang, 'play'), env.APP_URL)); } catch (e) {} }
    const head = played.length ? `🏆 <b>Турнир недели ${tr.week} завершён${by ? ' (' + esc(String(by)) + ')' : ''}.</b> Играли: ${played.length}, фонд ${tr.fund} 💎, раундов: ${tr.round}.` : `🏁 Турнир недели ${tr.week}: партий не было — отменён, призы не выданы.`;
    const list = won.slice(0, 50).map(w => `${w.place}. ${esc(w.name)}${w.username ? ' @' + esc(w.username) : ''} — ${w.points} очк. → <b>${w.prize}</b> 💎`);
    const text = [head, ...list].join('\n');
    for (const a of adminIds(env)) { try { await bot.send(a, text.slice(0, 3900)); } catch (e) {} }
  }
  return { ok: true, status: played.length ? 'done' : 'cancelled', played: played.length, won };
}
/* the Epic skins borrowed for the tournament come off: what a player does not own is unworn */
async function dropBorrowedSkins(env, ids) {
  for (const id of ids) {
    const rows = (await env.DB.prepare('SELECT role, skin FROM user_skins WHERE tg_id = ?1').bind(id).all()).results || []; if (!rows.length) continue;
    const owned = new Set(((await env.DB.prepare("SELECT item FROM purchases WHERE tg_id = ?1 AND kind = 'skin' AND status IN ('paid', 'reward')").bind(id).all()).results || []).map(r => r.item));
    if (adminIds(env).includes(id)) continue;
    for (const r of rows) if (!owned.has(r.skin)) await env.DB.prepare('DELETE FROM user_skins WHERE tg_id = ?1 AND role = ?2').bind(id, r.role).run();
  }
}
/* is this player allowed to wear every Epic skin right now? (a registered participant while the games are on) */
export async function borrowsSkins(env, tgId) {
  const tr = await env.DB.prepare("SELECT * FROM tournaments WHERE status IN ('reg', 'live') ORDER BY opens_at DESC LIMIT 1").first();
  if (!tr || phaseOf(tr, nowMs(env)) !== 'games') return null;
  const p = await playerRow(env, tr.id, tgId); if (!p || p.status !== 'in') return null;
  return { until: tr.closes_at * 1000, week: tr.week };
}

/* ---------- the cron (every 5 minutes) ---------- */
export async function runTournamentCron(env, bot) {
  const ms = nowMs(env); const w = weekOf(ms); const out = {};
  // Monday 12:00: this week's registration opens (within a day of it — a deploy later in the week does not open one by itself; the admin can)
  if (ms >= w.opensAt && ms < w.opensAt + DAY) { const ex = await env.DB.prepare('SELECT id FROM tournaments WHERE week = ?1').bind(w.week).first(); if (!ex) { const tr = await openTournament(env, bot); out.opened = tr.week; } }
  // Saturday 00:00 (the first cron after it): the players are told the games begin today
  const live = await env.DB.prepare("SELECT * FROM tournaments WHERE status IN ('reg', 'live') ORDER BY opens_at DESC LIMIT 1").first();
  if (live && ms >= live.games_at * 1000 && !live.started_at && ms < live.closes_at * 1000) {
    await env.DB.prepare('UPDATE tournaments SET started_at = ?2 WHERE id = ?1').bind(live.id, now()).run();
    const players = await playersOf(env, live.id);
    for (const p of players.filter(x => x.status === 'in').slice(0, 500)) { try { await bot.send(p.tg_id, t(pickLang(p.lang), p.role === 'host' ? 'trnStartHost' : 'trnStart', { n: players.filter(x => x.role === 'player' && x.status === 'in').length, fund: live.fund }), { reply_markup: { inline_keyboard: [[{ text: t(pickLang(p.lang), 'trnBtn'), web_app: { url: `${env.APP_URL}${env.APP_URL.includes('?') ? '&' : '?'}startapp=tournament` } }]] } }); } catch (e) {} }
    for (const a of adminIds(env)) { try { await bot.send(a, t('ru', 'trnStartAdmin', { n: players.filter(x => x.role === 'player' && x.status === 'in').length, h: players.filter(x => x.role === 'host' && x.status === 'in').length })); } catch (e) {} }
    out.started = live.week;
  }
  // Monday 00:00: the past week's tournament closes, prizes go out
  const over = (await env.DB.prepare("SELECT * FROM tournaments WHERE status IN ('reg', 'live') AND closes_at <= ?1 ORDER BY opens_at LIMIT 3").bind(Math.floor(ms / 1000)).all()).results || [];
  for (const tr of over) { try { const r = await closeTournament(env, bot, tr, null); out.closed = (out.closed || []).concat([[tr.week, r.status]]); } catch (e) { console.error('trn close', e); } }
  return out;
}

/* ---------- the view for the app ---------- */
export async function tournamentView(env, tgId, admin) {
  const tr = await currentTournament(env); const ms = nowMs(env); const w = weekNow(env);
  const next = ms < w.opensAt ? w : weekFrom(plusDays(w.monday, 7));
  if (!tr) return { ok: true, t: null, next: { week: next.week, opensAt: next.opensAt, sat: next.satDay, sun: next.sunDay } };
  const players = await playersOf(env, tr.id); const st = standingsOf(players); const me = players.find(p => p.tg_id === tgId) || null;
  const playing = st.length; const hosts = players.filter(p => p.role === 'host' && p.status === 'in');
  const tables = tr.round ? await tablesOf(env, tr, tr.round) : [];
  const mine = tables.find(tb => tb.seats.some(s => s.tgId === tgId)) || null; const hosting = tables.find(tb => tb.hostId === tgId) || null;
  const info = tr.round_info ? JSON.parse(tr.round_info) : {};
  const out = {
    ok: true,
    t: { id: tr.id, week: tr.week, status: tr.status, phase: phaseOf(tr, ms), mode: tr.mode, scenario: tr.scenario, n: tr.n, fund: tr.fund, round: tr.round || 0, final: !!info.final, opensAt: tr.opens_at * 1000, gamesAt: tr.games_at * 1000, closesAt: tr.closes_at * 1000, players: playing, hosts: hosts.length, played: st.filter(p => p.place).length },
    me: me ? { in: me.status === 'in', role: me.role, points: me.points, games: me.games, wins: me.wins, place: (st.find(p => p.tg_id === tgId) || {}).place || null, prize: me.prize || 0 } : null,
    prizes: prizeTable(Math.max(st.filter(p => p.place).length, playing), tr.fund),
    standings: st.slice(0, 60).map(p => ({ tgId: p.tg_id, name: p.name, username: p.username || '', points: p.points, games: p.games, wins: p.wins, place: p.place, prize: p.prize || 0 })),
    myTable: mine ? { round: mine.round, idx: mine.idx, code: mine.code, host: mine.host, hostId: mine.hostId, seat: mine.seats.findIndex(s => s.tgId === tgId) + 1, size: mine.size, status: mine.status, seats: mine.seats } : null,
    hosting: hosting ? { round: hosting.round, idx: hosting.idx, code: hosting.code, size: hosting.size, status: hosting.status, seats: hosting.seats } : null,
    bench: Array.isArray(info.byes) && info.byes.includes(tgId),
    tables: tables.map(tb => ({ round: tb.round, idx: tb.idx, code: admin || tb.hostId === tgId ? tb.code : null, host: tb.host, hostId: tb.hostId, size: tb.size, status: tb.status, seats: tb.seats })),
    next: { week: next.week, opensAt: next.opensAt, sat: next.satDay, sun: next.sunDay }
  };
  if (admin) out.admin = { hosts: hosts.map(p => ({ tgId: p.tg_id, name: p.name, username: p.username || '' })), out: players.filter(p => p.status === 'out').length, byes: Array.isArray(info.byes) ? info.byes.length : 0, modes: MODES, scenarios: SCENARIOS };
  return out;
}
/* the admin's settings before the draw (after it the format is fixed) */
export async function setTournament(env, tr, body) {
  if (!tr || !['reg', 'live'].includes(tr.status)) return { ok: false, error: 'closed' };
  const mode = MODES.includes(body.mode) ? body.mode : tr.mode; const scenario = SCENARIOS.includes(body.scenario) ? body.scenario : tr.scenario;
  if (tr.round && (mode !== tr.mode || scenario !== tr.scenario)) return { ok: false, error: 'drawn' };
  const n = fixN(scenario, body.n != null ? Number(body.n) : tr.n); const fund = body.fund != null ? Math.max(0, Math.min(1000000, Math.round(Number(body.fund) || 0))) : tr.fund;
  await env.DB.prepare('UPDATE tournaments SET mode = ?2, scenario = ?3, n = ?4, fund = ?5, updated_at = ?6 WHERE id = ?1').bind(tr.id, mode, scenario, n, fund, now()).run();
  return { ok: true };
}
/* /tournament in the bot (admins): a short status */
export async function tournamentStatusText(env) {
  const tr = await currentTournament(env); if (!tr) return 'Турнира ещё нет. Регистрация открывается по понедельникам в 12:00 (Киев); открыть сейчас — в приложении: Турнир → панель администратора.';
  const players = await playersOf(env, tr.id); const st = standingsOf(players);
  const lines = [`🏆 Турнир недели ${tr.week}: <b>${tr.status}</b>, ${t('ru', 'trnMode_' + tr.mode)}, ${scenName('ru', tr.scenario)}, стол ${tr.n}, фонд ${tr.fund} 💎, раунд ${tr.round || 0}`, `Игроков: ${st.length}, ведущих: ${players.filter(p => p.role === 'host' && p.status === 'in').length}, сыграли: ${st.filter(p => p.place).length}`];
  st.slice(0, 15).forEach(p => lines.push(`${p.place || '—'}. ${esc(p.name)}${p.username ? ' @' + esc(p.username) : ''} — ${p.points} (${p.games} партий, ${p.wins} побед)`));
  lines.push('Управление — в приложении: Турнир → панель администратора.');
  return lines.join('\n');
}
