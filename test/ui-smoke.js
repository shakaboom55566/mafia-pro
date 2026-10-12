// UI smoke test with a minimal DOM shim: drives the screens through the ACT handlers and checks rendered HTML.
const fs = require('fs'); const vm = require('vm');
const src = ['02-i18n.js', '02a-i18n-ru-roles.js', '02b-i18n-uk.js', '02c-i18n-en.js', '02d-i18n-pl.js', '02e-i18n-hy.js', '02g-i18n-profiles.js', '02h-i18n-premium.js', '02i-i18n-fixes.js', '02j-i18n-vote.js', '02k-i18n-review.js', '02l-i18n-classic.js', '02m-i18n-diplomacy.js', '02n-i18n-counters.js', '02o-i18n-cloud.js', '02f-icons.js', '02-data.js', '03-engine.js', '04-ui.js', '05-profiles.js', '07-review.js', '08-telegram.js', '06-shop.js'].map(f => fs.readFileSync(__dirname + '/../src/' + f, 'utf8')).join('\n');
const app = { innerHTML: '' };
const store = {};
const ctx = {
  console, Math, Date, Object, Array, Set, Number, String, JSON, setInterval, clearInterval, setTimeout, clearTimeout,
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } },
  document: { querySelector: s => s === '#app' ? app : null, addEventListener() {}, createElement: () => ({ className: '', textContent: '', remove() {} }), body: { appendChild() {} } },
};
ctx.window = { scrollTo() {}, AudioContext: null, webkitAudioContext: null }; ctx.navigator = { language: 'ru' }; ctx.requestAnimationFrame = () => 1; ctx.Intl = Intl;
ctx.self = ctx; vm.createContext(ctx);
vm.runInContext(src + '\nthis.X = { ACT, S: () => S, render, P, alive, ROLE, T, voteOutcome, voteWeight, reviewGame, label, PACKS, canNominate, tally, FX, U: () => U(), tt, COUNTERS, COUNTERED_BY, ROLES, dayAbilityBlocked };', ctx);
const X = ctx.X; let fails = 0; let shots = 0;
function check(name) {
  const h = app.innerHTML; shots++;
  const bad = [];
  if (/undefined/.test(h)) bad.push('contains "undefined"');
  if (/NaN/.test(h)) bad.push('contains NaN');
  if (/\[object Object\]/.test(h)) bad.push('contains [object Object]');
  const opens = (h.match(/<div\b/g) || []).length, closes = (h.match(/<\/div>/g) || []).length;
  if (opens !== closes) bad.push(`div mismatch ${opens}/${closes}`);
  const bo = (h.match(/<button\b/g) || []).length, bc = (h.match(/<\/button>/g) || []).length;
  if (bo !== bc) bad.push(`button mismatch ${bo}/${bc}`);
  if (bad.length) { fails++; console.log('FAIL', name, bad.join('; ')); const i = h.search(/undefined|NaN|\[object Object\]/); if (i >= 0) console.log('   ...', h.slice(Math.max(0, i - 120), i + 60).replace(/\s+/g, ' ')); }
  else console.log('ok  ', name, `(${h.length} chars)`);
}
const el = (a, d = {}) => ({ dataset: Object.assign({ a }, d), value: d.value });
const A = X.ACT;
let forcedTies = 0, roulettes = 0;
// drives the vote to a result: leader → expel; none → rest to last; tie → defence speeches → re-vote; tie again → roulette
function resolveVote(label, forceTie) {
  const g = X.S().game; let guard = 0;
  while (g.dayStage !== 'result' && guard++ < 12) {
    const o = X.voteOutcome(g);
    if (o.kind === 'none') { A['vote-rest'](); check(label + ' rest to last'); }
    else if (o.kind === 'leader') { A['vote-finish'](el('vote-finish', { id: o.id })); }
    else if (o.kind === 'tie' && g.ballot.round !== 2) {
      A['tie-start'](); check(label + ' tie speeches');
      if (g.dayStage !== 'tie') { fails++; console.log('FAIL tie stage not entered'); break; }
      let g2 = 0; while (g.dayStage === 'tie' && g2++ < 10) { check(label + ' tie speech ' + g.speechIdx); A['tie-speech'](el('tie-speech', { d: '1' })); }
      if (g.dayStage !== 'vote' || g.ballot.round !== 2) { fails++; console.log('FAIL revote not started', g.dayStage, g.ballot.round); break; }
      check(label + ' revote');
      const b = g.ballot; const voters = X.alive(g).filter(v => !(b.excludedVoters || []).includes(v.id) && !b.candidates.includes(v.id));
      if (b.candidates.length === 2 && b.excludedVoters.length !== 2) { fails++; console.log('FAIL two tied candidates must not vote'); }
      if (forceTie) { const w1 = voters.filter(v => X.voteWeight(g, v.id) === 1).slice(0, 2); if (w1.length === 2) { forcedTies++; A.vote(el('vote', { c: b.candidates[0], v: w1[0].id })); A.vote(el('vote', { c: b.candidates[1], v: w1[1].id })); } }
      else voters.forEach((v, i) => A.vote(el('vote', { c: b.candidates[i % b.candidates.length], v: v.id })));
      check(label + ' revote filled');
    }
    else if (o.kind === 'tie') {
      A['roulette-start'](); check(label + ' roulette');
      if (g.dayStage !== 'roulette') { fails++; console.log('FAIL roulette not started'); break; }
      roulettes++; const order = g.ballot.roulette.order.slice();
      let n = 1; while (g.dayStage === 'roulette' && n <= 9) { A['roulette-guess'](el('roulette-guess', { n: String(n) })); check(label + ' roulette guess ' + n); n++; }
      if (g.dayStage !== 'result' || !g.voteResult.eliminatedId || !order.includes(g.voteResult.eliminatedId)) { fails++; console.log('FAIL roulette did not eliminate a tied player'); }
      if (g.ballot.roulette.guesses.some(x => x.n === g.ballot.roulette.number) && g.voteResult.eliminatedId !== g.ballot.roulette.guesses.find(x => x.n === g.ballot.roulette.number).pid) { fails++; console.log('FAIL wrong roulette victim'); }
    }
    else break;
  }
  if (g.dayStage !== 'result') { fails++; console.log('FAIL vote not resolved:', label, g.dayStage); }
}
if (process.env.LANG_CODE) { A.lang({ dataset: { id: process.env.LANG_CODE } }); }
check('home');
A.go(el('go', { to: 'cards' })); check('cards');
A.filter(el('filter', { id: 'black' })); check('cards black');
A.role(el('role', { id: 'rabbi' })); check('role sheet');
A['sheet-close']();
A.go(el('go', { to: 'scenarios' })); check('scenarios');
A.scen(el('scen', { n: '12' })); check('setup 12');
A.n(el('n', { d: '1' })); check('setup 13');
A.comp(el('comp', { id: 'mafia', d: '1' })); check('setup 14 cards warn');
A.comp(el('comp', { id: 'mafia', d: '-1' }));
A.name(el('name', { i: '0', value: 'Артём' }));
let S = X.S(); A['seat-assign'](el('seat-assign', { id: S.profiles[0].id })); A['seat-assign'](el('seat-assign', { id: S.profiles[1].id })); A['seat-assign'](el('seat-assign', { id: S.profiles[2].id })); check('setup with profiles');
A.deal(); check('deal 1');
A.flip(); check('deal open');
A.showall(); check('deal table'); A.showall();
S = X.S();
for (let i = 0; i < S.game.players.length; i++) { A.flip(); A.hide(); }
check('deal done');
A.start(); check('night0 step1');
S = X.S(); let guard = 0;
while (S.game.steps[S.game.stepIdx] && guard++ < 40) { A.next(); check('night0 step ' + S.game.stepIdx); }
A.day0(); check('day0 speech 1');
guard = 0; while (X.alive(S.game)[S.game.speechIdx] && guard++ < 40) A.speech(el('speech', { d: '1' }));
check('day0 done');
A.night(); check('night1 step 1');
// walk the night: record a target for every act step
guard = 0;
while (S.game.steps[S.game.stepIdx] && guard++ < 60) {
  const st = S.game.steps[S.game.stepIdx];
  if (st.type === 'act') {
    const targets = vm.runInContext('stepTargets', ctx)(S.game, st).filter(x => x.ok).map(x => x.p.id);
    if (targets.length >= st.targets) {
      for (let k = 0; k < st.targets; k++) A.pick(el('pick', { id: targets[k] }));
      check(`night1 ${st.roleId} picked`);
      if (st.roleId === 'sheriff') A.mode(el('mode', { id: 'check' }));
      A.confirm(); check(`night1 ${st.roleId} confirmed`);
    } else { A.skip(); continue; }
  } else check(`night1 meet ${st.title}`);
  A.next();
}
check('night1 end');
A.resolve(); check('day1 morning');
A.stage(el('stage', { id: 'balagan' })); check('day1 balagan');
const kam = X.alive(S.game).find(p => p.roleId === 'kamikaze' && !p.kamikazeUsed);
if (kam) { A.kam(el('kam', {})); check('kamikaze who'); A.pick(el('pick', { id: X.alive(S.game).find(p => p.roleId !== 'kamikaze').id })); check('kamikaze wrong seat'); A.pick(el('pick', { id: kam.id })); A['kam-who'](); check('kamikaze victim picker'); const t = X.alive(S.game).find(p => p.id !== kam.id); A.pick(el('pick', { id: t.id })); A['kam-confirm'](); check('kamikaze used'); }
A.stage(el('stage', { id: 'speeches' })); check('day1 speeches');
A.stage(el('stage', { id: 'vote' })); check('day1 vote empty');
const al = X.alive(S.game);
A.cand(el('cand', { id: al[0].id })); A.cand(el('cand', { id: al[1].id })); check('vote 2 candidates');
const w1 = al.slice(2).filter(v => X.voteWeight(S.game, v.id) === 1);
A.vote(el('vote', { c: al[0].id, v: w1[0].id })); A.vote(el('vote', { c: al[0].id, v: w1[1].id }));
A.vote(el('vote', { c: al[1].id, v: w1[2].id })); A.vote(el('vote', { c: al[1].id, v: w1[3].id }));
check('vote filled (tie)');
A['vote-finish'](el('vote-finish', { id: al[0].id })); if (S.game.dayStage === 'result') { fails++; console.log('FAIL: expel allowed on a tie'); }
A['vote-none'](); if (S.game.dayStage === 'result') { fails++; console.log('FAIL: vote skipped with candidates present'); }
resolveVote('day1', true); check('vote result');
guard = 0; while (S.game.pendingTriggers.length && guard++ < 5) { const t = X.alive(S.game)[0]; A.pick(el('pick', { id: t.id })); A['trig-confirm'](); check('trigger applied'); }
A.sheet(el('sheet', { id: 'players' })); check('players sheet');
A.player(el('player', { id: X.alive(S.game)[0].id })); check('player edit');
A['sheet-close']();
A.sheet(el('sheet', { id: 'log' })); check('log sheet'); A['sheet-close']();
// play on until someone wins or 12 rounds
let rounds = 0;
while (!S.game.winner && rounds++ < 12) {
  if (vm.runInContext('checkWin', ctx)(S.game)) { A.finish(); break; }
  A.night();
  guard = 0;
  while (S.game.steps[S.game.stepIdx] && guard++ < 60) {
    const st = S.game.steps[S.game.stepIdx];
    if (st.type === 'act' && !st.disabled) {
      const targets = vm.runInContext('stepTargets', ctx)(S.game, st).filter(x => x.ok).map(x => x.p.id);
      if (targets.length >= st.targets) { for (let k = 0; k < st.targets; k++) A.pick(el('pick', { id: targets[k] })); A.confirm(); }
      else { A.skip(); continue; }
    }
    A.next();
  }
  A.resolve(); check(`round ${rounds} morning`);
  if (vm.runInContext('checkWin', ctx)(S.game)) { A.stage(el('stage', { id: 'balagan' })); check('end via morning'); break; }
  A.stage(el('stage', { id: 'vote' }));
  const a2 = X.alive(S.game); if (a2.length < 3) break;
  A.cand(el('cand', { id: a2[0].id })); A.cand(el('cand', { id: a2[1].id })); a2.slice(2).forEach((v, i) => A.vote(el('vote', { c: a2[i % 2].id, v: v.id })));
  resolveVote(`round ${rounds}`, rounds === 1); check(`round ${rounds} vote`);
  guard = 0; while (S.game.pendingTriggers.length && guard++ < 5) { const t = X.alive(S.game)[0]; A.pick(el('pick', { id: t.id })); A['trig-confirm'](); }
  if (vm.runInContext('checkWin', ctx)(S.game)) { A.finish(); check('end screen'); break; }
}
check('final');
console.log('winner:', S.game.winner && S.game.winner.title, '| alive', X.alive(S.game).length);
// post-game review: ballots and night actions were recorded, items exist, end screen shows them
{
  const g = S.game; const rv = X.reviewGame(g);
  const nItems = rv.players.reduce((a, x) => a + x.items.length, 0);
  console.log('ballots:', (g.ballots || []).length, 'nightLog:', (g.nightLog || []).length, 'dayLog:', (g.dayLog || []).length, 'review items:', nItems);
  if (!(g.ballots || []).length || !(g.nightLog || []).length || nItems < 10) { fails++; console.log('FAIL: review data missing'); }
  if (!g.log.some(l => /(\d+(, \d+)*|—) — \d/.test(l.text))) { fails++; console.log('FAIL: ballot rows not in journal'); }
  if (!app.innerHTML.includes('rv-head')) { fails++; console.log('FAIL: review not on end screen'); }
  const top = rv.players.slice().sort((a, b) => b.items.length - a.items.length).slice(0, 3);
  top.forEach(x => { const p = X.P(g, x.id); console.log(`  ${p.seat} ${p.name} (${X.ROLE[p.roleId].name}) useful ${x.useful} good ${x.good} bad ${x.bad}`); x.items.slice(0, 6).forEach(it => console.log(`     [${it.verdict}] ${it.when} · ${it.action} ${it.target} — ${it.reason} ${it.pts}${it.better ? ' | ' + it.better : ''}`)); });
  A['rv-toggle'](el('rv-toggle', { id: top[0].id })); check('review opened');
  if (!app.innerHTML.includes('rv-items')) { fails++; console.log('FAIL: review items not rendered'); }
  const recordedUseful = S.profiles.slice(0, 3).filter(p => p.history.some(h => h.gameId === g.id && typeof h.useful === 'number')).length;
  if (recordedUseful < 1) { fails++; console.log('FAIL: usefulness not recorded in history'); }
}
const recorded = S.profiles.slice(0,3).filter(p => p.history.some(h => h.gameId === S.game.id)).length;
console.log('profiles with recorded game:', recorded);
if (recorded < 1) { fails++; console.log('FAIL: game result not recorded into profiles'); }
A.go(el('go', { to: 'profiles' })); check('profiles list');
A['prof-open'](el('prof-open', { id: S.profiles[0].id })); check('profile page');
A['prof-allroles'](); check('profile all roles');
A['prof-like'](el('prof-like', { id: S.profiles[0].id })); check('profile liked');
A['prof-edit'](el('prof-edit', { id: S.profiles[0].id })); check('profile edit sheet');
A.pf({ dataset: { a: 'pf', k: 'city' }, value: 'Львів' }); A['prof-save'](el('prof-save', { id: S.profiles[0].id })); check('profile saved');
A.go(el('go', { to: 'ratings' })); check('ratings server');
for (const sc of ['city', 'country', 'roles']) { A['rt-set'](el('rt-set', { k: 'scope', v: sc })); check('ratings ' + sc); }
for (const pe of ['week', 'month']) { A['rt-set'](el('rt-set', { k: 'period', v: pe })); check('ratings period ' + pe); }
A['rt-set'](el('rt-set', { k: 'scope', v: 'server' })); A['rt-set'](el('rt-set', { k: 'period', v: 'all' }));
A['prof-new'](el('prof-new', {})); A.pf({ dataset: { a: 'pf', k: 'name' }, value: 'Новый' }); A['prof-save'](el('prof-save', { id: '' })); check('new profile created');
A['prof-del'](el('prof-del', { id: S.ui.profileId })); A['prof-del'](el('prof-del', { id: S.ui.profileId })); check('profile deleted');
A['demo-remove'](); check('demo removed');
// shop: buy a card and a scenario, start a scenario game
A.go(el('go', { to: 'shop' })); check('shop');
A.buy(el('buy', { kind: 'role', id: 'arsonist' })); check('buy sheet role');
A['buy-confirm'](el('buy-confirm', { kind: 'role', id: 'arsonist' })); check('bought role');
A.buy(el('buy', { kind: 'scen', id: 'chaos' })); check('buy sheet scen');
A['buy-confirm'](el('buy-confirm', { kind: 'scen', id: 'chaos' })); check('bought scen');
A['scen-use'](el('scen-use', { id: 'chaos' })); check('setup from scenario');
S = X.S(); console.log('chaos comp', S.setup.n, S.setup.comp.join(','));
const unowned = S.setup.comp.filter(id => X.ROLE[id].premium && !S.owned.roles.includes(id));
console.log('unowned in comp:', unowned.length);
unowned.forEach(id => A['buy-confirm'](el('buy-confirm', { kind: 'role', id })));
check('setup all owned');
A.deal(); check('deal scenario');
S = X.S(); for (let i = 0; i < S.game.players.length; i++) { A.flip(); A.hide(); }
A.start(); guard = 0; while (S.game.steps[S.game.stepIdx] && guard++ < 60) A.next();
A.day0(); guard = 0; while (X.alive(S.game)[S.game.speechIdx] && guard++ < 60) A.speech(el('speech', { d: '1' }));
rounds = 0;
while (!S.game.winner && rounds++ < 10) {
  A.night();
  guard = 0;
  while (S.game.steps[S.game.stepIdx] && guard++ < 80) {
    const st = S.game.steps[S.game.stepIdx];
    if (st.type === 'act' && !st.disabled) {
      if (st.modes && st.modes.includes('ignite') && rounds === 2) { A.mode(el('mode', { id: 'ignite' })); A.confirm(); check('ignite'); A.next(); continue; }
      const targets = vm.runInContext('stepTargets', ctx)(S.game, st).filter(x => x.ok).map(x => x.p.id);
      const need = st.targetsByMode ? st.targetsByMode[S.ui.mode] : st.targets;
      if (targets.length >= need) { for (let k = 0; k < need; k++) A.pick(el('pick', { id: targets[k] })); A.confirm(); check('scen night ' + st.roleId); }
      else { A.skip(); continue; }
    }
    A.next();
  }
  A.resolve(); check(`scen round ${rounds} morning`);
  if (vm.runInContext('checkWin', ctx)(S.game)) { A.stage(el('stage', { id: 'balagan' })); break; }
  A.stage(el('stage', { id: 'vote' }));
  const a2 = X.alive(S.game); if (a2.length < 3) break;
  A.cand(el('cand', { id: a2[0].id })); a2.slice(1).forEach(v => A.vote(el('vote', { c: a2[0].id, v: v.id })));
  check(`scen round ${rounds} vote`);
  resolveVote(`scen round ${rounds}`); check(`scen round ${rounds} result`);
  guard = 0; while (S.game.pendingTriggers.length && guard++ < 5) { const t = X.alive(S.game)[0]; A.pick(el('pick', { id: t.id })); A['trig-confirm'](); }
  if (vm.runInContext('checkWin', ctx)(S.game)) { A.finish(); check('scen end'); break; }
}
console.log('scenario winner:', S.game.winner && S.game.winner.title, 'extra', (S.game.extraWinners || []).length);
A.new(); check('new after end');
// ---------------- classic (sport) mafia, 10 players ----------------
{
  const RUN = vm.runInContext.bind(vm); const E = name => RUN(name, ctx);
  A['scen-use'](el('scen-use', { id: 'classic' })); check('classic setup');
  S = X.S(); if (S.setup.n !== 10 || S.setup.comp.filter(x => x === 'citizen').length !== 6 || !app.innerHTML.includes('Классика') && !app.innerHTML.includes('lassic') && !app.innerHTML.includes('Класика')) { fails++; console.log('FAIL classic setup', S.setup.n, S.setup.comp.join(',')); }
  A.deal(); for (let i = 0; i < 10; i++) { A.flip(); A.hide(); }
  A.start(); check('classic night0');
  let g = S.game; if (!g.mods.classic) { fails++; console.log('FAIL classic mod not set'); }
  let gd = 0; while (g.steps[g.stepIdx] && gd++ < 20) A.next();
  A.day0(); check('classic day1 speeches');
  if (g.phase !== 'day' || g.day !== 1 || g.dayStage !== 'speeches') { fails++; console.log('FAIL classic day 1 should start with speeches', g.phase, g.day, g.dayStage); }
  const order = E('speakOrder')(g); if (order[0].seat !== 1) { fails++; console.log('FAIL day1 first speaker should be seat 1'); }
  // day 1: a single nomination → no vote
  A['nom-open'](el('nom-open', { id: order[0].id })); check('classic nominate picker');
  A.nominate(el('nominate', { id: order[0].id, t: order[2].id })); check('classic nominated');
  if (g.ballot.candidates.length !== 1) { fails++; console.log('FAIL nomination not recorded'); }
  A.nominate(el('nominate', { id: order[0].id, t: order[3].id })); if (g.ballot.candidates.length !== 1) { fails++; console.log('FAIL second nomination by same speaker must be refused'); }
  gd = 0; while (g.dayStage === 'speeches' && gd++ < 20) A.speech(el('speech', { d: '1' }));
  check('classic vote day1 single'); if (X.voteOutcome(g).kind !== 'skip1') { fails++, console.log('FAIL expected skip1, got', X.voteOutcome(g).kind); }
  A['vote-close'](); if (g.dayStage !== 'vote') { fails++; console.log('FAIL vote-close must not resolve a day-1 single candidate'); }
  A['vote-none'](); check('classic day1 no vote'); if (g.dayStage !== 'result' || g.voteResult.eliminatedId) { fails++; console.log('FAIL day1 single candidate should skip the vote'); }
  // night 1: family shot, don check, sheriff check (no shoot mode)
  A.night(); check('classic night1');
  gd = 0; while (g.steps[g.stepIdx] && gd++ < 20) {
    const st = g.steps[g.stepIdx];
    if (st.roleId === 'sheriff' && st.modes && st.modes.includes('shoot')) { fails++; console.log('FAIL classic sheriff must not shoot'); }
    if (st.type === 'act') { const t = E('stepTargets')(g, st).filter(x => x.ok).map(x => x.p.id); if (t.length) { A.pick(el('pick', { id: t[0] })); A.confirm(); } else A.skip(); }
    check('classic night1 ' + st.roleId); A.next();
  }
  A.resolve(); check('classic morning (best move)');
  if (g.nightResult.removed.length) {
    if (!app.innerHTML.includes('bm-pick')) { fails++; console.log('FAIL best move panel missing'); }
    const al = X.alive(g); A['bm-pick'](el('bm-pick', { id: al[0].id })); A['bm-pick'](el('bm-pick', { id: al[1].id })); A['bm-pick'](el('bm-pick', { id: al[2].id })); A['bm-pick'](el('bm-pick', { id: al[3].id }));
    if (S.ui.pick.length !== 3) { fails++; console.log('FAIL best move allows max 3'); }
    A['bm-save'](el('bm-save', {})); check('classic best move saved'); if (!g.bestMove || g.bestMove.picks.length !== 3) { fails++; console.log('FAIL best move not saved'); }
  }
  A.stage(el('stage', { id: 'speeches' })); check('classic day2 speeches');
  const order2 = E('speakOrder')(g); if (order2[0].seat === 1 && X.alive(g).some(p => p.seat === 1)) { fails++; console.log('FAIL day 2 first speaker must shift'); }
  // fouls: 4 fouls remove a player
  const fp = X.alive(g)[X.alive(g).length - 1]; A.sheet(el('sheet', { id: 'players' })); A.player(el('player', { id: fp.id })); check('classic player edit (fouls)');
  for (let k = 0; k < 4; k++) A['foul-add'](el('foul-add', { id: fp.id }));
  if (fp.alive || fp.fouls !== 4) { fails++; console.log('FAIL 4 fouls must remove the player'); } A['sheet-close']();
  // day 2: two nominations, votes → tie → defence → re-vote → tie → lift all
  let rounds = 0; let liftUsed = false;
  while (!g.winner && rounds++ < 12) {
    if (g.dayStage === 'speeches') {
      const ord = E('speakOrder')(g); const al = X.alive(g);
      if (ord.length >= 4) { A.nominate(el('nominate', { id: ord[0].id, t: ord[2].id })); A.nominate(el('nominate', { id: ord[1].id, t: ord[3].id })); }
      else if (ord.length >= 2) A.nominate(el('nominate', { id: ord[0].id, t: ord[1].id }));
      gd = 0; while (g.dayStage === 'speeches' && gd++ < 30) A.speech(el('speech', { d: '1' }));
      check(`classic round ${rounds} vote`);
      if (!g.ballot.candidates.length) { A['vote-none'](); if (g.dayStage !== 'result') { fails++; console.log('FAIL no candidates → night'); break; } if (E('checkWin')(g)) { A.finish(); break; } A.night(); continue; }
      const b = g.ballot; const voters = al.filter(v => !b.candidates.includes(v.id) && X.voteWeight(g, v.id) === 1);
      if (b.candidates.length >= 2 && rounds === 1 && voters.length >= 2) { A.vote(el('vote', { c: b.candidates[1], v: b.candidates[0] })); A.vote(el('vote', { c: b.candidates[0], v: b.candidates[1] })); voters.forEach((v, i) => A.vote(el('vote', { c: b.candidates[i % 2], v: v.id }))); }
      else voters.forEach((v, i) => A.vote(el('vote', { c: b.candidates[i % b.candidates.length], v: v.id })));
      const res = E('resolveVoteAuto'); A['vote-close'](); check(`classic round ${rounds} closed`);
      if (g.dayStage === 'tie') {
        gd = 0; while (g.dayStage === 'tie' && gd++ < 10) A['tie-speech'](el('tie-speech', { d: '1' }));
        check(`classic round ${rounds} revote`);
        const b2 = g.ballot; const v2 = X.alive(g).filter(v => !(b2.excludedVoters || []).includes(v.id) && !b2.candidates.includes(v.id) && X.voteWeight(g, v.id) === 1);
        // force a second tie → lift all
        if (v2.length >= 2 && b2.candidates.length === 2) { A.vote(el('vote', { c: b2.candidates[0], v: v2[0].id })); A.vote(el('vote', { c: b2.candidates[1], v: v2[1].id })); v2.slice(2).forEach((v, i) => A.vote(el('vote', { c: b2.candidates[i % 2], v: v.id }))); }
        A['vote-close'](); check(`classic round ${rounds} revote closed`);
        if (g.dayStage === 'lift') {
          const need = E('liftNeed')(g); const al2 = X.alive(g);
          al2.slice(0, need).forEach(p => A['lift-toggle'](el('lift-toggle', { id: p.id }))); check('classic lift all voting');
          A['lift-finish'](); check('classic lift all result'); liftUsed = true;
          if (g.dayStage !== 'result' || !g.voteResult.lift || !g.voteResult.lift.passed || g.voteResult.removed.length < 2) { fails++; console.log('FAIL lift all should remove both tied', g.dayStage, JSON.stringify(g.voteResult && g.voteResult.lift), g.voteResult && g.voteResult.removed.length); }
          if (!g.log.some(l => /\d+/.test(l.text) && l.text.includes(String(need)))) { /* soft */ }
        }
      }
      if (g.dayStage !== 'result') { fails++; console.log('FAIL classic vote not resolved', g.dayStage); break; }
      if (E('checkWin')(g)) { A.finish(); check('classic end'); break; }
      A.night();
    }
    if (g.phase === 'night') {
      gd = 0; while (g.steps[g.stepIdx] && gd++ < 20) { const st = g.steps[g.stepIdx]; if (st.type === 'act') { const t = E('stepTargets')(g, st).filter(x => x.ok).map(x => x.p.id); if (t.length) { A.pick(el('pick', { id: t[t.length - 1] })); A.confirm(); } else A.skip(); } A.next(); }
      A.resolve(); check(`classic round ${rounds} morning`);
      if (E('checkWin')(g)) { A.stage(el('stage', { id: 'speeches' })); check('classic end via morning'); break; }
      if (g.night === 1 && g.nightResult.removed.length && !g.bestMove) A['bm-save'](el('bm-save', { skip: '1' }));
      A.stage(el('stage', { id: 'speeches' }));
    }
  }
  console.log('classic winner:', g.winner && g.winner.title, '| day', g.day, 'alive', X.alive(g).length, '| lift-all used:', liftUsed);
  if (!liftUsed) { fails++; console.log('FAIL classic lift-all path not exercised'); }
  if (!g.winner) { fails++; console.log('FAIL classic game did not finish'); }
  check('classic final');
}
clearInterval(X.T.iv);
// ---------------- diplomacy pack ----------------
{
  const E = name => vm.runInContext(name, ctx); const u = X.U();
  A['buy-confirm'](el('buy-confirm', { kind: 'pack', id: 'diplomacy' })); A.go(el('go', { to: 'shop' })); check('shop with pack');
  if (!app.innerHTML.includes('pack-card')) { fails++; console.log('FAIL pack card missing in shop'); }
  A['scen-use'](el('scen-use', { id: 'big_politics' })); check('pack setup');
  S = X.S(); const packRoles = X.PACKS.diplomacy.roles; const have = packRoles.filter(r => S.setup.comp.includes(r));
  if (have.length < 12 || S.setup.n !== 16) { fails++; console.log('FAIL pack scenario comp', S.setup.n, have.length, S.setup.comp.join(',')); }
  A.deal(); for (let i = 0; i < S.setup.n; i++) { A.flip(); A.hide(); }
  A.start(); let g = S.game; let gd = 0; while (g.steps[g.stepIdx] && gd++ < 40) A.next();
  A.day0(); gd = 0; while (X.alive(g)[g.speechIdx] && gd++ < 40) A.speech(el('speech', { d: '1' }));
  const by = id => g.players.find(p => p.roleId === id);
  const T = { blackmailer: by('sheriff').id, provocateur: by('doctor').id, treasurer: by('doctor').id, notary: by('mayor').id, pastor: by('notary').id, gambler: by('doctor').id, peacemaker: by('lobbyist').id, puppeteer: by('gambler').id };
  const runNight = (picks, skipOthers) => {
    A.night(); gd = 0;
    while (g.steps[g.stepIdx] && gd++ < 60) {
      const st = g.steps[g.stepIdx];
      if (st.type === 'act' && !st.disabled) {
        const want = picks[st.roleId]; const ok = E('stepTargets')(g, st).filter(x => x.ok).map(x => x.p.id);
        if (want && ok.includes(want)) { A.pick(el('pick', { id: want })); A.confirm(); }
        else if (!skipOthers && ok.length >= st.targets && st.roleId !== 'sheriff') { for (let k = 0; k < st.targets; k++) A.pick(el('pick', { id: ok[k] })); A.confirm(); }
        else { A.skip(); continue; }
      }
      A.next();
    }
    A.resolve();
  };
  runNight(T, true); check('pack morning');
  const doc = by('doctor'), sher = by('sheriff'), mayor = by('mayor'), notary = by('notary'), gambler = by('gambler'), puppeteer = by('puppeteer'), prosecutor = by('prosecutor'), lobbyist = by('lobbyist');
  if (!g.ballot.candidates.includes(doc.id)) { fails++; console.log('FAIL provocateur: forced candidate missing'); }
  if (X.voteWeight(g, sher.id) !== -1) { fails++; console.log('FAIL blackmail weight', X.voteWeight(g, sher.id)); }
  if (X.voteWeight(g, mayor.id) !== 3) { fails++; console.log('FAIL certified mayor weight', X.voteWeight(g, mayor.id)); }
  if (X.canNominate(g, notary.id)) { fails++; console.log('FAIL sanctuary: notary can still be nominated'); }
  if (!g.log.some(l => l.text.includes(doc.name))) { fails++; console.log('FAIL provocation not logged'); }
  A.stage(el('stage', { id: 'vote' })); check('pack vote screen');
  if (!app.innerHTML.includes(X.tt(u.capNeg, { seat: sher.seat })) || !app.innerHTML.includes(X.tt(u.capAnon, { seat: doc.seat }))) { fails++; console.log('FAIL vote caps missing'); }
  A.cand(el('cand', { id: notary.id })); if (g.ballot.candidates.includes(notary.id)) { fails++; console.log('FAIL sanctuary ignored by cand'); }
  const other = X.alive(g).find(p => p.id !== doc.id && !X.ROLE[p.roleId].premium && p.id !== notary.id) || X.alive(g).find(p => p.id !== doc.id && p.id !== notary.id);
  A.cand(el('cand', { id: other.id }));
  A.vote(el('vote', { c: doc.id, v: puppeteer.id })); A.vote(el('vote', { c: other.id, v: gambler.id }));
  let t = X.tally(g); if (t.eff[gambler.id] !== doc.id) { fails++; console.log('FAIL puppet vote does not follow the puppeteer'); }
  A['prosecute-open'](el('prosecute-open', { id: prosecutor.id })); check('prosecutor picker');
  A.prosecute(el('prosecute', { id: prosecutor.id, c: doc.id })); t = X.tally(g);
  const rowDoc = t.rows.find(r => r.cid === doc.id); if (!rowDoc.x2 || rowDoc.anon !== 2 || !prosecutor.prosecuteUsed) { fails++; console.log('FAIL prosecution/anon', JSON.stringify(rowDoc)); }
  X.alive(g).filter(p => ![puppeteer.id, gambler.id, doc.id, sher.id].includes(p.id)).forEach(p => A.vote(el('vote', { c: doc.id, v: p.id })));
  A.vote(el('vote', { c: doc.id, v: sher.id })); // −1 vote
  check('pack vote filled');
  const o = X.voteOutcome(g); if (o.kind !== 'leader' || o.id !== doc.id) { fails++; console.log('FAIL expected doctor leader', o.kind); }
  A['vote-finish'](el('vote-finish', { id: doc.id })); check('pack vote result');
  if (doc.alive) { fails++; console.log('FAIL doctor not eliminated'); }
  if (gambler.betHits !== 1) { fails++; console.log('FAIL gambler bet not counted', gambler.betHits); }
  if (lobbyist.alive && g.ballot.votes[lobbyist.id] === doc.id && lobbyist.lobbyHits !== 1) { fails++; console.log('FAIL lobbyist hit not counted'); }
  // ambassador immunity, then real expulsion
  const amb = by('ambassador');
  runNight({}, true); A.stage(el('stage', { id: 'vote' })); A.cand(el('cand', { id: amb.id }));
  X.alive(g).filter(p => p.id !== amb.id).forEach(p => A.vote(el('vote', { c: amb.id, v: p.id })));
  A['vote-finish'](el('vote-finish', { id: amb.id })); check('ambassador immunity');
  if (!g.voteResult.immune || g.voteResult.immune.kind !== 'ambassador' || !amb.alive || !amb.immunityUsed) { fails++; console.log('FAIL ambassador immunity', JSON.stringify(g.voteResult.immune)); }
  if (!app.innerHTML.includes(u.immunityTitle)) { fails++; console.log('FAIL immunity box missing'); }
  runNight({}, true); A.stage(el('stage', { id: 'vote' })); A.cand(el('cand', { id: amb.id }));
  X.alive(g).filter(p => p.id !== amb.id).forEach(p => A.vote(el('vote', { c: amb.id, v: p.id })));
  A['vote-finish'](el('vote-finish', { id: amb.id })); if (amb.alive) { fails++; console.log('FAIL ambassador survived twice'); }
  // peacemaker shield + chairman tie-break
  const chair = by('chairman'), peace = by('peacemaker');
  if (chair.alive && peace.alive) {
    const shieldT = X.alive(g).find(p => ![chair.id, peace.id, peace.lastShield].includes(p.id) && !X.ROLE[p.roleId].premium) || X.alive(g).find(p => ![chair.id, peace.id, peace.lastShield].includes(p.id));
    runNight({ peacemaker: shieldT.id }, true); A.stage(el('stage', { id: 'vote' }));
    const al = X.alive(g); const A1 = shieldT, B1 = al.find(p => ![shieldT.id, chair.id].includes(p.id));
    A.cand(el('cand', { id: A1.id })); A.cand(el('cand', { id: B1.id }));
    const voters = al.filter(p => ![A1.id, B1.id, chair.id].includes(p.id) && X.voteWeight(g, p.id) === 1 && !(X.FX(g, 'follow')[p.id] && X.FX(g, 'follow')[p.id].day === g.day));
    const nA = Math.floor((voters.length - 1) / 2); // A gets nA + chairman, B gets nA + 1 → a tie that the Chairman breaks
    voters.slice(0, nA).forEach(v => A.vote(el('vote', { c: A1.id, v: v.id }))); voters.slice(nA, 2 * nA + 1).forEach(v => A.vote(el('vote', { c: B1.id, v: v.id })));
    A.vote(el('vote', { c: A1.id, v: chair.id }));
    const o2 = X.voteOutcome(g);
    if (X.voteWeight(g, chair.id) === 1 && (o2.kind !== 'leader' || o2.id !== A1.id || !o2.chairman)) { fails++; console.log('FAIL chairman should break the tie', o2.kind, JSON.stringify(X.tally(g).rows.map(r => r.total))); }
    A['vote-finish'](el('vote-finish', { id: A1.id })); check('shield + chairman result');
    if (!g.voteResult.immune || g.voteResult.immune.kind !== 'shield' || !A1.alive) { fails++; console.log('FAIL peacemaker shield', JSON.stringify(g.voteResult.immune)); }
    else if (!g.voteResult.chairman && X.voteWeight(g, chair.id) === 1) { /* chairman note is only set on an actual expulsion */ }
  } else console.log('  (chairman/peacemaker test skipped — dead)');
  // review handles pack abilities; finish the game via host
  const rv = X.reviewGame(g); const packActs = (g.nightLog || []).filter(a => ['negvote', 'provoke', 'stuff', 'certify', 'sanctuary', 'bet', 'shield', 'puppet'].includes(a.ability)).length + (g.dayLog || []).filter(d => d.ability === 'prosecute').length;
  const packItems = ['blackmailer', 'provocateur', 'treasurer', 'notary', 'pastor', 'prosecutor'].map(by).filter(Boolean).reduce((a, p) => a + rv.byId[p.id].items.length, 0);
  if (packActs < 5 || packItems < 5) { fails++; console.log('FAIL review has no pack items', packActs, packItems); }
  console.log('pack game: day', g.day, 'alive', X.alive(g).length, 'pack actions', packActs, 'review items of pack actors', packItems);
}
// ---------------- counter-picks ----------------
{
  const E = name => vm.runInContext(name, ctx); const u = X.U();
  const missing = X.ROLES.filter(r => !(X.COUNTERS[r.id] || []).length).map(r => r.id);
  const badIds = [].concat(...Object.values(X.COUNTERS)).filter(id => !X.ROLE[id]);
  if (missing.length || badIds.length) { fails++; console.log('FAIL counters missing for', missing, 'bad ids', badIds); }
  const noReverse = X.ROLES.filter(r => !(X.COUNTERED_BY[r.id] || []).length && r.id !== 'citizen').map(r => r.id);
  console.log('roles:', X.ROLES.length, '| counters for all:', missing.length === 0, '| roles that counter nobody:', noReverse.join(',') || '—');
  A.go(el('go', { to: 'cards' })); A.role(el('role', { id: 'kamikaze' })); check('role sheet counters');
  if (!app.innerHTML.includes('counter-chip') || !app.innerHTML.includes(X.ROLE.sapper.name)) { fails++; console.log('FAIL counters section missing on the role sheet'); }
  A['sheet-close']();
  // a game with the four new cards
  A.new(); S = X.S(); S.setup.n = 15; S.setup.scenario = null;
  S.setup.comp = ['don', 'kamikaze', 'thug', 'treasurer', 'blackmailer', 'ambassador', 'sheriff', 'doctor', 'sapper', 'bailiff', 'auditor', 'judge', 'bomb', 'prosecutor', 'citizen'];
  X.render(); check('counter game setup');
  A.deal(); for (let i = 0; i < 15; i++) { A.flip(); A.hide(); }
  A.start(); let g = S.game; let gd = 0; while (g.steps[g.stepIdx] && gd++ < 40) A.next();
  A.day0(); gd = 0; while (X.alive(g)[g.speechIdx] && gd++ < 40) A.speech(el('speech', { d: '1' }));
  const by = id => g.players.find(p => p.roleId === id);
  const runNight = (picks) => { A.night(); gd = 0; while (g.steps[g.stepIdx] && gd++ < 60) { const st = g.steps[g.stepIdx]; if (st.type === 'act' && !st.disabled) { const want = picks[st.roleId]; const ok = E('stepTargets')(g, st).filter(x => x.ok).map(x => x.p.id); if (want && ok.includes(want)) { A.pick(el('pick', { id: want })); A.confirm(); } else { A.skip(); continue; } } A.next(); } A.resolve(); };
  const sher = by('sheriff'), bomb = by('bomb'), judge = by('judge'), kam = by('kamikaze'), amb = by('ambassador'), bailiff = by('bailiff'), sapper = by('sapper');
  runNight({ sapper: bomb.id, thug: judge.id, blackmailer: sher.id, treasurer: sher.id, auditor: sher.id }); check('counter morning 1');
  if (!bomb.defused) { fails++; console.log('FAIL sapper did not defuse the bomb'); }
  if (X.voteWeight(g, sher.id) !== 1) { fails++; console.log('FAIL auditor should cancel blackmail', X.voteWeight(g, sher.id)); }
  A.stage(el('stage', { id: 'balagan' })); A.stage(el('stage', { id: 'vote' })); A.cand(el('cand', { id: sher.id })); A.cand(el('cand', { id: amb.id }));
  let t = X.tally(g); if (t.rows.find(r => r.cid === sher.id).anon !== 0) { fails++; console.log('FAIL auditor should annul anonymous votes'); }
  check('counter vote 1');
  if (app.innerHTML.includes(`data-a="judge" data-id="${judge.id}"`)) { fails++; console.log('FAIL intimidated judge still has a button'); }
  if (!X.dayAbilityBlocked(g, judge.id)) { fails++; console.log('FAIL judge not intimidated'); }
  if (!app.innerHTML.includes('data-a="kam"')) { fails++; console.log('FAIL kamikaze should still be available on day 1'); }
  X.alive(g).filter(p => p.id !== amb.id).forEach(p => A.vote(el('vote', { c: amb.id, v: p.id })));
  if (!app.innerHTML.includes(`data-a="bailiff" data-id="${bailiff.id}"`)) { fails++; console.log('FAIL bailiff button missing'); }
  A.bailiff(el('bailiff', { id: bailiff.id })); check('counter final verdict');
  if (!g.ballot.final || !bailiff.finalUsed || app.innerHTML.includes(`data-a="judge"`)) { fails++; console.log('FAIL bailiff final not applied'); }
  A['vote-finish'](el('vote-finish', { id: amb.id })); check('counter ambassador expelled despite immunity');
  if (amb.alive || g.voteResult.immune) { fails++; console.log('FAIL final verdict should bypass immunity'); }
  // night 2: defuse the kamikaze; day 2: no kamikaze button, bomb leaves without taking neighbours
  runNight({ sapper: kam.id }); check('counter morning 2');
  if (!E('fxOn')(g, 'defused', kam.id)) { fails++; console.log('FAIL kamikaze not defused'); }
  A.stage(el('stage', { id: 'balagan' })); if (app.innerHTML.includes('data-a="kam"')) { fails++; console.log('FAIL defused kamikaze still has a button'); }
  A.stage(el('stage', { id: 'vote' })); A.cand(el('cand', { id: bomb.id })); X.alive(g).filter(p => p.id !== bomb.id).forEach(p => A.vote(el('vote', { c: bomb.id, v: p.id })));
  A['vote-finish'](el('vote-finish', { id: bomb.id })); check('counter bomb defused');
  if (bomb.alive || g.voteResult.removed.length !== 1) { fails++; console.log('FAIL defused bomb should not take neighbours', g.voteResult.removed.length); }
  const rv = X.reviewGame(g); const sapItems = rv.byId[sapper.id].items.length; if (sapItems < 2) { fails++; console.log('FAIL review lacks sapper items', sapItems); }
  console.log('counter game ok: day', g.day, 'alive', X.alive(g).length, 'sapper review items', sapItems);
}
console.log('forced ties:', forcedTies, 'roulettes:', roulettes);
console.log(fails ? `\n${fails} FAILED of ${shots}` : `\nALL OK (${shots} renders)`);
process.exit(fails ? 1 : 0);
