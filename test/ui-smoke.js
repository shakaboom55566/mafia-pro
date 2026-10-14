// UI smoke test with a minimal DOM shim: drives the screens through the ACT handlers and checks rendered HTML.
const fs = require('fs'); const vm = require('vm');
const src = ['02-i18n.js', '02a-i18n-ru-roles.js', '02b-i18n-uk.js', '02c-i18n-en.js', '02d-i18n-pl.js', '02e-i18n-hy.js', '02g-i18n-profiles.js', '02h-i18n-premium.js', '02i-i18n-fixes.js', '02j-i18n-vote.js', '02k-i18n-review.js', '02l-i18n-classic.js', '02m-i18n-diplomacy.js', '02n-i18n-counters.js', '02o-i18n-cloud.js', '02p-i18n-online.js', '02r-i18n-intro.js', '02s-i18n-mini.js', '02s-i18n-privacy.js', '02f-icons.js', '02-data.js', '03-engine.js', '04-ui.js', '05-profiles.js', '07-review.js', '08-telegram.js', '09-online.js', '09b-online-classic.js', '06-shop.js'].map(f => fs.readFileSync(__dirname + '/../src/' + f, 'utf8')).join('\n');
const app = { innerHTML: '' };
const store = {};
const ctx = {
  console, Math, Date, Object, Array, Set, Number, String, JSON, setInterval, clearInterval, setTimeout, clearTimeout,
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } },
  document: { querySelector: s => s === '#app' ? app : null, addEventListener() {}, createElement: () => ({ className: '', textContent: '', remove() {} }), body: { appendChild() {} } },
};
ctx.window = { scrollTo() {}, AudioContext: null, webkitAudioContext: null }; ctx.navigator = { language: 'ru' }; ctx.requestAnimationFrame = () => 1; ctx.Intl = Intl;
ctx.self = ctx; vm.createContext(ctx);
vm.runInContext(src + '\nthis.X = { ACT, S: () => S, render, P, alive, ROLE, T, voteOutcome, voteWeight, reviewGame, label, PACKS, canNominate, tally, FX, U: () => U(), tt, COUNTERS, COUNTERED_BY, ROLES, dayAbilityBlocked, grantOwned };', ctx);
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
const L_e = k => vm.runInContext('L.e', ctx)[k];
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
// sample profiles are gone from the app: the test creates its own three players
vm.runInContext("[['Артём','artem_k','Днепр','UA'],['Олена','olena_sh','Київ','UA'],['Mykola','mykola_dp','Днепр','UA']].forEach(([name, username, city, country], i) => S.profiles.push(newProfile({ name, username, city, country, color: i })))", ctx);
check('home');
A.go(el('go', { to: 'cards' })); check('cards');
A.filter(el('filter', { id: 'black' })); check('cards black');
A.role(el('role', { id: 'rabbi' })); check('role sheet');
A['sheet-close']();
A.go(el('go', { to: 'scenarios' })); check('scenarios (free tab)');
{ const h = app.innerHTML; const u = X.U(); if (!h.includes(u.scenFreeTab) || !h.includes(u.scenPaidTab)) { fails++; console.log('FAIL scenario tabs missing'); } if (h.includes('scen-card classic') === false) { fails++; console.log('FAIL free tab must show the classic card'); } if (/баланса|балансу/i.test(h.split('<div class="stack">')[0])) { fails++; console.log('FAIL title still says "баланса"'); }
  if (X.S().ui.scenTab !== 'free') { fails++; console.log('FAIL scenarios must open on the free tab'); } }
