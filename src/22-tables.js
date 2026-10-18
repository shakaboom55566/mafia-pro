/* ============================================================
   v84 TABLE SKINS — the table top itself (surface, rim, shape) instead of the app's plain disc
   - owning: like a skin (role «table» on the server): a reward or an admin's gift; admins own all. Not sold (yet).
   - putting up: one table per player (/api/skin/equip { role: 'table' }); the host's table is what everyone at his table sees:
     his own lobby, game and host-view screens use it (S.skins.equipped.table), the players get it with the table (/api/table/state → tableSkin).
   - the picture: a square, transparent around the table (skins/tools/prepare_table.py); TABLES[].shape says how the seats stand around it
     (09-online.js roundTableHTML → tableSeatR): 'circle' — as the plain table, 'octagon' — along the eight sides, the corners further out.
     The app's title, host and player count stay in the middle, so the picture's centre is calm.
   - live: a glare slides over the rim with the finger / the phone's tilt (masked by the picture itself) and the top leans a few degrees;
     old phones (html.lite) and reduced motion — the still picture. A room background and a table skin go together: the table stands on the carpet.
   ============================================================ */
const TABLE = Object.fromEntries(TABLES.map(t => [t.id, t]));
['name', 'lore'].forEach(k => TABLES.forEach(t => Object.defineProperty(t, k, { get() { const p = (L.skins && L.skins[t.id]) || (I18N.ru.skins || {})[t.id] || {}; return p[k] || t.id; }, enumerable: true })));
const tableOwned = id => !!TABLE[id] && (S.skins.owned || []).includes(id);
const myTable = () => { const id = S.skins && S.skins.equipped && S.skins.equipped.table; return tableOwned(id) ? id : null; };
const tbTable = () => { const id = typeof TB !== 'undefined' && TB.data && TB.data.tableSkin; return TABLE[id] ? id : null; };
const tablesMine = () => TABLES.some(t => tableOwned(t.id));
/* ---------- the shape: how far the rim is from the centre at this angle, in halves of the table's width (1 — the apothem / the radius) ---------- */
function tableShapeR(t, ang) {
  if (t.shape === 'octagon') { const k = Math.PI / 4; const a = (((ang + k / 2) % k) + k) % k - k / 2; return 1 / Math.cos(a); } // flat sides centred at 0°, 45°, 90°…, the corners at 22.5°
  return 1; // a circle
}
/* where a seat stands: just outside the rim — the skinned table is 70 % of the box (the plain disc 66 %), the seat's centre 9 % further out */
const tableSeatR = (t, ang) => 35 * tableShapeR(t, ang) + 9;
const tableShapeName = t => (U().tsShape || {})[t.shape] || t.shape;
/* the table top: the picture in the ring's box (fit — the picture is a little wider than the table: the rim's glow), the glare masked by it */
function tableRingHTML(t) {
  const src = skinUrl(t);
  return `<div class="rt-ring ts"><div class="ts-pic" style="width:${(t.fit * 100).toFixed(1)}%"><img class="ts-img" src="${src}" alt="" draggable="false" decoding="async" onerror="const r=this.closest('.rt-ring');if(r)r.classList.remove('ts');this.parentNode.remove()"><div class="ts-glare" style="-webkit-mask-image:url(${src});mask-image:url(${src})"></div></div></div>`;
}
/* ---------- live: the glare and the lean follow the finger / the tilt, plus a slow drift so the rim glints on its own ---------- */
const TSL = { raf: 0, tx: 0, ty: 0 };
function tablesFrame(now) {
  TSL.raf = 0; const pics = document.querySelectorAll('.ts-pic'); if (!pics.length) return;
  TSL.raf = requestAnimationFrame(tablesFrame); if (skinsStill()) return;
  const t = now / 1000; const px = typeof PX !== 'undefined' ? PX : { x: 0, y: 0 };
  const gx = Math.max(-1, Math.min(1, px.x * 0.8 + Math.sin(t * 0.37) * 0.35)), gy = Math.max(-1, Math.min(1, px.y * 0.8 + Math.cos(t * 0.27) * 0.3));
  TSL.tx += (gx - TSL.tx) * 0.1; TSL.ty += (gy - TSL.ty) * 0.1; if (TSL.fixed) [TSL.tx, TSL.ty] = TSL.fixed; // fixed: a set tilt (the channel video's frames)
  const tx = TSL.tx.toFixed(3), ty = TSL.ty.toFixed(3), fx = (50 + TSL.tx * 38).toFixed(1) + '%', fy = (40 + TSL.ty * 38).toFixed(1) + '%';
  pics.forEach(p => { const r = p.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; p.style.setProperty('--tx', tx); p.style.setProperty('--ty', ty); p.style.setProperty('--gx', fx); p.style.setProperty('--gy', fy); });
}
function tablesKick() { if (!TSL.raf && document.querySelector('.ts-pic')) TSL.raf = requestAnimationFrame(tablesFrame); }
setInterval(() => { try { tablesKick(); } catch (e) {} }, 400); // tables are drawn by renders and by timers (online) — the loop finds them

