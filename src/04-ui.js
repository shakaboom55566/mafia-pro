/* ============================================================
   UI
   ============================================================ */
const DEFAULT_SETTINGS = { intro: 30, speech: 60, balagan: 180, tieSpeech: 30, revealDead: true, sound: true, lang: null, lite: 'auto' };
let S = {
  screen: 'home', tab: 'game', settings: Object.assign({}, DEFAULT_SETTINGS),
  setup: { n: 10, comp: presetFor(10), names: [], seatProfiles: [] },
  game: null, profiles: [], meId: null, demoSeeded: false, owned: { roles: [], scenarios: [] },
  ui: { cardFilter: 'all', role: null, pick: [], mode: 'check', result: null, showAll: false, voteOpen: null, kamikaze: null, trig: null, sheet: null, tie: null, confirmReset: false }
};
const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const U = () => L.ui;
const SAVE_KEY = 'mafiapro.v1';
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ settings: S.settings, setup: S.setup, game: S.game, profiles: S.profiles, meId: S.meId, demoSeeded: S.demoSeeded, owned: S.owned, lobby: S.lobby || null })); } catch (e) {} }
function load() { try { const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (d) { if (d.settings) S.settings = Object.assign({}, DEFAULT_SETTINGS, d.settings); if (d.setup) S.setup = Object.assign({ seatProfiles: [] }, d.setup); if (d.game) S.game = d.game; if (d.profiles) S.profiles = d.profiles; if (d.meId) S.meId = d.meId; if (d.demoSeeded) S.demoSeeded = true; if (d.owned) S.owned = Object.assign({ roles: [], scenarios: [] }, d.owned); if (d.lobby) S.lobby = d.lobby; } } catch (e) {} }

let toastT = null;
function toast(msg) { const old = $('.toast'); if (old) old.remove(); const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2800); }

/* ---------- audio ---------- */
let AC = null;
function beep(n = 2) {
  if (!S.settings.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < n; i++) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine'; o.frequency.value = 880; o.connect(g); g.connect(AC.destination);
      const t = AC.currentTime + i * .22; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.25, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + .18);
      o.start(t); o.stop(t + .2);
    }
  } catch (e) {}
}

/* ---------- timer ---------- */
const T = { key: null, total: 0, left: 0, running: false, iv: null };
function timerStart(sec, key) {
  if (T.key === key) return;
  clearInterval(T.iv); T.key = key; T.total = sec; T.left = sec; T.running = true;
  T.iv = setInterval(timerTick, 1000);
}
function timerTick() {
  if (!T.running) return;
  T.left -= 1;
  if (T.left === 0) { beep(3); }
  timerPaint();
}
function timerPaint() {
  const el = $('#timer'); if (!el) return;
  const m = Math.floor(Math.abs(T.left) / 60), s = Math.abs(T.left) % 60;
  el.querySelector('.t').textContent = (T.left < 0 ? '-' : '') + m + ':' + String(s).padStart(2, '0');
  const C = 2 * Math.PI * 36; const frac = T.total ? Math.max(0, Math.min(1, T.left / T.total)) : 0;
  el.querySelector('circle.fg').style.strokeDashoffset = C * (1 - frac);
  el.classList.toggle('over', T.left <= 0);
  const pb = el.querySelector('[data-a="timer-toggle"]'); if (pb) pb.textContent = T.running ? U().pause : U().start;
}
function timerHTML(sec, key) {
  timerStart(sec, key);
  const C = 2 * Math.PI * 36;
  return `<div class="timer" id="timer">
    <div class="ring"><svg viewBox="0 0 80 80"><circle class="bg" cx="40" cy="40" r="36"/><circle class="fg" cx="40" cy="40" r="36" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><div class="t">0:00</div></div>
    <div class="ctl">
      <button class="btn sm" data-a="timer-toggle">${U().pause}</button>
      <button class="btn sm ghost" data-a="timer-add">${U().plus30}</button>
      <button class="btn sm ghost" data-a="timer-reset">${U().reset}</button>
    </div></div>`;
}

/* ---------- icons ---------- */
const I = {
  friends: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9.5" cy="8" r="3.3"/><path d="M3.5 19c.4-3.4 2.9-5.3 6-5.3s5.6 1.9 6 5.3"/><path d="M18 7v6M15 10h6"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  game: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.5-.8z"/></svg>',
  cards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="12" height="16" rx="2"/><path d="M8 7h4M8 11h4"/><path d="M16 7l3 .6a2 2 0 0 1 1.6 2.3L18.8 20a2 2 0 0 1-2.3 1.6L10 20.4"/></svg>',
  scen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V9M10 19V5M16 19v-8M22 19H2"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>',
  users: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2a4.6 4.6 0 0 1 5 4.8"/></svg>',
  list: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  tg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M21.5 4.5L2.9 11.7c-1 .4-1 1 .2 1.3l4.6 1.4 1.8 5.5c.2.6.4.8.8.8.5 0 .7-.2 1-.5l2.6-2.5 4.8 3.5c.9.5 1.5.2 1.7-.8l3.2-15c.3-1.3-.5-1.9-1.1-1.6z"/></svg>',
  globe: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/><path d="M12 14v3M8 21h8M9 21v-1a3 3 0 0 1 3-3 3 3 0 0 1 3 3v1"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.5-8.5-9A4 4 0 0 1 12 7a4 4 0 0 1 8.5 4C19 15.5 12 20 12 20z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M12.5 7.5l4 4"/></svg>',
  club: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-6 9 6"/><path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9"/><path d="M3 19h18"/></svg>',
  person: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>'
};

/* ---------- shared pieces ---------- */
function sealHTML(role, cls = '') { return `<div class="seal ${role.team} ${cls}" title="${role.name}">${roleArt(role.id, 'portrait')}</div>`; }
function nameIcon(role) { return `<span class="name-ico">${roleIcon(role.id, 16)}${role.name}</span>`; }
function teamPill(role) { return `<span class="pill ${role.team}">${TEAM_SHORT[role.team]}</span>`; }
function cardHTML(role, opts = {}) {
  const prem = !!role.premium;
  return `<div class="card ${role.team} ${prem ? 'premium' : ''}">
    <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>${prem ? '<i class="gem"></i><div class="shine"></div>' : ''}
    ${opts.seat ? `<div class="seat-tag">${tt(U().seatTag, { seat: opts.seat })}</div>` : ''}${opts.fam ? `<div class="fam-tag">${esc(FAMILY_NAMES[opts.fam])}</div>` : ''}
    <div class="team">${TEAM_LABEL[role.team]}</div>
    <div class="art">${roleArt(role.id)}</div>
    <div class="name">${role.name}</div>
    <div class="kind">${role.kind}</div>
    <div class="orn"></div>
    <div class="rule">${role.short}</div>
    <div class="lore">${role.lore}</div>
    <div class="mono-tag">${role.mono}</div>
  </div>`;
}
function topbar(title, sub, back = true) {
  return `<div class="topbar">${back ? `<button class="back" data-a="back" aria-label="${U().back}">${I.back}</button>` : ''}<div class="title"><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div></div>`;
}
function tabbar() {
  const t = (id, ico, lbl) => `<button class="tab ${S.tab === id ? 'active' : ''}" data-a="tab" data-id="${id}">${ico}<span>${lbl}</span></button>`;
  return `<nav class="tabbar"><div class="inner">${t('game', I.game, U().tabGame)}${t('cards', I.cards, U().tabCards)}${t('clubs', I.club, U().tabClubs)}${t('friends', I.friends, U().tabFriends)}${t('ratings', I.trophy, U().tabRatings)}${t('settings', I.gear, U().tabSettings)}</div></nav>`;
}
function statsBar(st) {
  const seg = (k, c) => st[k] ? `<i class="b-${c}" style="width:${100 * st[k] / st.total}%"></i>` : '';
  return `<div class="bar">${seg('black', 'black')}${seg('ww', 'ww')}${seg('neutral', 'neutral')}${seg('red', 'red')}</div>`;
}
function langChips(cls = '') {
  return `<div class="filters ${cls}">${LANGS.map(([c, n]) => `<button class="chip ${L.code === c ? 'active' : ''}" data-a="lang" data-id="${c}">${n}</button>`).join('')}</div>`;
}

/* ============================================================ SCREENS */
function render() {
  const app = $('#app');
  let html = '';
  const noTabs = S.screen === 'deal';
  switch (S.screen) {
    case 'home': html = homeScreen(); break;
    case 'setup': html = setupScreen(); break;
    case 'deal': html = dealScreen(); break;
    case 'game': html = S.game ? (S.game.winner ? endScreen() : gameScreen()) : homeScreen(); break;
    case 'cards': html = cardsScreen(); break;
    case 'scenarios': html = scenariosScreen(); break;
    case 'settings': html = settingsScreen(); break;
    case 'profiles': html = profilesScreen(); break;
    case 'myprofile': html = myProfileScreen(); break;
    case 'pstats': html = typeof playerStatsScreen === 'function' ? playerStatsScreen() : myProfileScreen(); break;
    case 'profile': html = profileScreen(); break;
    case 'ratings': html = ratingsScreen(); break;
    case 'friends': html = friendsScreen(); break;
    case 'clubs': html = typeof clubsScreen === 'function' ? clubsScreen() : ''; break;
    case 'club': html = typeof clubScreen === 'function' ? clubScreen() : ''; break;
    case 'table': html = typeof tableScreen === 'function' ? tableScreen() : ''; break;
    case 'shop': html = shopScreen(); break;
  }
  // enter animations only when the screen / phase / sheet actually changes (not on every tap)
  const key = S.screen + '|' + (S.screen === 'game' && S.game ? (S.game.winner ? 'end' : S.game.phase) : '') + '|' + (S.screen === 'profile' ? S.ui.profileId : '');
  const enter = key !== RENDER.key; RENDER.key = key;
  const sheetKey = S.ui.sheet ? S.ui.sheet.type + ':' + (S.ui.sheet.id || '') : '';
  const sheetEnter = !!sheetKey && sheetKey !== RENDER.sheetKey; RENDER.sheetKey = sheetKey;
  app.innerHTML = `<div class="screen ${noTabs ? 'no-tabs' : ''} ${enter ? 'enter' : ''}">${html}</div>${noTabs ? '' : tabbar()}${sheetHTML(sheetEnter)}`;
  if ($('#timer')) timerPaint();
  if ($('.card3d-wrap')) card3dInit();
  fitCards(); mountLazyArt();
  if (S.ui.flipAnim) {
    // the card was rendered in its previous state — flip it on the next frame so the 3D turn is animated
    S.ui.flipAnim = false; const f = $('.flip'); const open = !!(S.game && S.game.dealOpen);
    if (f) requestAnimationFrame(() => requestAnimationFrame(() => f.classList.toggle('open', open)));
  }
  save();
}
const RENDER = { key: null, sheetKey: null };
/* Cards have a fixed height: shrink their text (CSS --fs) until nothing overflows — covers long translations and
   mobile browsers that boost font sizes (iOS text autosizing), which the fixed px sizes cannot anticipate. */
/* gallery art is injected only when a card comes near the viewport — 55 illustrations at once were too heavy for older phones */
function lazyArt(id, eager) { return eager ? `<div class="art">${roleArt(id)}</div>` : `<div class="art lazy" data-art="${id}"></div>`; }
let artObserver = null;
function mountLazyArt() {
  if (!document.querySelectorAll) return;
  const pending = document.querySelectorAll('.art.lazy[data-art]'); if (!pending.length) return;
  const fill = el => { if (!el.dataset.art) return; el.innerHTML = roleArt(el.dataset.art); el.classList.remove('lazy'); delete el.dataset.art; };
  if (typeof IntersectionObserver === 'undefined') { pending.forEach(fill); return; }
  if (!artObserver) artObserver = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { artObserver.unobserve(e.target); fill(e.target); } }), { rootMargin: '360px 0px' });
  pending.forEach(el => artObserver.observe(el));
}
/* lite mode: reduced-motion preference, an explicit setting, or a slow device (small core count / memory, or a slow script benchmark) */
function detectLite() {
  const pref = S.settings.lite || 'auto';
  if (pref === 'on') return true; if (pref === 'off') return false;
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    const ua = navigator.userAgent || ''; const ios = /iPhone|iPad|iPod/.test(ua);
    const sw = screen && screen.width, sh = screen && screen.height, dpr = window.devicePixelRatio || 1;
    // iPhone X / XS / 11 Pro (375×812@3), XS Max / 11 Pro Max (414×896@3), 6–8 / SE (375×667, 320×568): older-class GPUs
    if (ios && ((sw === 375 && sh === 812) || (sw === 414 && sh === 896 && dpr >= 3) || (sw === 375 && sh === 667) || sw <= 320)) { LITE.why = 'ios-model'; return true; }
    if (!ios && navigator.deviceMemory && navigator.deviceMemory <= 3) { LITE.why = 'memory'; return true; }
    if (!ios && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) { LITE.why = 'cores'; return true; }
    if (typeof performance !== 'undefined' && performance.now) { const t0 = performance.now(); let x = 0; for (let i = 0; i < 1.2e6; i++) x += Math.sqrt(i) * ((i & 3) + 1); const dt = performance.now() - t0; LITE.bench = dt; if (x < 0) return false; if (dt > 12) { LITE.why = 'bench'; return true; } }
  } catch (e) {}
  return false;
}
const LITE = { on: false, bench: 0 };
function applyLite() { LITE.on = detectLite(); try { document.documentElement.classList.toggle('lite', LITE.on); } catch (e) {} if (typeof C3 !== 'undefined') C3.lite = LITE.on; }
function fitCards() {
  if (!document.querySelectorAll) return;
  // tab labels: six tabs on a phone — shrink a label that does not fit its cell instead of clipping it
  document.querySelectorAll('.tab span').forEach(sp => { let fs = 10; sp.style.fontSize = ''; const cell = sp.parentElement; if (!cell || !cell.clientWidth) return; while (fs > 7 && sp.scrollWidth > cell.clientWidth - 4) { fs -= .5; sp.style.fontSize = fs + 'px'; } });
  document.querySelectorAll('.card:not(.mini)').forEach(card => {
    let fs = 1; card.style.setProperty('--fs', '1');
    const lore = card.querySelector('.lore'), rule = card.querySelector('.rule');
    const clipped = (el, minLines) => { if (!el) return false; const cs = getComputedStyle(el); const lh = parseFloat(cs.lineHeight) || 14; const pad = parseFloat(cs.paddingTop) || 0; const visible = Math.floor((el.clientHeight - pad) / lh + 0.05), total = Math.round((el.scrollHeight - pad) / lh); return visible < Math.min(minLines, total); };
    // overflow of the card itself, a clipped rule, or fewer than three visible lore lines → shrink the text
    const over = () => card.scrollHeight > card.clientHeight + 1 || clipped(rule, 6) || clipped(lore, 3);
    let guard = 0;
    while (over() && fs > 0.62 && guard++ < 12) { fs = Math.round((fs - 0.04) * 100) / 100; card.style.setProperty('--fs', String(fs)); }
    // show the lore as whole lines only: clamp it to the number of lines that fit in the space left
    if (lore) { const cs = getComputedStyle(lore); const lh = parseFloat(cs.lineHeight) || 14; const pad = parseFloat(cs.paddingTop) || 0; const lines = Math.max(1, Math.floor((lore.clientHeight - pad) / lh + 0.05)); lore.style.webkitLineClamp = String(lines); lore.style.flex = 'none'; }
  });
}
try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitCards()); } catch (e) {}
try { window.addEventListener('resize', () => fitCards()); } catch (e) {}

