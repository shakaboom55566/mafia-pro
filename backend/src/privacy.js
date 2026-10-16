/* Privacy (v44): the player's rights in the bot, in five languages.
   /privacy      what we keep + the link to the policy (mafiapro.app/<lang>/privacy/)
   /mydata       a JSON file with everything stored about the player (once an hour)
   /deletedata   delete the player's data after a confirmation button (payments stay as accounting records; game summaries keep
                 the seat as "Игрок" without the Telegram id)
   /unsubscribe  no broadcast messages (/subscribe turns them back on) — broadcast.js skips these players
   /support <t>  a message to the team (forwarded to the admins, 5 a day) */
import { esc } from './tg.js';
import { secEvent } from './security.js';

const now = () => Math.floor(Date.now() / 1000);
const adminIds = env => String(env.ADMIN_IDS || '').split(',').map(x => Number(x.trim())).filter(Boolean);
export function policyUrl(env, lang) {
  let base = 'https://mafiapro.app'; try { if (env.SITE_URL) base = new URL(env.SITE_URL).origin; else if (env.APP_URL) base = new URL(env.APP_URL).origin; } catch (e) {}
  return `${base}/${['ru', 'uk', 'en', 'pl', 'hy'].includes(lang) ? lang : 'en'}/privacy/`;
}
/* broadcast.js: players who asked for no broadcasts are left out */
export const newsOptOutSql = 'tg_id NOT IN (SELECT tg_id FROM user_prefs WHERE no_news = 1)';

