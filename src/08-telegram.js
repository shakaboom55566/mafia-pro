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
    if (added) toast(U().tgSynced);
    if (S.game && S.game.winner && S.game.recorded && !S.game.cloudSent) sendResult(S.game, S.game.winner);
    save(); render();
  } finally { CLOUD.busy = false; }
}
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
    return { seat: p.seat, name: p.name, tgId: tgId ? Number(tgId) : null, roleId: p.roleId, won, points: pointsFor(p.roleId, won, p.alive, solo) + useful };
  });
  api('/api/game/result', { game: { id: g.id, mode: isClassic(g) ? 'classic' : 'extended', winner: w.side, code: g.tg && g.tg.code, players } }).then(d => { if (d.ok) { g.cloudSent = true; save(); } });
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
    if (tgl.map[pl.tgId] !== undefined) return;
    const norm = s => String(s || '').toLowerCase().replace(/^@/, '').trim();
    let seat = (g.players.find(p => !taken.has(p.seat) && norm(p.name) && (norm(p.name) === norm(pl.name) || (pl.username && norm(p.name) === norm(pl.username)))) || {}).seat;
    if (!seat) { const pr = S.profiles.find(x => x.tgId === pl.tgId); const gp = pr && g.players.find(p => p.profileId === pr.id && !taken.has(p.seat)); seat = gp ? gp.seat : 0; }
    if (!seat) seat = (g.players.find(p => !taken.has(p.seat)) || {}).seat || 0;
    tgl.map[pl.tgId] = seat; if (seat) taken.add(seat);
  });
}
/* the table lives in S.lobby before the game exists and moves into S.game.tg when the game is created */
function currentLobby() { return S.game && S.game.tg ? S.game.tg : (S.lobby || null); }
function lobbyIsOpen() { const l = currentLobby(); return !!(l && l.code && !(S.game && S.game.dealIdx >= S.game.players.length)); }
async function openTable(fresh) {
  const d = await api('/api/lobby', { fresh: !!fresh }); if (!d.ok) { toast(U().tgOffline); return null; }
  const l = { code: d.code, link: d.link, players: d.players || [], map: {}, sent: [], seats: {} };
  if (S.game) { S.game.tg = l; lobbyAutoSeat(S.game); } else { S.lobby = l; setupAutoSeat(); }
  save(); render(); return l;
}
async function refreshTable() {
  const l = currentLobby(); if (!l || !l.code) return;
  const d = await api('/api/lobby/status', { code: l.code }); if (!d.ok) return false;
  const before = l.players.length; l.players = d.players || [];
  if (S.game && S.game.tg === l) lobbyAutoSeat(S.game); else setupAutoSeat();
  save(); render(); return l.players.length !== before;
}
/* setup screen: joined players take seats — by matching name, else the first empty seat; seats[tgId] = seat index */
function setupAutoSeat() {
  const l = S.lobby; if (!l) return; l.seats = l.seats || {}; const st = S.setup; st.names = st.names || [];
  const norm = s => String(s || '').toLowerCase().replace(/^@/, '').trim(); const taken = new Set(Object.values(l.seats));
  l.players.forEach(pl => {
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
  return `<div class="panel"><div class="row"><div class="eyebrow grow">${tt(u.tgTable, { code: l.code })}</div><div class="hint" style="margin:0">${tt(u.tgJoined, { n: l.players.length })}</div></div>
    <div class="row" style="margin-top:8px"><button class="btn sm grow" data-a="tg-share">${u.tgShare}</button><button class="btn sm grow" data-a="fr-go">${u.frInviteFriends}</button><button class="btn sm ghost" data-a="tg-lobby-refresh">${u.tgRefresh}</button></div>
    ${l.players.length ? `<div class="stack-s" style="margin-top:10px">${rows}</div>${unseated ? `<button class="btn sm" style="margin-top:8px" data-a="tg-seat-all">${u.tgSeatAll}</button>` : ''}` : `<div class="hint" style="margin-top:10px">${u.tgWaiting}</div>`}
    <button class="btn xs ghost" style="margin-top:8px;align-self:flex-start" data-a="tg-close-table">${u.tgCloseTable}</button></div>`;
}
/* send cards to every mapped player of the game's table; returns the number sent */
async function sendCards(g, onlyUnsent) {
  const l = g.tg; if (!l || !l.code) return 0;
  const cards = l.players.filter(pl => l.map[pl.tgId] && !(onlyUnsent && (l.sent || []).includes(pl.tgId))).map(pl => { const p = g.players.find(x => x.seat === l.map[pl.tgId]); return { tgId: pl.tgId, seat: p.seat, text: cardTextFor(p, pl.lang) }; });
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
  if (want && !lobbyTimer) lobbyTimer = setInterval(() => { if (!lobbyIsOpen() || !['setup', 'deal', 'friends'].includes(S.screen)) { clearInterval(lobbyTimer); lobbyTimer = null; return; } refreshTable(); }, 6000);
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
  'tg-close-table'() { S.lobby = null; save(); render(); },
  'tg-share'() {
    const l = currentLobby(); if (!l || !l.link) return; const url = 'https://t.me/share/url?url=' + encodeURIComponent(l.link) + '&text=' + encodeURIComponent(U().tgShareText);
    try { if (TG.app && TG.app.openTelegramLink) TG.app.openTelegramLink(url); else window.open(url, '_blank'); } catch (e) {}
  },
  'tg-seat'(el) { const g = S.game; if (!g || !g.tg) return; const seat = Number(el.value) || 0; Object.keys(g.tg.map).forEach(k => { if (seat && g.tg.map[k] === seat && k !== el.dataset.tg) g.tg.map[k] = 0; }); g.tg.map[el.dataset.tg] = seat; save(); render(); },
  async 'tg-deal'() { const g = S.game; if (!g || !g.tg) return; const n = await sendCards(g, true); if (n) { toast(tt(U().tgSent, { n })); tgHaptic('success'); } },
  'tg-deal-done'() { const g = S.game; if (!g) return; g.dealIdx = g.players.length; g.dealOpen = false; S.ui.showAll = false; save(); render(); },
  async 'tg-top'() { const d = await api('/api/leaderboard?limit=30', null, { method: 'GET' }); CLOUD.top = d.ok ? d.top : []; if (!d.ok) toast(U().tgOffline); render(); }
});
/* ---------- friends: invite link, list, invite to my table ---------- */
const FR = { list: null, link: '', code: '', bot: '', busy: false, at: 0 };
async function loadFriends(force) {
  if (!TG.app || !apiBase() || FR.busy) return; if (FR.list && !force && Date.now() - FR.at < 60000) return;
  FR.busy = true; render();
  try { const d = await api('/api/friends', {}); if (d.ok) { FR.list = d.friends || []; FR.link = d.invite.link; FR.code = d.invite.code; FR.bot = d.bot; FR.at = Date.now(); S.ui.frSel = (S.ui.frSel || []).filter(id => FR.list.some(f => f.tgId === id)); } else if (!FR.list) FR.list = []; }
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
  const rows = list.map(f => `<div class="fr-row ${sel.includes(f.tgId) ? 'sel' : ''}" role="button" tabindex="0" data-a="fr-toggle" data-id="${f.tgId}"><span class="chk">${sel.includes(f.tgId) ? '✓' : ''}</span>${friendAvatar(f)}<div class="grow" style="min-width:0"><div class="nm" style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}${f.username ? ` <span style="color:var(--muted);font-weight:500">@${esc(f.username)}</span>` : ''}</div><div class="sub" style="font-size:12px;color:var(--fg-2)">${tt(u.frStats, { g: f.games, w: f.wins })}</div></div><span class="num" style="color:var(--gold-2);font-weight:700">${f.points}</span><button class="btn xs ghost" data-a="fr-remove-ask" data-id="${f.tgId}" aria-label="${u.frRemove}" style="color:var(--muted);border-color:transparent">✕</button></div>`).join('');
  const ask = S.ui.frAsk ? (() => { const f = list.find(x => x.tgId === S.ui.frAsk); return f ? `<div class="panel" style="border-color:var(--crimson-2)"><div>${tt(u.frRemoveAsk, { name: esc(f.name) })}</div><div class="row" style="margin-top:8px"><button class="btn sm grow" data-a="fr-remove" data-id="${f.tgId}" style="color:var(--crimson-2)">${u.frRemove}</button><button class="btn sm ghost" data-a="fr-ask-cancel">${u.cancel}</button></div></div>` : ''; })() : '';
  const cl = currentLobby();
  const inviteBar = list.length ? `<button class="btn primary" data-a="fr-invite" ${sel.length ? '' : 'disabled'}>${tt(u.frInviteTable, { n: sel.length })}</button>${lobbyOpen && cl ? `<div class="hint" style="text-align:center">${tt(u.frTable, { code: cl.code, n: sel.length })}</div>` : (!g ? `<div class="hint" style="text-align:center">${u.frNoGame}</div>` : '')}` : '';
  return `${topbar(u.frTitle, u.frSub, false)}
  <div class="stack">
    ${linkPanel}
    <div class="row"><div class="eyebrow grow">${u.frList}${list.length ? ` · ${list.length}` : ''}</div>${list.length ? `<button class="btn xs ghost" data-a="fr-sel-all">${sel.length === list.length ? u.frInviteNone : u.frInviteAll}</button>` : ''}<button class="btn xs ghost" data-a="fr-refresh">${FR.busy ? '…' : u.frRefresh}</button></div>
    ${ask}
    ${list.length ? `<div class="stack-s">${rows}</div>` : (FR.list ? `<div class="panel" style="text-align:center"><div style="font-weight:700">${u.frEmpty}</div><div class="hint" style="margin-top:4px">${u.frEmptyHint}</div></div>` : `<div class="hint" style="text-align:center">${u.frLoading}</div>`)}
    ${inviteBar}
  </div>`;
}
Object.assign(ACT, {
  'fr-go'() { go('friends'); },
  'fr-refresh'() { loadFriends(true); },
  'fr-toggle'(el) { const id = Number(el.dataset.id); const sel = S.ui.frSel = S.ui.frSel || []; const i = sel.indexOf(id); if (i >= 0) sel.splice(i, 1); else sel.push(id); render(); },
  'fr-sel-all'() { const list = FR.list || []; S.ui.frSel = (S.ui.frSel || []).length === list.length ? [] : list.map(f => f.tgId); render(); },
  'fr-share'() { if (!FR.link) return; const url = 'https://t.me/share/url?url=' + encodeURIComponent(FR.link) + '&text=' + encodeURIComponent(U().frShareText); try { if (TG.app && TG.app.openTelegramLink) TG.app.openTelegramLink(url); else window.open(url, '_blank'); } catch (e) {} },
  async 'fr-copy'() { if (!FR.link) return; try { await navigator.clipboard.writeText(FR.link); toast(U().frCopied); } catch (e) { try { const ta = document.createElement('textarea'); ta.value = FR.link; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast(U().frCopied); } catch (e2) {} } },
  'fr-remove-ask'(el) { S.ui.frAsk = Number(el.dataset.id); render(); },
  'fr-ask-cancel'() { S.ui.frAsk = null; render(); },
  async 'fr-remove'(el) { const id = Number(el.dataset.id); S.ui.frAsk = null; const d = await api('/api/friends/remove', { friendId: id }); if (d.ok) { FR.list = (FR.list || []).filter(f => f.tgId !== id); S.ui.frSel = (S.ui.frSel || []).filter(x => x !== id); toast(U().frRemoved); } else toast(U().tgOffline); render(); },
  async 'fr-accept'(el) { const code = el.dataset.id; const d = await api('/api/friends/accept', { code }); if (d.ok && d.friend) { toast(tt(U().frAccepted, { name: d.friend.name })); FR.at = 0; } else if (!d.ok) toast(d.error === 'not_found' ? U().tgNA : U().tgOffline); go('friends'); },
  async 'fr-invite'() {
    const sel = (S.ui.frSel || []).slice(); if (!sel.length) return;
    if (!S.game) { // no game yet: open the pre-game table and invite there; seats are filled on the setup screen
      if (!lobbyIsOpen()) { if (!(await openTable(false))) return; }
      const r0 = await api('/api/friends/invite', { code: S.lobby.code, friendIds: sel }); if (!r0.ok) { toast(U().tgOffline); return; }
      toast(tt(U().frInvited, { n: (r0.sent || []).length }) + ((r0.failed || []).length ? ' · ' + tt(U().frInviteFail, { n: r0.failed.length }) : '')); tgHaptic('success'); S.ui.frSel = []; render(); return;
    }
    const g = S.game;
    if (!g.tg || !g.tg.code || g.dealIdx >= g.players.length) { if (!(await openTable(!!(g.tg && g.tg.code)))) return; }
    const r = await api('/api/friends/invite', { code: g.tg.code, friendIds: sel });
    if (!r.ok) { toast(U().tgOffline); return; }
    toast(tt(U().frInvited, { n: (r.sent || []).length }) + ((r.failed || []).length ? ' · ' + tt(U().frInviteFail, { n: r.failed.length }) : '')); tgHaptic('success'); S.ui.frSel = []; render();
  }
});
/* global rating panel on the ratings screen; Telegram rating line on my profile */
function cloudTopHTML() {
  const u = U(); if (!TG.app || !apiBase()) return '';
  const av = r => r.photo ? `<img class="avatar sm" src="${esc(r.photo)}" alt="" style="object-fit:cover">` : `<div class="avatar sm" style="--av-bg:var(--bg-3);--av-fg:var(--gold-2)">${esc((r.name || '?').slice(0, 1).toUpperCase())}</div>`;
  const rows = CLOUD.top ? (CLOUD.top.length ? `<div class="stack-s" style="margin-top:10px">${CLOUD.top.map((r, i) => `<div class="rank-row ${i < 3 ? 'top' + (i + 1) : ''} ${S.cloud && S.cloud.user && r.tgId === S.cloud.user.id ? 'me' : ''}"><span class="pos">${r.rank}</span>${av(r)}<div class="mid"><div class="nm">${esc(r.name)}</div><div class="sub">${r.username ? '@' + esc(r.username) + ' · ' : ''}${tt(u.rtGW, { g: r.games, w: r.wins })}</div></div><span class="pts">${r.points}<span class="k">${u.rtPoints}</span></span></div>`).join('')}</div>` : `<div class="hint" style="margin-top:8px">${u.tgTopEmpty}</div>`) : '';
  return `<div class="panel" style="margin-top:12px"><div class="row"><div class="eyebrow grow">${u.tgTop}</div><button class="btn xs ghost" data-a="tg-top">${CLOUD.top ? u.tgRefresh : u.tgLoad}</button></div><div class="hint" style="margin-top:4px">${u.tgTopHint}</div>${rows}</div>`;
}
// hooks into the app: haptics on key taps, back button sync after every render, deep-link start
(function () {
  const wrap = (name, kind) => { const f = ACT[name]; if (!f) return; ACT[name] = function (el) { tgHaptic(kind); return f.call(this, el); }; };
  wrap('flip', 'impact'); wrap('confirm', 'light'); wrap('vote-finish', 'success'); wrap('vote-close', 'success'); wrap('kam-confirm', 'warning'); wrap('roulette-guess', 'light'); wrap('lift-finish', 'success'); wrap('finish', 'success');
  const origRender = render;
  render = function () { origRender(); if (TG.app) { tgSync(); try { lobbyPoll(); } catch (e) {} } if (S.ui && S.ui.tgStart) { const st = S.ui.tgStart; S.ui.tgStart = null; if (ACT[st.a]) ACT[st.a]({ dataset: { id: st.id } }); } };
  // dealing screen: the "cards via Telegram" panel sits above the first card until dealing starts
  const origDeal = dealScreen;
  dealScreen = function () { const html = origDeal(); const g = S.game; if (!TG.app || !apiBase() || !g || S.ui.showAll || (g.dealIdx > 0 && !g.tg) || g.dealIdx >= g.players.length) return html; const i = html.indexOf('<div class="stack">'); return i < 0 ? html : html.slice(0, i + 19) + lobbyPanelHTML(g) + html.slice(i + 19); };
  const origRatings = ratingsScreen;
  ratingsScreen = function () { const html = origRatings(); const extra = cloudTopHTML(); if (!extra) return html; const i = html.lastIndexOf('</div>'); return i < 0 ? html + extra : html.slice(0, i) + extra + html.slice(i); };
  const origProfile = profileScreen;
  profileScreen = function () { const html = origProfile(); const pr = profById(S.ui.profileId); if (!pr || !S.cloud || !S.cloud.user || pr.tgId !== S.cloud.user.id) return html; const r = S.cloud.rating || {}; const line = `<div class="quiet" style="text-align:center">☁︎ ${esc(U().tgRating)}: <b class="num" style="color:var(--gold-2)">${1000 + (r.points || 0)}</b> · ${esc(U().games)}: ${r.games || 0} · ${esc(U().wins)}: ${r.wins || 0}</div>`; const i = html.indexOf('<div class="eyebrow">' + U().stats + '</div>'); return i < 0 ? html : html.slice(0, i) + line + html.slice(i); };
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
  finishGame = function (g, w) { const was = g.recorded; origFinish(g, w); if (!was && g.recorded && w) { try { sendResult(g, w); } catch (e) {} } };
})();
