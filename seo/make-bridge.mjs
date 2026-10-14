#!/usr/bin/env node
/* v40 — what GitHub Pages serves after the move to the own domain: the old address becomes a bridge.
   node seo/make-bridge.mjs <built site = _site> <out = _gh> <new address = seo/site-url.txt>
   - index.html and 404.html: seo/bridge.html (any old link → the same place at the new address; the root also carries the
     player's saved data, see seo/app-migrate.js)
   - every website page: the same bridge with its own canonical and meta refresh, so search engines move the page to the new address
   - card images and link previews stay: old Discord embeds and posts keep their pictures */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [src = '_site', out = '_gh', arg] = process.argv.slice(2);
const NEW = String(arg || fs.readFileSync(path.join(ROOT, 'seo/site-url.txt'), 'utf8')).trim().replace(/\/?$/, '/');
const tpl = fs.readFileSync(path.join(ROOT, 'seo/bridge.html'), 'utf8');
// the app's own address: the redirect is the script (it carries the saved data); a meta refresh there could cut it short.
// website pages: a plain meta refresh too, so crawlers without JavaScript move the page as well
const page = (target, app) => tpl.split('__REFRESH__').join(app ? '<noscript><meta http-equiv="refresh" content="0;url=__TARGET__"></noscript>' : '<meta http-equiv="refresh" content="0;url=__TARGET__">').split('__NEW__').join(NEW).split('__TARGET__').join(target);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), page(NEW, true));
fs.writeFileSync(path.join(out, '404.html'), page(NEW, true));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
let n = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name); const rel = path.relative(src, p).split(path.sep).join('/');
    if (f.isDirectory()) { if (/^(cards|og)$/.test(rel)) fs.cpSync(p, path.join(out, rel), { recursive: true }); else walk(p); continue; }
    if (f.name === 'index.html' && d !== path.resolve(src) && path.resolve(d) !== path.resolve(src)) { fs.mkdirSync(path.join(out, path.dirname(rel)), { recursive: true }); fs.writeFileSync(path.join(out, rel), page(NEW + rel.replace(/index\.html$/, ''))); n++; }
    else if (rel === 'favicon.png') fs.copyFileSync(p, path.join(out, rel));
  }
})(path.resolve(src));
console.log(`bridge: ${n} pages + the app → ${NEW} (${out})`);
