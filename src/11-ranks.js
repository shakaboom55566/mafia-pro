/* ============================================================
   v54 RANKS — eight game titles strictly by the rating (1000 + points); the first five games are «Новичок».
   A badge stands next to the nickname everywhere a rating is known: the overall rating, friends, players, clubs, the table,
   profiles, the results. №1–3 of the overall rating get a gold / silver / bronze wreath, hosts — a top hat for games hosted.
   The same table is on the server (backend/src/ranks.js: the bot's message, Discord roles); backend/test/run.js checks they match.
   ============================================================ */
/* season:begin — the same text in src/11-ranks.js and backend/src/ranks.js (backend/test/run.js compares them)
   v55 seasons: season 1 runs 15.10.2026 – 15.12.2026 inclusive (Kyiv time); then the rating of everyone goes back to 1000 and
   7 days of break follow (games count in the statistics, not in the rating); then the next season, again 2 months + 7 days. */
const SEASON_FIRST = { y: 2026, m: 10, d: 15 }, SEASON_MONTHS = 2, SEASON_BREAK_DAYS = 7;
function kyivMidnight(t) { // ms (UTC) of 00:00 in Kyiv on the date t = { y, m, d }: +3 from the last Sunday of March to the last Sunday of October, else +2
  const lastSun = mo => { const x = new Date(Date.UTC(t.y, mo, 0)); return x.getUTCDate() - x.getUTCDay(); };
  const base = Date.UTC(t.y, t.m - 1, t.d); const dst = base - 3 * 3600000 >= Date.UTC(t.y, 2, lastSun(3), 1) && base - 3 * 3600000 < Date.UTC(t.y, 9, lastSun(10), 1);
  return base - (dst ? 3 : 2) * 3600000;
}
function seasonDay(t, months, days) { // a date + whole months (the day clamped to the month) + days
  const mi = t.m - 1 + (months || 0); const y = t.y + Math.floor(mi / 12), m = ((mi % 12) + 12) % 12;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); const x = new Date(Date.UTC(y, m, Math.min(t.d, last)) + (days || 0) * 86400000);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() };
}
/* the season at a moment (ms): n, start, end (the first moment after its last day), next (the next season's start), phase live | break,
   lastDay / nextDay as { y, m, d }; before season 1 began it counts as season 1 */
