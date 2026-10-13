/* ============================================================
   CLASSIC ONLINE — the sport table on the players' phones:
   · night 0: the Don gives the finger signs (numbers, nights, dynamic and professional signs) from a palette; the family
     sees them big and bare, straight from the queue; the moment the mafia falls asleep they are gone from every screen
   · night: the host counts 1–10 on server time; every mafioso raises a fist, then two fingers, and "fires" (the fingers bend
     and straighten) on a number; the family sees each other's hands; all on one number — a kill, otherwise a miss
   · day: candidates one by one, a 4-second window each; everyone presses "I vote / I don't" at the same time, answers stay
     hidden until the window closes; whoever has not voted goes to the last candidate
   ============================================================ */
const HS = { LEAD: 3000, STEP: 1000, N: 10, GRACE: 2000, SHOW: 2600, ANIM: 700 }; // the shot: lead-in, a second per number, ten numbers, late hands, how long the outcome stays
const PLC = { DUR: 4000, GAP: 900, GRACE: 1800, LAST: 2500 }; // the vote: the window, the pause between candidates, late answers, the "rest to the last" pause
const classicOnline = g => !!(g && typeof isClassic === 'function' && isClassic(g) && onlineActive(g));
const srvNow = () => Date.now() + (ONL.skew || 0); // the host's estimate of server time
const tbNow = () => Date.now() + (TB.skew || 0); // the player's estimate of server time
ONL.skew = ONL.skew || 0; TB.skew = TB.skew || 0; TB.seen = TB.seen || {}; TB.dl = TB.dl || null; TB.dlKey = TB.dlKey || null;

/* ---------- hands: a procedural pictogram (palm, four fingers, thumb) ----------
   f: [index, middle, ring, pinky] 1 = up, t: 1 = thumb out; opts: size, cls, flip (left hand), rot (degrees), fire (bend animation) */
