/* Player growth (v42): who is new, where they came from, their Telegram tag and the name they play under.
   - trackStart(env, u, param, isNew)  /start in the bot (any first message of a new user counts as "found the bot")
   - trackApp(env, u, startParam)       the Mini App opened (first contact without the bot chat, startapp=…)
   - trackGameNames(env, players)       the names players had in a reported game ("nick in the game")
   - runGrowthCron(env, bot)            every 5 minutes: a notice to the admins about new players (after 1 min, so the source is known),
                                        at 21:00 Kyiv a digest with the .xlsx table (new players, all players, sources, posts and links)
   - onPlayersCommand(env, bot, msg)    /players [days | all | live on | live off] — admins only
   - postStats(env, days)               per channel post: people who came through its button, how many were new, how many played
                                        (no personal data: for the "Channel posts" workflow and the posting agent)
   Tracked links: t.me/<bot>?start=post_<post id> (button under a channel post), channel, ads_<tag>, site_<lang>, dc (Discord),
   ig / fb / tt (+ _<tag>) — the links in the Instagram, Facebook and TikTok profiles (v45). */
import { esc } from './tg.js';
import { xlsx } from './xlsx.js';

const now = () => Math.floor(Date.now() / 1000);
const adminIds = env => String(env.ADMIN_IDS || '').split(',').map(x => Number(x.trim())).filter(Boolean);
const TZ = 'Europe/Kiev';
export const DIGEST_HOUR = 21;   // Kyiv time of the daily digest
const LIVE_DELAY = 60;           // seconds a new player waits before the notice (the app reports its start parameter in the meantime)
const LIVE_MAX = 25;             // people listed in one message
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const cfgGet = (env, k) => env.DB.prepare('SELECT value FROM discord_cfg WHERE key = ?1').bind(k).first('value');
const cfgSet = (env, k, v) => env.DB.prepare('INSERT INTO discord_cfg (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3').bind(k, String(v), now()).run();

export function kyiv(ts) {
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ts * 1000)).map(x => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, hour: Number(p.hour) };
  } catch (e) { const d = new Date((ts + 3 * 3600) * 1000).toISOString(); return { date: d.slice(0, 10), time: d.slice(11, 16), hour: Number(d.slice(11, 13)) }; }
}
const fmtTs = ts => { if (!ts) return ''; const k = kyiv(ts); return `${k.date} ${k.time}`; };
const fmtShort = ts => { const k = kyiv(ts); return `${k.date.slice(8, 10)}.${k.date.slice(5, 7)} ${k.time}`; };
const fullName = r => [r.first_name, r.last_name].filter(Boolean).join(' ');
const nickOf = r => r.game_name || r.table_name || '';
const chunks = (a, n) => { const out = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; };