function seasonAt(ts) {
  let n = 1, sd = SEASON_FIRST;
  for (;;) {
    const lastDay = seasonDay(sd, SEASON_MONTHS, 0); const end = kyivMidnight(seasonDay(lastDay, 0, 1)); const nextDay = seasonDay(lastDay, 0, 1 + SEASON_BREAK_DAYS); const next = kyivMidnight(nextDay);
    if (ts < next || n >= 500) return { n, start: kyivMidnight(sd), end, next, phase: ts < end ? 'live' : 'break', firstDay: sd, lastDay, nextDay };
    n++; sd = nextDay;
  }
}
/* season:end */
const RANK_NOVICE_GAMES = 5;
const RANK_MIN = [0, 0, 1150, 1350, 1600, 1900, 2300, 2900];
const HOST_LEVELS = [10, 50, 200];
/* shape (c — round token, s — shield, x — eight-point star), symbol, fill, rim, symbol color */
const RANK_LOOK = [
  ['c', 'card', '#3a3f4d', '#6b7180', '#c9cfdb'],
  ['c', 'mask', '#55361f', '#9a6a3f', '#f0c79a'],
  ['c', 'spade', '#7a4c26', '#c08a4e', '#ffe0b8'],
  ['s', 'lens', '#454c5c', '#a7afc2', '#eef1f7'],
  ['s', 'target', '#5f687d', '#d6dbe6', '#ffffff'],
  ['s', 'eye', '#6e5320', '#d8a94c', '#f7dc9a'],
  ['x', 'ring', '#6a1a17', '#e8605a', '#f0cd7a'],
  ['x', 'crown', '#141018', '#f0cd7a', '#f0cd7a']
];
const RANK_WREATH = ['', '#f0cd7a', '#d6dbe6', '#c08a4e'];
const HOST_RIM = ['', '#c08a4e', '#d6dbe6', '#f0cd7a'];
const RK_SHAPE = {
  c: (f, r) => `<circle cx="16" cy="16" r="13.5" fill="${f}" stroke="${r}" stroke-width="2"/>`,
  s: (f, r) => `<path d="M16 2.5L28 6.5V15C28 22.5 22.5 27.5 16 29.5C9.5 27.5 4 22.5 4 15V6.5Z" fill="${f}" stroke="${r}" stroke-width="2" stroke-linejoin="round"/>`,
  x: (f, r) => `<polygon points="16,1 20.4,5.4 26.6,5.4 26.6,11.6 31,16 26.6,20.4 26.6,26.6 20.4,26.6 16,31 11.6,26.6 5.4,26.6 5.4,20.4 1,16 5.4,11.6 5.4,5.4 11.6,5.4" fill="${f}" stroke="${r}" stroke-width="1.6" stroke-linejoin="round"/>`
};
const RK_SYM = {
  card: (s) => `<rect x="11.5" y="9" width="9" height="14" rx="1.5" fill="none" stroke="${s}" stroke-width="1.6"/><path d="M16 13L18 16L16 19L14 16Z" fill="${s}"/>`,
  mask: (s, f) => `<path d="M8 13.6C8 12 9.6 11.2 11.1 11.6C13 12.2 14.5 13 16 13S19 12.2 20.9 11.6C22.4 11.2 24 12 24 13.6C24 17.2 22 20.2 19.5 20.2C17.8 20.2 17 18.7 16 18.7S14.2 20.2 12.5 20.2C10 20.2 8 17.2 8 13.6Z" fill="${s}"/><ellipse cx="12.4" cy="15.3" rx="1.9" ry="1.2" fill="${f}"/><ellipse cx="19.6" cy="15.3" rx="1.9" ry="1.2" fill="${f}"/>`,
  spade: (s) => `<path d="M16 8C16 8 9.5 13 9.5 16.8C9.5 19.2 11.3 20.6 13.1 20.6C14.2 20.6 15.1 20 15.5 19.4C15.3 21 14.6 22.6 13.2 23.6H18.8C17.4 22.6 16.7 21 16.5 19.4C16.9 20 17.8 20.6 18.9 20.6C20.7 20.6 22.5 19.2 22.5 16.8C22.5 13 16 8 16 8Z" fill="${s}"/>`,
  lens: (s) => `<circle cx="14.6" cy="14.4" r="4.6" fill="none" stroke="${s}" stroke-width="2"/><path d="M18 17.8L22.4 22.2" stroke="${s}" stroke-width="2.8" stroke-linecap="round"/>`,
  target: (s) => `<circle cx="16" cy="15.6" r="7.2" fill="none" stroke="${s}" stroke-width="1.6"/><circle cx="16" cy="15.6" r="4" fill="none" stroke="${s}" stroke-width="1.6"/><circle cx="16" cy="15.6" r="1.5" fill="${s}"/>`,
  eye: (s, f) => `<path d="M7.5 15.6C10 11.8 13 10.2 16 10.2S22 11.8 24.5 15.6C22 19.4 19 21 16 21S10 19.4 7.5 15.6Z" fill="none" stroke="${s}" stroke-width="1.6"/><circle cx="16" cy="15.6" r="3.1" fill="${s}"/><circle cx="17.1" cy="14.6" r="0.9" fill="${f}"/>`,
  ring: (s) => `<circle cx="16" cy="19.5" r="5" fill="none" stroke="${s}" stroke-width="2.2"/><path d="M16 8.5L19.3 11.8L16 15L12.7 11.8Z" fill="${s}"/>`,
  crown: (s) => `<path d="M9 21V12.2L12.6 15.6L16 9.8L19.4 15.6L23 12.2V21Z" fill="${s}"/><rect x="9" y="22" width="14" height="2.2" rx="0.6" fill="${s}"/>`
};
const RK_CACHE = {};
function rankIdx(points, games) {
  if ((Number(games) || 0) < RANK_NOVICE_GAMES) return 0;
  const p = Number(points) || 0; let i = 1;
  for (let k = 2; k < RANK_MIN.length; k++) if (p >= RANK_MIN[k]) i = k;
  return i;
}
function rankNext(points, games) {
  const i = rankIdx(points, games); const p = Number(points) || 0;
  if (i === 0) return { idx: rankIdx(p, RANK_NOVICE_GAMES), games: RANK_NOVICE_GAMES - (Number(games) || 0) };
  if (i >= RANK_MIN.length - 1) return null;
  return { idx: i + 1, points: RANK_MIN[i + 1] - p };
}
const hostLevel = hosted => HOST_LEVELS.filter(n => (Number(hosted) || 0) >= n).length;
const rankName = i => ((U().rankNames || [])[i]) || '';
const hostTitle = lvl => ((U().hostNames || [])[lvl - 1]) || '';
/* №1–3 of the overall rating (the leaderboard the app keeps fresh), else 0 */
function topPlaceOf(tgId) {
  try { if (!tgId || !CLOUD.top) return 0; const r = CLOUD.top.slice(0, 3).find(x => x.tgId === Number(tgId)); return r ? (r.rank || CLOUD.top.indexOf(r) + 1) : 0; } catch (e) { return 0; }
}
function rankInner(i) { const l = RANK_LOOK[i] || RANK_LOOK[0]; return RK_SHAPE[l[0]](l[2], l[3]) + RK_SYM[l[1]](l[4], l[2]); }
function wreathSVG(place) { // two laurel branches either side of a 32-unit badge, in a 48×32 box: a stem and pairs of leaves along it
  const col = RANK_WREATH[place] || RANK_WREATH[1]; const R = 17.6, cx = 24, cy = 16.4; const f = n => n.toFixed(2);
  const pt = (a, r) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
  const leaf = (x, y, rot) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="2.7" ry="1.05" transform="rotate(${rot.toFixed(0)} ${f(x)} ${f(y)})" fill="${col}"/>`;
  let left = ''; const [sx, sy] = pt(128, R), [ex, ey] = pt(236, R);
  left += `<path d="M${f(sx)} ${f(sy)}A${R} ${R} 0 0 1 ${f(ex)} ${f(ey)}" fill="none" stroke="${col}" stroke-width="0.9" stroke-linecap="round"/>`;
  [136, 154, 172, 190, 208, 226].forEach(a => {
    const [ox, oy] = pt(a, R + 1.9), [ix, iy] = pt(a, R - 1.9); const t = a + 90; // the tangent points up the branch
    left += leaf(ox, oy, t - 38) + leaf(ix, iy, t + 38);
  });
  const [tx, ty] = pt(238, R + 0.4); left += leaf(tx, ty, 238 + 90);
  return `<g>${left}</g><g transform="translate(48 0) scale(-1 1)">${left}</g>`;
}
/* the badge alone (size = height in px); with a top place — inside the wreath, 1.5× wider */
function rankSVG(i, size = 16, place = 0) {
  const key = i + '|' + size + '|' + place; if (RK_CACHE[key]) return RK_CACHE[key];
  const svg = place ? `<svg class="rk-svg" width="${Math.round(size * 1.5)}" height="${size}" viewBox="0 0 48 32" aria-hidden="true">${wreathSVG(place)}<g transform="translate(8 0)">${rankInner(i)}</g></svg>`
    : `<svg class="rk-svg" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">${rankInner(i)}</svg>`;
  return (RK_CACHE[key] = svg);
}
function hostSVG(lvl, size = 14) {
  const key = 'h' + lvl + '|' + size; if (RK_CACHE[key]) return RK_CACHE[key]; const r = HOST_RIM[lvl] || HOST_RIM[1];
  return (RK_CACHE[key] = `<svg class="rk-svg" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="7" fill="#1e1a26" stroke="${r}" stroke-width="2"/><rect x="11" y="7.5" width="10" height="12.5" rx="1.2" fill="${r}"/><rect x="11" y="16.2" width="10" height="2.2" fill="#1e1a26"/><rect x="6.5" y="20" width="19" height="3" rx="1.5" fill="${r}"/></svg>`);
}
/* o = { points (1000-based), games, hosted, tgId } → the badge next to a nickname ('' while the rating is unknown) */
function rankIco(o, size = 16) {
  if (!o || o.points == null || o.points === '') return '';
  const i = rankIdx(o.points, o.games); const place = o.tgId ? topPlaceOf(o.tgId) : 0; const hl = hostLevel(o.hosted);
  const u = U(); const title = [rankName(i), place ? tt(u.rkPlace, { n: place }) : '', hl ? hostTitle(hl) : ''].filter(Boolean).join(' · ');
  return `<span class="rk" title="${esc(title)}" aria-label="${esc(title)}">${rankSVG(i, size, place)}${hl ? hostSVG(hl, Math.round(size * 0.85)) : ''}</span>`;
}
/* the rank card on a profile: the big badge, the title, the way to the next rank, the rating now and the best of the season
   (o.peak — 1000-based, o.peakSeason); a tap opens all ranks */
