/* ============================================================
   v62 FOULS AND LAST WORDS — the host's screens (rules: 03-engine.js, texts: 02y-i18n-fouls.js)
   — the «Fouls» strip under every stage of the game: every seat with its four dots; a tap opens the player's fouls:
     +1…+4 at once, −1, take back all, undo the last change (a removed player returns);
   — last words: 30 seconds, one by one, for whoever has just left the table (not for a removal by fouls);
   — a removal that decides the game offers to finish it.
   ============================================================ */
const foulDots = (n, cls = '') => `<span class="fl-dots ${cls}">${[1, 2, 3, 4].map(k => `<i class="${k <= n ? 'on' : ''} ${k === 3 ? 'k3' : k === 4 ? 'k4' : ''}"></i>`).join('')}</span>`;
const foulStateText = n => (U().flState || [])[Math.max(0, Math.min(4, n || 0))] || '';
function foulStripHTML(g) {
  if (!g || g.winner || !g.dealt) return '';
  const u = U(); const undo = (g.foulLog || []).length;
  const chips = g.players.map(p => {
    const n = p.fouls || 0; const live = p.alive || p.foulOut;
    const cls = ['fl-chip', 'f' + Math.min(4, n), p.foulOut ? 'out' : '', !live ? 'dead' : ''].filter(Boolean).join(' ');
    return `<button class="${cls}" ${live ? `data-a="foul-open" data-id="${p.id}"` : 'disabled'} aria-label="${esc(tt(u.flSetToast, { seat: p.seat, state: foulStateText(n) }))}"><span class="s">${p.seat}</span><span class="nm">${esc(p.name)}</span>${p.foulOut ? `<span class="tag">${u.flOutTag}</span>` : foulDots(n)}</button>`;
  }).join('');
  return `<div class="panel fl-strip"><div class="row" style="gap:8px"><div class="eyebrow grow" style="margin:0">${u.fouls}</div>${undo ? `<button class="btn ghost xs" data-a="foul-undo">↶ ${u.flUndo}</button>` : ''}</div><div class="hint" style="margin:4px 0 8px">${u.flHint}</div><div class="fl-grid">${chips}</div></div>`;
}
/* the player's fouls (a bottom sheet) */
function foulSheetHTML(id) {
  const u = U(); const g = S.game; const p = g && P(g, id); if (!p) return '';
  const n = p.fouls || 0;
  const give = [1, 2, 3, 4].filter(k => n + k <= 4).map(k => `<button class="btn fl-give ${n + k >= 4 ? 'danger' : n + k >= 3 ? 'gold' : ''}" data-a="foul-give" data-id="${p.id}" data-k="${k}"><b>+${k}</b><small>${tt(u.flTo, { n: n + k })}</small></button>`).join('');
  return `<div class="row" style="gap:12px"><span class="fl-seat">${p.seat}</span><div class="grow" style="min-width:0"><h2 style="margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.flSheet} · ${esc(p.name)}</h2><div class="hint" style="margin:2px 0 0">${foulStateText(n)}</div></div></div>
    <div class="fl-big">${foulDots(n, 'lg')}<span class="num">${tt(u.flOf, { n })}</span></div>
    ${p.foulOut ? `<div class="warnbox">${u.flBackHint}</div>` : ''}
    ${give ? `<div class="eyebrow" style="margin-top:12px">${u.flGive}</div><div class="fl-gives">${give}</div>` : ''}
    ${n ? `<div class="btn-row" style="margin-top:10px"><button class="btn ghost" data-a="foul-minus" data-id="${p.id}">− ${u.flMinus}</button><button class="btn ghost" data-a="foul-clear" data-id="${p.id}">${u.flClear}</button></div>` : ''}
    ${(g.foulLog || []).length ? `<button class="btn ghost sm" data-a="foul-undo" style="margin-top:8px;align-self:flex-start">↶ ${u.flUndo}</button>` : ''}
    <p class="hint" style="margin:12px 0 0">${u.flRules}</p>`;
}
/* last words: the player who leaves now, a 30-second timer, then the next one */
function lastWordsHTML(g) {
  const lw = lastWordsNow(g); if (!lw) return '';
  const u = U(); const p = lw.p; const role = ROLE[p.roleId]; const shown = roleShown(g, p);
  return `<div class="panel raised lw-panel"><div class="row"><div class="eyebrow gold grow" style="margin:0">${u.lwTitle}</div>${lw.n > 1 ? `<span class="hint" style="margin:0">${tt(u.lwOf, { i: lw.i + 1, n: lw.n })}</span>` : ''}</div>
    <div class="speaker" style="margin-top:8px">${shown && role ? sealFor(role, skinOfPlayer(g, p)) : `<span class="seat">${p.seat}</span>`}<div><div class="n">${esc(label(p))}</div><div class="s">${u.lwHint}</div></div></div>
    ${timerHTML(LAST_WORDS_SEC, `lw-${g.phase}-${g.day}-${g.night}-${lw.i}-${p.id}`)}
    <div class="btn-row" style="margin-top:6px"><button class="btn primary grow" data-a="lw-next">${lw.i + 1 < lw.n ? u.lwNext : u.lwDone}</button></div></div>`;
}
/* a day stage with its own clock waits for the last words (the Kamikaze's victim, a removal in the middle of the speeches) */
function lastWordsBlockHTML(g) {
  const u = U(); return `${phaseHead(g, u.lwTitle, u.lwThen)}${lastWordsHTML(g)}`;
}
/* a removal by fouls that decides the game */
function foulWinHTML(g) {
  if (!g || g.winner || !g.dealt || !g.players.some(p => p.foulOut)) return '';
  if (g.phase === 'day' && (g.dayStage === 'morning' || g.dayStage === 'result')) return ''; // these screens offer the end themselves
  const w = checkWin(g); if (!w) return '';
  return `<div class="panel raised" style="border-color:var(--gold-2)"><div class="eyebrow gold">${tt(U().flWin, { title: esc(w.title) })}</div><button class="btn primary" data-a="finish" style="margin-top:8px">${tt(U().gameOver, { title: w.title })}</button></div>`;
}
/* a speaker with 3 fouls: no timer, a note, the host moves on */
function foulMutedSpeechHTML(p, nextLabel) {
  const u = U(); return `<div class="warnbox"><b>${u.flMutedSpeech}</b> · ${tt(u.flMutedHint, { next: nextLabel })}</div>`;
}
function foulToast(g, p) {
  const u = U(); if (!p) return;
  if (p.foulOut) { toast(tt(u.flOutToast, { seat: p.seat })); tgHaptic('warning'); return; }
  toast(tt(u.flSetToast, { seat: p.seat, state: foulStateText(p.fouls || 0) })); tgHaptic(p.fouls >= 3 ? 'warning' : 'light');
}
Object.assign(ACT, {
  'foul-open'(el) { const g = S.game; const p = g && P(g, el.dataset.id); if (!p || !(p.alive || p.foulOut)) return; S.ui.sheet = { type: 'fouls', id: p.id }; render(); },
  'foul-give'(el) { const g = S.game; const e = addFouls(g, el.dataset.id, +el.dataset.k); if (!e) return; S.ui.sheet = null; foulToast(g, P(g, el.dataset.id)); render(); },
  'foul-minus'(el) { const g = S.game; const p = P(g, el.dataset.id); if (!p || !setFouls(g, p.id, (p.fouls || 0) - 1)) return; S.ui.sheet = null; foulToast(g, p); render(); },
  'foul-clear'(el) { const g = S.game; const p = P(g, el.dataset.id); if (!p || !setFouls(g, p.id, 0)) return; S.ui.sheet = null; foulToast(g, p); render(); },
  'foul-undo'() { const g = S.game; const e = g && undoFoul(g); if (!e) { toast(U().flNothing); return; } const p = P(g, e.pid); S.ui.sheet = null; toast(tt(U().flUndone, { seat: p.seat, n: p.fouls || 0 })); render(); },
  'lw-next'() { const g = S.game; if (!g) return; lastWordsNext(g); window.scrollTo(0, 0); render(); }
});
(function () {
  const orig = sheetHTML;
  sheetHTML = function (enter) {
    const sh = S.ui.sheet; if (!sh || sh.type !== 'fouls' || !S.game) return orig(enter);
    const u = U(); return `<div class="sheet-bg ${enter !== false ? 'enter' : ''}" data-a="sheet-close"><div class="sheet" data-stop="1"><div class="grab"></div>${foulSheetHTML(sh.id)}<button class="btn ghost" style="margin-top:14px" data-a="sheet-close">${u.close}</button></div></div>`;
  };
})();
