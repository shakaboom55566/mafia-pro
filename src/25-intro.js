/* ============================================================
   v88 WHO OPENS THE INTRODUCTIONS — the host picks the number on the setup screen (the owner's request, 04.11.2026)
   - S.setup.introFrom (1 by default) → the deal copies it into g.introFrom → startDay0 opens the introductions with that seat
     (introFirstSeat / introOrder in 03-engine.js) and they go round the table from it; the minutes of day 1 start from the next
     living seat after it, as since v64.
   - Role game only: the classic has no introductions. The number stays for the next game (and «Ещё партия»).
   ============================================================ */
function introFromOf(st) {
  st = st || S.setup; const n = Math.max(1, Number(st.n) || 1);
  return Math.max(1, Math.min(n, Math.round(Number(st.introFrom) || 1)));
}
/* who sits at that number on the setup screen: a profile on the seat, a Telegram player or a typed name */
function introFromWho(st, seat) {
  const sp = st.seatProfiles || []; const pr = sp[seat - 1] && typeof profById === 'function' ? profById(sp[seat - 1]) : null;
  return pr ? pr.name : String((st.names || [])[seat - 1] || '').trim();
}
function introFromHTML(st) {
  const u = U(); st = st || S.setup; const n = st.n; const v = introFromOf(st); const who = introFromWho(st, v);
  const order = Array.from({ length: Math.min(n, 4) }, (_, i) => ((v - 1 + i) % n) + 1).join(', ');
  return `<div class="stepper intro-from"><div style="min-width:0"><div class="lbl">${u.ifTitle}</div><div class="val num">${tt(u.ifSeat, { seat: v })}</div>${who ? `<div class="hint" style="margin:2px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(who)}</div>` : ''}</div>
    <div class="ctl"><button data-a="intro-from" data-d="-1" aria-label="${u.less}">−</button><button data-a="intro-from" data-d="1" aria-label="${u.more}">+</button></div></div>
    <div class="row" style="gap:8px;align-items:flex-start"><div class="hint grow" style="margin:0">${tt(u.ifHint, { order, next: (v % n) + 1 })}</div><button class="btn xs ghost" data-a="intro-from-rand" style="flex:0 0 auto">🎲 ${u.ifRandom}</button></div>`;
}
Object.assign(ACT, {
  'intro-from'(el) { const st = S.setup; const n = Math.max(1, st.n || 1); const v = introFromOf(st) + (Number(el.dataset.d) || 0); st.introFrom = ((v - 1 + n) % n) + 1; save(); render(); }, // − on № 1 goes to the last seat and back
  'intro-from-rand'() {
    const st = S.setup; const n = Math.max(1, st.n || 1); const cur = introFromOf(st); let v = cur;
    if (n > 1) while (v === cur) v = 1 + Math.floor(Math.random() * n);
    st.introFrom = v; save(); render(); toast(tt(U().ifPicked, { seat: v })); if (typeof tgHaptic === 'function') tgHaptic('light');
  }
});
