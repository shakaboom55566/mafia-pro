/* Broadcast to every player (admins only): a message in each player's language, with buttons to the channel, the players' chat and the game.
   - /broadcast              the built-in invitation to the news channel (CHANNEL_ID) and the players' chat (CHAT_URL)
   - /broadcast <text>       an own text (bold, italic, links kept), the same for everyone, with the same buttons
   Flow: the admin first gets the message exactly as players will see it (one sample per language that has recipients)
   and a control card with the number of recipients → "✅ Разослать" starts it, "✖️ Отмена" drops it.
   Sending goes in portions from the every-minute cron (BROADCAST_BATCH per minute, 30 by default: well under Telegram's
   limits and the Worker's subrequest cap), each player at most once per broadcast; the control card shows progress and
   has "⏸ Остановить" / "▶️ Продолжить". Recipients: everyone in `users` (opened the bot or the app) except the admins.
   Players who blocked the bot, or never started a chat with it, are counted as unreachable.
   v86 — one city only: `/broadcast город:Днепр <text>` (also місто: / city: / miasto:; «Кривой Рог» or Кривой_Рог for two words)
   goes to the players whose profile city (user_cities: set by the player or from the network) is that city under one key
   however it is written (cities.js: Днепр = Дніпро = Dnipro = Днепропетровск). The city is kept in broadcast_targets. */
import { esc } from './tg.js';
import { newsOptOutSql } from './privacy.js';
import { pickLang } from './texts.js';
import { entitiesToHtml } from './posts.js';
import { cityKey, cityLabel } from './cities.js';

const now = () => Math.floor(Date.now() / 1000);
const adminIds = env => String(env.ADMIN_IDS || '').split(',').map(x => Number(x.trim())).filter(Boolean);
const FLAG = { uk: '🇺🇦 укр', ru: 'рус', en: '🇬🇧 eng', pl: '🇵🇱 pol', hy: '🇦🇲 hye' };
const LANG_ORDER = ['uk', 'ru', 'en', 'pl', 'hy'];
const DEFAULT_CHAT = 'https://t.me/+3kRZICcUMyBjZDdi';
const MAX_TEXT = 3500;

export const channelUrl = env => { const c = String(env.CHANNEL_ID || '@mafiaprof').trim(); return /^@\w{4,}$/.test(c) ? 'https://t.me/' + c.slice(1) : 'https://t.me/mafiaprof'; };
export const chatUrl = env => { const c = String(env.CHAT_URL || DEFAULT_CHAT).trim(); return /^https:\/\/t\.me\/\S{3,120}$/.test(c) ? c : DEFAULT_CHAT; };
const batchSize = env => Math.max(1, Math.min(200, Number(env.BROADCAST_BATCH) || 30));

/* the built-in invitation, per language: {channel} and {chat} are the links. Main goal — subscribe to the channel;
   the players' chat is the second step. Keep the "fresh" line current before reusing (it names the latest news). */