A['scen-tab'](el('scen-tab', { id: 'paid' })); check('scenarios (paid tab)');
{ const h = app.innerHTML; if (!h.includes('scen-card premium') || h.includes('scen-card classic')) { fails++; console.log('FAIL paid tab must list premium scenarios only'); } }
A.go(el('go', { to: 'home' })); A.go(el('go', { to: 'scenarios' })); if (X.S().ui.scenTab !== 'free') { fails++; console.log('FAIL reopening scenarios must reset to the free tab'); }
// v43: intro scenarios for beginners — five per table, free cards only, no Citizen card, every table 7–24 covered
{ const u = X.U(); const introFor = vm.runInContext('introFor', ctx); const ROLE = X.ROLE;
  for (let n = 7; n <= 24; n++) { const list = introFor(n); const ids = list.map(s => s.id).join();
    if (list.length !== 5 || ids !== 'first,detective,guard,trumps,third') { fails++; console.log('FAIL intro: five themed line-ups expected for', n, ids); }
    list.forEach(s => { if (s.comp.length !== n || s.comp.includes('citizen') || s.comp.some(id => !ROLE[id] || ROLE[id].premium) || s.comp.filter(id => id === 'don').length !== (n >= 20 ? 2 : 1)) { fails++; console.log('FAIL intro: bad composition', n, s.id, s.comp.join()); }
      if (!s.name || !s.lore || Math.abs(s.mafia + s.city + s.maniac - 100) > 1.5) { fails++; console.log('FAIL intro: text or balance missing', n, s.id); } }); }
  A['intro-n'](el('intro-n', { n: '15' })); check('scenarios intro 15');
  const h = app.innerHTML; if (!h.includes(u.introTitle) || (h.match(/scen-card intro/g) || []).length !== 5 || !h.includes(introFor(15)[2].name)) { fails++; console.log('FAIL intro section: title, five cards or theme names missing'); }
  A['intro-use'](el('intro-use', { n: '15', id: 'guard' })); check('setup from intro 15');
  const st = X.S().setup; if (X.S().screen !== 'setup' || st.n !== 15 || st.scenario || st.comp.join() !== introFor(15)[2].comp.join()) { fails++; console.log('FAIL intro-use must open setup with that line-up'); }
  if (!app.innerHTML.includes('okbox') || !app.innerHTML.includes(X.tt(u.okSimIntro, { name: introFor(15)[2].name, m: introFor(15)[2].mafia, c: introFor(15)[2].city, x: '' }))) { fails++; console.log('FAIL setup must show the intro line-up balance note'); }
  A.comp(el('comp', { id: 'mafia', d: '1' })); if (app.innerHTML.includes('okbox') || app.innerHTML.includes(u.okSimIntro.slice(1, 12))) { fails++; console.log('FAIL changed intro line-up must lose its balance note'); }
  A.go(el('go', { to: 'scenarios' })); }
