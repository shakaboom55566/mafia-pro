/* ============================================================
   ENGINE: game state, night resolution, voting, triggers, win check
   ============================================================ */
const uid = () => Math.random().toString(36).slice(2, 9);
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

function newGame(n, comp, names, settings, profileIds = [], mods = {}) {
  mods = mods || {};
  const twoFamilies = n >= (mods.twoFamiliesFrom || TWO_FAMILIES_FROM);
  const roles = shuffle(comp);
  const players = roles.map((roleId, i) => ({
    id: uid(), seat: i + 1, name: (names[i] || '').trim() || tt(L.e.player, { n: i + 1 }), roleId, family: null, profileId: profileIds[i] || null, votedOut: false, fouls: 0, lobbyHits: 0, betHits: 0, puppets: [], immunityUsed: false, prosecuteUsed: false, lastShield: null,
    alive: true, healedSelf: false, lastHeal: null, lastRabbi: [], disabled: false, kamikazeUsed: false, executeUsed: false, judgeUsed: false, deadOn: null
  }));
  if (twoFamilies) {
    const blacks = players.filter(p => ROLE[p.roleId].team === 'black');
    const dons = blacks.filter(p => p.roleId === 'don');
    dons.forEach((d, i) => d.family = i % 2 === 0 ? 'A' : 'B');
    let turn = 0;
    blacks.filter(p => p.roleId !== 'don').forEach(p => { p.family = turn++ % 2 === 0 ? 'A' : 'B'; });
    if (!blacks.some(p => p.family === 'B')) blacks[blacks.length - 1].family = 'B';
    const lawyers = blacks.filter(p => p.roleId === 'lawyer');
    if (lawyers.length >= 2 && lawyers[0].family === lawyers[1].family) { const other = lawyers[0].family === 'A' ? 'B' : 'A'; const swap = blacks.find(p => p.family === other && p.roleId !== 'don' && p.roleId !== 'lawyer'); if (swap) { swap.family = lawyers[1].family; lawyers[1].family = other; } }
    players.filter(p => p.roleId === 'werewolf').forEach(p => p.family = 'A');
  }
  players.filter(p => p.roleId === 'contractor').forEach(p => { const others = players.filter(x => x.id !== p.id); p.contractId = others[Math.floor(Math.random() * others.length)].id; });
  return {
    id: uid(), createdAt: Date.now(), n, twoFamilies, players, settings: Object.assign({}, settings),
    phase: 'night0', day: 0, night: 0, stepIdx: 0, steps: [], actions: [], nightResult: null,
    dayStage: 'morning', speechIdx: 0, ballot: null, voteResult: null, pendingTriggers: [], ballots: [], nightLog: [], dayLog: [],
    effects: { voidVote: {}, bonusVote: {}, hypno: {}, negVote: {}, forcedCand: {}, anonVotes: {}, certified: {}, sanctuary: {}, immune: {}, follow: {} }, bets: {}, log: [], winner: null, jesterWon: null, extraWinners: [], doused: [], mods, dealt: false, dealIdx: 0, dealOpen: false
  };
}

const P = (g, id) => g.players.find(p => p.id === id);
const alive = g => g.players.filter(p => p.alive);
const aliveWith = (g, roleId) => alive(g).filter(p => p.roleId === roleId);
const isBlack = p => ROLE[p.roleId].team === 'black';
/* Corrupter (v50): a recruited player keeps their card but plays for the mafia until the game ends or they leave */
const onMafiaSide = p => isBlack(p) || !!p.recruitedBy;
const liveRecruitOf = (g, corrId) => alive(g).find(p => p.recruitedBy === corrId) || null;
/* which side a player plays for in this game (recruits — mafia; the Bomb of the bomb hunt — itself) */
function playSideOf(g, p) {
  if (p.recruitedBy) return 'mafia';
  if (g.mods && g.mods.bombHunt && p.roleId === 'bomb') return 'bomb';
  return ROLE[p.roleId].side;
}
/* a recruit may not vote against the corrupter who bought them */
const voteAllowed = (g, voterId, candId) => { const v = P(g, voterId); return !(v && v.recruitedBy && v.recruitedBy === candId); };
const label = p => `${p.seat} · ${p.name}`;
function families(g) { return g.twoFamilies ? ['A', 'B'] : [null]; }
function familyMembers(g, fam) {
  return alive(g).filter(p => (isBlack(p) || p.roleId === 'werewolf') && (fam === null || p.family === fam));
}
function familyName(fam) { return fam ? tt(L.e.familyOf, { name: FAMILY_NAMES[fam] }) : L.e.family; }
function familyNameLc(fam) { return fam ? tt(L.e.familyOfLc, { name: FAMILY_NAMES[fam] }) : L.e.familyLc; }
function shooterOf(g, fam) {
  for (const rid of SHOOTER_ORDER) {
    const c = alive(g).find(p => p.roleId === rid && (fam === null || p.family === fam));
    if (c) return c;
  }
  return null;
}
function gunsmithNight(g, fam) {
  return g.night >= 2 && (g.night % 2 === 0 || !!(g.mods && g.mods.gunsmithEveryNight)) && alive(g).some(p => p.roleId === 'gunsmith' && (fam === null || p.family === fam));
}
/* The ability a player actually holds tonight (the family shot moves down the line) */
function activeAbilityOf(g, p) {
  if (!p || !p.alive || p.disabled) return null;
  for (const fam of families(g)) { const s = shooterOf(g, fam); if (s && s.id === p.id) return 'shoot'; }
  const r = ROLE[p.roleId];
  if (r.id === 'executioner') return p.executeUsed ? null : 'execute';
  if (r.id === 'sniper') return p.snipeUsed ? null : 'snipe';
  if (r.id === 'amnesiac') return p.remembered ? null : 'remember';
  return r.wake ? r.ability : null;
}
let LOG_ENABLED = true;
function addLog(g, text, secret = false) {
  if (!LOG_ENABLED) return;
  const ph = g.phase === 'night0' ? L.e.ph.n0 : g.phase === 'day0' ? L.e.ph.d0 : (g.phase === 'night' ? tt(L.e.ph.n, { n: g.night }) : tt(L.e.ph.d, { n: g.day }));
  g.log.push({ ph, text, secret, t: Date.now() });
}

/* ---------- Night steps ---------- */
function buildNight0Steps(g) {
  const steps = [];
  families(g).forEach(fam => {
    const m = familyMembers(g, fam);
    if (m.length && m.every(p => p.roleId === 'corrupter')) return; // a lone Corrupter wakes on his own step below
    if (m.length) steps.push({ id: uid(), type: 'meet', title: familyName(fam), roleId: 'don', members: m, fam,
      script: tt(L.e.night0Family, { family: familyNameLc(fam) }) });
  });
  NIGHT0_ORDER.forEach(rid => {
    const m = aliveWith(g, rid);
    if (m.length) steps.push({ id: uid(), type: 'meet', title: ROLE[rid].name, roleId: rid, members: m,
      script: tt(L.e.night0Role, { role: ROLE[rid].name, tail: ROLE[rid].wake ? L.e.night0Active : L.e.night0Passive }) });
  });
  aliveWith(g, 'corrupter').forEach(c => steps.push({ id: uid(), type: 'act', roleId: 'corrupter', actorId: c.id, ability: 'recruit', targets: 1, allowSelf: false, script: L.e.recruitScript0 }));
  return steps;
}

