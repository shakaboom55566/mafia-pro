/* ============================================================
   v56 SKINS — a skin is a new face of a role's card for the player who owns and wears it (the rules of the role stay).
   Owning: the account (season rewards; admins own all to try them on) — /api/me → S.skins = { owned, equipped }.
   Wearing: one skin per role (/api/skin/equip). Everyone sees the skin the player wears wherever that player is that character:
   the deal card, the night step of his role, the dead and the results lists, the review, the podium, his profile and his online card.
   Other players' skins: /api/skins for the tgIds at the table (kept in the game: g.skinsOf) and the public profile (FRP[id].skins).
   The same catalog is on the server (backend/src/skins.js); backend/test/run.js checks they agree. Style of new skins: skins/STYLE.md.
   3D: the face tilts with the card, the frame stays and the scene behind it moves by the skin's depth map (one shared WebGL canvas
   draws into every visible skin canvas); the foil and the glare follow the tilt. Old phones (html.lite) and no WebGL — the picture.
   ============================================================ */
/* skins:begin — the same ids and roles as SKINS in backend/src/skins.js */
const SKINS = [
  { id: 'amethyst_don', role: 'don', rarity: 'epic', season: 1, file: 'amethyst-don' },
  // v57–v67: the Epic series — a skin for every free card (names and stories: src/02w-i18n-skins-epic.js)
  { id: 'lilac_doctor', role: 'doctor', rarity: 'epic', file: 'lilac-doctor' },
  { id: 'orchid_surgeon', role: 'mafia_doctor', rarity: 'epic', file: 'orchid-surgeon' },
  { id: 'violet_armorer', role: 'gunsmith', rarity: 'epic', file: 'violet-armorer' },
  { id: 'violet_flare', role: 'kamikaze', rarity: 'epic', file: 'violet-flare' },
  { id: 'lilac_whisper', role: 'balamut', rarity: 'epic', file: 'lilac-whisper' },
  { id: 'velvet_gloves', role: 'executioner', rarity: 'epic', file: 'velvet-gloves' },
  { id: 'iris_shadow', role: 'spy', rarity: 'epic', file: 'iris-shadow' },
  { id: 'lavender_wolf', role: 'werewolf', rarity: 'epic', file: 'lavender-wolf' },
  { id: 'violet_soldier', role: 'mafia', rarity: 'epic', file: 'violet-soldier' },
  { id: 'lights_out', role: 'maniac', rarity: 'epic', file: 'lights-out' },
  { id: 'mauve_jester', role: 'jester', rarity: 'epic', file: 'mauve-jester' },
  { id: 'velvet_cat', role: 'thief', rarity: 'epic', file: 'velvet-cat' },
  { id: 'lavender_vow', role: 'monk', rarity: 'epic', file: 'lavender-vow' },
  { id: 'violet_badge', role: 'sheriff', rarity: 'epic', file: 'violet-badge' },
  { id: 'violet_ink', role: 'journalist', rarity: 'epic', file: 'violet-ink' },
  { id: 'orchid_mayor', role: 'mayor', rarity: 'epic', file: 'orchid-mayor' },
  { id: 'plum_brandy', role: 'drunk', rarity: 'epic', file: 'plum-brandy' },
  { id: 'lavender_heart', role: 'altruist', rarity: 'epic', file: 'lavender-heart' },
  { id: 'iron_violet', role: 'miller', rarity: 'epic', file: 'iron-violet' },
  { id: 'night_pact', role: 'azazel', rarity: 'epic', file: 'night-pact' },
  { id: 'dream_merchant', role: 'morpheus', rarity: 'epic', file: 'dream-merchant' },
  { id: 'the_shelter', role: 'rabbi', rarity: 'epic', file: 'the-shelter' },
  { id: 'tick_tock', role: 'bomb', rarity: 'epic', file: 'tick-tock' },
  { id: 'violet_shield', role: 'bodyguard', rarity: 'epic', file: 'violet-shield' },
  { id: 'violet_verdict', role: 'judge', rarity: 'epic', file: 'violet-verdict' },
  { id: 'lavender_baker', role: 'citizen', rarity: 'epic', file: 'lavender-baker' },
  { id: 'steady_hands', role: 'sapper', rarity: 'epic', file: 'steady-hands' },
  { id: 'final_stamp', role: 'bailiff', rarity: 'epic', file: 'final-stamp' },
  { id: 'violet_ledger', role: 'auditor', rarity: 'epic', file: 'violet-ledger' },
  { id: 'purple_knuckles', role: 'thug', rarity: 'epic', file: 'purple-knuckles' },
  { id: 'silent_petal', role: 'ninja', rarity: 'epic', file: 'silent-petal' },
  { id: 'velvet_envelope', role: 'corrupter', rarity: 'epic', file: 'velvet-envelope' },
  // v69: Mythic — 50 000 emeralds, every copy numbered (000001…), the card is animated: the ninja steps out and dodges kunai (src/17-mythic.js)
  { id: 'untouchable', role: 'ninja', rarity: 'mythic', numbered: true, file: 'untouchable', anim: 'dodge' }
];
// v71: table backgrounds — the room around the round table (role «room» on the server; a reward or an admin's gift) — src/18-rooms.js
const ROOMS = [
  // rug — where the table stands: cx, cy — the point of the picture under the table's centre (0…1); fit — the picture's size against the table
  // (so the table with all its seats stays on the carpet / the free floor, never on the furniture); tw — the table's width in the stage; ar — the stage's height / width;
  // ty — how far down the stage the table stands (0.5 — the middle; lower shows more of what is above it)
  { id: 'castelmar_club', role: 'room', rarity: 'legendary', file: 'room-castelmar-club', rug: { cx: 0.503, cy: 0.494, fit: 2.05, tw: 0.74, ar: 1.22 } },
  { id: 'khrushchevka_kitchen', role: 'room', rarity: 'legendary', file: 'room-khrushchevka-kitchen', rug: { cx: 0.51, cy: 0.53, fit: 2.35, tw: 0.62, ar: 1.33 } },
  { id: 'golden_palace', role: 'room', rarity: 'legendary', file: 'room-golden-palace', rug: { cx: 0.5, cy: 0.585, fit: 2.55, tw: 0.58, ar: 1.3, ty: 0.55 } }
];
// v74: avatar frames (role «frame» on the server) — hole: the ring's inner circle / the picture's size (the frame is scaled so the hole fits the avatar) — src/19-frames.js
const FRAMES = [
  { id: 'hw_pumpkin_patch', role: 'frame', rarity: 'sr', series: 'halloween', file: 'frame-hw-pumpkin-patch', hole: 0.4576 },
  { id: 'hw_vampire_count', role: 'frame', rarity: 'sr', series: 'halloween', file: 'frame-hw-vampire-count', hole: 0.507 },
  { id: 'hw_witch_brew', role: 'frame', rarity: 'sr', series: 'halloween', file: 'frame-hw-witch-brew', hole: 0.5415 },
  { id: 'hw_spider_queen', role: 'frame', rarity: 'sr', series: 'halloween', file: 'frame-hw-spider-queen', hole: 0.5051 },
  { id: 'hw_bone_crown', role: 'frame', rarity: 'sr', series: 'halloween', file: 'frame-hw-bone-crown', hole: 0.515 },
  { id: 'hw_ghost_parade', role: 'frame', rarity: 'sr', series: 'halloween', file: 'frame-hw-ghost-parade', hole: 0.5485 },
  { id: 'hw_werewolf_moon', role: 'frame', rarity: 'sr', series: 'halloween', file: 'frame-hw-werewolf-moon', hole: 0.4759 },
  { id: 'hw_grim_reaper', role: 'frame', rarity: 'sr', series: 'halloween', file: 'frame-hw-grim-reaper', hole: 0.4963 }
];
/* skins:end */
const SKIN = Object.fromEntries(SKINS.map(s => [s.id, s]));
/* v60: nine rarities (the owner's list, 15.10.2026) in the filter's order; abbr — the short mark, plate — the word on the pill (as on the card's plaque) */
const RARITIES = [
  { id: 'common', abbr: 'C', plate: 'COMMON' }, { id: 'rare', abbr: 'R', plate: 'RARE' }, { id: 'uncommon', abbr: 'Uc', plate: 'UNIQUE' },
  { id: 'epic', abbr: 'Ep', plate: 'EPIC' }, { id: 'legendary', abbr: 'L', plate: 'LEGENDARY' }, { id: 'sr', abbr: 'SR', plate: 'SR' },
  { id: 'ssr', abbr: 'SSR', plate: 'SSR' }, { id: 'ur', abbr: 'UR', plate: 'UR' }, { id: 'mythic', abbr: 'Mythical', plate: 'MYTHICAL' }
];
const RARITY = Object.fromEntries(RARITIES.map(r => [r.id, r]));
const rarPill = (s, style = '') => `<span class="ss-epic rar-${s.rarity}"${style ? ` style="${style}"` : ''}>${(RARITY[s.rarity] || { plate: String(s.rarity).toUpperCase() }).plate}</span>`;
['name', 'lore'].forEach(k => SKINS.forEach(s => Object.defineProperty(s, k, { get() { const p = (L.skins && L.skins[s.id]) || (I18N.ru.skins || {})[s.id] || {}; return p[k] || s.id; }, enumerable: true })));
/* the pictures live on the app's site: the same origin in the app (WebGL may read them), the full address anywhere else */
const SKIN_BASE = (() => { try { return /(^|\.)mafiapro\.app$/.test(location.hostname) ? '/skins/' : 'https://mafiapro.app/skins/'; } catch (e) { return 'https://mafiapro.app/skins/'; } })();
const skinUrl = (s, kind) => SKIN_BASE + s.file + (kind === 'seal' ? '-seal.webp' : kind === 'depth' ? '-depth.png' : kind === 'thumb' ? '-thumb.webp' : kind ? '-' + kind + '.webp' : '.webp'); // v69: 'scene', 'pose-stand'… for animated skins
S.skins = S.skins && typeof S.skins === 'object' ? S.skins : { owned: [], equipped: {} };