const INVITE = {
  ru: `📣 <b>У Mafia Pro появился свой канал</b>

Два коротких поста в день о том, что происходит в игре и за столом:

🃏 роль дня: что умеет, когда просыпается, против кого слаба;
🧩 ситуации за столом — ответ под спойлером, проверьте себя;
🎩 советы ведущим и правила классики с примерами;
🆕 обновления — первыми узнаёте о новых ролях, сценариях и функциях.

Из свежего: в игре появился раздел «Для новичков» — 90 готовых составов на 7–24 игрока и ни одного мирного жителя, у каждого своя роль.

👉 Подписывайтесь: <a href="{channel}">@mafiaprof</a>

💬 Ищете, с кем сыграть? Заходите в <a href="{chat}">чат игроков</a> — там собирают столы на вечер.`,
  uk: `📣 <b>У Mafia Pro з’явився свій канал</b>

Два короткі пости на день про те, що відбувається в грі та за столом:

🃏 роль дня: що вміє, коли прокидається, проти кого слабка;
🧩 ситуації за столом — відповідь під спойлером, перевірте себе;
🎩 поради ведучим і правила класики з прикладами;
🆕 оновлення — першими дізнаєтеся про нові ролі, сценарії та функції.

Зі свіжого: у грі з’явився розділ «Для новачків» — 90 готових складів на 7–24 гравців і жодного мирного жителя, у кожного своя роль.

👉 Підписуйтеся: <a href="{channel}">@mafiaprof</a>

💬 Шукаєте, з ким зіграти? Заходьте в <a href="{chat}">чат гравців</a> — там збирають столи на вечір.`,
  en: `📣 <b>Mafia Pro now has its own channel</b>

Two short posts a day about what happens in the game and at the table:

🃏 role of the day: what it does, when it wakes up, what it is weak against;
🧩 table situations — the answer under a spoiler, test yourself;
🎩 tips for hosts and classic rules with examples;
🆕 updates — be the first to hear about new roles, scenarios and features.

Fresh: the game now has a “For beginners” section — 90 ready line-ups for 7–24 players and not a single Citizen: everyone gets a role.

Posts are in Ukrainian and Russian.

👉 Join: <a href="{channel}">@mafiaprof</a>

💬 Looking for people to play with? Come to the <a href="{chat}">players’ chat</a> — tables for tonight get together there.`,
  pl: `📣 <b>Mafia Pro ma teraz własny kanał</b>

Dwa krótkie posty dziennie o tym, co dzieje się w grze i przy stole:

🃏 rola dnia: co potrafi, kiedy się budzi, z kim sobie nie radzi;
🧩 sytuacje przy stole — odpowiedź pod spoilerem, sprawdź się;
🎩 porady dla prowadzących i zasady klasyki z przykładami;
🆕 aktualizacje — jako pierwszy dowiesz się o nowych rolach, scenariuszach i funkcjach.

Nowość: w grze pojawiła się sekcja „Dla początkujących” — 90 gotowych składów na 7–24 graczy i ani jednego Mieszkańca: każdy dostaje swoją rolę.

Posty są po ukraińsku i rosyjsku.

👉 Dołącz: <a href="{channel}">@mafiaprof</a>

💬 Szukasz ludzi do gry? Wpadnij na <a href="{chat}">czat graczy</a> — tam zbierają się stoły na wieczór.`,
  hy: `📣 <b>Mafia Pro-ն այժմ ունի իր ալիքը</b>

Օրական երկու կարճ գրառում խաղի և սեղանի շուրջ կատարվողի մասին․

🃏 օրվա դերը՝ ինչ է անում, երբ է արթնանում, ում դեմ է թույլ;
🧩 իրավիճակներ սեղանի շուրջ՝ պատասխանը սփոյլերի տակ, ստուգեք ինքներդ ձեզ;
🎩 խորհուրդներ վարողներին և դասական խաղի կանոններ՝ օրինակներով;
🆕 թարմացումներ՝ առաջինը կիմանաք նոր դերերի, սցենարների և հնարավորությունների մասին։

Թարմ նորություն․ խաղում հայտնվեց «Սկսնակների համար» բաժինը՝ 90 պատրաստի կազմ 7–24 խաղացողի համար, և ոչ մի խաղաղ բնակիչ․ յուրաքանչյուրն ունի իր դերը։

Գրառումները ուկրաիներեն և ռուսերեն են։

👉 Բաժանորդագրվեք՝ <a href="{channel}">@mafiaprof</a>

💬 Փնտրո՞ւմ եք, ում հետ խաղալ։ Միացեք <a href="{chat}">խաղացողների չատին</a>՝ այնտեղ հավաքում են սեղաններ երեկոյի համար։`
};
const BTN = {
  ru: { channel: '📣 Подписаться на канал', chat: '💬 Чат игроков', play: '🎲 Играть' },
  uk: { channel: '📣 Підписатися на канал', chat: '💬 Чат гравців', play: '🎲 Грати' },
  en: { channel: '📣 Join the channel', chat: '💬 Players’ chat', play: '🎲 Play' },
  pl: { channel: '📣 Dołącz do kanału', chat: '💬 Czat graczy', play: '🎲 Graj' },
  hy: { channel: '📣 Բաժանորդագրվել ալիքին', chat: '💬 Խաղացողների չատ', play: '🎲 Խաղալ' }
};

