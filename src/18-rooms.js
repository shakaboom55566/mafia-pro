/* ============================================================
   v71 TABLE BACKGROUNDS — the room around the round table (the table itself stays the app's own)
   - owning: like a skin (role «room» on the server): a reward or an admin's gift; admins own all. Not sold.
   - putting up: one room per player (/api/skin/equip { role: 'room' }); the host's room is what everyone at his table sees:
     the host's lobby and game screens use his own (S.skins.equipped.room), the players get it with the table (/api/table/state → room).
   - 2.5D: the picture and its depth map (Depth Anything) in one WebGL canvas that is moved from table to table (kept across renders);
     the near things (lamps, palms, the bar) shift against the floor with the phone's tilt / the finger and a slow drift of the camera,
     a warm haze breathes over it. Old phones (html.lite), reduced motion, no WebGL — the still picture.
   ============================================================ */
const ROOM = Object.fromEntries(ROOMS.map(r => [r.id, r]));
['name', 'lore'].forEach(k => ROOMS.forEach(r => Object.defineProperty(r, k, { get() { const p = (L.skins && L.skins[r.id]) || (I18N.ru.skins || {})[r.id] || {}; return p[k] || r.id; }, enumerable: true })));
const roomOwned = id => !!ROOM[id] && (S.skins.owned || []).includes(id);
const myRoom = () => { const id = S.skins && S.skins.equipped && S.skins.equipped.room; return roomOwned(id) ? id : null; };
const tbRoom = () => { const id = typeof TB !== 'undefined' && TB.data && TB.data.room; return ROOM[id] ? id : null; };
/* the stage: the room fills it, the table stands in the middle on the carpet (rug.fit — the picture against the table, rug.cx/cy — the carpet's centre).
   The still picture is placed by CSS the same way the 2.5D canvas draws it, so the canvas fades in without a jump. */
const roomRug = r => Object.assign({ cx: 0.5, cy: 0.5, fit: 2 }, r && r.rug);
function roomLayerHTML(id) {
  const r = ROOM[id]; if (!r) return ''; const g = roomRug(r);
  const img = `width:calc(var(--rt-w) * ${g.fit});transform:translate(${(-g.cx * 100).toFixed(2)}%,${(-g.cy * 100).toFixed(2)}%)`;
  return `<div class="rt-room" data-room="${r.id}" aria-hidden="true"><img class="rt-room-img" style="${img}" src="${skinUrl(r)}" alt="" decoding="async" draggable="false" onerror="this.remove()"><div class="rt-room-haze"></div><div class="rt-room-vig"></div></div>`;
}