/* ---------- who wears what ---------- */
const SKINS_OF = {}; // tgId → { role: skin } learned this session (public profiles, tables)
const myTgId = () => (S.cloud && S.cloud.user && S.cloud.user.id) || null;
const validSkin = (id, roleId) => !!(id && SKIN[id] && SKIN[id].role === roleId);
function mySkin(roleId) { const id = S.skins && S.skins.equipped && S.skins.equipped[roleId]; return validSkin(id, roleId) ? id : null; }
function skinOfTg(tgId, roleId, g) {
  if (!tgId) return null; tgId = Number(tgId);
  if (tgId === myTgId()) return mySkin(roleId);
  const map = (g && g.skinsOf && g.skinsOf[tgId]) || SKINS_OF[tgId] || (typeof FRP !== 'undefined' && FRP[tgId] && FRP[tgId].skins) || null;
  const id = map && map[roleId]; return validSkin(id, roleId) ? id : null;
}
/* the Telegram account of a seat: an online seat, or a profile linked to Telegram; the device owner's own profile is the account */
function playerTg(g, p) {
  if (!g || !p) return null;
  const t = typeof seatTg === 'function' ? seatTg(g, p.seat) : null; if (t) return t;
  const pr = p.profileId && typeof profById === 'function' ? profById(p.profileId) : null;
  if (pr && pr.tgId) return Number(pr.tgId);
  if (pr && pr.id === S.meId && myTgId()) return myTgId();
  return null;
}
function skinOfPlayer(g, p) { return p ? skinOfTg(playerTg(g, p), p.roleId, g) : null; }
/* a profile kept on this device: its account's skin for the role */
function skinOfProfile(pr, roleId) {
  if (!pr) return null;
  if (pr.tgId) return skinOfTg(pr.tgId, roleId);
  return pr.id === S.meId && myTgId() ? mySkin(roleId) : null;
}
const skinFromMap = (map, roleId) => { const id = map && map[roleId]; return validSkin(id, roleId) ? id : null; };
/* v69: numbered skins — whose copy has which number (mine: /api/me; others: /api/skins for the table, the public profile) */
const SERIALS_OF = {}; // tgId → { skin: n }
const fmtSerial = n => String(Math.max(0, Math.trunc(Number(n) || 0))).padStart(6, '0');
function mySerial(skinId) { const m = S.skins && S.skins.serials; return m && m[skinId] != null ? Number(m[skinId]) : null; }
function serialOfTg(tgId, skinId, g) {
  if (!tgId || !SKIN[skinId] || !SKIN[skinId].numbered) return null; tgId = Number(tgId);
  if (tgId === myTgId()) return mySerial(skinId);
  const m = (g && g.serialsOf && g.serialsOf[tgId]) || SERIALS_OF[tgId] || (typeof FRP !== 'undefined' && FRP[tgId] && FRP[tgId].serials) || null;
  return m && m[skinId] != null ? Number(m[skinId]) : null;
}
function serialOfPlayer(g, p) { const sk = skinOfPlayer(g, p); return sk ? serialOfTg(playerTg(g, p), sk, g) : null; }
function serialOfProfile(pr, skinId) { if (!pr || !skinId) return null; if (pr.tgId) return serialOfTg(pr.tgId, skinId); return pr.id === S.meId && myTgId() ? mySerial(skinId) : null; }
/* the skins worn by the players of a game (the host's phone asks once per game) */
async function skinsLoad(g) {
  if (!g || g.skinsAt || typeof api !== 'function' || typeof TG === 'undefined' || !TG.app || !apiBase()) return;
  const me = myTgId(); const ids = [...new Set(g.players.map(p => playerTg(g, p)).filter(id => id && id !== me))];
  g.skinsAt = 1; if (!ids.length) { g.skinsOf = {}; return; }
  const d = await api('/api/skins', { ids }); if (!d || !d.ok) { g.skinsAt = 0; return; }
  g.skinsOf = d.skins || {}; g.serialsOf = d.serials || {}; g.skinsAt = Date.now(); Object.assign(SKINS_OF, g.skinsOf); Object.assign(SERIALS_OF, g.serialsOf);
  if (S.game === g) { save(); render(); }
}

