/* ============================================================
   POST-GAME REVIEW: full-information evaluation of every vote, night and day action.
   Produces per-player "usefulness" points (added to the rating) and a list of
   verdicts: what was right, what was a mistake and what would have been better.
   ============================================================ */
const RV = { vote: 2, kill: 3, heal: 3, info: 2, ctl: 2, day: 4, key: 1, min: -20, max: 25 };
const KEY_CITY = ['sheriff', 'doctor', 'journalist', 'bodyguard', 'jailer', 'sniper', 'tracker', 'mayor'];
const KEY_MAFIA = ['don'];
function campOf(p, roleId) {
  const r = ROLE[roleId || p.roleId];
  if (r.id === 'maniac') return 'maniac';
  if (r.side === 'self') return 'self';
  return r.side; // 'city' | 'mafia' (witch is mafia-aligned)
}
/* how the target relates to the viewer's goals: enemy | ally | neutral | self */
function relationTo(g, viewer, target, viewerRole) {
  if (viewer.id === target.id) return 'self';
  const vc = campOf(viewer, viewerRole), tc = campOf(target);
  if (vc === 'city') return tc === 'city' ? 'ally' : (tc === 'mafia' || tc === 'maniac') ? 'enemy' : 'neutral';
  if (vc === 'mafia') {
    if (tc === 'mafia') return (g.twoFamilies && viewer.family && target.family && viewer.family !== target.family) ? 'enemy' : 'ally';
    return (tc === 'city' || tc === 'maniac') ? 'enemy' : 'neutral';
  }
  if (vc === 'maniac') return 'enemy';
  if (viewer.roleId === 'contractor') return target.id === viewer.contractId ? 'enemy' : 'neutral';
  return 'neutral';
}
const isKey = p => KEY_CITY.includes(p.roleId) || KEY_MAFIA.includes(p.roleId);
function rvLabel(g, id) { const p = P(g, id); return p ? `№${p.seat} ${p.name} (${ROLE[p.roleId].name})` : '?'; }