/* ---------- Home ---------- */
function homeScreen() {
  const g = S.game; const u = U();
  const cont = g && !g.winner ? `<button class="menu-item primary" data-a="continue"><div class="ico">${I.play}</div><div><div class="t">${u.continueGame}</div><div class="d">${phaseName(g)} · ${tt(u.aliveOf, { alive: alive(g).length, n: g.n })}</div></div><span class="chev">${I.chev}</span></button>` : '';
  return `
  <div class="hero">
    <div class="row"><div class="eyebrow gold grow">${u.heroEyebrow}</div><button class="btn xs ghost" data-a="go" data-to="settings" aria-label="${u.language}">${I.globe} ${L.code.toUpperCase()}</button></div>
    <h1 class="brand">Mafia <em>Pro</em></h1>
    <p class="tag">${u.heroTag}</p>
    <div class="skyline"></div>
  </div>
  <div class="menu">
    ${cont}
    <button class="menu-item ${cont ? '' : 'primary'}" data-a="new"><div class="ico">${I.plus}</div><div><div class="t">${u.newGame}</div><div class="d">${u.newGameD}</div></div><span class="chev">${I.chev}</span></button>
    <button class="menu-item" data-a="scen-use" data-id="classic"><div class="ico">${I.users}</div><div><div class="t">${u.classicTitle}</div><div class="d">${u.classicSub}</div></div><span class="chev">${I.chev}</span></button>
    <button class="menu-item" data-a="go" data-to="cards"><div class="ico">${I.cards}</div><div><div class="t">${u.cardsTitle}</div><div class="d">${tt(u.cardsD, { n: ROLES.length, roles: plural(ROLES.length, 'roles') })}</div></div><span class="chev">${I.chev}</span></button>
    <button class="menu-item" data-a="go" data-to="scenarios"><div class="ico">${I.scen}</div><div><div class="t">${u.scenTitle}</div><div class="d">${u.scenD}</div></div><span class="chev">${I.chev}</span></button>
    <button class="menu-item" data-a="go" data-to="myprofile"><div class="ico">${I.person}</div><div><div class="t">${u.myProfile}</div><div class="d">${u.myProfileD}</div></div><span class="chev">${I.chev}</span></button>
    <button class="menu-item" data-a="go" data-to="clubs"><div class="ico">${I.club}</div><div><div class="t">${u.tabClubs}</div><div class="d">${u.clubsSub}</div></div><span class="chev">${I.chev}</span></button>
    <button class="menu-item" data-a="go" data-to="ratings"><div class="ico">${I.trophy}</div><div><div class="t">${u.tabRatings}</div><div class="d">${u.ratingsD}</div></div><span class="chev">${I.chev}</span></button>
    <button class="menu-item" data-a="go" data-to="shop"><div class="ico" style="background:#f0cd7a;color:#1a1206;border-color:transparent">${I.cards}</div><div><div class="t">${u.shop}</div><div class="d">${u.shopD}</div></div><span class="chev">${I.chev}</span></button>
  </div>
  <div class="panel" style="margin-top:14px">
    <div class="row"><div class="ico" style="color:var(--gold)">${I.tg}</div><div class="grow"><div class="eyebrow">${u.tgTitle}</div><div class="hint">${u.tgText}</div></div></div>
  </div>`;
}

/* ---------- Setup ---------- */
function setupScreen() {
  const u = U(); const st = S.setup, stats = compositionStats(st.comp);
  const two = st.n >= TWO_FAMILIES_FROM;
  const groups = [['black', u.groupFamily], ['ww', u.groupWW], ['neutral', u.groupNeutral], ['red', u.groupCity]];
  const cnt = id => st.comp.filter(x => x === id).length;
  const rows = groups.map(([team, title]) => {
    const rs = ROLES.filter(r => r.team === team);
    return `<div class="comp-group"><div class="eyebrow" style="margin:6px 0">${title}</div><div class="comp">${rs.map(r => {
      const c = cnt(r.id); const lockedRole = r.premium && !ownsRole(r.id);
      return `<div class="comp-row ${c ? '' : 'off'} ${lockedRole ? 'locked' : ''}">${sealHTML(r)}<div><div class="n">${r.name} ${r.premium ? `<span class="price">${lockedRole ? u.priceCard : '★'}</span>` : ''}</div><div class="s">${r.short}</div></div>
        <div class="ctl">${lockedRole ? `<button data-a="buy" data-kind="${r.pack ? 'pack' : 'role'}" data-id="${r.pack || r.id}" style="width:auto;padding:0 10px;color:#f0cd7a">${LOCK}</button>` : `<button data-a="comp" data-id="${r.id}" data-d="-1" aria-label="${u.remove}">−</button><span class="c">${c}</span><button data-a="comp" data-id="${r.id}" data-d="1" aria-label="${u.add}">+</button>`}</div></div>`;
    }).join('')}</div></div>`;
  }).join('');
  const dons = cnt('don');
  const sc = st.scenario ? SCENARIO[st.scenario] : null;
  const twoFrom = sc && sc.mods.twoFamiliesFrom ? sc.mods.twoFamiliesFrom : TWO_FAMILIES_FROM;
  const two2 = st.n >= twoFrom;
  const unowned = unownedInComp(st.comp);
  let warn = '';
  if (unowned.length) warn = `<div class="warnbox">${tt(u.lockedInComp, { list: unowned.map(id => ROLE[id].name).join(', ') })}</div>`;
  else if (stats.total !== st.n) warn = `<div class="warnbox">${tt(u.warnCount, { total: stats.total, n: st.n, verb: stats.total < st.n ? u.addVerb : u.removeVerb, diff: Math.abs(stats.total - st.n) })}</div>`;
  else if (two2 && dons !== 2) warn = `<div class="warnbox">${tt(u.warnTwoDons, { n: twoFrom })}</div>`;
  else if (!two2 && dons !== 1) warn = `<div class="warnbox">${u.warnOneDon}</div>`;
  else if (stats.blackShare < 22 || stats.blackShare > 40) warn = `<div class="warnbox">${tt(u.warnShare, { pct: stats.blackShare })}</div>`;
  else {
    const isPreset = !sc && st.comp.slice().sort().join() === presetFor(st.n).sort().join(); const b = BALANCE[st.n];
    const sim = sc && sc.free ? u.classicSub : isPreset && b ? tt(u.okSim, { m: b.mafia, c: b.city, x: b.maniac ? tt(u.okSimManiac, { v: b.maniac }) : '' }) : u.okChanged;
    const neut = st.comp.includes('maniac') ? u.okManiac : stats.neutral ? tt(u.okNeutralN, { n: stats.neutral }) : '';
    warn = `<div class="okbox">${tt(u.okComp, { black: stats.black, ww: stats.ww ? u.okWW : '', maniac: neut, red: stats.red, note: sc ? '' : (PRESET_NOTES[st.n] || '') })}${sim}</div>`;
  }
  const ok = !unowned.length && stats.total === st.n && (two2 ? dons === 2 : dons === 1);
  const scenBanner = sc ? `<div class="panel" style="border-color:rgba(240,205,122,.5)"><div class="row"><span class="premium-pill ${sc.free ? 'classic' : ''}">${sc.free ? u.classicPill : u.premium}</span><div class="grow"><div style="font-weight:800">${tt(u.scenActive, { name: sc.name })}</div><div class="hint">${scenarioPlayers(sc)}${scenarioModsText(sc).length ? ' · ' + scenarioModsText(sc).join(' · ') : ''}</div></div><button class="btn xs ghost" data-a="scen-clear">×</button></div></div>` : '';
  const sp = st.seatProfiles || [];
  const names = Array.from({ length: st.n }, (_, i) => {
    const pr = sp[i] ? profById(sp[i]) : null;
    const inner = pr ? `<div class="seat-prof">${avatarHTML(pr, 'xs')}<span class="n" data-a="prof-open" data-id="${pr.id}" role="button">${esc(pr.name)}</span><button class="x" data-a="seat-clear" data-i="${i}" aria-label="${u.remove}">×</button></div>`
      : `<input class="input" id="name-${i}" data-i="${i}" data-a="name" placeholder="${tt(L.e.player, { n: i + 1 })}" value="${esc(st.names[i] || '')}" autocomplete="off">`;
    return `<div class="name-row"><span class="seat">${i + 1}</span>${inner}</div>`;
  }).join('');
  const seatable = S.profiles.filter(pr => pr.id !== S.meId); // the host runs the game and never takes a seat
  const chips = `${seatable.length ? `<div class="prof-chips">${seatable.map(pr => { const used = sp.includes(pr.id); return `<button class="prof-chip ${used ? 'used' : ''}" data-a="seat-assign" data-id="${pr.id}">${avatarHTML(pr, 'xs')}${esc(pr.name)}</button>`; }).join('')}<button class="prof-chip" data-a="prof-new" style="border-style:dashed">+ ${u.newProfile}</button></div><p class="hint">${u.seatHint2}</p>` : `<p class="hint">${u.noProfilesHint}</p><button class="btn sm ghost" data-a="prof-new" style="align-self:flex-start">+ ${u.newProfile}</button>`}`;
  return `${topbar(u.newGame, u.setupSub)}
  <div class="stack">
    ${scenBanner}
    <div class="stepper"><div><div class="lbl">${u.players}</div><div class="val num">${st.n}</div><div class="hint">${two2 ? u.twoFamilies : u.oneFamily}</div></div>
      <div class="ctl"><button data-a="n" data-d="-1" aria-label="${u.less}">−</button><button data-a="n" data-d="1" aria-label="${u.more}">+</button></div></div>
    <input class="range" type="range" id="nrange" min="${sc ? sc.min : MIN_PLAYERS}" max="${sc ? sc.max : MAX_PLAYERS}" value="${st.n}" data-a="nrange" aria-label="${u.playerCount}">
    <div class="meter">
      <div class="m"><div class="v num" style="color:var(--steel-2)">${stats.black}</div><div class="k">${tt(u.mBlack, { pct: stats.blackShare })}</div></div>
      <div class="m"><div class="v num" style="color:var(--crimson-2)">${stats.red + stats.ww}</div><div class="k">${u.mCity}</div></div>
      <div class="m"><div class="v num" style="color:var(--gold-2)">${stats.active}</div><div class="k">${u.mActive}</div></div>
    </div>
    ${statsBar(stats)}
    ${warn}
    <div class="row"><h2 class="grow">${u.composition}</h2><button class="btn xs ghost" data-a="preset">${u.resetPreset}</button></div>
    ${rows}
    <h2>${u.names}</h2>
    <p class="hint">${u.namesHint}</p>
    ${typeof setupLobbyHTML === 'function' ? setupLobbyHTML(st) : ''}
    ${chips}
    <div class="names">${names}</div>
    <div class="sticky-bottom"><button class="btn primary" data-a="deal" ${ok ? '' : 'disabled'}>${u.dealCards}</button></div>
  </div>`;
}

