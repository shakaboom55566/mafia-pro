/* ============================================================
   v77 OFFICIAL HOSTS — verified hosts with a licence; every game at their tables brings the players emeralds (up to 100 a game).
   The screen «Official hosts»: how the reward is counted, the officials' open tables, my way to the status (the application,
   the licence for 5 000 💎 / 30 days), the rules and the penalties, the admin's panel (applications, appoint, remove, punish).
   The ✔ mark: the table finder, the round table, the player's statistics. At an official table: «about N 💎 for you»; after the game: +N 💎.
   Server: backend/src/official.js (the arithmetic between official:begin … official:end is the same there; backend/test/run.js compares).
   Texts — src/02zf-i18n-official.js.
   ============================================================ */
/* official:begin — the same constants and arithmetic as in backend/src/official.js */
const OFFICIAL_RANK_K = [20, 30, 40, 50, 60, 70, 85, 100]; // emeralds a game «worth» at each rank: Rookie … Legend
const OFFICIAL_LICENSE = { price: 5000, days: 30, minHosted: 50 }; // the licence: emeralds, days; an applicant needs MORE than minHosted hosted games
const OFFICIAL_LIMITS = { minPlayers: 7, minAccounts: 5, minMinutes: 15, dayGames: 5, hostDay: 12, max: 100 };
/* the «worth» at a fractional rank (the table's average) */
function officialK(x) {
  x = Math.max(0, Math.min(OFFICIAL_RANK_K.length - 1, Number(x) || 0)); const i = Math.floor(x), f = x - i;
  return i >= OFFICIAL_RANK_K.length - 1 ? OFFICIAL_RANK_K[i] : OFFICIAL_RANK_K[i] + (OFFICIAL_RANK_K[i + 1] - OFFICIAL_RANK_K[i]) * f;
}
/* the emeralds of one player for one game: 2/3 the table (the average rank of the seated accounts), 1/3 his own rank — which counts
   at most one step above the table's average (a strong player at a weak table cannot farm it) */
function officialReward(avg, own) {
  const table = officialK(avg); const me = Math.min(officialK(own), officialK(Math.min(OFFICIAL_RANK_K.length - 1, (Number(avg) || 0) + 1)));
  return Math.max(1, Math.min(OFFICIAL_LIMITS.max, Math.round((2 * table + me) / 3)));
}
/* official:end */
const OH = { d: null, at: 0, busy: false, formOpen: false, form: null, err: [], adm: { aq: '', adays: 30, pq: '', preason: '', pdays: 0, notes: {} }, ask: '' };
const ohIn = () => typeof TG !== 'undefined' && !!TG.app && !!apiBase();
const ohLim = () => (OH.d && OH.d.limits) || OFFICIAL_LIMITS;
const ohLic = () => (OH.d && OH.d.license) || OFFICIAL_LICENSE;
const ohDate = ms => { try { return new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } };
const ohEm = n => (typeof fmtEm === 'function' ? fmtEm(n) : String(n));
const ohMe = () => (OH.d && OH.d.me) || (S.cloud && S.cloud.official) || null;
const ohBadge = (big) => `<span class="oh-badge${big ? ' big' : ''}" title="${esc(U().ohBadge)}">✔</span>`;
function ohFetch(force) {
  if (!ohIn() || OH.busy) return; if (!force && OH.at && Date.now() - OH.at < 20000) return;
  OH.busy = true; api('/api/official', {}).then(d => { OH.busy = false; OH.at = Date.now(); if (d && d.ok) { OH.d = d; if (S.cloud) S.cloud.official = d.me; if (S.screen === 'official') keepFocus(render); } }).catch(() => { OH.busy = false; });
}
try { setInterval(() => { try { if (S.screen === 'official') ohFetch(); } catch (e) {} }, 30000); } catch (e) {}

