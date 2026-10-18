// v84: the channel video of a table skin — the table in a room, every seat taken, the glare and the lean sweeping round once (5 s)
// usage: NODE_PATH=$(npm root -g) node skins/tools/table-video.js mafia-pro.html skins <frames dir>
// then:  ffmpeg -framerate 30 -i <frames>/f%04d.png -vf scale=720:-2 -c:v libx264 -pix_fmt yuv420p -crf 22 -movflags +faststart -an skins/table-don.mp4
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const [html, skins, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 480, height: 600 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://mafiapro.app/skins/*', r => { const f = path.join(skins, path.basename(new URL(r.request().url()).pathname)); if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': f.endsWith('.png') ? 'image/png' : 'image/webp' }, body: fs.readFileSync(f) }); });
  await p.goto('file://' + path.resolve(html)); await p.waitForTimeout(600);
  await p.evaluate(() => {
    document.documentElement.classList.remove('lite'); setLang('ru'); S.skins = { owned: ['don_table', 'castelmar_club'], equipped: {} };
    const names = ['Mikael', 'Нина', 'Олена', 'Артём', 'Mykola', 'Ваня', 'Oksana', 'Давид', 'Kasia', 'Ani'];
    const seats = names.map((nm, i) => ({ seat: i + 1, name: nm, alive: true })); const marks = { 1: { joined: true }, 2: { joined: true }, 3: { joined: true }, 4: { joined: true } };
    const center = `<div class="rt-brand">Mafia <em>PRO</em></div><div class="rt-host">Mikael</div><div class="rt-n">${tt(U().tbPlayersN, { n: '10 / 10' })}</div>`;
    const st = document.createElement('div'); st.id = 'vstage'; st.style.cssText = 'position:fixed;inset:0;z-index:80;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:14px'; document.body.appendChild(st);
    st.innerHTML = `<div style="width:452px">${roundTableHTML(seats, {}, center, marks, 'castelmar_club', 'don_table')}</div>`;
  });
  await p.waitForTimeout(2500);
  let n = 0; const N = 150; // 5 s at 30 fps: one slow sweep round
  for (let i = 0; i < N; i++) {
    await p.evaluate(i => { const q = i / 150 * Math.PI * 2; const tx = Math.sin(q) * 0.9, ty = -Math.cos(q) * 0.7; TSL.fixed = [tx, ty]; RMGL.fixed = [tx, ty]; }, i);
    await p.waitForTimeout(45); await p.screenshot({ path: path.join(out, `f${String(n++).padStart(4, '0')}.png`) });
  }
  console.log(JSON.stringify({ frames: n, errs })); await b.close();
})();
