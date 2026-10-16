/* ============================================================
   v74 AVATAR FRAMES — a frame around the player's avatar wherever others see him
   - owning: like a skin (role «frame» on the server): bought for emeralds (EMERALDS_FRAME, 3 000 by default) or given by an admin;
     admins own all. One frame at a time (/api/skin/equip { role: 'frame' }); bought or given — it is on at once if none was.
   - seen: on the round table (the host's lobby, the players' table, the host's game screen — seatProfiles → profile.frame),
     in a player's sheet and his statistics (/api/profile → skins.frame), in the Skins tab with my own avatar.
   - the picture: a transparent square, the hole in its middle (FRAMES[].hole — its share of the picture) is scaled to the avatar
     (a hair bigger, so the ring covers the avatar's rim); the seat's number and fouls stay on top.
   ============================================================ */
const FRAME = Object.fromEntries(FRAMES.map(f => [f.id, f]));
['name', 'lore'].forEach(k => FRAMES.forEach(f => Object.defineProperty(f, k, { get() { const p = (L.skins && L.skins[f.id]) || (I18N.ru.skins || {})[f.id] || {}; return p[k] || f.id; }, enumerable: true })));
const frameOwned = id => !!FRAME[id] && (S.skins.owned || []).includes(id);
const myFrame = () => { const id = S.skins && S.skins.equipped && S.skins.equipped.frame; return frameOwned(id) ? id : null; };
// full: the hole a hair bigger than the avatar (profiles, previews); compact (the table's seats): at most 1.7× the avatar — the ring then
// lies over the avatar's rim, and the neighbours and the names keep their room
const frameScale = (f, compact) => Math.min(compact ? 1.7 : 2.4, 1.05 / Math.max(0.3, f.hole || 0.5));
function frameImgHTML(id, compact) {
  const f = FRAME[id]; if (!f) return '';
  return `<img class="av-frame" src="${skinUrl(f)}" alt="" draggable="false" decoding="async" style="--fs:${frameScale(f, compact).toFixed(3)}" onerror="this.remove()">`;
}
/* an avatar (any element) with a frame over it — the wrapper takes the avatar's size */
const frameWrap = (avatar, id) => (id && FRAME[id] ? `<span class="av-fw">${avatar}${frameImgHTML(id)}</span>` : avatar);
/* my own avatar for the previews: the Telegram photo or the first letter */
function frameMyAvatar(cls = 'lg') {
  const usr = (S.cloud && S.cloud.user) || {}; const name = usr.name || '?';
  return usr.photo ? `<img class="avatar ${cls}" src="${esc(usr.photo)}" alt="" style="object-fit:cover">` : `<div class="avatar ${cls}" style="--av-bg:var(--bg-3);--av-fg:var(--gold-2)">${esc(name.slice(0, 1).toUpperCase())}</div>`;
}

