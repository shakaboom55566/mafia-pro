// UI smoke test with a minimal DOM shim: drives the screens through the ACT handlers and checks rendered HTML.
const fs = require('fs'); const vm = require('vm');
const src = ['02-i18n.js', '02a-i18n-ru-roles.js', '02b-i18n-uk.js', '02c-i18n-en.js', '02d-i18n-pl.js', '02e-i18n-hy.js', '02g-i18n-profiles.js', '02h-i18n-premium.js', '02i-i18n-fixes.js', '02j-i18n-vote.js', '02k-i18n-review.js', '02l-i18n-classic.js', '02m-i18n-diplomacy.js', '02n-i18n-counters.js', '02o-i18n-cloud.js', '02p-i18n-online.js', '02q-i18n-discord.js', '02r-i18n-intro.js', '02s-i18n-mini.js', '02s-i18n-privacy.js', '02t-i18n-v53.js', '02u-i18n-ranks.js', '02v-i18n-skins.js', '02w-i18n-skins-epic.js', '02x-i18n-guide.js', '02y-i18n-fouls.js', '02z-i18n-emeralds.js', '02za-i18n-hostview.js', '02zb-i18n-mythic.js', '02zc-i18n-rooms.js', '02f-icons.js', '02-data.js', '03-engine.js', '04-ui.js', '05-profiles.js', '07-review.js', '08-telegram.js', '09-online.js', '09b-online-classic.js', '11-ranks.js', '12-skins.js', '13-guide.js', '14-fouls.js', '15-emeralds.js', '16-host-view.js', '17-mythic.js', '18-rooms.js', '06-shop.js'].map(f => fs.readFileSync(__dirname + '/../src/' + f, 'utf8')).join('\n');
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
  // v65: the classic cards — the Sheriff only checks; the setup list, the deal card, the role sheet from the deal and the night script say so
  { const cc = E('L.classicCards') || E('I18N.ru.classicCards'); const hs = app.innerHTML; if (!hs.includes(cc.sheriff.short) || hs.includes(E('L.roles.sheriff.short'))) { fails++; console.log('FAIL classic setup lists the classic Sheriff card'); } }
  A.deal(); { const cc = E('L.classicCards') || E('I18N.ru.classicCards'); let seen = 0; for (let i = 0; i < 10; i++) { A.flip(); const p = S.game.players[S.game.dealIdx]; const h = app.innerHTML; if (p.roleId === 'sheriff') { seen++; if (!h.includes(cc.sheriff.short) || !h.includes(cc.sheriff.lore) || h.includes(E('L.roles.sheriff.short'))) { fails++; console.log('FAIL classic deal: the Sheriff card must say checks only'); } A.role(el('role', { id: 'sheriff' })); const sh = app.innerHTML; if (!cc.sheriff.rules.every(r => sh.includes(r)) || !sh.includes(cc.sheriff.tip)) { fails++; console.log('FAIL classic deal: the role sheet shows the classic rules'); } A['sheet-close'](); } if (p.roleId === 'don' && !h.includes(cc.don.short)) { fails++; console.log('FAIL classic deal: the Don card is the classic one'); } if (p.roleId === 'mafia' && !h.includes(cc.mafia.short)) { fails++; console.log('FAIL classic deal: the Mafia card is the classic one'); } A.hide(); } if (seen !== 1) { fails++; console.log('FAIL exactly one Sheriff dealt', seen); } }
  A.start(); check('classic night0');
  let g = S.game; if (!g.mods.classic) { fails++; console.log('FAIL classic mod not set'); }
  { const st = E('buildNightSteps')(g).find(x => x.roleId === 'sheriff' && x.type === 'act'); if (!st || st.script !== E('L.e.script2.sheriffClassic') || !st.modes || st.modes.length !== 1 || st.modes[0] !== 'check') { fails++; console.log('FAIL classic night: the Sheriff step is a check with the classic script', st && st.modes, st && st.script); } }
  S.ui.sheet = { type: 'role', id: 'sheriff', mods: null }; X.render(); if (!app.innerHTML.includes(E('L.roles.sheriff.short'))) { fails++; console.log('FAIL the gallery sheet keeps the role-game Sheriff'); } S.ui.sheet = null; X.render();
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
  { const al1 = X.alive(g); const want1 = (al1.find(p => p.seat > g.day0FirstSeat) || al1[0]).seat; if (g.day0FirstSeat !== 1 || first1.seat !== want1) F(`v64: day 1 minutes start after the introductions' opener (seat ${g.day0FirstSeat}) — want ${want1}, got ${first1.seat}`); }
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
    if (S.setup.n !== n || S.setup.scenario !== id || S.setup.comp.join() !== E('scenarioComp')(E('SCENARIO')[id], n, { bombs: S.setup.bombs }).join()) F(`setup of ${id} ${n}: ${S.setup.n} ${S.setup.comp.join()}`);
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
  // 2. the town votes out a live Bomb → explosion, the mafia wins (v53: the Bombs are the mafia)
  A.go(el('go', { to: 'mini' })); g = startGame('bomb_hunt', 6); toDay1(g); bomb = by(g, 'bomb'); sap = by(g, 'sapper');
  const notBomb = g.players.find(p => p.roleId !== 'bomb' && p.roleId !== 'sapper');
  night(g, { sapper: notBomb.id }); if (bomb.defused) F('a wrong pick must not defuse');
  voteOut(g, bomb.id);
  w = E('checkWin')(g); if (!w || w.side !== 'mafia') F('a live Bomb voted out should win for the mafia: ' + JSON.stringify(w && w.side));
  if (X.alive(g).length !== 3) F('the explosion should take two neighbours, alive: ' + X.alive(g).length);
  A.finish(); check('v50 end bomb'); if (!app.innerHTML.includes('winner mafia')) F('mafia win banner after the explosion');
  if (!E('resultFor')(g, bomb, g.winner).won || E('resultFor')(g, sap, g.winner).won) F('only the Bomb wins its explosion');
  // engine edge rules: 1:1 duels and the Sapper gone
  { const h = E('newGame')(4, ['bomb', 'sapper', 'citizen', 'citizen'], [], {}, [], { bombHunt: true }); const hb = by(h, 'bomb'), hs = by(h, 'sapper'), hc = h.players.filter(p => p.roleId === 'citizen');
    hc.forEach(p => { p.alive = false; }); if ((E('checkWin')(h) || {}).side !== 'city') F('Sapper and Bomb 1:1 → the Sapper wins');
    hc[0].alive = true; hs.alive = false; if ((E('checkWin')(h) || {}).side !== 'mafia') F('Bomb and a townsperson 1:1 → the mafia wins');
    hc[1].alive = true; if ((E('checkWin')(h) || {}).side !== 'mafia') F('Sapper gone, Bomb live → the mafia wins');
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
    d.alive = true; { const w2 = E('checkWin')(h); if (!w2 || w2.side !== 'city') F('v53: the Corrupter out with his recruit alive → the town wins at once'); else if (E('resultFor')(h, d, w2).won) F('v53: the recruit loses when the Corrupter is out'); }
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
// v53: Sapper and Bomb with 1–3 Bombs for the mafia; Morpheus like Azazel and only on active skills; the Corrupter buys any card
{ const E = name => vm.runInContext(name, ctx); const u = X.U(); const F = m => { fails++; console.log('FAIL v53 ' + m); };
  const by = (g, id) => g.players.find(p => p.roleId === id); const all = (g, id) => g.players.filter(p => p.roleId === id); const nOf = (c, id) => c.filter(x => x === id).length;
  let S = X.S(); S.game = null;
  // 1. the Bomb count: 5 players up to 2, 6 players up to 3; only the Sapper, Citizens and Bombs
  A.go(el('go', { to: 'mini' })); A['mini-n'](el('mini-n', { n: '5' })); check('v53 mini 5');
  if (!app.innerHTML.includes('data-a="mini-bombs" data-n="2"') || app.innerHTML.includes('data-a="mini-bombs" data-n="3"')) F('5 players: 1–2 Bombs');
  A['mini-n'](el('mini-n', { n: '6' })); A['mini-bombs'](el('mini-bombs', { n: '3' })); check('v53 mini 6 x3');
  if (!app.innerHTML.includes(u.bhBombsL[2]) || !app.innerHTML.includes('×3')) F('6 players: 3 Bombs offered and shown');
  A['mini-use'](el('mini-use', { id: 'bomb_hunt', n: '6', bombs: '3' })); S = X.S(); check('v53 setup 3 bombs');
  if (S.setup.comp.slice().sort().join() !== 'bomb,bomb,bomb,citizen,citizen,sapper') F('6 players with 3 Bombs: ' + S.setup.comp.join());
  if (/data-a="deal"[^>]*disabled/.test(app.innerHTML)) F('the 3-Bomb line-up should be ready to deal');
  if (E('compositionStats')(S.setup.comp, { bombHunt: true }).black !== 3) F('the Bombs count as the mafia');
  A.bombs(el('bombs', { d: '-1' })); check('v53 setup 2 bombs'); if (nOf(S.setup.comp, 'bomb') !== 2 || nOf(S.setup.comp, 'citizen') !== 3) F('− Bomb gives a Citizen back');
  A.bombs(el('bombs', { d: '1' })); A.bombs(el('bombs', { d: '1' })); if (nOf(S.setup.comp, 'bomb') !== 3) F('Bombs capped at 3');
  A.n(el('n', { d: '-1' })); check('v53 setup 5'); if (S.setup.n !== 5 || nOf(S.setup.comp, 'bomb') !== 2) F('5 players: the Bombs clamp to 2, got ' + S.setup.comp.join());
  A.n(el('n', { d: '1' })); if (nOf(S.setup.comp, 'bomb') !== 3) F('back to 6 players: 3 Bombs again');
  // the deal: the Bomb's card is the mafia's
  A.deal(); let g = S.game; let gd = 0, seen = 0;
  while (g.dealIdx < g.players.length && gd++ < 10) { A.flip(); if (g.players[g.dealIdx].roleId === 'bomb') { seen++; check('v53 bomb card'); if (!/class="card black/.test(app.innerHTML)) F('the bomb hunt Bomb card must be the mafia (black)'); } A.hide(); }
  if (seen !== 3) F('three Bomb cards dealt');
  A.start(); check('v53 night 0');
  const meets = g.steps.filter(s => s.roleId === 'bomb'); if (meets.length !== 3 || meets.some(s => s.members.length !== 1)) F('each Bomb wakes alone on night 0');
  const bs = all(g, 'bomb'), sap = by(g, 'sapper'), cs = all(g, 'citizen');
  if (E('checkWin')(g)) F('3 vs 3: no winner yet');
  cs[0].alive = false; { const w = E('checkWin')(g); if (!w || w.side !== 'mafia') F('3 Bombs vs 2: the mafia wins by majority'); else if (!E('resultFor')(g, bs[0], w).won || E('resultFor')(g, sap, w).won) F('the Bombs win with the mafia'); }
  cs[0].alive = true; bs[0].alive = false; bs[0].defused = true; if (E('checkWin')(g)) F('one defused Bomb out of three: the game goes on');
  bs[1].alive = false; bs[1].defused = true; bs[2].alive = false; bs[2].defused = true; { const w = E('checkWin')(g); if (!w || w.side !== 'city') F('every Bomb out defused: the town wins'); }
  bs[2].defused = false; { const w = E('checkWin')(g); if (!w || w.side !== 'mafia') F('an undefused Bomb out: the mafia wins'); }
  S.game = null;
  // 2. Morpheus: killed at night → acts at the day's results (may decline); takes only an active skill; the family shooter loses the shot
  { const h = E('newGame')(9, ['don', 'mafia', 'mafia_doctor', 'morpheus', 'sheriff', 'doctor', 'citizen', 'mayor', 'judge'], [], {}, [], {});
    const mor = by(h, 'morpheus'), don = by(h, 'don'), maf = by(h, 'mafia'), cit = by(h, 'citizen'), sh = by(h, 'sheriff'), judge = by(h, 'judge'), mayor = by(h, 'mayor');
    h.phase = 'night'; h.night = 1; h.nightResult = { removed: [{ id: mor.id, cause: 'x' }], notes: [], quiet: [] }; mor.alive = false;
    E('startDay')(h); if (!h.pendingTriggers.some(t => t.type === 'morpheus' && t.night)) F('Morpheus killed at night gets a trigger at the day results');
    // the host's result screen: the night text and the decline button
    S.game = h; h.dealt = true; h.dealIdx = h.players.length; h.dayStage = 'result'; h.voteResult = { tally: { rows: [], max: 0, leaders: [] }, removed: [], eliminatedId: null }; S.screen = 'game'; X.render(); check('v53 morpheus night trigger');
    if (!app.innerHTML.includes(u.trigMorpheusNight) || !app.innerHTML.includes('data-a="trig-skip"')) F('the night Morpheus trigger offers its text and a decline');
    A['trig-skip'](); if (h.pendingTriggers.length) F('a night Morpheus may decline');
    const take = id => { h.pendingTriggers = [{ type: 'morpheus', actorId: mor.id }]; S.ui.pick = [id]; A['trig-confirm'](); };
    take(cit.id); check('v53 morpheus none'); if (cit.disabled) F('a Citizen has nothing to take'); if (!app.innerHTML.includes(X.tt(u.morphNone, { player: X.label(cit) }).slice(0, 25))) F('the host sees that Morpheus took nothing');
    take(mayor.id); if (mayor.disabled) F('the Mayor is passive: nothing to take');
    take(maf.id); if (maf.disabled) F('a mafioso who does not shoot has nothing to take');
    take(judge.id); if (!judge.disabled || !X.dayAbilityBlocked(h, judge.id)) F('Morpheus takes the Judge\'s veto');
    take(sh.id); if (!sh.disabled) F('Morpheus takes the Sheriff\'s check');
    take(don.id); check('v53 morpheus shot'); if (!don.disabled) F('Morpheus takes the shot of the Don');
    h.night = 2; let st = E('buildNightSteps')(h).find(s => s.ability === 'shoot'); if (!st || !st.disabled) F('the family cannot shoot while the Don sits');
    don.alive = false; st = E('buildNightSteps')(h).find(s => s.ability === 'shoot'); if (!st || st.disabled) F('the next by seniority shoots once the Don leaves');
    // voted out — the same trigger right away, without a decline
    const h2 = E('newGame')(7, ['don', 'mafia', 'morpheus', 'sheriff', 'doctor', 'citizen', 'citizen'], [], {}, [], {}); E('startDay')(h2); const m2 = by(h2, 'morpheus');
    h2.ballot = { candidates: [m2.id], votes: {}, round: 1 }; E('finishVote')(h2, m2.id); const t2 = h2.pendingTriggers[0]; if (!t2 || t2.type !== 'morpheus' || t2.night || E('skipTrigger')(h2, t2)) F('voted out: Morpheus picks at once, no decline');
    S.game = null; S.screen = 'home'; S.ui.pick = []; }
  // 3. the Corrupter buys any card (even the mafia's); with two families the bought player joins the Corrupter's family
  { const h = E('newGame')(6, ['corrupter', 'don', 'sheriff', 'doctor', 'citizen', 'citizen'], [], {}, [], {}); E('startNight0')(h);
    const st = h.steps.find(s => s.ability === 'recruit'); const ok = E('stepTargets')(h, st).filter(x => x.ok).map(x => x.p.roleId);
    if (!ok.includes('don') || !ok.includes('sheriff') || ok.includes('corrupter')) F('the Corrupter buys any card but himself: ' + ok.join());
    const h2 = E('newGame')(6, ['corrupter', 'don', 'don', 'mafia', 'sheriff', 'citizen'], [], {}, [], { twoFamiliesFrom: 4 }); E('startNight0')(h2);
    const c = by(h2, 'corrupter'); const rival = h2.players.find(p => ['don', 'mafia'].includes(p.roleId) && p.family !== c.family);
    const st2 = h2.steps.find(s => s.ability === 'recruit'); E('recordAction')(h2, st2, [rival.id]); if (rival.recruitedBy !== c.id || rival.family !== c.family) F('a bought mafioso of the rival family joins the Corrupter\'s family'); }
  console.log('v53 ok');
}
// v54: ranks — a badge at the nickname, the rank card, all ranks, the wreath of the top three, the host's hat, a rank-up in the results
{ const u = X.U(); const F = m => { fails++; console.log('FAIL v54 ' + m); }; const E = name => vm.runInContext(name, ctx); const S = X.S();
  const idx = E('rankIdx'); const got = [[1000, 4], [1000, 5], [1149, 9], [1150, 9], [1350, 20], [1600, 30], [1900, 40], [2300, 50], [2900, 60], [900, 30]].map(([p, g]) => idx(p, g)).join();
  if (got !== '0,1,1,2,3,4,5,6,7,1') F('rank by rating: ' + got);
  if (!Array.isArray(u.rankNames) || u.rankNames.length !== 8 || u.rankNames.some(x => !x) || !Array.isArray(u.hostNames) || u.hostNames.length !== 3) F('rank and host names in this language');
  const ico = E('rankIco'); const top = E('CLOUD'); top.top = [{ rank: 1, tgId: 91 }, { rank: 2, tgId: 92 }, { rank: 3, tgId: 93 }, { rank: 4, tgId: 94 }];
  const plain = ico({ points: 1700, games: 60, tgId: 94 }); const wreath = ico({ points: 3000, games: 200, tgId: 91, hosted: 230 });
  if (!plain.includes('viewBox="0 0 32 32"') || plain.includes('0 0 48 32') || !plain.includes(u.rankNames[4])) F('a plain badge for №4 (Мастер): ' + plain.slice(0, 120));
  if (!wreath.includes('viewBox="0 0 48 32"') || !wreath.includes(X.tt(u.rkPlace, { n: 1 })) || !wreath.includes(u.hostNames[2])) F('№1 gets the wreath, a gold hat for 230 games hosted');
  if (ico({ points: null }) !== '' || ico(null) !== '') F('no rating → no badge');
  top.top = null;
  // a profile on this device: 6 games → Любитель, the card shows the way to Игрок
  const pr = E('newProfile')({ name: 'Ранг Тест' }); for (let i = 0; i < 6; i++) pr.history.push({ id: 'h' + i, date: Date.now(), gameId: 'old' + i, n: 7, roleId: 'sheriff', won: true, points: 24, survived: true });
  S.profiles.push(pr); S.ui.profileId = pr.id; S.screen = 'profile'; X.render(); check('v54 profile');
  if (!app.innerHTML.includes('class="rk-card r1"') || !app.innerHTML.includes(u.rankNames[1]) || !app.innerHTML.includes(u.rankNames[2])) F('the profile shows the rank card: Любитель → Игрок');
  S.screen = 'profiles'; X.render(); check('v54 profiles'); if (!app.innerHTML.includes('class="rk"')) F('the profiles list shows badges');
  S.screen = 'ratings'; X.render(); check('v54 ratings'); if (!app.innerHTML.includes('class="rk"')) F('the local rating shows badges');
  A.ranks(el('ranks', { i: '1' })); S.screen = 'profile'; X.render(); check('v54 ranks sheet');
  if (!u.rankNames.every(n => app.innerHTML.includes(n)) || !u.hostNames.every(n => app.innerHTML.includes(n)) || !app.innerHTML.includes(u.rkWreath) || !app.innerHTML.includes('class="rk-row cur"')) F('the ranks sheet lists every rank, the wreath and the host badges, marks the current one');
  S.ui.sheet = null;
  const nov = E('rankBlockHTML')({ points: 1000, games: 2 }); app.innerHTML = nov; check('v54 novice card'); if (!nov.includes(u.rankNames[0])) F('a Новичок card');
  const leg = E('rankBlockHTML')({ points: 3100, games: 300 }); app.innerHTML = leg; check('v54 legend card'); if (!leg.includes(u.rkMax)) F('Легенда: the top');
  // results: the fifth game of a profile → a rank-up on the podium
  const p5 = E('newProfile')({ name: 'Пятая' }); for (let i = 0; i < 4; i++) p5.history.push({ id: 'q' + i, date: Date.now(), gameId: 'q' + i, n: 7, roleId: 'sheriff', won: true, points: 24, survived: true });
  S.profiles.push(p5); const g = E('newGame')(7, ['don', 'mafia', 'sheriff', 'doctor', 'citizen', 'citizen', 'citizen'], [], {}, [], {}); g.dealt = true;
  const sh = g.players.find(p => p.roleId === 'sheriff'); sh.profileId = p5.id; g.players.filter(p => ['don', 'mafia'].includes(p.roleId)).forEach(p => { p.alive = false; });
  E('finishGame')(g, E('checkWin')(g)); const rows = E('resultRows')(g); const r5 = rows.find(r => r.seat === sh.seat);
  if (!r5 || r5.up !== 1 || !r5.rk || r5.rk.games !== 5) F('the fifth game: Новичок → Любитель in the results: ' + JSON.stringify(r5 && { up: r5.up, rk: r5.rk }));
  const pod = E('podiumHTML')(rows, 'pod'); app.innerHTML = pod; check('v54 podium'); if (!pod.includes(X.tt(u.rkUp, { rank: u.rankNames[1] }))) F('the podium says «new rank»');
  S.profiles = S.profiles.filter(x => x.id !== pr.id && x.id !== p5.id); S.screen = 'home'; S.ui.profileId = null; X.render(); console.log('v54 ok');
}
// v55: the Ranks tab on the ratings screen, seasons, the best of the season in the profile
{ const u = X.U(); const F = m => { fails++; console.log('FAIL v55 ' + m); }; const E = name => vm.runInContext(name, ctx); const S = X.S();
  const pr = E('newProfile')({ name: 'Сезон' }); const t0 = Date.parse('2026-10-20T12:00:00Z');
  [[24, 0], [24, 1], [-10, 2], [24, 3], [24, 4], [-60, 5]].forEach(([pts, k]) => pr.history.push({ id: 's' + k, date: t0 + k * 3600000, gameId: 'sg' + k, n: 7, roleId: 'sheriff', won: pts > 0, points: pts }));
  S.profiles.push(pr); S.meId = pr.id;
  const ls = E('localSeason'); const live = ls(pr.history, Date.parse('2026-11-01T00:00:00Z')); if (live.points !== 1026 || live.peak !== 1086 || live.season !== 1) F('season 1 on this device: rating 1026, best 1086: ' + JSON.stringify(live));
  const brk = ls(pr.history, Date.parse('2026-12-18T00:00:00Z')); if (brk.points !== 1000 || brk.peak !== 1086) F('the break: rating 1000, the best of season 1 kept: ' + JSON.stringify(brk));
  pr.history.push({ id: 's9', date: Date.parse('2026-12-25T10:00:00Z'), gameId: 'sg9', n: 7, roleId: 'sheriff', won: true, points: 28 });
  const s2 = ls(pr.history, Date.parse('2027-01-05T00:00:00Z')); if (s2.points !== 1028 || s2.season !== 2 || s2.peak !== 1028) F('season 2 counts only its own games: ' + JSON.stringify(s2));
  pr.history.pop();
  A.go(el('go', { to: 'ratings' })); A['rt-tab'](el('rt-tab', { v: 'ranks' })); check('v55 ranks tab');
  const h = app.innerHTML; const sz = E('seasonAt')(Date.now());
  if (!h.includes('data-a="rt-tab" data-v="ranks"') || !h.includes(X.tt(u.ssTitle, { n: sz.n })) || !h.includes('EPIC') || !h.includes(u.rkHowTitle) || !u.rkHow.every(x => h.includes(x)) || !u.rkSeasonRules.every(x => h.includes(x))) F('the Ranks tab: season, Epic reward, how to get a rank, season rules');
  if (!h.includes(X.tt(u.ssRewardSkin, { n: 1, skin: vm.runInContext('SKIN.amethyst_don.name', ctx) })) || !h.includes(u.rankNames[7])) F('the reward names the Legend rank and the skin (v56)');
  if (!h.includes(u.rkMine) || !h.includes('class="rk-card') || !h.includes(X.tt(u.rkPeakShort, { n: 1 }))) F('your rank with the best of the season');
  if (!u.rankNames.every(n => h.includes(n)) || !u.hostNames.every(n => h.includes(n))) F('the ladder and the host badges');
  A['rt-tab'](el('rt-tab', { v: 'rating' })); check('v55 rating tab'); if (!app.innerHTML.includes('data-a="rt-set"') || !app.innerHTML.includes('data-a="rt-tab"')) F('back to the rating, the tabs stay on top');
  S.ui.profileId = pr.id; S.screen = 'profile'; X.render(); check('v55 profile'); if (!app.innerHTML.includes(u.rkNowShort) || !app.innerHTML.includes('1026') || !app.innerHTML.includes('1086')) F('the profile: the rating now and the best of the season');
  A.ranks(el('ranks', { i: '1' })); check('v55 sheet'); if (!app.innerHTML.includes('EPIC') || !app.innerHTML.includes(u.rkHowTitle)) F('the sheet from the rank card tells the same');
  S.ui.sheet = null; S.profiles = S.profiles.filter(x => x.id !== pr.id); S.meId = null; S.ui.rtTab = 'rating'; S.screen = 'home'; X.render(); console.log('v55 ok');
}
// v56: card skins — the Skins tab, wearing a skin, the player's skin wherever he is that character, the season reward
const v56 = (async () => { const u = X.U(); const F = m => { fails++; console.log('FAIL v56 ' + m); }; const E = name => vm.runInContext(name, ctx); const S = X.S();
  const name = E('SKIN.amethyst_don.name'); if (!name || name === 'amethyst_don') F('the skin has a name in this language');
  // not signed in: the tab shows the skin as not earned, putting it on says why it cannot
  S.cloud = null; S.skins = { owned: [], equipped: {} };
  A.go(el('go', { to: 'cards' })); check('v56 cards'); if (!app.innerHTML.includes('data-a="cards-tab" data-v="skins"') || !app.innerHTML.includes('class="gallery"')) F('the Cards screen has a Cards | Skins switch over the gallery');
  A['cards-tab'](el('cards-tab', { v: 'skins' })); check('v56 skins tab'); let h = app.innerHTML;
  if (!h.includes('skin-item') || !h.includes(name) || !h.includes(u.skLocked) || !h.includes('amethyst-don.webp') || h.includes('data-a="skin-wear"')) F('the Skins tab: the skin, its picture, not earned, no button');
  if (!h.includes(X.tt(u.skHowSeason, { n: 1, rank: u.rankNames[7], date: E('seasonDayText')(E('seasonAt')(Date.now()).lastDay) }))) F('how to get it: the end of season 1 as a Legend');
  // signed in, the skin owned: put on (the server answer is mocked through api)
  S.cloud = { user: { id: 500, name: 'Me' } }; S.skins = { owned: ['amethyst_don'], equipped: {} }; X.render(); check('v56 owned'); h = app.innerHTML;
  if (!h.includes(u.skOwned) || !h.includes('data-a="skin-wear" data-id="amethyst_don" data-on="1"')) F('an owned skin can be put on');
  // the player's own card shows his skin: the deal, the night step of his role, the dead list, the review, the podium
  const me = E('newProfile')({ name: 'Я', tgId: 500 }); const fr = E('newProfile')({ name: 'Друг', tgId: 600 }); S.profiles.push(me, fr); S.meId = null; // the host never sits: «me» is a seated profile linked to my Telegram account
  S.skins.equipped = { don: 'amethyst_don' };
  A.go(el('go', { to: 'setup' })); S.setup.scenario = null; S.setup.n = 7; S.setup.comp = E('presetFor')(7); S.setup.seatProfiles = [me.id, fr.id];
  A.deal(); const g = S.game; const pm = g.players.find(p => p.profileId === me.id), pf = g.players.find(p => p.profileId === fr.id);
  const don = g.players.find(p => p.roleId === 'don'); const oth = g.players.find(p => p.roleId !== 'don' && p !== pm && p !== pf);
  // the Don is me; my friend is a sheriff with a Don skin on (it must not show on his sheriff card)
  [don.roleId, pm.roleId] = [pm.roleId, 'don']; if (pf.roleId === 'don') pf.roleId = 'sheriff';
  g.skinsOf = { 600: { don: 'amethyst_don' } }; g.skinsAt = Date.now();
  if (E('skinOfPlayer')(g, pm) !== 'amethyst_don' || E('skinOfPlayer')(g, pf) || E('skinOfPlayer')(g, oth)) F('who wears what: me — the Don skin, the friend (not the Don) and a stranger — none');
  g.dealIdx = pm.seat - 1; A.flip(); check('v56 deal me'); h = app.innerHTML; if (!h.includes('card skinned') || !h.includes('skin-layer') || !h.includes('amethyst-don.webp') || !h.includes('skin-gl')) F('my Don card at the deal is my skin (with the 3D canvas)');
  A.hide(); g.dealIdx = pf.seat - 1; A.flip(); check('v56 deal friend'); if (app.innerHTML.includes('skin-layer')) F('a sheriff card never shows a Don skin');
  A.hide(); pf.roleId = 'don'; pm.roleId = 'sheriff'; g.dealIdx = pf.seat - 1; A.flip(); check('v56 deal friend don'); if (!app.innerHTML.includes('skin-layer')) F('the friend dealt the Don shows the skin he wears');
  pf.roleId = 'sheriff'; pm.roleId = 'don'; A.hide();
  g.dealIdx = g.players.length; A.start(); let gd = 0; while (g.steps[g.stepIdx] && gd++ < 30) A.next(); A.day0(); A.night(); check('v56 night');
  const famStep = g.steps.findIndex(st => st.roleId === 'don' && st.actorId === pm.id); if (famStep >= 0) { g.stepIdx = famStep; X.render(); check('v56 night don'); if (!app.innerHTML.includes('skin-seal')) F('the night step of my Don shows my skin'); }
  pm.alive = false; g.phase = 'day'; g.dayStage = 'morning'; g.nightResult = { removed: [{ id: pm.id, cause: 'x' }], notes: [], quiet: [] }; g.openRoles = true; X.render(); check('v56 morning'); if (!app.innerHTML.includes('skin-seal')) F('the dead list shows my skin');
  g.winner = { side: 'city', title: 'T', text: 'x' }; g.extraWinners = []; X.render(); check('v56 end');
  h = app.innerHTML; if (!h.includes('skin-seal') || !h.includes('skin-layer')) F('the review and the podium show my skin');
  const rows = E('resultRows')(g); if (rows.find(r => r.seat === pm.seat).sk !== 'amethyst_don' || rows.find(r => r.seat === pf.seat).sk) F('the result rows carry the skin for the online players');
  // my profile: the best role card and my Don games show the skin
  S.game = null; S.meId = me.id; me.history.push({ id: 'h1', date: Date.now(), gameId: 'x', n: 7, roleId: 'don', won: true, points: 24 }); S.ui.profileId = me.id; S.screen = 'profile'; X.render(); check('v56 profile');
  h = app.innerHTML; if (!h.includes('skin-layer') || !h.includes('skin-seal')) F('my profile shows my skin on the Don');
  // the role sheet lists the Don's skins; the Ranks tab shows the reward with the skin
  A.role(el('role', { id: 'don' })); check('v56 role sheet'); if (!app.innerHTML.includes(u.skForRole) || !app.innerHTML.includes('data-a="skin-sheet" data-id="amethyst_don"')) F('the Don card lists its skins'); S.ui.sheet = null;
  A.role(el('role', { id: 'witch' })); if (app.innerHTML.includes(u.skForRole)) F('a card without skins lists none'); S.ui.sheet = null;
  A.go(el('go', { to: 'ratings' })); A['rt-tab'](el('rt-tab', { v: 'ranks' })); check('v56 ranks'); if (!app.innerHTML.includes('ss-skin') || !app.innerHTML.includes(X.tt(u.ssRewardSkin, { n: 1, skin: name }))) F('the season reward is the skin');
  A['skins-open'](); if (S.screen !== 'cards' || S.ui.cardsTab !== 'skins') F('the reward opens the Skins tab');
  // taking it off: the request goes to the server; a refusal puts it back
  let calls = []; vm.runInContext('TG.app = TG.app || { initData: "" }', ctx); const apiOrig = E('api'); const apiB = E('apiBase');
  vm.runInContext('globalThis.__api = api; globalThis.__apiBase = apiBase', ctx);
  ctx.__calls = calls; vm.runInContext('api = async (p, b) => { __calls.push([p, b]); return { ok: true, equipped: {} }; }; apiBase = () => "https://x.test"', ctx);
  X.render(); await A['skin-wear'](el('skin-wear', { id: 'amethyst_don', on: '0' })); if (!calls.length || calls[0][0] !== '/api/skin/equip' || calls[0][1].skin !== null || S.skins.equipped.don) F('taking the skin off asks the server and clears it');
  vm.runInContext('api = async (p, b) => { __calls.push([p, b]); return { ok: false }; }', ctx); await A['skin-wear'](el('skin-wear', { id: 'amethyst_don', on: '1' })); if (S.skins.equipped.don) F('a refused request leaves the skin off');
  vm.runInContext('api = __api; apiBase = __apiBase; TG.app = null', ctx);
  // v57: the Epic series (free cards; the first 7 now, the rest follow) as tiles; a tile opens the skin's sheet
  const SK = E('SKINS'); const free = E('ROLES').filter(r => !r.premium); const EP = SK.filter(x => x.rarity === 'epic'); const nSeries = EP.filter(x => !x.season).length; // v69: the series is the Epic skins; the Mythic one is extra
  if (nSeries < 7 || !SK.every(x => free.some(r => r.id === x.role)) || new Set(EP.map(x => x.role)).size !== EP.length) F('v57: the series — free cards only, one Epic skin per card (' + SK.length + ')');
  if (SK.some(x => !x.name || x.name === x.id || !x.lore || x.lore === x.id)) F('v57: every skin has a name and a story in this language');
  S.cloud = null; S.skins = { owned: [], equipped: {} }; S.ui.skinFilter = 'all'; A.go(el('go', { to: 'cards' })); A['cards-tab'](el('cards-tab', { v: 'skins' })); check('v57 skins tab'); h = app.innerHTML;
  if ((h.match(/class="sk-tile /g) || []).length !== nSeries || !h.includes('lilac-doctor-thumb.webp') || !h.includes(X.tt(u.skSeriesTitle, { n: nSeries })) || !h.includes('skin-item')) F('v57: the season skin on top and a tile with a thumbnail for every skin of the series');
  A['skin-filter'](el('skin-filter', { id: 'black' })); check('v57 filter mafia'); h = app.innerHTML;
  if (h.includes('data-id="lilac_doctor"') || !h.includes('data-id="orchid_surgeon"') || h.includes('skin-item')) F('v57: the Mafia filter keeps only mafia skins');
  // v60: the rarity filter — nine rarities plus «all»; works together with the team filter
  A['skin-filter'](el('skin-filter', { id: 'all' })); h = app.innerHTML;
  if ((h.match(/data-a="skin-rar"/g) || []).length !== 10 || !h.includes(u.skRarAll) || !['common', 'rare', 'uncommon', 'epic', 'legendary', 'sr', 'ssr', 'ur', 'mythic'].every(r => h.includes(u.skRar[r])) || !h.includes('>Mythical</b>') || !h.includes('>SSR</b>')) F('v60: the rarity chips — all nine with their marks');
  A['skin-rar'](el('skin-rar', { id: 'epic' })); check('v61 rarity epic'); h = app.innerHTML; if ((h.match(/class="sk-tile /g) || []).length !== nSeries || !h.includes('skin-item')) F('v60: Epic keeps the whole series and the season skin');
  A['skin-rar'](el('skin-rar', { id: 'mythic' })); check('v61 rarity mythic'); h = app.innerHTML; if (h.includes('class="sk-tile ') || (h.match(/class="skin-item /g) || []).length !== 1 || !h.includes('data-skin="untouchable"') || h.includes(X.tt(u.skRarNone, { r: u.skRar.mythic }))) F('v69: Mythical — only «Untouchable», in full');
  A['skin-filter'](el('skin-filter', { id: 'black' })); A['skin-rar'](el('skin-rar', { id: 'epic' })); h = app.innerHTML; if (h.includes('data-id="lilac_doctor"') || !h.includes('data-id="orchid_surgeon"')) F('v60: rarity and team filters work together');
  A['skin-rar'](el('skin-rar', { id: 'nonsense' })); if (S.ui.skinRar !== 'all') F('v60: an unknown rarity means all');
  A['skin-filter'](el('skin-filter', { id: 'all' })); A['skin-sheet'](el('skin-sheet', { id: 'lilac_doctor' })); check('v57 skin sheet'); h = app.innerHTML;
  if (!h.includes('sk-sheet') || !h.includes('lilac-doctor.webp') || !h.includes(X.tt(u.emSkinHow, { n: '7 500' })) || h.includes('data-a="skin-wear"') || !h.includes('data-kind="emeralds"') || !h.includes(E('SKIN.lilac_doctor.name'))) F('v57/v63: the sheet of a skin not owned: card, story, the price in emeralds, a buy button, no wear button');
  S.ui.sheet = null; S.cloud = { user: { id: 500, name: 'Me' } }; S.skins = { owned: SK.map(x => x.id), equipped: { doctor: 'lilac_doctor' } }; X.render(); check('v57 owned'); h = app.innerHTML;
  if (!h.includes(u.skMine + ' · ' + SK.length) || !h.includes('sk-tile epic own worn')) F('v57: an admin owns all — the Mine filter, the worn tile marked');
  A['skin-sheet'](el('skin-sheet', { id: 'lilac_doctor' })); h = app.innerHTML; if (!h.includes('data-a="skin-wear" data-id="lilac_doctor" data-on="0"') || h.includes(u.skHowSoon)) F('v57: the sheet of my worn skin offers to take it off');
  S.ui.sheet = null; A.role(el('role', { id: 'spy' })); h = app.innerHTML; if (!h.includes('data-a="skin-sheet" data-id="iris_shadow"')) F('v57: the Spy card lists Iris Shadow'); S.ui.sheet = null;
  A.role(el('role', { id: 'bomb' })); h = app.innerHTML; if (!h.includes('data-a="skin-sheet" data-id="tick_tock"')) F('v58: the Bomb card lists Tick-Tock'); S.ui.sheet = null;
  if (!free.every(r => SK.some(x => x.role === r.id)) || nSeries !== 32) F('v67: the Epic series is complete — a skin for every free card (' + nSeries + ')');
  A.role(el('role', { id: 'ninja' })); h = app.innerHTML; if (!h.includes('data-a="skin-sheet" data-id="silent_petal"')) F('v67: the Ninja card lists Silent Petal'); S.ui.sheet = null;
  // v69: the Mythic «Untouchable» — 50 000 emeralds, every copy numbered, the living card (▶, the empty scene for the show)
  const UT = E('SKIN.untouchable'); if (!UT || UT.rarity !== 'mythic' || UT.role !== 'ninja' || !UT.numbered || !UT.anim || !E('MYTH_ART.untouchable.stand')) F('v69: «Untouchable» is in the catalog: ninja, mythic, numbered, animated');
  { const c = E('MYTH_ART.untouchable.cine'); const dir = __dirname + '/../skins/untouchable-' + (c && c.file); if (!c || c.size.join() !== '720,1280' || !(c.dur > 5 && c.dur < 12) || !fs.existsSync(dir + '.mp4') || !fs.existsSync(dir + '.webm')) F('v70: the 3D cinematic is wired (720×1280, mp4 + webm in skins/)'); }
  A.role(el('role', { id: 'ninja' })); h = app.innerHTML; if (!h.includes('data-a="skin-sheet" data-id="untouchable"')) F('v69: the Ninja card lists «Untouchable» too'); S.ui.sheet = null;
  S.cloud = null; S.skins = { owned: [], equipped: {}, serials: {}, sold: { untouchable: 3 } }; S.em = { balance: 100, bought: [], epic: 7500, mythic: 50000 }; S.ui.skinRar = 'all'; S.ui.skinFilter = 'all'; X.render(); check('v69 skins tab'); h = app.innerHTML;
  if (!h.includes(u.skMythTitle) || h.indexOf('data-skin="untouchable"') > h.indexOf('data-skin="amethyst_don"') || !h.includes('class="skin-serial">№ <b>······</b>') || !h.includes('data-a="myth-play"') || !h.includes('untouchable-scene.webp') || !h.includes(X.tt(u.myBuyBtn, { n: '50 000' }))) F('v69: the Mythic section on top — the card with a blank number, ▶ and the buy button');
  A['skin-sheet'](el('skin-sheet', { id: 'untouchable' })); check('v69 sheet not owned'); h = app.innerHTML;
  if (!h.includes(X.tt(u.myHow, { n: '50 000' })) || !h.includes(X.tt(u.myCopyNext, { n: '000004', sold: '3' })) || !h.includes('💎 50 000') || !h.includes('data-a="em-topup"') || h.includes('data-a="skin-wear"')) F('v69: the sheet — the price 50 000, «yours will be № 000004», top up (not enough)');
  S.skins = { owned: ['untouchable'], equipped: { ninja: 'untouchable' }, serials: { untouchable: 7 }, sold: { untouchable: 9 } }; X.render(); check('v69 sheet owned'); h = app.innerHTML;
  if (!h.includes('class="skin-serial">№ <b>000007</b>') || !h.includes(X.tt(u.myCopyMine, { n: '000007', sold: '9' })) || !h.includes('data-a="skin-wear" data-id="untouchable" data-on="0"')) F('v69: my copy — № 000007 on top, «Your copy is № 000007», take off');
  S.ui.sheet = null;
  const c3 = E('card3dFor(ROLE.ninja, "t68", "untouchable", false, 0)'); if (!c3.includes('№ <b>000000</b>') || c3.includes('class="skin-gl"') || !c3.includes('skin-layer mythic anim')) F('v69: an admin copy shows № 000000');
  if (E('card3dFor(ROLE.ninja, "t68", "untouchable", true, null)').includes('skin-serial') || E('card3dFor(ROLE.ninja, "t68", "silent_petal", true, 5)').includes('skin-serial')) F('v69: no number when it is unknown or the skin is not numbered');
  vm.runInContext('SERIALS_OF[777123] = { untouchable: 42 }', ctx); if (E('serialOfTg(777123, "untouchable")') !== 42 || E('serialOfTg(777123, "silent_petal")') !== null || E('fmtSerial(42)') !== '000042' || E('fmtSerial(1234567)') !== '1234567') F('v69: the numbers of other players, six digits');
  // buying: the server answers with the number; the sheet updates and the toast names it
  S.ui.sheet = { type: 'skin', id: 'untouchable' }; S.skins = { owned: [], equipped: {}, serials: {}, sold: { untouchable: 9 } }; S.em = { balance: 60000, bought: [], epic: 7500, mythic: 50000 };
  vm.runInContext('TG.app = TG.app || { initData: "" }; globalThis.__api = api; globalThis.__apiBase = apiBase', ctx); calls = []; ctx.__calls = calls;
  vm.runInContext('api = async (p, b) => { __calls.push([p, b]); return { ok: true, bought: "untouchable", price: 50000, balance: 10000, serial: 10, skins: { owned: ["untouchable"], equipped: { ninja: "untouchable" }, serials: { untouchable: 10 }, sold: { untouchable: 10 } } }; }; apiBase = () => "https://x.test"', ctx);
  X.render(); h = app.innerHTML; if (!h.includes('data-a="em-skin-buy" data-id="untouchable"') || !h.includes(X.tt(u.emSkinBuy, { n: '50 000' }))) F('v69: enough emeralds — «Buy for 50 000»');
  await A['em-skin-buy'](el('em-skin-buy', { id: 'untouchable' })); h = app.innerHTML;
  if (!calls.length || calls[0][0] !== '/api/skin/buy' || calls[0][1].skin !== 'untouchable' || S.em.balance !== 10000 || E('mySerial("untouchable")') !== 10 || S.skins.sold.untouchable !== 10 || !h.includes('№ <b>000010</b>')) F('v69: bought — balance, my number 000010 on the card');
  vm.runInContext('api = __api; apiBase = __apiBase; TG.app = null', ctx); S.ui.sheet = null; S.em = { balance: 0, bought: [], epic: 7500, mythic: 50000 };
  S.ui.skinFilter = 'all';
  S.profiles = S.profiles.filter(x => x !== me && x !== fr); S.meId = null; S.cloud = null; S.skins = { owned: [], equipped: {} }; S.ui.cardsTab = 'cards'; S.screen = 'home'; X.render(); console.log('v56 ok');
})().catch(e => { fails++; console.log('FAIL v56 crashed', e && e.stack || e); });
// v59: the guide «Правила и инструкция» — the entry on the role-game setup, two parts, every chapter, labels resolved, pictures known
v56.then(() => { const u = X.U(); const F = m => { fails++; console.log('FAIL v59 ' + m); }; const E = name => vm.runInContext(name, ctx); const S = X.S();
  const G = E('window.GUIDE_TEXTS'); const g = G && G[E('L.code')]; if (!g) { F('texts for ' + E('L.code')); return; }
  const { SHOTS } = require('./guide-shots.js');
  const ids = new Set(); const bad = [];
  // v61: the classic part — its own chapters plus references to the role game's chapters ({ use: 'player.N' })
  const cl = g.classic || {}; if (!Array.isArray(cl.player) || cl.player.length < 8 || !Array.isArray(cl.host) || cl.host.length < 8 || !cl.leadPlayer || !cl.leadHost) F('classic: two parts of at least 8 chapters and leads');
  ['player', 'host'].forEach(part => (cl[part] || []).forEach((c, i) => { if (c.use) { const r = E('guideResolve')(c, g); if (!r) F(`classic ${part} ${i}: reference ${c.use} resolves`); } }));
  const parts = [['player', g.player], ['host', g.host], ['classic.player', (cl.player || []).map(c => E('guideResolve')(c, g)).filter(Boolean)], ['classic.host', (cl.host || []).map(c => E('guideResolve')(c, g)).filter(Boolean)]];
  parts.forEach(([part, list]) => { if (!Array.isArray(list) || list.length < 8) F(part + ': at least 8 chapters'); (list || []).forEach((c, i) => {
    if (!c.t || !((c.p || []).length || (c.r || []).length)) F(`${part} ${i}: title and some text`);
    (c.i || []).forEach(([id, cap]) => { ids.add(id); if (!SHOTS.includes(id)) bad.push(id); if (!cap) F(`${part} ${i}: caption of ${id}`); });
    [].concat(c.p || [], c.s || [], c.r || []).forEach(x => { const out = E('guideTxt')(x); const m = out.match(/\{\w+\}/); if (m) F(`${part} ${i}: unresolved ${m[0]} in: ${x.slice(0, 60)}`); if (/undefined/.test(out)) F(`${part} ${i}: undefined in text`); });
  }); });
  if (bad.length) F('pictures not made by test/guide-shots.js: ' + [...new Set(bad)].join(', '));
  if (ids.size < 20) F('the guide shows at least 20 different pictures (' + ids.size + ')');
  if (!g.btn || !g.btnPlayer || !g.tabPlayer || !g.tabHost || !g.leadHost || !g.chapterOf) F('meta texts');
  // the entry: on the role game's setup (not on the classic / small table), the small button at the bottom of the host's game screen
  S.game = null; S.ui.sheet = null; A.new(el('new')); check('v59 setup'); if (!app.innerHTML.includes('data-a="guide" data-id="host"') || !app.innerHTML.includes(g.btn)) F('the setup of the role game has the guide entry');
  A['scen-use'](el('scen-use', { id: 'classic' })); check('v59 classic setup'); if (!app.innerHTML.includes('data-a="guide" data-id="host" data-game="classic"')) F('the classic setup has the classic guide entry'); A.new(el('new'));
  A['mini-use'](el('mini-use', { id: 'corruption', n: '6' })); check('v61 mini setup'); if (app.innerHTML.includes('data-a="guide"')) F('the small table has no guide entry'); A.new(el('new'));
  A.guide(el('guide', { id: 'host' })); check('v59 guide host'); let h = app.innerHTML;
  if (S.screen !== 'guide' || S.ui.guideTab !== 'host' || !h.includes(g.title) || !h.includes(g.leadHost) || !h.includes(g.host[0].t) || !h.includes('gd-ch open')) F('the guide opens on the host part with the first chapter open');
  if ((h.match(/class="gd-ch( open)?"/g) || []).length !== g.host.length) F('every host chapter listed');
  if (!h.includes('/guide/' + E('L.code') + '/' + g.host[0].i[0][0] + '.jpg')) F('the first chapter shows its pictures from guide/<lang>/');
  A['guide-go'](el('guide-go', { i: '1' })); check('v59 chapter 2'); h = app.innerHTML; if (!h.includes(X.tt(g.chapterOf, { i: 2, n: g.host.length })) || h.includes(g.host[0].p[0].slice(0, 30).replace(/\*\*/g, ''))) F('"Next" opens chapter 2 and closes chapter 1');
  A['guide-all'](el('guide-all', { v: 'open' })); check('v59 all open'); h = app.innerHTML; if ((h.match(/gd-ch open/g) || []).length !== g.host.length || !h.includes(g.closeAll)) F('"open all" opens every chapter');
  g.host.forEach((c, i) => { if (!h.includes(c.t)) F('host chapter ' + i + ' rendered'); }); if (/\{\w+\}/.test(h.replace(/\{[a-z-]+\}/g, ''))) F('no unresolved placeholders on the host part');
  A['guide-tab'](el('guide-tab', { id: 'player' })); check('v59 guide player'); h = app.innerHTML; if (S.ui.guideTab !== 'player' || !h.includes(g.leadPlayer) || !h.includes(g.player[0].t)) F('the Player part');
  A['guide-all'](el('guide-all', { v: 'open' })); check('v59 player all'); h = app.innerHTML; g.player.forEach((c, i) => { if (!h.includes(c.t)) F('player chapter ' + i + ' rendered'); });
  if (!h.includes('«' + u.dealCards + '»') || !h.includes('«' + u.confirm + '»')) F('button labels of the app appear in the text as «…»');
  A['guide-img'](el('guide-img', { id: 'home' })); check('v59 zoom'); if (!S.ui.sheet || S.ui.sheet.type !== 'guideImg' || !app.innerHTML.includes('gd-zoom')) F('a picture opens in a sheet'); A['sheet-close']();
  A.back(el('back')); check('v59 back'); if (S.screen !== 'setup') F('Back returns to the setup (' + S.screen + ')');
  // v61: the classic — the entry on the classic setup, the game switch, both parts with referenced chapters
  A['scen-use'](el('scen-use', { id: 'classic' })); check('v61 classic setup'); if (!app.innerHTML.includes('data-a="guide" data-id="host" data-game="classic"')) F('the classic setup has the guide entry');
  A.guide(el('guide', { id: 'host', game: 'classic' })); check('v61 guide classic host'); h = app.innerHTML;
  if (S.ui.guideGame !== 'classic' || !h.includes(cl.leadHost) || !h.includes(cl.host[0].t) || !h.includes('data-a="guide-game" data-id="role"') || !h.includes(u.classicTitle)) F('the classic guide opens on the host part with the game switch');
  A['guide-all'](el('guide-all', { v: 'open' })); check('v61 classic host all'); h = app.innerHTML;
  parts[3][1].forEach((c, i) => { if (!h.includes(c.t)) F('classic host chapter ' + i + ' rendered: ' + c.t); });
  if (!h.includes('«' + u.closeVote + '»') || !h.includes('/guide/' + E('L.code') + '/c-night0.jpg') || !h.includes('/guide/' + E('L.code') + '/deal-closed.jpg')) F('classic host: the close-vote label, a classic picture and a referenced chapter\'s picture');
  A['guide-tab'](el('guide-tab', { id: 'player' })); A['guide-all'](el('guide-all', { v: 'open' })); check('v61 classic player all'); h = app.innerHTML;
  parts[2][1].forEach((c, i) => { if (!h.includes(c.t)) F('classic player chapter ' + i + ' rendered: ' + c.t); });
  if (!h.includes('«' + u.plYes + '»') || !h.includes('/guide/' + E('L.code') + '/c-p-hands.jpg')) F('classic player: the vote label and the hands picture');
  A['guide-game'](el('guide-game', { id: 'role' })); check('v61 back to role'); if (S.ui.guideGame !== 'role' || !app.innerHTML.includes(g.leadPlayer)) F('the switch returns to the role game');
  A.back(el('back')); if (S.screen !== 'setup') F('Back returns to the classic setup (' + S.screen + ')');
  S.game = null; S.setup.scenario = null; S.screen = 'home'; X.render(); console.log('v59 ok');
  // v63: the shop's Emeralds tab, the skin's price, the tournament screen (outside Telegram: the rules only), the home menu
  X.render(); h = app.innerHTML; if (!h.includes(u.trnMenu) || !h.includes('data-to="tournament"')) F('v63: the tournament is in the home menu');
  A.go(el('go', { to: 'shop' })); check('v63 shop cards tab'); h = app.innerHTML; if (!h.includes(u.shopSegCards) || !h.includes(u.shopSegEm) || h.includes('em-pack')) F('v62: the shop opens on cards with a segment');
  A['shop-tab'](el('shop-tab', { v: 'emeralds' })); check('v63 shop emeralds tab'); h = app.innerHTML;
  if ((h.match(/class="em-pack /g) || []).length !== 8 || (h.match(/em-badge/g) || []).length !== 8 || !h.includes('7 500') || !h.includes('<b>10 500</b>') || !h.includes('20 000') || !h.includes(X.tt(u.emFirst, { pct: 100 })) || !h.includes(X.tt(u.emFirst, { pct: 20 }))) F('v62: eight packs, every first-purchase bonus shown (7 500 → 10 500)');
  if (!h.includes(X.tt(u.emPrice, { usd: E('emUsd')(39.99), stars: 2000 })) || !h.includes(u.emTgOnly) || !h.includes(u.emEmpty)) F('v62: the price in $ and Stars; outside Telegram — the hint');
  if (E('prizeTable')(10, 10000).join(',') !== '2250,2150,2100,500,500,500,500,500,500,500' || E('prizeTable')(20, 10000).length !== 15) F('v63: the prize arithmetic');
  if (h.includes(X.tt(u.emWhat, { epic: '7 500', fund: '10 000' }).slice(0, 25))) F('the emeralds tab has no description under the balance (owner, 16.10)'); A['shop-tab'](el('shop-tab', { v: 'cards' })); check('v63 shop back'); if (!app.innerHTML.includes('shop-grid')) F('v62: the cards tab returns');
  A.go(el('go', { to: 'tournament' })); check('v63 tournament (web)'); h = app.innerHTML; if (!h.includes(u.trnTitle) || !h.includes(u.trnNeedTg) || h.includes(u.trnRulesTitle) || u.trnRules.some(r => h.includes(X.tt(r, { fund: '10 000' })))) F('v63: the tournament screen outside Telegram: the hint, no rules list (owner, 16.10)');
  A.back(el('back')); if (S.screen !== 'home') F('v63: Back from the tournament goes home');
  S.ui.shopTab = 'cards'; X.render(); console.log('v63 ok');
}).catch(e => { fails++; console.log('FAIL v59 crashed', e && e.stack || e); }).then(async () => {
  // v62: fouls in every mode and stage, 3 → no speech and no vote, 4 → removed (no last words, no Azazel / Morpheus, no blast), undo; last words 30 s
{ const u = X.U(); const F = m => { fails++; console.log('FAIL v62 ' + m); }; const E = name => vm.runInContext(name, ctx); const S = X.S();
  const by = (g, r) => g.players.find(p => p.roleId === r);
  const g = E('newGame')(10, ['don', 'mafia', 'azazel', 'sheriff', 'doctor', 'kamikaze', 'citizen', 'citizen', 'citizen', 'citizen'], [], {}, [], {}); g.dealt = true; S.game = g; S.screen = 'game';
  E('startNight0')(g); X.render(); check('v62 night0 strip');
  if (!app.innerHTML.includes('class="panel fl-strip"') || (app.innerHTML.match(/data-a="foul-open"/g) || []).length !== 10) F('the fouls strip shows every seat at night 0');
  const cits = g.players.filter(p => p.roleId === 'citizen'); const cit = cits[0], cit2 = cits[1];
  A['foul-open'](el('foul-open', { id: cit.id })); check('v62 foul sheet'); if ((app.innerHTML.match(/data-a="foul-give"/g) || []).length !== 4) F('the sheet offers +1…+4');
  A['foul-give'](el('foul-give', { id: cit.id, k: '2' })); if (cit.fouls !== 2 || S.ui.sheet) F('+2 at once');
  A['foul-open'](el('foul-open', { id: cit.id })); if ((app.innerHTML.match(/data-a="foul-give"/g) || []).length !== 2) F('with 2 fouls only +1 and +2 are left'); A['sheet-close']();
  E('setFouls')(g, cit.id, 0);
  E('startDay0')(g); X.render(); check('v62 day0');
  A['foul-give'](el('foul-give', { id: g.players[0].id, k: '3' })); X.render(); check('v62 day0 muted');
  if (!app.innerHTML.includes(u.flMutedSpeech) || app.innerHTML.includes('id="timer"')) F('a muted introduction has no timer');
  E('setFouls')(g, g.players[0].id, 0);
  // a night: the doctor removed by fouls before his turn — the step says so; the Don's shot passes to the mafioso
  E('startNight')(g); const doc = by(g, 'doctor'), don = by(g, 'don'), maf = by(g, 'mafia');
  const shootStep = g.steps.find(st => st.ability === 'shoot'); const docStep = g.steps.find(st => st.actorId === doc.id);
  A['foul-give'](el('foul-give', { id: don.id, k: '4' })); if (don.alive || !don.foulOut || shootStep.actorId !== maf.id) F('4 fouls: the Don is out, the shot passes to the mafioso');
  E('setFouls')(g, doc.id, 4); g.stepIdx = g.steps.indexOf(docStep); X.render(); check('v62 night removed actor'); if (!app.innerHTML.includes(X.tt(u.flStepGone, { player: X.label(doc) }).slice(0, 20))) F('the removed actor\'s step is skipped');
  A['foul-undo'](); if (!doc.alive || doc.fouls !== 0 || doc.foulOut) F('undo returns the Doctor'); A['foul-undo'](); if (!don.alive || shootStep.actorId !== don.id) F('undo returns the Don and his shot');
  // the morning: the night's dead give last words, one by one, 30 s
  g.stepIdx = g.steps.length; g.actions = []; const v1 = cit2, v2 = cits[2];
  const rn = { removed: [{ id: v1.id, cause: 'x' }, { id: v2.id, cause: 'x' }], notes: [], quiet: [], shotLog: [] }; E('eliminate')(g, v1.id, 'x'); E('eliminate')(g, v2.id, 'x');
  g.nightResult = rn; E('startDay')(g); g.nightResult = rn; X.render(); check('v62 morning last words');
  if (!app.innerHTML.includes(u.lwTitle) || !app.innerHTML.includes('id="timer"') || !app.innerHTML.includes(X.tt(u.lwOf, { i: 1, n: 2 }))) F('the morning: last words with a timer, 1 of 2');
  A['lw-next'](); check('v62 morning last words 2'); if (!app.innerHTML.includes(X.tt(u.lwOf, { i: 2, n: 2 }))) F('the second last words');
  A['lw-next'](); X.render(); if (app.innerHTML.includes(u.lwDone)) F('last words end');
  // speeches: 3 fouls — no minute
  A.stage(el('stage', { id: 'balagan' })); A.stage(el('stage', { id: 'speeches' })); if (g.winner || g.dayStage !== 'speeches') F('the speeches start');
  const sp = E('speakOrder')(g)[0]; E('setFouls')(g, sp.id, 3); X.render(); check('v62 muted speech');
  if (!app.innerHTML.includes(u.flMutedSpeech) || app.innerHTML.includes('id="timer"')) F('a speaker with 3 fouls: no timer');
  E('setFouls')(g, sp.id, 0);
  // a removal in the middle of the speeches keeps the current speaker
  g.speechIdx = 2; const cur = E('speakOrder')(g)[2]; const before = E('speakOrder')(g)[1]; E('setFouls')(g, before.id, 4); if (E('speakOrder')(g)[g.speechIdx].id !== cur.id) F('removing an earlier speaker keeps the current one');
  E('undoFoul')(g); if (E('speakOrder')(g)[g.speechIdx].id !== cur.id || !before.alive) F('undo keeps the current speaker too');
  // the Kamikaze's victim: the speeches wait for the last words
  const kam = by(g, 'kamikaze'); const kv = X.alive(g).find(p => p.id !== kam.id && p.roleId === 'citizen');
  S.ui.kamikaze = { stage: 'victim', who: kam.id }; S.ui.pick = [kv.id]; A['kam-confirm'](); X.render(); check('v62 kamikaze last words');
  if (g.winner) F('the test game should go on');
  if (!app.innerHTML.includes(u.lwTitle) || !app.innerHTML.includes(u.lwThen)) F('the Kamikaze\'s victim speaks before the speeches go on');
  A['lw-next'](); X.render(); if (app.innerHTML.includes(u.lwThen)) F('then the speeches go on');
  // the vote: a muted voter has no vote, his earlier vote is dropped
  g.dayStage = 'vote'; g.ballot = { candidates: [], votes: {}, round: 1, nominatedBy: {} };
  const al = X.alive(g); const voter = al.find(p => p.id !== al[0].id); E('castVote')(g, voter.id, al[0].id);
  E('setFouls')(g, voter.id, 3); if (g.ballot.votes[voter.id] || E('voteOrder')(g).some(v => v.id === voter.id) || E('castVote')(g, voter.id, al[0].id)) F('3 fouls: the vote is dropped and cannot be cast');
  X.render(); check('v62 vote muted'); if (!app.innerHTML.includes(X.tt(u.flNoVote, { list: voter.seat }))) F('the vote screen names who has no vote');
  E('undoFoul')(g); if (g.ballot.votes[voter.id] !== al[0].id) F('undo brings the vote back');
  // Azazel removed by fouls: no trigger, no last words; voted out: the trigger and his last words
  const az = by(g, 'azazel'); E('setFouls')(g, az.id, 4); if ((g.pendingTriggers || []).length || E('lastWordsNow')(g)) F('Azazel removed by fouls takes nobody, no last words'); E('undoFoul')(g);
  if (!az.alive) F('undo returns Azazel');
  g.ballot = { candidates: [az.id], votes: {}, round: 1, nominatedBy: {} }; E('finishVote')(g, az.id); X.render(); check('v62 result last words');
  if (!g.pendingTriggers.some(t => t.type === 'azazel') || !E('lastWordsNow')(g) || E('lastWordsNow')(g).p.id !== az.id) F('voted out Azazel: last words and his trigger');
  const victim = X.alive(g).find(p => p.roleId === 'citizen' || p.roleId === 'sheriff'); E('applyTrigger')(g, g.pendingTriggers[0], victim.id); A['lw-next']();
  if (!E('lastWordsNow')(g) || E('lastWordsNow')(g).p.id !== victim.id) F('Azazel\'s victim speaks next');
  // a removal that decides the game offers to finish it
  g.dayStage = 'speeches'; g.speechIdx = 0; g.lastWords = null; const city = X.alive(g).filter(p => !['don', 'mafia', 'azazel'].includes(p.roleId));
  city.slice(0, Math.max(0, city.length - X.alive(g).filter(p => ['don', 'mafia'].includes(p.roleId)).length)).forEach(p => E('setFouls')(g, p.id, 4));
  X.render(); check('v62 foul win'); if (E('checkWin')(g) && !app.innerHTML.includes(X.tt(u.flWin, { title: '' }).slice(0, 12))) F('the finish banner after a deciding removal');
  // the Bomb removed by fouls does not blow up
  const gb = E('newGame')(5, ['bomb', 'sapper', 'citizen', 'citizen', 'citizen'], [], {}, [], { bombHunt: true }); gb.dealt = true; E('startNight0')(gb); E('startDay0')(gb);
  const bomb = by(gb, 'bomb'); E('setFouls')(gb, bomb.id, 4); if (gb.players.filter(p => !p.alive).length !== 1 || gb.bombBlew) F('a Bomb removed by fouls does not blow up');
  // lift all: more than half of those who may vote
  const gl = E('newGame')(10, ['don', 'mafia', 'mafia', 'sheriff', 'citizen', 'citizen', 'citizen', 'citizen', 'citizen', 'citizen'], [], {}, [], { classic: true }); gl.dealt = true; E('startDay')(gl);
  const need0 = E('liftNeed')(gl); E('setFouls')(gl, gl.players[9].id, 3); E('setFouls')(gl, gl.players[8].id, 3); if (E('liftNeed')(gl) !== need0 - 1) F('lift all: the muted are not counted');
  // online: the seat leaving the table writes during its last words (even out of the game), nobody else; the fouls show at the seats
  const tm = { left: 30, running: true, at: Date.now() };
  if (!E('tbCanChat')({ chat: 'last', lastSeat: 3, timer: tm }, { seat: 3, alive: false }) || E('tbCanChat')({ chat: 'last', lastSeat: 3, timer: tm }, { seat: 4, alive: true })) F('online: only the last words\' seat may write');
  if (E('tbCanChat')({ chat: 'last', lastSeat: 3, timer: { left: 0, running: false, at: Date.now() } }, { seat: 3, alive: false })) F('online: the last words close with the timer');
  const rt = E('roundTableHTML')([{ seat: 1, name: 'A', fouls: 2, alive: true }, { seat: 2, name: 'B', fouls: 0, alive: true }], {}, ''); if (!rt.includes('rt-foul f2') || (rt.match(/rt-foul/g) || []).length !== 1) F('online: fouls at the seats');
  S.game = null; S.screen = 'home'; S.ui.sheet = null; S.ui.kamikaze = null; S.ui.pick = []; X.render(); console.log('v63 ok');
}
// v66: the host sees the round table (the marks of the moment, whom the app waits for) and, online, the table chat — read with the actions poll, written at any moment
try { const u = X.U(); const F = m => { fails++; console.log('FAIL v66 ' + m); }; const E = name => vm.runInContext(name, ctx); const S = X.S();
  vm.runInContext('TG.app = TG.app || { initData: "" }; globalThis.__api = api; globalThis.__apiBase = apiBase; apiBase = () => "https://x.test"; globalThis.__chat = []; globalThis.__calls = []', ctx);
  vm.runInContext('api = async (p, b) => { __calls.push([p, b]); if (p === "/api/table/actions") return { ok: true, actions: [], watching: [601], chat: __chat.splice(0) }; return { ok: true, delivered: [] }; }', ctx);
  const calls = E('__calls'), chatQ = E('__chat'); const HC = E('HC');
  S.cloud = { user: { id: 500, name: 'Me' } }; S.game = null; S.ui.sheet = null;
  A.go(el('go', { to: 'setup' })); S.setup.scenario = null; S.setup.n = 7; S.setup.comp = E('presetFor')(7); S.setup.seatProfiles = []; S.setup.names = ['Нина', 'Борис', 'Аня', 'Гена', 'Дима', 'Ева', 'Женя']; S.setup.online = true; S.setup.hostRole = 'host';
  S.lobby = { code: 'HV7A', link: '', players: [{ tgId: 601, name: 'Нина', photo: 'https://x.test/a.jpg', points: 1024 }, { tgId: 602, name: 'Борис' }], map: {}, sent: [], seats: { 601: 0, 602: 1 }, flag: '' };
  A.deal(); const g = S.game; if (!g || !g.online || !g.tg || g.tg.code !== 'HV7A' || g.tg.map[601] !== 1) F('an online game with its Telegram table');
  g.dealIdx = g.players.length; A.start(); check('v66 host night0'); let h = app.innerHTML;
  const iStrip = h.indexOf('class="onl-strip"'), iTable = h.indexOf('id="hv-table"'), iChat = h.indexOf('id="hc-panel"'), iRow = h.indexOf('data-a="sheet" data-id="players"');
  if (iStrip < 0 || iTable < 0 || iChat < 0 || !(iStrip < iTable && iTable < iRow && iRow < iChat)) F('the table under the online strip, the chat under the buttons: ' + [iStrip, iTable, iRow, iChat].join());
  if (!h.includes('class="rtable md"') || (h.match(/class="rt-seat/g) || []).length !== 7 || !h.includes('https://x.test/a.jpg') || !h.includes(u.hvLegend) || !h.includes(X.tt(u.tbAtTable, { n: 7 }))) F('seven seats one size smaller, the avatar from the lobby, the legend, the count');
  const st0 = g.steps[g.stepIdx]; const awake = (st0.members || [st0.actorId && X.P(g, st0.actorId)].filter(Boolean)).map(p => p.seat);
  awake.forEach(seat => { if (!new RegExp('class="rt-seat[^"]*\\bspk\\b[^"]*"[^>]*><div class="rt-av">(?:(?!rt-seat).)*?<span class="rt-num">' + seat + '<').test(h)) F('night 0: the awake seat ' + seat + ' is ringed'); });
  if (!h.includes('id="hc-msg"') || !h.includes('data-a="hc-send"') || !h.includes(u.hvClosed) || !h.includes(u.hvYou) || !h.includes(u.tbChatEmpty)) F('the chat panel: closed for the players at night, the host writes, empty so far');
  // folding: the table and the chat fold by their headers, the choice is kept in the settings
  A['hv-toggle'](el('hv-toggle', { id: 'hvTable' })); check('v66 table folded'); h = app.innerHTML;
  if (S.settings.hvTable !== false || h.includes('class="rtable') || !h.includes('hv-panel folded') || !h.includes(u.hvUnfold)) F('the table folds and the setting remembers it');
  A['hv-toggle'](el('hv-toggle', { id: 'hvTable' })); if (S.settings.hvTable !== true || !app.innerHTML.includes('class="rtable md"')) F('the table unfolds');
  // the chat: the history comes with the first poll and is not «new»; a later line while folded counts as new and shows on the header
  chatQ.push({ id: 1, tgId: 601, name: '1 · Нина', text: 'привет всем', at: Date.now(), me: false, host: false });
  await E('pollActions')(); const q1 = calls.find(c => c[0] === '/api/table/actions'); if (!q1 || q1[1].code !== 'HV7A' || q1[1].chatSince !== 0) F('the poll asks for the chat since 0: ' + JSON.stringify(q1 && q1[1]));
  if (HC.chat.length !== 1 || HC.last !== 1 || HC.unread !== 0) F('the first lines are history, not new: ' + JSON.stringify([HC.chat.length, HC.last, HC.unread]));
  X.render(); if (!app.innerHTML.includes('привет всем') || !app.innerHTML.includes('1 · Нина')) F('the line shows in the host\'s chat');
  A['hv-toggle'](el('hv-toggle', { id: 'hvChat' })); chatQ.push({ id: 2, tgId: 602, name: '2 · Борис', text: 'я мирный', at: Date.now(), me: false, host: false }); await E('pollActions')();
  const q2 = calls.filter(c => c[0] === '/api/table/actions').pop(); if (q2[1].chatSince !== 1) F('the next poll continues from the last line');
  if (HC.unread !== 1 || HC.chat.length !== 2) F('a line while the chat is folded is new: ' + HC.unread); X.render(); check('v66 chat folded'); h = app.innerHTML;
  if (!h.includes(X.tt(u.hvNew, { n: 1 })) || h.includes('id="hc-msg"')) F('the folded chat header shows the new count');
  A['hv-toggle'](el('hv-toggle', { id: 'hvChat' })); if (HC.unread !== 0 || !app.innerHTML.includes('я мирный')) F('unfolding reads the lines');
  // the host writes: the request goes to the table chat, the input clears, the poll runs again
  calls.length = 0; A['hc-msg'](el('hc-msg', { value: 'Город засыпает' })); await A['hc-send']();
  const sent = calls.find(c => c[0] === '/api/table/chat/send'); if (!sent || sent[1].code !== 'HV7A' || sent[1].text !== 'Город засыпает' || HC.msg !== '' || !calls.some(c => c[0] === '/api/table/actions')) F('sending: ' + JSON.stringify(calls.map(c => c[0])));
  // the day: the speaker ringed, candidates red, votes as arrows, the seats the app waits for dashed; the chat rule follows the stage
  let guard = 40; while (g.steps[g.stepIdx] && guard--) A.next(); A.day0(); check('v66 day0'); h = app.innerHTML;
  const sp0 = X.alive(g)[g.speechIdx]; if (!new RegExp('class="rt-seat spk"[^>]*><div class="rt-av">(?:(?!rt-seat).)*?<span class="rt-num">' + sp0.seat + '<').test(h) || !h.includes(X.tt(u.hvSpeaker, { seat: sp0.seat }))) F('day 0: the introducing seat is ringed and may write');
  guard = 40; while (X.alive(g)[g.speechIdx] && guard--) A.speech(el('speech', { d: '1' })); A.night(); g.stepIdx = g.steps.length; g.actions = []; E('startDay')(g); g.lastWords = null;
  g.dayStage = 'balagan'; X.render(); if (!app.innerHTML.includes(u.hvAll)) F('the free discussion: everyone writes');
  const ids = s => g.players.find(p => p.seat === s).id;
  g.dayStage = 'vote'; g.ballot = { candidates: [ids(3), ids(4)], votes: { [ids(5)]: ids(3) }, round: 1, nominatedBy: {} }; X.render(); check('v66 vote table'); h = app.innerHTML;
  if (!h.includes('rt-vote">→3<') || (h.match(/class="rt-seat cand/g) || []).length !== 2 || !h.includes(u.hvClosed)) F('the vote: candidates red, the vote as an arrow, the chat closed');
  if ((h.match(/class="rt-seat wait"/g) || []).length !== 2 || !h.includes('rt-wait')) F('the two seats in the app have not voted yet — dashed, with the mark');
  g.ballot.votes[ids(1)] = ids(4); X.render(); if ((app.innerHTML.match(/class="rt-seat wait"/g) || []).length !== 1) F('a vote from the app clears the mark');
  // the players' chat marks the host's lines
  vm.runInContext('TB.chat = [{ id: 9, name: "Ведущий", text: "Голосуем", at: Date.now(), me: false, host: true }]', ctx);
  const pc = E('tbChatHTML')({ chat: 'all' }, { seat: 1, alive: true }); if (!pc.includes('msg  host') || !pc.includes('Ведущий · ' + u.hvHostTag)) F('the host\'s line is marked for the players');
  // an offline game shows the table but no chat
  g.online = false; X.render(); check('v66 offline'); if (!app.innerHTML.includes('id="hv-table"') || app.innerHTML.includes('id="hc-panel"')) F('offline: the table, no chat'); g.online = true;
  vm.runInContext('api = __api; apiBase = __apiBase; TG.app = null; TB.chat = []', ctx);
  S.game = null; S.lobby = null; S.screen = 'home'; S.ui.sheet = null; X.render(); console.log('v66 ok');
} catch (e) { fails++; console.log('FAIL v66 crashed', e && e.stack || e); }
// v68: an admin gives a player skins — the entry in the player's sheet, the stats screen and the admin panel; a tile gives, a gift is taken back, «Give all»
try { const u = X.U(); const F = m => { fails++; console.log('FAIL v68 ' + m); }; const E = name => vm.runInContext(name, ctx); const S = X.S(); const SK = E('SKINS').concat(E('ROOMS')); // v71: rooms are given the same way
  vm.runInContext('TG.app = TG.app || { initData: "" }; globalThis.__api = api; globalThis.__apiBase = apiBase; apiBase = () => "https://x.test"; globalThis.__calls = []; globalThis.__own = { owned: ["amethyst_don"], gifted: [] }', ctx);
  vm.runInContext(`api = async (p, b) => { __calls.push([p, b]); const view = () => ({ ok: true, user: { tgId: 777, name: 'Нина <b>', username: 'nina' }, owned: __own.owned.slice(), gifted: __own.gifted.slice(), equipped: { don: 'amethyst_don' } });
    if (p === '/api/admin/skins') return (b.q === '@nobody') ? { ok: false, error: 'not_found' } : view();
    if (p === '/api/admin/skin') { const ids = b.skin === 'all' ? SKINS.concat(ROOMS).map(s => s.id).filter(id => !__own.owned.includes(id)) : [b.skin];
      if (b.give) ids.forEach(id => { if (!__own.owned.includes(id)) { __own.owned.push(id); __own.gifted.push(id); } }); else ids.forEach(id => { __own.owned = __own.owned.filter(x => x !== id); __own.gifted = __own.gifted.filter(x => x !== id); });
      return Object.assign(view(), { changed: ids, give: !!b.give }); }
    return { ok: false, error: 'not_found' }; }`, ctx);
  const calls = E('__calls'); const tick = () => new Promise(r => setTimeout(r, 5));
  // not an admin — no entry anywhere
  S.cloud = { user: { id: 500, name: 'Me' }, admin: false }; S.ui.sheet = { type: 'friend', id: 777 }; X.render(); if (app.innerHTML.includes('data-a="adm-skins"')) F('a player sees no skins button');
  S.cloud.admin = true; X.render(); check('v68 friend sheet admin'); if (!app.innerHTML.includes('data-a="adm-skins" data-id="777"') || !app.innerHTML.includes(u.askBtn)) F('the admin sees «Player\'s skins» in the player\'s sheet');
  S.ui.sheet = null; S.ui.pstatsId = 777; A.go(el('go', { to: 'pstats' })); X.render(); check('v68 stats admin'); if (!app.innerHTML.includes('data-a="adm-skins" data-id="777"')) F('the stats screen has the button too');
  A['adm-skins'](el('adm-skins', { id: '777' })); check('v68 sheet loading'); if (!app.innerHTML.includes(u.askLoading)) F('the sheet says it is loading'); await tick(); check('v68 sheet');
  let h = app.innerHTML; if (!calls.some(c => c[0] === '/api/admin/skins' && c[1].tgId === 777)) F('the sheet asks the server for the player\'s skins by id');
  if ((h.match(/data-a="adm-skin" /g) || []).length !== SK.length || !h.includes('Нина &lt;b&gt;') || h.includes('Нина <b>') || !h.includes('@nina') || !h.includes(X.tt(u.askCount, { n: 1, all: SK.length }))) F('every skin as a tile, the name escaped, the count');
  if (!h.includes('sk-grid adm') || !h.includes(u.askWorn) || !h.includes(`${u.askAll} · ${SK.length - 1}`)) F('the worn mark and «Give all» with the number missing');
  // give one, then take the gift back; a skin bought or won stays
  const sk = SK.find(x => x.id !== 'amethyst_don'); await A['adm-skin'](el('adm-skin', { id: sk.id })); h = app.innerHTML;
  const last = () => calls[calls.length - 1]; if (last()[0] !== '/api/admin/skin' || last()[1].skin !== sk.id || last()[1].give !== true || last()[1].tgId !== 777) F('a tap on a skin not owned gives it');
  if (!h.includes('sk-badge gift') || !h.includes(X.tt(u.askCount, { n: 2, all: SK.length }))) F('the gift is marked 🎁 at once');
  await A['adm-skin'](el('adm-skin', { id: sk.id })); if (last()[1].give !== false || E('__own').owned.includes(sk.id)) F('a tap on a gift takes it back');
  const n0 = calls.length; await A['adm-skin'](el('adm-skin', { id: 'amethyst_don' })); if (calls.length !== n0) F('a skin bought or won is not taken — no request');
  await A['adm-skin-all'](); h = app.innerHTML; if (last()[1].skin !== 'all' || last()[1].give !== true || h.includes('data-a="adm-skin-all"') || !h.includes(X.tt(u.askCount, { n: SK.length, all: SK.length }))) F('«Give all» gives every skin, the button goes');
  // the admin panel in Settings: search by @username; not found is said so
  S.ui.sheet = null; const ph = E('admSkinsPanelHTML')(); if (!ph.includes('id="adm-sk-q"') || !ph.includes(u.askPanel)) F('the admin panel has the search field');
  E('ADMSK').q = '@nobody'; A['adm-sk-find'](); await tick(); check('v68 not found'); if (!app.innerHTML.includes(u.askNone) || last()[1].q !== '@nobody') F('a player not found is said so');
  E('ADMSK').q = '777'; A['adm-sk-find'](); await tick(); if (last()[1].tgId !== 777) F('digits search by Telegram id');
  S.cloud.admin = false; if (E('admSkinsPanelHTML')() !== '') F('no panel for a player');
  vm.runInContext('api = __api; apiBase = __apiBase; TG.app = null', ctx);
  S.cloud = null; S.ui.sheet = null; S.screen = 'home'; X.render(); console.log('v68 ok');
} catch (e) { fails++; console.log('FAIL v68 crashed', e && e.stack || e); }
// v71: table backgrounds — the Skins tab section, the room's sheet with a live preview, putting it up, the host's lobby and the players' table
try { const u = X.U(); const F = m => { fails++; console.log('FAIL v71 ' + m); }; const E = name => vm.runInContext(name, ctx); const S = X.S(); const RM = E('ROOMS'); const id = RM[0].id;
  vm.runInContext('TG.app = TG.app || { initData: "" }; globalThis.__api = api; globalThis.__apiBase = apiBase; apiBase = () => "https://x.test"; globalThis.__calls = []', ctx);
  vm.runInContext('api = async (p, b) => { __calls.push([p, b]); if (p === "/api/skin/equip") { const e = Object.assign({}, S.skins.equipped); if (b.skin) e[b.role] = b.skin; else delete e[b.role]; return { ok: true, equipped: e }; } return { ok: false }; }', ctx);
  const calls = E('__calls'); const last = () => calls[calls.length - 1];
  S.cloud = { user: { id: 500, name: 'Me' } }; S.skins = { owned: [], equipped: {} }; S.ui.sheet = null; S.ui.skinFilter = 'all'; S.ui.skinRar = 'all';
  A.go(el('go', { to: 'cards' })); S.ui.cardsTab = 'skins'; X.render(); check('v71 skins tab rooms'); let h = app.innerHTML;
  if (!h.includes(u.rmTitle) || !h.includes(`class="rm-tile locked `) || !h.includes(`data-a="room-sheet" data-id="${id}"`) || !h.includes('rm-lock')) F('the section lists the room, locked');
  A['skin-rar'](el('skin-rar', { id: 'epic' })); if (app.innerHTML.includes('data-a="room-sheet"')) F('the Epic filter hides the rooms (they are Legendary)');
  A['skin-rar'](el('skin-rar', { id: RM[0].rarity })); if (!app.innerHTML.includes('data-a="room-sheet"')) F('their own rarity shows them'); A['skin-rar'](el('skin-rar', { id: 'all' }));
  A['skin-filter'](el('skin-filter', { id: 'black' })); if (app.innerHTML.includes('data-a="room-sheet"')) F('a team filter hides the rooms'); A['skin-filter'](el('skin-filter', { id: 'all' }));
  // the sheet of a room not owned: the preview of the table in that room, how to get it, no button
  A['room-sheet'](el('room-sheet', { id })); check('v71 room sheet locked'); h = app.innerHTML;
  if (!h.includes('class="rtable lg roomed"') || !h.includes(`class="rt-room" data-room="${id}"`) || !h.includes(RM[0].file + '.webp') || !h.includes(u.rmHow) || h.includes('data-a="room-set"') || (h.match(/class="rt-seat /g) || []).length < 8) F('locked: the live preview with 8 seats, how to get it');
  const n0 = calls.length; await A['room-set'](el('room-set', { id })); if (calls.length !== n0) F('a room not owned cannot be put up');
  // owned: put it up
  S.skins.owned = [id]; X.render(); h = app.innerHTML; if (!h.includes(`data-a="room-set" data-id="${id}"`) || !h.includes(u.rmSetBtn)) F('owned: the button puts it up');
  await A['room-set'](el('room-set', { id })); h = app.innerHTML; if (last()[0] !== '/api/skin/equip' || last()[1].role !== 'room' || last()[1].skin !== id || S.skins.equipped.room !== id || !h.includes(u.rmOffBtn)) F('put up through the server');
  S.ui.sheet = null; X.render(); if (!app.innerHTML.includes('rm-tile own on')) F('the tile says it is on the table');
  // the host's lobby: the room under the table, the «Background» button
  S.lobby = { code: 'RM71', link: '', players: [], map: {}, sent: [], seats: {}, flag: '' }; const st = { n: 7, names: [], seatProfiles: [] };
  h = E('hostTableHTML')(st); if (!h.includes('rtable lg roomed') || !h.includes(`data-room="${id}"`) || !h.includes('data-a="room-pick"')) F('the host\'s lobby table stands in his room, with the picker');
  A['room-pick'](); check('v71 room picker'); h = app.innerHTML; if ((h.match(/data-a="room-set"/g) || []).length !== RM.length + 1 || !h.includes(u.rmNone)) F('the picker: no background + his rooms');
  await A['room-set'](el('room-set', { id: '' })); if (S.skins.equipped.room || last()[1].skin !== null || S.ui.sheet) F('«no background» takes it down and closes the picker');
  h = E('hostTableHTML')(st); if (h.includes('roomed') || h.includes('rt-room')) F('no room — the plain table');
  // the players see the host's room with the table (not their own)
  vm.runInContext('TB.data = { room: "' + id + '" }', ctx); if (E('tbRoom')() !== id) F('the player\'s table takes the host\'s room'); vm.runInContext('TB.data = { room: "nope" }', ctx); if (E('tbRoom')() !== null) F('an unknown room is ignored');
  vm.runInContext('TB.data = null', ctx); if (E('roundTableHTML')([{ seat: 1 }], {}, '', {}, 'nope').includes('rt-room')) F('an unknown room draws nothing');
  S.skins.owned = []; if (E('roomPickBtnHTML')() !== '') F('no rooms — no picker');
  vm.runInContext('api = __api; apiBase = __apiBase; TG.app = null', ctx);
  S.lobby = null; S.cloud = null; S.skins = { owned: [], equipped: {} }; S.ui.sheet = null; S.ui.cardsTab = 'cards'; S.screen = 'home'; X.render(); console.log('v71 ok');
} catch (e) { fails++; console.log('FAIL v71 crashed', e && e.stack || e); }
console.log('forced ties:', forcedTies, 'roulettes:', roulettes);
  console.log(fails ? `\n${fails} FAILED of ${shots}` : `\nALL OK (${shots} renders)`);
  process.exit(fails ? 1 : 0);
});
