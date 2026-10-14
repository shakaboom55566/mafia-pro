#!/usr/bin/env node
/* Checks the public website (seo/build-site.mjs) without a browser: every page has a unique title and description, a canonical,
   hreflang for all five languages + x-default that point at pages that exist, valid JSON-LD, internal links that resolve,
   and the sitemap lists every page. Run: node seo/test-site.mjs */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, LANGS, DEFAULT_SITE } from './build-site.mjs';

let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('✗ ' + m); } };
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-site-'));
const r = build(out, { SITE_URL: DEFAULT_SITE });
const BASE = new URL(DEFAULT_SITE).pathname;
const files = []; (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name === 'index.html') files.push(p); } })(out);
ok(files.length === r.pages && r.pages === LANGS.length * (5 + 55), `pages: ${files.length} / ${r.pages}`);
const exists = u => { // a site URL or a root-relative path → a file in the build (the app root and images are made by other steps)
  let p = u.startsWith(DEFAULT_SITE) ? u.slice(DEFAULT_SITE.length) : u.startsWith(BASE) ? u.slice(BASE.length) : null; if (p === null) return true;
  p = p.split('#')[0]; if (p === '' || /^(cards|og)\/|favicon\.png$/.test(p)) return true;
  return fs.existsSync(path.join(out, p, p.endsWith('/') ? 'index.html' : ''));
};
const titles = new Map(), descs = new Map();
for (const f of files) {
  const h = fs.readFileSync(f, 'utf8'); const rel = path.relative(out, f);
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1]; const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  ok(title && title.length >= 15, rel + ': title'); ok(desc && desc.length >= 50, rel + ': description');
  ok(!titles.has(title), `${rel}: duplicate title with ${titles.get(title)}`); titles.set(title, rel);
  ok(!descs.has(desc), `${rel}: duplicate description with ${descs.get(desc)}`); descs.set(desc, rel);
  const canon = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1]; ok(canon === DEFAULT_SITE + rel.replace(/index\.html$/, ''), rel + ': canonical ' + canon);
  const alts = [...h.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)]; ok(alts.length === 6 && alts.some(a => a[1] === 'x-default'), rel + ': hreflang');
  alts.forEach(a => ok(exists(a[2]), `${rel}: hreflang ${a[1]} → missing ${a[2]}`));
  ok((h.match(/<h1>/g) || []).length === 1, rel + ': one h1');
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); pass++; } catch (e) { ok(false, rel + ': JSON-LD ' + e.message); } }
  for (const m of h.matchAll(/href="([^"]+)"/g)) if (m[1].startsWith('/')) ok(exists(m[1]), `${rel}: broken link ${m[1]}`);
  ok(!/undefined|\[object |NaN/.test(h.replace(/<script[\s\S]*?<\/script>/g, '')), rel + ': undefined / object in the text');
}
const sm = fs.readFileSync(path.join(out, 'sitemap.xml'), 'utf8');
ok((sm.match(/<url>/g) || []).length === r.pages + 1, 'sitemap lists every page + the app');
ok(fs.readFileSync(path.join(out, 'robots.txt'), 'utf8').includes('Sitemap: ' + DEFAULT_SITE + 'sitemap.xml'), 'robots.txt points at the sitemap');
for (const l of LANGS) { const h = fs.readFileSync(path.join(out, l, 'privacy/index.html'), 'utf8'); ok(h.includes('/mydata') && h.includes('/deletedata') && h.includes('/support') && (h.match(/<h2>/g) || []).length >= 11, l + ': privacy policy with the bot commands and all sections'); ok(fs.readFileSync(path.join(out, l, 'index.html'), 'utf8').includes(`${BASE}${l}/privacy/`), l + ': footer links the policy'); }
const ovr = path.join(os.tmpdir(), 'mp-ovr.json'); fs.writeFileSync(ovr, JSON.stringify({ 'ru/roles/don/': { title: 'Дон мафии: как играть за главу семьи | Mafia Pro', intro: 'Проверочный абзац.', faq: [['Кто такой Дон?', 'Глава мафии.']] }, 'en/': { faq: [['Extra?', 'Yes.']] } }));
const od = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-site-')); build(od, { SITE_URL: DEFAULT_SITE, SEO_OVERRIDES: ovr });
{ const h = fs.readFileSync(path.join(od, 'ru/roles/don/index.html'), 'utf8'); ok(h.includes('<title>Дон мафии: как играть за главу семьи | Mafia Pro</title>') && h.includes('<p>Проверочный абзац.</p>') && /"@type":"FAQPage"/.test(h) && h.includes('<summary>Кто такой Дон?</summary>'), 'override: title, intro, FAQ on a role page'); }
{ const h = fs.readFileSync(path.join(od, 'en/index.html'), 'utf8'); const faq = JSON.parse(h.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema.org","@type":"FAQPage"[\s\S]*?)<\/script>/)[1]); ok(faq.mainEntity.length === 7 && (h.match(/"@type":"FAQPage"/g) || []).length === 1, 'override FAQ merges into the landing FAQ'); }
const own = build(fs.mkdtempSync(path.join(os.tmpdir(), 'mp-site-')), { SITE_URL: 'https://mafiapro.example/' });
ok(own.site === 'https://mafiapro.example/', 'an own domain works (SITE_URL)');
fs.rmSync(out, { recursive: true, force: true });
console.log(`seo site: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