/* ---------- how the reward is counted ---------- */
function ohHowHTML() {
  const u = U(); const K = (OH.d && OH.d.k) || OFFICIAL_RANK_K;
  const kRows = K.map((k, i) => `<div class="oh-k"><span>${typeof rankSVG === 'function' ? rankSVG(i, 18) : ''} ${esc(rankName(i))}</span><b class="num">${k} 💎</b></div>`).join('');
  const ex = [['novice', 0, 0], ['mixed', 3, 3], ['strong', 1, 7], ['underdog', 5, 0], ['legends', 7, 7]].map(([k, a, o]) => `<div class="oh-k"><span>${esc(u.ohEx[k])}</span><b class="num">${officialReward(a, o)} 💎</b></div>`).join('');
  const me = typeof myRankObj === 'function' ? myRankObj() : null; const mine = me ? officialReward(rankIdx(me.points, me.games), rankIdx(me.points, me.games)) : 0;
  return `<div class="eyebrow" style="margin-top:14px">${u.ohHowTitle}</div>${listHTML(u.ohHow)}
    ${mine ? `<div class="oh-mine">${tt(u.ohMine, { n: mine })}</div>` : ''}
    <div class="eyebrow" style="margin-top:10px">${u.ohKTitle}</div><div class="oh-kgrid">${kRows}</div>
    <div class="eyebrow" style="margin-top:10px">${u.ohExTitle}</div><div class="oh-kgrid one">${ex}</div>`;
}
function ohRulesHTML() { const u = U(); const lim = ohLim(); return `<div class="eyebrow" style="margin-top:14px">${u.ohRulesTitle}</div>${listHTML(u.ohRules.map(r => tt(r, lim)))}`; }

/* ---------- the officials and their open tables ---------- */
function ohTablesHTML() {
  const u = U(); const list = (OH.d && OH.d.list) || []; const myId = myTgId();
  const open = list.filter(x => x.table && x.tgId !== myId);
  const rows = open.map(x => { const live = x.table.status === 'live'; return `<div class="fr-row oh-row">${friendAvatar(x)}<div class="grow" style="min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.name)} ${ohBadge()}</div><div class="hint" style="margin:0">${tt(u.ohPlayers, { n: x.table.players })} · ${live ? u.ohLive : esc(x.table.code)}</div></div>${live ? '' : `<button class="btn xs primary" data-a="lb-join" data-code="${esc(x.table.code)}">${u.lbSit}</button>`}</div>`; }).join('');
  const all = list.map(x => `<div class="fr-row oh-row" role="button" data-a="fr-open" data-id="${x.tgId}">${friendAvatar(x)}<div class="grow" style="min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${typeof rankIco === 'function' ? rankIco({ points: x.points, games: x.games, hosted: x.hosted, tgId: x.tgId }) : ''}${esc(x.name)} ${ohBadge()}</div><div class="hint" style="margin:0">${tt(u.ohHostStats, { n: x.hosted, m: x.official.games })}${x.city ? ' · ' + esc(x.city) : ''}</div></div>${x.online ? '<span class="fr-on">●</span>' : ''}</div>`).join('');
  return `<div class="eyebrow" style="margin-top:14px">${u.ohTablesTitle}</div>${rows ? `<div class="stack-s">${rows}</div>` : `<p class="hint">${OH.d ? u.ohTablesNone : u.tgTopLoading}</p>`}
    <div class="eyebrow" style="margin-top:14px">${tt(u.ohListTitle, { n: list.length })}</div>${all ? `<div class="stack-s">${all}</div>` : `<p class="hint">${OH.d ? u.ohListNone : u.tgTopLoading}</p>`}`;
}