/* the message one player gets: text + buttons, in their language */
export function messageFor(env, b, lang) {
  const l = BTN[lang] ? lang : 'ru';
  const fill = s => s.replace(/\{channel\}/g, channelUrl(env)).replace(/\{chat\}/g, chatUrl(env));
  const text = b.kind === 'invite' ? fill(INVITE[l]) : b.text;
  // the channel gets a full-width first row: it is the main call to action; chat and play share the second row
  const row2 = [{ text: BTN[l].chat, url: chatUrl(env) }];
  if (env.APP_URL) row2.push({ text: BTN[l].play, web_app: { url: env.APP_URL } });
  const kb = [[{ text: BTN[l].channel, url: channelUrl(env) }], row2];
  return { text, extra: { reply_markup: { inline_keyboard: kb } } };
}

const row = (env, id) => env.DB.prepare('SELECT * FROM broadcasts WHERE id = ?1').bind(id).first();
const active = env => env.DB.prepare("SELECT * FROM broadcasts WHERE status IN ('sending', 'stopped') ORDER BY id DESC LIMIT 1").first();
/* recipients: everyone except admins and players who chose /unsubscribe (privacy.js) */
function notAdmins(env) { const ids = adminIds(env); return ids.length ? { sql: ` WHERE tg_id NOT IN (${ids.map((_, i) => '?' + (i + 1)).join(',')}) AND ${newsOptOutSql}`, args: ids } : { sql: ` WHERE ${newsOptOutSql}`, args: [] }; }
/* v86: the city of a broadcast (null = everyone) and the players of that city: [{ tg_id, lang }] */
const CITY_RE = /^(?:город|місто|city|miasto)\s*[:=]\s*(?:«([^»]{1,48})»|(\S{1,48}))\s*/i;
const targetOf = (env, id) => env.DB.prepare('SELECT city_key, city_name FROM broadcast_targets WHERE bid = ?1').bind(id).first();
async function cityRecipients(env, key) {
  const w = notAdmins(env);
  const rows = (await env.DB.prepare(`SELECT tg_id, lang, (SELECT city FROM user_cities c WHERE c.tg_id = users.tg_id) AS city FROM users${w.sql} AND tg_id IN (SELECT tg_id FROM user_cities WHERE city IS NOT NULL AND city != '')`).bind(...w.args).all()).results || [];
  return rows.filter(r => cityKey(r.city) === key).map(r => ({ tg_id: r.tg_id, lang: r.lang }));
}
/* recipients by language (after pickLang) */
async function audience(env, t) {
  if (t) { const by = {}; const list = await cityRecipients(env, t.city_key); for (const r of list) { const l = pickLang(r.lang); by[l] = (by[l] || 0) + 1; } return { by, total: list.length }; }
  const w = notAdmins(env);
  const rows = (await env.DB.prepare(`SELECT lang, COUNT(*) AS n FROM users${w.sql} GROUP BY lang`).bind(...w.args).all()).results || [];
  const by = {}; let total = 0;
  for (const r of rows) { const l = pickLang(r.lang); by[l] = (by[l] || 0) + r.n; total += r.n; }
  return { by, total };
}
async function counts(env, id) {
  const rows = (await env.DB.prepare('SELECT status, COUNT(*) AS n FROM broadcast_queue WHERE bid = ?1 GROUP BY status').bind(id).all()).results || [];
  const c = { pending: 0, sent: 0, blocked: 0, failed: 0 }; for (const r of rows) c[r.status] = (c[r.status] || 0) + r.n;
  c.total = c.pending + c.sent + c.blocked + c.failed; return c;
}
const byLine = by => LANG_ORDER.filter(l => by[l]).map(l => `${FLAG[l]} ${by[l]}`).join(' · ');
const minutes = (n, env) => Math.max(1, Math.ceil(n / batchSize(env)));

