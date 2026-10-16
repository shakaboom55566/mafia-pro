/* v56: card skins. A skin is a new face of a role's card for the player who owns and wears it; the rules of the role do not change.
   The same catalog is in the app (src/12-skins.js); backend/test/run.js checks they agree.
   - owning: a row in purchases with kind 'skin' (status 'reward' for season rewards, 'paid' if skins are ever sold); admins own every skin
   - wearing: user_skins (tg_id, role) → skin; one skin per role; the app shows it wherever this player is that character
   - season rewards: SEASON_SKIN[n] goes to everyone who ends season n as a Legend (runSeasonCron), and is put on at once */
export const SKINS = {
  amethyst_don: { role: 'don', rarity: 'epic', season: 1 },
  // v57–v67: the Epic series — a skin for every free card (how to get them is decided later; admins own them all)
  lilac_doctor: { role: 'doctor', rarity: 'epic' },
  orchid_surgeon: { role: 'mafia_doctor', rarity: 'epic' },
  violet_armorer: { role: 'gunsmith', rarity: 'epic' },
  violet_flare: { role: 'kamikaze', rarity: 'epic' },
  lilac_whisper: { role: 'balamut', rarity: 'epic' },
  velvet_gloves: { role: 'executioner', rarity: 'epic' },
  iris_shadow: { role: 'spy', rarity: 'epic' },
  lavender_wolf: { role: 'werewolf', rarity: 'epic' },
  violet_soldier: { role: 'mafia', rarity: 'epic' },
  lights_out: { role: 'maniac', rarity: 'epic' },
  mauve_jester: { role: 'jester', rarity: 'epic' },
  velvet_cat: { role: 'thief', rarity: 'epic' },
  lavender_vow: { role: 'monk', rarity: 'epic' },
  violet_badge: { role: 'sheriff', rarity: 'epic' },
  violet_ink: { role: 'journalist', rarity: 'epic' },
  orchid_mayor: { role: 'mayor', rarity: 'epic' },
  plum_brandy: { role: 'drunk', rarity: 'epic' },
  lavender_heart: { role: 'altruist', rarity: 'epic' },
  iron_violet: { role: 'miller', rarity: 'epic' },
  night_pact: { role: 'azazel', rarity: 'epic' },
  dream_merchant: { role: 'morpheus', rarity: 'epic' },
  the_shelter: { role: 'rabbi', rarity: 'epic' },
  tick_tock: { role: 'bomb', rarity: 'epic' },
  violet_shield: { role: 'bodyguard', rarity: 'epic' },
  violet_verdict: { role: 'judge', rarity: 'epic' },
  lavender_baker: { role: 'citizen', rarity: 'epic' },
  steady_hands: { role: 'sapper', rarity: 'epic' },
  final_stamp: { role: 'bailiff', rarity: 'epic' },
  violet_ledger: { role: 'auditor', rarity: 'epic' },
  purple_knuckles: { role: 'thug', rarity: 'epic' },
  silent_petal: { role: 'ninja', rarity: 'epic' },
  velvet_envelope: { role: 'corrupter', rarity: 'epic' }
};
export const SEASON_SKIN = { 1: 'amethyst_don' };
export const SKIN_NAMES = {
  amethyst_don: { ru: 'Аметистовый Дон', uk: 'Аметистовий Дон', en: 'Amethyst Don', pl: 'Ametystowy Don', hy: 'Ամեթիստե Դոն' },
  lilac_doctor: { ru: 'Доктор Сирень', uk: 'Лікарка Бузок', en: 'Doctor Lilac', pl: 'Doktor Lila', hy: 'Բժշկուհի Յասաման' },
  orchid_surgeon: { ru: 'Хирург Орхидея', uk: 'Хірургиня Орхідея', en: 'Orchid Surgeon', pl: 'Chirurg Orchidea', hy: 'Վիրաբույժ Խոլորձ' },
  violet_armorer: { ru: 'Фиалковый оружейник', uk: 'Фіалковий зброяр', en: 'Violet Armorer', pl: 'Fiołkowy Rusznikarz', hy: 'Մանուշակագույն զինագործ' },
  violet_flare: { ru: 'Фиолетовая вспышка', uk: 'Фіолетовий спалах', en: 'Violet Flare', pl: 'Fioletowa Raca', hy: 'Մանուշակագույն բռնկում' },
  lilac_whisper: { ru: 'Сиреневый шёпот', uk: 'Бузковий шепіт', en: 'Lilac Whisper', pl: 'Liliowy Szept', hy: 'Յասամանե շշուկ' },
  velvet_gloves: { ru: 'Бархатные перчатки', uk: 'Оксамитові рукавички', en: 'Velvet Gloves', pl: 'Aksamitne Rękawiczki', hy: 'Թավշյա ձեռնոցներ' },
  iris_shadow: { ru: 'Тень Ирис', uk: 'Тінь Ірис', en: 'Iris Shadow', pl: 'Cień Iris', hy: 'Իրիսի ստվեր' },
  lavender_wolf: { ru: 'Лавандовая волчица', uk: 'Лавандова вовчиця', en: 'Lavender Wolf', pl: 'Lawendowa Wilczyca', hy: 'Լավանդայի գայլուհի' },
  violet_soldier: { ru: 'Фиолетовый солдат', uk: 'Фіолетовий солдат', en: 'Violet Soldier', pl: 'Fioletowy Żołnierz', hy: 'Մանուշակագույն զինվոր' },
  lights_out: { ru: 'Гаситель', uk: 'Гаситель', en: 'Lights Out', pl: 'Gaszący Światło', hy: 'Լույսերը մարողը' },
  mauve_jester: { ru: 'Лиловая шутиха', uk: 'Лілова блазниця', en: 'Mauve Jester', pl: 'Liliowa Błaznica', hy: 'Մանուշակագույն ծաղրածու' },
  velvet_cat: { ru: 'Бархатная кошка', uk: 'Оксамитова кішка', en: 'Velvet Cat', pl: 'Aksamitna Kotka', hy: 'Թավշյա կատու' },
  lavender_vow: { ru: 'Лавандовый обет', uk: 'Лавандова обітниця', en: 'Lavender Vow', pl: 'Lawendowe Ślubowanie', hy: 'Լավանդայի ուխտ' },
  violet_badge: { ru: 'Фиолетовый значок', uk: 'Фіолетовий жетон', en: 'Violet Badge', pl: 'Fioletowa Odznaka', hy: 'Մանուշակագույն կրծքանշան' },
  violet_ink: { ru: 'Фиолетовые чернила', uk: 'Фіолетове чорнило', en: 'Violet Ink', pl: 'Fioletowy Atrament', hy: 'Մանուշակագույն թանաք' },
  orchid_mayor: { ru: 'Мэр Орхидея', uk: 'Мерка Орхідея', en: 'Orchid Mayor', pl: 'Burmistrzyni Orchidea', hy: 'Քաղաքապետ Խոլորձ' },
  plum_brandy: { ru: 'Сливовый бренди', uk: 'Сливовий бренді', en: 'Plum Brandy', pl: 'Śliwowica', hy: 'Սալորի օղի' },
  lavender_heart: { ru: 'Лавандовое сердце', uk: 'Лавандове серце', en: 'Lavender Heart', pl: 'Lawendowe Serce', hy: 'Լավանդայի սիրտ' },
  iron_violet: { ru: 'Железная фиалка', uk: 'Залізна фіалка', en: 'Iron Violet', pl: 'Żelazny Fiołek', hy: 'Երկաթե մանուշակ' },
  night_pact: { ru: 'Ночной договор', uk: 'Нічна угода', en: 'Night Pact', pl: 'Nocny Pakt', hy: 'Գիշերային դաշինք' },
  dream_merchant: { ru: 'Торговец снами', uk: 'Торговець снами', en: 'Dream Merchant', pl: 'Handlarz Snów', hy: 'Երազների վաճառական' },
  the_shelter: { ru: 'Убежище', uk: 'Прихисток', en: 'The Shelter', pl: 'Schronienie', hy: 'Ապաստան' },
  tick_tock: { ru: 'Тик-Так', uk: 'Тік-Так', en: 'Tick-Tock', pl: 'Tik-Tak', hy: 'Տիկ-Տակ' },
  violet_shield: { ru: 'Фиолетовый щит', uk: 'Фіолетовий щит', en: 'Violet Shield', pl: 'Fioletowa Tarcza', hy: 'Մանուշակագույն վահան' },
  violet_verdict: { ru: 'Фиолетовый вердикт', uk: 'Фіолетовий вирок', en: 'Violet Verdict', pl: 'Fioletowy Wyrok', hy: 'Մանուշակագույն դատավճիռ' },
  lavender_baker: { ru: 'Лавандовая пекарша', uk: 'Лавандова пекарка', en: 'Lavender Baker', pl: 'Lawendowa Piekarka', hy: 'Լավանդայի հացթուխ' },
  steady_hands: { ru: 'Твёрдая рука', uk: 'Тверда рука', en: 'Steady Hands', pl: 'Pewna Ręka', hy: 'Հաստատուն ձեռքեր' },
  final_stamp: { ru: 'Последняя печать', uk: 'Остання печатка', en: 'Final Stamp', pl: 'Ostatnia Pieczęć', hy: 'Վերջին կնիք' },
  violet_ledger: { ru: 'Фиолетовый гроссбух', uk: 'Фіолетовий гросбух', en: 'Violet Ledger', pl: 'Fioletowa Księga', hy: 'Մանուշակագույն մատյան' },
  purple_knuckles: { ru: 'Фиолетовый кастет', uk: 'Фіолетовий кастет', en: 'Purple Knuckles', pl: 'Fioletowy Kastet', hy: 'Մանուշակագույն կաստետ' },
  silent_petal: { ru: 'Тихий лепесток', uk: 'Тиха пелюстка', en: 'Silent Petal', pl: 'Cichy Płatek', hy: 'Լուռ թերթիկ' },
  velvet_envelope: { ru: 'Бархатный конверт', uk: 'Оксамитовий конверт', en: 'Velvet Envelope', pl: 'Aksamitna Koperta', hy: 'Թավշյա ծրար' }
};
export const skinName = (id, lang) => ((SKIN_NAMES[id] || {})[lang]) || ((SKIN_NAMES[id] || {}).ru) || id;
const SKIN_RE = /^[a-z0-9_]{2,40}$/;
export const isSkin = id => typeof id === 'string' && SKIN_RE.test(id) && Object.prototype.hasOwnProperty.call(SKINS, id);