/* ---------- the Skins tab: the frames' section, a frame's sheet ---------- */
function frameTileHTML(f) {
  const u = U(); const own = frameOwned(f.id), on = myFrame() === f.id;
  return `<div class="af-tile ${own ? 'own' : 'locked'} ${on ? 'on' : ''}" role="button" tabindex="0" data-a="frame-sheet" data-id="${f.id}">
    <div class="af-prev">${frameWrap(frameMyAvatar(''), f.id)}${on ? `<span class="sk-badge">${u.afOn}</span>` : ''}</div>
    <div class="sk-tn">${esc(f.name)}</div><div class="sk-tr">${own ? rarPill(f) : `💎 ${typeof fmtEm === 'function' ? fmtEm(emFrame()) : 3000}`}</div></div>`;
}
function framesSectionHTML(f, rf) {
  if (f && !['all', 'mine'].includes(f)) return ''; // the team filters are about cards
  const list = FRAMES.filter(x => (rf === 'all' || !rf || x.rarity === rf) && (f !== 'mine' || frameOwned(x.id))); if (!list.length) return '';
  const u = U(); return `<div class="eyebrow gold">🎃 ${u.afTitle}</div><p class="hint" style="margin:2px 0 8px">${u.afHint}</p><div class="af-grid">${list.map(frameTileHTML).join('')}</div>`;
}
function frameSheetHTML(id) {
  const u = U(); const f = FRAME[id]; if (!f) return '';
  const own = frameOwned(id), on = myFrame() === id;
  let btn;
  if (own) btn = on ? `<button class="btn ghost" data-a="frame-set" data-id="">${u.afOff}</button>` : `<button class="btn primary" data-a="frame-set" data-id="${f.id}">${u.afWear}</button>`;
  else if (typeof emInTg === 'function' && emInTg()) { const price = emFrame(); const short = price - emBalance(); btn = short > 0 ? `<button class="btn primary" data-a="em-topup">${tt(u.emSkinShort, { n: fmtEm(short) })}</button>` : `<button class="btn primary" data-a="em-skin-buy" data-id="${f.id}">${tt(u.emSkinBuy, { n: fmtEm(price) })}</button>`; }
  else btn = `<p class="hint" style="margin:0">${u.afHow}</p>`;
  const price = !own && typeof fmtEm === 'function' ? `<div class="em-price"><span class="em-tag">💎 ${fmtEm(emFrame())}</span>${typeof emBalance === 'function' ? `<span class="hint" style="margin:0">${u.emBalance}: <b class="num">${fmtEm(emBalance())}</b> 💎</span>` : ''}</div>` : '';
  const seat = `<div class="rt-seat af-seat framed"><div class="rt-av">${(S.cloud && S.cloud.user && S.cloud.user.photo) ? `<img src="${esc(S.cloud.user.photo)}" alt="">` : `<span>${esc(((S.cloud && S.cloud.user && S.cloud.user.name) || '?').slice(0, 1).toUpperCase())}</span>`}${frameImgHTML(f.id, true)}<span class="rt-num">1</span></div><div class="rt-nm">${esc((S.cloud && S.cloud.user && S.cloud.user.name) || u.you || '')}</div></div>`;
  return `<div class="row" style="gap:8px;align-items:center"><h2 class="grow" style="margin:0">${esc(f.name)}</h2>${rarPill(f)}</div>
    <div class="hint" style="margin:2px 0 10px">${u.afLabel}${on ? ' · ' + u.afOn : ''}</div>
    <div class="af-big">${frameWrap(frameMyAvatar('xl'), f.id)}</div>
    <div class="af-at"><span class="hint" style="margin:0">${u.afPreview}</span>${seat}</div>
    <p style="margin:12px 0 0;line-height:1.5">${esc(f.lore)}</p>${price}
    <div class="btn-row" style="margin-top:12px">${btn}</div>`;
}
Object.assign(ACT, {
  'frame-sheet'(el) { if (!FRAME[el.dataset.id]) return; S.ui.sheet = { type: 'frame', id: el.dataset.id }; render(); },
  async 'frame-set'(el) {
    const u = U(); const id = el.dataset.id || null; if (id && !frameOwned(id)) return; if ((myFrame() || null) === id) return;
    if (typeof TG === 'undefined' || !TG.app || !apiBase()) { toast(u.skTgOnly); return; }
    const prev = Object.assign({}, S.skins.equipped || {}); S.skins.equipped = Object.assign({}, prev); if (id) S.skins.equipped.frame = id; else delete S.skins.equipped.frame; render();
    const d = await api('/api/skin/equip', { role: 'frame', skin: id });
    if (!d || !d.ok) { S.skins.equipped = prev; render(); toast(u.skErr); return; }
    S.skins.equipped = d.equipped || {}; save(); render(); toast(id ? tt(u.afSet, { name: FRAME[id].name }) : u.afOffToast); tgHaptic('success');
  }
});
(function () {
  const orig = sheetHTML;
  sheetHTML = function (enter) {
    const sh = S.ui.sheet; if (!sh || sh.type !== 'frame') return orig.apply(this, arguments);
    const body = frameSheetHTML(sh.id); if (!body) return orig.apply(this, arguments);
    return `<div class="sheet-bg ${enter === false ? '' : 'enter'}" data-a="sheet-close"><div class="sheet" data-stop="1"><div class="grab"></div>${body}<button class="btn ghost" style="margin-top:14px" data-a="sheet-close">${U().close}</button></div></div>`;
  };
})();
