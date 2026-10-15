/* Channel posts (v34): drafts written daily into posts/ of the repository are sent here by the "Channel posts" workflow,
   the admins get each draft in a DM with buttons, and an approved post goes to the channel (CHANNEL_ID) at its slot time.
   - POST /posts/draft  {id, slot_at, slot_label, lang, rubric, text, image}  header X-Posts-Key = sha256(BOT_TOKEN + ':mafia-pro-posts')[0..48]
     image (optional): a picture above the text — a path on the app's site (cards/uk/sheriff.png) or an https URL; shown as a large link preview.
       A .mp4 / .gif (skins/amethyst-don.mp4) is an animation (v56): it goes out as a looping GIF-like video with the text as its caption
       (if the text is longer than a caption may be, the animation goes first and the text right after it)
   - the button under a published post opens the bot with start=post_<id>, so growth.js counts who came through which post
   - callbacks cp_ok_<id> (publish at the slot), cp_now_<id> (publish now), cp_skip_<id>, cp_retry_<id>
   - an admin's reply to a draft message replaces the draft text (formatting kept) and the draft is re-sent
   - /posts — the next drafts and their status
   - scheduled() every 5 minutes publishes approved posts whose slot has come */
import { esc, safeEqual } from './tg.js';

const enc = s => new TextEncoder().encode(s);
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const now = () => Math.floor(Date.now() / 1000);
const adminIds = env => String(env.ADMIN_IDS || '').split(',').map(x => Number(x.trim())).filter(Boolean);
const channelOf = env => String(env.CHANNEL_ID || '').trim();
const FLAG = { uk: '🇺🇦 укр', ru: 'рус', en: '🇬🇧 eng', pl: '🇵🇱 pol', hy: '🇦🇲 hye' };
const PLAY = { uk: '🎲 Грати', ru: '🎲 Играть', en: '🎲 Play', pl: '🎲 Graj', hy: '🎲 Խաղալ' };
const MAX_TEXT = 3500;

export async function postsKey(token) { return hex(await crypto.subtle.digest('SHA-256', enc(String(token) + ':mafia-pro-posts'))).slice(0, 48); }