function controlCard(env, b, c, aud, t) {
  const what = (b.kind === 'invite' ? 'приглашение в канал и чат' : 'ваш текст') + (t ? ` · 📍 ${esc(t.city_name)}` : '');
  if (b.status === 'preview') return `📣 <b>${t ? `Рассылка игрокам из города ${esc(t.city_name)}` : 'Рассылка всем игрокам'}</b> · ${what}\n\nПолучат: <b>${aud.total}</b> ${aud.total ? `(${byLine(aud.by)})` : ''}${t ? '\nГород — из профиля игрока (сам указал или определён по сети).' : ''}\nВыше — сообщение так, как его увидят игроки: каждый на своём языке, с кнопками канала, чата и игры.\nОтправка порциями по ${batchSize(env)} в минуту — около ${minutes(aud.total, env)} мин.\n\nРазослать?`;
  const prog = `Доставлено: <b>${c.sent}</b> из ${c.total}${c.blocked ? ` · недоступны (бот заблокирован или чат не начат): ${c.blocked}` : ''}${c.failed ? ` · ошибок: ${c.failed}` : ''}`;
  if (b.status === 'sending') return `📤 <b>Идёт рассылка</b> · ${what}\n\n${prog}\nОсталось: ${c.pending} — около ${minutes(c.pending, env)} мин.${b.error ? `\n⚠️ ${esc(b.error)}` : ''}`;
  if (b.status === 'stopped') return `⏸ <b>Рассылка остановлена</b> · ${what}\n\n${prog}\nОсталось: ${c.pending}.`;
  if (b.status === 'done') return `✅ <b>Рассылка завершена</b> · ${what}\n\n${prog}`;
  return `✖️ <b>Рассылка отменена</b> · ${what}`;
}
function controlButtons(b, total) {
  if (b.status === 'preview') return { inline_keyboard: [[{ text: `✅ Разослать${total ? ' ' + total : ''}`, callback_data: `bc_go_${b.id}` }, { text: '✖️ Отмена', callback_data: `bc_cancel_${b.id}` }]] };
  if (b.status === 'sending') return { inline_keyboard: [[{ text: '⏸ Остановить', callback_data: `bc_stop_${b.id}` }]] };
  if (b.status === 'stopped') return { inline_keyboard: [[{ text: '▶️ Продолжить', callback_data: `bc_go_${b.id}` }, { text: '✖️ Завершить', callback_data: `bc_cancel_${b.id}` }]] };
  return { inline_keyboard: [] };
}
async function refresh(env, bot, b) {
  if (!b.admin_chat || !b.admin_msg) return;
  const t = await targetOf(env, b.id);
  const c = await counts(env, b.id); const aud = b.status === 'preview' ? await audience(env, t) : null;
  await bot.call('editMessageText', { chat_id: b.admin_chat, message_id: b.admin_msg, text: controlCard(env, b, c, aud, t), parse_mode: 'HTML', reply_markup: controlButtons(b, aud && aud.total), link_preview_options: { is_disabled: true } });
}

