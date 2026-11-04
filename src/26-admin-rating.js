/* ============================================================
   v88 AN ADMIN CHANGES A PLAYER'S RATING (the owner's request, 04.11.2026)
   - «⭐ Рейтинг» on a player's sheet and on his statistics screen (admins only), and a search by @username / id in Settings.
   - The sheet: the rating now, quick amounts 10 / 25 / 50 / 100 or any number up to 1000, an optional reason the player sees,
     «Начислить» / «Снять». The server (/api/admin/rating/set) moves the rating at once, logs the change (rating_grants) and
     the bot tells the player. The same from the bot: /rating @user +50 reason.
   ============================================================ */
const ADMRT = { id: null, d: null, busy: false, q: '', amt: '25', why: '' };
const admRatingOn = () => !!(typeof TG !== 'undefined' && TG.app && apiBase() && S.cloud && S.cloud.admin);
function admRatingLoad(q) {
  ADMRT.d = null; ADMRT.busy = true;
  setTimeout(async () => { const d = await api('/api/admin/rating', typeof q === 'number' ? { tgId: q } : { q }); ADMRT.busy = false; ADMRT.d = d && d.ok ? d : { error: (d && d.error) || 'network' }; if (ADMRT.d.user) ADMRT.id = ADMRT.d.user.tgId; render(); }, 0);
}
function admRatingSheetHTML() {
  const u = U(); const d = ADMRT.d;
  if (!d) return `<h2>⭐ ${u.arTitle}</h2><p class="hint">${u.arLoading}</p>`;
  if (d.error) return `<h2>⭐ ${u.arTitle}</h2><p class="hint">${d.error === 'not_found' ? u.arNone : u.tgOffline}</p>`;
  const fmt = ms => { try { return new Date(ms).toLocaleDateString(typeof locale === 'function' ? locale() : undefined, { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };
  const chips = [10, 25, 50, 100].map(n => `<button class="chip ${String(n) === String(ADMRT.amt) ? 'active' : ''}" data-a="adm-rt-amt" data-n="${n}">${n}</button>`).join('');
  const log = (d.log || []).map(x => `<div class="row" style="gap:8px"><span class="num" style="font-weight:800;min-width:52px;color:${x.delta > 0 ? '#9fe0ab' : 'var(--crimson-2)'}">${x.delta > 0 ? '+' : ''}${x.delta}</span><div class="grow hint" style="margin:0">${x.reason ? esc(x.reason) : '—'}</div><span class="hint" style="margin:0">${fmt(x.at)}</span></div>`).join('');
  return `<h2 style="margin:0">⭐ ${u.arTitle}</h2><div class="hint" style="margin:2px 0 0"><b>${esc(d.user.name)}</b>${d.user.username ? ' · @' + esc(d.user.username) : ''}</div>
    <div class="status" style="margin-top:10px"><div class="st"><div class="v num" style="color:var(--gold-2)">${d.rating.points}</div><div class="k">${u.rating}</div></div><div class="st"><div class="v num">${d.rating.games}</div><div class="k">${u.games}</div></div></div>
    <div class="eyebrow" style="margin-top:12px">${u.arAmount}</div>
    <div class="row" style="margin-top:6px;gap:6px;flex-wrap:wrap">${chips}</div>
    <input class="input" id="adm-rt-n" data-a="adm-rt-n" type="number" inputmode="numeric" min="1" max="1000" value="${esc(ADMRT.amt)}" style="margin-top:8px" autocomplete="off">
    <input class="input" id="adm-rt-why" data-a="adm-rt-why" maxlength="120" placeholder="${esc(u.arReason)}" value="${esc(ADMRT.why)}" style="margin-top:8px" autocomplete="off">
    <div class="btn-row" style="margin-top:10px"><button class="btn primary" data-a="adm-rt-apply" data-sign="1" ${ADMRT.busy ? 'disabled' : ''}>+ ${u.arAdd}</button><button class="btn" data-a="adm-rt-apply" data-sign="-1" style="color:var(--crimson-2)" ${ADMRT.busy ? 'disabled' : ''}>− ${u.arTake}</button></div>
    <p class="hint" style="margin:8px 0 0">${u.arHint}</p>
    <div class="eyebrow" style="margin-top:12px">${u.arLog}</div>${log ? `<div class="stack-s" style="margin-top:6px">${log}</div>` : `<p class="hint">${u.arNoLog}</p>`}`;
}
function admRatingPanelHTML() { // Settings → the admin panel: open any player's rating by @username or id
  if (!admRatingOn()) return ''; const u = U();
  return `<div class="eyebrow" style="margin-top:12px">⭐ ${u.arPanel}</div><div class="hint" style="margin:4px 0 6px">${u.arPanelHint}</div>
    <div class="row"><input class="input grow" id="adm-rt-q" data-a="adm-rt-q" placeholder="@username" value="${esc(ADMRT.q)}" autocomplete="off" autocapitalize="off"><button class="btn sm" data-a="adm-rt-find" style="flex:0 0 auto">${u.arOpen}</button></div>`;
}
const admRatingBtnHTML = (id, style = '') => admRatingOn() ? `<button class="btn ghost sm" data-a="adm-rating" data-id="${Number(id)}"${style ? ` style="${style}"` : ''}>⭐ ${U().arBtn}</button>` : '';
Object.assign(ACT, {
  'adm-rating'(el) { if (!admRatingOn()) return; const id = Number(el.dataset.id); if (!id) return; ADMRT.id = id; ADMRT.why = ''; S.ui.sheet = { type: 'admRating' }; admRatingLoad(id); render(); },
  'adm-rt-q'(el) { ADMRT.q = el.value || ''; },
  'adm-rt-n'(el) { ADMRT.amt = String(el.value || '').replace(/[^\d]/g, '').slice(0, 4); },
  'adm-rt-why'(el) { ADMRT.why = String(el.value || '').slice(0, 120); },
  'adm-rt-amt'(el) { ADMRT.amt = String(Number(el.dataset.n) || 25); render(); },
  'adm-rt-find'() { if (!admRatingOn()) return; const q = ADMRT.q.trim(); if (!q) return; ADMRT.why = ''; S.ui.sheet = { type: 'admRating' }; admRatingLoad(/^\d+$/.test(q) ? Number(q) : q); render(); },
  async 'adm-rt-apply'(el) {
    const u = U(); const d = ADMRT.d; if (!admRatingOn() || !d || !d.user || ADMRT.busy) return;
    const n = Math.round(Number(ADMRT.amt) || 0); if (!(n >= 1 && n <= 1000)) { toast(u.arBad); return; }
    const delta = (Number(el.dataset.sign) < 0 ? -1 : 1) * n;
    ADMRT.busy = true; render(); let r = null;
    try { r = await api('/api/admin/rating/set', { tgId: d.user.tgId, delta, reason: ADMRT.why.trim() }); } finally { ADMRT.busy = false; }
    if (!r || !r.ok) { toast(r && r.error === 'too_low' ? u.arTooLow : r && r.error === 'bad_delta' ? u.arBad : u.tgOffline); render(); return; }
    ADMRT.d = r; ADMRT.why = ''; toast(tt(u.arDone, { name: r.user.name, delta: (delta > 0 ? '+' : '') + delta, rating: r.rating.points })); if (typeof tgHaptic === 'function') tgHaptic('success');
    const id = r.user.tgId; if (typeof FRP !== 'undefined' && FRP[id]) delete FRP[id]; // his sheet and statistics show the new rating
    if (S.cloud && S.cloud.user && S.cloud.user.id === id && S.cloud.rating) S.cloud.rating.points = r.rating.points - 1000;
    if (typeof CLOUD !== 'undefined') CLOUD.topAt = 0; // the leaderboard is fetched again
    render();
  }
});
(function () {
  try { // the text fields keep what is typed across renders; Enter in the search opens the player
    document.addEventListener('input', e => { const el = e.target && e.target.closest && e.target.closest('[data-a="adm-rt-q"],[data-a="adm-rt-n"],[data-a="adm-rt-why"]'); if (el) ACT[el.dataset.a](el); });
    document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'adm-rt-q') { e.preventDefault(); ACT['adm-rt-find'](); } });
  } catch (e) {}
  const orig = sheetHTML;
  sheetHTML = function (enter) {
    const sh = S.ui.sheet; if (!sh || sh.type !== 'admRating') return orig.apply(this, arguments);
    return `<div class="sheet-bg ${enter === false ? '' : 'enter'}" data-a="sheet-close"><div class="sheet" data-stop="1"><div class="grab"></div>${admRatingSheetHTML()}<button class="btn ghost" style="margin-top:14px" data-a="sheet-close">${U().close}</button></div></div>`;
  };
})();
