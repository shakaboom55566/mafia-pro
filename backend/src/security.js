/* Mafia Pro — security layer (v44): protection against break-ins and floods, and the on-call watch.
   1. Guard (every request): bans (D1, cached 30 s per isolate), per-IP and per-player rate limits (isolate memory + the optional
      Workers Rate Limiting binding RL_IP), body size limit, the Telegram webhook only from Telegram's networks
      (149.154.160.0/20, 91.108.4.0/22), scraping limits, modes: normal · guard (stricter limits, switched on by a flood, off after
      30 quiet minutes) · lockdown (admin powers off: exports, broadcasts, grants, approvals — switched on by an admin or a leaked
      webhook secret; switched OFF only through the "Security" GitHub workflow, so a stolen Telegram account cannot undo it).
   2. Events: security_events (IPs never stored — only a salted hash; one row per type + source per minute, with a count) and
      per-minute counters in security_stats. Kept 30 and 14 days.
   3. Watch (cron, every minute): rules over the last minutes → incidents (security_incidents) → automatic response (bans, guard,
      lockdown, a new webhook secret) → alerts to admins in Telegram (+ the hidden Discord admin channel for high / critical).
   4. Admin: /security in the bot; POST /sec/report and /sec/act for the "Security" workflow, which the on-call agent (a Claude
      scheduled task) runs. Key: sha256(BOT_TOKEN + ':mafia-pro-security')[0..48] (header X-Sec-Key). The report has no personal
      data: Telegram ids and IPs only as salted hashes. */
import { esc, safeEqual } from './tg.js';
import { hookSend, discordReady } from './discord.js';

