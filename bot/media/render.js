// Renders the Telegram Mini App cover (640×360) and the bot avatar (512×512) in the card-back style.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = __dirname; fs.mkdirSync(OUT, { recursive: true });

const G = '#d8a94c', Gd = '#8a6a2b', bg0 = '#1d1b28', bg1 = '#07070c', ink = '#0a0a10';
const FONT = `'Inter Display', Inter, 'DejaVu Sans', sans-serif`;
const defs = (id) => `<defs>
<radialGradient id="bb${id}" cx="38%" cy="45%" r="80%"><stop offset="0" stop-color="${bg0}"/><stop offset="1" stop-color="${bg1}"/></radialGradient>
<linearGradient id="gold${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7e2a4"/><stop offset=".5" stop-color="${G}"/><stop offset="1" stop-color="${Gd}"/></linearGradient>
<pattern id="lat${id}" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 11h22M11 0v22" stroke="${G}" stroke-width=".8" opacity=".14"/><circle cx="11" cy="11" r="1.1" fill="${G}" opacity=".3"/></pattern>
<linearGradient id="sheen${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".10"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>`;
const fan = (tx, ty, sx, sy) => `<g transform="translate(${tx} ${ty}) scale(${sx} ${sy})"><path d="M0 0L44 0M0 0L40 16M0 0L31 31M0 0L16 40M0 0L0 44" stroke="${G}" stroke-width="1.6" opacity=".9"/><path d="M8 0q0 8-8 8" fill="none" stroke="${G}" stroke-width="1.2"/><circle r="3.2" fill="${G}"/></g>`;
const rays = (cx, cy, r0a, r0b, r1a, r1b) => Array.from({ length: 36 }, (_, i) => { const a = i * 10 * Math.PI / 180; const r0 = i % 3 === 0 ? r0a : r0b, r1 = i % 3 === 0 ? r1a : r1b; return `<path d="M${cx + Math.cos(a) * r0} ${cy + Math.sin(a) * r0}L${cx + Math.cos(a) * r1} ${cy + Math.sin(a) * r1}" stroke="${G}" stroke-width="${i % 3 === 0 ? 1.6 : 1}" opacity="${i % 3 === 0 ? .55 : .3}"/>`; }).join('');
// fedora + moon emblem, centred at (cx, cy), scale s (designed at r=80)
const emblem = (cx, cy, s, id) => `<g transform="translate(${cx} ${cy}) scale(${s}) translate(-150 -205)">
<circle cx="150" cy="205" r="80" fill="${ink}" stroke="url(#gold${id})" stroke-width="2.2"/><circle cx="150" cy="205" r="72" fill="none" stroke="${G}" stroke-width=".9" opacity=".55"/>
<path d="M190 160a26 26 0 1 0 6 32a20 20 0 1 1-6-32z" fill="${G}" opacity=".85"/>
<path d="M100 212q10-50 50-50t50 50q20 2 26 12q-76 20-152 0q6-10 26-12z" fill="url(#gold${id})"/><path d="M110 206q40-10 80 0" stroke="#1b1620" stroke-width="7" fill="none" opacity=".9"/><path d="M116 212q34 8 68 0" stroke="${ink}" stroke-width="1.5" fill="none" opacity=".6"/></g>`;
const skyline = (w, y) => { // repeat the card skyline across the width
  const seg = 'M18 408h18v-26h12v10h10v-30h16v22h10v-14h18v28h14v-42h16v24h12v-12h20v30h12v-20h16v26h12v-16h18v28h16v-10h12v22h22v-28h12v30z';
  const windows = [[46, 388], [78, 380], [120, 372], [158, 386], [190, 390], [226, 384], [256, 392]];
  let out = ''; for (let x = -18; x < w; x += 280) out += `<g transform="translate(${x} ${y - 408})"><path d="${seg}" fill="${ink}"/>${windows.map(([wx, wy]) => `<rect x="${wx}" y="${wy}" width="3" height="4" fill="${G}" opacity=".8"/>`).join('')}</g>`;
  return out;
};