function buildNightSteps(g) {
  const steps = [];
  const act = (roleId, p, extra) => Object.assign({ id: uid(), type: 'act', roleId, actorId: p.id, ability: ROLE[roleId].ability, targets: 1, allowSelf: false }, extra);
  families(g).forEach(fam => {
    const m = familyMembers(g, fam);
    const blacks = m.filter(isBlack);
    if (!blacks.length) return;
    if (blacks.every(p => p.roleId === 'corrupter') && !m.some(p => p.roleId === 'werewolf')) return; // the Corrupter does not shoot
    const shooter = shooterOf(g, fam);
    if (shooter) {
      const two = gunsmithNight(g, fam);
      steps.push(act('don', shooter, { ability: 'shoot', fam, title: familyName(fam), members: m, targets: two ? 2 : 1,
        note: isClassic(g) ? L.ui.missHint : shooter.roleId !== 'don' ? tt(L.e.shotNoteSucc, { role: ROLE[shooter.roleId].name, player: label(shooter) }) : (two ? L.e.shotNoteTwo : null),
        script: tt(L.e.script2.famShot, { family: familyNameLc(fam), role: ROLE[shooter.roleId].name, targets: two ? L.e.targetsTwo : L.e.targetsOne }) }));
    } else {
      steps.push({ id: uid(), type: 'meet', title: familyName(fam), roleId: 'don', members: m, fam, script: tt(L.e.famWake, { family: familyNameLc(fam) }) });
    }
    const don = blacks.find(p => p.roleId === 'don');
    if (don) steps.push(act('don', don, { fam, ability: 'findSheriff', title: L.e.donCheckTitle, script: L.e.script2.donCheck }));
    const ex = g.night >= 2 ? blacks.find(p => p.roleId === 'executioner' && !p.executeUsed) : null;
    if (ex) steps.push(act('executioner', ex, { fam, script: L.e.script.executioner }));
    const sp = blacks.find(p => p.roleId === 'spy');
    if (sp) steps.push(act('spy', sp, { fam, script: L.e.script.spy }));
    const md = blacks.find(p => p.roleId === 'mafia_doctor');
    if (md) steps.push(act('mafia_doctor', md, { fam, allowSelf: !md.healedSelf, script: L.e.script.mafia_doctor }));
    const bl = blacks.find(p => p.roleId === 'balamut');
    if (bl) steps.push(act('balamut', bl, { fam, allowSelf: true, script: L.e.script.balamut }));
    const ar = blacks.find(p => p.roleId === 'arsonist');
    if (ar) steps.push(act('arsonist', ar, { fam, modes: ar.igniteUsed ? null : ['douse', 'ignite'], targetsByMode: { douse: 1, ignite: 0 }, script: L.e.script2.arsonist }));
    const hy = blacks.find(p => p.roleId === 'hypnotist');
    if (hy) steps.push(act('hypnotist', hy, { fam, targets: 2, script: L.e.script2.hypnotist }));
    const sb = blacks.find(p => p.roleId === 'saboteur');
    if (sb) steps.push(act('saboteur', sb, { fam, script: L.e.script2.saboteur }));
    ['blackmailer', 'provocateur', 'treasurer'].forEach(rid => { const q = blacks.find(p => p.roleId === rid); if (q) steps.push(act(rid, q, { fam, script: L.e.script3[rid] })); });
    const th = blacks.find(p => p.roleId === 'thug'); if (th) steps.push(act('thug', th, { fam, script: L.e.script4.thug }));
  });
  const one = (rid, extra) => aliveWith(g, rid).forEach(p => steps.push(act(rid, p, extra)));
  aliveWith(g, 'corrupter').filter(c => !liveRecruitOf(g, c.id)).forEach(c => steps.push(act('corrupter', c, { fam: c.family || null, script: L.e.recruitScript })));
  one('maniac', { script: L.e.script.maniac });
  one('witch', { targets: 2, script: L.e.script2.witch });
  aliveWith(g, 'amnesiac').filter(p => !p.remembered).forEach(p => steps.push(act('amnesiac', p, { deadTargets: true, script: L.e.script2.amnesiac })));
  one('jailer', { script: L.e.script2.jailer });
  one('thief', { targets: 2, script: L.e.script.thief });
  one('monk', { script: L.e.script.monk });
  one('sheriff', { modes: isClassic(g) ? ['check'] : ['check', 'shoot'], script: L.e.script.sheriff });
  one('doctor', { script: L.e.script.doctor });
  one('journalist', { targets: 2, script: L.e.script.journalist });
  one('drunk', { script: L.e.script.drunk });
  one('altruist', { script: L.e.script.altruist });
  one('rabbi', { targets: 2, script: L.e.script.rabbi });
  one('bodyguard', { script: L.e.script.bodyguard });
  aliveWith(g, 'sniper').filter(p => !p.snipeUsed).forEach(p => steps.push(act('sniper', p, { script: L.e.script2.sniper })));
  one('tracker', { script: L.e.script2.tracker });
  ['notary', 'pastor', 'gambler', 'peacemaker', 'puppeteer'].forEach(rid => one(rid, { script: L.e.script3[rid] }));
  one('sapper', { script: L.e.script4.sapper }); one('auditor', { script: L.e.script4.auditor });
  steps.forEach(s => {
    if (s.type === 'act' && s.actorId) {
      const p = P(g, s.actorId);
      if (s.allowSelf === undefined) s.allowSelf = false;
      if (s.roleId === 'doctor') s.allowSelf = !p.healedSelf;
      if (p.disabled) s.disabled = true;
    }
  });
  return steps;
}

/* Which players a step may target */
function stepTargets(g, step) {
  const actor = P(g, step.actorId);
  if (step.deadTargets) return g.players.filter(p => !p.alive).map(p => ({ p, ok: true, why: L.e.whyDead }));
  return alive(g).map(p => {
    let ok = true, why = '';
    if (step.roleId === 'jailer' && p.id === actor.lastJail) { ok = false; why = L.e.whyJailLast; }
    if (p.id === actor.id && !step.allowSelf) { ok = false; why = L.e.why.self; }
    if (actor.recruitedBy && p.id === actor.recruitedBy && (['shoot', 'execute', 'snipe'].includes(step.ability) || (step.modes && step.modes.includes('shoot')))) { ok = false; why = L.e.whyRecruiter; }
    if (step.ability === 'recruit' && p.id !== actor.id && onMafiaSide(p)) { ok = false; why = L.e.whyMafiaAlready; }
    if (step.roleId === 'mafia_doctor') {
      if (!isBlack(p) || (g.twoFamilies && p.family !== actor.family)) { ok = false; why = L.e.why.family; }
      if (p.id === actor.lastHeal) { ok = false; why = L.e.why.healedLast; }
    }
    if (step.roleId === 'doctor' && p.id === actor.lastHeal) { ok = false; why = L.e.why.healedLast; }
    if (step.roleId === 'rabbi' && actor.lastRabbi.includes(p.id)) { ok = false; why = L.e.why.rabbiLast; }
    if (step.roleId === 'peacemaker' && p.id === actor.lastShield) { ok = false; why = L.e.whyShieldLast; }
    return { p, ok, why };
  });
}

/* Has the thief stolen this actor's ability tonight? */
function stolenFrom(g, actorId) {
  const t = g.actions.find(a => a.ability === 'steal');
  return t && t.targets[0] === actorId ? t : null;
}

/* Monk redirect: is this the first action aimed at the monk tonight? */
function effectiveTarget(g, targetId) {
  const monkAct = g.actions.find(a => a.ability === 'redirect');
  if (!monkAct || monkAct.actorId !== targetId) return targetId;
  const already = g.actions.some(a => a.ability !== 'redirect' && a.ability !== 'steal' && a.targets.includes(targetId));
  return already ? targetId : monkAct.targets[0];
}
function colorOf(g, pid) {
  const swap = g.actions.find(a => a.ability === 'swap' && !a.voided);
  const base = ROLE[P(g, pid).roleId].color;
  if (swap && swap.targets[0] === pid) return base === 'red' ? 'black' : 'red';
  return base;
}
function checkResult(g, pid) { const t = effectiveTarget(g, pid); return { target: t, color: colorOf(g, t) }; }
function compareResult(g, a, b) {
  const ta = effectiveTarget(g, a), tb = effectiveTarget(g, b);
  return { same: colorOf(g, ta) === colorOf(g, tb), ta, tb };
}

