/* ============================================================
   ONLINE GAME + PLAYER'S TABLE SCREEN
   The host's phone keeps running the engine (03-engine.js). Every render publishes a public table state and a private
   state per seated player to the backend (/api/table/publish). Players' phones poll /api/table/state, show the waiting
   room, their card, prompts (night pick, vote, roulette …), chat, and answer with /api/table/act; the host polls
   /api/table/actions and applies the answers to the engine. Offline games publish too (cards + table + phase, no prompts).
   ============================================================ */
const ONL = { sig: '', timer: null, busy: false, pending: false, pollTimer: null, pollBusy: false, advance: null, watching: [], autoOpened: false };
const seatTg = (g, seat) => { if (!g || !g.tg || !g.tg.map) return null; const e = Object.entries(g.tg.map).find(([k, s]) => Number(s) === seat); return e ? Number(e[0]) : null; };
const onlineActive = g => !!(g && g.online && g.tg && g.tg.code);
const phaseTag = g => g.phase + (g.phase === 'night' ? g.night : g.day);
const hostName = () => (S.cloud && S.cloud.user && S.cloud.user.name) || (S.meId && profById(S.meId) ? profById(S.meId).name : '') || 'Mafia Pro';
function onlState(g) { return g.onl = g.onl || { proposals: {}, results: {}, lift: {}, nomSkip: {}, since: 0 }; }

