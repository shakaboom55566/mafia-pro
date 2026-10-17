// v79: the channel video of a skin's own back — the app's 3D card turns from its face to its back and sways, so the back's
// depth (skins/tools/depth_layers.py) shows.
// usage: NODE_PATH=$(npm root -g) node skins/tools/back-video.js <mafia-pro.html> <skins dir> <frames dir> [skin id] [copy number]
// then:  ffmpeg -framerate 30 -i <frames>/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 21 -movflags +faststart -an skins/<id>-back.mp4
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const [html, skins, out, id = 'untouchable', serial = '1'] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 480, height: 854 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://mafiapro.app/skins/*', r => {
    const f = path.join(skins, path.basename(new URL(r.request().url()).pathname)); if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': f.endsWith('.png') ? 'image/png' : 'image/webp' }, body: fs.readFileSync(f) });
  });
  await p.goto('file://' + path.resolve(html)); await p.waitForTimeout(800);
  await p.evaluate(({ id, serial }) => {
    document.documentElement.classList.remove('lite'); MYTH.manual = true; MYTH.tabAt = 1; S.ui.sheet = null;
    const s = SKIN[id]; const stage = document.createElement('div'); stage.id = 'vstage';
    stage.style.cssText = 'position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:radial-gradient(60% 46% at 50% 47%, rgba(200,30,50,.42), rgba(200,30,50,0) 70%), radial-gradient(120% 80% at 50% 20%, #3a0d16 0%, #0c0508 68%)';
    stage.innerHTML = `<div style="width:300px">${card3dFor(ROLE[s.role], 'vid', id, true, Number(serial))}</div>`;
    document.body.appendChild(stage); const st = c3state('vid'); st.ry = -16; st.rx = 5; st.idle = Date.now() + 1e9; card3dInit();
  }, { id, serial });
  await p.waitForTimeout(2500);
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const poses = []; // [ry, rx] per frame, 30 fps
  for (let i = 0; i < 24; i++) poses.push([-16 + Math.sin(i / 23 * Math.PI) * 4, 5]); // 0.8 s: the face
  for (let i = 0; i < 36; i++) poses.push([-16 + 196 * ease(i / 35), 5 - 3 * ease(i / 35)]); // 1.2 s: it turns over
  for (let i = 0; i < 120; i++) { const q = i / 119; poses.push([180 + Math.sin(q * Math.PI * 2) * 24 * (1 - q * 0.35), 2 + Math.sin(q * Math.PI * 4) * 4]); } // 4 s: the back sways
  let n = 0;
  for (const [ry, rx] of poses) {
    await p.evaluate(([ry, rx]) => { const st = c3state('vid'); st.ry = ry; st.rx = rx; st.idle = Date.now() + 1e9; card3dApply(document.querySelector('.card3d-wrap[data-key="vid"]')); }, [ry, rx]);
    await p.waitForTimeout(70); await p.screenshot({ path: path.join(out, `f${String(n++).padStart(4, '0')}.png`) });
  }
  console.log(JSON.stringify({ frames: n, errs })); await b.close();
})();