/* ---------- drawing ---------- */
/* the card face: the plain card stays underneath (a picture that does not load just disappears), the skin covers it */
function skinLayerHTML(id, gl, serial) {
  const s = SKIN[id]; if (!s) return '';
  // v69: a numbered copy shows its number on top ('x' — a copy not bought yet: dots); an animated skin carries its empty scene for the show
  const plate = s.numbered && serial != null ? `<div class="skin-serial">№ <b>${serial === 'x' ? '······' : fmtSerial(serial)}</b></div>` : '';
  const scene = s.anim ? `<img class="skin-scene" src="${skinUrl(s, 'scene')}" alt="" draggable="false" loading="lazy" onerror="this.remove()">` : '';
  const play = s.anim ? `<button class="myth-play" data-a="myth-play" aria-label="${esc(U().myPlay || 'Play')}" title="${esc(U().myPlay || 'Play')}"><svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path d="M9 6.5v11l9-5.5z" fill="currentColor"/></svg></button>` : '';
  return `<div class="skin-layer ${s.rarity}${s.anim ? ' anim' : ''}" data-skin="${s.id}"><img class="skin-img" src="${skinUrl(s)}" alt="${esc(s.name)}" draggable="false" onerror="this.parentNode.remove()">${gl ? `<canvas class="skin-gl" data-skin="${s.id}" hidden></canvas>` : ''}${scene}<div class="skin-foil"></div><div class="skin-glare"></div>${plate}${play}</div>`;
}
const injectLast = (html, add) => { const k = html.lastIndexOf('</div>'); return k < 0 ? html : html.slice(0, k) + add + html.slice(k); };
function skinCardHTML(role, opts, skinId, gl) {
  const html = cardHTML(role, opts || {}); if (!validSkin(skinId, role.id)) return html;
  return injectLast(html.replace('class="card ', 'class="card skinned '), skinLayerHTML(skinId, gl !== false, opts && opts.serial));
}
function sealFor(role, skinId, cls = '') {
  const html = sealHTML(role, cls); if (!validSkin(skinId, role.id)) return html;
  return injectLast(html.replace('class="seal ', 'class="seal skinned '), `<img class="skin-seal" src="${skinUrl(SKIN[skinId], 'seal')}" alt="" draggable="false" onerror="this.remove()">`);
}
function card3dFor(role, key, skinId, gl, serial) {
  if (!validSkin(skinId, role.id)) return card3dHTML(role, key);
  return `<div class="card3d-wrap" data-key="${key}"><div class="card3d"><div class="face front">${skinCardHTML(role, { serial }, skinId, gl)}</div><div class="face back cardback premium">${cardBackHTML(true, SKIN[skinId].name)}</div></div></div>`;
}

