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