const T = {
  ru: {
    privacy: '🔒 <b>Конфиденциальность</b>\nМы храним только то, что нужно для игры: Telegram id, имя и @ник, язык, результаты партий, друзей, клубы и покупки. Данные не продаём и не передаём рекламщикам.\nПолитика конфиденциальности: {url}\n\n/mydata — файл со всеми вашими данными\n/deletedata — удалить свои данные\n/unsubscribe — не получать рассылки (/subscribe — вернуть)\n/support <i>текст</i> — написать команде',
    mydata: 'Ваши данные в Mafia Pro. Политика: {url}', mydataWait: 'Файл уже отправлялся недавно — повторить можно через час.',
    deleteAsk: '⚠️ <b>Удалить ваши данные?</b>\nУдалим профиль, рейтинг и статистику, друзей и заявки, членство в клубах и сообщения в их чатах, места и чат за столами, приглашения, источник прихода, привязку Discord и настройки. В итогах прошлых партий ваше место станет «Игрок» без Telegram id. Ваш клуб, если вы владелец, закроется. Записи об оплатах Telegram Stars сохраняются для учёта, как требует закон; купленное и выданный доступ после удаления пропадут.\nОтменить удаление нельзя.',
    yes: '🗑 Да, удалить', no: 'Отмена', deleted: '✅ Готово: ваши данные удалены. Если снова напишете боту или откроете приложение, появится новый пустой профиль.', cancelled: 'Удаление отменено.',
    unsub: 'Готово: рассылки больше не придут. Вернуть — /subscribe.', sub: 'Рассылки снова включены. Отключить — /unsubscribe.',
    supportUsage: 'Напишите после команды, что случилось: <code>/support текст</code>', supportSent: 'Сообщение передано команде — ответим здесь, в боте.', supportLimit: 'Сегодня уже отправлено 5 сообщений — продолжим завтра.'
  },
  uk: {
    privacy: '🔒 <b>Конфіденційність</b>\nМи зберігаємо лише те, що потрібно для гри: Telegram id, ім’я та @нік, мову, результати партій, друзів, клуби й покупки. Дані не продаємо й не передаємо рекламникам.\nПолітика конфіденційності: {url}\n\n/mydata — файл з усіма вашими даними\n/deletedata — видалити свої дані\n/unsubscribe — не отримувати розсилки (/subscribe — повернути)\n/support <i>текст</i> — написати команді',
    mydata: 'Ваші дані в Mafia Pro. Політика: {url}', mydataWait: 'Файл уже надсилався нещодавно — повторити можна за годину.',
    deleteAsk: '⚠️ <b>Видалити ваші дані?</b>\nВидалимо профіль, рейтинг і статистику, друзів і заявки, членство в клубах і повідомлення в їхніх чатах, місця й чат за столами, запрошення, джерело приходу, прив’язку Discord і налаштування. У підсумках минулих партій ваше місце стане «Гравець» без Telegram id. Ваш клуб, якщо ви власник, закриється. Записи про оплати Telegram Stars зберігаються для обліку, як вимагає закон; придбане й наданий доступ після видалення зникнуть.\nСкасувати видалення неможливо.',
    yes: '🗑 Так, видалити', no: 'Скасувати', deleted: '✅ Готово: ваші дані видалено. Якщо знову напишете боту чи відкриєте застосунок, з’явиться новий порожній профіль.', cancelled: 'Видалення скасовано.',
    unsub: 'Готово: розсилки більше не надходитимуть. Повернути — /subscribe.', sub: 'Розсилки знову ввімкнено. Вимкнути — /unsubscribe.',
    supportUsage: 'Напишіть після команди, що сталося: <code>/support текст</code>', supportSent: 'Повідомлення передано команді — відповімо тут, у боті.', supportLimit: 'Сьогодні вже надіслано 5 повідомлень — продовжимо завтра.'
  },
  en: {
    privacy: '🔒 <b>Privacy</b>\nWe keep only what the game needs: your Telegram id, name and @username, language, game results, friends, clubs and purchases. We never sell your data or share it with advertisers.\nPrivacy policy: {url}\n\n/mydata — a file with all your data\n/deletedata — delete your data\n/unsubscribe — no broadcast messages (/subscribe to turn them back on)\n/support <i>text</i> — write to the team',
    mydata: 'Your data in Mafia Pro. Policy: {url}', mydataWait: 'The file was sent recently — you can ask again in an hour.',
    deleteAsk: '⚠️ <b>Delete your data?</b>\nWe will delete your profile, rating and stats, friends and requests, club memberships and your messages in club chats, table seats and table chat, invitations, where you came from, your Discord link and settings. In past game results your seat becomes “Player” without a Telegram id. If you own a club, it will be closed. Telegram Stars payment records are kept for accounting as the law requires; purchased items and granted access will be gone.\nThis cannot be undone.',
    yes: '🗑 Yes, delete', no: 'Cancel', deleted: '✅ Done: your data has been deleted. If you message the bot or open the app again, a new empty profile will be created.', cancelled: 'Deletion cancelled.',
    unsub: 'Done: no more broadcast messages. To turn them back on — /subscribe.', sub: 'Broadcast messages are on again. To turn them off — /unsubscribe.',
    supportUsage: 'Write what happened after the command: <code>/support text</code>', supportSent: 'Your message has been passed to the team — we will reply here in the bot.', supportLimit: 'You have already sent 5 messages today — let’s continue tomorrow.'
  },
  pl: {
    privacy: '🔒 <b>Prywatność</b>\nPrzechowujemy tylko to, czego potrzebuje gra: Telegram id, imię i @nazwę, język, wyniki gier, znajomych, kluby i zakupy. Nie sprzedajemy danych ani nie przekazujemy ich reklamodawcom.\nPolityka prywatności: {url}\n\n/mydata — plik ze wszystkimi Twoimi danymi\n/deletedata — usuń swoje dane\n/unsubscribe — bez wiadomości masowych (/subscribe — włącz ponownie)\n/support <i>tekst</i> — napisz do zespołu',
    mydata: 'Twoje dane w Mafia Pro. Polityka: {url}', mydataWait: 'Plik był wysłany niedawno — możesz poprosić ponownie za godzinę.',
    deleteAsk: '⚠️ <b>Usunąć Twoje dane?</b>\nUsuniemy profil, ranking i statystyki, znajomych i zaproszenia do znajomych, członkostwo w klubach i Twoje wiadomości w ich czatach, miejsca i czat przy stołach, zaproszenia, źródło wejścia, powiązanie z Discordem i ustawienia. W wynikach dawnych gier Twoje miejsce stanie się „Gracz” bez Telegram id. Jeśli jesteś właścicielem klubu, zostanie on zamknięty. Zapisy płatności Telegram Stars przechowujemy do celów księgowych, zgodnie z prawem; kupione rzeczy i przyznany dostęp znikną.\nTego nie można cofnąć.',
    yes: '🗑 Tak, usuń', no: 'Anuluj', deleted: '✅ Gotowe: Twoje dane zostały usunięte. Jeśli znowu napiszesz do bota lub otworzysz aplikację, powstanie nowy pusty profil.', cancelled: 'Usuwanie anulowane.',
    unsub: 'Gotowe: wiadomości masowe nie będą już przychodzić. Włączyć ponownie — /subscribe.', sub: 'Wiadomości masowe znów włączone. Wyłączyć — /unsubscribe.',
    supportUsage: 'Napisz po komendzie, co się stało: <code>/support tekst</code>', supportSent: 'Wiadomość przekazana zespołowi — odpowiemy tutaj, w bocie.', supportLimit: 'Dziś wysłano już 5 wiadomości — kontynuujmy jutro.'
  },
  hy: {
    privacy: '🔒 <b>Գաղտնիություն</b>\nՄենք պահում ենք միայն այն, ինչ պետք է խաղի համար՝ Telegram id, անուն և @օգտանուն, լեզու, խաղերի արդյունքներ, ընկերներ, ակումբներ և գնումներ։ Տվյալները չենք վաճառում և չենք փոխանցում գովազդատուներին։\nԳաղտնիության քաղաքականություն՝ {url}\n\n/mydata — ֆայլ ձեր բոլոր տվյալներով\n/deletedata — ջնջել ձեր տվյալները\n/unsubscribe — չստանալ զանգվածային հաղորդագրություններ (/subscribe — վերադարձնել)\n/support <i>տեքստ</i> — գրել թիմին',
    mydata: 'Ձեր տվյալները Mafia Pro-ում։ Քաղաքականություն՝ {url}', mydataWait: 'Ֆայլը վերջերս արդեն ուղարկվել է — կրկին կարող եք խնդրել մեկ ժամից։',
    deleteAsk: '⚠️ <b>Ջնջե՞լ ձեր տվյալները</b>\nԿջնջենք պրոֆիլը, վարկանիշն ու վիճակագրությունը, ընկերներին և հայտերը, ակումբների անդամությունը և ձեր հաղորդագրությունները դրանց չաթերում, սեղանների տեղերն ու չաթը, հրավերները, թե որտեղից եք եկել, Discord-ի կապը և կարգավորումները։ Նախկին խաղերի արդյունքներում ձեր տեղը կդառնա «Խաղացող»՝ առանց Telegram id-ի։ Եթե ակումբի տերն եք, այն կփակվի։ Telegram Stars վճարումների գրառումները պահվում են հաշվառման համար, ինչպես պահանջում է օրենքը. գնվածը և տրված հասանելիությունը կվերանան։\nՋնջումը հնարավոր չէ չեղարկել։',
    yes: '🗑 Այո, ջնջել', no: 'Չեղարկել', deleted: '✅ Պատրաստ է. ձեր տվյալները ջնջված են։ Եթե կրկին գրեք բոտին կամ բացեք հավելվածը, կստեղծվի նոր դատարկ պրոֆիլ։', cancelled: 'Ջնջումը չեղարկվեց։',
    unsub: 'Պատրաստ է. զանգվածային հաղորդագրություններ այլևս չեն գա։ Վերադարձնել՝ /subscribe։', sub: 'Զանգվածային հաղորդագրությունները կրկին միացված են։ Անջատել՝ /unsubscribe։',
    supportUsage: 'Հրամանից հետո գրեք, թե ինչ է պատահել՝ <code>/support տեքստ</code>', supportSent: 'Հաղորդագրությունը փոխանցվեց թիմին — կպատասխանենք այստեղ՝ բոտում։', supportLimit: 'Այսօր արդեն ուղարկվել է 5 հաղորդագրություն — շարունակենք վաղը։'
  }
};
const HELP = { ru: '🔒 /privacy — конфиденциальность и ваши данные · /support — написать команде', uk: '🔒 /privacy — конфіденційність і ваші дані · /support — написати команді', en: '🔒 /privacy — privacy and your data · /support — write to the team', pl: '🔒 /privacy — prywatność i Twoje dane · /support — napisz do zespołu', hy: '🔒 /privacy — գաղտնիություն և ձեր տվյալները · /support — գրել թիմին' };
export const privacyHelp = lang => HELP[lang] || HELP.en;
const tx = (lang, k, vars) => { const s = (T[lang] || T.en)[k] || T.ru[k] || ''; return s.replace(/\{(\w+)\}/g, (m, v) => (vars && vars[v] != null ? vars[v] : m)); };
async function prefs(env, id) { return env.DB.prepare('SELECT * FROM user_prefs WHERE tg_id = ?1').bind(id).first(); }
async function setPref(env, id, col, val) { // col is one of the fixed names below, never user input
  if (!['no_news', 'support_day', 'support_n', 'export_at'].includes(col)) throw new Error('pref');
  await env.DB.prepare(`INSERT INTO user_prefs (tg_id, ${col}, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(tg_id) DO UPDATE SET ${col} = ?2, updated_at = ?3`).bind(id, val, now()).run();
}

