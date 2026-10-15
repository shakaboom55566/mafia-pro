// Renders skins/tools/anim-series.html frame by frame: node anim-series.js <out-frames-dir> <frames> <file1,file2,...>
// then: ffmpeg -framerate 30 -i <dir>/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 21 -movflags +faststart -an skins/<name>.mp4
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const [out, n, files] = [process.argv[2], +process.argv[3] || 240, process.argv[4]];
  const skins = path.join(__dirname, '..'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 720, height: 900 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://anim.local/**', r => { const name = path.basename(new URL(r.request().url()).pathname); const f = name === 'anim-series.html' ? path.join(__dirname, name) : path.join(skins, name);
    r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.png') ? 'image/png' : 'image/webp' }, body: fs.readFileSync(f) }); });
  await p.goto('https://anim.local/anim-series.html?f=' + files); console.log('cards', await p.evaluate(() => window.ready));
  for (let i = 0; i < n; i++) { await p.evaluate(t => renderAt(t), i / n); await p.screenshot({ path: path.join(out, 'f' + String(i).padStart(4, '0') + '.png') }); }
  console.log(JSON.stringify({ errs, frames: n })); await b.close();
})();
