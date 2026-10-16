// The channel video of a living (Mythic) skin: the app's own card and show (src/17-mythic.js), drawn frame by frame.
// usage: NODE_PATH=$(npm root -g) node skins/tools/myth-video.js <mafia-pro.html> <skins dir> <frames dir> [skin id] [copy number]
// then:  ffmpeg -framerate 30 -i <frames>/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 21 -movflags +faststart -an skins/<id>.mp4
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const [html, skins, out, id = 'untouchable', serial = '1'] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 480, height: 854 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://mafiapro.app/skins/*', r => { const f = path.join(skins, path.basename(new URL(r.request().url()).pathname)); if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': f.endsWith('.png') ? 'image/png' : 'image/webp' }, body: fs.readFileSync(f) }); });
  await p.goto('file://' + path.resolve(html)); await p.waitForTimeout(800);
  await p.evaluate(({ id, serial }) => {
    document.documentElement.classList.remove('lite'); MYTH.manual = true; MYTH.tabAt = 1; S.ui.sheet = null;
    const s = SKIN[id]; const stage = document.createElement('div'); stage.id = 'vstage';
    stage.style.cssText = 'position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:radial-gradient(60% 46% at 50% 47%, rgba(200,30,50,.42), rgba(200,30,50,0) 70%), radial-gradient(120% 80% at 50% 20%, #3a0d16 0%, #0c0508 68%)';
    stage.innerHTML = `<div style="width:300px">${card3dFor(ROLE[s.role], 'vid', id, true, Number(serial))}</div>`;
    document.body.appendChild(stage); const st = c3state('vid'); st.ry = -24; st.rx = 6; st.idle = Date.now() + 1e9; card3dInit();
  }, { id, serial });
  await p.waitForTimeout(2500);
  let n = 0; const shot = async () => { await p.waitForTimeout(40); await p.screenshot({ path: path.join(out, `f${String(n++).padStart(4, '0')}.png`) }); };
  // 1 s: the card swings face up
  for (let i = 0; i < 30; i++) { await p.evaluate(i => { const st = c3state('vid'); const q = i / 29; st.ry = -24 * (1 - q) + Math.sin(q * Math.PI) * 8; st.rx = 6 * (1 - q); st.idle = Date.now() + 1e9; card3dApply(document.querySelector('.card3d-wrap[data-key="vid"]')); }, i); await shot(); }
  // the show
  await p.evaluate(() => { mythPlay(document.querySelector('.card3d-wrap[data-key="vid"] .skin-layer'), true); });
  await p.waitForFunction(() => MYTH.run && MYTH.run.clock, null, { timeout: 15000 });
  const dur = await p.evaluate(() => MYTH.run.clock.dur);
  for (let t = 0; t <= dur; t += 1000 / 30) { await p.evaluate(t => mythSeek(t), t); await shot(); }
  // 0.7 s: the card back in place, a slow turn
  await p.evaluate(() => { const R = MYTH.run; MYTH.run = null; if (R && R.fx) R.fx.remove(); const l = document.querySelector('.card3d-wrap[data-key="vid"] .skin-layer'); if (l) { l.classList.remove('myth-on'); } });
  for (let i = 0; i < 21; i++) { await p.evaluate(i => { const st = c3state('vid'); st.ry = -i * 0.9; st.idle = Date.now() + 1e9; card3dApply(document.querySelector('.card3d-wrap[data-key="vid"]')); }, i); await shot(); }
  console.log(JSON.stringify({ frames: n, dur, errs })); await b.close();
})();
