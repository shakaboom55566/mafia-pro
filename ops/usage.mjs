#!/usr/bin/env node
/* ============================================================
   Mafia Pro — Cloudflare usage watch (v45). Runs hourly in GitHub Actions (usage.yml).
   Reads the account's Workers requests (all workers: api, site) and D1 rows from the Cloudflare GraphQL Analytics API
   and messages the admins in Telegram (BOT_TOKEN, ADMIN_IDS from backend/wrangler.toml):
   - check:  when today's use crosses 70 / 90 / 100 % of a limit (ops/limits.json), once per threshold a day, and once when the
             pace of the last 3 hours would run past the limit before the reset (00:00 UTC = 03:00 Kyiv)
   - weekly: a summary of the last 7 days (Mondays)
   - status: the current numbers right now (manual run)
   The repository and its logs are public: numbers go only to Telegram; the log says ok / sent / what is missing.
   Env: CLOUDFLARE_API_TOKEN (needs Account → Account Analytics: Read), CLOUDFLARE_ACCOUNT_ID, BOT_TOKEN, STATE_FILE, CF_GRAPHQL, TG_API
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LIMITS = JSON.parse(fs.readFileSync(path.join(ROOT, 'ops/limits.json'), 'utf8'));
const env = process.env;
const DAY = 864e5;
const fmt = n => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
const pct = (n, of) => (of ? (n / of) * 100 : 0);

/* ---------- Cloudflare GraphQL ---------- */
export async function gql(query, variables) {
  const r = await fetch(env.CF_GRAPHQL || 'https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { Authorization: 'Bearer ' + env.CLOUDFLARE_API_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!j) throw new Error(`HTTP ${r.status}`);
  if (j.errors && j.errors.length) { const m = j.errors.map(e => e.message).join('; '); const e = new Error(m); e.auth = /auth|permission|not allowed|access/i.test(m); throw e; }
  return j.data;
}
const Q_WORKERS = `query W($acc: string!, $from: Time!, $to: Time!) { viewer { accounts(filter: { accountTag: $acc }) {
  workersInvocationsAdaptive(limit: 10000, filter: { datetime_geq: $from, datetime_lt: $to }) { sum { requests errors } dimensions { scriptName datetimeHour } } } } }`;
const Q_D1 = `query D($acc: string!, $from: Date!, $to: Date!) { viewer { accounts(filter: { accountTag: $acc }) {
  d1AnalyticsAdaptiveGroups(limit: 10000, filter: { date_geq: $from, date_leq: $to }) { sum { rowsRead rowsWritten } dimensions { date } } } } }`;

/* one UTC day (or the part of it up to `to`): totals, per worker, per hour, D1 rows */
export async function dayUsage(dayStart, to) {
  const acc = env.CLOUDFLARE_ACCOUNT_ID; const from = new Date(dayStart).toISOString(); const end = new Date(Math.min(to || Infinity, dayStart + DAY)).toISOString(); const date = from.slice(0, 10);
  const [w, d] = await Promise.all([gql(Q_WORKERS, { acc, from, to: end }), gql(Q_D1, { acc, from: date, to: date }).catch(e => { if (e.auth) throw e; return null; })]);
  const rows = (((w.viewer || {}).accounts || [])[0] || {}).workersInvocationsAdaptive || [];
  const out = { date, requests: 0, errors: 0, byScript: {}, byHour: Array(24).fill(0), rowsRead: 0, rowsWritten: 0, d1: !!d };
  for (const r of rows) {
    const n = Number(r.sum.requests) || 0; out.requests += n; out.errors += Number(r.sum.errors) || 0;
    const s = r.dimensions.scriptName || '?'; out.byScript[s] = (out.byScript[s] || 0) + n;
    const h = new Date(r.dimensions.datetimeHour).getUTCHours(); if (h >= 0 && h < 24) out.byHour[h] += n;
  }
  for (const g of (((d && d.viewer || {}).accounts || [])[0] || {}).d1AnalyticsAdaptiveGroups || []) { out.rowsRead += Number(g.sum.rowsRead) || 0; out.rowsWritten += Number(g.sum.rowsWritten) || 0; }
  return out;
}

/* ---------- what to say ---------- */
const METRICS = [['requests', 'workersRequests', 'запросов к воркерам'], ['rowsRead', 'd1RowsRead', 'чтений строк D1'], ['rowsWritten', 'd1RowsWritten', 'записей строк D1']];
export function evaluate(u, now, state, limits = LIMITS) {
  const alerts = []; const st = state && state.date === u.date ? state : { date: u.date, sent: [] };
  const hour = new Date(now).getUTCHours(); const left = Math.max(0, (u.dayStart + DAY - now) / 36e5);
  for (const [k, lk, name] of METRICS) {
    const lim = limits[lk]; if (!lim || (k !== 'requests' && !u.d1)) continue;
    const p = pct(u[k], lim);
    for (const t of limits.thresholds) if (p >= t && !st.sent.includes(`${k}${t}`)) { st.sent.push(`${k}${t}`); alerts.push({ kind: 'threshold', metric: k, name, t, p, used: u[k], lim }); }
    if (k === 'requests') {
      const recent = [hour - 1, hour - 2, hour - 3].filter(h => h >= 0).map(h => u.byHour[h]); const rate = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
      const proj = u.requests + rate * left; u.projected = proj;
      if (proj >= lim && p >= 30 && p < 100 && !st.sent.includes('forecast')) { st.sent.push('forecast'); alerts.push({ kind: 'forecast', metric: k, name, p, used: u.requests, lim, proj, rate, left }); }
    }
  }
  return { alerts, state: st };
}
const until = left => { const h = Math.floor(left), m = Math.round((left - h) * 60); return h ? `${h} ч ${m} мин` : `${m} мин`; };
export function alertText(u, alerts) {
  const L = ['⚠️ <b>Cloudflare: лимит бесплатного тарифа</b>', ''];
  for (const a of alerts) {
    if (a.kind === 'threshold') L.push(a.t >= 100 ? `🔴 Лимит ${a.name} исчерпан: ${fmt(a.used)} из ${fmt(a.lim)}. До сброса в 03:00 по Киеву запросы к воркерам ${a.metric === 'requests' ? 'получают ошибку — приложение не работает' : 'к базе могут не проходить'}.` : `${a.t >= 90 ? '🟠' : '🟡'} ${a.name[0].toUpperCase() + a.name.slice(1)}: ${fmt(a.used)} из ${fmt(a.lim)} (${Math.round(a.p)} %) — сегодня, сброс в 03:00 по Киеву.`);
    else L.push(`📈 При нынешнем темпе (${fmt(a.rate)} в час) лимит ${a.name} закончится раньше сброса: к 03:00 будет ≈${fmt(a.proj)} из ${fmt(a.lim)}.`);
  }
  L.push('', topScripts(u), '', 'Что делать: Workers Paid ($5/мес) в Cloudflare → Workers &amp; Pages → Plans — снимает дневной лимит. После перехода поменяйте period в ops/limits.json на "month".');
  return L.join('\n');
}
const topScripts = u => 'По воркерам: ' + (Object.entries(u.byScript).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} ${fmt(n)}`).join(', ') || '—');
export function statusText(u, now, limits = LIMITS) {
  const p = pct(u.requests, limits.workersRequests);
  return [`📊 <b>Cloudflare сегодня</b> (с 03:00 по Киеву)`, '',
    `Запросы к воркерам: ${fmt(u.requests)} из ${fmt(limits.workersRequests)} (${p.toFixed(1)} %)${u.projected ? `, к сбросу ≈${fmt(u.projected)}` : ''}`,
    `Ошибки воркеров: ${fmt(u.errors)}`,
    u.d1 ? `D1: прочитано строк ${fmt(u.rowsRead)} (${pct(u.rowsRead, limits.d1RowsRead).toFixed(1)} %), записано ${fmt(u.rowsWritten)} (${pct(u.rowsWritten, limits.d1RowsWritten).toFixed(1)} %)` : 'D1: нет данных',
    topScripts(u), '', 'Предупреждение придёт само при 70 %, 90 % и 100 % лимита.'].join('\n');
}
export function weeklyText(days, limits = LIMITS) {
  const peak = days.reduce((a, d) => (d.requests > a.requests ? d : a), days[0]);
  const tot = days.reduce((a, d) => a + d.requests, 0); const err = days.reduce((a, d) => a + d.errors, 0);
  return [`📊 <b>Cloudflare за неделю</b>`, '',
    ...days.map(d => `${d.date.slice(5).split('-').reverse().join('.')} — ${fmt(d.requests)} (${Math.round(pct(d.requests, limits.workersRequests))} %)${d.errors ? `, ошибок ${fmt(d.errors)}` : ''}`), '',
    `Всего ${fmt(tot)}, в среднем ${fmt(tot / days.length)} в день, пик ${peak.date.slice(5).split('-').reverse().join('.')} — ${Math.round(pct(peak.requests, limits.workersRequests))} % дневного лимита.`,
    `Ошибок воркеров за неделю: ${fmt(err)}.`,
    pct(peak.requests, limits.workersRequests) >= 50 ? 'Пик больше половины лимита — стоит перейти на Workers Paid ($5/мес) до рекламы.' : 'Запас по лимиту большой.'].join('\n');
}

/* ---------- Telegram ---------- */
export function adminIds() { const m = /^ADMIN_IDS\s*=\s*"([^"]*)"/m.exec(fs.readFileSync(path.join(ROOT, 'backend/wrangler.toml'), 'utf8')); return (m ? m[1] : '').split(',').map(s => s.trim()).filter(Boolean); }
export async function tell(text) {
  if (!env.BOT_TOKEN) { console.log('::warning::no BOT_TOKEN — message not sent'); return 0; }
  let n = 0;
  for (const id of adminIds()) {
    const r = await fetch(`${env.TG_API || 'https://api.telegram.org'}/bot${env.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: id, text, parse_mode: 'HTML', disable_web_page_preview: true }) }).catch(() => null);
    if (r && r.ok) n++;
  }
  return n;
}

