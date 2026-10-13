/* Renders every role card (the app's own card face: art, name, type, rule, lore) to an image for the Discord library.
   Run after build.sh: node discord/render-cards.js <out dir> [app html] [lang=ru]  — the Pages workflow writes them to _site/cards/<id>.png,
   so the bot can show them as https://<pages>/cards/<id>.png?v=<hash>. */
const path = require('path'); const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const out = path.resolve(process.argv[2] || '_site/cards'); const html = path.resolve(process.argv[3] || path.join(__dirname, '..', 'mafia-pro.html'));
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 420, height: 700 }, deviceScaleFactor: 1.5 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + html); await p.waitForTimeout(600);
  try { await p.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {}
  const ids = await p.evaluate(lang => { setLang(lang); document.documentElement.classList.remove('lite'); document.documentElement.classList.add('still'); return ROLES.map(r => r.id); }, process.argv[4] || 'ru');
  await p.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; } body { background: transparent !important; } #shot { position: fixed; left: 0; top: 0; padding: 10px; background: transparent; } #shot .flip { width: 340px; transform: none !important; } #shot .face { visibility: visible !important; transform: none !important; }' });
  let n = 0;
  for (const id of ids) {
    await p.evaluate(id => { let s = document.getElementById('shot'); if (!s) { s = document.createElement('div'); s.id = 'shot'; document.body.appendChild(s); } document.getElementById('app').style.visibility = 'hidden'; s.innerHTML = `<div class="flip open" style="aspect-ratio:3/4.5"><div class="face front" style="position:absolute;inset:0">${cardHTML(ROLE[id])}</div></div>`; }, id);
    await p.waitForTimeout(40);
    const el = await p.$('#shot .flip'); await el.screenshot({ path: path.join(out, id + '.png'), omitBackground: true }); n++;
  }
  await b.close();
  if (errs.length) { console.error('page errors: ' + errs.join(' | ')); process.exit(1); }
  console.log(`cards: ${n} images → ${out}`);
})().catch(e => { console.error(e); process.exit(1); });
