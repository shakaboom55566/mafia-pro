// Monte-Carlo balance simulator for Mafia Pro.
// Loads the prototype's own data + engine, adds heuristic bots for every role and plays thousands of games.
const fs = require('fs'); const vm = require('vm');
const I18N_FILES = ['02-i18n.js', '02a-i18n-ru-roles.js', '02b-i18n-uk.js', '02c-i18n-en.js', '02d-i18n-pl.js', '02e-i18n-hy.js', '02g-i18n-profiles.js', '02h-i18n-premium.js', '02i-i18n-fixes.js', '02j-i18n-vote.js', '02k-i18n-review.js', '02l-i18n-classic.js', '02m-i18n-diplomacy.js', '02n-i18n-counters.js', '02f-icons.js'];
const src = I18N_FILES.map(f => fs.readFileSync(__dirname + '/../src/' + f, 'utf8')).join('\n') + '\n' + fs.readFileSync(__dirname + '/../src/02-data.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/../src/03-engine.js', 'utf8');
const ctx = { console, Math, Date, Object, Array, Set, Number, String, JSON };
vm.createContext(ctx);
vm.runInContext(src + `\nsetLang('ru');\nthis.E = { newGame, startNight0, startDay0, startNight, startDay, recordAction, resolveNight, tally, finishVote, applyTrigger, useKamikaze, useJudge, checkWin, alive, P, ROLE, ROLES, PRESETS, presetFor, compositionStats, stepTargets, shooterOf, isBlack, TWO_FAMILIES_FROM, setLog: v => { LOG_ENABLED = v; } };`, ctx);
const E = ctx.E; E.setLog(false);
const ROLE = E.ROLE;

