// Real-browser QA: loads mafia-pro.html in headless Chromium at iPhone size, walks every screen in every language,
// plays games via the ACT handlers, collects console errors / page errors, checks rendered text for leftovers
// (undefined, NaN, {placeholders}) and checks that role-card text never overflows the card.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = process.env.SHOTS || path.join(__dirname, '..', '..', 'qa-shots');
fs.mkdirSync(OUT, { recursive: true });
const file = 'file://' + path.resolve(__dirname, '..', 'mafia-pro.html');
const problems = [];
let checks = 0; const SHOT = {};
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' });
  const page = await ctx.newPage();
  page.on('pageerror', e => problems.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text(); if (!/net::ERR|Failed to load resource|fonts.googleapis/.test(t)) problems.push('CONSOLE ' + m.type() + ' ' + t); } });
  await page.goto(file);
  await page.waitForSelector('#app .screen, #app', { timeout: 10000 });
  await page.waitForTimeout(400);

  const act = (a, d = {}) => page.evaluate(([a, d]) => { const el = { dataset: Object.assign({ a }, d), value: d.value }; ACT[a](el); return S.screen; }, [a, d]);
  const state = (expr) => page.evaluate(expr);
  async function check(name, shot) {
    checks++;
    const r = await page.evaluate(() => {
      const bad = [];
      const txt = document.body.innerText || '';
      if (/\bundefined\b/.test(txt)) bad.push('text "undefined"');
      if (/\bNaN\b/.test(txt)) bad.push('text NaN');
      if (/\[object Object\]/.test(txt)) bad.push('[object Object]');
      const ph = txt.match(/\{[a-zA-Z]\w*\}/g); if (ph) bad.push('placeholders ' + [...new Set(ph)].join(','));
      // role cards must not clip their text
      document.querySelectorAll('.card:not(.mini)').forEach(c => { if (c.scrollHeight > c.clientHeight + 2) bad.push(`card overflow ${c.querySelector('.name') && c.querySelector('.name').textContent} ${c.scrollHeight}>${c.clientHeight}`); });
      // horizontal page overflow
      if (document.documentElement.scrollWidth > window.innerWidth + 1) bad.push(`horizontal overflow ${document.documentElement.scrollWidth}>${window.innerWidth}`);
      return bad;
    });
    if (r.length) problems.push(`[${name}] ` + r.join('; '));
    if (shot) await page.screenshot({ path: path.join(OUT, shot + '.png'), fullPage: false });
  }

  const LANGS = ['ru', 'uk', 'en', 'pl', 'hy'];
  const roleIds = await state('ROLES.map(r => r.id)');
  for (const lang of LANGS) {
    await act('lang', { id: lang });
    await act('go', { to: 'home' }); await check(lang + ' home', lang === 'ru' ? 'home' : null);
    for (const to of ['cards', 'scenarios', 'shop', 'profiles', 'ratings', 'settings']) { await act('go', { to }); await check(lang + ' ' + to, lang === 'ru' ? to : null); }
    await act('go', { to: 'cards' });
    for (const f of ['all', 'black', 'red', 'neutral', 'premium']) { await act('filter', { id: f }); await check(lang + ' cards filter ' + f); }
    // every role sheet: text + card overflow
    for (const id of roleIds) { await act('role', { id }); await check(lang + ' role ' + id, lang === 'ru' && id === 'don' ? 'role-don' : null); await act('sheet-close'); }
    await act('go', { to: 'ratings' });
    for (const sc of ['server', 'city', 'country', 'roles']) { await act('rt-set', { k: 'scope', v: sc }); await check(lang + ' ratings ' + sc); }
    for (const pe of ['week', 'month', 'all']) { await act('rt-set', { k: 'period', v: pe }); await check(lang + ' ratings period ' + pe); }
    await act('rt-set', { k: 'scope', v: 'server' });
    await act('go', { to: 'profiles' });
    const pid = await state('S.profiles[0].id');
    await act('prof-open', { id: pid }); await check(lang + ' profile', lang === 'ru' ? 'profile' : null);
    await page.waitForTimeout(250);
    await act('prof-edit', { id: pid }); await check(lang + ' profile edit'); await act('sheet-close');
    await act('go', { to: 'shop' });
    await act('buy', { kind: 'role', id: 'witch' }); await check(lang + ' buy sheet'); await act('sheet-close');
    await act('buy', { kind: 'scen', id: 'court' }); await check(lang + ' buy scen sheet'); await act('sheet-close');
    await act('go', { to: 'settings' }); await act('sheet', { id: 'reset' }); await check(lang + ' reset sheet'); await act('sheet-close');
  }
  await act('lang', { id: 'ru' });

  // ---- real interaction: deal screen with real taps ----
  await act('go', { to: 'home' });
  await act('scen', { n: '9' });
  await page.fill('input[data-a="name"][data-i="0"]', 'Артём');
  await page.fill('input[data-a="name"][data-i="1"]', 'Олена');
  await check('setup 9', 'setup');
  await page.click('button[data-a="deal"]');
  await page.waitForTimeout(200);
  await check('deal closed', 'deal-closed');
  // the hidden face must be invisible while closed (no spoiler)
  const vis0 = await page.evaluate(() => getComputedStyle(document.querySelector('.flip .face.front')).visibility);
  if (vis0 !== 'hidden') problems.push('deal: front face visible while card closed: ' + vis0);
  await page.click('.flip');
  await page.waitForTimeout(900);
  await check('deal open', 'deal-open');
  const vis1 = await page.evaluate(() => [getComputedStyle(document.querySelector('.flip .face.front')).visibility, getComputedStyle(document.querySelector('.flip .face.cardback')).visibility]);
  if (vis1[0] !== 'visible' || vis1[1] !== 'hidden') problems.push('deal: faces after open ' + vis1.join('/'));
  await page.click('button[data-a="hide"]');
  await page.waitForTimeout(150);
  await check('deal next');
  const n = await state('S.game.players.length');
  for (let i = 1; i < n; i++) { await page.click('.flip'); await page.waitForTimeout(120); await page.click('button[data-a="hide"]'); await page.waitForTimeout(80); }
  await check('deal done', 'deal-done');
  await page.click('button[data-a="start"]');
  await page.waitForTimeout(150);
  await check('night0', 'night0');

  // ---- play games to the end for several table sizes (ACT-driven) ----
  const playGame = async (label) => {
    let guard = 0;
    while (await state('!!S.game.steps[S.game.stepIdx]') && guard++ < 60) { await act('next'); }
    await act('day0'); await check(label + ' day0');
    guard = 0; while (await state('!!alive(S.game)[S.game.speechIdx]') && guard++ < 40) await act('speech', { d: '1' });
    let rounds = 0;
    while (!(await state('!!S.game.winner')) && rounds++ < 14) {
      await act('night'); await check(label + ' night ' + rounds + ' first step', label === 'g9' && rounds === 1 ? 'night1' : null);
      guard = 0;
      while (await state('!!S.game.steps[S.game.stepIdx]') && guard++ < 80) {
        const st = await state('(() => { const st = S.game.steps[S.game.stepIdx]; return { type: st.type, roleId: st.roleId, targets: st.targets, disabled: !!st.disabled, modes: st.modes || null, byMode: st.targetsByMode || null }; })()');
        if (st.type === 'act' && !st.disabled) {
          const targets = await state('stepTargets(S.game, S.game.steps[S.game.stepIdx]).filter(x => x.ok).map(x => x.p.id)');
          const need = st.byMode ? st.byMode[await state('S.ui.mode')] : st.targets;
          if (targets.length >= need) {
            for (let k = 0; k < need; k++) await act('pick', { id: targets[Math.floor(Math.random() * targets.length)] });
            await act('confirm'); await check(label + ' confirm ' + st.roleId);
          } else { await act('skip'); continue; }
        }
        await act('next');
      }
      await act('resolve'); await check(label + ' morning ' + rounds, label === 'g9' && rounds === 1 ? 'morning' : null);
      if (await state('!!checkWin(S.game)')) { await act('stage', { id: 'balagan' }); await check(label + ' end via morning', label === 'g9' ? 'end' : null); break; }
      // kamikaze day ability if present
      const kam = await state("(alive(S.game).find(p => p.roleId === 'kamikaze' && !p.kamikazeUsed) || {}).id || null");
      if (kam) { await act('kam'); await act('pick', { id: kam }); await act('kam-who'); await check(label + ' kam victim'); const t = await state(`alive(S.game).find(p => p.id !== '${kam}').id`); await act('pick', { id: t }); await act('kam-confirm'); await check(label + ' kam done'); }
      await act('stage', { id: 'vote' });
      const a2 = await state('alive(S.game).map(p => p.id)'); if (a2.length < 3) break;
      await act('cand', { id: a2[0] }); await act('cand', { id: a2[1] });
      for (const v of a2.slice(2)) await act('vote', { c: Math.random() < .7 ? a2[0] : a2[1], v });
      await check(label + ' vote ' + rounds, label === 'g9' && rounds === 1 ? 'vote' : null);
      if (label === 'g9' && rounds === 1) { await act('voter-go', { i: '2' }); await check('vote stepper', 'vote-stepper'); }
      // resolve: leader → expel; none → rest; tie → speeches → re-vote; tie → roulette
      let vg = 0;
      while (await state("S.game.dayStage !== 'result'") && vg++ < 12) {
        const o = await state('(() => { const o = voteOutcome(S.game); return { kind: o.kind, id: o.id || null }; })()');
        if (o.kind === 'none') await act('vote-rest');
        else if (o.kind === 'leader') await act('vote-finish', { id: o.id });
        else if (o.kind === 'tie' && !(await state('S.game.ballot.round === 2'))) {
          await act('tie-start'); await check(label + ' tie speeches ' + rounds, label === 'g9' && !SHOT.tie ? (SHOT.tie = 'tie') : null);
          let g2 = 0; while (await state("S.game.dayStage === 'tie'") && g2++ < 10) await act('tie-speech', { d: '1' });
          await check(label + ' revote ' + rounds, label === 'g9' && !SHOT.revote ? (SHOT.revote = 'revote') : null);
          const b = await state('({ c: S.game.ballot.candidates, ex: S.game.ballot.excludedVoters || [] })');
          const voters = (await state('alive(S.game).map(p => p.id)')).filter(v => !b.ex.includes(v) && !b.c.includes(v));
          for (let i = 0; i < voters.length; i++) await act('vote', { c: b.c[i % b.c.length], v: voters[i] });
          await check(label + ' revote filled ' + rounds, label === 'g9' && !SHOT.revote2 ? (SHOT.revote2 = 'revote-filled') : null);
        } else if (o.kind === 'tie') {
          await act('roulette-start'); await check(label + ' roulette ' + rounds, !SHOT.roulette ? (SHOT.roulette = 'roulette') : null);
          let n = 1; while (await state("S.game.dayStage === 'roulette'") && n <= 9) { await act('roulette-guess', { n: String(n++) }); await check(label + ' roulette guess'); }
          await check(label + ' roulette result ' + rounds, !SHOT.rresult ? (SHOT.rresult = 'roulette-result') : null);
        } else break;
      }
      if (await state("S.game.dayStage !== 'result'")) problems.push(label + ' vote not resolved round ' + rounds);
      await check(label + ' vote result ' + rounds);
      guard = 0; while (await state('S.game.pendingTriggers.length') && guard++ < 5) { const t = await state('alive(S.game)[0].id'); await act('pick', { id: t }); await act('trig-confirm'); await check(label + ' trigger'); }
      if (await state('!!checkWin(S.game)')) { await act('finish'); await check(label + ' end screen', label === 'g9' ? 'end' : null); break; }
    }
    await check(label + ' final');
    if (await state('!!S.game.winner')) { const top = await state('reviewGame(S.game).players.slice().sort((a, b) => b.items.length - a.items.length)[0].id'); await act('rv-toggle', { id: top }); await check(label + ' review open', label === 'g9' ? 'review' : null); await page.evaluate(() => window.scrollTo(0, 600)); if (label === 'g9') await page.screenshot({ path: path.join(OUT, 'review-items.png') }); await page.evaluate(() => window.scrollTo(0, 0)); }
    return state('S.game.winner && S.game.winner.title');
  };
  console.log('g9 winner:', await playGame('g9'));
  for (const N of [7, 12, 16, 20, 24]) {
    await act('new'); await act('nrange', { value: String(N) }); await act('deal');
    const m = await state('S.game.players.length'); for (let i = 0; i < m; i++) { await act('flip'); await act('hide'); }
    await act('start');
    console.log('g' + N + ' winner:', await playGame('g' + N));
  }
  // scenario game with all premium roles
  await act('go', { to: 'shop' });
  for (const id of roleIds) { if (await state(`!!ROLE['${id}'].premium`)) await act('buy-confirm', { kind: 'role', id }); }
  for (const sc of ['chaos', 'clan_war', 'survival']) {
    await act('buy-confirm', { kind: 'scen', id: sc });
    await act('scen-use', { id: sc }); await check('scenario setup ' + sc, sc === 'chaos' ? 'scen-setup' : null);
    await act('deal');
    const m = await state('S.game.players.length'); for (let i = 0; i < m; i++) { await act('flip'); await act('hide'); }
    await act('start');
    console.log(sc + ' winner:', await playGame('s-' + sc));
  }
  // ---- classic (sport) mafia ----
  await act('lang', { id: 'ru' });
  await act('go', { to: 'scenarios' }); await act('classic-rules'); await check('classic card', 'classic-scen');
  await act('scen-use', { id: 'classic' }); await check('classic setup', 'classic-setup');
  await act('deal'); for (let i = 0; i < 10; i++) { await act('flip'); await act('hide'); }
  await act('start'); let cg = 0; while (await state('!!S.game.steps[S.game.stepIdx]') && cg++ < 20) await act('next');
  await act('day0'); await check('classic day1 speeches');
  let ord = await state('speakOrder(S.game).map(p => p.id)');
  await act('nom-open', { id: ord[0] }); await check('classic nominate', 'classic-nominate');
  await act('nominate', { id: ord[0], t: ord[2] }); await act('speech', { d: '1' }); await act('nominate', { id: ord[1], t: ord[3] }); await check('classic speech 2', 'classic-speech');
  cg = 0; while (await state("S.game.dayStage === 'speeches'") && cg++ < 20) await act('speech', { d: '1' });
  await check('classic vote', 'classic-vote');
  // force a tie twice → lift all
  let bc = await state('S.game.ballot.candidates'); let vs = (await state('alive(S.game).map(p => p.id)')).filter(x => !bc.includes(x));
  await act('vote', { c: bc[1], v: bc[0] }); await act('vote', { c: bc[0], v: bc[1] }); for (let i = 0; i < vs.length; i++) await act('vote', { c: bc[i % 2], v: vs[i] });
  await act('vote-close'); await check('classic tie');
  cg = 0; while (await state("S.game.dayStage === 'tie'") && cg++ < 10) await act('tie-speech', { d: '1' });
  bc = await state('S.game.ballot.candidates'); const ex = await state('S.game.ballot.excludedVoters || []'); vs = (await state('alive(S.game).map(p => p.id)')).filter(x => !bc.includes(x) && !ex.includes(x));
  for (let i = 0; i < vs.length; i++) await act('vote', { c: bc[i % 2], v: vs[i] });
  await act('vote-close'); await check('classic lift', 'classic-lift');
  if (await state("S.game.dayStage === 'lift'")) { const need = await state('liftNeed(S.game)'); const al = await state('alive(S.game).map(p => p.id)'); for (let i = 0; i < need; i++) await act('lift-toggle', { id: al[i] }); await check('classic lift voted', 'classic-lift-voted'); await act('lift-finish'); await check('classic lift result', 'classic-lift-result'); }
  else problems.push('classic: lift-all stage not reached: ' + await state('S.game.dayStage'));
  if (!(await state('!!checkWin(S.game)'))) {
    await act('night'); cg = 0;
    while (await state('!!S.game.steps[S.game.stepIdx]') && cg++ < 20) { const st = await state('(() => { const st = S.game.steps[S.game.stepIdx]; return { type: st.type }; })()'); if (st.type === 'act') { const t = await state('stepTargets(S.game, S.game.steps[S.game.stepIdx]).filter(x => x.ok).map(x => x.p.id)'); if (t.length) { await act('pick', { id: t[0] }); await act('confirm'); } else await act('skip'); } await act('next'); }
    await act('resolve'); await check('classic morning', 'classic-morning');
    if (await state('S.game.nightResult.removed.length > 0')) { const al = await state('alive(S.game).map(p => p.id)'); await act('bm-pick', { id: al[0] }); await act('bm-pick', { id: al[1] }); await check('classic best move', 'classic-bestmove'); await act('bm-save'); await check('classic best move saved'); }
  }
  await act('sheet', { id: 'players' }); const fpid = await state('alive(S.game)[0].id'); await act('player', { id: fpid }); await check('classic fouls sheet', 'classic-fouls'); await act('foul-add', { id: fpid }); await act('sheet-close');
  // ---- diplomacy pack ----
  await act('go', { to: 'shop' }); await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await check('shop pack', 'shop-pack'); await page.evaluate(() => window.scrollTo(0, 0));
  await act('buy', { kind: 'pack', id: 'diplomacy' }); await check('pack buy sheet', 'pack-buy'); await act('buy-confirm', { kind: 'pack', id: 'diplomacy' });
  await act('role', { id: 'blackmailer' }); await check('pack role card', 'pack-card'); await act('sheet-close');
  await act('role', { id: 'kamikaze' }); await page.evaluate(() => { const el = document.querySelector('.counter-list'); if (el) el.scrollIntoView(); }); await check('counters on role sheet', 'counters'); await act('sheet-close');
  // rotatable card in the role sheet: drag it half a turn with a real pointer and verify the back is shown
  await act('role', { id: 'don' }); await page.waitForTimeout(200);
  const box = await page.evaluate(() => { const r = document.querySelector('.roledoc .card3d-wrap').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
  await page.mouse.move(box.x - 60, box.y); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x - 60 + i * 30, box.y); await page.waitForTimeout(16); } await page.mouse.up();
  const ry = await page.evaluate(() => c3state('sheet').ry); if (Math.abs(ry - (-18)) < 60) problems.push('role sheet card did not rotate by drag: ry=' + ry);
  await page.evaluate(() => { const w = document.querySelector('.roledoc .card3d-wrap'); c3state('sheet').ry = 180; c3state('sheet').rx = 4; card3dApply(w); }); await check('role sheet back', 'card-back');
  const backVis = await page.evaluate(() => document.querySelector('.roledoc .face.back').style.visibility); if (backVis !== 'visible') problems.push('card back not visible at 180°');
  await act('sheet-close');
  await act('role', { id: 'arsonist' }); await page.evaluate(() => { const w = document.querySelector('.roledoc .card3d-wrap'); c3state('sheet').ry = 180; card3dApply(w); }); await check('premium card back', 'card-back-premium'); await act('sheet-close');
  await page.evaluate(() => { c3state('sheet').ry = -18; });
  for (const id of ['sapper', 'bailiff', 'auditor', 'thug']) { await act('role', { id }); await check('new role ' + id, id === 'sapper' ? 'role-sapper' : null); await act('sheet-close'); }
  await act('go', { to: 'cards' }); await act('filter', { id: 'premium' }); await page.evaluate(() => window.scrollTo(0, 1200)); await check('cards premium with pack', 'pack-gallery'); await page.evaluate(() => window.scrollTo(0, 0));
  await act('scen-use', { id: 'big_politics' }); await check('pack setup', 'pack-setup');
  await act('deal'); const pn = await state('S.game.players.length'); for (let i = 0; i < pn; i++) { await act('flip'); await act('hide'); }
  await act('start'); cg = 0; while (await state('!!S.game.steps[S.game.stepIdx]') && cg++ < 40) await act('next');
  await act('day0'); cg = 0; while (await state('!!alive(S.game)[S.game.speechIdx]') && cg++ < 40) await act('speech', { d: '1' });
  await act('night'); cg = 0;
  while (await state('!!S.game.steps[S.game.stepIdx]') && cg++ < 60) {
    const st = await state('(() => { const st = S.game.steps[S.game.stepIdx]; return { type: st.type, roleId: st.roleId, targets: st.targets }; })()');
    if (st.type === 'act') {
      if (['blackmailer', 'provocateur', 'treasurer', 'notary', 'pastor', 'gambler', 'peacemaker', 'puppeteer'].includes(st.roleId)) { const t = await state('stepTargets(S.game, S.game.steps[S.game.stepIdx]).filter(x => x.ok).map(x => x.p.id)'); await act('pick', { id: t[Math.floor(Math.random() * t.length)] }); if (st.roleId === 'blackmailer') await check('pack night step', 'pack-night'); await act('confirm'); }
      else await act('skip');
      if (await state("S.game.steps[S.game.stepIdx] && S.game.steps[S.game.stepIdx].type === 'act' && !S.game.actions.some(a => a.stepId === S.game.steps[S.game.stepIdx].id)")) { /* skipped */ }
    }
    await act('next');
  }
  await act('resolve'); await check('pack morning', 'pack-morning');
  await act('stage', { id: 'balagan' }); await act('stage', { id: 'vote' });
  const cands0 = await state('S.game.ballot.candidates.slice()'); const alP = await state('alive(S.game).map(p => p.id)');
  if (cands0.length < 2) await act('cand', { id: alP.find(x => !cands0.includes(x)) });
  const pros = await state("(alive(S.game).find(p => p.roleId === 'prosecutor') || {}).id || null");
  if (pros) { await act('prosecute-open', { id: pros }); await check('prosecutor picker', 'pack-prosecutor'); const c0 = await state('S.game.ballot.candidates[0]'); await act('prosecute', { id: pros, c: c0 }); }
  const cs = await state('S.game.ballot.candidates.slice()'); for (const v of alP) if (!cs.includes(v)) await act('vote', { c: cs[0], v });
  await check('pack vote', 'pack-vote');
  // profile after games
  await act('go', { to: 'profiles' }); await check('profiles after games', 'profiles');
  await act('prof-open', { id: await state('S.profiles[0].id') }); await page.waitForTimeout(300); await check('profile after games');
  // 3D card: faces must switch visibility with rotation
  await page.evaluate(() => { const w = document.querySelector('.card3d-wrap'); c3state(w.dataset.key).ry = 0; card3dApply(w); });
  const f0 = await page.evaluate(() => [document.querySelector('.card3d-wrap .face.front').style.visibility, document.querySelector('.card3d-wrap .face.back').style.visibility]);
  await page.evaluate(() => { const w = document.querySelector('.card3d-wrap'); c3state(w.dataset.key).ry = 180; card3dApply(w); });
  const f1 = await page.evaluate(() => [document.querySelector('.card3d-wrap .face.front').style.visibility, document.querySelector('.card3d-wrap .face.back').style.visibility]);
  if (f0.join() !== 'visible,hidden' || f1.join() !== 'hidden,visible') problems.push('card3d visibility ' + f0.join('/') + ' ' + f1.join('/'));
  await check('profile 3d back', 'profile-3d-back');
  // reload persistence
  await page.reload(); await page.waitForTimeout(500); await check('after reload');
  await browser.close();
  console.log(`\n${checks} checks`);
  if (problems.length) { console.log('PROBLEMS:'); [...new Set(problems)].forEach(p => console.log(' -', p)); process.exit(1); }
  console.log('ALL OK');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