/* Record an action from a step; returns an inline result for the host to show */
function recordAction(g, step, targets, mode) {
  const actor = P(g, step.actorId);
  let ability = step.ability;
  if (step.roleId === 'sheriff') ability = mode === 'shoot' ? 'shoot' : 'check';
  if (step.roleId === 'arsonist') ability = mode === 'ignite' ? 'ignite' : 'douse';
  const a = { id: uid(), stepId: step.id, actorId: actor.id, roleId: step.roleId, ability, targets: targets.slice(), fam: step.fam || null, voided: false };
  let result = null;
  if (ability === 'steal') {
    const victim = P(g, targets[0]);
    a.stolen = activeAbilityOf(g, victim);
    if (a.stolen === 'compare') a.stolen = 'check';
    if (a.stolen === 'check') { const r = checkResult(g, targets[1]); result = { kind: 'color', color: r.color, who: P(g, r.target) }; }
    else if (a.stolen === 'spy') { const t = P(g, effectiveTarget(g, targets[1])); result = { kind: 'role', role: ROLE[t.roleId], who: t }; }
    else if (!a.stolen) result = { kind: 'none', text: tt(L.e.thiefNone, { victim: label(victim) }) };
    else result = { kind: 'text', text: tt(L.e.thiefStole, { ability: ABILITY_LABEL[a.stolen], victim: label(victim), target: label(P(g, targets[1])) }) };
    g.actions.push(a);
    addLog(g, tt(L.e.logThief, { actor: label(actor), victim: label(victim), ability: a.stolen ? ABILITY_LABEL[a.stolen] : L.e.nothing, target: label(P(g, targets[1])) }), true);
    return result;
  }
  if (ability === 'check') { const r = checkResult(g, targets[0]); result = { kind: 'color', color: r.color, who: P(g, r.target) }; }
  if (ability === 'compare') { const r = compareResult(g, targets[0], targets[1]); result = { kind: 'same', same: r.same }; }
  if (ability === 'spy') { const t = P(g, effectiveTarget(g, targets[0])); result = { kind: 'role', role: ROLE[t.roleId], who: t }; }
  if (ability === 'findSheriff') { const t = P(g, effectiveTarget(g, targets[0])); result = { kind: 'sheriff', yes: t.roleId === 'sheriff', who: t }; }
  if (ability === 'recruit') { const t = P(g, targets[0]); t.recruitedBy = actor.id; t.recruitedOn = g.night; result = { kind: 'text', text: tt(L.e.recruitDone, { target: label(t), actor: label(actor) }) }; }
  if (ability === 'defuse' && g.mods && g.mods.bombHunt) { const t = P(g, targets[0]); result = { kind: 'text', text: tt(t.roleId === 'bomb' ? L.e.bhFound : L.e.bhNotFound, { target: label(t) }) }; }
  if (ability === 'execute') actor.executeUsed = true;
  if (ability === 'snipe') actor.snipeUsed = true;
  if (ability === 'ignite') { actor.igniteUsed = true; result = { kind: 'text', text: g.doused.filter(id => P(g, id).alive).length ? tt(L.e.igniteDone, { list: g.doused.filter(id => P(g, id).alive).map(id => label(P(g, id))).join(', ') }) : L.e.igniteNone }; }
  if (ability === 'douse') { if (!g.doused.includes(targets[0])) g.doused.push(targets[0]); result = { kind: 'text', text: tt(L.e.dousedLog, { target: label(P(g, targets[0])) }) }; }
  if (ability === 'jail') actor.lastJail = targets[0];
  if (ability === 'remember') {
    const dead = P(g, targets[0]); const newRole = ROLE[dead.roleId];
    actor.roleId = dead.roleId; actor.remembered = true; actor.family = dead.family || (newRole.team === 'black' && g.twoFamilies ? 'A' : null);
    actor.executeUsed = false; actor.snipeUsed = false; actor.igniteUsed = false; actor.judgeUsed = false; actor.kamikazeUsed = false; actor.healedSelf = false; actor.lastHeal = null; actor.lastRabbi = []; actor.lastJail = null;
    result = { kind: 'role', role: newRole, who: actor };
    g.actions.push(a);
    addLog(g, tt(L.e.rememberLog, { player: label(actor), role: newRole.name }));
    return result;
  }
  if (result) a.res = { kind: result.kind, color: result.color || null, yes: result.yes === undefined ? null : result.yes, same: result.same === undefined ? null : result.same, roleId: result.role ? result.role.id : null, who: result.who ? result.who.id : null };
  g.actions.push(a);
  const names = targets.map(t => label(P(g, t))).join(L.e.and);
  addLog(g, tt(L.e.logAction, { role: ROLE[step.roleId].name, actor: label(actor), ability: ABILITY_LABEL[ability], targets: names }) + (result && result.kind === 'color' ? tt(L.e.eqColor, { color: COLOR_LABEL[result.color] }) : '') + (result && result.kind === 'same' ? (result.same ? L.e.eqSame : L.e.eqDiff) : '') + (result && result.kind === 'sheriff' ? ' = ' + (result.yes ? L.ui.isSheriff : L.ui.notSheriff) : ''), true);
  return result;
}

/* ---------- Night resolution ---------- */
function nearestAlive(g, seat, dir, exclude) {
  const n = g.players.length;
  for (let k = 1; k < n; k++) {
    const s = ((seat - 1 + dir * k) % n + n) % n + 1;
    const p = g.players.find(x => x.seat === s);
    if (p.alive && !exclude.includes(p.id)) return p;
  }
  return null;
}
function eliminate(g, id, cause, out = []) {
  const p = P(g, id);
  if (!p || !p.alive) return out;
  p.alive = false; p.deadOn = { phase: g.phase, day: g.day, night: g.night };
  out.push({ id, cause });
  addLog(g, tt(L.e.eliminated, { player: label(p), role: ROLE[p.roleId].name, cause }));
  if (p.roleId === 'bomb' && !p.defused) {
    g.bombBlew = p.id;
    const ex = out.map(o => o.id).concat([id]);
    const l = nearestAlive(g, p.seat, -1, ex);
    const r = nearestAlive(g, p.seat, +1, ex.concat(l ? [l.id] : []));
    [l, r].filter(Boolean).forEach(nb => eliminate(g, nb.id, tt(L.e.causeBomb, { player: label(p) }), out));
  }
  return out;
}

