/* Device matrix: the app on phones, tablets and desktops of different sizes — nothing overflows, every button is reachable and big
   enough, the sticky action button is not hidden behind the tab bar, text does not spill out of its box.
   usage: node test/devices.js  (Chromium via Playwright; emulates viewport, DPR, touch and the lite graphics mode) */
const { chromium } = require('playwright');
const path = require('path');
const DEVICES = [
  { name: 'iPhone SE (1st) / 5s 320×568', w: 320, h: 568, dpr: 2, mobile: true, lite: true },
  { name: 'iPhone SE 2/3 · 8 375×667', w: 375, h: 667, dpr: 2, mobile: true, lite: true },
  { name: 'iPhone X / 11 Pro 375×812', w: 375, h: 812, dpr: 3, mobile: true, lite: true },
  { name: 'iPhone 13 / 14 390×844', w: 390, h: 844, dpr: 3, mobile: true },
  { name: 'iPhone 15 / 16 393×852', w: 393, h: 852, dpr: 3, mobile: true },
  { name: 'iPhone 15 Pro Max 430×932', w: 430, h: 932, dpr: 3, mobile: true },
  { name: 'Android small 360×640', w: 360, h: 640, dpr: 2, mobile: true, lite: true },
  { name: 'Android 360×800', w: 360, h: 800, dpr: 3, mobile: true },
  { name: 'Android 412×915 (Pixel)', w: 412, h: 915, dpr: 2.6, mobile: true },
  { name: 'Galaxy Fold narrow 280×653', w: 280, h: 653, dpr: 2.5, mobile: true },
  { name: 'iPad mini portrait 744×1133', w: 744, h: 1133, dpr: 2, mobile: true },
  { name: 'iPad portrait 820×1180', w: 820, h: 1180, dpr: 2, mobile: true },
  { name: 'iPad landscape 1180×820', w: 1180, h: 820, dpr: 2, mobile: true },
  { name: 'Phone landscape 844×390', w: 844, h: 390, dpr: 3, mobile: true },
  { name: 'Laptop 1280×720', w: 1280, h: 720, dpr: 1, mobile: false },
  { name: 'Desktop 1920×1080', w: 1920, h: 1080, dpr: 1, mobile: false },
  { name: 'Telegram Desktop window 420×700', w: 420, h: 700, dpr: 1.25, mobile: false },
];
(async () => {
  const b = await chromium.launch();
  const problems = []; let shots = 0;
  for (const dev of DEVICES) {
    const ctx = await b.newContext({ viewport: { width: dev.w, height: dev.h }, deviceScaleFactor: dev.dpr, hasTouch: dev.mobile, isMobile: dev.mobile });
    const p = await ctx.newPage();
    p.on('pageerror', e => problems.push(`[${dev.name}] pageerror: ${e.message}`));
    await p.addInitScript(lite => { try { localStorage.clear(); if (lite) localStorage.setItem('mafia-pro-lite', '1'); } catch (e) {} }, !!dev.lite);
    await p.goto('file://' + path.resolve(__dirname, '..', 'mafia-pro.html')); await p.waitForTimeout(500);
    if (dev.lite) await p.evaluate(() => { try { S.settings.lite = 'on'; applyLite(); } catch (e) {} });
    const screens = [
      ['home', () => { S.ui.sheet = null; go('home'); }],
      ['setup', () => { ACT.new({ dataset: {} }); }],
      ['setup classic', () => { ACT['scen-use']({ dataset: { id: 'classic' } }); }],
      ['cards', () => { S.ui.sheet = null; go('cards'); }],
      ['role sheet', () => { go('cards'); S.ui.sheet = { type: 'role', id: 'don' }; render(); }],
      ['scenarios', () => { S.ui.sheet = null; go('scenarios'); }],
      ['shop', () => { S.ui.sheet = null; go('shop'); }],
      ['settings', () => { S.ui.sheet = null; go('settings'); }],
      ['myprofile', () => { S.ui.sheet = null; go('myprofile'); }],
      ['deal', () => { S.ui.sheet = null; S.setup.scenario = null; S.setup.n = 10; S.setup.comp = presetFor(10); S.setup.names = ['Анна', 'Богдан', 'Нина', 'Гена', 'Дима', 'Ева', 'Женя', 'Зоя', 'Иван', 'Кира']; ACT.deal({ dataset: {} }); }],
      ['deal open card', () => { ACT.flip({ dataset: {} }); }],
      ['night 0', () => { S.ui.flipAnim = false; const g = S.game; g.dealIdx = g.players.length; g.dealOpen = false; ACT.start({ dataset: {} }); go('game'); }],
      ['day 0', () => { const g = S.game; while (g.phase === 'night0' && g.stepIdx < g.steps.length) ACT.next({ dataset: {} }); if (g.phase === 'night0') ACT.day0({ dataset: {} }); }],
      ['night 1', () => { const g = S.game; let guard = 40; while (g.phase === 'day0' && alive(g)[g.speechIdx] && guard--) ACT.speech({ dataset: { d: '1' } }); if (g.phase === 'day0') ACT.night({ dataset: {} }); }],
      ['day 1 morning', () => { const g = S.game; if (g.phase === 'night') { while (g.stepIdx < g.steps.length) { const st = g.steps[g.stepIdx]; if (st.type === 'act' && !g.actions.find(a => a.stepId === st.id)) { const t = stepTargets(g, st).find(x => x.ok); if (t) { S.ui.pick = [t.p.id]; S.ui.mode = st.modes ? st.modes[0] : null; ACT.confirm({ dataset: {} }); } } ACT.next({ dataset: {} }); } ACT.resolve({ dataset: {} }); } }],
      ['day 1 speeches', () => { const g = S.game; if (g.dayStage === 'morning') ACT.stage({ dataset: { id: 'speeches' } }); }],
      ['day 1 vote', () => { const g = S.game; if (g.dayStage !== 'vote') ACT.stage({ dataset: { id: 'vote' } }); const al = alive(g); if (g.ballot && !g.ballot.candidates.length) { ACT.cand({ dataset: { id: al[0].id } }); ACT.cand({ dataset: { id: al[1].id } }); } }],
      ['players sheet', () => { S.ui.sheet = { type: 'players' }; render(); }],
      ['end', () => { S.ui.sheet = null; finishGame(S.game, checkWin(S.game) || { side: 'city', title: 'Победа города', text: '' }); go('game'); }],
    ];
    for (const [name, enter] of screens) {
      try { await p.evaluate(enter); } catch (e) { problems.push(`[${dev.name}] ${name}: enter failed: ${String(e.message).split('\n')[0]}`); continue; }
      await p.waitForTimeout(250);
      const r = await p.evaluate(() => {
        const bad = []; const vw = window.innerWidth, vh = window.innerHeight;
        const de = document.documentElement; if (de.scrollWidth > vw + 1) bad.push(`horizontal overflow ${de.scrollWidth}>${vw}`);
        const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
        // every clickable thing sits inside the viewport horizontally and is big enough for a finger
        const small = [], outside = [];
        document.querySelectorAll('button, [role="button"], a, input, select').forEach(el => {
          if (!vis(el) || el.closest('.sheet-bg') && !el.closest('.sheet') && el.tagName !== 'BUTTON') return;
          const r = el.getBoundingClientRect();
          if (r.left < -1 || r.right > vw + 1) outside.push((el.dataset.a || el.tagName) + '@' + Math.round(r.left) + '..' + Math.round(r.right));
          if (el.tagName !== 'A' && !el.classList.contains('x') && !el.classList.contains('chk') && r.height < 24 && r.width < 24) small.push((el.dataset.a || el.className || el.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
        });
        if (outside.length) bad.push('outside viewport: ' + outside.slice(0, 4).join(', '));
        if (small.length) bad.push('tiny targets: ' + small.slice(0, 4).join(', '));
        // the sticky action button must not be hidden behind the tab bar
        const sticky = document.querySelector('.sticky-bottom'); const tab = document.querySelector('.tabbar');
        if (sticky && tab && vis(sticky) && vis(tab)) { const a = sticky.getBoundingClientRect(), t = tab.getBoundingClientRect(); if (a.bottom > t.top + 1 && a.top < t.top) bad.push(`sticky button under the tab bar (${Math.round(a.bottom)} > ${Math.round(t.top)})`); }
        // text spilling out of fixed-width boxes
        const spill = []; document.querySelectorAll('.btn, .menu-item .t, .tabbar button, .stepper .lbl, .seat, .rt-nm, .eyebrow').forEach(el => { if (!vis(el)) return; if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow === 'visible' && getComputedStyle(el).whiteSpace === 'nowrap') spill.push((el.className || el.tagName).toString().slice(0, 30)); });
        if (spill.length) bad.push('text spills: ' + [...new Set(spill)].slice(0, 4).join(', '));
        const txt = document.body.innerText || ''; if (/\bundefined\b|\bNaN\b/.test(txt)) bad.push('undefined/NaN in text');
        const sw = document.querySelector('.switch'); if (sw && vis(sw)) { const r = sw.getBoundingClientRect(); const row = sw.closest('.setting'); const rr = row ? row.getBoundingClientRect() : null; if (r.width < 44 || (rr && r.right > rr.right + 0.5)) bad.push('switch squashed or outside its row'); }
        return bad;
      });
      if (r.length) problems.push(`[${dev.name}] ${name}: ${r.join('; ')}`);
      if (['home', 'setup', 'settings', 'day 1 vote', 'end'].includes(name)) { await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'dev-' + dev.w + 'x' + dev.h + '-' + name.replace(/\s+/g, '_') + '.png') }).catch(() => {}); shots++; }
    }
    await ctx.close();
  }
  await b.close();
  console.log(`devices ${DEVICES.length}, screenshots ${shots}`);
  if (problems.length) { console.log('PROBLEMS:'); [...new Set(problems)].forEach(x => console.log(' - ' + x)); process.exit(1); }
  console.log('ALL OK'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