/* ---------- host: what each seated player is asked right now ---------- */
function buildAsks(g) {
  const asks = {}; if (!g || !g.tg || !g.dealt || g.winner) return asks;
  const tgOf = p => seatTg(g, p.seat); const onl = onlState(g);
  if (g.phase === 'night') {
    const step = g.steps[g.stepIdx]; if (!step || step.type !== 'act') return asks;
    const actor = P(g, step.actorId); const key = `${phaseTag(g)}:s${g.stepIdx}:${step.id}`;
    const recorded = g.actions.find(a => a.stepId === step.id);
    const blocked = !recorded && (step.disabled || !!stolenFrom(g, step.actorId) || !!g.actions.find(a => (a.ability === 'block' || a.ability === 'jail') && a.targets[0] === step.actorId));
    const targets = stepTargets(g, step).map(({ p, ok }) => ({ seat: p.seat, ok }));
    const base = { key, need: step.targets, targets, modes: step.modes || null, targetsByMode: step.targetsByMode || null, roleId: step.roleId, ability: step.ability, done: !!recorded, picked: recorded ? recorded.targets.map(id => P(g, id).seat) : null, blocked };
    if (step.ability === 'shoot' && step.members) { // the family proposes, the shooter decides
      const props = onl.proposals[key] || {};
      const proposals = Object.entries(props).map(([id, seat]) => ({ seat: Number(seat), by: Number(g.tg.map[id]) || 0 }));
      step.members.forEach(m => { const id = tgOf(m); if (!id || !m.alive) return; if (m.id === actor.id) asks[id] = Object.assign({}, base, { kind: 'shoot', proposals }); else asks[id] = { key, kind: 'propose', need: 1, targets, roleId: m.roleId, done: props[id] !== undefined, picked: props[id] !== undefined ? [Number(props[id])] : null, shooter: actor.seat, proposals, blocked: false }; });
    } else { const id = tgOf(actor); if (id) asks[id] = Object.assign({}, base, { kind: 'act' }); }
    return asks;
  }
  if (g.phase !== 'day') return asks;
  const st = g.dayStage; const b = g.ballot || {}; const tag = phaseTag(g);
  if (st === 'morning' && isClassic(g) && g.night === 1 && g.nightResult && g.nightResult.removed.length && !g.bestMove) { const victim = P(g, g.nightResult.removed[0].id); const id = tgOf(victim); if (id) asks[id] = { key: `${tag}:bm`, kind: 'bestmove', need: 3, targets: alive(g).map(p => ({ seat: p.seat, ok: true })), done: false }; }
  if (st === 'speeches' && isClassic(g)) {
    const p = speakOrder(g)[g.speechIdx];
    if (p && !fxOn(g, 'intimidated', p.id) && !(p.fouls >= 3)) { const id = tgOf(p); const key = `${tag}:nom:${p.id}`; const mine = b.nominatedBy && b.nominatedBy[p.id]; if (id) asks[id] = { key, kind: 'nominate', need: 1, optional: true, targets: alive(g).filter(x => x.id !== p.id && !(b.candidates || []).includes(x.id) && canNominate(g, x.id)).map(x => ({ seat: x.seat, ok: true })), done: !!mine || !!onl.nomSkip[key], picked: mine ? [P(g, mine).seat] : null }; }
  }
  if (st === 'vote' && b.candidates && b.candidates.length && voteOutcome(g).kind !== 'skip1') {
    alive(g).filter(v => canVoteNow(g, v.id)).forEach(v => { const id = tgOf(v); if (!id) return; const cands = b.candidates.filter(c => c !== v.id); if (!cands.length) return; asks[id] = { key: `${tag}:vote:r${b.round || 1}`, kind: 'vote', need: 1, targets: cands.map(c => ({ seat: P(g, c).seat, ok: true })), done: !!b.votes[v.id], picked: b.votes[v.id] ? [P(g, b.votes[v.id]).seat] : null, round: b.round || 1 }; });
  }
  if (st === 'lift' && b.lift) { const key = `${tag}:lift`; alive(g).forEach(v => { const id = tgOf(v); if (!id) return; const answered = onl.lift[key] && onl.lift[key][id] !== undefined; asks[id] = { key, kind: 'lift', yes: b.lift.yes.includes(v.id), done: !!answered, ids: b.lift.ids.map(x => P(g, x).seat) }; }); }
  if (st === 'roulette' && b.roulette && !b.roulette.hitId) { const cur = rouletteCurrent(g); const id = cur && tgOf(cur); if (id) asks[id] = { key: `${tag}:rou:${b.roulette.turn}`, kind: 'roulette', used: b.roulette.guesses.map(x => x.n), done: false }; }
  if (st === 'result' && g.pendingTriggers && g.pendingTriggers[0]) { const tr = g.pendingTriggers[0]; const a = P(g, tr.actorId); const id = tgOf(a); if (id) asks[id] = { key: `${tag}:trig:${tr.type}:${tr.actorId}`, kind: 'trig', need: 1, trig: tr.type, targets: alive(g).map(p => ({ seat: p.seat, ok: true })), done: false }; }
  return asks;
}
function plainResult(g, res) { return { night: g.night, kind: res.kind, color: res.color || null, seat: res.who ? res.who.seat : null, roleId: res.role ? res.role.id : null, yes: res.yes === undefined ? null : res.yes, same: res.same === undefined ? null : res.same, text: res.kind === 'text' || res.kind === 'none' ? (res.text || '') : '' }; }
function scheduleAdvance(g, stepId) {
  clearTimeout(ONL.advance);
  ONL.advance = setTimeout(() => { const gg = S.game; if (!gg || gg.phase !== 'night' || !gg.steps[gg.stepIdx] || gg.steps[gg.stepIdx].id !== stepId) return; if (!gg.actions.find(a => a.stepId === stepId)) return; ACT.next(); }, 2500);
}
/* a player's answer arrives: validate against the current prompt and apply it to the engine; returns true when the game changed */
function applyTableAction(a) {
  const g = S.game; if (!onlineActive(g) || !g.dealt || g.winner) return false;
  const tgId = Number(a.tgId); const seat = Number(g.tg.map[tgId]) || 0; if (!seat) return false;
  const me = g.players.find(p => p.seat === seat); if (!me) return false;
  const ask = buildAsks(g)[tgId]; if (!ask || ask.key !== a.key) return false;
  const pl = a.payload || {}; const seats = (Array.isArray(pl.pick) ? pl.pick : []).map(Number).filter(Boolean);
  const ids = seats.map(s => (g.players.find(p => p.seat === s) || {}).id).filter(Boolean);
  const onl = onlState(g);
  switch (ask.kind) {
    case 'propose': { if (!seats.length) return false; onl.proposals[ask.key] = onl.proposals[ask.key] || {}; onl.proposals[ask.key][tgId] = seats[0]; return true; }
    case 'shoot': case 'act': {
      if (ask.done) return false; const step = g.steps[g.stepIdx];
      if (pl.skip) { if (S.screen === 'game') ACT.skip(); else { addLog(g, tt(L.e.logSkip, { role: ROLE[step.roleId].name, player: label(P(g, step.actorId)) }), true); g.stepIdx += 1; S.ui.pick = []; S.ui.result = null; } return true; }
      if (ask.modes) S.ui.mode = ask.modes.includes(pl.mode) ? pl.mode : ask.modes[0];
      const need = step.targetsByMode ? step.targetsByMode[S.ui.mode] : step.targets;
      if (ids.length !== need) return false;
      const ok = stepTargets(g, step); if (ids.some(id => !ok.find(x => x.p.id === id && x.ok))) return false;
      S.ui.pick = ids.slice(); S.ui.result = recordAction(g, step, S.ui.pick, S.ui.mode); S.ui.pick = [];
      if (S.ui.result) (onl.results[tgId] = onl.results[tgId] || []).push(plainResult(g, S.ui.result));
      scheduleAdvance(g, step.id); return true;
    }
    case 'nominate': { if (ask.done) return false; if (pl.skip) { onl.nomSkip[ask.key] = true; return true; } if (!ids.length) return false; return nominate(g, me.id, ids[0]); }
    case 'vote': { if (!ids.length || !g.ballot.candidates.includes(ids[0]) || ids[0] === me.id) return false; g.ballot.votes[me.id] = ids[0]; voterAdvance(g); return true; }
    case 'lift': { const want = !!pl.yes; const has = g.ballot.lift.yes.includes(me.id); if (want !== has) liftToggle(g, me.id); onl.lift[ask.key] = onl.lift[ask.key] || {}; onl.lift[ask.key][tgId] = want; return true; }
    case 'roulette': { const res = rouletteGuess(g, Number(pl.n)); if (!res) return false; if (!res.hit) toast(tt(U().rouletteMiss, { seat: res.p.seat })); return true; }
    case 'trig': { if (!ids.length) return false; applyTrigger(g, g.pendingTriggers[0], ids[0]); S.ui.pick = []; return true; }
    case 'bestmove': { recordBestMove(g, me.id, pl.skip ? [] : ids.slice(0, 3)); S.ui.pick = []; return true; }
  }
  return false;
}
/* ---------- host: the published state ---------- */
function tablePub(g) {
  const l = currentLobby(); const code = l && l.code;
  if (!g) {
    const lb = S.lobby || { seats: {}, players: [] }; const st = S.setup; const seats = [];
    for (let i = 0; i < st.n; i++) { const e = Object.entries(lb.seats || {}).find(([k, v]) => Number(v) === i); const pl = e && lb.players.find(p => p.tgId === Number(e[0])); const prof = (st.seatProfiles || [])[i] ? profById(st.seatProfiles[i]) : null; seats.push({ seat: i + 1, name: (st.names[i] || '').trim() || (pl ? pl.name : '') || (prof ? prof.name : ''), tgId: e ? Number(e[0]) : null, alive: true }); }
    return { v: 2, phase: 'lobby', code, n: st.n, mode: st.scenario === 'classic' ? 'classic' : 'extended', online: !!st.online, host: hostName(), seats };
  }
  const reveal = !!S.settings.revealDead;
  const seats = g.players.map(p => { const s = { seat: p.seat, name: p.name, tgId: seatTg(g, p.seat), alive: p.alive, votedOut: !!p.votedOut, fouls: p.fouls || 0 }; if (g.winner || (!p.alive && reveal)) { s.roleId = p.roleId; s.family = p.family || null; } return s; });
  const pub = { v: 2, phase: g.winner ? 'end' : (!g.dealt ? 'deal' : g.phase), code, n: g.n, mode: isClassic(g) ? 'classic' : 'extended', online: !!g.online, host: hostName(), day: g.day, night: g.night, seats, chat: false };
  if (g.winner) { const w = g.winner; pub.result = { side: w.side, title: w.title, text: w.text, family: w.family || null, extra: (g.extraWinners || []).map(id => P(g, id).seat), jester: g.jesterWon ? P(g, g.jesterWon).seat : null }; pub.roles = g.players.map(p => ({ seat: p.seat, name: p.name, roleId: p.roleId, family: p.family || null, won: resultFor(g, p, w).won, alive: p.alive })); return pub; }
  if (!g.dealt) return pub;
  const asks = g.online ? buildAsks(g) : {};
  pub.waiting = Object.entries(asks).filter(([id, a]) => !a.done && !a.blocked).map(([id]) => Number(g.tg.map[id]) || 0).filter(Boolean).sort((a, b) => a - b);
  if (g.phase === 'night0' || g.phase === 'night') { const step = g.steps[g.stepIdx]; pub.step = step ? { i: g.stepIdx, n: g.steps.length, roleId: step.roleId, type: step.type, fam: step.fam || null, done: step.type === 'act' && !!g.actions.find(a => a.stepId === step.id) } : { i: g.steps.length, n: g.steps.length, roleId: null, type: 'end' }; }
  else if (g.phase === 'day0') { const al = alive(g); const p = al[g.speechIdx]; pub.day0 = { speaker: p ? p.seat : null, i: g.speechIdx, n: al.length }; }
  else if (g.phase === 'day') {
    const b = g.ballot || {}; const st = g.dayStage; const seatOf = id => (P(g, id) || {}).seat;
    pub.chat = st === 'balagan' || st === 'speeches'; // the table chat lives from the free discussion until the vote
    pub.dayInfo = { stage: st, round: b.round || 1 };
    if (st === 'morning') { const r = g.nightResult || { removed: [] }; pub.dayInfo.removed = r.removed.map(d => ({ seat: seatOf(d.id), cause: d.cause, roleId: reveal ? P(g, d.id).roleId : undefined })); if (isClassic(g) && g.bestMove) pub.dayInfo.bestMove = { seat: seatOf(g.bestMove.by), picks: g.bestMove.picks.map(seatOf) }; }
    if (st === 'speeches') { const order = speakOrder(g); const p = order[g.speechIdx]; pub.dayInfo.speaker = p ? p.seat : null; pub.dayInfo.i = g.speechIdx; pub.dayInfo.n = order.length; }
    if (['speeches', 'vote', 'tie', 'roulette', 'lift', 'result'].includes(st)) pub.dayInfo.candidates = (b.candidates || []).map(seatOf);
    if (st === 'vote') { const t = tally(g); pub.dayInfo.votes = Object.fromEntries(Object.entries(b.votes || {}).map(([v, c]) => [seatOf(v), seatOf(c)])); pub.dayInfo.tally = t.rows.map(r => ({ seat: seatOf(r.cid), total: r.total })); pub.dayInfo.voters = alive(g).filter(v => canVoteNow(g, v.id)).map(v => v.seat); }
    if (st === 'tie') { const tied = b.tiedIds || []; pub.dayInfo.tied = tied.map(seatOf); pub.dayInfo.speaker = tied[g.speechIdx] ? seatOf(tied[g.speechIdx]) : null; pub.dayInfo.i = g.speechIdx; pub.dayInfo.n = tied.length; }
    if (st === 'roulette' && b.roulette) { const cur = rouletteCurrent(g); pub.dayInfo.roulette = { order: b.roulette.order.map(seatOf), turn: cur ? cur.seat : null, guesses: b.roulette.guesses.map(x => ({ seat: seatOf(x.pid), n: x.n })) }; }
    if (st === 'lift' && b.lift) pub.dayInfo.lift = { ids: b.lift.ids.map(seatOf), yes: b.lift.yes.length, need: liftNeed(g) };
    if (st === 'result' && g.voteResult) { const vr = g.voteResult; pub.dayInfo.result = { eliminated: vr.eliminatedId ? seatOf(vr.eliminatedId) : null, removed: (vr.removed || []).map(d => ({ seat: seatOf(d.id), cause: d.cause, roleId: reveal ? P(g, d.id).roleId : undefined })), vetoed: !!vr.vetoed, tally: ((vr.tally && vr.tally.rows) || []).map(r => ({ seat: seatOf(r.cid), total: r.total })), roulette: vr.roulette && vr.roulette.hitId ? { number: vr.roulette.number, seat: seatOf(vr.roulette.hitId) } : null, lift: vr.lift ? { yes: vr.lift.yes, need: vr.lift.need, passed: vr.lift.passed } : null, immune: vr.immune ? seatOf(vr.immune.id) : null, trig: g.pendingTriggers && g.pendingTriggers[0] ? { type: g.pendingTriggers[0].type, seat: seatOf(g.pendingTriggers[0].actorId) } : null }; }
  }
  pub.timer = T.key && S.screen === 'game' ? { key: T.key, total: T.total, left: T.left, running: T.running, at: Date.now() } : null;
  return pub;
}
function tablePriv(g) {
  const priv = {}; if (!g) return priv; const asks = g.online && g.dealt && !g.winner ? buildAsks(g) : {}; const onl = onlState(g);
  g.players.forEach(p => {
    const id = seatTg(g, p.seat); if (!id) return;
    const mates = (isBlack(p) || p.roleId === 'werewolf') ? familyMembers(g, g.twoFamilies ? p.family : null).filter(m => m.id !== p.id).map(m => ({ seat: m.seat, name: m.name, roleId: m.roleId })) : [];
    priv[id] = { seat: p.seat, roleId: p.roleId, family: p.family || null, alive: p.alive, mates, contract: p.contractId && P(g, p.contractId) ? P(g, p.contractId).seat : null, ask: asks[id] || null, results: onl.results[id] || [] };
  });
  return priv;
}
function schedulePublish() { if (!TG.app || !apiBase()) return; const l = currentLobby(); if (!l || !l.code) return; clearTimeout(ONL.timer); ONL.timer = setTimeout(() => publishTable(false), 250); }
async function publishTable(force, lobby, game) {
  const l = lobby || currentLobby(); if (!l || !l.code || !TG.app || !apiBase()) return false;
  const g = game !== undefined ? game : (S.game && S.game.tg === l ? S.game : null); let pub, priv; try { pub = tablePub(g); priv = tablePriv(g); } catch (e) { return false; } // the game's own table carries the game; any other open table is a waiting room
  const sig = JSON.stringify(Object.assign({}, pub, { timer: pub.timer ? { key: pub.timer.key, total: pub.timer.total, running: pub.timer.running, q: Math.round(pub.timer.left / 5) } : null })) + '|' + JSON.stringify(priv);
  if (!force && sig === ONL.sig) return true;
  if (ONL.busy) { ONL.pending = true; return true; }
  ONL.busy = true;
  try {
    const d = await api('/api/table/publish', { code: l.code, pub, priv }); if (!d.ok) return false;
    ONL.sig = sig;
    if (g && g.tg && Array.isArray(d.delivered)) { const sent = d.delivered.filter(id => g.tg.map[id]).sort(); if (JSON.stringify(sent) !== JSON.stringify((g.tg.sent || []).slice().sort())) { g.tg.sent = sent; skipDeliveredSeats(g); save(); render(); } }
    return true;
  } finally { ONL.busy = false; if (ONL.pending) { ONL.pending = false; schedulePublish(); } }
}
/* host: poll the players' answers while an online game runs */
function actionsPoll() {
  const g = S.game; const want = TG.app && apiBase() && onlineActive(g) && g.dealt && !g.winner;
  if (want && !ONL.pollTimer) ONL.pollTimer = setInterval(pollActions, 2000);
  if (!want && ONL.pollTimer) { clearInterval(ONL.pollTimer); ONL.pollTimer = null; }
}
async function pollActions() {
  const g = S.game; if (!onlineActive(g) || ONL.pollBusy) return; ONL.pollBusy = true;
  try {
    const onl = onlState(g); const d = await api('/api/table/actions', { code: g.tg.code, since: onl.since || 0 }); if (!d.ok) return;
    ONL.watching = d.watching || []; let changed = false;
    for (const a of d.actions || []) { onl.since = Math.max(onl.since || 0, a.id); try { if (applyTableAction(a)) changed = true; } catch (e) {} }
    if (changed) { save(); render(); }
  } finally { ONL.pollBusy = false; }
}
/* host: strip above the game field — who is in the app, whom we wait for, the family's proposals */
function onlineStripHTML(g) {
  if (!onlineActive(g) || !g.dealt || g.winner) return '';
  const u = U(); const mapped = Object.keys(g.tg.map).filter(id => g.tg.map[id]); const watching = mapped.filter(id => ONL.watching.includes(Number(id))).length;
  const asks = buildAsks(g); const waiting = Object.entries(asks).filter(([id, a]) => !a.done && !a.blocked).map(([id]) => g.tg.map[id]).sort((a, b) => a - b);
  let extra = '';
  if (g.phase === 'night') { const step = g.steps[g.stepIdx]; if (step && step.ability === 'shoot' && step.members) { const props = (onlState(g).proposals[`${phaseTag(g)}:s${g.stepIdx}:${step.id}`]) || {}; const list = Object.entries(props).map(([id, seat]) => tt(u.tbProposedBy, { seat, by: g.tg.map[id] })); extra = ` · ${list.length ? tt(u.onProposals, { list: list.join(', ') }) : u.onNoProposals}`; } }
  if (g.phase === 'day' && g.dayStage === 'vote' && g.ballot && g.ballot.candidates.length) { const voters = alive(g).filter(v => canVoteNow(g, v.id)); extra = ` · ${tt(u.onVoted, { k: voters.filter(v => g.ballot.votes[v.id]).length, n: voters.length })}`; }
  return `<div class="onl-strip"><span class="tag">${u.onStrip}</span> ${tt(u.onWatching, { k: watching, n: mapped.length })}${waiting.length ? ` · ${tt(u.onWaiting, { list: waiting.join(', ') })}` : ''}${extra}</div>`;
}
/* host: the game format chooser above the table panel on the setup screen */
function modeSegmentHTML() {
  if (!TG.app || !apiBase()) return '';
  const u = U(); const on = !!S.setup.online;
  return `<div class="panel"><div class="eyebrow">${u.onMode}</div><div class="segment n2" style="margin-top:8px"><button class="${on ? '' : 'active'}" data-a="on-mode" data-id="offline">${u.onOffline}</button><button class="${on ? 'active' : ''}" data-a="on-mode" data-id="online">${u.onOnline}</button></div><div class="hint" style="margin-top:8px">${on ? u.onOnlineD : u.onOfflineD}</div>${on ? `<div class="hint" style="margin-top:4px">${u.onNeedSeats}</div>` : ''}</div>`;
}