/* ---------- choosing: the Skins tab section, a table's sheet, the host's quick picker (shared with the rooms) ---------- */
function tableTileHTML(t) {
  const u = U(); const own = tableOwned(t.id), on = myTable() === t.id;
  return `<div class="rm-tile ts-tile ${own ? 'own' : 'locked'} ${on ? 'on' : ''}" role="button" tabindex="0" data-a="table-sheet" data-id="${t.id}">
    <div class="rm-thumb ts-thumb"><img src="${skinUrl(t, 'thumb')}" alt="" loading="lazy" decoding="async" draggable="false" onerror="this.remove()">${on ? `<span class="sk-badge">${u.tsOn}</span>` : own ? '' : '<span class="rm-lock">🔒</span>'}</div>
    <div class="sk-tn">${esc(t.name)}</div><div class="sk-tr">${rarPill(t)} <span class="ts-shape">${esc(tableShapeName(t))}</span></div></div>`;
}
function tablesSectionHTML() {
  if (!TABLES.length) return ''; const u = U();
  return `<div class="eyebrow gold">🎲 ${u.tsTitle}</div><p class="hint" style="margin:2px 0 8px">${u.tsHint}</p><div class="rm-grid">${TABLES.map(tableTileHTML).join('')}</div>`;
}
/* a preview: this table with an empty ring of 8 seats, in my room if I have one — exactly what the players will see */
function tablePreviewHTML(id) {
  const seats = Array.from({ length: 8 }, (_, i) => ({ seat: i + 1 }));
  const center = `<div class="rt-brand">Mafia <em>PRO</em></div><div class="rt-n">${esc(TABLE[id] ? TABLE[id].name : U().tsNone)}</div>`;
  return roundTableHTML(seats, {}, center, {}, typeof myRoom === 'function' ? myRoom() : null, id);
}
function tableSheetHTML(id) {
  const u = U(); const t = TABLE[id]; if (!t) return '';
  const own = tableOwned(id), on = myTable() === id;
  const btn = !own ? `<p class="hint" style="margin:10px 0 0">${u.tsHow}</p>` : on ? `<button class="btn ghost" data-a="table-set" data-id="">${u.tsOffBtn}</button>` : `<button class="btn primary" data-a="table-set" data-id="${t.id}">${u.tsSetBtn}</button>`;
  return `<div class="row" style="gap:8px;align-items:center"><h2 class="grow" style="margin:0">${esc(t.name)}</h2>${rarPill(t)}</div>
    <div class="hint" style="margin:2px 0 10px">${u.tsLabel} · ${esc(tt(u.tsShapeLine, { shape: tableShapeName(t) }))}${on ? ' · ' + u.tsOn : ''}</div>
    <div class="rm-preview">${tablePreviewHTML(id)}</div><div class="spin-hint">${skinsStill() ? u.tsWho : u.tsTilt}</div>
    <p style="margin:10px 0 0;line-height:1.5">${esc(t.lore)}</p><p class="hint" style="margin:6px 0 0">${u.tsHint}</p>
    <div class="btn-row" style="margin-top:12px">${btn}</div>`;
}
/* the host's picker: the tables I own and the plain one (the rooms' sheet gets this section under its own) */
function tablesPickHTML() {
  const u = U(); const mine = TABLES.filter(t => tableOwned(t.id)); if (!mine.length) return ''; const cur = myTable();
  const none = `<div class="rm-tile own ${cur ? '' : 'on'}" role="button" tabindex="0" data-a="table-set" data-id=""><div class="rm-thumb rm-plain"><span>${u.tsNoneHint}</span>${cur ? '' : `<span class="sk-badge">${u.tsOn}</span>`}</div><div class="sk-tn">${u.tsNone}</div></div>`;
  const tiles = mine.map(t => `<div class="rm-tile own ${cur === t.id ? 'on' : ''}" role="button" tabindex="0" data-a="table-set" data-id="${t.id}"><div class="rm-thumb ts-thumb"><img src="${skinUrl(t, 'thumb')}" alt="" loading="lazy" decoding="async" draggable="false" onerror="this.remove()">${cur === t.id ? `<span class="sk-badge">${u.tsOn}</span>` : ''}</div><div class="sk-tn">${esc(t.name)}</div></div>`).join('');
  return `<div class="eyebrow gold" style="margin-top:4px">🎲 ${u.tsPick}</div><div class="rm-grid">${none}${tiles}</div>`;
}
Object.assign(ACT, {
  'table-sheet'(el) { if (!TABLE[el.dataset.id]) return; S.ui.sheet = { type: 'table', id: el.dataset.id }; render(); },
  async 'table-set'(el) {
    const u = U(); const id = el.dataset.id || null; if (id && !tableOwned(id)) return; if ((myTable() || null) === id) { if (S.ui.sheet && S.ui.sheet.type === 'roomPick') { S.ui.sheet = null; render(); } return; }
    if (typeof TG === 'undefined' || !TG.app || !apiBase()) { toast(u.skTgOnly); return; }
    const prev = Object.assign({}, S.skins.equipped || {}); S.skins.equipped = Object.assign({}, prev); if (id) S.skins.equipped.table = id; else delete S.skins.equipped.table;
    if (S.ui.sheet && S.ui.sheet.type === 'roomPick') S.ui.sheet = null; render();
    const d = await api('/api/skin/equip', { role: 'table', skin: id });
    if (!d || !d.ok) { S.skins.equipped = prev; render(); toast(u.skErr); return; }
    S.skins.equipped = d.equipped || {}; save(); render(); toast(id ? tt(u.tsSet, { name: TABLE[id].name }) : u.tsOff); tgHaptic('success');
  }
});
(function () {
  const orig = sheetHTML;
  sheetHTML = function (enter) {
    const sh = S.ui.sheet; if (!sh || sh.type !== 'table') return orig.apply(this, arguments);
    const body = tableSheetHTML(sh.id); if (!body) return orig.apply(this, arguments);
    return `<div class="sheet-bg ${enter === false ? '' : 'enter'}" data-a="sheet-close"><div class="sheet" data-stop="1"><div class="grab"></div>${body}<button class="btn ghost" style="margin-top:14px" data-a="sheet-close">${U().close}</button></div></div>`;
  };
  // the host's «Background» button and sheet (18-rooms.js) also offer the tables: the button shows for a table alone, the sheet lists both
  if (typeof roomPickBtnHTML === 'function') {
    const origBtn = roomPickBtnHTML;
    roomPickBtnHTML = function () { if (!tablesMine()) return origBtn.apply(this, arguments); return `<button class="btn xs ghost" data-a="room-pick" aria-label="${U().tsPickBtn}">🏛 ${U().tsPickBtn}</button>`; };
    const origPick = roomPickHTML;
    roomPickHTML = function () { const u = U(); const rooms = typeof roomsMine === 'function' && roomsMine(); return (rooms ? origPick.apply(this, arguments) : `<h2 style="margin:0">${u.tsPickBtn}</h2><p class="hint" style="margin:4px 0 10px">${u.rmPickHint}</p>`) + tablesPickHTML(); };
    const origAct = ACT['room-pick'];
    ACT['room-pick'] = function () { if (!tablesMine()) return origAct.apply(this, arguments); S.ui.sheet = { type: 'roomPick' }; render(); };
  }
  const origRender = render;
  render = function () { origRender.apply(this, arguments); try { tablesKick(); } catch (e) {} };
})();