/* ---------- where a player came from ---------- */
export function classify(param) {
  const p = String(param || '').trim(); let m;
  if (!p) return { source: 'bot' };
  if ((m = /^ref_([A-Z0-9]{6,10})$/i.exec(p))) return { source: 'ref', code: m[1].toUpperCase() };
  if ((m = /^friend_([A-Z0-9]{6,10})$/i.exec(p))) return { source: 'friend', code: m[1].toUpperCase() };
  if ((m = /^(?:join|table)_([A-Z0-9]{4,8})$/i.exec(p))) return { source: 'table', detail: m[1].toUpperCase() };
  if ((m = /^post_([A-Za-z0-9_-]{4,40})$/.exec(p))) return { source: 'post', detail: m[1] };
  if (p === 'channel') return { source: 'channel' };
  if ((m = /^ads(?:_([A-Za-z0-9_-]{1,40}))?$/.exec(p))) return { source: 'ads', detail: m[1] || '' };
  if ((m = /^site(?:_([a-z]{2,3}))?$/.exec(p))) return { source: 'site', detail: m[1] || '' };
  if (/^(dc|discord)$/i.test(p) || /^dlink_/.test(p)) return { source: 'discord' };
  if ((m = /^(ig|fb|tt)(?:_([A-Za-z0-9_-]{1,40}))?$/.exec(p))) return { source: { ig: 'instagram', fb: 'facebook', tt: 'tiktok' }[m[1]], detail: m[2] || '' }; // profile links (v45)
  return { source: 'other', detail: p.slice(0, 64) };
}
const HIT = new Set(['post', 'channel', 'ads', 'site', 'discord', 'instagram', 'facebook', 'tiktok', 'other']); // links whose visitors are counted (not personal invites)
const KIND = { ref: 'Реферальная ссылка', friend: 'Приглашение в друзья', table: 'Приглашение за стол', post: 'Пост в канале', channel: 'Канал (кнопка под постом)', ads: 'Реклама Telegram Ads', site: 'Сайт mafiapro.app', discord: 'Discord', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', app: 'Открыл приложение', bot: 'Нашёл бота сам', other: 'Другая ссылка', before: 'До начала учёта', unknown: 'Не определено' };

async function record(env, tgId, c, param) {
  let detail = c.detail || '';
  if (c.code) { const by = await env.DB.prepare('SELECT tg_id FROM invites WHERE code = ?1').bind(c.code).first('tg_id'); detail = by ? String(by) : c.code; }
  await env.DB.prepare('INSERT INTO player_track (tg_id, source, detail, param, created_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(tg_id) DO UPDATE SET source = ?2, detail = ?3, param = ?4 WHERE source IS NULL')
    .bind(tgId, c.source, detail || null, param ? String(param).slice(0, 64) : null, now()).run();
}
async function hit(env, param, tgId, isNew) {
  const ts = now();
  await env.DB.prepare('INSERT INTO start_hits (param, tg_id, is_new, hits, first_at, last_at) VALUES (?1, ?2, ?3, 1, ?4, ?4) ON CONFLICT(param, tg_id) DO UPDATE SET hits = hits + 1, last_at = ?4')
    .bind(String(param).slice(0, 64), tgId, isNew ? 1 : 0, ts).run();
}
export async function trackStart(env, u, param, isNew) {
  try {
    const c = classify(param);
    if (isNew) await record(env, u.id, c, param);
    if (param && HIT.has(c.source) && !/^dlink_/.test(param)) await hit(env, param, u.id, isNew); // dlink_: a one-time /link token, not a link to count
  } catch (e) { console.error('track start', e && e.stack || e); }
}
export async function trackApp(env, u, startParam) {
  try {
    const r = await env.DB.prepare('SELECT u.created_at, t.source FROM users u LEFT JOIN player_track t ON t.tg_id = u.tg_id WHERE u.tg_id = ?1').bind(u.id).first();
    const fresh = !!(r && now() - r.created_at < 600 && !r.source);
    const c = startParam ? classify(startParam) : { source: 'app' };
    if (fresh) await record(env, u.id, c.source === 'bot' ? { source: 'app' } : c, startParam);
    if (startParam && HIT.has(c.source)) await hit(env, startParam, u.id, fresh);
  } catch (e) { console.error('track app', e && e.stack || e); }
}
export async function trackGameNames(env, players) {
  const ts = now();
  for (const p of players || []) {
    const id = Number(p && p.tgId); const name = String((p && p.name) || '').trim().slice(0, 48); if (!id || !name) continue;
    try { await env.DB.prepare('INSERT INTO player_track (tg_id, game_name, game_at, created_at) VALUES (?1, ?2, ?3, ?3) ON CONFLICT(tg_id) DO UPDATE SET game_name = ?2, game_at = ?3').bind(id, name, ts).run(); } catch (e) {}
  }
}

/* ---------- data for reports ---------- */
async function playerRows(env, from, to, limit) {
  return (await env.DB.prepare(`SELECT u.tg_id, u.username, u.first_name, u.last_name, u.lang, u.created_at, u.seen_at, t.source, t.detail, t.param, t.game_name,
      (SELECT lp.name FROM lobby_players lp WHERE lp.tg_id = u.tg_id ORDER BY lp.joined_at DESC LIMIT 1) AS table_name,
      r.games, r.wins, r.hosted, c.city
    FROM users u LEFT JOIN player_track t ON t.tg_id = u.tg_id LEFT JOIN ratings r ON r.tg_id = u.tg_id LEFT JOIN user_cities c ON c.tg_id = u.tg_id
    WHERE u.created_at >= ?1 AND u.created_at < ?2 ORDER BY u.created_at DESC, u.tg_id DESC LIMIT ?3`).bind(from, to, limit).all()).results || [];
}
const countUsers = (env, from, to) => env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?1 AND created_at < ?2').bind(from, to).first('n');
async function sinceOf(env) { let s = Number(await cfgGet(env, 'growth:since')) || 0; if (!s) { s = now(); await cfgSet(env, 'growth:since', s); } return s; }

/* a function row → { key, kind, detail } with inviters, table hosts and posts looked up in batches */
async function labeler(env, rows, since) {
  const ids = new Set(), tables = new Set(), posts = new Set();
  for (const r of rows) {
    if ((r.source === 'ref' || r.source === 'friend') && /^\d+$/.test(r.detail || '')) ids.add(Number(r.detail));
    if (r.source === 'table' && r.detail) tables.add(r.detail);
    if (r.source === 'post' && r.detail) posts.add(r.detail);
  }
  const hostOf = {}, users = {}, postOf = {};
  for (const c of chunks([...tables], 90)) for (const l of (await env.DB.prepare(`SELECT code, host_id FROM lobbies WHERE code IN (${c.map((_, i) => '?' + (i + 1)).join(',')})`).bind(...c).all()).results || []) { hostOf[l.code] = l.host_id; ids.add(l.host_id); }
  for (const c of chunks([...ids], 90)) for (const u of (await env.DB.prepare(`SELECT tg_id, username, first_name, last_name FROM users WHERE tg_id IN (${c.map((_, i) => '?' + (i + 1)).join(',')})`).bind(...c).all()).results || []) users[u.tg_id] = u;
  for (const c of chunks([...posts], 90)) for (const p of (await env.DB.prepare(`SELECT id, slot_at, lang, rubric FROM channel_posts WHERE id IN (${c.map((_, i) => '?' + (i + 1)).join(',')})`).bind(...c).all()).results || []) postOf[p.id] = p;
  const who = id => { const u = users[id]; return u ? `${fullName(u) || u.username || id}${u.username ? ' @' + u.username : ''}` : `id ${id}`; };
  return r => {
    const key = r.source || (r.created_at < since ? 'before' : 'unknown');
    let detail = '';
    if (key === 'ref' || key === 'friend') detail = /^\d+$/.test(r.detail || '') ? who(Number(r.detail)) : (r.detail ? 'код ' + r.detail : '');
    else if (key === 'table') detail = `стол ${r.detail}${hostOf[r.detail] ? ' · ведущий ' + who(hostOf[r.detail]) : ''}`;
    else if (key === 'post') { const p = postOf[r.detail]; detail = p ? `${fmtShort(p.slot_at)} · ${p.rubric || ''} · ${p.lang}` : r.detail; }
    else if (key === 'ads' || key === 'site' || key === 'other' || key === 'instagram' || key === 'facebook' || key === 'tiktok') detail = r.detail || '';
    else if (key === 'app' && r.param) detail = r.param;
    return { key, kind: KIND[key] || key, detail };
  };
}
function postLabel(p) { return p ? `Пост ${fmtShort(p.slot_at)} · ${p.rubric || '—'} · ${p.lang}` : ''; }
function linkLabel(param, posts) {
  const c = classify(param);
  if (c.source === 'post') return postLabel(posts[c.detail]) || 'Пост ' + c.detail;
  if (c.source === 'channel') return 'Канал (кнопка под ранними постами)';
  if (c.source === 'ads') return 'Реклама' + (c.detail ? ' · ' + c.detail : '');
  if (c.source === 'site') return 'Сайт' + (c.detail ? ' · ' + c.detail : '');
  if (c.source === 'discord') return 'Discord';
  if (c.source === 'instagram' || c.source === 'facebook' || c.source === 'tiktok') return KIND[c.source] + (c.detail ? ' · ' + c.detail : '');
  return 'Другая ссылка';
}
async function linkRows(env, from) {
  return (await env.DB.prepare(`SELECT h.param, COUNT(*) AS visitors, SUM(h.is_new) AS newp,
      SUM(CASE WHEN h.is_new = 1 AND COALESCE(r.games, 0) + COALESCE(r.hosted, 0) > 0 THEN 1 ELSE 0 END) AS played, MIN(h.first_at) AS first_at, MAX(h.last_at) AS last_at
    FROM start_hits h LEFT JOIN ratings r ON r.tg_id = h.tg_id WHERE h.last_at >= ?1 GROUP BY h.param ORDER BY newp DESC, visitors DESC LIMIT 500`).bind(from).all()).results || [];
}
async function postsByParams(env, params) {
  const ids = params.map(p => classify(p)).filter(c => c.source === 'post').map(c => c.detail); const out = {};
  for (const c of chunks(ids, 90)) for (const p of (await env.DB.prepare(`SELECT id, slot_at, lang, rubric, status FROM channel_posts WHERE id IN (${c.map((_, i) => '?' + (i + 1)).join(',')})`).bind(...c).all()).results || []) out[p.id] = p;
  return out;
}

const PLAYER_COLS = [
  { title: 'Пришёл (Киев)', width: 17 }, { title: 'Telegram ID', width: 14 }, { title: 'Тег', width: 18 }, { title: 'Имя в Telegram', width: 22 }, { title: 'Ник в игре', width: 18 },
  { title: 'Язык', width: 7 }, { title: 'Город', width: 14 }, { title: 'Откуда пришёл', width: 24 }, { title: 'Подробности', width: 36 }, { title: 'Метка ссылки', width: 20 },
  { title: 'Партий', width: 8 }, { title: 'Побед', width: 8 }, { title: 'Вёл игр', width: 8 }, { title: 'Последний визит', width: 17 }, { title: 'Профиль', width: 20 }
];
const playerCells = (r, s) => [fmtTs(r.created_at), r.tg_id, r.username ? '@' + r.username : '', fullName(r), nickOf(r), r.lang || '', r.city || '', s.kind, s.detail, r.param || '',
  r.games || 0, r.wins || 0, r.hosted || 0, fmtTs(r.seen_at), r.username ? { link: 'https://t.me/' + r.username, text: 't.me/' + r.username } : ''];

/* the workbook: new players of the period, everyone, sources, posts and links */
export async function buildWorkbook(env, from, to) {
  const since = await sinceOf(env); const ts = now();
  const fresh = await playerRows(env, from, to, 5000);
  const all = await playerRows(env, 0, to, 20000);
  const label = await labeler(env, fresh.concat(all), since);
  const src = (await env.DB.prepare(`SELECT COALESCE(t.source, CASE WHEN u.created_at < ?1 THEN 'before' ELSE 'unknown' END) AS s,
      SUM(CASE WHEN u.created_at >= ?2 AND u.created_at < ?3 THEN 1 ELSE 0 END) AS win, SUM(CASE WHEN u.created_at >= ?4 THEN 1 ELSE 0 END) AS d7,
      SUM(CASE WHEN u.created_at >= ?5 THEN 1 ELSE 0 END) AS d30, COUNT(*) AS total, SUM(CASE WHEN COALESCE(r.games, 0) + COALESCE(r.hosted, 0) > 0 THEN 1 ELSE 0 END) AS played
    FROM users u LEFT JOIN player_track t ON t.tg_id = u.tg_id LEFT JOIN ratings r ON r.tg_id = u.tg_id GROUP BY s ORDER BY total DESC`).bind(since, from, to, ts - 7 * 86400, ts - 30 * 86400).all()).results || [];
  const links = await linkRows(env, 0); const posts = await postsByParams(env, links.map(l => l.param));
  const period = `${fmtTs(from) || 'начало'} — ${fmtTs(Math.min(to, ts))}`;
  return xlsx([
    { name: 'Новые', columns: PLAYER_COLS, rows: fresh.map(r => playerCells(r, label(r))) },
    { name: 'Все игроки', columns: PLAYER_COLS, rows: all.map(r => playerCells(r, label(r))) },
    { name: 'Источники', columns: [{ title: 'Откуда пришёл', width: 28 }, { title: `Период: ${period}`, width: 34 }, { title: '7 дней', width: 9 }, { title: '30 дней', width: 9 }, { title: 'Всего', width: 9 }, { title: 'Сыграли хоть раз', width: 17 }],
      rows: src.map(r => [KIND[r.s] || r.s, r.win || 0, r.d7 || 0, r.d30 || 0, r.total || 0, r.played || 0]) },
    { name: 'Посты и ссылки', columns: [{ title: 'Метка', width: 24 }, { title: 'Что это', width: 40 }, { title: 'Перешли (людей)', width: 16 }, { title: 'Из них новых', width: 14 }, { title: 'Новые сыграли', width: 15 }, { title: 'Первый переход', width: 17 }, { title: 'Последний', width: 17 }],
      rows: links.map(l => [l.param, linkLabel(l.param, posts), l.visitors || 0, l.newp || 0, l.played || 0, fmtTs(l.first_at), fmtTs(l.last_at)]) }
  ]);
}

/* ---------- messages ---------- */
function personLine(r, s, i) {
  const name = esc(fullName(r) || r.username || String(r.tg_id)); const nick = nickOf(r);
  return `${i}. <a href="tg://user?id=${r.tg_id}">${name}</a>${r.username ? ' @' + esc(r.username) : ''} · <code>${r.tg_id}</code>${r.lang ? ' · ' + esc(r.lang) : ''}${nick && nick !== fullName(r) ? ` · ник «${esc(nick)}»` : ''}\n     ↳ ${esc(s.kind)}${s.detail ? ': ' + esc(s.detail) : ''}`;
}
async function sendTo(bot, chats, text, extra) { for (const c of chats) { try { const r = await bot.send(c, text, extra); if (!(r && r.ok)) await bot.call('sendMessage', { chat_id: c, text: text.replace(/<[^>]+>/g, '') }); } catch (e) { console.error('growth send', e); } } }
async function sendBook(env, bot, chats, from, to, caption) {
  const book = await buildWorkbook(env, from, to); const name = `mafia-pro-players-${kyiv(now()).date}.xlsx`;
  for (const c of chats) { try { await bot.sendDocument(c, name, book, caption, XLSX_MIME); } catch (e) { console.error('growth file', e); } }
  return book.length;
}

/* new players of [from, to): message + table; kind: digest | period | all */
export async function sendReport(env, bot, chats, from, to, kind, opt = {}) {
  const since = await sinceOf(env); const ts = now();
  const [total, d7, n] = await Promise.all([countUsers(env, 0, to), countUsers(env, ts - 7 * 86400, to), countUsers(env, from, to)]);
  if (kind === 'all') {
    const bytes = await sendBook(env, bot, chats, from, to, `Все игроки Mafia Pro · ${fmtTs(ts)}`);
    return { total, bytes };
  }
  const rows = await playerRows(env, from, to, 2000); const label = await labeler(env, rows, since);
  const played = rows.filter(r => (r.games || 0) + (r.hosted || 0) > 0).length;
  const by = {}; rows.forEach(r => { const s = label(r); by[s.kind] = (by[s.kind] || 0) + 1; });
  const best = await env.DB.prepare("SELECT h.param, COUNT(*) AS v, SUM(h.is_new) AS n FROM start_hits h WHERE h.param LIKE 'post_%' AND h.first_at >= ?1 GROUP BY h.param ORDER BY n DESC, v DESC LIMIT 1").bind(ts - 7 * 86400).first();
  const bestPost = best ? (await postsByParams(env, [best.param])) : {};
  const title = kind === 'digest' ? `📈 <b>Приток игроков</b> · ${fmtShort(ts)}` : `📈 <b>Новые игроки за ${opt.days > 1 ? opt.days + ' дн.' : 'сутки'}</b>`;
  const lines = [title, `${kind === 'digest' ? 'С прошлой сводки' : 'За период'}: <b>+${n}</b> · за 7 дней: +${d7} · всего: ${total}`];
  if (n) lines.push(`Сыграли хотя бы одну партию: ${played} из ${Math.min(n, rows.length)}`);
  if (n) lines.push('', '<b>Откуда</b>', ...Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `• ${esc(k)} — ${v}`));
  if (best && best.v) lines.push('', `<b>Лучший пост за неделю:</b> ${esc(linkLabel(best.param, bestPost).replace(/^Пост /, ''))} — перешли ${best.v}, новых ${best.n || 0}`);
  if (n) lines.push('', ...rows.slice(0, LIVE_MAX).map((r, i) => personLine(r, label(r), i + 1)));
  if (rows.length > LIVE_MAX) lines.push(`…и ещё ${n - LIVE_MAX} — в таблице`);
  lines.push('', n ? 'Таблица .xlsx — следующим сообщением.' : 'Новых игроков нет.', '<i>/players 7 — за неделю · /players all — все · /players live off — без мгновенных уведомлений</i>');
  let text = lines.join('\n'); if (text.length > 4000) text = text.slice(0, 3990) + '…';
  await sendTo(bot, chats, text);
  const bytes = n ? await sendBook(env, bot, chats, from, to, kind === 'digest' ? `Игроки Mafia Pro · ${fmtShort(ts)}` : `Игроки Mafia Pro · новые за ${opt.days || 1} дн.`) : 0;
  return { n, total, bytes };
}