const now = () => Math.floor(Date.now() / 1000);
const minuteOf = ts => Math.floor(ts / 60);
const adminIds = env => String(env.ADMIN_IDS || '').split(',').map(x => Number(x.trim())).filter(Boolean);
const num = (env, k, d) => { const v = Number(env[k]); return Number.isFinite(v) && v > 0 ? v : d; };
const SEV_RANK = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
const SEV_ICON = { info: 'ℹ️', low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' };
const SEV_RU = { info: 'инфо', low: 'низкая', medium: 'средняя', high: 'высокая', critical: 'КРИТИЧНО' };
const TG_NETS = [['149.154.160.0', 20], ['91.108.4.0', 22]];
const TG_ASNS = new Set([62041, 62014, 59930, 44907, 211157]); // Telegram's own networks: a new range inside them is still Telegram
export const MAX_BODY = 400000; // bytes of a JSON request (a table publish is at most 2 × 120 000 characters)
const XSS_RE = /<\s*\/?\s*(script|img|svg|iframe|object|embed|style|link|meta|base|form|input|body|math|video|audio|details|a)\b|\bon[a-z]{3,20}\s*=|javascript\s*:|data\s*:\s*text\/html|srcdoc\s*=/i;

/* ---------- small helpers ---------- */
async function sha256hex(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
export async function secKey(botToken) { return (await sha256hex(String(botToken) + ':mafia-pro-security')).slice(0, 48); }
const HASHES = new Map();
async function saltedHash(env, kind, v) {
  const k = kind + '|' + v; const c = HASHES.get(k); if (c) return c;
  const h = (await sha256hex(String(env.BOT_TOKEN || 'dev') + ':' + kind + ':' + v)).slice(0, kind === 'ip' ? 12 : 10);
  if (HASHES.size > 20000) HASHES.clear(); HASHES.set(k, h); return h;
}
export const ipHash = (env, ip) => saltedHash(env, 'ip', ip);
export const tgHash = (env, id) => saltedHash(env, 'tg', id);
function ipv4(ip) { const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(ip || '').trim()); if (!m) return null; const p = m.slice(1).map(Number); if (p.some(x => x > 255)) return null; return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]; }
export function ipInTelegram(ip) {
  const v = ipv4(ip); if (v == null) return false; // Telegram delivers webhooks over IPv4 from these networks only
  return TG_NETS.some(([net, bits]) => { const n = ipv4(net); const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0; return ((v & mask) >>> 0) === ((n & mask) >>> 0); });
}
const cfgGet = (env, k) => env.DB.prepare('SELECT value FROM discord_cfg WHERE key = ?1').bind(k).first('value');
const cfgSet = (env, k, v) => env.DB.prepare('INSERT INTO discord_cfg (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3').bind(k, v == null ? null : String(v), now()).run();
const run = (env, p) => { const q = Promise.resolve(p).catch(e => console.error('security', e && e.stack || e)); if (env && typeof env.bg === 'function') env.bg(q); return q; };
const fmtAgo = s => s < 90 ? `${s} с` : s < 5400 ? `${Math.round(s / 60)} мин` : s < 172800 ? `${Math.round(s / 3600)} ч` : `${Math.round(s / 86400)} дн`;
function kyivTime(ts) { try { return new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Kiev', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ts * 1000)); } catch (e) { return new Date(ts * 1000).toISOString().slice(5, 16).replace('T', ' '); } }

/* ---------- isolate memory ---------- */
const MEM = { win: new Map(), logged: new Map(), stats: new Map(), statsAt: 0, cfg: { at: 0, bans: new Map(), lockdown: null, guardUntil: 0, hook: null, adminCountries: null } };
export function _resetSecurityMemory() { MEM.win.clear(); MEM.logged.clear(); MEM.stats.clear(); MEM.statsAt = 0; MEM.cfg = { at: 0, bans: new Map(), lockdown: null, guardUntil: 0, hook: null, adminCountries: null }; HASHES.clear(); }
function hit(key, windowSec, n = 1) { // fixed window counter; returns the count in the current window
  const w = Math.floor(now() / windowSec); const k = windowSec + '|' + key; const e = MEM.win.get(k);
  if (e && e.w === w) { e.n += n; return e.n; }
  if (MEM.win.size > 50000) for (const [kk, v] of MEM.win) if (v.w < w - 1) MEM.win.delete(kk);
  MEM.win.set(k, { w, n }); return n;
}
function seen(key, windowSec) { const e = MEM.win.get(windowSec + '|' + key); return e && e.w === Math.floor(now() / windowSec) ? e.n : 0; }

/* per-minute counters → security_stats (flushed at most once a minute, in the background: few D1 writes) */
export function stat(env, key, n = 1) {
  const m = minuteOf(now()); const k = m + '|' + key; MEM.stats.set(k, (MEM.stats.get(k) || 0) + n);
  if (now() - MEM.statsAt >= 60 || [...MEM.stats.keys()].some(x => Number(x.split('|')[0]) < m)) { MEM.statsAt = now(); run(env, flushStats(env)); }
}
export async function flushStats(env) {
  if (!MEM.stats.size) return; const rows = [...MEM.stats.entries()]; MEM.stats.clear();
  const st = rows.map(([k, n]) => { const i = k.indexOf('|'); return env.DB.prepare('INSERT INTO security_stats (minute, key, n) VALUES (?1, ?2, ?3) ON CONFLICT(minute, key) DO UPDATE SET n = n + ?3').bind(Number(k.slice(0, i)), k.slice(i + 1).slice(0, 64), n); });
  try { if (env.DB.batch) await env.DB.batch(st); else for (const s of st) await s.run(); } catch (e) { console.error('security stats', e); }
}

/* ---------- events ---------- */
export function secEvent(env, type, severity, o = {}) {
  stat(env, 'ev:' + type);
  const key = type + '|' + (o.ih || '') + '|' + (o.tg || ''); const ts = now(); const e = MEM.logged.get(key);
  if (e && ts - e.at < 60) { e.n++; return null; } // one row per type + source per minute; the rest are folded into the next row
  const n = 1 + (e ? e.n : 0); MEM.logged.set(key, { at: ts, n: 0 });
  if (MEM.logged.size > 20000) MEM.logged.clear();
  const detail = o.detail == null ? null : (typeof o.detail === 'string' ? o.detail : JSON.stringify(o.detail)).slice(0, 500);
  return run(env, env.DB.prepare('INSERT INTO security_events (at, type, severity, ip, tg_id, path, country, n, detail) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
    .bind(ts, type, severity, o.ih || null, o.tg ? Number(o.tg) : null, o.path ? String(o.path).slice(0, 64) : null, o.country ? String(o.country).slice(0, 4) : null, n, detail).run());
}
/* who did what with admin powers (bot commands and the app's admin API) */
export function secAudit(env, adminId, action, o = {}) { return secEvent(env, 'admin:' + action, 'info', Object.assign({ tg: adminId }, o)); }

/* ---------- config: bans, modes, webhook secret override (cached per isolate) ---------- */
async function refreshCfg(env, force) {
  const ts = now(); if (!force && ts - MEM.cfg.at < 30) return MEM.cfg;
  try {
    const bans = (await env.DB.prepare('SELECT key, until FROM security_bans WHERE until > ?1 LIMIT 5000').bind(ts).all()).results || [];
    const rows = (await env.DB.prepare("SELECT key, value FROM discord_cfg WHERE key IN ('sec:lockdown', 'sec:guard', 'sec:hook', 'sec:admin_countries')").all()).results || [];
    const c = Object.fromEntries(rows.map(r => [r.key, r.value]));
    let lock = null; try { lock = c['sec:lockdown'] ? JSON.parse(c['sec:lockdown']) : null; } catch (e) { lock = null; }
    let hook = null; try { hook = c['sec:hook'] ? JSON.parse(c['sec:hook']) : null; } catch (e) { hook = null; }
    let ac = {}; try { ac = c['sec:admin_countries'] ? JSON.parse(c['sec:admin_countries']) : {}; } catch (e) { ac = {}; }
    MEM.cfg = { at: ts, bans: new Map(bans.map(b => [b.key, b.until])), lockdown: lock && lock.on ? lock : null, guardUntil: Number(c['sec:guard']) || 0, hook, adminCountries: ac };
  } catch (e) { console.error('security cfg', e); MEM.cfg.at = ts; }
  return MEM.cfg;
}
export async function bannedTg(env, id) { return ((await refreshCfg(env)).bans.get('tg:' + id) || 0) > now(); }
export async function securityMode(env) { const c = await refreshCfg(env); return c.lockdown ? 'lockdown' : c.guardUntil > now() ? 'guard' : 'normal'; }
export async function isLockdown(env) { return !!(await refreshCfg(env)).lockdown; }
export async function setLockdown(env, on, by, reason) {
  if (on) await cfgSet(env, 'sec:lockdown', JSON.stringify({ on: true, at: now(), by: String(by || ''), reason: String(reason || '').slice(0, 200) }));
  else await env.DB.prepare("DELETE FROM discord_cfg WHERE key = 'sec:lockdown'").run();
  secEvent(env, on ? 'lockdown_on' : 'lockdown_off', 'high', { detail: { by: String(by || ''), reason: String(reason || '').slice(0, 200) } });
  await refreshCfg(env, true);
}
export async function setGuard(env, minutes) { const until = minutes > 0 ? now() + minutes * 60 : 0; await cfgSet(env, 'sec:guard', String(until)); await refreshCfg(env, true); return until; }
export async function banKey(env, key, seconds, reason, by) {
  const until = now() + Math.max(60, Math.min(90 * 86400, seconds | 0));
  await env.DB.prepare('INSERT INTO security_bans (key, until, reason, by, created_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(key) DO UPDATE SET until = MAX(until, ?2), reason = ?3, by = ?4').bind(key, until, String(reason || '').slice(0, 200), String(by || 'auto').slice(0, 40), now()).run();
  MEM.cfg.bans.set(key, until); secEvent(env, 'ban', 'medium', { detail: { key: key.startsWith('tg:') ? 'tg' : 'ip', reason: String(reason || '').slice(0, 120), by: String(by || 'auto'), hours: Math.round((until - now()) / 3600) } });
  return until;
}
export async function unbanKey(env, key) { const r = await env.DB.prepare('DELETE FROM security_bans WHERE key = ?1').bind(key).run(); MEM.cfg.bans.delete(key); return !!(r.meta && r.meta.changes); }
/* the webhook secret: a new one set by the watch after a leak wins over the deployed one until the next deploy */
export async function webhookSecret(env) { const c = await refreshCfg(env); const h = c.hook; if (h && h.secret && h.base === (await sha256hex(String(env.WEBHOOK_SECRET || ''))).slice(0, 16)) return h.secret; return env.WEBHOOK_SECRET || ''; }
export async function rotateWebhookSecret(env, bot) {
  const info = await bot.call('getWebhookInfo'); const url = info && info.ok && info.result && info.result.url; if (!url) return { ok: false, error: 'no_webhook' };
  const a = new Uint8Array(32); crypto.getRandomValues(a); const secret = [...a].map(b => b.toString(16).padStart(2, '0')).join('');
  const r = await bot.call('setWebhook', { url, secret_token: secret, allowed_updates: ['message', 'pre_checkout_query', 'callback_query'] });
  if (!r || !r.ok) return { ok: false, error: (r && r.description) || 'setWebhook' };
  await cfgSet(env, 'sec:hook', JSON.stringify({ secret, base: (await sha256hex(String(env.WEBHOOK_SECRET || ''))).slice(0, 16), at: now() }));
  await refreshCfg(env, true); return { ok: true };
}

/* ---------- guard: every request ---------- */
const reply = (status, error, extra) => new Response(JSON.stringify({ ok: false, error }), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra || {}) });
export async function guardRequest(env, req, path) {
  const ip = req.headers.get('CF-Connecting-IP') || ''; const host = (() => { try { return new URL(req.url).hostname; } catch (e) { return ''; } })();
  const g = { ip, ih: ip ? await ipHash(env, ip) : '', country: (req.cf && req.cf.country) || req.headers.get('CF-IPCountry') || '', asn: Number(req.cf && req.cf.asn) || 0, org: String((req.cf && req.cf.asOrganization) || '').slice(0, 60), path, deny: null };
  stat(env, 'req'); stat(env, path === '/webhook' ? 'req:webhook' : path.startsWith('/api/') ? 'req:api' : 'req:other');
  if (host) stat(env, 'host:' + (host.endsWith('.workers.dev') ? 'workers.dev' : host));
  const c = await refreshCfg(env);
  if (g.ih && (c.bans.get('ip:' + g.ih) || 0) > now()) { stat(env, 'blocked'); g.deny = reply(403, 'blocked'); return g; }
  const len = Number(req.headers.get('Content-Length') || 0);
  if (len > MAX_BODY) { secEvent(env, 'big_body', 'low', { ih: g.ih, path, country: g.country, detail: { bytes: len } }); g.deny = reply(413, 'too_big'); return g; }
  if (!g.ih || path === '/webhook' || req.method === 'OPTIONS') return g; // the webhook is checked by its own rules; no IP header = a local test run
  const guard = c.guardUntil > now();
  const soft = num(env, 'SEC_IP_RPM', 1500) / (guard ? 2.5 : 1), hard = num(env, 'SEC_IP_BAN_RPM', 6000) / (guard ? 2.5 : 1);
  const n = hit('ip:' + g.ih, 60);
  if (n >= hard && n - 1 < hard) { secEvent(env, 'flood_ip', 'high', { ih: g.ih, path, country: g.country, detail: { perMinute: n } }); run(env, banKey(env, 'ip:' + g.ih, guard ? 6 * 3600 : 3600, `флуд ${n} запросов в минуту`, 'auto')); }
  if (n > soft) { stat(env, 'rl'); if (n - 1 <= soft) secEvent(env, 'rate_limit', 'low', { ih: g.ih, path, country: g.country, detail: { perMinute: n } }); g.deny = reply(429, 'rate_limited', { 'Retry-After': '30' }); return g; }
  if (env.RL_IP && typeof env.RL_IP.limit === 'function') { // Workers Rate Limiting binding: shared by the isolates of one location
    try { const r = await env.RL_IP.limit({ key: g.ih }); if (r && r.success === false) { stat(env, 'rl'); g.deny = reply(429, 'rate_limited', { 'Retry-After': '30' }); return g; } } catch (e) {}
  }
  return g;
}
/* an authenticated player: their own limit, bans, scraping, the admin's countries */
const SCRAPE = { '/api/players': ['SEC_PLAYERS_10M', 60], '/api/profile': ['SEC_PROFILE_10M', 150], '/api/friends/search': ['SEC_SEARCH_10M', 120] };
export async function userGate(env, g, tgId, path, isAdminUser) {
  const c = await refreshCfg(env);
  if ((c.bans.get('tg:' + tgId) || 0) > now()) { stat(env, 'blocked'); return reply(403, 'blocked'); }
  const guard = c.guardUntil > now();
  const n = hit('tg:' + tgId, 60); const lim = num(env, 'SEC_TG_RPM', 600) / (guard ? 2 : 1);
  if (n > lim) { stat(env, 'rl'); if (n - 1 <= lim) secEvent(env, 'rate_limit_user', 'low', { ih: g.ih, tg: tgId, path, country: g.country, detail: { perMinute: n } }); return reply(429, 'rate_limited', { 'Retry-After': '20' }); }
  const sc = SCRAPE[path];
  if (sc && !isAdminUser) {
    const k = hit('sc:' + path + ':' + tgId, 600); const max = num(env, sc[0], sc[1]);
    if (k > max) { if (k - 1 <= max) secEvent(env, 'scrape', 'medium', { ih: g.ih, tg: tgId, path, country: g.country, detail: { per10min: k } }); return reply(429, 'rate_limited', { 'Retry-After': '120' }); }
  }
  if (isAdminUser && g.country && c.adminCountries) { // the admin's account opened the app from a country never seen before: possible takeover
    const known = c.adminCountries[tgId] || [];
    if (!known.includes(g.country)) {
      const first = known.length === 0; c.adminCountries[tgId] = known.concat(g.country).slice(-20);
      run(env, cfgSet(env, 'sec:admin_countries', JSON.stringify(c.adminCountries)));
      if (!first) secEvent(env, 'admin_new_country', 'high', { ih: g.ih, tg: tgId, path, country: g.country, detail: { known } });
    }
  }
  return null;
}
/* bot messages and button presses of one person: a flood is dropped silently (Telegram itself is not limited) */
export function botFlood(env, tgId) {
  if (adminIds(env).includes(Number(tgId))) return false;
  const n = hit('bot:' + tgId, 60); const lim = num(env, 'SEC_BOT_RPM', 40);
  if (n > lim) { if (n - 1 <= lim) secEvent(env, 'bot_flood', 'low', { tg: tgId, detail: { perMinute: n } }); return true; }
  return false;
}
/* a request with initData whose signature is wrong (not merely expired): forged; many from one address → a ban */
export function authForged(env, g) {
  if (!g || !g.ih) { secEvent(env, 'auth_forged', 'medium', { path: g && g.path }); return; }
  secEvent(env, 'auth_forged', 'medium', { ih: g.ih, path: g.path, country: g.country });
  const k = hit('af:' + g.ih, 600);
  if (k === num(env, 'SEC_AUTH_BAN_10M', 30)) { secEvent(env, 'auth_bruteforce', 'high', { ih: g.ih, path: g.path, country: g.country, detail: { per10min: k } }); run(env, banKey(env, 'ip:' + g.ih, 3600, `поддельные подписи: ${k} за 10 минут`, 'auto')); }
}
/* the Telegram webhook: only from Telegram's networks and with the secret */
export async function webhookGate(env, req, g, bot) {
  const given = req.headers.get('X-Telegram-Bot-Api-Secret-Token') || ''; const want = await webhookSecret(env);
  const secretOk = !!want && given.length === want.length && safeEqual(given, want);
  const extra = String(env.TG_EXTRA_NETS || '').split(',').map(x => x.trim().split('/')).filter(x => x.length === 2 && ipv4(x[0]) != null).map(([n, b]) => [n, Number(b)]);
  const inExtra = g.ip && extra.some(([net, bits]) => { const v = ipv4(g.ip), n = ipv4(net); if (v == null || !(bits >= 8 && bits <= 32)) return false; const mask = (0xffffffff << (32 - bits)) >>> 0; return ((v & mask) >>> 0) === ((n & mask) >>> 0); });
  const fromTelegram = !g.ip || ipInTelegram(g.ip) || inExtra || TG_ASNS.has(g.asn); // no IP header = a local test run
  if (g.ip && fromTelegram && !ipInTelegram(g.ip) && secretOk) secEvent(env, 'webhook_new_net', 'low', { ih: g.ih, path: '/webhook', detail: { asn: g.asn, org: g.org } }); // Telegram from a range not in the list yet
  if (fromTelegram && secretOk) return null;
  if (!fromTelegram && secretOk) { // the secret is known outside Telegram: replace it at once and lock admin powers until a human looks
    secEvent(env, 'webhook_secret_leaked', 'critical', { ih: g.ih, country: g.country, path: '/webhook', detail: { asn: g.asn, org: g.org } });
    if (!seen('hookrot', 300)) { hit('hookrot', 300); run(env, (async () => { const r = await rotateWebhookSecret(env, bot); if (!(await isLockdown(env))) await setLockdown(env, true, 'auto', 'утёк секрет вебхука'); secEvent(env, 'webhook_rotated', 'high', { detail: { ok: r.ok, error: r.error || null } }); })()); }
  } else if (!fromTelegram) secEvent(env, 'webhook_forged', 'high', { ih: g.ih, country: g.country, path: '/webhook', detail: { secret: given ? 'wrong' : 'none', asn: g.asn, org: g.org } });
  else secEvent(env, 'webhook_secret_mismatch', 'low', { ih: g.ih, path: '/webhook' }); // Telegram itself with an old secret (a deploy is switching it)
  return new Response('forbidden', { status: 403 });
}
/* service keys (posts workflow, security workflow): constant-time, failures are events */
export async function keyGate(env, g, given, want, kind) {
  given = String(given || '');
  if (want && given.length === want.length && safeEqual(given, want)) return true;
  secEvent(env, 'key_fail', 'medium', { ih: g && g.ih, path: g && g.path, country: g && g.country, detail: { kind } });
  return false;
}

/* ---------- content: host-published table state, names ---------- */
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
/* deep copy of a JSON value with every string defused for HTML: < > " become look-alikes, so nothing a host publishes can open a tag
   or leave an attribute in a player's app (numbers and booleans pass, depth and string length are capped) */
export function cleanTableJSON(x, info = { hit: false, depth: 0 }) {
  const walk = (v, d) => {
    if (v == null || typeof v === 'boolean') return v;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') { if (!info.hit && XSS_RE.test(v)) info.hit = true; return v.length > 4000 ? cleanStr(v.slice(0, 4000)) : cleanStr(v); }
    if (d > 14) return null;
    if (Array.isArray(v)) return v.slice(0, 500).map(e => walk(e, d + 1));
    if (typeof v === 'object') { const o = {}; let k = 0; for (const key of Object.keys(v)) { if (BAD_KEYS.has(key) || ++k > 400) continue; o[cleanStr(String(key).slice(0, 64))] = walk(v[key], d + 1); } return o; }
    return null;
  };
  return walk(x, 0);
}
export const cleanStr = s => String(s).replace(/</g, '‹').replace(/>/g, '›').replace(/"/g, '”');
export const looksLikeXss = s => XSS_RE.test(String(s || ''));

/* ---------- the watch: rules → incidents → response → alerts (cron, every minute) ---------- */
export const KINDS = {
  webhook_leak: { sev: 'critical', ru: 'Поддельный запрос к вебхуку бота с верным секретом — секрет утёк' },
  webhook_probe: { sev: 'high', ru: 'Поддельные обновления на вебхук бота не с серверов Telegram' },
  auth_attack: { sev: 'high', ru: 'Много запросов с поддельной подписью Telegram (попытка войти под чужим аккаунтом)' },
  flood: { sev: 'high', ru: 'Флуд / DDoS: всплеск запросов к серверу' },
  errors: { sev: 'medium', ru: 'Много ошибок сервера (5xx)' },
  xss: { sev: 'high', ru: 'Попытка внедрить код (XSS) через стол, клуб или имя' },
  scraping: { sev: 'medium', ru: 'Массовый сбор данных игроков' },
  cheating: { sev: 'medium', ru: 'Подозрение на накрутку рейтинга' },
  key_bruteforce: { sev: 'medium', ru: 'Подбор служебных ключей' },
  admin_location: { sev: 'high', ru: 'Аккаунт админа открыл приложение из новой страны' },
  admin_exports: { sev: 'high', ru: 'Много выгрузок данных игроков за час' },
  signup_spike: { sev: 'low', ru: 'Резкий наплыв новых аккаунтов' },
  quota: { sev: 'high', ru: 'Суточный лимит запросов Cloudflare близко' },
  manual: { sev: 'medium', ru: 'Отмечено вручную' }
};
const IP_SHORT = h => 'ip:' + String(h || '').slice(0, 8);
async function evSummary(env, types, since) {
  const ph = types.map((_, i) => '?' + (i + 2)).join(',');
  const r = await env.DB.prepare(`SELECT COALESCE(SUM(n), 0) AS n, COUNT(DISTINCT ip) AS ips, COUNT(DISTINCT tg_id) AS tgs, GROUP_CONCAT(DISTINCT country) AS cc FROM security_events WHERE at >= ?1 AND type IN (${ph})`).bind(since, ...types).first();
  const top = (await env.DB.prepare(`SELECT ip, SUM(n) AS n FROM security_events WHERE at >= ?1 AND type IN (${ph}) AND ip IS NOT NULL GROUP BY ip ORDER BY n DESC LIMIT 3`).bind(since, ...types).all()).results || [];
  const tg = (await env.DB.prepare(`SELECT tg_id, SUM(n) AS n FROM security_events WHERE at >= ?1 AND type IN (${ph}) AND tg_id IS NOT NULL GROUP BY tg_id ORDER BY n DESC LIMIT 3`).bind(since, ...types).all()).results || [];
  // rows fold repeats of one source per minute; the per-minute counters (ev:<type>) see every single event
  const ev = (await env.DB.prepare(`SELECT COALESCE(SUM(n), 0) AS n FROM security_stats WHERE minute >= ?1 AND key IN (${types.map((_, i) => '?' + (i + 2)).join(',')})`).bind(Math.floor(since / 60), ...types.map(t => 'ev:' + t)).first('n')) || 0;
  return { n: Math.max(r ? r.n : 0, ev), ips: r ? r.ips : 0, tgs: r ? r.tgs : 0, countries: String((r && r.cc) || '').split(',').filter(Boolean).slice(0, 6), top: top.map(x => ({ ip: x.ip, n: x.n })), tg: tg.map(x => ({ id: x.tg_id, n: x.n })) };
}
const statSum = async (env, key, fromMinute) => (await env.DB.prepare('SELECT COALESCE(SUM(n), 0) AS n FROM security_stats WHERE key = ?1 AND minute >= ?2').bind(key, fromMinute).first('n')) || 0;
const statMax = async (env, key, fromMinute) => (await env.DB.prepare('SELECT COALESCE(MAX(n), 0) AS n FROM security_stats WHERE key = ?1 AND minute >= ?2').bind(key, fromMinute).first('n')) || 0;

/* evaluate the rules; returns the list of { kind, count, summary, actions } that fired */
export async function detect(env) {
  const ts = now(), m = minuteOf(ts); const out = [];
  const add = (kind, count, summary, actions = []) => out.push({ kind, count, summary, actions });
  const describe = s => [s.n ? `${s.n} событий` : '', s.ips ? `с ${s.ips} адрес(ов)` : '', s.tgs ? `${s.tgs} аккаунт(ов)` : '', s.countries.length ? `страны: ${s.countries.join(', ')}` : ''].filter(Boolean).join(', ');

  let s = await evSummary(env, ['webhook_secret_leaked'], ts - 600);
  if (s.n) add('webhook_leak', s.n, describe(s), ['секрет вебхука заменён', 'включён режим блокировки']);
  s = await evSummary(env, ['webhook_forged'], ts - 600);
  if (s.n) add('webhook_probe', s.n, describe(s), ['запросы отклонены (не сеть Telegram)']);
  s = await evSummary(env, ['auth_forged', 'auth_bruteforce'], ts - 600);
  if (s.n >= num(env, 'SEC_AUTH_INCIDENT_10M', 20) || s.ips >= 10) add('auth_attack', s.n, describe(s), ['адреса с ≥30 подделками за 10 мин заблокированы на 1 ч']);
  const rpm = await statMax(env, 'req', m - 5), rl = await statSum(env, 'rl', m - 5), blocked = await statSum(env, 'blocked', m - 5);
  const fl = await evSummary(env, ['flood_ip'], ts - 600);
  if (rpm >= num(env, 'SEC_FLOOD_RPM', 2000) || rl >= num(env, 'SEC_FLOOD_RL5', 300) || fl.n || blocked >= 1000) add('flood', Math.max(rpm, rl, fl.n), `до ${rpm} запросов в минуту; отклонено по лимиту: ${rl}, заблокировано: ${blocked}${fl.ips ? `; заблокированы адреса: ${fl.ips}` : ''}`, ['режим усиленной защиты на 30 минут', 'адреса с флудом заблокированы']);
  const e5 = await statSum(env, '5xx', m - 5);
  if (e5 >= num(env, 'SEC_ERR_5M', 30)) add('errors', e5, `${e5} ошибок 5xx за 5 минут`);
  s = await evSummary(env, ['xss_attempt', 'xss_name'], ts - 600);
  if (s.n) add('xss', s.n, describe(s), ['вредный текст обезврежен, у игроков не выполнится']);
  s = await evSummary(env, ['scrape'], ts - 600);
  if (s.n) add('scraping', s.n, describe(s), ['запросы сверх лимита отклонены']);
  s = await evSummary(env, ['result_reject', 'result_flood'], ts - 3600);
  if (s.n >= 3) add('cheating', s.n, describe(s), ['чужие очки не начислены']);
  s = await evSummary(env, ['key_fail'], ts - 600);
  if (s.n >= 5) add('key_bruteforce', s.n, describe(s));
  s = await evSummary(env, ['admin_new_country'], ts - 600);
  if (s.n) add('admin_location', s.n, `страна: ${s.countries.join(', ') || '?'}`);
  s = await evSummary(env, ['admin:players_export'], ts - 3600);
  if (s.n >= num(env, 'SEC_EXPORTS_1H', 5)) add('admin_exports', s.n, `${s.n} выгрузок за час`);
  const newH = await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?1').bind(ts - 3600).first('n') || 0;
  if (newH >= 50) { const week = await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?1 AND created_at < ?2').bind(ts - 7 * 86400, ts - 3600).first('n') || 0; if (newH >= Math.max(50, 8 * week / (7 * 24 - 1))) add('signup_spike', newH, `${newH} новых за час (обычно ~${Math.round(week / (7 * 24 - 1))})`); }
  if (String(env.WORKERS_PLAN || 'free') !== 'paid') { const day = await statSum(env, 'req', minuteOf(ts - (ts % 86400))); if (day >= num(env, 'SEC_DAILY_WARN', 80000)) add('quota', day, `${day} запросов с полуночи UTC из 100 000 бесплатных`); }
  return out;
}
async function alert(env, bot, inc, kind, phase) {
  const k = KINDS[kind] || KINDS.manual; const sev = inc.severity || k.sev;
  const head = phase === 'closed' ? `✅ <b>Безопасность · #${inc.id} закрыт</b>` : `${SEV_ICON[sev]} <b>Безопасность · #${inc.id} · ${SEV_RU[sev]}</b>${phase === 'update' ? ' · продолжается' : ''}`;
  const lines = [head, esc(k.ru)];
  if (inc.summary) lines.push(esc(inc.summary));
  let acts = []; try { acts = JSON.parse(inc.actions || '[]'); } catch (e) {}
  if (acts.length && phase !== 'closed') lines.push('Сделано автоматически: ' + esc(acts.join('; ')) + '.');
  if (phase === 'closed') lines.push(`Тихо 30 минут. Всего событий: ${inc.count}.`);
  else lines.push(`Начало: ${kyivTime(inc.opened_at)} · событий: ${inc.count}. Подробно: /security`);
  const text = lines.join('\n');
  const kb = phase === 'closed' ? undefined : { inline_keyboard: [[{ text: '✅ Принял', callback_data: `sec_ack_${inc.id}` }, { text: '🔒 Блокировка', callback_data: 'sec_lock' }], [{ text: '📋 Статус', callback_data: 'sec_status' }]] };
  if (SEV_RANK[sev] < SEV_RANK.medium && kind !== 'manual') return; // low: only in /security and the agent's report
  for (const id of adminIds(env)) { try { await bot.send(id, text, kb ? { reply_markup: kb } : undefined); } catch (e) {} }
  if (discordReady(env) && SEV_RANK[sev] >= SEV_RANK.high) { // a second channel the Telegram account cannot erase
    try { await hookSend(env, 'analytics', { embeds: [{ title: (phase === 'closed' ? '✅ ' : '🛡 ') + `Безопасность · #${inc.id}`, description: text.replace(/<[^>]+>/g, '').slice(0, 1800), color: phase === 'closed' ? 0x3ba55d : sev === 'critical' ? 0xd83c3e : 0xe0a33c, timestamp: new Date().toISOString() }] }); } catch (e) {}
  }
}
export async function runSecurityWatch(env, bot) {
  await flushStats(env);
  const ts = now(); const found = await detect(env); const opened = [];
  for (const f of found) {
    const k = KINDS[f.kind] || KINDS.manual;
    let inc = await env.DB.prepare("SELECT * FROM security_incidents WHERE kind = ?1 AND status = 'open' ORDER BY id DESC LIMIT 1").bind(f.kind).first();
    if (!inc) {
      const r = await env.DB.prepare("INSERT INTO security_incidents (kind, severity, status, opened_at, last_at, count, summary, actions, notified_at, notified_count) VALUES (?1, ?2, 'open', ?3, ?3, ?4, ?5, ?6, ?3, ?4)").bind(f.kind, k.sev, ts, f.count, f.summary, JSON.stringify(f.actions)).run();
      inc = await env.DB.prepare('SELECT * FROM security_incidents WHERE id = ?1').bind(r.meta.last_row_id).first();
      opened.push(inc); await respond(env, bot, f.kind); await alert(env, bot, inc, f.kind, 'open');
    } else {
      const count = Math.max(inc.count, f.count);
      await env.DB.prepare('UPDATE security_incidents SET last_at = ?1, count = ?2, summary = ?3 WHERE id = ?4').bind(ts, count, f.summary, inc.id).run();
      if (f.kind === 'flood') await respond(env, bot, f.kind); // keep the guard on while it lasts
      if (count >= 3 * (inc.notified_count || 1) && ts - (inc.notified_at || 0) >= 900) { await env.DB.prepare('UPDATE security_incidents SET notified_at = ?1, notified_count = ?2 WHERE id = ?3').bind(ts, count, inc.id).run(); await alert(env, bot, Object.assign({}, inc, { count, summary: f.summary }), f.kind, 'update'); }
    }
  }
  const quiet = (await env.DB.prepare("SELECT * FROM security_incidents WHERE status = 'open' AND kind != 'manual' AND last_at < ?1").bind(ts - 1800).all()).results || [];
  for (const inc of quiet) { await env.DB.prepare("UPDATE security_incidents SET status = 'closed', closed_at = ?1 WHERE id = ?2").bind(ts, inc.id).run(); if (SEV_RANK[inc.severity] >= SEV_RANK.medium) await alert(env, bot, inc, inc.kind, 'closed'); }
  if (minuteOf(ts) % 60 === 7) await cleanup(env);
  return { found: found.map(f => f.kind), opened: opened.map(i => i.id), closed: quiet.map(i => i.id) };
}
async function respond(env, bot, kind) {
  if (kind === 'flood') await setGuard(env, 30);
  if (kind === 'webhook_leak' && !(await isLockdown(env))) await setLockdown(env, true, 'auto', 'утёк секрет вебхука');
}
async function cleanup(env) {
  const ts = now();
  await env.DB.prepare('DELETE FROM security_events WHERE at < ?1').bind(ts - 30 * 86400).run();
  await env.DB.prepare('DELETE FROM security_stats WHERE minute < ?1').bind(minuteOf(ts) - 14 * 1440).run();
  await env.DB.prepare('DELETE FROM security_bans WHERE until < ?1').bind(ts - 86400).run();
  await env.DB.prepare("DELETE FROM security_incidents WHERE status = 'closed' AND closed_at < ?1").bind(ts - 180 * 86400).run();
}

/* ---------- admin: /security in the bot ---------- */
async function statusText(env) {
  const ts = now(); const mode = await securityMode(env); const c = MEM.cfg;
  const open = (await env.DB.prepare("SELECT * FROM security_incidents WHERE status = 'open' ORDER BY id DESC LIMIT 10").all()).results || [];
  const day = (await env.DB.prepare('SELECT type, SUM(n) AS n FROM security_events WHERE at >= ?1 GROUP BY type ORDER BY n DESC LIMIT 12').bind(ts - 86400).all()).results || [];
  const req = await statSum(env, 'req', minuteOf(ts) - 1440); const bans = (await env.DB.prepare('SELECT COUNT(*) AS n FROM security_bans WHERE until > ?1').bind(ts).first('n')) || 0;
  const modeTxt = mode === 'lockdown' ? `🔒 <b>блокировка</b> с ${kyivTime(c.lockdown.at)}${c.lockdown.reason ? ' — ' + esc(c.lockdown.reason) : ''}\nАдмин-действия отключены. Снять — только через GitHub: Actions → Security → action = unlock (или попросите агента).` : mode === 'guard' ? `🛡 усиленная защита до ${kyivTime(c.guardUntil)}` : '🟢 обычный';
  const lines = ['🛡 <b>Безопасность Mafia Pro</b>', `Режим: ${modeTxt}`, `Запросов за сутки: ${req} · блокировок активно: ${bans}`];
  lines.push(open.length ? '\n<b>Открытые инциденты</b>\n' + open.map(i => `${SEV_ICON[i.severity]} #${i.id} ${esc((KINDS[i.kind] || KINDS.manual).ru)} — ${i.count} · ${fmtAgo(ts - i.opened_at)} назад${i.acked_at ? ' · принят' : ''}`).join('\n') : '\nОткрытых инцидентов нет.');
  if (day.length) lines.push('\n<b>События за сутки</b>\n' + day.map(d => `• ${esc(d.type)}: ${d.n}`).join('\n'));
  lines.push('\nКоманды: /security bans · /security log · /security ban &lt;id|ip:хэш&gt; [часы] · /security unban &lt;ключ&gt; · /security lockdown · /security ack &lt;№&gt; · /security close &lt;№&gt;');
  return lines.join('\n');
}
export async function onSecurityCommand(env, bot, msg) {
  const chat = msg.chat.id; const u = msg.from || {}; const parts = String(msg.text || '').trim().split(/\s+/).slice(1); const sub = (parts[0] || '').toLowerCase();
  secAudit(env, u.id, 'security', { detail: sub || 'status' });
  if (!sub || sub === 'status') return bot.send(chat, await statusText(env));
  if (sub === 'bans') { const rows = (await env.DB.prepare('SELECT * FROM security_bans WHERE until > ?1 ORDER BY until DESC LIMIT 30').bind(now()).all()).results || []; return bot.send(chat, rows.length ? '⛔ <b>Блокировки</b>\n' + rows.map(b => `• <code>${esc(b.key)}</code> до ${kyivTime(b.until)} — ${esc(b.reason || '')} (${esc(b.by || '')})`).join('\n') : 'Активных блокировок нет.'); }
  if (sub === 'log') { const rows = (await env.DB.prepare('SELECT * FROM security_events ORDER BY id DESC LIMIT 20').all()).results || []; return bot.send(chat, rows.length ? '📜 <b>Последние события</b>\n' + rows.map(e => `${kyivTime(e.at)} ${SEV_ICON[e.severity] || ''} ${esc(e.type)}${e.n > 1 ? ' ×' + e.n : ''}${e.ip ? ' <code>ip:' + esc(e.ip) + '</code>' : ''}${e.tg_id ? ' <code>' + e.tg_id + '</code>' : ''}${e.country ? ' ' + esc(e.country) : ''}${e.path ? ' ' + esc(e.path) : ''}`).join('\n') : 'Событий нет.'); }
  if (sub === 'ban' || sub === 'unban') {
    const raw = String(parts[1] || ''); const key = /^\d{1,15}$/.test(raw) ? 'tg:' + raw : /^tg:\d{1,15}$/.test(raw) ? raw : /^ip:[0-9a-f]{12}$/.test(raw) ? raw : null;
    if (!key) return bot.send(chat, 'Укажите Telegram id игрока или <code>ip:хэш</code> из /security log.');
    if (sub === 'unban') return bot.send(chat, (await unbanKey(env, key)) ? `Снята блокировка <code>${esc(key)}</code>.` : 'Такой блокировки нет.');
    if (adminIds(env).includes(Number(key.slice(3)))) return bot.send(chat, 'Админа заблокировать нельзя.');
    const hours = Math.max(1, Math.min(2160, Number(parts[2]) || 24)); const until = await banKey(env, key, hours * 3600, 'вручную', 'admin:' + u.id);
    return bot.send(chat, `⛔ <code>${esc(key)}</code> заблокирован до ${kyivTime(until)}.`);
  }
  if (sub === 'lockdown' || sub === 'lock') { await setLockdown(env, true, 'admin:' + u.id, 'включил админ в боте'); return bot.send(chat, '🔒 Режим блокировки включён: выгрузки, рассылки, выдача доступа и одобрения отключены. Игра работает.\nСнять можно только через GitHub (Actions → Security → unlock) — так угнанный Telegram не сможет его выключить.'); }
  if (sub === 'unlock') return bot.send(chat, 'Из Telegram блокировку снять нельзя — это защита на случай угона аккаунта. GitHub → Actions → Security → Run workflow → action = <b>unlock</b> (или попросите агента безопасности).');
  if (sub === 'ack' || sub === 'close') {
    const id = Number(parts[1]); const inc = id ? await env.DB.prepare('SELECT * FROM security_incidents WHERE id = ?1').bind(id).first() : null; if (!inc) return bot.send(chat, 'Нет такого инцидента.');
    if (sub === 'ack') await env.DB.prepare('UPDATE security_incidents SET acked_by = ?1, acked_at = ?2 WHERE id = ?3').bind(u.id, now(), id).run();
    else await env.DB.prepare("UPDATE security_incidents SET status = 'closed', closed_at = ?1, acked_by = COALESCE(acked_by, ?2), acked_at = COALESCE(acked_at, ?1) WHERE id = ?3").bind(now(), u.id, id).run();
    return bot.send(chat, sub === 'ack' ? `Инцидент #${id} принят.` : `Инцидент #${id} закрыт.`);
  }
  return bot.send(chat, await statusText(env));
}
export async function onSecurityCallback(env, bot, q, isAdminFn) {
  const d = String(q.data || ''); if (!/^sec_/.test(d)) return false;
  const u = q.from || {}; if (!isAdminFn(u.id)) { await bot.call('answerCallbackQuery', { callback_query_id: q.id }); return true; }
  let text = '';
  const m = /^sec_ack_(\d+)$/.exec(d);
  if (m) { await env.DB.prepare('UPDATE security_incidents SET acked_by = ?1, acked_at = ?2 WHERE id = ?3 AND acked_at IS NULL').bind(u.id, now(), Number(m[1])).run(); text = `Инцидент #${m[1]} принят`; secAudit(env, u.id, 'security', { detail: 'ack ' + m[1] }); }
  else if (d === 'sec_lock') { if (!(await isLockdown(env))) await setLockdown(env, true, 'admin:' + u.id, 'кнопка в тревоге'); text = 'Блокировка включена'; secAudit(env, u.id, 'security', { detail: 'lockdown' }); }
  else if (d === 'sec_status') { await bot.send(u.id, await statusText(env)); text = 'Статус отправлен'; }
  await bot.call('answerCallbackQuery', { callback_query_id: q.id, text });
  return true;
}
export const LOCKED_TEXT = '🔒 Включён режим блокировки: это действие отключено. Снять блокировку — через GitHub (Actions → Security → unlock). Подробнее: /security';

/* ---------- the "Security" workflow: report and actions (X-Sec-Key) ---------- */
export async function securityReport(env, hours = 24) {
  const ts = now(); hours = Math.max(1, Math.min(24 * 30, Number(hours) || 24)); const since = ts - hours * 3600; const m = minuteOf(ts);
  await refreshCfg(env, true); const c = MEM.cfg;
  const incidents = (await env.DB.prepare("SELECT * FROM security_incidents WHERE status = 'open' OR last_at >= ?1 ORDER BY id DESC LIMIT 50").bind(ts - 7 * 86400).all()).results || [];
  const events = (await env.DB.prepare('SELECT type, severity, SUM(n) AS n, COUNT(DISTINCT ip) AS ips, COUNT(DISTINCT tg_id) AS tgs, MAX(at) AS last FROM security_events WHERE at >= ?1 GROUP BY type, severity ORDER BY n DESC').bind(since).all()).results || [];
  const topIps = (await env.DB.prepare("SELECT ip, SUM(n) AS n, GROUP_CONCAT(DISTINCT type) AS types, MAX(country) AS cc FROM security_events WHERE at >= ?1 AND ip IS NOT NULL AND type NOT LIKE 'admin:%' GROUP BY ip ORDER BY n DESC LIMIT 10").bind(since).all()).results || [];
  const topTg = (await env.DB.prepare("SELECT tg_id, SUM(n) AS n, GROUP_CONCAT(DISTINCT type) AS types FROM security_events WHERE at >= ?1 AND tg_id IS NOT NULL AND type NOT LIKE 'admin:%' GROUP BY tg_id ORDER BY n DESC LIMIT 10").bind(since).all()).results || [];
  const statsRows = (await env.DB.prepare('SELECT key, SUM(n) AS n, MAX(n) AS peak FROM security_stats WHERE minute >= ?1 GROUP BY key ORDER BY n DESC LIMIT 40').bind(m - hours * 60).all()).results || [];
  const perDay = (await env.DB.prepare("SELECT minute / 1440 AS d, SUM(n) AS n FROM security_stats WHERE key = 'req' AND minute >= ?1 GROUP BY d ORDER BY d").bind(m - 7 * 1440).all()).results || [];
  const bans = (await env.DB.prepare('SELECT key, until, reason, by FROM security_bans WHERE until > ?1 ORDER BY until DESC LIMIT 50').bind(ts).all()).results || [];
  const admin = (await env.DB.prepare("SELECT type, SUM(n) AS n, MAX(at) AS last FROM security_events WHERE at >= ?1 AND type LIKE 'admin:%' GROUP BY type ORDER BY n DESC").bind(ts - 7 * 86400).all()).results || [];
  const hookSrc = (await env.DB.prepare("SELECT type, detail, SUM(n) AS n FROM security_events WHERE at >= ?1 AND type LIKE 'webhook_%' GROUP BY type, detail ORDER BY n DESC LIMIT 20").bind(since).all()).results || [];
  const hashTg = async id => 'tg:' + await tgHash(env, id);
  return {
    ok: true, at: new Date(ts * 1000).toISOString(), hours, mode: c.lockdown ? 'lockdown' : c.guardUntil > ts ? 'guard' : 'normal',
    lockdown: c.lockdown ? { at: c.lockdown.at, by: String(c.lockdown.by).startsWith('admin:') ? 'admin' : c.lockdown.by, reason: c.lockdown.reason } : null,
    guardUntil: c.guardUntil > ts ? c.guardUntil : 0, webhookSecretRotated: !!(c.hook && c.hook.secret),
    incidents: incidents.map(i => ({ id: i.id, kind: i.kind, severity: i.severity, status: i.status, opened: i.opened_at, last: i.last_at, closed: i.closed_at, count: i.count, summary: i.summary, actions: i.actions, acked: !!i.acked_at })),
    events: events.map(e => ({ type: e.type, severity: e.severity, n: e.n, ips: e.ips, accounts: e.tgs, last: e.last })),
    topIps: topIps.map(r => ({ ip: 'ip:' + r.ip, n: r.n, types: r.types, country: r.cc || '' })),
    topAccounts: await Promise.all(topTg.map(async r => ({ account: await hashTg(r.tg_id), n: r.n, types: r.types }))),
    stats: statsRows.map(r => ({ key: r.key, total: r.n, peakPerMinute: r.peak })), requestsPerDay: perDay.map(r => ({ day: new Date(r.d * 86400000).toISOString().slice(0, 10), n: r.n })),
    bans: await Promise.all(bans.map(async b => ({ key: b.key.startsWith('tg:') ? await hashTg(b.key.slice(3)) : b.key, until: b.until, reason: b.reason, by: String(b.by || '').startsWith('admin:') ? 'admin' : b.by }))),
    adminActions7d: admin.map(a => ({ type: a.type, n: a.n, last: a.last })), // no audience numbers: the report is posted publicly
    webhookSources: hookSrc.map(h => { let d = {}; try { d = JSON.parse(h.detail || '{}') || {}; } catch (e) {} return { type: h.type, n: h.n, asn: d.asn || null, network: d.org || null }; }) // servers' networks, never a player
  };
}
async function resolveTarget(env, raw) { // ip:<12 hex> as is; tg:<hash> → the account seen in the events with that hash
  raw = String(raw || '').trim();
  if (/^ip:[0-9a-f]{12}$/.test(raw)) return raw;
  const m = /^tg:([0-9a-f]{10})$/.exec(raw); if (!m) return null;
  for (const id of adminIds(env)) if (await tgHash(env, id) === m[1]) return 'tg:' + id;
  const ids = (await env.DB.prepare('SELECT DISTINCT tg_id FROM security_events WHERE tg_id IS NOT NULL ORDER BY id DESC LIMIT 5000').all()).results || [];
  for (const r of ids) if (await tgHash(env, r.tg_id) === m[1]) return 'tg:' + r.tg_id;
  const banned = (await env.DB.prepare("SELECT key FROM security_bans WHERE key LIKE 'tg:%'").all()).results || [];
  for (const r of banned) if (await tgHash(env, r.key.slice(3)) === m[1]) return r.key;
  return null;
}
export async function securityAct(env, bot, b) {
  const action = String(b.action || ''); const note = String(b.note || '').slice(0, 600); const by = 'agent';
  const tell = async text => { for (const id of adminIds(env)) { try { await bot.send(id, text); } catch (e) {} } };
  secEvent(env, 'agent:' + action.replace(/[^a-z_]/g, '').slice(0, 20), 'info', { detail: note || null });
  if (action === 'report') return securityReport(env, b.hours);
  if (action === 'lockdown_on') { await setLockdown(env, true, by, note || 'агент безопасности'); await tell(`🔒 <b>Агент безопасности включил режим блокировки.</b>${note ? '\n' + esc(note) : ''}`); return { ok: true, mode: 'lockdown' }; }
  if (action === 'unlock') { await setLockdown(env, false, by, note); await tell(`🔓 <b>Режим блокировки снят</b> (через GitHub).${note ? '\n' + esc(note) : ''}`); return { ok: true, mode: await securityMode(env) }; }
  if (action === 'guard_on') { const until = await setGuard(env, Math.max(10, Math.min(1440, Number(b.minutes) || 60))); return { ok: true, guardUntil: until }; }
  if (action === 'guard_off') { await setGuard(env, 0); return { ok: true }; }
  if (action === 'ban' || action === 'unban') {
    const key = await resolveTarget(env, b.target); if (!key) return { ok: false, error: 'bad_target' };
    if (key.startsWith('tg:') && adminIds(env).includes(Number(key.slice(3)))) return { ok: false, error: 'admin' };
    if (action === 'unban') return { ok: true, removed: await unbanKey(env, key) };
    const hours = Math.max(1, Math.min(2160, Number(b.hours) || 24)); const until = await banKey(env, key, hours * 3600, note || 'агент безопасности', by);
    return { ok: true, until };
  }
  if (action === 'ack' || action === 'close') {
    const id = Number(b.target); const inc = id ? await env.DB.prepare('SELECT id FROM security_incidents WHERE id = ?1').bind(id).first() : null; if (!inc) return { ok: false, error: 'no_incident' };
    if (action === 'close') await env.DB.prepare("UPDATE security_incidents SET status = 'closed', closed_at = ?1, actions = json_insert(COALESCE(actions, '[]'), '$[#]', ?2) WHERE id = ?3").bind(now(), note ? 'агент: ' + note.slice(0, 200) : 'закрыт агентом', id).run();
    else await env.DB.prepare('UPDATE security_incidents SET acked_at = ?1 WHERE id = ?2').bind(now(), id).run();
    return { ok: true };
  }
  if (action === 'rotate_webhook') { const r = await rotateWebhookSecret(env, bot); await tell(r.ok ? '🔑 Агент безопасности заменил секрет вебхука бота.' : '⚠️ Агент не смог заменить секрет вебхука: ' + esc(r.error || '')); return r; }
  if (action === 'note') { if (!note) return { ok: false, error: 'empty' }; await tell(`🛡 <b>Агент безопасности</b>\n${esc(note)}`); return { ok: true }; }
  if (action === 'test_alert') { const r = await env.DB.prepare("INSERT INTO security_incidents (kind, severity, status, opened_at, last_at, count, summary, actions, notified_at, notified_count, closed_at) VALUES ('manual', 'low', 'closed', ?1, ?1, 1, ?2, '[]', ?1, 1, ?1)").bind(now(), 'Проверка канала тревог').run(); const inc = await env.DB.prepare('SELECT * FROM security_incidents WHERE id = ?1').bind(r.meta.last_row_id).first(); await alert(env, bot, inc, 'manual', 'open'); return { ok: true, id: inc.id }; }
  return { ok: false, error: 'unknown_action' };
}
