/* ============================================================
   SHOP: premium cards (2 $) and scenarios (9.99 $), demo purchases,
   scenario setup, live-art parallax
   ============================================================ */
S.owned = S.owned || { roles: [], scenarios: [] }; S.owned.packs = S.owned.packs || [];
const fullAccess = () => !!(S.owned && S.owned.allUntil && S.owned.allUntil > Date.now()); // temporary full access granted by an admin
const ownsPack = id => fullAccess() || (S.owned.packs || []).includes(id);
const ownsRole = id => !ROLE[id] || !ROLE[id].premium || fullAccess() || (ROLE[id].pack ? ownsPack(ROLE[id].pack) : S.owned.roles.includes(id));
const ownsScen = id => !!(SCENARIO[id] && SCENARIO[id].free) || fullAccess() || (SCENARIO[id] && SCENARIO[id].pack ? ownsPack(SCENARIO[id].pack) : S.owned.scenarios.includes(id));
const fmtPrice = v => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', L.code === 'en' ? '.' : ',')) + ' $';
const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
function priceBadge(kind, id) {
  const u = U(); const own = kind === 'role' ? ownsRole(id) : ownsScen(id);
  const inPack = kind === 'role' ? ROLE[id].pack : (SCENARIO[id] && SCENARIO[id].pack);
  return own ? `<span class="price-badge owned">${u.owned}</span>` : `<span class="price-badge">${inPack ? u.inPack : kind === 'role' ? u.priceCard : u.priceScen}</span><span class="lock-badge">${LOCK}</span>`;
}
function scenarioPlayers(sc) { return tt(U().scenPlayers, { a: sc.min, b: sc.max }); }
function scenarioModsText(sc) {
  const u = U(); const out = [];
  if (sc.mods.gunsmithEveryNight) out.push(u.modGunsmith);
  if (sc.mods.twoFamiliesFrom) out.push(tt(u.modTwoFam, { n: sc.mods.twoFamiliesFrom }));
  if (sc.mods.revealDead === false) out.push(u.modNoReveal);
  return out;
}
function scenarioCardHTML(sc, compact = false) {
  const u = U(); const own = ownsScen(sc.id);
  const roles = [...new Set(sc.roles)].map(id => `<span class="ri" title="${ROLE[id].name}">${roleArt(id, 'portrait')}</span>`).join('');
  const mods = scenarioModsText(sc);
  return `<div class="scen-card premium" style="position:relative">${priceBadge('scen', sc.id)}
    <div class="t">${sc.name}</div><div class="l">${sc.lore}</div>
    <div class="m">${scenarioPlayers(sc)}${mods.length ? ' · ' + mods.join(' · ') : ''}</div>
    <div class="roles">${roles}</div>
    <div class="m">${tt(u.scenRoles, { list: [...new Set(sc.roles)].map(id => ROLE[id].name).join(', ') })}</div>
    <div class="btn-row" style="margin-top:10px">${own ? `<button class="btn primary sm" data-a="scen-use" data-id="${sc.id}">${u.useScen}</button>` : sc.pack ? `<button class="btn primary sm" data-a="buy" data-kind="pack" data-id="${sc.pack}">${tt(u.buyPack, { price: u.pricePack })}</button>` : (S.cloud && S.cloud.credits && S.cloud.credits.scenario > 0 ? `<button class="btn primary sm" data-a="claim-free" data-kind="scen" data-id="${sc.id}">🎁 ${u.claimFree}</button>` : `<button class="btn primary sm" data-a="buy" data-kind="scen" data-id="${sc.id}">${tt(u.buy, { price: u.priceScen })}</button>`)}</div>
  </div>`;
}
function premiumCardTile(r) {
  const u = U(); const own = ownsRole(r.id);
  return `<div class="gcard card ${r.team} mini premium" style="position:relative">${priceBadge('role', r.id)}<i class="gem"></i><div role="button" tabindex="0" data-a="role" data-id="${r.id}" style="display:contents">${lazyArt(r.id, false)}<div class="k">${TEAM_LABEL[r.team]}</div><div class="n">${r.name}</div><div class="s">${r.short}</div></div>
    ${own ? '' : r.pack ? `<button class="btn primary xs buy" data-a="buy" data-kind="pack" data-id="${r.pack}">${u.inPack}</button>` : (S.cloud && S.cloud.credits && S.cloud.credits.role > 0 ? `<button class="btn primary xs buy" data-a="claim-free" data-kind="role" data-id="${r.id}">🎁 ${u.claimFree}</button>` : `<button class="btn primary xs buy" data-a="buy" data-kind="role" data-id="${r.id}">${tt(u.buy, { price: u.priceCard })}</button>`)}</div>`;
}
function packCardHTML(pk) {
  const u = U(); const own = ownsPack(pk.id);
  const groups = [['black', u.groupFamily], ['red', u.groupCity], ['neutral', u.groupNeutral]];
  const tiles = groups.map(([team, title]) => `<div class="eyebrow" style="margin-top:8px">${title}</div><div class="shop-grid">${pk.roles.filter(id => ROLE[id].team === team).map(id => premiumCardTile(ROLE[id])).join('')}</div>`).join('');
  const scens = pk.scenarios.map(id => scenarioCardHTML(SCENARIO[id])).join('');
  return `<div class="pack-card"><div class="row"><span class="premium-pill pack">${u.scenPack}</span><div class="grow"><div class="t">${u.packTitle}</div><div class="hint">${u.packSub}</div></div>${own ? `<span class="price-badge owned" style="position:static">${u.packOwned}</span>` : ''}</div>
    <p class="l" style="margin-top:8px">${u.packLore}</p>
    ${own ? '' : `<button class="btn primary" style="margin-top:10px" data-a="buy" data-kind="pack" data-id="${pk.id}">${tt(u.buyPack, { price: u.pricePack })}</button>`}
    <h2 style="margin-top:14px">${u.packRoles}</h2>${tiles}
    <h2 style="margin-top:14px">${u.packScen}</h2><div class="stack-s">${scens}</div></div>`;
}
function shopScreen() {
  const u = U();
  const prem = ROLES.filter(r => r.premium && !r.pack);
  const groups = [['black', u.groupFamily], ['red', u.groupCity], ['neutral', u.groupNeutral]];
  return `${topbar(u.shop, u.shopD)}
  <div class="stack">
    ${fullAccess() ? `<div class="panel" style="border-color:rgba(240,205,122,.5)"><div class="row"><span class="premium-pill">★</span><div class="grow" style="font-weight:700">${S.cloud && S.cloud.admin ? u.adminAccess : tt(u.fullAccessUntil, { date: new Date(S.owned.allUntil).toLocaleDateString(L.code === 'en' ? 'en-GB' : L.code === 'uk' ? 'uk-UA' : L.code === 'pl' ? 'pl-PL' : L.code === 'hy' ? 'hy-AM' : 'ru-RU') })}</div></div></div>` : ''}
    ${S.cloud && S.cloud.credits && (S.cloud.credits.role > 0 || S.cloud.credits.scenario > 0) ? `<div class="panel" style="border-color:var(--gold)"><div style="font-weight:700">🎁 ${S.cloud.credits.role > 0 ? tt(u.freeLeft, { n: S.cloud.credits.role }) : ''}${S.cloud.credits.role > 0 && S.cloud.credits.scenario > 0 ? '<br>' : ''}${S.cloud.credits.scenario > 0 ? tt(u.freeLeftScen, { n: S.cloud.credits.scenario }) : ''}</div></div>` : ''}
    <div class="panel"><div class="row"><span class="premium-pill">${u.premium}</span><div class="hint grow">${u.buyNote}</div></div></div>
    <h2>${u.shopCards}</h2>
    ${groups.map(([team, title]) => `<div class="eyebrow">${title}</div><div class="shop-grid">${prem.filter(r => r.team === team).map(premiumCardTile).join('')}</div>`).join('')}
    <h2>${u.shopScen}</h2>
    <div class="stack-s">${SCENARIOS.filter(sc => !sc.pack).map(sc => scenarioCardHTML(sc)).join('')}</div>
    <h2>${u.shopPacks}</h2>
    ${Object.values(PACKS).map(packCardHTML).join('')}
  </div>`;
}
function buySheetHTML(kind, id) {
  const u = U();
  if (kind === 'role') {
    const r = ROLE[id];
    return `<h2>${u.buyTitle}</h2><div class="card-wrap" style="max-width:240px;margin-top:10px">${cardHTML(r)}</div>
      <p class="hint" style="margin:12px 0">${u.buyNote}</p>
      <div class="btn-row"><button class="btn ghost" data-a="sheet-close">${u.cancel}</button><button class="btn primary" data-a="buy-confirm" data-kind="role" data-id="${id}">${tt(u.buyDemo, { price: u.priceCard })}</button></div>`;
  }
  if (kind === 'pack') {
    const pk = PACKS[id];
    return `<h2>${u.packTitle}</h2><p class="hint" style="margin:6px 0">${u.packSub}</p><div class="filters wrap">${pk.roles.map(rid => `<span class="chip">${roleArt(rid, 'portrait').replace('class="art-svg', 'style="width:18px;height:18px;border-radius:50%;vertical-align:middle;margin-right:4px" class="art-svg')}${ROLE[rid].name}</span>`).join('')}</div>
      <p class="hint" style="margin:12px 0">${u.buyNote}</p>
      <div class="btn-row"><button class="btn ghost" data-a="sheet-close">${u.cancel}</button><button class="btn primary" data-a="buy-confirm" data-kind="pack" data-id="${id}">${tt(u.buyDemo, { price: u.pricePack })}</button></div>`;
  }
  const sc = SCENARIO[id];
  return `<h2>${u.buyTitle}</h2><div style="margin-top:10px">${scenarioCardHTML(sc).replace(/<div class="btn-row"[\s\S]*?<\/div>\s*<\/div>$/, '</div>')}</div>
    <p class="hint" style="margin:12px 0">${u.buyNote}</p>
    <div class="btn-row"><button class="btn ghost" data-a="sheet-close">${u.cancel}</button><button class="btn primary" data-a="buy-confirm" data-kind="scen" data-id="${id}">${tt(u.buyDemo, { price: u.priceScen })}</button></div>`;
}
/* Scenario → setup */
function applyScenario(id, n) {
  const sc = SCENARIO[id]; if (!sc) return;
  S.setup.scenario = id;
  S.setup.n = Math.max(sc.min, Math.min(sc.max, n || S.setup.n));
  S.setup.comp = scenarioComp(sc, S.setup.n);
}
function setupComp(n) { return S.setup.scenario && SCENARIO[S.setup.scenario] ? scenarioComp(SCENARIO[S.setup.scenario], n) : presetFor(n); }
function setupMods() { return S.setup.scenario && SCENARIO[S.setup.scenario] ? SCENARIO[S.setup.scenario].mods : {}; }
function unownedInComp(comp) { return [...new Set(comp.filter(id => !ownsRole(id)))]; }