/* a short notice about players who came since the last one */
export async function liveNotice(env, bot) {
  if ((await cfgGet(env, 'growth:live')) === 'off') return 0;
  const until = now() - LIVE_DELAY; const mark = Number(await cfgGet(env, 'growth:mark')) || 0;
  if (!mark) { await cfgSet(env, 'growth:mark', until); return 0; } // first run: start counting from now
  if (until <= mark) return 0;
  const n = await countUsers(env, mark + 1, until + 1); await cfgSet(env, 'growth:mark', until);
  if (!n) return 0;
  const rows = await playerRows(env, mark + 1, until + 1, LIVE_MAX); const label = await labeler(env, rows, await sinceOf(env));
  const total = await countUsers(env, 0, until + 1);
  const text = [`🆕 <b>${n === 1 ? 'Новый игрок' : 'Новые игроки: +' + n}</b> · всего ${total}`, '', ...rows.map((r, i) => personLine(r, label(r), i + 1)), n > rows.length ? `…и ещё ${n - rows.length} — /players` : ''].filter(x => x !== '').join('\n');
  await sendTo(bot, adminIds(env), text.length > 4000 ? text.slice(0, 3990) + '…' : text);
  return n;
}
/* the daily digest once a day after DIGEST_HOUR Kyiv time */
export async function digest(env, bot, force) {
  const ts = now(); const k = kyiv(ts); const last = Number(await cfgGet(env, 'growth:digest_at')) || 0;
  if (!force && (k.hour < DIGEST_HOUR || (last && kyiv(last).date === k.date))) return null;
  await cfgSet(env, 'growth:digest_at', ts); // claim first: one digest per day even if a run is slow
  return sendReport(env, bot, adminIds(env), last || ts - 86400, ts + 1, 'digest');
}
export async function runGrowthCron(env, bot) {
  await sinceOf(env);
  try { await liveNotice(env, bot); } catch (e) { console.error('growth live', e && e.stack || e); }
  try { await digest(env, bot, false); } catch (e) { console.error('growth digest', e && e.stack || e); }
}

