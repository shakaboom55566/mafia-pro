/* Paid ads in Instagram and Facebook (Meta ads, 15.10.2026): measurement on our side. The "Ads" workflow (ads/run.mjs) runs the campaigns through the
   Meta Marketing API with its own token from GitHub secrets; this module only counts who came and tells Meta who became a player.
   - POST /api/click        the ad landing page (mafiapro.app/uk/dnipro/) on load: { src, ad, fbclid, fbp } → a token for the bot link
                            t.me/<bot>?start=fb_<src>_<token> (+ the pixel id). No login: landing visitors are not Telegram users yet.
   - adStart(env, u, …)     /start with fb_<src>_<token>: the click gets the player; a NEW player → a "Lead" event to the Meta
                            Conversions API (hashed Telegram id, the click's fbc / fbp, IP and browser), so Meta learns who plays
   - POST /ads/creds        (X-Ads-Key) switches for one workflow run: paused, notices muted, lockdown, admins; remembers the campaign ids
   - POST /ads/stats        (X-Ads-Key) per ad and per campaign tag: landing visits → bot starts → new players → played (aggregates only)
   - /ads (admins)          status, last 7 days, pause / resume (pauses the campaigns in Meta at once when META_ADS_TOKEN is in the worker),
                            notices about creative swaps on / off
   - runAdsCron             hourly: IP, browser and Meta ids of clicks older than 7 days are erased; clicks older than 180 days deleted
   Worker secrets (optional, backend.yml): META_ADS_TOKEN (system user token: ads_management, ads_read; for the Conversions API too),
   META_PIXEL_ID. Without them the landing page and the counting work, nothing goes to Meta. */
import { esc, safeEqual } from './tg.js';

const enc = s => new TextEncoder().encode(s);
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const now = () => Math.floor(Date.now() / 1000);
const adminIds = env => String(env.ADMIN_IDS || '').split(',').map(x => Number(x.trim())).filter(Boolean);
const cfgGet = (env, k) => env.DB.prepare('SELECT value FROM discord_cfg WHERE key = ?1').bind(k).first('value');
const cfgSet = (env, k, v) => env.DB.prepare('INSERT INTO discord_cfg (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3').bind(k, String(v), now()).run();
const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', enc(String(s))));

export const GRAPH_V = 'v25.0';
const graphBase = env => String(env.META_GRAPH_BASE || 'https://graph.facebook.com').replace(/\/$/, '');
const graphV = env => (/^v\d{2}\.\d$/.test(env.META_GRAPH_VERSION || '') ? env.META_GRAPH_VERSION : GRAPH_V);
export const SOURCES = { dnp: 'Днепр', ua: 'Украина', am: 'Армения' }; // campaign tags in the landing link and the bot link
const KEEP_MATCH = 7 * 86400;   // IP, browser, fbc, fbp: only while Meta can still match the click
const KEEP_ROW = 180 * 86400;
const PER_IP_HOUR = 30;         // tokens one address may mint in an hour (the rest get the plain link, still counted by tag)
const TOKEN_RE = /^[A-Za-z0-9]{10}$/;
const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const token = () => { const a = new Uint8Array(10); crypto.getRandomValues(a); return [...a].map(b => ALNUM[b % 62]).join(''); };

export async function adsKey(botToken) { return hex(await crypto.subtle.digest('SHA-256', enc(String(botToken) + ':mafia-pro-ads'))).slice(0, 48); }
export const adsKeyOk = async (env, given) => !!env.BOT_TOKEN && safeEqual(String(given || ''), await adsKey(env.BOT_TOKEN));
const capiReady = env => !!(env.META_PIXEL_ID && env.META_ADS_TOKEN);