/* ---------- live art parallax ---------- */
const PX = { x: 0, y: 0, gyro: false };
function parallaxApply() {
  document.querySelectorAll('.art-svg.premium').forEach(el => { el.style.setProperty('--px', PX.x.toFixed(3)); el.style.setProperty('--py', PX.y.toFixed(3)); });
}
document.addEventListener('pointermove', e => {
  if (PX.gyro) return;
  const el = e.target.closest ? e.target.closest('.card.premium .art, .card3d') : null;
  if (el) { const r = el.getBoundingClientRect(); PX.x = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1)); PX.y = Math.max(-1, Math.min(1, (e.clientY - r.top) / r.height * 2 - 1)); }
  else { PX.x = Math.max(-1, Math.min(1, e.clientX / window.innerWidth * 2 - 1)) * .4; PX.y = Math.max(-1, Math.min(1, e.clientY / window.innerHeight * 2 - 1)) * .4; }
  parallaxApply();
}, { passive: true });
function enableGyro() {
  try {
    const go = () => { window.addEventListener('deviceorientation', e => { if (e.gamma === null) return; PX.gyro = true; PX.x = Math.max(-1, Math.min(1, e.gamma / 25)); PX.y = Math.max(-1, Math.min(1, ((e.beta || 0) - 40) / 25)); parallaxApply(); }, { passive: true }); };
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().then(st => { if (st === 'granted') go(); }).catch(() => {});
    else if (typeof DeviceOrientationEvent !== 'undefined') go();
  } catch (e) {}
}
let gyroAsked = false;
document.addEventListener('pointerdown', () => { if (!gyroAsked) { gyroAsked = true; enableGyro(); } }, { once: true });

Object.assign(ACT, {
  buy(el) { S.ui.sheet = { type: 'buy', kind: el.dataset.kind, id: el.dataset.id }; render(); },
  'buy-confirm'(el) {
    const kind = el.dataset.kind, id = el.dataset.id;
    if (kind === 'role') { if (!S.owned.roles.includes(id)) S.owned.roles.push(id); toast(tt(U().bought, { name: ROLE[id].name })); }
    else if (kind === 'pack') { S.owned.packs = S.owned.packs || []; if (!S.owned.packs.includes(id)) S.owned.packs.push(id); toast(tt(U().bought, { name: U().packTitle })); }
    else { if (!S.owned.scenarios.includes(id)) S.owned.scenarios.push(id); toast(tt(U().bought, { name: SCENARIO[id].name })); }
    S.ui.sheet = null; render();
  },
  'scen-use'(el) { const classic = el.dataset.id === 'classic'; applyScenario(el.dataset.id, classic ? 10 : undefined); S.ui.showAll = false; go('setup'); },
  'scen-clear'() { S.setup.scenario = null; S.setup.comp = presetFor(S.setup.n); render(); }
});

/* ---------- boot ---------- */
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(start); else start((window.claude && window.claude.hot && window.claude.hot.data) || {});