/* ---------- Deal ---------- */
function dealScreen() {
  const u = U(); const g = S.game; const done = g.dealIdx >= g.players.length;
  const p = done ? null : g.players[g.dealIdx]; const r = p ? ROLE[p.roleId] : null;
  const prog = `<div class="progress">${g.players.map((x, i) => `<i class="${i < g.dealIdx ? 'done' : i === g.dealIdx ? 'cur' : ''}"></i>`).join('')}</div>`;
  if (done || S.ui.showAll) {
    return `${topbar(u.dealTitle, S.ui.showAll ? u.hostTable : u.allDealt)}
    <div class="stack">
      ${prog}
      <div class="panel"><div class="eyebrow">${u.hostOnly}</div>
        <div class="plist" style="margin-top:8px">${g.players.map(x => playerRow(g, x, true)).join('')}</div>
        ${g.players.filter(x => x.roleId === 'contractor' && x.contractId).map(x => `<div class="quiet" style="margin-top:8px">${tt(u.contractInfo, { seat: x.seat, target: P(g, x.contractId).seat })}</div>`).join('')}</div>
      ${done ? `<button class="btn primary" data-a="start">${u.startNight0}</button>` : `<button class="btn" data-a="showall">${u.hideTable}</button>`}
    </div>`;
  }
  return `${topbar(u.dealTitle, tt(u.playerOf, { i: g.dealIdx + 1, n: g.players.length }))}
  <div class="stack">
    ${prog}
    <div class="panel raised" style="text-align:center"><div class="eyebrow">${u.passPhone}</div><div style="font-family:var(--font-display);font-weight:900;font-size:22px;margin-top:4px">${esc(p.name)}</div><div class="hint">${tt(u.seatHint, { seat: p.seat })}</div></div>
    <div class="card-wrap"><div class="flip ${(S.ui.flipAnim ? !g.dealOpen : g.dealOpen) ? 'open' : ''}" data-a="flip">
      <div class="face cardback ${r.premium ? 'premium' : ''}">${cardBackHTML(!!r.premium, `${r.premium ? u.premium + ' · ' : ''}${u.tapToOpen}`)}</div>
      <div class="face front">${cardHTML(r, { seat: p.seat, fam: p.family })}</div>
    </div></div>
    ${g.dealOpen ? `<button class="btn primary" data-a="hide">${u.hidePass}</button>` : `<button class="btn" data-a="flip">${u.openCard}</button>`}
    <button class="btn ghost sm" data-a="showall" style="align-self:center">${u.hostTable}</button>
  </div>`;
}

function playerRow(g, p, withRole, extra = '') {
  const u = U(); const r = ROLE[p.roleId];
  const tags = [];
  if (withRole) tags.push(teamPill(r));
  if (p.family) tags.push(`<span class="pill gold">${FAMILY_NAMES[p.family]}</span>`);
  if (p.disabled) tags.push(`<span class="pill">${u.tagNoSkill}</span>`);
  if (p.kamikazeUsed) tags.push(`<span class="pill">${u.tagRevealed}</span>`);
  if (p.fouls) tags.push(`<span class="pill ${p.fouls >= 3 ? 'gold' : ''}">${tt(u.foulsN, { n: p.fouls })}</span>`);
  if (g.phase === 'day' && fxOn(g, 'intimidated', p.id)) tags.push(`<span class="pill">${u.tagIntimidated}</span>`);
  if (p.defused || (g.phase === 'day' && fxOn(g, 'defused', p.id))) tags.push(`<span class="pill">${u.tagDefused}</span>`);
  if (p.judgeUsed) tags.push(`<span class="pill">${u.tagVetoUsed}</span>`);
  if (p.executeUsed) tags.push(`<span class="pill">${u.tagExecUsed}</span>`);
  return `<button class="pl ${p.alive ? '' : 'dead'}" data-a="player" data-id="${p.id}"><span class="seat">${p.seat}</span><div><div class="n">${esc(p.name)}</div>${withRole ? `<div class="r">${r.name}</div>` : ''}</div><div class="tags">${tags.join('')}${extra}</div></button>`;
}

/* ---------- Game ---------- */
function phaseName(g) {
  const u = U();
  if (g.phase === 'night0') return u.phNight0;
  if (g.phase === 'day0') return u.phDay0;
  if (g.phase === 'night') return tt(u.phNight, { n: g.night });
  const st = { morning: u.stMorning, balagan: u.stBalagan, speeches: u.stSpeeches, vote: g.ballot && g.ballot.round === 2 ? u.revoteTitle : u.stVote, tie: u.stTie, roulette: u.stRoulette, lift: u.stLift, result: u.stResult }[g.dayStage] || '';
  return tt(u.phDay, { n: g.day, st });
}
function phaseHead(g, title, sub) {
  const u = U(); const night = g.phase === 'night' || g.phase === 'night0';
  const stars = night ? `<div class="stars">${Array.from({ length: 14 }, (_, i) => `<i class="star" style="left:${(i * 37 + 11) % 95}%;top:${(i * 53 + 7) % 85}%;animation-delay:${(i * .37) % 3}s"></i>`).join('')}</div><div class="moon"></div>` : '<div class="sun"></div>';
  const lbl = night ? (g.phase === 'night0' ? u.night0Label : tt(u.nightLabel, { n: g.night })) : (g.phase === 'day0' ? u.day0Label : tt(u.dayLabel, { n: g.day }));
  return `<div class="phase-head ${night ? 'night' : 'day'}">${stars}<div class="ph">${lbl}</div><div class="pt">${title}</div><div class="ps">${sub || ''}</div></div>`;
}
function statusHTML(g) {
  const u = U(); const al = alive(g); const b = al.filter(isBlack).length; const c = al.filter(p => !isBlack(p)).length;
  return `<div class="status"><div class="st black"><div class="v num">${b}</div><div class="k">${u.stBlack}</div></div><div class="st red"><div class="v num">${c}</div><div class="k">${u.stCity}</div></div><div class="st gold"><div class="v num">${al.length}</div><div class="k">${u.stAlive}</div></div><div class="st"><div class="v num">${g.players.length - al.length}</div><div class="k">${u.stOut}</div></div></div>`;
}
function gameScreen() {
  const u = U(); const g = S.game;
  let body = '';
  if (g.phase === 'night0' || g.phase === 'night') body = nightBody(g);
  else if (g.phase === 'day0') body = day0Body(g);
  else body = dayBody(g);
  return `${topbar('Mafia Pro', `${phaseName(g)} · ${tt(u.aliveShort, { n: alive(g).length })}`, false)}
  <div class="stack">
    ${body}
    <div class="btn-row"><button class="btn ghost sm" data-a="sheet" data-id="players">${I.users} ${u.btnPlayers}</button><button class="btn ghost sm" data-a="sheet" data-id="log">${I.list} ${u.btnLog}</button><button class="btn ghost sm" data-a="sheet" data-id="reset">${u.btnEnd}</button></div>
  </div>`;
}
function membersHTML(members) {
  return `<div class="members">${members.map(p => { const r = ROLE[p.roleId]; return `<span class="member ${r.team}"><span class="seat">${p.seat}</span>${esc(p.name)} <span class="r">· ${r.name}</span></span>`; }).join('')}</div>`;
}
function progressHTML(g) { return `<div class="progress">${g.steps.map((s, i) => `<i class="${i < g.stepIdx ? 'done' : i === g.stepIdx ? 'cur' : ''}"></i>`).join('')}</div>`; }

function nightBody(g) {
  const u = U(); const step = g.steps[g.stepIdx];
  const isFirst = g.phase === 'night0';
  if (!step) {
    return `${phaseHead(g, isFirst ? u.allMet : u.allActed, isFirst ? u.canWake : u.resolveHint)}
      ${isFirst ? `<button class="btn primary" data-a="day0">${u.cityWakes}</button>` : `<button class="btn primary" data-a="resolve">${u.resolveNight}</button>`}
      <button class="btn ghost" data-a="prev">${u.backStep}</button>`;
  }
  const role = ROLE[step.roleId];
  let inner = '';
  if (step.type === 'meet') {
    inner = `<div class="wake"><div class="who">${sealHTML(role)}<div><div class="n">${step.title}</div><div class="s">${step.members.length} ${plural(step.members.length, 'players')}</div></div></div>
      <div class="script">${step.script}</div>${membersHTML(step.members)}</div>
      <div class="btn-row">${g.stepIdx > 0 ? `<button class="btn ghost" data-a="prev">${u.back}</button>` : ''}<button class="btn primary" data-a="next">${u.sleepNext}</button></div>`;
  } else {
    inner = actStep(g, step);
  }
  return `${phaseHead(g, isFirst ? u.meetRoles : u.activePhase, tt(u.stepOf, { i: g.stepIdx + 1, n: g.steps.length }))}${progressHTML(g)}${inner}`;
}

function actStep(g, step) {
  const u = U(); const actor = P(g, step.actorId); const role = ROLE[step.roleId];
  const recorded = g.actions.find(a => a.stepId === step.id);
  const stolen = stolenFrom(g, step.actorId);
  const head = `<div class="wake"><div class="who">${sealHTML(role)}<div><div class="n">${step.title || role.name}</div><div class="s">${label(actor)}${step.fam ? ` · ${FAMILY_NAMES[step.fam]}` : ''}</div></div></div>
    <div class="script">${step.script}</div>${step.members ? membersHTML(step.members) : ''}${step.note ? `<div class="hint" style="margin-top:8px">${step.note}</div>` : ''}`;
  const nav = (primary) => `<div class="btn-row"><button class="btn ghost" data-a="prev">${u.back}</button>${primary}</div>`;
  if (step.disabled) return `${head}<div class="quiet" style="margin-top:10px">${u.disabledNote}</div></div>${nav(`<button class="btn primary" data-a="next">${u.next}</button>`)}`;
  if (stolen) return `${head}<div class="quiet" style="margin-top:10px">${tt(u.stolenNote, { player: esc(label(P(g, stolen.actorId))) })}</div></div>${nav(`<button class="btn primary" data-a="next">${u.next}</button>`)}`;
  const blk = g.actions.find(a => (a.ability === 'block' || a.ability === 'jail') && a.targets[0] === step.actorId);
  if (blk && !recorded) return `${head}<div class="quiet" style="margin-top:10px">${blk.ability === 'jail' ? L.e.jailedNote : L.e.blockedNote}</div></div>${nav(`<button class="btn primary" data-a="next">${u.next}</button>`)}`;
  if (recorded) {
    const res = S.ui.result;
    const names = recorded.targets.map(t => label(P(g, t))).join(L.e.and);
    return `${head}<div class="okbox" style="margin-top:10px">${tt(u.recorded, { ability: ABILITY_LABEL[recorded.ability], targets: esc(names) || '—' })}</div></div>
      ${res ? resultHTML(res) : ''}
      ${nav(`<button class="btn primary" data-a="next">${u.sleepNext}</button>`)}
      ${recorded.ability === 'remember' ? '' : `<button class="btn ghost sm" data-a="undo" style="align-self:center">${u.changePick}</button>`}`;
  }
  const sel = S.ui.pick;
  const targets = stepTargets(g, step);
  if (step.modes && !step.modes.includes(S.ui.mode)) S.ui.mode = step.modes[0];
  const need = step.targetsByMode ? step.targetsByMode[S.ui.mode] : step.targets;
  const thief = step.roleId === 'thief';
  const pick = `<div class="picker">${targets.map(({ p, ok, why }) => {
    const i = sel.indexOf(p.id);
    return `<button class="pk ${i >= 0 ? 'sel' : ''} ${i === 1 ? 'n2' : ''} ${ok ? '' : 'dis'}" data-a="pick" data-id="${p.id}" title="${why}"><span class="seat">${p.seat}</span><span class="nm">${esc(p.name)}</span>${i >= 0 && need > 1 ? `<span class="mark ${i === 1 ? 'c' : ''}">${thief ? (i === 0 ? u.markA : u.markB) : i + 1}</span>` : ''}</button>`;
  }).join('')}</div>`;
  const modeLbl = { check: u.modeCheck, shoot: u.modeShoot, douse: L.e.modeDouse, ignite: L.e.modeIgnite };
  const modes = step.modes ? `<div class="segment">${step.modes.map(m => `<button class="${S.ui.mode === m ? 'active' : ''}" data-a="mode" data-id="${m}">${modeLbl[m]}</button>`).join('')}</div>` : '';
  const ready = sel.length === need;
  return `${head}</div>${modes}<div class="hint">${need === 0 ? '' : need === 2 ? (thief ? u.pickThief : u.pickTwo) : u.pickOne}</div>${need === 0 ? '' : pick}
    <div class="btn-row"><button class="btn ghost" data-a="skip">${u.skip}</button><button class="btn primary" data-a="confirm" ${ready ? '' : 'disabled'}>${u.confirm}</button></div>`;
}
function resultHTML(res) {
  const u = U();
  if (res.kind === 'color') return `<div class="result ${res.color}"><div class="eyebrow">${u.hostAnswer}${res.who ? ` · ${esc(label(res.who))}` : ''}</div><div class="big">${COLOR_LABEL[res.color]}</div><div class="gesture">${res.color === 'red' ? u.showRed : u.showBlack}</div></div>`;
  if (res.kind === 'role') return `<div class="result ${res.role.team === 'black' ? 'black' : 'red'}"><div class="eyebrow">${tt(u.playerCard, { player: esc(label(res.who)) })}</div><div class="big">${res.role.name}</div><div class="gesture">${tt(u.showSpy, { team: TEAM_LABEL[res.role.team] })}</div></div>`;
  if (res.kind === 'sheriff') return `<div class="result ${res.yes ? 'red' : 'black'}"><div class="eyebrow">${u.hostAnswer} · ${esc(label(res.who))}</div><div class="big">${res.yes ? u.isSheriff : u.notSheriff}</div><div class="gesture">${res.yes ? u.gestureYes : u.gestureNo}</div></div>`;
  if (res.kind === 'same') return `<div class="result ${res.same ? 'same' : 'diff'}"><div class="eyebrow">${u.hostAnswer}</div><div class="big">${res.same ? u.sameColor : u.diffColor}</div><div class="gesture">${res.same ? u.gestureSame : u.gestureDiff}</div></div>`;
  return `<div class="quiet">${esc(res.text)}</div>`;
}