/* ---------- the landing page ---------- */
export async function apiAdClick(env, req, b) {
  const src = String(b.src || '').toLowerCase();
  if (!SOURCES[src]) return { status: 400, body: { ok: false, error: 'bad_src' } };
  const ad = /^\d{5,25}$/.test(String(b.ad || '')) ? String(b.ad) : null;               // {{ad.id}} from the ad's url_tags
  const fbclid = /^[A-Za-z0-9_-]{8,500}$/.test(String(b.fbclid || '')) ? String(b.fbclid) : null;
  const fbp = /^fb\.\d\.\d{10,14}\.\d{1,20}$/.test(String(b.fbp || '')) ? String(b.fbp) : null;
  const fbc = fbclid ? `fb.1.${Date.now()}.${fbclid}` : (/^fb\.\d\.\d{10,14}\.[A-Za-z0-9_-]{8,500}$/.test(String(b.fbc || '')) ? String(b.fbc) : null);
  const ip = String(req.headers.get('CF-Connecting-IP') || '').slice(0, 64) || null;
  const ua = String(req.headers.get('User-Agent') || '').replace(/[\u0000-\u001f]/g, '').slice(0, 300) || null;
  const out = { ok: true, src, token: null, pixel: env.META_PIXEL_ID && /^\d{6,20}$/.test(String(env.META_PIXEL_ID)) ? String(env.META_PIXEL_ID) : null };
  if (ip) {
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM ad_clicks WHERE ip = ?1 AND created_at >= ?2').bind(ip, now() - 3600).first('n');
    if (n >= PER_IP_HOUR) return { status: 200, body: out }; // a flood from one address: the page falls back to the plain tagged link
  }
  const t = token();
  await env.DB.prepare('INSERT INTO ad_clicks (token, src, ad_id, fbc, fbp, ip, ua, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)').bind(t, src, ad, fbc, fbp, ip, ua, now()).run();
  out.token = t;
  return { status: 200, body: out };
}

