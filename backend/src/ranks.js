/* v54: player ranks — eight game titles, strictly by the rating (1000 + points); the first five games are «Новичок».
   The same table lives in the app (src/11-ranks.js); backend/test/run.js checks that the two agree.
   Used by: the bot's «new rank» message (apiResult), Discord rank roles (syncRankRoles), /stats and the result card. */
export const RANK_NOVICE_GAMES = 5;
// the lowest rating of each rank; [0] Новичок is by games (fewer than RANK_NOVICE_GAMES), [1] Любитель is everything below [2]
export const RANK_MIN = [0, 0, 1150, 1350, 1600, 1900, 2300, 2900];
export const RANK_IDS = ['novice', 'amateur', 'player', 'adept', 'master', 'expert', 'grandmaster', 'legend'];
// the same symbol as the app's badge: card, mask, spade, magnifier, target, eye, ring, crown
export const RANK_EMOJI = ['🃏', '🎭', '♠️', '🔍', '🎯', '👁️', '💍', '👑'];
// Discord role colors = the rim of the app's badge
export const RANK_COLOR = [0x6b7180, 0x9a6a3f, 0xc08a4e, 0xa7afc2, 0xd6dbe6, 0xd8a94c, 0xe8605a, 0xf0cd7a];
export const RANK_NAMES = {
  ru: ['Новичок', 'Любитель', 'Игрок', 'Знаток', 'Мастер', 'Эксперт', 'Гроссмейстер', 'Легенда'],
  uk: ['Новачок', 'Любитель', 'Гравець', 'Знавець', 'Майстер', 'Експерт', 'Гросмейстер', 'Легенда'],
  en: ['Rookie', 'Amateur', 'Player', 'Adept', 'Master', 'Expert', 'Grandmaster', 'Legend'],
  pl: ['Nowicjusz', 'Amator', 'Gracz', 'Znawca', 'Mistrz', 'Ekspert', 'Arcymistrz', 'Legenda'],
  hy: ['Սկսնակ', 'Սիրող', 'Խաղացող', 'Գիտակ', 'Վարպետ', 'Փորձագետ', 'Գրոսմայստեր', 'Լեգենդ']
};
// the host's badge (a top hat): games hosted for the bronze / silver / gold hat
export const HOST_LEVELS = [10, 50, 200];

/* rank index 0…7 from the rating as the app shows it (1000-based) and the number of games */
export function rankIdx(points, games) {
  if ((Number(games) || 0) < RANK_NOVICE_GAMES) return 0;
  const p = Number(points) || 0; let i = 1;
  for (let k = 2; k < RANK_MIN.length; k++) if (p >= RANK_MIN[k]) i = k;
  return i;
}
export const rankName = (lang, i) => (RANK_NAMES[lang] || RANK_NAMES.ru)[i] || RANK_NAMES.ru[i] || '';
export const rankLabel = (lang, i) => `${RANK_EMOJI[i]} ${rankName(lang, i)}`;
/* the next rank and what it takes: { idx, points } (rating points still needed) or { idx, games } for a Новичок; null at the top */
export function rankNext(points, games) {
  const i = rankIdx(points, games); const p = Number(points) || 0;
  if (i === 0) return { idx: rankIdx(p, RANK_NOVICE_GAMES), games: RANK_NOVICE_GAMES - (Number(games) || 0) };
  if (i >= RANK_MIN.length - 1) return null;
  return { idx: i + 1, points: RANK_MIN[i + 1] - p };
}
export const hostLevel = hosted => HOST_LEVELS.filter(n => (Number(hosted) || 0) >= n).length;
/* the Discord role of a rank: one name for the whole server, Russian (the server's main language) and English */
export const rankRoleName = i => `${RANK_EMOJI[i]} ${RANK_NAMES.ru[i]} · ${RANK_NAMES.en[i]}`;

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
export { SEASON_FIRST, SEASON_MONTHS, SEASON_BREAK_DAYS, kyivMidnight, seasonDay, seasonAt };