function day0Body(g) {
  const u = U(); const al = alive(g); const p = al[g.speechIdx];
  if (!p) return `${phaseHead(g, u.allIntroduced, u.citySleeps)}<button class="btn primary" data-a="night">${u.sleepNight1}</button>`;
  return `${phaseHead(g, u.phDay0, tt(u.introOf, { i: g.speechIdx + 1, n: al.length }))}
    <div class="panel raised"><div class="speaker"><span class="seat">${p.seat}</span><div><div class="n">${esc(p.name)}</div><div class="s">${tt(u.secIntro, { s: S.settings.intro })}</div></div></div></div>
    ${timerHTML(S.settings.intro, `d0-${g.speechIdx}`)}
    <div class="btn-row">${g.speechIdx > 0 ? `<button class="btn ghost" data-a="speech" data-d="-1">${u.back}</button>` : ''}<button class="btn primary" data-a="speech" data-d="1">${g.speechIdx + 1 < al.length ? u.nextPlayer : u.finishIntro}</button></div>`;
}

function kamikazeHTML(g) {
  const u = U(); const ks = alive(g).filter(p => p.roleId === 'kamikaze' && !p.kamikazeUsed && !dayAbilityBlocked(g, p.id));
  const voteStarted = g.dayStage === 'vote' && (Object.keys(g.ballot.votes).length > 0 || g.ballot.round === 2);
  if (!ks.length || !['morning', 'balagan', 'speeches', 'vote'].includes(g.dayStage) || voteStarted) return '';
  const st = S.ui.kamikaze;
  if (st && st.stage === 'who') {
    const picked = S.ui.pick[0] ? P(g, S.ui.pick[0]) : null;
    const bad = picked && !(picked.roleId === 'kamikaze' && !picked.kamikazeUsed);
    return `<div class="panel raised"><div class="eyebrow gold">${u.kamReveals}</div><div class="hint">${u.kamWhoReveals}</div>
      <div class="picker" style="margin-top:10px">${alive(g).map(p => `<button class="pk ${S.ui.pick[0] === p.id ? 'sel' : ''}" data-a="pick" data-id="${p.id}"><span class="seat">${p.seat}</span><span class="nm">${esc(p.name)}</span></button>`).join('')}</div>
      ${bad ? `<div class="warnbox" style="margin-top:10px">${tt(u.kamNot, { seat: picked.seat })}</div>` : ''}
      <div class="btn-row" style="margin-top:10px"><button class="btn ghost" data-a="kam-cancel">${u.cancel}</button><button class="btn primary" data-a="kam-who" ${picked && !bad ? '' : 'disabled'}>${u.next}</button></div></div>`;
  }
  if (st && st.stage === 'victim') {
    const k = P(g, st.who); const sel = S.ui.pick;
    return `<div class="panel raised"><div class="eyebrow gold">${u.kamReveals}</div><div class="hint">${tt(u.kamVictim, { player: esc(label(k)) })}</div>
      <div class="picker" style="margin-top:10px">${alive(g).filter(p => p.id !== k.id).map(p => `<button class="pk ${sel[0] === p.id ? 'sel' : ''}" data-a="pick" data-id="${p.id}"><span class="seat">${p.seat}</span><span class="nm">${esc(p.name)}</span></button>`).join('')}</div>
      <div class="btn-row" style="margin-top:10px"><button class="btn ghost" data-a="kam-cancel">${u.cancel}</button><button class="btn danger" data-a="kam-confirm" ${sel.length ? '' : 'disabled'}>${u.kamTake}</button></div></div>`;
  }
  return `<button class="btn ghost sm" data-a="kam" style="align-self:flex-start">${u.kamReveals}</button>`;
}

function deathRow(g, d) {
  const p = P(g, d.id); const role = ROLE[p.roleId];
  return `<div class="death">${sealHTML(role)}<div><div class="n">${esc(label(p))}</div><div class="c">${S.settings.revealDead ? role.name + ' · ' : ''}${esc(d.cause)}</div></div></div>`;
}

function dayBody(g) {
  const u = U(); const st = g.dayStage; const al = alive(g);
  if (st === 'morning') {
    const r = g.nightResult || { removed: [], notes: [], quiet: [] };
    const deaths = r.removed.length ? r.removed.map(d => deathRow(g, d)).join('') : `<div class="okbox">${u.noDeaths}</div>`;
    const extra = al.filter(p => p.roleId === 'contractor' && p.contractId && P(g, p.contractId)).map(p => tt(u.contractInfo, { seat: p.seat, target: P(g, p.contractId).seat }));
    const secret = r.quiet.concat(r.shotLog || []).concat(extra).map(q => `<div class="quiet">${esc(q)}</div>`).join('');
    const w = checkWin(g); const classic = isClassic(g);
    const lastWords = classic && r.removed.length ? r.removed.map((d, i) => `<div class="panel"><div class="eyebrow">${u.lastWord} · ${esc(label(P(g, d.id)))}</div>${timerHTML(S.settings.speech, `lw-${g.day}-${i}`)}</div>`).join('') : '';
    const bm = classic ? bestMoveHTML(g, r) : '';
    return `${phaseHead(g, u.morning, r.removed.length ? tt(u.outN, { n: r.removed.length }) : u.noLoss)}${statusHTML(g)}
      <div class="stack-s">${deaths}</div>${lastWords}${bm}
      ${secret ? `<div class="panel"><div class="eyebrow">${u.hostSecret}</div><div class="stack-s" style="margin-top:8px">${secret}</div></div>` : ''}
      ${w ? `<button class="btn primary" data-a="finish">${tt(u.gameOver, { title: w.title })}</button>` : classic ? `<button class="btn primary" data-a="stage" data-id="speeches" ${bm && !g.bestMove ? 'disabled' : ''}>${u.toSpeeches}</button>` : `${kamikazeHTML(g)}<button class="btn primary" data-a="stage" data-id="balagan">${u.toBalagan}</button>`}`;
  }
  if (st === 'balagan') {
    return `${phaseHead(g, u.balagan, u.freeTalk)}${statusHTML(g)}${timerHTML(S.settings.balagan, `bal-${g.day}`)}${kamikazeHTML(g)}
      <button class="btn primary" data-a="stage" data-id="speeches">${u.toSpeeches}</button>`;
  }
  if (st === 'speeches') {
    const order = speakOrder(g); const p = order[g.speechIdx]; const classic = isClassic(g);
    const nomList = classic && g.ballot.candidates.length ? `<div class="hint">${tt(u.nominatedList, { list: g.ballot.candidates.map(id => P(g, id).seat).join(', ') })}</div>` : '';
    if (!p) return `${phaseHead(g, u.speechesDone, u.goVote)}${nomList}${kamikazeHTML(g)}<button class="btn primary" data-a="stage" data-id="vote">${u.toVote}</button>`;
    const fouls = classic && p.fouls >= 3 ? `<div class="warnbox">${u.foulNoSpeech}</div>` : '';
    return `${phaseHead(g, u.speeches, tt(u.introOf, { i: g.speechIdx + 1, n: order.length }) + (classic ? ' · ' + tt(u.firstSpeaker, { seat: order[0].seat }) : ''))}
      <div class="panel raised"><div class="speaker"><span class="seat">${p.seat}</span><div><div class="n">${esc(p.name)}</div><div class="s">${tt(u.seconds, { s: S.settings.speech })}</div></div></div></div>${fouls}
      ${timerHTML(S.settings.speech, `sp-${g.day}-${g.speechIdx}`)}${classic ? nominateHTML(g, p) : ''}${nomList}${kamikazeHTML(g)}
      <div class="btn-row">${g.speechIdx > 0 ? `<button class="btn ghost" data-a="speech" data-d="-1">${u.back}</button>` : ''}<button class="btn primary" data-a="speech" data-d="1">${g.speechIdx + 1 < order.length ? u.nextOne : u.toVote}</button></div>
      <button class="btn ghost sm" data-a="stage" data-id="vote" style="align-self:center">${u.skipSpeeches}</button>`;
  }
  if (st === 'lift') return liftBody(g);
  if (st === 'vote') return voteBody(g);
  if (st === 'tie') return tieBody(g);
  if (st === 'roulette') return rouletteBody(g);
  if (st === 'result') return resultBody(g);
  return '';
}

