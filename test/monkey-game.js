// Game-focused monkey: random taps on game controls through many games of random size (incl. scenarios), real page.
const { chromium } = require('playwright'); const path = require('path');
const N = +process.env.N || 20000;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message + ' @ ' + ((e.stack || '').split('\n')[1] || '').trim()));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'mafia-pro.html')); await p.waitForTimeout(400);
  const res = await p.evaluate(async (N) => {
    const bad = []; const visited = {}; let clicks = 0, games = 0, finished = 0; let seed = 11; const winners = {};
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    // own everything so scenarios can be used
    ROLES.filter(r => r.premium).forEach(r => { if (!S.owned.roles.includes(r.id)) S.owned.roles.push(r.id); });
    SCENARIOS.forEach(sc => { if (!S.owned.scenarios.includes(sc.id)) S.owned.scenarios.push(sc.id); }); S.owned.packs = ['diplomacy'];
    const gameActs = new Set(['pick', 'confirm', 'next', 'skip', 'prev', 'undo', 'resolve', 'stage', 'speech', 'day0', 'night', 'cand', 'vote', 'vote-open', 'vote-remove', 'vote-finish', 'vote-none', 'kam', 'kam-who', 'kam-cancel', 'kam-confirm', 'judge', 'lawyer', 'trig-confirm', 'finish', 'mode', 'player', 'toggle-alive', 'sheet', 'sheet-close', 'timer-toggle', 'timer-add', 'timer-reset', 'flip', 'hide', 'start', 'showall', 'vote-rest', 'tie-start', 'tie-speech', 'revote', 'roulette-start', 'roulette-guess', 'voter-step', 'voter-go', 'cand-pick', 'rv-toggle', 'nom-open', 'nominate', 'unnominate', 'vote-close', 'lift-toggle', 'lift-finish', 'bm-pick', 'bm-save', 'foul-add', 'foul-remove', 'prosecute-open', 'prosecute', 'bailiff']);
    const newGame = () => {
      S.ui.sheet = null; S.ui.kamikaze = null;
      if (rnd() < 0.3) { const sc = SCENARIOS[Math.floor(rnd() * SCENARIOS.length)]; ACT['scen-use']({ dataset: { id: sc.id } }); }
      else if (rnd() < 0.4) ACT['scen-use']({ dataset: { id: 'classic' } });
      else { ACT.new({ dataset: {} }); ACT.nrange({ dataset: {}, value: String(7 + Math.floor(rnd() * 18)) }); }
      // random extra tweak of composition sometimes
      if (rnd() < 0.3) { const r = ROLES[Math.floor(rnd() * ROLES.length)]; ACT.comp({ dataset: { id: r.id, d: rnd() < .5 ? '1' : '-1' } }); }
      ACT.deal({ dataset: {} }); games++;
    };
    newGame();
    for (let i = 0; i < N; i++) {
      if (!S.game || S.game.winner) { if (S.game && S.game.winner) { finished++; winners[S.game.winner.title] = (winners[S.game.winner.title] || 0) + 1; } newGame(); continue; }
      if (S.screen !== 'game' && S.screen !== 'deal') { ACT.continue({ dataset: {} }); }
      let els = [...document.querySelectorAll('[data-a]')].filter(el => !el.disabled && gameActs.has(el.dataset.a));
      // weight: picks and confirm/next are frequent; sheet rarely
      const weighted = els.filter(el => el.dataset.a !== 'sheet' || rnd() < 0.05).filter(el => el.dataset.a !== 'finish' || rnd() < 0.3).filter(el => el.dataset.a !== 'prev' && el.dataset.a !== 'undo' || rnd() < 0.3);
      const el = (weighted.length ? weighted : els)[Math.floor(rnd() * (weighted.length ? weighted : els).length)];
      if (!el) { bad.push('no controls on ' + S.screen + ' ' + (S.game && S.game.phase) + ' ' + (S.game && S.game.dayStage)); newGame(); continue; }
      const a = el.dataset.a; visited[a] = (visited[a] || 0) + 1;
      try { el.click(); clicks++; } catch (e) { bad.push('click ' + a + ': ' + e.message); }
      const txt = document.body.innerText || '';
      const m = txt.match(/\bundefined\b|\bNaN\b|\[object Object\]|\{[a-zA-Z]\w*\}/);
      if (m) bad.push(`after ${a} (${S.game.phase}/${S.game.dayStage}): "${m[0]}" … ${txt.slice(Math.max(0, m.index - 80), m.index + 30).replace(/\s+/g, ' ')}`);
      if (i % 500 === 0) await new Promise(r => setTimeout(r, 0));
    }
    return { bad: [...new Set(bad)].slice(0, 20), clicks, visited, games, finished, winners };
  }, N);
  console.log('clicks', res.clicks, 'games', res.games, 'finished', res.finished, JSON.stringify(res.winners));
  console.log('actions:', Object.entries(res.visited).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ':' + v).join(' '));
  if (res.bad.length) console.log('BAD:\n - ' + res.bad.join('\n - '));
  if (errs.length) console.log('ERRORS:\n - ' + [...new Set(errs)].join('\n - '));
  await b.close();
  process.exit(res.bad.length || errs.length ? 1 : 0);
})();