/* everything stored about one player (for /mydata) */
export async function exportUser(env, id) {
  const all = async (sql, ...a) => (await env.DB.prepare(sql).bind(...a).all()).results || [];
  const one = (sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const games = (await all("SELECT game_id, code, mode, players, winner, summary, created_at FROM games WHERE summary LIKE ?1 ORDER BY created_at DESC LIMIT 500", '%"tgId":' + id + ',%')).map(g => {
    let me = null; try { me = (JSON.parse(g.summary || '[]') || []).find(p => Number(p.tgId) === id) || null; } catch (e) {}
    return { game: g.game_id, at: new Date(g.created_at * 1000).toISOString(), mode: g.mode, players: g.players, winner: g.winner, me };
  });
  const out = {
    exportedAt: new Date().toISOString(), telegramId: id,
    profile: await one('SELECT username, first_name, last_name, lang, photo_url, created_at, seen_at FROM users WHERE tg_id = ?1', id),
    city: await one('SELECT city, updated_at FROM user_cities WHERE tg_id = ?1', id),
    country: await one('SELECT country, updated_at FROM user_countries WHERE tg_id = ?1', id), // v75: the profile's country (pre-filled from the network at the first open)
    settings: await one('SELECT no_news, updated_at FROM user_prefs WHERE tg_id = ?1', id),
    rating: await one('SELECT points, games, wins, hosted, updated_at FROM ratings WHERE tg_id = ?1', id),
    rankAnnounced: await one('SELECT best, host, updated_at FROM rank_best WHERE tg_id = ?1', id), // v54: the highest rank / host badge the bot congratulated on
    seasonBest: await all('SELECT season, peak, peak_at FROM season_peak WHERE tg_id = ?1 ORDER BY season', id), // v55: the best rating of each season (raw points)
    seasons: await all('SELECT season, points, games, wins, peak, created_at FROM season_results WHERE tg_id = ?1 ORDER BY season', id), // v55: standings at the end of each season
    gamesPlayed: games,
    gamesHosted: await all('SELECT game_id, code, mode, players, winner, created_at FROM games WHERE host_id = ?1 ORDER BY created_at DESC LIMIT 500', id),
    friends: await all('SELECT friend_id, created_at FROM friends WHERE tg_id = ?1', id),
    friendRequests: await all('SELECT from_id, to_id, status, created_at FROM friend_requests WHERE from_id = ?1 OR to_id = ?1', id),
    inviteCode: await one('SELECT code, created_at FROM invites WHERE tg_id = ?1', id),
    referral: await one('SELECT ref_by, code, created_at, qualified_at FROM referrals WHERE tg_id = ?1', id),
    invited: await all('SELECT tg_id, created_at, qualified_at FROM referrals WHERE ref_by = ?1', id),
    rewards: { credits: await all('SELECT kind, count FROM credits WHERE tg_id = ?1', id), milestones: await all('SELECT level, created_at FROM milestones WHERE tg_id = ?1', id), access: await one('SELECT until, created_at FROM grants WHERE tg_id = ?1', id) },
    purchases: await all('SELECT kind, item, stars, status, charge_id, created_at, paid_at FROM purchases WHERE tg_id = ?1', id),
    skinsWorn: await all('SELECT role, skin, updated_at FROM user_skins WHERE tg_id = ?1', id), // v56: the card skins put on
    skinSerials: await all('SELECT skin, serial, created_at FROM skin_serials WHERE tg_id = ?1', id), // v69: the numbers of the numbered copies
    emeralds: await one('SELECT balance, updated_at FROM emeralds WHERE tg_id = ?1', id), // v63: the in-game currency and every change to it
    emeraldLedger: await all('SELECT delta, kind, ref, created_at FROM emerald_ledger WHERE tg_id = ?1 ORDER BY id DESC LIMIT 1000', id),
    tournaments: await all('SELECT t.week, p.role, p.status, p.points, p.games, p.wins, p.place, p.prize, p.registered_at FROM tournament_players p JOIN tournaments t ON t.id = p.tid WHERE p.tg_id = ?1 ORDER BY t.opens_at', id), // v63: weekly tournaments
    partner: await one('SELECT status, name, channel, audience, share, created_at, approved_at FROM partners WHERE tg_id = ?1', id),
    payouts: await all('SELECT stars, note, created_at FROM payouts WHERE tg_id = ?1', id),
    clubsOwned: await all('SELECT id, name, city, about, link, status, created_at FROM clubs WHERE owner_id = ?1', id),
    clubMemberships: await all('SELECT club_id, role, joined_at FROM club_members WHERE tg_id = ?1', id),
    clubRequests: await all('SELECT club_id, kind, status, created_at FROM club_requests WHERE tg_id = ?1', id),
    clubMessages: await all('SELECT club_id, kind, text, created_at FROM club_messages WHERE tg_id = ?1 ORDER BY id DESC LIMIT 1000', id),
    tablesHosted: await all('SELECT code, status, created_at FROM lobbies WHERE host_id = ?1 ORDER BY created_at DESC LIMIT 200', id),
    tableSeats: await all('SELECT code, name, username, lang, joined_at FROM lobby_players WHERE tg_id = ?1', id),
    tableChat: await all('SELECT code, name, text, created_at FROM table_chat WHERE tg_id = ?1 ORDER BY id DESC LIMIT 1000', id),
    tableInvites: await all('SELECT code, tg_id, from_id, kind, status, created_at FROM table_invites WHERE tg_id = ?1 OR from_id = ?1', id),
    cameFrom: await one('SELECT source, detail, param, game_name, game_at, created_at FROM player_track WHERE tg_id = ?1', id),
    trackedLinks: await all('SELECT param, is_new, hits, first_at, last_at FROM start_hits WHERE tg_id = ?1', id),
    adClicks: await all('SELECT src, ad_id, ip, ua, fbc, fbp, is_new, lead_sent, created_at, started_at FROM ad_clicks WHERE tg_id = ?1', id), // Meta ads (ads.js): match data erased after 7 days
    discord: await all('SELECT user_id, username, display, status, joined_at, left_at FROM discord_members WHERE tg_id = ?1', id),
    broadcastsReceived: await all('SELECT bid, status, at FROM broadcast_queue WHERE tg_id = ?1', id),
    securityEvents30d: await all('SELECT at, type, path, country FROM security_events WHERE tg_id = ?1 ORDER BY id DESC LIMIT 500', id)
  };
  return out;
}
/* delete one player's data (see deleteAsk for what stays) */
export async function deleteUser(env, id) {
  const st = sql => env.DB.prepare(sql).bind(id);
  // game summaries: the seat stays (other players' results), without the Telegram id and with a neutral name
  const games = (await env.DB.prepare('SELECT id, summary FROM games WHERE summary LIKE ?1 LIMIT 3000').bind('%"tgId":' + id + ',%').all()).results || [];
  const upd = [];
  for (const g of games) { let arr = null; try { arr = JSON.parse(g.summary || '[]'); } catch (e) { continue; } if (!Array.isArray(arr)) continue; for (const p of arr) if (p && Number(p.tgId) === id) { p.tgId = null; p.name = 'Игрок'; } upd.push(env.DB.prepare('UPDATE games SET summary = ?1 WHERE id = ?2').bind(JSON.stringify(arr), g.id)); }
  const clubs = (await env.DB.prepare('SELECT id FROM clubs WHERE owner_id = ?1').bind(id).all()).results || [];
  const list = [
    ...upd,
    ...clubs.map(c => env.DB.prepare("UPDATE clubs SET status = 'closed', owner_id = 0, logo = '' WHERE id = ?1").bind(c.id)),
    ...clubs.map(c => env.DB.prepare('DELETE FROM club_members WHERE club_id = ?1').bind(c.id)),
    st('UPDATE games SET host_id = 0 WHERE host_id = ?1'),
    st("UPDATE lobbies SET status = 'closed' WHERE host_id = ?1 AND status IN ('open', 'dealt', 'live')"),
    st('UPDATE lobbies SET host_id = 0 WHERE host_id = ?1'),
    st('DELETE FROM lobby_meta WHERE creator_id = ?1'),
    st('DELETE FROM lobby_players WHERE tg_id = ?1'), st('DELETE FROM table_actions WHERE tg_id = ?1'), st('DELETE FROM table_chat WHERE tg_id = ?1'),
    st('DELETE FROM table_invites WHERE tg_id = ?1 OR from_id = ?1'), st('DELETE FROM table_seen WHERE tg_id = ?1'), st('DELETE FROM table_voice_ok WHERE tg_id = ?1'),
    st('DELETE FROM friends WHERE tg_id = ?1 OR friend_id = ?1'), st('DELETE FROM friend_requests WHERE from_id = ?1 OR to_id = ?1'),
    st('DELETE FROM invites WHERE tg_id = ?1'), st('DELETE FROM referrals WHERE tg_id = ?1'), st('UPDATE referrals SET ref_by = 0 WHERE ref_by = ?1'),
    st('DELETE FROM credits WHERE tg_id = ?1'), st('DELETE FROM milestones WHERE tg_id = ?1'), st('DELETE FROM grants WHERE tg_id = ?1'),
    st('DELETE FROM ratings WHERE tg_id = ?1'), st('DELETE FROM rank_best WHERE tg_id = ?1'), st('DELETE FROM season_peak WHERE tg_id = ?1'), st('DELETE FROM season_results WHERE tg_id = ?1'), st('DELETE FROM partners WHERE tg_id = ?1'),
    env.DB.prepare("DELETE FROM discord_cfg WHERE key = 'lb:top'"), // the cached leaderboard is rebuilt without this player
    st('DELETE FROM club_members WHERE tg_id = ?1'), st('DELETE FROM club_requests WHERE tg_id = ?1'), st('DELETE FROM club_messages WHERE tg_id = ?1'),
    st('DELETE FROM user_cities WHERE tg_id = ?1'), st('DELETE FROM user_countries WHERE tg_id = ?1'), st('DELETE FROM player_track WHERE tg_id = ?1'), st('DELETE FROM start_hits WHERE tg_id = ?1'), st('DELETE FROM ad_clicks WHERE tg_id = ?1'),
    st('DELETE FROM broadcast_queue WHERE tg_id = ?1'), st('UPDATE discord_members SET tg_id = NULL WHERE tg_id = ?1'), st('UPDATE discord_members SET inviter_tg = NULL WHERE inviter_tg = ?1'),
    st('UPDATE discord_invites SET tg_id = NULL WHERE tg_id = ?1'), st('UPDATE discord_events SET inviter_tg = NULL WHERE inviter_tg = ?1'),
    st('UPDATE security_events SET tg_id = NULL WHERE tg_id = ?1'), st('DELETE FROM user_prefs WHERE tg_id = ?1'), st('DELETE FROM user_skins WHERE tg_id = ?1'), st('DELETE FROM skin_serials WHERE tg_id = ?1'),
    st('DELETE FROM emeralds WHERE tg_id = ?1'), st('DELETE FROM emerald_ledger WHERE tg_id = ?1'), st('DELETE FROM tournament_players WHERE tg_id = ?1'), st('UPDATE tournament_tables SET host_id = NULL WHERE host_id = ?1'), // v63
    st('DELETE FROM users WHERE tg_id = ?1')
  ];
  if (env.DB.batch) { for (let i = 0; i < list.length; i += 50) await env.DB.batch(list.slice(i, i + 50)); } else for (const s of list) await s.run();
  return { games: games.length, clubs: clubs.length };
}

/* an admin answers a /support message by replying to it in the bot: the answer goes to the player */
const REPLY = { ru: '💬 <b>Ответ команды Mafia Pro</b>', uk: '💬 <b>Відповідь команди Mafia Pro</b>', en: '💬 <b>Reply from the Mafia Pro team</b>', pl: '💬 <b>Odpowiedź zespołu Mafia Pro</b>', hy: '💬 <b>Mafia Pro թիմի պատասխանը</b>' };
export async function onSupportReply(env, bot, msg) {
  const r = msg.reply_to_message; const text = String(msg.text || '').trim();
  if (!r || !text || text.startsWith('/') || !/^📮 Поддержка/.test(String(r.text || ''))) return false;
  const m = /· (\d{1,15}) · [a-z]{2,3}$/.exec(String(r.text || '').split('\n')[0]); if (!m) return false; // the id ends the first line (a name cannot fake it)
  const to = Number(m[1]); const u = await env.DB.prepare('SELECT lang FROM users WHERE tg_id = ?1').bind(to).first();
  const lang = u && REPLY[String(u.lang || '').slice(0, 2)] ? String(u.lang).slice(0, 2) : (u && u.lang === 'be' ? 'ru' : 'en');
  const res = await bot.send(to, `${REPLY[lang] || REPLY.en}\n${esc(text.slice(0, 3500))}`);
  await bot.send(msg.chat.id, res && res.ok ? '✅ Ответ отправлен игроку.' : `⚠️ Не доставлено: ${esc((res && res.description) || 'ошибка')}`);
  return true;
}

/* bot commands; returns true when the message was handled */
export async function onPrivacyText(env, bot, msg, lang) {
  const text = String(msg.text || '').trim(); const u = msg.from || {}; const chat = msg.chat.id;
  const cmd = (/^\/([a-z]+)(?:@\w+)?(?:\s|$)/.exec(text) || [])[1];
  if (!cmd || !['privacy', 'mydata', 'deletedata', 'unsubscribe', 'subscribe', 'support', 'stop'].includes(cmd)) return false;
  const url = policyUrl(env, lang);
  if (cmd === 'privacy') { await bot.send(chat, tx(lang, 'privacy', { url })); return true; }
  if (cmd === 'mydata') {
    const p = await prefs(env, u.id); if (p && p.export_at && now() - p.export_at < 3600) { await bot.send(chat, tx(lang, 'mydataWait')); return true; }
    await setPref(env, u.id, 'export_at', now());
    const data = await exportUser(env, u.id);
    await bot.sendDocument(chat, `mafia-pro-my-data-${u.id}.json`, new TextEncoder().encode(JSON.stringify(data, null, 2)), tx(lang, 'mydata', { url: esc(url) }), 'application/json');
    secEvent(env, 'privacy_export', 'info', { tg: u.id }); return true;
  }
  if (cmd === 'deletedata') { await bot.send(chat, tx(lang, 'deleteAsk'), { reply_markup: { inline_keyboard: [[{ text: tx(lang, 'yes'), callback_data: 'pv_del_yes' }, { text: tx(lang, 'no'), callback_data: 'pv_del_no' }]] } }); return true; }
  if (cmd === 'unsubscribe' || cmd === 'stop') { await setPref(env, u.id, 'no_news', 1); await bot.send(chat, tx(lang, 'unsub')); return true; }
  if (cmd === 'subscribe') { await setPref(env, u.id, 'no_news', 0); await bot.send(chat, tx(lang, 'sub')); return true; }
  if (cmd === 'support') {
    const body = text.replace(/^\/support(?:@\w+)?\s*/, '').trim(); if (!body) { await bot.send(chat, tx(lang, 'supportUsage')); return true; }
    const day = Math.floor(now() / 86400); const p = await prefs(env, u.id); const n = p && p.support_day === day ? p.support_n : 0;
    if (n >= 5) { await bot.send(chat, tx(lang, 'supportLimit')); return true; }
    await setPref(env, u.id, 'support_day', day); await setPref(env, u.id, 'support_n', n + 1);
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || String(u.id);
    for (const adm of adminIds(env)) { try { await bot.send(adm, `📮 <b>Поддержка</b> · <a href="tg://user?id=${Number(u.id)}">${esc(name)}</a>${u.username ? ' @' + esc(u.username) : ''} · <code>${Number(u.id)}</code> · ${esc(lang)}\n${esc(body.slice(0, 3000))}`); } catch (e) {} }
    await bot.send(chat, tx(lang, 'supportSent')); return true;
  }
  return false;
}
export async function onPrivacyCallback(env, bot, q, lang) {
  const d = String(q.data || ''); if (d !== 'pv_del_yes' && d !== 'pv_del_no') return false;
  const u = q.from || {};
  if (d === 'pv_del_no') { await bot.call('answerCallbackQuery', { callback_query_id: q.id }); if (q.message) await bot.call('editMessageText', { chat_id: q.message.chat.id, message_id: q.message.message_id, text: tx(lang, 'cancelled') }); return true; }
  const r = await deleteUser(env, u.id);
  secEvent(env, 'privacy_delete', 'info', { detail: { games: r.games, clubs: r.clubs } }); // no id: the account is gone
  await bot.call('answerCallbackQuery', { callback_query_id: q.id });
  if (q.message) await bot.call('editMessageText', { chat_id: q.message.chat.id, message_id: q.message.message_id, text: tx(lang, 'deleted') });
  return true;
}