function voteBody(g) {
  const u = U(); const al = alive(g); const b = g.ballot;
  const cands = b.candidates; const round2 = b.round === 2;
  const t = tally(g);
  const voters = al.filter(v => canVoteNow(g, v.id));
  // candidates strip (round 1: removable, addable)
  const candHTML = cands.length ? `<div class="cand-strip">${cands.map(cid => { const c = P(g, cid); const row = t.rows.find(r => r.cid === cid); return `<div class="cand-chip ${t.leaders.includes(cid) && t.max > 0 ? 'lead' : ''}"><span class="seat">${c.seat}</span><span class="nm">${esc(c.name)}</span><span class="cnt">${fmt(row.total)}${row.anon ? ` <small>${tt(u.anonTag, { n: row.anon })}</small>` : ''}${row.x2 ? ` <small>${u.x2Tag}</small>` : ''}</span>${round2 || (b.forced || []).includes(cid) ? '' : `<button class="x" data-a="vote-remove" data-id="${cid}" aria-label="${u.voteRemove}">×</button>`}</div>`; }).join('')}</div>` : '';
  const addable = round2 || (isClassic(g) && cands.length) ? [] : al.filter(p => !cands.includes(p.id) && canNominate(g, p.id));
  const showPick = addable.length && (!cands.length || S.ui.candPick);
  const pickCand = !addable.length ? '' : showPick ? `<div class="hint">${u.nominated}</div><div class="picker">${addable.map(p => `<button class="pk" data-a="cand" data-id="${p.id}"><span class="seat">${p.seat}</span><span class="nm">${esc(p.name)}</span></button>`).join('')}</div>` : `<button class="btn ghost sm" data-a="cand-pick" style="align-self:flex-start">+ ${u.addCand}</button>`;
  // voter-by-voter stepper: the host asks each player in turn whom they vote for
  let stepper = '', grid = '', tallyHTML = '';
  if (cands.length) {
    const idx = voterIndex(g, voters); const v = voters[idx];
    if (v) {
      const mine = b.votes[v.id];
      stepper = `<div class="panel raised vote-step"><div class="speaker"><span class="seat">${v.seat}</span><div><div class="n">${esc(v.name)}</div><div class="s">${tt(u.voterOf, { i: idx + 1, n: voters.length })}${mine ? ' · ' + tt(u.votedFor, { seat: P(g, mine).seat }) : ''}</div></div></div>
        <div class="hint" style="margin-top:8px">${u.voterPick}</div>
        <div class="picker vote-pick" style="margin-top:8px">${cands.filter(c => c !== v.id).map(cid => { const c = P(g, cid); return `<button class="pk ${mine === cid ? 'sel' : ''}" data-a="vote" data-c="${cid}" data-v="${v.id}"><span class="seat">${c.seat}</span><span class="nm">${esc(c.name)}</span></button>`; }).join('')}</div>
        <div class="btn-row" style="margin-top:8px"><button class="btn ghost sm" data-a="voter-step" data-d="-1" ${idx === 0 ? 'disabled' : ''}>${u.back}</button><button class="btn ghost sm" data-a="voter-step" data-d="1" ${idx >= voters.length - 1 ? 'disabled' : ''}>${u.voterSkip}</button></div></div>`;
    } else stepper = `<div class="okbox">${u.allVoted}</div>`;
    grid = `<div class="voters-grid">${voters.map((p, i) => `<button class="vg ${b.votes[p.id] ? 'on' : ''} ${i === idx ? 'cur' : ''}" data-a="voter-go" data-i="${i}"><span class="s">${p.seat}</span><span class="t">${b.votes[p.id] ? '→ ' + P(g, b.votes[p.id]).seat : '—'}</span></button>`).join('')}</div>`;
    const nv = voters.filter(p => !b.votes[p.id]);
    tallyHTML = `<div class="panel"><div class="eyebrow">${u.tallyTitle}</div><div class="tally" style="margin-top:8px">${t.rows.map(r => { const c = P(g, r.cid); const who = Object.keys(b.votes).filter(x => b.votes[x] === r.cid).map(x => P(g, x).seat).sort((x, y) => x - y); return `<div class="tr ${t.leaders.includes(r.cid) && t.max > 0 ? 'lead' : ''}"><span class="n">${c.seat} · ${esc(c.name)}</span><span class="b"><i style="width:${t.max ? 100 * r.total / t.max : 0}%"></i></span><span class="v">${fmt(r.total)}${r.capped ? '*' : ''}</span><span class="who">${who.length ? tt(u.votersOf, { list: who.join(', ') }) : '—'}${r.anon ? ' · ' + tt(u.anonTag, { n: r.anon }) : ''}${r.x2 ? ' · ' + u.x2Tag : ''}</span></div>`; }).join('')}</div>${nv.length ? `<div class="hint" style="margin-top:8px">${tt(u.noVoters, { list: nv.map(p => p.seat).join(', ') })}</div>` : ''}</div>`;
  }
  const caps = al.filter(p => p.roleId === 'miller').map(p => tt(u.capMiller, { seat: p.seat, cap: millerCap(g) }))
    .concat(al.filter(p => p.roleId === 'mayor').map(p => tt(u.capMayor, { seat: p.seat })))
    .concat(al.filter(p => g.effects.voidVote[p.id] === g.day).map(p => tt(u.capDrunk, { seat: p.seat })))
    .concat(al.filter(p => g.effects.bonusVote[p.id] === g.day).map(p => tt(u.capAltruist, { seat: p.seat })))
    .concat(al.filter(p => fxOn(g, 'negVote', p.id)).map(p => tt(u.capNeg, { seat: p.seat })))
    .concat(al.filter(p => fxOn(g, 'certified', p.id)).map(p => tt(u.capCert, { seat: p.seat })))
    .concat(al.filter(p => fxOn(g, 'sanctuary', p.id)).map(p => tt(u.capSanct, { seat: p.seat })))
    .concat(al.filter(p => fxOn(g, 'immune', p.id)).map(p => tt(u.capImmune, { seat: p.seat })))
    .concat(al.filter(p => { const f = FX(g, 'follow')[p.id]; return f && f.day === g.day; }).map(p => tt(u.capFollow, { seat: p.seat, by: P(g, FX(g, 'follow')[p.id].by).seat })))
    .concat(al.filter(p => { const a = FX(g, 'anonVotes')[p.id]; return a && a.day === g.day; }).map(p => tt(u.capAnon, { seat: p.seat })))
    .concat((b.forced || []).map(id => tt(u.capForced, { seat: P(g, id).seat })))
    .concat(b.prosecuted ? [tt(u.capProsecuted, { seat: P(g, b.prosecuted).seat })] : []);
  const judges = b.final ? [] : al.filter(p => p.roleId === 'judge' && !p.judgeUsed && !dayAbilityBlocked(g, p.id));
  const bailiffs = cands.length && !b.final ? al.filter(p => p.roleId === 'bailiff' && !p.finalUsed && !dayAbilityBlocked(g, p.id)) : [];
  const bailiffHTML = bailiffs.map(bf => `<button class="btn ghost sm" data-a="bailiff" data-id="${bf.id}">${tt(u.bailiffBtn, { seat: bf.seat })}</button>`).join('');
  if (b.final) caps.push(u.finalNote);
  const prosecutors = cands.length && !b.prosecuted ? al.filter(p => p.roleId === 'prosecutor' && !p.prosecuteUsed && !dayAbilityBlocked(g, p.id)) : [];
  const prosHTML = prosecutors.map(pr => S.ui.prosecute === pr.id ? `<div class="panel raised"><div class="eyebrow gold">${tt(u.prosecutePick, { seat: pr.seat })}</div><div class="picker" style="margin-top:10px">${cands.map(cid => `<button class="pk" data-a="prosecute" data-id="${pr.id}" data-c="${cid}"><span class="seat">${P(g, cid).seat}</span><span class="nm">${esc(P(g, cid).name)}</span></button>`).join('')}</div><button class="btn ghost sm" data-a="prosecute-open" data-id="" style="margin-top:8px;align-self:flex-start">${u.cancel}</button></div>` : `<button class="btn ghost sm" data-a="prosecute-open" data-id="${pr.id}">${tt(u.prosecuteBtn, { seat: pr.seat })}</button>`).join('');
  const leadBlack = t.leaders.length === 1 && isBlack(P(g, t.leaders[0])) ? P(g, t.leaders[0]) : null;
  const lawyers = leadBlack && !b.final ? al.filter(p => p.roleId === 'lawyer' && !p.lawyerUsed && !dayAbilityBlocked(g, p.id) && (!g.twoFamilies || p.family === leadBlack.family)) : [];
  const judgeBtn = judges.map(j => `<button class="btn ghost sm" data-a="judge" data-id="${j.id}">${tt(u.judgeBtn, { seat: j.seat })}</button>`).join('') + lawyers.map(l => `<button class="btn ghost sm" data-a="lawyer" data-id="${l.id}" data-t="${leadBlack.id}">${tt(u.lawyerBtn, { seat: l.seat })}</button>`).join('');
  al.filter(p => p.roleId === 'contractor' && p.contractId).forEach(p => { const tg = P(g, p.contractId); if (tg) caps.push(tt(u.contractInfo, { seat: p.seat, target: tg.seat })); });
  // the vote cannot be skipped: it ends only with an elimination (or a Judge / Lawyer veto)
  let verdict = '';
  const unvoted = cands.length >= 2 ? al.filter(v => canVoteNow(g, v.id) && !b.votes[v.id] && v.id !== cands[cands.length - 1]) : [];
  const rest = unvoted.length ? `<button class="btn ghost sm" data-a="vote-rest">${tt(u.restToLast, { seat: P(g, cands[cands.length - 1]).seat })}</button>` : '';
  const oc = voteOutcome(g); const classic = isClassic(g);
  if (oc.kind === 'skip1') verdict = `<div class="okbox">${u.day1OneCand}</div><div class="btn-row"><button class="btn primary grow" data-a="vote-none">${u.toNightNoVote}</button></div>`;
  else if (classic && oc.kind !== 'empty') verdict = `<div class="hint">${u.closeVoteHint}</div><div class="btn-row"><button class="btn danger grow" data-a="vote-close">${u.closeVote}</button></div>`;
  else if (oc.kind === 'empty') verdict = round2 ? '' : `<div class="btn-row"><button class="btn ghost" data-a="vote-none">${u.noCandsNight}</button></div>`;
  else if (oc.kind === 'none') verdict = `<div class="warnbox">${u.noVotesYet}</div>${rest ? `<div class="btn-row">${rest}</div>` : ''}`;
  else if (oc.kind === 'leader') { const Ld = P(g, oc.id); verdict = `<div class="btn-row">${rest}<button class="btn danger grow" data-a="vote-finish" data-id="${Ld.id}">${tt(u.expel, { seat: Ld.seat, v: fmt(t.max) })}</button></div>`; }
  else verdict = `<div class="panel raised"><div class="eyebrow gold">${tt(u.tie, { list: oc.ids.map(id => P(g, id).seat).join(L.e.and) })}</div><div class="btn-row" style="margin-top:8px">${rest}${round2 ? `<button class="btn danger grow" data-a="roulette-start">${u.rouletteGo}</button>` : `<button class="btn primary grow" data-a="tie-start">${u.tieGo}</button>`}</div></div>`;
  const sub = round2 ? tt((b.excludedVoters || []).length ? u.revoteHint2 : u.revoteHint3, { list: b.tiedIds.map(id => P(g, id).seat).join(L.e.and) }) : classic ? (cands.length ? tt(u.nominatedList, { list: cands.map(id => P(g, id).seat).join(', ') }) : u.addCands) : tt(u.millerToday, { cap: millerCap(g) });
  return `${phaseHead(g, round2 ? u.revoteTitle : u.voteTitle, sub)}
    <div class="panel"><div class="eyebrow">${u.hostOnlyShort}</div><div class="hint">${caps.length ? caps.join(' · ') : u.noMods}</div></div>
    ${kamikazeHTML(g)}
    ${candHTML}${pickCand}
    ${cands.length ? '' : `<div class="hint">${u.addCands}</div>`}
    ${stepper}${grid}${tallyHTML}
    ${verdict}${judgeBtn || prosHTML || bailiffHTML ? `<div class="btn-row" style="flex-wrap:wrap">${judgeBtn}${prosHTML}${bailiffHTML}</div>` : ''}`;
}
/* classic: nomination inside the speech (one per speaker) */
function nominateHTML(g, speaker) {
  const u = U(); const b = g.ballot; const mine = b.nominatedBy && b.nominatedBy[speaker.id];
  if (mine) return `<div class="panel"><div class="row"><div class="grow"><b>${tt(u.nominatedSeat, { seat: P(g, mine).seat })}</b> · ${esc(P(g, mine).name)}</div><button class="btn ghost xs" data-a="unnominate" data-id="${speaker.id}">${u.unnominate}</button></div></div>`;
  const open = S.ui.nomOpen === speaker.id;
  if (!open) return `<button class="btn ghost sm" data-a="nom-open" data-id="${speaker.id}" style="align-self:flex-start">${u.nominate}</button>`;
  const opts = alive(g).filter(p => p.id !== speaker.id && !b.candidates.includes(p.id) && canNominate(g, p.id));
  return `<div class="panel raised"><div class="eyebrow gold">${u.nominate}</div><div class="hint">${u.nominateHint}</div>
    <div class="picker" style="margin-top:10px">${opts.map(p => `<button class="pk" data-a="nominate" data-id="${speaker.id}" data-t="${p.id}"><span class="seat">${p.seat}</span><span class="nm">${esc(p.name)}</span></button>`).join('')}</div>
    <button class="btn ghost sm" data-a="nom-open" data-id="" style="margin-top:8px;align-self:flex-start">${u.cancel}</button></div>`;
}
/* classic: the first-night victim's best move (up to 3 suspects) */
function bestMoveHTML(g, r) {
  const u = U(); if (g.night !== 1 || !r.removed.length) return '';
  const victim = P(g, r.removed[0].id);
  if (g.bestMove) return `<div class="panel"><div class="eyebrow">${u.bestMove}</div><div style="margin-top:4px">${tt(u.bestMoveDone, { player: esc(label(victim)), list: g.bestMove.picks.length ? g.bestMove.picks.map(id => P(g, id).seat).join(', ') : '—' })}</div></div>`;
  const sel = S.ui.pick;
  return `<div class="panel raised"><div class="eyebrow gold">${u.bestMove}</div><div class="hint">${tt(u.bestMoveHint, { player: esc(label(victim)) })}</div>
    <div class="picker" style="margin-top:10px">${alive(g).map(p => `<button class="pk ${sel.includes(p.id) ? 'sel' : ''}" data-a="bm-pick" data-id="${p.id}"><span class="seat">${p.seat}</span><span class="nm">${esc(p.name)}</span></button>`).join('')}</div>
    <div class="btn-row" style="margin-top:10px"><button class="btn ghost" data-a="bm-save" data-skip="1">${u.bestMoveSkip}</button><button class="btn primary" data-a="bm-save" ${sel.length ? '' : 'disabled'}>${u.bestMoveSave}</button></div></div>`;
}
/* classic: lift-all vote after the second tie */
function liftBody(g) {
  const u = U(); const l = g.ballot.lift; const al = alive(g); const need = liftNeed(g);
  return `${phaseHead(g, u.liftTitle, tt(u.tie, { list: l.ids.map(id => P(g, id).seat).join(L.e.and) }))}
    <div class="panel"><div class="hint">${tt(u.liftHint, { list: l.ids.map(id => P(g, id).seat).join(L.e.and) })}</div></div>
    <div class="panel raised"><div class="eyebrow gold">${tt(u.liftCount, { n: l.yes.length, alive: al.length, need })}</div>
      <div class="picker" style="margin-top:10px">${al.map(p => `<button class="pk ${l.yes.includes(p.id) ? 'sel' : ''}" data-a="lift-toggle" data-id="${p.id}"><span class="seat">${p.seat}</span><span class="nm">${esc(p.name)}</span></button>`).join('')}</div>
      <div class="btn-row" style="margin-top:10px"><button class="btn ${l.yes.length >= need ? 'danger' : 'primary'} grow" data-a="lift-finish">${l.yes.length >= need ? u.liftYes : u.liftNo}</button></div></div>`;
}
/* index of the voter the host is asking now (per day & round); defaults to the first who has not voted yet */
function voterIndex(g, voters) {
  const key = g.day + ':' + (g.ballot.round || 1); const st = S.ui.voter;
  if (st && st.key === key && typeof st.idx === 'number') return Math.max(0, Math.min(voters.length, st.idx));
  const i = voters.findIndex(v => !g.ballot.votes[v.id]); return i < 0 ? voters.length : i;
}
function voterSet(g, idx) { S.ui.voter = { key: g.day + ':' + (g.ballot.round || 1), idx }; }
function voterAdvance(g) {
  const voters = alive(g).filter(v => canVoteNow(g, v.id)); const cur = voterIndex(g, voters);
  let i = voters.findIndex((v, k) => k > cur && !g.ballot.votes[v.id]);
  if (i < 0) i = voters.findIndex(v => !g.ballot.votes[v.id]);
  voterSet(g, i < 0 ? voters.length : i);
}

function tieBody(g) {
  const u = U(); const b = g.ballot; const tied = b.tiedIds || []; const p = P(g, tied[g.speechIdx]);
  if (!p) return `${phaseHead(g, u.tieSpeeches, tt(u.tie, { list: tied.map(id => P(g, id).seat).join(L.e.and) }))}<button class="btn primary" data-a="revote">${u.toRevote}</button>`;
  return `${phaseHead(g, u.tieSpeeches, tt(u.tie, { list: tied.map(id => P(g, id).seat).join(L.e.and) }))}
    <div class="panel raised"><div class="speaker"><span class="seat">${p.seat}</span><div><div class="n">${esc(p.name)}</div><div class="s">${tt(u.tieSpeechOf, { i: g.speechIdx + 1, n: tied.length, s: S.settings.tieSpeech })}</div></div></div></div>
    ${timerHTML(S.settings.tieSpeech, `tie-${g.day}-${g.speechIdx}`)}
    <div class="btn-row">${g.speechIdx > 0 ? `<button class="btn ghost" data-a="tie-speech" data-d="-1">${u.back}</button>` : ''}<button class="btn primary" data-a="tie-speech" data-d="1">${g.speechIdx + 1 < tied.length ? u.nextOne : u.toRevote}</button></div>`;
}

