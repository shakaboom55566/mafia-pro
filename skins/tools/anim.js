const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const [dir, out, n] = [process.argv[2], process.argv[3], +process.argv[4] || 144];
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 720, height: 900 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.route('https://anim.local/**', r => { const f = path.join(dir, path.basename(new URL(r.request().url()).pathname) || 'render.html'); const ct = f.endsWith('.html') ? 'text/html' : f.endsWith('.png') ? 'image/png' : 'image/webp'; r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': ct }, body: fs.readFileSync(f) }); });
  await p.goto('https://anim.local/render.html'); await p.evaluate(() => window.ready);
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => renderAt(t), i / n);
    await p.screenshot({ path: path.join(out, 'f' + String(i).padStart(4, '0') + '.png') });
  }
  console.log(JSON.stringify({ errs, frames: n })); await b.close();
})();