const row = (env, id) => env.DB.prepare('SELECT p.*, m.image FROM channel_posts p LEFT JOIN channel_post_media m ON m.id = p.id WHERE p.id = ?1').bind(id).first();
/* a picture above the post: an https URL, or a path on the app's site (APP_URL), e.g. cards/uk/sheriff.png */
function cleanImage(env, v) {
  const s = String(v || '').trim(); if (!s) return null;
  if (/^https:\/\/[^\s"'<>]{4,300}$/.test(s)) return s;
  if (/^[A-Za-z0-9_][A-Za-z0-9_./-]{2,200}$/.test(s) && !s.includes('..')) return String(env.APP_URL || 'https://mafiapro.app/').replace(/\/?$/, '/') + s.replace(/^\/+/, '');
  return null;
}
const isAnim = p => !!(p && p.image && /\.(mp4|gif)(\?|#|$)/i.test(p.image));
const preview = p => (p && p.image && !isAnim(p) ? { link_preview_options: { url: p.image, prefer_large_media: true, show_above_text: true } } : {});
const CAPTION_MAX = 1024; // Telegram counts the caption without its HTML tags
const plainLen = html => String(html).replace(/<[^>]+>/g, '').replace(/&(lt|gt|amp|quot|#39);/g, '_').length;
/* a message with the post's animation: the text as its caption when it fits; else the animation alone, then the text.
   Returns { r, msgs } — r: the Telegram answer of the message that carries the text (and the buttons), msgs: every message sent */
async function sendWithAnim(bot, chat, p, html, extra) {
  if (plainLen(html) <= CAPTION_MAX) {
    let r = await bot.call('sendAnimation', Object.assign({ chat_id: chat, animation: p.image, caption: html, parse_mode: 'HTML' }, extra));
    if (!(r && r.ok) && /parse|entit|tag/i.test((r && r.description) || '')) r = await bot.call('sendAnimation', Object.assign({ chat_id: chat, animation: p.image, caption: html.replace(/<[^>]+>/g, '') }, extra));
    return { r, msgs: r && r.ok && r.result ? [{ chat, msg: r.result.message_id, cap: 1 }] : [] };
  }
  const a = await bot.call('sendAnimation', { chat_id: chat, animation: p.image });
  if (!(a && a.ok)) return { r: a, msgs: [] };
  const r = await bot.send(chat, html, extra);
  const msgs = [{ chat, msg: a.result.message_id, media: 1 }]; if (r && r.ok && r.result) msgs.push({ chat, msg: r.result.message_id });
  return { r, msgs };
}
const fmtSlot = ts => { try { return new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Kiev', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ts * 1000)).replace(',', ''); } catch (e) { return new Date(ts * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'; } };
const STATUS = { draft: '📝 черновик', approved: '✅ одобрен — выйдет в срок', posted: '📣 опубликован', skipped: '⏭ пропущен', failed: '⚠️ не опубликован' };

/* the bot must be an admin of the channel who may post */
async function channelProblem(env, bot) {
  const ch = channelOf(env); if (!ch) return 'не задан CHANNEL_ID';
  const botId = Number(env.BOT_ID || String(env.BOT_TOKEN || '').split(':')[0]);
  if (!botId) return null; // test token: nothing to check
  const r = await bot.call('getChatMember', { chat_id: ch, user_id: botId });
  if (!r || !r.ok) return `канал ${ch} недоступен боту (${(r && r.description) || 'нет ответа'})`;
  const m = r.result || {};
  if (m.status === 'creator') return null;
  if (m.status !== 'administrator') return `бот не администратор в ${ch} — добавьте его в канал администратором`;
  if (m.can_post_messages === false) return `у бота нет права «Публикация сообщений» в ${ch}`;
  return null;
}

function draftCard(p, warn) {
  const head = `<b>${STATUS[p.status] || p.status}</b> · ${fmtSlot(p.slot_at)} · ${FLAG[p.lang] || esc(p.lang)}${p.rubric ? ' · ' + esc(p.rubric) : ''}`;
  const tail = p.status === 'draft' ? '\n\n<i>Чтобы поправить — ответьте на это сообщение новым текстом.</i>'
    : p.status === 'failed' ? `\n\n⚠️ ${esc(p.error || '')}` : p.status === 'posted' && p.channel_msg ? `\n\nСообщение в канале: #${p.channel_msg}` : '';
  return `${head}${warn ? `\n⚠️ ${esc(warn)}` : ''}\n━━━━━━━━━━\n${p.text}${tail}`;
}
function draftButtons(p) {
  if (p.status === 'draft') return { inline_keyboard: [[{ text: `✅ В канал в ${fmtSlot(p.slot_at).slice(-5)}`, callback_data: `cp_ok_${p.id}` }, { text: '🚀 Сейчас', callback_data: `cp_now_${p.id}` }], [{ text: '⏭ Пропустить', callback_data: `cp_skip_${p.id}` }]] };
  if (p.status === 'approved') return { inline_keyboard: [[{ text: '🚀 Сейчас', callback_data: `cp_now_${p.id}` }, { text: '↩️ Отменить', callback_data: `cp_undo_${p.id}` }]] };
  if (p.status === 'failed') return { inline_keyboard: [[{ text: '🔁 Повторить', callback_data: `cp_now_${p.id}` }, { text: '⏭ Пропустить', callback_data: `cp_skip_${p.id}` }]] };
  if (p.status === 'skipped') return { inline_keyboard: [[{ text: '↩️ Вернуть в черновики', callback_data: `cp_undo_${p.id}` }]] };
  return { inline_keyboard: [] };
}

/* send (or re-send) the draft card to every admin, remembering the message ids */
async function sendCards(env, bot, p, warn) {
  const msgs = [];
  for (const adm of adminIds(env)) {
    if (isAnim(p)) { // the admin sees the post as it will look: the animation with the text
      let s = await sendWithAnim(bot, adm, p, draftCard(p, warn), { reply_markup: draftButtons(p) });
      if (!s.msgs.length) { const r0 = await bot.send(adm, `⚠️ Анимация не отправилась (${esc((s.r && s.r.description) || 'нет ответа')}): ${esc(p.image)}\n\n` + draftCard(p, warn), { reply_markup: draftButtons(p) }); s = { msgs: r0 && r0.ok && r0.result ? [{ chat: adm, msg: r0.result.message_id }] : [] }; }
      msgs.push(...s.msgs); continue;
    }
    let r = await bot.send(adm, draftCard(p, warn), Object.assign({ reply_markup: draftButtons(p) }, preview(p)));
    if (!(r && r.ok)) r = await bot.call('sendMessage', Object.assign({ chat_id: adm, text: draftCard(p, warn).replace(/<[^>]+>/g, ''), reply_markup: draftButtons(p) }, preview(p))); // broken HTML in the draft
    if (r && r.ok && r.result) msgs.push({ chat: adm, msg: r.result.message_id });
  }
  await env.DB.prepare('UPDATE channel_posts SET admin_msgs = ?1, updated_at = ?2 WHERE id = ?3').bind(JSON.stringify(msgs), now(), p.id).run();
  return new Set(msgs.map(m => m.chat)).size; // admins reached
}
async function refreshCards(env, bot, p) {
  let msgs = []; try { msgs = JSON.parse(p.admin_msgs || '[]'); } catch (e) {}
  for (const m of msgs) {
    if (m.media) continue; // the animation alone: nothing to change
    if (m.cap) { // a card that is an animation with a caption
      const r = await bot.call('editMessageCaption', { chat_id: m.chat, message_id: m.msg, caption: draftCard(p), parse_mode: 'HTML', reply_markup: draftButtons(p) });
      if (!(r && r.ok)) await bot.call('editMessageCaption', { chat_id: m.chat, message_id: m.msg, caption: draftCard(p).replace(/<[^>]+>/g, ''), reply_markup: draftButtons(p) });
      continue;
    }
    const r = await bot.call('editMessageText', Object.assign({ chat_id: m.chat, message_id: m.msg, text: draftCard(p), parse_mode: 'HTML', reply_markup: draftButtons(p), link_preview_options: { is_disabled: true } }, preview(p)));
    if (!(r && r.ok)) await bot.call('editMessageText', Object.assign({ chat_id: m.chat, message_id: m.msg, text: draftCard(p).replace(/<[^>]+>/g, ''), reply_markup: draftButtons(p) }, preview(p)));
  }
}

/* POST /posts/draft — from the GitHub workflow */
export async function apiPostDraft(env, bot, req) {
  const key = req.headers.get('X-Posts-Key') || '';
  if (!env.BOT_TOKEN || !safeEqual(key, await postsKey(env.BOT_TOKEN))) return { status: 403, body: { ok: false, error: 'forbidden' } };
  let b = null; try { b = await req.json(); } catch (e) { return { status: 400, body: { ok: false, error: 'bad_json' } }; }
  const id = String(b.id || ''); const text = String(b.text || '').trim(); const slot = Number(b.slot_at) || 0;
  if (!/^[A-Za-z0-9_-]{4,40}$/.test(id) || !text || !slot) return { status: 400, body: { ok: false, error: 'bad_post' } };
  if (text.length > MAX_TEXT) return { status: 400, body: { ok: false, error: 'too_long', max: MAX_TEXT } };
  const lang = /^(uk|ru|en|pl|hy)$/.test(b.lang) ? b.lang : 'uk'; const rubric = String(b.rubric || '').slice(0, 60);
  const image = cleanImage(env, b.image); if (b.image && !image) return { status: 400, body: { ok: false, error: 'bad_image' } };
  const old = await row(env, id);
  if (old && old.status !== 'draft' && !b.force) return { status: 200, body: { ok: true, id, status: old.status, unchanged: true } };
  if (old && old.status === 'draft' && old.text === text && old.slot_at === slot && (old.image || null) === image && !b.force) return { status: 200, body: { ok: true, id, status: 'draft', unchanged: true } };
  const ts = now();
  await env.DB.prepare(`INSERT INTO channel_posts (id, slot_at, lang, rubric, text, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, 'draft', ?6, ?6)
    ON CONFLICT(id) DO UPDATE SET slot_at = ?2, lang = ?3, rubric = ?4, text = ?5, status = 'draft', error = NULL, updated_at = ?6`).bind(id, slot, lang, rubric, text, ts).run();
  if (image) await env.DB.prepare('INSERT INTO channel_post_media (id, image, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(id) DO UPDATE SET image = ?2, updated_at = ?3').bind(id, image, ts).run();
  else await env.DB.prepare('DELETE FROM channel_post_media WHERE id = ?1').bind(id).run();
  if (old && old.admin_msgs) { try { for (const m of JSON.parse(old.admin_msgs)) await bot.call('deleteMessage', { chat_id: m.chat, message_id: m.msg }); } catch (e) {} }
  const p = await row(env, id);
  const warn = await channelProblem(env, bot);
  const sent = await sendCards(env, bot, p, warn);
  return { status: 200, body: { ok: true, id, status: 'draft', sentTo: sent, channel: channelOf(env), channelProblem: warn || null, image: image || null } };
}

/* publish one post now */
async function publish(env, bot, p) {
  const lang = p.lang || 'uk';
  const user = await botUsernameOf(env, bot);
  const extra = Object.assign({ reply_markup: { inline_keyboard: [[{ text: PLAY[lang] || PLAY.uk, url: `https://t.me/${user}?start=post_${p.id}` }]] } }, preview(p)); // post_<id>: growth.js counts who came through this post
  // claim the post first so two cron runs never publish it twice
  const claim = await env.DB.prepare("UPDATE channel_posts SET status = 'posting', updated_at = ?1 WHERE id = ?2 AND status IN ('approved', 'draft', 'failed')").bind(now(), p.id).run();
  if (!(claim.meta && claim.meta.changes > 0)) return row(env, p.id);
  const r = isAnim(p) ? (await sendWithAnim(bot, channelOf(env), p, p.text, extra)).r : await bot.send(channelOf(env), p.text, extra);
  if (r && r.ok) await env.DB.prepare("UPDATE channel_posts SET status = 'posted', channel_msg = ?1, error = NULL, updated_at = ?2 WHERE id = ?3").bind(r.result && r.result.message_id || null, now(), p.id).run();
  else {
    const why = (await channelProblem(env, bot)) || (r && r.description) || 'нет ответа от Telegram';
    await env.DB.prepare("UPDATE channel_posts SET status = 'failed', error = ?1, updated_at = ?2 WHERE id = ?3").bind(String(why).slice(0, 300), now(), p.id).run();
  }
  const fresh = await row(env, p.id); await refreshCards(env, bot, fresh); return fresh;
}
let usernameCache = null;
async function botUsernameOf(env, bot) {
  if (env.BOT_USERNAME) return env.BOT_USERNAME;
  if (usernameCache) return usernameCache;
  const me = await bot.call('getMe'); if (me && me.ok && me.result && me.result.username) usernameCache = me.result.username;
  return usernameCache || 'mafiapro_bot';
}

/* callback buttons on a draft card; returns true when handled */
export async function onPostCallback(env, bot, q, isAdmin) {
  const m = /^cp_(ok|now|skip|undo)_([A-Za-z0-9_-]{4,40})$/.exec(q.data || ''); if (!m) return false;
  const answer = text => bot.call('answerCallbackQuery', { callback_query_id: q.id, text });
  if (!isAdmin((q.from || {}).id)) { await answer('Только для администраторов'); return true; }
  let p = await row(env, m[2]); if (!p) { await answer('Пост не найден'); return true; }
  const act = m[1];
  if (p.status === 'posted' || p.status === 'posting') { await answer('Уже опубликован'); await refreshCards(env, bot, p); return true; }
  if (act === 'skip') { await env.DB.prepare("UPDATE channel_posts SET status = 'skipped', updated_at = ?1 WHERE id = ?2").bind(now(), p.id).run(); await answer('Пропущен'); }
  else if (act === 'undo') { await env.DB.prepare("UPDATE channel_posts SET status = 'draft', updated_at = ?1 WHERE id = ?2").bind(now(), p.id).run(); await answer('Снова черновик'); }
  else if (act === 'ok' && p.slot_at > now()) { await env.DB.prepare("UPDATE channel_posts SET status = 'approved', error = NULL, updated_at = ?1 WHERE id = ?2").bind(now(), p.id).run(); await answer(`Выйдет ${fmtSlot(p.slot_at)}`); }
  else { // "now", or approved after its slot has passed
    const done = await publish(env, bot, p);
    await answer(done.status === 'posted' ? 'Опубликовано' : `Не вышло: ${String(done.error || '').slice(0, 150)}`); return true;
  }
  p = await row(env, p.id); await refreshCards(env, bot, p); return true;
}

/* Telegram entities → HTML, so an admin's edited text keeps bold / italic / links */
export function entitiesToHtml(text, entities) {
  const tags = { bold: ['<b>', '</b>'], italic: ['<i>', '</i>'], underline: ['<u>', '</u>'], strikethrough: ['<s>', '</s>'], spoiler: ['<tg-spoiler>', '</tg-spoiler>'], code: ['<code>', '</code>'], pre: ['<pre>', '</pre>'], blockquote: ['<blockquote>', '</blockquote>'] };
  const opens = {}, closes = {};
  for (const e of entities || []) {
    let t = tags[e.type];
    if (e.type === 'text_link') t = [`<a href="${esc(e.url).replace(/"/g, '&quot;')}">`, '</a>'];
    if (!t) continue;
    (opens[e.offset] = opens[e.offset] || []).push({ tag: t[0], len: e.length });
    (closes[e.offset + e.length] = closes[e.offset + e.length] || []).unshift(t[1]);
  }
  let out = '';
  for (let i = 0; i <= text.length; i++) {
    if (closes[i]) out += closes[i].join('');
    if (opens[i]) out += opens[i].sort((a, b) => b.len - a.len).map(x => x.tag).join('');
    if (i < text.length) out += esc(text[i]);
  }
  return out;
}

/* an admin replied to a draft card with a new text; returns true when handled */
export async function onPostReply(env, bot, msg) {
  const r = msg.reply_to_message; if (!r) return false;
  const rows = (await env.DB.prepare("SELECT * FROM channel_posts WHERE status IN ('draft', 'approved', 'failed', 'skipped') AND slot_at > ?1").bind(now() - 7 * 86400).all()).results || [];
  const p = rows.find(x => { try { return JSON.parse(x.admin_msgs || '[]').some(m => m.chat === msg.chat.id && m.msg === r.message_id); } catch (e) { return false; } });
  if (!p) return false;
  const text = entitiesToHtml(msg.text, msg.entities).trim();
  if (text.length > MAX_TEXT) { await bot.send(msg.chat.id, `Слишком длинно: ${text.length} из ${MAX_TEXT} символов.`); return true; }
  try { for (const m of JSON.parse(p.admin_msgs || '[]')) await bot.call('deleteMessage', { chat_id: m.chat, message_id: m.msg }); } catch (e) {}
  await env.DB.prepare("UPDATE channel_posts SET text = ?1, status = 'draft', error = NULL, updated_at = ?2 WHERE id = ?3").bind(text, now(), p.id).run();
  await sendCards(env, bot, await row(env, p.id));
  return true;
}

/* /posts — upcoming and recent posts */
export async function listPosts(env) {
  const rows = (await env.DB.prepare(`SELECT p.id, p.slot_at, p.lang, p.rubric, p.status, (SELECT COUNT(*) FROM start_hits h WHERE h.param = 'post_' || p.id) AS visitors,
      (SELECT COUNT(*) FROM start_hits h WHERE h.param = 'post_' || p.id AND h.is_new = 1) AS newp FROM channel_posts p WHERE p.slot_at > ?1 ORDER BY p.slot_at LIMIT 20`).bind(now() - 3 * 86400).all()).results || [];
  if (!rows.length) return `Постов для канала ${esc(channelOf(env) || '—')} пока нет.`;
  return `<b>Посты для ${esc(channelOf(env) || '—')}</b>\n` + rows.map(p => `• ${fmtSlot(p.slot_at)} · ${FLAG[p.lang] || esc(p.lang)} · ${esc(p.rubric || p.id)} — ${STATUS[p.status] || esc(p.status)}${p.status === 'posted' ? ` · 👥 ${p.visitors} перешли, ${p.newp} новых` : ''}`).join('\n');
}

/* cron: publish approved posts whose time has come; a post stuck in 'posting' for 10 minutes is retried */
export async function runPostsCron(env, bot) {
  if (!channelOf(env)) return 0;
  await env.DB.prepare("UPDATE channel_posts SET status = 'approved' WHERE status = 'posting' AND updated_at < ?1").bind(now() - 600).run();
  const due = (await env.DB.prepare("SELECT p.*, m.image FROM channel_posts p LEFT JOIN channel_post_media m ON m.id = p.id WHERE p.status = 'approved' AND p.slot_at <= ?1 AND p.slot_at > ?2 ORDER BY p.slot_at LIMIT 5").bind(now(), now() - 2 * 86400).all()).results || [];
  for (const p of due) await publish(env, bot, p);
  return due.length;
}
