// Monkey test: taps random enabled [data-a] controls in the real page for N rounds, reports page errors and bad text.
const { chromium } = require('playwright'); const path = require('path');
const N = +process.env.N || 4000;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message + ' @ ' + ((e.stack || '').split('\n')[1] || '').trim()));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'mafia-pro.html')); await p.waitForTimeout(400);
  const res = await p.evaluate(async (N) => {
    const skip = new Set(['reset-confirm', 'demo-remove', 'prof-del', 'lang', 'tab', 'go', 'back', 'new', 'continue', 'scen', 'scen-use']);
    const bad = []; const visited = {}; let clicks = 0; let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < N; i++) {
      const els = [...document.querySelectorAll('[data-a]')].filter(el => !el.disabled && !skip.has(el.dataset.a) && !el.closest('[disabled]'));
      // bias: when in a game, prefer game actions; occasionally navigate
      let el;
      if (rnd() < 0.04) { const nav = [...document.querySelectorAll('[data-a="tab"],[data-a="go"],[data-a="new"],[data-a="continue"],[data-a="back"],[data-a="scen"]')]; el = nav[Math.floor(rnd() * nav.length)]; }
      else el = els[Math.floor(rnd() * els.length)];
      if (!el) continue;
      const a = el.dataset.a; visited[a] = (visited[a] || 0) + 1;
      try { if (el.tagName === 'INPUT' || el.tagName === 'SELECT') { if (el.type === 'range') { el.value = String(7 + Math.floor(rnd() * 18)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } else if (el.type === 'text' || !el.type) { el.value = 'x' + i; el.dispatchEvent(new Event('input', { bubbles: true })); } else el.click(); } else el.click(); clicks++; }
      catch (e) { bad.push('click ' + a + ': ' + e.message); }
      const txt = document.body.innerText || '';
      const m = txt.match(/\bundefined\b|\bNaN\b|\[object Object\]|\{[a-zA-Z]\w*\}/);
      if (m) bad.push(`after ${a} (screen ${S.screen}${S.game ? ' ' + S.game.phase : ''}): "${m[0]}" … ${txt.slice(Math.max(0, m.index - 60), m.index + 30).replace(/\s+/g, ' ')}`);
      if (i % 500 === 0) await new Promise(r => setTimeout(r, 0));
    }
    return { bad: [...new Set(bad)].slice(0, 20), clicks, visited, screen: S.screen, phase: S.game && S.game.phase, games: S.profiles.reduce((a, p) => a + p.history.length, 0) };
  }, N);
  console.log('clicks', res.clicks, 'screen', res.screen, res.phase, 'history entries', res.games);
  console.log('actions used:', Object.keys(res.visited).length, Object.entries(res.visited).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ':' + v).join(' '));
  if (res.bad.length) console.log('BAD:\n - ' + res.bad.join('\n - '));
  if (errs.length) console.log('ERRORS:\n - ' + [...new Set(errs)].join('\n - '));
  await b.close();
  process.exit(res.bad.length || errs.length ? 1 : 0);
})();
