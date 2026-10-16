/* ============================================================
   v63 EMERALDS 💎 and the WEEKLY TOURNAMENT
   Emeralds — the in-game currency: won at the weekly tournament, bought for Telegram Stars in the shop's «Emeralds» tab,
   spent on Epic card skins (7 500). The balance lives on the account (/api/me → S.em); packs and the prize arithmetic are the same
   here and on the server (backend/src/emeralds.js; backend/test/run.js compares them).
   The tournament: registration from Monday 12:00, games on Saturday and Sunday, the admin seats the rounds, the bot messages the
   table / seat / host, prizes on Monday 00:00 (backend/src/tournament.js). Texts — src/02z-i18n-emeralds.js.
   ============================================================ */
/* packs:begin — the same list and arithmetic as PACKS / prizeTable in backend/src/emeralds.js */
const EM_PACKS = [
  { id: 'em_s', usd: 0.99, stars: 50, emeralds: 150 },
  { id: 'em_m', usd: 1.99, stars: 100, emeralds: 320 },
  { id: 'em_l', usd: 4.99, stars: 250, emeralds: 850 },
  { id: 'em_xl', usd: 9.99, stars: 500, emeralds: 1800 },
  { id: 'em_2xl', usd: 19.99, stars: 1000, emeralds: 3700 },
  { id: 'em_3xl', usd: 39.99, stars: 2000, emeralds: 7500 },
  { id: 'em_4xl', usd: 59.99, stars: 3000, emeralds: 11600 },
  { id: 'em_5xl', usd: 99.99, stars: 5000, emeralds: 20000 }
];
const firstBonusPct = usd => (usd <= 4.99 ? 100 : usd <= 40 ? 40 : 20);
const EM_EPIC = 7500;
const EM_MYTHIC = 50000; // v69: a Mythic skin, every copy numbered
const PRIZE_FUND = 10000;
function prizeTable(n, fund) {
  n = Math.max(0, Math.floor(Number(n) || 0)); fund = Math.max(0, Math.floor(Number(fund) || 0));
  const floors = []; for (let i = 0; i < Math.min(n, 15); i++) floors.push(i < 3 ? 2000 : i < 10 ? 500 : 100);
  if (!floors.length) return [];
  const base = floors.reduce((a, b) => a + b, 0);
  if (fund <= base) { const out = floors.map(f => Math.floor(fund * f / base / 10) * 10); out[0] += fund - out.reduce((a, b) => a + b, 0); return out; }
  const extra = fund - base; const share = [0.5, 0.3, 0.2].slice(0, Math.min(3, n)); const sum = share.reduce((a, b) => a + b, 0);
  const out = floors.slice(); let given = 0;
  share.forEach((s, i) => { const v = Math.floor(extra * s / sum / 10) * 10; out[i] += v; given += v; });
  out[0] += extra - given;
  return out;
}
/* packs:end */
const EM_PACK = Object.fromEntries(EM_PACKS.map(p => [p.id, p]));
S.em = S.em && typeof S.em === 'object' ? S.em : { balance: 0, bought: [], epic: EM_EPIC, mythic: EM_MYTHIC };
const EMR = { ledger: null, at: 0, busy: false };
const TRN = { d: null, at: 0, busy: false, form: null, closeAsk: 0 };
const fmtEm = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const emUsd = usd => usd.toFixed(2).replace('.', L.code === 'en' ? '.' : ',');
const emBalance = () => (S.em && Number(S.em.balance)) || 0;
const emEpic = () => (S.em && Number(S.em.epic)) || EM_EPIC;
const emMythic = () => (S.em && Number(S.em.mythic)) || EM_MYTHIC;
const emSkinPrice = s => (s && s.rarity === 'mythic' ? emMythic() : emEpic());
const trnFund = () => (S.cloud && S.cloud.trn && Number(S.cloud.trn.fund)) || PRIZE_FUND;
const emDate = ms => { try { return new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'long' }); } catch (e) { return ''; } };
const emDay = d => { try { return new Date(Date.UTC(d.y, d.m - 1, d.d)).toLocaleDateString(locale(), { day: 'numeric', month: 'long', timeZone: 'UTC' }); } catch (e) { return `${d.d}.${d.m}`; } };
const emInTg = () => typeof TG !== 'undefined' && !!TG.app && !!apiBase();