/* ---------- 3D: one WebGL canvas renders every visible skin canvas (the frame stays, the scene behind it moves) ---------- */
const SKGL = { gl: null, cv: null, off: null, tex: {}, raf: 0, failed: false, last: new WeakMap() };
const SKGL_VS = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
const SKGL_FS = 'precision mediump float;uniform sampler2D img,dep;uniform vec2 off;varying vec2 v;void main(){vec2 uv=v;for(int i=0;i<6;i++){float d=texture2D(dep,uv).r;uv=v+off*(d-.9);}gl_FragColor=texture2D(img,clamp(uv,.001,.999));}';
function skglInit() {
  if (SKGL.gl || SKGL.failed) return !!SKGL.gl;
  try {
    const cv = document.createElement('canvas'); const gl = cv.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('no webgl');
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, SKGL_VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, SKGL_FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    gl.useProgram(prog); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(gl.getUniformLocation(prog, 'img'), 0); gl.uniform1i(gl.getUniformLocation(prog, 'dep'), 1);
    SKGL.gl = gl; SKGL.cv = cv; SKGL.off = gl.getUniformLocation(prog, 'off'); return true;
  } catch (e) { SKGL.failed = true; return false; }
}
function skglTexture(url) { // { ready, t } — uploaded once and kept while used; v57: at most 8 pictures stay on the GPU (33 skins would not fit a phone)
  const c = SKGL.tex[url]; if (c) { c.used = Date.now(); return c; } const gl = SKGL.gl; const rec = SKGL.tex[url] = { ready: false, t: null, used: Date.now() };
  const keys = Object.keys(SKGL.tex); if (keys.length > 8) keys.sort((a, b) => SKGL.tex[a].used - SKGL.tex[b].used).slice(0, keys.length - 8).forEach(k => { const o = SKGL.tex[k]; if (o === rec || Date.now() - o.used < 1500) return; try { if (o.t) gl.deleteTexture(o.t); } catch (e) {} delete SKGL.tex[k]; });
  const im = new Image(); if (!/^\//.test(url)) im.crossOrigin = 'anonymous';
  im.onload = () => { try { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]].forEach(([k, v]) => gl.texParameteri(gl.TEXTURE_2D, k, v)); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); rec.t = t; rec.ready = true; } catch (e) { rec.bad = true; } };
  im.onerror = () => { rec.bad = true; }; im.src = url; return rec;
}
/* the tilt of a skin: from its 3D card (turn and lean), else from the finger / the phone's tilt (PX) */
function skinTilt(el) {
  const w = el.closest('.card3d-wrap');
  if (w && typeof c3state === 'function') { const st = c3state(w.dataset.key); return [Math.sin(st.ry * Math.PI / 180), Math.max(-1, Math.min(1, -st.rx / 30))]; }
  return typeof PX !== 'undefined' ? [PX.x, PX.y] : [0, 0];
}
const skinsStill = () => { try { return document.documentElement.classList.contains('lite') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
function skglFrame() {
  SKGL.raf = 0; const layers = document.querySelectorAll('.skin-layer'); if (!layers.length) return;
  const still = skinsStill(); let drew = 0;
  layers.forEach(layer => {
    const [tx, ty] = still ? [0, 0] : skinTilt(layer);
    layer.style.setProperty('--gx', (50 + tx * 40).toFixed(1) + '%'); layer.style.setProperty('--gy', (35 + ty * 35).toFixed(1) + '%');
    layer.style.setProperty('--fx', (50 + tx * 50).toFixed(1) + '%'); layer.style.setProperty('--fy', (50 + ty * 50).toFixed(1) + '%');
    const cv = layer.querySelector('canvas.skin-gl'); if (!cv || still || drew >= 4 || !skglInit()) return;
    const s = SKIN[cv.dataset.skin]; const a = skglTexture(skinUrl(s)), b = skglTexture(skinUrl(s, 'depth')); if (a.bad || b.bad) { cv.remove(); return; } if (!a.ready || !b.ready) return;
    const r = layer.getBoundingClientRect(); if (r.width < 40 || r.bottom < 0 || r.top > innerHeight) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1); const W = Math.round(layer.offsetWidth * dpr), H = Math.round(layer.offsetHeight * dpr); // the layout size: the box of a turned 3D card is not the card's shape
    const key = `${W}x${H}:${tx.toFixed(3)},${ty.toFixed(3)}`; if (SKGL.last.get(cv) === key) return; SKGL.last.set(cv, key);
    const gl = SKGL.gl; if (SKGL.cv.width !== W || SKGL.cv.height !== H) { SKGL.cv.width = W; SKGL.cv.height = H; } gl.viewport(0, 0, W, H);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.t); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, b.t);
    gl.uniform2f(SKGL.off, -tx * 0.045, -ty * 0.035); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    try { const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, W, H); ctx.drawImage(SKGL.cv, 0, 0); cv.hidden = false; drew++; } catch (e) { cv.remove(); }
  });
  SKGL.raf = requestAnimationFrame(skglFrame);
}
function skinsAfterRender() { if (!SKGL.raf && document.querySelector('.skin-layer')) SKGL.raf = requestAnimationFrame(skglFrame); if (typeof mythAfterRender === 'function') mythAfterRender(); }
setInterval(() => { try { skinsAfterRender(); } catch (e) {} }, 700); // screens drawn by a timer (online tables) start the loop too

