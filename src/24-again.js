/* ============================================================
   v87 «ЕЩЁ ПАРТИЯ — ТЕ ЖЕ МЕСТА» — the next game at the same table without inviting or re-seating anybody
   (the owner's request, 30.10: after an offline game everyone stays at the number they sat at)
   - the host's results screen: «Ещё партия — те же места» above «Новая игра» (offline games; an online table keeps the old way).
     Every number keeps its player — the typed name, the profile on the seat and the Telegram player; the format and the
     composition stay as they were (the setup screen opens, the host may change them, re-seat with «⇄» or deal at once).
   - a Telegram table: the finished table is history (finishGame cleared the seats), so the server opens the host's next table
     with the same players (/api/lobby/again) — nobody follows a link again, each Telegram player sits at the number he had (S.lobby.seats).
     Their apps move from the finished table to the new one by themselves: /api/table/state of the old table answers `next`.
   - «Новая игра» is unchanged: a clean table, the seats empty.
   ============================================================ */
const AG = { busy: false };
const againOk = g => !!(g && g.winner && !g.online && !g.aborted);
/* who sat where in the finished game: names and profiles by seat, Telegram players → seat index */
function againSeatsOf(g) {
  const ps = g.players.slice().sort((a, b) => a.seat - b.seat);
  const tg = {}; Object.entries((g.tg && g.tg.map) || {}).forEach(([id, seat]) => { seat = Number(seat); if (seat >= 1 && seat <= g.n) tg[Number(id)] = seat - 1; });
  return { n: g.n, names: ps.map(p => String(p.name || '')), profiles: ps.map(p => p.profileId || null), tg };
}
function againBtnHTML(g) {
  const u = U(); if (!againOk(g)) return '';
  return `<button class="btn primary" data-a="again" ${AG.busy ? 'disabled' : ''}>${AG.busy ? u.agBusy : u.agBtn}</button><div class="hint" style="margin:-4px 2px 2px;text-align:center">${u.agHint}</div>`;
}
Object.assign(ACT, {
  async again() {
    const g = S.game; if (!againOk(g) || AG.busy) return; const u = U();
    const keep = againSeatsOf(g); const tgl = g.tg && g.tg.code ? g.tg : null; let lobby = null;
    if (tgl && TG.app && apiBase()) {
      AG.busy = true; render(); let d = null;
      try { d = await api('/api/lobby/again', { code: tgl.code, lang: L.code }); } catch (e) { d = null; } finally { AG.busy = false; }
      if (!d || !d.ok) { toast(d && d.error === 'tournament' ? u.agTournament : u.tgOffline); render(); return; }
      if (S.game !== g) return; // the host went on meanwhile
      lobby = { code: d.code, link: d.link, players: (d.players || []).filter(pl => !isMeTg(pl.tgId)), map: {}, sent: [], seats: {}, flag: d.flag || '' };
      lobby.players.forEach(pl => { const i = keep.tg[pl.tgId]; if (i !== undefined) lobby.seats[pl.tgId] = i; });
    }
    const st = S.setup; st.n = keep.n; st.names = keep.names.slice(); st.seatProfiles = keep.profiles.slice();
    if (!Array.isArray(st.comp) || st.comp.length !== keep.n) st.comp = setupComp(keep.n); // the same format and line-up as the finished game
    S.ui.showAll = false; S.ui.reseatOn = false; S.ui.reseat = null;
    if (lobby) { S.lobby = lobby; setupAutoSeat(); } // a player who joined the table during the game takes a free seat, as before
    save(); go('setup'); tgHaptic('success');
    const n = lobby ? Object.keys(lobby.seats).length : 0;
    toast(n ? tt(u.agDoneTg, { n }) : u.agDone);
    if (lobby) { try { publishTable(true); } catch (e) {} } // the players see their numbers in the waiting room at once
  }
});
(function () {
  // the results screen: the same seats first, a clean table second
  const origEnd = endScreen;
  endScreen = function () {
    const html = origEnd.apply(this, arguments); const g = S.game; const b = againBtnHTML(g); if (!b) return html;
    const k = '<button class="btn primary" data-a="new">'; const i = html.indexOf(k); return i < 0 ? html : html.slice(0, i) + b + '<button class="btn" data-a="new">' + html.slice(i + k.length);
  };
  // a player at the finished table follows the host to the next one, keeping the app open
  const origOpen = tableOpen;
  tableOpen = function (code) { if (String(code || '').toUpperCase() !== TB.code) TB.endSynced = false; return origOpen.apply(this, arguments); }; // every game at a new table refreshes my rating once it ends
  const origFetch = tableFetch;
  tableFetch = async function () {
    const r = await origFetch.apply(this, arguments); const d = TB.data;
    if (d && d.next && d.next !== TB.code && S.screen === 'table' && /^[A-Z0-9]{4,8}$/.test(String(d.next))) {
      const next = String(d.next); S.cloud = S.cloud || {}; S.cloud.table = { code: next, status: 'open' };
      toast(U().agMoved); tgHaptic('success'); tableOpen(next);
    }
    return r;
  };
})();