function resolveNight(g) {
  const acts = g.actions.filter(a => !a.voided);
  const notes = [], quiet = [];
  // 1. Thief
  const thief = acts.find(a => a.ability === 'steal');
  let list = acts.slice();
  if (thief && thief.stolen) {
    list.forEach(a => { if (a.actorId === thief.targets[0]) a.voided = true; });
    list = list.filter(a => !a.voided);
    list.push({ id: uid(), actorId: thief.actorId, roleId: 'thief', ability: thief.stolen, targets: [thief.targets[1]], viaThief: true, fam: null });
    notes.push(tt(L.e.noteThief, { ability: ABILITY_LABEL[thief.stolen], target: label(P(g, thief.targets[1])) }));
  }
  // 1b. Saboteur block and Jailer: the victim's actions are void
  const blockedIds = list.filter(a => a.ability === 'block' || a.ability === 'jail').map(a => a.targets[0]);
  const jailedIds = list.filter(a => a.ability === 'jail').map(a => a.targets[0]);
  if (blockedIds.length) { list.forEach(a => { if (blockedIds.includes(a.actorId) && a.ability !== 'block' && a.ability !== 'jail') a.voided = true; }); list = list.filter(a => !a.voided); }
  // 1c. Witch: A's first target becomes B
  list.filter(a => a.ability === 'control').forEach(w => {
    list.forEach(a => { if (a.actorId === w.targets[0] && a.targets && a.targets.length && a.ability !== 'control' && a.ability !== 'ignite') { a.targets = [w.targets[1]].concat(a.targets.slice(1)); notes.push(tt(L.e.witchLog, { actor: label(P(g, a.actorId)), target: label(P(g, w.targets[1])) })); } });
  });
  // 2. Monk: first action aimed at the monk is redirected
  const monk = list.find(a => a.ability === 'redirect');
  if (monk) {
    const first = list.find(a => a.ability !== 'redirect' && a.ability !== 'steal' && a.targets.includes(monk.actorId));
    if (first) {
      first.targets = first.targets.map(t => t === monk.actorId ? monk.targets[0] : t);
      notes.push(tt(L.e.noteMonk, { ability: ABILITY_LABEL[first.ability], target: label(P(g, monk.targets[0])) }));
    }
  }
  // 3. Rabbi
  const rabbi = list.find(a => a.ability === 'protect');
  const protectedIds = rabbi ? rabbi.targets.slice() : [];
  const rabbiId = rabbi ? rabbi.actorId : null;
  if (rabbi) { const rp = P(g, rabbi.actorId); rp.lastRabbi = rabbi.targets.slice(); }
  // 3b. Bodyguard
  const guard = list.find(a => a.ability === 'guard');
  const guardId = guard ? guard.actorId : null, guardedId = guard ? guard.targets[0] : null;
  // 4. Heals
  const healed = new Set();
  list.filter(a => a.ability === 'heal').forEach(a => {
    healed.add(a.targets[0]);
    const actor = P(g, a.actorId);
    if (!a.viaThief) { actor.lastHeal = a.targets[0]; if (a.targets[0] === actor.id) actor.healedSelf = true; }
  });
  // 5. Shots (every action also gets an outcome per target for the post-game review)
  const dead = []; const shotLog = [];
  const avenged = []; const attacked = new Set(); const savedBy = {};
  const out = (a, t, v) => { a.outcome = a.outcome || {}; a.outcome[t] = v; };
  const dodged = new Set(); // Ninja: the first shot of the night misses
  list.filter(a => a.ability === 'shoot' || a.ability === 'execute' || a.ability === 'snipe').forEach(a => {
    const lethal = a.ability === 'execute';
    a.targets.forEach(t => {
      if (a.ability === 'snipe' && isBlack(P(g, t)) === false) { shotLog.push(tt(L.e.snipeBack, { sniper: label(P(g, a.actorId)), target: label(P(g, t)) })); out(a, t, 'back'); if (!dead.includes(a.actorId)) { dead.push(a.actorId); avenged.push({ id: a.actorId, cause: L.e.causeSnipe }); } return; }
      if (guardedId && t === guardedId && t !== guardId && P(g, guardId).alive) { shotLog.push(tt(L.e.guardLog, { guard: label(P(g, guardId)), target: label(P(g, t)) })); out(a, t, 'guarded'); savedBy[guardId] = t; t = guardId; }
      attacked.add(t);
      const tp = P(g, t); const by = a.viaThief ? L.e.byThief : lethal ? L.e.byExec : (a.roleId === 'don' ? familyNameLc(a.fam) : ROLE[a.roleId].name);
      const pr = { by, target: label(tp) };
      if (jailedIds.includes(t)) { shotLog.push(tt(L.e.jailMiss, pr)); out(a, t, 'jailed'); return; }
      if (protectedIds.includes(t)) { shotLog.push(tt(L.e.shotMiss, pr)); out(a, t, 'protected'); return; }
      if (rabbiId && t === rabbiId) {
        if (healed.has(t) && !lethal) { shotLog.push(tt(L.e.shotRabbiHealed, pr)); out(a, t, 'healed'); return; }
        shotLog.push(tt(L.e.shotRabbi, pr)); out(a, t, 'hit');
        [t, ...protectedIds].forEach(x => { if (!dead.includes(x)) dead.push(x); });
        return;
      }
      if (tp.roleId === 'ninja' && !lethal && !dodged.has(t)) { dodged.add(t); shotLog.push(tt(L.e.ninjaDodge, pr)); out(a, t, 'dodged'); return; }
      if (healed.has(t) && !lethal) { shotLog.push(a.ability === 'snipe' ? tt(L.e.snipeHealed, pr) : tt(L.e.shotHealed, pr)); out(a, t, 'healed'); return; }
      shotLog.push(lethal ? tt(L.e.execHit, { target: label(tp), tail: healed.has(t) ? L.e.execHealTail : '' }) : a.ability === 'snipe' ? tt(L.e.snipeHit, pr) : tt(L.e.shotHit, pr));
      out(a, t, 'hit');
      if (!dead.includes(t)) dead.push(t);
      if (tp.roleId === 'avenger' && a.roleId === 'don' && !a.viaThief) { const shooter = P(g, a.actorId); if (shooter && shooter.alive && !dead.includes(shooter.id)) { dead.push(shooter.id); avenged.push({ id: shooter.id, cause: L.e.causeAvenge }); shotLog.push(tt(L.e.avengeLog, { avenger: label(tp), shooter: label(shooter) })); } }
    });
  });
  // 5b. Arsonist's fire: unhealable, unblockable
  const fire = [];
  if (list.some(a => a.ability === 'ignite')) { g.doused.forEach(id => { const p = P(g, id); if (p && p.alive) { fire.push(id); shotLog.push(tt(L.e.fireHit, { target: label(p) })); } }); g.doused = []; }
  // 6. Next-day effects
  list.filter(a => a.ability === 'drunk').forEach(a => { g.effects.voidVote[a.targets[0]] = g.night; quiet.push(tt(L.e.quietDrunk, { target: label(P(g, a.targets[0])) })); });
  list.filter(a => a.ability === 'altruist').forEach(a => { g.effects.bonusVote[a.targets[0]] = g.night; quiet.push(tt(L.e.quietAltruist, { target: label(P(g, a.targets[0])) })); });
  list.filter(a => a.ability === 'hypno').forEach(a => { g.effects.hypno[a.targets[0]] = { day: g.night, to: a.targets[1] }; quiet.push(tt(L.e.quietHypno, { target: label(P(g, a.targets[0])), to: label(P(g, a.targets[1])) })); });
  // diplomacy pack: effects on tomorrow's vote
  list.forEach(a => {
    const t = a.targets && a.targets[0]; if (!t) return; const tl = label(P(g, t)); const actor = P(g, a.actorId);
    if (a.ability === 'negvote') { FX(g, 'negVote')[t] = g.night; quiet.push(tt(L.e.quietNeg, { target: tl })); }
    if (a.ability === 'provoke') { FX(g, 'forcedCand')[t] = g.night; quiet.push(tt(L.e.quietProvoke, { target: tl })); }
    if (a.ability === 'stuff') { FX(g, 'anonVotes')[t] = { day: g.night, n: 2 }; quiet.push(tt(L.e.quietStuff, { target: tl })); }
    if (a.ability === 'certify') { FX(g, 'certified')[t] = g.night; quiet.push(tt(L.e.quietCertify, { target: tl })); }
    if (a.ability === 'sanctuary') { FX(g, 'sanctuary')[t] = g.night; quiet.push(tt(L.e.quietSanctuary, { target: tl })); }
    if (a.ability === 'bet') { g.bets = g.bets || {}; g.bets[a.actorId] = { day: g.night, target: t }; quiet.push(tt(L.e.quietBet, { target: tl })); }
    if (a.ability === 'shield') { FX(g, 'immune')[t] = g.night; actor.lastShield = t; quiet.push(tt(L.e.quietShield, { target: tl })); }
    if (a.ability === 'puppet') { FX(g, 'follow')[t] = { day: g.night, by: a.actorId }; actor.puppets = actor.puppets || []; if (!actor.puppets.includes(t)) actor.puppets.push(t); quiet.push(tt(L.e.quietPuppet, { target: tl, by: label(actor) })); }
    // counter-picks
    if (a.ability === 'defuse') {
      const tp = P(g, t); const what = [];
      if (tp.roleId === 'kamikaze') { FX(g, 'defused')[t] = g.night; what.push(L.e.defKam); }
      if (tp.roleId === 'bomb') { tp.defused = true; what.push(L.e.defBomb); }
      if (g.doused.includes(t)) { g.doused = g.doused.filter(x => x !== t); what.push(L.e.defDouse); }
      a.outcome = { defused: what.length }; quiet.push(what.length ? tt(L.e.quietDefuse, { target: tl, what: what.join(', ') }) : tt(L.e.quietDefuseNone, { target: tl }));
    }
    if (a.ability === 'audit') { FX(g, 'audited')[t] = g.night; quiet.push(tt(L.e.quietAudit, { target: tl })); }
    if (a.ability === 'intimidate') { FX(g, 'intimidated')[t] = g.night; quiet.push(tt(L.e.quietIntimidate, { target: tl })); }
  });
  list.filter(a => a.ability === 'track').forEach(a => { const t = a.targets[0]; const acted = list.find(x => x.actorId === t && x.targets && x.targets.length && !['track', 'control', 'ignite'].includes(x.ability)); quiet.push(acted ? tt(L.e.trackLog, { target: label(P(g, t)), dest: label(P(g, acted.targets[0])) }) : tt(L.e.trackNone, { target: label(P(g, t)) })); });
  // 6b. Outcomes of protective actions: did they actually save someone?
  list.forEach(a => {
    if (a.ability === 'heal') out(a, a.targets[0], attacked.has(a.targets[0]) && !dead.includes(a.targets[0]) ? 'saved' : 'idle');
    if (a.ability === 'protect') a.targets.forEach(t => out(a, t, attacked.has(t) && !dead.includes(t) ? 'saved' : 'idle'));
    if (a.ability === 'guard') out(a, a.targets[0], savedBy[a.actorId] ? 'saved' : 'idle');
    if (a.ability === 'jail') out(a, a.targets[0], attacked.has(a.targets[0]) ? 'saved' : 'blocked');
    if (a.ability === 'ignite') a.outcome = { fire: fire.slice() };
    if (a.ability === 'redirect') out(a, a.targets[0], list.some(x => x !== a && x.targets.includes(a.targets[0]) && x.ability !== 'redirect') ? 'redirected' : 'idle');
  });
  // 7. Apply deaths
  const removed = [];
  dead.forEach(id => { const av = avenged.find(x => x.id === id); eliminate(g, id, av ? av.cause : L.e.causeShot, removed); });
  fire.forEach(id => eliminate(g, id, L.e.causeFire, removed));
  shotLog.forEach(s => addLog(g, s, true));
  notes.forEach(s => addLog(g, s, true));
  // 8. Persist this night's actions for the post-game review
  g.nightLog = g.nightLog || [];
  g.actions.concat(list.filter(a => a.viaThief)).forEach(a => g.nightLog.push({ night: g.night, actorId: a.actorId, roleId: a.roleId, ability: a.ability, targets: (a.targets || []).slice(), voided: !!a.voided, viaThief: !!a.viaThief, stolen: a.stolen || null, outcome: a.outcome || null, res: a.res || null, attacked: [...attacked], dead: dead.slice() }));
  g.nightResult = { removed, notes, quiet, shotLog };
  return g.nightResult;
}

