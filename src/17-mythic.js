/* ============================================================
   v69 MYTHIC: the living card «Untouchable» (Ninja; every copy is numbered — the plate on top, src/12-skins.js).
   The show (~6 s): the card turns face up and freezes, she steps out of the frame (the card shows the empty rooftop),
   four kunai fly at her from the four corners of the screen — she side-steps, flips over, drops low and vanishes in smoke,
   time slows down at each miss — then she goes back into the card.
   It plays by itself: when the skin's sheet opens, when the card is dealt to its owner, on my card at an online table
   (once each) and once per visit of the Skins tab; ▶ on the card plays it again; a tap anywhere ends it.
   Not on html.lite / reduced motion. Art (skins/): untouchable-scene.webp (the card without her), -stand / -flip / -crouch.webp
   (cut-outs; «stand» is cut from the card itself, so stepping out is seamless). MYTH_ART: where each cut-out sits, in fractions
   of the card (x, y, w, h) and its body centre inside the cut-out (ax, ay).
   For the channel video: MYTH.manual = true, ACT['myth-play'](…) and mythSeek(ms) draws any moment (skins/tools/myth-video.js).
   ============================================================ */
const MYTH_ART = {
  untouchable: {
    stand: { x: 0.0562, y: 0.125, w: 0.88, h: 0.7817, ax: 0.5627, ay: 0.4086 },
    flip: { w: 1.0513, h: 0.6417, ax: 0.4912, ay: 0.4755 },
    crouch: { w: 1.175, h: 0.6425, ax: 0.5119, ay: 0.5058 }
  }
};
const MYTH_POSES = ['stand', 'flip', 'crouch'];
const MYTH = { run: null, seen: new WeakSet(), keys: new Set(), pre: {}, manual: false, tabAt: 0 };
// the story clock (ms): out — she steps out; k0 + k·gap — the kunai k is thrown, it reaches her `fly` later; back — into the card
const MT = { out0: 280, out1: 860, k0: 1000, gap: 760, fly: 400, back0: 4300, back1: 4900, end: 5600 };
const MYTH_MOVES = ['step', 'flip', 'crouch', 'blink']; // one per kunai: from the top-left, top-right, bottom-right, bottom-left corner

