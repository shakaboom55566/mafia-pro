/* Pictures for the public website (v38), after discord/render-cards.js and seo/build-site.mjs:
   - cards/<lang>/t/<id>.jpg — square thumbnails of the card art (120×120 at 2×) for the role lists, so a list of 55 cards stays light on a phone
   - cards/<lang>/w/<id>.webp — the full card as WebP for the role page (the PNG is the fallback and the share image)
   - og/<lang>.png — the 1200×630 link preview of each language (from og/<lang>.html, written by build-site.mjs)
   Run: node seo/render-images.js <site dir = _site> */
const path = require('path'); const fs = require('fs');
const { chromium } = require('playwright');
const LANGS = ['ru', 'uk', 'en', 'pl', 'hy'];
(async () => {
  const site = path.resolve(process.argv[2] || '_site');
  const b = await chromium.launch();
  let thumbs = 0, webps = 0, og = 0;
  const p = await b.newPage({ viewport: { width: 120, height: 120 }, deviceScaleFactor: 2 });
  for (const l of LANGS) {
    const dir = path.join(site, 'cards', l); if (!fs.existsSync(dir)) continue;
    fs.mkdirSync(path.join(dir, 't'), { recursive: true });
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.png'))) {
      const src = 'data:image/png;base64,' + fs.readFileSync(path.join(dir, f)).toString('base64');
      await p.setContent(`<html><body style="margin:0;background:#15121a"><img src="${src}" style="display:block;width:216px;margin:-32px 0 0 -48px"></body></html>`);
      await p.waitForFunction(() => document.images[0] && document.images[0].complete);
      await p.screenshot({ path: path.join(dir, 't', f.replace(/\.png$/, '.jpg')), type: 'jpeg', quality: 80 }); thumbs++;
      // cards/<lang>/w/<id>.webp — the same card as a light WebP for the role page (LCP: ~25 KB instead of ~180 KB)
      const webp = await p.evaluate(() => { const i = document.images[0]; const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0); return c.toDataURL('image/webp', 0.8); });
      if (webp.startsWith('data:image/webp')) { fs.mkdirSync(path.join(dir, 'w'), { recursive: true }); fs.writeFileSync(path.join(dir, 'w', f.replace(/\.png$/, '.webp')), Buffer.from(webp.split(',')[1], 'base64')); webps++; }
    }
  }
  const q = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const l of LANGS) {
    const f = path.join(site, 'og', l + '.html'); if (!fs.existsSync(f)) continue;
    await q.goto('file://' + f); try { await q.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {} await q.waitForTimeout(300);
    await q.screenshot({ path: path.join(site, 'og', l + '.png') }); og++;
  }
  await b.close();
  console.log(`site images: ${thumbs} thumbnails, ${webps} role-page cards (webp), ${og} link previews`);
})().catch(e => { console.error(e); process.exit(1); });