/* ---------- /start fb_<src>_<token> ---------- */
export function parseAdParam(param) {
  const m = /^fb_([a-z]{2,4})_([A-Za-z0-9]{10})$/.exec(String(param || ''));
  return m && SOURCES[m[1]] ? { src: m[1], token: m[2] } : null;
}
export async function adStart(env, u, param, isNew) {
  const p = parseAdParam(param); if (!p) return null;
  try {
    const row = await env.DB.prepare('SELECT * FROM ad_clicks WHERE token = ?1').bind(p.token).first();
    if (!row || row.src !== p.src) return null;
    if (row.tg_id && row.tg_id !== u.id) return null; // a shared link: the first one who opened it keeps the click
    if (!row.tg_id) await env.DB.prepare('UPDATE ad_clicks SET tg_id = ?1, is_new = ?2, started_at = ?3 WHERE token = ?4 AND tg_id IS NULL').bind(u.id, isNew ? 1 : 0, now(), p.token).run();
    if (!isNew || row.lead_sent || !capiReady(env)) return { token: p.token, lead: false };
    const before = await env.DB.prepare('SELECT COUNT(*) AS n FROM ad_clicks WHERE tg_id = ?1 AND lead_sent = 1').bind(u.id).first('n');
    if (before) return { token: p.token, lead: false };
    const r = await sendLead(env, Object.assign({}, row, { tg_id: u.id }));
    await env.DB.prepare('UPDATE ad_clicks SET lead_sent = ?1 WHERE token = ?2').bind(r.ok ? 1 : 2, p.token).run();
    if (!r.ok) console.error('capi lead', r.error);
    return { token: p.token, lead: r.ok };
  } catch (e) { console.error('ad start', e && e.stack || e); return null; }
}
export async function sendLead(env, row) {
  const user_data = { external_id: [await sha256(row.tg_id)] };
  if (row.ip) user_data.client_ip_address = row.ip;
  if (row.ua) user_data.client_user_agent = row.ua;
  if (row.fbc) user_data.fbc = row.fbc;
  if (row.fbp) user_data.fbp = row.fbp;
  const ev = { event_name: 'Lead', event_time: now(), event_id: 'lead_' + row.token, action_source: 'website',
    event_source_url: String(env.ADS_LANDING || 'https://mafiapro.app/uk/dnipro/'), user_data, custom_data: { content_name: row.src, content_category: 'telegram_bot' } };
  if (row.ad_id) ev.custom_data.ad_id = row.ad_id;
  const body = { data: [ev], access_token: env.META_ADS_TOKEN };
  if (env.META_TEST_EVENT_CODE) body.test_event_code = String(env.META_TEST_EVENT_CODE);
  try {
    const r = await fetch(`${graphBase(env)}/${graphV(env)}/${env.META_PIXEL_ID}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    return d && d.events_received >= 1 ? { ok: true } : { ok: false, error: (d && d.error && d.error.message) || `HTTP ${r.status}` };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
}

/* ---------- for the workflow (X-Ads-Key) ---------- */
export async function adsCreds(env, b, locked) {
  const ids = Array.isArray(b && b.campaigns) ? b.campaigns.filter(x => /^\d{5,25}$/.test(String(x))).slice(0, 10).map(String) : null;
  if (ids && ids.length) await cfgSet(env, 'ads:campaigns', ids.join(','));
  return { ok: true, locked: !!locked, paused: (await cfgGet(env, 'ads:paused')) === '1', muted: (await cfgGet(env, 'ads:muted')) === '1', admins: adminIds(env), capi: capiReady(env), pixelInWorker: !!env.META_PIXEL_ID };
}
export async function adsStats(env, b) {
  const since = Math.max(0, Number(b && b.since) || now() - 15 * 86400);
  const src = b && SOURCES[b.src] ? b.src : null;
  const q = `SELECT c.src, c.ad_id, COUNT(*) AS visits, SUM(CASE WHEN c.tg_id IS NOT NULL THEN 1 ELSE 0 END) AS starts, SUM(c.is_new) AS new_players,
      SUM(CASE WHEN c.is_new = 1 AND COALESCE(r.games, 0) + COALESCE(r.hosted, 0) > 0 THEN 1 ELSE 0 END) AS played, SUM(CASE WHEN c.lead_sent = 1 THEN 1 ELSE 0 END) AS leads
    FROM ad_clicks c LEFT JOIN ratings r ON r.tg_id = c.tg_id WHERE c.created_at >= ?1 ${src ? 'AND c.src = ?2' : ''} GROUP BY c.src, c.ad_id`;
  const rows = (await (src ? env.DB.prepare(q).bind(since, src) : env.DB.prepare(q).bind(since)).all()).results || [];
  const z = () => ({ visits: 0, starts: 0, newPlayers: 0, played: 0, leads: 0 });
  const add = (a, r) => { a.visits += r.visits || 0; a.starts += r.starts || 0; a.newPlayers += r.new_players || 0; a.played += r.played || 0; a.leads += r.leads || 0; return a; };
  const out = { ok: true, since, ads: {}, sources: {}, total: z() };
  for (const r of rows) { if (r.ad_id) out.ads[r.ad_id] = add(out.ads[r.ad_id] || z(), r); out.sources[r.src] = add(out.sources[r.src] || z(), r); add(out.total, r); }
  // players who opened the bot with the plain tagged link (no token: the landing page could not reach the API)
  const plain = (await env.DB.prepare(`SELECT h.param, COUNT(*) AS starts, COALESCE(SUM(h.is_new), 0) AS new_players FROM start_hits h WHERE h.param IN (${Object.keys(SOURCES).map((_, i) => '?' + (i + 2)).join(',')}) AND h.first_at >= ?1 GROUP BY h.param`)
    .bind(since, ...Object.keys(SOURCES).map(k => 'fb_' + k)).all()).results || [];
  out.plain = Object.fromEntries(plain.map(r => [r.param.slice(3), { starts: r.starts, newPlayers: r.new_players }]));
  return out;
}

/* ---------- /ads (admins) ---------- */
async function pauseInMeta(env, on) {
  const ids = String((await cfgGet(env, 'ads:campaigns')) || '').split(',').filter(Boolean);
  if (!env.META_ADS_TOKEN || !ids.length) return { done: 0, later: true };
  let done = 0; const errs = [];
  for (const id of ids) {
    try {
      const r = await fetch(`${graphBase(env)}/${graphV(env)}/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ status: on ? 'PAUSED' : 'ACTIVE', access_token: env.META_ADS_TOKEN }) });
      const d = await r.json().catch(() => ({})); if (d && (d.success === true || d.success === 'true')) done++; else errs.push((d && d.error && d.error.message) || `HTTP ${r.status}`);
    } catch (e) { errs.push(String(e && e.message || e)); }
  }
  return { done, later: !!errs.length, errs };
}
async function statusCard(env) {
  const paused = (await cfgGet(env, 'ads:paused')) === '1'; const muted = (await cfgGet(env, 'ads:muted')) === '1';
  const ids = String((await cfgGet(env, 'ads:campaigns')) || '').split(',').filter(Boolean);
  const w = await adsStats(env, { since: now() - 7 * 86400 }); const d = await adsStats(env, { since: now() - 86400 });
  const line = s => `страница ${s.visits} → бот ${s.starts} → новые ${s.newPlayers} → сыграли ${s.played}`;
  const lines = ['<b>📣 Реклама Instagram + Facebook</b>',
    ids.length ? `Кампании в Meta: ${ids.length} · ${paused ? '⏸ на паузе' : '▶️ идут'}` : '⚪️ Кампаний ещё нет — агент создаст их, когда в GitHub появятся ключи Meta.',
    `Уведомления о заменах объявлений: ${muted ? '🔕 выключены' : '🔔 включены'}`,
    `Conversions API (Meta учится на игроках): ${capiReady(env) ? '✅' : '⚪️ нет META_ADS_TOKEN / META_PIXEL_ID в воркере'}`,
    '', `<b>За сутки:</b> ${line(d.total)}`, `<b>За 7 дней:</b> ${line(w.total)}`];
  for (const [k, s] of Object.entries(w.sources)) lines.push(`· ${esc(SOURCES[k] || k)}: ${line(s)}`);
  lines.push('', '<i>Отчёт по понедельникам приходит сам. Лимит расходов задаётся в рекламном кабинете Meta.</i>');
  const kb = [[paused ? { text: '▶️ Возобновить рекламу', callback_data: 'ads_resume' } : { text: '⏸ Пауза рекламы', callback_data: 'ads_pause' }],
    [muted ? { text: '🔔 Включить уведомления о заменах', callback_data: 'ads_unmute' } : { text: '🔕 Без уведомлений о заменах', callback_data: 'ads_mute' }]];
  return { text: lines.join('\n'), extra: { reply_markup: { inline_keyboard: kb } } };
}
export async function onAdsCommand(env, bot, msg) {
  const arg = String(msg.text || '').trim().split(/\s+/)[1] || '';
  if (/^(pause|resume|mute|unmute)$/.test(arg)) await applySwitch(env, arg);
  const c = await statusCard(env); return bot.send(msg.chat.id, c.text, c.extra);
}
async function applySwitch(env, what) {
  if (what === 'pause' || what === 'resume') { await cfgSet(env, 'ads:paused', what === 'pause' ? '1' : '0'); return pauseInMeta(env, what === 'pause'); }
  await cfgSet(env, 'ads:muted', what === 'mute' ? '1' : '0'); return null;
}
export async function onAdsCallback(env, bot, q, isAdmin) {
  const m = /^ads_(pause|resume|mute|unmute)$/.exec(String(q.data || '')); if (!m) return false;
  const answer = (text, alert) => bot.call('answerCallbackQuery', { callback_query_id: q.id, text, show_alert: !!alert });
  if (!isAdmin((q.from || {}).id)) { await answer('Только для администраторов'); return true; }
  const r = await applySwitch(env, m[1]);
  const msgs = { pause: r && r.done && !r.later ? 'Реклама на паузе в Meta' : 'Пауза: агент остановит рекламу при следующей проверке (до часа)', resume: r && r.done && !r.later ? 'Реклама снова идёт' : 'Агент включит рекламу при следующей проверке (до часа)', mute: 'Уведомления о заменах выключены', unmute: 'Уведомления о заменах включены' };
  await answer(msgs[m[1]], m[1] === 'pause' || m[1] === 'resume');
  if (q.message && q.message.chat) { const c = await statusCard(env); await bot.call('editMessageText', Object.assign({ chat_id: q.message.chat.id, message_id: q.message.message_id, text: c.text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }, c.extra)); }
  return true;
}

/* ---------- cron: forget what only Meta matching needed ---------- */
export async function runAdsCron(env) {
  const last = Number(await cfgGet(env, 'ads:clean_at')) || 0; if (now() - last < 3600) return 0;
  await cfgSet(env, 'ads:clean_at', now());
  const a = await env.DB.prepare('UPDATE ad_clicks SET ip = NULL, ua = NULL, fbc = NULL, fbp = NULL WHERE created_at < ?1 AND (ip IS NOT NULL OR ua IS NOT NULL OR fbc IS NOT NULL OR fbp IS NOT NULL)').bind(now() - KEEP_MATCH).run();
  const b = await env.DB.prepare('DELETE FROM ad_clicks WHERE created_at < ?1').bind(now() - KEEP_ROW).run();
  return ((a.meta && a.meta.changes) || 0) + ((b.meta && b.meta.changes) || 0);
}