const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">${defs('c')}
<clipPath id="inner"><rect x="20" y="20" width="600" height="320" rx="8"/></clipPath>
<rect width="640" height="360" fill="url(#bbc)"/><rect x="14" y="14" width="612" height="332" rx="10" fill="url(#latc)"/>
<g clip-path="url(#inner)">${skyline(640, 342)}</g>
<rect x="12" y="12" width="616" height="336" rx="12" fill="none" stroke="url(#goldc)" stroke-width="2.4"/><rect x="20" y="20" width="600" height="320" rx="8" fill="none" stroke="${G}" stroke-width=".9" opacity=".5"/>
${fan(24, 24, 1, 1)}${fan(616, 24, -1, 1)}${fan(24, 336, 1, -1)}${fan(616, 336, -1, -1)}
${rays(186, 178, 104, 112, 150, 132)}
${emblem(186, 178, 1.25, 'c')}
<g transform="translate(340 0)">
<text data-max="262" x="0" y="160" font-family="${FONT}" font-weight="900" font-size="78" letter-spacing="8" fill="url(#goldc)">MAFIA</text>
<text data-max="262" x="2" y="214" font-family="${FONT}" font-weight="700" font-size="38" letter-spacing="20" fill="${G}">PRO</text>
<path d="M2 236h258" stroke="${G}" stroke-width="1.2" opacity=".6"/><path d="M131 230l6 6-6 6-6-6z" fill="${G}"/>
<text data-max="258" x="2" y="266" font-family="${FONT}" font-weight="700" font-size="14.5" letter-spacing="3.2" fill="${G}" opacity=".85">СТОЛ ВЕДУЩЕГО ЖИВОЙ МАФИИ</text>
<text data-max="258" x="2" y="290" font-family="${FONT}" font-weight="600" font-size="12.5" letter-spacing="2.6" fill="${G}" opacity=".65">55 РОЛЕЙ · 5 ЯЗЫКОВ · КЛАССИКА</text>
</g>
<rect x="-160" y="-20" width="150" height="420" fill="url(#sheenc)" transform="translate(300 0) skewX(-18)"/>
</svg>`;

const avatar = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${defs('a')}
<rect width="512" height="512" fill="url(#bba)"/><rect x="16" y="16" width="480" height="480" rx="40" fill="url(#lata)"/>
<circle cx="256" cy="256" r="238" fill="none" stroke="url(#golda)" stroke-width="3"/><circle cx="256" cy="256" r="226" fill="none" stroke="${G}" stroke-width="1" opacity=".5"/>
${rays(256, 214, 128, 136, 176, 158)}
${emblem(256, 214, 1.5, 'a')}
<text x="256" y="416" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="46" letter-spacing="6" fill="url(#golda)">MAFIA</text>
<text x="256" y="446" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="20" letter-spacing="11" fill="${G}">PRO</text>
</svg>`;

(async () => {
  const b = await chromium.launch();
  for (const [name, svg, w, h] of [['miniapp-640x360', cover, 640, 360], ['avatar-512', avatar, 512, 512]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent(`<!doctype html><html><body style="margin:0;background:#000">${svg}</body></html>`);
    await p.waitForTimeout(200);
    await p.evaluate(() => { document.querySelectorAll('text[data-max]').forEach(t => { const max = +t.dataset.max; let len = t.getComputedTextLength(); if (len > max) { const k = max / len; t.setAttribute('font-size', (+t.getAttribute('font-size') * k).toFixed(2)); t.setAttribute('letter-spacing', (+t.getAttribute('letter-spacing') * k).toFixed(2)); } }); });
    // persist the fitted SVG so the .svg matches the .png
    const fitted = await p.evaluate(() => document.querySelector('svg').outerHTML);
    fs.writeFileSync(path.join(OUT, name + '.svg'), fitted);
    await p.screenshot({ path: path.join(OUT, name + '.png'), clip: { x: 0, y: 0, width: w, height: h } });
    console.log('wrote', name);
  }
  await b.close();
})();