function rouletteBody(g) {
  const u = U(); const b = g.ballot; const r = b.roulette; const cur = rouletteCurrent(g);
  const named = r.guesses.map(x => `<span class="chip" style="pointer-events:none">${P(g, x.pid).seat} → ${x.n}</span>`).join('');
  const grid = Array.from({ length: 9 }, (_, i) => i + 1).map(n => { const used = r.guesses.some(x => x.n === n); return `<button class="pk roulette-n ${used ? 'used' : ''}" data-a="roulette-guess" data-n="${n}" ${used ? 'disabled' : ''}><span class="seat">${n}</span></button>`; }).join('');
  return `${phaseHead(g, u.rouletteTitle, tt(u.tie, { list: r.order.map(id => P(g, id).seat).join(L.e.and) }))}
    <div class="panel"><div class="hint">${u.rouletteHint}</div></div>
    <div class="panel raised"><div class="speaker"><span class="seat">${cur.seat}</span><div><div class="n">${esc(cur.name)}</div><div class="s">${u.rouletteTurn}</div></div></div>
      <div class="picker roulette" style="margin-top:12px">${grid}</div>
      ${named ? `<div class="filters wrap" style="margin-top:10px">${named}</div>` : ''}</div>`;
}
const fmt = n => Number.isInteger(n) ? String(n) : n.toFixed(1);

function resultBody(g) {
  const u = U(); const vr = g.voteResult; const t = vr.tally;
  const rows = t.rows.length ? `<div class="tally">${t.rows.map(r => { const c = P(g, r.cid); return `<div class="tr ${r.cid === vr.eliminatedId ? 'lead' : ''}"><span class="n">${c.seat} · ${esc(c.name)}</span><span class="b"><i style="width:${t.max ? 100 * r.total / t.max : 0}%"></i></span><span class="v">${fmt(r.total)}${r.capped ? '*' : ''}</span></div>`; }).join('')}</div>` : '';
  const removed = vr.removed.map(d => deathRow(g, d)).join('');
  const trig = g.pendingTriggers[0];
  let trigHTML = '';
  if (trig) {
    const a = P(g, trig.actorId); const sel = S.ui.pick;
    const txt = trig.type === 'azazel' ? u.trigAzazel : u.trigMorpheus;
    trigHTML = `<div class="panel raised"><div class="eyebrow gold">${ROLE[a.roleId].name} ${a.seat}</div><div class="hint">${esc(a.name)} ${txt}.</div>
      <div class="picker" style="margin-top:10px">${alive(g).map(p => `<button class="pk ${sel[0] === p.id ? 'sel' : ''}" data-a="pick" data-id="${p.id}"><span class="seat">${p.seat}</span><span class="nm">${esc(p.name)}</span></button>`).join('')}</div>
      <button class="btn danger" style="margin-top:10px" data-a="trig-confirm" ${sel.length ? '' : 'disabled'}>${u.confirm}</button></div>`;
  }
  const w = checkWin(g);
  const jester = vr.eliminatedId && P(g, vr.eliminatedId).roleId === 'jester' ? `<div class="result diff"><div class="eyebrow">${u.attention}</div><div class="big">${u.jesterWon}</div><div class="gesture">${u.jesterText}</div></div>` : '';
  const rl = vr.roulette && vr.roulette.hitId ? `<div class="result diff"><div class="eyebrow">${u.rouletteTitle}</div><div class="big">${vr.roulette.number}</div><div class="gesture">${tt(u.rouletteHit, { n: vr.roulette.number, seat: P(g, vr.roulette.hitId).seat })}</div></div>` : '';
  const lift = vr.lift ? `<div class="result ${vr.lift.passed ? 'diff' : 'same'}"><div class="eyebrow">${u.liftTitle}</div><div class="big">${vr.lift.yes} / ${vr.lift.need}</div><div class="gesture">${vr.lift.passed ? u.liftDecided : u.liftFailed}</div></div>` : '';
  const imm = vr.immune ? `<div class="result same"><div class="eyebrow">${vr.immune.kind === 'ambassador' ? u.immunityTitle : u.shieldTitle}</div><div class="big">${P(g, vr.immune.id).seat}</div><div class="gesture">${tt(vr.immune.kind === 'ambassador' ? u.immunityText : u.shieldText, { player: esc(label(P(g, vr.immune.id))) })}</div></div>` : '';
  const chair = vr.chairman ? `<div class="hint" style="text-align:center">${u.chairmanNote}</div>` : '';
  const title = vr.vetoed ? u.judgeVetoed : rl ? u.rouletteDecided : vr.lift ? (vr.lift.passed ? u.liftDecided : u.liftFailed) : vr.immune ? (vr.immune.kind === 'ambassador' ? u.immunityTitle : u.shieldTitle) : vr.eliminatedId ? u.cityDecided : u.nobodyLeft;
  const lastWords = isClassic(g) && vr.removed.length ? vr.removed.map((d, i) => `<div class="panel"><div class="eyebrow">${u.lastWord} · ${esc(label(P(g, d.id)))}</div>${timerHTML(S.settings.speech, `lwv-${g.day}-${i}`)}</div>`).join('') : '';
  return `${phaseHead(g, title, vr.eliminatedId ? tt(u.leaves, { seat: P(g, vr.eliminatedId).seat }) : '')}${vr.round === 2 ? `<div class="eyebrow gold">${u.revoteTitle}</div>` : ''}${rows}${rl}${lift}${imm}${chair}${jester}${lastWords}
    ${removed ? `<div class="stack-s">${removed}</div>` : ''}
    ${trigHTML}
    ${trig ? '' : (w ? `<button class="btn primary" data-a="finish">${tt(u.gameOver, { title: w.title })}</button>` : `<button class="btn primary" data-a="night">${tt(u.sleepNightN, { n: g.night + 1 })}</button>`)}`;
}

/* ---------- End: post-game review ---------- */
function reviewHTML(g) {
  const u = U(); const rv = reviewGame(g); const w = g.winner;
  const rows = g.players.map(p => { const r = rv.byId[p.id]; const res = resultFor(g, p, w); const pts = pointsFor(p.roleId, res.won, p.alive, res.solo); return { p, r, res, pts, total: pts + r.useful }; }).sort((a, b) => b.total - a.total || b.r.useful - a.r.useful);
  const open = S.ui.rvOpen || {};
  return `<div class="panel"><div class="eyebrow gold">${u.reviewTitle}</div><p class="hint" style="margin:6px 0 10px">${u.reviewHint}</p>
    <div class="rv-list">${rows.map((x, i) => { const role = ROLE[x.p.roleId]; const isOpen = !!open[x.p.id]; return `<div class="rv ${x.res.won ? 'win' : 'loss'}">
      <button class="rv-head" data-a="rv-toggle" data-id="${x.p.id}">${sealHTML(role)}<div class="grow"><div class="n">${x.p.seat} · ${esc(x.p.name)} ${i === 0 && x.total > 0 ? `<span class="mvp">${u.mvp}</span>` : ''}</div><div class="d">${role.name} · ${x.res.won ? u.won : u.lost} · ${tt(u.rvStats, { good: x.r.good, bad: x.r.bad })}</div></div><div class="pts"><b>${x.total > 0 ? '+' : ''}${x.total}</b><small>${u.ptsResult} ${x.pts > 0 ? '+' : ''}${x.pts} · ${u.ptsUseful} ${x.r.useful > 0 ? '+' : ''}${x.r.useful}</small></div></button>
      ${isOpen ? `<div class="rv-items">${x.r.items.length ? x.r.items.map(it => `<div class="it ${it.verdict}"><span class="mark">${it.verdict === 'good' ? '✓' : it.verdict === 'bad' ? '✗' : '•'}</span><div><div class="w">${it.when} · ${esc(it.action)} ${esc(it.target)}</div><div class="r">${it.verdict === 'good' ? u.rvGood : it.verdict === 'bad' ? u.rvBad : u.rvNeutral}${it.reason ? ' — ' + esc(it.reason) : ''} <span class="p">${it.pts > 0 ? '+' : ''}${it.pts || 0}</span></div>${it.better ? `<div class="b">${tt(u.rvBetter, { text: esc(it.better) })}</div>` : ''}</div></div>`).join('') : `<div class="hint">${u.rvNoItems}</div>`}</div>` : ''}</div>`; }).join('')}</div></div>`;
}

/* ---------- End ---------- */
function endScreen() {
  const u = U(); const g = S.game; const w = g.winner;
  return `${topbar(u.endTitle, `${g.day} ${plural(g.day, 'days')} · ${g.night} ${plural(g.night, 'nights')}`, false)}
  <div class="stack">
    <div class="winner ${w.side}"><div class="e">${u.winner}</div><h1>${w.title}</h1><p class="hint" style="margin-top:8px">${esc(w.text)}</p>${g.jesterWon ? `<p class="hint" style="margin-top:6px">${tt(u.jesterAlso, { player: esc(label(P(g, g.jesterWon))) })}</p>` : ''}${g.extraWinners && g.extraWinners.length ? `<p class="hint" style="margin-top:6px">${tt(u.extraWinners, { list: g.extraWinners.map(id => esc(label(P(g, id)) + ' (' + ROLE[P(g, id).roleId].name + ')')).join(', ') })}</p>` : ''}</div>
    ${reviewHTML(g)}
    <div class="panel"><div class="eyebrow">${u.table}</div><div class="plist" style="margin-top:8px">${g.players.map(p => playerRow(g, p, true)).join('')}</div></div>
    <button class="btn primary" data-a="new">${u.newGame}</button>
    <button class="btn ghost" data-a="sheet" data-id="log">${u.gameLog}</button>
  </div>`;
}

/* ---------- Cards ---------- */
function cardsScreen() {
  const u = U(); const f = S.ui.cardFilter;
  const list = ROLES.filter(r => f === 'all' || r.team === f || (f === 'city' && (r.team === 'red' || r.team === 'ww')));
  const chip = (id, t) => `<button class="chip ${f === id ? 'active' : ''}" data-a="filter" data-id="${id}">${t}</button>`;
  return `${topbar(u.cardsTitle, tt(u.cardsSub, { n: ROLES.length }), false)}
  <div class="stack">
    <div class="row"><div class="filters grow">${chip('all', u.fAll)}${chip('black', u.fMafia)}${chip('city', u.fCity)}${chip('neutral', u.fNeutral)}</div><button class="btn xs ghost" data-a="go" data-to="shop">${u.shop}</button></div>
    <div class="gallery">${list.map((r, i) => `<div class="gcard card ${r.team} mini ${r.premium ? 'premium' : ''}" role="button" tabindex="0" data-a="role" data-id="${r.id}" style="position:relative">${r.premium ? priceBadge('role', r.id) + '<i class="gem"></i>' : ''}${lazyArt(r.id, i < 6)}<div class="k">${TEAM_LABEL[r.team]}</div><div class="n">${r.name}</div><div class="s">${r.short}</div></div>`).join('')}</div>
  </div>`;
}
function counterChips(ids) { return ids.filter(id => ROLE[id]).map(id => `<button class="counter-chip ${ROLE[id].team}" data-a="role" data-id="${id}">${roleArt(id, 'portrait')}<span>${ROLE[id].name}</span></button>`).join(''); }
function countersHTML(r) {
  const u = U(); const vs = COUNTERS[r.id] || []; const by = COUNTERED_BY[r.id] || [];
  return `<div class="section"><div class="eyebrow gold">${u.counters}</div><div class="hint" style="margin:2px 0 6px">${u.countersD}</div>${vs.length ? `<div class="counter-list">${counterChips(vs)}</div>` : `<div class="hint">${u.noCounters}</div>`}
    ${by.length ? `<div class="eyebrow" style="margin-top:10px">${u.counteredBy}</div><div class="counter-list" style="margin-top:6px">${counterChips(by)}</div>` : ''}</div>`;
}
function roleDoc(r) {
  const u = U();
  const wakeTxt = r.wake ? tt(u.wakeN, { n: r.wake }) : (r.id === 'gunsmith' || r.id === 'mafia' ? u.wakeFamily : u.wakeNever);
  const buy = r.premium ? (ownsRole(r.id) ? `<div class="row" style="justify-content:center;margin-top:10px"><span class="premium-pill">${u.premium} · ${u.owned}</span></div>` : r.pack ? `<button class="btn primary" style="margin-top:10px" data-a="buy" data-kind="pack" data-id="${r.pack}">${tt(u.buyPack, { price: u.pricePack })}</button>` : `<button class="btn primary" style="margin-top:10px" data-a="buy" data-kind="role" data-id="${r.id}">${tt(u.buy, { price: u.priceCard })}</button>`) : '';
  return `<div class="roledoc">
    ${card3dHTML(r, 'sheet')}<div class="spin-hint">${u.spinHint}</div>${buy}
    <div class="facts"><div class="fact"><div class="k">${u.side}</div><div class="v">${TEAM_LABEL[r.team]}</div></div><div class="fact"><div class="k">${u.forChecks}</div><div class="v">${COLOR_LABEL[r.color]}</div></div><div class="fact"><div class="k">${u.type}</div><div class="v">${r.kind}</div></div><div class="fact"><div class="k">${u.order}</div><div class="v">${wakeTxt}</div></div></div>
    ${countersHTML(r)}
    <div class="section"><div class="eyebrow gold">${u.howWorks}</div><ul>${r.rules.map(x => `<li>${x}</li>`).join('')}</ul></div>
    <div class="section"><div class="eyebrow gold">${u.lore}</div><p class="lore" style="margin-top:6px">${r.lore}</p></div>
    <div class="section"><div class="eyebrow gold">${u.tip}</div><p style="margin-top:6px;font-size:14px">${r.tip}</p></div>
  </div>`;
}

