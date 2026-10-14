// Engine simulation: runs data + engine in node and plays scripted scenarios.
const fs = require('fs');
const I18N_FILES = ['02-i18n.js', '02a-i18n-ru-roles.js', '02b-i18n-uk.js', '02c-i18n-en.js', '02d-i18n-pl.js', '02e-i18n-hy.js', '02g-i18n-profiles.js', '02h-i18n-premium.js', '02i-i18n-fixes.js', '02j-i18n-vote.js', '02k-i18n-review.js', '02l-i18n-classic.js', '02m-i18n-diplomacy.js', '02n-i18n-counters.js', '02r-i18n-intro.js', '02s-i18n-mini.js', '02f-icons.js'];
const src = I18N_FILES.map(f => fs.readFileSync(__dirname + '/../src/' + f, 'utf8')).join('\n') + '\n' + fs.readFileSync(__dirname + '/../src/02-data.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/../src/03-engine.js', 'utf8');
const vm = require('vm');
const ctx = { console, Math, Date, Object, Array, Set, Number, String, JSON };
vm.createContext(ctx);
vm.runInContext(src + '\nsetLang("ru");\nthis.X = { newGame, buildNightSteps, buildNight0Steps, recordAction, resolveNight, startNight0, startDay0, startNight, startDay, tally, finishVote, applyTrigger, useKamikaze, checkWin, alive, P, ROLE, PRESETS, compositionStats, presetFor, stepTargets, shooterOf, eliminate, millerCap };', ctx);
const X = ctx.X;
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };

// presets integrity
for (let n = 7; n <= 24; n++) {
  const c = X.presetFor(n); const st = X.compositionStats(c);
  const dons = c.filter(x => x === 'don').length;
  ok(c.length === n, `preset ${n}: ${c.length} cards, black ${st.blackShare}%, dons ${dons}`);
  ok(n >= 20 ? dons === 2 : dons === 1, `preset ${n}: don count`);
  ok(c.every(id => X.ROLE[id]), `preset ${n}: all roles exist`);
}

// Scripted game, 13 players, fixed roles
const comp = X.presetFor(13);
const g = X.newGame(13, comp, [], {});
// force deterministic roles by seat
const order = ['don', 'gunsmith', 'kamikaze', 'mafia', 'maniac', 'sheriff', 'doctor', 'journalist', 'mayor', 'thief', 'drunk', 'miller', 'bomb'];
g.players.forEach((p, i) => p.roleId = order[i]);
const bySeat = s => g.players.find(p => p.seat === s);
const byRole = r => g.players.find(p => p.roleId === r && p.alive);