/* ---------- my way to the status: requirements, the application, the licence ---------- */
function ohFormDefaults() {
  const me = S.meId && typeof profById === 'function' ? profById(S.meId) : null;
  return { name: (S.cloud && S.cloud.user && S.cloud.user.name) || '', city: (me && me.city) || '', exp: '', formats: [], games: [], langs: [L.code], schedule: '', about: '', rules: false };
}
function ohFormHTML() {
  const u = U(); const f = OH.form || (OH.form = ohFormDefaults()); const bad = k => OH.err.includes(k) ? ' oh-bad' : '';
  const chips = (key, opts, labels, multi) => `<div class="filters wrap${bad(key)}">${opts.map(v => { const on = multi ? f[key].includes(v) : f[key] === v; return `<button class="chip ${on ? 'active' : ''}" data-a="${multi ? 'oh-chip' : 'oh-one'}" data-k="${key}" data-v="${v}">${esc(labels[v] || v)}</button>`; }).join('')}</div>`;
  const langNames = Object.fromEntries((typeof LANGS !== 'undefined' ? LANGS : [['ru', 'RU'], ['uk', 'UK'], ['en', 'EN'], ['pl', 'PL'], ['hy', 'HY']]).map(([c, n]) => [c, n]));
  return `<div class="panel oh-form"><div class="eyebrow gold">${u.ohFormTitle}</div>
    <label class="oh-l">${u.ohFName}</label><input class="input${bad('name')}" id="oh-name" data-a="oh-in" data-k="name" value="${esc(f.name)}" maxlength="64" autocomplete="off">
    <label class="oh-l">${u.ohFCity}</label><input class="input" id="oh-city" data-a="oh-in" data-k="city" value="${esc(f.city)}" maxlength="48" autocomplete="off">
    <label class="oh-l">${u.ohFExp}</label>${chips('exp', ['lt1', '1to3', 'gt3'], u.ohExp, false)}
    <label class="oh-l">${u.ohFFormats}</label>${chips('formats', ['online', 'offline'], u.ohFmt, true)}
    <label class="oh-l">${u.ohFGames}</label>${chips('games', ['classic', 'role'], u.ohGames, true)}
    <label class="oh-l">${u.ohFLangs}</label>${chips('langs', ['ru', 'uk', 'en', 'pl', 'hy'], langNames, true)}
    <label class="oh-l">${u.ohFSchedule}</label><input class="input${bad('schedule')}" id="oh-schedule" data-a="oh-in" data-k="schedule" value="${esc(f.schedule)}" maxlength="160" placeholder="${esc(u.ohFSchedulePh)}" autocomplete="off">
    <label class="oh-l">${u.ohFAbout}</label><textarea class="input${bad('about')}" id="oh-about" data-a="oh-in" data-k="about" maxlength="600" rows="4" placeholder="${esc(u.ohFAboutPh)}">${esc(f.about)}</textarea>
    <button class="oh-check${f.rules ? ' on' : ''}${bad('rules')}" data-a="oh-rules"><span class="box">${f.rules ? '✓' : ''}</span><span>${u.ohFRules}</span></button>
    <p class="hint" style="margin:8px 0 0">${u.ohAutoNote}</p>
    ${OH.err.length ? `<p class="hint" style="margin:6px 0 0;color:var(--crimson-2)">${u.ohFormErr}</p>` : ''}
    <div class="btn-row" style="margin-top:10px"><button class="btn ghost" data-a="oh-form-close">${u.ohCancel}</button><button class="btn primary" data-a="oh-send">${u.ohSend}</button></div></div>`;
}
function ohStatusHTML() {
  const u = U(); const me = ohMe(); const lic = ohLic(); if (!me) return '';
  const head = `<div class="eyebrow gold">${u.ohBecome}</div>`; const licLine = `<div class="hint" style="margin:4px 0 0">${tt(u.ohLicLine, { price: ohEm(lic.price), days: lic.days })}</div>`;
  const bal = typeof emBalance === 'function' ? emBalance() : 0; const short = Math.max(0, lic.price - bal);
  const buyBtn = label => short > 0 ? `<button class="btn primary" style="margin-top:10px" data-a="em-topup">${tt(u.ohShort, { n: ohEm(short) })}</button>` : `<button class="btn primary" style="margin-top:10px" data-a="oh-buy">${label}</button>`;
  let body = '';
  if (me.state === 'active') body = `<div style="font-weight:800;margin-top:4px">${ohBadge(true)} ${tt(u.ohStateActive, { date: ohDate(me.until) })}</div><div class="hint" style="margin:4px 0 0">${tt(u.ohMyGames, { n: me.games })}${me.source === 'admin' ? ' · ' + u.ohSourceAdmin : ''}</div>${buyBtn(tt(u.ohRenew, { days: lic.days, price: ohEm(lic.price) }))}<div class="hint" style="margin:6px 0 0">${u.ohTableHost}</div>`;
  else if (me.state === 'approved') body = `<div style="font-weight:700;margin-top:4px">${u.ohStateApproved}</div>${licLine}${buyBtn(tt(u.ohBuy, { price: ohEm(lic.price) }))}`;
  else if (me.state === 'expired') body = `<div style="font-weight:700;margin-top:4px">${tt(u.ohStateExpired, { date: ohDate(me.until) })}</div>${buyBtn(tt(u.ohRenew, { days: lic.days, price: ohEm(lic.price) }))}`;
  else if (me.state === 'revoked') body = `<div style="font-weight:700;margin-top:4px">${u.ohStateRevoked}</div>`;
  else if (me.state === 'pending') body = `<div style="font-weight:700;margin-top:4px">${tt(u.ohStatePending, { date: ohDate(me.app ? me.app.at : Date.now()) })}</div><button class="btn ghost sm" style="margin-top:8px" data-a="oh-withdraw">${u.ohWithdraw}</button>`;
  else {
    const req = me.eligible ? tt(u.ohReqOk, { have: me.hosted }) : tt(u.ohReq, { n: lic.minHosted, have: me.hosted }); const pct = Math.min(100, 100 * me.hosted / (lic.minHosted + 1));
    body = `${me.state === 'rejected' ? `<div style="font-weight:700;margin-top:4px">${tt(u.ohStateRejected, { note: me.app && me.app.note ? ': ' + esc(me.app.note) : '' })}</div>` : ''}<div class="hint" style="margin:6px 0 0">${req}</div>${me.eligible ? '' : `<div class="rk-bar"><i style="width:${pct.toFixed(0)}%"></i></div>`}${licLine}
      ${me.eligible ? (OH.formOpen ? '' : `<button class="btn primary" style="margin-top:10px" data-a="oh-form-open">${u.ohApply}</button>`) : ''}`;
  }
  return `<div class="panel oh-me">${head}${body}</div>${OH.formOpen && me.eligible && ['none', 'rejected'].includes(me.state) ? ohFormHTML() : ''}`;
}

