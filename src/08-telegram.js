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
function lobbyPanelHTML(g) {
  const u = U(); const tgl = g.tg;
  if (!tgl) return `<div class="panel"><div class="eyebrow">${u.tgCards}</div><div class="hint" style="margin:6px 0 10px">${u.tgCardsHint}</div><button class="btn" data-a="tg-lobby">${u.tgOpenTable}</button></div>`;
  const seatOpts = cur => `<option value="0" ${!cur ? 'selected' : ''}>${u.tgNoSeat}</option>` + g.players.map(p => `<option value="${p.seat}" ${cur === p.seat ? 'selected' : ''}>${p.seat} · ${esc(p.name)}</option>`).join('');
  const rows = tgl.players.map(pl => `<div class="row" style="align-items:center;gap:8px"><div class="grow" style="min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(pl.name)}${tgl.sent && tgl.sent.includes(pl.tgId) ? ' ✅' : ''}</div>${pl.username ? `<div class="hint" style="margin:0">@${esc(pl.username)}</div>` : ''}</div><select class="input" style="width:46%;flex:none" data-a="tg-seat" data-tg="${pl.tgId}">${seatOpts(tgl.map[pl.tgId])}</select></div>`).join('');
  const n = tgl.players.filter(pl => tgl.map[pl.tgId]).length;
  return `<div class="panel"><div class="row"><div class="eyebrow grow">${tt(u.tgTable, { code: tgl.code })}</div><div class="hint" style="margin:0">${tt(u.tgJoined, { n: tgl.players.length })}</div></div>
    <div class="row" style="margin-top:8px"><button class="btn sm grow" data-a="tg-share">${u.tgShare}</button><button class="btn sm ghost" data-a="tg-lobby-refresh">${u.tgRefresh}</button></div>
    ${tgl.players.length ? `<div class="stack-s" style="margin-top:10px">${rows}</div>` : `<div class="hint" style="margin-top:10px">${u.tgNobody}</div>`}
    ${tgl.players.length ? `<button class="btn primary" style="margin-top:10px" data-a="tg-deal" ${n ? '' : 'disabled'}>${tt(u.tgSendCards, { n })}</button>` : ''}
    ${tgl.sent && tgl.sent.length ? `<button class="btn" style="margin-top:8px" data-a="tg-deal-done">${u.tgDealDone}</button>` : ''}</div>`;
}
Object.assign(ACT, {
  async 'tg-lobby'() {
    const g = S.game; if (!g) return; const d = await api('/api/lobby', { fresh: !!(g.tg && g.tg.code) });
    if (!d.ok) { toast(U().tgOffline); return; }
    g.tg = { code: d.code, link: d.link, players: d.players || [], map: {}, sent: [] }; lobbyAutoSeat(g); save(); render();
  },
  async 'tg-lobby-refresh'() {
    const g = S.game; if (!g || !g.tg) return; const d = await api('/api/lobby/status', { code: g.tg.code });
    if (!d.ok) { toast(U().tgOffline); return; }
    g.tg.players = d.players || []; lobbyAutoSeat(g); save(); render();
  },
  'tg-share'() {
    const g = S.game; if (!g || !g.tg) return; const url = 'https://t.me/share/url?url=' + encodeURIComponent(g.tg.link) + '&text=' + encodeURIComponent(U().tgShareText);
    try { if (TG.app && TG.app.openTelegramLink) TG.app.openTelegramLink(url); else window.open(url, '_blank'); } catch (e) {}
  },
  'tg-seat'(el) { const g = S.game; if (!g || !g.tg) return; const seat = Number(el.value) || 0; Object.keys(g.tg.map).forEach(k => { if (seat && g.tg.map[k] === seat && k !== el.dataset.tg) g.tg.map[k] = 0; }); g.tg.map[el.dataset.tg] = seat; save(); render(); },
  async 'tg-deal'() {
    const g = S.game; if (!g || !g.tg) return;
    const cards = g.tg.players.filter(pl => g.tg.map[pl.tgId]).map(pl => { const p = g.players.find(x => x.seat === g.tg.map[pl.tgId]); return { tgId: pl.tgId, seat: p.seat, text: cardTextFor(p, pl.lang) }; });
    if (!cards.length) return;
    const d = await api('/api/lobby/deal', { code: g.tg.code, cards });
    if (!d.ok) { toast(U().tgOffline); return; }
    g.tg.sent = (g.tg.sent || []).concat(d.sent || []).filter((v, i, a) => a.indexOf(v) === i);
    toast(tt(U().tgSent, { n: (d.sent || []).length }) + ((d.failed || []).length ? ' · ' + tt(U().tgFailed, { n: d.failed.length }) : '')); tgHaptic('success'); save(); render();
  },
  'tg-deal-done'() { const g = S.game; if (!g) return; g.dealIdx = g.players.length; g.dealOpen = false; S.ui.showAll = false; save(); render(); },
  async 'tg-top'() { const d = await api('/api/leaderboard?limit=30', null, { method: 'GET' }); CLOUD.top = d.ok ? d.top : []; if (!d.ok) toast(U().tgOffline); render(); }
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
  render = function () { origRender(); if (TG.app) tgSync(); if (S.ui && S.ui.tgStart) { const st = S.ui.tgStart; S.ui.tgStart = null; if (ACT[st.a]) ACT[st.a]({ dataset: { id: st.id } }); } };
  // dealing screen: the "cards via Telegram" panel sits above the first card until dealing starts
  const origDeal = dealScreen;
  dealScreen = function () { const html = origDeal(); const g = S.game; if (!TG.app || !apiBase() || !g || S.ui.showAll || (g.dealIdx > 0 && !g.tg) || g.dealIdx >= g.players.length) return html; const i = html.indexOf('<div class="stack">'); return i < 0 ? html : html.slice(0, i + 19) + lobbyPanelHTML(g) + html.slice(i + 19); };
  const origRatings = ratingsScreen;
  ratingsScreen = function () { const html = origRatings(); const extra = cloudTopHTML(); if (!extra) return html; const i = html.lastIndexOf('</div>'); return i < 0 ? html + extra : html.slice(0, i) + extra + html.slice(i); };
  const origProfile = profileScreen;
  profileScreen = function () { const html = origProfile(); const pr = profById(S.ui.profileId); if (!pr || !S.cloud || !S.cloud.user || pr.tgId !== S.cloud.user.id) return html; const r = S.cloud.rating || {}; const line = `<div class="quiet" style="text-align:center">☁︎ ${esc(U().tgRating)}: <b class="num" style="color:var(--gold-2)">${1000 + (r.points || 0)}</b> · ${esc(U().games)}: ${r.games || 0} · ${esc(U().wins)}: ${r.wins || 0}</div>`; const i = html.indexOf('<div class="eyebrow">' + U().stats + '</div>'); return i < 0 ? html : html.slice(0, i) + line + html.slice(i); };
  const origFinish = finishGame;
  finishGame = function (g, w) { const was = g.recorded; origFinish(g, w); if (!was && g.recorded && w) { try { sendResult(g, w); } catch (e) {} } };
})();