/* ---------- the shop: «Cards & scenarios | Emeralds» ---------- */
function emPackCardHTML(p) {
  const u = U(); const first = !(S.em.bought || []).includes(p.id); const pct = firstBonusPct(p.usd); const bonus = first ? Math.round(p.emeralds * pct / 100) : 0;
  return `<div class="em-pack ${first ? 'first' : ''}" data-id="${p.id}">
    ${first ? `<span class="em-badge">${tt(u.emFirst, { pct })}</span>` : ''}
    <div class="em-gem">💎</div>
    <div class="em-n num">${fmtEm(p.emeralds)}</div>
    ${bonus ? `<div class="em-bonus">+ ${fmtEm(bonus)} = <b>${fmtEm(p.emeralds + bonus)}</b></div>` : '<div class="em-bonus muted">&nbsp;</div>'}
    <button class="btn primary sm" data-a="em-buy" data-id="${p.id}">${u.emBuy} · ${tt(u.emPrice, { usd: emUsd(p.usd), stars: p.stars })}</button>
  </div>`;
}
function emLedgerHTML() {
  const u = U(); const list = EMR.ledger || [];
  if (!list.length) return '';
  const kind = k => (u.emKind || {})[k] || k;
  return `<div class="eyebrow" style="margin-top:14px">${u.emLedger}</div><div class="stack-s">${list.map(x => `<div class="fr-row"><div class="grow" style="min-width:0"><div style="font-weight:700">${esc(kind(x.kind))}${x.kind === 'pack' || x.kind === 'bonus' ? '' : x.kind === 'skin' && typeof SKIN !== 'undefined' && SKIN[x.ref] ? ' · ' + esc(SKIN[x.ref].name) : ''}</div><div class="hint" style="margin:0">${emDate(x.at)}</div></div><b class="num" style="color:${x.delta < 0 ? 'var(--crimson-2)' : '#7fe0a0'}">${x.delta > 0 ? '+' : ''}${fmtEm(x.delta)}</b></div>`).join('')}</div>`;
}
function emeraldsTabHTML() {
  const u = U();
  const bal = `<div class="em-balance"><div class="em-big">💎 <b class="num">${fmtEm(emBalance())}</b></div><div class="hint" style="margin:0">${u.emBalance}</div></div>`;
  const what = `<div class="btn-row" style="margin-top:12px"><button class="btn sm" data-a="skins-open">${u.skSegSkins}</button><button class="btn sm" data-a="go" data-to="tournament">🏆 ${u.trnTitle}</button></div>`;
  const tg = emInTg() ? '' : `<p class="hint">${u.emTgOnly}</p>`;
  return `<div class="panel em-top">${bal}${what}</div>${tg}
    <h2 style="margin-top:14px">${u.emPacks}</h2><p class="hint" style="margin:0 0 8px">${u.emFirstHint}</p>
    <div class="em-grid">${EM_PACKS.map(emPackCardHTML).join('')}</div>${emBalance() || (EMR.ledger || []).length ? emLedgerHTML() : `<p class="hint" style="margin-top:12px">${u.emEmpty}</p>`}`;
}
function emLedgerLoad() {
  if (!emInTg() || EMR.busy || (EMR.at && Date.now() - EMR.at < 30000)) return;
  EMR.busy = true; api('/api/emeralds', {}).then(d => { EMR.busy = false; EMR.at = Date.now(); if (d && d.ok) { EMR.ledger = d.ledger || []; S.em = { balance: d.balance || 0, bought: d.bought || [], epic: d.epic || EM_EPIC, mythic: d.mythic || EM_MYTHIC }; if (S.screen === 'shop' && S.ui.shopTab === 'emeralds') render(); } }).catch(() => { EMR.busy = false; });
}
(function () {
  const orig = shopScreen;
  shopScreen = function () {
    const u = U(); const tab = S.ui.shopTab === 'emeralds' ? 'emeralds' : 'cards';
    const seg = `<div class="segment">${[['cards', u.shopSegCards], ['emeralds', u.shopSegEm]].map(([id, l]) => `<button class="${tab === id ? 'active' : ''}" data-a="shop-tab" data-v="${id}">${l}</button>`).join('')}</div>`;
    if (tab === 'emeralds') { emLedgerLoad(); return `${topbar(u.emTitle, u.shopSegEm)}<div class="stack">${seg}${emeraldsTabHTML()}</div>`; }
    const html = orig(); const k = html.indexOf('<div class="stack">'); return k < 0 ? html : html.slice(0, k + 19) + seg + html.slice(k + 19);
  };
  /* a pack of emeralds goes through the same Stars invoice as the cards (08-telegram.js → tgBuy) */
  if (typeof tgBuy === 'function') {
    const origBuy = tgBuy;
    tgBuy = function (kind, id, onDone) {
      if (kind !== 'emeralds') return origBuy.apply(this, arguments);
      const tg = TG.app; if (!tg || !tg.openInvoice || !apiBase()) return false; const u = U(); const p = EM_PACK[id]; if (!p) return false;
      api('/api/invoice', { kind: 'emeralds', id, title: `${fmtEm(p.emeralds)} 💎 Mafia Pro`, description: u.emTitle + ' · Mafia Pro' }).then(d => {
        if (d.ok && d.link) { tg.openInvoice(d.link, status => { if (status === 'paid') { toast(tt(u.emGot, { n: fmtEm(d.emeralds + (d.bonus || 0)) })); tgHaptic('success'); EMR.at = 0; setTimeout(() => { cloudSync(); emLedgerLoad(); }, 1500); } else if (status === 'failed') toast(u.tgPayFail); }); return; }
        toast(d.error === 'network' || d.error === 'no_api' ? u.tgOffline : u.tgNA);
      });
      return true;
    };
  }
  /* the account: the balance and the tournament brief come with /api/me */
  const origSync = cloudSync;
  cloudSync = async function () {
    await origSync.apply(this, arguments);
    const d = CLOUD.me; if (!d || !d.ok) return;
    if (d.emeralds && typeof d.emeralds === 'object') S.em = { balance: Number(d.emeralds.balance) || 0, bought: Array.isArray(d.emeralds.bought) ? d.emeralds.bought.slice() : [], epic: Number(d.emeralds.epic) || EM_EPIC, mythic: Number(d.emeralds.mythic) || EM_MYTHIC };
    if (d.skins && typeof d.skins === 'object') S.skins.borrowed = Number(d.skins.borrowed) || 0;
    S.cloud = S.cloud || {}; S.cloud.trn = d.tournament || null;
    save(); render();
  };
})();