/* the skins a player owns (ids); extra — skins lent for a while (v63: every Epic skin during the weekend tournament) */
export async function ownedSkins(env, tgId, admin, extra) {
  if (admin) return Object.keys(SKINS);
  const rows = (await env.DB.prepare("SELECT item FROM purchases WHERE tg_id = ?1 AND kind = 'skin' AND status IN ('paid', 'reward')").bind(tgId).all()).results || [];
  return [...new Set(rows.map(r => r.item).filter(isSkin).concat((extra || []).filter(isSkin)))];
}
/* v63: buy a skin for emeralds — the statements of one transaction (the caller checks the balance and runs them with the debit) */
export function buySkinStmts(env, tgId, skin, payload, ts) {
  const role = SKINS[skin].role;
  return [
    env.DB.prepare("INSERT INTO purchases (tg_id, kind, item, stars, payload, status, created_at, paid_at) VALUES (?1, 'skin', ?2, 0, ?3, 'paid', ?4, ?4)").bind(tgId, skin, payload, ts),
    env.DB.prepare('INSERT OR IGNORE INTO user_skins (tg_id, role, skin, updated_at) VALUES (?1, ?2, ?3, ?4)').bind(tgId, role, skin, ts) // worn at once unless the role has a skin on
  ];
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
export async function equipSkin(env, tgId, role, skin, admin, ts, extra) {
  if (typeof role !== 'string' || !/^[a-z_]{2,32}$/.test(role)) return { ok: false, error: 'bad_role' };
  if (skin == null || skin === '') { await env.DB.prepare('DELETE FROM user_skins WHERE tg_id = ?1 AND role = ?2').bind(tgId, role).run(); return { ok: true }; }
  if (!isSkin(skin) || SKINS[skin].role !== role) return { ok: false, error: 'bad_skin' };
  if (!(await ownedSkins(env, tgId, admin, extra)).includes(skin)) return { ok: false, error: 'not_owned' };
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
/* ---------- v68: an admin gives skins to a player (and takes his own gifts back) ----------
   a gift is a purchases row (kind 'skin', status 'reward', payload 'admin:<adminId>:<random>'); it is worn at once unless the role
   already has a skin on. Taking back removes only the admins' gifts — a skin bought or won stays with the player. */
export const ADMIN_SKIN_PAYLOAD = 'admin:';
export async function giftedSkins(env, tgId) {
  const rows = (await env.DB.prepare("SELECT DISTINCT item FROM purchases WHERE tg_id = ?1 AND kind = 'skin' AND status IN ('paid', 'reward') AND payload LIKE 'admin:%'").bind(tgId).all()).results || [];
  return rows.map(r => r.item).filter(isSkin);
}
export function giftSkinStmts(env, tgId, skins, adminId, ts, rnd) {
  return skins.filter(isSkin).flatMap((skin, i) => [
    env.DB.prepare("INSERT INTO purchases (tg_id, kind, item, stars, payload, status, created_at, paid_at) VALUES (?1, 'skin', ?2, 0, ?3, 'reward', ?4, ?4)").bind(tgId, skin, `${ADMIN_SKIN_PAYLOAD}${adminId}:${rnd}${i}`, ts),
    env.DB.prepare('INSERT OR IGNORE INTO user_skins (tg_id, role, skin, updated_at) VALUES (?1, ?2, ?3, ?4)').bind(tgId, SKINS[skin].role, skin, ts)
  ]);
}
/* take the admins' gifts of these skins back; a skin the player no longer owns comes off his card */
export async function takeGiftedSkins(env, tgId, skins) {
  skins = skins.filter(isSkin); if (!skins.length) return [];
  await env.DB.batch(skins.map(skin => env.DB.prepare("DELETE FROM purchases WHERE tg_id = ?1 AND kind = 'skin' AND item = ?2 AND payload LIKE 'admin:%'").bind(tgId, skin)));
  const still = await ownedSkins(env, tgId, false); const gone = skins.filter(s => !still.includes(s));
  if (gone.length) await env.DB.batch(gone.map(skin => env.DB.prepare('DELETE FROM user_skins WHERE tg_id = ?1 AND skin = ?2').bind(tgId, skin)));
  return gone;
}
