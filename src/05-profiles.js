/* ============================================================
   PROFILES, STATS, RATINGS, 3D CARD
   ============================================================ */
const AV_COLORS = [['#3a2a5c', '#d7c4ff'], ['#5a1f1b', '#f3b3ad'], ['#2d3d33', '#c3dbca'], ['#3b2d1a', '#f0cd7a'], ['#1a2140', '#b9c6f5'], ['#3a3f4d', '#d6dbe6']];
function profById(id) { return S.profiles.find(p => p.id === id) || null; }
function initials(name) { return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?'; }
function avatarHTML(pr, cls = '') {
  const [bg, fg] = AV_COLORS[(pr.color || 0) % AV_COLORS.length];
  const inner = pr.avatar ? `<img src="${pr.avatar}" alt="">` : esc(initials(pr.name));
  return `<div class="avatar ${cls}" style="--av-bg:${bg};--av-fg:${fg}">${inner}</div>`;
}
function newProfile(d = {}) {
  return Object.assign({ id: uid(), name: '', username: '', city: '', country: '', avatar: null, tgId: null, color: Math.floor(Math.random() * AV_COLORS.length), createdAt: Date.now(), history: [], likes: 0, likedByMe: false, demo: false }, d);
}
function ensureMe() {
  try {
    const u = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user;
    if (!u) return;
    let me = S.profiles.find(p => p.tgId === u.id);
    if (!me) { me = newProfile({ name: [u.first_name, u.last_name].filter(Boolean).join(' '), username: u.username || '', avatar: u.photo_url || null, tgId: u.id }); S.profiles.unshift(me); }
    S.meId = me.id;
  } catch (e) {}
}

/* ---------- stats ---------- */
function pointsFor(roleId, won, survived, soloWin) {
  if (!won) return -10;
  let p = soloWin ? 40 : 24; if (survived) p += 4; return p;
}
function profStats(pr, since = 0) {
  const h = pr.history.filter(x => x.date >= since);
  const st = { games: h.length, wins: 0, points: 0, killedN1: 0, votedD1: 0, survived: 0, byRole: {}, bySide: { city: { g: 0, w: 0 }, mafia: { g: 0, w: 0 }, self: { g: 0, w: 0 } } };
  h.forEach(x => {
    if (x.won) st.wins++; st.points += x.points || 0;
    if (x.killedN1) st.killedN1++; if (x.votedD1) st.votedD1++; if (x.survived) st.survived++;
    const r = st.byRole[x.roleId] = st.byRole[x.roleId] || { g: 0, w: 0 }; r.g++; if (x.won) r.w++;
    const role = ROLE[x.roleId]; const side = role ? role.side : 'city'; const b = st.bySide[side] || st.bySide.city; b.g++; if (x.won) b.w++;
  });
  st.winRate = st.games ? Math.round(100 * st.wins / st.games) : 0;
  st.rating = 1000 + pr.history.reduce((a, x) => a + (x.points || 0), 0);
  return st;
}
function bestRoleOf(pr) {
  const st = profStats(pr); let best = null;
  Object.keys(st.byRole).forEach(id => { const r = st.byRole[id]; if (!ROLE[id]) return; if (!best || r.w > best.w || (r.w === best.w && r.g > best.g)) best = { id, g: r.g, w: r.w }; });
  return best;
}
function favoritesOf(pr, n = 3) {
  const st = profStats(pr);
  return Object.keys(st.byRole).filter(id => ROLE[id]).map(id => ({ id, g: st.byRole[id].g, w: st.byRole[id].w })).sort((a, b) => b.g - a.g || b.w - a.w).slice(0, n);
}

/* ---------- record a finished game ---------- */
function finishGame(g, w) {
  if (!w) return;
  g.winner = w; addLog(g, tt(L.e.logEnd, { title: w.title }));
  if (g.recorded) return; g.recorded = true;
  g.extraWinners = g.extraWinners || [];
  alive(g).filter(p => p.roleId === 'survivor' && !g.extraWinners.includes(p.id)).forEach(p => { g.extraWinners.push(p.id); addLog(g, tt(L.e.survivorWon, { player: label(p) })); });
  // diplomacy pack goals
  g.players.forEach(p => {
    if (g.extraWinners.includes(p.id)) return;
    if (p.roleId === 'lobbyist' && (p.lobbyHits || 0) >= 3) g.extraWinners.push(p.id);
    if (p.roleId === 'gambler' && (p.betHits || 0) >= 2) g.extraWinners.push(p.id);
    if (p.roleId === 'peacemaker' && p.alive) { g.extraWinners.push(p.id); addLog(g, tt(L.e.logPeaceWin, { player: label(p) })); }
    if (p.roleId === 'puppeteer' && p.alive && (p.puppets || []).filter(id => { const q = P(g, id); return q && !q.alive; }).length >= 2) { g.extraWinners.push(p.id); addLog(g, tt(L.e.logPuppetWin, { player: label(p) })); }
  });
  const rv = reviewGame(g); g.useful = Object.fromEntries(rv.players.map(x => [x.id, x.useful]));
  g.players.forEach(p => {
    if (!p.profileId) return; const pr = profById(p.profileId); if (!pr) return;
    const { won, solo } = resultFor(g, p, w);
    const survived = p.alive;
    const killedN1 = !!(p.deadOn && p.deadOn.phase === 'night' && p.deadOn.night === 1);
    const votedD1 = !!(p.votedOut && p.deadOn && p.deadOn.day === 1);
    const useful = rv.byId[p.id] ? rv.byId[p.id].useful : 0;
    pr.history.push({ id: uid(), date: Date.now(), gameId: g.id, n: g.n, roleId: p.roleId, won, points: pointsFor(p.roleId, won, survived, solo) + useful, useful, survived, killedN1, votedD1, winnerSide: w.side });
  });
}
/* did this player win (and alone)? */
function resultFor(g, p, w) {
  const role = ROLE[p.roleId]; const side = role.side;
  let won = false, solo = false; const extra = g.extraWinners || [];
  if (p.roleId === 'jester') { won = g.jesterWon === p.id; solo = won; }
  else if (['survivor', 'contractor', 'lobbyist', 'gambler', 'peacemaker', 'puppeteer'].includes(p.roleId)) { won = extra.includes(p.id) || (p.roleId === 'survivor' && p.alive) || (p.roleId === 'peacemaker' && p.alive) || (p.roleId === 'lobbyist' && (p.lobbyHits || 0) >= 3) || (p.roleId === 'gambler' && (p.betHits || 0) >= 2); solo = won; }
  else if (p.roleId === 'witch') won = w.side === 'mafia';
  else if (p.roleId === 'amnesiac') won = w.side === 'city';
  else if (p.roleId === 'maniac') { won = w.side === 'maniac' || w.side === 'city'; solo = w.side === 'maniac'; }
  else if (side === 'city') won = w.side === 'city';
  else if (side === 'mafia') won = w.side === 'mafia' && (!g.twoFamilies || !w.family || p.family === w.family);
  return { won, solo };
}

/* ---------- demo profiles ---------- */
function seedDemoProfiles() { // sample profiles were removed: drop any that are still saved on a device
  if (S.profiles.some(p => p.demo)) S.profiles = S.profiles.filter(p => !p.demo);
  S.demoSeeded = true;
}

/* ---------- screens ---------- */
function profilesScreen() {
  const u = U(); const me = S.meId ? profById(S.meId) : null;
  const list = S.profiles.filter(p => !me || p.id !== me.id).map(p => Object.assign({ p }, { st: profStats(p) })).sort((a, b) => b.st.rating - a.st.rating);
  const row = (p, st, cls = '') => `<button class="prof-card ${cls}" data-a="prof-open" data-id="${p.id}">${avatarHTML(p, 'sm')}<div><div class="nm">${esc(p.name)} ${p.demo ? `<span class="demo-badge">${u.demoLabel}</span>` : ''}</div><div class="sub">${[flagOf(p.country), esc(p.city)].filter(Boolean).join(' ')}${p.city ? ' · ' : ''}${tt(u.rtGW, { g: st.games, w: st.wins })}</div></div><span class="r">${st.rating}<span class="k">${u.rating}</span></span></button>`;
  return `${topbar(u.tabPlayers, u.profilesD, false)}
  <div class="stack">
    ${me ? `<div class="eyebrow">${u.myProfile}</div>${row(me, profStats(me), 'me')}` : `<button class="btn primary" data-a="prof-new" data-me="1">${u.createMy}</button>`}
    <div class="row"><div class="eyebrow grow">${u.allPlayers} · ${S.profiles.length}</div><button class="btn xs ghost" data-a="prof-new">+ ${u.newProfile}</button></div>
    ${list.length ? `<div class="stack-s">${list.map(x => row(x.p, x.st)).join('')}</div>` : `<p class="hint">${u.profilesEmpty}</p>`}
  </div>`;
}
function fmtDate(ts) { try { return new Date(ts).toLocaleDateString(L.code, { day: 'numeric', month: 'short' }); } catch (e) { return new Date(ts).toLocaleDateString(); } }
function card3dHTML(role, key = 'profile') {
  return `<div class="card3d-wrap" data-key="${key}"><div class="card3d"><div class="face front">${cardHTML(role)}</div><div class="face back cardback ${role.premium ? 'premium' : ''}">${cardBackHTML(!!role.premium, role.name)}</div></div></div>`;
}
function profileScreen() {
  const u = U(); const pr = profById(S.ui.profileId); if (!pr) { S.screen = 'profiles'; return profilesScreen(); }
  const st = profStats(pr); const best = bestRoleOf(pr);
  const bestRole = best ? ROLE[best.id] : (pr.history.length ? ROLE[pr.history[pr.history.length - 1].roleId] : ROLE.sheriff);
  const favs = favoritesOf(pr, S.ui.allRoles ? 99 : 3);
  const tile = (v, k, c = '') => `<div class="st"><div class="v num" style="${c}">${v}</div><div class="k">${k}</div></div>`;
  const loc = [flagOf(pr.country), esc(pr.city), pr.country ? esc(countryName(pr.country)) : ''].filter(Boolean).join(' · ');
  const hist = pr.history.slice().reverse().slice(0, 25);
  const sideRow = (k, lbl) => { const b = st.bySide[k]; return `<div class="fav">${sealHTML(k === 'city' ? ROLE.sheriff : k === 'mafia' ? ROLE.don : ROLE.maniac)}<div><div class="n">${lbl}</div><div class="s">${tt(u.rtGW, { g: b.g, w: b.w })}</div></div><span class="w">${b.g ? Math.round(100 * b.w / b.g) : 0}%</span></div>`; };
  return `${topbar(u.editProfile, pr.demo ? u.demoLabel : (pr.id === S.meId ? u.myProfile : ''))}
  <div class="stack">
    <div class="prof-head">${avatarHTML(pr, 'lg')}<div class="grow" style="min-width:0"><div class="nm">${esc(pr.name)}</div>${pr.username ? `<div class="un">@${esc(pr.username)}</div>` : ''}<div class="loc">${loc || u.noCountry}</div></div></div>
    <div class="row"><button class="like ${pr.likedByMe ? 'on' : ''}" data-a="prof-like" data-id="${pr.id}">${I.heart} ${pr.likes}</button><button class="btn sm ghost" data-a="prof-edit" data-id="${pr.id}">${I.edit} ${u.edit}</button></div>
    <div class="panel"><div class="eyebrow gold" style="text-align:center">${u.bestRole}</div>${card3dHTML(bestRole)}<div class="spin-hint">${u.spinHint}</div><div class="best-role"><b>${bestRole.name}</b>${best ? ' · ' + tt(u.bestRoleText, { wins: best.w, games: best.g }) : ' · ' + u.noGamesYet}</div></div>
    <div class="eyebrow">${u.stats}</div>
    <div class="status">${tile(st.games, u.games)}${tile(st.wins, u.wins, 'color:#9fe0ab')}${tile(st.winRate + '%', u.winRate, 'color:var(--gold-2)')}${tile(st.rating, u.rating, 'color:var(--gold-2)')}</div>
    <div class="status" style="grid-template-columns:repeat(3,1fr)">${tile(st.killedN1, u.killedN1, 'color:var(--crimson-2)')}${tile(st.votedD1, u.votedD1, 'color:var(--crimson-2)')}${tile(st.survived, u.survived, 'color:#9fe0ab')}</div>
    <div class="row"><div class="eyebrow grow">${u.favorites}</div>${pr.history.length ? `<button class="btn xs ghost" data-a="prof-allroles">${S.ui.allRoles ? u.favorites : u.allRoles}</button>` : ''}</div>
    ${favs.length ? `<div class="stack-s">${favs.map(f => { const r = ROLE[f.id]; return `<div class="fav">${sealHTML(r)}<div class="grow" style="min-width:0"><div class="n">${r.name}</div><div class="s">${tt(u.rtGW, { g: f.g, w: f.w })}</div><div class="bar"><i style="width:${f.g ? 100 * f.w / f.g : 0}%"></i></div></div><span class="w">${f.g ? Math.round(100 * f.w / f.g) : 0}%</span></div>`; }).join('')}</div>` : `<p class="hint">${u.noGamesYet}</p>`}
    <div class="eyebrow">${u.bySide}</div>
    <div class="stack-s">${sideRow('city', u.sideCity)}${sideRow('mafia', u.sideMafia)}${sideRow('self', u.sideSolo)}</div>
    <div class="eyebrow">${u.history}</div>
    ${hist.length ? `<div class="hist">${hist.map(h => { const r = ROLE[h.roleId]; return `<div class="h">${r ? sealHTML(r) : ''}<div><div class="t">${r ? r.name : h.roleId}</div><div class="d">${tt(u.histLine, { n: h.n, date: fmtDate(h.date) })}${h.killedN1 ? ' · ' + u.killedN1.toLowerCase() : h.votedD1 ? ' · ' + u.votedD1.toLowerCase() : ''}</div></div><span class="res ${h.won ? 'win' : 'loss'}">${h.won ? u.won : u.lost}<br>${h.points > 0 ? '+' : ''}${h.points}${h.useful ? `<br><small>${u.ptsUseful} ${h.useful > 0 ? '+' : ''}${h.useful}</small>` : ''}</span></div>`; }).join('')}</div>` : `<p class="hint">${u.historyEmpty}</p>`}
    <button class="btn ghost sm" data-a="prof-del" data-id="${pr.id}" style="align-self:center;color:var(--crimson-2)">${u.deleteProfile}</button>
  </div>`;
}
function profEditHTML(id) {
  const u = U(); const d = S.ui.pf || {};
  const pr = id ? profById(id) : null;
  const f = (k, lbl, type = 'text') => `<div class="field"><label for="pf-${k}">${lbl}</label><input class="input" id="pf-${k}" data-a="pf" data-k="${k}" type="${type}" value="${esc(d[k] || '')}" autocomplete="off"></div>`;
  const countries = `<div class="field"><label for="pf-country">${u.fCountry}</label><select class="input" id="pf-country" data-a="pf" data-k="country"><option value="">${u.noCountry}</option>${COUNTRY_CODES.map(c => `<option value="${c}" ${d.country === c ? 'selected' : ''}>${flagOf(c)} ${esc(countryName(c))}</option>`).join('')}</select></div>`;
  const prev = Object.assign({}, pr || newProfile(), d);
  return `<h2>${u.editProfile}</h2>
    <div class="row" style="margin-top:10px">${avatarHTML(prev, 'lg')}<div class="stack-s grow"><button class="btn sm file-btn">${u.upload}<input type="file" accept="image/*" data-a="avatar-file"></button><button class="btn sm ghost" data-a="prof-tg">${I.tg} ${u.fromTg}</button></div></div>
    <div class="stack-s" style="margin-top:12px">${f('name', u.fName)}${f('username', u.fUsername)}${f('city', u.fCity)}${countries}</div>
    <div class="setting" style="border:0"><div><div class="t">${u.makeMe}</div></div><div class="ctl"><button class="switch ${d.me ? 'on' : ''}" data-a="pf-me" aria-label="${u.makeMe}"></button></div></div>
    <div class="btn-row"><button class="btn ghost" data-a="sheet-close">${u.cancel}</button><button class="btn primary" data-a="prof-save" data-id="${id || ''}">${u.save}</button></div>`;
}

/* ---------- ratings ---------- */
function ratingsScreen() {
  const u = U(); const rt = S.ui.rt = S.ui.rt || { scope: 'server', period: 'all', city: null, country: null, role: 'sheriff' };
  const now = Date.now(); const since = rt.period === 'week' ? now - 7 * 86400000 : rt.period === 'month' ? now - 30 * 86400000 : 0;
  const me = S.meId ? profById(S.meId) : null;
  const seg = (cls, items, key) => `<div class="segment ${cls}">${items.map(([id, lbl]) => `<button class="${rt[key] === id ? 'active' : ''}" data-a="rt-set" data-k="${key}" data-v="${id}">${lbl}</button>`).join('')}</div>`;
  const scopeSeg = seg('n4', [['server', u.rtServer], ['city', u.rtCity], ['country', u.rtCountry], ['roles', u.rtRoles]], 'scope');
  const periodSeg = seg('n3', [['all', u.rtAll], ['week', u.rtWeek], ['month', u.rtMonth]], 'period');
  let pool = S.profiles.slice(); let picker = '';
  if (rt.scope === 'city') {
    const cities = [...new Set(S.profiles.map(p => p.city).filter(Boolean))].sort();
    if (!rt.city || !cities.includes(rt.city)) rt.city = (me && me.city && cities.includes(me.city)) ? me.city : cities[0] || null;
    picker = cities.length ? `<select class="input" data-a="rt-pick" data-k="city">${cities.map(c => `<option value="${esc(c)}" ${rt.city === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>` : `<p class="hint">${u.rtNoCity}</p>`;
    pool = pool.filter(p => p.city && p.city === rt.city);
  }
  if (rt.scope === 'country') {
    const cs = [...new Set(S.profiles.map(p => p.country).filter(Boolean))].sort();
    if (!rt.country || !cs.includes(rt.country)) rt.country = (me && me.country && cs.includes(me.country)) ? me.country : cs[0] || null;
    picker = cs.length ? `<select class="input" data-a="rt-pick" data-k="country">${cs.map(c => `<option value="${c}" ${rt.country === c ? 'selected' : ''}>${flagOf(c)} ${esc(countryName(c))}</option>`).join('')}</select>` : `<p class="hint">${u.rtNoCity}</p>`;
    pool = pool.filter(p => p.country === rt.country);
  }
  let rows = [];
  if (rt.scope === 'roles') {
    picker = `<div class="role-pick">${ROLES.map(r => `<button class="${rt.role === r.id ? 'active' : ''}" data-a="rt-set" data-k="role" data-v="${r.id}">${sealHTML(r)}<span>${r.name}</span></button>`).join('')}</div>`;
    rows = pool.map(p => { const st = profStats(p, since); const r = st.byRole[rt.role] || { g: 0, w: 0 }; return { p, g: r.g, w: r.w, pts: r.g ? Math.round(100 * r.w / r.g) : 0, show: r.w + '/' + r.g }; }).filter(x => x.g > 0).sort((a, b) => b.w - a.w || b.pts - a.pts || b.g - a.g);
  } else {
    rows = pool.map(p => { const st = profStats(p, since); return { p, g: st.games, w: st.wins, pts: rt.period === 'all' ? st.rating : st.points, show: rt.period === 'all' ? String(st.rating) : (st.points > 0 ? '+' : '') + st.points }; }).filter(x => x.g > 0).sort((a, b) => b.pts - a.pts || b.w - a.w);
  }
  const list = rows.length ? rows.map((x, i) => `<button class="rank-row ${i < 3 ? 'top' + (i + 1) : ''} ${x.p.id === S.meId ? 'me' : ''}" data-a="prof-open" data-id="${x.p.id}"><span class="pos">${i + 1}</span>${avatarHTML(x.p, 'sm')}<div class="mid"><div class="nm">${esc(x.p.name)}</div><div class="sub">${[flagOf(x.p.country), esc(x.p.city)].filter(Boolean).join(' ')}${x.p.city ? ' · ' : ''}${tt(u.rtGW, { g: x.g, w: x.w })}</div></div><span class="pts">${x.show}<span class="k">${rt.scope === 'roles' ? u.winRate : rt.period === 'all' ? u.rtPoints : u.rtDelta}</span></span></button>`).join('') : `<p class="hint">${u.rtEmpty}</p>`;
  return `${topbar(u.tabRatings, u.ratingsD, false)}
  <div class="stack">
    ${scopeSeg}${periodSeg}${picker}
    <div class="stack-s">${list}</div>
  </div>`;
}

/* ---------- 3D card interaction (any number of .card3d-wrap on screen, state kept per data-key across renders) ---------- */
const C3 = { items: {}, dragging: null, lx: 0, ly: 0, raf: null, reduce: false };
try { C3.reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
function c3state(key) { return C3.items[key] = C3.items[key] || { ry: -18, rx: 6, idle: 0 }; }
function card3dApply(wrap) {
  const el = wrap && wrap.querySelector('.card3d'); if (!el) return; const st = c3state(wrap.dataset.key);
  el.style.transform = `rotateX(${st.rx}deg) rotateY(${st.ry}deg)`;
  // WebKit ignores backface-visibility on composited children — switch the hidden face off explicitly
  const frontUp = Math.cos(st.ry * Math.PI / 180) >= 0;
  const f = el.querySelector('.face.front'), b = el.querySelector('.face.back');
  if (f) f.style.visibility = frontUp ? 'visible' : 'hidden';
  if (b) b.style.visibility = frontUp ? 'hidden' : 'visible';
}
function card3dLoop() {
  const wraps = document.querySelectorAll('.card3d-wrap');
  if (!wraps.length) { C3.raf = null; return; }
  wraps.forEach(w => { const st = c3state(w.dataset.key); if (C3.dragging !== w.dataset.key && !C3.reduce && Date.now() - st.idle > 1800) { st.ry += 0.35; st.rx += (6 - st.rx) * 0.02; card3dApply(w); } });
  C3.raf = requestAnimationFrame(card3dLoop);
}
function card3dInit() { document.querySelectorAll('.card3d-wrap').forEach(card3dApply); if (!C3.raf) C3.raf = requestAnimationFrame(card3dLoop); }
document.addEventListener('pointerdown', e => {
  const w = e.target.closest('.card3d-wrap'); if (!w) return;
  C3.dragging = w.dataset.key; C3.lx = e.clientX; C3.ly = e.clientY; c3state(w.dataset.key).idle = Date.now();
  try { w.setPointerCapture(e.pointerId); } catch (x) {}
});
document.addEventListener('pointermove', e => {
  if (!C3.dragging) return;
  const st = c3state(C3.dragging); const dx = e.clientX - C3.lx, dy = e.clientY - C3.ly; C3.lx = e.clientX; C3.ly = e.clientY;
  st.ry += dx * 0.6; st.rx = Math.max(-40, Math.min(40, st.rx - dy * 0.35)); st.idle = Date.now();
  const w = document.querySelector(`.card3d-wrap[data-key="${C3.dragging}"]`); if (w) card3dApply(w);
});
['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, () => { if (C3.dragging) { c3state(C3.dragging).idle = Date.now(); C3.dragging = null; } }));

/* ---------- actions ---------- */
function readAvatar(file, cb) {
  try {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); const s = 160; c.width = s; c.height = s; const x = c.getContext('2d'); const m = Math.min(img.width, img.height); x.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s); cb(c.toDataURL('image/jpeg', 0.82)); };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  } catch (e) {}
}
Object.assign(ACT, {
  'prof-open'(el) { S.ui.profileId = el.dataset.id; S.ui.allRoles = false; go('profile'); },
  'prof-new'(el) { S.ui.pf = { me: !!el.dataset.me }; S.ui.sheet = { type: 'profEdit', id: null }; render(); },
  'prof-edit'(el) { const pr = profById(el.dataset.id); S.ui.pf = { name: pr.name, username: pr.username, city: pr.city, country: pr.country, avatar: pr.avatar, me: pr.id === S.meId }; S.ui.sheet = { type: 'profEdit', id: pr.id }; render(); },
  pf(el) { S.ui.pf = S.ui.pf || {}; S.ui.pf[el.dataset.k] = el.value; },
  'pf-me'() { S.ui.pf = S.ui.pf || {}; S.ui.pf.me = !S.ui.pf.me; render(); },
  'avatar-file'(el) { const f = el.files && el.files[0]; if (!f) return; readAvatar(f, url => { S.ui.pf = S.ui.pf || {}; S.ui.pf.avatar = url; render(); }); },
  'prof-tg'() {
    try {
      const uu = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user;
      if (!uu) { toast(U().tgNA); return; }
      S.ui.pf = Object.assign(S.ui.pf || {}, { name: [uu.first_name, uu.last_name].filter(Boolean).join(' '), username: uu.username || '', avatar: uu.photo_url || (S.ui.pf && S.ui.pf.avatar) || null, tgId: uu.id });
      toast(U().tgDone); render();
    } catch (e) { toast(U().tgNA); }
  },
  'prof-save'(el) {
    const d = S.ui.pf || {}; const name = (d.name || '').trim(); if (!name) { toast(U().fName); return; }
    let pr = el.dataset.id ? profById(el.dataset.id) : null;
    if (!pr) { pr = newProfile(); S.profiles.push(pr); }
    Object.assign(pr, { name, username: (d.username || '').replace(/^@/, '').trim(), city: (d.city || '').trim(), country: d.country || '', avatar: d.avatar || pr.avatar || null, tgId: d.tgId || pr.tgId || null, demo: false });
    if (d.me) S.meId = pr.id; else if (S.meId === pr.id) S.meId = null;
    S.ui.sheet = null; S.ui.pf = null; S.ui.profileId = pr.id; go('profile');
  },
  'prof-del'(el) { if (S.ui.confirmDel !== el.dataset.id) { S.ui.confirmDel = el.dataset.id; toast(U().deleteConfirm); return; } S.profiles = S.profiles.filter(p => p.id !== el.dataset.id); if (S.meId === el.dataset.id) S.meId = null; S.ui.confirmDel = null; go('profiles'); },
  'prof-like'(el) { const pr = profById(el.dataset.id); if (!pr) return; pr.likedByMe = !pr.likedByMe; pr.likes = Math.max(0, pr.likes + (pr.likedByMe ? 1 : -1)); render(); },
  'prof-allroles'() { S.ui.allRoles = !S.ui.allRoles; render(); },
  'demo-remove'() { S.profiles = S.profiles.filter(p => !p.demo); render(); },
  'rt-set'(el) { S.ui.rt = S.ui.rt || {}; S.ui.rt[el.dataset.k] = el.dataset.v; render(); },
  'rt-pick'(el) { S.ui.rt = S.ui.rt || {}; S.ui.rt[el.dataset.k] = el.value; render(); }
});

/* boot is triggered from 06-shop.js */