/* ---------- run ---------- */
export async function run(mode = 'check', now = Date.now()) {
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) { console.log('::warning::no CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID'); return 'missing'; }
  const dayStart = Math.floor(now / DAY) * DAY;
  try {
    if (mode === 'weekly') {
      const days = []; for (let i = 7; i >= 1; i--) days.push(await dayUsage(dayStart - i * DAY));
      const n = await tell(weeklyText(days)); console.log(`weekly summary sent to ${n} admin(s)`); return 'weekly';
    }
    const u = await dayUsage(dayStart, now); u.dayStart = dayStart;
    const stateFile = env.STATE_FILE || path.join(ROOT, 'ops/.usage-state.json');
    let state = null; try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch (e) {}
    const ev = evaluate(u, now, state);
    fs.mkdirSync(path.dirname(stateFile), { recursive: true }); fs.writeFileSync(stateFile, JSON.stringify(ev.state));
    if (mode === 'status') { const n = await tell(statusText(u, now)); console.log(`status sent to ${n} admin(s)`); return 'status'; }
    if (ev.alerts.length) { const n = await tell(alertText(u, ev.alerts)); console.log(`alert (${ev.alerts.map(a => a.kind === 'threshold' ? a.metric + ' ' + a.t + '%' : 'forecast').join(', ')}) sent to ${n} admin(s)`); return 'alert'; }
    console.log('ok — below the thresholds'); return 'ok';
  } catch (e) {
    if (e.auth) console.log('::warning::Cloudflare analytics: the token has no access. Add to CLOUDFLARE_API_TOKEN the permission Account → Account Analytics → Read (Cloudflare → My Profile → API Tokens → Edit).');
    else console.log('::warning::Cloudflare analytics: ' + String(e.message || e).slice(0, 200));
    return 'error';
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run(process.argv[2] || 'check').then(r => { if (r === 'error' && process.argv[2] === 'status') process.exitCode = 1; });
}
