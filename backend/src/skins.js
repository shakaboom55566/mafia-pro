/* v56: card skins. A skin is a new face of a role's card for the player who owns and wears it; the rules of the role do not change.
   The same catalog is in the app (src/12-skins.js); backend/test/run.js checks they agree.
   - owning: a row in purchases with kind 'skin' (status 'reward' for season rewards, 'paid' if skins are ever sold); admins own every skin
   - wearing: user_skins (tg_id, role) → skin; one skin per role; the app shows it wherever this player is that character
   - season rewards: SEASON_SKIN[n] goes to everyone who ends season n as a Legend (runSeasonCron), and is put on at once */
export const SKINS = {
  amethyst_don: { role: 'don', rarity: 'epic', season: 1 }
};
export const SEASON_SKIN = { 1: 'amethyst_don' };
export const SKIN_NAMES = { amethyst_don: { ru: 'Аметистовый Дон', uk: 'Аметистовий Дон', en: 'Amethyst Don', pl: 'Ametystowy Don', hy: 'Ամեթիստե Դոն' } };
export const skinName = (id, lang) => ((SKIN_NAMES[id] || {})[lang]) || ((SKIN_NAMES[id] || {}).ru) || id;
const SKIN_RE = /^[a-z0-9_]{2,40}$/;
export const isSkin = id => typeof id === 'string' && SKIN_RE.test(id) && Object.prototype.hasOwnProperty.call(SKINS, id);

/* the skins a player owns (ids) */
export async function ownedSkins(env, tgId, admin) {
  if (admin) return Object.keys(SKINS);
  const rows = (await env.DB.prepare("SELECT item FROM purchases WHERE tg_id = ?1 AND kind = 'skin' AND status IN ('paid', 'reward')").bind(tgId).all()).results || [];
  return [...new Set(rows.map(r => r.item).filter(isSkin))];
}
/* what a player wears: { role: skin } (only skins that still exist and still match their role) */
export async function equippedSkins(env, tgId) {
  const rows = (await env.DB.prepare('SELECT role, skin FROM user_skins WHERE tg_id = ?1').bind(tgId).all()).results || [];
  const out = {}; for (const r of rows) if (isSkin(r.skin) && SKINS[r.skin].role === r.role) out[r.role] = r.skin; return out;
}
/* what several players wear: { tgId: { role: skin } } — for the host's table */
export async function equippedOf(env, ids) {
  ids = [...new Set((ids || []).map(Number).filter(x => Number.isSafeInteger(x) && x > 0))].slice(0, 40); const out = {}; if (!ids.length) return out;
  const rows = (await env.DB.prepare(`SELECT tg_id, role, skin FROM user_skins WHERE tg_id IN (${ids.map((_, i) => '?' + (i + 1)).join(',')})`).bind(...ids).all()).results || [];
  for (const r of rows) if (isSkin(r.skin) && SKINS[r.skin].role === r.role) (out[r.tg_id] = out[r.tg_id] || {})[r.role] = r.skin;
  return out;
}
/* put a skin on (skin = id) or take the role's skin off (skin = null); the player must own it */
export async function equipSkin(env, tgId, role, skin, admin, ts) {
  if (typeof role !== 'string' || !/^[a-z_]{2,32}$/.test(role)) return { ok: false, error: 'bad_role' };
  if (skin == null || skin === '') { await env.DB.prepare('DELETE FROM user_skins WHERE tg_id = ?1 AND role = ?2').bind(tgId, role).run(); return { ok: true }; }
  if (!isSkin(skin) || SKINS[skin].role !== role) return { ok: false, error: 'bad_skin' };
  if (!(await ownedSkins(env, tgId, admin)).includes(skin)) return { ok: false, error: 'not_owned' };
  await env.DB.prepare('INSERT INTO user_skins (tg_id, role, skin, updated_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(tg_id, role) DO UPDATE SET skin = ?3, updated_at = ?4').bind(tgId, role, skin, ts).run();
  return { ok: true };
}
/* the season's reward: the skin for each Legend (payload is unique — the grant is never doubled), worn at once unless the role has another skin on */
export async function grantSeasonSkin(env, season, ids, ts) {
  const skin = SEASON_SKIN[season]; if (!skin || !ids.length) return null;
  const role = SKINS[skin].role;
  for (let i = 0; i < ids.length; i += 40) {
    const part = ids.slice(i, i + 40);
    await env.DB.batch(part.flatMap(id => [
      env.DB.prepare("INSERT OR IGNORE INTO purchases (tg_id, kind, item, stars, payload, status, created_at, paid_at) VALUES (?1, 'skin', ?2, 0, ?3, 'reward', ?4, ?4)").bind(id, skin, `season${season}_${skin}_${id}`, ts),
      env.DB.prepare('INSERT OR IGNORE INTO user_skins (tg_id, role, skin, updated_at) VALUES (?1, ?2, ?3, ?4)').bind(id, role, skin, ts)
    ]));
  }
  return skin;
}