function rankBlockHTML(o) {
  if (!o || o.points == null) return '';
  const u = U(); const i = rankIdx(o.points, o.games); const place = o.tgId ? topPlaceOf(o.tgId) : 0; const hl = hostLevel(o.hosted); const nx = rankNext(o.points, o.games);
  let pct = 100, next = u.rkMax;
  if (nx && nx.games != null) { pct = 100 * (Number(o.games) || 0) / RANK_NOVICE_GAMES; next = tt(u.rkNextGames, { n: nx.games, games: plural(nx.games, 'games') }); }
  else if (nx) { const lo = i <= 1 ? 1000 : RANK_MIN[i]; pct = Math.max(0, Math.min(100, 100 * (o.points - lo) / (RANK_MIN[nx.idx] - lo))); next = tt(u.rkNextPts, { rank: rankName(nx.idx), n: nx.points, pts: plural(nx.points, 'points') }); }
  const sub = [place ? tt(u.rkPlace, { n: place }) : '', hl ? `${hostSVG(hl, 13)} ${hostTitle(hl)}` : ''].filter(Boolean).join(' · ');
  const pk = o.peak != null && Number(o.games) > 0 ? Math.max(Number(o.peak) || 0, 1000) : null; const pkSeason = o.peakSeason || seasonAt(Date.now()).n;
  const pts = `<div class="rk-pts"><span><b class="num">${esc(String(o.points))}</b> ${u.rkNowShort}</span>${pk != null ? `<span>${rankSVG(rankIdx(pk, Math.max(Number(o.games) || 0, RANK_NOVICE_GAMES)), 14)} <b class="num">${pk}</b> ${tt(u.rkPeakShort, { n: pkSeason })}</span>` : ''}</div>`;
  return `<div class="rk-card r${i}" role="button" tabindex="0" data-a="ranks" data-i="${i}">${rankSVG(i, 46, place)}<div class="grow" style="min-width:0"><div class="rk-nm">${rankName(i)}</div>${sub ? `<div class="rk-sub">${sub}</div>` : ''}<div class="rk-bar"><i style="width:${pct.toFixed(0)}%"></i></div><div class="rk-next">${next}</div>${pts}</div><span class="rk-chev">›</span></div>`;
}
/* ---------- v55 seasons in the app: dates, the season banner, the Legend's reward ---------- */
function seasonDayText(d) { try { return new Date(Date.UTC(d.y, d.m - 1, d.d)).toLocaleDateString(locale(), { day: 'numeric', month: 'long', timeZone: 'UTC' }); } catch (e) { return `${d.d}.${d.m}.${d.y}`; } }
function seasonBannerHTML() {
  const u = U(); const sz = seasonAt(Date.now());
  if (sz.phase === 'break') {
    return `<div class="ss-banner brk"><div class="ss-top"><b>${u.ssBreakTitle}</b><span>${tt(u.ssNext, { n: sz.n + 1, date: seasonDayText(sz.nextDay) })}</span></div><div class="hint" style="margin:6px 0 0">${tt(u.ssBreakText, { n: sz.n })}</div></div>`; }
  const d = Math.max(1, Math.ceil((sz.end - Date.now()) / 86400000)); const total = sz.end - sz.start; const pct = Math.max(0, Math.min(100, 100 * (Date.now() - sz.start) / total));
  return `<div class="ss-banner"><div class="ss-top"><b>${tt(u.ssTitle, { n: sz.n })}</b><span>${tt(u.ssDates, { from: seasonDayText(sz.firstDay), to: seasonDayText(sz.lastDay) })}</span></div><div class="rk-bar"><i style="width:${pct.toFixed(0)}%"></i></div><div class="ss-left">${tt(u.ssLeft, { n: d, days: plural(d, 'days') })}</div></div>`;
}
/* season 1's promise: an Epic skin for everyone who ends it as a Legend */
function seasonRewardHTML() {
  const u = U(); const sz = seasonAt(Date.now()); if (sz.n !== 1) return '';
  const top = RANK_MIN.length - 1;
  // v56: the reward is a real skin now — its portrait, its name and a way to look at it
  const sk = typeof SKINS !== 'undefined' ? SKINS.find(x => x.season === sz.n) : null;
  if (sk) {
    const text = sz.phase === 'break' ? tt(u.ssRewardSkinDone, { n: sz.n, rank: rankName(top), skin: sk.name }) : tt(u.ssRewardSkinText, { n: sz.n, rank: rankName(top), date: seasonDayText(sz.lastDay), skin: sk.name });
    return `<div class="ss-reward" role="button" tabindex="0" data-a="skins-open">${sealFor(ROLE[sk.role], sk.id, 'ss-skin')}<div class="grow" style="min-width:0"><div class="ss-epic">EPIC</div><b>${tt(u.ssRewardSkin, { n: sz.n, skin: esc(sk.name) })}</b><div class="hint" style="margin:4px 0 0">${text}</div><div class="ss-see">${rankSVG(top, 16)} ${u.ssRewardSee} ›</div></div></div>`;
  }
  const text = sz.phase === 'break' ? tt(u.ssRewardDone, { n: sz.n, rank: rankName(top) }) : tt(u.ssReward, { n: sz.n, rank: rankName(top), date: seasonDayText(sz.lastDay) });
  return `<div class="ss-reward">${rankSVG(top, 48)}<div class="grow" style="min-width:0"><div class="ss-epic">EPIC</div><b>${tt(u.ssRewardTitle, { n: sz.n })}</b><div class="hint" style="margin:4px 0 0">${text}</div></div></div>`;
}
/* all ranks: thresholds, where the viewer is */
function ranksLadderHTML(cur) {
  const u = U(); const c = Number(cur);
  return `<div class="stack-s">${RANK_LOOK.map((x, i) => {
    const rule = i === 0 ? tt(u.rkNovice, { n: RANK_NOVICE_GAMES }) : i === 1 ? tt(u.rkBelow, { n: RANK_MIN[2] }) : tt(u.rkFrom, { n: RANK_MIN[i] });
    return `<div class="rk-row ${i === c ? 'cur' : ''}">${rankSVG(i, 34)}<div class="grow"><b>${rankName(i)}</b><div class="hint" style="margin:0">${rule}</div></div>${i === c ? `<span class="rk-you">${u.rkYou}</span>` : ''}</div>`;
  }).reverse().join('')}</div>`;
}
function ranksExtrasHTML(cur) { // the wreath of the top three, the host's top hat
  const u = U(); const c = Number(cur);
  const hosts = HOST_LEVELS.map((n, k) => `<div class="rk-row">${hostSVG(k + 1, 30)}<div class="grow"><b>${hostTitle(k + 1)}</b><div class="hint" style="margin:0">${tt(u.rkHostRule, { n })}</div></div></div>`).join('');
  const wreaths = [1, 2, 3].map(p => `<span title="№${p}">${rankSVG(Number.isFinite(c) && c > 0 ? c : 7, 34, p)}</span>`).join('');
  return `<div class="eyebrow" style="margin-top:14px">${u.rkWreath}</div><div class="rk-wreaths">${wreaths}</div><p class="hint" style="margin:6px 0 0">${u.rkWreathHint}</p>
    <div class="eyebrow" style="margin-top:14px">${u.rkHost}</div><p class="hint" style="margin:4px 0 8px">${u.rkHostHint}</p><div class="stack-s">${hosts}</div>`;
}
const listHTML = items => `<ul class="rk-list">${(items || []).map(x => `<li>${x}</li>`).join('')}</ul>`;
function ranksHowHTML() { const u = U(); return `<div class="eyebrow" style="margin-top:14px">${u.rkHowTitle}</div>${listHTML(u.rkHow)}`; }
function seasonRulesHTML() { const u = U(); return `<div class="eyebrow" style="margin-top:14px">${u.rkSeasonTitle}</div>${listHTML(u.rkSeasonRules)}`; }
/* the sheet from a rank card: everything about ranks */
function ranksSheetHTML(cur) {
  const u = U();
  return `<h2>${u.rkTitle}</h2><div class="stack-s" style="margin-top:8px">${seasonBannerHTML()}${seasonRewardHTML()}</div><p class="hint" style="margin:10px 0">${u.rkHint}</p>${ranksLadderHTML(cur)}${ranksHowHTML()}${ranksExtrasHTML(cur)}${seasonRulesHTML()}`;
}
/* the player's own rank: the account's when in Telegram, else the profile of this device */
function myRankObj() {
  try {
    if (S.cloud && S.cloud.user && S.cloud.rating) { const id = S.cloud.user.id; const f = FRP[id]; if (f && f.rating) return cloudRankObj(f, id); const r = S.cloud.rating; return { points: 1000 + (r.points || 0), games: r.games || 0, hosted: r.hosted || 0, tgId: id, peak: S.cloud.peak ? S.cloud.peak.points : null, peakSeason: S.cloud.peak ? S.cloud.peak.season : null }; }
  } catch (e) {}
  const me = S.meId ? profById(S.meId) : null; return me ? profRank(me) : null;
}
const cloudRankObj = (d, id) => Object.assign({ tgId: id }, d.rating, d.peak ? { peak: d.peak.points, peakSeason: d.peak.season } : {});
/* the Ranks tab at the top of the ratings screen */
function ranksTabHTML() {
  const u = U(); const me = myRankObj(); const cur = me ? rankIdx(me.points, me.games) : '';
  let legends = '';
  if (TG.app && apiBase()) {
    const top = RANK_MIN.length - 1; const list = (CLOUD.top || []).filter(r => rankIdx(r.points, r.games) === top);
    legends = `<div class="eyebrow" style="margin-top:14px">${CLOUD.topFinal ? tt(u.rkFinalTop, { n: seasonAt(Date.now()).n }) + ' · ' + rankName(top) : u.rkLegendsNow}</div>${list.length ? `<div class="stack-s">${list.map(r => `<div class="fr-row" role="button" data-a="fr-open" data-id="${r.tgId}"><span class="pos" style="width:22px;color:var(--gold-2);font-weight:800">${r.rank}</span><div class="grow" style="min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${rankIco(r)}${esc(r.name)}</div></div><span class="num" style="color:var(--gold-2);font-weight:700">${r.points}</span></div>`).join('')}</div>` : `<p class="hint">${CLOUD.top ? u.rkLegendsNone : u.tgTopLoading}</p>`}`;
  }
  return `<div class="stack-s">${seasonBannerHTML()}${seasonRewardHTML()}</div>
    ${me ? `<div class="eyebrow" style="margin-top:14px">${u.rkMine}</div>${rankBlockHTML(me)}` : ''}
    ${ranksHowHTML()}<div class="eyebrow" style="margin-top:14px;margin-bottom:8px">${u.rkLadder}</div>${ranksLadderHTML(cur)}${legends}${ranksExtrasHTML(cur)}${seasonRulesHTML()}`;
}
/* a rank-up mark for the results: the rank before and after this game */
function rankUpOf(before, after) {
  if (!before || !after || before.points == null || after.points == null) return 0;
  const a = rankIdx(before.points, before.games), b = rankIdx(after.points, after.games); return b > a ? b : 0;
}
function rankUpHTML(idx) { idx = Math.max(0, Math.min(RANK_LOOK.length - 1, Number(idx) || 0)); if (!idx) return ''; const u = U(); return `<div class="rk-up">${rankSVG(idx, 18)} ${tt(u.rkUp, { rank: rankName(idx) })}</div>`; }
/* the season's rating of a device profile: 1000 + the points of its games in this season (all of season 1; none in the break)
   and the best of the season (the highest the running total reached, never below the starting 1000) */
