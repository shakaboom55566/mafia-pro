#!/usr/bin/env node
/* ============================================================
   Mafia Pro — weekly SEO data (v38.1). Runs in GitHub Actions (seo-report.yml), writes
   seo/reports/<date>.json (everything) and seo/reports/latest.md (the summary the SEO agent and people read).
   Sources — each is optional, a missing one is reported, never fatal:
   - Google Search Console API (GSC_SA_KEY = service-account JSON, GSC_PROPERTY = "sc-domain:…" or the URL-prefix address):
     queries × pages × countries for 28 days and the 28 before, sitemap status (submits the sitemap if it is missing),
     URL inspection of the key pages (indexed or not, last crawl, Google's canonical)
   - Bing Webmaster Tools API (BING_API_KEY): query and page stats
   - PageSpeed Insights (PSI_KEY optional): mobile performance / SEO / accessibility score, LCP, CLS of key pages
   - live checks: every key page answers 200 with its title, description, canonical; the sitemap and the IndexNow key are served
   Targets come from seo/keywords.json; each language is matched by the page folder (ru/, uk/, en/, pl/, hy/).
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['ru', 'uk', 'en', 'pl', 'hy'];
const env = process.env;
const SITE = String(env.SITE_URL || (() => { try { return fs.readFileSync(path.join(ROOT, 'seo/site-url.txt'), 'utf8'); } catch (e) { return ''; } })() || 'https://shakaboom55566.github.io/mafia-pro/').trim().replace(/\/?$/, '/');
const KW = JSON.parse(fs.readFileSync(path.join(ROOT, 'seo/keywords.json'), 'utf8'));
const day = (d, n = 0) => new Date(d.getTime() + n * 864e5).toISOString().slice(0, 10);
const now = new Date(); const today = day(now);
const notes = []; const note = s => { notes.push(s); console.log('• ' + s); };
const langOf = page => { const m = /^https?:\/\/[^/]+(\/.*)$/.exec(page || ''); const p = m ? m[1] : page; const seg = p.slice(new URL(SITE).pathname.length).split('/')[0]; return LANGS.includes(seg) ? seg : 'app'; };
const fetchJson = async (url, opt = {}) => { const r = await fetch(url, opt); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} if (!r.ok) { const e = new Error(`${r.status} ${(j && j.error && (j.error.message || j.error)) || t.slice(0, 160)}`); e.status = r.status; throw e; } return j; };

/* ---------- Google: a service account's access token (JWT, RS256) ---------- */
async function googleToken(sa, scope) {
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url'); const iat = Math.floor(Date.now() / 1000);
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 });
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const j = await fetchJson('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + sig }) });
  return j.access_token;
}

async function gsc() {
  if (!env.GSC_SA_KEY) { note('Search Console: не подключён (нет секрета GSC_SA_KEY) — позиций и показов Google нет'); return null; }
  let sa; try { sa = JSON.parse(env.GSC_SA_KEY); } catch (e) { note('Search Console: GSC_SA_KEY — не JSON сервисного аккаунта'); return null; }
  const prop = String(env.GSC_PROPERTY || SITE).trim(); const P = encodeURIComponent(prop);
  const out = { property: prop, account: sa.client_email };
  let token; try { token = await googleToken(sa, 'https://www.googleapis.com/auth/webmasters'); } catch (e) { note('Search Console: не получен токен — ' + e.message); return null; }
  const H = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const q = (start, end, dimensions, rowLimit = 25000) => fetchJson(`https://www.googleapis.com/webmasters/v3/sites/${P}/searchAnalytics/query`, { method: 'POST', headers: H, body: JSON.stringify({ startDate: start, endDate: end, dimensions, rowLimit, dataState: 'all' }) }).then(j => (j.rows || []).map(r => Object.assign(Object.fromEntries(dimensions.map((d, i) => [d, r.keys[i]])), { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })));
  try {
    const end = day(now, -1);
    out.rows = await q(day(now, -28), end, ['query', 'page', 'country']);
    out.prevQueries = await q(day(now, -56), day(now, -29), ['query', 'page']);
    out.daily = await q(day(now, -28), end, ['date']);
  } catch (e) { note(`Search Console: запрос данных — ${e.message}${e.status === 403 ? ' (добавьте ' + sa.client_email + ' пользователем ресурса с полным доступом)' : ''}`); return out; }
  try {
    const sm = await fetchJson(`https://www.googleapis.com/webmasters/v3/sites/${P}/sitemaps`, { headers: H });
    out.sitemaps = sm.sitemap || [];
    const want = SITE + 'sitemap.xml';
    if (!out.sitemaps.some(s => s.path === want)) {
      try { await fetch(`https://www.googleapis.com/webmasters/v3/sites/${P}/sitemaps/${encodeURIComponent(want)}`, { method: 'PUT', headers: H }).then(r => { if (!r.ok) throw new Error(String(r.status)); }); note('Search Console: sitemap.xml отправлен'); }
      catch (e) { note('Search Console: sitemap.xml не отправлен — ' + e.message); }
    }
  } catch (e) { note('Search Console: sitemaps — ' + e.message); }
  out.inspect = [];
  for (const p of keyPages()) {
    try {
      const j = await fetchJson('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', { method: 'POST', headers: H, body: JSON.stringify({ inspectionUrl: p, siteUrl: prop }) });
      const r = (j.inspectionResult || {}).indexStatusResult || {};
      out.inspect.push({ url: p, verdict: r.verdict, coverage: r.coverageState, lastCrawl: r.lastCrawlTime || null, googleCanonical: r.googleCanonical || null });
    } catch (e) { out.inspect.push({ url: p, error: e.message }); }
  }
  return out;
}