/* ---------- 2.5D: one WebGL canvas, moved into whichever table is on screen ---------- */
const RMGL = { gl: null, cv: null, off: null, ctr: null, sc: null, tex: {}, failed: false, raf: 0, tx: 0, ty: 0, last: '', at: 0 };
// b — the point of the picture under this pixel (ctr — the carpet's centre at the stage's centre, sc — the stage's size in pictures); then the parallax by depth
const RMGL_FS = 'precision mediump float;uniform sampler2D img,dep;uniform vec2 off,ctr,sc;varying vec2 v;void main(){vec2 b=ctr+(v-.5)*sc;vec2 uv=b;for(int i=0;i<8;i++){float d=texture2D(dep,uv).r;uv=b+off*(d-.03);}gl_FragColor=texture2D(img,clamp(uv,.001,.999));}';
function rmglInit() {
  if (RMGL.gl || RMGL.failed) return !!RMGL.gl;
  try {
    const cv = document.createElement('canvas'); cv.className = 'rt-room-gl'; const gl = cv.getContext('webgl', { premultipliedAlpha: false, alpha: false });
    if (!gl) throw new Error('no webgl');
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, SKGL_VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, RMGL_FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    gl.useProgram(prog); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(gl.getUniformLocation(prog, 'img'), 0); gl.uniform1i(gl.getUniformLocation(prog, 'dep'), 1);
    RMGL.gl = gl; RMGL.cv = cv; RMGL.off = gl.getUniformLocation(prog, 'off'); RMGL.ctr = gl.getUniformLocation(prog, 'ctr'); RMGL.sc = gl.getUniformLocation(prog, 'sc');
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); RMGL.failed = true; cv.remove(); }, false);
    return true;
  } catch (e) { RMGL.failed = true; return false; }
}
function rmglTexture(url) { // { ready, t, bad } — a room is 2 pictures; the last room's stay
  const c = RMGL.tex[url]; if (c) return c; const gl = RMGL.gl; const rec = RMGL.tex[url] = { ready: false, t: null };
  Object.keys(RMGL.tex).forEach(k => { if (k !== url && Object.keys(RMGL.tex).length > 4) { const o = RMGL.tex[k]; try { if (o.t) gl.deleteTexture(o.t); } catch (e) {} delete RMGL.tex[k]; } });
  const im = new Image(); if (!/^\//.test(url)) im.crossOrigin = 'anonymous';
  im.onload = () => { try { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]].forEach(([k, v]) => gl.texParameteri(gl.TEXTURE_2D, k, v)); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); rec.t = t; rec.ready = true; } catch (e) { rec.bad = true; } };
  im.onerror = () => { rec.bad = true; }; im.src = url; return rec;
}
function roomFrame(now) {
  RMGL.raf = 0; const layer = document.querySelector('.rt-room'); if (!layer) { RMGL.last = ''; return; }
  RMGL.raf = requestAnimationFrame(roomFrame);
  if (skinsStill()) { if (RMGL.cv) RMGL.cv.remove(); return; } if (!rmglInit()) return;
  const r = ROOM[layer.dataset.room]; if (!r) return;
  if (RMGL.cur !== r.id) { RMGL.cur = r.id; RMGL.cv.classList.remove('on'); RMGL.last = ''; } // another room: the old picture must not show while the new one loads
  const a = rmglTexture(skinUrl(r)), b = rmglTexture(skinUrl(r, 'depth'));
  if (a.bad || b.bad) { RMGL.cv.remove(); return; } if (!a.ready || !b.ready) return;
  const box = layer.getBoundingClientRect(); if (box.width < 40 || box.bottom < 0 || box.top > innerHeight) return;
  if (now - RMGL.at < 30 && !RMGL.fixed) return; RMGL.at = now; // ~30 frames a second is plenty for a room
  // the camera: the finger / the phone's tilt, plus a slow drift so the room breathes on its own
  const t = now / 1000; const px = typeof PX !== 'undefined' ? PX : { x: 0, y: 0 };
  const gx = Math.max(-1, Math.min(1, px.x * 0.9 + Math.sin(t * 0.29) * 0.32)), gy = Math.max(-1, Math.min(1, px.y * 0.9 + Math.cos(t * 0.21) * 0.26));
  RMGL.tx += (gx - RMGL.tx) * 0.12; RMGL.ty += (gy - RMGL.ty) * 0.12; if (RMGL.fixed) [RMGL.tx, RMGL.ty] = RMGL.fixed; // fixed: a set camera (the channel video's frames)
  const dpr = Math.min(1.75, window.devicePixelRatio || 1); const W = Math.round(layer.offsetWidth * dpr), H = Math.round(layer.offsetHeight * dpr);
  const tb = layer.parentNode && layer.parentNode.querySelector('.rtable'); const g = roomRug(r); const D = (tb ? tb.offsetWidth : layer.offsetWidth * 0.74) * g.fit * dpr; if (!D) return; // the picture's size on screen
  const cv = RMGL.cv; if (cv.parentNode !== layer) { layer.insertBefore(cv, layer.querySelector('.rt-room-haze')); RMGL.last = ''; }
  const key = `${r.id}:${W}x${H}:${Math.round(D)}:${RMGL.tx.toFixed(3)},${RMGL.ty.toFixed(3)}`; if (RMGL.last === key) return; RMGL.last = key;
  const gl = RMGL.gl; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; } gl.viewport(0, 0, W, H);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.t); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, b.t);
  gl.uniform2f(RMGL.ctr, g.cx, g.cy); gl.uniform2f(RMGL.sc, W / D, H / D);
  gl.uniform2f(RMGL.off, -RMGL.tx * 0.025, -RMGL.ty * 0.025); // the carpet (depth ≈ 0) stays under the table; the walls move up to ~2.5 % of the picture
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  cv.classList.add('on');
}
function roomsKick() { if (!RMGL.raf && document.querySelector('.rt-room')) RMGL.raf = requestAnimationFrame(roomFrame); }
setInterval(() => { try { roomsKick(); } catch (e) {} }, 400); // tables are drawn by renders and by timers (online) — the loop finds them

