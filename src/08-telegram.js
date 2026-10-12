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
    ACT['buy-confirm'] = function (el) { const kind = el.dataset.kind, id = el.dataset.id; if (window.MAFIA_API && tgBuy(kind, id, () => origBuy.call(this, el))) { S.ui.sheet = null; render(); return; } return origBuy.call(this, el); };
    tgSync();
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
/* purchases: in Telegram the demo button becomes a Stars invoice (needs the bot backend to create the invoice link) */
function tgBuy(kind, id, onDone) {
  const tg = TG.app; if (!tg || !tg.openInvoice || !window.MAFIA_API) return false;
  try {
    fetch(window.MAFIA_API + '/invoice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, id, initData: tg.initData }) })
      .then(r => r.json()).then(d => { if (d && d.link) tg.openInvoice(d.link, status => { if (status === 'paid') onDone(); }); else toast(U().tgNA); })
      .catch(() => toast(U().tgNA));
    return true;
  } catch (e) { return false; }
}
// hooks into the app: haptics on key taps, back button sync after every render, deep-link start
(function () {
  const wrap = (name, kind) => { const f = ACT[name]; if (!f) return; ACT[name] = function (el) { tgHaptic(kind); return f.call(this, el); }; };
  wrap('flip', 'impact'); wrap('confirm', 'light'); wrap('vote-finish', 'success'); wrap('vote-close', 'success'); wrap('kam-confirm', 'warning'); wrap('roulette-guess', 'light'); wrap('lift-finish', 'success'); wrap('finish', 'success');
  const origRender = render;
  render = function () { origRender(); if (TG.app) tgSync(); if (S.ui && S.ui.tgStart) { const st = S.ui.tgStart; S.ui.tgStart = null; if (ACT[st.a]) ACT[st.a]({ dataset: { id: st.id } }); } };
})();