/* ---------- Day: voting ---------- */
function voteWeight(g, voterId) {
  const p = P(g, voterId);
  const base = p.roleId === 'mayor' ? 1.5 : 1;
  if (fxOn(g, 'certified', voterId)) return base * 2; // certified: ×2, immune to void / blackmail
  if (g.effects.voidVote[voterId] === g.day) return 0;
  if (fxOn(g, 'negVote', voterId) && !fxOn(g, 'audited', voterId)) return -1;
  let w = base;
  if (g.effects.bonusVote[voterId] === g.day) w += 1;
  return w;
}
/* where a voter's vote actually lands: hypnosis and the Puppeteer redirect it unless the vote is certified */
function effectiveVotes(g) {
  const b = g.ballot; const eff = {};
  Object.keys(b.votes).forEach(v => {
    let to = b.votes[v];
    if (!voteAllowed(g, v, to)) return;
    if (!fxOn(g, 'certified', v)) {
      const h = g.effects.hypno[v]; if (h && h.day === g.day && alive(g).some(p => p.id === h.to)) to = h.to;
      const f = FX(g, 'follow')[v]; if (f && f.day === g.day) { const master = P(g, f.by); if (master && master.alive && b.votes[f.by]) to = b.votes[f.by]; }
    }
    eff[v] = to;
  });
  return eff;
}
function millerCap(g) { return Math.max(0, 5 - (g.day - 1)); }
function tally(g) {
  const b = g.ballot; const rows = [];
  const eff = effectiveVotes(g);
  b.candidates.forEach(cid => {
    const voters = Object.keys(eff).filter(v => eff[v] === cid);
    let raw = voters.reduce((s, v) => s + voteWeight(g, v), 0);
    const an = FX(g, 'anonVotes')[cid]; const anon = an && an.day === g.day && !fxOn(g, 'audited', cid) ? an.n : 0; raw += anon;
    raw = Math.max(0, raw);
    const cp = P(g, cid);
    let total = raw, capped = false;
    const x2 = b.prosecuted === cid; if (x2) total *= 2;
    if (cp.roleId === 'miller') { const cap = millerCap(g); if (total > cap) { total = cap; capped = true; } }
    rows.push({ cid, voters, raw, total, capped, hands: voters.length, anon, x2 });
  });
  const max = Math.max(0, ...rows.map(r => r.total));
  const leaders = rows.filter(r => r.total === max && max > 0).map(r => r.cid);
  return { rows, max, leaders, eff };
}
/* the Chairman decides a tie if he voted for one of the tied */
function chairmanPick(g, t) {
  if (t.leaders.length < 2) return null;
  const ch = alive(g).find(p => p.roleId === 'chairman' && t.eff[p.id] && t.leaders.includes(t.eff[p.id]));
  return ch ? { id: t.eff[ch.id], chairman: ch.id } : null;
}
function canNominate(g, id) { const p = P(g, id); return !!(p && p.alive && !fxOn(g, 'sanctuary', id)); }
function useBailiff(g, bailiffId) {
  const p = P(g, bailiffId); if (!p || p.finalUsed || g.ballot.final) return false;
  p.finalUsed = true; g.ballot.final = true;
  (g.dayLog = g.dayLog || []).push({ day: g.day, actorId: bailiffId, roleId: 'bailiff', ability: 'final', targetId: null });
  addLog(g, tt(L.e.logFinal, { player: label(p) }));
  return true;
}
const dayAbilityBlocked = (g, id) => fxOn(g, 'intimidated', id) || fxOn(g, 'defused', id);
function useProsecutor(g, prosecutorId, candId) {
  const p = P(g, prosecutorId); if (!p || p.prosecuteUsed || !g.ballot.candidates.includes(candId)) return false;
  p.prosecuteUsed = true; g.ballot.prosecuted = candId;
  (g.dayLog = g.dayLog || []).push({ day: g.day, actorId: prosecutorId, roleId: 'prosecutor', ability: 'prosecute', targetId: candId });
  addLog(g, tt(L.e.logProsecute, { player: label(p), target: label(P(g, candId)) }));
  return true;
}