function mythPreload(s) {
  if (MYTH.pre[s.id]) return MYTH.pre[s.id];
  const load = url => new Promise(ok => { const im = new Image(); im.decoding = 'async'; im.onload = () => { (im.decode ? im.decode() : Promise.resolve()).then(() => ok(im), () => ok(im)); }; im.onerror = () => ok(null); im.src = url; });
  MYTH.pre[s.id] = Promise.all([load(skinUrl(s, 'scene'))].concat(MYTH_POSES.map(p => load(skinUrl(s, p))))).then(a => (a.every(Boolean) ? a : (delete MYTH.pre[s.id], null)));
  return MYTH.pre[s.id];
}
const mClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mLerp = (a, b, t) => a + (b - a) * t;
const mEaseIO = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const mEaseOut = t => 1 - Math.pow(1 - t, 3);
const mEaseBack = t => { const c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const mSeg = (t, a, b) => mClamp((t - a) / (b - a), 0, 1);
function mRand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/* real ms → story ms: the time slows down around each miss */
function mythClock() {
  const hits = [0, 1, 2, 3].map(k => MT.k0 + k * MT.gap + MT.fly);
  const sp = tau => { let s = 1; hits.forEach(h => { s -= 0.62 * Math.exp(-Math.pow((tau - h) / 120, 2)); }); return Math.max(0.3, s); };
  const tab = [0]; let tau = 0; while (tau < MT.end) { tau += sp(tau) * 4; tab.push(tau); }
  return { dur: (tab.length - 1) * 4, at: r => { const i = mClamp(r / 4, 0, tab.length - 1); const i0 = Math.floor(i); return i0 + 1 < tab.length ? mLerp(tab[i0], tab[i0 + 1], i - i0) : tab[tab.length - 1]; } };
}
const KUNAI_SVG = '<svg viewBox="0 0 120 30" aria-hidden="true"><defs><linearGradient id="mkb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#c7ccd6"/><stop offset="1" stop-color="#7d8390"/></linearGradient></defs><circle cx="8" cy="15" r="6" fill="none" stroke="#c9ccd6" stroke-width="3"/><rect x="14" y="11.5" width="33" height="7" rx="2" fill="#2a0b12"/><path d="M19 11.5v7M25 11.5v7M31 11.5v7M37 11.5v7M43 11.5v7" stroke="#b3122b" stroke-width="2"/><rect x="46" y="9.5" width="4" height="11" rx="1" fill="#9aa0ab"/><polygon points="50,15 66,4 120,15 66,26" fill="url(#mkb)"/><path d="M52 15H117" stroke="#fff" stroke-width="1.2" opacity=".75"/><polygon points="60,15 66,11.5 72,15 66,18.5" fill="#d4142e"/></svg>';

/* ---------- the show ---------- */
async function mythPlay(layer, force) {
  const s = SKIN[layer && layer.dataset.skin]; const art = s && MYTH_ART[s.id]; if (!art || MYTH.run) return;
  if (skinsStill() && !force) return;
  MYTH.run = { starting: true };
  const imgs = await Promise.race([mythPreload(s), new Promise(ok => setTimeout(() => ok(null), 3000))]);
  if (!imgs || !layer.isConnected) { MYTH.run = null; return; }
  const wrap = layer.closest('.card3d-wrap'); const wkey = wrap && wrap.dataset.key; const inSheet = !!layer.closest('.sheet');
  const find = () => (layer.isConnected ? layer : (layer = (wkey ? document.querySelector(`${inSheet ? '.sheet ' : ''}.card3d-wrap[data-key="${wkey}"] .skin-layer.anim[data-skin="${s.id}"]`) : document.querySelector(`.flip.open .skin-layer.anim[data-skin="${s.id}"]`)) || layer));
  const R0 = layer.getBoundingClientRect(); const W0 = layer.offsetWidth || R0.width, H0 = layer.offsetHeight || R0.height;
  const vw = window.innerWidth, vh = window.innerHeight; const st = art.stand;
  const S1 = mClamp(0.68 * Math.min(vh, vw * 1.7) / (st.h * H0), 1.05, 1.6); // how much bigger she is out of the card
  const fx = document.createElement('div'); fx.className = 'myth-fx';
  const el = (tag, cls, html) => { const e = document.createElement(tag); e.className = cls; if (html) e.innerHTML = html; fx.appendChild(e); return e; };
  const dim = el('div', 'myth-dim');
  const ring = el('div', 'myth-ring'); const rs = W0 * 0.95; ring.style.width = ring.style.height = rs + 'px';
  const poseImg = (p, cls) => { const a = art[p]; const im = document.createElement('img'); im.className = cls; im.src = imgs[1 + MYTH_POSES.indexOf(p)].src; im.alt = ''; im.draggable = false;
    const w = a.w * W0 * S1, h = a.h * H0 * S1; im.style.width = w + 'px'; im.style.height = h + 'px'; im.style.setProperty('--ox', (a.ax * 100) + '%'); im.style.setProperty('--oy', (a.ay * 100) + '%'); im._w = w; im._h = h; im._a = a; im.style.opacity = 0; fx.appendChild(im); return im; };
  const ghosts = [1, 2, 3].map(() => Object.fromEntries(MYTH_POSES.map(p => [p, poseImg(p, 'myth-ghost')])));
  const hero = Object.fromEntries(MYTH_POSES.map(p => [p, poseImg(p, 'myth-hero')]));
  const Lk = mClamp(W0 * 0.36, 64, 120);
  const kunai = [0, 1, 2, 3].map(() => { const k = el('div', 'myth-kunai', '<i class="tr"></i>' + KUNAI_SVG); k.style.width = Lk + 'px'; k.style.height = (Lk / 4) + 'px'; k.style.opacity = 0; return k; });
  const rnd = mRand(68);
  const sparks = []; [0, 1, 2].forEach(k => { for (let i = 0; i < 14; i++) sparks.push({ k, e: el('i', 'myth-spark'), a: (rnd() - 0.5) * 1.9, v: 0.3 + rnd() * 0.55, life: 360 + rnd() * 220, len: 0.6 + rnd() * 0.9 }); });
  const smoke = []; [0, 1].forEach(w => { for (let i = 0; i < 9; i++) { const e = el('i', 'myth-smoke'); const sz = W0 * (0.22 + rnd() * 0.2); e.style.width = e.style.height = sz + 'px'; smoke.push({ w, e, sz, a: rnd() * Math.PI * 2, v: 0.04 + rnd() * 0.09, life: 620 + rnd() * 260, d: rnd() * 90 }); } });
  sparks.forEach(p => { p.e.style.width = (16 * p.len) + 'px'; p.e.style.opacity = 0; }); smoke.forEach(p => { p.e.style.opacity = 0; });
  document.body.appendChild(fx);
  const clock = mythClock();
  const R = { s, art, fx, dim, ring, hero, ghosts, kunai, sparks, smoke, W0, H0, S1, vw, vh, Lk, find, wkey, clock, t0: performance.now(), fired: {}, dimAt: '' };
  MYTH.run = R;
  fx.addEventListener('pointerdown', e => { e.preventDefault(); mythStop(); });
  if (!MYTH.manual) { const loop = () => { if (MYTH.run !== R) return; const t = performance.now() - R.t0; if (t >= clock.dur) { mythStop(); return; } mythDraw(R, clock.at(t)); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  else mythDraw(R, 0);
}
function mythSeek(realMs) { const R = MYTH.run; if (!R || !R.clock) return 0; mythDraw(R, R.clock.at(realMs)); return R.clock.dur; }
function mythStop() {
  const R = MYTH.run; MYTH.run = null; if (!R || !R.fx) return;
  const l = R.find && R.find(); if (l) { l.classList.remove('myth-on'); l.style.removeProperty('--mo'); l.style.removeProperty('--mg'); }
  if (R.wkey && typeof c3state === 'function') c3state(R.wkey).idle = Date.now();
  R.fx.style.transition = 'opacity .25s'; R.fx.style.opacity = 0; R.fx.style.pointerEvents = 'none'; setTimeout(() => R.fx.remove(), 280);
}
/* one moment of the show, story time tau (ms) */
function mythDraw(R, tau) {
  const layer = R.find(); if (!layer || !layer.isConnected) { mythStop(); return; }
  // the card: face up and still while she is out
  if (R.wkey && typeof c3state === 'function') { const st = c3state(R.wkey); const tgt = Math.round(st.ry / 360) * 360; st.ry += (tgt - st.ry) * 0.3; st.rx += (0 - st.rx) * 0.3; st.idle = Date.now() + 2000; const w = layer.closest('.card3d-wrap'); if (w) card3dApply(w); }
  const r = layer.getBoundingClientRect(); const W = r.width, H = r.height; const a = R.art.stand;
  if (W < 20) { mythStop(); return; }
  const C0 = { x: r.left + (a.x + a.ax * a.w) * W, y: r.top + (a.y + a.ay * a.h) * H };
  const hw = a.w * R.W0 * R.S1 / 2, hh = a.h * R.H0 * R.S1 / 2;
  const C1 = { x: mClamp(r.left + W / 2, hw * 0.7 + 6, R.vw - hw * 0.7 - 6), y: mClamp(r.top + H * 0.47, hh * 0.85 + 6, R.vh - hh * 0.85 - 6) };
  const vw = R.vw, vh = R.vh;
  // the kunai: corner → her, the dodge of each
  const corners = [{ x: 0, y: 0 }, { x: vw, y: 0 }, { x: vw, y: vh }, { x: 0, y: vh }];
  const K = corners.map((c, k) => {
    const dx = C1.x - c.x, dy = C1.y - c.y, len = Math.hypot(dx, dy) || 1; const d = { x: dx / len, y: dy / len };
    const L = MT.k0 + k * MT.gap, Hh = L + MT.fly; const start = { x: c.x - d.x * R.Lk * 1.2, y: c.y - d.y * R.Lk * 1.2 }; const dist = Math.hypot(C1.x - start.x, C1.y - start.y);
    const move = MYTH_MOVES[k]; let n = { x: -d.y, y: d.x };
    const want = move === 'flip' ? (n.y > 0 ? -1 : 1) : move === 'crouch' ? (n.y < 0 ? -1 : 1) : (n.x >= 0 ? 1 : -1); // a flip goes up, a crouch goes down, a step / a blink to the right
    n = { x: n.x * want, y: n.y * want };
    const m = move === 'step' ? hw * 0.95 : move === 'flip' ? hh * 0.85 : move === 'crouch' ? hh * 0.7 : hw * 0.9;
    const T = { x: mClamp(C1.x + n.x * m, hw * 0.55, vw - hw * 0.55), y: mClamp(C1.y + n.y * m, hh * 0.6, vh - hh * 0.6) };
    return { c, d, L, H: Hh, start, v: dist / MT.fly, move, D: { x: T.x - C1.x, y: T.y - C1.y } };
  });
  const heroAt = t => {
    if (t < MT.out0) return { x: C0.x, y: C0.y, s: 1, rot: 0, pose: 'stand', op: 0 };
    if (t < MT.out1) { const p = mSeg(t, MT.out0, MT.out1); const e = mEaseIO(p); return { x: mLerp(C0.x, C1.x, e), y: mLerp(C0.y, C1.y, e) - Math.sin(p * Math.PI) * H * 0.06, s: mLerp(1, R.S1, mEaseBack(p)), rot: Math.sin(p * Math.PI) * -4, pose: 'stand', op: 1 }; }
    if (t >= MT.back0) { const p = mSeg(t, MT.back0, MT.back1); const e = mEaseIO(p); return { x: mLerp(C1.x, C0.x, e), y: mLerp(C1.y, C0.y, e) - Math.sin(p * Math.PI) * H * 0.05, s: mLerp(R.S1, 1, e), rot: 0, pose: 'stand', op: t > MT.back1 ? 0 : 1 }; }
    let x = C1.x, y = C1.y + Math.sin(t / 240) * H * 0.008, rot = 0, pose = 'stand', op = 1;
    K.forEach(k => {
      const u = t < k.H - 200 ? 0 : t < k.H - 50 ? mEaseOut(mSeg(t, k.H - 200, k.H - 50)) : t < k.H + 140 ? 1 : mEaseIO(1 - mSeg(t, k.H + 140, k.H + 440));
      if (k.move === 'blink') {
        if (t >= k.H - 170 && t < k.H + 60) op = 1 - mSeg(t, k.H - 170, k.H - 110);
        if (t >= k.H + 60 && t < k.H + 440) { op = mSeg(t, k.H + 60, k.H + 130); const b = mEaseIO(1 - mSeg(t, k.H + 160, k.H + 440)); x += k.D.x * b; y += k.D.y * b; }
        return;
      }
      if (!u) return;
      x += k.D.x * u; y += k.D.y * u;
      if (k.move === 'step') rot = (k.D.x >= 0 ? 1 : -1) * 13 * u;
      if (k.move === 'flip' && t > k.H - 170 && t < k.H + 360) { pose = 'flip'; rot = (k.D.x >= 0 ? 1 : -1) * 360 * mEaseIO(mSeg(t, k.H - 170, k.H + 360)); }
      if (k.move === 'crouch' && t > k.H - 160 && t < k.H + 330) pose = 'crouch';
    });
    return { x, y, s: R.S1, rot, pose, op };
  };
  // the card: her picture fades into the empty scene when she leaves and comes back when she returns
  const mo = tau < MT.out0 ? 0 : tau < MT.back1 - 140 ? mSeg(tau, MT.out0, MT.out0 + 110) : 1 - mSeg(tau, MT.back1 - 140, MT.back1);
  const mg = Math.max(Math.exp(-Math.pow((tau - MT.out0) / 160, 2)), Math.exp(-Math.pow((tau - MT.back1) / 200, 2)));
  if (!layer.classList.contains('myth-on')) layer.classList.add('myth-on');
  layer.style.setProperty('--mo', mo.toFixed(3)); layer.style.setProperty('--mg', mg.toFixed(3));
  // the dim around the card
  const cx = r.left + W / 2, cy = r.top + H / 2; const key = `${Math.round(cx)},${Math.round(cy)},${Math.round(H)}`;
  if (R.dimAt !== key) { R.dimAt = key; R.dim.style.background = `radial-gradient(circle at ${cx}px ${cy}px, rgba(20,0,6,.05) 0, rgba(20,0,6,.05) ${H * 0.42}px, rgba(14,0,5,.78) ${H * 0.95}px)`; }
  R.dim.style.opacity = (Math.min(mSeg(tau, 0, 320), 1 - mSeg(tau, MT.back1, MT.end))).toFixed(3);
  // the portal ring: when she steps out and when she comes back
  const ringAt = (t0) => { const p = mSeg(tau, t0, t0 + 560); return p > 0 && p < 1 ? p : 0; };
  const rp = ringAt(MT.out0 - 40) || ringAt(MT.back1 - 180);
  R.ring.style.opacity = rp ? (0.95 * (1 - rp)).toFixed(3) : 0;
  if (rp) R.ring.style.transform = `translate3d(${cx - R.W0 * 0.475}px, ${cy - R.W0 * 0.475}px, 0) scale(${(0.25 + rp * 1.6).toFixed(3)})`;
  // her and her afterimages
  const place = (im, h, op) => { const a = im._a; im.style.opacity = op.toFixed(3); if (op <= 0.001) return; im.style.transform = `translate3d(${(h.x - a.ax * im._w).toFixed(1)}px, ${(h.y - a.ay * im._h).toFixed(1)}px, 0) rotate(${h.rot.toFixed(2)}deg) scale(${(h.s / R.S1).toFixed(4)})`; };
  const h = heroAt(tau);
  MYTH_POSES.forEach(p => place(R.hero[p], h, p === h.pose ? h.op : 0));
  const prev = heroAt(tau - 30); const speed = Math.hypot(h.x - prev.x, h.y - prev.y) + Math.abs(h.rot - prev.rot) * 0.6;
  const motion = mClamp((speed - 2) / (R.H0 * 0.07), 0, 1);
  R.ghosts.forEach((g, i) => { const gh = heroAt(tau - (i + 1) * 36); const op = motion * [0.3, 0.17, 0.08][i] * Math.min(gh.op, h.op || gh.op); MYTH_POSES.forEach(p => place(g[p], gh, p === gh.pose ? op : 0)); });
  // the kunai
  K.forEach((k, i) => {
    const e = R.kunai[i]; if (tau < k.L) { e.style.opacity = 0; return; }
    const tr = (tau - k.H) * k.v; const tip = { x: C1.x + k.d.x * tr, y: C1.y + k.d.y * tr };
    if (tr > Math.hypot(vw, vh) + R.Lk * 3) { e.style.opacity = 0; return; }
    e.style.opacity = 1; e.style.transform = `translate3d(${(tip.x - R.Lk).toFixed(1)}px, ${(tip.y - R.Lk / 8).toFixed(1)}px, 0) rotate(${(Math.atan2(k.d.y, k.d.x) * 180 / Math.PI).toFixed(2)}deg)`;
    if (tau >= k.H && !R.fired[i]) { R.fired[i] = 1; if (!MYTH.manual && typeof tgHaptic === 'function') try { tgHaptic('light'); } catch (x) {} }
  });
  // sparks where a blade grazes past, smoke where she vanishes and appears
  R.sparks.forEach(p => {
    const k = K[p.k]; const age = tau - k.H; if (age < 0 || age > p.life) { p.e.style.opacity = 0; return; }
    const ang = Math.atan2(k.d.y, k.d.x) + p.a; const P0 = { x: C1.x + k.D.x * 0.38, y: C1.y + k.D.y * 0.38 };
    const dist = p.v * age; const x = P0.x + Math.cos(ang) * dist, y = P0.y + Math.sin(ang) * dist + 0.0006 * age * age;
    p.e.style.opacity = (1 - age / p.life).toFixed(3); p.e.style.transform = `translate3d(${(x - 16 * p.len).toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(ang * 180 / Math.PI).toFixed(1)}deg)`;
  });
  const kb = K[3];
  R.smoke.forEach(p => {
    const t0 = (p.w ? kb.H + 50 : kb.H - 160) + p.d * (p.w ? 0.5 : 0.3); const age = tau - t0; if (age < 0 || age > p.life) { p.e.style.opacity = 0; return; }
    const at = p.w ? { x: C1.x + kb.D.x, y: C1.y + kb.D.y } : { x: C1.x, y: C1.y }; const q = age / p.life;
    const x = at.x + Math.cos(p.a) * p.v * age, y = at.y + Math.sin(p.a) * p.v * age - 0.05 * age;
    p.e.style.opacity = (0.9 * (1 - q) * Math.min(1, age / 80)).toFixed(3); p.e.style.transform = `translate3d(${(x - p.sz / 2).toFixed(1)}px, ${(y - p.sz / 2).toFixed(1)}px, 0) scale(${(0.5 + q * 1.9).toFixed(3)})`;
  });
}

/* ---------- when it plays by itself ---------- */
function mythSoon(findLayer, ms) { setTimeout(() => { if (MYTH.run) return; const l = findLayer(); if (l) mythPlay(l); }, ms); }
function mythAfterRender() {
  if (typeof document === 'undefined' || !document.querySelectorAll || skinsStill()) return;
  const layers = document.querySelectorAll('.skin-layer.anim'); if (!layers.length) return;
  layers.forEach(l => { const s = SKIN[l.dataset.skin]; if (s) mythPreload(s); });
  if (MYTH.run) return;
  const sh = S.ui && S.ui.sheet;
  if (sh && sh.type === 'skin' && SKIN[sh.id] && SKIN[sh.id].anim) { if (!MYTH.seen.has(sh)) { MYTH.seen.add(sh); mythSoon(() => document.querySelector('.sheet .sk-sheet .skin-layer.anim'), 650); } return; }
  const g = S.game; const f = document.querySelector('.flip.open .skin-layer.anim');
  if (f && g) { const k = 'deal:' + g.id + ':' + g.dealIdx; if (!MYTH.keys.has(k)) { MYTH.keys.add(k); mythSoon(() => document.querySelector('.flip.open .skin-layer.anim'), 700); } return; }
  const t = document.querySelector('.card3d-wrap[data-key="tb"] .skin-layer.anim');
  if (t && typeof TB !== 'undefined') { const k = 'tb:' + (TB.code || '') + ':' + t.dataset.skin; if (!MYTH.keys.has(k)) { MYTH.keys.add(k); mythSoon(() => document.querySelector('.card3d-wrap[data-key="tb"] .skin-layer.anim'), 600); } return; }
  // the Skins tab: once per visit, when the Mythic card is fully on screen
  if (S.screen === 'cards' && S.ui.cardsTab === 'skins') {
    if (MYTH.tabAt) return; const l = document.querySelector('.skin-item .skin-layer.anim'); if (!l) return;
    const r = l.getBoundingClientRect(); if (r.top < 0 || r.bottom > window.innerHeight || r.width < 60) return;
    MYTH.tabAt = Date.now(); mythSoon(() => { const x = document.querySelector('.skin-item .skin-layer.anim'); return S.screen === 'cards' && S.ui.cardsTab === 'skins' && !S.ui.sheet ? x : null; }, 900);
  } else MYTH.tabAt = 0;
}
/* after buying: the sheet stays open — the show with the new number on top */
function mythPlaySheet(id) { setTimeout(() => { const l = document.querySelector(`.sheet .sk-sheet .skin-layer.anim[data-skin="${id}"]`); if (l && !MYTH.run) mythPlay(l, true); }, 500); }
// ▶ on the card must not start turning the 3D card (05-profiles.js listens to pointerdown on the card)
document.addEventListener('pointerdown', e => { if (e.target && e.target.closest && e.target.closest('.myth-play')) e.stopImmediatePropagation(); }, true);
Object.assign(ACT, {
  'myth-play'(el) { const l = el.closest('.skin-layer'); if (!l) return; if (MYTH.run && MYTH.run.fx) mythStop(); setTimeout(() => mythPlay(l, true), MYTH.run ? 300 : 0); }
});