/* /players … (admins) */
export async function onPlayersCommand(env, bot, msg) {
  const m = /^\/players(?:@\w+)?(?:\s+(.+))?$/i.exec(String(msg.text || '').trim()); if (!m) return false;
  const arg = String(m[1] || '').trim().toLowerCase(); const chat = msg.chat.id; const ts = now();
  const lv = /^live\s+(on|off)$/.exec(arg);
  if (lv) {
    await cfgSet(env, 'growth:live', lv[1]); if (lv[1] === 'on') await cfgSet(env, 'growth:mark', ts - LIVE_DELAY);
    await bot.send(chat, lv[1] === 'on' ? '🔔 Уведомления о каждом новом игроке включены.' : `🔕 Мгновенные уведомления выключены. Сводка с таблицей по-прежнему приходит каждый день в ${DIGEST_HOUR}:00.`);
    return true;
  }
  if (arg === 'all' || arg === 'все') { await sendReport(env, bot, [chat], 0, ts + 1, 'all'); return true; }
  const days = Math.max(1, Math.min(365, Math.floor(Number(arg)) || 1));
  await sendReport(env, bot, [chat], ts - days * 86400, ts + 1, 'period', { days });
  return true;
}

/* per post: visitors through its button, new players among them, how many of those played (no personal data) */
export async function postStats(env, days = 14) {
  const from = now() - Math.max(1, Math.min(90, Number(days) || 14)) * 86400;
  const posts = (await env.DB.prepare('SELECT id, slot_at, lang, rubric, status FROM channel_posts WHERE slot_at >= ?1 ORDER BY slot_at').bind(from).all()).results || [];
  const hits = {}; for (const l of await linkRows(env, from)) hits[l.param] = l;
  const h = id => hits['post_' + id] || {};
  const channel = hits.channel || {};
  return { ok: true, days: Number(days) || 14,
    posts: posts.map(p => ({ id: p.id, slot: fmtShort(p.slot_at), lang: p.lang, rubric: p.rubric || '', status: p.status, visitors: h(p.id).visitors || 0, newPlayers: h(p.id).newp || 0, played: h(p.id).played || 0 })),
    channel: { visitors: channel.visitors || 0, newPlayers: channel.newp || 0 } };
}