/* /broadcast [text] from an admin */
export async function onBroadcastCommand(env, bot, msg) {
  const chat = msg.chat.id;
  const busy = await active(env);
  if (busy) { // one broadcast at a time: show the running one instead
    const c = await counts(env, busy.id);
    const r = await bot.send(chat, controlCard(env, busy, c, null, await targetOf(env, busy.id)), { reply_markup: controlButtons(busy) });
    if (r && r.ok) await env.DB.prepare('UPDATE broadcasts SET admin_chat = ?1, admin_msg = ?2 WHERE id = ?3').bind(chat, r.result.message_id, busy.id).run();
    return;
  }
  let html = entitiesToHtml(msg.text || '', msg.entities || []).replace(/^\/broadcast(?:@\w+)?\s*/, '').trim();
  let t = null; const cm = CITY_RE.exec(html); // v86: one city only
  if (cm) {
    const key = cityKey(cm[1] || cm[2]); html = html.slice(cm[0].length).trim();
    if (!key) return bot.send(chat, 'Не понял город. Пример: /broadcast город:Днепр Сегодня в 18:00 играем');
    t = { city_key: key, city_name: cityLabel(key, 'ru') };
    if (!(await cityRecipients(env, key)).length) return bot.send(chat, `В городе ${esc(t.city_name)} пока нет игроков, которым бот может написать: город берётся из профиля игрока (или по сети). Рассылка не создана.`);
  }
  if (html.length > MAX_TEXT) return bot.send(chat, `Слишком длинный текст: ${html.length} знаков, можно до ${MAX_TEXT}.`);
  const kind = html ? 'custom' : 'invite';
  await env.DB.prepare("UPDATE broadcasts SET status = 'cancelled' WHERE status = 'preview'").run();
  const ins = await env.DB.prepare("INSERT INTO broadcasts (kind, text, status, created_by, created_at) VALUES (?1, ?2, 'preview', ?3, ?4)").bind(kind, html || null, msg.from.id, now()).run();
  const b = await row(env, ins.meta.last_row_id);
  if (t) await env.DB.prepare('INSERT OR REPLACE INTO broadcast_targets (bid, city_key, city_name) VALUES (?1, ?2, ?3)').bind(b.id, t.city_key, t.city_name).run();
  const aud = await audience(env, t);
  const langs = kind === 'invite' ? (LANG_ORDER.filter(l => aud.by[l]).length ? LANG_ORDER.filter(l => aud.by[l]) : ['ru']) : [pickLang(msg.from.language_code)];
  for (const l of langs) { // samples exactly as players get them
    const m = messageFor(env, b, l);
    const r = await bot.send(chat, m.text, m.extra);
    if (!(r && r.ok)) return bot.send(chat, `Telegram не принял сообщение: ${esc((r && r.description) || 'нет ответа')}. Проверьте разметку и попробуйте снова.`);
  }
  const r = await bot.send(chat, controlCard(env, b, null, aud, t), { reply_markup: controlButtons(b, aud.total) });
  if (r && r.ok) await env.DB.prepare('UPDATE broadcasts SET admin_chat = ?1, admin_msg = ?2 WHERE id = ?3').bind(chat, r.result.message_id, b.id).run();
}

/* bc_go / bc_stop / bc_cancel buttons; returns true when handled */
export async function onBroadcastCallback(env, bot, q, isAdmin) {
  const m = /^bc_(go|stop|cancel)_(\d+)$/.exec(q.data || ''); if (!m) return false;
  const answer = text => bot.call('answerCallbackQuery', { callback_query_id: q.id, text });
  if (!isAdmin((q.from || {}).id)) { await answer('Только для администраторов'); return true; }
  let b = await row(env, Number(m[2])); if (!b) { await answer('Рассылка не найдена'); return true; }
  const set = async (status, from) => { const r = await env.DB.prepare(`UPDATE broadcasts SET status = ?1 WHERE id = ?2 AND status IN (${from.map(s => `'${s}'`).join(',')})`).bind(status, b.id).run(); return r.meta && r.meta.changes > 0; };
  if (q.message) await env.DB.prepare('UPDATE broadcasts SET admin_chat = ?1, admin_msg = ?2 WHERE id = ?3').bind(q.message.chat.id, q.message.message_id, b.id).run();
  if (m[1] === 'go' && b.status === 'preview') {
    const other = await active(env); if (other && other.id !== b.id) { await answer('Уже идёт другая рассылка'); return true; }
    if (!(await set('sending', ['preview']))) { await answer('Уже запущена'); return true; }
    const t = await targetOf(env, b.id);
    if (t) { // v86: the city's players only
      const list = await cityRecipients(env, t.city_key);
      for (let i = 0; i < list.length; i += 100) await env.DB.batch(list.slice(i, i + 100).map(p => env.DB.prepare("INSERT OR IGNORE INTO broadcast_queue (bid, tg_id, lang, status) VALUES (?1, ?2, ?3, 'pending')").bind(b.id, p.tg_id, p.lang)));
    } else {
      const w = notAdmins(env); const off = w.args.length;
      await env.DB.prepare(`INSERT OR IGNORE INTO broadcast_queue (bid, tg_id, lang, status) SELECT ?${off + 1}, tg_id, lang, 'pending' FROM users${w.sql}`).bind(...w.args, b.id).run();
    }
    await env.DB.prepare('UPDATE broadcasts SET started_at = ?1 WHERE id = ?2').bind(now(), b.id).run();
    await answer('Рассылка запущена');
  } else if (m[1] === 'go' && b.status === 'stopped') { await set('sending', ['stopped']); await answer('Продолжаем'); }
  else if (m[1] === 'stop') { await answer((await set('stopped', ['sending'])) ? 'Остановлена' : 'Уже не идёт'); }
  else if (m[1] === 'cancel') { await answer((await set('cancelled', ['preview', 'stopped'])) ? 'Отменена' : 'Уже не отменить'); }
  else { await answer('Уже не актуально'); }
  b = await row(env, b.id); await refresh(env, bot, b); return true;
}