/* ---------- Win check ---------- */
/* Bomb hunt (v50): only the Sapper can defuse the Bomb at night. Voting out a defused Bomb — the city wins; an undefused one explodes — the city lost.
   Two left: the Sapper with the Bomb — the Sapper wins; anyone else with the Bomb — the city lost. The Sapper gone and the Bomb live — nobody can defuse it. */
function bombHuntWin(g) {
  const bomb = g.players.find(p => p.roleId === 'bomb'); if (!bomb) return null;
  const al = alive(g);
  const city = text => ({ side: 'city', title: L.e.bhCityTitle, text });
  const boom = text => ({ side: 'bomb', title: L.e.bhBombTitle, text });
  if (!bomb.alive) return bomb.defused ? city(tt(L.e.bhDefusedOut, { player: label(bomb) })) : boom(tt(L.e.bhExploded, { player: label(bomb) }));
  if (al.length <= 2) { const other = al.find(p => p.id !== bomb.id); return other && other.roleId === 'sapper' ? city(L.e.bhDuelSapper) : boom(L.e.bhDuelCitizen); }
  if (!bomb.defused && !al.some(p => p.roleId === 'sapper')) return boom(L.e.bhNoSapper);
  return null;
}
function checkWin(g) {
  if (g.mods && g.mods.bombHunt) return bombHuntWin(g);
  const al = alive(g);
  const blacks = al.filter(onMafiaSide);
  const others = al.filter(p => !onMafiaSide(p));
  const maniac = al.find(p => p.roleId === 'maniac');
  if (maniac && al.length <= 2 && blacks.length === 0) return { side: 'maniac', title: L.e.winManiac, text: tt(L.e.winManiacText, { player: label(maniac) }) };
  if (blacks.length === 0) return { side: 'city', title: L.e.winCity, text: maniac ? L.e.winCityManiac : L.e.winCityText };
  if (!g.twoFamilies) {
    if (g.mods && g.mods.mafiaMajority ? blacks.length > others.length : blacks.length >= others.length) return { side: 'mafia', title: L.e.winMafia, text: L.e.winMafiaText };
    return null;
  }
  const A = blacks.filter(p => p.family === 'A'), B = blacks.filter(p => p.family === 'B');
  const famWin = (f, text) => ({ side: 'mafia', family: f, title: tt(L.e.winFamily, { name: FAMILY_NAMES[f] }), text });
  if (A.length && A.length >= B.length + others.length) return famWin('A', tt(L.e.famControl, { name: FAMILY_NAMES.A }));
  if (B.length && B.length >= A.length + others.length) return famWin('B', tt(L.e.famControl, { name: FAMILY_NAMES.B }));
  if (blacks.length >= others.length) {
    if (A.length > B.length) return famWin('A', tt(L.e.famStronger, { a: FAMILY_NAMES.A, b: FAMILY_NAMES.B }));
    if (B.length > A.length) return famWin('B', tt(L.e.famStronger, { a: FAMILY_NAMES.B, b: FAMILY_NAMES.A }));
    const donA = A.some(p => p.roleId === 'don'), donB = B.some(p => p.roleId === 'don');
    if (donA !== donB) return famWin(donA ? 'A' : 'B', L.e.famDon);
    return { side: 'mafia', family: null, title: L.e.winBoth, text: L.e.winBothText };
  }
  return null;
}