function handSVG(f, t, opts) {
  opts = opts || {}; const size = opts.size || 72; const cls = ['hand', opts.cls || '', opts.fire ? 'fire' : ''].filter(Boolean).join(' ');
  const cx = [30.5, 43.5, 56.5, 69.5], hs = [46, 52, 48, 38]; let body = '';
  for (let i = 0; i < 4; i++) body += f[i] ? `<rect class="fg up" x="${cx[i] - 5.5}" y="${60 - hs[i]}" width="11" height="${hs[i] + 6}" rx="5.5"/>` : `<rect class="kn" x="${cx[i] - 5.5}" y="50" width="11" height="16" rx="5.5"/>`;
  if (t) body += `<rect class="th" x="10" y="58" width="13" height="38" rx="6.5" transform="rotate(-32 22 92)"/>`;
  body += `<rect class="pm" x="23" y="56" width="54" height="50" rx="16"/>`;
  if (!t) body += `<rect class="kn" x="19" y="72" width="13" height="26" rx="6.5" transform="rotate(-14 25 85)"/>`;
  const tf = [opts.rot ? `rotate(${opts.rot} 50 80)` : '', opts.flip ? 'translate(100 0) scale(-1 1)' : ''].filter(Boolean).join(' ');
  return `<svg class="${cls}" viewBox="0 0 100 120" width="${Math.round(size * 100 / 120)}" height="${size}" aria-hidden="true">${tf ? `<g transform="${tf}">${body}</g>` : body}</svg>`;
}
const HAND_FIST = [0, 0, 0, 0], HAND_GUN = [1, 1, 0, 0];
const HAND_NUM = { 1: [[1, 0, 0, 0], 0], 2: [[1, 1, 0, 0], 0], 3: [[1, 1, 1, 0], 0], 4: [[1, 1, 1, 1], 0], 5: [[1, 1, 1, 1], 1] };
/* a seat number as hands: 1–5 on one hand, 6–10 as an open hand plus the rest */
function numHandsHTML(n, size, cls) {
  n = Number(n); if (!(n >= 1 && n <= 10)) return '';
  if (n <= 5) { const h = HAND_NUM[n]; return handSVG(h[0], h[1], { size, cls }); }
  const h = HAND_NUM[n - 5] || HAND_NUM[5];
  return `<span style="display:inline-flex;gap:0">${handSVG(HAND_NUM[5][0], 1, { size, cls, flip: true })}${n === 10 ? handSVG(HAND_NUM[5][0], 1, { size, cls }) : handSVG(h[0], h[1], { size, cls })}</span>`;
}
const moonSVG = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.2A8.6 8.6 0 0 1 8.8 3.5a8.6 8.6 0 1 0 11.7 11.7z" fill="currentColor"/></svg>`;
const sunSVG = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.6" fill="currentColor"/><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3M4.8 4.8l2.1 2.1M17.1 17.1l2.1 2.1M4.8 19.2l2.1-2.1M17.1 6.9l2.1-2.1"/></g></svg>`;

/* ---------- the Don's palette: every sign he may give at night 0 ---------- */
const DL_TOKENS = [];
for (let i = 1; i <= 10; i++) DL_TOKENS.push({ id: 'n' + i, cat: 'num', num: i });
for (let i = 1; i <= 5; i++) DL_TOKENS.push({ id: 'night' + i, cat: 'mark', mark: 'night', n: i });
for (let i = 1; i <= 4; i++) DL_TOKENS.push({ id: 'day' + i, cat: 'mark', mark: 'day', n: i });
[['prev', 'hand'], ['next', 'hand'], 'nomBy', 'nomFirst', 'nomLast', 'voteFirst', 'sheriff', 'checked', 'leader', 'victim', 'gone', 'us'].forEach(x => DL_TOKENS.push(Array.isArray(x) ? { id: x[0], cat: 'who', hand: x[0] } : { id: x, cat: 'who' }));
['repeat', 'miss', 'free', 'follow', 'answer', 'fakeMe', 'fakeYou', 'nominate', 'vote', 'spare', 'split'].forEach(id => DL_TOKENS.push({ id, cat: 'what' }));
['if', 'else', 'then', 'yes', 'no'].forEach(id => DL_TOKENS.push({ id, cat: 'link', hand: id === 'yes' ? 'yes' : null }));
const DL_BY_ID = Object.fromEntries(DL_TOKENS.map(t => [t.id, t]));
const DL_CATS = ['num', 'mark', 'who', 'what', 'link'];
function dlLabel(id) { const u = U(); const t = DL_BY_ID[id]; if (!t) return id; if (t.num) return String(t.num); if (t.mark) return tt(u.dlTok[t.mark], { n: t.n }); return u.dlTok[id] || id; }
/* one sign: big (the family's screen), normal (the Don's own sequence) or small (the palette button / the host's journal) */
function dlTokenHTML(id, mode, fresh) {
  const t = DL_BY_ID[id]; if (!t) return ''; const big = mode === 'big', small = mode === 'small'; const hsz = big ? 72 : small ? 30 : 52;
  let inner = ''; const cls = ['dl-tok', t.cat, t.id === 'no' ? 'no' : '', t.id === 'yes' ? 'yes' : '', fresh ? 'new' : ''].filter(Boolean).join(' ');
  if (t.num) inner = `${numHandsHTML(t.num, hsz)}<span class="cap">${t.num}</span>`;
  else if (t.mark) inner = `<span class="mk" style="color:${t.mark === 'night' ? 'var(--steel-2)' : 'var(--gold-2)'}">${t.mark === 'night' ? moonSVG() : sunSVG()}${t.n}</span><span class="cap">${esc(dlLabel(id))}</span>`;
  else if (t.hand === 'prev') inner = `${handSVG(HAND_FIST, 1, { size: hsz, rot: -58 })}<span class="cap">${esc(dlLabel(id))}</span>`;
  else if (t.hand === 'next') inner = `${handSVG(HAND_FIST, 1, { size: hsz, rot: -58, flip: true })}<span class="cap">${esc(dlLabel(id))}</span>`;
  else if (t.hand === 'yes') inner = `${handSVG(HAND_FIST, 1, { size: hsz, rot: -12 })}<span class="cap">${esc(dlLabel(id))}</span>`;
  else inner = `<span class="word">${esc(dlLabel(id))}</span>`;
  if (small) return `<button class="pk" data-a="dl-add" data-id="${t.id}">${inner}</button>`;
  return `<div class="${cls}">${inner}</div>`;
}
function dlSeqHTML(seq, big, grew) { const u = U(); seq = Array.isArray(seq) ? seq : []; return `<div class="dl-seq ${big ? 'big' : ''}">${seq.length ? seq.map((id, i) => dlTokenHTML(id, big ? 'big' : 'mid', grew && i === seq.length - 1)).join('') : `<span class="dl-empty">${u.dlEmpty}</span>`}</div>`; }
function dlPaletteHTML() { const u = U(); return DL_CATS.map(c => `<div class="eyebrow dl-cat">${u.dlCat[c]}</div><div class="dl-pal ${c === 'num' || c === 'mark' ? 'c5' : 'c3'}">${DL_TOKENS.filter(t => t.cat === c).map(t => dlTokenHTML(t.id, 'small')).join('')}</div>`).join(''); }
const dlClean = seq => (Array.isArray(seq) ? seq : []).map(String).filter(id => DL_BY_ID[id]).slice(0, 40);

/* ---------- host: state of the classic game online ---------- */
const famStep = g => { const s = g.steps[g.stepIdx]; return s && s.type === 'act' && s.ability === 'shoot' && s.members ? s : null; };
const dealStep = g => { const s = g.steps[g.stepIdx]; return g.phase === 'night0' && s && s.type === 'meet' && s.roleId === 'don' ? s : null; };
const dealKey = g => `night0:deal:${String(g.id || '').slice(-6)}`;
/* the family's shooters tonight: every living black player, and only if each of them sits in the app (otherwise the host plays the step as before) */
function handsMembers(g, step) { const m = step.members.filter(p => p.alive && isBlack(p)); return m.length && m.every(p => seatTg(g, p.seat)) ? m : null; }
function ensureShot(g, step) { const onl = onlState(g); const key = `${phaseTag(g)}:hands:${step.id}`; if (!onl.shot || onl.shot.key !== key) onl.shot = { key, stepId: step.id, at: srvNow() + HS.LEAD, result: null, doneAt: 0 }; onl.shots = onl.shots || {}; onl.shots[key] = onl.shots[key] || {}; return onl.shot; }
const shotKeyOf = g => { const s = famStep(g); return s ? `${phaseTag(g)}:hands:${s.id}` : null; };
function classicAsks(g, asks) {
  const onl = onlState(g); const tgOf = p => seatTg(g, p.seat);
  if (g.phase === 'night0') { const st = dealStep(g); if (!st) return; const don = st.members.find(p => p.roleId === 'don' && p.alive); const id = don && tgOf(don); if (id) asks[id] = { key: dealKey(g), kind: 'deal', seq: dlClean(onl.deal), done: false }; return; }
  if (g.phase === 'night') {
    const step = famStep(g); if (!step) return; const members = handsMembers(g, step); if (!members) return;
    if (g.actions.find(a => a.stepId === step.id)) { step.members.forEach(m => { const id = tgOf(m); if (id) delete asks[id]; }); return; } // resolved: nothing more to ask
    const shot = ensureShot(g, step); const shots = onl.shots[shot.key];
    step.members.forEach(m => { const id = tgOf(m); if (id) delete asks[id]; });
    members.forEach(m => { const id = tgOf(m); asks[id] = { key: shot.key, kind: 'hands', at: shot.at, n: HS.N, step: HS.STEP, done: shots[id] !== undefined, picked: shots[id] !== undefined ? [shots[id]] : null, blocked: false }; });
    return;
  }
  if (g.phase === 'day' && g.dayStage === 'vote') {
    const b = g.ballot || {}; const pl = onl.poll;
    alive(g).forEach(v => { const id = tgOf(v); if (id && asks[id] && asks[id].kind === 'vote') delete asks[id]; });
    if (onl.pollManual) { if (voteOutcome(g).kind === 'skip1') return; alive(g).forEach(v => { const id = tgOf(v); if (!id || !canVoteNow(g, v.id)) return; const cands = (b.candidates || []).filter(c => c !== v.id); if (!cands.length) return; asks[id] = { key: `${phaseTag(g)}:vote:r${b.round || 1}`, kind: 'vote', need: 1, targets: cands.map(c => ({ seat: P(g, c).seat, ok: true })), done: !!b.votes[v.id], picked: b.votes[v.id] ? [P(g, b.votes[v.id]).seat] : null, round: b.round || 1 }; }); return; }
    if (!pl || pl.done || pl.last || pl.round !== (b.round || 1)) return;
    const cand = pl.cands[pl.idx]; if (!cand) return; const key = `${pl.key}:c${cand}`; const ans = (onl.pollAns || {})[key] || {};
    alive(g).filter(v => v.id !== cand && canVoteNow(g, v.id) && !b.votes[v.id]).forEach(v => { const id = tgOf(v); if (!id) return; asks[id] = { key, kind: 'poll', cand: P(g, cand).seat, at: pl.at, dur: pl.dur, done: ans[id] !== undefined, yes: ans[id] === true, blocked: false }; });
  }
}
function classicApply(g, a) {
  const tgId = Number(a.tgId); const ask = buildAsks(g)[tgId]; if (!ask || ask.key !== a.key) return undefined;
  const onl = onlState(g); const pl = a.payload || {};
  if (ask.kind === 'deal') { onl.deal = dlClean(pl.seq); return true; }
  if (ask.kind === 'hands') { const n = Number(pl.n); if (!(n >= 1 && n <= HS.N) || ask.done) return false; onl.shots[ask.key][tgId] = n; return true; }
  if (ask.kind === 'poll') { onl.pollAns = onl.pollAns || {}; onl.pollAns[ask.key] = onl.pollAns[ask.key] || {}; onl.pollAns[ask.key][tgId] = !!pl.yes; return true; }
  return undefined;
}
/* the family's hands are in: all on one living seat — the shot is recorded, otherwise a miss; the outcome stays on the screens for a moment, then the night goes on */
function resolveHands(g, step, shot) {
  const onl = onlState(g); const members = handsMembers(g, step) || []; const shots = onl.shots[shot.key] || {};
  const ns = members.map(m => shots[seatTg(g, m.seat)]); const list = members.map((m, i) => `${m.seat} → ${ns[i] === undefined ? '—' : ns[i]}`).join(', ');
  const same = ns.length && ns.every(n => n !== undefined && n === ns[0]); const target = same ? g.players.find(p => p.seat === ns[0]) : null;
  if (target && target.alive && !step.disabled) {
    S.ui.pick = [target.id]; S.ui.mode = null; const res = recordAction(g, step, [target.id], null); S.ui.pick = []; S.ui.result = res || null;
    shot.result = { hit: true, seat: target.seat }; addLog(g, tt(L.e.logHandsHit, { list, target: label(target) }), true);
  } else { shot.result = { hit: false, seat: same ? ns[0] : null, none: ns.every(n => n === undefined), dead: !!(target && !target.alive) }; addLog(g, tt(L.e.logHandsMiss, { list }), true); }
  shot.doneAt = srvNow();
}
function startPoll(g) {
  const onl = onlState(g); const b = g.ballot; const cands = (b.candidates || []).slice(); if (!cands.length) return false;
  const o = voteOutcome(g); if (o.kind === 'skip1' || o.kind === 'empty') return false;
  onl.poll = { key: `${phaseTag(g)}:poll:r${b.round || 1}`, round: b.round || 1, cands, idx: 0, at: srvNow() + PLC.GAP, dur: PLC.DUR, last: cands.length === 1, done: false }; onl.pollAns = {}; onl.pollManual = false;
  addLog(g, tt(L.e.logPollStart, { list: cands.map(id => P(g, id).seat).join(', ') }));
  return true;
}
function pollActive(g) { const onl = g.onl || {}; const pl = onl.poll; return !!(pl && !pl.done && g.phase === 'day' && g.dayStage === 'vote' && pl.round === ((g.ballot || {}).round || 1)); }
function pollWindowClose(g) {
  const onl = onlState(g); const pl = onl.poll; const b = g.ballot; const cand = pl.cands[pl.idx]; const key = `${pl.key}:c${cand}`; const ans = (onl.pollAns || {})[key] || {}; const who = [];
  alive(g).filter(v => v.id !== cand && canVoteNow(g, v.id) && !b.votes[v.id]).forEach(v => { const id = seatTg(g, v.seat); if (id && ans[id] === true) { b.votes[v.id] = cand; who.push(v.seat); } });
  addLog(g, tt(L.e.logPollCand, { seat: P(g, cand).seat, list: who.length ? who.join(', ') : '—' }));
  pl.idx += 1; const now = srvNow();
  if (pl.idx >= pl.cands.length - 1) { pl.idx = pl.cands.length - 1; pl.last = true; pl.at = now; } else pl.at = now + PLC.GAP;
}
function pollFinish(g) { const onl = onlState(g); onl.poll.done = true; voteRestToLast(g); resolveVoteAuto(g); S.ui.pick = []; }
/* the host's clock: every 1.2 s with the answers poll — closes the count and the vote windows */
function classicTick(g) {
  if (!classicOnline(g) || !g.dealt || g.winner) return; const onl = onlState(g); const now = srvNow(); let changed = false;
  if (g.phase === 'night') {
    const step = famStep(g); const shot = onl.shot;
    if (step && shot && shot.stepId === step.id && handsMembers(g, step)) {
      if (g.actions.find(a => a.stepId === step.id) && !shot.result) { /* the host picked the target by hand: the night goes on at the host's pace */ }
      else if (!shot.result) { const members = handsMembers(g, step); const shots = onl.shots[shot.key] || {}; const all = members.every(m => shots[seatTg(g, m.seat)] !== undefined); if (all || now > shot.at + HS.N * HS.STEP + HS.GRACE) { resolveHands(g, step, shot); changed = true; } }
      else if (now > shot.doneAt + HS.SHOW) { g.stepIdx += 1; S.ui.pick = []; S.ui.result = null; changed = true; }
    }
  }
  if (pollActive(g)) { const pl = onl.poll; if (pl.last) { if (now > pl.at + PLC.LAST) { pollFinish(g); changed = true; } } else if (now > pl.at + pl.dur + PLC.GRACE) { pollWindowClose(g); changed = true; } }
  if (changed) { save(); if (typeof window !== 'undefined') window.scrollTo(0, 0); render(); }
}

/* ---------- host: screens ---------- */
function hsHandsHTML(g, step, shot, mine) {
  const u = U(); const onl = onlState(g); const members = handsMembers(g, step) || []; const shots = onl.shots[shot.key] || {}; const now = srvNow();
  const lead = now < shot.at, over = now >= shot.at + HS.N * HS.STEP; const cur = lead ? 0 : Math.min(HS.N, Math.floor((now - shot.at) / HS.STEP) + 1);
  const hands = members.map(m => { const n = shots[seatTg(g, m.seat)]; const fired = n !== undefined; return `<div class="hs-hand ${fired ? 'fired' : ''}"><div class="lb"><b>${m.seat}</b> · ${esc(m.name)}</div>${handSVG(lead && !fired ? HAND_FIST : HAND_GUN, 0, { size: 60 })}<div class="at">${fired ? tt(u.hsShotAt, { n }) : u.hsOnTable}</div></div>`; }).join('');
  const res = shot.result ? `<div class="hs-res ${shot.result.hit ? 'hit' : 'miss'}">${shot.result.hit ? tt(u.hsHit, { n: shot.result.seat }) : shot.result.none ? u.hsMissNone : shot.result.dead ? u.hsMissDead : u.hsMiss}</div>` : '';
  return `<div class="panel hs"><div class="eyebrow gold">${u.hsAuto}</div><div class="hs-num ${lead ? 'lead' : over ? 'over' : ''}" id="hs-num" data-at="${shot.at}">${lead ? u.hsWake : over ? u.hsOver : cur}</div><div class="hs-hands">${hands}</div>${res}${mine ? '' : `<div class="hint" style="margin-top:8px">${u.hsHostHint}</div>`}</div>`;
}
function plHostHTML(g) {
  const u = U(); const onl = onlState(g); const b = g.ballot; const pl = onl.poll; const active = pollActive(g); const o = voteOutcome(g);
  const cands = active ? pl.cands : (b.candidates || []);
  const row = cands.length ? `<div class="pl-cands">${cands.map((id, i) => `<span class="${active && i === pl.idx ? 'cur' : active && i < pl.idx ? 'done' : ''}">${P(g, id).seat}</span>`).join('')}</div>` : '';
  if (active) { const cand = P(g, pl.cands[pl.idx]); const now = srvNow(); const left = pl.last ? 0 : Math.max(0, pl.at + pl.dur - now); return `<div class="panel raised"><div class="eyebrow gold">${u.plRunning}</div>${row}<div class="pl-for">${pl.last ? tt(u.plLast, { seat: cand.seat }) : tt(u.plFor, { seat: cand.seat })}</div><div class="pl-bar ${left ? '' : 'over'}" id="pl-bar" data-at="${pl.at}" data-dur="${pl.dur}" data-last="${pl.last ? 1 : 0}"><i style="width:${pl.last ? 100 : Math.round(100 * (1 - left / pl.dur))}%"></i></div><div class="hint" style="margin-top:6px">${tt(u.plOf, { k: pl.idx + 1, n: pl.cands.length })}</div><div class="btn-row" style="margin-top:8px"><button class="btn ghost sm" data-a="poll-stop">${u.plStop}</button></div></div>`; }
  if (onl.pollManual) return `<div class="panel"><div class="hint">${u.plManualHint}</div><div class="btn-row" style="margin-top:8px"><button class="btn primary sm" data-a="poll-start" ${o.kind === 'skip1' || o.kind === 'empty' ? 'disabled' : ''}>${u.plStart}</button></div></div>`;
  return `<div class="panel raised"><div class="eyebrow gold">${u.plTitle}</div>${row}<div class="hint" style="margin-top:6px">${tt(u.plHostHint, { s: Math.round(PLC.DUR / 1000) })}</div><div class="btn-row" style="margin-top:8px"><button class="btn ghost sm" data-a="poll-stop">${u.plStop}</button><button class="btn primary grow" data-a="poll-start" ${o.kind === 'skip1' || o.kind === 'empty' ? 'disabled' : ''}>${u.plStart}</button></div></div>`;
}
function hostLiveTick() { // the host's own screen: the count and the vote bar move without a full render
  const g = S.game; if (!classicOnline(g) || S.screen !== 'game') return; const u = U(); const now = srvNow();
  const el = document.querySelector('#hs-num'); if (el && !el.dataset.done) { const at = Number(el.dataset.at); const lead = now < at, over = now >= at + HS.N * HS.STEP; const cur = Math.min(HS.N, Math.floor((now - at) / HS.STEP) + 1); const txt = lead ? u.hsWake : over ? u.hsOver : String(cur); if (el.textContent !== txt) { el.textContent = txt; el.className = `hs-num ${lead ? 'lead' : over ? 'over' : ''}`; if (!lead && !over && cur === 1) render(); } }
  const bar = document.querySelector('#pl-bar'); if (bar && bar.dataset.last !== '1') { const at = Number(bar.dataset.at), dur = Number(bar.dataset.dur); const w = Math.max(0, Math.min(100, Math.round(100 * (now - at) / dur))); bar.firstElementChild.style.width = w + '%'; bar.classList.toggle('over', now >= at + dur); }
}

/* ---------- player: screens ---------- */
function tbPeerRows(key) { const d = TB.data; if (!d || !Array.isArray(d.peers)) return []; const seats = (d.pub && d.pub.seats) || []; return d.peers.filter(r => r.key === key).map(r => { const s = seats.find(x => x.tgId === r.tgId); return { tgId: r.tgId, seat: s ? s.seat : null, payload: r.payload || {}, at: r.at }; }); }
function tbDealHTML(ask, me) {
  const u = U(); const mine = ask.kind === 'deal';
  let seq; if (mine) { if (TB.dlKey !== ask.key) { TB.dlKey = ask.key; TB.dl = null; } seq = TB.dl || ask.seq || []; }
  else { const donSeat = ((me.mates || []).find(m => m.roleId === 'don') || {}).seat; const don = tbPeerRows((me.peerKeys || [])[0] || '').filter(r => r.seat === donSeat && Array.isArray(r.payload.seq)).sort((a, b) => b.at - a.at)[0]; seq = don ? dlClean(don.payload.seq) : dlClean(me.deal); }
  const k = 'dl:' + (mine ? ask.key : 'w'); const grew = (TB.seen[k] || 0) < seq.length; TB.seen[k] = seq.length;
  const show = `<div class="panel raised"><div class="eyebrow gold" style="text-align:center">${mine ? u.dlTitle : u.dlWatch}</div>${dlSeqHTML(seq, !mine, grew)}${mine ? `<div class="btn-row"><button class="btn ghost sm" data-a="dl-undo" ${seq.length ? '' : 'disabled'}>${u.dlUndo}</button><button class="btn ghost sm" data-a="dl-clear" ${seq.length ? '' : 'disabled'}>${u.dlClear}</button></div><div class="hint" style="margin-top:6px">${u.dlHint}</div>` : ''}</div>`;
  return mine ? `${show}<div class="panel">${dlPaletteHTML()}</div>` : show;
}
function tbHandsHTML(ask, me, pub) {
  const u = U(); const now = tbNow(); const at = ask.at; const lead = now < at, over = now >= at + ask.n * ask.step; const cur = Math.min(ask.n, Math.max(1, Math.floor((now - at) / ask.step) + 1));
  const mineSent = TB.sent[ask.key]; const myN = mineSent ? mineSent.n : (ask.picked ? ask.picked[0] : undefined); const myAt = mineSent ? mineSent.at : 0;
  const mateSeats = (me.mates || []).map(m => m.seat); const peers = tbPeerRows(ask.key).filter(r => mateSeats.includes(r.seat)); const seats = pub.seats || [];
  const row = s => { const seat = seats.find(x => x.seat === s.seat) || s; const isMe = s.seat === me.seat; let n, firedAt = 0;
    if (isMe) { n = myN; firedAt = myAt; } else { const pr = peers.find(r => r.seat === s.seat); const hn = (me.hands || []).find(h => h.seat === s.seat); n = pr ? Number(pr.payload.n) : hn ? hn.n : undefined; if (n !== undefined) { const k = ask.key + ':' + s.seat; if (!TB.seen[k]) TB.seen[k] = Date.now(); firedAt = TB.seen[k]; } }
    const fired = n !== undefined; const anim = fired && Date.now() - firedAt < HS.ANIM;
    return `<div class="hs-hand ${isMe ? 'me' : ''} ${fired ? 'fired' : ''}"><div class="lb"><b>${s.seat}</b> · ${esc(isMe ? u.tbYou : seat.name || '')}</div>${handSVG(lead && !fired ? HAND_FIST : HAND_GUN, 0, { size: 64, fire: anim })}<div class="at">${fired ? tt(u.hsShotAt, { n }) : u.hsOnTable}</div></div>`; };
  const members = [{ seat: me.seat, name: '' }].concat(me.mates || []).sort((a, b) => a.seat - b.seat);
  const res = me.shotResult ? `<div class="hs-res ${me.shotResult.hit ? 'hit' : 'miss'}">${me.shotResult.hit ? tt(u.hsHit, { n: me.shotResult.seat }) : me.shotResult.none ? u.hsMissNone : me.shotResult.dead ? u.hsMissDead : u.hsMiss}</div>` : '';
  const canFire = !lead && !over && myN === undefined && ask.kind === 'hands';
  return `<div class="panel raised hs"><div class="eyebrow gold">${u.hsTitle}</div><div class="hs-num ${lead ? 'lead' : over ? 'over' : ''}" id="hs-num" data-key="${esc(ask.key)}" data-at="${at}" data-n="${ask.n}" data-step="${ask.step}">${lead ? u.hsWake : over ? u.hsOver : cur}</div><div class="hs-hands">${members.map(row).join('')}</div>${res}${ask.kind === 'hands' && myN === undefined && !me.shotResult ? `<button class="btn danger hs-fire" data-a="hs-fire" ${canFire ? '' : 'disabled'}>${u.hsFire}</button>` : ''}</div>`;
}
function tbCountHTML(shot) { const u = U(); const now = tbNow(); const lead = now < shot.at, over = now >= shot.at + shot.n * shot.step; const cur = Math.min(shot.n, Math.max(1, Math.floor((now - shot.at) / shot.step) + 1)); return `<div class="panel hs"><div class="eyebrow">${u.hsCount}</div><div class="hs-num ${lead ? 'lead' : over ? 'over' : ''}" id="hs-num" data-at="${shot.at}" data-n="${shot.n}" data-step="${shot.step}">${lead ? u.hsWake : over ? u.hsOver : cur}</div></div>`; }
function tbPollHTML(ask, me, pub) {
  const u = U(); const pl = pub.poll; const now = tbNow(); const mine = ask.kind === 'poll'; const over = pl.last || now >= pl.at + pl.dur; const w = pl.last ? 100 : Math.max(0, Math.min(100, Math.round(100 * (now - pl.at) / pl.dur)));
  const sent = TB.sent[ask.key]; const yes = sent ? !!sent.yes : ask.yes; const answered = mine && (!!sent || ask.done);
  const row = `<div class="pl-cands">${(pl.cands || []).map((s, i) => `<span class="${i === pl.idx ? 'cur' : i < pl.idx ? 'done' : ''}">${s}</span>`).join('')}</div>`;
  const myVote = (pub.dayInfo && pub.dayInfo.votes && pub.dayInfo.votes[me.seat]) || null;
  const line = mine ? (over ? u.plOver : answered ? u.plSent : '') : myVote ? tt(u.plVoted, { seat: myVote }) : pl.cand === me.seat ? '' : u.plCant;
  const btns = mine ? `<div class="pl-btns"><button class="btn ${answered && yes ? 'danger sel' : 'ghost'}" data-a="pl-ans" data-yes="1" ${over ? 'disabled' : ''}>${u.plYes}${answered && yes ? ' ✓' : ''}</button><button class="btn ${answered && !yes ? 'primary sel' : 'ghost'}" data-a="pl-ans" data-yes="0" ${over ? 'disabled' : ''}>${u.plNo}${answered && !yes ? ' ✓' : ''}</button></div>` : '';
  return `<div class="panel raised"><div class="eyebrow gold" style="text-align:center">${u.plTitle} · ${tt(u.plOf, { k: pl.idx + 1, n: pl.n })}</div>${row}<div class="pl-for">${pl.last ? tt(u.plLast, { seat: pl.cand }) : tt(u.plFor, { seat: pl.cand })}</div><div class="pl-bar ${over ? 'over' : ''}" id="pl-bar" data-at="${pl.at}" data-dur="${pl.dur}" data-last="${pl.last ? 1 : 0}"><i style="width:${w}%"></i></div>${btns}${line ? `<div class="hint" style="margin-top:8px;text-align:center">${line}</div>` : ''}</div>`;
}
/* what my screen needs beyond the host's prompt: the family watching the Don, the count for everyone, the vote for those who only watch it */
function tbSynthAsk(d) {
  const pub = d.pub || {}; const me = d.me; if (!me || me.alive === false || pub.mode !== 'classic') return null;
  if (pub.phase === 'night0' && me.deal !== undefined && !(me.ask && me.ask.kind === 'deal')) return { key: 'night0:deal:w', kind: 'dealWatch', done: true };
  if (pub.phase === 'night' && pub.shot && !(me.ask && me.ask.kind === 'hands')) return { key: pub.shot.key + ':w', kind: me.mates !== undefined && (me.hands || me.shotResult || (me.peerKeys || []).includes(pub.shot.key)) ? 'handsWatch' : 'count', at: pub.shot.at, n: pub.shot.n, step: pub.shot.step, done: true };
  if (pub.phase === 'day' && pub.poll && !pub.poll.done && !(me.ask && me.ask.kind === 'poll')) return { key: pub.poll.key + ':w', kind: 'pollWatch', done: true };
  return null;
}
function tbLiveTick() { // every 100 ms on the table screen: the count and the vote bar move; a full render at the turning points
  const d = TB.data; if (S.screen !== 'table' || !d || !d.pub) return; const u = U(); const now = tbNow(); let stage = '';
  const el = document.querySelector('#hs-num'); if (el) { const at = Number(el.dataset.at), n = Number(el.dataset.n), step = Number(el.dataset.step); const lead = now < at, over = now >= at + n * step; const cur = Math.min(n, Math.max(1, Math.floor((now - at) / step) + 1)); stage = 'hs:' + (lead ? 'lead' : over ? 'over' : 'count'); const txt = lead ? u.hsWake : over ? u.hsOver : String(cur); if (el.textContent !== txt) { el.textContent = txt; el.className = `hs-num ${lead ? 'lead' : over ? 'over' : ''}`; } TB.hsCur = { key: el.dataset.key || '', n: cur, lead, over }; }
  const bar = document.querySelector('#pl-bar'); if (bar) { const at = Number(bar.dataset.at), dur = Number(bar.dataset.dur); const over = bar.dataset.last === '1' || now >= at + dur; stage += '|pl:' + (over ? 'over' : now < at ? 'wait' : 'open'); if (bar.dataset.last !== '1') { bar.firstElementChild.style.width = Math.max(0, Math.min(100, Math.round(100 * (now - at) / dur))) + '%'; bar.classList.toggle('over', over); } }
  if (stage !== (TB.liveStage || '')) { const prev = TB.liveStage || ''; TB.liveStage = stage; if (prev) keepFocus(render); }
}

/* ---------- wiring into the host's and the player's screens ---------- */
(function () {
  if (typeof buildAsks !== 'function') return;
  // every API answer carries the server clock: both sides keep their clock skew (half the round trip is taken off)
  const origApi = api; api = async function (path, body, opts) { const t0 = Date.now(); const d = await origApi(path, body, opts); if (d && d.ok && typeof d.now === 'number') { const t1 = Date.now(); const sk = d.now - (t0 + (t1 - t0) / 2); ONL.skew = sk; TB.skew = sk; } return d; };
  const origAsks = buildAsks; buildAsks = function (g) { const asks = origAsks(g); if (classicOnline(g) && g.dealt && !g.winner) { try { classicAsks(g, asks); } catch (e) {} } return asks; };
  const origApply = applyTableAction; applyTableAction = function (a) { const g = S.game; if (classicOnline(g) && g.dealt && !g.winner) { const r = classicApply(g, a); if (r !== undefined) return r; } return origApply(a); };
  const origPollActions = pollActions; pollActions = async function () { await origPollActions(); try { classicTick(S.game); } catch (e) {} };
  // the published state: the count and the vote window for everyone; the Don's signs, the hands and the outcome for the family only
  const origPub = tablePub; tablePub = function (g) { const pub = origPub(g); if (!classicOnline(g) || !g.dealt || g.winner) return pub; const onl = onlState(g);
    if (g.phase === 'night') { const step = famStep(g); if (step && handsMembers(g, step) && !g.actions.find(a => a.stepId === step.id)) { const shot = ensureShot(g, step); pub.shot = { key: shot.key, at: shot.at, n: HS.N, step: HS.STEP }; } else if (step && onl.shot && onl.shot.stepId === step.id && onl.shot.result) pub.shot = { key: onl.shot.key, at: onl.shot.at, n: HS.N, step: HS.STEP, over: true }; }
    if (pollActive(g)) { const pl = onl.poll; pub.poll = { key: pl.key, idx: pl.idx, n: pl.cands.length, cand: P(g, pl.cands[pl.idx]).seat, cands: pl.cands.map(id => P(g, id).seat), at: pl.at, dur: pl.dur, last: pl.last, done: false }; if (pub.dayInfo) pub.dayInfo.poll = true; }
    return pub; };
  const origPriv = tablePriv; tablePriv = function (g) { const priv = origPriv(g); if (!classicOnline(g) || !g.dealt || g.winner) return priv; const onl = onlState(g);
    const st = dealStep(g); const step = g.phase === 'night' ? famStep(g) : null; const shot = step && onl.shot && onl.shot.stepId === step.id ? onl.shot : null;
    g.players.forEach(p => { const id = seatTg(g, p.seat); const me = id && priv[id]; if (!me || !p.alive || !isBlack(p)) return;
      if (st) { me.deal = dlClean(onl.deal); me.peerKeys = [dealKey(g)]; }
      if (shot) { me.peerKeys = [shot.key]; const shots = onl.shots[shot.key] || {}; me.hands = Object.entries(shots).map(([tg, n]) => ({ seat: Number(g.tg.map[tg]) || 0, n })).filter(h => h.seat); if (shot.result) me.shotResult = shot.result; } });
    return priv; };
  // the host's night screen: the Don's signs during the family meeting, the family's hands on the shot
  const origNight = nightBody; nightBody = function (g) { let html = origNight(g); if (!classicOnline(g)) return html; const u = U(); const onl = onlState(g); const i = html.lastIndexOf('<div class="btn-row">'); if (i < 0) return html; let extra = '';
    if (dealStep(g)) extra = `<div class="panel"><div class="eyebrow gold">${u.dlTitle}</div>${dlSeqHTML(onl.deal, false)}</div>${timerHTML(60, `deal-${g.night}`)}`;
    const step = famStep(g); if (step && handsMembers(g, step)) { const byHost = g.actions.find(a => a.stepId === step.id) && !(onl.shot && onl.shot.stepId === step.id); if (!byHost) extra = hsHandsHTML(g, step, ensureShot(g, step), false); }
    return extra ? html.slice(0, i) + extra + html.slice(i) : html; };
  const origStrip = onlineStripHTML; onlineStripHTML = function (g) { const h = origStrip(g); if (!h || !classicOnline(g) || g.phase !== 'night') return h; const step = famStep(g); const members = step && handsMembers(g, step); if (!members) return h; const u = U(); const shots = (onlState(g).shots || {})[`${phaseTag(g)}:hands:${step.id}`] || {}; return h.replace(' · ' + u.onNoProposals, ' · ' + tt(u.hsStrip, { list: members.map(m => { const n = shots[seatTg(g, m.seat)]; return `${m.seat} → ${n === undefined ? '—' : n}`; }).join(', ') })); };
  const origVote = voteBody; voteBody = function (g) { const html = origVote(g); if (!classicOnline(g) || g.dayStage !== 'vote') return html; const i = html.indexOf('<div class="panel"><div class="eyebrow">'); const extra = plHostHTML(g); return i < 0 ? html + extra : html.slice(0, i) + extra + html.slice(i); };
  const origNext = ACT.next; ACT.next = function (el) { const g = S.game; if (classicOnline(g) && dealStep(g)) { const seq = dlClean(onlState(g).deal); if (seq.length) addLog(g, tt(L.e.logDeal, { list: seq.map(dlLabel).join(' · ') }), true); } return origNext.call(this, el); };
  const origStage = ACT.stage; ACT.stage = function (el) { const r = origStage.call(this, el); const g = S.game; if (classicOnline(g) && g.dayStage === 'vote') { const onl = onlState(g); onl.poll = null; onl.pollManual = false; render(); } return r; };
  const origSpeech = ACT.speech; ACT.speech = function (el) { const g = S.game; const before = g && g.dayStage; const r = origSpeech.call(this, el); if (classicOnline(g) && before !== 'vote' && g.dayStage === 'vote') { const onl = onlState(g); onl.poll = null; onl.pollManual = false; render(); } return r; };
  const origRevote = ACT.revote; ACT.revote = function (el) { const r = origRevote.call(this, el); const g = S.game; if (classicOnline(g) && g.dayStage === 'vote') { startPoll(g); save(); render(); } return r; };
  Object.assign(ACT, {
    'poll-start'() { const g = S.game; if (!classicOnline(g) || g.dayStage !== 'vote') return; if (startPoll(g)) { save(); render(); } },
    'poll-stop'() { const g = S.game; if (!classicOnline(g)) return; const onl = onlState(g); onl.poll = null; onl.pollManual = true; save(); render(); },
    // the Don's palette
    'dl-add'(el) { const ask = TB.data && TB.data.me && TB.data.me.ask; if (!ask || ask.kind !== 'deal') return; const seq = (TB.dl || ask.seq || []).slice(); if (seq.length >= 40) return; seq.push(el.dataset.id); TB.dl = seq; tgHaptic('light'); render(); dlSend(ask.key); },
    'dl-undo'() { const ask = TB.data && TB.data.me && TB.data.me.ask; if (!ask || ask.kind !== 'deal') return; const seq = (TB.dl || ask.seq || []).slice(); seq.pop(); TB.dl = seq; render(); dlSend(ask.key); },
    'dl-clear'() { const ask = TB.data && TB.data.me && TB.data.me.ask; if (!ask || ask.kind !== 'deal') return; TB.dl = []; render(); dlSend(ask.key); },
    // the shot: the number on my screen at the moment of the tap
    async 'hs-fire'() { const ask = TB.data && TB.data.me && TB.data.me.ask; if (!ask || ask.kind !== 'hands' || TB.sent[ask.key]) return; const now = tbNow(); const seen = TB.hsCur && TB.hsCur.key === ask.key ? TB.hsCur : null; if (seen ? (seen.lead || seen.over) : (now < ask.at || now >= ask.at + ask.n * ask.step)) return; const n = seen ? seen.n : Math.min(ask.n, Math.max(1, Math.floor((now - ask.at) / ask.step) + 1)); /* the number the player saw on the screen at the tap */ TB.sent[ask.key] = { n, at: Date.now() }; tgHaptic('impact'); render(); const d = await api('/api/table/act', { code: TB.code, key: ask.key, payload: { n } }); if (!d.ok) { delete TB.sent[ask.key]; toast(U().tgOffline); render(); return; } setTimeout(tableFetch, 400); },
    // the vote: yes / no inside the window, may be changed until it closes
    async 'pl-ans'(el) { const ask = TB.data && TB.data.me && TB.data.me.ask; if (!ask || ask.kind !== 'poll') return; const yes = el.dataset.yes === '1'; const prev = TB.sent[ask.key]; TB.sent[ask.key] = { yes }; tgHaptic('light'); render(); const d = await api('/api/table/act', { code: TB.code, key: ask.key, payload: { yes } }); if (!d.ok) { if (prev) TB.sent[ask.key] = prev; else delete TB.sent[ask.key]; toast(U().tgOffline); render(); } }
  });
  let dlTimer = null; function dlSend(key) { clearTimeout(dlTimer); dlTimer = setTimeout(async () => { const seq = TB.dl || []; const d = await api('/api/table/act', { code: TB.code, key, payload: { seq } }); if (!d.ok) toast(U().tgOffline); }, 250); }
  // the player's prompt panel
  const origAsk = tbAskHTML; tbAskHTML = function (ask, seats) { const d = TB.data; const me = d && d.me; const pub = d && d.pub; if (!ask || !me || !pub) return origAsk(ask, seats);
    if (ask.kind === 'deal' || ask.kind === 'dealWatch') return tbDealHTML(ask, me);
    if (ask.kind === 'hands' || ask.kind === 'handsWatch') return tbHandsHTML(ask, me, pub);
    if (ask.kind === 'count') return tbCountHTML(pub.shot);
    if ((ask.kind === 'poll' || ask.kind === 'pollWatch') && pub.poll) return tbPollHTML(ask, me, pub);
    return origAsk(ask, seats); };
  const origTable = tableScreen; tableScreen = function () { const d = TB.data; if (d && d.me && d.pub && !d.me.ask) { const s = tbSynthAsk(d); if (s) { d.me.ask = s; d.me.synth = true; } } else if (d && d.me && d.me.synth && d.me.ask && !tbSynthAsk(d)) { d.me.ask = null; d.me.synth = false; } return origTable(); };
  const origTablePoll = tablePoll; tablePoll = function () { origTablePoll(); const want = S.screen === 'table' && TB.code && TG.app && apiBase(); if (want && !TB.live) TB.live = setInterval(() => { try { tbLiveTick(); } catch (e) {} }, 100); if (!want && TB.live) { clearInterval(TB.live); TB.live = null; TB.liveStage = ''; } };
  const origActionsPoll = actionsPoll; actionsPoll = function () { origActionsPoll(); const g = S.game; const want = TG.app && apiBase() && classicOnline(g) && g.dealt && !g.winner && S.screen === 'game'; if (want && !ONL.live) ONL.live = setInterval(() => { try { hostLiveTick(); } catch (e) {} }, 200); if (!want && ONL.live) { clearInterval(ONL.live); ONL.live = null; } };
})();
