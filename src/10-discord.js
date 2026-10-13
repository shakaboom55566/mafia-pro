/* ============================================================
   DISCORD VOICE ROOM (v33) — online game only.
   The host switches "Play with Discord" on: the server creates a voice channel "<flag> Mafia · <code>"
   for seats + 1 people (the flag = the creator's app language) with an 8-hour invite.
   Players join it from the waiting room and tap "I'm on voice"; the cards are dealt only after the host
   confirms that everyone is on voice. The channel is removed when the table closes or a few minutes after the game.
   ============================================================ */
const DC = { busy: false, ask: false, sizing: false };
const discordOn = () => !!(TG.app && apiBase() && S.cloud && S.cloud.discord);
const voiceOf = l => (l && l.voice) || null;
const voiceTable = () => (S.lobby && S.lobby.code && !(S.game && !S.game.winner) ? S.lobby : null);
/* the deal waits for the host's "everyone is on voice" */
function voiceBlocksDeal() { const l = voiceTable(); const v = voiceOf(l); return !!(S.setup.online && v && v.on && !v.confirmed); }
function openVoice(url) { if (!/^https:\/\/discord\.(gg|com)\//.test(String(url || ''))) return; try { if (TG.app && TG.app.openLink) TG.app.openLink(url); else window.open(url, '_blank'); } catch (e) {} tgHaptic('light'); }
/* after every table poll: the room follows the seat count (seats + 1) */
function voiceSync(l) {
  const v = voiceOf(l); if (!v || !v.on || l !== voiceTable() || DC.sizing || DC.busy || v.seats === S.setup.n) return;
  DC.sizing = true; api('/api/lobby/discord', { code: l.code, on: true, seats: S.setup.n }).then(d => { DC.sizing = false; if (d.ok) { l.voice = d.voice; save(); } }).catch(() => { DC.sizing = false; });
}
/* host, setup screen: the switch, the room, who is on voice, the confirmation */
function voicePanelHTML(st) {
  if (!discordOn() || !S.setup.online || S.setup.scenario === 'classic') return '';
  const l = voiceTable(); if (!l) return '';
  const u = U(); const v = voiceOf(l); const on = !!(v && v.on); const limit = st.n + 1;
  const sw = `<div class="setting" style="border-bottom:0;padding:8px 0 0"><div><div class="t">🎧 ${u.dcSwitch}</div><div class="d">${tt(u.dcSwitchD, { n: limit })}</div></div><div class="ctl"><button class="switch ${on || DC.busy ? 'on' : ''}" data-a="dc-toggle" role="switch" aria-checked="${on ? 'true' : 'false'}" aria-label="${u.dcSwitch}" ${DC.busy ? 'disabled' : ''}></button></div></div>`;
  let body = '';
  if (DC.busy) body = `<div class="hint" style="margin-top:8px">${on ? '…' : u.dcCreating}</div>`;
  else if (v && v.error && !on) body = `<div class="warnbox" style="margin-top:8px">${tt(u.dcFailed, { err: esc(String(v.error).slice(0, 80)) })}</div><button class="btn sm" style="margin-top:8px" data-a="dc-toggle" data-retry="1">${u.dcRetry}</button>`;
  else if (on) {
    const players = l.players || []; const okIds = v.ok || [];
    const rows = players.map(pl => { const yes = okIds.includes(pl.tgId); return `<span class="chip dc-chip ${yes ? 'on' : ''}" style="pointer-events:none">${yes ? '🎧 ' : ''}${esc(pl.name)}${yes ? '' : ' · …'}</span>`; }).join('');
    const confirm = v.confirmed
      ? `<div class="okbox dc-ok" style="margin-top:10px">${u.dcConfirmed} <button class="btn xs ghost" data-a="dc-unconfirm" style="margin-left:6px">${u.dcUnconfirm}</button></div>`
      : `<button class="btn ${DC.ask ? 'primary' : ''}" style="margin-top:10px" data-a="dc-confirm" ${players.length ? '' : 'disabled'}>${DC.ask ? u.dcConfirmSure : '✓ ' + u.dcConfirm}</button>`;
    body = `<div class="hint" style="margin:8px 0 0">${tt(u.dcChannel, { name: esc((l.flag || '') + ' Mafia · ' + l.code), n: v.limit || limit })}</div>
      <div class="btn-row" style="margin-top:8px"><button class="btn primary" data-a="dc-join" data-url="${esc(v.invite)}">🎧 ${u.dcJoin}</button></div>
      <div class="row" style="margin-top:10px"><div class="eyebrow grow" style="margin:0">${tt(u.dcCount, { k: players.filter(pl => okIds.includes(pl.tgId)).length, n: players.length })}</div></div>
      ${rows ? `<div class="filters wrap" style="margin-top:6px">${rows}</div>` : `<div class="hint" style="margin-top:6px">${u.dcNobody}</div>`}
      ${confirm}`;
  }
  return `<div class="panel dc-panel"><div class="row"><div class="eyebrow grow" style="margin:0">${u.dcTitle}</div>${l.flag ? `<span class="hint" style="margin:0" title="${u.dcTableLang}">${l.flag}</span>` : ''}</div>${sw}${body}</div>`;
}
/* player, table screen: join the room, "I'm on voice" */
function tbVoiceHTML(d, compact) {
  const v = d && d.voice; if (!v || !v.on || !v.invite) return ''; const u = U();
  if (compact) return `<div class="btn-row" style="justify-content:center"><button class="btn sm ghost" data-a="dc-join" data-url="${esc(v.invite)}">🎧 ${u.dcGame} · ${u.dcTag}</button></div>`;
  const n = (d.players || []).length; const k = (v.ok || []).length;
  return `<div class="panel dc-panel"><div class="row"><div class="eyebrow grow" style="margin:0">🎧 ${u.dcRoom}</div><div class="hint" style="margin:0">${tt(u.dcCount, { k, n })}</div></div>
    <div class="hint" style="margin:6px 0 10px">${v.confirmed ? u.dcConfirmedP : u.dcPlayerHint}</div>
    <div class="btn-row"><button class="btn primary" data-a="dc-join" data-url="${esc(v.invite)}">${u.dcJoin}</button>${d.isHost ? '' : `<button class="btn ${v.mine ? '' : 'ghost'}" data-a="dc-im-on">${v.mine ? u.dcImOnDone : u.dcImOn}</button>`}</div></div>`;
}
Object.assign(ACT, {
  async 'dc-toggle'(el) {
    const l = voiceTable(); if (!l || DC.busy) return; const u = U();
    const v = voiceOf(l); const on = !!(el && el.dataset && el.dataset.retry) || !(v && v.on);
    DC.busy = true; DC.ask = false; render();
    const ask = () => api('/api/lobby/discord', { code: l.code, on, seats: S.setup.n, lang: L.code }, { timeout: 25000 });
    let d = await ask();
    if (!d.ok && d.error === 'not_online' && S.setup.online) { await api('/api/lobby/role', { code: l.code, online: true }); d = await ask(); } // the format switch has not reached the server yet
    DC.busy = false;
    if (!d.ok) { if (d.error === 'discord_failed') { l.voice = { on: false, error: d.detail || 'error' }; toast(u.dcFailedToast); tgHaptic('error'); } else toast(u.tgOffline); save(); render(); return; }
    l.voice = d.voice || null; save(); render(); toast(on ? u.dcCreated : u.dcRemoved); if (on) tgHaptic('success');
  },
  'dc-join'(el) { openVoice(el.dataset.url); },
  async 'dc-confirm'() {
    const l = voiceTable(); if (!l) return;
    if (!DC.ask) { DC.ask = true; render(); setTimeout(() => { if (DC.ask) { DC.ask = false; render(); } }, 4000); return; } // second tap confirms
    DC.ask = false; const d = await api('/api/lobby/voice-confirm', { code: l.code, confirmed: true }); if (!d.ok) { toast(U().tgOffline); render(); return; }
    l.voice = d.voice; save(); tgHaptic('success'); render();
  },
  async 'dc-unconfirm'() { const l = voiceTable(); if (!l) return; const d = await api('/api/lobby/voice-confirm', { code: l.code, confirmed: false }); if (!d.ok) { toast(U().tgOffline); return; } l.voice = d.voice; save(); render(); },
  async 'dc-im-on'() {
    const v = TB.data && TB.data.voice; if (!v || !TB.code) return; const want = !v.mine; v.mine = want; render();
    const d = await api('/api/table/voice', { code: TB.code, ok: want }); if (!d.ok) { v.mine = !want; toast(U().tgOffline); render(); return; }
    TB.data.voice = d.voice; if (want) tgHaptic('success'); render();
  }
});
(function () {
  // the room sits right under the format chooser on the setup screen
  const origSetup = setupScreen;
  const panelEnd = (html, i) => { const re = /<div\b|<\/div>/g; re.lastIndex = i; let depth = 0, m; while ((m = re.exec(html))) { depth += m[0] === '</div>' ? -1 : 1; if (depth === 0) return m.index + 6; } return -1; }; // end of the balanced <div> that starts at i
  setupScreen = function () {
    const html = origSetup(); let p = ''; try { p = voicePanelHTML(S.setup); } catch (e) { p = ''; } if (!p) return html;
    const i = html.indexOf('<div class="panel"><div class="eyebrow">' + U().onMode + '</div>'); const k = i < 0 ? -1 : panelEnd(html, i);
    if (k > 0) return html.slice(0, k) + p + html.slice(k);
    const j = html.indexOf('<div class="stack">'); return j < 0 ? html : html.slice(0, j + 19) + p + html.slice(j + 19);
  };
  // offline format: the room goes (the server deletes it too)
  const origMode = ACT['on-mode']; ACT['on-mode'] = function (el) { const r = origMode.call(this, el); if (!S.setup.online && S.lobby && S.lobby.voice) { S.lobby.voice = null; DC.ask = false; save(); render(); } return r; };
  // the host's game strip carries the room link
  const origStrip = onlineStripHTML; onlineStripHTML = function (g) { const s = origStrip(g); const v = g && g.tg && g.tg.voice; if (!s || !v || !v.on || !v.invite) return s; return s.replace(/<\/div>$/, ` <button class="btn xs ghost" data-a="dc-join" data-url="${esc(v.invite)}" style="margin-left:4px;padding:3px 8px">🎧 ${U().dcTag}</button></div>`); };
})();