/* ---------- the admin's panel ---------- */
function ohAdminHTML() {
  const u = U(); const a = OH.d && OH.d.admin; if (!a) return ''; const m = OH.adm;
  const fl = (k, v) => (u[k] && u[k][v]) || v;
  const apps = a.apps.map(x => { const f = x.form || {}; return `<div class="panel" style="padding:10px 12px"><div style="font-weight:800">${esc(f.name || x.name)}${x.username ? ` <span class="hint" style="display:inline">@${esc(x.username)}</span>` : ''}</div>
    <div class="hint" style="margin:2px 0 0">${tt(u.ohHostStats, { n: x.hosted, m: 0 }).split(' · ')[0]} · ${esc(f.city || '—')} · ${esc(fl('ohExp', f.exp))}</div>
    <div class="hint" style="margin:2px 0 0">${(f.formats || []).map(v => esc(fl('ohFmt', v))).join(', ')} · ${(f.games || []).map(v => esc(fl('ohGames', v))).join(', ')} · ${(f.langs || []).map(x2 => x2.toUpperCase()).join(', ')}</div>
    <div class="hint" style="margin:2px 0 0">${esc(f.schedule || '')}</div><p class="sk-lore" style="margin:6px 0 0">${esc(f.about || '')}</p>
    <input class="input" style="margin-top:6px" id="oh-note-${x.id}" data-a="oh-in" data-k="note:${x.id}" value="${esc(m.notes[x.id] || '')}" maxlength="200" placeholder="${esc(u.ohNotePh)}">
    <div class="btn-row" style="margin-top:8px"><button class="btn ghost sm" data-a="oh-decide" data-id="${x.id}" data-v="0">${u.ohReject}</button><button class="btn primary sm" data-a="oh-decide" data-id="${x.id}" data-v="1">${u.ohApprove}</button></div></div>`; }).join('');
  const dayChips = (act, cur, list) => `<div class="filters" style="margin-top:6px">${list.map(n => `<button class="chip ${cur === n ? 'active' : ''}" data-a="${act}" data-v="${n}">${n ? tt(u.ohDays, { n }) : u.ohForever}</button>`).join('')}</div>`;
  const st = x => x.official.active ? tt(u.ohStatus.active, { date: ohDate(x.official.until) }) : x.official.status === 'revoked' ? u.ohStatus.revoked : x.official.until ? u.ohStatus.expired : u.ohStatus.approved;
  const all = a.all.map(x => `<div class="fr-row oh-row"><div class="grow" style="min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.name)}${x.username ? ` <span class="hint" style="display:inline">@${esc(x.username)}</span>` : ''}</div><div class="hint" style="margin:0">${st(x)} · ${tt(u.ohMyGames, { n: x.official.games })}</div></div>${x.official.status === 'ok' ? `<button class="btn xs ${OH.ask === 'rv' + x.tgId ? 'primary' : 'ghost'}" data-a="oh-revoke" data-id="${x.tgId}">${OH.ask === 'rv' + x.tgId ? u.ohRevokeSure : u.ohRevoke}</button>` : ''}</div>`).join('');
  const pens = (a.penalties || []).map(x => `<div class="fr-row oh-row"><div class="grow" style="min-width:0"><div style="font-weight:700">${esc(x.name)}${x.username ? ' @' + esc(x.username) : ''}</div><div class="hint" style="margin:0">${tt(u.ohPenLine, { reason: esc(x.reason || ''), em: ohEm(x.emeralds), items: x.items, date: ohDate(x.until) })}</div></div></div>`).join('');
  return `<div class="panel trn-admin"><div class="eyebrow gold">${u.ohAdmin}</div>
    <div class="eyebrow" style="margin-top:10px">${tt(u.ohApps, { n: a.apps.length })}</div>${apps ? `<div class="stack-s">${apps}</div>` : `<p class="hint">${u.ohAppsNone}</p>`}
    <div class="eyebrow" style="margin-top:14px">${u.ohAppoint}</div><input class="input" id="oh-aq" data-a="oh-in" data-k="aq" value="${esc(m.aq)}" placeholder="${esc(u.ohQ)}" autocomplete="off" autocapitalize="off">${dayChips('oh-adays', m.adays, [7, 30, 90, 365])}
    <button class="btn primary sm" style="margin-top:8px" data-a="oh-appoint">${u.ohAppointBtn}</button>
    <div class="eyebrow" style="margin-top:14px">${tt(u.ohAll, { n: a.all.length })}</div>${all ? `<div class="stack-s">${all}</div>` : `<p class="hint">${u.ohListNone}</p>`}
    <div class="eyebrow" style="margin-top:14px;color:var(--crimson-2)">${u.ohPunish}</div><input class="input" id="oh-pq" data-a="oh-in" data-k="pq" value="${esc(m.pq)}" placeholder="${esc(u.ohQ)}" autocomplete="off" autocapitalize="off">
    <input class="input" style="margin-top:6px" id="oh-preason" data-a="oh-in" data-k="preason" value="${esc(m.preason)}" maxlength="200" placeholder="${esc(u.ohReason)}" autocomplete="off">${dayChips('oh-pdays', m.pdays, [30, 90, 365, 0])}
    <div class="btn-row" style="margin-top:8px"><button class="btn ghost sm" data-a="oh-unban">${u.ohUnban}</button><button class="btn sm ${OH.ask === 'punish' ? 'primary' : ''}" style="${OH.ask === 'punish' ? 'background:var(--crimson-2);color:#fff' : 'color:var(--crimson-2)'}" data-a="oh-punish">${OH.ask === 'punish' ? u.ohPunishSure : u.ohPunishBtn}</button></div>
    ${pens ? `<div class="eyebrow" style="margin-top:14px">${u.ohPenalties}</div><div class="stack-s">${pens}</div>` : ''}</div>`;
}
function officialScreen() {
  const u = U();
  const hero = `<div class="panel oh-hero"><div class="oh-big">${ohBadge(true)} ${esc(u.ohMenuD.split('—').pop().trim())}</div><p class="hint" style="margin:6px 0 0">${u.ohWhat}</p></div>`;
  if (!ohIn()) return `${topbar(u.ohTitle, u.ohSub)}<div class="stack">${hero}<p class="hint">${u.ohNeedTg}</p>${ohHowHTML()}${ohRulesHTML()}</div>`;
  ohFetch();
  return `${topbar(u.ohTitle, u.ohSub)}<div class="stack">${hero}${ohStatusHTML()}${ohTablesHTML()}${ohHowHTML()}${ohRulesHTML()}${S.cloud && S.cloud.admin ? ohAdminHTML() : ''}</div>`;
}