/* ---------- choosing: the Skins tab section, a room's sheet, the host's quick picker ---------- */
function roomTileHTML(r) {
  const u = U(); const own = roomOwned(r.id), on = myRoom() === r.id;
  return `<div class="rm-tile ${own ? 'own' : 'locked'} ${on ? 'on' : ''}" role="button" tabindex="0" data-a="room-sheet" data-id="${r.id}">
    <div class="rm-thumb"><img src="${skinUrl(r, 'thumb')}" alt="" loading="lazy" decoding="async" draggable="false" onerror="this.remove()">${on ? `<span class="sk-badge">${u.rmOn}</span>` : own ? '' : '<span class="rm-lock">🔒</span>'}</div>
    <div class="sk-tn">${esc(r.name)}</div><div class="sk-tr">${rarPill(r)}</div></div>`;
}
function roomsSectionHTML(f, rf) {
  if (f && !['all', 'mine'].includes(f)) return ''; // the team filters are about cards
  const list = ROOMS.filter(r => (rf === 'all' || !rf || r.rarity === rf) && (f !== 'mine' || roomOwned(r.id))); if (!list.length) return '';
  const u = U(); return `<div class="eyebrow gold">🏛 ${u.rmTitle}</div><p class="hint" style="margin:2px 0 8px">${u.rmHint}</p><div class="rm-grid">${list.map(roomTileHTML).join('')}</div>`;
}
/* a preview: the room with an empty table of 8 seats in the middle — exactly what the players will see */
function roomPreviewHTML(id) {
  const u = U(); const seats = Array.from({ length: 8 }, (_, i) => ({ seat: i + 1 }));
  const center = `<div class="rt-brand">Mafia <em>PRO</em></div><div class="rt-n">${esc(ROOM[id] ? ROOM[id].name : u.rmNone)}</div>`;
  return roundTableHTML(seats, {}, center, {}, id);
}
function roomSheetHTML(id) {
  const u = U(); const r = ROOM[id]; if (!r) return '';
  const own = roomOwned(id), on = myRoom() === id;
  const btn = !own ? `<p class="hint" style="margin:10px 0 0">${u.rmHow}</p>` : on ? `<button class="btn ghost" data-a="room-set" data-id="">${u.rmOffBtn}</button>` : `<button class="btn primary" data-a="room-set" data-id="${r.id}">${u.rmSetBtn}</button>`;
  return `<div class="row" style="gap:8px;align-items:center"><h2 class="grow" style="margin:0">${esc(r.name)}</h2>${rarPill(r)}</div>
    <div class="hint" style="margin:2px 0 10px">${u.rmLabel}${on ? ' · ' + u.rmOn : ''}</div>
    <div class="rm-preview">${roomPreviewHTML(id)}</div><div class="spin-hint">${skinsStill() ? u.rmWho : u.rmTilt}</div>
    <p style="margin:10px 0 0;line-height:1.5">${esc(r.lore)}</p><p class="hint" style="margin:6px 0 0">${u.rmHint}</p>
    <div class="btn-row" style="margin-top:12px">${btn}</div>`;
}
/* the host's picker (the lobby's «Background» button): his rooms and «no background» */
function roomPickHTML() {
  const u = U(); const mine = ROOMS.filter(r => roomOwned(r.id)); const cur = myRoom();
  const none = `<div class="rm-tile own ${cur ? '' : 'on'}" role="button" tabindex="0" data-a="room-set" data-id=""><div class="rm-thumb rm-plain"><span>${u.rmNoneHint}</span>${cur ? '' : `<span class="sk-badge">${u.rmOn}</span>`}</div><div class="sk-tn">${u.rmNone}</div></div>`;
  const tiles = mine.map(r => `<div class="rm-tile own ${cur === r.id ? 'on' : ''}" role="button" tabindex="0" data-a="room-set" data-id="${r.id}"><div class="rm-thumb"><img src="${skinUrl(r, 'thumb')}" alt="" loading="lazy" decoding="async" draggable="false" onerror="this.remove()">${cur === r.id ? `<span class="sk-badge">${u.rmOn}</span>` : ''}</div><div class="sk-tn">${esc(r.name)}</div></div>`).join('');
  return `<h2 style="margin:0">${u.rmPick}</h2><p class="hint" style="margin:4px 0 10px">${u.rmPickHint}</p><div class="rm-grid">${none}${tiles}</div>`;
}
const roomsMine = () => ROOMS.some(r => roomOwned(r.id));
function roomPickBtnHTML() { return roomsMine() ? `<button class="btn xs ghost" data-a="room-pick" aria-label="${U().rmPick}">🏛 ${U().rmBtn}</button>` : ''; }
Object.assign(ACT, {
  'room-sheet'(el) { if (!ROOM[el.dataset.id]) return; S.ui.sheet = { type: 'room', id: el.dataset.id }; render(); },
  'room-pick'() { if (!roomsMine()) return; S.ui.sheet = { type: 'roomPick' }; render(); },
  async 'room-set'(el) {
    const u = U(); const id = el.dataset.id || null; if (id && !roomOwned(id)) return; if ((myRoom() || null) === id) { if (S.ui.sheet && S.ui.sheet.type === 'roomPick') { S.ui.sheet = null; render(); } return; }
    if (typeof TG === 'undefined' || !TG.app || !apiBase()) { toast(u.skTgOnly); return; }
    const prev = Object.assign({}, S.skins.equipped || {}); S.skins.equipped = Object.assign({}, prev); if (id) S.skins.equipped.room = id; else delete S.skins.equipped.room;
    if (S.ui.sheet && S.ui.sheet.type === 'roomPick') S.ui.sheet = null; render();
    const d = await api('/api/skin/equip', { role: 'room', skin: id });
    if (!d || !d.ok) { S.skins.equipped = prev; render(); toast(u.skErr); return; }
    S.skins.equipped = d.equipped || {}; save(); render(); toast(id ? tt(u.rmSet, { name: ROOM[id].name }) : u.rmOff); tgHaptic('success');
  }
});
(function () {
  const orig = sheetHTML;
  sheetHTML = function (enter) {
    const sh = S.ui.sheet; if (!sh || (sh.type !== 'room' && sh.type !== 'roomPick')) return orig.apply(this, arguments);
    const body = sh.type === 'room' ? roomSheetHTML(sh.id) : roomPickHTML(); if (!body) return orig.apply(this, arguments);
    return `<div class="sheet-bg ${enter === false ? '' : 'enter'}" data-a="sheet-close"><div class="sheet" data-stop="1"><div class="grab"></div>${body}<button class="btn ghost" style="margin-top:14px" data-a="sheet-close">${U().close}</button></div></div>`;
  };
})();