/* ---------- the skin sheet: the price, «Buy for 7 500», the weekend's free skins ---------- */
function emSkinForSale(s) { return !!(s && (s.rarity === 'epic' || s.rarity === 'mythic') && !s.season); }
/* v69: a numbered skin — «Copy № 000004 · 3 sold» / «You will get № 000004» */
function emSerialLine(s) {
  if (!s || !s.numbered) return ''; const u = U(); const sold = Number((S.skins.sold || {})[s.id]) || 0; const mine = mySerial(s.id);
  return mine != null ? tt(u.myCopyMine, { n: fmtSerial(mine), sold: fmtEm(sold) }) : tt(u.myCopyNext, { n: fmtSerial(sold + 1), sold: fmtEm(sold) });
}
(function () {
  if (typeof skinHowText === 'function') {
    const origHow = skinHowText;
    skinHowText = function (s) {
      if (!emSkinForSale(s)) return origHow.apply(this, arguments);
      const u = U(); const st = skinStatus(s);
      if (s.rarity === 'mythic') return st.own ? emSerialLine(s) : tt(u.myHow, { n: fmtEm(emMythic()) }) + ' ' + emSerialLine(s);
      if (st.own) return S.skins.borrowed && !(S.cloud && S.cloud.admin) ? tt(u.emBorrowed, { date: emDate(S.skins.borrowed) }) : '';
      return tt(u.emSkinHow, { n: fmtEm(emEpic()) });
    };
  }
  if (typeof skinSheetHTML === 'function') {
    const origSheet = skinSheetHTML;
    skinSheetHTML = function (id) {
      const html = origSheet.apply(this, arguments); const s = SKIN[id]; if (!s || !emSkinForSale(s)) return html;
      const u = U(); const st = skinStatus(s); if (st.own) return html;
      const price = emSkinPrice(s); const short = price - emBalance();
      const btn = short > 0 ? `<button class="btn primary" data-a="em-topup">${tt(u.emSkinShort, { n: fmtEm(short) })}</button>` : `<button class="btn primary" data-a="em-skin-buy" data-id="${s.id}">${tt(u.emSkinBuy, { n: fmtEm(price) })}</button>`;
      const block = `<div class="em-price"><span class="em-tag">💎 ${fmtEm(price)}</span><span class="hint" style="margin:0">${u.emBalance}: <b class="num">${fmtEm(emBalance())}</b> 💎</span></div><div class="btn-row" style="margin-top:10px">${emInTg() ? btn : s.rarity === 'mythic' ? `<button class="btn primary" data-a="em-topup">${tt(u.emSkinBuy, { n: fmtEm(price) })}</button>` : `<button class="btn primary" data-a="buy-confirm" data-kind="emeralds" data-id="em_3xl">${tt(u.emSkinBuy, { n: fmtEm(price) })}</button>`}</div>`;
      const k = html.lastIndexOf('</div>'); return k < 0 ? html + block : html.slice(0, k) + block + html.slice(k);
    };
  }
})();