/* ---------- Phase transitions ---------- */
function startNight0(g) { g.phase = 'night0'; g.steps = buildNight0Steps(g); g.stepIdx = 0; addLog(g, L.e.logNight0); }
function startDay0(g) { g.phase = 'day0'; g.dayStage = 'intro'; g.speechIdx = 0; addLog(g, L.e.logDay0); }
function startNight(g) {
  g.phase = 'night'; g.night += 1; g.actions = []; g.nightResult = null;
  g.steps = buildNightSteps(g); g.stepIdx = 0; g.pendingResult = null;
  addLog(g, tt(L.e.logNight, { n: g.night }));
}
function startDay(g) {
  g.phase = 'day'; g.day += 1; g.dayStage = 'morning'; g.speechIdx = 0; g.ballot = { candidates: [], votes: {}, round: 1, nominatedBy: {} }; g.voteResult = null; g.pendingTriggers = [];
  // every day the minutes (and the vote stepper) start from the next living seat after the previous day's first speaker
  g.dayFirstSeat = classicFirstSeat(g);
  // sport rules: the first day has no night before it (straight to speeches)
  if (isClassic(g) && g.night === 0) g.dayStage = 'speeches';
  addLog(g, tt(L.e.logDay, { n: g.day }));
  // Azazel killed last night takes a player with him at the day's results (he may also let it go)
  ((g.nightResult && g.nightResult.removed) || []).forEach(d => { const p = P(g, d.id); if (p && !p.alive && p.roleId === 'azazel') g.pendingTriggers.push({ type: 'azazel', actorId: p.id, night: true }); });
  // diplomacy: the Provocateur's victim is already on the ballot (unless under the Pastor's sanctuary)
  alive(g).filter(p => fxOn(g, 'forcedCand', p.id) && canNominate(g, p.id)).forEach(p => { g.ballot.candidates.push(p.id); g.ballot.forced = (g.ballot.forced || []).concat([p.id]); addLog(g, tt(L.e.logProvoked, { target: label(p) })); });
}
const isClassic = g => !!(g && g.mods && g.mods.classic);
const FX = (g, key) => { g.effects = g.effects || {}; return g.effects[key] = g.effects[key] || {}; };
const fxOn = (g, key, id) => FX(g, key)[id] === g.day;
function classicFirstSeat(g) {
  const al = alive(g); if (!al.length) return 1;
  if (g.day <= 1 || !g.dayFirstSeat) return al[0].seat;
  const nxt = al.find(p => p.seat > g.dayFirstSeat) || al[0]; return nxt.seat;
}
/* order of day speeches: seat order, rotated to start from the day's first speaker */
function speakOrder(g) {
  const al = alive(g); if (!g.dayFirstSeat) return al;
  const i = al.findIndex(p => p.seat >= g.dayFirstSeat); return i <= 0 ? al : al.slice(i).concat(al.slice(0, i));
}
/* the host asks the voters in the same order as the day's speeches */
function voteOrder(g) { return speakOrder(g).filter(v => canVoteNow(g, v.id)); }
/* classic: nominations happen inside speeches, one per speaker, voted in nomination order */
function nominate(g, speakerId, candId) {
  const b = g.ballot; b.nominatedBy = b.nominatedBy || {};
  if (b.nominatedBy[speakerId] || !canNominate(g, candId) || fxOn(g, 'intimidated', speakerId)) return false;
  b.nominatedBy[speakerId] = candId; if (!b.candidates.includes(candId)) b.candidates.push(candId);
  addLog(g, tt(L.e.logNominate, { player: label(P(g, speakerId)), target: label(P(g, candId)) }));
  return true;
}
function unnominate(g, speakerId) {
  const b = g.ballot; const c = b.nominatedBy && b.nominatedBy[speakerId]; if (!c) return;
  delete b.nominatedBy[speakerId];
  if (!Object.values(b.nominatedBy).includes(c)) b.candidates = b.candidates.filter(x => x !== c);
}
/* classic: "close the vote" — non-voters go to the last candidate, then the outcome is resolved automatically */
function resolveVoteAuto(g) {
  voteRestToLast(g);
  const o = voteOutcome(g);
  if (o.kind === 'leader') { finishVote(g, o.id); return 'done'; }
  if (o.kind === 'tie') { if ((g.ballot.round || 1) === 1) { startTiebreak(g); return 'tie'; } if (isClassic(g)) { startLiftAll(g); return 'lift'; } startRoulette(g); return 'roulette'; }
  return o.kind;
}
/* classic: second tie → vote to lift all tied players; passes with more than half of the living */
function startLiftAll(g) {
  logBallot(g);
  const t = tally(g); const b = g.ballot;
  const ids = (t.max > 0 ? t.leaders : b.candidates).slice().sort(bySeat(g));
  b.round2 = t; b.lift = { ids, yes: [] };
  g.dayStage = 'lift';
}
function liftNeed(g) { return Math.floor(alive(g).length / 2) + 1; }
function liftToggle(g, voterId) { const l = g.ballot.lift; if (!l) return; const i = l.yes.indexOf(voterId); if (i >= 0) l.yes.splice(i, 1); else l.yes.push(voterId); }
function finishLiftAll(g) {
  const b = g.ballot; const l = b.lift; if (!l) return;
  const t = tally(g); const need = liftNeed(g); const passed = l.yes.length >= need; const removed = [];
  const list = seatList(g, l.ids);
  if (passed) {
    l.ids.forEach(id => { const p = P(g, id); if (!p.alive) return; p.votedOut = true; if (p.roleId === 'jester') g.jesterWon = p.id; eliminate(g, id, tt(L.e.causeLift, { n: l.yes.length, votes: plural(l.yes.length, 'votes') }), removed); });
    addLog(g, tt(L.e.logLiftPass, { n: l.yes.length, need, list }));
  } else addLog(g, tt(L.e.logLiftFail, { n: l.yes.length, need, list }));
  g.voteResult = { tally: t, eliminatedId: null, removed, round: 2, round1: b.round1 || null, lift: { ids: l.ids, yes: l.yes.length, need, passed } };
  g.dayStage = 'result';
}
/* classic: the first-night victim names up to three suspects */
function recordBestMove(g, byId, picks) {
  g.bestMove = { by: byId, picks: picks.slice() };
  (g.dayLog = g.dayLog || []).push({ day: g.day, actorId: byId, roleId: P(g, byId).roleId, ability: 'bestMove', targets: picks.slice() });
  addLog(g, tt(L.e.logBestMove, { player: label(P(g, byId)), list: picks.length ? picks.map(id => P(g, id).seat).join(', ') : '—' }));
}
/* classic: fouls — 3 → no speech, 4 → removed from the game */
function addFoul(g, pid) {
  const p = P(g, pid); p.fouls = (p.fouls || 0) + 1;
  addLog(g, tt(L.e.logFoul, { player: label(p), n: p.fouls }));
  if (p.fouls >= 4 && p.alive) eliminate(g, pid, L.e.causeFouls);
  return p.fouls;
}
function removeFoul(g, pid) { const p = P(g, pid); p.fouls = Math.max(0, (p.fouls || 0) - 1); return p.fouls; }
/* Journal + persistent record of who voted for whom (intended votes; weights from tally) */
function logBallot(g) {
  const b = g.ballot; if (!b || b.logged) return; b.logged = true;
  const t = tally(g); g.ballots = g.ballots || [];
  const voters = alive(g).filter(v => canVoteNow(g, v.id));
  g.ballots.push({ day: g.day, round: b.round || 1, candidates: b.candidates.slice(), votes: Object.assign({}, b.votes), weights: Object.fromEntries(voters.map(v => [v.id, voteWeight(g, v.id)])), rows: t.rows.map(r => ({ cid: r.cid, total: r.total, voters: r.voters.slice() })) });
  const pre = b.round === 2 ? L.e.revotePrefix : '';
  b.candidates.forEach(cid => {
    const row = t.rows.find(r => r.cid === cid); const who = Object.keys(b.votes).filter(v => b.votes[v] === cid).map(v => P(g, v).seat).sort((x, y) => x - y);
    addLog(g, pre + tt(L.e.logBallotRow, { seat: P(g, cid).seat, player: P(g, cid).name, voters: who.length ? who.join(', ') : '—', n: row ? row.total : 0, votes: plural(Math.round(row ? row.total : 0), 'votes') }));
  });
  const nv = voters.filter(v => !b.votes[v.id]); if (b.candidates.length && nv.length) addLog(g, pre + tt(L.e.logNoVoters, { list: nv.map(v => v.seat).join(', ') }));
}
function finishVote(g, eliminatedId, opts = {}) {
  logBallot(g);
  const removed = [];
  const t = tally(g); const b = g.ballot;
  g.voteResult = { tally: t, eliminatedId, removed, round: b.round || 1, round1: b.round1 || null, roulette: opts.roulette ? b.roulette : null };
  if (eliminatedId && !opts.roulette) { const cp = chairmanPick(g, t); if (cp && cp.id === eliminatedId) { g.voteResult.chairman = cp.chairman; addLog(g, tt(L.e.logChairman, { player: label(P(g, eliminatedId)) })); } }
  if (eliminatedId) {
    const p = P(g, eliminatedId);
    // diplomacy: the Ambassador's one-time immunity and the Peacemaker's shield cancel the expulsion
    if (!b.final && p.roleId === 'ambassador' && !p.immunityUsed) { p.immunityUsed = true; addLog(g, tt(L.e.logImmunity, { player: label(p) })); g.voteResult.eliminatedId = null; g.voteResult.immune = { id: p.id, kind: 'ambassador' }; g.dayStage = 'result'; return; }
    if (!b.final && fxOn(g, 'immune', p.id)) { addLog(g, tt(L.e.logShielded, { player: label(p) })); g.voteResult.eliminatedId = null; g.voteResult.immune = { id: p.id, kind: 'shield' }; g.dayStage = 'result'; return; }
    alive(g).forEach(q => {
      if (q.roleId === 'lobbyist' && q.id !== p.id && b.votes[q.id] === eliminatedId) { q.lobbyHits = (q.lobbyHits || 0) + 1; if (q.lobbyHits === 3) addLog(g, tt(L.e.logLobbyWin, { player: label(q) })); }
      if (q.roleId === 'gambler' && q.id !== p.id) { const bt = (g.bets || {})[q.id]; if (bt && bt.day === g.day && bt.target === eliminatedId) { q.betHits = (q.betHits || 0) + 1; if (q.betHits === 2) addLog(g, tt(L.e.logGamblerWin, { player: label(q) })); } }
    });
    if (p.roleId === 'azazel') g.pendingTriggers.push({ type: 'azazel', actorId: p.id });
    if (p.roleId === 'morpheus') g.pendingTriggers.push({ type: 'morpheus', actorId: p.id });
    if (p.roleId === 'jester') { g.jesterWon = p.id; addLog(g, tt(L.e.logJester, { player: label(p) })); }
    p.votedOut = true;
    const row = t.rows.find(r => r.cid === eliminatedId); const v = row ? row.total : 0;
    const cause = opts.roulette ? tt(L.e.causeRoulette, { n: b.roulette.number }) : tt(b.round === 2 ? L.e.causeRevote : L.e.causeVote, { n: v, votes: plural(Math.round(v), 'votes') });
    eliminate(g, eliminatedId, cause, removed);
    alive(g).filter(c => c.roleId === 'contractor' && c.contractId === eliminatedId && !g.extraWinners.includes(c.id)).forEach(c => { g.extraWinners.push(c.id); addLog(g, tt(L.e.contractWon, { player: label(c), target: label(p) })); });
  } else addLog(g, isClassic(g) && b.candidates.length === 1 && g.day === 1 ? L.e.logNoVoteDay1 : L.e.logNoVote);
  g.dayStage = 'result';
}
/* Tie → defence speeches → re-vote between the tied only → tie again → roulette (hidden number 1–9, the one who names it is out) */
const seatList = (g, ids) => ids.map(id => P(g, id).seat).join(L.e.and);
const bySeat = g => (a, b) => P(g, a).seat - P(g, b).seat;
function voteOutcome(g) {
  const t = tally(g); const b = g.ballot;
  if (!b.candidates.length) return { kind: 'empty', t };
  if (isClassic(g) && g.day === 1 && b.candidates.length === 1 && (b.round || 1) === 1) return { kind: 'skip1', t };
  if (t.max === 0) {
    // everyone has voted but nothing counts (weightless / redirected votes): a tie between all candidates
    const pending = alive(g).some(v => canVoteNow(g, v.id) && !b.candidates.includes(v.id) && !b.votes[v.id]);
    return pending ? { kind: 'none', t } : { kind: 'tie', t, ids: b.candidates.slice() };
  }
  if (t.leaders.length === 1) return { kind: 'leader', t, id: t.leaders[0] };
  const cp = chairmanPick(g, t); if (cp) return { kind: 'leader', t, id: cp.id, chairman: cp.chairman };
  return { kind: 'tie', t, ids: t.leaders };
}
function startTiebreak(g) {
  logBallot(g);
  const t = tally(g); const b = g.ballot;
  b.round1 = t; b.tiedIds = (t.leaders.length ? t.leaders : b.candidates).slice().sort(bySeat(g));
  g.dayStage = 'tie'; g.speechIdx = 0;
  addLog(g, tt(L.e.logTie, { list: seatList(g, b.tiedIds) }));
}
function startRevote(g) {
  const tied = g.ballot.tiedIds.slice();
  g.ballot = { candidates: tied.slice(), votes: {}, round: 2, tiedIds: tied, excludedVoters: tied.length === 2 ? tied.slice() : [], round1: g.ballot.round1 || null };
  g.dayStage = 'vote'; g.speechIdx = 0;
  addLog(g, tt(L.e.logRevote, { list: seatList(g, tied) }));
}
function canVoteNow(g, voterId) { return !(g.ballot.excludedVoters || []).includes(voterId); }
function startRoulette(g) {
  const t = tally(g); const b = g.ballot;
  const ids = (t.max > 0 ? t.leaders : b.candidates).slice().sort(bySeat(g));
  b.round2 = t;
  b.roulette = { number: 1 + Math.floor(Math.random() * 9), order: ids, turn: 0, guesses: [], hitId: null };
  g.dayStage = 'roulette';
  addLog(g, tt(L.e.logRoulette, { list: seatList(g, ids), n: b.roulette.number }), true);
}
function rouletteCurrent(g) { const r = g.ballot.roulette; return r ? P(g, r.order[r.turn % r.order.length]) : null; }
function rouletteGuess(g, n) {
  const r = g.ballot.roulette; if (!r || r.hitId) return null;
  n = +n; if (!(n >= 1 && n <= 9) || r.guesses.some(x => x.n === n)) return null;
  const p = rouletteCurrent(g);
  r.guesses.push({ pid: p.id, n });
  if (n === r.number) { r.hitId = p.id; addLog(g, tt(L.e.logRouletteHit, { player: label(p), n })); finishVote(g, p.id, { roulette: true }); return { hit: true, p }; }
  addLog(g, tt(L.e.logRouletteMiss, { player: label(p), n }));
  r.turn += 1; return { hit: false, p };
}
/* the host's voting table: a voter picks a player; in the first round of a role game that player becomes a candidate by the vote itself
   (and stops being one when nobody votes for him any more, unless he was nominated on purpose) */