X.startNight0(g);
ok(g.steps.length === 1 + 9, `night0 steps: ${g.steps.length} (family + 9 roles)`);
X.startDay0(g);
X.startNight(g);
let steps = g.steps;
console.log('night1 steps:', steps.map(s => s.type === 'meet' ? `[${s.title}]` : `${s.roleId}${s.targets === 2 ? 'x2' : ''}`).join(' '));
const stepOf = r => steps.find(s => s.type === 'act' && s.roleId === r);
ok(stepOf('don').targets === 1, 'night1: single mafia shot');
// Night 1: mafia shoots sheriff(6), doctor heals sheriff, sheriff checks don, journalist compares don & maniac, thief steals from maniac -> applies to bomb? no, maniac shoots mayor; drunk picks mayor
X.recordAction(g, stepOf('don'), [bySeat(6).id]);
X.recordAction(g, stepOf('maniac'), [bySeat(9).id]);
let r = X.recordAction(g, stepOf('thief'), [bySeat(5).id, bySeat(12).id]); // steals maniac's shot -> shoots miller(12)
ok(r.kind === 'text' && /выстрел/.test(r.text), 'thief stole maniac shot');
r = X.recordAction(g, stepOf('sheriff'), [bySeat(1).id], 'check');
ok(r.kind === 'color' && r.color === 'black', 'sheriff sees don as black');
X.recordAction(g, stepOf('doctor'), [bySeat(6).id]);
r = X.recordAction(g, stepOf('journalist'), [bySeat(1).id, bySeat(5).id]);
ok(r.kind === 'same' && r.same === false, 'journalist: don vs maniac = different');
X.recordAction(g, stepOf('drunk'), [bySeat(9).id]);
const res = X.resolveNight(g);
console.log(res.shotLog, res.notes, res.quiet);
ok(bySeat(6).alive, 'sheriff healed by doctor');
ok(bySeat(9).alive, 'mayor alive: maniac shot voided by thief');
ok(!bySeat(12).alive, 'miller shot by thief (stolen maniac shot)');
X.startDay(g);
ok(g.day === 1 && g.effects.voidVote[bySeat(9).id] === 1, 'drunk effect registered for day 1');
// voting: mayor(9, voided) + 3 others vote for bomb(13); 2 vote for don
g.ballot.candidates = [bySeat(13).id, bySeat(1).id];
[9, 2, 3, 4].forEach(s => g.ballot.votes[bySeat(s).id] = bySeat(13).id);
[6, 7].forEach(s => g.ballot.votes[bySeat(s).id] = bySeat(1).id);
let t = X.tally(g);
const rowBomb = t.rows.find(x => x.cid === bySeat(13).id);
ok(rowBomb.total === 3 && rowBomb.hands === 4, `bomb gets 3 counted of 4 hands (mayor voided): ${rowBomb.total}`);
X.finishVote(g, bySeat(13).id);
console.log('removed by vote:', g.voteResult.removed.map(d => `${X.P(g, d.id).seat}:${d.cause}`));
ok(!bySeat(13).alive && !bySeat(1).alive && !bySeat(11).alive, 'bomb took neighbors 12->skip dead->11 and 1');
ok(X.checkWin(g) === null, 'no winner yet');
// Night 2: don dead -> gunsmith shoots, gunsmith night -> 2 targets
X.startNight(g);
steps = g.steps;
const shot = steps.find(s => s.type === 'act' && s.ability === 'shoot' && s.roleId === 'don');
ok(shot && shot.actorId === bySeat(2).id && shot.targets === 2, `night2: gunsmith shoots twice (${shot && shot.targets})`);
X.recordAction(g, shot, [bySeat(6).id, bySeat(7).id]);
// doctor can't heal sheriff again (healed last night)
const docStep = steps.find(s => s.roleId === 'doctor');
const tg = X.stepTargets(g, docStep);
ok(tg.find(x => x.p.seat === 6).ok === false, 'doctor cannot heal same player two nights in a row');
ok(tg.find(x => x.p.seat === 7).ok === true, 'doctor may heal self first time');
X.recordAction(g, docStep, [bySeat(7).id]);
X.recordAction(g, steps.find(s => s.roleId === 'sheriff'), [bySeat(2).id], 'shoot');
X.recordAction(g, steps.find(s => s.roleId === 'maniac'), [bySeat(3).id]);
const res2 = X.resolveNight(g);
console.log(res2.shotLog);
ok(!bySeat(6).alive && bySeat(7).alive && !bySeat(2).alive && !bySeat(3).alive, 'night2 deaths: sheriff, gunsmith, kamikaze; doctor self-healed');
ok(bySeat(7).healedSelf === true, 'doctor self-heal consumed');
X.startDay(g);
console.log('alive:', X.alive(g).map(p => `${p.seat}:${p.roleId}`).join(' '));
const w = X.checkWin(g);
console.log('win:', w);
ok(w === null, 'mafia(1) vs others(4): continue');
// kamikaze dead; miller cap day2
ok(X.millerCap(g) === 4, 'miller cap day 2 = 4');

// Two families game check
const g2 = X.newGame(20, X.presetFor(20), [], {});
const fams = g2.players.filter(p => X.ROLE[p.roleId].team === 'black').map(p => p.family);
ok(fams.includes('A') && fams.includes('B'), 'two families assigned');
ok(g2.players.filter(p => p.roleId === 'don').map(p => p.family).sort().join() === 'A,B', 'one don per family');
X.startNight0(g2); X.startDay0(g2); X.startNight(g2);
const shots = g2.steps.filter(s => s.ability === 'shoot' && s.roleId === 'don');
ok(shots.length === 2, 'two family shots');
// rabbi protection + trio death
const rab = g2.players.find(p => p.roleId === 'rabbi');
const rs = g2.steps.find(s => s.roleId === 'rabbi');
const t1 = g2.players.find(p => p.roleId === 'mayor'), t2 = g2.players.find(p => p.roleId === 'drunk');
X.recordAction(g2, rs, [t1.id, t2.id]);
X.recordAction(g2, shots[0], [t1.id]);
X.recordAction(g2, shots[1], [rab.id]);
const r2 = X.resolveNight(g2);
console.log(r2.shotLog);
ok(!rab.alive && !t1.alive && !t2.alive, 'shot at rabbi removes the trio; shot at protected missed');
console.log(fails ? `\n${fails} FAILED` : '\nALL OK');
process.exit(fails ? 1 : 0);