function reviewGame(g) {
  const u = U(); const items = {}; g.players.forEach(p => { items[p.id] = []; });
  const push = (pid, when, action, target, verdict, pts, reason, better) => items[pid].push({ when, action, target, verdict, pts, reason: reason || '', better: better || '' });
  const V = { good: 'good', bad: 'bad', neutral: 'neutral' };
  /* ---- votes ---- */
  (g.ballots || []).forEach(bl => {
    const when = tt(u.rvDay, { day: bl.day }) + (bl.round === 2 ? ' · ' + u.revoteTitle : '');
    Object.keys(bl.votes).forEach(vid => {
      const voter = P(g, vid), target = P(g, bl.votes[vid]); if (!voter || !target) return;
      if (bl.weights[vid] === 0) { push(vid, when, u.rvVote, rvLabel(g, target.id), V.neutral, 0, u.rNoWeight); return; }
      const rel = relationTo(g, voter, target); const base = bl.round === 2 ? 1 : RV.vote; // the re-vote repeats the same decision — half weight
      if (rel === 'enemy') { const key = isKey(target); push(vid, when, u.rvVote, rvLabel(g, target.id), V.good, base + (key ? RV.key : 0), key ? u.rKeyRole : u.rEnemy); }
      else if (rel === 'ally') {
        const key = isKey(target) && campOf(voter) === 'city';
        const alts = bl.candidates.filter(c => c !== target.id && relationTo(g, voter, P(g, c)) === 'enemy');
        push(vid, when, u.rvVote, rvLabel(g, target.id), V.bad, -(base + (key ? RV.key : 0)), key ? u.rAllyKey : u.rAlly, alts.length ? tt(u.bVoteFor, { alt: alts.map(c => rvLabel(g, c)).join(', ') }) : u.rNoEnemyCand);
      } else push(vid, when, u.rvVote, rvLabel(g, target.id), V.neutral, 0, u.rNeutralTarget);
    });
  });
  /* ---- nights ---- */
  const seen = {}; // actorId → set of checked target ids (repeat checks)
  (g.nightLog || []).forEach(a => {
    const actor = P(g, a.actorId); if (!actor) return;
    const when = tt(u.rvNight, { n: a.night });
    const act = a.viaThief ? `${ABILITY_LABEL.steal} → ${ABILITY_LABEL[a.ability] || a.ability}` : (ABILITY_LABEL[a.ability] || a.ability);
    const oc = a.outcome || {};
    if (a.voided) { push(actor.id, when, act, a.targets.map(t => rvLabel(g, t)).join(', '), V.neutral, 0, u.rBlocked); return; }
    const ab = a.ability;
    if (ab === 'shoot' || ab === 'execute' || ab === 'snipe') {
      a.targets.forEach(t => {
        const tp = P(g, t); const rel = relationTo(g, actor, tp, a.roleId); const o = oc[t];
        if (o === 'back') { push(actor.id, when, act, rvLabel(g, t), V.bad, -RV.kill, u.rSnipeBack); return; }
        if (o && o !== 'hit') { push(actor.id, when, act, rvLabel(g, t), V.neutral, 0, u.rProtected); return; }
        if (rel === 'enemy') push(actor.id, when, act, rvLabel(g, t), V.good, RV.kill + (isKey(tp) ? RV.key : 0), isKey(tp) ? u.rKeyRole : u.rEnemy);
        else if (rel === 'ally') push(actor.id, when, act, rvLabel(g, t), V.bad, -RV.kill, u.rAlly);
        else push(actor.id, when, act, rvLabel(g, t), V.neutral, 0, u.rNeutralTarget);
      });
      return;
    }
    if (ab === 'ignite') {
      const fire = (a.outcome && a.outcome.fire) || [];
      if (!fire.length) { push(actor.id, when, act, '—', V.neutral, 0, u.rNothing); return; }
      fire.forEach(t => { const rel = relationTo(g, actor, P(g, t), a.roleId); push(actor.id, when, act, rvLabel(g, t), rel === 'enemy' ? V.good : rel === 'ally' ? V.bad : V.neutral, rel === 'enemy' ? RV.ctl : rel === 'ally' ? -RV.ctl : 0, rel === 'enemy' ? u.rEnemy : rel === 'ally' ? u.rAlly : u.rNeutralTarget); });
      return;
    }
    if (ab === 'douse') { const rel = relationTo(g, actor, P(g, a.targets[0]), a.roleId); push(actor.id, when, act, rvLabel(g, a.targets[0]), rel === 'enemy' ? V.good : rel === 'ally' ? V.bad : V.neutral, rel === 'enemy' ? 1 : rel === 'ally' ? -1 : 0, rel === 'enemy' ? u.rEnemy : rel === 'ally' ? u.rAlly : u.rNeutralTarget); return; }
    if (ab === 'heal' || ab === 'protect' || ab === 'guard') {
      a.targets.forEach(t => {
        const tp = P(g, t); const rel = relationTo(g, actor, tp, a.roleId); const o = oc[t];
        if (o === 'saved') { push(actor.id, when, act, rvLabel(g, t), V.good, RV.heal, u.rSaved); return; }
        if (rel === 'enemy') { push(actor.id, when, act, rvLabel(g, t), V.bad, -1, u.rHealedEnemy); return; }
        const victims = (a.attacked || []).filter(x => x !== t && (a.dead || []).includes(x) && relationTo(g, actor, P(g, x), a.roleId) !== 'enemy');
        push(actor.id, when, act, rvLabel(g, t), V.neutral, 0, u.rNoShot, victims.length ? tt(u.bHeal, { alt: victims.map(x => rvLabel(g, x)).join(', ') }) : '');
      });
      return;
    }
    if (ab === 'jail') {
      const t = a.targets[0]; const rel = relationTo(g, actor, P(g, t), a.roleId);
      if (oc[t] === 'saved') push(actor.id, when, act, rvLabel(g, t), V.good, RV.heal, u.rSaved);
      else if (rel === 'enemy') push(actor.id, when, act, rvLabel(g, t), V.good, RV.ctl, u.rBlockedEnemy);
      else if (rel === 'ally') push(actor.id, when, act, rvLabel(g, t), V.bad, -1, u.rBlockedAlly);
      else push(actor.id, when, act, rvLabel(g, t), V.neutral, 0, u.rNeutralTarget);
      return;
    }
    if (ab === 'steal' || ab === 'block') {
      const t = a.targets[0]; const rel = relationTo(g, actor, P(g, t), a.roleId);
      push(actor.id, when, act, rvLabel(g, t), rel === 'enemy' ? V.good : rel === 'ally' ? V.bad : V.neutral, rel === 'enemy' ? RV.ctl : rel === 'ally' ? -RV.ctl : 0, rel === 'enemy' ? u.rBlockedEnemy : rel === 'ally' ? u.rBlockedAlly : u.rNeutralTarget);
      if (ab === 'steal' && a.stolen && a.targets[1]) { const t2 = a.targets[1]; const rel2 = relationTo(g, actor, P(g, t2), a.roleId); const harmful = ['shoot', 'execute', 'snipe', 'block', 'jail', 'drunk', 'douse'].includes(a.stolen); push(actor.id, when, `${ABILITY_LABEL[a.stolen]} → `, rvLabel(g, t2), harmful ? (rel2 === 'enemy' ? V.good : rel2 === 'ally' ? V.bad : V.neutral) : V.neutral, harmful ? (rel2 === 'enemy' ? RV.ctl : rel2 === 'ally' ? -RV.ctl : 0) : 0, harmful ? (rel2 === 'enemy' ? u.rEnemy : rel2 === 'ally' ? u.rAlly : u.rNeutralTarget) : u.rInfo); }
      return;
    }
    if (ab === 'redirect') { const t = a.targets[0]; const rel = relationTo(g, actor, P(g, t), a.roleId); if (oc[t] === 'redirected') push(actor.id, when, act, rvLabel(g, t), rel === 'enemy' ? V.good : rel === 'ally' ? V.bad : V.neutral, rel === 'enemy' ? RV.ctl : rel === 'ally' ? -RV.ctl : 0, rel === 'enemy' ? u.rRedirectedEnemy : rel === 'ally' ? u.rRedirectedAlly : u.rNeutralTarget); else push(actor.id, when, act, rvLabel(g, t), V.neutral, 0, u.rNothing); return; }
    if (ab === 'control') { const t = a.targets[0]; const rel = relationTo(g, actor, P(g, t), a.roleId); push(actor.id, when, act, `${rvLabel(g, t)} → ${rvLabel(g, a.targets[1])}`, rel === 'enemy' ? V.good : rel === 'ally' ? V.bad : V.neutral, rel === 'enemy' ? 1 : rel === 'ally' ? -1 : 0, rel === 'enemy' ? u.rBlockedEnemy : rel === 'ally' ? u.rBlockedAlly : u.rNeutralTarget); return; }
    if (ab === 'check' || ab === 'findSheriff' || ab === 'spy') {
      const t = a.targets[0]; const tp = P(g, t); const rel = relationTo(g, actor, tp, a.roleId);
      seen[actor.id] = seen[actor.id] || new Set();
      if (seen[actor.id].has(t)) { push(actor.id, when, act, rvLabel(g, t), V.bad, -1, u.rRepeat, u.bCheckNew); return; }
      seen[actor.id].add(t);
      if (ab === 'findSheriff') { const yes = a.res && a.res.yes; push(actor.id, when, act, rvLabel(g, t), V.good, yes ? RV.info + RV.key : 1, yes ? u.rFoundSheriff : u.rInfo); return; }
      if (rel === 'enemy') push(actor.id, when, act, rvLabel(g, t), V.good, RV.info, u.rFoundBlack);
      else push(actor.id, when, act, rvLabel(g, t), V.good, 1, u.rConfirmedRed);
      return;
    }
    if (ab === 'compare' || ab === 'track') { push(actor.id, when, act, a.targets.map(t => rvLabel(g, t)).join(' · '), V.good, 1, u.rInfo); return; }
    if (ab === 'drunk' || ab === 'altruist') {
      const t = a.targets[0]; const rel = relationTo(g, actor, P(g, t), a.roleId); const wantEnemy = ab === 'drunk';
      const good = wantEnemy ? rel === 'enemy' : rel === 'ally'; const bad = wantEnemy ? rel === 'ally' : rel === 'enemy';
      push(actor.id, when, act, rvLabel(g, t), good ? V.good : bad ? V.bad : V.neutral, good ? RV.ctl : bad ? -RV.ctl : 0, good ? (wantEnemy ? u.rBlockedEnemy : u.rHelpedAlly) : bad ? (wantEnemy ? u.rBlockedAlly : u.rHelpedEnemy) : u.rNeutralTarget);
      return;
    }
    if (ab === 'hypno') { push(actor.id, when, act, `${rvLabel(g, a.targets[0])} → ${rvLabel(g, a.targets[1])}`, V.neutral, 0, u.rInfo); return; }
    if (ab === 'negvote' || ab === 'provoke' || ab === 'stuff' || ab === 'certify' || ab === 'sanctuary') {
      const t = a.targets[0]; const rel = relationTo(g, actor, P(g, t), a.roleId); const wantEnemy = ab === 'negvote' || ab === 'provoke' || ab === 'stuff';
      const good = wantEnemy ? rel === 'enemy' : rel === 'ally'; const bad = wantEnemy ? rel === 'ally' : rel === 'enemy';
      push(actor.id, when, act, rvLabel(g, t), good ? V.good : bad ? V.bad : V.neutral, good ? RV.ctl : bad ? -RV.ctl : 0, good ? (wantEnemy ? u.rBlockedEnemy : u.rHelpedAlly) : bad ? (wantEnemy ? u.rBlockedAlly : u.rHelpedEnemy) : u.rNeutralTarget);
      return;
    }
    if (ab === 'bet' || ab === 'shield' || ab === 'puppet') { push(actor.id, when, act, rvLabel(g, a.targets[0]), V.neutral, 0, u.rInfo); return; }
    if (ab === 'defuse') { const t = a.targets[0]; const hit = a.outcome && a.outcome.defused; const rel = relationTo(g, actor, P(g, t), a.roleId); push(actor.id, when, act, rvLabel(g, t), hit ? (rel === 'enemy' ? V.good : V.neutral) : V.neutral, hit && rel === 'enemy' ? RV.ctl : 0, hit ? u.rBlockedEnemy : u.rNothing); return; }
    if (ab === 'audit' || ab === 'intimidate') {
      const t = a.targets[0]; const rel = relationTo(g, actor, P(g, t), a.roleId); const wantEnemy = ab === 'intimidate';
      const good = wantEnemy ? rel === 'enemy' : rel === 'ally'; const bad = wantEnemy ? rel === 'ally' : rel === 'enemy';
      push(actor.id, when, act, rvLabel(g, t), good ? V.good : bad ? V.bad : V.neutral, good ? RV.ctl : bad ? -RV.ctl : 0, good ? (wantEnemy ? u.rBlockedEnemy : u.rHelpedAlly) : bad ? (wantEnemy ? u.rBlockedAlly : u.rHelpedEnemy) : u.rNeutralTarget);
      return;
    }
    if (ab === 'remember') { push(actor.id, when, act, rvLabel(g, a.targets[0]), V.neutral, 0, u.rInfo); return; }
  });
  /* ---- day actions ---- */
  (g.dayLog || []).forEach(d => {
    const actor = P(g, d.actorId); if (!actor) return; const when = tt(u.rvDay, { day: d.day });
    if (d.ability === 'kamikaze') { const tp = P(g, d.targetId); const rel = relationTo(g, actor, tp, 'kamikaze'); push(actor.id, when, ROLE.kamikaze.name, rvLabel(g, d.targetId), rel === 'enemy' ? V.good : rel === 'ally' ? V.bad : V.neutral, rel === 'enemy' ? RV.day + (isKey(tp) ? RV.key : 0) : rel === 'ally' ? -RV.day : 0, rel === 'enemy' ? (isKey(tp) ? u.rKeyRole : u.rEnemy) : rel === 'ally' ? u.rAlly : u.rNeutralTarget); }
    if (d.ability === 'judge') { if (!d.targetId) { push(actor.id, when, ROLE.judge.name, '—', V.neutral, 0, u.rNothing); return; } const rel = relationTo(g, actor, P(g, d.targetId), 'judge'); push(actor.id, when, ROLE.judge.name, rvLabel(g, d.targetId), rel === 'ally' ? V.good : rel === 'enemy' ? V.bad : V.neutral, rel === 'ally' ? RV.day - 1 : rel === 'enemy' ? -(RV.day - 1) : 0, rel === 'ally' ? u.rSavedAlly : rel === 'enemy' ? u.rSavedEnemy : u.rNeutralTarget); }
    if (d.ability === 'lawyer') push(actor.id, when, ROLE.lawyer.name, rvLabel(g, d.targetId), V.good, RV.day - 1, u.rSavedAlly);
    if (d.ability === 'prosecute') { const rel = relationTo(g, actor, P(g, d.targetId), 'prosecutor'); push(actor.id, when, ROLE.prosecutor.name, rvLabel(g, d.targetId), rel === 'enemy' ? V.good : rel === 'ally' ? V.bad : V.neutral, rel === 'enemy' ? RV.day - 1 : rel === 'ally' ? -(RV.day - 1) : 0, rel === 'enemy' ? u.rEnemy : rel === 'ally' ? u.rAlly : u.rNeutralTarget); }
    if (d.ability === 'final') { const bl = (g.ballots || []).filter(x => x.day === d.day); const out = g.players.find(p => p.votedOut && p.deadOn && p.deadOn.day === d.day && p.deadOn.phase === 'day'); const rel = out ? relationTo(g, actor, out, 'bailiff') : null; push(actor.id, when, ROLE.bailiff.name, out ? rvLabel(g, out.id) : '—', rel === 'enemy' ? V.good : rel === 'ally' ? V.bad : V.neutral, rel === 'enemy' ? RV.ctl : rel === 'ally' ? -RV.ctl : 0, rel === 'enemy' ? u.rEnemy : rel === 'ally' ? u.rAlly : u.rNothing); void bl; }
    if (d.ability === 'bestMove') { if (!d.targets.length) { push(actor.id, when, u.bestMove, '—', V.neutral, 0, u.rNothing); return; } d.targets.forEach(t => { const rel = relationTo(g, actor, P(g, t)); push(actor.id, when, u.bestMove, rvLabel(g, t), rel === 'enemy' ? V.good : V.neutral, rel === 'enemy' ? 1 : 0, rel === 'enemy' ? u.rFoundBlack : u.rNeutralTarget); }); }
  });
  /* ---- totals ---- */
  const players = g.players.map(p => {
    const its = items[p.id];
    const raw = its.reduce((s, it) => s + it.pts, 0);
    const useful = Math.max(RV.min, Math.min(RV.max, raw));
    const good = its.filter(i => i.verdict === 'good').length, bad = its.filter(i => i.verdict === 'bad').length;
    return { id: p.id, useful, raw, good, bad, items: its };
  });
  return { players, byId: Object.fromEntries(players.map(x => [x.id, x])) };
}