/* ============================================================ PLAYER'S TABLE SCREEN */
const TB = { code: null, data: null, chat: [], lastChat: 0, pick: [], mode: null, msg: '', busy: false, timer: null, tick: null, err: null, sent: {}, at: 0 };
function tableOpen(code) { code = String(code || '').toUpperCase(); if (!code) return; if (TB.code !== code) { TB.code = code; TB.data = null; TB.chat = []; TB.lastChat = 0; TB.pick = []; TB.sent = {}; TB.err = null; } S.ui.sheet = null; go('table'); tableFetch(); }
async function tableFetch() {
  if (!TB.code || TB.busy || !TG.app || !apiBase()) return; TB.busy = true;
  try {
    const d = await api('/api/table/state', { code: TB.code, since: TB.lastChat }); if (!d.ok) { TB.err = d.error || 'network'; if (S.screen === 'table') render(); return; }
    const prevKey = TB.data && TB.data.me && TB.data.me.ask ? TB.data.me.ask.key : null; const prevPhase = TB.data && TB.data.pub ? TB.data.pub.phase + (TB.data.pub.day || '') : '';
    TB.data = d; TB.err = null; TB.at = Date.now();
    if (d.chat && d.chat.length) { TB.chat = TB.chat.concat(d.chat).slice(-300); TB.lastChat = TB.chat[TB.chat.length - 1].id; }
    const key = d.me && d.me.ask ? d.me.ask.key : null;
    if (key !== prevKey) { TB.pick = []; TB.mode = null; if (key && !(d.me.ask.done)) tgHaptic('light'); }
    if (key && d.me.ask.done) delete TB.sent[key];
    if (d.pub && d.pub.phase + (d.pub.day || '') !== prevPhase) TB.pick = [];
    if (Array.isArray(d.invites)) { S.cloud = S.cloud || {}; S.cloud.invites = d.invites; }
    if (S.screen === 'table') { render(); if (d.chat && d.chat.length) scrollTbChat(); }
  } finally { TB.busy = false; }
}
function scrollTbChat() { try { const c = document.querySelector('#tb-chat'); if (c) c.scrollTop = c.scrollHeight; } catch (e) {} }
function tablePoll() {
  const want = S.screen === 'table' && TB.code && TG.app && apiBase();
  if (want && !TB.timer) TB.timer = setInterval(() => { if (S.screen !== 'table') { clearInterval(TB.timer); TB.timer = null; return; } tableFetch(); }, 2500);
  if (!want && TB.timer) { clearInterval(TB.timer); TB.timer = null; }
  if (want && !TB.tick) TB.tick = setInterval(tbTimerPaint, 1000);
  if (!want && TB.tick) { clearInterval(TB.tick); TB.tick = null; }
}
function tbTimerLeft(tm) { if (!tm) return null; const el = tm.running ? Math.round((Date.now() - tm.at) / 1000) : 0; return tm.left - el; }
function tbTimerPaint() { const el = document.querySelector('#tb-timer'); const tm = TB.data && TB.data.pub && TB.data.pub.timer; if (!el || !tm) return; const left = tbTimerLeft(tm); const m = Math.floor(Math.abs(left) / 60), s = Math.abs(left) % 60; el.textContent = (left < 0 ? '-' : '') + m + ':' + String(s).padStart(2, '0'); el.classList.toggle('over', left <= 0); }
const tbSeatName = (seats, seat) => { const s = seats.find(x => x.seat === seat); return s ? `${seat} · ${esc(s.name)}` : String(seat); };
/* the round table: seats around a ring, host and player count in the middle */
function roundTableHTML(seats, profiles, center, marks = {}) {
  const u = U(); const n = Math.max(1, seats.length); const size = n <= 10 ? 'lg' : n <= 16 ? 'md' : 'sm';
  const items = seats.map((s, i) => {
    const ang = -Math.PI / 2 + 2 * Math.PI * i / n; const x = 50 + 43 * Math.cos(ang), y = 50 + 43 * Math.sin(ang);
    const pr = s.tgId && profiles ? profiles[s.tgId] : null; const name = s.name || (pr ? pr.name : '') || '…';
    const av = pr && pr.photo ? `<img src="${esc(pr.photo)}" alt="">` : `<span>${esc((name || '?').slice(0, 1).toUpperCase())}</span>`;
    const m = marks[s.seat] || {};
    const cls = ['rt-seat', s.alive === false ? 'dead' : '', m.mine ? 'mine' : '', m.speaker ? 'speaker' : '', m.cand ? 'cand' : '', m.picked ? 'picked' : '', m.ok === false ? 'dis' : '', m.pick ? 'pickable' : ''].filter(Boolean).join(' ');
    const act = m.pick ? `data-a="tb-pick" data-seat="${s.seat}"` : (s.tgId ? `data-a="fr-open" data-id="${s.tgId}"` : '');
    return `<div class="${cls}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%" role="button" tabindex="0" ${act}><div class="rt-av">${av}<span class="rt-num">${s.seat}</span>${m.vote ? `<span class="rt-vote">→${m.vote}</span>` : ''}</div><div class="rt-nm">${esc(name)}${m.mine ? ` <small>· ${u.tbYou}</small>` : ''}</div>${pr ? `<div class="rt-meta">${pr.points}${pr.city ? ' · ' + esc(pr.city) : ''}</div>${pr.club ? `<div class="rt-club">${esc(pr.club)}</div>` : ''}` : ''}</div>`;
  });
  return `<div class="rtable ${size}"><div class="rt-ring"></div><div class="rt-center">${center}</div>${items.join('')}</div>`;
}
function tbRoleRow(roleId, big) {
  const u = U(); const r = ROLE[roleId]; if (!r) return '';
  if (big) return `<div class="panel"><div class="eyebrow gold" style="text-align:center">${u.tbMyCard}</div>${card3dHTML(r, 'tb')}<div class="spin-hint">${u.tbCardHint}</div><button class="btn primary sm" style="margin-top:8px" data-a="role" data-id="${r.id}">${u.tbOpenCard}</button></div>`;
  return `<div class="fr-row tb-card" role="button" data-a="role" data-id="${r.id}">${sealHTML(r)}<div class="grow" style="min-width:0"><div class="eyebrow" style="margin:0">${u.tbMyCard}</div><div style="font-weight:800;font-size:16px">${r.name}</div><div class="hint" style="margin:0">${TEAM_LABEL[r.team]}</div></div><span class="btn xs">${u.tbOpenCard}</span></div>`;
}
function tbResultHTML(x) {
  const u = U(); const role = x.roleId ? ROLE[x.roleId] : null;
  if (x.kind === 'color') return `<div class="result ${x.color}"><div class="eyebrow">${tt(u.tbNight, { n: x.night })}</div><div class="big">${tt(u.tbResColor, { seat: x.seat, color: COLOR_LABEL[x.color] })}</div></div>`;
  if (x.kind === 'sheriff') return `<div class="result ${x.yes ? 'red' : 'black'}"><div class="eyebrow">${tt(u.tbNight, { n: x.night })}</div><div class="big">${tt(u.tbResSheriff, { seat: x.seat, v: x.yes ? u.isSheriff : u.notSheriff })}</div></div>`;
  if (x.kind === 'same') return `<div class="result ${x.same ? 'same' : 'diff'}"><div class="eyebrow">${tt(u.tbNight, { n: x.night })}</div><div class="big">${x.same ? u.tbResSame : u.tbResDiff}</div></div>`;
  if (x.kind === 'role' && role) return `<div class="result ${role.team === 'black' ? 'black' : 'red'}"><div class="eyebrow">${tt(u.tbNight, { n: x.night })}</div><div class="big">${tt(u.tbResRole, { seat: x.seat, role: role.name })}</div></div>`;
  return x.text ? `<div class="quiet">${esc(x.text)}</div>` : '';
}
/* the prompt panel: pick seats / vote / lift / roulette */
function tbAskHTML(ask, seats) {
  const u = U(); if (!ask) return '';
  const sent = TB.sent[ask.key]; const done = ask.done || !!sent;
  const title = { propose: u.tbPropose, shoot: u.tbShoot, act: u.tbYourTurn, nominate: u.tbNominate, vote: ask.round === 2 ? u.tbRevote : u.tbVote, lift: u.tbLift, roulette: u.tbRoulette, trig: u.tbTrig, bestmove: u.tbBestMove }[ask.kind] || u.tbYourTurn;
  const role = ask.roleId ? ROLE[ask.roleId] : null;
  if (ask.blocked) return `<div class="panel raised"><div class="eyebrow gold">${title}</div><div class="hint">${u.tbBlocked}</div></div>`;
  const proposals = ask.proposals && ask.proposals.length ? `<div class="hint" style="margin:6px 0">${tt(u.tbProposed, { list: ask.proposals.map(p => tt(u.tbProposedBy, { seat: p.seat, by: p.by })).join(', ') })}</div>` : '';
  if (ask.kind === 'lift') { const yes = sent ? !!sent.yes : ask.yes; return `<div class="panel raised"><div class="eyebrow gold">${title}</div><div class="hint">${tt(u.tbTie, { list: (ask.ids || []).join(L.e.and) })}</div><div class="btn-row" style="margin-top:10px"><button class="btn ${done && yes ? 'danger' : 'ghost'}" data-a="tb-lift" data-yes="1">${u.tbLiftYes}${done && yes ? ' ✓' : ''}</button><button class="btn ${done && !yes ? 'primary' : 'ghost'}" data-a="tb-lift" data-yes="0">${u.tbLiftNo}${done && !yes ? ' ✓' : ''}</button></div></div>`; }
  if (ask.kind === 'roulette') { const grid = Array.from({ length: 9 }, (_, i) => i + 1).map(n => `<button class="pk roulette-n ${(ask.used || []).includes(n) ? 'used' : ''}" data-a="tb-rou" data-n="${n}" ${(ask.used || []).includes(n) || sent ? 'disabled' : ''}><span class="seat">${n}</span></button>`).join(''); return `<div class="panel raised"><div class="eyebrow gold">${title}</div><div class="picker roulette" style="margin-top:10px">${grid}</div>${sent ? `<div class="hint" style="margin-top:8px">${u.tbWaitOthers}</div>` : ''}</div>`; }
  const picked = done ? (sent ? sent.pick || [] : ask.picked || []) : TB.pick;
  if (done) {
    const canChange = ['vote', 'propose'].includes(ask.kind);
    const txt = ask.kind === 'vote' ? tt(u.tbVoted, { seat: picked[0] }) : ask.kind === 'nominate' ? (picked.length ? tt(u.tbNominated, { seat: picked[0] }) : u.tbNoNominate) : `${u.tbDone}${picked.length ? ': ' + picked.join(', ') : ''}`;
    return `<div class="panel raised"><div class="eyebrow gold">${title}</div>${proposals}<div class="okbox" style="margin-top:8px">${txt}</div>${canChange ? `<button class="btn ghost sm" style="margin-top:8px" data-a="tb-change" data-key="${esc(ask.key)}">${u.tbChange}</button>` : `<div class="hint" style="margin-top:6px">${u.tbWaitOthers}</div>`}</div>`;
  }
  const modes = ask.modes ? `<div class="segment n${ask.modes.length}" style="margin:8px 0">${ask.modes.map(m => `<button class="${(TB.mode || ask.modes[0]) === m ? 'active' : ''}" data-a="tb-mode" data-id="${m}">${{ check: u.modeCheck, shoot: u.modeShoot, douse: L.e.modeDouse, ignite: L.e.modeIgnite }[m] || m}</button>`).join('')}</div>` : '';
  const mode = TB.mode || (ask.modes ? ask.modes[0] : null); const need = ask.targetsByMode && mode ? ask.targetsByMode[mode] : ask.need;
  const pk = (ask.targets || []).map(tg => { const i = TB.pick.indexOf(tg.seat); return `<button class="pk ${i >= 0 ? 'sel' : ''} ${i === 1 ? 'n2' : ''} ${tg.ok ? '' : 'dis'}" data-a="tb-pick" data-seat="${tg.seat}" ${tg.ok ? '' : 'disabled'}><span class="seat">${tg.seat}</span><span class="nm">${esc((seats.find(s => s.seat === tg.seat) || {}).name || '')}</span>${i >= 0 && need > 1 ? `<span class="mark ${i === 1 ? 'c' : ''}">${i + 1}</span>` : ''}</button>`; }).join('');
  const ready = ask.kind === 'bestmove' ? TB.pick.length > 0 : TB.pick.length === need;
  const skip = ask.kind === 'nominate' ? `<button class="btn ghost" data-a="tb-skip">${u.tbNoNominate}</button>` : ask.kind === 'bestmove' ? `<button class="btn ghost" data-a="tb-skip">${u.tbBestSkip}</button>` : (ask.kind === 'act' || ask.kind === 'shoot') ? `<button class="btn ghost" data-a="tb-skip">${u.tbSkipTurn}</button>` : '';
  return `<div class="panel raised tb-ask"><div class="row">${role ? sealHTML(role) : ''}<div class="grow"><div class="eyebrow gold">${title}</div><div class="hint" style="margin:0">${need === 0 ? '' : need > 1 ? tt(u.tbPickN, { n: ask.kind === 'bestmove' ? '1–3' : need }) : u.pickOne}</div></div></div>${proposals}${modes}
    ${need === 0 ? '' : `<div class="picker" style="margin-top:10px">${pk}</div>`}
    <div class="btn-row" style="margin-top:10px">${skip}<button class="btn primary" data-a="tb-confirm" ${ready ? '' : 'disabled'}>${ask.kind === 'bestmove' ? u.tbBestSave : u.confirm}</button></div></div>`;
}
function tbChatHTML(pub) {
  const u = U(); const open = !!pub.chat;
  const fmtT = ms => { try { return new Date(ms).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const msgs = TB.chat.length ? TB.chat.map(m => `<div class="msg ${m.me ? 'me' : ''}">${m.me ? '' : `<div class="who">${esc(m.name)}</div>`}${esc(m.text)}<div class="when">${fmtT(m.at)}</div></div>`).join('') : `<div class="msg sys">${open ? u.tbChatEmpty : u.tbChatClosed}</div>`;
  return `<div class="panel"><div class="eyebrow">${u.tbChat}</div><div class="chat" id="tb-chat" style="max-height:220px">${msgs}</div>
    <div class="row" style="margin-top:8px"><input class="input grow" id="tb-msg" data-a="tb-msg" placeholder="${open ? u.tbChatPh : u.tbChatClosed}" value="${esc(TB.msg)}" autocomplete="off" maxlength="300" ${open ? '' : 'disabled'}><button class="btn sm primary" data-a="tb-send" style="flex:0 0 auto" ${open ? '' : 'disabled'}>${u.tbSend}</button></div></div>`;
}
function tableScreen() {
  const u = U(); const d = TB.data;
  if (!TG.app || !apiBase()) return `${topbar(u.tbLobby, '')}<div class="stack"><div class="panel"><div class="hint">${u.frOnlyTg}</div></div></div>`;
  if (!d) return `${topbar(tt(u.tbTitle, { code: TB.code || '' }), u.tbLobby)}<div class="stack"><p class="hint" style="text-align:center">${TB.err === 'not_seated' ? u.tbNotSeated : TB.err ? u.tgOffline : u.tbLoading}</p>${TB.err ? `<button class="btn ghost" data-a="go" data-to="home">${u.tbBackHome}</button>` : ''}</div>`;
  const pub = d.pub || { phase: 'lobby' }; const me = d.me; const profiles = d.profiles || {}; const myId = S.cloud && S.cloud.user ? S.cloud.user.id : 0;
  let seats = (pub.seats || []).slice();
  if (!seats.length) seats = (d.players || []).map((p, i) => ({ seat: i + 1, name: p.name, tgId: p.tgId, alive: true }));
  const mySeat = me && me.seat ? me.seat : (seats.find(s => s.tgId === myId) || {}).seat;
  const marks = {}; seats.forEach(s => { marks[s.seat] = { mine: s.seat === mySeat }; });
  const hostLine = `<div class="rt-brand">Mafia <em>PRO</em></div><div class="rt-host">${esc(d.host ? d.host.name : '')}</div><div class="rt-n">${tt(u.tbPlayersN, { n: pub.phase === 'lobby' || pub.phase === 'deal' ? `${(d.players || []).length} / ${seats.length}` : seats.filter(s => s.alive !== false).length })}</div>`;
  const di = pub.dayInfo || null;
  const phaseLbl = pub.phase === 'night0' ? u.tbNight0 : pub.phase === 'night' ? tt(u.tbNight, { n: pub.night }) : pub.phase === 'day0' ? u.tbDay0 : pub.phase === 'day' ? tt(u.tbDay, { n: pub.day }) : pub.phase === 'end' ? u.tbEnd : pub.phase === 'deal' ? u.dealTitle : u.tbLobby;
  const stageLbl = pub.phase === 'day' && di ? ({ morning: u.tbMorning, balagan: u.tbBalagan, speeches: u.tbSpeeches, vote: di.round === 2 ? u.tbRevote : u.tbVoteStage, tie: u.stTie, roulette: u.stRoulette, lift: u.stLift, result: u.tbResult }[di.stage] || '') : '';
  const timerHTML = pub.timer ? `<div class="rt-timer" id="tb-timer">0:00</div>` : '';
  // ----- end of the game: results for everyone (also the eliminated)
  if (pub.phase === 'end' && pub.result) {
    const w = pub.result; const mine = (pub.roles || []).find(r => r.seat === mySeat);
    const rows = (pub.roles || []).map(r => { const role = ROLE[r.roleId]; return `<div class="fr-row"><span class="seat" style="width:28px;font-weight:800;color:var(--gold-2)">${r.seat}</span>${role ? sealHTML(role) : ''}<div class="grow" style="min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}${r.seat === mySeat ? ` <small>· ${u.tbYou}</small>` : ''}</div><div class="hint" style="margin:0">${role ? role.name : esc(r.roleId)}${r.family ? ' · ' + esc(FAMILY_NAMES[r.family] || r.family) : ''}</div></div><span class="num" style="color:${r.won ? '#9fe0ab' : 'var(--crimson-2)'};font-weight:700">${r.won ? u.won : u.lost}</span></div>`; }).join('');
    return `${topbar(u.tbEnd, tt(u.tbTitle, { code: TB.code }))}<div class="stack">
      <div class="winner ${w.side}"><div class="e">${u.tbWinner}</div><h1>${esc(w.title)}</h1><p class="hint" style="margin-top:8px">${esc(w.text || '')}</p>${mine ? `<div style="margin-top:10px;font-weight:800;color:${mine.won ? '#9fe0ab' : 'var(--crimson-2)'}">${mine.won ? u.tbYouWon : u.tbYouLost}</div>` : ''}</div>
      ${me && me.roleId ? tbRoleRow(me.roleId, false) : ''}
      <div class="eyebrow">${u.tbRoles}</div><div class="stack-s">${rows}</div>
      <button class="btn primary" data-a="go" data-to="home">${u.tbBackHome}</button></div>`;
  }
  // ----- eliminated: only the seats still at the table
  if (me && me.alive === false) {
    const center = `<div class="rt-brand">Mafia <em>PRO</em></div><div class="rt-host">${esc(d.host ? d.host.name : '')}</div><div class="rt-n">${tt(u.tbAtTable, { n: seats.filter(s => s.alive !== false).length })}</div>`;
    return `${topbar(tt(u.tbTitle, { code: TB.code }), u.tbDead)}<div class="stack">
      <div class="panel" style="border-color:var(--crimson-2)"><div style="font-weight:800">${u.tbDead}</div><div class="hint" style="margin-top:4px">${u.tbDeadHint}</div></div>
      ${roundTableHTML(seats.filter(s => s.alive !== false), profiles, center, marks)}
      ${me.roleId ? tbRoleRow(me.roleId, false) : ''}
      <button class="btn ghost" data-a="go" data-to="home">${u.tbBackHome}</button></div>`;
  }
  // ----- waiting room / dealing
  if (pub.phase === 'lobby' || pub.phase === 'deal') {
    const card = me && me.roleId ? tbRoleRow(me.roleId, true) : `<div class="panel" style="text-align:center"><div class="hint">${u.tbWaitHost}</div></div>`;
    const mates = me && me.mates && me.mates.length ? `<div class="panel"><div class="eyebrow">${u.tbMates}</div><div class="stack-s" style="margin-top:6px">${me.mates.map(m => `<div class="row"><span class="seat" style="width:28px;font-weight:800;color:var(--gold-2)">${m.seat}</span>${ROLE[m.roleId] ? sealHTML(ROLE[m.roleId]) : ''}<div class="grow"><b>${esc(m.name)}</b><div class="hint" style="margin:0">${ROLE[m.roleId] ? ROLE[m.roleId].name : ''}</div></div></div>`).join('')}</div></div>` : '';
    return `${topbar(tt(u.tbTitle, { code: TB.code }), pub.online ? `${u.tbLobby} · ${u.tbOnlineTag}` : u.tbLobby)}<div class="stack">
      ${roundTableHTML(seats, profiles, hostLine, marks)}
      <div class="hint" style="text-align:center">${mySeat ? tt(u.tgSeated, { seat: mySeat }) : u.tbNoSeat}</div>
      ${card}${mates}
      ${me && me.contract ? `<div class="quiet">${tt(u.tbContract, { seat: me.contract })}</div>` : ''}
      <button class="btn ghost sm" data-a="go" data-to="home" style="align-self:center">${u.tbLeaveBtn}</button></div>`;
  }
  // ----- the game, as seen by a living player
  const ask = me && me.ask; const isMine = !!ask && !ask.done && !ask.blocked;
  if (pub.phase === 'day' && pub.day) { if (pub.dayInfo.speaker) marks[pub.dayInfo.speaker] = Object.assign(marks[pub.dayInfo.speaker] || {}, { speaker: true }); (pub.dayInfo.candidates || []).forEach(s => { marks[s] = Object.assign(marks[s] || {}, { cand: true }); }); if (pub.dayInfo.votes) Object.entries(pub.dayInfo.votes).forEach(([v, c]) => { marks[v] = Object.assign(marks[v] || {}, { vote: c }); }); }
  if (pub.phase === 'day0' && pub.day0 && pub.day0.speaker) marks[pub.day0.speaker] = Object.assign(marks[pub.day0.speaker] || {}, { speaker: true });
  if (isMine && ask.targets && ask.kind !== 'lift' && ask.kind !== 'roulette') ask.targets.forEach(tg => { marks[tg.seat] = Object.assign(marks[tg.seat] || {}, { pick: tg.ok, ok: tg.ok, picked: TB.pick.includes(tg.seat) }); });
  const nightRole = pub.step && pub.step.roleId ? ROLE[pub.step.roleId] : null;
  const center = `<div class="rt-phase">${phaseLbl}</div>${stageLbl ? `<div class="rt-stage">${stageLbl}</div>` : ''}${pub.phase === 'night0' || pub.phase === 'night' ? `<div class="rt-stage">${pub.step && pub.step.type === 'end' ? u.allActed : nightRole ? (isMine ? u.tbYourTurn : (pub.phase === 'night0' ? nightRole.name : tt(u.tbSleep, { role: nightRole.name }))) : ''}</div>` : ''}${timerHTML}`;
  let body = '';
  if (pub.phase === 'day' && di) {
    const dy = di; const st = dy.stage;
    if (st === 'morning') body += `<div class="panel"><div class="eyebrow">${u.tbMorning}</div>${dy.removed && dy.removed.length ? `<div class="stack-s" style="margin-top:6px">${dy.removed.map(r => `<div class="death">${r.roleId && ROLE[r.roleId] ? sealHTML(ROLE[r.roleId]) : ''}<div><div class="n">${tbSeatName(seats, r.seat)}</div><div class="c">${r.roleId && ROLE[r.roleId] ? ROLE[r.roleId].name + ' · ' : ''}${esc(r.cause || '')}</div></div></div>`).join('')}</div>` : `<div class="okbox" style="margin-top:6px">${u.tbNoDeaths}</div>`}${dy.bestMove ? `<div class="hint" style="margin-top:6px">${tt(u.bestMoveDone, { player: tbSeatName(seats, dy.bestMove.seat), list: dy.bestMove.picks.join(', ') || '—' })}</div>` : ''}</div>`;
    if (st === 'speeches' || st === 'tie') body += `<div class="panel raised"><div class="speaker"><span class="seat">${dy.speaker || '—'}</span><div><div class="n">${dy.speaker ? esc((seats.find(s => s.seat === dy.speaker) || {}).name || '') : u.speechesDone}</div><div class="s">${dy.n ? tt(u.introOf, { i: (dy.i || 0) + 1, n: dy.n }) : ''}${st === 'tie' ? ' · ' + tt(u.tbTie, { list: (dy.tied || []).join(L.e.and) }) : ''}</div></div></div></div>`;
    if ((st === 'speeches' || st === 'vote' || st === 'tie') && dy.candidates && dy.candidates.length) body += `<div class="hint" style="text-align:center">${tt(u.tbCandidates, { list: dy.candidates.join(', ') })}</div>`;
    if (st === 'vote') body += dy.candidates && dy.candidates.length ? `<div class="panel"><div class="eyebrow">${u.tallyTitle}</div><div class="tally" style="margin-top:8px">${(dy.tally || []).map(r => `<div class="tr"><span class="n">${tbSeatName(seats, r.seat)}</span><span class="b"><i style="width:${Math.max(...(dy.tally || []).map(x => x.total), 1) ? 100 * r.total / Math.max(...(dy.tally || []).map(x => x.total), 1) : 0}%"></i></span><span class="v">${Number.isInteger(r.total) ? r.total : r.total.toFixed(1)}</span></div>`).join('')}</div></div>` : `<div class="panel"><div class="hint">${u.tbNoCands}</div></div>`;
    if (st === 'roulette' && dy.roulette) body += `<div class="panel"><div class="eyebrow">${u.stRoulette}</div><div class="hint" style="margin-top:4px">${tt(u.tbRouletteWait, { seat: dy.roulette.turn })}</div>${dy.roulette.guesses.length ? `<div class="filters wrap" style="margin-top:8px">${dy.roulette.guesses.map(x => `<span class="chip" style="pointer-events:none">${x.seat} → ${x.n}</span>`).join('')}</div>` : ''}</div>`;
    if (st === 'lift' && dy.lift) body += `<div class="panel"><div class="eyebrow">${u.stLift}</div><div class="hint" style="margin-top:4px">${tt(u.tbLiftN, { n: dy.lift.yes, need: dy.lift.need })}</div></div>`;
    if (st === 'result' && dy.result) { const r = dy.result; body += `<div class="panel"><div class="eyebrow">${u.tbResult}</div><div style="margin-top:4px;font-weight:800">${r.vetoed ? u.judgeVetoed : r.eliminated ? tt(u.tbLeft, { seat: r.eliminated }) : u.tbNobodyLeft}</div>${r.roulette ? `<div class="hint">${tt(u.rouletteHit, { n: r.roulette.number, seat: r.roulette.seat })}</div>` : ''}${r.removed && r.removed.length ? `<div class="stack-s" style="margin-top:6px">${r.removed.map(x => `<div class="death">${x.roleId && ROLE[x.roleId] ? sealHTML(ROLE[x.roleId]) : ''}<div><div class="n">${tbSeatName(seats, x.seat)}</div><div class="c">${x.roleId && ROLE[x.roleId] ? ROLE[x.roleId].name + ' · ' : ''}${esc(x.cause || '')}</div></div></div>`).join('')}</div>` : ''}</div>`; }
  }
  if (pub.phase === 'day0' && pub.day0) body += `<div class="panel raised"><div class="speaker"><span class="seat">${pub.day0.speaker || '—'}</span><div><div class="n">${pub.day0.speaker ? esc((seats.find(s => s.seat === pub.day0.speaker) || {}).name || '') : u.allIntroduced}</div><div class="s">${tt(u.introOf, { i: (pub.day0.i || 0) + 1, n: pub.day0.n || 0 })}</div></div></div></div>`;
  const results = me && me.results && me.results.length ? `<div class="eyebrow">${u.tbResults}</div><div class="stack-s">${me.results.slice(-6).reverse().map(tbResultHTML).join('')}</div>` : '';
  const mates = me && me.mates && me.mates.length ? `<div class="hint" style="text-align:center">${u.tbMates}: ${me.mates.map(m => `${m.seat} · ${esc(m.name)}${ROLE[m.roleId] ? ' (' + ROLE[m.roleId].name + ')' : ''}`).join(', ')}</div>` : '';
  const waiting = pub.waiting && pub.waiting.length && !isMine ? `<div class="hint" style="text-align:center">${tt(u.onWaiting, { list: pub.waiting.join(', ') })}</div>` : (!isMine && pub.phase !== 'day' ? `<div class="hint" style="text-align:center">${u.tbWaitHostNext}</div>` : '');
  return `${topbar(tt(u.tbTitle, { code: TB.code }), `${phaseLbl}${stageLbl ? ' · ' + stageLbl : ''}`)}<div class="stack">
    ${roundTableHTML(seats, profiles, center, marks)}
    ${ask ? tbAskHTML(ask, seats) : ''}${waiting}
    ${body}
    ${me && me.roleId ? tbRoleRow(me.roleId, false) : ''}${mates}
    ${results}
    ${pub.online ? tbChatHTML(pub) : ''}
  </div>`;
}
/* the in-app invitation sheet */
function tableInviteHTML(code) {
  const u = U(); const inv = ((S.cloud && S.cloud.invites) || []).find(i => i.code === code) || { code, from: '…', kind: 'friend' };
  return `<h2>${tt(inv.kind === 'club' ? u.tbInviteClub : u.tbInvite, { name: esc(inv.from), code: esc(inv.code) })}</h2><div class="row" style="gap:12px;margin-top:10px">${inv.photo ? `<img class="avatar lg" src="${esc(inv.photo)}" alt="" style="object-fit:cover">` : `<div class="avatar lg" style="--av-bg:var(--bg-3);--av-fg:var(--gold-2)">${esc((inv.from || '?').slice(0, 1).toUpperCase())}</div>`}<div class="grow"><div style="font-weight:800">${esc(inv.from)}${inv.username ? ` <span style="color:var(--muted);font-weight:500">@${esc(inv.username)}</span>` : ''}</div><div class="hint" style="margin:0">${tt(u.tbTitle, { code: esc(inv.code) })}</div></div></div>
    <div class="btn-row" style="margin-top:14px"><button class="btn ghost" data-a="inv-respond" data-code="${esc(inv.code)}" data-ok="0">${u.tbDecline}</button><button class="btn primary" data-a="inv-respond" data-code="${esc(inv.code)}" data-ok="1">${u.tbAccept}</button></div>`;
}
function showInvites() {
  const list = (S.cloud && S.cloud.invites) || []; if (!list.length || S.ui.sheet || (S.game && !S.game.winner)) return;
  const inv = list.find(i => i.code !== TB.code); if (!inv) return;
  S.ui.sheet = { type: 'tableInvite', code: inv.code }; tgHaptic('warning'); render();
}
/* home banner: the table I sit at */
function tableBannerHTML() {
  const u = U(); const t = S.cloud && S.cloud.table; if (!TG.app || !apiBase() || !t || (S.cloud.user && t.hostId === S.cloud.user.id)) return '';
  return `<div class="panel" role="button" data-a="table-open" data-id="${esc(t.code)}" style="border-color:rgba(240,205,122,.5);cursor:pointer"><div class="row"><div class="ico" style="color:var(--gold)">${I.game}</div><div class="grow"><div style="font-weight:800">${tt(u.tbBanner, { code: esc(t.code), host: esc(t.host || '') })}</div><div class="hint" style="margin:0">${t.status === 'live' ? u.tbOnlineTag : u.tbLobby}</div></div><span class="btn xs primary">${u.tbOpen}</span></div></div>`;
}
Object.assign(ACT, {
  'on-mode'(el) { S.setup.online = el.dataset.id === 'online'; save(); render(); if (S.setup.online && !lobbyIsOpen()) openTable(false); },
  'table-open'(el) { tableOpen(el.dataset.id); },
  'tb-pick'(el) { const ask = TB.data && TB.data.me && TB.data.me.ask; if (!ask || ask.done || TB.sent[ask.key]) return; const seat = Number(el.dataset.seat); const tg = (ask.targets || []).find(t => t.seat === seat); if (!tg || !tg.ok) return; const mode = TB.mode || (ask.modes ? ask.modes[0] : null); const need = ask.kind === 'bestmove' ? 3 : (ask.targetsByMode && mode ? ask.targetsByMode[mode] : ask.need); const i = TB.pick.indexOf(seat); if (i >= 0) TB.pick.splice(i, 1); else { if (TB.pick.length >= need) TB.pick.shift(); TB.pick.push(seat); } tgHaptic('light'); render(); },
  'tb-mode'(el) { TB.mode = el.dataset.id; TB.pick = []; render(); },
  async 'tb-confirm'() { const ask = TB.data && TB.data.me && TB.data.me.ask; if (!ask) return; const payload = { pick: TB.pick.slice(), mode: TB.mode || (ask.modes ? ask.modes[0] : undefined) }; TB.sent[ask.key] = payload; render(); const d = await api('/api/table/act', { code: TB.code, key: ask.key, payload }); if (!d.ok) { delete TB.sent[ask.key]; toast(U().tgOffline); render(); return; } tgHaptic('success'); TB.pick = []; setTimeout(tableFetch, 600); },
  async 'tb-skip'() { const ask = TB.data && TB.data.me && TB.data.me.ask; if (!ask) return; TB.sent[ask.key] = { skip: true, pick: [] }; render(); const d = await api('/api/table/act', { code: TB.code, key: ask.key, payload: { skip: true } }); if (!d.ok) { delete TB.sent[ask.key]; toast(U().tgOffline); render(); return; } setTimeout(tableFetch, 600); },
  async 'tb-lift'(el) { const ask = TB.data && TB.data.me && TB.data.me.ask; if (!ask) return; const yes = el.dataset.yes === '1'; TB.sent[ask.key] = { yes }; render(); const d = await api('/api/table/act', { code: TB.code, key: ask.key, payload: { yes } }); if (!d.ok) { delete TB.sent[ask.key]; toast(U().tgOffline); render(); } else tgHaptic('light'); },
  async 'tb-rou'(el) { const ask = TB.data && TB.data.me && TB.data.me.ask; if (!ask) return; const n = Number(el.dataset.n); TB.sent[ask.key] = { n }; render(); const d = await api('/api/table/act', { code: TB.code, key: ask.key, payload: { n } }); if (!d.ok) { delete TB.sent[ask.key]; toast(U().tgOffline); render(); } else setTimeout(tableFetch, 600); },
  'tb-change'(el) { delete TB.sent[el.dataset.key]; if (TB.data && TB.data.me && TB.data.me.ask) TB.data.me.ask.done = false; TB.pick = []; render(); },
  'tb-msg'(el) { TB.msg = el.value || ''; },
  async 'tb-send'() { const text = TB.msg.trim(); if (!text) return; TB.msg = ''; const inp = document.querySelector('#tb-msg'); if (inp) inp.value = ''; const d = await api('/api/table/chat/send', { code: TB.code, text }); if (!d.ok) { toast(d.error === 'chat_closed' ? U().tbChatClosed : U().tgOffline); TB.msg = text; return; } tableFetch(); },
  async 'inv-respond'(el) {
    const code = el.dataset.code; const accept = el.dataset.ok === '1'; S.ui.sheet = null;
    S.cloud.invites = (S.cloud.invites || []).filter(i => i.code !== code); render();
    const d = await api('/api/table/invite/respond', { code, accept }); if (!d.ok) { toast(d.error === 'lobby_closed' ? U().tbInviteGone : U().tgOffline); return; }
    if (accept && d.joined) { toast(tt(U().tbJoined, { code })); tgHaptic('success'); S.cloud.table = { code, status: 'open' }; tableOpen(code); } else if (accept && d.gone) toast(U().tbInviteGone);
  }
});
/* ---------- hooks ---------- */
(function () {
  const origStart = applyStartParam;
  applyStartParam = function (sp) { if (sp && /^table_[A-Za-z0-9]{4,8}$/i.test(sp)) { S.ui.tgStart = { a: 'table-open', id: sp.slice(6).toUpperCase() }; return; } return origStart(sp); };
  const origRender = render;
  render = function () { origRender(); try { if (TG.app && apiBase()) { schedulePublish(); actionsPoll(); tablePoll(); } } catch (e) {} };
  const origSetupLobby = setupLobbyHTML;
  setupLobbyHTML = function (st) { return modeSegmentHTML() + origSetupLobby(st); };
  const origGame = gameScreen; gameScreen = function () { const html = origGame(); const s = onlineStripHTML(S.game); if (!s) return html; const i = html.indexOf('<div class="stack">'); return i < 0 ? html : html.slice(0, i + 19) + s + html.slice(i + 19); };
  const origDealScr = dealScreen; dealScreen = function () { const html = origDealScr(); const s = onlineStripHTML(S.game); if (!s) return html; const i = html.indexOf('<div class="stack">'); return i < 0 ? html : html.slice(0, i + 19) + s + html.slice(i + 19); };
  const origHome = homeScreen; homeScreen = function () { const html = origHome(); const b = tableBannerHTML(); if (!b) return html; const i = html.indexOf('<div class="menu">'); return i < 0 ? html : html.slice(0, i) + b + html.slice(i); };
  const origSheet2 = sheetHTML;
  sheetHTML = function (enter) { const sh = S.ui.sheet; if (sh && sh.type === 'tableInvite') { const u = U(); return `<div class="sheet-bg ${enter !== false ? 'enter' : ''}" data-a="sheet-close"><div class="sheet" data-stop="1"><div class="grab"></div>${tableInviteHTML(sh.code)}<button class="btn ghost" style="margin-top:14px" data-a="sheet-close">${u.close}</button></div></div>`; } return origSheet2(enter); };
  // the game is created: online flag + per-game online state; the table state is published at once (cards appear in the app)
  const origDeal2 = ACT.deal;
  ACT.deal = function (el) { const online = !!S.setup.online && lobbyIsOpen(); const r = origDeal2.call(this, el); const g = S.game; if (g && online && g.tg) { g.online = true; onlState(g); save(); } if (g) publishTable(true); return r; };
  // every timer control is visible to the players
  ['timer-toggle', 'timer-add', 'timer-reset'].forEach(k => { const f = ACT[k]; ACT[k] = function (el) { const r = f.call(this, el); schedulePublish(); return r; }; });
  // the end of the game reaches the players, then the host's next game starts a fresh table
  const origFinish2 = finishGame; finishGame = function (g, w) { origFinish2(g, w); if (g && g.tg && g.tg.code) setTimeout(() => publishTable(true, g.tg, g), 50); };
  const origReset = ACT['reset-confirm']; ACT['reset-confirm'] = function (el) { const g = S.game; if (g && g.tg && g.tg.code && !g.winner) { try { api('/api/table/publish', { code: g.tg.code, pub: { v: 2, phase: 'end', code: g.tg.code, n: g.n, host: hostName(), seats: tablePub(g).seats, result: { side: 'none', title: U().btnEnd, text: '' }, roles: g.players.map(p => ({ seat: p.seat, name: p.name, roleId: p.roleId, won: false, alive: p.alive })) }, priv: tablePriv(g) }); } catch (e) {} } return origReset.call(this, el); };
  // heartbeat every 15 s: presence + invitations + the table I sit at
  const origHeartbeat = startHeartbeat;
  startHeartbeat = function () { if (heartbeatTimer || !TG.app || !apiBase()) return; heartbeatTimer = setInterval(async () => { try { if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return; const d = await api('/api/ping', {}); if (d && d.ok) { S.cloud = S.cloud || {}; S.cloud.invites = d.invites || []; S.cloud.table = d.table || null; showInvites(); if (S.screen === 'home') render(); } } catch (e) {} }, 15000); };
  const origSync = cloudSync;
  cloudSync = async function () { await origSync(); const d = CLOUD.me; if (!d || !d.ok) return; S.cloud.invites = d.invites || []; S.cloud.table = d.table || null; const me = S.meId ? profById(S.meId) : null; if (me && me.city && !ONL.citySent) { ONL.citySent = true; api('/api/me', { city: me.city }); } if (!ONL.autoOpened) { ONL.autoOpened = true; const t = d.table; if (t && t.hostId !== d.user.id && !S.game && !S.ui.tgStart && S.screen === 'home') { tableOpen(t.code); return; } } showInvites(); if (S.screen === 'home') render(); };
  try { document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'tb-msg') { e.preventDefault(); ACT['tb-send'](); } }); document.addEventListener('input', e => { const el = e.target.closest && e.target.closest('[data-a="tb-msg"]'); if (el) ACT['tb-msg'](el); }); } catch (e) {}
})();