/* ---------- Bing Webmaster Tools ---------- */
async function bing() {
  if (!env.BING_API_KEY) { note('Bing Webmaster: не подключён (нет секрета BING_API_KEY)'); return null; }
  const base = 'https://ssl.bing.com/webmaster/api.svc/json/'; const k = `siteUrl=${encodeURIComponent(SITE)}&apikey=${encodeURIComponent(env.BING_API_KEY)}`;
  const out = {};
  for (const m of ['GetQueryStats', 'GetPageStats', 'GetCrawlStats']) { try { out[m] = (await fetchJson(`${base}${m}?${k}`)).d || []; } catch (e) { note(`Bing ${m}: ${e.message}`); } }
  return out;
}

/* ---------- PageSpeed Insights ---------- */
const PSI_URLS = () => [SITE + 'ru/', SITE + 'en/', SITE + 'ru/roles/don/'];
/* a Lighthouse result (the same shape in PageSpeed's lighthouseResult and in a local `lighthouse --output=json`) → the row */
function lhRow(url, lr, field) {
  const c = lr.categories; const a = lr.audits;
  const fails = Object.values(a).filter(x => x.score !== null && x.score < 0.9 && ['seo', 'performance'].some(g => (c[g].auditRefs || []).some(r => r.id === x.id && r.weight > 0))).map(x => x.title).slice(0, 6);
  return { url, performance: Math.round(c.performance.score * 100), seo: Math.round(c.seo.score * 100), accessibility: Math.round(c.accessibility.score * 100), lcp: a['largest-contentful-paint'].displayValue, cls: a['cumulative-layout-shift'].displayValue, tbt: a['total-blocking-time'].displayValue, fails, field: field || null };
}
async function psi() {
  // without a PSI_KEY the shared PageSpeed quota is often used up (429): the workflow runs Lighthouse itself into LH_DIR (lh-<n>.json)
  if (!env.PSI_KEY && env.LH_DIR) return PSI_URLS().map((url, n) => { try { return Object.assign(lhRow(url, JSON.parse(fs.readFileSync(path.join(env.LH_DIR, `lh-${n}.json`), 'utf8'))), { source: 'lighthouse' }); } catch (e) { return { url, error: 'Lighthouse: ' + e.message }; } });
  const out = [];
  for (const url of PSI_URLS()) {
    const u = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=seo&category=accessibility${env.PSI_KEY ? '&key=' + env.PSI_KEY : ''}`;
    try {
      const j = await fetchJson(u); out.push(Object.assign(lhRow(url, j.lighthouseResult, j.loadingExperience && j.loadingExperience.overall_category), { source: 'pagespeed' }));
    } catch (e) { out.push({ url, error: e.message }); }
  }
  return out;
}

/* ---------- live checks ---------- */
function keyPages() { return [SITE].concat(LANGS.map(l => SITE + l + '/'), LANGS.map(l => SITE + l + '/roles/'), [SITE + 'ru/rules/', SITE + 'uk/rules/', SITE + 'ru/roles/don/']); }
async function live() {
  const out = [];
  for (const url of keyPages()) {
    try {
      const r = await fetch(url, { redirect: 'manual' }); const h = r.ok ? await r.text() : '';
      const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || ''; const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
      const canon = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '';
      out.push({ url, status: r.status, title, titleLen: title.length, descLen: desc.length, canonicalOk: canon === url, noindex: /<meta[^>]+robots[^>]+noindex/i.test(h) });
    } catch (e) { out.push({ url, error: e.message }); }
  }
  for (const [name, url] of [['sitemap', SITE + 'sitemap.xml'], ['indexnow-key', SITE + fs.readFileSync(path.join(ROOT, 'seo/indexnow-key.txt'), 'utf8').trim() + '.txt']]) {
    try { const r = await fetch(url); const t = await r.text(); out.push({ url, name, status: r.status, urls: name === 'sitemap' ? (t.match(/<url>/g) || []).length : undefined }); } catch (e) { out.push({ url, name, error: e.message }); }
  }
  return out;
}

/* ---------- summary ---------- */
function summarize(g) {
  const by = {}; LANGS.concat('app').forEach(l => { by[l] = { clicks: 0, impressions: 0, posSum: 0, queries: {}, countries: {} }; });
  for (const r of (g && g.rows) || []) {
    const b = by[langOf(r.page)]; b.clicks += r.clicks; b.impressions += r.impressions; b.posSum += r.position * r.impressions;
    const k = r.query + '\u0000' + r.page; const x = b.queries[k] || (b.queries[k] = { query: r.query, page: r.page, clicks: 0, impressions: 0, posSum: 0 });
    x.clicks += r.clicks; x.impressions += r.impressions; x.posSum += r.position * r.impressions;
    b.countries[r.country] = (b.countries[r.country] || 0) + r.impressions;
  }
  const prev = {}; for (const r of (g && g.prevQueries) || []) prev[r.query + '\u0000' + r.page] = r;
  const res = {};
  for (const [l, b] of Object.entries(by)) {
    const qs = Object.entries(b.queries).map(([k, x]) => ({ query: x.query, page: x.page.replace(SITE, ''), clicks: x.clicks, impressions: x.impressions, ctr: x.impressions ? x.clicks / x.impressions : 0, position: x.impressions ? x.posSum / x.impressions : null, prevPosition: prev[k] ? prev[k].position : null }));
    qs.sort((a, b) => b.impressions - a.impressions);
    const targets = l === 'app' ? [] : KW[l].queries.map(t => { const hit = qs.filter(x => x.query.toLowerCase() === t.q.toLowerCase()); const best = hit.sort((a, b) => a.position - b.position)[0]; return Object.assign({}, t, best ? { position: best.position, impressions: best.impressions, clicks: best.clicks, rankingPage: best.page } : { position: null }); });
    res[l] = { clicks: b.clicks, impressions: b.impressions, position: b.impressions ? b.posSum / b.impressions : null, top: qs.slice(0, 25), countries: Object.entries(b.countries).sort((a, c) => c[1] - a[1]).slice(0, 8),
      // page 2 (positions 8–20) with impressions — the cheapest wins: better title / description / content on that page
      striking: qs.filter(x => x.position >= 8 && x.position <= 20 && x.impressions >= 5).slice(0, 15),
      // on page 1 but hardly clicked — the snippet (title / description) is the problem
      lowCtr: qs.filter(x => x.position < 8 && x.impressions >= 20 && x.ctr < 0.02).slice(0, 10),
      targets };
  }
  return res;
}

function markdown(r) {
  const f1 = n => (n == null ? '—' : n.toFixed(1)); const pct = n => (n * 100).toFixed(1) + ' %';
  const L = [`# SEO-отчёт ${r.date}`, '', `Сайт: ${r.site}`, ''];
  if (r.notes.length) L.push('## Замечания', ...r.notes.map(n => '- ' + n), '');
  if (r.gsc && r.gsc.inspect) { const idx = r.gsc.inspect.filter(x => x.verdict === 'PASS').length; L.push('## Индексация Google (ключевые страницы)', `Проиндексировано ${idx} из ${r.gsc.inspect.length}.`, ...r.gsc.inspect.filter(x => x.verdict !== 'PASS').map(x => `- ${x.url.replace(r.site, '/')} — ${x.coverage || x.error || x.verdict}`), ''); }
  if (r.summary) for (const l of LANGS.concat('app')) {
    const s = r.summary[l]; if (!s.impressions && l === 'app') continue;
    L.push(`## ${l.toUpperCase()}`, `Показы ${s.impressions}, клики ${s.clicks}, средняя позиция ${f1(s.position)}. Страны: ${s.countries.map(([c, n]) => `${c} ${n}`).join(', ') || '—'}`);
    if (s.targets.length) L.push('', '| Целевой запрос | Уровень | Позиция | Показы |', '|---|---|---|---|', ...s.targets.map(t => `| ${t.q} | ${t.tier} | ${f1(t.position)} | ${t.impressions || 0} |`));
    if (s.striking.length) L.push('', '**Вторая страница (8–20) — ближайшие цели:**', ...s.striking.map(x => `- «${x.query}» → /${x.page} — поз. ${f1(x.position)}${x.prevPosition ? ` (было ${f1(x.prevPosition)})` : ''}, ${x.impressions} показов`));
    if (s.lowCtr.length) L.push('', '**Первая страница, но мало кликов — переписать title/description:**', ...s.lowCtr.map(x => `- «${x.query}» → /${x.page} — поз. ${f1(x.position)}, CTR ${pct(x.ctr)}, ${x.impressions} показов`));
    if (s.top.length) L.push('', '**Топ запросов:**', ...s.top.slice(0, 10).map(x => `- «${x.query}» → /${x.page} — поз. ${f1(x.position)}, ${x.impressions} показов, ${x.clicks} кликов`));
    L.push('');
  }
  if (r.psi) L.push(`## Скорость (${(r.psi[0] || {}).source === 'lighthouse' ? 'Lighthouse' : 'PageSpeed'}, мобильные)`, ...r.psi.map(p => p.error ? `- ${p.url} — ошибка: ${p.error}` : `- ${p.url.replace(r.site, '/')} — скорость ${p.performance}, SEO ${p.seo}, доступность ${p.accessibility}; LCP ${p.lcp}, CLS ${p.cls}${p.fails.length ? '; проблемы: ' + p.fails.join('; ') : ''}`), '');
  const bad = r.live.filter(x => x.error || x.status !== 200 || x.noindex || (x.canonicalOk === false && x.name === undefined));
  L.push('## Живые страницы', bad.length ? bad.map(x => `- ${x.url} — ${x.error || `HTTP ${x.status}${x.noindex ? ', noindex' : ''}${x.canonicalOk === false ? ', canonical не совпадает' : ''}`}`).join('\n') : `Все ${r.live.length} проверок в порядке.`, '');
  if (r.bing && r.bing.GetQueryStats) L.push('## Bing', `Запросов с показами: ${r.bing.GetQueryStats.length}.`, ...r.bing.GetQueryStats.sort((a, b) => b.Impressions - a.Impressions).slice(0, 10).map(x => `- «${x.Query}» — поз. ${x.AvgImpressionPosition}, ${x.Impressions} показов, ${x.Clicks} кликов`), '');
  return L.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (async () => {
    const [g, b, p, lv] = await Promise.all([gsc(), bing(), env.SKIP_PSI ? null : psi(), live()]);
    const r = { date: today, site: SITE, notes, gsc: g ? { property: g.property, account: g.account, sitemaps: g.sitemaps, inspect: g.inspect, daily: g.daily } : null, summary: g && g.rows ? summarize(g) : null, bing: b, psi: p, live: lv };
    const dir = path.join(ROOT, 'seo/reports'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, today + '.json'), JSON.stringify(Object.assign({}, r, { rows: g && g.rows ? g.rows.length : 0 }), null, 1));
    fs.writeFileSync(path.join(dir, 'latest.md'), markdown(r));
    console.log(`report: seo/reports/${today}.json, latest.md`);
  })().catch(e => { console.error(e); process.exit(1); });
}

export { summarize, markdown, googleToken, langOf, lhRow, PSI_URLS };