A.go(el('go', { to: 'myprofile' })); check('my profile (none yet)');
{ const h = app.innerHTML; if (!h.includes('data-a="prof-new"')) { fails++; console.log('FAIL my profile should offer to create one'); } }
A.go(el('go', { to: 'clubs' })); check('clubs (outside Telegram)');
if (X.S().tab !== 'clubs') { fails++; console.log('FAIL clubs tab not highlighted'); }
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
  if (vm.runInContext('checkWin', ctx)(S.game)) { A.finish(); check('end screen');
    { const h = app.innerHTML; const n = S.game.players.length; const pods = (h.match(/class="pod-card /g) || []).length; const wraps = (h.match(/card3d-wrap/g) || []).length;
      if (pods !== n || wraps < n) { fails++; console.log('FAIL podium must show a 3D card per player: cards=' + pods + ' wraps=' + wraps + ' players=' + n); }
      if (!h.includes('pod-medal m1') || !h.includes('pod-medal m3')) { fails++; console.log('FAIL podium medals missing'); }
      if (!h.includes('data-a="prof-open"')) { fails++; console.log('FAIL podium cards must open the player profile'); }
      const streakRe = /pod-streak/; const anyProfileStreak = S.profiles.some(p => { let k = 0; for (let i = p.history.length - 1; i >= 0; i--) { const x = p.history[i]; if (!x.won) break; k++; } return k >= 2; });
      if (anyProfileStreak && !streakRe.test(h)) { fails++; console.log('FAIL a player with a win streak must get the gold streak line'); } }
    break; }
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
A.back(); if (X.S().screen !== 'profiles') { fails++; console.log('FAIL back from a profile must return where it was opened from, got ' + X.S().screen); }
A['prof-new'](el('prof-new', { me: '1' })); A.pf({ dataset: { a: 'pf', k: 'name' }, value: 'Я' }); A['prof-save'](el('prof-save', { id: '' })); check('my profile created');
if (X.S().screen !== 'myprofile' || !X.S().meId) { fails++; console.log('FAIL saving "my profile" should open the My profile screen, got ' + X.S().screen); }
A['prof-open'](el('prof-open', { id: S.profiles[0].id })); check('profile page again');
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
if (!app.innerHTML.includes(X.U().buyInTg)) { fails++; console.log('FAIL buy sheet outside Telegram must send to Telegram'); }
A['buy-confirm'](el('buy-confirm', { kind: 'role', id: 'arsonist' })); check('buy outside Telegram');
// v41: outside Telegram the buy button never unlocks anything (it used to be a free "demo" purchase)
if (X.S().owned.roles.includes('arsonist')) { fails++; console.log('FAIL a card was unlocked without payment'); }
X.grantOwned('role', 'arsonist'); check('bought role'); // what a paid Stars invoice does
A.buy(el('buy', { kind: 'scen', id: 'chaos' })); check('buy sheet scen');
A['buy-confirm'](el('buy-confirm', { kind: 'scen', id: 'chaos' }));
if (X.S().owned.scenarios.includes('chaos')) { fails++; console.log('FAIL a scenario was unlocked without payment'); }
X.grantOwned('scen', 'chaos'); check('bought scen');
A['scen-use'](el('scen-use', { id: 'chaos' })); check('setup from scenario');
S = X.S(); console.log('chaos comp', S.setup.n, S.setup.comp.join(','));
const unowned = S.setup.comp.filter(id => X.ROLE[id].premium && !S.owned.roles.includes(id));
console.log('unowned in comp:', unowned.length);
unowned.forEach(id => X.grantOwned('role', id));
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
  A['buy-confirm'](el('buy-confirm', { kind: 'pack', id: 'diplomacy' })); if (X.S().owned.packs.includes('diplomacy')) { fails++; console.log('FAIL the pack was unlocked without payment'); }
  X.grantOwned('pack', 'diplomacy'); A.go(el('go', { to: 'shop' })); check('shop with pack');
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
// ---------------- v46: the first speaker moves every day (all modes), Back over a finished step, Azazel killed at night ----------------
{
  const RUN = vm.runInContext.bind(vm); const E = name => RUN(name, ctx);
  const F = msg => { fails++; console.log('FAIL', msg); };
  const hasUndo = () => app.innerHTML.includes('data-a="undo-phase"');
  A.new(); S = X.S(); S.setup.n = 10; S.setup.scenario = null;
  S.setup.comp = ['don', 'mafia', 'mafia', 'sheriff', 'doctor', 'azazel', 'mayor', 'citizen', 'citizen', 'citizen'];
  X.render(); A.deal(); for (let i = 0; i < 10; i++) { A.flip(); A.hide(); }
  A.start(); let g = S.game; let gd = 0; while (g.steps[g.stepIdx] && gd++ < 40) A.next();
  A.day0(); check('v46 day0 with back');
  if (!hasUndo()) F('day 0 should offer Back to the night');
  A['undo-phase'](); g = S.game; check('v46 back to night 0');
  if (g.phase !== 'night0' || hasUndo()) F('Back from day 0 should return to the meeting night (once)');
  A.day0(); g = S.game; gd = 0; while (X.alive(g)[g.speechIdx] && gd++ < 40) A.speech(el('speech', { d: '1' }));
  A.night(); g = S.game; check('v46 night 1 with back');
  if (!hasUndo()) F('night step 1 should offer Back to the day');
  A['undo-phase'](); g = S.game; if (g.phase !== 'day0') F('Back from the night should return to day 0');
  A.night(); g = S.game;
  const by = id => g.players.find(p => p.roleId === id); const az = by('azazel');
  gd = 0; while (g.steps[g.stepIdx] && gd++ < 60) { const st = g.steps[g.stepIdx]; if (st.type === 'act' && !st.disabled) { const ok = E('stepTargets')(g, st).filter(x => x.ok).map(x => x.p.id); if (st.ability === 'shoot' && ok.includes(az.id)) { A.pick(el('pick', { id: az.id })); A.confirm(); } else { A.skip(); continue; } } A.next(); }
  A.resolve(); g = S.game; check('v46 morning: Azazel killed');
  if (by('azazel').alive) F('Azazel should be shot at night');
  if (!g.pendingTriggers.some(x => x.night)) F('night Azazel trigger missing');
  if (!app.innerHTML.includes(E('esc')(X.tt(X.U().azazelNightHint, { seat: az.seat })))) F('host hint about Azazel missing in the morning');
  if (!hasUndo()) F('morning should offer Back to the night');
  A['undo-phase'](); g = S.game; check('v46 back to the night');
  if (g.phase !== 'night' || g.steps[g.stepIdx] || !g.players.find(p => p.roleId === 'azazel').alive) F('Back from the morning should return to the end of the night, Azazel alive');
  A.resolve(); g = S.game; const first1 = E('speakOrder')(g)[0];
  A.stage(el('stage', { id: 'balagan' })); A.stage(el('stage', { id: 'speeches' })); check('v46 day 1 speeches');
  if (!app.innerHTML.includes(X.tt(X.U().firstSpeaker, { seat: first1.seat }))) F('first speaker hint should show in role mode');
  if (E('voteOrder')(g)[0].id !== first1.id) F('the vote should start from the day\'s first speaker');
  A.stage(el('stage', { id: 'vote' }));
  const cand = X.alive(g).find(p => p.roleId === 'citizen'); A.cand(el('cand', { id: cand.id }));
  X.alive(g).filter(p => p.id !== cand.id).forEach(p => A.vote(el('vote', { c: cand.id, v: p.id })));
  A['vote-finish'](el('vote-finish', { id: cand.id })); g = S.game; check('v46 results: Azazel may take a player');
  if (!app.innerHTML.includes('data-a="trig-skip"') || !app.innerHTML.includes(X.U().trigAzazelNight)) F('night Azazel choice (with skip) missing at the results');
  if (!hasUndo()) F('results should offer Back to the vote');
  A['trig-skip'](); g = S.game; check('v46 Azazel let it go');
  if (g.pendingTriggers.length) F('skip should clear the night trigger');
  A['undo-phase'](); g = S.game; check('v46 back to the vote');
  if (g.dayStage !== 'vote' || !g.pendingTriggers.some(x => x.night) || !g.players.find(p => p.id === cand.id).alive) F('Back from the results should return to the vote');
  A['vote-finish'](el('vote-finish', { id: cand.id })); g = S.game;
  const victim = X.alive(g).find(p => p.roleId === 'mafia' || p.roleId === 'don');
  A.pick(el('pick', { id: victim.id })); A['trig-confirm'](); g = S.game; check('v46 Azazel took a player');
  if (g.players.find(p => p.id === victim.id).alive || g.pendingTriggers.length) F('Azazel should take the picked player');
  if (!g.voteResult.removed.some(d => d.id === victim.id)) F('the taken player should be listed at the results');
  // day 2: next living seat after day 1's first speaker
  A.night(); g = S.game; gd = 0; while (g.steps[g.stepIdx] && gd++ < 60) { const st = g.steps[g.stepIdx]; if (st.type === 'act' && !st.disabled) { A.skip(); continue; } A.next(); }
  A.resolve(); g = S.game; check('v46 morning 2');
  if (g.pendingTriggers.length) F('Azazel acts only once');
  const al2 = X.alive(g); const want = (al2.find(p => p.seat > first1.seat) || al2[0]).seat;
  const first2 = E('speakOrder')(g)[0];
  if (first2.seat !== want) F(`day 2 should start from seat ${want}, got ${first2.seat}`);
  if (E('voteOrder')(g)[0].id !== first2.id) F('day 2 vote should start from the first speaker');
  A.stage(el('stage', { id: 'balagan' })); A.stage(el('stage', { id: 'speeches' })); check('v46 day 2 speeches');
  console.log('v46 ok: first speakers', first1.seat, '→', first2.seat);
}
// ---------------- v47: the host's voting table — every voter picks a player, candidates appear by the vote ----------------
{
  const RUN = vm.runInContext.bind(vm); const E = name => RUN(name, ctx);
  const F = msg => { fails++; console.log('FAIL', msg); };
  A.new(); S = X.S(); S.setup.n = 10; S.setup.scenario = null;
  S.setup.comp = ['don', 'mafia', 'mafia', 'sheriff', 'doctor', 'mayor', 'journalist', 'judge', 'bomb', 'drunk'];
  X.render(); A.deal(); for (let i = 0; i < 10; i++) { A.flip(); A.hide(); }
  A.start(); let g = S.game; let gd = 0; while (g.steps[g.stepIdx] && gd++ < 40) A.next();
  A.day0(); gd = 0; while (X.alive(g)[g.speechIdx] && gd++ < 40) A.speech(el('speech', { d: '1' }));
  A.night(); g = S.game; gd = 0; while (g.steps[g.stepIdx] && gd++ < 60) { const st = g.steps[g.stepIdx]; if (st.type === 'act' && !st.disabled) { A.skip(); continue; } A.next(); }
  A.resolve(); g = S.game; A.stage(el('stage', { id: 'vote' })); check('v47 vote table empty');
  const vs = E('voteOrder')(g); const h0 = app.innerHTML;
  if ((h0.match(/class="vt-row/g) || []).length !== vs.length) F('one table row per voter expected');
  if (!h0.includes(`data-a="vt-pick" data-v="${vs[0].id}"`)) F('first voter should have the player list open');
  const a = vs[3], bb = vs[5];
  A['vt-pick'](el('vt-pick', { v: vs[0].id, c: a.id })); check('v47 first vote');
  if (!g.ballot.candidates.includes(a.id) || g.ballot.votes[vs[0].id] !== a.id) F('a vote should make the player a candidate');
  A['vt-more'](el('vt-more', { v: vs[1].id })); check('v47 other player list');
  A['vt-pick'](el('vt-pick', { v: vs[1].id, c: bb.id })); A['vt-pick'](el('vt-pick', { v: vs[2].id, c: a.id }));
  A['vt-pick'](el('vt-pick', { v: vs[1].id, c: a.id })); check('v47 changed vote');
  if (g.ballot.candidates.includes(bb.id)) F('a candidate nobody votes for any more (not nominated on purpose) should go');
  A['vt-pick'](el('vt-pick', { v: vs[0].id, c: vs[0].id })); if (g.ballot.votes[vs[0].id] !== a.id) F('nobody votes for himself');
  A['vt-pick'](el('vt-pick', { v: vs[2].id, c: a.id })); if (g.ballot.votes[vs[2].id]) F('tapping the chosen player again clears the vote');
  A.cand(el('cand', { id: bb.id })); A['vt-pick'](el('vt-pick', { v: vs[2].id, c: bb.id })); A['vt-pick'](el('vt-pick', { v: vs[2].id, c: bb.id }));
  if (!g.ballot.candidates.includes(bb.id)) F('a candidate nominated on purpose stays without votes');
  vs.filter(v => v.id !== a.id && !g.ballot.votes[v.id]).forEach(v => A['vt-pick'](el('vt-pick', { v: v.id, c: a.id }))); A['vt-pick'](el('vt-pick', { v: a.id, c: bb.id })); check('v47 everyone voted');
  if (!app.innerHTML.includes(X.U().allVoted)) F('all voted note missing');
  if (X.voteOutcome(g).kind !== 'leader') F('expected a leader after the table vote');
  A['vote-finish'](el('vote-finish', { id: a.id })); check('v47 result');
  console.log('v47 ok: table rows', vs.length);
}
// ---------------- v48: re-seating before the deal — draft numbers for everybody, "Seat them" applies all at once ----------------
{
  const F = msg => { fails++; console.log('FAIL', msg); };
  A.new(); S = X.S(); S.setup.n = 7; S.setup.scenario = null; S.setup.comp = ['don', 'mafia', 'sheriff', 'doctor', 'drunk', 'bomb', 'bodyguard'];
  S.setup.names = ['Аня', 'Борис', 'Вика', 'Глеб', 'Даша', 'Егор', '']; S.setup.seatProfiles = [];
  S.lobby = { code: 'RS48', seats: { 101: 0, 102: 2 }, players: [{ tgId: 101, name: 'Аня' }, { tgId: 102, name: 'Вика' }] };
  A.go(el('go', { to: 'setup' })); check('v48 setup with names');
  if (!app.innerHTML.includes('data-a="reseat-open"')) F('re-seat button missing on a seated table');
  A['reseat-open'](); check('v48 re-seat panel');
  if ((app.innerHTML.match(/class="rs-row/g) || []).length !== 6) F('one row per occupied seat expected');
  const sel = (i, t) => A['reseat-sel'](el('reseat-sel', { i: String(i), value: String(t) }));
  sel(0, 2); check('v48 draft with a duplicate');
  if (S.setup.names[0] !== 'Аня') F('nobody moves while the draft is edited');
  if (!app.innerHTML.includes('class="warnbox"') || !/data-a="reseat-apply" disabled/.test(app.innerHTML)) F('a duplicate seat must block "Seat them"');
  sel(2, 1); sel(1, 0); sel(4, 6); check('v48 draft complete');
  if (/data-a="reseat-apply" disabled/.test(app.innerHTML)) F('a valid draft should allow "Seat them"');
  A['reseat-apply'](); check('v48 seated');
  const nm = S.setup.names.slice(0, 7).join(',');
  if (nm !== 'Борис,Вика,Аня,Глеб,,Егор,Даша') F('names should move all at once, got ' + nm);
  if (S.lobby.seats[101] !== 2 || S.lobby.seats[102] !== 1) F('Telegram players should move with their names: ' + JSON.stringify(S.lobby.seats));
  if (S.ui.reseatOn || app.innerHTML.includes('class="rs-row')) F('the panel should close after seating');
  A['reseat-open'](); sel(0, 3); A['reseat-cancel'](); if (S.setup.names[0] !== 'Борис' || S.ui.reseat) F('cancel keeps the seats');
  S.lobby = null;
  console.log('v48 ok:', S.setup.names.slice(0, 7).join(','));
}
// v50: small table — Sapper and Bomb, Corruption, the Ninja
{ const E = name => vm.runInContext(name, ctx); const u = X.U(); const F = m => { fails++; console.log('FAIL v50 ' + m); };
  let S = X.S(); S.game = null; A.go(el('go', { to: 'home' }));
  if (!app.innerHTML.includes('data-to="mini"') || !app.innerHTML.includes(u.miniMenu)) F('home menu has no small-table item');
  A.go(el('go', { to: 'mini' })); check('v50 small table');
  if ((app.innerHTML.match(/scen-card mini/g) || []).length !== 2) F('two small-table scenarios expected');
  A['mini-n'](el('mini-n', { n: '5' })); check('v50 small table 5');
  A['mini-rules'](el('mini-rules', { id: 'bomb_hunt' })); check('v50 rules open'); if (!app.innerHTML.includes('class="rules"')) F('rules list not shown');
  const by = (g, id) => g.players.find(p => p.roleId === id);
  const startGame = (id, n) => {
    A['mini-use'](el('mini-use', { id, n: String(n) })); S = X.S(); check(`v50 setup ${id} ${n}`);
    if (S.setup.n !== n || S.setup.scenario !== id || S.setup.comp.join() !== E('SCENARIO')[id].comps[n].join()) F(`setup of ${id} ${n}: ${S.setup.n} ${S.setup.comp.join()}`);
    if (app.innerHTML.includes('data-a="comp"')) F('the small-table line-up must be fixed');
    if (!app.innerHTML.includes('class="okbox"') || /data-a="deal"[^>]*disabled/.test(app.innerHTML)) F(`${id} ${n}: line-up should be ready to deal`);
    A.deal(); for (let i = 0; i < n; i++) { A.flip(); A.hide(); } A.start(); return S.game;
  };
  const night = (g, picks) => { A.night(); let gd = 0; while (g.steps[g.stepIdx] && gd++ < 30) { const st = g.steps[g.stepIdx]; if (st.type === 'act' && !st.disabled) { const want = picks[st.roleId]; const ok = E('stepTargets')(g, st).filter(x => x.ok).map(x => x.p.id); if (want && ok.includes(want)) { A.pick(el('pick', { id: want })); A.confirm(); check('v50 night ' + st.roleId); } else { A.skip(); continue; } } A.next(); } A.resolve(); check('v50 morning'); };
  const voteOut = (g, target) => { A.stage(el('stage', { id: 'balagan' })); A.stage(el('stage', { id: 'vote' })); A.cand(el('cand', { id: target })); X.alive(g).filter(p => p.id !== target).forEach(p => A.vote(el('vote', { c: target, v: p.id }))); check('v50 vote'); A['vote-finish'](el('vote-finish', { id: target })); check('v50 vote result'); };
  const toDay1 = g => { let gd = 0; while (g.steps[g.stepIdx] && gd++ < 30) A.next(); A.day0(); gd = 0; while (X.alive(g)[g.speechIdx] && gd++ < 20) A.speech(el('speech', { d: '1' })); };
  // 1. Sapper finds the Bomb at night, the town votes it out → the town wins
  let g = startGame('bomb_hunt', 5); toDay1(g);
  if (g.steps.some(s => s.type === 'act')) F('bomb hunt: nobody acts on night 0');
  let bomb = by(g, 'bomb'), sap = by(g, 'sapper');
  night(g, { sapper: bomb.id });
  if (!bomb.defused) F('the Sapper did not defuse the Bomb');
  if (!g.nightLog.some(a => a.roleId === 'sapper')) F('sapper action not logged');
  if (X.alive(g).length !== 5) F('nobody dies at night in the bomb hunt');
  voteOut(g, bomb.id);
  let w = E('checkWin')(g); if (!w || w.side !== 'city') F('voting out the defused Bomb should win for the town: ' + JSON.stringify(w && w.side));
  A.finish(); check('v50 end city');
  // 2. the town votes out a live Bomb → explosion, the town lost
  A.go(el('go', { to: 'mini' })); g = startGame('bomb_hunt', 6); toDay1(g); bomb = by(g, 'bomb'); sap = by(g, 'sapper');
  const notBomb = g.players.find(p => p.roleId !== 'bomb' && p.roleId !== 'sapper');
  night(g, { sapper: notBomb.id }); if (bomb.defused) F('a wrong pick must not defuse');
  voteOut(g, bomb.id);
  w = E('checkWin')(g); if (!w || w.side !== 'bomb') F('a live Bomb voted out should win: ' + JSON.stringify(w && w.side));
  if (X.alive(g).length !== 3) F('the explosion should take two neighbours, alive: ' + X.alive(g).length);
  A.finish(); check('v50 end bomb'); if (!app.innerHTML.includes('winner bomb')) F('bomb win banner');
  if (!E('resultFor')(g, bomb, g.winner).won || E('resultFor')(g, sap, g.winner).won) F('only the Bomb wins its explosion');
  // engine edge rules: 1:1 duels and the Sapper gone
  { const h = E('newGame')(4, ['bomb', 'sapper', 'citizen', 'citizen'], [], {}, [], { bombHunt: true }); const hb = by(h, 'bomb'), hs = by(h, 'sapper'), hc = h.players.filter(p => p.roleId === 'citizen');
    hc.forEach(p => { p.alive = false; }); if ((E('checkWin')(h) || {}).side !== 'city') F('Sapper and Bomb 1:1 → the Sapper wins');
    hc[0].alive = true; hs.alive = false; if ((E('checkWin')(h) || {}).side !== 'bomb') F('Bomb and a townsperson 1:1 → the town lost');
    hc[1].alive = true; if ((E('checkWin')(h) || {}).side !== 'bomb') F('Sapper gone, Bomb live → the town lost');
    hb.defused = true; if (E('checkWin')(h)) F('Sapper gone but the Bomb already defused → the game goes on'); }
  // 3. Corruption: recruitment on night 0, the recruit's limits, a new recruit after the old one leaves
  A.go(el('go', { to: 'mini' })); g = startGame('corruption', 6); S = X.S();
  const corr = by(g, 'corrupter'), sher = by(g, 'sheriff'), man = by(g, 'maniac'), nin = by(g, 'ninja'), doc = by(g, 'doctor');
  const st0 = g.steps[g.steps.length - 1]; if (!st0 || st0.type !== 'act' || st0.roleId !== 'corrupter') F('night 0 should end with the Corrupter recruiting');
  if (g.steps.some(s => s.type === 'meet' && s.roleId === 'don')) F('a lone Corrupter has no family meeting');
  while (g.steps[g.stepIdx] && g.steps[g.stepIdx].type !== 'act') A.next();
  A.pick(el('pick', { id: doc.id })); A.confirm(); check('v50 recruit picked'); if (doc.recruitedBy !== corr.id) F('recruit not set');
  A.undo(); if (doc.recruitedBy) F('undo must cancel the recruitment');
  A.pick(el('pick', { id: sher.id })); A.confirm(); check('v50 recruit result'); if (sher.recruitedBy !== corr.id) F('sheriff not recruited');
  if (!app.innerHTML.includes(X.tt(L_e('recruitDone'), { target: X.label(sher), actor: X.label(corr) }).slice(0, 20))) F('recruit result not shown to the host');
  A.next(); A.day0(); let gd = 0; while (X.alive(g)[g.speechIdx] && gd++ < 20) A.speech(el('speech', { d: '1' }));
  A.night(); if (g.steps.some(s => s.roleId === 'corrupter')) F('no new recruitment while the recruit lives');
  if (g.steps.some(s => s.ability === 'shoot' && s.roleId === 'don')) F('the Corrupter does not shoot');
  const ss = g.steps.find(s => s.roleId === 'sheriff'); if (E('stepTargets')(g, ss).find(x => x.p.id === corr.id).ok) F('a recruited Sheriff cannot target the Corrupter');
  // the maniac shoots the ninja once → dodged
  let gd2 = 0; while (g.steps[g.stepIdx] && gd2++ < 30) { const st = g.steps[g.stepIdx]; if (st.type === 'act' && st.roleId === 'maniac') { A.pick(el('pick', { id: nin.id })); A.confirm(); } else if (st.type === 'act') { A.skip(); continue; } A.next(); }
  A.resolve(); check('v50 ninja morning'); if (!nin.alive) F('the Ninja should dodge one shot');
  if (!g.log.some(x => x.text.includes(X.tt(L_e('ninjaDodge'), { by: '', target: '' }).slice(-12)))) F('dodge not in the log');
  // the recruit cannot vote against the Corrupter (host vote table)
  A.stage(el('stage', { id: 'balagan' })); A.stage(el('stage', { id: 'vote' })); A.cand(el('cand', { id: corr.id })); check('v50 vote table');
  A['vt-pick'](el('vt-pick', { v: sher.id, c: corr.id })); if (g.ballot.votes[sher.id]) F('the recruit voted against the Corrupter');
  if (E('effectiveVotes')(g)[sher.id]) F('a recruit vote against the Corrupter must not count');
  // win rule: the mafia needs a majority (2 vs 2 is not enough)
  { const h = E('newGame')(6, ['corrupter', 'sheriff', 'doctor', 'mayor', 'maniac', 'ninja'], [], {}, [], { corruption: true, mafiaMajority: true }); const c = by(h, 'corrupter'), d = by(h, 'doctor');
    d.recruitedBy = c.id; ['sheriff', 'mayor'].forEach(r => { by(h, r).alive = false; }); if (E('checkWin')(h)) F('2 vs 2: no winner yet under the majority rule');
    by(h, 'ninja').alive = false; if ((E('checkWin')(h) || {}).side !== 'mafia') F('2 vs 1: the mafia wins');
    if (!E('resultFor')(h, d, E('checkWin')(h)).won) F('the recruit wins with the mafia');
    c.alive = false; d.alive = false; by(h, 'ninja').alive = true; by(h, 'sheriff').alive = true; if ((E('checkWin')(h) || {}).side !== 'city') F('no Corrupter and no recruit: the town wins');
    const h2 = E('newGame')(6, ['corrupter', 'sheriff', 'doctor', 'mayor', 'maniac', 'ninja'], [], {}, [], { corruption: true }); const c2 = by(h2, 'corrupter'); by(h2, 'mayor').recruitedBy = c2.id; by(h2, 'mayor').alive = false;
    h2.night = 1; const steps = E('buildNightSteps')(h2); if (!steps.some(s => s.roleId === 'corrupter' && s.ability === 'recruit')) F('a new recruitment after the recruit left'); }
  S.game = null;
  console.log('v50 ok');
}
// v51: a finished game does not pull the host back — Back and the Game tab lead home, the results are on the home screen
{ const u = X.U(); const F = m => { fails++; console.log('FAIL v51 ' + m); }; const E = name => vm.runInContext(name, ctx);
  const S = X.S(); A.go(el('go', { to: 'mini' })); A['mini-use'](el('mini-use', { id: 'bomb_hunt', n: '5' })); A.deal(); for (let i = 0; i < 5; i++) { A.flip(); A.hide(); } A.start();
  const g = S.game; const bomb = g.players.find(p => p.roleId === 'bomb'); bomb.alive = false; bomb.defused = true; A.finish(); check('v51 finished');
  if (!g.winner) F('game should be finished');
  for (const scr of ['tables', 'mini', 'cards', 'scenarios', 'shop', 'game']) {
    A.go(el('go', { to: scr })); A.back(el('back')); if (S.screen !== 'home') F(`Back from ${scr} after a finished game went to ${S.screen}`);
  }
  A.tab(el('tab', { id: 'game' })); if (S.screen !== 'home') F('the Game tab after a finished game should open home, got ' + S.screen);
  check('v51 home'); if (!app.innerHTML.includes(u.lastGame) || !app.innerHTML.includes(X.tt(g.winner.title, {}))) F('home should offer the last game results');
  A.continue(); if (S.screen !== 'game' || !app.innerHTML.includes('class="winner')) F('the results item opens the finished game'); check('v51 results again');
  // a live game still comes back
  S.game.winner = null; A.go(el('go', { to: 'tables' })); A.back(el('back')); if (S.screen !== 'game') F('Back during a live game returns to it');
  S.game = null; S.screen = 'home'; console.log('v51 ok');
}
// v52: the home menu no longer repeats the tab bar (cards, clubs, ratings)
{ const S = X.S(); S.game = null; A.go(el('go', { to: 'home' })); check('v52 home');
  const menu = (app.innerHTML.split('class="menu"')[1] || '').split('</nav>')[0].split('class="tabbar"')[0];
  ['cards', 'clubs', 'ratings'].forEach(t => { if (menu.includes(`data-to="${t}"`)) { fails++; console.log('FAIL v52 home menu still has ' + t); } });
  ['cards', 'clubs', 'ratings'].forEach(t => { if (!app.innerHTML.includes(`data-a="tab" data-id="${t}"`)) { fails++; console.log('FAIL v52 tab bar lost ' + t); } }); }
console.log('forced ties:', forcedTies, 'roulettes:', roulettes);
console.log(fails ? `\n${fails} FAILED of ${shots}` : `\nALL OK (${shots} renders)`);
process.exit(fails ? 1 : 0);