/* ---------- Scenarios ---------- */
function classicCardHTML() {
  const u = U(); const sc = CLASSIC; const open = !!S.ui.classicRules;
  const roles = [...new Set(sc.roles)].map(id => `<span class="ri" title="${ROLE[id].name}">${roleArt(id, 'portrait')}</span>`).join('');
  return `<div class="scen-card classic"><div class="row"><span class="premium-pill classic">${u.classicPill}</span><div class="t grow">${sc.name}</div></div><div class="l">${sc.lore}</div>
    <div class="m">${u.classicSub}</div><div class="roles">${roles}</div>
    ${open ? `<ul class="rules">${u.classicRules.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
    <div class="btn-row" style="margin-top:10px"><button class="btn ghost sm" data-a="classic-rules">${u.classicRulesTitle}</button><button class="btn primary sm grow" data-a="scen-use" data-id="classic">${u.playClassic}</button></div></div>`;
}
function scenariosScreen() {
  const u = U(); const rows = [];
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    const comp = presetFor(n); const st = compositionStats(comp);
    const names = comp.map(id => ROLE[id].name);
    const b = BALANCE[n];
    const sim = b ? `<div class="d wrap" style="margin-top:4px;color:var(--fg-2)"><span style="color:var(--steel-2)">${tt(u.simMafia, { v: b.mafia })}</span> · <span style="color:var(--crimson-2)">${tt(u.simCity, { v: b.city })}</span>${b.maniac ? ` · <span style="color:#d3bdf5">${tt(u.simManiac, { v: b.maniac })}</span>` : ''} · ${tt(u.simNights, { v: b.nights })}</div>` : '';
    rows.push(`<button class="scen-row" data-a="scen" data-n="${n}"><span class="n num">${n}</span><div class="m"><div class="t">${tt(u.scenRow, { black: st.black, ww: st.ww ? u.scenWW : '', maniac: st.neutral ? u.scenManiac : '', red: st.red, two: n >= TWO_FAMILIES_FROM ? u.scenTwo : '' })}</div><div class="d">${names.join(', ')}</div>${sim}${statsBar(st)}</div><span class="chev">${I.chev}</span></button>`);
  }
  const tab = S.ui.scenTab === 'paid' ? 'paid' : 'free';
  const seg = `<div class="segment n2 scen-tabs"><button class="${tab === 'free' ? 'active' : ''}" data-a="scen-tab" data-id="free">${u.scenFreeTab}</button><button class="${tab === 'paid' ? 'active' : ''}" data-a="scen-tab" data-id="paid">${u.scenPaidTab}</button></div>`;
  const free = `${classicCardHTML()}
  <h2>${u.scenStd}</h2>
  <p class="hint">${tt(u.scenIntro, { note: u.balanceNote })}</p>
  <div class="scen">${rows.join('')}</div>`;
  const paid = `<div class="row"><h2 class="grow">${u.shopScen}</h2><button class="btn xs ghost" data-a="go" data-to="shop">${u.shop}</button></div>
  <p class="hint">${u.scenPaidHint}</p>
  <div class="stack-s">${SCENARIOS.map(sc => scenarioCardHTML(sc)).join('')}</div>`;
  return `${topbar(u.scenTitle, u.scenSub, false)}
  <div class="stack">
  ${seg}
  ${tab === 'paid' ? paid : free}</div>`;
}

/* ---------- Settings ---------- */
function settingsScreen() {
  const u = U(); const s = S.settings;
  const num = (k, t, d, step) => `<div class="setting"><div><div class="t">${t}</div><div class="d">${d}</div></div><div class="ctl"><button data-a="set" data-k="${k}" data-d="${-step}">−</button><span class="v">${s[k]} ${u.sec}</span><button data-a="set" data-k="${k}" data-d="${step}">+</button></div></div>`;
  const sw = (k, t, d) => `<div class="setting"><div><div class="t">${t}</div><div class="d">${d}</div></div><div class="ctl"><button class="switch ${s[k] ? 'on' : ''}" data-a="toggle" data-k="${k}" aria-label="${t}"></button></div></div>`;
  return `${topbar(u.tabSettings, u.settingsSub, false)}
  <div class="panel"><div class="eyebrow" style="margin-bottom:8px">${u.language}</div>${langChips('wrap')}</div>
  <div class="panel" style="margin-top:12px">
    ${num('intro', u.sIntro, u.sIntroD, 10)}
    ${num('speech', u.sSpeech, u.sSpeechD, 15)}
    ${num('balagan', u.sBalagan, u.sBalaganD, 30)}
    ${num('tieSpeech', u.sTie, u.sTieD, 10)}
    ${sw('revealDead', u.sReveal, u.sRevealD)}
    ${sw('sound', u.sSound, u.sSoundD)}
    <div class="setting"><div><div class="t">${u.sLite}</div><div class="d">${u.sLiteD}${LITE.bench ? ` <span class="num" style="opacity:.6">(${Math.round(LITE.bench)} ms)</span>` : ''}</div></div><div class="ctl"><div class="segment n3" style="min-width:150px">${[['auto', u.liteAuto], ['on', u.liteOn], ['off', u.liteOff]].map(([v, l]) => `<button class="${(s.lite || 'auto') === v ? 'active' : ''}" data-a="lite" data-v="${v}">${l}</button>`).join('')}</div></div></div>
  </div>
  <div class="menu" style="margin-top:12px">
    <button class="menu-item" data-a="go" data-to="myprofile"><div class="ico">${I.person}</div><div><div class="t">${u.myProfile}</div><div class="d">${u.myProfileD}</div></div><span class="chev">${I.chev}</span></button>
    <button class="menu-item" data-a="go" data-to="profiles"><div class="ico">${I.users}</div><div><div class="t">${u.plLocalBtn}</div><div class="d">${u.plLocalD}</div></div><span class="chev">${I.chev}</span></button>
  </div>
  <div class="panel" style="margin-top:12px"><div class="eyebrow">${u.about}</div><p class="hint" style="margin-top:6px">${u.aboutText}</p></div>`;
}

/* ---------- Sheets ---------- */
function sheetHTML(enter = true) {
  const u = U(); const sh = S.ui.sheet; if (!sh) return '';
  let body = '';
  if (sh.type === 'role') body = roleDoc(ROLE[sh.id]);
  if (sh.type === 'players') {
    const g = S.game;
    body = `<h2>${u.playersSheet}</h2><p class="hint" style="margin:4px 0 10px">${u.playersHint}</p><div class="plist">${g.players.map(p => playerRow(g, p, true)).join('')}</div>`;
  }
  if (sh.type === 'playerEdit') {
    const g = S.game; const p = P(g, sh.id); const r = ROLE[p.roleId];
    const fouls = isClassic(g) ? `<div class="setting" style="margin-top:12px"><div><div class="t">${u.fouls}</div><div class="d">${p.fouls >= 4 ? u.foulOut : p.fouls >= 3 ? u.foulNoSpeech : u.foulsN.replace('{n}', p.fouls || 0)}</div></div><div class="ctl"><button data-a="foul-remove" data-id="${p.id}" aria-label="${u.foulRemove}">−</button><span class="v">${p.fouls || 0}</span><button data-a="foul-add" data-id="${p.id}" aria-label="${u.foulAdd}">+</button></div></div>` : '';
    body = `<div class="row">${sealHTML(r)}<div class="grow"><h2>${esc(label(p))}</h2><div class="hint">${r.name} · ${p.alive ? u.inGame : u.outGame}</div></div></div>${fouls}
      <div class="btn-row" style="margin-top:14px"><button class="btn ghost" data-a="sheet" data-id="players">${u.back}</button><button class="btn ${p.alive ? 'danger' : 'primary'}" data-a="toggle-alive" data-id="${p.id}">${p.alive ? u.removePlayer : u.returnPlayer}</button></div>`;
  }
  if (sh.type === 'log') {
    const g = S.game;
    body = `<h2>${u.logSheet}</h2><p class="hint" style="margin:4px 0 10px">${u.logHint}</p><div class="log">${g.log.slice().reverse().map(l => `<div class="l ${l.secret ? 'secret' : ''}"><span class="ph">${l.ph}${l.secret ? ' ·' : ''}</span><span>${esc(l.text)}</span></div>`).join('') || `<div class="hint">${u.logEmpty}</div>`}</div>`;
  }
  if (sh.type === 'profEdit') body = profEditHTML(sh.id);
  if (sh.type === 'buy') body = buySheetHTML(sh.kind, sh.id);
  if (sh.type === 'friend' && typeof friendSheetHTML === 'function') body = friendSheetHTML(sh.id);
  if (sh.type === 'clubEdit' && typeof clubEditHTML === 'function') body = clubEditHTML(sh.id);
  if (sh.type === 'reset') body = `<h2>${u.resetTitle}</h2><p class="hint" style="margin:6px 0 14px">${u.resetText}</p><div class="btn-row"><button class="btn ghost" data-a="sheet-close">${u.cancel}</button><button class="btn danger" data-a="reset-confirm">${u.resetBtn}</button></div>`;
  return `<div class="sheet-bg ${enter ? 'enter' : ''}" data-a="sheet-close"><div class="sheet" data-stop="1"><div class="grab"></div>${body}<button class="btn ghost" style="margin-top:14px" data-a="sheet-close">${u.close}</button></div></div>`;
}

/* ============================================================ ACTIONS */
function goGameOrHome() { S.screen = S.game ? 'game' : 'home'; }
function go(screen) {
  if (screen === 'scenarios') S.ui.scenTab = 'free'; // the free scenarios always come first
  if (['profile', 'myprofile', 'pstats'].includes(screen)) { if (!['profile', 'myprofile', 'pstats'].includes(S.screen)) S.ui.profileFrom = S.screen; } // remember where a profile was opened from
  S.screen = screen; S.tab = ['cards', 'settings', 'clubs', 'ratings', 'friends'].includes(screen) ? screen : (screen === 'club' ? 'clubs' : (['profile', 'myprofile', 'pstats', 'profiles'].includes(screen) ? (S.tab || 'game') : 'game'));
  window.scrollTo(0, 0); render();
}
function profileBackTarget() { const f = S.ui.profileFrom; return f && !['profile', 'myprofile', 'pstats', 'deal'].includes(f) ? f : (S.game && f === 'game' ? 'game' : 'home'); }

const ACT = {
  tab(el) { const id = el.dataset.id; S.tab = id; S.screen = id === 'game' ? (S.game ? 'game' : 'home') : id; S.ui.sheet = null; window.scrollTo(0, 0); render(); },
  go(el) { go(el.dataset.to); },
  lang(el) { S.settings.lang = el.dataset.id; setLang(el.dataset.id); render(); },
  back() { if (S.screen === 'setup' || S.screen === 'deal') { S.screen = 'home'; } else if (S.screen === 'pstats' && ['myprofile', 'profile'].includes(S.ui.pstatsFrom)) { S.screen = S.ui.pstatsFrom; } else if (S.screen === 'profile' || S.screen === 'myprofile' || S.screen === 'pstats' || S.screen === 'profiles') { const to = profileBackTarget(); S.screen = to; S.tab = ['cards', 'settings', 'clubs', 'ratings', 'friends'].includes(to) ? to : (to === 'club' ? 'clubs' : 'game'); } else if (S.screen === 'club') { S.screen = 'clubs'; S.tab = 'clubs'; } else goGameOrHome(); S.ui.showAll = false; render(); },
  new() { S.setup.scenario = null; S.setup.comp = presetFor(S.setup.n); S.ui.showAll = false; go('setup'); },
  continue() { go('game'); },
  n(el) { const d = +el.dataset.d; setN(S.setup.n + d); },
  nrange(el) { setN(+el.value); },
  name(el) { S.setup.names[+el.dataset.i] = el.value; save(); },
  comp(el) { const id = el.dataset.id, d = +el.dataset.d; if (d > 0) S.setup.comp.push(id); else { const i = S.setup.comp.indexOf(id); if (i >= 0) S.setup.comp.splice(i, 1); } render(); },
  preset() { S.setup.comp = setupComp(S.setup.n); render(); toast(U().toastPreset); },
  scen(el) { S.setup.scenario = null; S.setup.n = +el.dataset.n; S.setup.comp = presetFor(S.setup.n); go('setup'); },
  'scen-tab'(el) { S.ui.scenTab = el.dataset.id === 'paid' ? 'paid' : 'free'; window.scrollTo(0, 0); render(); },
  deal() {
    const sp = S.setup.seatProfiles || [];
    const names = Array.from({ length: S.setup.n }, (_, i) => sp[i] && profById(sp[i]) ? profById(sp[i]).name : (S.setup.names[i] || ''));
    S.game = newGame(S.setup.n, S.setup.comp, names, S.settings, sp.slice(0, S.setup.n), setupMods()); S.ui.showAll = false; go('deal');
  },
  'seat-assign'(el) { const sp = S.setup.seatProfiles = S.setup.seatProfiles || []; const id = el.dataset.id; const used = sp.indexOf(id); if (used >= 0) { sp[used] = null; render(); return; } let i = 0; while (i < S.setup.n && sp[i]) i++; if (i < S.setup.n) { sp[i] = id; render(); } },
  'seat-clear'(el) { const sp = S.setup.seatProfiles = S.setup.seatProfiles || []; sp[+el.dataset.i] = null; render(); },
  flip() { S.game.dealOpen = !S.game.dealOpen; S.ui.flipAnim = true; render(); },
  hide() { S.game.dealOpen = false; S.game.dealIdx += 1; window.scrollTo(0, 0); render(); },
  showall() { S.ui.showAll = !S.ui.showAll; render(); },
  start() { const g = S.game; g.dealt = true; startNight0(g); S.ui.pick = []; go('game'); },
  next() { const g = S.game; g.stepIdx += 1; S.ui.pick = []; S.ui.result = null; S.ui.mode = 'check'; window.scrollTo(0, 0); render(); },
  prev() { const g = S.game; if (g.stepIdx > 0) g.stepIdx -= 1; S.ui.pick = []; S.ui.result = null; render(); },
  pick(el) {
    const id = el.dataset.id; const g = S.game; let need = 1;
    const step = g.steps[g.stepIdx];
    if (g.phase === 'night' && step && step.type === 'act' && !S.ui.kamikaze && !g.pendingTriggers.length) need = step.targetsByMode ? step.targetsByMode[S.ui.mode] : step.targets;
    const i = S.ui.pick.indexOf(id);
    if (i >= 0) S.ui.pick.splice(i, 1); else { if (S.ui.pick.length >= need) S.ui.pick.shift(); S.ui.pick.push(id); }
    render();
  },
  mode(el) { S.ui.mode = el.dataset.id; render(); },
  confirm() {
    const g = S.game; const step = g.steps[g.stepIdx];
    const need = step.targetsByMode ? step.targetsByMode[S.ui.mode] : step.targets;
    if (S.ui.pick.length !== need) return;
    S.ui.result = recordAction(g, step, S.ui.pick, S.ui.mode);
    S.ui.pick = []; render();
  },
  skip() { const g = S.game; const step = g.steps[g.stepIdx]; addLog(g, tt(L.e.logSkip, { role: ROLE[step.roleId].name, player: label(P(g, step.actorId)) }), true); ACT.next(); },
  undo() { const g = S.game; const step = g.steps[g.stepIdx]; const a = g.actions.find(x => x.stepId === step.id); if (a && a.ability === 'execute') P(g, a.actorId).executeUsed = false; if (a && a.ability === 'snipe') P(g, a.actorId).snipeUsed = false; if (a && a.ability === 'ignite') P(g, a.actorId).igniteUsed = false; if (a && a.ability === 'douse') g.doused = g.doused.filter(x => x !== a.targets[0]); if (a && a.ability === 'remember') return; g.actions = g.actions.filter(x => x.stepId !== step.id); S.ui.result = null; S.ui.pick = []; render(); },
  resolve() { const g = S.game; resolveNight(g); startDay(g); S.ui.pick = []; window.scrollTo(0, 0); render(); },
  day0() { const g = S.game; if (isClassic(g)) startDay(g); else startDay0(g); window.scrollTo(0, 0); render(); },
  night() { startNight(S.game); S.ui.pick = []; S.ui.result = null; window.scrollTo(0, 0); render(); },
  speech(el) {
    const g = S.game; const d = +el.dataset.d; g.speechIdx = Math.max(0, g.speechIdx + d);
    if (g.phase === 'day' && g.speechIdx >= speakOrder(g).length) g.dayStage = 'vote';
    window.scrollTo(0, 0); render();
  },
  stage(el) {
    const g = S.game; const w = checkWin(g);
    if (g.dayStage === 'morning' && w) { finishGame(g, w); render(); return; }
    g.dayStage = el.dataset.id; g.speechIdx = 0; S.ui.kamikaze = null; S.ui.pick = []; window.scrollTo(0, 0); render();
  },
  kam() { S.ui.kamikaze = { stage: 'who', who: null }; S.ui.pick = []; render(); },
  'kam-who'() { const g = S.game; const p = P(g, S.ui.pick[0]); if (!p || p.roleId !== 'kamikaze' || p.kamikazeUsed || dayAbilityBlocked(g, p.id)) return; S.ui.kamikaze = { stage: 'victim', who: p.id }; S.ui.pick = []; render(); },
  'kam-cancel'() { S.ui.kamikaze = null; S.ui.pick = []; render(); },
  'kam-confirm'() {
    const g = S.game; const removed = useKamikaze(g, S.ui.kamikaze.who, S.ui.pick[0]);
    S.ui.kamikaze = null; S.ui.pick = [];
    toast(tt(U().toastOut, { list: removed.map(d => P(g, d.id).seat).join(', ') }));
    const w = checkWin(g); if (w) { finishGame(g, w); }
    render();
  },
  cand(el) { const g = S.game; if (!canNominate(g, el.dataset.id) || g.ballot.candidates.includes(el.dataset.id)) return; g.ballot.candidates.push(el.dataset.id); S.ui.candPick = false; render(); },
  'vote-open'(el) { S.ui.voteOpen = S.ui.voteOpen === el.dataset.id ? null : el.dataset.id; render(); },
  'vote-remove'(el) { const b = S.game.ballot; if ((b.forced || []).includes(el.dataset.id)) return; b.candidates = b.candidates.filter(c => c !== el.dataset.id); Object.keys(b.votes).forEach(v => { if (b.votes[v] === el.dataset.id) delete b.votes[v]; }); render(); },
  vote(el) { const g = S.game; const b = g.ballot; const v = el.dataset.v, c = el.dataset.c; if (b.votes[v] === c) delete b.votes[v]; else { b.votes[v] = c; voterAdvance(g); } render(); },
  'voter-step'(el) { const g = S.game; const voters = alive(g).filter(v => canVoteNow(g, v.id)); voterSet(g, Math.max(0, Math.min(voters.length - 1, voterIndex(g, voters) + (+el.dataset.d)))); render(); },
  'voter-go'(el) { voterSet(S.game, +el.dataset.i); render(); },
  'cand-pick'() { S.ui.candPick = !S.ui.candPick; render(); },
  'vote-finish'(el) { const g = S.game; const o = voteOutcome(g); if (o.kind !== 'leader' || o.id !== el.dataset.id) return; finishVote(g, el.dataset.id); S.ui.pick = []; window.scrollTo(0, 0); render(); },
  'vote-none'() { const g = S.game; const o = voteOutcome(g); if (o.kind !== 'empty' && o.kind !== 'skip1') return; finishVote(g, null); window.scrollTo(0, 0); render(); },
  'vote-rest'() { voteRestToLast(S.game); render(); },
  'tie-start'() { const g = S.game; if (voteOutcome(g).kind !== 'tie') return; startTiebreak(g); S.ui.kamikaze = null; S.ui.pick = []; window.scrollTo(0, 0); render(); },
  'tie-speech'(el) { const g = S.game; g.speechIdx = Math.max(0, g.speechIdx + (+el.dataset.d)); if (g.speechIdx >= (g.ballot.tiedIds || []).length) startRevote(g); window.scrollTo(0, 0); render(); },
  revote() { startRevote(S.game); window.scrollTo(0, 0); render(); },
  'roulette-start'() { const g = S.game; const o = voteOutcome(g); if (g.ballot.round !== 2 || o.kind === 'leader') return; startRoulette(g); window.scrollTo(0, 0); render(); },
  'roulette-guess'(el) { const g = S.game; const res = rouletteGuess(g, +el.dataset.n); if (!res) return; if (!res.hit) toast(tt(U().rouletteMiss, { seat: res.p.seat })); else window.scrollTo(0, 0); render(); },
  judge(el) { const g = S.game; if (dayAbilityBlocked(g, el.dataset.id)) return; useJudge(g, el.dataset.id); window.scrollTo(0, 0); render(); },
  lawyer(el) { const g = S.game; if (dayAbilityBlocked(g, el.dataset.id)) return; useLawyer(g, el.dataset.id, el.dataset.t); window.scrollTo(0, 0); render(); },
  'trig-confirm'() { const g = S.game; applyTrigger(g, g.pendingTriggers[0], S.ui.pick[0]); S.ui.pick = []; render(); },
  finish() { const g = S.game; finishGame(g, checkWin(g)); render(); },
  'classic-rules'() { S.ui.classicRules = !S.ui.classicRules; render(); },
  'nom-open'(el) { S.ui.nomOpen = el.dataset.id || null; render(); },
  'prosecute-open'(el) { S.ui.prosecute = el.dataset.id || null; render(); },
  bailiff(el) { useBailiff(S.game, el.dataset.id); render(); },
  prosecute(el) { useProsecutor(S.game, el.dataset.id, el.dataset.c); S.ui.prosecute = null; render(); },
  nominate(el) { nominate(S.game, el.dataset.id, el.dataset.t); S.ui.nomOpen = null; render(); },
  unnominate(el) { unnominate(S.game, el.dataset.id); render(); },
  'vote-close'() { const g = S.game; const o = voteOutcome(g); if (o.kind === 'empty' || o.kind === 'skip1') return; resolveVoteAuto(g); S.ui.pick = []; window.scrollTo(0, 0); render(); },
  'lift-toggle'(el) { liftToggle(S.game, el.dataset.id); render(); },
  'lift-finish'() { finishLiftAll(S.game); window.scrollTo(0, 0); render(); },
  'bm-pick'(el) { const id = el.dataset.id; const i = S.ui.pick.indexOf(id); if (i >= 0) S.ui.pick.splice(i, 1); else if (S.ui.pick.length < 3) S.ui.pick.push(id); render(); },
  'bm-save'(el) { const g = S.game; const r = g.nightResult; if (!r || !r.removed.length) return; recordBestMove(g, r.removed[0].id, el.dataset.skip ? [] : S.ui.pick.slice()); S.ui.pick = []; render(); },
  'foul-add'(el) { const g = S.game; addFoul(g, el.dataset.id); render(); },
  'foul-remove'(el) { removeFoul(S.game, el.dataset.id); render(); },
  'rv-toggle'(el) { S.ui.rvOpen = S.ui.rvOpen || {}; S.ui.rvOpen[el.dataset.id] = !S.ui.rvOpen[el.dataset.id]; render(); },
  filter(el) { S.ui.cardFilter = el.dataset.id; render(); },
  role(el) { S.ui.sheet = { type: 'role', id: el.dataset.id }; render(); },
  sheet(el) { S.ui.sheet = { type: el.dataset.id }; render(); },
  'sheet-close'() { S.ui.sheet = null; render(); },
  player(el) { if (S.screen === 'game' && S.ui.sheet && S.ui.sheet.type === 'players') { S.ui.sheet = { type: 'playerEdit', id: el.dataset.id }; render(); } },
  'toggle-alive'(el) {
    const g = S.game; const p = P(g, el.dataset.id);
    if (p.alive) { eliminate(g, p.id, L.e.causeHost); } else { p.alive = true; p.deadOn = null; addLog(g, tt(L.e.logReturn, { player: label(p) })); }
    S.ui.sheet = { type: 'players' }; render();
  },
  'reset-confirm'() { S.game = null; S.ui.sheet = null; clearInterval(T.iv); T.key = null; S.screen = 'home'; render(); },
  set(el) { const k = el.dataset.k, d = +el.dataset.d; S.settings[k] = Math.max(10, S.settings[k] + d); render(); },
  toggle(el) { const k = el.dataset.k; S.settings[k] = !S.settings[k]; render(); },
  lite(el) { S.settings.lite = el.dataset.v; applyLite(); render(); },
  'timer-toggle'() { T.running = !T.running; timerPaint(); },
  'timer-add'() { T.left += 30; T.total = Math.max(T.total, T.left); timerPaint(); },
  'timer-reset'() { T.left = T.total; T.running = true; timerPaint(); }
};
function setN(n) { const sc = S.setup.scenario ? SCENARIO[S.setup.scenario] : null; n = Math.max(sc ? sc.min : MIN_PLAYERS, Math.min(sc ? sc.max : MAX_PLAYERS, n)); if (n === S.setup.n) return; S.setup.n = n; S.setup.comp = setupComp(n); render(); }

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  if (el.dataset.a === 'sheet-close' && e.target.closest('[data-stop]') && !e.target.closest('button[data-a="sheet-close"]')) return;
  if (!AC && S.settings.sound) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (x) {} }
  const fn = ACT[el.dataset.a]; if (fn) fn(el);
});
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('[role="button"][data-a]')) { e.preventDefault(); e.target.click(); } });
document.addEventListener('input', e => { const el = e.target.closest('[data-a]'); if (!el) return; if (el.dataset.a === 'name') ACT.name(el); if (el.dataset.a === 'pf') ACT.pf(el); if (el.dataset.a === 'fr-q') ACT['fr-q'](el); if (el.dataset.a === 'pl-q') ACT['pl-q'](el); if (el.dataset.a === 'adm-q') ACT['adm-q'](el); if (el.dataset.a === 'adm-days') ACT['adm-days'](el); if (el.dataset.a === 'pt-f') ACT['pt-f'](el); if (el.dataset.a === 'cl-f') ACT['cl-f'](el); if (el.dataset.a === 'cl-msg') ACT['cl-msg'](el); if (el.dataset.a === 'cl-inv-q') ACT['cl-inv-q'](el); });
document.addEventListener('change', e => { const el = e.target.closest('[data-a]'); if (!el) return; if (el.dataset.a === 'nrange') ACT.nrange(el); if (el.dataset.a === 'pf') ACT.pf(el); if (el.dataset.a === 'avatar-file') ACT['avatar-file'](el); if (el.dataset.a === 'cl-logo-file') ACT['cl-logo-file'](el); if (el.dataset.a === 'rt-pick') ACT['rt-pick'](el); if (el.dataset.a === 'tg-seat') ACT['tg-seat'](el); });

/* ---------- boot ---------- */
function start(hot) {
  setLang('ru');
  load();
  if (hot && hot.S) S = hot.S;
  if (!S.settings.lang) S.settings.lang = detectLang();
  setLang(S.settings.lang);
  ensureMe(); seedDemoProfiles();
  try { applyLite(); } catch (e) {}
  if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ S }));
  if (S.screen === 'deal' && !S.game) S.screen = 'home';
  try { tgInit(); } catch (e) {}
  render();
}
/* boot is triggered from 05-profiles.js */
