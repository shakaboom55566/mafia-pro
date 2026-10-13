#!/usr/bin/env node
/* ============================================================
   Mafia Pro — the public website for search engines (v38).
   The app itself (index.html at the site root) is a script-rendered Telegram Mini App: a search engine sees an empty page.
   This script writes plain, fast, crawlable HTML pages next to it, in the five languages of the app, from the app's own data:
     <lang>/                 landing: what Mafia Pro is, features, formats, roles, FAQ
     <lang>/roles/           all 55 role cards by team
     <lang>/roles/<id>/      one page per role: rules, tip, story, card image
     <lang>/rules/           how a game goes, classic tournament rules, online, open / closed game, points
     <lang>/scenarios/       roles by number of players (7–24), the classic 10 and the scenarios
   plus sitemap.xml (with hreflang), robots.txt, og/<lang>.html (rendered to og/<lang>.png by seo/render-images.js).
   Every page: title, description, canonical, hreflang (+ x-default → en), Open Graph, Twitter card, JSON-LD.
   Run: node seo/build-site.mjs <out dir = _site>   env: SITE_URL (default the Pages address), BOT_USERNAME, GSC_VERIFY
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadApp } from '../discord/setup.mjs';
import { T } from '../discord/texts.mjs';
import { S } from './texts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LANGS = ['ru', 'uk', 'en', 'pl', 'hy'];
export const DEFAULT_SITE = 'https://shakaboom55566.github.io/mafia-pro/';
const STARS = { role: 100, scenario: 500, pack: 1750 };
const TEAM_ORDER = [['black'], ['red'], ['neutral', 'ww']];
const TEAM_KEY = { black: 'mafia', red: 'city', neutral: 'neutral', ww: 'neutral' };

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = s => String(s || '').replace(/\*\*|__|\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
/* the Discord markdown of the shared texts → HTML: **bold**, *italic*, [link](url), new lines */
const md = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" rel="nofollow noopener">$1</a>').replace(/\n/g, '<br>');
const noEmoji = s => String(s || '').replace(/^[^\p{L}\p{N}«“„"]+/u, '').trim();
const cut = (s, n) => { s = String(s || ''); if (s.length <= n) return s; const c = s.slice(0, n - 1); const i = c.lastIndexOf(' '); return (i > n * 0.6 ? c.slice(0, i) : c).replace(/[,.;:—–-]+$/, '') + '…'; };

export function build(outDir, env = process.env) {
  const fileSite = (() => { try { return fs.readFileSync(path.join(ROOT, 'seo/site-url.txt'), 'utf8').trim(); } catch (e) { return ''; } })(); // an own domain later: one line in seo/site-url.txt
  const SITE = String(env.SITE_URL || fileSite || DEFAULT_SITE).replace(/\/?$/, '/');
  const BASE = new URL(SITE).pathname; // '/mafia-pro/' on GitHub Pages, '/' on an own domain
  const BOT = String(env.BOT_USERNAME || 'mafiaprof_bot').replace(/^@/, '');
  const verify = String(env.GSC_VERIFY || '').trim();
  const apps = {}; LANGS.forEach(l => { apps[l] = loadApp(l); });
  const OVR = (() => { try { const j = JSON.parse(fs.readFileSync(env.SEO_OVERRIDES || path.join(ROOT, 'seo/overrides.json'), 'utf8')); delete j._; return j; } catch (e) { return {}; } })();
  const pages = []; // { path, lang, alt: {lang: path} } for the sitemap
  const write = (rel, html) => { const f = path.join(outDir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
  const abs = p => SITE + p.replace(/^\//, '');
  const href = p => BASE + p;
  const tg = l => `https://t.me/${BOT}?start=site_${l}`;
  const card = (l, id) => `${BASE}cards/${l}/${id}.png`;
  const thumb = (l, id) => `${BASE}cards/${l}/t/${id}.jpg`;

  /* ---------- page shell ---------- */
  function page({ l, p, title, desc, h1, lead, body, ld = [], crumbs = [], image, alt, ogType = 'website' }) {
    const s = S[l]; const altMap = alt || Object.fromEntries(LANGS.map(x => [x, p.replace(/^[a-z]{2}\//, x + '/')]));
    /* per-page edits of the SEO agent (seo/overrides.json): a better title / description / h1, an extra paragraph, FAQ for the queries the page ranks for */
    const o = OVR[p] || {};
    if (o.title) title = o.title; if (o.desc) desc = o.desc; if (o.h1) h1 = o.h1;
    if (o.intro) body = `<p>${esc(o.intro)}</p>` + body;
    if (o.faq && o.faq.length) {
      const old = ld.find(x => x['@type'] === 'FAQPage');
      const qa = o.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }));
      if (old) old.mainEntity = old.mainEntity.concat(qa); else ld = ld.concat([{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa }]);
      body += `<section><h2>${esc(s.home.faqH)}</h2>${o.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`;
    }
    pages.push({ path: p, lang: l, alt: altMap });
    const ogImg = image || abs(`og/${l}.png`);
    const nav = [['home', `${l}/`], ['roles', `${l}/roles/`], ['rules', `${l}/rules/`], ['scenarios', `${l}/scenarios/`]];
    const bc = crumbs.length ? [[s.nav.home, `${l}/`]].concat(crumbs) : [];
    if (bc.length) ld = ld.concat([{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: bc.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: abs(u) })) }]);
    return `<!doctype html>
<html lang="${s.html}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${abs(p)}">
${LANGS.map(x => `<link rel="alternate" hreflang="${S[x].html}" href="${abs(altMap[x])}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${abs(altMap.en)}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="Mafia Pro">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${abs(p)}">
<meta property="og:image" content="${esc(ogImg)}">
<meta property="og:locale" content="${s.og}">
${LANGS.filter(x => x !== l).map(x => `<meta property="og:locale:alternate" content="${S[x].og}">`).join('\n')}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b0a0e">
${verify && p === `${l}/` ? `<meta name="google-site-verification" content="${esc(verify)}">\n` : ''}<link rel="icon" href="${BASE}favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;800&family=Manrope:wght@400;600;700&family=Noto+Sans+Armenian:wght@400;700&display=swap">
<style>${CSS}</style>
${ld.map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
<header class="top"><div class="wrap row">
  <a class="brand" href="${href(`${l}/`)}">Mafia&nbsp;<b>Pro</b></a>
  <nav class="nav">${nav.slice(1).map(([k, u]) => `<a href="${href(u)}"${u === p ? ' aria-current="page"' : ''}>${esc(s.nav[k])}</a>`).join('')}</nav>
  <a class="btn sm" href="${tg(l)}">${esc(s.nav.play)}</a>
</div></header>
<main class="wrap">
${bc.length ? `<nav class="crumbs" aria-label="breadcrumbs">${bc.map(([n, u], i) => i < bc.length - 1 ? `<a href="${href(u)}">${esc(n)}</a>` : `<span>${esc(n)}</span>`).join(' / ')}</nav>` : ''}
<h1>${esc(h1)}</h1>
${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
${body}
<section class="cta"><a class="btn" href="${tg(l)}">${esc(s.ctaTg)}</a><a class="btn ghost" href="${href('')}">${esc(s.ctaWeb)}</a></section>
</main>
<footer class="foot"><div class="wrap">
  <nav class="langs">${LANGS.map(x => x === l ? `<span>${esc(S[x].native)}</span>` : `<a href="${href(altMap[x])}" hreflang="${S[x].html}" lang="${S[x].html}">${esc(S[x].native)}</a>`).join('')}</nav>
  <p>${esc(s.footer)} · <a href="https://t.me/${BOT}">@${esc(BOT)}</a> · <a href="https://t.me/mafiaprof">t.me/mafiaprof</a></p>
</div></footer>
</body>
</html>
`;
  }

  /* ---------- pieces ---------- */
  const teamName = (L, team) => (L.teams && L.teams[team]) || team;
  const access = (l, app, r) => { const s = S[l].role; const pk = app.PACKS.diplomacy; return pk.roles.includes(r.id) ? s.pack((app.L.ui && app.L.ui.packTitle) || 'Diplomacy') : r.premium ? s.premium : s.free; };
  const roleTile = (l, app, r) => { const tr = app.L.roles[r.id] || {}; return `<a class="tile t-${r.team}" href="${href(`${l}/roles/${r.id}/`)}"><img src="${thumb(l, r.id)}" alt="${esc(tr.name)}" width="64" height="64" loading="lazy" decoding="async" onerror="this.remove()"><span><b>${esc(tr.name || r.id)}</b><small>${esc(tr.kind || '')}</small><em>${esc(tr.short || '')}</em></span></a>`; };
  const rolesByTeam = (l, app, limit) => TEAM_ORDER.map(teams => {
    const t = T[l].intro[TEAM_KEY[teams[0]]]; const rs = app.ROLES.filter(r => teams.includes(r.team)).sort((a, b) => (a.premium ? 1 : 0) - (b.premium ? 1 : 0));
    return `<section><h2>${esc(noEmoji(t[0]))}</h2><p>${esc(t[1])}</p><div class="tiles">${(limit ? rs.slice(0, limit) : rs).map(r => roleTile(l, app, r)).join('')}</div></section>`;
  }).join('\n');
  const comp = (app, ids) => { const c = {}; ids.forEach(id => { c[id] = (c[id] || 0) + 1; }); return Object.entries(c).map(([id, n]) => esc((app.L.roles[id] || {}).name || id) + (n > 1 ? ` ×${n}` : '')).join(', '); };
  const compLinks = (l, app, ids) => { const c = {}; ids.forEach(id => { c[id] = (c[id] || 0) + 1; }); return Object.entries(c).map(([id, n]) => `<a href="${href(`${l}/roles/${id}/`)}">${esc((app.L.roles[id] || {}).name || id)}</a>${n > 1 ? ` ×${n}` : ''}`).join(', '); };

  for (const l of LANGS) {
    const app = apps[l]; const s = S[l]; const t = T[l]; const L = app.L; const ui = L.ui || {};
    const ch = () => 'Discord';
    const stars = { role: STARS.role, scenario: STARS.scenario, pack: STARS.pack, packName: ui.packTitle || 'Diplomacy' };

    /* landing */
    const app_ld = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Mafia Pro', alternateName: s.home.h1, applicationCategory: 'GameApplication', applicationSubCategory: 'Party game', operatingSystem: 'Telegram, Web', url: abs(`${l}/`), installUrl: `https://t.me/${BOT}`, description: s.home.desc, inLanguage: LANGS.map(x => S[x].html), image: abs(`og/${l}.png`), offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@type': 'Organization', name: 'Mafia Pro', url: SITE, sameAs: [`https://t.me/${BOT}`, 'https://t.me/mafiaprof'] } };
    const site_ld = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Mafia Pro', url: abs(`${l}/`), inLanguage: s.html };
    const faq_ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: s.home.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
    const howtoFields = t.howto.fields(ch).filter((x, i) => i !== 3).map(([n, v]) => [noEmoji(n), typeof v === 'function' ? v(stars) : v]);
    write(`${l}/index.html`, page({ l, p: `${l}/`, title: s.home.title, desc: s.home.desc, h1: s.home.h1, lead: s.home.lead, ld: [site_ld, app_ld, faq_ld], body: `
<section class="cta top-cta"><a class="btn" href="${tg(l)}">${esc(s.ctaTg)}</a><a class="btn ghost" href="${href('')}">${esc(s.ctaWeb)}</a></section>
<section><h2>${esc(s.home.featuresH)}</h2><div class="grid">${s.home.features.map(([h, x]) => `<div class="box"><h3>${esc(h)}</h3><p>${esc(x)}</p></div>`).join('')}</div></section>
<section><h2>${esc(noEmoji(t.howGame[0]))}</h2>${t.howGame[1].map(x => `<p>${md(x)}</p>`).join('')}<p><a class="more" href="${href(`${l}/rules/`)}">${esc(s.home.rulesLink)} →</a></p></section>
<section><h2>${esc(s.home.formatsH)}</h2><div class="grid">${howtoFields.map(([h, x]) => `<div class="box"><h3>${esc(h)}</h3><p>${md(x)}</p></div>`).join('')}</div></section>
<section><h2>${esc(s.home.rolesH)}</h2><p>${esc(s.home.rolesLead)}</p><div class="tiles">${['don', 'sheriff', 'doctor', 'maniac', 'werewolf', 'mayor', 'kamikaze', 'jester'].map(id => app.ROLES.find(r => r.id === id)).filter(Boolean).map(r => roleTile(l, app, r)).join('')}</div><p><a class="more" href="${href(`${l}/roles/`)}">${esc(s.home.allRoles)} (${app.ROLES.length}) →</a> · <a class="more" href="${href(`${l}/scenarios/`)}">${esc(s.home.scenLink)} →</a></p></section>
<section><h2>${esc(s.home.faqH)}</h2>${s.home.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>` }));

    /* all roles */
    const list_ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: s.roles.h1, numberOfItems: app.ROLES.length, itemListElement: app.ROLES.map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`${l}/roles/${r.id}/`), name: (L.roles[r.id] || {}).name || r.id })) };
    write(`${l}/roles/index.html`, page({ l, p: `${l}/roles/`, title: s.roles.title, desc: s.roles.desc, h1: s.roles.h1, lead: s.roles.lead, ld: [list_ld], crumbs: [[s.nav.roles, `${l}/roles/`]], body: rolesByTeam(l, app) }));

    /* one page per role */
    for (const r of app.ROLES) {
      const tr = L.roles[r.id] || {}; const name = tr.name || r.id; const rs = s.role;
      const mates = app.ROLES.filter(x => x.id !== r.id && TEAM_KEY[x.team] === TEAM_KEY[r.team]).slice(0, 12);
      const desc = cut(rs.desc(name, tr.short || ''), 160);
      const art_ld = { '@context': 'https://schema.org', '@type': 'Article', headline: rs.h1(name), description: desc, inLanguage: s.html, image: abs(`cards/${l}/${r.id}.png`), mainEntityOfPage: abs(`${l}/roles/${r.id}/`), author: { '@type': 'Organization', name: 'Mafia Pro' }, publisher: { '@type': 'Organization', name: 'Mafia Pro' }, about: { '@type': 'Thing', name } };
      write(`${l}/roles/${r.id}/index.html`, page({ l, p: `${l}/roles/${r.id}/`, title: rs.title(name), desc, h1: rs.h1(name), lead: tr.short, image: abs(`cards/${l}/${r.id}.png`), ogType: 'article', ld: [art_ld], crumbs: [[s.nav.roles, `${l}/roles/`], [name, `${l}/roles/${r.id}/`]], body: `
<div class="role t-${r.team}">
  <img class="cardimg" src="${card(l, r.id)}" alt="${esc(name)}" width="340" height="510" decoding="async" onerror="this.remove()">
  <div>
    <dl class="facts"><dt>${esc(rs.team)}</dt><dd>${esc(teamName(L, r.team))}</dd>${r.color && L.colors && L.colors[r.color] ? `<dt>${esc(rs.checks)}</dt><dd>${esc(L.colors[r.color])}</dd>` : ''}${tr.kind ? `<dt>${esc(rs.kind)}</dt><dd>${esc(tr.kind)}</dd>` : ''}<dt>${esc(rs.access)}</dt><dd>${esc(access(l, app, r))}</dd></dl>
    ${(tr.rules || []).length ? `<h2>${esc(rs.how)}</h2><ul>${tr.rules.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${tr.tip ? `<h2>${esc(rs.tip)}</h2><p>${esc(tr.tip)}</p>` : ''}
    ${tr.lore ? `<h2>${esc(rs.story)}</h2><p class="lore">${esc(tr.lore)}</p>` : ''}
  </div>
</div>
<section><h2>${esc(rs.related)}</h2><p class="chips">${mates.map(x => `<a href="${href(`${l}/roles/${x.id}/`)}">${esc((L.roles[x.id] || {}).name || x.id)}</a>`).join('')}</p><p><a class="more" href="${href(`${l}/roles/`)}">← ${esc(rs.back)}</a></p></section>` }));
    }

    /* rules */
    const rulesBody = `
<section><h2>${esc(noEmoji(t.howGame[0]))}</h2>${t.howGame[1].map(x => `<p>${md(x)}</p>`).join('')}</section>
<section><h2>${esc(app.CLASSIC.name)} — ${esc(t.sport)}</h2><p>${esc(app.CLASSIC.lore)}</p><ul>${(ui.classicRules || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul><p>${esc(s.scen.special)}: ${compLinks(l, app, app.CLASSIC.comp)}</p></section>
<section><h2>${esc(noEmoji(t.online[0]))}</h2><p>${esc(ui.onOnlineD || '')}</p><p>${md(t.online[1])}</p></section>
<section><h2>${esc(noEmoji(t.openClosed))}</h2><p><strong>${esc(ui.openGame || '')}.</strong> ${esc(ui.openGameHint || '')}</p><p><strong>${esc(ui.closedGame || '')}.</strong> ${esc(ui.closedGameHint || '')}</p></section>
<section><h2>${esc(noEmoji(t.points[0]))}</h2><p>${md(t.points[1](ch('results')))}</p></section>
<p><a class="more" href="${href(`${l}/roles/`)}">${esc(s.home.allRoles)} →</a> · <a class="more" href="${href(`${l}/scenarios/`)}">${esc(s.home.scenLink)} →</a></p>`;
    write(`${l}/rules/index.html`, page({ l, p: `${l}/rules/`, title: s.rules.title, desc: s.rules.desc, h1: s.rules.h1, lead: s.rules.lead, ogType: 'article', crumbs: [[s.nav.rules, `${l}/rules/`]], ld: [{ '@context': 'https://schema.org', '@type': 'Article', headline: s.rules.h1, description: s.rules.desc, inLanguage: s.html, mainEntityOfPage: abs(`${l}/rules/`), author: { '@type': 'Organization', name: 'Mafia Pro' }, publisher: { '@type': 'Organization', name: 'Mafia Pro' } }], body: rulesBody }));

    /* setups by number of players and scenarios */
    const counts = []; for (let n = app.MIN_PLAYERS; n <= app.MAX_PLAYERS; n++) counts.push(n);
    const scenBody = `
<section><h2>${esc(s.scen.byN)}</h2><p>${esc(t.roleGameD)}</p>
<table class="comp"><tbody>${counts.map(n => `<tr id="n${n}"><th>${esc(s.scen.players(n))}</th><td>${compLinks(l, app, app.presetFor(n))}</td></tr>`).join('')}</tbody></table></section>
<section><h2>${esc(s.scen.classicH)}: ${esc(app.CLASSIC.name)}</h2><p>${esc(app.CLASSIC.lore)}</p><p>${compLinks(l, app, app.CLASSIC.comp)}</p></section>
<section><h2>${esc(s.scen.scenH)}</h2>${app.SCENARIOS.map(sc => `<div class="box scen" id="${esc(sc.id)}"><h3>${esc(sc.name)}</h3><p>${esc(sc.lore)}</p><p><small>${esc(s.scen.special)}: ${compLinks(l, app, sc.roles)} · ${esc(s.scen.count)}: ${sc.min}–${sc.max}</small></p></div>`).join('')}</section>`;
    write(`${l}/scenarios/index.html`, page({ l, p: `${l}/scenarios/`, title: s.scen.title, desc: s.scen.desc, h1: s.scen.h1, lead: s.scen.lead, crumbs: [[s.nav.scenarios, `${l}/scenarios/`]], body: scenBody }));

    /* the picture for link previews (rendered to og/<lang>.png by seo/render-images.js) */
    write(`og/${l}.html`, `<!doctype html><html lang="${s.html}"><head><meta charset="utf-8"><meta name="robots" content="noindex"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@800&family=Manrope:wght@600&family=Noto+Sans+Armenian:wght@700&display=swap"><style>
html,body{margin:0;width:1200px;height:630px;background:#0b0a0e;color:#f1e9da;font-family:Manrope,'Noto Sans Armenian',sans-serif;overflow:hidden}
.bg{position:absolute;inset:0;background:radial-gradient(70% 90% at 15% 0%,rgba(216,169,76,.28),transparent 60%),radial-gradient(60% 80% at 100% 100%,rgba(199,66,58,.25),transparent 60%)}
.t{position:absolute;left:72px;top:96px;width:540px;z-index:3}.e{color:#d8a94c;font:800 26px Unbounded,'Noto Sans Armenian';letter-spacing:.06em;text-transform:uppercase}
h1{font:800 70px/1.05 Unbounded,'Noto Sans Armenian',sans-serif;margin:22px 0 26px}p{font-size:28px;line-height:1.35;color:#cfc5b4;margin:0}
.c{position:absolute;right:44px;top:110px;display:flex;gap:0}.c img{width:190px;height:285px;border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.6)}
.c img:nth-child(1){transform:rotate(-8deg) translate(40px,40px)}.c img:nth-child(2){transform:translateY(-6px);z-index:2}.c img:nth-child(3){transform:rotate(8deg) translate(-40px,40px)}
</style></head><body><div class="bg"></div><div class="t"><div class="e">Mafia Pro</div><h1>${esc(s.home.h1)}</h1><p>${esc(app.L.ui.heroTag || '')}</p></div>
<div class="c"><img src="../cards/${l}/don.png" alt=""><img src="../cards/${l}/sheriff.png" alt=""><img src="../cards/${l}/doctor.png" alt=""></div></body></html>`);
  }

  /* sitemap with hreflang alternates, robots */
  const today = new Date().toISOString().slice(0, 10);
  const prio = p => (/^[a-z]{2}\/$/.test(p) ? '1.0' : /roles\/$|rules\/$|scenarios\/$/.test(p) ? '0.8' : '0.6');
  const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
<url><loc>${SITE}</loc><lastmod>${today}</lastmod><priority>0.9</priority></url>
${pages.map(pg => `<url><loc>${abs(pg.path)}</loc><lastmod>${today}</lastmod><priority>${prio(pg.path)}</priority>${LANGS.map(x => `<xhtml:link rel="alternate" hreflang="${S[x].html}" href="${abs(pg.alt[x])}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${abs(pg.alt.en)}"/></url>`).join('\n')}
</urlset>
`;
  write('sitemap.xml', sm);
  const icon = path.join(ROOT, 'bot/media/avatar-512.png'); if (fs.existsSync(icon)) fs.copyFileSync(icon, path.join(outDir, 'favicon.png'));
  const ink = path.join(ROOT, 'seo/indexnow-key.txt'); if (fs.existsSync(ink)) { const k = fs.readFileSync(ink, 'utf8').trim(); write(k + '.txt', k); } // IndexNow key file (seo/indexnow.mjs)
  write('robots.txt', `User-agent: *\nAllow: /\nDisallow: ${BASE}og/\n\nSitemap: ${SITE}sitemap.xml\n`);
  return { pages: pages.length, site: SITE };
}

const CSS = `
:root{--bg:#0b0a0e;--bg2:#15121a;--bg3:#1e1a26;--line:#2b2634;--fg:#f1e9da;--fg2:#cfc5b4;--mut:#958b80;--gold:#d8a94c;--gold2:#f0cd7a;--red:#c7423a;--steel:#a7afc2;--violet:#9d6ce0;color-scheme:dark}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 Manrope,'Noto Sans Armenian',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(120% 60% at 50% -10%,rgba(216,169,76,.10),transparent 60%),radial-gradient(80% 50% at 50% 110%,rgba(199,66,58,.08),transparent 60%)}
a{color:var(--gold2)}a:hover{color:var(--gold)}
.wrap{max-width:960px;margin:0 auto;padding:0 16px;position:relative}
.top{position:sticky;top:0;z-index:5;background:rgba(11,10,14,.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.row{display:flex;align-items:center;gap:12px;min-height:56px}
.brand{font:800 17px Unbounded,'Noto Sans Armenian',sans-serif;color:var(--fg);text-decoration:none;white-space:nowrap}.brand b{color:var(--gold)}
.nav{display:flex;gap:14px;flex:1;overflow-x:auto;scrollbar-width:none}.nav::-webkit-scrollbar{display:none}
.nav a{color:var(--fg2);text-decoration:none;font-weight:600;font-size:15px;white-space:nowrap}.nav a[aria-current]{color:var(--gold2)}
h1,h2,h3{font-family:Unbounded,'Noto Sans Armenian',sans-serif;line-height:1.2;text-wrap:balance}
h1{font-size:clamp(28px,6vw,44px);margin:28px 0 12px}h2{font-size:clamp(20px,4vw,26px);margin:40px 0 12px}h3{font-size:16px;margin:0 0 6px}
.lead{font-size:18px;color:var(--fg2);max-width:720px}
p,li{color:var(--fg2)}ul{padding-left:20px}li{margin:6px 0}strong{color:var(--fg)}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 22px;border-radius:14px;background:linear-gradient(180deg,var(--gold2),var(--gold));color:#1a1408;font-weight:800;text-decoration:none;white-space:nowrap}
.btn:hover{color:#1a1408;filter:brightness(1.06)}.btn.ghost{background:transparent;color:var(--fg);border:1px solid var(--line)}.btn.sm{min-height:36px;padding:0 14px;border-radius:10px;font-size:14px}
.cta{display:flex;flex-wrap:wrap;gap:12px;margin:36px 0}.top-cta{margin:20px 0 8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.box{background:var(--bg2);border:1px solid var(--line);border-radius:16px;padding:16px}.box p{margin:0}.scen{margin:12px 0}.scen p+p{margin-top:8px}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
.tile{display:flex;gap:12px;align-items:flex-start;background:var(--bg2);border:1px solid var(--line);border-left:3px solid var(--mut);border-radius:14px;padding:10px;text-decoration:none;color:var(--fg)}
.tile:hover{border-color:var(--gold);color:var(--fg)}.tile img{width:64px;height:64px;border-radius:12px;object-fit:cover;flex:none;background:var(--bg3)}
.tile span{display:flex;flex-direction:column;gap:2px;min-width:0}.tile small{color:var(--mut);font-size:13px}.tile em{font-style:normal;color:var(--fg2);font-size:14px;line-height:1.4}
.t-black{border-left-color:var(--red)}.t-red{border-left-color:var(--gold)}.t-neutral{border-left-color:var(--steel)}.t-ww{border-left-color:var(--violet)}
.role{display:grid;grid-template-columns:minmax(0,320px) 1fr;gap:28px;align-items:start;margin-top:12px}
.cardimg{width:100%;height:auto;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.5)}
.facts{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:0 0 8px;background:var(--bg2);border:1px solid var(--line);border-radius:14px;padding:14px}
.facts dt{color:var(--mut)}.facts dd{margin:0;color:var(--fg);font-weight:600}.role h2{margin-top:24px}.lore{font-style:italic}
.chips{display:flex;flex-wrap:wrap;gap:8px}.chips a{padding:6px 12px;border:1px solid var(--line);border-radius:999px;text-decoration:none;background:var(--bg2)}
.crumbs{margin-top:18px;font-size:14px;color:var(--mut)}.crumbs a{color:var(--fg2)}
.more{font-weight:700}
.comp{width:100%;border-collapse:collapse}.comp th{text-align:left;white-space:nowrap;padding:10px 14px 10px 0;color:var(--fg);vertical-align:top}.comp td{padding:10px 0;color:var(--fg2)}.comp tr{border-bottom:1px solid var(--line)}
details{background:var(--bg2);border:1px solid var(--line);border-radius:14px;padding:12px 16px;margin:8px 0}summary{cursor:pointer;font-weight:700;color:var(--fg)}details p{margin:8px 0 0}
.foot{border-top:1px solid var(--line);margin-top:24px;padding:20px 0 36px;font-size:14px}.foot p{color:var(--mut)}
.langs{display:flex;flex-wrap:wrap;gap:14px}.langs span{color:var(--fg);font-weight:700}
@media (max-width:640px){.role{grid-template-columns:1fr}.cardimg{max-width:300px;display:block;margin:0 auto}.nav{gap:12px}.nav a{font-size:14px}.brand{font-size:15px}.comp th{white-space:normal;width:34%}}
`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = path.resolve(process.argv[2] || path.join(ROOT, '_site'));
  const r = build(out);
  console.log(`seo: ${r.pages} pages + sitemap.xml + robots.txt → ${out} (${r.site})`);
}