/* ---------- the tournament screen ---------- */
function trnScenName(s) {
  const u = U(); s = String(s || '');
  if (s === 'classic') return typeof CLASSIC !== 'undefined' ? CLASSIC.name : 'Classic';
  if (s === 'preset') return u.trnScenPreset;
  if (s.startsWith('intro:') && typeof introText === 'function') { try { const x = introText(s.slice(6)); if (x && x.name) return x.name; } catch (e) {} }
  return s;
}
function trnFetch(force) {
  if (!emInTg() || TRN.busy) return; if (!force && TRN.at && Date.now() - TRN.at < 15000) return;
  TRN.busy = true; api('/api/tournament', {}).then(d => { TRN.busy = false; TRN.at = Date.now(); if (d && d.ok) { TRN.d = d; if (TRN.form == null && d.t) TRN.form = { mode: d.t.mode, scenario: d.t.scenario, n: d.t.n, fund: d.t.fund }; if (S.screen === 'tournament') render(); } }).catch(() => { TRN.busy = false; });
}
try { setInterval(() => { try { if (S.screen === 'tournament') trnFetch(); } catch (e) {} }, 15000); } catch (e) {}
function trnPhaseText(t) {
  const u = U(); if (t.status === 'done') return u.trnPhaseDone; if (t.status === 'cancelled') return u.trnPhaseCancelled;
  return t.phase === 'games' || t.round ? u.trnPhaseGames : u.trnPhaseReg;
}
function trnPrizesHTML(d) {
  const u = U(); const t = d.t; const n = Math.max(t.played || 0, t.players || 0, 1); const list = prizeTable(n, t.fund);
  return `<div class="eyebrow" style="margin-top:14px">${u.trnPrizes} · ${tt(u.trnPrizeFor, { n })}</div><div class="trn-prizes">${list.map((p, i) => `<div class="trn-prize ${i < 3 ? 'top' : ''}"><span>${i < 3 ? ['🥇', '🥈', '🥉'][i] : '№' + (i + 1)}</span><b class="num">💎 ${fmtEm(p)}</b></div>`).join('')}</div><p class="hint" style="margin:6px 0 0">${u.trnPrizeNote}</p>`;
}
function trnStandingsHTML(d) {
  const u = U(); const me = myTgId() || 0; const list = d.standings || [];
  if (!list.length) return `<div class="eyebrow" style="margin-top:14px">${u.trnStandings}</div><p class="hint">${u.trnEmpty}</p>`;
  return `<div class="eyebrow" style="margin-top:14px">${u.trnStandings} · ${list.length}</div><div class="stack-s">${list.map(p => `<div class="fr-row ${p.tgId === me ? 'me' : ''}" role="button" data-a="fr-open" data-id="${p.tgId}"><span class="pos" style="width:26px;color:var(--gold-2);font-weight:800">${p.place || '—'}</span><div class="grow" style="min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}${p.tgId === me ? ` <span class="hint" style="display:inline">(${u.trnYou})</span>` : ''}</div><div class="hint" style="margin:0">${p.games ? tt(u.trnGW, { g: p.games, w: p.wins }) : u.trnNoGames}${p.prize ? ` · 💎 ${fmtEm(p.prize)}` : ''}</div></div><b class="num" style="color:var(--gold-2)">${p.points}</b></div>`).join('')}</div>`;
}
function trnMeHTML(d) {
  const u = U(); const t = d.t; const me = d.me; const live = t.status === 'reg' || t.status === 'live';
  if (!live) return '';
  if (!me || !me.in) return `<div class="panel"><div class="btn-row"><button class="btn primary grow" data-a="trn-join" data-host="0">🎲 ${u.trnJoin}</button><button class="btn grow" data-a="trn-join" data-host="1">🎩 ${u.trnJoinHost}</button></div><p class="hint" style="margin:8px 0 0">${u.trnHostHint}</p></div>`;
  let body = `<div class="row"><div class="grow" style="font-weight:700">${me.role === 'host' ? '🎩 ' + u.trnYouHost : '🎲 ' + u.trnYouPlayer}</div><button class="btn xs ghost" data-a="trn-join" data-in="0">${u.trnLeave}</button></div>`;
  if (me.role === 'player') {
    if (d.myTable) {
      const mt = d.myTable;
      body += `<div class="trn-table"><div class="eyebrow gold">${u.trnMyTable}</div><div style="font-weight:800;font-size:17px;margin-top:4px">${tt(u.trnSeatLine, { r: mt.round, t: mt.idx, s: mt.seat })}</div><div class="hint" style="margin:4px 0 0">${tt(u.trnHostLine, { name: esc(mt.host || u.trnHostNo) })}${mt.code ? ' · ' + tt(u.trnCode, { code: mt.code }) : ''}</div>
        ${mt.status === 'played' ? `<p class="hint" style="margin:6px 0 0">${u.trnPlayed}</p>` : t.mode === 'online' ? (mt.code ? `<button class="btn primary" style="margin-top:10px" data-a="trn-sit" data-code="${mt.code}">${u.trnSit}</button>` : `<p class="hint" style="margin:6px 0 0">${u.trnHostNo}</p>`) : `<p class="hint" style="margin:6px 0 0">${u.trnOffline}</p>`}
        <div class="trn-seats">${mt.seats.map(s => `<span class="chip ${s.tgId === myTgId() ? 'active' : ''}">${s.seat} · ${esc(s.name)}</span>`).join('')}</div></div>`;
    } else if (d.bench) body += `<p class="hint" style="margin:8px 0 0">${u.trnBench}</p>`;
    else if (t.round) body += `<p class="hint" style="margin:8px 0 0">${u.trnWaitDraw}</p>`;
  } else if (d.hosting) {
    const h = d.hosting;
    body += `<div class="trn-table"><div class="eyebrow gold">${tt(u.trnHosting, { t: h.idx })}</div><div class="hint" style="margin:4px 0 0">${tt(u.trnHostSeats, { n: h.size })} · ${tt(u.trnCode, { code: h.code || '—' })}</div>
      ${h.status === 'played' ? `<p class="hint" style="margin:6px 0 0">${u.trnPlayed}</p>` : `<button class="btn primary" style="margin-top:10px" data-a="trn-host-open">${u.trnHostOpen}</button>`}
      <div class="trn-seats">${h.seats.map(s => `<span class="chip">${s.seat} · ${esc(s.name)}</span>`).join('')}</div></div>`;
  }
  return `<div class="panel">${body}</div>`;
}
function trnAdminHTML(d) {
  const u = U(); const t = d.t; const f = TRN.form || (t ? { mode: t.mode, scenario: t.scenario, n: t.n, fund: t.fund } : { mode: 'online', scenario: 'classic', n: 10, fund: PRIZE_FUND });
  const live = t && (t.status === 'reg' || t.status === 'live');
  const chip = (a, v, cur, label) => `<button class="chip ${String(cur) === String(v) ? 'active' : ''}" data-a="${a}" data-v="${v}">${label}</button>`;
  const scens = (d.admin && d.admin.scenarios) || ['classic', 'preset', 'intro:first', 'intro:detective', 'intro:guard', 'intro:trumps', 'intro:third'];
  const ns = []; for (let k = 7; k <= 16; k++) ns.push(k);
  const settings = live ? `<div class="eyebrow" style="margin-top:10px">${u.trnSettings}</div>${t.round ? `<p class="hint" style="margin:4px 0">${u.trnFixed}</p>` : ''}
    <div class="segment n2" style="margin-top:6px"><button class="${f.mode === 'online' ? 'active' : ''}" data-a="trn-f" data-k="mode" data-v="online" ${t.round ? 'disabled' : ''}>${u.trnModeOnline}</button><button class="${f.mode === 'offline' ? 'active' : ''}" data-a="trn-f" data-k="mode" data-v="offline" ${t.round ? 'disabled' : ''}>${u.trnModeOffline}</button></div>
    <div class="filters wrap" style="margin-top:8px">${scens.map(s => `<button class="chip ${f.scenario === s ? 'active' : ''}" data-a="trn-f" data-k="scenario" data-v="${s}" ${t.round ? 'disabled' : ''}>${esc(trnScenName(s))}</button>`).join('')}</div>
    ${f.scenario === 'classic' ? `<p class="hint" style="margin:6px 0 0">${tt(u.trnTableN, { n: 10 })}</p>` : `<div class="filters" style="margin-top:8px">${ns.map(k => chip('trn-fn', k, f.n, String(k))).join('')}</div>`}
    <div class="filters" style="margin-top:8px">${[5000, 10000, 15000, 20000, 30000].map(v => chip('trn-ff', v, f.fund, '💎 ' + fmtEm(v))).join('')}</div>
    <div class="btn-row" style="margin-top:10px"><button class="btn primary sm" data-a="trn-save">${u.trnSave}</button></div>` : '';
  const draw = live ? `<div class="btn-row" style="margin-top:12px"><button class="btn primary grow" data-a="trn-draw" data-final="0">${tt(u.trnDraw, { n: (t.round || 0) + 1 })}</button>${t.round ? `<button class="btn grow" data-a="trn-draw" data-final="1">${u.trnDrawFinal}</button>` : ''}</div>
    <div class="hint" style="margin:8px 0 0">${tt(u.trnPlayers, { n: t.players })} · ${tt(u.trnHosts, { n: t.hosts })}${d.admin ? ` · ${tt(u.trnByes, { n: d.admin.byes })} · ${tt(u.trnOut, { n: d.admin.out })}` : ''}</div>
    <button class="btn ${TRN.closeAsk ? 'primary' : 'ghost'} sm" style="margin-top:10px;color:${TRN.closeAsk ? '#1a1206' : 'var(--crimson-2)'}" data-a="trn-close">${TRN.closeAsk ? u.trnCloseSure : u.trnClose}</button>` : `<button class="btn primary" style="margin-top:10px" data-a="trn-open">${u.trnOpenNow}</button>`;
  const vols = d.admin && d.admin.hosts ? d.admin.hosts : [];
  const tables = live && t.round ? `<div class="eyebrow" style="margin-top:14px">${tt(u.trnTables, { n: t.round })}</div><div class="stack-s">${(d.tables || []).map(tb => `<div class="panel" style="padding:10px 12px"><div class="row"><div class="grow" style="font-weight:700">№${tb.idx} · ${tb.size} · ${tb.status}</div><div class="hint" style="margin:0">${tb.code ? tt(u.trnCode, { code: tb.code }) : ''}</div></div>
      <div class="hint" style="margin:4px 0 0">${tb.host ? tt(u.trnHostLine, { name: esc(tb.host) }) : u.trnHostNo}</div>
      ${tb.status === 'open' ? `<div class="filters wrap" style="margin-top:6px"><span class="hint" style="margin:0 6px 0 0">${u.trnSetHost}</span>${[{ tgId: myTgId(), name: u.trnMeHost }].concat(vols).map(h => `<button class="chip ${tb.hostId === h.tgId ? 'active' : ''}" data-a="trn-host" data-round="${tb.round}" data-idx="${tb.idx}" data-id="${h.tgId}">${esc(h.name)}</button>`).join('')}</div>` : ''}
      <div class="trn-seats">${tb.seats.map(s => `<span class="chip">${s.seat} · ${esc(s.name)}</span>`).join('')}</div></div>`).join('')}</div>` : '';
  const hosts = vols.length ? `<div class="eyebrow" style="margin-top:14px">${tt(u.trnVols, { n: vols.length })}</div><div class="filters wrap">${vols.map(h => `<span class="chip">🎩 ${esc(h.name)}</span>`).join('')}</div>` : '';
  return `<div class="panel trn-admin"><div class="eyebrow gold">${u.trnAdmin}</div>${settings}${draw}${tables}${hosts}</div>`;
}
function tournamentScreen() {
  const u = U();
  if (!emInTg()) return `${topbar(u.trnTitle, u.trnSub)}<div class="stack"><p class="hint">${u.trnNeedTg}</p></div>`; // the owner (16.10): no «How the tournament works» list
  trnFetch(); const d = TRN.d;
  if (!d) return `${topbar(u.trnTitle, u.trnSub)}<div class="stack"><p class="hint">${u.tgTopLoading}</p></div>`;
  const t = d.t;
  if (!t) return `${topbar(u.trnTitle, u.trnSub)}<div class="stack"><div class="panel"><div style="font-weight:700">🏆 ${u.trnTitle}</div><p class="hint" style="margin:6px 0 0">${tt(u.trnNone, { date: d.next ? emDate(d.next.opensAt) : '' })}</p></div>${S.cloud && S.cloud.admin ? trnAdminHTML(d) : ''}</div>`;
  const sat = emDate(t.gamesAt), sun = emDate(t.gamesAt + 86400000);
  const head = `<div class="panel trn-head"><div class="row"><div class="grow"><div style="font-weight:800;font-size:17px">🏆 ${tt(u.trnWeek, { sat, sun })}</div><div class="hint" style="margin:2px 0 0">${trnPhaseText(t)}${t.round ? ' · ' + tt(u.trnRound, { n: t.round }) : ''}</div></div><div class="trn-fund"><div class="hint" style="margin:0">${u.trnFund}</div><b class="num">💎 ${fmtEm(t.fund)}</b></div></div>
    <div class="hint" style="margin:8px 0 0">${u.trnFormat}: ${t.mode === 'online' ? u.trnModeOnline : u.trnModeOffline} · ${esc(trnScenName(t.scenario))} · ${tt(u.trnTableN, { n: t.n })}</div>
    <div class="hint" style="margin:2px 0 0">${tt(u.trnPlayers, { n: t.players })} · ${tt(u.trnHosts, { n: t.hosts })}${S.skins.borrowed ? ` · ${tt(u.emBorrowed, { date: emDate(S.skins.borrowed) })}` : ''}</div></div>`;
  return `${topbar(u.trnTitle, u.trnSub)}<div class="stack">${head}${trnMeHTML(d)}${S.cloud && S.cloud.admin ? trnAdminHTML(d) : ''}${trnPrizesHTML(d)}${trnStandingsHTML(d)}</div>`;
}
/* the host's app takes the tournament table: the scenario and the size from the tournament, the players already seated on the server */
function trnApplySetup(t, n) {
  const s = String(t.scenario || 'classic');
  if (s === 'classic') { applyScenario('classic', 10); return; }
  S.setup.scenario = null; S.setup.n = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, n || t.n || 10));
  const theme = s.startsWith('intro:') ? s.slice(6) : ''; const sc = theme && typeof introFor === 'function' ? introFor(S.setup.n).find(x => x.id === theme) : null;
  S.setup.comp = sc ? sc.comp.slice() : presetFor(S.setup.n);
}
/* the home screen: the balance next to the language, the tournament in the menu */
(function () {
  const orig = homeScreen;
  homeScreen = function () {
    let html = orig.apply(this, arguments); const u = U();
    if (emInTg()) html = html.replace('<button class="btn xs ghost" data-a="go" data-to="settings"', `<button class="btn xs ghost em-chip" data-a="em-topup" aria-label="${u.emTitle}">💎 <b class="num">${fmtEm(emBalance())}</b></button><button class="btn xs ghost" data-a="go" data-to="settings"`);
    const b = S.cloud && S.cloud.trn; const sub = !b ? u.trnMenuNone : (b.round || b.phase === 'games' ? tt(u.trnMenuGames, { r: b.round, n: b.players }) : tt(u.trnMenuReg, { n: b.players, fund: fmtEm(b.fund) })) + (b.me && b.me.in ? u.trnMenuIn : '');
    const item = `<button class="menu-item" data-a="go" data-to="tournament"><div class="ico" style="color:var(--gold)">${I.trophy}</div><div><div class="t">${u.trnMenu}</div><div class="d">${sub}</div></div><span class="chev">${I.chev}</span></button>`;
    const k = html.indexOf('<button class="menu-item" data-a="go" data-to="mini">'); return k < 0 ? html : html.slice(0, k) + item + html.slice(k);
  };
  const origStart = applyStartParam;
  applyStartParam = function (sp) { if (sp === 'tournament') { S.screen = 'tournament'; return; } if (sp === 'emeralds') { S.screen = 'shop'; S.ui.shopTab = 'emeralds'; return; } return origStart.apply(this, arguments); };
})();
Object.assign(ACT, {
  'shop-tab'(el) { S.ui.shopTab = el.dataset.v === 'emeralds' ? 'emeralds' : 'cards'; window.scrollTo(0, 0); render(); },
  'em-topup'() { S.ui.sheet = null; S.ui.shopTab = 'emeralds'; go('shop'); },
  'em-buy'(el) { const id = el.dataset.id; if (!EM_PACK[id]) return; if (emInTg() && tgBuy('emeralds', id, () => {})) return; ACT['buy-confirm']({ dataset: { kind: 'emeralds', id } }); },
  async 'em-skin-buy'(el) {
    const u = U(); const s = SKIN[el.dataset.id]; if (!s || !emInTg()) return;
    const d = await api('/api/skin/buy', { skin: s.id });
    if (d && d.ok) {
      if (d.skins) { S.skins.owned = d.skins.owned || S.skins.owned; S.skins.equipped = d.skins.equipped || S.skins.equipped; if (d.skins.serials) S.skins.serials = d.skins.serials; if (d.skins.sold) S.skins.sold = d.skins.sold; }
      if (d.balance != null) S.em.balance = d.balance; EMR.at = 0; save(); render();
      toast(s.numbered && d.serial != null ? tt(u.myBought, { name: s.name, n: fmtSerial(d.serial) }) : tt(u.emSkinBought, { name: s.name })); tgHaptic('success');
      if (s.anim && typeof mythPlaySheet === 'function') mythPlaySheet(s.id); // v69: the new owner sees the show at once, with the number on top
      return;
    }
    if (d && d.error === 'not_enough') { if (d.balance != null) S.em.balance = d.balance; toast(tt(u.emSkinShort, { n: fmtEm(d.short || 0) })); render(); return; }
    toast(d && d.error === 'network' ? u.tgOffline : u.trnErr);
  },
  async 'trn-join'(el) {
    const u = U(); if (!emInTg()) { toast(u.trnNeedTg); return; }
    const leave = el.dataset.in === '0'; const d = await api('/api/tournament/join', leave ? { in: false } : { in: true, host: el.dataset.host === '1' });
    if (!d || !d.ok) { toast(d && d.error === 'closed' ? u.trnPhaseDone : u.trnErr); return; }
    TRN.d = d; TRN.at = Date.now(); if (S.cloud) { S.cloud.trn = Object.assign({}, S.cloud.trn || {}, { players: d.t.players, me: d.me ? { in: d.me.in, role: d.me.role } : null, fund: d.t.fund, round: d.t.round, phase: d.t.phase }); } save(); render(); toast(leave ? u.trnLeft : u.trnJoined); tgHaptic('success');
  },
  'trn-sit'(el) { if (typeof tableOpen === 'function') tableOpen(el.dataset.code); },
  async 'trn-host-open'() {
    const u = U(); const d = TRN.d; if (!d || !d.hosting || !d.hosting.code || !d.t) return;
    const live = S.game && !S.game.winner && S.game.tg && S.game.tg.code; if (live && S.game.dealIdx >= S.game.players.length) { toast(u.frGameRunning); return; }
    trnApplySetup(d.t, d.hosting.size); S.setup.hostRole = 'host'; S.setup.online = d.t.mode === 'online'; S.lobby = null; if (S.game && S.game.winner) S.game = null; clearTableSeats(); S.ui.showAll = false;
    go('setup');
    const tk = await api('/api/tournament/table', {}); if (!tk || !tk.ok) { toast(tk && tk.error === 'network' ? u.tgOffline : u.trnErr); return; } // the table becomes the host's newest open table again
    const l = await openTable(false); if (l && l.code === d.hosting.code) toast(u.trnHostOpened); else if (l) toast(tt(u.tgTable, { code: l.code }));
  },
  'trn-f'(el) { if (el.disabled) return; TRN.form = Object.assign({}, TRN.form || {}, { [el.dataset.k]: el.dataset.v }); if (el.dataset.k === 'scenario' && el.dataset.v === 'classic') TRN.form.n = 10; render(); },
  'trn-fn'(el) { TRN.form = Object.assign({}, TRN.form || {}, { n: Number(el.dataset.v) }); render(); },
  'trn-ff'(el) { TRN.form = Object.assign({}, TRN.form || {}, { fund: Number(el.dataset.v) }); render(); },
  async 'trn-save'() { const u = U(); const d = await api('/api/tournament/admin', Object.assign({ action: 'settings' }, TRN.form || {})); if (d && d.ok) { TRN.d = d; TRN.at = Date.now(); TRN.form = { mode: d.t.mode, scenario: d.t.scenario, n: d.t.n, fund: d.t.fund }; render(); toast(u.trnSaved); } else toast(d && d.error === 'drawn' ? u.trnFixed : u.trnErr); },
  async 'trn-open'() { const u = U(); const d = await api('/api/tournament/admin', { action: 'open' }); if (d && d.ok) { TRN.d = d; TRN.at = Date.now(); TRN.form = null; cloudSync(); render(); } else toast(u.trnErr); },
  async 'trn-draw'(el) { const u = U(); const d = await api('/api/tournament/admin', { action: 'draw', final: el.dataset.final === '1' }); if (d && d.ok) { TRN.d = d; TRN.at = Date.now(); render(); toast(tt(u.trnDrawn, { n: d.round })); tgHaptic('success'); } else toast(d && d.error === 'few_players' ? tt(u.trnFew, { n: d.need }) : u.trnErr); },
  async 'trn-host'(el) { const u = U(); const d = await api('/api/tournament/admin', { action: 'host', round: Number(el.dataset.round), idx: Number(el.dataset.idx), tgId: Number(el.dataset.id) }); if (d && d.ok) { TRN.d = d; TRN.at = Date.now(); render(); toast(u.trnHostSet); } else toast(u.trnErr); },
  async 'trn-close'() {
    const u = U(); if (!TRN.closeAsk) { TRN.closeAsk = 1; render(); setTimeout(() => { if (TRN.closeAsk) { TRN.closeAsk = 0; render(); } }, 5000); return; }
    TRN.closeAsk = 0; const d = await api('/api/tournament/admin', { action: 'close' }); if (d && d.ok) { TRN.d = d; TRN.at = Date.now(); cloudSync(); render(); toast(u.trnClosed); } else toast(u.trnErr);
  }
});
