/* ============================================================
   TELEGRAM MINI APP integration — active only when the page runs inside Telegram (window.Telegram.WebApp).
   Everything here is optional: outside Telegram the app behaves exactly as before.
   ============================================================ */
const TG = { app: null, ready: false };
/* ?startapp=… — from Telegram (initDataUnsafe.start_param) or from the page URL (menu button / plain browser link) */
function applyStartParam(sp) {
  if (!sp || S.game) return;
  if (sp === 'classic') { S.ui.tgStart = { a: 'scen-use', id: 'classic' }; }
  else if (sp === 'shop') S.screen = 'shop';
  else if (sp === 'cards') S.screen = 'cards';
  else if (sp.startsWith('card_') && ROLE[sp.slice(5)]) { S.screen = 'cards'; S.ui.sheet = { type: 'role', id: sp.slice(5) }; }
  else if (sp.startsWith('scen_') && SCENARIO[sp.slice(5)]) { S.ui.tgStart = { a: 'scen-use', id: sp.slice(5) }; }
  else if (/^friend_[A-Za-z0-9]{6,10}$/.test(sp)) { S.ui.tgStart = { a: 'fr-accept', id: sp.slice(7).toUpperCase() }; }
  else if (/^ref_[A-Za-z0-9]{6,10}$/.test(sp)) { S.ui.tgStart = { a: 'ref-attach', id: sp.slice(4).toUpperCase() }; }
}
function tgInit() {
  try {
    const q = typeof location !== 'undefined' && location.search ? new URLSearchParams(location.search).get('startapp') : null;
    const tg = window.Telegram && window.Telegram.WebApp; if (!tg || tg.platform === 'unknown') { applyStartParam(q); return; }
    TG.app = tg; TG.ready = true;
    tg.ready(); tg.expand();
    try { tg.setHeaderColor('#0b0a0e'); tg.setBackgroundColor('#0b0a0e'); if (tg.setBottomBarColor) tg.setBottomBarColor('#0b0a0e'); } catch (e) {}
    // a vertical swipe closes the mini app by default — that kills the 3D card drag and the pickers
    try { if (tg.disableVerticalSwipes) tg.disableVerticalSwipes(); } catch (e) {}
    try { if (tg.lockOrientation) tg.lockOrientation(); } catch (e) {}
    // deep links: t.me/<bot>/<app>?startapp=classic | shop | cards | card_<id> | scen_<id>
    applyStartParam((tg.initDataUnsafe && tg.initDataUnsafe.start_param) || q);
    // native Back button mirrors the app's own navigation
    if (tg.BackButton) tg.BackButton.onClick(() => { if (S.ui.sheet) { S.ui.sheet = null; render(); } else ACT.back({ dataset: {} }); });
    // purchases go through Telegram Stars when the backend is configured (window.MAFIA_API); otherwise the demo purchase stays
    const origBuy = ACT['buy-confirm'];
    ACT['buy-confirm'] = function (el) { const kind = el.dataset.kind, id = el.dataset.id; if (apiBase() && tgBuy(kind, id, () => origBuy.call(this, el))) { S.ui.sheet = null; render(); return; } return origBuy.call(this, el); };
    tgSync();
    setTimeout(cloudSync, 0);
  } catch (e) {}
}
function tgSync() {
  const tg = TG.app; if (!tg) return;
  try {
    const atHome = S.screen === 'home' && !S.ui.sheet;
    if (tg.BackButton) { if (atHome) tg.BackButton.hide(); else tg.BackButton.show(); }
    // confirm before closing while a game is running (the game itself is saved locally anyway)
    if (S.game && !S.game.winner) tg.enableClosingConfirmation(); else tg.disableClosingConfirmation();
  } catch (e) {}
}
function tgHaptic(kind) {
  const tg = TG.app; if (!tg || !tg.HapticFeedback) return;
  try {
    if (kind === 'impact') tg.HapticFeedback.impactOccurred('medium');
    else if (kind === 'light') tg.HapticFeedback.impactOccurred('light');
    else if (kind === 'success') tg.HapticFeedback.notificationOccurred('success');
    else if (kind === 'warning') tg.HapticFeedback.notificationOccurred('warning');
    else tg.HapticFeedback.selectionChanged();
  } catch (e) {}
}
/* ============================================================
   CLOUD — the bot backend (backend/ in the repo, deployed to Cloudflare). Address comes from window.MAFIA_API or
   <meta name="mafia-api"> injected at build time; without it everything below stays off and the app works locally.
   ============================================================ */