/* ---------- the mark and the reward elsewhere: the home menu, the round table, the results, the player's statistics ---------- */
(function () {
  const origHome = homeScreen;
  homeScreen = function () {
    const html = origHome.apply(this, arguments); const u = U(); const me = S.cloud && S.cloud.official;
    const sub = me && me.state === 'active' ? tt(u.ohMenuMe, { date: ohDate(me.until) }) : u.ohMenuD;
    const item = `<button class="menu-item" data-a="go" data-to="official"><div class="ico" style="color:#8ff0b6">✔</div><div><div class="t">${u.ohMenu}</div><div class="d">${sub}</div></div><span class="chev">${I.chev}</span></button>`;
    const k = html.indexOf('<button class="menu-item" data-a="go" data-to="mini">'); return k < 0 ? html : html.slice(0, k) + item + html.slice(k);
  };
  const origStart = applyStartParam;
  applyStartParam = function (sp) { if (sp === 'official') { S.screen = 'official'; return; } return origStart.apply(this, arguments); };
  if (typeof cloudSync === 'function') {
    const origSync = cloudSync;
    cloudSync = async function () { await origSync.apply(this, arguments); const d = CLOUD.me; if (d && d.ok && d.official) { S.cloud = S.cloud || {}; S.cloud.official = d.official; } };
  }
  /* the round table: the host's ✔ and what this game brings me */
  if (typeof tableScreen === 'function') {
    const origTable = tableScreen;
    tableScreen = function () {
      let html = origTable.apply(this, arguments); const d = TB.data; if (!d || !d.official || !d.official.on) return html; const u = U();
      html = html.replace(/<div class="rt-host">/g, `<div class="rt-host">${ohBadge()} `);
      const pub = d.pub || {}; const myId = myTgId(); const lim = d.official.limits || OFFICIAL_LIMITS; let panel = '';
      if (pub.phase === 'end') { const mine = (pub.roles || []).find(r => r.tgId === myId); if (mine && mine.em) panel = `<div class="panel oh-got">${tt(u.ohGot, { n: mine.em })}</div>`; }
      else if (d.isHost) panel = `<div class="panel oh-table"><b>${u.ohTableOn}</b><div class="hint" style="margin:2px 0 0">${u.ohTableHost}</div></div>`;
      else if (d.official.est) panel = `<div class="panel oh-table"><b>${u.ohTableOn}</b><div style="font-weight:800;margin-top:2px">${d.official.left > 0 ? tt(u.ohTableEst, { n: d.official.est }) : u.ohTableNoLeft}</div><div class="hint" style="margin:2px 0 0">${tt(u.ohTableAvg, { r: esc(rankName(Math.round(d.official.avg || 0))) })}${d.official.left > 0 ? ' · ' + tt(u.ohTableLeft, { n: d.official.left, max: lim.dayGames }) : ''}</div></div>`;
      if (!panel) return html; const k = html.indexOf('<div class="stack">'); return k < 0 ? html : html.slice(0, k + 19) + panel + html.slice(k + 19);
    };
  }
  /* the host's results: who got how many emeralds (or why none) */
  if (typeof endScreen === 'function') {
    const origEnd = endScreen;
    endScreen = function () {
      const html = origEnd.apply(this, arguments); const g = S.game; const o = g && g.cloudOfficial; if (!o || !o.official) return html; const u = U(); const lim = ohLim();
      const ids = Object.keys(o.rewards || {}); const seatOf = id => { const p = g.players.find(x => String(typeof playerTg === 'function' ? playerTg(g, x) : '') === String(id)); return p ? `№${p.seat} ${esc(p.name)}` : '…'; };
      const body = ids.length ? `<div class="stack-s" style="margin-top:6px">${ids.map(id => `<div class="row"><div class="grow">${seatOf(id)}</div><b class="num" style="color:#8ff0b6">+${o.rewards[id]} 💎</b></div>`).join('')}${(o.capped || []).map(id => `<div class="row"><div class="grow">${seatOf(id)}</div><span class="hint" style="margin:0">${u.ohCapped}</span></div>`).join('')}</div><div class="hint" style="margin:6px 0 0">${tt(u.ohEndTotal, { n: o.total || 0 })}</div>`
        : `<div class="hint" style="margin:4px 0 0">${tt(u.ohEndNone, { why: tt((u.ohWhy || {})[o.reason] || o.reason || '', lim) })}</div>`;
      const panel = `<div class="panel oh-got"><div class="eyebrow gold">${u.ohEndTitle}</div>${body}</div>`;
      const i = html.indexOf('<div class="panel"><div class="eyebrow gold">'); return i < 0 ? html + panel : html.slice(0, i) + panel + html.slice(i);
    };
  }
  /* the player's statistics: the official host's mark */
  if (typeof cloudStatsHTML === 'function') {
    const origStats = cloudStatsHTML;
    cloudStatsHTML = function (d) { const html = origStats.apply(this, arguments); return d && d.official ? `<div class="panel oh-prof">${ohBadge(true)} <b>${U().ohProfileBadge}</b></div>` + html : html; };
  }
})();
/* the form's text fields: kept as typed, no redraw (the keyboard stays) */
function ohInput(el) {
  const k = el.dataset.k || ''; const v = String(el.value || '');
  if (k.startsWith('note:')) OH.adm.notes[k.slice(5)] = v;
  else if (['aq', 'pq', 'preason'].includes(k)) OH.adm[k] = v;
  else { OH.form = OH.form || ohFormDefaults(); if (['name', 'city', 'schedule', 'about'].includes(k)) OH.form[k] = v; }
}
try { document.addEventListener('input', e => { const el = e.target && e.target.closest ? e.target.closest('[data-a="oh-in"]') : null; if (el) ohInput(el); }); } catch (e) {}
const ohAsk = (key, fn) => { if (OH.ask !== key) { OH.ask = key; render(); setTimeout(() => { if (OH.ask === key) { OH.ask = ''; render(); } }, 4000); return; } OH.ask = ''; fn(); };
async function ohAdmin(body, okMsg) {
  const u = U(); const d = await api('/api/official/admin', body);
  if (d && d.ok) { if (OH.d && d.admin) OH.d.admin = d.admin; OH.at = 0; ohFetch(true); toast(okMsg || u.ohDone); tgHaptic('success'); render(); return d; }
  toast(d && d.error === 'not_found' ? u.ohNotFound : u.ohErr); return null;
}
Object.assign(ACT, {
  'oh-form-open'() { OH.formOpen = true; OH.err = []; OH.form = OH.form || ohFormDefaults(); render(); },
  'oh-form-close'() { OH.formOpen = false; OH.err = []; render(); },
  'oh-chip'(el) { const f = OH.form = OH.form || ohFormDefaults(); const k = el.dataset.k, v = el.dataset.v; if (!Array.isArray(f[k])) return; f[k] = f[k].includes(v) ? f[k].filter(x => x !== v) : f[k].concat(v); OH.err = OH.err.filter(x => x !== k); render(); },
  'oh-one'(el) { const f = OH.form = OH.form || ohFormDefaults(); f[el.dataset.k] = el.dataset.v; OH.err = OH.err.filter(x => x !== el.dataset.k); render(); },
  'oh-rules'() { const f = OH.form = OH.form || ohFormDefaults(); f.rules = !f.rules; OH.err = OH.err.filter(x => x !== 'rules'); render(); },
  async 'oh-send'() {
    const u = U(); const d = await api('/api/official/apply', { form: OH.form || ohFormDefaults() });
    if (d && d.ok) { OH.formOpen = false; OH.err = []; if (OH.d) OH.d.me = d.me; if (S.cloud) S.cloud.official = d.me; toast(u.ohSent); tgHaptic('success'); render(); return; }
    if (d && d.error === 'bad_form') { OH.err = d.fields || []; toast(u.ohFormErr); render(); return; }
    if (d && d.error === 'few_games') { toast(tt(u.ohFew, { n: ohLic().minHosted })); return; }
    if (d && d.me && OH.d) { OH.d.me = d.me; OH.formOpen = false; render(); return; }
    toast(u.ohErr);
  },
  async 'oh-withdraw'() { const d = await api('/api/official/apply', { withdraw: true }); if (d && d.ok) { if (OH.d) OH.d.me = d.me; if (S.cloud) S.cloud.official = d.me; render(); } else toast(U().ohErr); },
  async 'oh-buy'() {
    const u = U(); const d = await api('/api/official/license', {});
    if (d && d.ok) { if (OH.d) OH.d.me = d.me; if (S.cloud) S.cloud.official = d.me; if (S.em && d.balance != null) S.em.balance = d.balance; toast(tt(u.ohBought, { date: ohDate(d.until) })); tgHaptic('success'); save(); render(); return; }
    if (d && d.error === 'not_enough') { if (S.em && d.balance != null) S.em.balance = d.balance; render(); toast(tt(u.ohShort, { n: ohEm(d.short || 0) })); return; }
    toast(u.ohErr);
  },
  async 'oh-decide'(el) { const id = el.dataset.id; await ohAdmin({ action: el.dataset.v === '1' ? 'approve' : 'reject', id: Number(id), note: OH.adm.notes[id] || '' }); },
  'oh-adays'(el) { OH.adm.adays = Number(el.dataset.v) || 30; render(); },
  'oh-pdays'(el) { OH.adm.pdays = Number(el.dataset.v) || 0; render(); },
  async 'oh-appoint'() { const q = OH.adm.aq.trim(); if (!q) return; if (await ohAdmin({ action: 'appoint', q, days: OH.adm.adays })) { OH.adm.aq = ''; render(); } },
  'oh-revoke'(el) { const id = el.dataset.id; ohAsk('rv' + id, () => ohAdmin({ action: 'revoke', tgId: Number(id) })); },
  'oh-punish'() { const q = OH.adm.pq.trim(), reason = OH.adm.preason.trim(); if (!q || !reason) { toast(U().ohFormErr); return; } ohAsk('punish', async () => { if (await ohAdmin({ action: 'punish', q, reason, days: OH.adm.pdays })) { OH.adm.pq = ''; OH.adm.preason = ''; render(); } }); },
  async 'oh-unban'() { const q = OH.adm.pq.trim(); if (!q) return; await ohAdmin({ action: 'unban', q }); }
});