/* ---------- the Skins tab of the Cards screen ---------- */
function skinStatus(s) { const own = (S.skins.owned || []).includes(s.id); return { own, worn: own && mySkin(s.role) === s.id }; }
function skinHowText(s) {
  const u = U(); if (!s.season) return (S.skins.owned || []).includes(s.id) ? '' : u.skHowSoon; // v57: the Epic series — how to get it comes later
  const sz = seasonAt(Date.now()); const top = RANK_MIN.length - 1;
  return sz.n < s.season || (sz.n === s.season && sz.phase === 'live') ? tt(u.skHowSeason, { n: s.season, rank: rankName(top), date: seasonDayText(sz.n === s.season ? sz.lastDay : seasonAt(sz.next).lastDay) }) : tt(u.skHowSeasonDone, { n: s.season, rank: rankName(top) });
}
function skinItemHTML(s) {
  const u = U(); const st = skinStatus(s); const role = ROLE[s.role];
  const me = typeof myRankObj === 'function' ? myRankObj() : null;
  const btn = st.own ? `<button class="btn ${st.worn ? 'ghost' : 'primary'} sm" data-a="skin-wear" data-id="${s.id}" data-on="${st.worn ? '0' : '1'}">${st.worn ? u.skTakeOff : u.skWear}</button>`
    : typeof emSkinForSale === 'function' && emSkinForSale(s) && s.rarity === 'mythic' ? `<button class="btn primary sm" data-a="skin-sheet" data-id="${s.id}">${tt(u.myBuyBtn, { n: fmtEm(emSkinPrice(s)) })}</button>` : ''; // v69: the Mythic item opens its sheet (price, number, buy)
  const pill = `<span class="sk-pill ${st.own ? 'own' : ''}">${st.worn ? u.skWorn : st.own ? u.skOwned : u.skLocked}</span>`;
  const rank = !st.own && me ? `<div class="sk-rank">${rankSVG(rankIdx(me.points, me.games), 18)} ${u.skYourRank}: <b>${rankName(rankIdx(me.points, me.games))}</b> · <span class="num">${esc(String(me.points))}</span></div>` : '';
  return `<div class="skin-item ${s.rarity}">
    ${card3dFor(role, 'skin-' + s.id, s.id, undefined, st.own ? mySerial(s.id) : 'x')}
    <div class="sk-info"><div class="row" style="gap:8px;flex-wrap:wrap">${rarPill(s)}${pill}</div>
      <div class="sk-name">${esc(s.name)}</div><div class="hint" style="margin:0">${tt(u.skFor, { role: role.name })}</div>
      <p class="sk-lore">${esc(s.lore)}</p><div class="hint" style="margin:0">${skinHowText(s)}</div>${rank}
      ${btn ? `<div class="btn-row" style="margin-top:10px">${btn}</div>` : ''}</div></div>`;
}
/* v57: 33 skins — the season reward on top, then the series as tiles (a tile opens the skin's sheet with the 3D card and the button) */
function skinTileHTML(s) {
  const u = U(); const st = skinStatus(s); const role = ROLE[s.role];
  return `<div class="sk-tile ${s.rarity} ${st.own ? 'own' : 'locked'} ${st.worn ? 'worn' : ''}" role="button" tabindex="0" data-a="skin-sheet" data-id="${s.id}">
    <div class="sk-thumb"><img src="${skinUrl(s, 'thumb')}" alt="" loading="lazy" decoding="async" draggable="false" onerror="this.remove()">${st.worn ? `<span class="sk-badge">${u.skWorn}</span>` : ''}</div>
    <div class="sk-tn">${esc(s.name)}</div><div class="sk-tr">${esc(role.name)}</div></div>`;
}
/* v76: the Skins tab in four categories — looks (card skins), room backgrounds, the table's own look (coming), avatar frames */
const SKIN_CATS = ['looks', 'rooms', 'tables', 'frames'];
function skinCatsHTML(cat) {
  const u = U(); const n = { looks: SKINS.length, rooms: typeof ROOMS !== 'undefined' ? ROOMS.length : 0, tables: 0, frames: typeof FRAMES !== 'undefined' ? FRAMES.length : 0 };
  const lbl = { looks: u.skCatLooks, rooms: u.skCatRooms, tables: u.skCatTables, frames: u.skCatFrames };
  return `<div class="filters sk-cats">${SKIN_CATS.map(c => `<button class="chip sk-cat ${cat === c ? 'active' : ''}" data-a="skin-cat" data-id="${c}">${esc(lbl[c] || c)}${n[c] ? ` <b class="rar-ab">${n[c]}</b>` : ''}</button>`).join('')}</div>`;
}
function skinsTabHTML() {
  const cat = SKIN_CATS.includes(S.ui.skinCat) ? S.ui.skinCat : 'looks';
  if (cat !== 'looks') {
    const u = U(); const body = cat === 'rooms' ? (typeof roomsSectionHTML === 'function' ? roomsSectionHTML('all', 'all') : '') : cat === 'frames' ? (typeof framesSectionHTML === 'function' ? framesSectionHTML('all', 'all') : '') : `<div class="panel sk-soon"><div style="font-size:30px">🎲</div><p class="hint" style="margin:8px 0 0">${u.skTablesSoon}</p></div>`;
    return skinCatsHTML(cat) + body;
  }
  return skinCatsHTML(cat) + skinsLooksHTML();
}
function skinsLooksHTML() {
  const u = U(); const f = ['all', 'mine', 'black', 'city', 'neutral'].includes(S.ui.skinFilter) ? S.ui.skinFilter : 'all';
  const rf = RARITY[S.ui.skinRar] ? S.ui.skinRar : 'all'; // v60: the rarity filter (both rows work together)
  const own = id => (S.skins.owned || []).includes(id);
  const team = s => { const t = ROLE[s.role].team; return t === 'red' || t === 'ww' ? 'city' : t; };
  const rarOk = s => rf === 'all' || s.rarity === rf;
  const season = SKINS.filter(s => s.season && rarOk(s)), series = SKINS.filter(s => !s.season && s.rarity === 'epic');
  const mythic = SKINS.filter(s => s.rarity === 'mythic' && rarOk(s) && (f === 'all' || (f === 'mine' ? own(s.id) : team(s) === f))); // v69: Mythic skins on top, each in full
  const list = series.filter(s => rarOk(s) && (f === 'all' || (f === 'mine' ? own(s.id) : team(s) === f)));
  const chip = (id, t) => `<button class="chip ${f === id ? 'active' : ''}" data-a="skin-filter" data-id="${id}">${t}</button>`;
  const rchip = r => `<button class="chip rar-chip ${rf === r.id ? 'active' : ''}" data-a="skin-rar" data-id="${r.id}"><i class="rar-dot rar-${r.id}"></i>${esc((u.skRar || {})[r.id] || r.id)} <b class="rar-ab">${r.abbr}</b></button>`;
  const mine = SKINS.filter(s => own(s.id)).length;
  return `<p class="hint">${u.skHint}</p>
    <div class="filters sk-rars">${`<button class="chip rar-chip ${rf === 'all' ? 'active' : ''}" data-a="skin-rar" data-id="all">${u.skRarAll}</button>`}${RARITIES.map(rchip).join('')}</div>

    ${mythic.length ? `<div class="eyebrow gold">${u.skMythTitle}</div><div class="stack">${mythic.map(skinItemHTML).join('')}</div>` : ''}
    ${season.length && (f === 'all' || (f === 'mine' && season.some(s => own(s.id)))) ? `<div class="eyebrow gold">${u.skSeasonTitle}</div><div class="stack">${season.map(skinItemHTML).join('')}</div>` : ''}
    <div class="eyebrow gold" style="margin-top:6px">${tt(u.skSeriesTitle, { n: series.length })}${rf !== 'all' ? ` · ${esc((u.skRar || {})[rf] || rf)}` : ''}</div>
    <div class="filters">${chip('all', u.fAll)}${mine ? chip('mine', u.skMine + ' · ' + mine) : ''}${chip('black', u.fMafia)}${chip('city', u.fCity)}${chip('neutral', u.fNeutral)}</div>
    ${list.length ? `<div class="sk-grid">${list.map(skinTileHTML).join('')}</div>` : mythic.length ? '' : `<p class="hint">${rf !== 'all' ? tt(u.skRarNone, { r: (u.skRar || {})[rf] || rf }) : u.skNone}</p>`}`;
}
/* the rarity row scrolls sideways: after each render the chosen rarity is brought into view */
function skinRarScroll() {
  const row = document.querySelector && document.querySelector('.sk-rars'); const a = row && row.querySelector('.chip.active');
  if (row && a && a.offsetLeft !== undefined) row.scrollLeft = Math.max(0, a.offsetLeft - row.offsetLeft - (row.clientWidth - a.offsetWidth) / 2);
}
/* the sheet of one skin: the 3D card, its story, how to get it, put on / take off */
function skinSheetHTML(id) {
  const u = U(); const s = SKIN[id]; if (!s) return ''; const st = skinStatus(s); const role = ROLE[s.role];
  const btn = st.own ? `<button class="btn ${st.worn ? 'ghost' : 'primary'}" data-a="skin-wear" data-id="${s.id}" data-on="${st.worn ? '0' : '1'}">${st.worn ? u.skTakeOff : u.skWear}</button>` : '';
  return `<div class="sk-sheet">${card3dFor(role, 'sksheet-' + s.id, s.id, undefined, st.own ? mySerial(s.id) : 'x')}
    <div class="row" style="gap:8px;flex-wrap:wrap;justify-content:center;margin-top:12px">${rarPill(s)}<span class="sk-pill ${st.own ? 'own' : ''}">${st.worn ? u.skWorn : st.own ? u.skOwned : u.skLocked}</span></div>
    <h2 class="sk-name ${s.rarity}" style="text-align:center">${esc(s.name)}</h2><div class="hint" style="margin:0;text-align:center">${tt(u.skFor, { role: role.name })}</div>
    <p class="sk-lore" style="text-align:center">${esc(s.lore)}</p>${skinHowText(s) ? `<div class="hint" style="margin:0;text-align:center">${skinHowText(s)}</div>` : ''}
    ${btn ? `<div class="btn-row" style="margin-top:12px">${btn}</div>` : ''}</div>`;
}
/* the role's own skins under its card (the role sheet) */
function roleSkinsHTML(r) {
  const u = U(); const list = SKINS.filter(s => s.role === r.id); if (!list.length) return '';
  return `<div class="section"><div class="eyebrow gold">${u.skForRole}</div><div class="stack-s" style="margin-top:8px">${list.map(s => { const st = skinStatus(s); return `<div class="fav sk-row" role="button" tabindex="0" data-a="skin-sheet" data-id="${s.id}">${sealFor(r, s.id)}<div class="grow" style="min-width:0"><div class="n">${esc(s.name)} ${rarPill(s, 'margin:0 0 0 4px')}</div><div class="s">${st.worn ? u.skWorn : st.own ? u.skOwned : u.skLocked}</div></div><span class="rk-chev">›</span></div>`; }).join('')}</div></div>`;
}
/* the Cards screen gets a «Cards | Skins» switch at the top */
(function () {
  const orig = cardsScreen;
  cardsScreen = function () {
    const u = U(); const tab = S.ui.cardsTab === 'skins' ? 'skins' : 'cards';
    const seg = `<div class="segment">${[['cards', u.skSegCards], ['skins', u.skSegSkins]].map(([id, l]) => `<button class="${tab === id ? 'active' : ''}" data-a="cards-tab" data-v="${id}">${l}</button>`).join('')}</div>`;
    if (tab === 'skins') return `${topbar(u.skTitle, u.skSegSkins + ' · ' + SKINS.length, false)}<div class="stack">${seg}${skinsTabHTML()}</div>`;
    const html = orig(); const k = html.indexOf('<div class="stack">'); return k < 0 ? html : html.slice(0, k + 19) + seg + html.slice(k + 19);
  };
  const origSheet = sheetHTML;
  sheetHTML = function (enter) {
    const sh = S.ui.sheet; if (!sh || sh.type !== 'skin') return origSheet.apply(this, arguments);
    return `<div class="sheet-bg ${enter === false ? '' : 'enter'}" data-a="sheet-close"><div class="sheet" data-stop="1"><div class="grab"></div>${skinSheetHTML(sh.id)}<button class="btn ghost" style="margin-top:14px" data-a="sheet-close">${U().close}</button></div></div>`;
  };
  const origRender = render;
  render = function () { origRender.apply(this, arguments); try { if (S.game && !S.game.skinsAt) skinsLoad(S.game); skinsAfterRender(); skinRarScroll(); } catch (e) {} };
})();
Object.assign(ACT, {
  'cards-tab'(el) { S.ui.cardsTab = el.dataset.v === 'skins' ? 'skins' : 'cards'; render(); },
  'skin-filter'(el) { S.ui.skinFilter = el.dataset.id; render(); },
  'skin-cat'(el) { S.ui.skinCat = SKIN_CATS.includes(el.dataset.id) ? el.dataset.id : 'looks'; S.ui.sheet = null; render(); }, // v76
  'skin-rar'(el) { S.ui.skinRar = RARITY[el.dataset.id] ? el.dataset.id : 'all'; render(); },
  'skin-sheet'(el) { if (SKIN[el.dataset.id]) { S.ui.sheet = { type: 'skin', id: el.dataset.id }; render(); } },
  'skins-open'() { S.ui.sheet = null; S.ui.cardsTab = 'skins'; if (typeof go === 'function') go('cards'); else { S.screen = 'cards'; render(); } },
  async 'skin-wear'(el) {
    const u = U(); const s = SKIN[el.dataset.id]; if (!s) return; const on = el.dataset.on === '1';
    if (typeof TG === 'undefined' || !TG.app || !apiBase()) { toast(u.skTgOnly); return; }
    const prev = Object.assign({}, S.skins.equipped || {}); S.skins.equipped = Object.assign({}, prev); if (on) S.skins.equipped[s.role] = s.id; else delete S.skins.equipped[s.role]; render();
    const d = await api('/api/skin/equip', { role: s.role, skin: on ? s.id : null });
    if (!d || !d.ok) { S.skins.equipped = prev; render(); toast(u.skErr); return; }
    S.skins.equipped = d.equipped || {}; save(); render(); toast(tt(on ? u.skWornToast : u.skOffToast, { name: s.name, role: ROLE[s.role].name }));
  }
});
/* ---------- v68: an admin gives a player skins (a sheet from the player's profile or the admin panel in Settings) ----------
   every skin as a tile: a gift 🎁 (tap — take back), owned (bought or won — stays), not owned (tap — give); «Give all». */