const CLOUD = { me: null, top: null, busy: false };
function apiBase() {
  if (window.MAFIA_API) return String(window.MAFIA_API).replace(/\/$/, '');
  try { const m = document.querySelector && document.querySelector('meta[name="mafia-api"]'); const c = m && m.content; return c && /^https?:\/\//.test(c) ? c.replace(/\/$/, '') : null; } catch (e) { return null; }
}
async function api(path, body, opts = {}) {
  const base = apiBase(); if (!base) return { ok: false, error: 'no_api' };
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null; const timer = ctl && setTimeout(() => ctl.abort(), opts.timeout || 12000);
  try {
    const init = { method: opts.method || 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined };
    if (init.method === 'POST') init.body = JSON.stringify(Object.assign({ initData: TG.app ? TG.app.initData : '' }, body || {}));
    const r = await fetch(base + path, init); const d = await r.json().catch(() => null);
    return d || { ok: false, error: 'bad_response', status: r.status };
  } catch (e) { return { ok: false, error: 'network' }; } finally { if (timer) clearTimeout(timer); }
}
/* on start: restore purchases + rating from the account, re-send a finished game that never reached the server */
async function cloudSync() {
  if (!TG.app || !apiBase() || CLOUD.busy) return; CLOUD.busy = true;
  try {
    const d = await api('/api/me', {}); if (!d.ok) return;
    CLOUD.me = d; S.cloud = { user: d.user, rating: d.rating, at: Date.now() };
    const o = d.owned || {}; let added = 0;
    S.owned = S.owned || { roles: [], scenarios: [] }; S.owned.packs = S.owned.packs || [];
    [['roles', o.roles], ['scenarios', o.scenarios], ['packs', o.packs]].forEach(([k, arr]) => (arr || []).forEach(id => { if (!S.owned[k].includes(id)) { S.owned[k].push(id); added++; } }));
    S.owned.allUntil = Number(o.allUntil) || 0; S.cloud.admin = !!d.admin; S.cloud.credits = d.credits || { role: 0, scenario: 0 }; S.cloud.ref = d.invite && d.invite.ref; S.cloud.club = d.club || null;
    startHeartbeat();
    if (added) toast(U().tgSynced);
    if (S.game && S.game.winner && S.game.recorded && !S.game.cloudSent) sendResult(S.game, S.game.winner);
    save(); render();
  } finally { CLOUD.busy = false; }
}
/* presence: a ping every minute while the app is open keeps "online" accurate for friends */
let heartbeatTimer = null;
function startHeartbeat() {
  if (heartbeatTimer || !TG.app || !apiBase()) return;
  heartbeatTimer = setInterval(() => { try { if (typeof document === 'undefined' || document.visibilityState !== 'hidden') api('/api/ping', {}); } catch (e) {} }, 60000);
}
function agoText(sec) {
  const u = U(); if (sec < 60) return u.frJustNow;
  if (sec < 3600) return tt(u.agoMin, { n: Math.floor(sec / 60) }); if (sec < 86400) return tt(u.agoHour, { n: Math.floor(sec / 3600) }); if (sec < 180 * 86400) return tt(u.agoDay, { n: Math.floor(sec / 86400) }); return u.frLongAgo;
}
const presenceHTML = f => f.online ? `<span class="fr-on">● ${esc(U().frOnline)}</span>` : (typeof f.seenAgo === 'number' ? `<span class="fr-off">${esc(tt(U().frSeen, { t: agoText(f.seenAgo) }))}</span>` : '');
/* purchases: in Telegram the demo button becomes a Stars invoice created by the backend */
function tgBuy(kind, id, onDone) {
  const tg = TG.app; if (!tg || !tg.openInvoice || !apiBase()) return false;
  const u = U(); const title = kind === 'pack' ? u.packTitle : kind === 'role' ? (ROLE[id] && ROLE[id].name) : (SCENARIO[id] && SCENARIO[id].name);
  const description = kind === 'pack' ? u.packTitle : kind === 'role' ? (ROLE[id] && ROLE[id].short) : (SCENARIO[id] && (SCENARIO[id].desc || SCENARIO[id].short || SCENARIO[id].lore));
  const apiKind = kind === 'scen' ? 'scenario' : kind; // the shop says "scen", the backend "scenario"
  api('/api/invoice', { kind: apiKind, id, title: title || id, description: description || 'Mafia Pro' }).then(d => {
    if (d.ok && d.owned) { onDone(); return; }
    if (d.ok && d.link) { tg.openInvoice(d.link, status => { if (status === 'paid') { onDone(); setTimeout(cloudSync, 1500); } else if (status === 'failed') toast(u.tgPayFail); }); return; }
    toast(d.error === 'network' || d.error === 'no_api' ? u.tgOffline : u.tgNA);
  });
  return true;
}
/* finished game → server ratings for Telegram-linked players (profiles with tgId, or seats dealt through the lobby) */
function sendResult(g, w) {
  if (!TG.app || !apiBase() || !w) return;
  const players = g.players.map(p => {
    const pr = p.profileId ? profById(p.profileId) : null;
    const tgId = (pr && pr.tgId) || (g.tg && g.tg.map && Object.keys(g.tg.map).find(k => g.tg.map[k] === p.seat)) || null;
    const { won, solo } = resultFor(g, p, w); const useful = g.useful && g.useful[p.id] ? g.useful[p.id] : 0;
    const role = ROLE[p.roleId]; const side = role ? (role.side === 'mafia' ? 'mafia' : role.side === 'city' ? 'city' : 'neutral') : 'city';
    return { seat: p.seat, name: p.name, tgId: tgId ? Number(tgId) : null, roleId: p.roleId, won, points: pointsFor(p.roleId, won, p.alive, solo) + useful, side };
  });
  api('/api/game/result', { game: { id: g.id, mode: isClassic(g) ? 'classic' : 'extended', winner: w.side, code: g.tg && g.tg.code, players } }).then(d => { if (d.ok) { g.cloudSent = true; if (d.streaks) g.streaks = d.streaks; if (d.ratings) g.cloudRatings = d.ratings; save(); if (S.game === g) render(); if (g.tg && g.tg.code && typeof publishTable === 'function') publishTable(true, g.tg, g); } });
}
/* ---------- lobby: players join from Telegram and receive their card privately ---------- */
function cardTextFor(p, lang) {
  const pack = I18N[lang] || I18N.ru; const rt = (pack.roles && pack.roles[p.roleId]) || I18N.ru.roles[p.roleId]; const r = ROLE[p.roleId];
  const team = (pack.teams && pack.teams[r.team]) || ''; const fam = p.family && pack.families ? ' · ' + pack.families[p.family] : '';
  const rules = Array.isArray(rt.rules) ? rt.rules.join('\n') : String(rt.rules || '');
  return `<b>${esc(rt.name)}</b> — ${esc(team)}${esc(fam)}\n${esc(rt.short || '')}\n\n${esc(rules)}${rt.tip ? '\n\n💡 ' + esc(rt.tip) : ''}`;
}
function lobbyAutoSeat(g) {
  const tgl = g.tg; if (!tgl) return; tgl.map = tgl.map || {};
  const taken = new Set(Object.values(tgl.map));
  tgl.players.forEach(pl => {
    if (S.cloud && S.cloud.user && pl.tgId === S.cloud.user.id) { tgl.map[pl.tgId] = 0; return; }
    if (tgl.map[pl.tgId] !== undefined) return;
    const norm = s => String(s || '').toLowerCase().replace(/^@/, '').trim();
    let seat = (g.players.find(p => !taken.has(p.seat) && norm(p.name) && (norm(p.name) === norm(pl.name) || (pl.username && norm(p.name) === norm(pl.username)))) || {}).seat;
    if (!seat) { const pr = S.profiles.find(x => x.tgId === pl.tgId); const gp = pr && g.players.find(p => p.profileId === pr.id && !taken.has(p.seat)); seat = gp ? gp.seat : 0; }
    if (!seat) seat = (g.players.find(p => !taken.has(p.seat)) || {}).seat || 0;
    tgl.map[pl.tgId] = seat; if (seat) taken.add(seat);
  });
}
/* the creator of a table may sit as a player and ask a friend to host (the host never sits) */
const creatorPlays = () => S.setup.hostRole === 'player';
const isMeTg = id => !!(S.cloud && S.cloud.user && id === S.cloud.user.id);
/* the table lives in S.lobby before the game exists and moves into S.game.tg when the game is created */
function currentLobby() { return S.game && S.game.tg && !S.game.winner ? S.game.tg : (S.lobby || null); } // a finished game's table is history: new invitations open a fresh table
function lobbyIsOpen() { const l = currentLobby(); const g = S.game && !S.game.winner ? S.game : null; return !!(l && l.code && !(g && l === g.tg && g.dealIdx >= g.players.length)); }
async function openTable(fresh) {
  const live = S.game && !S.game.winner && S.game.tg && S.game.tg.code ? S.game : null;
  if (live && live.dealIdx >= live.players.length) { toast(U().frGameRunning); return null; } // a running game keeps its table: no second table, nobody kicked out
  const d = await api('/api/lobby', { fresh: !!fresh }); if (!d.ok) { toast(U().tgOffline); return null; }
  const l = { code: d.code, link: d.link, players: d.players || [], map: {}, sent: [], seats: {} };
  if (S.game && !S.game.winner) { S.game.tg = l; lobbyAutoSeat(S.game); } else { S.lobby = l; setupAutoSeat(); }
  save(); render();
  if (!(S.game && !S.game.winner)) api('/api/lobby/role', { code: l.code, online: !!S.setup.online, plays: creatorPlays() }).then(r => { if (r.ok && creatorPlays()) refreshTable(); }).catch(() => {});
  return l;
}
/* re-render without losing the keyboard: the focused input/select and its caret survive the redraw */
function keepFocus(fn) {
  let id = null, sel = null, tag = '';
  try { const a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT') && a.id) { id = a.id; tag = a.tagName; try { sel = [a.selectionStart, a.selectionEnd]; } catch (e) {} } } catch (e) {}
  fn();
  if (id) { try { const b = document.getElementById(id); if (b) { b.focus({ preventScroll: true }); if (sel && tag !== 'SELECT' && typeof b.setSelectionRange === 'function') b.setSelectionRange(sel[0], sel[1]); } } catch (e) {} }
}
const selectOpen = () => { try { const a = document.activeElement; return !!(a && a.tagName === 'SELECT'); } catch (e) { return false; } };
async function refreshTable() {
  const l = currentLobby(); if (!l || !l.code) return;
  const d = await api('/api/lobby/status', { code: l.code });
  if (!d.ok) {
    if (d.error === 'host_changed') { // the friend I asked to host took the table: I play at it now
      if (l === S.lobby) S.lobby = null; S.setup.hostRole = 'host'; save(); toast(tt(U().hostTook, { name: d.host ? d.host.name : '' })); tgHaptic('success');
      S.cloud = S.cloud || {}; S.cloud.table = { code: d.code, status: d.status, hostId: d.host ? d.host.tgId : 0, host: d.host ? d.host.name : '' }; tableOpen(d.code); return;
    }
    if (d.error === 'no_lobby') { if (l === S.lobby) S.lobby = null; else if (S.game && S.game.tg === l) S.game.tg = null; save(); render(); return; } return false; } // not our table any more (closed, or another account's) — drop it quietly
  if (d.status === 'closed') { if (l === S.lobby) S.lobby = null; else if (S.game && S.game.tg === l) S.game.tg = null; save(); render(); return; }
  l.hostInvite = d.hostInvite || null; l.hostPlays = !!d.hostPlays;
  const beforeIds = l.players.map(p => p.tgId); const beforeJson = JSON.stringify(l.players);
  l.players = (d.players || []).filter(pl => !isMeTg(pl.tgId) || (l.hostPlays && l === S.lobby)); // the host never sits as a player — unless the creator chose to play and is still looking for a host
  if (S.game && S.game.tg === l) lobbyAutoSeat(S.game); else setupAutoSeat();
  const fresh = l.players.filter(pl => !beforeIds.includes(pl.tgId));
  const gone = JSON.parse(beforeJson).filter(pl => !l.players.some(x => x.tgId === pl.tgId));
  if (gone.length && !(S.game && S.game.tg === l)) gone.forEach(pl => { const i = l.seats ? l.seats[pl.tgId] : undefined; if (i !== undefined) { if (String(S.setup.names[i] || '').trim() === String(pl.name || '').trim()) S.setup.names[i] = ''; delete l.seats[pl.tgId]; } }); // a player who stood up frees his seat before the deal
  const changed = JSON.stringify(l.players) !== beforeJson || JSON.stringify(l.hostInvite) !== JSON.stringify(d.hostInvite || null);
  if (changed) { save(); if (!selectOpen()) keepFocus(render); } // an open seat picker is not torn down under the host's finger
  if (fresh.length) { toast(tt(U().tgNewPlayer || '{name}', { name: fresh.map(x => x.name).join(', ') })); tgHaptic('light'); }
  if (gone.length) toast(tt(U().tgPlayerLeft || '{name}', { name: gone.map(x => x.name).join(', ') }));
  return fresh.length > 0;
}
/* setup screen: joined players take seats — by matching name, else the first empty seat; seats[tgId] = seat index */
function setupAutoSeat() {
  const l = S.lobby; if (!l) return; l.seats = l.seats || {}; const st = S.setup; st.names = st.names || [];
  const norm = s => String(s || '').toLowerCase().replace(/^@/, '').trim(); const taken = new Set(Object.values(l.seats));
  l.players.forEach(pl => {
    if (isMeTg(pl.tgId) && !creatorPlays()) return;
    if (l.seats[pl.tgId] !== undefined && l.seats[pl.tgId] < st.n) { taken.add(l.seats[pl.tgId]); return; }
    let i = -1;
    for (let k = 0; k < st.n; k++) { if (taken.has(k)) continue; const nm = norm(st.names[k]); if (nm && (nm === norm(pl.name) || (pl.username && nm === norm(pl.username)))) { i = k; break; } }
    if (i < 0) for (let k = 0; k < st.n; k++) { if (!taken.has(k) && !norm(st.names[k]) && !(st.seatProfiles || [])[k]) { i = k; break; } }
    if (i < 0) return;
    l.seats[pl.tgId] = i; taken.add(i); if (!norm(st.names[i])) st.names[i] = pl.name;
  });
}
function setupLobbyHTML(st) {
  if (!TG.app || !apiBase()) return '';
  const u = U(); const l = S.lobby;
  if (!l || !l.code) return `<div class="panel"><div class="eyebrow">${u.tgCards}</div><div class="hint" style="margin:6px 0 10px">${u.tgSetupHint}</div><div class="btn-row"><button class="btn" data-a="tg-lobby">${u.tgOpenTable}</button><button class="btn ghost" data-a="fr-go" style="flex:0 0 auto;width:auto">${u.frInviteFriends}</button></div></div>`;
  const seated = pl => l.seats && l.seats[pl.tgId] !== undefined && l.seats[pl.tgId] < st.n;
  const rows = l.players.map(pl => `<div class="row" style="gap:8px"><div class="grow" style="min-width:0;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(pl.name)}${pl.username ? ` <span style="color:var(--muted);font-weight:500">@${esc(pl.username)}</span>` : ''}</div>${seated(pl) ? `<span class="hint" style="margin:0">${tt(u.tgSeated, { seat: l.seats[pl.tgId] + 1 })}</span>` : `<button class="btn xs" data-a="tg-seat-one" data-tg="${pl.tgId}">${u.tgSeatOne}</button>`}</div>`).join('');
  const unseated = l.players.filter(pl => !seated(pl)).length;
  const plays = creatorPlays(); const hi = l.hostInvite;
  const rolePanel = `<div class="eyebrow" style="margin-top:10px">${u.hostRoleTitle}</div><div class="segment n2" style="margin-top:6px"><button class="${plays ? '' : 'active'}" data-a="host-role" data-id="host">${u.hostRoleHost}</button><button class="${plays ? 'active' : ''}" data-a="host-role" data-id="player">${u.hostRolePlayer}</button></div>
    <div class="hint" style="margin:6px 0 0">${plays ? u.hostRolePlayerHint : u.hostRoleHostHint}</div>
    ${plays ? `<div class="row" style="margin-top:8px"><button class="btn sm primary grow" data-a="fr-go-host">🎩 ${u.inviteHost}</button></div>${hi ? `<div class="hint" style="margin:6px 0 0">${hi.status === 'pending' ? tt(u.hostInvitePending, { name: esc(hi.name) }) : hi.status === 'declined' ? tt(u.hostInviteDeclined, { name: esc(hi.name) }) : ''}</div>` : ''}` : ''}`;
  return `<div class="panel"><div class="row"><div class="eyebrow grow">${tt(u.tgTable, { code: l.code })}</div><div class="hint" style="margin:0">${tt(u.tgJoined, { n: l.players.length })}</div></div>
    <div class="row" style="margin-top:8px"><button class="btn sm grow" data-a="tg-share">${u.tgShare}</button><button class="btn sm grow" data-a="fr-go">${u.frInviteFriends}</button><button class="btn sm ghost" data-a="tg-lobby-refresh">${u.tgRefresh}</button></div>
    ${rolePanel}
    ${l.players.length ? `<div class="stack-s" style="margin-top:10px">${rows}</div>${unseated ? `<button class="btn sm" style="margin-top:8px" data-a="tg-seat-all">${u.tgSeatAll}</button>` : ''}` : `<div class="hint" style="margin-top:10px">${u.tgWaiting}</div>`}
    <button class="btn xs ghost" style="margin-top:8px;align-self:flex-start" data-a="tg-close-table">${u.tgCloseTable}</button></div>`;
}
/* send cards to every mapped player of the game's table; returns the number sent */
async function sendCards(g, onlyUnsent) {
  const l = g.tg; if (!l || !l.code) return 0;
  const cards = l.players.filter(pl => l.map[pl.tgId] && !(onlyUnsent && (l.sent || []).includes(pl.tgId))).map(pl => { const p = g.players.find(x => x.seat === l.map[pl.tgId]); return { tgId: pl.tgId, seat: p.seat, roleId: p.roleId, family: p.family || null }; }); // the card itself is shown in the player's app
  if (!cards.length) return 0;
  const d = await api('/api/lobby/deal', { code: l.code, cards }); if (!d.ok) { toast(U().tgOffline); return 0; }
  l.sent = (l.sent || []).concat(d.sent || []).filter((v, i, a) => a.indexOf(v) === i);
  if ((d.failed || []).length) toast(tt(U().tgFailed, { n: d.failed.length }));
  skipDeliveredSeats(g); save(); render(); return (d.sent || []).length;
}
const seatDelivered = (g, seat) => !!(g.tg && (g.tg.sent || []).some(id => g.tg.map[id] === seat));
function skipDeliveredSeats(g) { while (g.dealIdx < g.players.length && seatDelivered(g, g.players[g.dealIdx].seat)) { g.dealIdx++; g.dealOpen = false; } }
/* polling: while a table is open on the setup / deal / friends screens, refresh the player list every few seconds */
let lobbyTimer = null;
function lobbyPoll() {
  const want = TG.app && apiBase() && lobbyIsOpen() && ['setup', 'deal', 'friends'].includes(S.screen);
  if (want && !lobbyTimer) lobbyTimer = setInterval(() => { if (!lobbyIsOpen() || !['setup', 'deal', 'friends'].includes(S.screen)) { clearInterval(lobbyTimer); lobbyTimer = null; return; } refreshTable(); }, 3000);
  if (!want && lobbyTimer) { clearInterval(lobbyTimer); lobbyTimer = null; }
}
function lobbyPanelHTML(g) {
  const u = U(); const tgl = g.tg;
  if (!tgl) return `<div class="panel"><div class="eyebrow">${u.tgCards}</div><div class="hint" style="margin:6px 0 10px">${u.tgCardsHint}</div><button class="btn" data-a="tg-lobby">${u.tgOpenTable}</button></div>`;
  const seatOpts = cur => `<option value="0" ${!cur ? 'selected' : ''}>${u.tgNoSeat}</option>` + g.players.map(p => `<option value="${p.seat}" ${cur === p.seat ? 'selected' : ''}>${p.seat} · ${esc(p.name)}</option>`).join('');
  const rows = tgl.players.map(pl => `<div class="row" style="align-items:center;gap:8px"><div class="grow" style="min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(pl.name)}${tgl.sent && tgl.sent.includes(pl.tgId) ? ` <span style="color:#9fe0ab;font-weight:600">✓ ${esc(u.tgViaTg)}</span>` : ''}</div>${pl.username ? `<div class="hint" style="margin:0">@${esc(pl.username)}</div>` : ''}</div><select class="input" style="width:46%;flex:none" data-a="tg-seat" data-tg="${pl.tgId}">${seatOpts(tgl.map[pl.tgId])}</select></div>`).join('');
  const n = tgl.players.filter(pl => tgl.map[pl.tgId] && !(tgl.sent || []).includes(pl.tgId)).length;
  return `<div class="panel"><div class="row"><div class="eyebrow grow">${tt(u.tgTable, { code: tgl.code })}</div><div class="hint" style="margin:0">${tt(u.tgJoined, { n: tgl.players.length })}</div></div>
    <div class="row" style="margin-top:8px"><button class="btn sm grow" data-a="tg-share">${u.tgShare}</button><button class="btn sm grow" data-a="fr-go">${u.frInviteFriends}</button><button class="btn sm ghost" data-a="tg-lobby-refresh">${u.tgRefresh}</button></div>
    ${tgl.players.length ? `<div class="stack-s" style="margin-top:10px">${rows}</div>` : `<div class="hint" style="margin-top:10px">${u.tgNobody}</div>`}
    ${tgl.players.length ? `<button class="btn primary" style="margin-top:10px" data-a="tg-deal" ${n ? '' : 'disabled'}>${tt(u.tgSendCards, { n })}</button>` : ''}
    ${tgl.sent && tgl.sent.length ? `<button class="btn" style="margin-top:8px" data-a="tg-deal-done">${u.tgDealDone}</button>` : ''}</div>`;
}
Object.assign(ACT, {
  async 'tg-lobby'() { const l = currentLobby(); await openTable(!!(l && l.code)); },
  async 'tg-lobby-refresh'() { if ((await refreshTable()) === false) toast(U().tgOffline); },
  'tg-seat-one'(el) { const l = S.lobby; if (!l) return; const id = Number(el.dataset.tg); const st = S.setup; const taken = new Set(Object.values(l.seats || {})); let i = -1; for (let k = 0; k < st.n; k++) if (!taken.has(k) && !String(st.names[k] || '').trim() && !(st.seatProfiles || [])[k]) { i = k; break; } if (i < 0) for (let k = 0; k < st.n; k++) if (!taken.has(k)) { i = k; break; } if (i < 0) return; l.seats = l.seats || {}; l.seats[id] = i; const pl = l.players.find(p => p.tgId === id); if (pl && !String(st.names[i] || '').trim()) st.names[i] = pl.name; save(); render(); },
  'tg-seat-all'() { setupAutoSeat(); save(); render(); },
  'tg-close-table'() { const l = S.lobby; S.lobby = null; save(); render(); if (l && l.code && TG.app && apiBase()) api('/api/lobby/close', { code: l.code }).catch(() => {}); },
  'tg-share'() {
    const l = currentLobby(); if (!l || !l.link) return; const url = 'https://t.me/share/url?url=' + encodeURIComponent(l.link) + '&text=' + encodeURIComponent(U().tgShareText);
    try { if (TG.app && TG.app.openTelegramLink) TG.app.openTelegramLink(url); else window.open(url, '_blank'); } catch (e) {}
  },
  'tg-seat'(el) { const g = S.game; if (!g || !g.tg) return; const seat = Number(el.value) || 0; Object.keys(g.tg.map).forEach(k => { if (seat && g.tg.map[k] === seat && k !== el.dataset.tg) g.tg.map[k] = 0; }); g.tg.map[el.dataset.tg] = seat; save(); render(); },
  async 'tg-deal'() { const g = S.game; if (!g || !g.tg) return; const n = await sendCards(g, true); if (n) { toast(tt(U().tgSent, { n })); tgHaptic('success'); } },
  'tg-deal-done'() { const g = S.game; if (!g) return; g.dealIdx = g.players.length; g.dealOpen = false; S.ui.showAll = false; save(); render(); },
  async 'tg-top'() { const d = await api('/api/leaderboard?limit=30', null, { method: 'GET' }); CLOUD.top = d.ok ? d.top : []; if (!d.ok) toast(U().tgOffline); render(); },
  'clubs-top-refresh'() { CLOUD.clubsAt = 0; render(); }
});
/* ---------- friends: invite link, list, invite to my table ---------- */
const FR = { list: null, link: '', code: '', bot: '', busy: false, at: 0, q: '', results: null, searching: false, incoming: [], outgoing: [] };
async function loadFriends(force) {
  if (!TG.app || !apiBase() || FR.busy) return; if (FR.list && !force && Date.now() - FR.at < 60000) return;
  FR.busy = true; render();
  try { const [d, r] = await Promise.all([api('/api/friends', {}), api('/api/friends/requests', {})]); if (d.ok) { FR.list = d.friends || []; FR.link = d.invite.link; FR.code = d.invite.code; FR.bot = d.bot; FR.at = Date.now(); S.ui.frSel = (S.ui.frSel || []).filter(id => FR.list.some(f => f.tgId === id)); } else if (!FR.list) FR.list = []; if (r.ok) { FR.incoming = r.incoming || []; FR.outgoing = r.outgoing || []; } }
  finally { FR.busy = false; render(); }
}
function friendAvatar(f) {
  return f.photo ? `<img class="avatar sm" src="${esc(f.photo)}" alt="" style="object-fit:cover">` : `<div class="avatar sm" style="--av-bg:var(--bg-3);--av-fg:var(--gold-2)">${esc((f.name || '?').slice(0, 1).toUpperCase())}</div>`;
}
function friendsScreen() {
  const u = U();
  if (!TG.app || !apiBase()) return `${topbar(u.frTitle, u.frSub, false)}<div class="stack"><div class="panel"><div class="hint">${u.frOnlyTg}</div></div></div>`;
  if (!FR.list && !FR.busy) setTimeout(() => loadFriends(false), 0);
  const sel = S.ui.frSel = S.ui.frSel || [];
  const g = S.game; const lobbyOpen = lobbyIsOpen();
  const linkPanel = `<div class="panel"><div class="eyebrow">${u.frMyLink}</div><div class="hint" style="margin:6px 0 8px">${u.frMyLinkHint}</div>
    <div class="fr-link">${FR.link ? esc(FR.link) : u.frLoading}</div>
    <div class="btn-row" style="margin-top:10px"><button class="btn primary" data-a="fr-share" ${FR.link ? '' : 'disabled'}>${u.frShare}</button><button class="btn ghost" data-a="fr-copy" ${FR.link ? '' : 'disabled'} style="flex:0 0 auto;width:auto">${u.frCopy}</button></div></div>`;
  const list = FR.list || [];
  const rows = list.map(f => `<div class="fr-row ${sel.includes(f.tgId) ? 'sel' : ''}" role="button" tabindex="0" data-a="fr-open" data-id="${f.tgId}"><span class="chk" data-a="fr-toggle" data-id="${f.tgId}" role="checkbox" aria-checked="${sel.includes(f.tgId)}">${sel.includes(f.tgId) ? '✓' : ''}</span>${friendAvatar(f)}<div class="grow" style="min-width:0"><div class="nm" style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}${f.username ? ` <span style="color:var(--muted);font-weight:500">@${esc(f.username)}</span>` : ''}</div><div class="sub" style="font-size:12px;color:var(--fg-2)">${presenceHTML(f)} · ${tt(u.frStats, { g: f.games, w: f.wins })}</div></div><span class="num" style="color:var(--gold-2);font-weight:700">${f.points}</span><button class="btn xs ghost" data-a="fr-remove-ask" data-id="${f.tgId}" aria-label="${u.frRemove}" style="color:var(--muted);border-color:transparent">✕</button></div>`).join('');
  const ask = S.ui.frAsk ? (() => { const f = list.find(x => x.tgId === S.ui.frAsk); return f ? `<div class="panel" style="border-color:var(--crimson-2)"><div>${tt(u.frRemoveAsk, { name: esc(f.name) })}</div><div class="row" style="margin-top:8px"><button class="btn sm grow" data-a="fr-remove" data-id="${f.tgId}" style="color:var(--crimson-2)">${u.frRemove}</button><button class="btn sm ghost" data-a="fr-ask-cancel">${u.cancel}</button></div></div>` : ''; })() : '';
  const cl = currentLobby();
  if (S.ui.frMode === 'host') { // choosing who runs the table: one friend, a different button
    const one = sel.slice(0, 1); const chosen = one.length ? list.find(f => f.tgId === one[0]) : null;
    return `${topbar(u.inviteHost, u.inviteHostSub)}<div class="stack">
      <div class="hint">${u.inviteHostHint}</div>
      ${list.length ? `<div class="stack-s">${rows}</div>` : `<div class="hint">${FR.list ? u.frEmpty : u.frLoading}</div>`}
      <div class="sticky-bottom"><button class="btn primary" data-a="fr-invite-host" ${chosen ? '' : 'disabled'}>🎩 ${chosen ? tt(u.inviteHostBtn, { name: esc(chosen.name) }) : u.inviteHost}</button></div></div>`;
  }
  const inviteBar = list.length ? `<button class="btn primary" data-a="fr-invite" ${sel.length ? '' : 'disabled'}>${tt(u.frInviteTable, { n: sel.length })}</button>${lobbyOpen && cl ? `<div class="hint" style="text-align:center">${tt(u.frTable, { code: cl.code, n: sel.length })}</div>` : (!g ? `<div class="hint" style="text-align:center">${u.frNoGame}</div>` : '')}` : '';
  const resRow = r => `<div class="fr-row" role="button" data-a="fr-open" data-id="${r.tgId}"><span style="width:0"></span>${friendAvatar(r)}<div class="grow" style="min-width:0"><div class="nm" style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}${r.username ? ` <span style="color:var(--muted);font-weight:500">@${esc(r.username)}</span>` : ''}</div><div class="sub" style="font-size:12px;color:var(--fg-2)">${presenceHTML(r)}</div></div>${r.isFriend ? `<span class="hint" style="margin:0">${u.frIsFriend}</span>` : r.requested ? `<span class="hint" style="margin:0">${u.frRequested}</span>` : r.incoming ? `<button class="btn xs primary" data-a="fr-respond" data-id="${r.tgId}" data-ok="1">${u.frAcceptBtn}</button>` : `<button class="btn xs" data-a="fr-request" data-id="${r.tgId}">${u.frAdd}</button>`}</div>`;
  const searchPanel = `<div class="panel"><div class="eyebrow">${u.frSearch}</div><div class="row" style="margin-top:8px"><input class="input grow" id="fr-q" data-a="fr-q" placeholder="${u.frSearchPh}" value="${esc(FR.q)}" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn sm" data-a="fr-search" style="flex:0 0 auto">${FR.searching ? '…' : '🔍'}</button></div>
    ${FR.results ? (FR.results.length ? `<div class="stack-s" style="margin-top:10px">${FR.results.map(resRow).join('')}</div>` : `<div class="hint" style="margin-top:8px">${u.frSearchEmpty}</div>`) : `<div class="hint" style="margin-top:8px">${u.frSearchHint}</div>`}</div>`;
  const reqRow = (r, incoming) => `<div class="fr-row"><span style="width:0"></span>${friendAvatar(r)}<div class="grow" style="min-width:0"><div class="nm" style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}${r.username ? ` <span style="color:var(--muted);font-weight:500">@${esc(r.username)}</span>` : ''}</div></div>${incoming ? `<button class="btn xs primary" data-a="fr-respond" data-id="${r.tgId}" data-ok="1">${u.frAcceptBtn}</button><button class="btn xs ghost" data-a="fr-respond" data-id="${r.tgId}" data-ok="0">${u.frDeclineBtn}</button>` : `<span class="hint" style="margin:0">${u.frRequested}</span>`}</div>`;
  const requests = (FR.incoming.length || FR.outgoing.length) ? `<div class="eyebrow">${u.frRequests}${FR.incoming.length ? ` · ${FR.incoming.length}` : ''}</div><div class="stack-s">${FR.incoming.map(r => reqRow(r, true)).join('')}${FR.outgoing.map(r => reqRow(r, false)).join('')}</div>` : '';
  const programmes = `<div class="btn-row"><button class="btn" data-a="ref-open">🎁 ${u.refBtn}</button><button class="btn" data-a="pt-open">🤝 ${u.ptBtn}</button></div>`;
  return `${topbar(u.frTitle, u.frSub, false)}
  <div class="stack">
    ${programmes}
    ${searchPanel}
    ${requests}
    ${linkPanel}
    <div class="row"><div class="eyebrow grow">${u.frList}${list.length ? ` · ${list.length}` : ''}</div>${list.length ? `<button class="btn xs ghost" data-a="fr-sel-all">${sel.length === list.length ? u.frInviteNone : u.frInviteAll}</button>` : ''}<button class="btn xs ghost" data-a="fr-refresh">${FR.busy ? '…' : u.frRefresh}</button></div>
    ${ask}
    ${list.length ? `<div class="stack-s">${rows}</div>` : (FR.list ? `<div class="panel" style="text-align:center"><div style="font-weight:700">${u.frEmpty}</div><div class="hint" style="margin-top:4px">${u.frEmptyHint}</div></div>` : `<div class="hint" style="text-align:center">${u.frLoading}</div>`)}
    ${inviteBar}
  </div>`;
}
Object.assign(ACT, {
  'fr-go'() { S.ui.frMode = null; go('friends'); },
  'fr-go-host'() { S.ui.frMode = 'host'; S.ui.frSel = []; FR.at = 0; go('friends'); setTimeout(() => loadFriends(true), 0); },
  async 'host-role'(el) {
    const plays = el.dataset.id === 'player'; if (plays === creatorPlays()) return;
    if (plays && S.game && !S.game.winner) { toast(U().frGameRunning); return; }
    S.setup.hostRole = plays ? 'player' : 'host'; save(); render();
    const l = S.lobby; if (!l || !l.code) return;
    const d = await api('/api/lobby/role', { code: l.code, plays }); if (!d.ok) { toast(U().tgOffline); return; }
    if (!plays && l.seats && S.cloud && S.cloud.user) { const i = l.seats[S.cloud.user.id]; if (i !== undefined) { if (String(S.setup.names[i] || '').trim() === String(S.cloud.user.name || '').trim()) S.setup.names[i] = ''; delete l.seats[S.cloud.user.id]; } }
    await refreshTable(); render();
  },
  async 'fr-invite-host'() {
    const sel = (S.ui.frSel || []).slice(0, 1); if (!sel.length) return;
    if (!lobbyIsOpen()) { if (!(await openTable(false))) return; }
    if (!creatorPlays()) { S.setup.hostRole = 'player'; save(); await api('/api/lobby/role', { code: S.lobby.code, plays: true }); }
    let r = await api('/api/friends/invite', { code: S.lobby.code, friendIds: sel, kind: 'host' });
    if (!r.ok && r.error === 'no_lobby') { if (!(await openTable(true))) return; r = await api('/api/friends/invite', { code: S.lobby.code, friendIds: sel, kind: 'host' }); }
    if (!r.ok || !(r.sent || []).length) { toast(U().tgOffline); return; }
    const f = (FR.list || []).find(x => x.tgId === sel[0]); toast(tt(U().hostInvited, { name: f ? f.name : '' })); tgHaptic('success'); S.ui.frSel = []; S.ui.frMode = null;
    await refreshTable(); go('setup');
  },
  'fr-q'(el) { FR.q = el.value || ''; },
  async 'fr-search'() {
    const q = FR.q.trim(); if (q.length < 2) { FR.results = null; render(); return; }
    FR.searching = true; render(); const d = await api('/api/friends/search', { q }); FR.searching = false;
    FR.results = d.ok ? d.results : []; if (!d.ok) toast(U().tgOffline); render();
  },
  async 'fr-request'(el) {
    const id = Number(el.dataset.id); const d = await api('/api/friends/request', { tgId: id }); if (!d.ok) { toast(U().tgOffline); return; }
    if (d.status === 'friends') { toast(U().frNowFriends); FR.at = 0; if (FRP[id]) FRP[id].isFriend = true; loadFriends(true); } else { toast(U().frAdded); (FR.results || []).forEach(r => { if (r.tgId === id) r.requested = true; }); if (FRP[id]) FRP[id].requested = true; const known = (FR.results || []).find(r => r.tgId === id) || (FRP[id] && FRP[id].user); if (known && !FR.outgoing.some(r => r.tgId === id)) FR.outgoing = FR.outgoing.concat([known]); }
    tgHaptic('light'); render();
  },
  async 'fr-respond'(el) {
    const id = Number(el.dataset.id); const accept = el.dataset.ok === '1'; const d = await api('/api/friends/respond', { tgId: id, accept }); if (!d.ok) { toast(U().tgOffline); return; }
    FR.incoming = FR.incoming.filter(r => r.tgId !== id); (FR.results || []).forEach(r => { if (r.tgId === id) { r.incoming = false; r.isFriend = accept; } });
    if (accept) { toast(U().frNowFriends); tgHaptic('success'); loadFriends(true); } else render();
  },
  'fr-refresh'() { loadFriends(true); },
  'fr-toggle'(el) { const id = Number(el.dataset.id); const sel = S.ui.frSel = S.ui.frSel || []; const i = sel.indexOf(id); if (i >= 0) sel.splice(i, 1); else { if (S.ui.frMode === 'host') sel.length = 0; sel.push(id); } render(); },
  'fr-sel-all'() { const list = FR.list || []; S.ui.frSel = (S.ui.frSel || []).length === list.length ? [] : list.map(f => f.tgId); render(); },
  'fr-share'() { if (!FR.link) return; const url = 'https://t.me/share/url?url=' + encodeURIComponent(FR.link) + '&text=' + encodeURIComponent(U().frShareText); try { if (TG.app && TG.app.openTelegramLink) TG.app.openTelegramLink(url); else window.open(url, '_blank'); } catch (e) {} },
  async 'fr-copy'() { if (!FR.link) return; try { await navigator.clipboard.writeText(FR.link); toast(U().frCopied); } catch (e) { try { const ta = document.createElement('textarea'); ta.value = FR.link; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast(U().frCopied); } catch (e2) {} } },
  'fr-remove-ask'(el) { S.ui.frAsk = Number(el.dataset.id); render(); },
  'fr-ask-cancel'() { S.ui.frAsk = null; render(); },
  async 'fr-remove'(el) { const id = Number(el.dataset.id); S.ui.frAsk = null; const d = await api('/api/friends/remove', { friendId: id }); if (d.ok) { FR.list = (FR.list || []).filter(f => f.tgId !== id); S.ui.frSel = (S.ui.frSel || []).filter(x => x !== id); toast(U().frRemoved); } else toast(U().tgOffline); render(); },
  async 'fr-accept'(el) { const code = el.dataset.id; const d = await api('/api/friends/accept', { code }); if (d.ok && d.friend) { toast(tt(U().frAccepted, { name: d.friend.name })); FR.at = 0; } else if (!d.ok) toast(d.error === 'not_found' ? U().tgNA : U().tgOffline); go('friends'); },
  async 'fr-invite'() {
    const sel = (S.ui.frSel || []).slice(); if (!sel.length) return;
    if (!S.game || S.game.winner) { // no game yet (or the last one is over): open the pre-game table and invite there; seats are filled on the setup screen
      if (!lobbyIsOpen()) { if (!(await openTable(false))) return; }
      let r0 = await api('/api/friends/invite', { code: S.lobby.code, friendIds: sel });
      if (!r0.ok && r0.error === 'no_lobby') { if (!(await openTable(true))) return; r0 = await api('/api/friends/invite', { code: S.lobby.code, friendIds: sel }); }
      if (!r0.ok) { toast(U().tgOffline); return; }
      toast(tt(U().frInvited, { n: (r0.sent || []).length }) + ((r0.failed || []).length ? ' · ' + tt(U().frInviteFail, { n: r0.failed.length }) : '')); tgHaptic('success'); S.ui.frSel = [];
      if (!S.setup.scenario && !S.setup.comp) S.setup.comp = presetFor(S.setup.n); go('setup'); return; // on to the table: seats fill in as the players accept
    }
    const g = S.game;
    if (g.tg && g.tg.code && g.dealIdx >= g.players.length) { toast(U().frGameRunning); return; } // the cards are out: this game's table is full
    if (!g.tg || !g.tg.code) { if (!(await openTable(false))) return; }
    const r = await api('/api/friends/invite', { code: g.tg.code, friendIds: sel });
    if (!r.ok) { toast(U().tgOffline); return; }
    toast(tt(U().frInvited, { n: (r.sent || []).length }) + ((r.failed || []).length ? ' · ' + tt(U().frInviteFail, { n: r.failed.length }) : '')); tgHaptic('success'); S.ui.frSel = [];
    if (S.screen !== 'deal' && S.screen !== 'game') go(g.dealt ? 'game' : 'deal'); else render(); // back to the table, not the menu
  }
});
/* ---------- friend profile sheet (server-side stats: rating, cards, recent games) ---------- */
const FRP = {};
function friendSheetHTML(id) {
  const u = U(); id = Number(id); const c = FRP[id];
  const known = (FR.list || []).find(f => f.tgId === id) || (FR.results || []).find(f => f.tgId === id) || (CLOUD.top || []).find(f => f.tgId === id) || { tgId: id, name: '…', username: '' };
  if (!c) { FRP[id] = { loading: true }; setTimeout(async () => { const d = await api('/api/profile', { tgId: id }); FRP[id] = d.ok ? d : { error: d.error || 'network' }; render(); }, 0); }
  const d = c && !c.loading && !c.error ? c : null;
  const usr = d ? d.user : known; const fmt = ms => new Date(ms).toLocaleDateString(L.code === 'en' ? 'en-GB' : L.code === 'uk' ? 'uk-UA' : L.code === 'pl' ? 'pl-PL' : L.code === 'hy' ? 'hy-AM' : 'ru-RU');
  const tile = (v, k, col = '') => `<div class="st"><div class="v num" style="${col}">${v}</div><div class="k">${k}</div></div>`;
  const head = `<div class="row" style="gap:12px">${usr.photo ? `<img class="avatar lg" src="${esc(usr.photo)}" alt="" style="object-fit:cover">` : `<div class="avatar lg" style="--av-bg:var(--bg-3);--av-fg:var(--gold-2)">${esc((usr.name || '?').slice(0, 1).toUpperCase())}</div>`}<div class="grow" style="min-width:0"><h2 style="margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(usr.name)}</h2>${usr.username ? `<div class="hint" style="margin:0">@${esc(usr.username)}</div>` : ''}<div style="font-size:12px;margin-top:2px">${presenceHTML(usr)}${d && d.grant ? ` · <span style="color:var(--gold-2)">★ ${u.frFullAccess}</span>` : ''}</div></div></div>`;
  let body;
  if (!d) body = c && c.error ? `<div class="hint" style="margin-top:12px">${c.error === 'not_found' ? u.frSearchEmpty : u.tgOffline}</div>` : `<div class="hint" style="margin-top:12px">${u.frLoading}</div>`;
  else {
    const r = d.rating; const wr = r.games ? Math.round(100 * r.wins / r.games) : 0;
    const roles = d.roles.slice(0, 3).map(x => { const role = ROLE[x.roleId]; return role ? `<div class="fav">${sealHTML(role)}<div class="grow" style="min-width:0"><div class="n">${role.name}</div><div class="hint" style="margin:0">${tt(u.bestRoleText, { wins: x.wins, games: x.games })}</div></div><span class="num" style="color:var(--gold-2)">${x.points > 0 ? '+' : ''}${x.points}</span></div>` : ''; }).join('');
    const recent = d.recent.slice(0, 8).map(h => { const role = ROLE[h.roleId]; return `<div class="h">${role ? sealHTML(role) : ''}<div class="grow"><div class="t">${role ? role.name : esc(h.roleId)}</div><div class="d">${tt(u.frPlayers, { n: h.n })} · ${fmt(h.at)}</div></div><span class="num" style="color:${h.won ? '#9fe0ab' : 'var(--crimson-2)'}">${h.won ? u.frWon : u.frLost} ${h.points > 0 ? '+' : ''}${h.points}</span></div>`; }).join('');
    body = `<div class="status" style="margin-top:14px">${tile(r.points, u.rating, 'color:var(--gold-2)')}${tile(r.games, u.games)}${tile(r.wins, u.wins, 'color:#9fe0ab')}${tile(wr + '%', u.winRate)}</div>
      ${usr.since ? `<div class="hint" style="text-align:center;margin-top:6px">${tt(u.frSince, { date: fmt(usr.since) })}</div>` : ''}
      ${roles ? `<div class="eyebrow" style="margin-top:12px">${u.frBestRoles}</div><div class="stack-s">${roles}</div>` : ''}
      <div class="eyebrow" style="margin-top:12px">${u.frRecent}</div>${recent ? `<div class="hist">${recent}</div>` : `<div class="hint">${u.frNoGames}</div>`}`;
  }
  const isFriend = d ? d.isFriend : (FR.list || []).some(f => f.tgId === id); const isMe = S.cloud && S.cloud.user && S.cloud.user.id === id;
  const primary = isMe ? '' : (isFriend ? `<button class="btn primary" data-a="fr-invite-one" data-id="${id}">${u.frInviteOne}</button>` : (d && !d.isFriend ? (d.requested ? `<span class="hint" style="margin:auto 0">${u.frRequested}</span>` : `<button class="btn primary" data-a="fr-request" data-id="${id}">${u.frAdd}</button>`) : ''));
  const secondary = `${!isMe && usr.username ? `<button class="btn ghost sm" data-a="fr-open-tg" data-u="${esc(usr.username)}">${u.frOpenTg}</button>` : ''}${isFriend ? `<button class="btn ghost sm" style="color:var(--crimson-2)" data-a="fr-remove-from-sheet" data-id="${id}">${u.frRemove}</button>` : ''}`;
  const actions = `<div class="btn-row" style="margin-top:14px"><button class="btn" data-a="ps-open" data-id="${id}">${I.person} ${u.psBtn}</button>${primary}</div>${secondary ? `<div class="btn-row" style="margin-top:8px">${secondary}</div>` : ''}`;
  return head + body + actions;
}
/* ---------- full player statistics screen (server data), opened with the "Profile" button anywhere a player is tapped ---------- */
function knownUser(id) { return (FR.list || []).find(f => f.tgId === id) || (FR.results || []).find(f => f.tgId === id) || (CLOUD.top || []).find(f => f.tgId === id) || (PL.list || []).find(f => f.tgId === id) || (CL.cur && CL.cur.members || []).find(f => f.tgId === id) || { tgId: id, name: '…', username: '' }; }
function loadPlayerProfile(id, force) { if (FRP[id] && !force) return; FRP[id] = { loading: true }; setTimeout(async () => { const d = await api('/api/profile', { tgId: id }); FRP[id] = d.ok ? d : { error: d.error || 'network' }; render(); }, 0); }
function cloudStatsHTML(d, opts = {}) { // tiles + roles + by side + recent games, from /api/profile
  const u = U(); const r = d.rating; const wr = r.games ? Math.round(100 * r.wins / r.games) : 0;
  const tile = (v, k, col = '') => `<div class="st"><div class="v num" style="${col}">${v}</div><div class="k">${k}</div></div>`;
  const fmt = ms => { try { return new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };
  const roles = (opts.allRoles ? d.roles : d.roles.slice(0, 3)).map(x => { const role = ROLE[x.roleId]; return role ? `<div class="fav">${sealHTML(role)}<div class="grow" style="min-width:0"><div class="n">${role.name}</div><div class="s">${tt(u.rtGW, { g: x.games, w: x.wins })}</div><div class="bar"><i style="width:${x.games ? 100 * x.wins / x.games : 0}%"></i></div></div><span class="w">${x.games ? Math.round(100 * x.wins / x.games) : 0}%</span></div>` : ''; }).join('');
  const side = { city: { g: 0, w: 0 }, mafia: { g: 0, w: 0 }, self: { g: 0, w: 0 } };
  d.roles.forEach(x => { const role = ROLE[x.roleId]; const k = role && role.side === 'mafia' ? 'mafia' : role && role.side === 'city' ? 'city' : 'self'; side[k].g += x.games; side[k].w += x.wins; });
  const sideRow = (k, lbl) => { const b = side[k]; return `<div class="fav">${sealHTML(k === 'city' ? ROLE.sheriff : k === 'mafia' ? ROLE.don : ROLE.maniac)}<div><div class="n">${lbl}</div><div class="s">${tt(u.rtGW, { g: b.g, w: b.w })}</div></div><span class="w">${b.g ? Math.round(100 * b.w / b.g) : 0}%</span></div>`; };
  const recent = d.recent.slice(0, opts.recent || 12).map(h => { const role = ROLE[h.roleId]; return `<div class="h">${role ? sealHTML(role) : ''}<div><div class="t">${role ? role.name : esc(h.roleId)}</div><div class="d">${tt(u.histLine, { n: h.n, date: fmt(h.at) })}</div></div><span class="res ${h.won ? 'win' : 'loss'}">${h.won ? u.won : u.lost}<br>${h.points > 0 ? '+' : ''}${h.points}</span></div>`; }).join('');
  const st = d.streaks || {}; const streakKeys = ['city', 'mafia', 'neutral'].filter(k => st[k] >= 2);
  const streaks = streakKeys.length && u.streakLine ? `<div class="panel" style="text-align:center;border-color:rgba(240,205,122,.5)"><div class="eyebrow gold">${u.streakTitle}</div>${streakKeys.map(k => `<div class="pod-streak" style="font-size:14px;margin-top:4px">${tt(u.streakLine, { n: st[k], wins: plural(st[k], 'wins'), side: (u.streakFor || {})[k] || '' })}</div>`).join('')}</div>` : '';
  return `<div class="status">${tile(r.points, u.rating, 'color:var(--gold-2)')}${tile(r.games, u.games)}${tile(r.wins, u.wins, 'color:#9fe0ab')}${tile(wr + '%', u.winRate, 'color:var(--gold-2)')}</div>${streaks}
    ${roles ? `<div class="eyebrow">${opts.allRoles ? u.psAllRoles : u.frBestRoles}</div><div class="stack-s">${roles}</div>` : `<p class="hint">${u.noGamesYet}</p>`}
    ${opts.sides && d.roles.length ? `<div class="eyebrow">${u.bySide}</div><div class="stack-s">${sideRow('city', u.sideCity)}${sideRow('mafia', u.sideMafia)}${sideRow('self', u.sideSolo)}</div>` : ''}
    <div class="eyebrow">${u.frRecent}</div>${recent ? `<div class="hist">${recent}</div>` : `<p class="hint">${u.frNoGames}</p>`}`;
}
function playerStatsScreen() {
  const u = U(); const id = Number(S.ui.pstatsId); if (!id || !TG.app || !apiBase()) { S.screen = 'home'; return homeScreen(); }
  loadPlayerProfile(id, false); const c = FRP[id]; const d = c && !c.loading && !c.error ? c : null;
  const usr = d ? d.user : knownUser(id); const isMe = S.cloud && S.cloud.user && S.cloud.user.id === id;
  const fmt = ms => { try { return new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
  const head = `<div class="prof-head">${usr.photo ? `<img class="avatar lg" src="${esc(usr.photo)}" alt="" style="object-fit:cover">` : `<div class="avatar lg" style="--av-bg:var(--bg-3);--av-fg:var(--gold-2)">${esc((usr.name || '?').slice(0, 1).toUpperCase())}</div>`}<div class="grow" style="min-width:0"><div class="nm">${esc(usr.name)}</div>${usr.username ? `<div class="un">@${esc(usr.username)}</div>` : ''}<div class="loc">${presenceHTML(usr)}${usr.since ? ` · ${tt(u.psSince, { date: fmt(usr.since) })}` : ''}${d && d.grant ? ` · <span style="color:var(--gold-2)">★ ${u.frFullAccess}</span>` : ''}</div></div></div>`;
  let body;
  if (!d) body = c && c.error ? `<p class="hint">${c.error === 'not_found' ? u.frSearchEmpty : u.tgOffline}</p>` : `<p class="hint">${u.frLoading}</p>`;
  else {
    const best = d.roles[0] && ROLE[d.roles[0].roleId]; const bestRole = best || ROLE.sheriff;
    body = `<div class="panel"><div class="eyebrow gold" style="text-align:center">${u.bestRole}</div>${card3dHTML(bestRole, 'pstats')}<div class="spin-hint">${u.spinHint}</div><div class="best-role"><b>${bestRole.name}</b>${best ? ' · ' + tt(u.bestRoleText, { wins: d.roles[0].wins, games: d.roles[0].games }) : ' · ' + u.noGamesYet}</div></div>${cloudStatsHTML(d, { allRoles: true, sides: true, recent: 12 })}`;
  }
  const isFriend = d ? d.isFriend : (FR.list || []).some(f => f.tgId === id);
  const actions = isMe ? `<button class="btn ghost" data-a="go" data-to="myprofile">${I.person} ${u.myProfile}</button>` : `<div class="btn-row">${isFriend ? `<button class="btn primary" data-a="fr-invite-one" data-id="${id}">${u.frInviteOne}</button>` : (d && !d.isFriend ? (d.requested ? `<span class="hint" style="margin:auto 0">${u.frRequested}</span>` : `<button class="btn primary" data-a="fr-request" data-id="${id}">${u.frAdd}</button>`) : '')}${usr.username ? `<button class="btn ghost" data-a="fr-open-tg" data-u="${esc(usr.username)}">${u.frOpenTg}</button>` : ''}</div>`;
  return `${topbar(u.psTitle, u.psSub)}<div class="stack">${head}${body}${actions}</div>`;
}
Object.assign(ACT, {
  'fr-open'(el) { S.ui.sheet = { type: 'friend', id: Number(el.dataset.id) }; render(); },
  'ps-open'(el) { S.ui.pstatsId = Number(el.dataset.id); S.ui.sheet = null; if (S.screen !== 'pstats') S.ui.pstatsFrom = S.screen; go('pstats'); },
  'ps-refresh'() { if (S.ui.pstatsId) loadPlayerProfile(Number(S.ui.pstatsId), true); },
  'fr-open-tg'(el) { const url = 'https://t.me/' + el.dataset.u; try { if (TG.app && TG.app.openTelegramLink) TG.app.openTelegramLink(url); else window.open(url, '_blank'); } catch (e) {} },
  'fr-invite-one'(el) { S.ui.frSel = [Number(el.dataset.id)]; S.ui.sheet = null; go('friends'); ACT['fr-invite'](); },
  'fr-remove-from-sheet'(el) { S.ui.sheet = null; S.ui.frAsk = Number(el.dataset.id); go('friends'); }
});
/* ---------- players tab: everyone who registered in the bot (server directory) ---------- */
const PL = { list: null, total: 0, online: 0, q: '', busy: false, at: 0, more: false };
async function loadPlayers(reset) {
  if (!TG.app || !apiBase() || PL.busy) return; PL.busy = true; if (reset) { PL.list = null; } render();
  try { const d = await api('/api/players', { q: PL.q, offset: reset || !PL.list ? 0 : PL.list.length, limit: 50 }); if (d.ok) { PL.list = (reset || !PL.list ? [] : PL.list).concat(d.players); PL.total = d.total; PL.online = d.online; PL.more = PL.list.length < d.total; PL.at = Date.now(); } else if (!PL.list) PL.list = []; }
  finally { PL.busy = false; render(); }
}
function playersDirectoryHTML() {
  if (!TG.app || !apiBase()) return '';
  const u = U(); if (!PL.list && !PL.busy) setTimeout(() => loadPlayers(true), 0);
  const row = p => `<div class="fr-row" role="button" data-a="fr-open" data-id="${p.tgId}"><span style="width:0"></span>${friendAvatar(p)}<div class="grow" style="min-width:0"><div class="nm" style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}${p.username ? ` <span style="color:var(--muted);font-weight:500">@${esc(p.username)}</span>` : ''}${p.isFriend ? ` <span class="hint" style="margin:0;display:inline">· ${u.plFriend}</span>` : ''}</div><div class="sub" style="font-size:12px;color:var(--fg-2)">${presenceHTML(p)} · ${tt(u.frStats, { g: p.games, w: p.wins })}</div></div><span class="num" style="color:var(--gold-2);font-weight:700">${p.points}</span></div>`;
  const list = PL.list || [];
  return `<div class="row"><div class="eyebrow grow">${u.plAll}${PL.list ? ` · ${PL.total}` : ''}</div>${PL.list ? `<span class="fr-on" style="font-size:12px">● ${tt(u.plOnline, { n: PL.online })}</span>` : ''}<button class="btn xs ghost" data-a="pl-refresh">${PL.busy ? '…' : u.tgRefresh}</button></div>
    <div class="row"><input class="input grow" id="pl-q" data-a="pl-q" placeholder="${u.plSearchPh}" value="${esc(PL.q)}" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn sm" data-a="pl-search" style="flex:0 0 auto">🔍</button></div>
    ${list.length ? `<div class="stack-s">${list.map(row).join('')}</div>${PL.more ? `<button class="btn ghost sm" data-a="pl-more" style="align-self:center">${u.plMore}</button>` : ''}` : (PL.list ? `<p class="hint">${u.plEmpty}</p>` : `<p class="hint">${u.frLoading}</p>`)}`;
}
Object.assign(ACT, {
  'pl-q'(el) { PL.q = el.value || ''; },
  'pl-search'() { loadPlayers(true); },
  'pl-refresh'() { loadPlayers(true); },
  'pl-more'() { loadPlayers(false); }
});
/* ---------- referral & partner programmes (sheets opened from the Friends tab) ---------- */
const REFS = { data: null, busy: false }; const PART = { data: null, busy: false, form: { name: '', channel: '', audience: '' } };
const locale = () => (L.code === 'en' ? 'en-GB' : L.code === 'uk' ? 'uk-UA' : L.code === 'pl' ? 'pl-PL' : L.code === 'hy' ? 'hy-AM' : 'ru-RU');
async function loadReferrals(force) { if (REFS.busy || (REFS.data && !force)) return; REFS.busy = true; const d = await api('/api/referrals', {}); REFS.busy = false; if (d.ok) REFS.data = d; render(); }
async function loadPartner(force) { if (PART.busy || (PART.data && !force)) return; PART.busy = true; const d = await api('/api/partner', {}); PART.busy = false; if (d.ok) PART.data = d; render(); }
function linkBox(link, shareText) { const u = U(); return `<div class="fr-link">${esc(link)}</div><div class="btn-row" style="margin-top:8px"><button class="btn primary" data-a="link-share" data-link="${esc(link)}" data-text="${esc(shareText)}">${u.frShare}</button><button class="btn ghost" data-a="link-copy" data-link="${esc(link)}" style="flex:0 0 auto;width:auto">${u.frCopy}</button></div>`; }
function referralSheetHTML() {
  const u = U(); if (!REFS.data && !REFS.busy) setTimeout(() => loadReferrals(false), 0);
  const d = REFS.data; const link = d ? d.link : (S.cloud && S.cloud.ref) || '';
  const ms = [[1, u.refM1], [3, u.refM3], [5, u.refM5], [10, u.refM10], [25, u.refM25], [50, u.refM50]];
  const q = d ? d.qualified : 0;
  const list = d ? ms.map(([n, txt]) => `<div class="row" style="gap:8px;padding:6px 0;border-bottom:1px solid var(--line)"><span class="chk" style="width:22px;height:22px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:13px;font-weight:800;${q >= n ? 'background:var(--gold);color:#0b0a0e' : 'border:1.5px solid var(--line-2);color:var(--muted)'}">${q >= n ? '✓' : n}</span><div class="grow" style="${q >= n ? '' : ''}">${txt}</div></div>`).join('') : '';
  const credits = d ? d.credits : (S.cloud && S.cloud.credits) || { role: 0, scenario: 0 };
  const invitees = d && d.list.length ? `<div class="eyebrow" style="margin-top:12px">${u.refInvitees} · ${d.invited}</div><div class="stack-s">${d.list.slice(0, 20).map(x => `<div class="row" style="gap:8px"><div class="grow" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.name)}${x.username ? ` <span style="color:var(--muted)">@${esc(x.username)}</span>` : ''}</div><span class="${x.qualified ? 'fr-on' : 'fr-off'}" style="font-size:12px">${x.qualified ? '✓ ' + u.refQual : u.refNotYet}</span></div>`).join('')}</div>` : (d ? `<div class="hint" style="margin-top:10px">${u.refEmpty}</div>` : '');
  return `<h2>${u.refTitle}</h2><p class="hint" style="margin:4px 0 10px">${u.refSub}</p>
    <div class="panel" style="border-color:rgba(240,205,122,.5)"><div>${u.refOffer}</div></div>
    <div class="eyebrow" style="margin-top:12px">${u.refMyLink}</div>${link ? linkBox(link, u.refShareText) : `<div class="hint">${u.frLoading}</div>`}
    ${d ? `<div class="status" style="margin-top:12px;grid-template-columns:repeat(2,1fr)"><div class="st"><div class="v num" style="color:var(--gold-2)">${d.invited}</div><div class="k">${u.refInvitees}</div></div><div class="st"><div class="v num" style="color:#9fe0ab">${d.qualified}</div><div class="k">${u.refQual}</div></div></div>
    <div class="hint" style="text-align:center;margin-top:6px">${d.next ? tt(u.refNext, { n: d.next.n - d.qualified }) : u.refDone}</div>` : ''}
    ${(credits.role || credits.scenario) ? `<div class="panel" style="margin-top:10px;border-color:var(--gold)"><div style="font-weight:700">${tt(u.refCredits, { r: credits.role || 0, s: credits.scenario || 0 })}</div><button class="btn sm primary" style="margin-top:8px" data-a="go" data-to="shop">${u.shop}</button></div>` : ''}
    <div class="eyebrow" style="margin-top:12px">${u.refMilestones}</div><div>${list || `<div class="hint">${u.frLoading}</div>`}</div>
    ${invitees}
    <div class="eyebrow" style="margin-top:12px">${u.refHow}</div><div class="hint">${u.refHowText}</div>`;
}
function partnerSheetHTML() {
  const u = U(); if (!PART.data && !PART.busy) setTimeout(() => loadPartner(false), 0);
  const d = PART.data; const adminName = (d && d.support) || 'mafiapro_support';
  let body = '';
  if (!d) body = `<div class="hint">${u.frLoading}</div>`;
  else if (d.status === 'active') {
    const st = d.stats || {}; const usd = (n) => (n * 0.013).toFixed(2);
    const tile = (v, k, col = '') => `<div class="st"><div class="v num" style="${col}">${v}</div><div class="k">${k}</div></div>`;
    body = `<div class="panel" style="border-color:var(--gold)"><div style="font-weight:800;color:var(--gold-2)">${tt(u.ptActive, { share: d.share })}</div></div>
      <div class="eyebrow" style="margin-top:12px">${u.ptLink}</div>${linkBox(d.link, u.refShareText)}
      <div class="hint" style="margin-top:6px">${u.ptLinkApp}: <span class="num" style="word-break:break-all">${esc(d.appLink)}</span></div>
      <div class="status" style="margin-top:12px;grid-template-columns:repeat(3,1fr)">${tile(st.invited || 0, u.ptInvited)}${tile(st.qualified || 0, u.ptQualified, 'color:#9fe0ab')}${tile(st.purchases || 0, u.ptPurchases)}</div>
      <div class="status" style="grid-template-columns:repeat(3,1fr)">${tile((st.earnedStars || 0) + '⭐', u.ptEarned, 'color:var(--gold-2)')}${tile((st.balanceStars || 0) + '⭐', u.ptBalance, 'color:var(--gold-2)')}${tile((st.paidStars || 0) + '⭐', u.ptPaid)}</div>
      <div class="hint" style="text-align:center">${tt(u.ptApprox, { usd: usd(st.balanceStars || 0) })} · ${tt(u.ptPayoutNote, { admin: adminName })}</div>
      ${d.club ? `<div class="panel" style="margin-top:12px;border-color:rgba(240,205,122,.5)"><div class="row" style="gap:10px"><div class="club-logo">${S.cloud && S.cloud.club && S.cloud.club.logo ? `<img src="${esc(S.cloud.club.logo)}" alt="">` : '🏛'}</div><div class="grow" style="min-width:0"><div style="font-weight:800">${esc(d.club.name)}</div><div class="hint" style="margin:0">${u.ptClubReady}</div></div></div><button class="btn sm primary" style="margin-top:10px" data-a="club-open" data-id="${d.club.id}">${u.clubGoto}</button></div>` : ''}
      <div class="eyebrow" style="margin-top:12px">${u.ptMaterials}</div><div class="hint">${u.ptMaterialsText}</div>`;
  } else if (d.status === 'pending') body = `<div class="panel"><div>${u.ptPending}</div></div>`;
  else {
    const f = PART.form;
    body = `${d.status === 'rejected' ? `<div class="hint" style="margin-bottom:8px">${u.ptRejected}</div>` : ''}<div class="eyebrow">${u.ptApply}</div>
      <div class="stack-s" style="margin-top:8px"><input class="input" data-a="pt-f" data-k="name" placeholder="${u.ptName}" value="${esc(f.name)}"><input class="input" data-a="pt-f" data-k="channel" placeholder="${u.ptChannel}" value="${esc(f.channel)}"><input class="input" data-a="pt-f" data-k="audience" placeholder="${u.ptAudience}" value="${esc(f.audience)}"></div>
      <button class="btn primary" style="margin-top:10px" data-a="pt-apply" ${f.name.trim() ? '' : 'disabled'}>${u.ptSend}</button>`;
  }
  return `<h2>${u.ptTitle}</h2><p class="hint" style="margin:4px 0 10px">${u.ptSub}</p>
    <div class="panel" style="border-color:rgba(240,205,122,.5)"><div>${u.ptOffer}</div></div>
    <div class="eyebrow" style="margin-top:12px">${u.ptWho}</div><div class="hint">${u.ptWhoText}</div>
    <div style="margin-top:12px">${body}</div>`;
}
Object.assign(ACT, {
  'ref-open'() { S.ui.sheet = { type: 'referral' }; render(); },
  'pt-open'() { S.ui.sheet = { type: 'partner' }; render(); },
  'link-share'(el) { const url = 'https://t.me/share/url?url=' + encodeURIComponent(el.dataset.link) + '&text=' + encodeURIComponent(el.dataset.text || ''); try { if (TG.app && TG.app.openTelegramLink) TG.app.openTelegramLink(url); else window.open(url, '_blank'); } catch (e) {} },
  async 'link-copy'(el) { const link = el.dataset.link; try { await navigator.clipboard.writeText(link); toast(U().frCopied); } catch (e) { try { const ta = document.createElement('textarea'); ta.value = link; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast(U().frCopied); } catch (e2) {} } },
  'pt-f'(el) { PART.form[el.dataset.k] = el.value || ''; const b = document.querySelector('[data-a="pt-apply"]'); if (b) b.disabled = !PART.form.name.trim(); },
  async 'pt-apply'() { if (!PART.form.name.trim()) return; const d = await api('/api/partner/apply', PART.form); if (!d.ok) { toast(U().tgOffline); return; } PART.data = d; tgHaptic('success'); render(); },
  async 'ref-attach'(el) { const d = await api('/api/ref/attach', { code: el.dataset.id }); if (d.ok && d.attached) { toast(U().refAttached); setTimeout(cloudSync, 800); } },
  async 'claim-free'(el) { const kind = el.dataset.kind, id = el.dataset.id; const d = await api('/api/invoice', { kind: kind === 'scen' ? 'scenario' : kind, id, useCredit: true }); if (!d.ok) { toast(d.error === 'no_credit' ? U().tgNA : U().tgOffline); return; } S.cloud.credits = d.credits || S.cloud.credits; if (kind === 'role') { if (!S.owned.roles.includes(id)) S.owned.roles.push(id); } else { if (!S.owned.scenarios.includes(id)) S.owned.scenarios.push(id); } REFS.data = null; S.ui.sheet = null; toast(U().claimed); tgHaptic('success'); save(); render(); }
});
/* ---------- clubs: list, club page with members and chat, application / edit form ---------- */
const CL = { list: null, mine: null, own: null, invites: [], busy: false, at: 0, cur: null, id: null, chat: [], lastId: 0, timer: null, form: { name: '', city: '', about: '', link: '', logo: '' }, invQ: '', msg: '' };
async function loadClubs(force) { if (!TG.app || !apiBase() || CL.busy || (CL.list && !force && Date.now() - CL.at < 30000)) return; CL.busy = true; const d = await api('/api/clubs', {}); CL.busy = false; if (d.ok) { CL.list = d.clubs; CL.mine = d.mine; CL.own = d.own; CL.invites = d.invites || []; CL.at = Date.now(); } else if (!CL.list) CL.list = []; render(); }
async function loadClub(id, quiet) { const d = await api('/api/club', { id }); if (d.ok) { CL.cur = d; CL.id = id; if (!quiet) render(); } else if (!quiet) { toast(U().tgOffline); } return d.ok; }
async function loadChat(initial) {
  if (!CL.cur || !CL.cur.myRole) return;
  const d = await api('/api/club/chat', { since: initial ? 0 : CL.lastId }); if (!d.ok) return;
  if (initial) { CL.chat = d.messages; } else if (d.messages.length) CL.chat = CL.chat.concat(d.messages).slice(-300);
  if (CL.chat.length) CL.lastId = CL.chat[CL.chat.length - 1].id;
  if (initial || d.messages.length) { render(); scrollChat(); }
}
function scrollChat() { try { const c = document.querySelector('.chat'); if (c) c.scrollTop = c.scrollHeight; } catch (e) {} }
function clubPoll() {
  const want = TG.app && apiBase() && S.screen === 'club' && CL.cur && CL.cur.myRole;
  if (want && !CL.timer) CL.timer = setInterval(() => { if (S.screen !== 'club') { clearInterval(CL.timer); CL.timer = null; return; } loadChat(false); loadClub(CL.id, true).then(() => { const c = document.querySelector('.club-online'); if (c && CL.cur) c.textContent = tt(U().clubOnline, { n: CL.cur.club.online }); }); }, 5000);
  if (!want && CL.timer) { clearInterval(CL.timer); CL.timer = null; }
}
const clubLogoHTML = (c, cls = '') => `<div class="club-logo ${cls}">${c.logo ? `<img src="${esc(c.logo)}" alt="">` : esc((c.name || '?').slice(0, 1).toUpperCase())}</div>`;
function clubsScreen() {
  const u = U();
  if (!TG.app || !apiBase()) return `${topbar(u.clubs, u.clubsSub)}<div class="stack"><div class="panel"><div class="hint">${u.frOnlyTg}</div></div></div>`;
  if ((!CL.list || Date.now() - CL.at > 30000) && !CL.busy) setTimeout(() => loadClubs(false), 0);
  const list = CL.list || [];
  const card = c => `<div class="fr-row" role="button" data-a="club-open" data-id="${c.id}" style="padding:10px">${clubLogoHTML(c)}<div class="grow" style="min-width:0"><div style="font-weight:800;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}${CL.mine && CL.mine.id === c.id ? ` <span class="premium-pill" style="font-size:10px">${u.clubMine}</span>` : ''}</div><div class="hint" style="margin:0">${c.city ? esc(c.city) + ' · ' : ''}${tt(u.clubMembers, { n: c.members })}</div><div style="font-size:12px;margin-top:2px"><span class="${c.online ? 'fr-on' : 'fr-off'}">● ${tt(u.clubOnline, { n: c.online })}</span></div></div></div>`;
  const invites = CL.invites.length ? `<div class="eyebrow">${u.clubInvited}</div><div class="stack-s">${CL.invites.map(c => `<div class="fr-row" style="padding:10px">${clubLogoHTML(c)}<div class="grow" style="min-width:0"><div style="font-weight:800">${esc(c.name)}</div><div class="hint" style="margin:0">${esc(c.city || '')}</div></div><button class="btn xs primary" data-a="club-respond" data-id="${c.id}" data-ok="1">${u.clubAccept}</button><button class="btn xs ghost" data-a="club-respond" data-id="${c.id}" data-ok="0">${u.clubDecline}</button></div>`).join('')}</div>` : '';
  const own = CL.own && CL.own.status !== 'active' ? `<div class="panel"><div style="font-weight:700">${esc(CL.own.name)}</div><div class="hint" style="margin-top:4px">${CL.own.status === 'pending' ? u.clubPending : u.clubRejected}</div></div>` : '';
  const create = !CL.mine && !(CL.own && CL.own.status === 'pending') ? `<div class="panel"><div class="hint" style="margin-bottom:8px">${u.clubCreateHint}</div><button class="btn" data-a="club-create">🏛 ${u.clubCreate}</button></div>` : '';
  return `${topbar(u.clubs, u.clubsSub)}
  <div class="stack">
    ${invites}${own}
    <div class="row"><div class="eyebrow grow">${u.clubs}${CL.list ? ` · ${list.length}` : ''}</div><button class="btn xs ghost" data-a="clubs-refresh">${CL.busy ? '…' : u.tgRefresh}</button></div>
    ${list.length ? `<div class="stack-s">${list.map(card).join('')}</div>` : (CL.list ? `<p class="hint">${u.clubsEmpty}</p>` : `<p class="hint">${u.frLoading}</p>`)}
    ${create}
  </div>`;
}
function clubScreen() {
  const u = U(); const d = CL.cur;
  if (!d || d.club.id !== CL.id) { if (CL.id && !CL.busyClub) { CL.busyClub = true; loadClub(CL.id).then(() => { CL.busyClub = false; loadChat(true); }); } return `${topbar(u.clubs, '')}<div class="stack"><p class="hint">${u.frLoading}</p></div>`; }
  const c = d.club; const me = S.cloud && S.cloud.user ? S.cloud.user.id : 0;
  const roleLabel = r => r === 'owner' ? u.clubHead : r === 'admin' ? u.clubAdmin : u.clubMember;
  const head = `<div class="panel"><div class="row" style="gap:12px">${clubLogoHTML(c, 'lg')}<div class="grow" style="min-width:0"><h2 style="margin:0">${esc(c.name)}</h2><div class="hint" style="margin:2px 0 0">${c.city ? esc(c.city) + ' · ' : ''}${tt(u.clubMembers, { n: c.members })}</div><div style="font-size:12px;margin-top:4px"><span class="${c.online ? 'fr-on' : 'fr-off'} club-online">● ${tt(u.clubOnline, { n: c.online })}</span>${d.myRole ? ` · <span style="color:var(--gold-2)">${roleLabel(d.myRole)}</span>` : ''}</div></div></div>
    ${c.about ? `<div style="margin-top:10px;font-size:14px">${esc(c.about)}</div>` : ''}${c.link ? `<div class="hint" style="margin-top:4px"><a href="${esc(/^https?:/.test(c.link) ? c.link : 'https://' + c.link.replace(/^t\.me\//, 't.me/'))}" target="_blank" rel="noopener" style="color:var(--gold-2)">${esc(c.link)}</a></div>` : ''}
    ${d.myRole ? `<div class="btn-row" style="margin-top:10px"><button class="btn primary" data-a="club-call">🎴 ${u.clubCallTable}</button>${d.canManage ? `<button class="btn ghost" data-a="club-edit" data-id="${c.id}" style="flex:0 0 auto;width:auto">${u.clubEdit}</button>` : ''}</div>` : (d.myRequest === 'apply' ? `<div class="hint" style="margin-top:10px">${u.clubApplied}</div>` : d.myRequest === 'invite' ? `<div class="btn-row" style="margin-top:10px"><button class="btn primary" data-a="club-respond" data-id="${c.id}" data-ok="1">${u.clubAccept}</button><button class="btn ghost" data-a="club-respond" data-id="${c.id}" data-ok="0">${u.clubDecline}</button></div>` : d.inOtherClub ? `<div class="hint" style="margin-top:10px">${u.clubInOther}</div>` : `<button class="btn primary" style="margin-top:10px" data-a="club-join" data-id="${c.id}">${u.clubJoin}</button>`)}</div>`;
  const manage = d.canManage ? `<div class="panel"><div class="eyebrow">${u.clubInvite}</div><div class="row" style="margin-top:8px"><input class="input grow" id="cl-inv-q" data-a="cl-inv-q" placeholder="${u.clubInvitePh}" value="${esc(CL.invQ)}" autocomplete="off" autocapitalize="off"><button class="btn sm" data-a="club-invite" style="flex:0 0 auto">${u.clubInvite}</button></div>
    ${d.requests.length ? `<div class="eyebrow" style="margin-top:12px">${u.clubRequests} · ${d.requests.length}</div><div class="stack-s" style="margin-top:6px">${d.requests.map(r => `<div class="row" style="gap:8px">${friendAvatar(r)}<div class="grow" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>${esc(r.name)}</b>${r.username ? ` <span style="color:var(--muted)">@${esc(r.username)}</span>` : ''} <span class="hint" style="display:inline;margin:0">· ${r.kind === 'apply' ? u.clubRequests.toLowerCase() : u.clubInvited.toLowerCase()}</span></div>${r.kind === 'apply' ? `<button class="btn xs primary" data-a="club-approve" data-id="${r.tgId}" data-ok="1">${u.clubAccept}</button><button class="btn xs ghost" data-a="club-approve" data-id="${r.tgId}" data-ok="0">${u.clubDecline}</button>` : ''}</div>`).join('')}</div>` : ''}</div>` : '';
  const members = `<div class="eyebrow">${u.clubMembersTitle} · ${d.members.length}</div><div class="stack-s">${d.members.map(m => `<div class="fr-row" role="button" data-a="fr-open" data-id="${m.tgId}"><span style="width:0"></span>${friendAvatar(m)}<div class="grow" style="min-width:0"><div class="nm" style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.name)}${m.username ? ` <span style="color:var(--muted);font-weight:500">@${esc(m.username)}</span>` : ''}${m.role !== 'member' ? ` <span class="premium-pill" style="font-size:10px">${roleLabel(m.role)}</span>` : ''}</div><div class="sub" style="font-size:12px;color:var(--fg-2)">${presenceHTML(m)} · ${tt(u.frStats, { g: m.games, w: m.wins })}</div></div><span class="num" style="color:var(--gold-2);font-weight:700">${m.points}</span>${d.canManage && m.role !== 'owner' && m.tgId !== me ? `<button class="btn xs ghost" data-a="club-kick" data-id="${m.tgId}" style="color:var(--muted);border-color:transparent">✕</button>` : ''}</div>`).join('')}</div>`;
  const fmtT = ms => { try { return new Date(ms).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const msgHTML = m => m.kind === 'system' ? `<div class="msg sys">${m.text === '🏛' ? u.clubSysCreated : m.text.startsWith('+') ? tt(u.clubSysJoined, { name: esc(m.text.slice(1)) }) : esc(m.text)}</div>`
    : m.kind === 'lobby' ? `<div class="msg lobby ${m.me ? 'me' : ''}"><div class="who">${esc(m.name)}</div>${esc(tt(u.clubLobbyMsg, { name: m.name, code: m.code }))}<div style="margin-top:6px"><button class="btn xs primary" data-a="club-join-table" data-code="${esc(m.code)}">${u.clubJoinTable} ${esc(m.code)}</button></div><div class="when">${fmtT(m.at)}</div></div>`
    : `<div class="msg ${m.me ? 'me' : ''}">${m.me ? '' : `<div class="who">${esc(m.name)}</div>`}${esc(m.text)}<div class="when">${fmtT(m.at)}</div></div>`;
  const chat = d.myRole ? `<div class="eyebrow">${u.clubChat}</div><div class="panel"><div class="chat">${CL.chat.length ? CL.chat.map(msgHTML).join('') : `<div class="msg sys">${u.clubChatEmpty}</div>`}</div>
    <div class="row" style="margin-top:8px"><input class="input grow" id="cl-msg" data-a="cl-msg" placeholder="${u.clubChatPh}" value="${esc(CL.msg)}" autocomplete="off" maxlength="500"><button class="btn sm primary" data-a="club-send" style="flex:0 0 auto">${u.clubChatSend}</button></div></div>` : '';
  const leave = d.myRole && d.myRole !== 'owner' ? `<button class="btn ghost sm" style="align-self:center;color:var(--crimson-2)" data-a="club-leave-ask">${u.clubLeave}</button>` : '';
  const ask = S.ui.clubLeaveAsk ? `<div class="panel" style="border-color:var(--crimson-2)"><div>${tt(u.clubLeaveAsk, { name: esc(c.name) })}</div><div class="row" style="margin-top:8px"><button class="btn sm grow" data-a="club-leave" style="color:var(--crimson-2)">${u.clubLeave}</button><button class="btn sm ghost" data-a="club-leave-cancel">${u.cancel}</button></div></div>` : '';
  return `${topbar(esc(c.name), c.city ? esc(c.city) : u.clubs)}<div class="stack">${head}${manage}${chat}${members}${ask}${leave}</div>`;
}
function clubEditHTML(id) {
  const u = U(); const f = CL.form; const editing = !!id;
  return `<h2>${editing ? u.clubEdit : u.clubCreate}</h2>${editing ? '' : `<p class="hint" style="margin:4px 0 10px">${u.clubCreateHint}</p>`}
    <div class="row" style="gap:12px;margin-top:8px">${clubLogoHTML({ name: f.name, logo: f.logo }, 'lg')}<div class="stack-s grow"><button class="btn sm file-btn">${u.clubLogoPick}<input type="file" accept="image/*" data-a="cl-logo-file"></button>${f.logo ? `<button class="btn sm ghost" data-a="cl-logo-remove">${u.clubLogoRemove}</button>` : ''}</div></div>
    <div class="stack-s" style="margin-top:12px"><input class="input" data-a="cl-f" data-k="name" placeholder="${u.clubName}" value="${esc(f.name)}" maxlength="48"><input class="input" data-a="cl-f" data-k="city" placeholder="${u.clubCity}" value="${esc(f.city)}" maxlength="48"><input class="input" data-a="cl-f" data-k="link" placeholder="${u.clubLink}" value="${esc(f.link)}" maxlength="160"><textarea class="input" data-a="cl-f" data-k="about" placeholder="${u.clubAbout}" rows="3" maxlength="300" style="min-height:72px">${esc(f.about)}</textarea></div>
    <div class="btn-row" style="margin-top:14px"><button class="btn ghost" data-a="sheet-close">${u.cancel}</button><button class="btn primary" data-a="club-submit" data-id="${id || ''}" ${f.name.trim().length >= 2 ? '' : 'disabled'}>${editing ? u.clubSave : u.clubSend}</button></div>`;
}
/* resize a chosen image to a 96px square JPEG data URL (≈ 4–8 KB) */
function resizeLogo(file, cb) {
  try {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { try { const sz = 96; const cv = document.createElement('canvas'); cv.width = sz; cv.height = sz; const ctx = cv.getContext('2d'); const s = Math.min(img.width, img.height); ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, sz, sz); let q = 0.82, out = cv.toDataURL('image/jpeg', q); while (out.length > 23000 && q > 0.4) { q -= 0.1; out = cv.toDataURL('image/jpeg', q); } URL.revokeObjectURL(url); cb(out); } catch (e) { cb(null); } };
    img.onerror = () => { URL.revokeObjectURL(url); cb(null); }; img.src = url;
  } catch (e) { cb(null); }
}
Object.assign(ACT, {
  'clubs-open'() { go('clubs'); },
  'clubs-refresh'() { loadClubs(true); },
  'club-open'(el) { CL.id = Number(el.dataset.id); CL.cur = null; CL.chat = []; CL.lastId = 0; S.ui.sheet = null; go('club'); },
  'club-create'() { CL.form = { name: '', city: '', about: '', link: '', logo: '' }; S.ui.sheet = { type: 'clubEdit', id: null }; render(); },
  'club-edit'(el) { const c = CL.cur.club; CL.form = { name: c.name, city: c.city, about: c.about, link: c.link, logo: c.logo }; S.ui.sheet = { type: 'clubEdit', id: c.id }; render(); },
  'cl-f'(el) { CL.form[el.dataset.k] = el.value || ''; const b = document.querySelector('[data-a="club-submit"]'); if (b) b.disabled = CL.form.name.trim().length < 2; },
  'cl-logo-file'(el) { const f = el.files && el.files[0]; if (!f) return; resizeLogo(f, out => { if (out) { CL.form.logo = out; render(); } }); },
  'cl-logo-remove'() { CL.form.logo = ''; render(); },
  async 'club-submit'(el) {
    const id = Number(el.dataset.id) || 0; const u = U();
    const d = id ? await api('/api/club/update', Object.assign({ id }, CL.form)) : await api('/api/club/apply', CL.form);
    if (!d.ok) { toast(d.error === 'in_club' ? u.clubInOther : d.error === 'has_club' ? u.clubPending : u.tgOffline); return; }
    S.ui.sheet = null; CL.at = 0; tgHaptic('success');
    if (id) { await loadClub(id); if (d.club && S.cloud && S.cloud.club && S.cloud.club.id === id) Object.assign(S.cloud.club, { name: d.club.name, city: d.club.city, logo: d.club.logo }); CLOUD.clubs = null; } else { toast(u.clubApplied); loadClubs(true); }
    render();
  },
  async 'club-join'(el) { const d = await api('/api/club/join', { id: Number(el.dataset.id) }); if (!d.ok) { toast(d.error === 'in_club' ? U().clubInOther : U().tgOffline); return; } toast(d.status === 'joined' ? U().clubInviteJoined : U().clubApplied); CL.at = 0; await loadClub(CL.id); loadChat(true); },
  async 'club-respond'(el) { const d = await api('/api/club/respond', { id: Number(el.dataset.id), accept: el.dataset.ok === '1' }); if (!d.ok) { toast(d.error === 'in_club' ? U().clubInOther : U().tgOffline); return; } CL.at = 0; if (el.dataset.ok === '1' && !d.gone) { toast(U().clubInviteJoined); tgHaptic('success'); CL.id = Number(el.dataset.id); CL.cur = null; go('club'); } else loadClubs(true); },
  'cl-inv-q'(el) { CL.invQ = el.value || ''; },
  async 'club-invite'() { const q = CL.invQ.trim(); if (!q) return; const d = await api('/api/club/invite', { q }); const u = U(); if (!d.ok) { toast(d.error === 'not_found' ? u.clubNotFound : d.error === 'in_other_club' ? u.clubInviteOther : d.error === 'already_member' ? u.clubAlready : u.tgOffline); return; } CL.invQ = ''; toast(d.status === 'joined' ? u.clubInviteJoined : u.clubInviteSent); tgHaptic('light'); await loadClub(CL.id); },
  async 'club-approve'(el) { const d = await api('/api/club/approve', { tgId: Number(el.dataset.id), accept: el.dataset.ok === '1' }); if (!d.ok) { toast(d.error === 'in_other_club' ? U().clubInviteOther : U().tgOffline); } await loadClub(CL.id); if (el.dataset.ok === '1') loadChat(false); },
  async 'club-kick'(el) { const d = await api('/api/club/kick', { tgId: Number(el.dataset.id) }); if (d.ok) toast(U().clubKicked); await loadClub(CL.id); },
  'club-leave-ask'() { S.ui.clubLeaveAsk = true; render(); },
  'club-leave-cancel'() { S.ui.clubLeaveAsk = false; render(); },
  async 'club-leave'() { S.ui.clubLeaveAsk = false; const d = await api('/api/club/leave', {}); if (!d.ok) { toast(d.error === 'owner' ? U().clubOwnerCantLeave : U().tgOffline); return; } toast(U().clubLeft); CL.at = 0; CL.cur = null; go('clubs'); loadClubs(true); },
  'cl-msg'(el) { CL.msg = el.value || ''; },
  async 'club-send'() { const text = CL.msg.trim(); if (!text) return; CL.msg = ''; const inp = document.querySelector('#cl-msg'); if (inp) inp.value = ''; const d = await api('/api/club/chat/send', { text }); if (!d.ok) { toast(U().tgOffline); CL.msg = text; return; } loadChat(false); },
  async 'club-call'() {
    let l = currentLobby(); if (!lobbyIsOpen() || !l || !l.code) { l = await openTable(false); if (!l) return; }
    let d = await api('/api/club/chat/send', { lobby: l.code });
    if (!d.ok && d.error === 'no_lobby') { l = await openTable(true); if (!l) return; d = await api('/api/club/chat/send', { lobby: l.code }); } // the table had been closed meanwhile → a fresh one
    if (!d.ok) { toast(d.error === 'no_lobby' ? U().clubNoLobby : U().tgOffline); return; }
    toast(U().clubCalled); tgHaptic('success'); loadChat(false);
  },
  'club-join-table'(el) { const url = 'https://t.me/' + (FR.bot || (CLOUD.me && CLOUD.me.bot) || '') + '?start=join_' + el.dataset.code; try { if (TG.app && TG.app.openTelegramLink) TG.app.openTelegramLink(url); else window.open(url, '_blank'); } catch (e) {} }
});
/* ---------- admin: grant full access (all cards / scenarios / packs) for a period ---------- */
const ADM = { q: '', days: 30, grants: null, busy: false };
function adminPanelHTML() {
  if (!TG.app || !apiBase() || !S.cloud || !S.cloud.admin) return '';
  const u = U(); if (!ADM.grants && !ADM.busy) { ADM.busy = true; setTimeout(async () => { const d = await api('/api/admin/grants', {}); ADM.grants = d.ok ? d.grants : []; ADM.busy = false; render(); }, 0); }
  const fmt = ms => new Date(ms).toLocaleDateString(L.code === 'en' ? 'en-GB' : L.code === 'uk' ? 'uk-UA' : L.code === 'pl' ? 'pl-PL' : L.code === 'hy' ? 'hy-AM' : 'ru-RU');
  if (!ADM.partners && !ADM.pbusy) { ADM.pbusy = true; setTimeout(async () => { const d = await api('/api/admin/partners', {}); ADM.partners = d.ok ? d.partners : []; ADM.pbusy = false; render(); }, 0); }
  const prow = p => `<div class="row" style="gap:8px"><div class="grow" style="min-width:0"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>${esc(p.name)}</b>${p.username ? ` <span style="color:var(--muted)">@${esc(p.username)}</span>` : ''} · <span style="color:${p.status === 'active' ? '#9fe0ab' : p.status === 'pending' ? 'var(--gold-2)' : 'var(--muted)'}">${p.status === 'active' ? u.admActive : p.status === 'pending' ? u.admPending : u.admRejected}</span></div><div class="hint" style="margin:0">${esc(p.channel || '')}${p.audience ? ' · ' + esc(p.audience) : ''}${p.stats ? ` · ${p.stats.invited}/${p.stats.qualified} · ${p.stats.earnedStars}⭐` : ''}</div></div>${p.status !== 'active' ? `<button class="btn xs primary" data-a="adm-partner" data-id="${p.tgId}" data-ok="1">${u.admApprove}</button>` : ''}${p.status !== 'rejected' ? `<button class="btn xs ghost" data-a="adm-partner" data-id="${p.tgId}" data-ok="0">${u.admReject}</button>` : ''}</div>`;
  if (!ADM.clubs && !ADM.cbusy) { ADM.cbusy = true; setTimeout(async () => { const d = await api('/api/admin/clubs', {}); ADM.clubs = d.ok ? d.clubs : []; ADM.cbusy = false; render(); }, 0); }
  const crow = c => `<div class="row" style="gap:8px">${clubLogoHTML(c)}<div class="grow" style="min-width:0"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>${esc(c.name)}</b>${c.city ? ` · ${esc(c.city)}` : ''} · <span style="color:${c.status === 'active' ? '#9fe0ab' : c.status === 'pending' ? 'var(--gold-2)' : 'var(--muted)'}">${c.status === 'active' ? u.admActive : c.status === 'pending' ? u.admPending : u.admRejected}</span></div><div class="hint" style="margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.owner)}${c.ownerUsername ? ' @' + esc(c.ownerUsername) : ''} · ${tt(u.clubMembers, { n: c.members })}${c.about ? ' · ' + esc(c.about) : ''}</div></div>${c.status !== 'active' ? `<button class="btn xs primary" data-a="adm-club" data-id="${c.id}" data-ok="1">${u.clubApprove}</button>` : ''}${c.status !== 'rejected' ? `<button class="btn xs ghost" data-a="adm-club" data-id="${c.id}" data-ok="0">${u.clubReject}</button>` : ''}</div>`;
  const clubsAdm = `<div class="eyebrow" style="margin-top:12px">${u.clubAdminTitle}${ADM.clubs ? ` · ${ADM.clubs.length}` : ''}</div>${ADM.clubs ? (ADM.clubs.length ? `<div class="stack-s" style="margin-top:8px">${ADM.clubs.map(crow).join('')}</div>` : `<div class="hint" style="margin-top:6px">—</div>`) : `<div class="hint" style="margin-top:6px">${u.frLoading}</div>`}`;
  const partners = `<div class="eyebrow" style="margin-top:12px">${u.admPartners}${ADM.partners ? ` · ${ADM.partners.length}` : ''}</div>${ADM.partners ? (ADM.partners.length ? `<div class="stack-s" style="margin-top:8px">${ADM.partners.map(prow).join('')}</div>` : `<div class="hint" style="margin-top:6px">—</div>`) : `<div class="hint" style="margin-top:6px">${u.frLoading}</div>`}`;
  const rows = (ADM.grants || []).map(g => `<div class="row" style="gap:8px"><div class="grow" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>${esc(g.name)}</b>${g.username ? ` <span style="color:var(--muted)">@${esc(g.username)}</span>` : ''} · ${fmt(g.until)}</div><button class="btn xs ghost" data-a="adm-revoke" data-id="${g.tgId}">${u.adminRevoke}</button></div>`).join('');
  return `<div class="panel" style="margin-top:12px;border-color:rgba(240,205,122,.5)"><div class="eyebrow gold">${u.adminTitle}</div><div class="hint" style="margin:6px 0 8px">${u.adminHint}</div>
    <div class="row"><input class="input grow" id="adm-q" data-a="adm-q" placeholder="${u.adminPh}" value="${esc(ADM.q)}" autocomplete="off" autocapitalize="off"><input class="input" data-a="adm-days" type="number" min="1" max="3650" value="${ADM.days}" style="width:72px;flex:none" aria-label="${u.adminDays}"><span class="hint" style="margin:0">${u.adminDays}</span></div>
    <button class="btn primary" style="margin-top:8px" data-a="adm-grant">${u.adminGrant}</button>
    <div class="eyebrow" style="margin-top:12px">${u.adminGrants}${ADM.grants ? ` · ${ADM.grants.length}` : ''}</div>
    ${ADM.grants ? (rows ? `<div class="stack-s" style="margin-top:8px">${rows}</div>` : `<div class="hint" style="margin-top:6px">—</div>`) : `<div class="hint" style="margin-top:6px">${u.frLoading}</div>`}
    ${partners}${clubsAdm}</div>`;
}
Object.assign(ACT, {
  'adm-q'(el) { ADM.q = el.value || ''; },
  'adm-days'(el) { ADM.days = Math.max(1, Math.min(3650, Number(el.value) || 30)); },
  async 'adm-grant'() {
    const q = ADM.q.trim(); if (!q) return; const d = await api('/api/admin/grant', { q, days: ADM.days });
    if (!d.ok) { toast(d.error === 'not_found' ? U().adminNotFound : U().tgOffline); return; }
    ADM.grants = d.grants || ADM.grants; ADM.q = ''; toast(tt(U().adminGranted, { name: d.granted.name, date: new Date(d.granted.until).toLocaleDateString() })); tgHaptic('success'); render();
  },
  async 'adm-club'(el) { const d = await api('/api/admin/club', { id: Number(el.dataset.id), approve: el.dataset.ok === '1' }); if (!d.ok) { toast(U().tgOffline); return; } ADM.clubs = d.clubs || []; CL.at = 0; tgHaptic('success'); render(); },
  async 'adm-partner'(el) { const d = await api('/api/admin/partner', { q: String(el.dataset.id), approve: el.dataset.ok === '1' }); if (!d.ok) { toast(U().tgOffline); return; } ADM.partners = d.partners || []; ADM.clubs = null; CL.at = 0; CLOUD.clubs = null; tgHaptic('success'); render(); },
  async 'adm-revoke'(el) { const d = await api('/api/admin/revoke', { q: String(el.dataset.id) }); if (!d.ok) { toast(U().tgOffline); return; } ADM.grants = d.grants || []; toast(U().adminRevoked); render(); }
});
/* global rating panel on the ratings screen; Telegram rating line on my profile */
function cloudTopHTML() {
  const u = U(); if (!TG.app || !apiBase()) return '';
  const av = r => r.photo ? `<img class="avatar sm" src="${esc(r.photo)}" alt="" style="object-fit:cover">` : `<div class="avatar sm" style="--av-bg:var(--bg-3);--av-fg:var(--gold-2)">${esc((r.name || '?').slice(0, 1).toUpperCase())}</div>`;
  const rows = CLOUD.top ? (CLOUD.top.length ? `<div class="stack-s" style="margin-top:10px">${CLOUD.top.map((r, i) => `<div class="rank-row ${i < 3 ? 'top' + (i + 1) : ''} ${S.cloud && S.cloud.user && r.tgId === S.cloud.user.id ? 'me' : ''}" role="button" data-a="fr-open" data-id="${r.tgId}"><span class="pos">${r.rank}</span>${av(r)}<div class="mid"><div class="nm">${esc(r.name)}</div><div class="sub">${r.username ? '@' + esc(r.username) + ' · ' : ''}${tt(u.rtGW, { g: r.games, w: r.wins })}</div></div><span class="pts">${r.points}<span class="k">${u.rtPoints}</span></span></div>`).join('')}</div>` : `<div class="hint" style="margin-top:8px">${u.tgTopEmpty}</div>`) : '';
  return `<div class="panel" style="margin-top:12px"><div class="row"><div class="eyebrow grow">${u.tgTop}</div><button class="btn xs ghost" data-a="tg-top">${CLOUD.top ? u.tgRefresh : u.tgLoad}</button></div><div class="hint" style="margin-top:4px">${u.tgTopHint}</div>${rows}</div>${clubsTopHTML()}<div class="panel" style="margin-top:12px"><div class="stack-s">${playersDirectoryHTML()}</div></div>`;
}
/* top of clubs by members (public endpoint), refreshed every minute while the ratings screen is open */
function clubsTopHTML() {
  const u = U(); if (!TG.app || !apiBase()) return '';
  if ((!CLOUD.clubs || Date.now() - (CLOUD.clubsAt || 0) > 60000) && !CLOUD.clubsBusy) { CLOUD.clubsBusy = true; setTimeout(async () => { const d = await api('/api/clubs/top?limit=30', null, { method: 'GET' }); if (d.ok) CLOUD.clubs = d.top; else if (!CLOUD.clubs) CLOUD.clubs = []; CLOUD.clubsAt = Date.now(); CLOUD.clubsBusy = false; render(); }, 0); }
  const mine = S.cloud && S.cloud.club ? S.cloud.club.id : 0;
  const rows = CLOUD.clubs ? (CLOUD.clubs.length ? `<div class="stack-s" style="margin-top:10px">${CLOUD.clubs.map((c, i) => `<div class="rank-row ${i < 3 ? 'top' + (i + 1) : ''} ${c.id === mine ? 'me' : ''}" role="button" tabindex="0" data-a="club-open" data-id="${c.id}"><span class="pos">${c.rank}</span>${clubLogoHTML(c)}<div class="mid"><div class="nm">${esc(c.name)}</div><div class="sub">${c.partner ? `<span class="premium-pill" style="font-size:9.5px;padding:1px 6px;vertical-align:middle">${u.clubPartner}</span> · ` : ''}${c.city ? esc(c.city) + ' · ' : ''}<span class="${c.online ? 'fr-on' : 'fr-off'}">● ${tt(u.clubOnline, { n: c.online })}</span></div></div><span class="pts">${c.members}<span class="k">${u.clubMembersTitle.toLowerCase()}</span></span></div>`).join('')}</div>` : `<div class="hint" style="margin-top:8px">${u.clubsEmpty}</div>`) : `<div class="hint" style="margin-top:8px">${u.frLoading}</div>`;
  return `<div class="panel" style="margin-top:12px"><div class="row"><div class="eyebrow grow">${u.clubsTop}</div><button class="btn xs ghost" data-a="clubs-top-refresh">${CLOUD.clubsBusy ? '…' : u.tgRefresh}</button></div><div class="hint" style="margin-top:4px">${u.clubsTopHint}</div>${rows}</div>`;
}
/* partner clubs: the host's club brand sits above the game field (dealing, night/day, results) */
function clubBrandHTML() {
  const c = S.cloud && S.cloud.club; if (!TG.app || !c || !c.partner) return '';
  const u = U();
  return `<div class="club-brand" role="button" data-a="club-open" data-id="${c.id}">${clubLogoHTML(c)}<div class="grow" style="min-width:0"><div class="nm">${esc(c.name)}</div><div class="sub">${c.city ? esc(c.city) + ' · ' : ''}${u.clubPartner}</div></div><span class="mp">Mafia <em>Pro</em></span></div>`;
}
function withClubBrand(html) { const b = clubBrandHTML(); if (!b) return html; const i = html.indexOf('<div class="stack">'); return i < 0 ? html : html.slice(0, i) + b + html.slice(i); }
// hooks into the app: haptics on key taps, back button sync after every render, deep-link start
(function () {
  const wrap = (name, kind) => { const f = ACT[name]; if (!f) return; ACT[name] = function (el) { tgHaptic(kind); return f.call(this, el); }; };
  wrap('flip', 'impact'); wrap('confirm', 'light'); wrap('vote-finish', 'success'); wrap('vote-close', 'success'); wrap('kam-confirm', 'warning'); wrap('roulette-guess', 'light'); wrap('lift-finish', 'success'); wrap('finish', 'success');
  try { document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'fr-q') { e.preventDefault(); ACT['fr-search'](); } }); } catch (e) {}
  const origRender = render;
  render = function () { origRender(); if (TG.app) { tgSync(); try { lobbyPoll(); clubPoll(); } catch (e) {} } if (S.ui && S.ui.tgStart) { const st = S.ui.tgStart; S.ui.tgStart = null; if (ACT[st.a]) ACT[st.a]({ dataset: { id: st.id } }); } };
  // dealing screen: the "cards via Telegram" panel sits above the first card until dealing starts
  const origDeal = dealScreen;
  dealScreen = function () { const html = withClubBrand(origDeal()); const g = S.game; if (!TG.app || !apiBase() || !g || S.ui.showAll || (g.dealIdx > 0 && !g.tg) || g.dealIdx >= g.players.length) return html; const i = html.indexOf('<div class="stack">'); return i < 0 ? html : html.slice(0, i + 19) + lobbyPanelHTML(g) + html.slice(i + 19); };
  const origRatings = ratingsScreen;
  ratingsScreen = function () { const html = origRatings(); const extra = cloudTopHTML(); if (!extra) return html; const i = html.lastIndexOf('</div>'); return i < 0 ? html + extra : html.slice(0, i) + extra + html.slice(i); };
  // partner club branding above the game field
  const origGame = gameScreen; gameScreen = function () { return withClubBrand(origGame()); };
  const origEnd = endScreen; endScreen = function () { return withClubBrand(origEnd()); };
  try { document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'pl-q') { e.preventDefault(); ACT['pl-search'](); } if (e.key === 'Enter' && e.target && e.target.id === 'cl-msg') { e.preventDefault(); ACT['club-send'](); } if (e.key === 'Enter' && e.target && e.target.id === 'cl-inv-q') { e.preventDefault(); ACT['club-invite'](); } }); } catch (e) {}
  const origSheet = sheetHTML;
  sheetHTML = function (enter) { const sh = S.ui.sheet; if (sh && (sh.type === 'referral' || sh.type === 'partner')) { const body = sh.type === 'referral' ? referralSheetHTML() : partnerSheetHTML(); const u = U(); return `<div class="sheet-bg ${enter !== false ? 'enter' : ''}" data-a="sheet-close"><div class="sheet" data-stop="1"><div class="grab"></div>${body}<button class="btn ghost" style="margin-top:14px" data-a="sheet-close">${u.close}</button></div></div>`; } return origSheet(enter); };
  const origSettings = settingsScreen;
  settingsScreen = function () { const html = origSettings(); const extra = adminPanelHTML(); if (!extra) return html; const i = html.indexOf('<div class="panel" style="margin-top:12px">'); return i < 0 ? html + extra : html.slice(0, i) + extra + html.slice(i); };
  // my profile: the Telegram-wide statistics (rating, cards, recent games from the server) sit above the device-only stats
  const origProfile = profileScreen;
  profileScreen = function () {
    const html = origProfile(); const pr = profById(S.ui.profileId); if (!pr || !TG.app || !apiBase() || !S.cloud || !S.cloud.user || pr.tgId !== S.cloud.user.id) return html;
    const u = U(); const id = S.cloud.user.id; loadPlayerProfile(id, false); const c = FRP[id]; const d = c && !c.loading && !c.error ? c : null;
    const r = (d && d.rating) || Object.assign({}, S.cloud.rating || {}, { points: 1000 + ((S.cloud.rating || {}).points || 0) });
    const cloud = `<div class="panel" style="border-color:rgba(240,205,122,.45)"><div class="row"><div class="eyebrow gold grow">☁︎ ${u.psCloud}</div><button class="btn xs ghost" data-a="ps-open" data-id="${id}">${u.psBtn}</button></div>
      ${d ? cloudStatsHTML(d, { allRoles: false, sides: false, recent: 5 }) : `<div class="status" style="margin-top:8px"><div class="st"><div class="v num" style="color:var(--gold-2)">${r.points || 1000}</div><div class="k">${u.rating}</div></div><div class="st"><div class="v num">${r.games || 0}</div><div class="k">${u.games}</div></div><div class="st"><div class="v num" style="color:#9fe0ab">${r.wins || 0}</div><div class="k">${u.wins}</div></div></div>${c && c.error ? '' : `<div class="hint" style="text-align:center">${u.frLoading}</div>`}`}</div>`;
    const marker = '<div class="eyebrow">' + u.stats + '</div>'; const i = html.indexOf(marker); return i < 0 ? html : html.slice(0, i) + cloud + `<div class="eyebrow">${u.psLocal}</div>` + html.slice(i + marker.length);
  };
  // creating the game: the pre-game table becomes the game's table, seats map to players, cards go out at once
  const origDealAct = ACT.deal;
  ACT.deal = function (el) {
    const seatsBefore = S.lobby && S.lobby.code ? S.lobby : null;
    const r = origDealAct.call(this, el);
    const g = S.game; if (!g || !seatsBefore) return r;
    const map = {}; seatsBefore.players.forEach(pl => { const i = seatsBefore.seats && seatsBefore.seats[pl.tgId]; if (i !== undefined && i < g.players.length) map[pl.tgId] = g.players[i].seat; });
    g.tg = { code: seatsBefore.code, link: seatsBefore.link, players: seatsBefore.players, map, sent: [] }; S.lobby = null; save();
    if (TG.app && apiBase() && Object.keys(map).length) sendCards(g, true).then(n => { if (n) { toast(tt(U().tgAutoSent, { n })); tgHaptic('success'); } });
    return r;
  };
  const origHide = ACT.hide;
  ACT.hide = function (el) { const r = origHide.call(this, el); if (S.game) { skipDeliveredSeats(S.game); render(); } return r; };
  const origFinish = finishGame;
  finishGame = function (g, w) { const was = g.recorded; origFinish(g, w); if (!was && g.recorded && w) { try { sendResult(g, w); } catch (e) {} } if (g.tg && g.tg.code) { try { clearTableSeats(); save(); } catch (e) {} } }; // the table's seats are history: the next table starts empty
})();