const rnd = Math.random;
function gauss() { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const argmax = (arr, f) => { let best = null, bs = -Infinity; for (const x of arr) { const s = f(x); if (s > bs) { bs = s; best = x; } } return best; };
const topK = (arr, f, k) => arr.map(x => [x, f(x)]).sort((a, b) => b[1] - a[1]).slice(0, k).map(x => x[0]);

const DEFAULT_CFG = {
  skill: 0.45,        // daily social read signal on black players
  sigma: 1.0,         // noise of social reads
  voteNoise: 0.9,     // individual voting noise
  mafiaPush: 0.25,    // suspicion mafia manages to pile on their day target, per black alive
  wwPersuade: 0.5,    // werewolf's daily persuasion on each black
  claimSheriff: 0.6, claimJournalist: 0.4, claimThief: 0.5,
  sheriffShoot: 0.8, maniacFocus: 0.75, kamikazeThreshold: 1.0
};

const INFO_ROLES = ['sheriff', 'doctor', 'journalist', 'rabbi', 'bodyguard', 'judge', 'thief', 'monk'];

function playGame(n, comp, cfg = DEFAULT_CFG, opts = {}) {
  const g = E.newGame(n, comp, [], {}, [], opts.mods || {});
  const pl = g.players;
  const K = { S: {}, ch: {}, priv: {}, known: {}, claimed: { sheriff: null, journalist: null, thief: null }, found: {}, mafiaRoles: {}, hist: [] };
  pl.forEach(p => { K.S[p.id] = 0; K.ch[p.id] = rnd(); K.priv[p.id] = {}; });
  pl.filter(p => p.roleId === 'werewolf').forEach(w => pl.filter(E.isBlack).forEach(b => { K.priv[w.id][b.id] = 4; }));
  E.startNight0(g);
  if (opts.firstDay) { E.startDay(g); runDay(g, K, cfg); const w0 = E.checkWin(g); if (w0) { g.winner = w0; return { side: w0.side, jester: !!g.jesterWon, nights: 0 }; } } else E.startDay0(g);
  let guard = 0;
  while (!g.winner && guard++ < 40) {
    E.startNight(g);
    runNight(g, K, cfg);
    E.resolveNight(g);
    E.startDay(g);
    let w = E.checkWin(g); if (w) { g.winner = w; break; }
    runDay(g, K, cfg);
    w = E.checkWin(g); if (w) { g.winner = w; break; }
  }
  return { side: g.winner ? g.winner.side : 'draw', jester: !!g.jesterWon, nights: g.night };
}

const aliveOf = g => E.alive(g);
const nonBlack = g => aliveOf(g).filter(p => !E.isBlack(p));
const isAlive = (g, id) => { const p = id && E.P(g, id); return !!(p && p.alive); };

function runNight(g, K, cfg) {
  for (const step of g.steps) {
    if (step.type !== 'act' || step.disabled) continue;
    const actor = E.P(g, step.actorId);
    const thiefAct = g.actions.find(a => a.ability === 'steal');
    if (thiefAct && thiefAct.targets[0] === actor.id) continue; // ability stolen tonight
    const okT = E.stepTargets(g, step).filter(x => x.ok).map(x => x.p);
    if (!okT.length) continue;
    const S = K.S;
    let targets = null, mode = 'check';
    const r = step.roleId;
    const claimedSheriff = isAlive(g, K.claimed.sheriff) ? K.claimed.sheriff : null;
    const claimedInfo = [K.claimed.journalist, K.claimed.thief].filter(id => isAlive(g, id));
    const shotScore = x => {
      if (E.isBlack(x) && g.twoFamilies && x.family !== actor.family) return K.mafiaRoles[x.id] ? 7 + K.ch[x.id] : 2 * K.ch[x.id];
      if (E.isBlack(x)) return -100;
      let s = 2 * K.ch[x.id];
      if (x.id === claimedSheriff) s += 10;
      if (claimedInfo.includes(x.id)) s += 8;
      if (x.roleId === 'werewolf') s += 6;
      if (K.mafiaRoles[x.id] && INFO_ROLES.includes(K.mafiaRoles[x.id])) s += 5;
      return s;
    };
    if (r === 'don' && step.ability === 'shoot') { // family shot (any shooter)
      targets = topK(okT, shotScore, step.targets).map(x => x.id);
    } else if (r === 'don' && step.ability === 'findSheriff') {
      const cands = okT.filter(x => !E.isBlack(x) && K.mafiaRoles[x.id] === undefined && x.id !== claimedSheriff);
      if (!cands.length) continue;
      targets = [argmax(cands, x => K.ch[x.id] - 0.1 * S[x.id] + 0.2 * gauss()).id];
    } else if (r === 'executioner') {
      const shot = g.actions.filter(a => a.ability === 'shoot' && a.fam === step.fam).flatMap(a => a.targets);
      const cands = okT.filter(x => !shot.includes(x.id));
      if (!cands.length) continue;
      const best = argmax(cands, shotScore);
      const docKnown = cands.find(x => K.mafiaRoles[x.id] === 'doctor');
      if (claimedSheriff && cands.some(x => x.id === claimedSheriff)) targets = [claimedSheriff];
      else if (docKnown) targets = [docKnown.id];
      else if (g.night >= 3 && rnd() < 0.7 && shotScore(best) > 0) targets = [best.id];
      else continue;
    } else if (r === 'spy') {
      const cands = okT.filter(x => !E.isBlack(x) && !K.mafiaRoles[x.id] && x.id !== claimedSheriff);
      if (!cands.length) continue;
      targets = [argmax(cands, x => K.ch[x.id] + S[x.id] * -0.1).id];
    } else if (r === 'mafia_doctor') {
      targets = [argmax(okT, x => S[x.id] + (x.roleId === 'don' ? 2 : 0) + (x.id === actor.id ? -0.5 : 0)).id];
    } else if (r === 'balamut') {
      const blacks = okT.filter(E.isBlack), reds = okT.filter(x => !E.isBlack(x));
      const hb = argmax(blacks, x => S[x.id]), fr = argmax(reds, x => S[x.id]);
      targets = [hb && (!fr || S[hb.id] >= S[fr.id] - 0.5) ? hb.id : fr.id];
    } else if (r === 'maniac') {
      targets = [rnd() < cfg.maniacFocus ? argmax(okT, x => S[x.id] + 0.3 * gauss()).id : okT[Math.floor(rnd() * okT.length)].id];
    } else if (r === 'thief') {
      const t = topK(okT, x => S[x.id] + K.priv[actor.id][x.id] || S[x.id], 2);
      if (t.length < 2) continue; targets = t.map(x => x.id);
    } else if (r === 'monk') {
      targets = [argmax(okT, x => S[x.id]).id];
    } else if (r === 'sheriff') {
      const foundBlack = okT.find(x => K.found[actor.id] && K.found[actor.id][x.id] === 'black');
      if (foundBlack && rnd() < cfg.sheriffShoot) { targets = [foundBlack.id]; mode = 'shoot'; }
      else { const unk = okT.filter(x => !(K.found[actor.id] && K.found[actor.id][x.id]) && K.known[x.id] !== 'black'); if (!unk.length) continue; targets = [argmax(unk, x => S[x.id] + 0.3 * gauss()).id]; }
    } else if (r === 'doctor') {
      if (claimedSheriff && okT.some(x => x.id === claimedSheriff) && rnd() < 0.9) targets = [claimedSheriff];
      else {
        const others = okT.filter(x => x.id !== actor.id);
        if (others.length && rnd() < 0.7) targets = [argmax(others, x => K.ch[x.id] + (claimedInfo.includes(x.id) ? 2 : 0) - 0.2 * S[x.id]).id];
        else if (okT.some(x => x.id === actor.id) && rnd() < 0.6) targets = [actor.id];
        else targets = [okT[Math.floor(rnd() * okT.length)].id];
      }
    } else if (r === 'journalist') {
      const unk = okT.filter(x => K.known[x.id] !== 'black');
      if (unk.length < 2) continue;
      const A = argmax(unk, x => S[x.id] + (K.priv[actor.id][x.id] || 0) * -0.5 + 0.3 * gauss());
      const rest = unk.filter(x => x.id !== A.id);
      const B = claimedSheriff && rest.some(x => x.id === claimedSheriff) ? rest.find(x => x.id === claimedSheriff) : argmax(rest, x => -S[x.id]);
      targets = [A.id, B.id];
    } else if (r === 'drunk') {
      targets = [argmax(okT, x => S[x.id]).id];
    } else if (r === 'altruist') {
      targets = [claimedSheriff && okT.some(x => x.id === claimedSheriff) ? claimedSheriff : argmax(okT, x => -S[x.id] + 0.5 * K.ch[x.id]).id];
    } else if (r === 'rabbi') {
      const t = topK(okT, x => (x.id === claimedSheriff ? 10 : 0) + (claimedInfo.includes(x.id) ? 6 : 0) + K.ch[x.id] - 0.3 * S[x.id], 2);
      if (t.length < 2) continue; targets = t.map(x => x.id);
    } else if (r === 'bodyguard') {
      targets = [claimedSheriff && okT.some(x => x.id === claimedSheriff) ? claimedSheriff : argmax(okT, x => K.ch[x.id] + (claimedInfo.includes(x.id) ? 2 : 0)).id];
    } else continue;
    if (!targets) continue;
    const res = E.recordAction(g, step, targets, mode);
    // knowledge updates
    if (res && res.kind === 'color') {
      const who = res.who.id, c = res.color;
      const owner = r === 'thief' ? actor.id : actor.id;
      K.found[owner] = K.found[owner] || {}; K.found[owner][who] = c;
      K.priv[owner][who] = c === 'black' ? 6 : -6;
      if ((r === 'sheriff' && K.claimed.sheriff === actor.id) || (r === 'thief' && K.claimed.thief === actor.id)) publish(K, who, c);
    }
    if (res && res.kind === 'same') {
      const A = targets[0], B = targets[1];
      const certain = B === claimedSheriff;
      const d = res.same ? -(certain ? 4 : 2) : (certain ? 6 : 3);
      K.priv[actor.id][A] = (K.priv[actor.id][A] || 0) + d;
      if (certain) { K.found[actor.id] = K.found[actor.id] || {}; K.found[actor.id][A] = res.same ? 'red' : 'black'; if (K.claimed.journalist === actor.id) publish(K, A, K.found[actor.id][A]); }
    }
    if (res && res.kind === 'role') K.mafiaRoles[res.who.id] = res.role.id;
    if (res && res.kind === 'sheriff') K.mafiaRoles[res.who.id] = res.yes ? 'sheriff' : (K.mafiaRoles[res.who.id] || null);
  }
}
function publish(K, pid, color) {
  if (K.known[pid] === color) return;
  K.known[pid] = color;
  K.S[pid] += color === 'black' ? 4 : -3;
}

function runDay(g, K, cfg) {
  const S = K.S; const al = aliveOf(g);
  // 1. Inference from the night: players shot by the family are red for the record; adjust voters' credibility
  const famShots = g.actions.filter(a => a.ability === 'shoot' && a.roleId === 'don' && !a.viaThief && !a.voided).flatMap(a => a.targets);
  famShots.forEach(t => { const p = E.P(g, t); if (!p.alive && !E.isBlack(p)) markRevealed(g, K, t, 'red'); });
  // 2. Claims
  const sh = aliveOf(g).filter(p => p.roleId === 'sheriff');
  sh.forEach(s => {
    const f = K.found[s.id] || {};
    const hasBlack = Object.keys(f).some(id => f[id] === 'black' && isAlive(g, id));
    if (!K.claimed.sheriff && hasBlack && rnd() < cfg.claimSheriff) { K.claimed.sheriff = s.id; Object.keys(f).forEach(id => publish(K, id, f[id])); }
  });
  aliveOf(g).filter(p => p.roleId === 'thief').forEach(t => {
    const f = K.found[t.id] || {};
    if (!K.claimed.thief && Object.keys(f).some(id => f[id] === 'black' && isAlive(g, id)) && rnd() < cfg.claimThief) { K.claimed.thief = t.id; Object.keys(f).forEach(id => publish(K, id, f[id])); }
  });
  aliveOf(g).filter(p => p.roleId === 'journalist').forEach(j => {
    const f = K.found[j.id] || {};
    if (!K.claimed.journalist && Object.keys(f).some(id => f[id] === 'black' && isAlive(g, id)) && rnd() < cfg.claimJournalist) { K.claimed.journalist = j.id; Object.keys(f).forEach(id => publish(K, id, f[id])); }
    else if (!K.claimed.journalist && rnd() < cfg.claimJournalist * 0.5) { const strong = Object.keys(K.priv[j.id]).filter(id => K.priv[j.id][id] >= 3 && isAlive(g, id)); strong.forEach(id => { S[id] += 1.5; }); }
  });
  // 3. Werewolf persuasion
  aliveOf(g).filter(p => p.roleId === 'werewolf').forEach(() => aliveOf(g).filter(E.isBlack).forEach(b => { S[b.id] += cfg.wwPersuade; }));
  // 4. Social reads
  const skill = cfg.skill * Math.sqrt(10 / g.n); // less attention per player at big tables
  al.forEach(x => { S[x.id] += (E.isBlack(x) ? skill : x.roleId === 'maniac' ? skill * 0.4 : 0) + gauss() * cfg.sigma; });
  // 5. Mafia day target (per family) and push
  const famTargets = {};
  for (const fam of (g.twoFamilies ? ['A', 'B'] : [null])) {
    const members = al.filter(p => E.isBlack(p) && (fam === null || p.family === fam));
    if (!members.length) continue;
    const cands = al.filter(p => !(E.isBlack(p) && (fam === null || p.family === fam)));
    const t = argmax(cands, x => S[x.id] + 0.3 * K.ch[x.id] + (K.known[x.id] === 'red' ? -1 : 0));
    famTargets[fam] = t ? t.id : null;
    if (t) S[t.id] += cfg.mafiaPush * members.length;
  }
  // 6. Kamikaze
  for (const k of al.filter(p => p.roleId === 'kamikaze' && !p.kamikazeUsed)) {
    const ranked = al.slice().sort((a, b) => S[b.id] - S[a.id]);
    if (ranked[0].id === k.id || (ranked[1] && ranked[1].id === k.id && S[k.id] > cfg.kamikazeThreshold)) {
      const reds = al.filter(p => !E.isBlack(p) && p.id !== k.id);
      const t = isAlive(g, K.claimed.sheriff) ? K.claimed.sheriff : (argmax(reds, x => (K.claimed.journalist === x.id || K.claimed.thief === x.id ? 5 : 0) - S[x.id] + K.ch[x.id]) || {}).id;
      if (t) { E.useKamikaze(g, k.id, t); markRevealed(g, K, k.id, 'black'); const w = E.checkWin(g); if (w) { g.winner = w; return; } }
    }
  }
  // 7. Voting
  const al2 = aliveOf(g); const b = g.ballot; b.candidates = []; b.votes = {};
  for (const v of al2) {
    let t = null;
    if (E.isBlack(v)) t = famTargets[g.twoFamilies ? v.family : null];
    else if (v.roleId === 'jester') t = al2[Math.floor(rnd() * al2.length)].id;
    else {
      const others = al2.filter(x => x.id !== v.id);
      t = argmax(others, x => S[x.id] + (K.priv[v.id][x.id] || 0) + gauss() * cfg.voteNoise).id;
    }
    if (!t || t === v.id || !isAlive(g, t)) continue;
    b.votes[v.id] = t; if (!b.candidates.includes(t)) b.candidates.push(t);
    K.hist.push({ day: g.day, voter: v.id, target: t });
  }
  const t = E.tally(g);
  let elim = null;
  if (t.leaders.length === 1) elim = t.leaders[0];
  else if (t.leaders.length > 1) elim = t.leaders[Math.floor(rnd() * t.leaders.length)];
  // Judge veto
  const judge = al2.find(p => p.roleId === 'judge' && !p.judgeUsed);
  if (judge && elim && (elim === judge.id || elim === K.claimed.sheriff || elim === K.claimed.journalist || K.known[elim] === 'red') && rnd() < 0.9) { E.useJudge(g, judge.id); return; }
  E.finishVote(g, elim);
  if (elim) {
    const p = E.P(g, elim); markRevealed(g, K, elim, E.isBlack(p) ? 'black' : 'red');
    while (g.pendingTriggers.length) {
      const tr = g.pendingTriggers[0]; const cands = aliveOf(g);
      if (!cands.length) { g.pendingTriggers.shift(); continue; }
      const target = argmax(cands, x => S[x.id] + (K.priv[tr.actorId][x.id] || 0));
      E.applyTrigger(g, tr, target.id);
    }
    g.voteResult.removed.forEach(d => { const q = E.P(g, d.id); markRevealed(g, K, d.id, E.isBlack(q) ? 'black' : 'red'); });
  }
}
function markRevealed(g, K, pid, color) {
  K.known[pid] = color;
  K.hist.filter(h => h.target === pid).forEach(h => { if (isAlive(g, h.voter)) K.S[h.voter] += color === 'red' ? 0.5 : -0.7; });
}

/* ---------- Evaluation ---------- */
function evaluate(n, comp, games, cfg = DEFAULT_CFG) {
  const c = { city: 0, mafia: 0, maniac: 0, draw: 0, jester: 0, nights: 0 };
  for (let i = 0; i < games; i++) { const r = playGame(n, comp, cfg); c[r.side]++; if (r.jester) c.jester++; c.nights += r.nights; }
  const pct = k => Math.round(1000 * c[k] / games) / 10;
  return { n, games, mafia: pct('mafia'), city: pct('city'), maniac: pct('maniac'), draw: pct('draw'), jester: pct('jester'), avgNights: Math.round(10 * c.nights / games) / 10, comp };
}
module.exports = { playGame, evaluate, E, ROLE, DEFAULT_CFG };

if (require.main === module) {
  const games = +(process.argv[2] || 1000);
  const t0 = Date.now();
  const out = [];
  for (let n = 7; n <= 24; n++) {
    const r = evaluate(n, E.presetFor(n), games);
    out.push(r);
    console.log(`N=${String(n).padStart(2)}  мафия ${String(r.mafia).padStart(5)}%  город ${String(r.city).padStart(5)}%  маньяк ${String(r.maniac).padStart(4)}%  шут ${r.jester}%  ночей ${r.avgNights}`);
  }
  console.log(`time ${(Date.now() - t0) / 1000}s`);
  fs.writeFileSync(__dirname + '/baseline.json', JSON.stringify(out, null, 1));
}
