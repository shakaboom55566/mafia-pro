/* ============================================================
   v66 THE HOST SEES THE TABLE AND THE CHAT
   The round table the players look at — on the host's game screen too: who speaks, who is nominated, the votes,
   fouls, the dead, whom the app still waits for. Under the controls of an online game — the table chat, read with
   the same poll as the players' answers (/api/table/actions + chatSince); the host writes at any moment.
   Both panels fold with a tap on their header; the choice is kept in the settings.
   ============================================================ */
const HC = { code: null, chat: [], last: 0, msg: '', unread: 0 };
const hvOn = key => S.settings[key] !== false; // hvTable / hvChat: open unless the host folded them
function hvHeaderHTML(key, title, right) {
  const u = U(); const open = hvOn(key);
  return `<div class="row hv-head" role="button" data-a="hv-toggle" data-id="${key}" aria-label="${open ? u.hvFold : u.hvUnfold}" title="${open ? u.hvFold : u.hvUnfold}"><div class="eyebrow grow" style="margin:0">${title}</div>${right || ''}<span class="hv-chev ${open ? 'open' : ''}">${I.chev}</span></div>`;
}
/* the host's round table: the seats as the players see them, with the marks of the current moment */
function hostGameTableHTML(g) {
  if (!g || !g.dealt || g.winner) return '';
  const u = U(); const open = hvOn('hvTable'); const al = alive(g);
  const head = hvHeaderHTML('hvTable', u.hvTable, `<span class="hint hv-sub">${tt(u.tbAtTable, { n: al.length })}</span>`);
  if (!open) return `<div class="panel hv-panel folded">${head}</div>`;
  const l = g.tg && g.tg.code ? g.tg : null; const profiles = {};
  if (l) (l.players || []).forEach(pl => { profiles[pl.tgId] = { tgId: pl.tgId, name: pl.name, username: pl.username, photo: pl.photo || '', points: pl.points, games: pl.games, hosted: pl.hosted, city: pl.city || '', club: pl.club || '', online: !!pl.online }; });
  const seats = g.players.map(p => ({ seat: p.seat, name: p.name, tgId: l ? seatTg(g, p.seat) : null, alive: p.alive, fouls: p.fouls || 0 }));
  const marks = {}; const mk = (seat, m) => { if (seat) marks[seat] = Object.assign(marks[seat] || {}, m); };
  const seatOf = id => { const p = id ? P(g, id) : null; return p ? p.seat : 0; };
  let phaseLbl = '', stage = '';
  if (g.phase === 'night0' || g.phase === 'night') {
    phaseLbl = g.phase === 'night0' ? u.tbNight0 : tt(u.tbNight, { n: g.night });
    const step = g.steps[g.stepIdx];
    if (step) { const r = ROLE[step.roleId]; stage = step.title || (r ? r.name : ''); mk(seatOf(step.actorId), { speaker: true }); (step.members || []).forEach(m => mk(m.seat, { speaker: true })); } else stage = g.phase === 'night0' ? u.allMet : u.allActed;
  } else if (g.phase === 'day0') {
    phaseLbl = u.tbDay0; const p = al[g.speechIdx]; if (p) { mk(p.seat, { speaker: true }); stage = tt(u.introOf, { i: g.speechIdx + 1, n: al.length }); } else stage = u.allIntroduced;
  } else if (g.phase === 'day') {
    phaseLbl = tt(u.tbDay, { n: g.day }); const b = g.ballot || {}; const st = g.dayStage;
    stage = { morning: u.tbMorning, balagan: u.tbBalagan, speeches: u.tbSpeeches, vote: b.round === 2 ? u.tbRevote : u.tbVoteStage, tie: u.stTie, roulette: u.stRoulette, lift: u.stLift, result: u.tbResult }[st] || '';
    if (st === 'speeches') { const p = speakOrder(g)[g.speechIdx]; if (p) mk(p.seat, { speaker: true }); }
    if (st === 'tie') mk(seatOf((b.tiedIds || [])[g.speechIdx]), { speaker: true });
    if (['speeches', 'vote', 'tie', 'roulette', 'lift', 'result'].includes(st)) (b.candidates || []).forEach(id => mk(seatOf(id), { cand: true }));
    if (st === 'vote') Object.entries(b.votes || {}).forEach(([v, c]) => mk(seatOf(v), { vote: seatOf(c) }));
    const lw = lastWordsNow(g); if (lw) mk(lw.p.seat, { speaker: true });
  }
  if (onlineActive(g)) { try { Object.entries(buildAsks(g)).forEach(([id, a]) => { if (!a.done && !a.blocked) mk(Number(g.tg.map[id]) || 0, { wait: true }); }); } catch (e) {} }
  const center = `<div class="rt-phase">${phaseLbl}</div>${stage ? `<div class="rt-stage">${stage}</div>` : ''}<div class="rt-n">${tt(u.tbAtTable, { n: al.length })}</div>`;
  const table = roundTableHTML(seats, profiles, center, marks).replace(/class="rtable (lg|md)"/, (m, sz) => `class="rtable ${sz === 'lg' ? 'md' : 'sm'}"`); // one size smaller than the players' — the controls stay close
  return `<div class="panel hv-panel" id="hv-table">${head}${table}<div class="hint hv-legend">${u.hvLegend}</div></div>`;
}
/* who may write right now — the same rule the players see */
function hvChatRule(g) {
  let pub = null; try { pub = tablePub(g); } catch (e) { pub = null; }
  const u = U(); if (!pub) return u.hvClosed;
  if (pub.chat === 'last' && pub.lastSeat) return tt(u.hvLast, { seat: pub.lastSeat });
  if (pub.chat === 'all' || pub.chat === true) return u.hvAll;
  if (pub.chat === 'speaker' && pub.chatSeat) return tt(u.hvSpeaker, { seat: pub.chatSeat });
  return u.hvClosed;
}
function hostChatHTML(g) {
  if (!onlineActive(g) || !g.dealt || g.winner) return '';
  const u = U(); const open = hvOn('hvChat');
  const badge = !open && HC.unread ? `<span class="hv-badge">${tt(u.hvNew, { n: HC.unread })}</span>` : '';
  const head = hvHeaderHTML('hvChat', u.tbChat, badge);
  if (!open) return `<div class="panel hv-panel folded">${head}</div>`;
  HC.unread = 0;
  const fmtT = ms => { try { return new Date(ms).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const msgs = HC.chat.length ? HC.chat.map(m => `<div class="msg ${m.me ? 'me' : ''}">${m.me ? '' : `<div class="who">${esc(m.name)}</div>`}${esc(m.text)}<div class="when">${fmtT(m.at)}</div></div>`).join('') : `<div class="msg sys">${u.tbChatEmpty}</div>`;
  return `<div class="panel hv-panel" id="hc-panel">${head}<div class="hint hv-sub" style="margin:4px 0 0">${hvChatRule(g)} · ${u.hvYou}</div><div class="chat" id="hc-chat" style="max-height:220px">${msgs}</div>
    <div class="row" style="margin-top:8px"><input class="input grow" id="hc-msg" data-a="hc-msg" placeholder="${u.hvChatPh}" value="${esc(HC.msg)}" autocomplete="off" maxlength="300"><button class="btn sm primary" data-a="hc-send" style="flex:0 0 auto">${u.tbSend}</button></div></div>`;
}
function hcScroll() { try { const c = document.querySelector('#hc-chat'); if (c) c.scrollTop = c.scrollHeight; } catch (e) {} }
/* new lines from the players: counted while the chat is folded or the host looks elsewhere, and shown as a toast */
function hcArrived(fresh) {
  const others = fresh.filter(m => !m.me); if (!others.length) return;
  if (hvOn('hvChat') && S.screen === 'game') return;
  HC.unread += others.length; const m = others[others.length - 1]; try { toast(`💬 ${m.name}: ${m.text.slice(0, 80)}`); } catch (e) {}
}
Object.assign(ACT, {
  'hv-toggle'(el) { const key = el.dataset.id === 'hvChat' ? 'hvChat' : 'hvTable'; S.settings[key] = !hvOn(key); save(); tgHaptic('light'); render(); },
  'hc-msg'(el) { HC.msg = el.value || ''; },
  async 'hc-send'() {
    const g = S.game; if (!onlineActive(g)) return; const text = HC.msg.trim(); if (!text) return;
    HC.msg = ''; const inp = document.querySelector('#hc-msg'); if (inp) inp.value = '';
    const d = await api('/api/table/chat/send', { code: g.tg.code, text });
    if (!d.ok) { toast(U().tgOffline); HC.msg = text; const i2 = document.querySelector('#hc-msg'); if (i2) i2.value = text; return; }
    tgHaptic('light'); pollActions();
  }
});
/* the host's poll (09-online.js pollActions) asks for the chat since the last line he has and takes the new lines */
function hostPollExtra(g) { if (HC.code !== g.tg.code) { HC.code = g.tg.code; HC.chat = []; HC.last = 0; HC.msg = ''; HC.unread = 0; } return { chatSince: HC.last }; }
function hostPollTake(d, g) {
  if (!d || !Array.isArray(d.chat) || HC.code !== g.tg.code) return false;
  const first = !HC.last; const fresh = d.chat.filter(m => m && m.id > HC.last); if (!fresh.length) return false;
  HC.chat = HC.chat.concat(fresh).slice(-300); HC.last = HC.chat[HC.chat.length - 1].id; if (!first) hcArrived(fresh); // the history of the chat is not «new»
  return true;
}
(function () {
  // the game screen: the table under the online strip, the chat at the very bottom
  const origGame = gameScreen;
  gameScreen = function () {
    let html = origGame(); const g = S.game; if (!g) return html;
    let table = '', chat = ''; try { table = hostGameTableHTML(g); chat = hostChatHTML(g); } catch (e) { table = ''; chat = ''; }
    if (table) { const st = html.indexOf('<div class="stack">'); if (st >= 0) { const strip = html.indexOf('<div class="onl-strip">', st); const at = strip === st + 19 ? html.indexOf('</div>', strip) + 6 : st + 19; html = html.slice(0, at) + table + html.slice(at); } }
    if (chat) { const k = html.lastIndexOf('</div>'); if (k >= 0) html = html.slice(0, k) + chat + html.slice(k); }
    return html;
  };
  // a re-render while the host types keeps his keyboard; the chat stays scrolled to the last line
  const origRender = render;
  render = function () { let a = null; try { a = document.activeElement; } catch (e) { a = null; } if (a && a.id === 'hc-msg' && typeof keepFocus === 'function') keepFocus(origRender); else origRender(); hcScroll(); };
  try {
    document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'hc-msg') { e.preventDefault(); ACT['hc-send'](); } });
    document.addEventListener('input', e => { const el = e.target && e.target.closest && e.target.closest('[data-a="hc-msg"]'); if (el) ACT['hc-msg'](el); });
  } catch (e) {}
})();