/* every minute: the next portion of the running broadcast */
export async function runBroadcastCron(env, bot) {
  const b = await env.DB.prepare("SELECT * FROM broadcasts WHERE status = 'sending' ORDER BY id LIMIT 1").first(); if (!b) return;
  if (b.retry_at && b.retry_at > now()) return; // Telegram asked to slow down
  const batch = (await env.DB.prepare("SELECT tg_id, lang FROM broadcast_queue WHERE bid = ?1 AND status = 'pending' LIMIT ?2").bind(b.id, batchSize(env)).all()).results || [];
  const done = []; let wait = 0;
  for (const p of batch) {
    const m = messageFor(env, b, pickLang(p.lang));
    const r = await bot.send(p.tg_id, m.text, m.extra);
    if (r && r.ok) done.push(['sent', null, p.tg_id]);
    else if (r && r.error_code === 429) { wait = Number(r.parameters && r.parameters.retry_after) || 30; break; } // flood control: leave the rest pending
    else if (r && (r.error_code === 403 || /chat not found|user is deactivated|bot can't initiate/i.test(r.description || ''))) done.push(['blocked', String(r.description || '').slice(0, 120), p.tg_id]);
    else done.push(['failed', String((r && r.description) || 'no answer').slice(0, 120), p.tg_id]);
  }
  const ts = now();
  const writes = done.map(([st, err, id]) => env.DB.prepare('UPDATE broadcast_queue SET status = ?1, error = ?2, at = ?3 WHERE bid = ?4 AND tg_id = ?5').bind(st, err, ts, b.id, id));
  writes.push(env.DB.prepare('UPDATE broadcasts SET retry_at = ?1, error = ?2 WHERE id = ?3').bind(wait ? ts + wait : null, wait ? `Telegram просит подождать ${wait} с — продолжу сам` : null, b.id));
  await env.DB.batch(writes);
  const c = await counts(env, b.id);
  if (!c.pending) {
    await env.DB.prepare("UPDATE broadcasts SET status = 'done', finished_at = ?1, error = NULL WHERE id = ?2 AND status = 'sending'").bind(ts, b.id).run();
    const fin = await row(env, b.id); await refresh(env, bot, fin);
    if (fin.admin_chat) await bot.send(fin.admin_chat, `✅ Рассылка завершена: доставлено ${c.sent} из ${c.total}${c.blocked ? `, недоступны ${c.blocked}` : ''}${c.failed ? `, ошибок ${c.failed}` : ''}.`);
    return;
  }
  await refresh(env, bot, await row(env, b.id));
}
