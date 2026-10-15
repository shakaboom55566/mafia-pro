#!/usr/bin/env node
/* The "Ads" workflow's script (.github/workflows/ads.yml): paid ads in Instagram + Facebook through the Meta Marketing API.
   Hourly in the daytime (Kyiv): every enabled campaign of ads/config.json gets its campaign + ad set (created once), its ads are judged
   by ads/lib/rules.mjs (6 daytime hours and 500 impressions before any verdict; weak views / clicks / cost / reactions / players →
   paused, at most one change a check, the best one never), the next brief from ads/creatives/ becomes a new ad (Gemini: Veo or Imagen),
   the admins get a short note in Telegram, and on Mondays (and at the end) a report. State: ads/state/<tag>.json (committed).
     node ads/run.mjs briefs [files]        validate briefs (no network)
     node ads/run.mjs check                 the hourly run
     node ads/run.mjs status                keys, account, campaigns, queue — "ready: yes|no"
     node ads/run.mjs stats                 every ad with its numbers and verdict (for the daily agent; changes nothing)
     node ads/run.mjs report [--final]      the report to the admins now
     node ads/run.mjs preview <brief>       make the media of one brief and send it to the admins only (no Meta, Gemini key only)
     node ads/run.mjs launch <brief>        launch this brief now (no judging)
   Env: META_ADS_TOKEN, META_AD_ACCOUNT_ID, META_PAGE_ID (or the Page connected in /social), META_PIXEL_ID, GEMINI_API_KEY, BOT_TOKEN,
        API (else .mafia-api-url), LOG, CHANGED (a file touched when something changed); tests: META_GRAPH_BASE, GEMINI_BASE, TELEGRAM_API,
        NOW, NBU_API, APP_URL, ADS_DIR. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { log, secret, http, short } from '../social/lib/util.mjs';
import { hasFfmpeg } from '../social/lib/video.mjs';
import { loadBriefs, parseBrief } from './lib/brief.mjs';
import { decide, pickBrief, metricsOf, kyivParts, zonedMs, inWindow, dayHours, DEFAULT_RULES, LIVE, PENDING, PROBLEM, fmt } from './lib/rules.mjs';
import * as M from './lib/marketing.mjs';
import { makeVideo, makeImage, Blocked, COST } from './lib/make.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)); const root = path.resolve(here, '..');
const env = process.env;
const DIR = env.ADS_DIR || here;
const CFG = JSON.parse(fs.readFileSync(path.join(DIR, 'config.json'), 'utf8'));
const RULES = Object.assign({}, DEFAULT_RULES, CFG.rules || {});
const STATE_DIR = path.join(DIR, 'state'), BRIEFS = path.join(DIR, 'creatives'), REPORTS = path.join(DIR, 'reports');
const API = (env.API || (fs.existsSync(path.join(root, '.mafia-api-url')) ? fs.readFileSync(path.join(root, '.mafia-api-url'), 'utf8') : '')).trim().replace(/\/$/, '');
const TG = (env.TELEGRAM_API || 'https://api.telegram.org').replace(/\/$/, '');
const LOGO = path.join(root, 'bot', 'media', 'avatar-512.png');
const nowMs = () => (env.NOW ? Date.parse(env.NOW) : Date.now());
const iso = ms => new Date(ms).toISOString();
const today = () => kyivParts(nowMs()).date;
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const usd = x => `$${(Number(x) || 0).toFixed(2).replace('.', ',')}`;
const num = x => String(Math.round(Number(x) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const pct = x => fmt.pct(Number(x) || 0);
const changed = () => { if (env.CHANGED) try { fs.writeFileSync(env.CHANGED, '1'); } catch (e) {} };
for (const k of ['META_ADS_TOKEN', 'GEMINI_API_KEY', 'BOT_TOKEN']) if (env[k]) secret(env[k]);

/* ---------- backend, Telegram ---------- */
const keyOf = label => crypto.createHash('sha256').update(String(env.BOT_TOKEN) + label).digest('hex').slice(0, 48);
async function backend(p, body, header = 'X-Ads-Key', label = ':mafia-pro-ads') {
  if (!API || !env.BOT_TOKEN) return { ok: false, error: !API ? 'no backend address' : 'BOT_TOKEN is not set' };
  let r = null;
  for (let i = 1; i <= 6; i++) { // 404: the backend may still be deploying (same push)
    r = await http(`${API}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', [header]: keyOf(label) }, body: JSON.stringify(body || {}) }, { tries: 3, wait: 8000, label: p });
    if (r.status !== 404 || env.NOW) break; log(`  ${p}: 404 — the backend may be deploying; retry in 30 s (${i}/6)`); await new Promise(res => setTimeout(res, 30000));
  }
  return r.json || { ok: false, error: `HTTP ${r.status} ${short(r.text, 120)}` };
}
async function tg(method, body, file) {
  if (!env.BOT_TOKEN) return { ok: false };
  let r;
  if (file) { const fd = new FormData(); for (const [k, v] of Object.entries(body)) if (v != null) fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v)); fd.append(file.field, new Blob([file.bytes], { type: file.type }), file.name); r = await http(`${TG}/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', body: fd }, { tries: 2, label: 'telegram ' + method }); }
  else r = await http(`${TG}/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, { tries: 2, label: 'telegram ' + method });
  return r.json || {};
}
async function tell(admins, text, media) {
  let sent = 0;
  for (const a of admins || []) {
    let r;
    if (media && media.kind === 'video') r = await tg('sendVideo', { chat_id: a, caption: text.slice(0, 1020), parse_mode: 'HTML', supports_streaming: 'true', width: 1080, height: 1920 }, { field: 'video', bytes: media.bytes, type: 'video/mp4', name: 'ad.mp4' });
    else if (media && media.kind === 'image') r = await tg('sendPhoto', { chat_id: a, caption: text.slice(0, 1020), parse_mode: 'HTML' }, { field: 'photo', bytes: media.bytes, type: 'image/jpeg', name: 'ad.jpg' });
    else r = await tg('sendMessage', { chat_id: a, text: text.slice(0, 4000), parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
    if (r && r.ok) sent++; else log(`::warning::telegram to admin: ${short(r && r.description, 120)}`);
  }
  return sent;
}

/* ---------- state ---------- */
const stateFile = tag => path.join(STATE_DIR, tag + '.json');
function loadState(tag) { try { return JSON.parse(fs.readFileSync(stateFile(tag), 'utf8')); } catch (e) { return { tag, ads: {}, used: [], launches: [], swaps: [], reports: {}, alerts: {}, audiences: {} }; } }
function saveState(s) { fs.mkdirSync(STATE_DIR, { recursive: true }); fs.writeFileSync(stateFile(s.tag), JSON.stringify(s, null, 2) + '\n'); }
const launchesOn = (s, date) => s.launches.filter(l => kyivParts(Date.parse(l.at)).date === date);
async function alertOnce(s, admins, key, text, hours = 12) {
  const last = s.alerts[key] ? Date.parse(s.alerts[key]) : 0; if (nowMs() - last < hours * 3600000) return false;
  s.alerts[key] = iso(nowMs()); await tell(admins, text); changed(); return true;
}

/* ---------- money ---------- */
async function rateFor(currency) {
  if (currency === 'USD') return 1;
  const nbu = (env.NBU_API || 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange').replace(/\/$/, '');
  const one = async c => { const r = await http(`${nbu}?valcode=${c}&json`, {}, { tries: 3, label: 'nbu ' + c }); const v = r.json && r.json[0] && Number(r.json[0].rate); if (!v) throw new Error(`no NBU rate for ${c}`); return v; };
  const usdUah = await one('USD'); if (currency === 'UAH') return usdUah;
  return usdUah / (await one(currency));
}
export const spendUsd = c => (c.weekly_total_usd / (1 + (c.vat || 0))) * (c.days / 7);

/* ---------- Meta: identity, setup ---------- */
function graph() {
  if (!env.META_ADS_TOKEN || !env.META_AD_ACCOUNT_ID) return null;
  return M.client({ base: env.META_GRAPH_BASE, token: env.META_ADS_TOKEN, account: env.META_AD_ACCOUNT_ID });
}
async function identity(g) {
  let pageId = String(env.META_PAGE_ID || '').trim(), igId = null, from = 'META_PAGE_ID';
  if (!pageId) { const c = await backend('/social/creds', {}, 'X-Social-Key', ':mafia-pro-social'); if (c.ok && c.meta) { pageId = c.meta.pageId; igId = c.meta.igId || null; from = '/social'; } }
  if (!pageId) return { ok: false, error: 'no Facebook Page: set the META_PAGE_ID secret or connect the Page in the bot (/social)' };
  if (!igId) { const p = await M.pageIdentity(g, pageId); if (p.ok && p.data.instagram_business_account) igId = p.data.instagram_business_account.id; }
  return { ok: true, pageId, igId, from };
}
async function setup(g, c, s, acc, admins) {
  const camp = await M.ensureCampaign(g, c.name); if (!camp.ok) return { ok: false, error: 'campaign: ' + camp.error };
  const rate = await rateFor(acc.currency); const total = spendUsd(c); const minor = Math.round(total * rate * 100);
  const start = nowMs(); const endDate = kyivParts(start + c.days * 86400000).date; const end = zonedMs(endDate, 0);
  const optimization = env.META_PIXEL_ID ? 'LANDING_PAGE_VIEWS' : 'LINK_CLICKS';
  const spec = M.adsetSpec({ campaignId: camp.data.id, name: `${c.name} · ${kyivParts(start).date}`, lifetimeMinor: minor, startIso: iso(start), endIso: iso(end), geo: c.geo, ages: c.ages, hours: c.hours, optimization, pixel: env.META_PIXEL_ID });
  const set = s.adsetId ? { ok: true, data: { id: s.adsetId }, existed: true } : await M.ensureAdset(g, spec);
  if (!set.ok) return { ok: false, error: 'ad set: ' + set.error };
  if (!s.adsetId) {
    Object.assign(s, { campaignId: camp.data.id, adsetId: set.data.id, start: iso(start), end: iso(end), currency: acc.currency, budgetMinor: minor, budgetUsd: Number(total.toFixed(2)), optimization, createdAt: iso(start) });
    log(`  setup: campaign ${camp.data.id}${camp.existed ? ' (found)' : ''}, ad set ${set.data.id}: ${minor / 100} ${acc.currency} (${usd(total)} without VAT) until ${endDate}, ${optimization}`);
    await tell(admins, `▶️ <b>Реклама · ${esc(c.city)} запущена</b>\nБюджет ${usd(total)} на ${c.days} дн. (≈ ${usd(c.weekly_total_usd)} в неделю вместе с НДС)${acc.currency !== 'USD' ? ` = ${num(minor / 100)} ${esc(acc.currency)}` : ''}\nПоказ ${c.hours[0]}:00–${c.hours[1]}:00, ${esc(c.city)} + ${c.geo.radius_km} км, ${c.ages[0]}–${c.ages[1]} лет, Instagram и Facebook\nОптимизация: ${optimization === 'LANDING_PAGE_VIEWS' ? 'переходы на страницу (пиксель)' : 'клики по ссылке (пикселя нет)'}\nОбъявления создаются — пройдут проверку Meta, обычно в течение часа. Замены — по правилу 6 дневных часов; отчёт — по понедельникам. Пауза — /ads.`);
    changed();
  }
  return { ok: true };
}

/* ---------- one new ad ---------- */
function briefQueue(s, tag) { return loadBriefs(BRIEFS).filter(b => b.tag === tag && !b.errors.length && !s.used.includes(b.id)); }
function lostOf(s) { const since = nowMs() - 48 * 3600000; return s.swaps.filter(w => Date.parse(w.at) >= since).map(w => ({ hook: (s.ads[w.out] || {}).hook, codes: w.codes || [] })); }
async function launchOne(g, c, s, ident, { brief = null, winner = null } = {}) {
  if (!env.GEMINI_API_KEY) return { ok: false, error: 'GEMINI_API_KEY is not set' };
  const spent = launchesOn(s, today()).reduce((x, l) => x + (l.costUsd || 0), 0);
  if (spent >= (c.max_gemini_usd_per_day || 4)) return { ok: false, error: `Gemini: ${usd(spent)} today — the daily limit ${usd(c.max_gemini_usd_per_day || 4)}`, soft: true };
  for (let attempt = 0; attempt < 2; attempt++) {
    let b = brief || pickBrief(briefQueue(s, c.tag), { lost: lostOf(s), winner });
    let take = 1;
    if (!b) { // the queue is empty: a fresh take of the best brief
      const src = winner && winner.brief ? winner.brief : Object.values(s.ads).filter(a => a.status === 'live').map(a => a.brief)[0];
      const f = src && path.join(BRIEFS, src + '.md'); if (!f || !fs.existsSync(f)) return { ok: false, error: 'the brief queue is empty and there is no best ad to retake — the daily agent writes new briefs' };
      b = parseBrief(f); take = Object.values(s.ads).filter(a => a.brief === b.id).length + 1; log(`  queue empty → take ${take} of ${b.id}`);
    }
    log(`## launch ${b.id}${take > 1 ? ' #' + take : ''} · ${b.kind} · hook ${b.hook} · ${b.angle}`);
    let media;
    try { media = b.kind === 'video' ? await makeVideo(b, { apiKey: env.GEMINI_API_KEY, base: env.GEMINI_BASE, appBase: env.APP_URL || 'https://mafiapro.app/', logo: LOGO, pollMs: Number(env.POLL_MS) || 10000, take }) : await makeImage(b, { apiKey: env.GEMINI_API_KEY, base: env.GEMINI_BASE, take }); }
    catch (e) {
      if (e instanceof Blocked && !brief) { log(`::warning::${b.id}: ${e.message} — skipped, next brief`); if (take === 1) s.used.push(b.id); s.launches.push({ at: iso(nowMs()), brief: b.id, costUsd: 0, blocked: true }); continue; }
      return { ok: false, error: `${b.id}: ${e.message}` };
    }
    const name = `${c.tag} · ${b.id}${take > 1 ? ' #' + take : ''} · ${b.kind}`;
    let up, thumb = null;
    if (b.kind === 'video') { up = await M.uploadVideo(g, media.bytes, name, { pollMs: Number(env.POLL_MS) || 10000 }); if (up.ok) { const t = await M.uploadImage(g, media.thumb, name + ' thumb'); if (!t.ok) return { ok: false, error: 'thumbnail: ' + t.error }; thumb = t.data.hash; } }
    else up = await M.uploadImage(g, media.bytes, name);
    if (!up.ok) return { ok: false, error: `upload ${b.id}: ${up.error}` };
    const cr = await M.createCreative(g, { name, pageId: ident.pageId, igId: ident.igId, kind: b.kind, videoId: up.data.id, imageHash: up.data.hash, thumbHash: thumb, text: b.text, headline: b.headline, link: c.landing, cta: b.cta,
      urlTags: `utm_source=facebook&utm_medium=paid&utm_campaign=${c.tag}&ad={{ad.id}}` });
    if (!cr.ok) return { ok: false, error: `creative ${b.id}: ${cr.error}` };
    const ad = await M.createAd(g, { name, adsetId: s.adsetId, creativeId: cr.data.id });
    if (!ad.ok) return { ok: false, error: `ad ${b.id}: ${ad.error}` };
    s.ads[ad.data.id] = { brief: b.id, take, kind: b.kind, hook: b.hook, angle: b.angle, title: b.title, creativeId: cr.data.id, mediaId: up.data.id || up.data.hash, launchedAt: iso(nowMs()), status: 'pending' };
    if (take === 1 && !s.used.includes(b.id)) s.used.push(b.id);
    s.launches.push({ at: iso(nowMs()), brief: b.id, take, ad: ad.data.id, costUsd: media.costUsd });
    log(`  ad ${ad.data.id} created (${name}) — waits for Meta's review`); changed();
    return { ok: true, ad: ad.data.id, brief: b, take, media: { kind: b.kind, bytes: media.bytes }, costUsd: media.costUsd };
  }
  return { ok: false, error: 'two briefs in a row were blocked by the safety filters' };
}

/* ---------- reading the ad set ---------- */
async function snapshot(g, s, c) {
  const ads = await M.listAds(g, s.adsetId); if (!ads.ok) return { ok: false, error: 'ads: ' + ads.error };
  const ins = await M.adInsights(g, s.adsetId); if (!ins.ok) return { ok: false, error: 'insights: ' + ins.error };
  const since = kyivParts(Date.parse(s.start || s.createdAt || iso(nowMs()))).date; const until = today();
  const first = await M.firstImpressions(g, s.adsetId, since, until, (d, h) => zonedMs(d, h, s.timezone || 'Europe/Kiev'));
  if (!first.ok) log(`::warning::hourly insights: ${first.error} — the hours count from the ad's creation`);
  const st = await backend('/ads/stats', { since: Math.floor(Date.parse(s.start || iso(nowMs() - 15 * 86400000)) / 1000) - 3600, src: c.tag });
  const players = st.ok ? st.ads || {} : {};
  const byAd = {}; for (const row of ins.data) byAd[row.ad_id] = row;
  const list = ads.data.map(a => {
    const meta = s.ads[a.id] || {}; const brief = meta.brief || (String(a.name).split(' · ')[1] || a.name).replace(/\s*#\d+$/, '');
    const fb = a.ad_review_feedback && a.ad_review_feedback.global ? Object.values(a.ad_review_feedback.global).join('; ') : '';
    return { id: a.id, name: a.name, status: a.effective_status, created: Date.parse(a.created_time) || nowMs(), first: first.ok ? first.data[a.id] || null : null,
      kind: meta.kind || (/image/.test(a.name) ? 'image' : 'video'), brief, hook: meta.hook || '', title: meta.title || brief, reason: fb, m: metricsOf(byAd[a.id], players[a.id]) };
  });
  return { ok: true, list, stats: st.ok ? st : null };
}
const ruVerdict = { ok: '✅', bad: '⚠️', dead: '💤', wait: '⏳', pending: '🔎', rejected: '⛔' };
function adLine(v, a) {
  const m = v.m; const parts = [`${num(m.imp)} показов`];
  if (a && a.kind === 'video') parts.push(`досмотр 3 с ${pct(m.hook)}`);
  parts.push(`CTR ${pct(m.ctr)}`); if (m.cpl != null) parts.push(`переход ${usd(m.cpl)}`); if (m.newPlayers) parts.push(`игроков ${m.newPlayers}`);
  return parts.join(', ');
}

/* ---------- the hourly check of one campaign ---------- */
async function checkCampaign(g, c, acc, creds, ident) {
  const s = loadState(c.tag); s.timezone = acc.timezone_name || 'Europe/Kiev'; const admins = creds.admins || []; const notices = !creds.muted;
  const end = s.end ? Date.parse(s.end) : null; const now = nowMs();
  if (!s.adsetId) {
    if (creds.paused) { log(`${c.tag}: paused in the bot — not started`); return 0; }
    const r = await setup(g, c, s, acc, admins); if (!r.ok) { saveState(s); await alertOnce(s, admins, 'setup', `⚠️ <b>Реклама · ${esc(c.city)}</b>: не удалось создать кампанию.\n${esc(r.error)}`); saveState(s); return 1; }
  }
  // the pause switch of /ads (the backend pauses at once when it has the token; this is the fallback)
  if (creds.paused && !s.pausedByUs) { const r = await M.setStatus(g, s.campaignId, 'PAUSED'); if (r.ok) { s.pausedByUs = true; log(`${c.tag}: campaign paused (/ads)`); changed(); } }
  if (!creds.paused && s.pausedByUs) { const r = await M.setStatus(g, s.campaignId, 'ACTIVE'); if (r.ok) { s.pausedByUs = false; log(`${c.tag}: campaign resumed (/ads)`); changed(); } }
  if (creds.paused) { saveState(s); return 0; }
  const snap = await snapshot(g, s, c); if (!snap.ok) { log(`::error::${c.tag}: ${snap.error}`); saveState(s); return 1; }
  // statuses into the state: approved, rejected, paused by hand
  for (const a of snap.list) {
    const st = s.ads[a.id]; if (!st) continue;
    if (st.status === 'pending' && LIVE.has(a.status)) { st.status = 'live'; st.approvedAt = iso(now); log(`  ${st.brief}: approved`); changed(); }
    if (PROBLEM.has(a.status) && st.status !== 'rejected') {
      st.status = 'rejected'; st.reason = a.reason || 'Meta отклонила объявление'; changed();
      await tell(admins, `⛔ <b>Реклама · ${esc(c.city)}</b>: Meta отклонила «${esc(st.title)}» (${esc(st.brief)}).\n${esc(short(st.reason, 300))}\nЗапускаю следующее.`);
    }
    if (a.status === 'PAUSED' && (st.status === 'live' || st.status === 'pending')) { st.status = 'paused'; st.reason = 'на паузе вручную (Ads Manager)'; changed(); }
  }
  const ended = end && now >= end;
  if (ended) {
    if (!s.reports.final) { await sendReport(g, c, s, acc, admins, snap, true); s.reports.final = today(); changed(); }
    saveState(s); log(`${c.tag}: the test is over (${s.end}) — nothing launched`); return 0;
  }
  const mine = snap.list.filter(a => s.ads[a.id] || /^\w+ · /.test(a.name));
  const live = mine.filter(a => LIVE.has(a.status) || PENDING.has(a.status) || PROBLEM.has(a.status));
  const history = mine.filter(a => !live.includes(a));
  const d = decide({ ads: live, history, now, rules: RULES, win: c.hours, tz: s.timezone, target: c.active_ads || 3, launchesToday: launchesOn(s, today()).filter(l => !l.blocked).length });
  for (const v of d.verdicts) log(`  ${ruVerdict[v.verdict] || ''} ${v.brief}${v.best ? ' ★' : ''}: ${v.verdict}${v.why.length ? ' — ' + v.why.join('; ') : ''} (${num(v.m.imp)} imp, ${v.hours != null ? v.hours + ' h' : '—'})`);
  for (const n of d.notes) log('  · ' + n);
  const best = d.best ? d.verdicts.find(v => v.id === d.best) : null; const winner = best ? Object.assign({ brief: best.brief }, s.ads[best.id] || {}) : null;
  // launch first (so the count never drops), then pause
  const launched = [];
  for (let i = 0; i < d.launch; i++) {
    const r = await launchOne(g, c, s, ident, { winner });
    if (r.ok) launched.push(r); else { log(`::warning::${c.tag}: no new ad — ${r.error}`); if (!r.soft) await alertOnce(s, admins, 'launch:' + r.error.slice(0, 40), `⚠️ <b>Реклама · ${esc(c.city)}</b>: новое объявление не создано.\n${esc(short(r.error, 400))}`, 6); break; }
  }
  const paused = [];
  for (const id of d.pause) {
    const v = d.verdicts.find(x => x.id === id); const r = await M.setStatus(g, id, 'PAUSED');
    if (!r.ok) { log(`::warning::pause ${v.brief}: ${r.error}`); continue; }
    const st = s.ads[id] || (s.ads[id] = { brief: v.brief, kind: v.kind, title: v.brief });
    Object.assign(st, { status: 'paused', pausedAt: iso(now), reason: v.why.join('; '), codes: v.codes, final: { imp: v.m.imp, spend: v.m.spend, clicks: v.m.clicks, lpv: v.m.lpv, hook: Number(v.m.hook.toFixed(4)), ctr: Number(v.m.ctr.toFixed(4)), players: v.m.newPlayers } });
    s.swaps.push({ at: iso(now), out: id, in: launched.map(l => l.ad), codes: v.codes, why: v.why }); paused.push({ v, st }); changed();
    log(`  paused ${v.brief}: ${v.why.join('; ')}`);
  }
  // notes to the admins
  if (notices) {
    for (const p of paused) {
      const nl = launched[0];
      await tell(admins, `🔁 <b>Реклама · ${esc(c.city)}</b>\nНа паузе: «${esc(p.st.title)}» (${esc(p.v.brief)}) — ${esc(p.v.why.join('; '))}.\n${adLine(p.v, p.st)}${nl ? `\nВместо него: «${esc(nl.brief.title)}» (${esc(nl.brief.id)}, ${nl.brief.kind === 'video' ? 'видео' : 'картинка'}) — на проверке Meta.` : ''}${best ? `\nЛучшее сейчас: «${esc((s.ads[best.id] || {}).title || best.brief)}» — ${adLine(best, s.ads[best.id])}` : ''}`, nl && p === paused[0] ? nl.media : null);
    }
    for (const l of launched) if (!paused.length || l !== launched[0]) {
      await tell(admins, `🆕 <b>Реклама · ${esc(c.city)}</b>: новое объявление «${esc(l.brief.title)}» (${esc(l.brief.id)}${l.take > 1 ? ' #' + l.take : ''}, ${l.brief.kind === 'video' ? 'видео' : 'картинка'}, приём: ${esc(l.brief.hook)}) — на проверке Meta. Gemini ≈ ${usd(l.costUsd)}.`, l.media);
    }
  }
  // audiences to keep (pixel needed): after day 3
  if (env.META_PIXEL_ID && s.start && now - Date.parse(s.start) > 3 * 86400000) await ensureAudiences(g, c, s);
  // the Monday report
  const k = kyivParts(now); const rep = CFG.report || { weekday: 'Mon', hour: 10 };
  if (k.weekday === rep.weekday && k.hour >= rep.hour && s.reports.weekly !== k.date && s.start && now - Date.parse(s.start) > 86400000) { await sendReport(g, c, s, acc, admins, snap, false); s.reports.weekly = k.date; changed(); }
  saveState(s);
  return 0;
}
async function ensureAudiences(g, c, s) {
  const want = { site: { kind: 'site', name: `${c.name} · заходили на страницу (30 дн.)`, days: 30, urlPart: new URL(c.landing).pathname }, leads: { kind: 'leads', name: `${c.name} · игроки из рекламы (180 дн.)`, days: 180 } };
  for (const [k, w] of Object.entries(want)) {
    if (s.audiences[k] || (s.audiences[k + 'Error'] && nowMs() - Date.parse(s.audiences[k + 'ErrorAt'] || 0) < 86400000)) continue;
    const r = await M.createAudience(g, M.audienceSpec(Object.assign({ pixel: env.META_PIXEL_ID }, w)));
    if (r.ok) { s.audiences[k] = r.data.id; log(`  audience "${w.name}": ${r.data.id}`); changed(); }
    else { s.audiences[k + 'Error'] = r.error; s.audiences[k + 'ErrorAt'] = iso(nowMs()); log(`::warning::audience ${k}: ${r.error}`); }
  }
}

/* ---------- report ---------- */
async function sendReport(g, c, s, acc, admins, snap, final) {
  const tot = await M.adsetTotals(g, s.adsetId); const t = tot.ok && tot.data.data && tot.data.data[0] ? tot.data.data[0] : {};
  const m = metricsOf(t); const st = snap.stats || (await backend('/ads/stats', { since: Math.floor(Date.parse(s.start) / 1000) - 3600, src: c.tag }));
  const p = (st && st.sources && st.sources[c.tag]) || { visits: 0, starts: 0, newPlayers: 0, played: 0 }; const plain = (st && st.plain && st.plain[c.tag]) || { newPlayers: 0 };
  const rate = acc.currency === 'USD' ? 1 : await rateFor(acc.currency).catch(() => null);
  const spent = rate ? m.spend / rate : null; const newP = p.newPlayers + plain.newPlayers;
  const days = Math.max(1, Math.round((nowMs() - Date.parse(s.start)) / 86400000));
  const rows = snap.list.filter(a => s.ads[a.id]).map(a => ({ a, st: s.ads[a.id], m: a.m })).filter(x => x.m.imp >= 300);
  const byCost = rows.slice().sort((x, y) => (x.m.cpp == null) - (y.m.cpp == null) || (x.m.cpp || 0) - (y.m.cpp || 0) || (x.m.cpl || 99) - (y.m.cpl || 99));
  const best = byCost[0], worst = byCost.length > 1 ? byCost[byCost.length - 1] : null;
  const aud = [];
  for (const [k, label] of [['site', 'заходили на страницу'], ['leads', 'игроки из рекламы']]) if (s.audiences[k]) { const a = await M.audienceSize(g, s.audiences[k]); if (a.ok) aud.push(`${label} ~${num(a.data.approximate_count_lower_bound > 0 ? a.data.approximate_count_lower_bound : 0)}`); }
  const running = Object.values(s.ads).filter(a => a.status === 'live').length, pend = Object.values(s.ads).filter(a => a.status === 'pending').length;
  const gem = s.launches.reduce((x, l) => x + (l.costUsd || 0), 0);
  const lines = [`📊 <b>Реклама · ${esc(c.city)} — ${final ? `итог ${c.days} дней` : `неделя, день ${days} из ${c.days}`}</b>`,
    `Потрачено: ${spent != null ? usd(spent) : `${m.spend} ${esc(acc.currency)}`}${spent != null ? ` + НДС ≈ ${usd(spent * (1 + (c.vat || 0)))}` : ''} из ${usd(s.budgetUsd || spendUsd(c))}`,
    `Показы ${num(m.imp)} · охват ${num(m.reach)} · частота ${(Number(t.frequency) || 0).toFixed(1).replace('.', ',')}`,
    `Клики ${num(m.clicks)} (CTR ${pct(m.ctr)}) · переходы на страницу ${num(m.lpv)}${m.lpv && spent != null ? ` (${usd(spent / m.lpv)})` : ''}`,
    `Открыли бота ${num(p.starts + (plain.starts || 0))} · <b>новые игроки ${num(newP)}</b>${newP && spent != null ? ` (${usd(spent * (1 + (c.vat || 0)) / newP)} с НДС)` : ''} · сыграли ${num(p.played)}${p.played && spent != null ? ` (${usd(spent * (1 + (c.vat || 0)) / p.played)})` : ''}`];
  if (best) lines.push(`Лучшее: «${esc(best.st.title)}» (${esc(best.st.brief)}, ${best.st.kind === 'video' ? 'видео' : 'картинка'}) — ${best.m.cpl != null ? 'переход ' + usd(best.m.cpl) + ', ' : ''}игроков ${best.m.newPlayers}`);
  if (worst && worst !== best) lines.push(`Слабее всех: «${esc(worst.st.title)}» (${esc(worst.st.brief)})${worst.st.reason ? ' — ' + esc(worst.st.reason) : ''}`);
  lines.push(`Замен: ${s.swaps.length} · идут ${running}${pend ? ` · на проверке ${pend}` : ''} · креативов сделано ${s.launches.filter(l => !l.blocked).length} (Gemini ≈ ${usd(gem)})`);
  if (aud.length) lines.push(`Аудитории в Meta: ${aud.join(' · ')}`);
  if (final) {
    const cpp = newP && spent != null ? spent * (1 + (c.vat || 0)) / newP : null; const share = newP ? p.played / newP : 0;
    lines.push('', cpp == null ? 'Итог: игроков из рекламы нет — Meta для нас не работает в этом виде; смотрим Telegram Ads и клубы.'
      : cpp <= 1.5 && share >= 0.15 ? `Итог: игрок ${usd(cpp)}, сыграли ${pct(share)} — можно добавлять Украину и Армению (пишите «добавь»).`
      : cpp <= 2.5 ? `Итог: игрок ${usd(cpp)} — средне. Предлагаю ещё неделю с новыми роликами и страницей.`
      : `Итог: игрок ${usd(cpp)} — дорого. Лучше вложить в Telegram Ads и клубы.`);
  }
  await tell(admins, lines.join('\n'));
  fs.mkdirSync(REPORTS, { recursive: true });
  fs.writeFileSync(path.join(REPORTS, `${today()}-${c.tag}${final ? '-final' : ''}.md`), lines.join('\n').replace(/<\/?b>/g, '**').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') + '\n');
  log(`  report sent (${final ? 'final' : 'weekly'})`);
}

/* ---------- preflight ---------- */
async function preflight({ quiet = false } = {}) {
  const out = { ok: false, problems: [] };
  const g = graph(); if (!g) { out.problems.push('META_ADS_TOKEN / META_AD_ACCOUNT_ID are not set (GitHub → Settings → Secrets and variables → Actions)'); return out; }
  const creds = await backend('/ads/creds', {}); if (!creds.ok) { out.problems.push('backend: ' + (creds.error || 'no answer')); return out; }
  const acc = await M.accountInfo(g); if (!acc.ok) { out.problems.push('ad account: ' + acc.error); return Object.assign(out, { g, creds }); }
  const a = acc.data;
  if (Number(a.account_status) !== 1) out.problems.push(`ad account status ${a.account_status}${a.disable_reason ? ', reason ' + a.disable_reason : ''} — check Ads Manager (billing, restriction)`);
  if (CFG.require_spend_cap && !(Number(a.spend_cap) > 0)) out.problems.push('no account spending limit: Ads Manager → Billing → Account spending limit (the hard ceiling of the test)');
  if (Number(a.spend_cap) > 0 && Number(a.amount_spent) >= Number(a.spend_cap)) out.problems.push('the account spending limit is reached — Meta stopped the ads');
  const ident = await identity(g); if (!ident.ok) out.problems.push(ident.error);
  if (!quiet) log(`account: ${a.name} · ${a.currency} · ${a.timezone_name} · status ${a.account_status} · limit ${Number(a.spend_cap) > 0 ? num(a.spend_cap / 100) + ' ' + a.currency : 'none'} · spent ${num(Number(a.amount_spent) / 100)} ${a.currency}`);
  return Object.assign(out, { ok: !out.problems.length, g, creds, acc: a, ident });
}

async function check() {
  log('## ads check · ' + iso(nowMs()));
  const p = await preflight();
  if (!p.g || !p.creds || !p.creds.ok) { for (const x of p.problems) log('not ready: ' + x); return 0; }
  if (p.creds.locked) { log('security lockdown — no changes'); return 0; }
  if (!p.ok) {
    for (const x of p.problems) log('not ready: ' + x); // the admin gets it in Telegram at most twice a day (alertOnce), the log stays quiet
    for (const c of CFG.campaigns.filter(x => x.enabled)) { const s = loadState(c.tag); if (await alertOnce(s, p.creds.admins, 'preflight:' + p.problems.join('|').slice(0, 60), `⚠️ <b>Реклама</b>: не могу работать —\n${p.problems.map(x => '• ' + esc(x)).join('\n')}`)) saveState(s); }
    return 0;
  }
  const ids = []; let code = 0;
  for (const c of CFG.campaigns.filter(x => x.enabled)) {
    try { code = Math.max(code, await checkCampaign(p.g, c, p.acc, p.creds, p.ident)); } catch (e) { log(`::error::${c.tag}: ${e && e.stack || e}`); code = 1; }
    const s = loadState(c.tag); if (s.campaignId) ids.push(s.campaignId);
  }
  if (ids.length) await backend('/ads/creds', { campaigns: ids });
  return code;
}

async function status() {
  log('## ads status');
  log(`gemini key: ${env.GEMINI_API_KEY ? 'set' : 'MISSING (GEMINI_API_KEY)'} · ffmpeg ${hasFfmpeg() ? 'ok' : 'missing'} · pixel ${env.META_PIXEL_ID ? 'set (landing page views)' : 'not set (META_PIXEL_ID) — optimizing for link clicks'}`);
  const p = await preflight();
  for (const x of p.problems) log('problem: ' + x);
  if (p.creds && p.creds.ok) log(`backend: ok${p.creds.locked ? ' · LOCKDOWN' : ''}${p.creds.paused ? ' · PAUSED in /ads' : ''}${p.creds.muted ? ' · notices muted' : ''} · Conversions API ${p.creds.capi ? 'on' : 'off (META_ADS_TOKEN + META_PIXEL_ID → Deploy backend)'}`);
  if (p.ident && p.ident.ok) log(`page ${p.ident.pageId} (${p.ident.from}) · instagram ${p.ident.igId || 'not linked to the Page'}`);
  for (const c of CFG.campaigns) {
    const s = loadState(c.tag); const q = briefQueue(s, c.tag);
    log(`${c.tag} (${c.city}): ${c.enabled ? 'enabled' : 'off'} · ${s.adsetId ? `ad set ${s.adsetId}, ${s.start.slice(0, 10)} → ${s.end.slice(0, 10)}, ${Object.values(s.ads).filter(a => a.status === 'live').length} live` : 'not started'} · budget ${usd(spendUsd(c))} (+VAT) · queue ${q.length} briefs`);
  }
  const ready = p.ok && !!env.GEMINI_API_KEY && !p.creds.locked;
  log(`ready: ${ready ? 'yes' : 'no'}`); return 0;
}

async function stats() {
  log('## ads stats · ' + iso(nowMs()));
  const p = await preflight(); if (!p.g || !p.acc) { for (const x of p.problems) log('not ready: ' + x); return 0; }
  for (const c of CFG.campaigns) {
    const s = loadState(c.tag); if (!s.adsetId) { log(`${c.tag}: not started`); continue; } s.timezone = p.acc.timezone_name || 'Europe/Kiev';
    const snap = await snapshot(p.g, s, c); if (!snap.ok) { log(`${c.tag}: ${snap.error}`); continue; }
    const live = snap.list.filter(a => LIVE.has(a.status) || PENDING.has(a.status) || PROBLEM.has(a.status));
    const d = decide({ ads: live, history: snap.list.filter(a => !live.includes(a)), now: nowMs(), rules: RULES, win: c.hours, tz: s.timezone, target: c.active_ads || 3, launchesToday: launchesOn(s, today()).length });
    log(`${c.tag}: ${s.start.slice(0, 10)} → ${s.end.slice(0, 10)} · swaps ${s.swaps.length} · launched ${s.launches.filter(l => !l.blocked).length} · queue ${briefQueue(s, c.tag).length}`);
    log('brief · kind · hook · angle · status · daytime h · imp · 3s view · CTR · LPV · cost/LPV · spend · new players · played · verdict');
    for (const a of snap.list) {
      const v = d.verdicts.find(x => x.id === a.id); const st = s.ads[a.id] || {}; const m = a.m;
      log(`  ${a.brief} · ${a.kind} · ${st.hook || '—'} · ${st.angle || '—'} · ${a.status} · ${v && v.hours != null ? v.hours : dayHours(a.first || a.created, nowMs(), c.hours, s.timezone).toFixed(1)} · ${m.imp} · ${a.kind === 'video' ? pct(m.hook) : '—'} · ${pct(m.ctr)} · ${m.lpv} · ${m.cpl != null ? usd(m.cpl) : '—'} · ${usd(m.spend)} · ${m.newPlayers} · ${m.played} · ${v ? v.verdict + (v.best ? ' ★' : '') + (v.why.length ? ' (' + v.why.join('; ') + ')' : '') : st.status || '—'}`);
    }
    if (snap.stats) log(`backend (${c.tag}): ${JSON.stringify(snap.stats.sources[c.tag] || {})} · plain link ${JSON.stringify((snap.stats.plain || {})[c.tag] || {})}`);
    for (const w of s.swaps.slice(-10)) log(`  swap ${w.at.slice(0, 16)}: ${(s.ads[w.out] || {}).brief || w.out} — ${(w.why || []).join('; ')}`);
  }
  return 0;
}

async function preview(file) {
  const b = parseBrief(file); for (const e of b.errors) log(`::error::${file}: ${e}`); if (b.errors.length) return 1;
  if (!env.GEMINI_API_KEY) { log('::error::GEMINI_API_KEY is not set'); return 1; }
  const creds = await backend('/ads/creds', {}); const admins = creds.ok ? creds.admins : [];
  const media = b.kind === 'video' ? await makeVideo(b, { apiKey: env.GEMINI_API_KEY, base: env.GEMINI_BASE, appBase: env.APP_URL || 'https://mafiapro.app/', logo: LOGO, pollMs: Number(env.POLL_MS) || 10000 }) : await makeImage(b, { apiKey: env.GEMINI_API_KEY, base: env.GEMINI_BASE });
  const n = await tell(admins, `👀 <b>Пробное объявление</b> ${esc(b.id)} (${b.kind === 'video' ? 'видео' : 'картинка'}, приём: ${esc(b.hook)})\n<b>${esc(b.headline)}</b>\n${esc(b.text)}\n<i>Никуда не опубликовано · Gemini ≈ ${usd(media.costUsd)}</i>`, { kind: b.kind, bytes: media.bytes });
  log(`preview of ${b.id} sent to ${n} admin(s)`); return 0;
}
async function launchNow(file) {
  const b = parseBrief(file); if (b.errors.length) { for (const e of b.errors) log(`::error::${file}: ${e}`); return 1; }
  const c = CFG.campaigns.find(x => x.tag === b.tag); if (!c) { log(`::error::no campaign "${b.tag}" in ads/config.json`); return 1; }
  const p = await preflight(); if (!p.ok) { for (const x of p.problems) log('::error::' + x); return 1; }
  if (p.creds.locked) { log('security lockdown — nothing launched'); return 0; }
  const s = loadState(c.tag); if (!s.adsetId) { const r = await setup(p.g, c, s, p.acc, p.creds.admins); if (!r.ok) { log('::error::' + r.error); return 1; } }
  const r = await launchOne(p.g, c, s, p.ident, { brief: b }); saveState(s);
  if (!r.ok) { log('::error::' + r.error); return 1; }
  if (!p.creds.muted) await tell(p.creds.admins, `🆕 <b>Реклама · ${esc(c.city)}</b>: вручную запущено «${esc(b.title)}» (${esc(b.id)}) — на проверке Meta.`, r.media);
  return 0;
}
async function reportNow(final) {
  const p = await preflight(); if (!p.g || !p.acc || !p.creds || !p.creds.ok) { for (const x of p.problems) log('not ready: ' + x); return 0; }
  for (const c of CFG.campaigns) { const s = loadState(c.tag); if (!s.adsetId) continue; s.timezone = p.acc.timezone_name || 'Europe/Kiev'; const snap = await snapshot(p.g, s, c); if (snap.ok) await sendReport(p.g, c, s, p.acc, p.creds.admins, snap, final); }
  return 0;
}

const [cmd, ...rest] = process.argv.slice(2); const flags = new Set(rest.filter(a => a.startsWith('--'))); const files = rest.filter(a => !a.startsWith('--'));
let code = 0;
try {
  if (cmd === 'briefs') {
    const list = files.length ? files.map(f => parseBrief(f)) : loadBriefs(BRIEFS); const tags = new Set(CFG.campaigns.map(c => c.tag)); const ids = new Set();
    for (const b of list) {
      if (b.tag && !tags.has(b.tag)) b.errors.push(`tag "${b.tag}" is not in ads/config.json`);
      for (const w of b.warnings) log(`::warning::${path.relative(root, b.file)}: ${w}`); for (const e of b.errors) log(`::error::${path.relative(root, b.file)}: ${e}`);
      if (b.errors.length) code = 1; else log(`${b.id}: ok (${b.kind}, ${b.hook}, ${b.text.length} chars)`);
      if (ids.has(b.id)) { log(`::error::duplicate id ${b.id}`); code = 1; } ids.add(b.id);
    }
  }
  else if (cmd === 'check') code = await check();
  else if (cmd === 'status') code = await status();
  else if (cmd === 'stats') code = await stats();
  else if (cmd === 'report') code = await reportNow(flags.has('--final'));
  else if (cmd === 'preview') code = await preview(files[0] && files[0].endsWith('.md') ? files[0] : path.join(BRIEFS, (files[0] || '') + '.md'));
  else if (cmd === 'launch') code = await launchNow(files[0] && files[0].endsWith('.md') ? files[0] : path.join(BRIEFS, (files[0] || '') + '.md'));
  else { console.log('usage: node ads/run.mjs briefs|check|status|stats|report|preview|launch …'); code = 2; }
} catch (e) { log(`::error::${e && e.stack || e}`); code = 1; }
process.exit(code);