function castVote(g, voterId, candId) {
  const b = g.ballot; const v = P(g, voterId); const c = P(g, candId);
  if (!b || !v || !c || !v.alive || !c.alive || voterId === candId || !canVoteNow(g, voterId) || !voteAllowed(g, voterId, candId)) return false;
  const prev = b.votes[voterId];
  if (prev === candId) { delete b.votes[voterId]; dropAutoCand(g, candId); return true; }
  if (!b.candidates.includes(candId)) {
    if ((b.round || 1) !== 1 || isClassic(g) || !canNominate(g, candId)) return false;
    b.candidates.push(candId); b.auto = (b.auto || []).concat([candId]);
  }
  b.votes[voterId] = candId; if (prev) dropAutoCand(g, prev); return true;
}
function dropAutoCand(g, candId) {
  const b = g.ballot; if (!(b.auto || []).includes(candId) || Object.values(b.votes).includes(candId)) return;
  b.auto = b.auto.filter(x => x !== candId); b.candidates = b.candidates.filter(x => x !== candId);
}
function voteRestToLast(g) {
  const b = g.ballot; const last = b.candidates[b.candidates.length - 1]; if (!last) return;
  alive(g).filter(v => v.id !== last && canVoteNow(g, v.id) && !b.votes[v.id]).forEach(v => { b.votes[v.id] = last; });
}
function applyTrigger(g, trig, targetId) {
  const actor = P(g, trig.actorId); const t = P(g, targetId);
  if (trig.type === 'azazel') { eliminate(g, targetId, tt(L.e.causeAzazel, { player: label(actor) }), g.voteResult.removed); }
  if (trig.type === 'morpheus') { t.disabled = true; addLog(g, tt(L.e.logMorpheus, { actor: label(actor), target: label(t), role: ROLE[t.roleId].name })); }
  g.pendingTriggers = g.pendingTriggers.filter(x => x !== trig);
}
/* a trigger the player may decline (Azazel killed at night) */
function skipTrigger(g, trig) {
  if (!trig || !trig.night) return false;
  addLog(g, tt(L.e.logAzazelSkip, { player: label(P(g, trig.actorId)) }));
  g.pendingTriggers = g.pendingTriggers.filter(x => x !== trig); return true;
}
function useJudge(g, judgeId) {
  if (g.ballot.final) return false;
  logBallot(g);
  const j = P(g, judgeId); j.judgeUsed = true;
  addLog(g, tt(L.e.logJudge, { player: label(j) }));
  const t = tally(g);
  (g.dayLog = g.dayLog || []).push({ day: g.day, actorId: judgeId, roleId: 'judge', ability: 'judge', targetId: t.leaders.length === 1 ? t.leaders[0] : null });
  g.voteResult = { tally: t, eliminatedId: null, removed: [], vetoed: true };
  g.dayStage = 'result';
}
function useLawyer(g, lawyerId, targetId) {
  if (g.ballot.final) return false;
  logBallot(g);
  const l = P(g, lawyerId); l.lawyerUsed = true;
  (g.dayLog = g.dayLog || []).push({ day: g.day, actorId: lawyerId, roleId: 'lawyer', ability: 'lawyer', targetId });
  addLog(g, tt(L.e.lawyerLog, { player: label(l), target: label(P(g, targetId)) }));
  const t = tally(g);
  g.voteResult = { tally: t, eliminatedId: null, removed: [], vetoed: true, lawyer: true };
  g.dayStage = 'result';
}
function useKamikaze(g, kamId, targetId) {
  const k = P(g, kamId); k.kamikazeUsed = true;
  (g.dayLog = g.dayLog || []).push({ day: g.day, actorId: kamId, roleId: 'kamikaze', ability: 'kamikaze', targetId });
  const removed = [];
  addLog(g, tt(L.e.logKamikaze, { player: label(k) }));
  eliminate(g, targetId, tt(L.e.causeKamikaze, { player: label(k) }), removed);
  return removed;
}
