/* ============================================================
   v54 RANKS — eight game titles strictly by the rating (1000 + points); the first five games are «Новичок».
   A badge stands next to the nickname everywhere a rating is known: the overall rating, friends, players, clubs, the table,
   profiles, the results. №1–3 of the overall rating get a gold / silver / bronze wreath, hosts — a top hat for games hosted.
   The same table is on the server (backend/src/ranks.js: the bot's message, Discord roles); backend/test/run.js checks they match.
   ============================================================ */
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
/* the rank card on a profile: the big badge, the title, the way to the next rank; a tap opens all ranks */
function rankBlockHTML(o) {
  if (!o || o.points == null) return '';
  const u = U(); const i = rankIdx(o.points, o.games); const place = o.tgId ? topPlaceOf(o.tgId) : 0; const hl = hostLevel(o.hosted); const nx = rankNext(o.points, o.games);
  let pct = 100, next = u.rkMax;
  if (nx && nx.games != null) { pct = 100 * (Number(o.games) || 0) / RANK_NOVICE_GAMES; next = tt(u.rkNextGames, { n: nx.games, games: plural(nx.games, 'games') }); }
  else if (nx) { const lo = i <= 1 ? 1000 : RANK_MIN[i]; pct = Math.max(0, Math.min(100, 100 * (o.points - lo) / (RANK_MIN[nx.idx] - lo))); next = tt(u.rkNextPts, { rank: rankName(nx.idx), n: nx.points, pts: plural(nx.points, 'points') }); }
  const sub = [place ? tt(u.rkPlace, { n: place }) : '', hl ? `${hostSVG(hl, 13)} ${hostTitle(hl)}` : ''].filter(Boolean).join(' · ');
  return `<div class="rk-card r${i}" role="button" tabindex="0" data-a="ranks" data-i="${i}">${rankSVG(i, 46, place)}<div class="grow" style="min-width:0"><div class="rk-nm">${rankName(i)}</div>${sub ? `<div class="rk-sub">${sub}</div>` : ''}<div class="rk-bar"><i style="width:${pct.toFixed(0)}%"></i></div><div class="rk-next">${next}</div></div><span class="rk-chev">›</span></div>`;
}
/* all ranks: thresholds, where the viewer is, the wreath and the host's hat */
function ranksSheetHTML(cur) {
  const u = U(); const c = Number(cur);
  const rows = RANK_LOOK.map((x, i) => {
    const rule = i === 0 ? tt(u.rkNovice, { n: RANK_NOVICE_GAMES }) : i === 1 ? tt(u.rkBelow, { n: RANK_MIN[2] }) : tt(u.rkFrom, { n: RANK_MIN[i] });
    return `<div class="rk-row ${i === c ? 'cur' : ''}">${rankSVG(i, 34)}<div class="grow"><b>${rankName(i)}</b><div class="hint" style="margin:0">${rule}</div></div>${i === c ? `<span class="rk-you">${u.rkYou}</span>` : ''}</div>`;
  }).reverse().join('');
  const hosts = HOST_LEVELS.map((n, k) => `<div class="rk-row">${hostSVG(k + 1, 30)}<div class="grow"><b>${hostTitle(k + 1)}</b><div class="hint" style="margin:0">${tt(u.rkHostRule, { n })}</div></div></div>`).join('');
  const wreaths = [1, 2, 3].map(p => `<span title="№${p}">${rankSVG(Number.isFinite(c) && c > 0 ? c : 7, 34, p)}</span>`).join('');
  return `<h2>${u.rkTitle}</h2><p class="hint" style="margin:4px 0 10px">${u.rkHint}</p><div class="stack-s">${rows}</div>
    <div class="eyebrow" style="margin-top:14px">${u.rkWreath}</div><div class="rk-wreaths">${wreaths}</div><p class="hint" style="margin:6px 0 0">${u.rkWreathHint}</p>
    <div class="eyebrow" style="margin-top:14px">${u.rkHost}</div><p class="hint" style="margin:4px 0 8px">${u.rkHostHint}</p><div class="stack-s">${hosts}</div>`;
}
/* a rank-up mark for the results: the rank before and after this game */
function rankUpOf(before, after) {
  if (!before || !after || before.points == null || after.points == null) return 0;
  const a = rankIdx(before.points, before.games), b = rankIdx(after.points, after.games); return b > a ? b : 0;
}
function rankUpHTML(idx) { idx = Math.max(0, Math.min(RANK_LOOK.length - 1, Number(idx) || 0)); if (!idx) return ''; const u = U(); return `<div class="rk-up">${rankSVG(idx, 18)} ${tt(u.rkUp, { rank: rankName(idx) })}</div>`; }
/* the rating of a profile kept on this device (offline games) — or the account's, when it is the Telegram player himself */
function profRank(pr) {
  if (!pr) return null;
  try {
    if (pr.tgId && S.cloud && S.cloud.user && S.cloud.user.id === pr.tgId) {
      const f = FRP[pr.tgId]; if (f && f.rating) return Object.assign({ tgId: pr.tgId }, f.rating); // the freshest: the profile just loaded
      if (S.cloud.rating) { const r = S.cloud.rating; return { points: 1000 + (r.points || 0), games: r.games || 0, hosted: r.hosted || 0, tgId: pr.tgId }; }
    }
  } catch (e) {}
  const st = profStats(pr); return { points: st.rating, games: st.games, tgId: pr.tgId || null };
}
Object.assign(ACT, {
  ranks(el) { S.ui.sheet = { type: 'ranks', i: el && el.dataset ? el.dataset.i : '' }; render(); }
});