function localSeason(history, at) {
  const sz = seasonAt(at || Date.now()); const from = sz.n === 1 ? 0 : sz.start; const live = sz.phase === 'live';
  const list = (history || []).filter(x => x && x.date >= from && x.date < sz.end).sort((a, b) => a.date - b.date);
  let sum = 0, best = 0; list.forEach(x => { sum += x.points || 0; if (sum > best) best = sum; });
  return { points: live ? 1000 + sum : 1000, peak: 1000 + best, season: sz.n, games: list.length };
}
/* the rating of a profile kept on this device (offline games) — or the account's, when it is the Telegram player himself */
function profRank(pr) {
  if (!pr) return null;
  try {
    if (pr.tgId && S.cloud && S.cloud.user && S.cloud.user.id === pr.tgId) {
      const f = FRP[pr.tgId]; if (f && f.rating) return cloudRankObj(f, pr.tgId); // the freshest: the profile just loaded
      if (S.cloud.rating) { const r = S.cloud.rating; return { points: 1000 + (r.points || 0), games: r.games || 0, hosted: r.hosted || 0, tgId: pr.tgId, peak: S.cloud.peak ? S.cloud.peak.points : null, peakSeason: S.cloud.peak ? S.cloud.peak.season : null }; }
    }
  } catch (e) {}
  const st = profStats(pr); const ls = localSeason(pr.history); return { points: st.rating, games: st.games, tgId: pr.tgId || null, peak: st.games ? ls.peak : null, peakSeason: ls.season };
}
/* the Ranks tab: a segment «Rating | Ranks» at the top of the ratings screen */
(function () {
  const orig = ratingsScreen;
  ratingsScreen = function () {
    const u = U(); const tab = S.ui.rtTab === 'ranks' ? 'ranks' : 'rating';
    const seg = `<div class="segment rt-tabs">${[['rating', u.rtTabRating], ['ranks', u.rtTabRanks]].map(([id, l]) => `<button class="${tab === id ? 'active' : ''}" data-a="rt-tab" data-v="${id}">${l}</button>`).join('')}</div>`;
    if (tab === 'ranks') return `${topbar(u.tabRatings, u.ratingsD, false)}<div class="stack">${seg}${ranksTabHTML()}</div>`;
    const html = orig(); const k = html.indexOf('<div class="stack">'); return k < 0 ? html : html.slice(0, k + 19) + seg + html.slice(k + 19);
  };
})();
Object.assign(ACT, {
  ranks(el) { S.ui.sheet = { type: 'ranks', i: el && el.dataset ? el.dataset.i : '' }; render(); },
  'rt-tab'(el) { S.ui.rtTab = el.dataset.v === 'ranks' ? 'ranks' : 'rating'; S.ui.sheet = null; render(); }
});