const ADMSK = { id: null, d: null, busy: false, q: '' };
const admSkinsOn = () => !!(typeof TG !== 'undefined' && TG.app && apiBase() && S.cloud && S.cloud.admin);
function admSkinsLoad(q) {
  ADMSK.d = null; ADMSK.busy = true;
  setTimeout(async () => { const d = await api('/api/admin/skins', typeof q === 'number' ? { tgId: q } : { q }); ADMSK.busy = false; ADMSK.d = d && d.ok ? d : { error: (d && d.error) || 'network' }; if (ADMSK.d.user) ADMSK.id = ADMSK.d.user.tgId; render(); }, 0);
}
function admSkinsSheetHTML() {
  const u = U(); const d = ADMSK.d;
  if (!d) return `<h2>${u.askTitle}</h2><p class="hint">${u.askLoading}</p>`;
  if (d.error) return `<h2>${u.askTitle}</h2><p class="hint">${d.error === 'not_found' ? u.askNone : u.tgOffline}</p>`;
  const owned = d.owned || [], gifted = d.gifted || [], worn = Object.values(d.equipped || {});
  const tile = s => { const own = owned.includes(s.id), gift = gifted.includes(s.id), on = worn.includes(s.id); const role = ROLE[s.role];
    return `<div class="sk-tile ${s.rarity} ${own ? 'own' : 'locked'} ${on ? 'worn' : ''}" role="button" tabindex="0" data-a="adm-skin" data-id="${s.id}">
      <div class="sk-thumb"><img src="${skinUrl(s, s.role === 'frame' ? '' : 'thumb')}" alt="" loading="lazy" decoding="async" draggable="false" onerror="this.remove()"${s.role === 'frame' ? ' style="object-fit:contain;padding:8px"' : ''}>${own ? `<span class="sk-badge ${gift ? 'gift' : ''}">${gift ? '🎁 ' + u.askGift : on ? u.askWorn : u.askOwn}</span>` : ''}</div>
      <div class="sk-tn">${esc(s.name)}</div><div class="sk-tr">${esc(role ? role.name : s.role === 'room' ? u.rmLabel : s.role === 'frame' ? u.afLabel : s.role)}</div></div>`; };
  const ALL = SKINS.concat(typeof ROOMS !== 'undefined' ? ROOMS : [], typeof FRAMES !== 'undefined' ? FRAMES : []); // v71/v74: the table backgrounds and the frames are given the same way
  const all = ALL.length; const missing = ALL.filter(s => !owned.includes(s.id)).length;
  return `<h2 style="margin:0">${u.askTitle}</h2><div class="hint" style="margin:2px 0 0"><b>${esc(d.user.name)}</b>${d.user.username ? ' · @' + esc(d.user.username) : ''} · ${tt(u.askCount, { n: owned.length, all })}</div>
    <p class="hint" style="margin:8px 0">${u.askHint}</p>
    ${missing ? `<button class="btn primary sm" data-a="adm-skin-all" style="margin-bottom:10px">🎁 ${u.askAll} · ${missing}</button>` : ''}
    <div class="sk-grid adm">${ALL.map(tile).join('')}</div>`;
}
function admSkinsPanelHTML() { // the admin panel in Settings: open any player's skins by @username or id
  if (!admSkinsOn()) return ''; const u = U();
  return `<div class="eyebrow" style="margin-top:12px">🎨 ${u.askPanel}</div><div class="hint" style="margin:4px 0 6px">${u.askPanelHint}</div>
    <div class="row"><input class="input grow" id="adm-sk-q" data-a="adm-sk-q" placeholder="@username" value="${esc(ADMSK.q)}" autocomplete="off" autocapitalize="off"><button class="btn sm" data-a="adm-sk-find" style="flex:0 0 auto">${u.askOpen}</button></div>`;
}
Object.assign(ACT, {
  'adm-skins'(el) { if (!admSkinsOn()) return; const id = Number(el.dataset.id); if (!id) return; ADMSK.id = id; S.ui.sheet = { type: 'admSkins' }; admSkinsLoad(id); render(); },
  'adm-sk-q'(el) { ADMSK.q = el.value || ''; },
  'adm-sk-find'() { if (!admSkinsOn()) return; const q = ADMSK.q.trim(); if (!q) return; S.ui.sheet = { type: 'admSkins' }; admSkinsLoad(/^\d+$/.test(q) ? Number(q) : q); render(); },
  async 'adm-skin'(el) {
    const u = U(); const d = ADMSK.d; const s = SKIN[el.dataset.id] || (typeof ROOM !== 'undefined' && ROOM[el.dataset.id]) || (typeof FRAME !== 'undefined' && FRAME[el.dataset.id]); if (!d || !d.user || !s || ADMSK.busy) return;
    const own = (d.owned || []).includes(s.id), gift = (d.gifted || []).includes(s.id);
    if (own && !gift) { toast(u.askKeep); return; }
    ADMSK.busy = true; const r = await api('/api/admin/skin', { tgId: d.user.tgId, skin: s.id, give: !own }); ADMSK.busy = false;
    if (!r || !r.ok) { toast(u.tgOffline); return; }
    ADMSK.d = r; toast(tt(own ? u.askTook : u.askGave, { name: s.name })); tgHaptic(own ? 'light' : 'success'); render();
  },
  async 'adm-skin-all'() {
    const u = U(); const d = ADMSK.d; if (!d || !d.user || ADMSK.busy) return;
    ADMSK.busy = true; const r = await api('/api/admin/skin', { tgId: d.user.tgId, skin: 'all', give: true }); ADMSK.busy = false;
    if (!r || !r.ok) { toast(u.tgOffline); return; }
    ADMSK.d = r; toast(tt(u.askGaveAll, { n: (r.changed || []).length })); tgHaptic('success'); render();
  }
});
(function () {
  try { // the search field in the admin panel: typing and Enter
    document.addEventListener('input', e => { const el = e.target && e.target.closest && e.target.closest('[data-a="adm-sk-q"]'); if (el) ACT['adm-sk-q'](el); });
    document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'adm-sk-q') { e.preventDefault(); ACT['adm-sk-find'](); } });
  } catch (e) {}
  const orig = sheetHTML;
  sheetHTML = function (enter) {
    const sh = S.ui.sheet; if (!sh || sh.type !== 'admSkins') return orig.apply(this, arguments);
    return `<div class="sheet-bg ${enter === false ? '' : 'enter'}" data-a="sheet-close"><div class="sheet" data-stop="1"><div class="grab"></div>${admSkinsSheetHTML()}<button class="btn ghost" style="margin-top:14px" data-a="sheet-close">${U().close}</button></div></div>`;
  };
})();
