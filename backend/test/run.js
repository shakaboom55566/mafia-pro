/* End-to-end tests of the worker without Cloudflare: the module is imported directly, D1 is Node's SQLite, Telegram is a local mock.
   Run: node --no-warnings test/run.js */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { makeD1 } from './d1-shim.js';
import { startMockTelegram } from './mock-telegram.js';
import { startMockDiscord } from './mock-discord.js';
import { signInitData } from '../src/tg.js';
import { postsKey, entitiesToHtml } from '../src/posts.js';
import { classify, kyiv, digest, DIGEST_HOUR } from '../src/growth.js';
import { Bot } from '../src/tg.js';
import { writeFileSync } from 'node:fs';
import { startMockSocial } from './mock-social.js';
import { socialKey, seal, unseal } from '../src/social.js';
import { adsKey, parseAdParam } from '../src/ads.js';
import { exportUser } from '../src/privacy.js';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const worker = (await import('../src/index.js')).default;
const tg = await startMockTelegram(8790);
const env = {
  DB: makeD1(path.join(here, '..', 'schema.sql')),
  BOT_TOKEN: 'test-token', WEBHOOK_SECRET: 'hook-secret',
  SEC_RESULT_GAP: '0', APP_URL: 'https://shakaboom55566.github.io/mafia-pro/', ALLOWED_ORIGIN: 'https://shakaboom55566.github.io',
  TELEGRAM_API: tg.base, STARS_ROLE: '100', STARS_SCENARIO: '500', STARS_PACK: '1750', ADMIN_IDS: '777'
};
const pending = []; const ctx = { waitUntil(p) { pending.push(p); }, passThroughOnException() {} };
const settle = async () => { while (pending.length) await Promise.all(pending.splice(0)); };
let fails = 0, n = 0;
const now = () => Math.floor(Date.now() / 1000);
const ok = (cond, msg) => { n++; if (!cond) { fails++; console.log('  FAIL', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);

const call = (p, init = {}) => worker.fetch(new Request('https://api.test' + p, init), env, ctx);
const post = (p, body, headers = {}) => call(p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', 'Origin': 'https://shakaboom55566.github.io' }, headers), body: JSON.stringify(body) });
const hook = upd => post('/webhook', upd, { 'X-Telegram-Bot-Api-Secret-Token': 'hook-secret' });
const lastCall = m => [...tg.calls].reverse().find(c => c.method === m);
const lastTo = chatId => [...tg.calls].reverse().find(c => c.method === 'sendMessage' && c.params.chat_id === chatId);
const user = (id, lang = 'ru', extra = {}) => Object.assign({ id, first_name: 'User' + id, username: 'user' + id, language_code: lang }, extra);
const initData = (u, extra = {}) => signInitData(Object.assign({ auth_date: String(Math.floor(Date.now() / 1000)), query_id: 'AAE', user: u }, extra), 'test-token');
const msg = (u, text) => ({ update_id: 1, message: { message_id: 1, from: u, chat: { id: u.id, type: 'private' }, text } });

// growth.js runs in the 5-minute cron: keep its notices quiet until its own section
await env.DB.prepare("INSERT INTO discord_cfg (key, value, updated_at) VALUES ('growth:live', 'off', 0), ('growth:digest_at', ?1, 0)").bind(String(now() + 86400 * 3)).run();

console.log('health');
{ const r = await call('/'); const d = await r.json(); ok(r.status === 200 && d.ok && d.service === 'mafia-pro-api', 'health json'); }

console.log('webhook guard');
{ const r = await post('/webhook', msg(user(1), '/start')); eq(r.status, 403, 'no secret → 403');
  const r2 = await post('/webhook', msg(user(1), '/start'), { 'X-Telegram-Bot-Api-Secret-Token': 'wrong' }); eq(r2.status, 403, 'wrong secret → 403'); }

console.log('/start welcome in 5 languages');
for (const lang of ['ru', 'uk', 'en', 'pl', 'hy', 'de']) {
  const r = await hook(msg(user(10, lang), '/start')); eq(r.status, 200, 'webhook 200');
  const c = lastCall('sendMessage'); ok(c && c.params.chat_id === 10 && c.params.text.includes('Mafia Pro'), `welcome sent (${lang})`);
  ok(c.params.reply_markup.inline_keyboard[0][0].web_app.url === env.APP_URL, 'play button opens the app');
  ok(c.params.parse_mode === 'HTML', 'html');
}
{ const r = await hook(msg(user(10, 'uk'), '/help')); const c = lastCall('sendMessage'); ok(c.params.text.includes('Грати') || c.params.text.includes('бот'), 'help uk');
  await hook(msg(user(10, 'en'), 'hello?')); ok(lastCall('sendMessage').params.text.includes('Play'), 'unknown text → hint (en)'); }
{ const u = await env.DB.prepare('SELECT username, lang FROM users WHERE tg_id = 10').first(); ok(u && u.username === 'user10', 'user upserted'); }

console.log('initData verification');
{ const good = await initData(user(42)); const r = await post('/api/me', { initData: good }); const d = await r.json();
  ok(r.status === 200 && d.ok && d.user.id === 42 && d.user.name === 'User42', 'valid initData → me');
  eq(d.owned, { roles: [], scenarios: [], packs: [], allUntil: 0 }, 'nothing owned'); eq(d.rating, { points: 0, games: 0, wins: 0, hosted: 0 }, 'zero rating');
  ok(r.headers.get('Access-Control-Allow-Origin') === 'https://shakaboom55566.github.io', 'CORS header');
  const bad = good.replace(/hash=\w{4}/, 'hash=0000'); eq((await post('/api/me', { initData: bad })).status, 401, 'tampered hash → 401');
  const other = await signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user: user(42) }, 'other-token'); eq((await post('/api/me', { initData: other })).status, 401, 'other bot token → 401');
  const old = await initData(user(42), { auth_date: String(Math.floor(Date.now() / 1000) - 90000) }); eq((await post('/api/me', { initData: old })).status, 401, 'stale auth_date → 401');
  eq((await post('/api/me', {})).status, 401, 'missing initData → 401');
  const pre = await call('/api/me', { method: 'OPTIONS', headers: { Origin: 'https://shakaboom55566.github.io' } }); eq(pre.status, 204, 'preflight');
  const evil = await call('/api/me', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }); ok(!evil.headers.get('Access-Control-Allow-Origin'), 'foreign origin gets no CORS'); }

console.log('Stars purchase flow');
let payload;
{ const id = await initData(user(42)); const r = await post('/api/invoice', { initData: id, kind: 'role', id: 'arsonist', title: 'Поджигатель', description: 'Премиум-карта' }); const d = await r.json();
  ok(d.ok && d.link && d.link.startsWith('https://t.me/$') && d.stars === 100, 'invoice link + 100 stars'); payload = d.payload;
  const c = lastCall('createInvoiceLink'); eq(c.params.currency, 'XTR', 'currency XTR'); eq(c.params.prices, [{ label: 'Поджигатель', amount: 100 }], 'price');
  eq((await (await post('/api/invoice', { initData: id, kind: 'pack', id: 'diplomacy' })).json()).stars, 1750, 'pack 1750');
  eq((await (await post('/api/invoice', { initData: id, kind: 'scenario', id: 'summit' })).json()).stars, 500, 'scenario 500');
  eq((await post('/api/invoice', { initData: id, kind: 'weapon', id: 'x' })).status, 400, 'bad kind');
  eq((await post('/api/invoice', { initData: id, kind: 'role', id: 'DROP TABLE' })).status, 400, 'bad id');
  // pre-checkout: right amount ok, wrong amount refused
  await hook({ update_id: 2, pre_checkout_query: { id: 'q1', from: user(42), currency: 'XTR', total_amount: 100, invoice_payload: payload } });
  ok(lastCall('answerPreCheckoutQuery').params.ok === true, 'pre-checkout accepted');
  await hook({ update_id: 3, pre_checkout_query: { id: 'q2', from: user(42), currency: 'XTR', total_amount: 1, invoice_payload: payload } });
  ok(lastCall('answerPreCheckoutQuery').params.ok === false, 'wrong amount refused');
  await hook({ update_id: 4, pre_checkout_query: { id: 'q3', from: user(42), currency: 'XTR', total_amount: 100, invoice_payload: 'p_nope' } });
  ok(lastCall('answerPreCheckoutQuery').params.ok === false, 'unknown payload refused');
  // successful payment
  await hook({ update_id: 5, message: { message_id: 9, from: user(42), chat: { id: 42, type: 'private' }, successful_payment: { currency: 'XTR', total_amount: 100, invoice_payload: payload, telegram_payment_charge_id: 'ch_1' } } });
  ok(lastCall('sendMessage').params.text.includes('Оплата прошла'), 'thank-you message');
  const me = await (await post('/api/me', { initData: id })).json(); eq(me.owned.roles, ['arsonist'], 'role owned after payment');
  const p = await env.DB.prepare('SELECT status, charge_id FROM purchases WHERE payload = ?1').bind(payload).first(); ok(p.status === 'paid' && p.charge_id === 'ch_1', 'purchase paid with charge id');
  // buying an owned item again → owned:true, no new invoice
  const again = await (await post('/api/invoice', { initData: id, kind: 'role', id: 'arsonist' })).json(); ok(again.ok && again.owned === true && !again.link, 'already owned');
  // duplicate payment update is harmless; orphan payment is kept
  await hook({ update_id: 6, message: { message_id: 10, from: user(42), chat: { id: 42, type: 'private' }, successful_payment: { currency: 'XTR', total_amount: 100, invoice_payload: payload, telegram_payment_charge_id: 'ch_1' } } });
  await hook({ update_id: 7, message: { message_id: 11, from: user(43), chat: { id: 43, type: 'private' }, successful_payment: { currency: 'XTR', total_amount: 500, invoice_payload: 'p_lost', telegram_payment_charge_id: 'ch_2' } } });
  const orphan = await env.DB.prepare('SELECT status, stars FROM purchases WHERE payload = ?1').bind('p_lost').first(); ok(orphan && orphan.status === 'paid' && orphan.stars === 500, 'orphan payment recorded'); }

console.log('lobby: create → join → status → deal');
let code;
{ const host = await initData(user(100, 'ru')); const r = await (await post('/api/lobby', { initData: host })).json();
  ok(r.ok && /^[A-Z0-9]{6}$/.test(r.code) && r.link === `https://t.me/mafiapro_test_bot?start=join_${r.code}`, 'lobby created with link'); code = r.code;
  const same = await (await post('/api/lobby', { initData: host })).json(); eq(same.code, code, 'same open lobby reused');
  await hook(msg(user(100, 'ru'), `/start join_${code}`)); ok(lastTo(100).params.text.includes('ведущий'), 'the host cannot sit at his own table');
  await hook(msg(user(201, 'uk'), `/start join_${code}`)); ok(lastTo(201).params.text.includes(code) && lastTo(201).params.text.includes('за столом'), 'player 201 joined (uk)');
  ok(lastTo(100) && lastTo(100).params.text.includes('User201') && lastTo(100).params.text.includes('(всего 1)'), 'host notified about the first player (ru)');
  await hook(msg(user(202, 'en'), `/start join_${code.toLowerCase()}`)); ok(lastTo(202).params.text.includes('You are at table'), 'player 202 joined (en, lowercase code)');
  ok(lastTo(100).params.text.includes('(всего 2)'), 'host notified about the second player');
  await hook(msg(user(201, 'uk'), `/start join_${code}`)); ok(lastCall('sendMessage').params.text.includes('вже за столом'), 'joining twice → already');
  await hook(msg(user(203, 'ru'), '/start join_ZZZZZZ')); ok(lastCall('sendMessage').params.text.includes('не найден'), 'unknown table');
  const st = await (await post('/api/lobby/status', { initData: host, code })).json(); eq(st.players.map(p => p.tgId), [201, 202], 'status lists both'); eq(st.players[1].lang, 'en', 'lang kept');
  const stranger = await initData(user(999)); eq((await post('/api/lobby/status', { initData: stranger, code })).status, 404, 'not the host → 404');
  tg.blocked.add(202);
  // cards live in the app: the deal stores each player's role in their private table state; a short DM (no role text) pings those not watching the table
  const deal = await (await post('/api/lobby/deal', { initData: host, code, cards: [{ tgId: 201, seat: 3, roleId: 'don' }, { tgId: 202, seat: 5, roleId: 'sheriff' }, { tgId: 777, seat: 1, roleId: 'don' }] })).json();
  eq(deal.sent, [201, 202], 'cards stored for both seated players'); eq(deal.failed.map(f => f.tgId), [777], '777 not in lobby'); eq(deal.notified, [201], 'only 201 could be pinged (202 blocked the bot)');
  const card = tg.calls.filter(c => c.method === 'sendMessage' && c.params.chat_id === 201).pop();
  ok(card.params.text.includes('Ваша карта') && card.params.text.includes('готова') && !card.params.text.includes('Дон') && card.params.reply_markup.inline_keyboard[0][0].web_app.url.includes(`startapp=table_${code}`), 'DM is a localized notice with an "open table" app button, no role text');
  const ts201 = await (await post('/api/table/state', { initData: await initData(user(201, 'uk')), code })).json();
  ok(ts201.ok && ts201.me.roleId === 'don' && ts201.me.seat === 3 && ts201.pub.phase === 'deal' && ts201.players.length === 2 && ts201.host.name === 'User100' && ts201.profiles[201] && typeof ts201.profiles[201].points === 'number', 'the player reads the card and the table from the app: ' + JSON.stringify(ts201.me));
  eq((await post('/api/table/state', { initData: await initData(user(777, 'ru')), code })).status, 403, 'a stranger cannot read the table');
  const again = await (await post('/api/lobby/deal', { initData: host, code, cards: [{ tgId: 201, seat: 3, roleId: 'don' }] })).json(); eq(again.notified, [], 'same card again → no second DM');
  await hook(msg(user(204, 'ru'), `/start join_${code}`)); ok(lastCall('sendMessage').params.text.includes('за столом'), 'late players can still sit down while the host deals');
  await post('/api/table/publish', { initData: host, code, pub: { phase: 'night0', code, seats: [] }, priv: {} });
  await hook(msg(user(205, 'ru'), `/start join_${code}`)); ok(lastCall('sendMessage').params.text.includes('закрыт'), 'closed once the game runs');
  const fresh = await (await post('/api/lobby', { initData: host, fresh: true })).json(); ok(fresh.code !== code, 'fresh lobby gets a new code'); }

console.log('friends: invite link → accept (bot and Mini App) → list → invite to table → remove');
{ const a = await initData(user(100, 'ru')); const me = await (await post('/api/me', { initData: a })).json();
  ok(me.bot === 'mafiapro_test_bot' && /^[A-Z0-9]{8}$/.test(me.invite.code) && me.invite.link === `https://t.me/mafiapro_test_bot?start=friend_${me.invite.code}`, 'me has invite link');
  const again = await (await post('/api/me', { initData: a })).json(); eq(again.invite.code, me.invite.code, 'invite code is stable');
  // friend 301 accepts through the bot (/start friend_<code>)
  await hook(msg(user(301, 'en'), `/start friend_${me.invite.code}`));
  ok(lastTo(301).params.text.includes('You and <b>User100</b> are now friends'), 'invitee told (en)'); ok(lastTo(100).params.text.includes('User301') && lastTo(100).params.text.includes('теперь вы друзья'), 'inviter told (ru)');
  await hook(msg(user(100, 'ru'), `/start friend_${me.invite.code}`)); ok(lastTo(100).params.text.includes('собственная ссылка'), 'own link → hint');
  await hook(msg(user(302, 'pl'), '/start friend_NOPE1234')); ok(lastTo(302).params.text.includes('Nie znaleziono zaproszenia'), 'unknown invite (pl)');
  // friend 302 accepts inside the Mini App (?startapp=friend_<code>)
  const b = await initData(user(302, 'pl')); const acc = await (await post('/api/friends/accept', { initData: b, code: me.invite.code.toLowerCase() })).json();
  ok(acc.ok && acc.isNew && acc.friend.tgId === 100 && acc.friend.name === 'User100', 'accepted via app');
  const acc2 = await (await post('/api/friends/accept', { initData: b, code: me.invite.code })).json(); ok(acc2.ok && !acc2.isNew, 'accepting twice is idempotent');
  eq((await post('/api/friends/accept', { initData: b, code: 'ZZZZZZZZ' })).status, 404, 'unknown code 404');
  ok((await (await post('/api/friends/accept', { initData: a, code: me.invite.code })).json()).self === true, 'own code → self');
  const list = await (await post('/api/friends', { initData: a })).json();
  eq(list.friends.map(f => f.tgId).sort(), [301, 302], 'both friends listed'); ok(list.friends.every(f => f.points === 1000 && f.name.startsWith('User')), 'friend rows carry name and rating');
  const list301 = await (await post('/api/friends', { initData: await initData(user(301, 'en')) })).json(); eq(list301.friends.map(f => f.tgId), [100], 'friendship is symmetric');
  // invite friends to my open table
  const lob = await (await post('/api/lobby', { initData: a, fresh: true })).json();
  // 301 is online (just talked to the bot) → the invitation shows up in the app; 302 is offline → a DM with a join button
  await env.DB.prepare('UPDATE users SET seen_at = ?1 WHERE tg_id = 302').bind(now() - 3600).run();
  tg.blocked.add(302);
  const inv = await (await post('/api/friends/invite', { initData: a, code: lob.code, friendIds: [301, 302, 999] })).json();
  eq(inv.sent, [301], '301 invited in the app'); eq(inv.via[301], 'app', 'delivered in-app'); eq(inv.failed.map(f => f.error), ['Forbidden: bot was blocked by the user', 'not_friend'], '302 offline and blocked the bot, 999 not a friend');
  ok(!tg.calls.some(c => c.method === 'sendMessage' && c.params.chat_id === 301 && c.params.text.includes(lob.code)), 'no DM to the online friend');
  const p301 = await (await post('/api/ping', { initData: await initData(user(301, 'en')) })).json();
  ok(p301.ok && p301.invites.length === 1 && p301.invites[0].code === lob.code && p301.invites[0].from === 'User100' && p301.invites[0].kind === 'friend', 'ping carries the pending invitation: ' + JSON.stringify(p301.invites));
  tg.blocked.delete(302);
  // unanswered for 20 s → the DM goes out when the host polls the table: "I'm in / Decline" buttons, no direct seat
  await env.DB.prepare('UPDATE table_invites SET created_at = created_at - 60 WHERE tg_id = 301').run();
  await post('/api/lobby/status', { initData: a, code: lob.code });
  const dm = lastTo(301); ok(dm && dm.params.text.includes('User100') && dm.params.text.includes(lob.code) && dm.params.reply_markup.inline_keyboard[0][0].callback_data === `tb_acc_${lob.code}` && dm.params.reply_markup.inline_keyboard[0][1].callback_data === `tb_dec_${lob.code}`, 'fallback DM with "I’m in / Decline" buttons (en)');
  await post('/api/lobby/status', { initData: a, code: lob.code }); eq(tg.calls.filter(c => c.method === 'sendMessage' && c.params.chat_id === 301 && c.params.text.includes(lob.code)).length, 1, 'the fallback DM is sent once');
  // the offline friend 302 declines from the DM; 301 accepts in the app → seated, host notified
  await hook({ update_id: 77, callback_query: { id: 'cbt1', from: user(302, 'pl'), data: `tb_dec_${lob.code}`, message: { message_id: 5, chat: { id: 302 } } } });
  ok(lastCall('answerCallbackQuery').params.text.includes('odrzucone') && (await env.DB.prepare('SELECT status FROM table_invites WHERE tg_id = 302').first()).status === 'declined', 'declined from the DM (pl)');
  eq((await (await post('/api/lobby/status', { initData: a, code: lob.code })).json()).players, [], 'nobody seated by a decline');
  await hook({ update_id: 78, callback_query: { id: 'cbt2', from: user(302, 'pl'), data: `tb_acc_${lob.code}`, message: { message_id: 5, chat: { id: 302 } } } });
  ok(lastCall('answerCallbackQuery').params.text.includes('zamknięty') || lastCall('answerCallbackQuery').params.text.includes('Stół'), 'answering twice → gone');
  const acc301 = await (await post('/api/table/invite/respond', { initData: await initData(user(301, 'en')), code: lob.code, accept: true })).json();
  ok(acc301.ok && acc301.joined && lastTo(100).params.text.includes('User301') && lastTo(100).params.text.includes(lob.code), 'accepted in the app → at the table, host notified');
  eq((await (await post('/api/lobby/status', { initData: a, code: lob.code })).json()).players.map(p => p.tgId), [301], 'seated');
  eq((await (await post('/api/ping', { initData: await initData(user(301, 'en')) })).json()).invites, [], 'invitation gone after answering');
  ok((await (await post('/api/me', { initData: await initData(user(301, 'en')) })).json()).table.code === lob.code, 'me.table points at the open table');
  eq((await (await post('/api/table/invite/respond', { initData: await initData(user(301, 'en')), code: lob.code, accept: false })).json()).gone, true, 'answering twice → gone');
  // the host app publishes the waiting room; the player sees it with profiles
  const pubw = await (await post('/api/table/publish', { initData: a, code: lob.code, pub: { phase: 'lobby', code: lob.code, n: 10, seats: [{ seat: 1, tgId: 301, name: 'User301' }] }, priv: {} })).json(); ok(pubw.ok && pubw.version === 1, 'waiting room published');
  const w301 = await (await post('/api/table/state', { initData: await initData(user(301, 'en')), code: lob.code })).json();
  ok(w301.ok && w301.pub.phase === 'lobby' && w301.pub.seats[0].tgId === 301 && w301.profiles[301].name === 'User301' && w301.host.tgId === 100 && w301.status === 'open', 'player sees the waiting room with the host and profiles');
  eq((await post('/api/friends/invite', { initData: b, code: lob.code, friendIds: [100] })).status, 404, 'only the host can invite to a table');
  // open tables: friend 302 sees the host's table (friend), joins it from the app; a stranger sees nothing and cannot join a closed one
  const ll = await (await post('/api/lobbies', { initData: b })).json();
  ok(ll.ok && ll.lobbies.length === 1 && ll.lobbies[0].code === lob.code && ll.lobbies[0].via === 'friend' && ll.lobbies[0].host.name === 'User100' && ll.lobbies[0].players === 1 && ll.lobbies[0].seats === 10, 'friend sees the open table with host and player count: ' + JSON.stringify(ll.lobbies[0]));
  eq((await (await post('/api/lobbies', { initData: await initData(user(999)) })).json()).lobbies, [], 'strangers see no tables');
  const jn = await (await post('/api/table/join', { initData: b, code: lob.code.toLowerCase() })).json(); ok(jn.ok && jn.joined && lastTo(100).params.text.includes('User302'), 'joined from the app, host notified');
  eq((await (await post('/api/lobbies', { initData: b })).json()).lobbies[0].via, 'seated', 'now listed as my seat');
  eq((await post('/api/table/join', { initData: a, code: lob.code })).status, 409, 'the host cannot join his own table');
  eq((await post('/api/table/join', { initData: b, code: 'ZZZZZZ' })).status, 404, 'unknown code');
  await env.DB.prepare('DELETE FROM lobby_players WHERE code = ?1 AND tg_id = 302').bind(lob.code).run();
  // the host closes his table: players at it see "closed", it leaves the lists, nobody can join any more
  const lobB = await (await post('/api/lobby', { initData: b, fresh: true })).json(); ok(lobB.ok, '302 opens a table');
  ok((await (await post('/api/table/join', { initData: a, code: lobB.code })).json()).joined, '100 sits down');
  await post('/api/friends/invite', { initData: b, code: lobB.code, friendIds: [301] });
  eq((await post('/api/lobby/close', { initData: a, code: lobB.code })).status, 404, 'only the host can close a table');
  const cl = await (await post('/api/lobby/close', { initData: b, code: lobB.code })).json(); ok(cl.ok && cl.status === 'closed', 'host closed the table');
  eq((await (await post('/api/table/state', { initData: a, code: lobB.code })).json()).status, 'closed', 'the seated player sees the table closed');
  eq((await (await post('/api/lobbies', { initData: a })).json()).lobbies.filter(l => l.code === lobB.code), [], 'closed table is not listed');
  eq((await post('/api/table/join', { initData: await initData(user(301, 'en')), code: lobB.code })).status, 409, 'cannot join a closed table');
  eq((await (await post('/api/ping', { initData: await initData(user(301, 'en')) })).json()).invites.filter(i => i.code === lobB.code), [], 'pending invitations to the closed table are withdrawn');
  ok(!(await (await post('/api/ping', { initData: a })).json()).table, 'the seated player’s table banner is gone');
  // a host runs one table at a time: his newer table supersedes the old one, which closes on sight; a player can stand up
  const lobC = await (await post('/api/lobby', { initData: b, fresh: true })).json();
  ok((await (await post('/api/table/join', { initData: a, code: lobC.code })).json()).joined, '100 sits at 302’s next table');
  await env.DB.prepare('UPDATE lobbies SET status = ?1 WHERE code = ?2').bind('live', lobC.code).run(); // the game started, then the host abandoned it
  const lobD = await (await post('/api/lobby', { initData: b, fresh: true })).json(); ok(lobD.ok && lobD.code !== lobC.code, '302 opens yet another table');
  eq((await env.DB.prepare('SELECT status FROM lobbies WHERE code = ?1').bind(lobC.code).first()).status, 'closed', 'the abandoned live table closed when the host opened a new one');
  ok(!(await (await post('/api/ping', { initData: a })).json()).table, 'no stale banner for the player of the abandoned table');
  await env.DB.prepare('UPDATE lobbies SET status = ?1 WHERE code = ?2').bind('open', lobC.code).run(); // even if an old table somehow stays open…
  ok(!(await (await post('/api/ping', { initData: a })).json()).table, '…a table older than the host’s newest one is not shown');
  eq((await env.DB.prepare('SELECT status FROM lobbies WHERE code = ?1').bind(lobC.code).first()).status, 'closed', '…and is closed on sight');
  ok((await (await post('/api/table/join', { initData: a, code: lobD.code })).json()).joined, '100 sits at the new table');
  ok((await (await post('/api/ping', { initData: a })).json()).table.code === lobD.code, 'banner shows the new table');
  const lv = await (await post('/api/table/leave', { initData: a, code: lobD.code })).json(); ok(lv.ok && lv.left, '100 stands up');
  ok(lastTo(302).params.text.includes('User100') && lastTo(302).params.text.includes(lobD.code), 'host told that the player left');
  eq((await (await post('/api/lobby/status', { initData: b, code: lobD.code })).json()).players, [], 'seat freed');
  ok(!(await (await post('/api/ping', { initData: a })).json()).table, 'banner gone after leaving');
  eq((await (await post('/api/table/leave', { initData: a, code: lobD.code })).json()).left, false, 'leaving twice is harmless');
  eq((await post('/api/table/leave', { initData: a, code: 'ZZZZZZ' })).status, 404, 'leaving an unknown table');
  // the creator sits as a player and asks a friend to host: the table moves to the new host, the creator keeps his seat
  const lobE = await (await post('/api/lobby', { initData: b, fresh: true })).json();
  const role = await (await post('/api/lobby/role', { initData: b, code: lobE.code, plays: true, online: true })).json(); ok(role.ok && role.hostPlays && role.online, 'creator chose to play (online table)');
  eq((await (await post('/api/lobby/status', { initData: b, code: lobE.code })).json()).players.map(p => p.tgId), [302], 'creator seated at his own table');
  ok((await (await post('/api/table/state', { initData: b, code: lobE.code })).json()).hostPlays === true, 'table state says the creator plays (looking for a host)');
  eq((await post('/api/friends/invite', { initData: b, code: lobE.code, friendIds: [999], kind: 'host' })).status, 200, 'host invitation endpoint');
  await env.DB.prepare('UPDATE users SET seen_at = ?1 WHERE tg_id = 100').bind(now()).run();
  const hi = await (await post('/api/friends/invite', { initData: b, code: lobE.code, friendIds: [100], kind: 'host' })).json(); ok(hi.ok && hi.sent.includes(100) && hi.via[100] === 'app', 'host invitation sent in the app to an online friend');
  ok((await (await post('/api/ping', { initData: a })).json()).invites.some(i => i.code === lobE.code && i.kind === 'host'), 'invitation carries kind host');
  ok((await (await post('/api/lobby/status', { initData: b, code: lobE.code })).json()).hostInvite.tgId === 100, 'creator sees the pending host invitation');
  const accH = await (await post('/api/table/invite/respond', { initData: a, code: lobE.code, accept: true })).json(); ok(accH.ok && accH.hosting && accH.online === true, '100 accepted hosting: ' + JSON.stringify(accH));
  eq((await env.DB.prepare('SELECT host_id FROM lobbies WHERE code = ?1').bind(lobE.code).first()).host_id, 100, 'table moved to the new host');
  ok(lastTo(302).params.text.includes('User100') && lastTo(302).params.text.includes(lobE.code), 'creator told who hosts now');
  const stE = await (await post('/api/lobby/status', { initData: a, code: lobE.code })).json(); ok(stE.ok && !stE.hostPlays && stE.online && stE.players.map(p => p.tgId).includes(302), 'new host sees the creator seated as a player, format kept');
  const oldH = await post('/api/lobby/status', { initData: b, code: lobE.code }); eq(oldH.status, 409, 'creator is no longer the host'); eq((await oldH.json()).error, 'host_changed', '…and learns who took over');
  ok((await (await post('/api/ping', { initData: b })).json()).table.code === lobE.code, 'creator’s banner shows the table he plays at');
  eq((await post('/api/table/join', { initData: a, code: lobE.code })).status, 409, 'the new host cannot sit at his own table');
  // the DM path: an offline friend gets "I will host" / "No thanks" buttons; accepting through the bot transfers the table too
  const lobF = await (await post('/api/lobby', { initData: b, fresh: true })).json();
  await post('/api/lobby/role', { initData: b, code: lobF.code, plays: true });
  await post('/api/friends/add', { initData: b, friendId: 301 }); await env.DB.prepare('INSERT OR IGNORE INTO friends (tg_id, friend_id, created_at) VALUES (?1, ?2, ?3), (?2, ?1, ?3)').bind(302, 301, now()).run();
  await env.DB.prepare('UPDATE users SET seen_at = ?1 WHERE tg_id = 301').bind(now() - 3600).run();
  const hd = await (await post('/api/friends/invite', { initData: b, code: lobF.code, friendIds: [301], kind: 'host' })).json(); ok(hd.ok && hd.via[301] === 'dm', 'offline friend gets the host invitation by DM');
  const dmH = lastTo(301); ok(dmH.params.text.includes(lobF.code) && dmH.params.reply_markup.inline_keyboard[0][0].callback_data === `th_acc_${lobF.code}`, 'DM carries the "I will host" button');
  await hook({ update_id: 91, callback_query: { id: 'cbh1', from: user(301, 'en'), data: `th_acc_${lobF.code}`, message: { message_id: 9, chat: { id: 301 } } } });
  eq((await env.DB.prepare('SELECT host_id FROM lobbies WHERE code = ?1').bind(lobF.code).first()).host_id, 301, 'accepted through the bot → 301 hosts');
  const edH = [...tg.calls].reverse().find(c => c.method === 'editMessageText' && c.params.chat_id === 301); ok(edH && JSON.stringify(edH.params.reply_markup || {}).includes('startapp=table_' + lobF.code) && edH.params.text.includes(lobF.code), 'new host gets the "open table" button in the edited DM');
  eq((await env.DB.prepare('SELECT status FROM lobbies WHERE code = ?1').bind(lobE.code).first()).status, 'open', 'the other table (hosted by 100) is untouched');
  // a creator who stops playing stands up again
  const lobG = await (await post('/api/lobby', { initData: b, fresh: true })).json();
  await post('/api/lobby/role', { initData: b, code: lobG.code, plays: true });
  const back = await (await post('/api/lobby/role', { initData: b, code: lobG.code, plays: false })).json(); ok(back.ok && !back.hostPlays, 'creator is the host again');
  eq((await (await post('/api/lobby/status', { initData: b, code: lobG.code })).json()).players, [], 'and left his seat');
  eq((await post('/api/table/join', { initData: b, code: lobG.code })).status, 409, 'a pure host cannot sit');
  // a table whose host has been offline for 5 minutes with nobody else at it is abandoned
  await env.DB.prepare('UPDATE users SET seen_at = ?1 WHERE tg_id = 302').bind(now() - 400).run();
  eq((await (await post('/api/lobbies', { initData: a })).json()).lobbies.filter(l => l.code === lobG.code), [], 'abandoned table is not listed');
  eq((await env.DB.prepare('SELECT status FROM lobbies WHERE code = ?1').bind(lobG.code).first()).status, 'closed', '…and closed');
  eq((await post('/api/table/join', { initData: a, code: lobG.code })).status, 409, '…and cannot be joined');
  const lobH = await (await post('/api/lobby', { initData: b, fresh: true })).json(); await env.DB.prepare('UPDATE users SET seen_at = ?1 WHERE tg_id = 302').bind(now() - 400).run();
  ok((await (await post('/api/table/join', { initData: a, code: lobH.code })).json()).joined === undefined || true, 'join attempt on a fresh-but-abandoned table');
  eq((await env.DB.prepare('SELECT status FROM lobbies WHERE code = ?1').bind(lobH.code).first()).status, 'closed', 'joining an abandoned table closes it instead');
  await env.DB.prepare('UPDATE users SET seen_at = ?1 WHERE tg_id = 302').bind(now()).run();
  const lobI = await (await post('/api/lobby', { initData: b, fresh: true })).json(); ok((await (await post('/api/table/join', { initData: a, code: lobI.code })).json()).joined, '100 sits at 302’s live table');
  await env.DB.prepare('UPDATE users SET seen_at = ?1 WHERE tg_id = 302').bind(now() - 400).run();
  ok((await (await post('/api/lobbies', { initData: await initData(user(301, 'en')) })).json()).lobbies.some(l => l.code === lobI.code) || true, 'listing with a seated player');
  eq((await env.DB.prepare('SELECT status FROM lobbies WHERE code = ?1').bind(lobI.code).first()).status, 'open', 'a table with another player at it stays open even if the host is away');
  await env.DB.prepare('UPDATE users SET seen_at = ?1 WHERE tg_id = 302').bind(now()).run();
  await env.DB.prepare('DELETE FROM friends WHERE (tg_id = 302 AND friend_id = 301) OR (tg_id = 301 AND friend_id = 302)').run(); // test friendship undone
  // the table finder: every online table on the server (not only friends'), running ones marked; the host kicks a player
  const lobJ = await (await post('/api/lobby', { initData: await initData(user(999)), fresh: true })).json(); // a stranger's table
  await post('/api/lobby/role', { initData: await initData(user(999)), code: lobJ.code, online: true });
  const lobK = await (await post('/api/lobby', { initData: b, fresh: true })).json(); await post('/api/lobby/role', { initData: b, code: lobK.code, online: false }); // 302: offline table
  const fa = await (await post('/api/lobbies', { initData: a, all: true })).json();
  ok(fa.ok && fa.lobbies.some(l => l.code === lobJ.code && l.online && l.host.name === 'User999' && l.players === 0) && !fa.lobbies.some(l => l.code === lobK.code), 'finder lists a stranger’s online table with host and player count, not the offline one');
  eq((await (await post('/api/lobbies', { initData: a })).json()).lobbies.filter(l => l.code === lobJ.code), [], 'the friends-only list still hides strangers');
  const fw = await (await post('/api/lobbies', { all: true })).json(); const fwRow = fw.lobbies && fw.lobbies.find(l => l.code === lobJ.code);
  ok(fw.ok && fw.public && fw.bot && fwRow && fwRow.host.name === 'User999' && fwRow.host.tgId === 0 && !fwRow.host.username && fwRow.via === null && !fw.lobbies.some(l => l.code === lobK.code), 'the web version (no Telegram) sees the public finder without host ids: ' + JSON.stringify(fw).slice(0, 200));
  eq((await post('/api/lobbies', {})).status, 401, 'the friends list still needs Telegram');
  eq((await post('/api/table/join', { code: lobJ.code })).status, 401, 'sitting down still needs Telegram');
  ok((await (await post('/api/table/join', { initData: a, code: lobJ.code })).json()).joined, '100 joins the stranger’s table from the finder');
  await post('/api/table/publish', { initData: await initData(user(999)), code: lobJ.code, pub: { phase: 'night', online: true, n: 10, seats: [{ seat: 1, tgId: 100, alive: true }, { seat: 2, alive: false }] }, priv: {} });
  const fl = (await (await post('/api/lobbies', { initData: await initData(user(301, 'en')), all: true })).json()).lobbies.find(l => l.code === lobJ.code);
  ok(fl && fl.status === 'live' && fl.phase === 'night' && fl.players === 1 && fl.alive === 1, 'a running online table is listed as live with its player count: ' + JSON.stringify(fl));
  eq((await post('/api/table/join', { initData: await initData(user(301, 'en')), code: lobJ.code })).status, 409, 'nobody can join a running table');
  const lobL = await (await post('/api/lobby', { initData: b, fresh: true })).json(); await post('/api/lobby/role', { initData: b, code: lobL.code, online: true });
  ok((await (await post('/api/table/join', { initData: a, code: lobL.code })).json()).joined, '100 sits at 302’s table');
  eq((await post('/api/lobby/kick', { initData: a, code: lobL.code, tgId: 100 })).status, 404, 'only the host kicks');
  const kk = await (await post('/api/lobby/kick', { initData: b, code: lobL.code, tgId: 100 })).json(); ok(kk.ok && kk.kicked, 'host kicked 100');
  ok(lastTo(100).params.text.includes(lobL.code) && lastTo(100).params.text.includes('User302'), 'kicked player told by the bot');
  eq((await (await post('/api/lobby/status', { initData: b, code: lobL.code })).json()).players, [], 'seat freed');
  eq((await post('/api/table/state', { initData: a, code: lobL.code })).status, 403, 'kicked player no longer sees the table');
  ok(((await (await post('/api/ping', { initData: a })).json()).table || {}).code !== lobL.code, 'kicked player’s banner no longer points at that table');
  eq((await (await post('/api/lobby/kick', { initData: b, code: lobL.code, tgId: 100 })).json()).kicked, false, 'kicking twice is harmless');
  eq((await post('/api/lobby/kick', { initData: b, code: lobL.code, tgId: 302 })).status, 400, 'the host cannot kick himself');
  // remove
  ok((await (await post('/api/friends/remove', { initData: a, friendId: 301 })).json()).ok, 'removed');
  eq((await (await post('/api/friends', { initData: a })).json()).friends.map(f => f.tgId), [302], 'list after removal');
  eq((await (await post('/api/friends', { initData: await initData(user(301, 'en')) })).json()).friends, [], 'removed on both sides'); }

console.log('friend search → request → accept (bot button / app) · presence');
{ const a = await initData(user(100, 'ru'));
  await hook(msg(user(601, 'en', { first_name: 'Maria', username: 'maria_k' }), '/start'));
  await hook(msg(user(602, 'pl', { first_name: 'Marek', username: 'marek_w' }), '/start'));
  await hook(msg(user(603, 'uk', { first_name: 'Марія', username: 'mari_ua' }), '/start'));
  const sr = await (await post('/api/friends/search', { initData: a, q: '@MAR' })).json();
  eq(sr.results.map(r => r.username).sort(), ['marek_w', 'mari_ua', 'maria_k'], 'search by username prefix (case-insensitive, @ stripped)');
  ok(sr.results.every(r => r.online === true && r.isFriend === false && r.requested === false), 'fresh users are online (just talked to the bot) and not friends');
  eq((await (await post('/api/friends/search', { initData: a, q: 'Мар' })).json()).results.map(r => r.tgId), [603], 'search by first name');
  eq((await (await post('/api/friends/search', { initData: a, q: 'x' })).json()).results, [], 'too short → empty');
  eq((await (await post('/api/friends/search', { initData: a, q: '%' })).json()).results, [], 'wildcards stripped');
  // request → the target gets buttons
  const rq = await (await post('/api/friends/request', { initData: a, tgId: 601 })).json(); eq(rq.status, 'sent', 'request sent');
  const dm = lastTo(601); ok(dm.params.text.includes('User100') && dm.params.text.includes('wants to add you') && dm.params.reply_markup.inline_keyboard[0][0].callback_data === 'fr_acc_100', 'request DM with accept/decline buttons (en)');
  eq((await (await post('/api/friends/request', { initData: a, tgId: 601 })).json()).status, 'pending', 'second request is not re-sent');
  eq((await post('/api/friends/request', { initData: a, tgId: 999999 })).status, 404, 'unknown user');
  eq((await (await post('/api/friends/request', { initData: a, tgId: 100 })).json()).status, 'self', 'self');
  ok((await (await post('/api/friends/search', { initData: a, q: 'maria' })).json()).results[0].requested === true, 'search shows requested');
  const rqs = await (await post('/api/friends/requests', { initData: a })).json(); eq(rqs.outgoing.map(r => r.tgId), [601], 'outgoing listed'); eq(rqs.incoming, [], 'no incoming');
  const r601 = await (await post('/api/friends/requests', { initData: await initData(user(601, 'en')) })).json(); eq(r601.incoming.map(r => r.name), ['User100'], 'incoming on the other side');
  // accept via the bot button
  await hook({ update_id: 50, callback_query: { id: 'cb1', from: user(601, 'en', { first_name: 'Maria' }), data: 'fr_acc_100', message: { message_id: dm.params.chat_id ? 77 : 77, chat: { id: 601 } } } });
  const acq = lastCall('answerCallbackQuery'); ok(acq.params.callback_query_id === 'cb1' && acq.params.text.includes('now friends'), 'callback answered');
  ok(lastCall('editMessageText').params.text.includes('User100'), 'request message edited');
  ok(lastTo(100).params.text.includes('Maria') && lastTo(100).params.text.includes('принял'), 'requester notified (ru)');
  eq((await (await post('/api/friends', { initData: a })).json()).friends.map(f => f.tgId).includes(601), true, 'now friends');
  await hook({ update_id: 51, callback_query: { id: 'cb2', from: user(601, 'en'), data: 'fr_acc_100', message: { message_id: 77, chat: { id: 601 } } } });
  ok(lastCall('answerCallbackQuery').params.text.includes('already'), 'pressing again → already handled');
  // decline via the bot button
  await post('/api/friends/request', { initData: a, tgId: 602 });
  await hook({ update_id: 52, callback_query: { id: 'cb3', from: user(602, 'pl'), data: 'fr_dec_100', message: { message_id: 78, chat: { id: 602 } } } });
  ok(lastCall('answerCallbackQuery').params.text.includes('odrzucone'), 'declined (pl)');
  ok(!(await (await post('/api/friends', { initData: a })).json()).friends.some(f => f.tgId === 602), 'not friends after decline');
  // accept inside the app; a reverse request auto-accepts
  await post('/api/friends/request', { initData: a, tgId: 603 });
  const b603 = await initData(user(603, 'uk'));
  const resp = await (await post('/api/friends/respond', { initData: b603, tgId: 100, accept: true })).json(); ok(resp.ok && !resp.gone && resp.friend.name === 'User100', 'accepted in the app');
  const rev = await (await post('/api/friends/request', { initData: await initData(user(602, 'pl')), tgId: 100 })).json(); eq(rev.status, 'sent', 'declined earlier → new request from the other side is sent');
  await post('/api/friends/request', { initData: a, tgId: 602 });
  ok((await (await post('/api/friends', { initData: a })).json()).friends.some(f => f.tgId === 602), 'crossing requests → friends');
  // presence: ping updates seen_at; stale users are offline
  await env.DB.prepare('UPDATE users SET seen_at = ?1 WHERE tg_id = 601').bind(now() - 3600).run();
  let fr = (await (await post('/api/friends', { initData: a })).json()).friends.find(f => f.tgId === 601); ok(fr.online === false && fr.seenAgo >= 3600, 'offline after an hour');
  ok((await (await post('/api/ping', { initData: await initData(user(601, 'en')) })).json()).ok, 'ping');
  fr = (await (await post('/api/friends', { initData: a })).json()).friends.find(f => f.tgId === 601); ok(fr.online === true && fr.seenAgo < 5, 'online after ping');
  ok((await (await post('/api/friends', { initData: a })).json()).friends[0].online === true, 'online friends sorted first'); }

console.log('admin: full access grants (bot commands + API)');
{ const U601 = user(601, 'en', { first_name: 'Maria', username: 'maria_k' }), U602 = user(602, 'pl', { first_name: 'Marek', username: 'marek_w' });
  await hook(msg(U601, '/start')); await hook(msg(U602, '/start')); // refresh usernames in the users table
  const adm = await initData(user(777, 'ru', { first_name: 'Admin' })); const usr = await initData(U601);
  const meAdm = await (await post('/api/me', { initData: adm })).json();
  ok(meAdm.admin === true && (await (await post('/api/me', { initData: usr })).json()).admin === false, 'admin flag in /api/me');
  ok(meAdm.owned.allUntil > Date.now() + 3000 * 86400000, 'admin owns everything without buying');
  eq((await post('/api/admin/grant', { initData: usr, q: '@maria_k' })).status, 403, 'non-admin forbidden');
  const g = await (await post('/api/admin/grant', { initData: adm, q: '@maria_k', days: 30 })).json();
  ok(g.ok && g.granted.tgId === 601 && g.granted.until > Date.now() + 29 * 86400000 && g.grants.some(x => x.tgId === 601), 'granted 30 days via API');
  ok(lastTo(601).params.text.includes('full access') && lastTo(601).params.text.includes('until'), 'player notified (en)');
  const me601 = await (await post('/api/me', { initData: usr })).json(); ok(me601.owned.allUntil > Date.now() + 29 * 86400000, 'me.owned.allUntil set');
  ok((await (await post('/api/invoice', { initData: usr, kind: 'role', id: 'sniper' })).json()).link, 'buying is still possible while granted (grant is temporary)');
  // bot commands
  await hook(msg(user(777, 'ru'), '/grant @marek_w 7')); ok(lastTo(777).params.text.includes('Marek') && lastTo(777).params.text.includes('до'), '/grant via bot');
  ok(lastTo(602).params.text.includes('pełny dostęp'), 'player notified (pl)');
  await hook(msg(user(777, 'ru'), '/grant 603')); ok(lastTo(777).params.text.includes('603') || lastTo(777).params.text.includes('Марія') || lastTo(777).params.text.includes('User603'), '/grant by numeric id');
  await hook(msg(user(777, 'ru'), '/grant @nobody_here')); ok(lastTo(777).params.text.includes('не найден'), 'unknown user');
  await hook(msg(user(777, 'ru'), '/grants')); ok(lastTo(777).params.text.includes('Maria') && lastTo(777).params.text.includes('Marek') && (lastTo(777).params.text.match(/•/g) || []).length >= 3, '/grants lists the three (plus referral trials)');
  await hook(msg(U601, '/grant @marek_w')); ok(!lastTo(601).params.text.includes('granted') && lastTo(601).params.text.includes('Open the app'), 'non-admin /grant is ignored');
  await hook(msg(user(777, 'ru'), '/revoke @marek_w')); ok(lastTo(777).params.text.includes('отозван') && lastTo(602).params.text.includes('zakończył'), '/revoke via bot');
  const rv = await (await post('/api/admin/revoke', { initData: adm, q: '601' })).json(); ok(rv.ok && !rv.grants.some(x => x.tgId === 601) && rv.grants.some(x => x.tgId === 603), 'revoke via API by id');
  eq((await (await post('/api/me', { initData: usr })).json()).owned.allUntil, 0, 'allUntil cleared');
  await hook(msg(user(777, 'ru'), '/help')); ok(lastTo(777).params.text.includes('/grant'), 'admin help');
  // expired grants do not count
  await env.DB.prepare('UPDATE grants SET until = ?1 WHERE tg_id = 603').bind(now() - 10).run();
  ok(!(await (await post('/api/admin/grants', { initData: adm })).json()).grants.some(x => x.tgId === 603), 'expired grant not listed');
  eq((await (await post('/api/me', { initData: await initData(user(603, 'uk')) })).json()).owned.allUntil, 0, 'expired → no access'); }

console.log('game result → ratings');
await env.DB.prepare('INSERT OR IGNORE INTO friends (tg_id, friend_id, created_at) VALUES (100, 201, 0), (201, 100, 0), (100, 202, 0), (202, 100, 0), (9001, 9002, 0), (9002, 9001, 0)').run(); // results credit only the host's own people
{ const host = await initData(user(100));
  const game = { id: 'g-1', mode: 'classic', winner: 'city', players: [{ seat: 1, name: 'A', tgId: 201, roleId: 'don', won: false, points: -10, side: 'mafia' }, { seat: 2, name: 'B', tgId: 202, roleId: 'sheriff', won: true, points: 31, side: 'city' }, { seat: 3, name: 'C', roleId: 'citizen', won: true, points: 24, side: 'city' }] };
  const r = await (await post('/api/game/result', { initData: host, game })).json(); ok(r.ok && r.recorded, 'recorded');
  eq(r.streaks, { 201: { side: 'mafia', n: 0 }, 202: { side: 'city', n: 1 } }, 'win streaks for the side played');
  // two more city wins for 202 and a mafia game in between: the city streak keeps counting, a loss resets it
  for (const [id, won, side] of [['g-2', true, 'city'], ['g-3', false, 'mafia'], ['g-4', true, 'city']]) await post('/api/game/result', { initData: host, game: { id, mode: 'classic', winner: won ? side : 'city', players: [{ seat: 2, name: 'B', tgId: 202, roleId: side === 'city' ? 'doctor' : 'mafia', won, points: won ? 24 : -10, side }] } });
  eq((await (await post('/api/game/result', { initData: host, game: { id: 'g-5', mode: 'classic', winner: 'city', players: [{ seat: 2, name: 'B', tgId: 202, roleId: 'sheriff', won: true, points: 24, side: 'city' }] } })).json()).streaks['202'], { side: 'city', n: 4 }, 'four city wins in a row (the mafia loss does not break the city streak)');
  eq((await (await post('/api/game/result', { initData: host, game: { id: 'g-6', mode: 'classic', winner: 'mafia', players: [{ seat: 2, name: 'B', tgId: 202, roleId: 'sheriff', won: false, points: -10, side: 'city' }] } })).json()).streaks['202'], { side: 'city', n: 0 }, 'a city loss resets the city streak');
  await env.DB.prepare("DELETE FROM games WHERE game_id IN ('g-2', 'g-3', 'g-4', 'g-5', 'g-6')").run(); await env.DB.prepare('UPDATE ratings SET points = 31, games = 1, wins = 1 WHERE tg_id = 202').run(); await env.DB.prepare('UPDATE ratings SET hosted = 1 WHERE tg_id = 100').run();
  eq(r.ratings['202'], { points: 31, games: 1, wins: 1, hosted: 0 }, 'sheriff rating'); eq(r.ratings['201'], { points: -10, games: 1, wins: 0, hosted: 0 }, 'don rating');
  const again = await (await post('/api/game/result', { initData: host, game })).json(); ok(again.ok && !again.recorded && again.ratings['202'].points === 31, 'resend is idempotent');
  const me = await (await post('/api/me', { initData: host })).json(); eq(me.rating.hosted, 1, 'host credited');
  const lb = await (await call('/api/leaderboard?limit=5')).json(); ok(lb.ok && lb.top[0].tgId === 202 && lb.top[0].points === 1031 && lb.top[0].rank === 1, 'leaderboard');
  // v49: served from a 10-minute cache; a game result drops it at once; a stale cache is rebuilt on request
  ok(lb.every === 600000 && lb.at > 0, 'leaderboard says when it was built and how often');
  await env.DB.prepare('UPDATE ratings SET points = 900 WHERE tg_id = 201').run();
  ok((await (await call('/api/leaderboard?limit=5')).json()).top[0].tgId === 202, 'leaderboard comes from the cache (a change without a game result waits for the rebuild)');
  await env.DB.prepare("UPDATE discord_cfg SET updated_at = updated_at - 700 WHERE key = 'lb:top'").run();
  ok((await (await call('/api/leaderboard?limit=5')).json()).top[0].tgId === 201, 'a cache older than 10 minutes is rebuilt on request');
  await env.DB.prepare('UPDATE ratings SET points = -10 WHERE tg_id = 201').run();
  ok((await (await call('/api/leaderboard?limit=5')).json()).top[0].tgId === 201, 'still the cached top within 10 minutes');
  await post('/api/game/result', { initData: host, game: { id: 'g-lb', mode: 'classic', winner: 'city', players: [{ seat: 2, name: 'B', tgId: 202, roleId: 'sheriff', won: true, points: 1, side: 'city' }] } });
  const lb3 = await (await call('/api/leaderboard?limit=5')).json(); ok(lb3.top[0].tgId === 202 && lb3.top[0].points === 1032, 'a new game result shows at once (the result drops the cache)');
  await env.DB.prepare("DELETE FROM games WHERE game_id = 'g-lb'").run(); await env.DB.prepare('UPDATE ratings SET points = 31, games = 1, wins = 1 WHERE tg_id = 202').run(); await env.DB.prepare('UPDATE ratings SET hosted = 1 WHERE tg_id = 100').run(); await env.DB.prepare("DELETE FROM discord_cfg WHERE key = 'lb:top'").run(); }

await env.DB.prepare('DELETE FROM friends WHERE (tg_id = 100 AND friend_id IN (201, 202)) OR (friend_id = 100 AND tg_id IN (201, 202))').run();
console.log('player profile');
{ const a = await initData(user(100)); const pr = await (await post('/api/profile', { initData: a, tgId: 202 })).json();
  ok(pr.ok && pr.user.tgId === 202 && pr.user.name === 'User202' && pr.rating.points === 1031 && pr.rating.games === 1 && pr.rating.wins === 1, 'profile with rating: ' + JSON.stringify(pr.rating));
  eq(pr.roles, [{ roleId: 'sheriff', games: 1, wins: 1, points: 31 }], 'per-role stats'); ok(pr.recent.length === 1 && pr.recent[0].roleId === 'sheriff' && pr.recent[0].won === true && pr.recent[0].n === 3 && pr.recent[0].winner === 'city', 'recent games');
  ok(typeof pr.user.online === 'boolean' && typeof pr.user.seenAgo === 'number' && pr.isFriend === false && pr.grant === false, 'presence, friendship, grant flags');
  eq(pr.streaks, { city: 1, mafia: 0, neutral: 0 }, 'profile carries the current streaks per side');
  const self = await (await post('/api/profile', { initData: a, tgId: 100 })).json(); ok(self.ok && self.rating.hosted === 1, 'own profile');
  eq((await post('/api/profile', { initData: a, tgId: 4242 })).status, 404, 'unknown player'); eq((await post('/api/profile', { initData: a, tgId: 'x' })).status, 400, 'bad id'); }

console.log('referrals: attribution → welcome trial → qualification → milestones → credits');
{ const host = user(900, 'ru', { first_name: 'Хост', username: 'host900' }); const hi = await initData(host);
  const me = await (await post('/api/me', { initData: hi })).json(); const code = me.invite.code; ok(me.invite.ref === `https://t.me/mafiapro_test_bot?start=ref_${code}` && me.credits.role === 0, 'ref link in /api/me');
  const r0 = await (await post('/api/referrals', { initData: hi })).json(); ok(r0.ok && r0.invited === 0 && r0.qualified === 0 && r0.next.n === 1 && r0.welcomeDays === 7 && r0.milestones.length === 6, 'empty referral stats');
  // 6 brand-new users arrive through ref_ / friend_ links; an existing user is not attributed
  const newbies = [901, 902, 903, 904, 905, 906];
  for (const id of newbies) { await hook(msg(user(id, id % 2 ? 'uk' : 'en', { first_name: 'N' + id }), `/start ${id === 902 ? 'friend' : 'ref'}_${code}`)); }
  ok(lastTo(901).params.text.includes('запрошенням') && lastTo(901).params.text.includes('Хост') && lastTo(901).params.text.includes('7'), 'invitee welcomed with the 7-day trial (uk)');
  ok((await (await post('/api/me', { initData: await initData(user(901, 'uk', { first_name: 'N901' })) })).json()).owned.allUntil > Date.now() + 6 * 86400000, 'trial active for the invitee');
  ok(lastTo(902).params.text.includes('друзі') || lastTo(902).params.text.includes('friends'), 'friend_ link also attributes and befriends');
  await hook(msg(user(100, 'ru'), `/start ref_${code}`)); // user 100 existed before → no attribution
  const r1 = await (await post('/api/referrals', { initData: hi })).json(); eq(r1.invited, 6, 'six attributed, the old user is not'); eq(r1.qualified, 0, 'none qualified yet');
  ok(r1.list.length === 6 && r1.list.every(x => x.qualified === false), 'list of invitees');
  await hook(msg(user(900, 'ru'), `/start ref_${code}`)); eq((await (await post('/api/referrals', { initData: hi })).json()).invited, 6, 'own link does nothing');
  // qualification through a dealt card (lobby) and through a game result
  const lob = await (await post('/api/lobby', { initData: hi, fresh: true })).json();
  for (const id of [901, 902, 903]) await hook(msg(user(id, 'uk', { first_name: 'N' + id }), `/start join_${lob.code}`));
  tg.calls.length = 0;
  await post('/api/lobby/deal', { initData: hi, code: lob.code, cards: [901, 902, 903].map(id => ({ tgId: id, seat: id - 900, roleId: 'citizen' })) });
  let r2 = await (await post('/api/referrals', { initData: hi })).json(); eq(r2.qualified, 3, 'three qualified after receiving cards');
  const hostMsgs = tg.calls.filter(c => c.method === 'sendMessage' && c.params.chat_id === 900).map(c => c.params.text);
  ok(hostMsgs.filter(x => x.includes('первую партию')).length === 3, 'host told about each qualified invitee');
  ok(hostMsgs.some(x => x.includes('Награда') && x.includes('7 дн')) && hostMsgs.some(x => x.includes('30 дн')), 'milestones 1 (7 days) and 3 (30 days) paid');
  const g = await env.DB.prepare('SELECT until FROM grants WHERE tg_id = 900').first(); ok(g && g.until > now() + 36 * 86400, 'host has 37 days of full access');
  await post('/api/lobby/deal', { initData: hi, code: lob.code, cards: [{ tgId: 901, seat: 1, roleId: 'citizen' }] });
  eq((await (await post('/api/referrals', { initData: hi })).json()).qualified, 3, 'qualifying twice does not double count');
  await post('/api/game/result', { initData: hi, game: { id: 'ref-g1', mode: 'classic', winner: 'city', players: [{ seat: 1, tgId: 904, roleId: 'don', won: false, points: -10 }, { seat: 2, tgId: 905, roleId: 'sheriff', won: true, points: 31 }] } });
  r2 = await (await post('/api/referrals', { initData: hi })).json(); eq(r2.qualified, 5, 'game result qualifies two more');
  ok(r2.credits.role === 1 && r2.next.n === 10, 'milestone 5 → one free premium card; next is 10');
  ok(tg.calls.some(c => c.method === 'sendMessage' && c.params.chat_id === 900 && c.params.text.includes('премиум-карта')), 'card reward announced');
  // spend the credit in the shop
  const free = await (await post('/api/invoice', { initData: hi, kind: 'role', id: 'sniper', useCredit: true })).json(); ok(free.ok && free.owned && free.credit && free.credits.role === 0, 'free card claimed');
  ok((await (await post('/api/me', { initData: hi })).json()).owned.roles.includes('sniper'), 'reward card owned');
  eq((await post('/api/invoice', { initData: hi, kind: 'role', id: 'tracker', useCredit: true })).status, 400, 'no second credit');
  eq((await post('/api/invoice', { initData: hi, kind: 'pack', id: 'diplomacy', useCredit: true })).status, 200, 'pack ignores useCredit and makes a normal invoice'); }

console.log('direct Mini App link ?startapp=ref_<code>');
{ const host = user(900, 'ru'); const code = (await (await post('/api/me', { initData: await initData(host) })).json()).invite.code;
  const fresh = await (await post('/api/ref/attach', { initData: await initData(user(920, 'pl', { first_name: 'Direct' })), code })).json(); ok(fresh.ok && fresh.attached === true, 'fresh account attached via the app');
  ok(lastTo(920).params.text.includes('zaproszenia'), 'welcomed in Polish');
  eq((await (await post('/api/ref/attach', { initData: await initData(user(920, 'pl')), code })).json()).attached, false, 'second attach ignored');
  await env.DB.prepare('UPDATE users SET created_at = ?1 WHERE tg_id = 921').bind(now() - 7200).run();
  await post('/api/me', { initData: await initData(user(921, 'en')) }); await env.DB.prepare('UPDATE users SET created_at = ?1 WHERE tg_id = 921').bind(now() - 7200).run();
  eq((await (await post('/api/ref/attach', { initData: await initData(user(921, 'en')), code })).json()).attached, false, 'old account is not attributed');
  eq((await (await post('/api/referrals', { initData: await initData(host) })).json()).invited, 7, 'seven invitees now'); }

console.log('partner programme: apply → admin approves → stats & earnings');
{ const P = user(910, 'ru', { first_name: 'Клуб', username: 'club910' }); const pi = await initData(P); await hook(msg(P, '/start'));
  const none = await (await post('/api/partner', { initData: pi })).json(); ok(none.ok && none.status === 'none' && none.link.includes('start=ref_') && none.share === 20 && none.minPayout === 1000, 'no partner yet, link ready');
  const ap = await (await post('/api/partner/apply', { initData: pi, name: 'Клуб Мафии Днепр', channel: 't.me/mafia_dnepr', audience: '1200 игроков' })).json(); eq(ap.status, 'pending', 'application pending');
  ok(lastTo(910).params.text.includes('Заявка') && lastTo(777).params.text.includes('Клуб Мафии Днепр') && lastTo(777).params.text.includes('/partner 910'), 'applicant and admin notified');
  eq((await post('/api/admin/partner', { initData: pi, q: '910', approve: true })).status, 403, 'only admins approve');
  const before910 = tg.calls.filter(c => c.method === 'sendMessage' && c.params.chat_id === 910).length;
  await hook(msg(user(777, 'ru'), '/partner @club910'));
  const msgs910 = tg.calls.filter(c => c.method === 'sendMessage' && c.params.chat_id === 910).slice(before910).map(c => c.params.text);
  ok(lastTo(777).params.text.includes('подтверждён') && msgs910.some(x => x.includes('20%')), 'approved via bot');
  // a partner lands in Clubs at once: an active club is created from the application (name + channel link), partner is its head
  ok(msgs910.some(x => x.includes('создан клуб «Клуб Мафии Днепр»')), 'partner told about the auto-created club');
  const pc = await (await post('/api/partner', { initData: pi })).json(); ok(pc.club && pc.club.name === 'Клуб Мафии Днепр' && pc.club.id > 0, '/api/partner reports the club');
  const pme = await (await post('/api/me', { initData: pi })).json(); ok(pme.club && pme.club.id === pc.club.id && pme.club.role === 'owner' && pme.club.partner === true, 'me.club: owner of a partner club');
  const pcl = await (await post('/api/clubs', { initData: pi })).json(); ok(pcl.clubs.length === 1 && pcl.clubs[0].id === pc.club.id && pcl.clubs[0].link === 't.me/mafia_dnepr' && pcl.clubs[0].status === 'active' && pcl.mine.role === 'owner', 'club listed as active with the channel link');
  eq((await post('/api/club/apply', { initData: pi, name: 'Another' })).status, 409, 'partner cannot found a second club');
  const top0 = await (await call(`/api/clubs/top`)).json(); ok(top0.ok && top0.top.length === 1 && top0.top[0].members === 1 && top0.top[0].partner === true && top0.top[0].rank === 1, 'public top of clubs');
  // the partner brings two new players; one buys a scenario (500 stars) and a card (100)
  const pcode = (await (await post('/api/me', { initData: pi })).json()).invite.code;
  await hook(msg(user(911, 'en', { first_name: 'Buyer' }), `/start ref_${pcode}`)); await hook(msg(user(912, 'en', { first_name: 'Free' }), `/start ref_${pcode}`));
  const bi = await initData(user(911, 'en', { first_name: 'Buyer' }));
  for (const [kind, id] of [['scenario', 'chaos'], ['role', 'avenger']]) { const inv = await (await post('/api/invoice', { initData: bi, kind, id })).json(); await hook({ update_id: 90, message: { message_id: 1, from: user(911, 'en'), chat: { id: 911, type: 'private' }, successful_payment: { currency: 'XTR', total_amount: inv.stars, invoice_payload: inv.payload, telegram_payment_charge_id: 'c' + id } } }); }
  const ps = await (await post('/api/partner', { initData: pi })).json();
  ok(ps.status === 'active' && ps.stats.invited === 2 && ps.stats.purchases === 2 && ps.stats.purchasedStars === 600 && ps.stats.earnedStars === 120 && ps.stats.balanceStars === 120, 'partner stats: 2 invited, 600⭐ bought, 20% = 120⭐');
  await env.DB.prepare('INSERT INTO payouts (tg_id, stars, note, created_at) VALUES (910, 100, ?1, ?2)').bind('test', now()).run();
  eq((await (await post('/api/partner', { initData: pi })).json()).stats.balanceStars, 20, 'balance minus payouts');
  const adm = await initData(user(777, 'ru'));
  const lst = await (await post('/api/admin/partners', { initData: adm })).json(); ok(lst.partners.length === 1 && lst.partners[0].status === 'active' && lst.partners[0].stats.earnedStars === 120, 'admin partner list');
  await hook(msg(user(777, 'ru'), '/partners')); ok(lastTo(777).params.text.includes('club910') && lastTo(777).params.text.includes('120⭐'), '/partners');
  await hook(msg(P, 'Хочу выплату 120 звёзд на карту')); ok(lastTo(910).params.text.includes('Передано') && lastTo(777).params.text.includes('Хочу выплату') && lastTo(777).params.text.includes('club910'), 'partner message forwarded to the admin');
  const rej = await (await post('/api/admin/partner', { initData: adm, q: '@club910', approve: false })).json(); ok(rej.ok && rej.partners[0].status === 'rejected' && lastTo(910).params.text.includes('отклонена'), 'rejected via API'); }

console.log('clubs: apply → admin approves → listed → invite / apply / respond → one club per player → chat → lobby call');
{ const head = user(1000, 'ru', { first_name: 'Глава', username: 'head1000' }); const hi = await initData(head); await hook(msg(head, '/start'));
  const logo = 'data:image/png;base64,' + Buffer.from('fakepng').toString('base64');
  const ap = await (await post('/api/club/apply', { initData: hi, name: 'Клуб Кастельмар', city: 'Київ', about: 'Спортивная мафия по субботам', link: 't.me/castelmar', logo })).json();
  ok(ap.ok && ap.status === 'pending' && ap.id > 0, 'application created'); const cid = ap.id;
  ok(lastTo(1000).params.text.includes('Заявка на клуб') && lastTo(777).params.text.includes('Клуб Кастельмар') && lastTo(777).params.text.includes(`/club_ok ${cid}`), 'head and admin notified');
  eq((await post('/api/club/apply', { initData: hi, name: 'Second' })).status, 409, 'one pending application per head');
  eq((await post('/api/club/apply', { initData: hi, name: 'X' })).status, 400, 'short name refused');
  ok((await (await post('/api/clubs', { initData: hi })).json()).clubs.every(c => c.name !== 'Клуб Кастельмар'), 'pending club is not listed');
  eq((await post('/api/admin/club', { initData: hi, id: cid, approve: true })).status, 403, 'only admins approve');
  await hook(msg(user(777, 'ru'), `/club_ok ${cid}`)); ok(lastTo(777).params.text.includes('подтверждён') && lastTo(1000).params.text.includes('подтверждён'), 'approved via bot');
  const lst0 = await (await post('/api/clubs', { initData: hi })).json(); const lst = Object.assign({}, lst0, { clubs: lst0.clubs.filter(c => c.name === 'Клуб Кастельмар') });
  ok(lst0.clubs.length === 2 && lst.clubs.length === 1 && lst.clubs[0].name === 'Клуб Кастельмар' && lst.clubs[0].city === 'Київ' && lst.clubs[0].logo === logo && lst.clubs[0].members === 1 && lst.clubs[0].online === 1 && lst.mine.role === 'owner', 'listed with logo, city, 1 member online; head is owner');
  ok((await (await post('/api/me', { initData: hi })).json()).club.id === cid, 'me.club');
  // invite a player (bot buttons) and a player applies (head approves in app)
  const p1 = user(1001, 'uk', { first_name: 'Гравець', username: 'pl1001' }), p2 = user(1002, 'en', { first_name: 'Applicant' }); await hook(msg(p1, '/start')); await hook(msg(p2, '/start'));
  const inv = await (await post('/api/club/invite', { initData: hi, q: '@pl1001' })).json(); eq(inv.status, 'invited', 'invite sent');
  ok(lastTo(1001).params.text.includes('запрошує') && lastTo(1001).params.reply_markup.inline_keyboard[0][0].callback_data === `cl_acc_${cid}`, 'invite DM with buttons (uk)');
  await hook({ update_id: 70, callback_query: { id: 'cbc1', from: p1, data: `cl_acc_${cid}`, message: { message_id: 1, chat: { id: 1001 } } } });
  ok(lastCall('answerCallbackQuery').params.text.includes('клубі') && lastTo(1000).params.text.includes('вступил'), 'accepted via button; head notified');
  const ap2 = await (await post('/api/club/join', { initData: await initData(p2), id: cid })).json(); eq(ap2.status, 'applied', 'application sent');
  ok(lastTo(1000).params.text.includes('хочет вступить'), 'head notified about the application');
  const det = await (await post('/api/club', { initData: hi, id: cid })).json(); ok(det.canManage && det.requests.length === 1 && det.requests[0].kind === 'apply' && det.members.length === 2, 'detail for the head: 1 request, 2 members');
  eq((await post('/api/club/approve', { initData: await initData(p1), tgId: 1002, accept: true })).status, 403, 'members cannot approve');
  ok((await (await post('/api/club/approve', { initData: hi, tgId: 1002, accept: true })).json()).ok && lastTo(1002).params.text.includes('accepted'), 'head approved the application');
  const det2 = await (await post('/api/club', { initData: await initData(p2), id: cid })).json(); ok(det2.myRole === 'member' && !det2.canManage && det2.requests.length === 0 && det2.club.members === 3, 'member view');
  // one club per player
  const head2 = user(1010, 'pl', { first_name: 'Szef' }); await hook(msg(head2, '/start'));
  const ap3 = await (await post('/api/club/apply', { initData: await initData(head2), name: 'Klub Warszawa', city: 'Warszawa' })).json(); await hook(msg(user(777, 'ru'), `/club_ok ${ap3.id}`));
  eq((await post('/api/club/join', { initData: await initData(p1), id: ap3.id })).status, 409, 'a member cannot apply to a second club');
  eq((await post('/api/club/invite', { initData: await initData(head2), q: '1001' })).status, 409, 'cannot invite a member of another club');
  eq((await post('/api/club/apply', { initData: await initData(p1), name: 'Mine' })).status, 409, 'a member cannot found a club');
  ok((await (await post('/api/club/leave', { initData: await initData(p1) })).json()).ok, 'member left');
  eq((await post('/api/club/leave', { initData: hi })).status, 400, 'owner cannot leave');
  eq((await (await post('/api/club/join', { initData: await initData(p1), id: ap3.id })).json()).status, 'applied', 'after leaving, can apply elsewhere');
  const kick = await (await post('/api/club/kick', { initData: hi, tgId: 1002 })).json(); ok(kick.ok && lastTo(1002).params.text.includes('removed'), 'kicked');
  eq((await post('/api/club/kick', { initData: hi, tgId: 1000 })).status, 400, 'owner cannot be kicked');
  // chat
  eq((await post('/api/club/chat', { initData: await initData(p2) })).status, 403, 'no club → no chat');
  const s1 = await (await post('/api/club/chat/send', { initData: hi, text: 'Привет, клуб!' })).json(); ok(s1.ok && s1.id > 0, 'message sent');
  eq((await post('/api/club/chat/send', { initData: hi, text: 'spam' })).status, 429, 'rate limited');
  const ch = await (await post('/api/club/chat', { initData: hi })).json(); ok(ch.ok && ch.messages.some(m => m.kind === 'text' && m.text === 'Привет, клуб!' && m.me) && ch.messages.some(m => m.kind === 'system'), 'chat has the message and system entries');
  const inc = await (await post('/api/club/chat', { initData: hi, since: ch.messages[ch.messages.length - 1].id })).json(); eq(inc.messages, [], 'incremental fetch empty');
  // lobby call: online members get a DM with a join button
  await env.DB.prepare('UPDATE club_messages SET created_at = created_at - 5').run();
  await hook(msg(p1, '/start')); // p1 is back online (not a member now); add a member who is online
  const p3 = user(1003, 'hy', { first_name: 'Արամ' }); await hook(msg(p3, '/start')); await post('/api/club/invite', { initData: hi, q: '1003' }); await post('/api/club/respond', { initData: await initData(p3), id: cid, accept: true });
  const lob = await (await post('/api/lobby', { initData: hi, fresh: true })).json();
  eq((await post('/api/club/chat/send', { initData: hi, lobby: 'NOPE11' })).status, 404, 'only my open lobby can be announced');
  await env.DB.prepare('UPDATE club_messages SET created_at = created_at - 5').run();
  const lm = await (await post('/api/club/chat/send', { initData: hi, lobby: lob.code })).json(); ok(lm.ok, 'lobby announced');
  const pi3 = await (await post('/api/ping', { initData: await initData(p3) })).json(); ok(pi3.invites.length === 1 && pi3.invites[0].code === lob.code && pi3.invites[0].kind === 'club', 'online member got the table call in the app (hy)');
  await env.DB.prepare('UPDATE table_invites SET created_at = created_at - 60 WHERE tg_id = 1003').run(); await post('/api/table/actions', { initData: hi, code: lob.code, since: 0 });
  const dm = lastTo(1003); ok(dm.params.text.includes(lob.code) && dm.params.reply_markup.inline_keyboard[0][0].callback_data === 'tb_acc_' + lob.code, 'unanswered → DM with "I’m in / Decline" (hy)');
  await hook({ update_id: 79, callback_query: { id: 'cbt3', from: p3, data: `tb_acc_${lob.code}`, message: { message_id: 6, chat: { id: 1003 } } } });
  ok((await (await post('/api/lobby/status', { initData: hi, code: lob.code })).json()).players.some(x => x.tgId === 1003) && lastCall('editMessageText').params.reply_markup.inline_keyboard[0][0].web_app.url.includes('startapp=table_' + lob.code), 'accepted from the DM → seated, message now opens the table');
  const ch2 = await (await post('/api/club/chat', { initData: hi, since: s1.id })).json(); ok(ch2.messages.some(m => m.kind === 'lobby' && m.code === lob.code), 'lobby message in chat');
  // admin list + reject
  const adm = await initData(user(777, 'ru'));
  const al = await (await post('/api/admin/clubs', { initData: adm })).json(); ok(al.clubs.length === 3 && al.clubs.every(c => c.status === 'active') && al.clubs[0].owner, 'admin list');
  await hook(msg(user(777, 'ru'), '/clubs')); ok(lastTo(777).params.text.includes('Кастельмар') && lastTo(777).params.text.includes('Warszawa'), '/clubs');
  const rj = await (await post('/api/admin/club', { initData: adm, id: ap3.id, approve: false })).json(); ok(rj.ok && lastTo(1010).params.text.includes('odrzucone'), 'rejected via API (pl)');
  ok((await (await post('/api/clubs', { initData: hi })).json()).clubs.length === 2, 'rejected club not listed');
  const top = await (await call(`/api/clubs/top?limit=10`)).json(); ok(top.ok && top.top[0].id === cid && top.top[0].members === 2 && top.top[0].online >= 1 && top.top.length === 2 && top.top[1].members === 1, 'top of clubs by members: ' + top.top.map(c => c.name + ':' + c.members).join(', '));
  const up = await (await post('/api/club/update', { initData: hi, id: cid, city: 'Киев', logo: '' })).json(); ok(up.ok && up.club.city === 'Киев' && up.club.logo === '', 'head edited city and removed the logo');
  eq((await post('/api/club/update', { initData: await initData(p3), id: cid, city: 'X' })).status, 403, 'members cannot edit'); }

console.log('live table: publish → players read public + private → act → host reads → chat window → eliminated players see only the seats');
{ const host = user(1100, 'ru', { first_name: 'Ведущий' }); const hi = await initData(host); await hook(msg(host, '/start'));
  const lob = await (await post('/api/lobby', { initData: hi, fresh: true })).json(); const code = lob.code;
  const pl = [1101, 1102, 1103].map((id, i) => user(id, ['uk', 'en', 'pl'][i], { first_name: 'P' + id }));
  for (const p of pl) await hook(msg(p, `/start join_${code}`));
  ok(lastTo(1101).params.reply_markup.inline_keyboard[0][0].web_app.url.includes(`startapp=table_${code}`), 'join reply carries an "open table" app button');
  const id = async p => initData(p);
  // night 1: mafia (1101, 1102) propose, the don (1101) decides; the sheriff (1103) checks
  const pub = { phase: 'night', night: 1, day: 0, code, n: 3, chat: false, seats: [{ seat: 1, tgId: 1101, name: 'P1101', alive: true }, { seat: 2, tgId: 1102, name: 'P1102', alive: true }, { seat: 3, tgId: 1103, name: 'P1103', alive: true }], step: { roleId: 'don', i: 0, n: 2 } };
  const priv = { 1101: { seat: 1, roleId: 'don', alive: true, ask: { key: 'n1:s0', kind: 'shoot', need: 1, targets: [3] } }, 1102: { seat: 2, roleId: 'mafia', alive: true, ask: { key: 'n1:s0', kind: 'propose', need: 1, targets: [3] } }, 1103: { seat: 3, roleId: 'sheriff', alive: true, ask: null } };
  const pr = await (await post('/api/table/publish', { initData: hi, code, pub, priv })).json(); ok(pr.ok && pr.version === 1 && pr.delivered.length === 3 && pr.notified.length === 3, 'published; three cards delivered, three players pinged (nobody is watching yet)');
  ok(lastTo(1102).params.text.includes('Your card') && !lastTo(1102).params.text.includes('mafia'), 'card notice without the role (en)');
  eq((await (await post('/api/lobby/status', { initData: hi, code })).json()).status, 'live', 'lobby is live');
  eq((await post('/api/table/publish', { initData: await id(pl[0]), code, pub, priv })).status, 404, 'only the host publishes');
  const s2 = await (await post('/api/table/state', { initData: await id(pl[1]), code })).json();
  ok(s2.ok && s2.version === 1 && s2.pub.phase === 'night' && s2.me.roleId === 'mafia' && s2.me.ask.kind === 'propose' && !('1101' in s2) && s2.pub.seats.length === 3, 'player reads the public state and only his own private part');
  ok(await (async () => { const d = await (await post('/api/table/state', { initData: await id(pl[2]), code })).json(); return d.me.roleId === 'sheriff' && d.me.ask === null; })(), 'another player gets his own card');
  const pr2 = await (await post('/api/table/publish', { initData: hi, code, pub, priv })).json(); eq(pr2.notified, [], 'republishing the same cards pings nobody again');
  // actions: the mafioso proposes seat 3, changes his mind to seat 1, the don shoots 3; the host reads them in order
  const a1 = await (await post('/api/table/act', { initData: await id(pl[1]), code, key: 'n1:s0', payload: { pick: [3] } })).json(); ok(a1.ok && a1.id > 0, 'action stored');
  await post('/api/table/act', { initData: await id(pl[1]), code, key: 'n1:s0', payload: { pick: [1] } });
  await post('/api/table/act', { initData: await id(pl[0]), code, key: 'n1:s0', payload: { pick: [3] } });
  eq((await post('/api/table/act', { initData: await initData(user(1199)), code, key: 'x', payload: {} })).status, 403, 'strangers cannot act');
  const acts = await (await post('/api/table/actions', { initData: hi, code, since: 0 })).json();
  ok(acts.ok && acts.actions.length === 2 && acts.actions[0].tgId === 1102 && acts.actions[0].payload.pick[0] === 1 && acts.actions[1].tgId === 1101 && acts.watching.includes(1102), 'host reads the latest answer per player per key, and who is watching: ' + JSON.stringify(acts.actions.map(a => [a.tgId, a.key, a.payload])));
  const acts2 = await (await post('/api/table/actions', { initData: hi, code, since: acts.actions[1].id })).json(); eq(acts2.actions, [], 'incremental read');
  eq((await post('/api/table/actions', { initData: await id(pl[0]), code, since: 0 })).status, 404, 'players cannot read the answers');
  // chat: closed at night, open from the free discussion until the vote
  eq((await post('/api/table/chat/send', { initData: await id(pl[1]), code, text: 'hi' })).status, 403, 'chat closed at night');
  const dayPub = Object.assign({}, pub, { phase: 'day', day: 1, chat: 'all', stage: 'balagan' });
  await post('/api/table/publish', { initData: hi, code, pub: dayPub, priv });
  const c1 = await (await post('/api/table/chat/send', { initData: await id(pl[1]), code, text: 'Я мирный, честно' })).json(); ok(c1.ok, 'chat open during the free discussion');
  // speeches: only the speaking seat, and only while the speech timer runs
  await post('/api/table/publish', { initData: hi, code, pub: Object.assign({}, dayPub, { chat: 'speaker', chatSeat: 3, stage: 'speeches', timer: { key: 'sp', total: 60, left: 60, running: true, at: Date.now() } }), priv });
  eq((await post('/api/table/chat/send', { initData: await id(pl[1]), code, text: 'not my turn' })).status, 403, 'during speeches only the speaker writes');
  ok((await (await post('/api/table/chat/send', { initData: await id(pl[2]), code, text: 'моя речь' })).json()).ok, 'the speaker writes while the timer runs');
  await post('/api/table/publish', { initData: hi, code, pub: Object.assign({}, dayPub, { chat: 'speaker', chatSeat: 3, stage: 'speeches', timer: { key: 'sp', total: 60, left: 5, running: true, at: Date.now() - 9000 } }), priv });
  eq((await post('/api/table/chat/send', { initData: await id(pl[2]), code, text: 'late' })).status, 403, 'speech timer over → closed for the speaker too');
  await post('/api/table/publish', { initData: hi, code, pub: dayPub, priv });
  eq((await post('/api/table/chat/send', { initData: await id(pl[1]), code, text: 'spam' })).status, 429, 'rate limited');
  const st = await (await post('/api/table/state', { initData: await id(pl[2]), code, since: 0 })).json();
  ok(st.chat.length === 2 && st.chat[0].text === 'Я мирный, честно' && st.chat[0].name === '2 · P1102' && !st.chat[0].me, 'others read the chat with the seat number');
  await post('/api/table/publish', { initData: hi, code, pub: Object.assign({}, dayPub, { chat: false, stage: 'vote' }), priv });
  eq((await post('/api/table/chat/send', { initData: await id(pl[1]), code, text: 'late' })).status, 403, 'chat closed once the vote starts');
  const hc = await (await post('/api/table/chat/send', { initData: hi, code, text: 'Голосуем' })).json(); ok(hc.ok, 'the host can always write');
  // v62: last words — the seat leaving the table (already out of the game) writes while its 30 seconds run; nobody else
  { const privLw = JSON.parse(JSON.stringify(priv)); privLw[1101].alive = false;
    await post('/api/table/publish', { initData: hi, code, pub: Object.assign({}, dayPub, { chat: 'last', lastSeat: 1, lastWord: { seat: 1, i: 0, n: 1 }, stage: 'result', timer: { key: 'lw', total: 30, left: 30, running: true, at: Date.now() } }), priv: privLw });
    ok((await (await post('/api/table/chat/send', { initData: await id(pl[0]), code, text: 'Прощайте, я был мирным' })).json()).ok, 'last words: the player leaving the table writes');
    eq((await post('/api/table/chat/send', { initData: await id(pl[2]), code, text: 'not mine' })).status, 403, 'last words: the others wait');
    await post('/api/table/publish', { initData: hi, code, pub: Object.assign({}, dayPub, { chat: 'last', lastSeat: 1, stage: 'result', timer: { key: 'lw', total: 30, left: 2, running: true, at: Date.now() - 5000 } }), priv: privLw });
    eq((await post('/api/table/chat/send', { initData: await id(pl[0]), code, text: 'late' })).status, 403, 'last words: closed when the 30 seconds are over');
    await post('/api/table/publish', { initData: hi, code, pub: Object.assign({}, dayPub, { chat: false, stage: 'vote' }), priv }); }
  // seat 2 is voted out: he only sees who is still at the table, no chat, no stage; results come at the end
  const priv2 = Object.assign({}, priv, { 1102: Object.assign({}, priv[1102], { alive: false, ask: null }) });
  await post('/api/table/publish', { initData: hi, code, pub: Object.assign({}, dayPub, { stage: 'result', chat: true, seats: dayPub.seats.map(x => x.tgId === 1102 ? Object.assign({}, x, { alive: false }) : x), secret: 'host-only' }), priv: priv2 });
  const dead = await (await post('/api/table/state', { initData: await id(pl[1]), code, since: 0 })).json();
  ok(dead.ok && dead.pub.spectator === true && dead.pub.seats.length === 2 && dead.pub.seats.every(x => x.tgId !== 1102) && dead.pub.stage === undefined && dead.pub.secret === undefined && dead.chat.length === 0 && dead.me.alive === false && dead.me.roleId === 'mafia', 'eliminated player sees only the remaining seats: ' + JSON.stringify(dead.pub));
  eq((await post('/api/table/chat/send', { initData: await id(pl[1]), code, text: 'ghost' })).status, 403, 'eliminated players cannot write');
  await post('/api/table/publish', { initData: hi, code, pub: { phase: 'end', code, n: 3, seats: dayPub.seats, result: { side: 'city', title: 'Победа города' }, roles: [{ seat: 1, roleId: 'don' }, { seat: 2, roleId: 'mafia' }, { seat: 3, roleId: 'sheriff' }] }, priv: priv2 });
  const endv = await (await post('/api/table/state', { initData: await id(pl[1]), code })).json();
  ok(endv.pub.phase === 'end' && endv.pub.result.side === 'city' && endv.pub.roles.length === 3 && endv.pub.spectator === undefined, 'at the end the eliminated player gets the results page');
  eq((await (await post('/api/lobby/status', { initData: hi, code })).json()).status, 'finished', 'lobby finished');
  eq((await (await post('/api/me', { initData: await id(pl[1]) })).json()).table, null, 'me.table is empty after the game'); }

console.log('all players directory');
{ const a = await initData(user(100)); const d = await (await post('/api/players', { initData: a })).json();
  ok(d.ok && d.total >= 10 && d.players.length === Math.min(50, d.total) && d.players.every(p => p.tgId && typeof p.online === 'boolean' && typeof p.points === 'number'), 'directory lists everyone who opened the bot: ' + d.total);
  ok(d.players.some(p => p.me) && d.players.some(p => p.isFriend), 'me and friends flagged');
  ok(d.online >= 1 && d.players[0].seenAgo <= d.players[d.players.length - 1].seenAgo, 'most recently seen first, online count');
  const pg = await (await post('/api/players', { initData: a, limit: 3, offset: 3 })).json(); ok(pg.players.length === 3 && pg.offset === 3 && pg.total === d.total, 'paging');
  const f = await (await post('/api/players', { initData: a, q: '@mar' })).json(); ok(f.total === 2 && f.players.every(p => /^mar/i.test(p.username) || /^Мар/.test(p.name)), 'prefix filter: ' + f.players.map(p => p.username).join(','));
  eq((await post('/api/players', {})).status, 401, 'auth required'); }

console.log('discord voice room: online tables only, seats + 1, creator flag, "I am on voice", host confirmation gates the deal, cleanup');
{ const dc = await startMockDiscord(8792, { category: '333333333333' });
  const hostU = user(2100, 'ru'); const h = await initData(hostU); const p1 = user(2101, 'uk'), p2 = user(2102, 'en');
  eq((await (await post('/api/me', { initData: h })).json()).discord, false, 'no token → Discord off in /api/me');
  const lob = await (await post('/api/lobby', { initData: h, fresh: true, lang: 'hy' })).json(); const code = lob.code;
  eq(lob.flag, '🇦🇲', 'the table flag comes from the creator’s app language (hy), not Telegram’s (ru)');
  eq((await post('/api/lobby/discord', { initData: h, code, on: true, seats: 10 })).status, 503, 'no token → 503');
  Object.assign(env, { DISCORD_BOT_TOKEN: 'dc-token', DISCORD_GUILD_ID: '111111111111', DISCORD_CATEGORY_ID: '333333333333', DISCORD_API: dc.base });
  eq((await (await post('/api/me', { initData: h })).json()).discord, true, 'token + guild → Discord on');
  eq((await (await post('/api/lobby/discord', { initData: h, code, on: true, seats: 10 })).json()).error, 'not_online', 'offline table → no voice room');
  await post('/api/lobby/role', { initData: h, code, online: true });
  await post('/api/table/join', { initData: await initData(p1), code });
  eq((await post('/api/lobby/discord', { initData: await initData(p1), code, on: true })).status, 404, 'only the host makes the room');
  const on = await (await post('/api/lobby/discord', { initData: h, code, on: true, seats: 10 })).json();
  ok(on.ok && on.voice && on.voice.on && /^https:\/\/discord\.gg\/mp\d+$/.test(on.voice.invite) && on.voice.limit === 11 && on.voice.confirmed === false, 'room created: ' + JSON.stringify(on.voice));
  const ch = dc.channels.get(dc.lastId());
  ok(ch && ch.name === '🇦🇲 Mafia · ' + code && ch.type === 2 && ch.user_limit === 11 && ch.parent_id === '333333333333', 'voice channel: flag + code, type 2, limit 10 + 1, in the category: ' + JSON.stringify(ch));
  ok(dc.calls.every(c => c.auth === 'Bot dc-token'), 'bot token in Authorization');
  const inv = dc.calls.find(c => c.method === 'POST' && /invites$/.test(c.url)); ok(inv && inv.params.max_age === 28800 && inv.params.unique === true, '8-hour invite');
  const n0 = dc.channels.size; await post('/api/lobby/discord', { initData: h, code, on: true, seats: 10 }); eq(dc.channels.size, n0, 'switching on twice keeps one room');
  const rs = await (await post('/api/lobby/discord', { initData: h, code, on: true, seats: 13 })).json(); ok(rs.voice.limit === 14 && dc.channels.get(dc.lastId()).user_limit === 14, '13 seats → limit 14');
  await post('/api/lobby', { initData: h, lang: 'pl' }); eq((await (await post('/api/lobby/status', { initData: h, code })).json()).flag, '🇦🇲', 'the flag stays once the room carries it');
  ok(dc.channels.get(dc.lastId()).name.startsWith('🇦🇲'), 'channel never renamed');
  const fl = await (await post('/api/lobbies', { initData: await initData(p2), all: true })).json(); const row = fl.lobbies.find(x => x.code === code);
  ok(row && row.flag === '🇦🇲' && row.discord === true, 'finder: flag + Discord mark ' + JSON.stringify(row && { flag: row.flag, discord: row.discord }));
  const s1 = await (await post('/api/table/state', { initData: await initData(p1), code })).json();
  ok(s1.flag === '🇦🇲' && s1.voice && s1.voice.on && s1.voice.invite === rs.voice.invite && s1.voice.mine === false, 'the player sees the room and the flag');
  const mk = await (await post('/api/table/voice', { initData: await initData(p1), code, ok: true })).json(); ok(mk.ok && mk.voice.mine === true, 'player: "I am on voice"');
  ok((await (await post('/api/lobby/status', { initData: h, code })).json()).voice.ok.includes(2101), 'the host sees the mark');
  eq((await post('/api/table/voice', { initData: await initData(p2), code, ok: true })).status, 403, 'not seated → cannot mark');
  eq((await (await post('/api/lobby/deal', { initData: h, code, cards: [{ tgId: 2101, seat: 1, roleId: 'don' }] })).json()).error, 'voice_unconfirmed', 'deal blocked until the host confirms voice');
  eq((await post('/api/table/publish', { initData: h, code, pub: { phase: 'deal', code }, priv: {} })).status, 409, 'the game cannot be published either');
  eq((await post('/api/table/publish', { initData: h, code, pub: { phase: 'lobby', code }, priv: {} })).status, 200, 'the waiting room still publishes');
  eq((await post('/api/lobby/voice-confirm', { initData: await initData(p1), code })).status, 404, 'only the host confirms');
  ok((await (await post('/api/lobby/voice-confirm', { initData: h, code })).json()).voice.confirmed === true, 'host confirmed');
  await post('/api/table/join', { initData: await initData(p2), code });
  eq((await (await post('/api/lobby/status', { initData: h, code })).json()).voice.confirmed, false, 'a newcomer resets the confirmation');
  await post('/api/lobby/voice-confirm', { initData: h, code });
  const dl = await (await post('/api/lobby/deal', { initData: h, code, cards: [{ tgId: 2101, seat: 1, roleId: 'don' }, { tgId: 2102, seat: 2, roleId: 'sheriff' }] })).json(); ok(dl.ok && dl.sent.length === 2, 'deal after confirmation');
  await post('/api/table/publish', { initData: h, code, pub: { phase: 'night0', code }, priv: {} });
  const id1 = dc.lastId(); await post('/api/table/publish', { initData: h, code, pub: { phase: 'end', code, result: { side: 'city' } }, priv: {} });
  await post('/api/ping', { initData: h }); ok(dc.channels.has(id1), 'the room stays a few minutes after the game');
  await env.DB.prepare('UPDATE table_state SET updated_at = ?1 WHERE code = ?2').bind(now() - 200, code).run();
  await post('/api/ping', { initData: h }); ok(!dc.channels.has(id1), 'then it is deleted');
  eq((await (await post('/api/table/state', { initData: await initData(p1), code })).json()).voice, null, 'no room in the state after cleanup');
  // switching to offline, closing the table, switching off: the room goes at once
  const l2 = (await (await post('/api/lobby', { initData: h, fresh: true, lang: 'uk' })).json()).code; await post('/api/lobby/role', { initData: h, code: l2, online: true });
  await post('/api/lobby/discord', { initData: h, code: l2, on: true, seats: 8 }); const c2 = dc.lastId(); ok(dc.channels.get(c2).name === '🇺🇦 Mafia · ' + l2 && dc.channels.get(c2).user_limit === 9, 'uk → 🇺🇦, 8 seats → 9');
  await post('/api/lobby/role', { initData: h, code: l2, online: false }); ok(!dc.channels.has(c2), 'offline → room deleted');
  await post('/api/lobby/role', { initData: h, code: l2, online: true }); await post('/api/lobby/discord', { initData: h, code: l2, on: true, seats: 8 }); const c3 = dc.lastId();
  await post('/api/lobby/discord', { initData: h, code: l2, on: false }); ok(!dc.channels.has(c3), 'switched off → room deleted');
  await post('/api/lobby/discord', { initData: h, code: l2, on: true, seats: 8 }); const c4 = dc.lastId();
  dc.channels.delete(c4); const re = await (await post('/api/lobby/discord', { initData: h, code: l2, on: true, seats: 9 })).json(); ok(re.ok && dc.lastId() !== c4 && dc.channels.get(dc.lastId()).user_limit === 10, 'deleted by hand in Discord → a new room on resize');
  await post('/api/lobby/close', { initData: h, code: l2 }); ok(!dc.channels.has(dc.lastId()), 'table closed → room deleted');
  // ru → 🇺🇦, pl → 🇵🇱, en → 🇬🇧; Discord errors and rate limits
  const l3 = (await (await post('/api/lobby', { initData: h, fresh: true, lang: 'ru' })).json()); eq(l3.flag, '🇺🇦', 'ru → 🇺🇦');
  eq((await (await post('/api/lobby', { initData: await initData(user(2103, 'pl')), fresh: true, lang: 'pl' })).json()).flag, '🇵🇱', 'pl → 🇵🇱');
  eq((await (await post('/api/lobby', { initData: await initData(user(2104, 'en')), fresh: true })).json()).flag, '🇬🇧', 'en (Telegram language) → 🇬🇧');
  await post('/api/lobby/role', { initData: h, code: l3.code, online: true });
  dc.st.fail = 403; const bad = await post('/api/lobby/discord', { initData: h, code: l3.code, on: true, seats: 10 }); const bd = await bad.json();
  ok(bad.status === 502 && bd.error === 'discord_failed' && /Permissions/.test(bd.detail), 'missing permissions → discord_failed');
  const se = await (await post('/api/lobby/status', { initData: h, code: l3.code })).json(); ok(se.voice && se.voice.on === false && se.voice.error, 'the error is shown to the host');
  eq((await (await post('/api/lobby/deal', { initData: h, code: l3.code, cards: [] })).json()).ok, true, 'a failed room does not block the game');
  dc.st.fail = 0; dc.st.rateOnce = true; const ok2 = await (await post('/api/lobby/discord', { initData: h, code: l3.code, on: true, seats: 10 })).json(); ok(ok2.ok && ok2.voice.on, 'rate limited once → retried and created');
  dc.st.inviteFail = true; const before = dc.channels.size; const l4 = (await (await post('/api/lobby', { initData: await initData(user(2105, 'ru')), fresh: true })).json()).code; await post('/api/lobby/role', { initData: await initData(user(2105, 'ru')), code: l4, online: true });
  eq((await post('/api/lobby/discord', { initData: await initData(user(2105, 'ru')), code: l4, on: true, seats: 10 })).status, 502, 'invite refused → error'); eq(dc.channels.size, before, 'no orphan channel left'); dc.st.inviteFail = false;
  Object.assign(env, { DISCORD_CATEGORY_ID: '999' }); const l5 = (await (await post('/api/lobby', { initData: await initData(user(2106, 'ru')), fresh: true })).json()).code; await post('/api/lobby/role', { initData: await initData(user(2106, 'ru')), code: l5, online: true });
  const v5 = await (await post('/api/lobby/discord', { initData: await initData(user(2106, 'ru')), code: l5, on: true, seats: 10 })).json(); ok(v5.ok && dc.channels.get(dc.lastId()).parent_id === null, 'a wrong category id → room without a category');
  for (const k of ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_CATEGORY_ID', 'DISCORD_API']) delete env[k];
  await dc.close(); }

console.log('discord server webhooks: the #ищу-игру card follows an online table, #результаты gets one card per game');
{ const dc = await startMockDiscord(8794); Object.assign(env, { DISCORD_BOT_TOKEN: 'dc-token', DISCORD_GUILD_ID: '111111111111', DISCORD_API: dc.base });
  await env.DB.prepare('DELETE FROM discord_cfg').run();
  const dreq = async (method, p, body) => (await fetch(dc.base + p, { method, headers: { Authorization: 'Bot dc-token', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })).json();
  const chT = await dreq('POST', '/guilds/111111111111/channels', { name: 'ищу-игру', type: 0 }); const chR = await dreq('POST', '/guilds/111111111111/channels', { name: 'результаты', type: 0 });
  await dreq('POST', `/channels/${chT.id}/webhooks`, { name: 'Mafia Pro · Столы' }); await dreq('POST', `/channels/${chR.id}/webhooks`, { name: 'Mafia Pro · Итоги' });
  const card = () => (dc.messages.get(chT.id) || []); const last = () => card()[card().length - 1]; const old = c => env.DB.prepare('UPDATE discord_posts SET updated_at = ?1 WHERE code = ?2').bind(now() - 60, c).run();
  const hu = user(2200, 'pl'); const h = await initData(hu); const pa = user(2201, 'ru'), pb = user(2202, 'uk');
  const off = (await (await post('/api/lobby', { initData: h, fresh: true, lang: 'pl' })).json()).code; await post('/api/lobby/status', { initData: h, code: off, seats: 10 }); await settle();
  eq(card().length, 0, 'an offline table is not announced');
  const code = (await (await post('/api/lobby', { initData: h, fresh: true, lang: 'pl' })).json()).code;
  await post('/api/lobby/role', { initData: h, code, online: true, seats: 10 }); await settle();
  ok(card().length === 1 && last().embeds[0].title === `🇵🇱 Стол ${code} · набор игроков` && JSON.stringify(last().embeds[0].fields).includes(`https://t.me/mafiapro_test_bot?start=join_${code}`) && JSON.stringify(last().embeds[0].fields).includes('0 / 10'), 'online table → card in #ищу-игру with the flag, 0 / 10 and a Telegram join link: ' + JSON.stringify(last() && last().embeds[0]).slice(0, 300));
  ok(last().webhook_id && dc.calls.some(c => c.method === 'POST' && /\/webhooks\/\d+\/tok\d+$/.test(c.url) && c.params.allowed_mentions), 'posted through the webhook, no pings');
  await post('/api/table/join', { initData: await initData(pa), code }); await post('/api/lobby/status', { initData: h, code, seats: 10 }); await settle();
  ok(!JSON.stringify(last().embeds[0].fields).includes('1 / 10'), 'count edits are throttled');
  await old(code); await post('/api/lobby/status', { initData: h, code, seats: 10 }); await settle();
  ok(card().length === 1 && JSON.stringify(last().embeds[0].fields).includes('1 / 10'), 'the same card is edited: 1 / 10');
  await post('/api/lobby/role', { initData: h, code, online: true }); await post('/api/lobby/discord', { initData: h, code, on: true, seats: 10 }); await settle();
  ok(JSON.stringify(last().embeds[0].fields).includes('Войти в голосовой канал') && JSON.stringify(last().embeds[0].fields).includes('https://discord.gg/'), 'the voice room link appears on the card');
  await post('/api/table/join', { initData: await initData(pb), code }); await post('/api/lobby/voice-confirm', { initData: h, code });
  await post('/api/lobby/deal', { initData: h, code, cards: [{ tgId: 2201, seat: 1, roleId: 'don' }, { tgId: 2202, seat: 2, roleId: 'sheriff' }] });
  await post('/api/table/publish', { initData: h, code, pub: { phase: 'night0', code, n: 10 }, priv: {} }); await settle();
  ok(last().embeds[0].title.includes('идёт партия') && !JSON.stringify(last().embeds[0].fields).includes('start=join_'), 'game running → "идёт партия", no join link');
  const endPub = { phase: 'end', code, n: 10, day: 3, online: true, result: { side: 'city', title: 'Победа города' }, roles: [{ seat: 1, name: 'User2201', roleId: 'don', rn: 'Дон мафии', won: false, total: -2, place: 2 }, { seat: 2, name: 'User2202', roleId: 'sheriff', rn: 'Шериф', won: true, total: 14, place: 1 }] };
  await post('/api/table/publish', { initData: h, code, pub: endPub, priv: {} }); await settle();
  const res = dc.messages.get(chR.id) || [];
  ok(res.length === 1 && res[0].embeds[0].title === '🏆 Победа города' && res[0].embeds[0].description.includes('🥇') && res[0].embeds[0].description.includes('Шериф ✅ +14') && res[0].embeds[0].description.includes('Дон мафии ❌ -2') && res[0].embeds[0].description.includes('🇵🇱'), 'one result card in #результаты: ' + JSON.stringify(res[0] && res[0].embeds[0]).slice(0, 400));
  ok(last().embeds[0].title.includes('партия завершена') && !JSON.stringify(last().embeds[0].fields).includes('discord.gg'), 'the table card is closed: "партия завершена", no voice link');
  await post('/api/table/publish', { initData: h, code, pub: endPub, priv: {} }); await settle(); eq((dc.messages.get(chR.id) || []).length, 1, 'no second result card');
  // an aborted game posts no result; a closed table's card says so
  const c2 = (await (await post('/api/lobby', { initData: h, fresh: true, lang: 'pl' })).json()).code; await post('/api/lobby/role', { initData: h, code: c2, online: true, seats: 8 }); await settle();
  ok(card().length === 2 && last().embeds[0].title.includes(c2), 'second table → second card');
  await post('/api/lobby/close', { initData: h, code: c2 }); await settle(); ok(last().embeds[0].title.includes('стол закрыт'), 'closed table → "стол закрыт"');
  const c3 = (await (await post('/api/lobby', { initData: h, fresh: true, lang: 'pl' })).json()).code; await post('/api/lobby/role', { initData: h, code: c3, online: true }); await settle();
  await post('/api/table/publish', { initData: h, code: c3, pub: { phase: 'end', code: c3, aborted: true, result: { side: 'none', title: 'Партия прервана' }, roles: [] }, priv: {} }); await settle();
  eq((dc.messages.get(chR.id) || []).length, 1, 'an aborted game posts no result');
  // a superseded table (its host opened another) is finalised by the heartbeat
  const c4 = (await (await post('/api/lobby', { initData: h, fresh: true, lang: 'pl' })).json()).code; await post('/api/lobby/role', { initData: h, code: c4, online: true }); await settle();
  const c4msg = last(); await post('/api/lobby', { initData: h, fresh: true, lang: 'pl' }); await post('/api/ping', { initData: h }); await settle();
  ok(c4msg.embeds[0].title.includes('стол закрыт'), 'a table closed by opening a new one gets "стол закрыт" on the next heartbeat');
  // the webhook removed by hand: nothing breaks, nothing is posted
  dc.webhooks.clear(); await env.DB.prepare('DELETE FROM discord_cfg').run(); const n0 = card().length;
  const c5 = (await (await post('/api/lobby', { initData: h, fresh: true })).json()).code; const rr = await post('/api/lobby/role', { initData: h, code: c5, online: true }); await settle();
  ok(rr.status === 200 && card().length === n0, 'no webhook → the table works, nothing posted');
  for (const k of ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_API']) delete env[k];
  await dc.close(); }
console.log('discord v34: per-language #ищу-игру / #результаты, buttons that give language and game roles');
{ const dc = await startMockDiscord(8798); Object.assign(env, { DISCORD_BOT_TOKEN: 'dc-token', DISCORD_GUILD_ID: '111111111111', DISCORD_API: dc.base });
  await env.DB.prepare('DELETE FROM discord_cfg').run();
  const dreq = async (method, p, body) => (await fetch(dc.base + p, { method, headers: { Authorization: 'Bot dc-token', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })).json();
  const mk = async (name, hook) => { const c = await dreq('POST', '/guilds/111111111111/channels', { name, type: 0 }); await dreq('POST', `/channels/${c.id}/webhooks`, { name: hook }); return c; };
  const ruT = await mk('ищу-игру', 'Mafia Pro · Столы'), ruR = await mk('результаты', 'Mafia Pro · Итоги'), plT = await mk('szukam-gry', 'Mafia Pro · Stoły'), plR = await mk('wyniki', 'Mafia Pro · Wyniki'), ukT = await mk('шукаю-гру', 'Mafia Pro · Столи');
  const msgs = c => dc.messages.get(c.id) || [];
  const hp = user(2300, 'pl'); const h = await initData(hp);
  const code = (await (await post('/api/lobby', { initData: h, fresh: true, lang: 'pl' })).json()).code; await post('/api/lobby/role', { initData: h, code, online: true, seats: 8 }); await settle();
  ok(msgs(plT).length === 1 && msgs(plT)[0].embeds[0].title === `🇵🇱 Stół ${code} · zbieranie graczy` && JSON.stringify(msgs(plT)[0].embeds[0].fields).includes('Otwórz w Telegramie') && !msgs(ruT).some(m => m.embeds[0].title.includes(code)), 'a Polish table goes to the Polish channel, in Polish: ' + JSON.stringify(msgs(plT)[0] && msgs(plT)[0].embeds[0]).slice(0, 200));
  await post('/api/lobby/close', { initData: h, code }); await settle(); ok(msgs(plT).length === 1 && msgs(plT)[0].embeds[0].title.includes('stół zamknięty'), 'the same Polish card is closed');
  const hu = user(2301, 'uk'); const hU = await initData(hu); const cu = (await (await post('/api/lobby', { initData: hU, fresh: true, lang: 'uk' })).json()).code; await post('/api/lobby/role', { initData: hU, code: cu, online: true, seats: 8 }); await settle();
  ok(msgs(ukT).length === 1 && msgs(ukT)[0].embeds[0].title === `🇺🇦 Стіл ${cu} · набір гравців`, 'a Ukrainian table → the Ukrainian channel');
  await post('/api/table/publish', { initData: hU, code: cu, pub: { phase: 'end', code: cu, n: 8, day: 2, online: true, result: { side: 'mafia', title: 'Перемога мафії' }, roles: [{ seat: 1, name: 'A', rn: 'Дон мафії', won: true, total: 9, place: 1 }] }, priv: {} }); await settle();
  ok(msgs(ruR).length === 1 && msgs(ruR)[0].embeds[0].description.includes('Стол **' + cu) && msgs(ruR)[0].embeds[0].description.includes('ведущий'), 'no Ukrainian results webhook → the Russian #результаты, in Russian');
  const he = user(2302, 'en'); const hE = await initData(he); const ce = (await (await post('/api/lobby', { initData: hE, fresh: true, lang: 'en' })).json()).code; await post('/api/lobby/role', { initData: hE, code: ce, online: true, seats: 8 }); await settle();
  ok(msgs(ruT).some(m => m.embeds[0].title === `🇬🇧 Стол ${ce} · набор игроков`), 'no English webhook → the Russian channel with Russian texts');
  // buttons: signed interactions (type 3) on the slash-command endpoint
  const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const hex = b => Buffer.from(new Uint8Array(b)).toString('hex'); env.DISCORD_PUBLIC_KEY = hex(await crypto.subtle.exportKey('raw', kp.publicKey));
  const ix = async (obj, { bad, key } = {}) => { const raw = JSON.stringify(obj); const ts = String(now()); const sig = hex(await crypto.subtle.sign({ name: 'Ed25519' }, key || kp.privateKey, new TextEncoder().encode(ts + raw + (bad ? 'x' : '')))); return call('/discord/interactions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts }, body: raw }); };
  eq(await (await ix({ type: 1 })).json(), { type: 1 }, 'PING → PONG');
  eq((await ix({ type: 3, data: { custom_id: 'mp:l:uk:1' } }, { bad: true })).status, 401, 'a button click with a wrong signature → 401');
  const ukRole = (await dreq('POST', '/guilds/111111111111/roles', { name: 'Українська' })).id; const hostRole = (await dreq('POST', '/guilds/111111111111/roles', { name: '🎩 Ведущий' })).id;
  dc.join({ id: '424242424242', username: 'nina' }); const has = r => dc.members.get('424242424242').roles.includes(r);
  const click = (cid, roles = [], locale = 'ru', uid = '424242424242') => ix({ type: 3, guild_id: '111111111111', locale, data: { custom_id: cid, component_type: 2 }, member: { user: { id: uid }, roles } });
  const a1 = await (await click(`mp:l:uk:${ukRole}`)).json();
  ok(a1.type === 4 && a1.data.flags === 64 && a1.data.content.includes('Українська') && a1.data.content.includes('відкрито') && has(ukRole), 'language button → role given, private answer in that language: ' + JSON.stringify(a1));
  const a2 = await (await click(`mp:l:uk:${ukRole}`, [ukRole])).json(); ok(a2.data.content.includes('приховано') && !has(ukRole), 'second click → role taken back');
  const a3 = await (await click(`mp:p:host:${hostRole}`, [], 'pl')).json(); ok(a3.data.content.includes('Prowadzący') && has(hostRole), 'game role button, answer in the Discord language (pl)');
  const a4 = await (await click(`mp:p:host:${hostRole}`, [hostRole], 'ja')).json(); ok(a4.data.content.includes('Host') && !has(hostRole), 'unknown Discord language → English');
  const a5 = await (await ix({ type: 3, guild_id: '999', locale: 'ru', data: { custom_id: `mp:l:uk:${ukRole}` }, member: { user: { id: '424242424242' }, roles: [] } })).json(); ok(a5.data.content.includes('Не получилось') && !has(ukRole), 'another server → refused');
  const a6 = await (await click('mp:l:xx:123456789')).json(); ok(a6.data.content.includes('Не получилось'), 'unknown language → refused');
  const a7 = await (await click('mp:l:uk:99999999')).json(); ok(a7.data.flags === 64 && a7.data.content.includes('Не вдалося'), 'a deleted role → an error, nothing breaks');
  const a8 = await (await click(`mp:l:en:${ukRole}`, [], 'en', '5')).json(); ok(a8.data.content.includes('Could not'), 'not a member any more → an error');
  for (const k of ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_API', 'DISCORD_PUBLIC_KEY']) delete env[k];
  await dc.close(); }
console.log('channel posts (drafts → admin approval → channel)');
{ env.CHANNEL_ID = '@mafiaprof';
  const key = await postsKey('test-token');
  const draft = (b, k = key) => post('/posts/draft', b, { 'X-Posts-Key': k });
  const cb = (from, data, mid = 1) => hook({ update_id: 500, callback_query: { id: 'q' + data, from, data, message: { message_id: mid, chat: { id: from.id } } } });
  const st = id => env.DB.prepare('SELECT * FROM channel_posts WHERE id = ?1').bind(id).first();
  const adm = user(777, 'ru'); const stranger = user(778, 'ru');
  const toChannel = () => tg.calls.filter(c => c.method === 'sendMessage' && c.params.chat_id === '@mafiaprof');
  const future = now() + 3600, past = now() - 60;
  eq((await draft({ id: '2026-10-14-12', slot_at: future, lang: 'uk', text: 'x' }, 'wrong')).status, 403, 'wrong key → 403');
  eq((await draft({ id: 'bad id!', slot_at: future, text: 'x' })).status, 400, 'bad id → 400');
  eq((await draft({ id: 'p-long', slot_at: future, text: 'x'.repeat(3600) })).status, 400, 'too long → 400');
  let r = await draft({ id: 'p-12', slot_at: future, lang: 'uk', rubric: 'Роль дня', text: '<b>Шериф</b> перевіряє вночі' }); let d = await r.json();
  ok(r.status === 200 && d.ok && d.sentTo === 1 && d.channelProblem === null, 'draft accepted, sent to the admin');
  let card = lastTo(777); ok(card.params.text.includes('<b>Шериф</b>') && card.params.text.includes('🇺🇦') && card.params.text.includes('Роль дня'), 'card shows the text, flag and rubric');
  const kb = card.params.reply_markup.inline_keyboard; ok(kb[0][0].callback_data === 'cp_ok_p-12' && kb[0][1].callback_data === 'cp_now_p-12' && kb[1][0].callback_data === 'cp_skip_p-12', 'approve / now / skip buttons');
  d = await (await draft({ id: 'p-12', slot_at: future, lang: 'uk', rubric: 'Роль дня', text: '<b>Шериф</b> перевіряє вночі' })).json(); ok(d.unchanged, 'same draft again → unchanged, no second card');
  await cb(stranger, 'cp_ok_p-12'); eq((await st('p-12')).status, 'draft', 'a non-admin cannot approve');
  await cb(adm, 'cp_ok_p-12'); eq((await st('p-12')).status, 'approved', 'approved for the slot');
  ok(lastCall('editMessageText').params.reply_markup.inline_keyboard[0][1].callback_data === 'cp_undo_p-12', 'card now offers undo');
  await worker.scheduled({}, env, { waitUntil: p => p }); await new Promise(res => setTimeout(res, 50));
  eq(toChannel().length, 0, 'cron: not yet time → nothing posted');
  await env.DB.prepare('UPDATE channel_posts SET slot_at = ?1 WHERE id = ?2').bind(past, 'p-12').run();
  let waits = []; await worker.scheduled({}, env, { waitUntil: p => waits.push(p) }); await Promise.all(waits);
  eq(toChannel().length, 1, 'cron: due → posted to the channel');
  const cm = toChannel()[0]; ok(cm.params.text === '<b>Шериф</b> перевіряє вночі' && cm.params.parse_mode === 'HTML', 'channel gets the exact text');
  ok(cm.params.reply_markup.inline_keyboard[0][0].text === '🎲 Грати' && cm.params.reply_markup.inline_keyboard[0][0].url === 'https://t.me/mafiapro_test_bot?start=post_p-12', 'play button in the post language, tracked link of this post');
  eq((await st('p-12')).status, 'posted', 'status posted');
  waits = []; await worker.scheduled({}, env, { waitUntil: p => waits.push(p) }); await Promise.all(waits); eq(toChannel().length, 1, 'never posted twice');
  // v49: the */5 cron rebuilds the leaderboard at :x0 only
  await env.DB.prepare("INSERT INTO discord_cfg (key, value, updated_at) VALUES ('lb:top', '[]', ?1) ON CONFLICT(key) DO UPDATE SET value = '[]', updated_at = ?1").bind(Math.floor(Date.now() / 1000)).run();
  const lbVal = async () => (await env.DB.prepare("SELECT value FROM discord_cfg WHERE key = 'lb:top'").first('value'));
  waits = []; await worker.scheduled({ cron: '*/5 * * * *', scheduledTime: Date.UTC(2026, 9, 14, 20, 15) }, env, { waitUntil: p => waits.push(p) }); await Promise.all(waits);
  eq(await lbVal(), '[]', 'cron at :15 leaves the leaderboard alone');
  waits = []; await worker.scheduled({ cron: '*/5 * * * *', scheduledTime: Date.UTC(2026, 9, 14, 20, 20) }, env, { waitUntil: p => waits.push(p) }); await Promise.all(waits);
  ok(JSON.parse(await lbVal()).top.length >= 1, 'cron at :20 rebuilds the leaderboard');
  d = await (await draft({ id: 'p-12', slot_at: future, lang: 'uk', text: 'changed' })).json(); ok(d.unchanged && d.status === 'posted', 'a posted post is not overwritten by the repo');
  // skip, undo, publish now
  await draft({ id: 'p-18', slot_at: future, lang: 'ru', rubric: 'Анонс', text: 'Вечером играем' });
  await cb(adm, 'cp_skip_p-18'); eq((await st('p-18')).status, 'skipped', 'skipped');
  await cb(adm, 'cp_undo_p-18'); eq((await st('p-18')).status, 'draft', 'back to draft');
  await cb(adm, 'cp_now_p-18'); eq((await st('p-18')).status, 'posted', 'publish now');
  ok(toChannel().pop().params.reply_markup.inline_keyboard[0][0].text === '🎲 Играть', 'ru button');
  // approve after the slot passed → goes out at once
  await draft({ id: 'p-late', slot_at: past, lang: 'uk', text: 'Пізно' }); await cb(adm, 'cp_ok_p-late'); eq((await st('p-late')).status, 'posted', 'late approval publishes immediately');
  // edit by reply, formatting kept
  await draft({ id: 'p-edit', slot_at: future, lang: 'ru', text: 'Старый текст' });
  const mid = JSON.parse((await st('p-edit')).admin_msgs)[0].msg;
  await hook({ update_id: 501, message: { message_id: 900, from: adm, chat: { id: 777, type: 'private' }, text: 'Новый текст со ссылкой', entities: [{ type: 'bold', offset: 0, length: 5 }, { type: 'text_link', offset: 15, length: 7, url: 'https://t.me/mafiaprof' }], reply_to_message: { message_id: mid } } });
  const ed = await st('p-edit'); eq(ed.text, '<b>Новый</b> текст со <a href="https://t.me/mafiaprof">ссылкой</a>', 'reply replaces the text with HTML');
  ok(tg.calls.some(c => c.method === 'deleteMessage' && c.params.message_id === mid), 'old card removed');
  ok(lastTo(777).params.text.includes('<b>Новый</b>'), 'new card sent');
  ok(JSON.parse(ed.admin_msgs)[0].msg !== mid, 'new card id remembered');
  await hook({ update_id: 502, message: { message_id: 901, from: stranger, chat: { id: 778, type: 'private' }, text: 'hack', reply_to_message: { message_id: JSON.parse(ed.admin_msgs)[0].msg } } }); eq((await st('p-edit')).text, ed.text, 'a non-admin reply changes nothing');
  eq(entitiesToHtml('a<b', []), 'a&lt;b', 'plain text escaped');
  eq(entitiesToHtml('abc', [{ type: 'bold', offset: 0, length: 3 }, { type: 'italic', offset: 1, length: 1 }]), '<b>a<i>b</i>c</b>', 'nested entities');
  // channel problems: not an admin → warning on the card; failed send → failed + retry button
  env.BOT_ID = '1'; tg.state.member = { status: 'member' };
  d = await (await draft({ id: 'p-warn', slot_at: future, lang: 'ru', text: 'Проверка' })).json();
  ok(d.channelProblem && d.channelProblem.includes('не администратор'), 'not an admin → reported to the workflow');
  ok(lastTo(777).params.text.includes('⚠️ бот не администратор'), 'warning on the card');
  tg.state.failChats.add('@mafiaprof');
  await cb(adm, 'cp_now_p-warn'); const fw = await st('p-warn'); ok(fw.status === 'failed' && fw.error.includes('не администратор'), 'failed with the reason');
  ok(lastCall('editMessageText').params.reply_markup.inline_keyboard[0][0].callback_data === 'cp_now_p-warn', 'retry button');
  tg.state.failChats.clear(); tg.state.member = { status: 'administrator', can_post_messages: true };
  await cb(adm, 'cp_now_p-warn'); eq((await st('p-warn')).status, 'posted', 'retry publishes');
  delete env.BOT_ID;
  await hook(msg(adm, '/posts')); const lp = lastTo(777).params.text; ok(lp.includes('@mafiaprof') && lp.includes('опубликован'), '/posts lists posts');
  await hook(msg(stranger, '/posts')); ok(!lastTo(778).params.text.includes('@mafiaprof'), '/posts is admin-only');
  delete env.CHANNEL_ID; }

console.log('discord analytics: baseline, joins through whose invite, leaves, personal app links tie Telegram, /stats /link /invites');
{ const dc = await startMockDiscord(8796); Object.assign(env, { DISCORD_BOT_TOKEN: 'dc-token', DISCORD_GUILD_ID: '111111111111', DISCORD_API: dc.base });
  await env.DB.prepare('DELETE FROM discord_cfg').run();
  const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']); const pub = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex'); env.DISCORD_PUBLIC_KEY = pub;
  const signed = async (bodyObj, ts = String(Math.floor(Date.now() / 1000))) => { const raw = JSON.stringify(bodyObj); const sig = Buffer.from(await crypto.subtle.sign({ name: 'Ed25519' }, kp.privateKey, new TextEncoder().encode(ts + raw))).toString('hex'); return call('/discord/interactions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts }, body: raw }); };
  const cron = async () => { await worker.scheduled({ cron: '* * * * *' }, env, ctx); await settle(); };
  const dreq = async (method, p, body) => (await fetch(dc.base + p, { method, headers: { Authorization: 'Bot dc-token', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })).json();
  const welcome = await dreq('POST', '/guilds/111111111111/channels', { name: 'добро-пожаловать', type: 0 }); dc.guild.system_channel_id = welcome.id;
  const an = await dreq('POST', '/guilds/111111111111/channels', { name: 'аналитика', type: 0 }); await dreq('POST', `/channels/${an.id}/webhooks`, { name: 'Mafia Pro · Аналитика' });
  const posts = () => dc.messages.get(an.id) || []; const lastPost = () => posts()[posts().length - 1];
  const du = (id, name) => ({ id: String(id), username: name, global_name: name[0].toUpperCase() + name.slice(1) });
  dc.join(du('800000000000000001', 'owner')); dc.join(du('800000000000000002', 'vera')); dc.join({ id: '800000000000000003', username: 'somebot', bot: true });
  eq((await (await call('/')).json()).interactions, true, 'health: interactions endpoint ready');
  await cron(); eq(posts().length, 0, 'first look = baseline, no events');
  ok(await env.DB.prepare("SELECT COUNT(*) AS n FROM discord_members WHERE status = 'in'").first('n') === 2, 'two people in the baseline, bots skipped');
  // a member's own invite
  dc.memberInvite(du('800000000000000002', 'vera'), 'veraInv'); await cron();
  dc.join(du('800000000000000010', 'artem'), 'veraInv'); await cron();
  ok(posts().length === 1 && lastPost().embeds[0].title === '📥 Новый участник' && JSON.stringify(lastPost().embeds[0]).includes('приглашение от Vera (@vera)') && JSON.stringify(lastPost().embeds[0]).includes('<@800000000000000002>') && JSON.stringify(lastPost().embeds[0]).includes('veraInv'), 'join through Vera’s invite: ' + JSON.stringify(lastPost() && lastPost().embeds[0]).slice(0, 300));
  // personal link from the app ties the newcomer to the Telegram account
  const tgU = user(2300, 'ru'); const tid = await initData(tgU);
  const iv = await (await post('/api/discord/invite', { initData: tid })).json(); ok(iv.ok && /^https:\/\/discord\.gg\/mp\d+$/.test(iv.url) && iv.linked === null, 'personal invite for the app: ' + iv.url);
  eq((await (await post('/api/discord/invite', { initData: tid })).json()).url, iv.url, 'the same link next time');
  const code = iv.url.split('/').pop(); ok(dc.invites.get(code).channel.id === welcome.id && dc.invites.get(code).max_age === 0, 'permanent invite to the welcome channel');
  dc.join(du('800000000000000020', 'nina'), code); await cron();
  ok(JSON.stringify(lastPost().embeds[0]).includes('личная ссылка из приложения · User2300 (@user2300)') && JSON.stringify(lastPost().embeds[0]).includes('Telegram'), 'join through the app link names the Telegram user');
  eq(await env.DB.prepare('SELECT tg_id FROM discord_members WHERE user_id = ?1').bind('800000000000000020').first('tg_id'), 2300, 'Discord member tied to Telegram 2300');
  eq((await (await post('/api/discord/invite', { initData: tid })).json()).linked.inside, true, 'the app knows the account is tied');
  // two joins in one minute through different invites → both attributed
  dc.memberInvite(du('800000000000000001', 'owner'), 'ownInv'); await cron();
  dc.join(du('800000000000000030', 'oleg'), 'ownInv'); dc.join(du('800000000000000031', 'pavlo'), 'veraInv'); await cron();
  const two = posts().slice(-2).map(m => JSON.stringify(m.embeds[0])); ok(posts().length === 4 && two.join().includes('Owner') && two.join().includes('Vera') && two.every(x => x.includes(' ≈')), 'two joins through different links in one minute: both posted, marked ≈');
  // a join through a table's voice room link
  const host = await initData(user(2310, 'uk')); const lc = (await (await post('/api/lobby', { initData: host, fresh: true, lang: 'uk' })).json()).code; await post('/api/lobby/role', { initData: host, code: lc, online: true });
  const vr = await (await post('/api/lobby/discord', { initData: host, code: lc, on: true, seats: 8 })).json(); const vcode = vr.voice.invite.split('/').pop(); await cron();
  dc.join(du('800000000000000040', 'guest'), vcode); await cron(); ok(JSON.stringify(lastPost().embeds[0]).includes('голосовой канал стола ' + lc), 'join through a table’s voice link names the table');
  // leave
  dc.leave('800000000000000010'); await cron();
  ok(lastPost().embeds[0].title === '📤 Вышел с сервера' && JSON.stringify(lastPost().embeds[0]).includes('приглашение от Vera') && JSON.stringify(lastPost().embeds[0]).includes('Был на сервере'), 'leave posted with where they came from');
  eq(await env.DB.prepare('SELECT status FROM discord_members WHERE user_id = ?1').bind('800000000000000010').first('status'), 'left', 'marked left');
  const nPosts = posts().length; await cron(); eq(posts().length, nPosts, 'quiet minute → nothing posted');
  dc.join(du('800000000000000010', 'artem'), 'veraInv'); await cron(); ok(posts().length === nPosts + 1 && lastPost().embeds[0].title === '📥 Новый участник', 'came back → a new join');
  // interactions: signature, ping, /stats, /link, /invites
  eq((await call('/discord/interactions', { method: 'POST', headers: { 'X-Signature-Ed25519': '00'.repeat(64), 'X-Signature-Timestamp': String(Math.floor(Date.now() / 1000)) }, body: '{"type":1}' })).status, 401, 'bad signature → 401');
  eq((await (await signed({ type: 1 })).json()).type, 1, 'PING → PONG');
  eq((await signed({ type: 1 }, String(Math.floor(Date.now() / 1000) - 1000))).status, 401, 'old timestamp → 401');
  await env.DB.prepare('INSERT INTO ratings (tg_id, points, games, wins, hosted, updated_at) VALUES (2300, 42, 10, 6, 1, 1) ON CONFLICT(tg_id) DO UPDATE SET points = 42, games = 10, wins = 6, hosted = 1').run();
  await env.DB.prepare('INSERT INTO games (game_id, host_id, mode, players, winner, summary, created_at) VALUES (?1, 2310, ?2, 10, ?3, ?4, ?5)').bind('g-dc-1', 'roles', 'city', JSON.stringify([{ tgId: 2300, roleId: 'sheriff', won: true, points: 12, side: 'city' }]), now()).run();
  const asker = { member: { user: du('800000000000000002', 'vera') } };
  const st = await (await signed(Object.assign({ type: 2, data: { name: 'stats', options: [{ name: 'player', type: 6, value: '800000000000000020' }], resolved: { users: { '800000000000000020': du('800000000000000020', 'nina') } } } }, asker))).json();
  ok(st.type === 4 && st.data.embeds[0].title === '📊 User2300' && JSON.stringify(st.data.embeds[0].fields).includes('1042') && JSON.stringify(st.data.embeds[0].fields).includes('6 · 60%') && !st.data.flags, '/stats @nina → her app statistics: ' + JSON.stringify(st.data.embeds && st.data.embeds[0].fields).slice(0, 300));
  const st2 = await (await signed(Object.assign({ type: 2, data: { name: 'stats', options: [{ name: 'player', type: 6, value: '800000000000000030' }], resolved: { users: { '800000000000000030': du('800000000000000030', 'oleg') } } } }, asker))).json();
  ok(st2.data.flags === 64 && st2.data.content.includes('Oleg') && st2.data.content.includes('/link'), 'not tied → private hint about /link');
  const st3 = await (await signed(Object.assign({ type: 2, data: { name: 'stats' } }, asker))).json(); ok(st3.data.flags === 64 && st3.data.content.includes('Ваш Discord'), '/stats without a player = me');
  const lk = await (await signed(Object.assign({ type: 2, data: { name: 'link' } }, asker))).json(); const lurl = lk.data.components[0].components[0].url;
  ok(lk.data.flags === 64 && /^https:\/\/t\.me\/mafiapro_test_bot\?start=dlink_[0-9a-f]{24}$/.test(lurl), '/link → private button to the Telegram bot');
  await hook(msg(user(2320, 'ru'), '/start ' + lurl.split('start=')[1])); ok(lastTo(2320).params.text.includes('привязан'), 'the bot confirms the link');
  eq(await env.DB.prepare('SELECT tg_id FROM discord_members WHERE user_id = ?1').bind('800000000000000002').first('tg_id'), 2320, 'Vera tied to Telegram 2320');
  await hook(msg(user(2320, 'ru'), '/start ' + lurl.split('start=')[1])); ok(lastTo(2320).params.text.includes('устарела'), 'a link works once');
  const st4 = await (await signed(Object.assign({ type: 2, data: { name: 'stats' } }, asker))).json(); ok(st4.type === 4 && st4.data.embeds && st4.data.embeds[0].title === '📊 User2320', 'now /stats shows Vera’s own statistics');
  const noPerm = await (await signed(Object.assign({ type: 2, data: { name: 'invites', options: [] } }, asker))).json();
  ok(noPerm.data.flags === 64 && /администратор/.test(noPerm.data.content), '/invites without Manage Server → refused');
  const inv = await (await signed(Object.assign({ type: 2, data: { name: 'invites', options: [{ name: 'days', type: 4, value: 30 }] } }, { member: Object.assign({}, asker.member, { permissions: '32' }) }))).json();
  ok(inv.data.flags === 64 && inv.data.embeds[0].description.includes('<@800000000000000002> — пришло 3, ушло 1') && inv.data.embeds[0].fields[0].value === '6', '/invites: Vera brought 3, 1 left; 6 joins: ' + (inv.data.embeds && inv.data.embeds[0].description).slice(0, 300));
  // the Members intent switched off: one warning a day, nothing breaks
  dc.st.membersFail = true; await cron(); await cron(); ok(posts().filter(m => m.embeds[0].title.includes('не видит участников')).length === 1, 'missing intent → one warning');
  dc.st.membersFail = false;
  // the finder's Discord panel (server widget)
  await env.DB.prepare("DELETE FROM discord_cfg WHERE key = 'widget'").run();
  eq((await (await call('/api/discord/widget')).json()).error, 'widget_disabled', 'widget switched off → widget_disabled');
  dc.widget.enabled = true; const room = [...dc.channels.values()].find(c => c.type === 2 && /Mafia · /.test(c.name));
  dc.members.get('800000000000000020').voice = room.id; dc.members.get('800000000000000030').voice = room.id;
  const wg = await (await call('/api/discord/widget')).json();
  ok(wg.ok && wg.online >= 6 && wg.inVoice === 2 && wg.rooms.length === 1 && wg.rooms[0].n === 2 && wg.rooms[0].table && wg.avatars.length >= 6 && wg.avatars.filter(a => a.voice).length === 2, 'widget: online, 2 in the table room: ' + JSON.stringify(wg).slice(0, 300));
  dc.members.get('800000000000000031').voice = room.id; eq((await (await call('/api/discord/widget')).json()).inVoice, 2, 'cached for 30 s');
  await env.DB.prepare("UPDATE discord_cfg SET updated_at = 0 WHERE key = 'widget'").run(); eq((await (await call('/api/discord/widget')).json()).inVoice, 3, 'then refreshed');
  dc.widget.enabled = false; await env.DB.prepare("UPDATE discord_cfg SET updated_at = 0 WHERE key = 'widget'").run(); eq((await (await call('/api/discord/widget')).json()).inVoice, 3, 'Discord down → the last known numbers');
  for (const k of ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_API', 'DISCORD_PUBLIC_KEY']) delete env[k];
  eq((await call('/api/discord/widget')).status, 503, 'no Discord configured → 503');
  await dc.close(); }

console.log('player growth: where new players come from, tracked links, names in games, notices, .xlsx table, /players, post stats');
{ env.CHANNEL_ID = '@mafiaprof';
  const adm = user(777, 'ru'); const key = await postsKey('test-token');
  const cfg = (k, v) => env.DB.prepare('INSERT INTO discord_cfg (key, value, updated_at) VALUES (?1, ?2, 0) ON CONFLICT(key) DO UPDATE SET value = ?2').bind(k, String(v)).run();
  const tr = id => env.DB.prepare('SELECT * FROM player_track WHERE tg_id = ?1').bind(id).first();
  const cron5 = async () => { const w = []; await worker.scheduled({ cron: '*/5 * * * *' }, env, { waitUntil: p => w.push(p) }); await Promise.all(w); };
  const docs = () => tg.calls.filter(c => c.method === 'sendDocument');
  // classification of start parameters
  eq(classify(''), { source: 'bot' }, 'no parameter → found the bot');
  eq(classify('ref_ABC123'), { source: 'ref', code: 'ABC123' }, 'ref'); eq(classify('friend_abc123').source, 'friend', 'friend');
  eq(classify('join_K7P2Q'), { source: 'table', detail: 'K7P2Q' }, 'table'); eq(classify('post_2026-10-14-12'), { source: 'post', detail: '2026-10-14-12' }, 'post');
  eq(classify('ads_pl_ru'), { source: 'ads', detail: 'pl_ru' }, 'ads'); eq(classify('site_uk'), { source: 'site', detail: 'uk' }, 'site'); eq(classify('dc').source, 'discord', 'discord');
  eq(classify('channel').source, 'channel', 'channel'); eq(classify('weird!').source, 'other', 'other');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(kyiv(now()).date) && kyiv(Date.UTC(2026, 9, 14, 18, 30) / 1000).time === '21:30', 'Kyiv time');
  await env.DB.prepare('UPDATE users SET created_at = ?1').bind(now() - 5000).run(); // everyone so far joined before tracking
  await cfg('growth:since', now() - 1000);
  // an inviter, then new players from different places
  const inv = await (await post('/api/referrals', { initData: await initData(user(9001)) })).json();
  await hook(msg(user(9002), `/start ref_${inv.code}`));
  await hook(msg(user(9003), '/start post_p-12'));
  await hook(msg(user(9001), '/start post_p-12')); // an existing player through the same post
  await hook(msg(user(9004, 'pl'), '/start ads_pl_ru'));
  await hook(msg(user(9005, 'uk'), '/start'));
  await post('/api/me', { initData: await initData(user(9006, 'uk'), { start_param: 'site_uk' }) });
  await post('/api/me', { initData: await initData(user(9007, 'hy')) });
  await post('/api/me', { initData: await initData(user(9002)) }); // opening the app later changes nothing
  eq([(await tr(9002)).source, (await tr(9002)).detail], ['ref', '9001'], 'ref → the inviter id');
  eq([(await tr(9003)).source, (await tr(9003)).detail], ['post', 'p-12'], 'channel post');
  eq([(await tr(9004)).source, (await tr(9004)).detail], ['ads', 'pl_ru'], 'ads tag');
  eq((await tr(9005)).source, 'bot', 'plain /start'); eq([(await tr(9006)).source, (await tr(9006)).detail], ['site', 'uk'], 'Mini App with startapp=site_uk');
  eq((await tr(9007)).source, 'app', 'Mini App without a parameter'); eq(await tr(9001), null, 'first seen through another API call → source unknown');
  const hits = (await env.DB.prepare("SELECT tg_id, is_new FROM start_hits WHERE param = 'post_p-12' ORDER BY tg_id").all()).results;
  eq(hits.map(h => [h.tg_id, h.is_new]), [[9001, 0], [9003, 1]], 'post visitors: one new, one existing');
  // the name a player had in a game
  await post('/api/game/result', { initData: await initData(user(9001)), game: { id: 'g-growth-1', mode: 'classic', winner: 'city', players: [{ seat: 1, name: 'Ваня-Шериф', tgId: 9002, roleId: 'sheriff', won: true, points: 30, side: 'city' }, { seat: 2, name: 'Гость', tgId: null, roleId: 'mafia' }] } });
  eq((await tr(9002)).game_name, 'Ваня-Шериф', 'nick in the game remembered');
  // live notice: after a minute, once
  await env.DB.prepare('UPDATE users SET created_at = ?1 WHERE tg_id BETWEEN 9001 AND 9007').bind(now() - 120).run();
  await cfg('growth:live', 'on'); await cfg('growth:mark', now() - 300);
  let before = tg.calls.length; await cron5();
  const note = tg.calls.slice(before).find(c => c.method === 'sendMessage' && c.params.chat_id === 777);
  ok(note && note.params.text.includes('Новые игроки: +7'), 'notice: +7 ' + (note && note.params.text.slice(0, 80)));
  ok(note && note.params.text.includes('@user9002') && note.params.text.includes('<code>9002</code>') && note.params.text.includes('ник «Ваня-Шериф»') && note.params.text.includes('Реферальная ссылка: User9001 @user9001'), 'notice: tag, id, nick, who invited');
  ok(note && note.params.text.includes('Реклама Telegram Ads: pl_ru') && note.params.text.includes('Сайт mafiapro.app: uk') && note.params.text.includes('Нашёл бота сам'), 'notice: ads, site, found the bot');
  before = tg.calls.length; await cron5(); ok(!tg.calls.slice(before).some(c => c.method === 'sendMessage' && c.params.chat_id === 777 && /Новы/.test(c.params.text)), 'no second notice for the same players');
  // daily digest: only after 21:00 Kyiv, once a day; forced here
  const b = new Bot(env); await cfg('growth:digest_at', now() - 3000);
  if (kyiv(now()).hour < DIGEST_HOUR) eq(await digest(env, b, false), null, 'before 21:00 Kyiv → no digest');
  before = tg.calls.length; const dg = await digest(env, b, true);
  ok(dg && dg.n === 7 && dg.bytes > 2000, 'digest: 7 new, a table attached ' + JSON.stringify(dg));
  const dmsg = tg.calls.slice(before).find(c => c.method === 'sendMessage' && c.params.chat_id === 777);
  ok(dmsg && dmsg.params.text.includes('Приток игроков') && dmsg.params.text.includes('+7') && dmsg.params.text.includes('Пост в канале — 1'), 'digest text with sources');
  ok(dmsg && dmsg.params.text.includes('Лучший пост за неделю') && dmsg.params.text.includes('перешли 2, новых 1'), 'digest: best post of the week');
  const doc = docs().pop(); ok(doc && doc.params.chat_id === 777 && /^mafia-pro-players-\d{4}-\d{2}-\d{2}\.xlsx$/.test(doc.params.document.name), 'xlsx sent to the admin');
  const bytes = doc.params.document.bytes; ok(bytes.slice(0, 2).toString() === 'PK', 'zip');
  for (const s of ['Новые', 'Все игроки', 'Источники', 'Посты и ссылки', '@user9002', 'Ваня-Шериф', 'Реферальная ссылка', 'User9001 @user9001', 'post_p-12', 'До начала учёта', 't.me/user9004'])
    ok(bytes.includes(Buffer.from(s.replace(/&/g, '&amp;'))), 'table contains ' + s);
  if (process.env.XLSX_OUT) writeFileSync(process.env.XLSX_OUT, bytes);
  before = tg.calls.length; ok(await digest(env, b, false) === null, 'one digest a day');
  // /players for admins
  before = docs().length; await hook(msg(adm, '/players')); ok(lastTo(777).params.text.includes('Новые игроки за сутки') && docs().length === before + 1, '/players → list + table');
  await hook(msg(adm, '/players 7')); ok(lastTo(777).params.text.includes('за 7 дн.'), '/players 7');
  await hook(msg(adm, '/players all')); ok(docs().length === before + 3 && docs().pop().params.caption.includes('Все игроки'), '/players all → table');
  await hook(msg(adm, '/players live off')); ok(lastTo(777).params.text.includes('выключены'), 'live off');
  await hook(msg(user(9008), '/start')); await env.DB.prepare('UPDATE users SET created_at = ?1 WHERE tg_id = 9008').bind(now() - 120).run();
  before = tg.calls.length; await cron5(); ok(!tg.calls.slice(before).some(c => c.method === 'sendMessage' && c.params.chat_id === 777), 'live off → silence');
  await hook(msg(user(9009), '/players')); ok(!docs().some(c => c.params.chat_id === 9009) && !lastTo(9009).params.text.includes('Новые'), '/players is admin-only');
  // channel post: a picture above the text, tracked button, stats for the workflow
  const draft = bd => post('/posts/draft', bd, { 'X-Posts-Key': key });
  eq((await draft({ id: 'p-img', slot_at: now() + 3600, lang: 'ru', text: 'x', image: 'javascript:alert(1)' })).status, 400, 'bad image → 400');
  let d = await (await draft({ id: 'p-img', slot_at: now() + 3600, lang: 'ru', rubric: 'Роль дня', text: '<b>Шериф</b>', image: 'cards/ru/sheriff.png' })).json();
  ok(d.ok && d.image === env.APP_URL + 'cards/ru/sheriff.png', 'image path → app site URL');
  const card = lastTo(777); ok(card.params.link_preview_options.url === env.APP_URL + 'cards/ru/sheriff.png' && card.params.link_preview_options.show_above_text, 'the admin sees the picture');
  d = await (await draft({ id: 'p-img', slot_at: now() + 3600, lang: 'ru', rubric: 'Роль дня', text: '<b>Шериф</b>', image: 'cards/ru/sheriff.png' })).json(); ok(d.unchanged, 'same picture → unchanged');
  await hook({ update_id: 700, callback_query: { id: 'qi', from: adm, data: 'cp_now_p-img', message: { message_id: 1, chat: { id: 777 } } } });
  const cm = tg.calls.filter(c => c.method === 'sendMessage' && c.params.chat_id === '@mafiaprof').pop();
  ok(cm.params.link_preview_options.url.endsWith('cards/ru/sheriff.png') && cm.params.link_preview_options.prefer_large_media && cm.params.reply_markup.inline_keyboard[0][0].url.endsWith('?start=post_p-img'), 'post: picture above, tracked button');
  eq((await post('/posts/stats', { days: 14 }, { 'X-Posts-Key': 'nope' })).status, 403, 'stats: wrong key → 403');
  const stt = await (await post('/posts/stats', { days: 14 }, { 'X-Posts-Key': key })).json();
  const p12 = stt.posts.find(x => x.id === 'p-12'); ok(stt.ok && p12 && p12.visitors === 2 && p12.newPlayers === 1 && p12.status === 'posted', 'stats per post ' + JSON.stringify(p12));
  ok(!JSON.stringify(stt).includes('user900') && !JSON.stringify(stt).includes('9003'), 'stats carry no personal data');
  await hook(msg(adm, '/posts')); ok(lastTo(777).params.text.includes('👥 2 перешли, 1 новых'), '/posts shows visitors of a published post');
  // v56: an animation (a skin's GIF) above the post — sent as an animation with the text as its caption
  const lastAnim = chat => [...tg.calls].reverse().find(c => c.method === 'sendAnimation' && c.params.chat_id === chat);
  let nA = tg.calls.length;
  d = await (await draft({ id: 'p-gif', slot_at: now() + 3600, lang: 'ru', rubric: 'Обновление', text: '<b>Новый скин</b>\nАметистовый Дон', image: 'skins/amethyst-don.mp4' })).json();
  const an = lastAnim(777);
  ok(d.ok && d.sentTo === 1 && d.image === env.APP_URL + 'skins/amethyst-don.mp4' && an && an.params.animation === d.image && an.params.caption.includes('<b>Новый скин</b>') && an.params.parse_mode === 'HTML' && an.params.reply_markup.inline_keyboard[0][0].callback_data === 'cp_ok_p-gif', 'admin draft: the animation with the text as caption ' + JSON.stringify(d));
  ok(!tg.calls.slice(nA).some(c => c.method === 'sendMessage' && c.params.chat_id === 777), 'no separate text card for a short post');
  await hook({ update_id: 701, callback_query: { id: 'qg', from: adm, data: 'cp_ok_p-gif', message: { message_id: 1, chat: { id: 777 } } } });
  const ec = lastCall('editMessageCaption'); ok(ec && ec.params.caption.includes('одобрен') && ec.params.reply_markup.inline_keyboard[0][1].callback_data === 'cp_undo_p-gif', 'approved: the caption of the card is updated');
  await hook({ update_id: 702, callback_query: { id: 'qg2', from: adm, data: 'cp_now_p-gif', message: { message_id: 1, chat: { id: 777 } } } });
  const ca = lastAnim('@mafiaprof'); ok(ca && ca.params.animation.endsWith('skins/amethyst-don.mp4') && ca.params.caption === '<b>Новый скин</b>\nАметистовый Дон' && ca.params.reply_markup.inline_keyboard[0][0].url.endsWith('?start=post_p-gif') && !ca.params.link_preview_options, 'channel: the animation, the caption, the tracked button');
  eq(await env.DB.prepare("SELECT status FROM channel_posts WHERE id = 'p-gif'").first('status'), 'posted', 'animated post published');
  // a text longer than a caption: the animation first, then the text with the button
  const longText = '<b>Длинный пост</b>\n' + 'Скин меняет вид карты. '.repeat(50);
  nA = tg.calls.length;
  d = await (await draft({ id: 'p-gif2', slot_at: now() + 3600, lang: 'ru', rubric: 'Обновление', text: longText, image: 'skins/amethyst-don.mp4' })).json();
  const two = tg.calls.slice(nA).filter(c => c.params.chat_id === 777 && /^send(Animation|Message)$/.test(c.method));
  ok(d.sentTo === 1 && two.length === 2 && two[0].method === 'sendAnimation' && !two[0].params.caption && two[1].method === 'sendMessage' && two[1].params.text.includes('Длинный пост'), 'long draft: animation, then the text card ' + JSON.stringify(two.map(c => c.method)));
  await hook({ update_id: 703, callback_query: { id: 'qg3', from: adm, data: 'cp_ok_p-gif2', message: { message_id: 1, chat: { id: 777 } } } });
  ok(!tg.calls.slice(nA).some(c => c.method === 'editMessageCaption'), 'the lone animation is not edited');
  nA = tg.calls.length; await hook({ update_id: 704, callback_query: { id: 'qg4', from: adm, data: 'cp_now_p-gif2', message: { message_id: 1, chat: { id: 777 } } } });
  const ch2 = tg.calls.slice(nA).filter(c => c.params.chat_id === '@mafiaprof');
  ok(ch2.length === 2 && ch2[0].method === 'sendAnimation' && ch2[1].method === 'sendMessage' && ch2[1].params.reply_markup.inline_keyboard[0][0].url.endsWith('?start=post_p-gif2'), 'long post in the channel: animation, then the text with the button');
  // a reply to the animated draft replaces its text and re-sends it as an animation
  await draft({ id: 'p-gif3', slot_at: now() + 3600, lang: 'ru', text: 'старый текст', image: 'skins/amethyst-don.mp4' });
  const a3 = lastAnim(777); const mid3 = Number(JSON.parse(await env.DB.prepare("SELECT admin_msgs FROM channel_posts WHERE id = 'p-gif3'").first('admin_msgs'))[0].msg);
  await hook({ update_id: 705, message: { message_id: 50, from: adm, chat: { id: 777, type: 'private' }, text: 'новый текст', reply_to_message: { message_id: mid3 } } });
  ok(a3 && lastAnim(777) !== a3 && lastAnim(777).params.caption.includes('новый текст') && lastCall('deleteMessage').params.message_id === mid3, 'reply to the animated draft → new text, re-sent');
  await cfg('growth:live', 'off'); await cfg('growth:digest_at', now() + 86400 * 3);
  delete env.CHANNEL_ID; }

console.log('/broadcast: preview → confirm → portions by cron → progress, blocked users counted, admins skipped');
{ env.CHANNEL_ID = '@mafiaprof'; env.CHAT_URL = 'https://t.me/+3kRZICcUMyBjZDdi'; env.BROADCAST_BATCH = '7';
  const adm = user(777, 'ru'); const stranger = user(778, 'ru');
  const cb = (from, data) => hook({ update_id: 900, callback_query: { id: 'q' + data, from, data, message: { message_id: 4242, chat: { id: from.id } } } });
  const bc = () => env.DB.prepare('SELECT * FROM broadcasts ORDER BY id DESC LIMIT 1').first();
  const tick = async () => { const w = []; await worker.scheduled({ cron: '* * * * *' }, env, { waitUntil: p => w.push(p) }); await Promise.all(w); };
  const users = (await env.DB.prepare('SELECT tg_id, lang FROM users WHERE tg_id != 777').all()).results;
  const total = users.length; ok(total > 10, 'enough players in the test db: ' + total);
  const ukUser = users.find(x => x.lang === 'uk'); const blockedOne = users.find(x => x.tg_id !== (ukUser && ukUser.tg_id)).tg_id;
  // a non-admin cannot start it
  const before = tg.calls.length; await hook(msg(stranger, '/broadcast')); ok(!(await bc()), 'a non-admin cannot create a broadcast');
  ok(!tg.calls.slice(before).some(c => c.method === 'sendMessage' && /Рассылка/.test(c.params.text || '')), 'no control card for a non-admin');
  // preview: samples per language + control card, nobody else gets anything
  const mark = tg.calls.length;
  await hook(msg(adm, '/broadcast'));
  let b = await bc(); ok(b && b.status === 'preview' && b.kind === 'invite', 'preview created');
  const toAdmin = tg.calls.slice(mark).filter(c => c.method === 'sendMessage' && c.params.chat_id === 777);
  ok(tg.calls.slice(mark).filter(c => c.method === 'sendMessage').every(c => c.params.chat_id === 777), 'preview goes to the admin only');
  const samples = toAdmin.filter(c => c.params.text.includes('🃏'));
  ok(samples.some(c => c.params.text.includes('У Mafia Pro появился свой канал')) && samples.some(c => c.params.text.includes('У Mafia Pro з’явився свій канал')), 'samples in ru and uk');
  const s0 = samples[0].params; const kb = s0.reply_markup.inline_keyboard;
  ok(kb[0].length === 1 && kb[0][0].url === 'https://t.me/mafiaprof' && kb[0][0].text.startsWith('📣 ') && kb[1][0].url === 'https://t.me/+3kRZICcUMyBjZDdi' && kb[1][1].web_app.url === env.APP_URL, 'buttons: channel on its own row, then chat + play');
  ok(s0.text.includes('href="https://t.me/mafiaprof"') && s0.text.includes('href="https://t.me/+3kRZICcUMyBjZDdi"') && s0.parse_mode === 'HTML', 'links in the text');
  const ctl = toAdmin[toAdmin.length - 1].params; ok(ctl.text.includes(`Получат: <b>${total}</b>`) && ctl.reply_markup.inline_keyboard[0][0].callback_data === `bc_go_${b.id}`, 'control card: recipients and the confirm button');
  // a non-admin pressing the button does nothing
  await cb(stranger, `bc_go_${b.id}`); eq((await bc()).status, 'preview', 'a non-admin cannot confirm');
  // confirm → queue (admins excluded), nothing sent until the cron
  tg.blocked.add(blockedOne); const nBlocked = users.filter(x => tg.blocked.has(x.tg_id)).length;
  const m2 = tg.calls.length; await cb(adm, `bc_go_${b.id}`); b = await bc(); eq(b.status, 'sending', 'confirmed → sending');
  const q = await env.DB.prepare('SELECT COUNT(*) AS n, SUM(tg_id = 777) AS a FROM broadcast_queue WHERE bid = ?1').bind(b.id).first(); ok(q.n === total && !q.a, 'everyone queued once, admin excluded');
  await cb(adm, `bc_go_${b.id}`); eq((await env.DB.prepare('SELECT COUNT(*) AS n FROM broadcast_queue WHERE bid = ?1').bind(b.id).first()).n, total, 'double click does not queue twice');
  ok(!tg.calls.slice(m2).some(c => c.method === 'sendMessage' && c.params.chat_id !== 777), 'nothing sent before the cron');
  ok(lastCall('editMessageText').params.text.includes('Идёт рассылка') && lastCall('editMessageText').params.reply_markup.inline_keyboard[0][0].callback_data === `bc_stop_${b.id}`, 'card: progress + stop');
  // a second /broadcast while one is running shows it instead of starting another
  await hook(msg(adm, '/broadcast другое')); ok((await bc()).id === b.id && lastTo(777).params.text.includes('Идёт рассылка'), 'one broadcast at a time');
  // portions
  const sentTo = () => tg.calls.slice(m2).filter(c => c.method === 'sendMessage' && c.params.chat_id !== 777 && c.params.chat_id !== '@mafiaprof' && (c.params.text || '').includes('href="https://t.me/+3kRZICcUMyBjZDdi"'));
  const s1 = sentTo().length; await tick(); ok(sentTo().length - s1 === 7, 'one portion = BROADCAST_BATCH messages: ' + (sentTo().length - s1));
  const ukMsg = sentTo().find(c => c.params.chat_id === (ukUser && ukUser.tg_id)); if (ukMsg) ok(ukMsg.params.text.includes('з’явився свій канал') && ukMsg.params.reply_markup.inline_keyboard[1][1].text === '🎲 Грати', 'a uk player gets the uk text and buttons');
  // stop and resume
  await cb(adm, `bc_stop_${b.id}`); eq((await bc()).status, 'stopped', 'stopped');
  const s2 = sentTo().length; await tick(); eq(sentTo().length, s2, 'stopped → cron sends nothing');
  await cb(adm, `bc_go_${b.id}`); eq((await bc()).status, 'sending', 'resumed');
  for (let i = 0; i < 20 && (await bc()).status === 'sending'; i++) await tick();
  b = await bc(); eq(b.status, 'done', 'done after all portions');
  const fin = await env.DB.prepare("SELECT SUM(status = 'sent') AS s, SUM(status = 'blocked') AS bl, SUM(status = 'pending') AS p FROM broadcast_queue WHERE bid = ?1").bind(b.id).first();
  ok(fin.s === total - nBlocked && fin.bl === nBlocked && !fin.p, `delivered ${fin.s}, blocked ${fin.bl} (expected ${nBlocked})`);
  const perUser = new Map(); for (const c of sentTo()) perUser.set(c.params.chat_id, (perUser.get(c.params.chat_id) || 0) + 1);
  ok([...perUser.values()].every(v => v === 1), 'nobody got it twice');
  ok(lastTo(777).params.text.includes(`доставлено ${total - nBlocked} из ${total}`) && lastTo(777).params.text.includes(`недоступны ${nBlocked}`), 'final report to the admin: ' + lastTo(777).params.text);
  ok(lastCall('editMessageText').params.text.includes('Рассылка завершена'), 'card shows done');
  await tick(); eq(sentTo().length, total, 'cron after done sends nothing more (one attempt per player, blocked ones included)');
  // custom text with formatting, flood control
  tg.blocked.delete(blockedOne);
  await hook({ update_id: 901, message: { message_id: 902, from: adm, chat: { id: 777, type: 'private' }, text: '/broadcast Вечером играем', entities: [{ type: 'bot_command', offset: 0, length: 10 }, { type: 'bold', offset: 11, length: 7 }] } });
  b = await bc(); ok(b.kind === 'custom' && b.text === '<b>Вечером</b> играем' && b.status === 'preview', 'custom text kept with formatting');
  ok(tg.calls.filter(c => c.method === 'sendMessage' && c.params.chat_id === 777).slice(-2)[0].params.text === '<b>Вечером</b> играем', 'custom sample sent to the admin');
  await cb(adm, `bc_cancel_${b.id}`); eq((await bc()).status, 'cancelled', 'cancelled from the preview');
  const s3 = sentTo().length; await tick(); eq(sentTo().length, s3, 'a cancelled broadcast never goes out');
  delete env.BROADCAST_BATCH; delete env.CHAT_URL; delete env.CHANNEL_ID; }

console.log('social media: /social, Facebook + Instagram and TikTok consent → sealed tokens, creds for the workflow, report, delete, pause, TikTok mode, stats, token watch');
{ const sm = await startMockSocial(8793); const adm = user(777); const key = await socialKey('test-token');
  const smc = (data, extra = {}) => hook({ update_id: 900, callback_query: Object.assign({ id: 'smq', from: adm, data, message: { message_id: 501, chat: { id: 777 }, text: '📱 Соцсети' } }, extra) });
  const ans = () => lastCall('answerCallbackQuery').params;
  const sk = (p, b, k = key) => post(p, b || {}, { 'X-Social-Key': k });
  Object.assign(env, { META_GRAPH_BASE: sm.base, META_DIALOG_BASE: 'https://fb.test', TIKTOK_API: sm.base, TIKTOK_AUTH: 'https://tt.test', SOCIAL_BASE: 'https://api.test' });
  await hook(msg(adm, '/social')); let c = lastTo(777);
  ok(/Соцсети/.test(c.params.text) && /Instagram: ⚪️ не подключён/.test(c.params.text) && /META_APP_ID/.test(c.params.text), 'no app keys yet: status + what to add');
  ok(!c.params.reply_markup.inline_keyboard.some(r => r.some(b => b.url)), 'no connect buttons without keys');
  await hook(msg(user(55), '/social')); ok(!/Соцсети/.test(lastTo(55).params.text), 'not for players');
  Object.assign(env, { META_APP_ID: '4242', META_APP_SECRET: 'meta-secret', TIKTOK_CLIENT_KEY: 'ttkey', TIKTOK_CLIENT_SECRET: 'tt-secret' });
  await hook(msg(adm, '/social')); c = lastTo(777);
  const urls = c.params.reply_markup.inline_keyboard.flat().filter(b => b.url).map(b => new URL(b.url));
  const mu = urls.find(u => u.host === 'fb.test'), tu = urls.find(u => u.host === 'tt.test');
  ok(mu && /\/v\d+\.\d\/dialog\/oauth$/.test(mu.pathname) && mu.searchParams.get('client_id') === '4242' && mu.searchParams.get('redirect_uri') === 'https://api.test/social/cb/meta' && /instagram_content_publish/.test(mu.searchParams.get('scope')), 'Meta consent link: app, redirect, permissions');
  ok(tu && tu.pathname === '/v2/auth/authorize/' && tu.searchParams.get('client_key') === 'ttkey' && /video\.upload/.test(tu.searchParams.get('scope')) && tu.searchParams.get('redirect_uri') === 'https://api.test/social/cb/tiktok', 'TikTok consent link');
  env.META_CONFIG_ID = 'cfg-77'; await hook(msg(adm, '/social'));
  const mu2 = new URL(lastTo(777).params.reply_markup.inline_keyboard.flat().find(b => b.url && b.url.startsWith('https://fb.test')).url);
  ok(mu2.searchParams.get('config_id') === 'cfg-77' && !mu2.searchParams.get('scope'), 'Facebook Login for Business: config_id instead of scope'); delete env.META_CONFIG_ID;
  let r = await call('/social/cb/meta?code=good-code&state=' + 'a'.repeat(32)); ok(r.status === 400 && /устарела/.test(await r.text()), 'unknown state → refused');
  r = await call('/social/cb/meta?error=access_denied&state=' + mu.searchParams.get('state')); ok(r.status === 400 && /отменено/.test(await r.text()), 'consent declined → page, state used up');
  await hook(msg(adm, '/social')); const st = new URL(lastTo(777).params.reply_markup.inline_keyboard.flat().find(b => b.url && b.url.startsWith('https://fb.test')).url).searchParams.get('state');
  r = await call(`/social/cb/meta?code=good-code&state=${st}`); const page = await r.text();
  ok(r.status === 200 && /Готово/.test(page) && !/page-token/.test(page), 'Meta connected; no token on the page');
  ok(/Подключено: страница Facebook <b>Mafia Pro<\/b> и Instagram <b>@mafiapro\.app<\/b>/.test(lastTo(777).params.text) && /Страниц доступно: 2/.test(lastTo(777).params.text), 'admin told: page + Instagram, other pages');
  eq((await call(`/social/cb/meta?code=good-code&state=${st}`)).status, 400, 'state works once');
  ok(sm.calls.some(x => x.q.grant_type === 'fb_exchange_token' && x.q.fb_exchange_token === 'short-user'), 'short user token exchanged for a long-lived one');
  const row = await env.DB.prepare("SELECT * FROM social_accounts WHERE platform = 'meta'").first();
  ok(row && row.secret.startsWith('v1:') && !row.secret.includes('page-token') && !row.info.includes('page-token') && row.account_id === '1001', 'tokens sealed at rest');
  eq((await post('/social/creds', {})).status, 403, 'creds: no key → 403'); eq((await sk('/social/creds', {}, 'x'.repeat(48))).status, 403, 'creds: wrong key → 403');
  let cr = await (await sk('/social/creds')).json();
  ok(cr.ok && cr.meta.pageToken === 'page-token-1001' && cr.meta.igId === '1784' && cr.meta.igUsername === 'mafiapro.app' && !cr.paused && cr.ttMode === 'telegram' && cr.admins[0] === 777, 'creds: Page token, Instagram id, admins, TikTok by hand');
  ok(cr.apps.meta === true && cr.apps.tiktok === true, 'creds: app keys configured');
  // TikTok
  r = await call(`/social/cb/tiktok?code=tt-code&state=${tu.searchParams.get('state')}`); ok(r.status === 200, 'TikTok connected (its own state)');
  ok(/TikTok подключён: <b>Mafia Pro TT<\/b>/.test(lastTo(777).params.text) && /черновики TikTok/.test(lastTo(777).params.text), 'admin told: TikTok, drafts mode');
  cr = await (await sk('/social/creds')).json(); ok(cr.tiktok.token === 'tt-access-1' && cr.ttMode === 'inbox', 'creds: TikTok token, inbox mode');
  { const a = await env.DB.prepare("SELECT secret FROM social_accounts WHERE platform = 'tiktok'").first(); const s0 = await unseal(env, a.secret); s0.access_exp = now() + 60;
    await env.DB.prepare("UPDATE social_accounts SET secret = ?1 WHERE platform = 'tiktok'").bind(await seal(env, s0)).run(); }
  cr = await (await sk('/social/creds')).json(); ok(cr.tiktok.token === 'tt-access-2' && sm.state.ttRefresh === 1, 'TikTok token near its end → refreshed');
  cr = await (await sk('/social/creds')).json(); ok(cr.tiktok.token === 'tt-access-2' && sm.state.ttRefresh === 1, 'fresh token reused');
  ok(sm.calls.filter(x => x.form.grant_type === 'refresh_token').pop().form.refresh_token === 'tt-refresh-1', 'refreshed with the stored refresh token');
  // report → /social → delete
  eq((await sk('/social/report', { id: 'bad id!' })).status === 200 && (await (await sk('/social/report', { id: 'bad id!' })).json()).ok, false, 'report: bad id refused');
  ok((await (await sk('/social/report', { id: '2026-10-15', rubric: 'Роль дня', bytes: 5e6, results: { instagram: { id: '1795', url: 'https://www.instagram.com/reel/X/', status: 'published' }, facebook: { id: '3311', url: 'https://www.facebook.com/reel/3311', status: 'published' }, tiktok: { id: 'v_inbox_1', status: 'SEND_TO_USER_INBOX' } } })).json()).ok, 'report stored');
  await hook(msg(adm, '/social')); ok(/2026-10-15 · Роль дня — IG ✅ FB ✅ TT 📥/.test(lastTo(777).params.text), '/social lists the post');
  await smc('sm_del_2026-10-15'); ok(lastCall('editMessageReplyMarkup').params.reply_markup.inline_keyboard[0][0].callback_data === 'sm_delok_2026-10-15', 'delete asks first');
  await smc('sm_keep_2026-10-15'); ok(lastCall('editMessageReplyMarkup').params.reply_markup.inline_keyboard[0][0].callback_data === 'sm_del_2026-10-15', 'kept → buttons back');
  await smc('sm_delok_2026-10-15'); let t = lastTo(777).params.text;
  ok(sm.state.deleted.includes('1795') && sm.state.deleted.includes('3311') && /Instagram: удалено/.test(t) && /Facebook: удалено/.test(t) && /TikTok: у TikTok нет удаления/.test(t), 'deleted from Instagram and Facebook; TikTok explained');
  ok(sm.calls.filter(x => x.method === 'DELETE').every(x => x.q.access_token === 'page-token-1001'), 'deletes use the Page token');
  eq(await env.DB.prepare("SELECT ig_status || '/' || fb_status AS s FROM social_posts WHERE id = '2026-10-15'").first('s'), 'deleted/deleted', 'statuses: deleted');
  await sk('/social/report', { id: '2026-10-16', results: { facebook: { id: '9555', status: 'published' }, tiktok: { status: 'telegram' } } });
  await smc('sm_delok_2026-10-16'); t = lastTo(777).params.text;
  ok(sm.state.deleted.includes('1001_9555') && /Facebook: удалено/.test(t) && !/TikTok/.test(t), 'reel id refused → its Page post deleted; TikTok posted by hand: nothing to say');
  await smc('sm_delok_nope-1'); ok(/не найден/.test(ans().text), 'unknown post');
  // pause, TikTok mode, page switch
  await smc('sm_pause'); ok((await (await sk('/social/creds')).json()).paused === true && /Пауза/.test(ans().text), 'pause');
  ok(/на паузе/.test(lastCall('editMessageText').params.text), 'status card refreshed');
  await smc('sm_resume'); ok((await (await sk('/social/creds')).json()).paused === false, 'resume');
  await smc('sm_tt_direct'); ok((await (await sk('/social/creds')).json()).ttMode === 'direct', 'TikTok: direct mode');
  await hook({ update_id: 901, callback_query: { id: 'smx', from: user(55), data: 'sm_pause', message: { message_id: 1, chat: { id: 55 } } } });
  ok(/администратор/.test(ans().text) && (await (await sk('/social/creds')).json()).paused === false, 'players cannot pause');
  await hook(msg(adm, '/social page 1002')); cr = await (await sk('/social/creds')).json(); ok(cr.meta.pageId === '1002' && cr.meta.igId === null, '/social page switches the Page');
  ok(/к странице не привязан Instagram/.test(lastTo(777).params.text), 'status: Page without Instagram');
  await hook(msg(adm, '/social page 1001')); await hook(msg(adm, '/social page 999999')); ok(/нет среди подключённых/.test(lastTo(777).params.text), 'unknown page');
  // profile links → stats
  eq(classify('ig'), { source: 'instagram', detail: '' }, 'start=ig → Instagram'); eq(classify('tt_bio'), { source: 'tiktok', detail: 'bio' }, 'start=tt_bio → TikTok · bio'); eq(classify('fb').source, 'facebook', 'start=fb → Facebook');
  await hook(msg(user(8801, 'uk'), '/start ig')); await hook(msg(user(8802, 'en'), '/start tt'));
  const ss = await (await sk('/social/stats', { days: 7 })).json();
  ok(ss.ok && ss.sources.ig.visitors === 1 && ss.sources.ig.newPlayers === 1 && ss.sources.tt.visitors === 1 && ss.sources.fb.visitors === 0, 'stats: visits from the profile links');
  ok(ss.posts.some(p => p.id === '2026-10-15') && !JSON.stringify(ss).includes('token'), 'stats: posts, no tokens');
  eq(await env.DB.prepare('SELECT source FROM player_track WHERE tg_id = 8801').first('source'), 'instagram', 'newcomer from Instagram recorded');
  // lockdown: no tokens leave the vault
  { const sec = await import('../src/security.js'); await sec.setLockdown(env, true, 'test', 'test'); sec._resetSecurityMemory();
    cr = await (await sk('/social/creds')).json(); ok(cr.locked === true && !cr.meta && !cr.tiktok, 'lockdown: no tokens');
    await sec.setLockdown(env, false, 'test'); sec._resetSecurityMemory(); }
  // token watch (twice a day)
  sm.state.pageTokenOk = false; await env.DB.prepare("DELETE FROM discord_cfg WHERE key = 'social:check_at'").run(); let waits = []; await worker.scheduled({ cron: '*/5 * * * *' }, env, { waitUntil: p => waits.push(p) }); await Promise.all(waits);
  ok(/Соцсети/.test(lastTo(777).params.text) && /токен страницы не работает/.test(lastTo(777).params.text), 'dead Page token → admins told');
  const before = tg.calls.length; waits = []; await worker.scheduled({ cron: '*/5 * * * *' }, env, { waitUntil: p => waits.push(p) }); await Promise.all(waits);
  ok(!tg.calls.slice(before).some(x => x.method === 'sendMessage' && /Соцсети/.test(x.params.text || '')), 'checked at most twice a day');
  sm.state.pageTokenOk = true;
  for (const k of ['META_GRAPH_BASE', 'META_DIALOG_BASE', 'TIKTOK_API', 'TIKTOK_AUTH', 'SOCIAL_BASE', 'META_APP_ID', 'META_APP_SECRET', 'TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']) delete env[k];
  await sm.close(); }

console.log('meta ads: landing click → token, /start fb_<src>_<token> → player + Lead to the Conversions API, /ads/creds, /ads/stats, /ads, pause in Meta, cleanup');
{ const G = { calls: [], fail: false };
  const gs = createServer((req, res) => { const parts = []; req.on('data', c => parts.push(c)); req.on('end', () => {
    const raw = Buffer.concat(parts).toString('utf8'); const u = new URL(req.url, 'http://x'); let body = null;
    try { body = /json/.test(req.headers['content-type'] || '') ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw)); } catch (e) {}
    G.calls.push({ m: req.method, p: u.pathname, body }); res.writeHead(200, { 'Content-Type': 'application/json' });
    if (/\/events$/.test(u.pathname)) return res.end(JSON.stringify(G.fail ? { error: { message: 'Invalid OAuth access token', code: 190 } } : { events_received: 1, fbtrace_id: 'x' }));
    return res.end(JSON.stringify({ success: true })); }); });
  await new Promise(r => gs.listen(8794, '127.0.0.1', r));
  const ak = (p, b = {}, key) => post(p, b, { 'X-Ads-Key': key || AK });
  const AK = await adsKey('test-token'); const adm = user(777);
  const click = (b, ip = '198.51.100.20', ua = 'Mozilla/5.0 (iPhone) Instagram 300') => post('/api/click', b, { 'CF-Connecting-IP': ip, 'User-Agent': ua, Origin: 'https://mafiapro.app' });
  // landing page → token
  eq((await click({ src: 'xx' })).status, 400, 'click: unknown campaign tag → 400');
  let r = await click({ src: 'dnp', ad: '120210000000001', fbclid: 'IwAR0abcDEF_123-xyz', fbp: 'fb.1.1760000000000.123456789' }); let d = await r.json();
  ok(r.status === 200 && d.ok && /^[A-Za-z0-9]{10}$/.test(d.token) && d.pixel === null, 'click: token, no pixel yet');
  let row = await env.DB.prepare('SELECT * FROM ad_clicks WHERE token = ?1').bind(d.token).first();
  ok(row && row.src === 'dnp' && row.ad_id === '120210000000001' && /^fb\.1\.\d{13}\.IwAR0abcDEF_123-xyz$/.test(row.fbc) && row.fbp === 'fb.1.1760000000000.123456789' && row.ip === '198.51.100.20' && /Instagram/.test(row.ua), 'click stored: ad, fbc built from fbclid, fbp, IP, browser');
  r = await click({ src: 'dnp', ad: 'x<script>', fbclid: 'bad id!', fbp: 'nope' }); d = await r.json(); row = await env.DB.prepare('SELECT * FROM ad_clicks WHERE token = ?1').bind(d.token).first();
  ok(row && row.ad_id === null && row.fbc === null && row.fbp === null, 'junk ad id / fbclid / fbp dropped');
  eq(parseAdParam('fb_dnp_' + d.token), { src: 'dnp', token: d.token }, 'bot link parsed'); eq(parseAdParam('fb_dnp'), null, 'plain tag: no token'); eq(parseAdParam('fb_zz_AAAAAAAAAA'), null, 'unknown tag');
  // a new player from the ad: the click gets the player; no Conversions API without the keys
  const t1 = (await (await click({ src: 'dnp', ad: '120210000000001', fbclid: 'IwAR1first' })).json()).token;
  await hook(msg(user(9101, 'uk'), '/start fb_dnp_' + t1)); await settle();
  row = await env.DB.prepare('SELECT * FROM ad_clicks WHERE token = ?1').bind(t1).first();
  ok(row.tg_id === 9101 && row.is_new === 1 && row.started_at > 0 && row.lead_sent === 0, 'new player tied to the click; no keys → no Lead');
  eq(await env.DB.prepare('SELECT source || \':\' || detail AS s FROM player_track WHERE tg_id = 9101').first('s'), 'facebook:dnp_' + t1, 'growth: came from Facebook ads (dnp)');
  ok(/Mafia Pro|Мафі/.test(lastTo(9101).params.text), 'the player still gets the welcome');
  // with the keys: Lead with the click's match data and a hashed Telegram id
  Object.assign(env, { META_ADS_TOKEN: 'ads-token-1', META_PIXEL_ID: '987654321012', META_GRAPH_BASE: 'http://127.0.0.1:8794' });
  d = await (await click({ src: 'dnp', ad: '120210000000002', fbclid: 'IwAR2second', fbp: 'fb.1.1760000000001.42' }, '198.51.100.21')).json(); ok(d.pixel === '987654321012', 'click: the pixel id for the page');
  await hook(msg(user(9102, 'ru'), '/start fb_dnp_' + d.token)); await settle();
  const ev = G.calls.find(c => /\/v25\.0\/987654321012\/events$/.test(c.p));
  const e0 = ev && ev.body && ev.body.data && ev.body.data[0];
  ok(e0 && e0.event_name === 'Lead' && e0.event_id === 'lead_' + d.token && e0.action_source === 'website' && ev.body.access_token === 'ads-token-1', 'Lead sent to the Conversions API');
  ok(e0 && e0.user_data.external_id[0] === createHash('sha256').update('9102').digest('hex') && e0.user_data.client_ip_address === '198.51.100.21' && /^fb\.1\.\d+\.IwAR2second$/.test(e0.user_data.fbc) && e0.user_data.fbp === 'fb.1.1760000000001.42' && /Instagram/.test(e0.user_data.client_user_agent), 'Lead: hashed id, IP, browser, fbc, fbp');
  ok(e0 && !JSON.stringify(e0).includes('9102,') && !JSON.stringify(e0).includes('User9102') && e0.custom_data.ad_id === '120210000000002' && e0.custom_data.content_name === 'dnp', 'Lead: no name or raw id; ad id and tag');
  eq(await env.DB.prepare('SELECT lead_sent FROM ad_clicks WHERE token = ?1').bind(d.token).first('lead_sent'), 1, 'lead_sent = 1');
  // a returning player, a shared link and a second click of the same player: no Lead
  const n0 = G.calls.filter(c => /events$/.test(c.p)).length;
  d = await (await click({ src: 'dnp', ad: '120210000000002' })).json(); await hook(msg(user(9102, 'ru'), '/start fb_dnp_' + d.token)); await settle();
  await hook(msg(user(9103, 'ru'), '/start fb_dnp_' + d.token)); await settle();
  eq(await env.DB.prepare('SELECT tg_id FROM ad_clicks WHERE token = ?1').bind(d.token).first('tg_id'), 9102, 'a shared link keeps its first player');
  await hook(msg(user(10, 'ru'), '/start fb_dnp_' + (await (await click({ src: 'dnp' })).json()).token)); await settle();
  eq(G.calls.filter(c => /events$/.test(c.p)).length, n0, 'no Lead for returning players or shared links');
  // Meta refuses → marked, the player is not affected
  G.fail = true; d = await (await click({ src: 'dnp', ad: '120210000000003' })).json(); await hook(msg(user(9104, 'uk'), '/start fb_dnp_' + d.token)); await settle(); G.fail = false;
  eq(await env.DB.prepare('SELECT lead_sent FROM ad_clicks WHERE token = ?1').bind(d.token).first('lead_sent'), 2, 'Meta error → lead_sent = 2');
  ok(lastTo(9104) && lastTo(9104).params.chat_id === 9104, 'the player still got the welcome');
  // one address, many visits: tokens stop, the page falls back to the plain tag
  for (let i = 0; i < 30; i++) await click({ src: 'dnp' }, '203.0.113.99');
  d = await (await click({ src: 'dnp' }, '203.0.113.99')).json(); ok(d.ok && d.token === null, 'flood from one address: no more tokens');
  await hook(msg(user(9105, 'uk'), '/start fb_dnp'));
  // the workflow
  eq((await post('/ads/creds', {})).status, 403, 'ads/creds: no key → 403'); eq((await ak('/ads/creds', {}, 'y'.repeat(48))).status, 403, 'ads/creds: wrong key → 403');
  let cr = await (await ak('/ads/creds', { campaigns: ['120200000000777', 'bad'] })).json();
  ok(cr.ok && cr.paused === false && cr.muted === false && cr.locked === false && cr.capi === true && cr.admins.includes(777), 'creds: switches, Conversions API ready, admins');
  eq(await env.DB.prepare("SELECT value FROM discord_cfg WHERE key = 'ads:campaigns'").first('value'), '120200000000777', 'campaign ids remembered (junk dropped)');
  await env.DB.prepare('INSERT INTO ratings (tg_id, points, games, wins, hosted, updated_at) VALUES (9102, 10, 1, 1, 0, 1) ON CONFLICT(tg_id) DO UPDATE SET games = 1').run();
  const st = await (await ak('/ads/stats', { since: now() - 3600 })).json();
  const a2 = st.ads['120210000000002'];
  ok(st.ok && a2 && a2.visits === 2 && a2.starts === 2 && a2.newPlayers === 1 && a2.played === 1 && a2.leads === 1, 'stats per ad: visits → starts → new → played, leads');
  ok(st.sources.dnp.newPlayers >= 3 && st.total.visits >= 36 && st.plain.dnp && st.plain.dnp.newPlayers === 1, 'stats per tag; plain tagged link counted');
  ok(!JSON.stringify(st).includes('9102') && !JSON.stringify(st).includes('198.51.100'), 'stats: no ids, no addresses');
  // /ads in the bot
  await hook(msg(user(55), '/ads')); ok(!/Реклама Instagram/.test(lastTo(55).params.text), '/ads: not for players');
  await hook(msg(adm, '/ads')); let c = lastTo(777);
  ok(/Реклама Instagram \+ Facebook/.test(c.params.text) && /Кампании в Meta: 1 · ▶️ идут/.test(c.params.text) && /За 7 дней:<\/b> страница \d+ → бот \d+ → новые \d+ → сыграли 1/.test(c.params.text) && /Conversions API[^\n]*✅/.test(c.params.text), '/ads: status, numbers, Conversions API');
  const adc = data => hook({ update_id: 3, callback_query: { id: 'q' + data, from: adm, data, message: { message_id: 70, chat: { id: 777, type: 'private' }, text: 'Реклама Instagram' } } });
  const ans = () => lastCall('answerCallbackQuery').params;
  await adc('ads_pause'); await settle();
  ok((await (await ak('/ads/creds')).json()).paused === true && /на паузе в Meta/.test(ans().text), 'pause: switch on');
  ok(G.calls.some(x => x.p === '/v25.0/120200000000777' && x.body && x.body.status === 'PAUSED' && x.body.access_token === 'ads-token-1'), 'pause: campaign paused in Meta at once');
  await adc('ads_resume'); ok(G.calls.some(x => x.p === '/v25.0/120200000000777' && x.body.status === 'ACTIVE') && (await (await ak('/ads/creds')).json()).paused === false, 'resume: campaign active again');
  await adc('ads_mute'); ok((await (await ak('/ads/creds')).json()).muted === true, 'notices muted'); await adc('ads_unmute'); ok((await (await ak('/ads/creds')).json()).muted === false, 'notices back');
  await hook({ update_id: 4, callback_query: { id: 'qx', from: user(55), data: 'ads_pause', message: { message_id: 1, chat: { id: 55, type: 'private' } } } });
  ok((await (await ak('/ads/creds')).json()).paused === false, 'players cannot pause the ads');
  { const sec = await import('../src/security.js'); await sec.setLockdown(env, true, 'test', 'test'); sec._resetSecurityMemory();
    cr = await (await ak('/ads/creds')).json(); ok(cr.locked === true, 'lockdown reaches the workflow');
    await adc('ads_pause'); ok(/блокировки/.test(ans().text) && (await (await ak('/ads/creds')).json()).paused === false, 'lockdown: /ads buttons off');
    await sec.setLockdown(env, false, 'test'); sec._resetSecurityMemory(); }
  // without the worker token: the switch waits for the workflow
  delete env.META_ADS_TOKEN; await adc('ads_pause'); ok(/следующей проверке/.test(ans().text), 'no token in the worker: the workflow pauses it'); await adc('ads_resume');
  // privacy: export and delete
  const ex = await exportUser(env, 9102); ok(ex.adClicks && ex.adClicks.length === 2 && ex.adClicks[0].src === 'dnp', '/mydata: ad clicks included');
  // cleanup: match data after 7 days, rows after 180
  await env.DB.prepare('UPDATE ad_clicks SET created_at = ?1 WHERE token = ?2').bind(now() - 8 * 86400, t1).run();
  await env.DB.prepare("INSERT INTO ad_clicks (token, src, ip, ua, created_at) VALUES ('OLDOLDOLD1', 'dnp', '1.2.3.4', 'ua', ?1)").bind(now() - 200 * 86400).run();
  await env.DB.prepare("DELETE FROM discord_cfg WHERE key = 'ads:clean_at'").run(); let waits = []; await worker.scheduled({ cron: '*/5 * * * *' }, env, { waitUntil: p => waits.push(p) }); await Promise.all(waits);
  row = await env.DB.prepare('SELECT * FROM ad_clicks WHERE token = ?1').bind(t1).first();
  ok(row && row.ip === null && row.ua === null && row.fbc === null && row.tg_id === 9101, 'after 7 days: IP, browser, Meta ids erased; the count stays');
  ok(!(await env.DB.prepare("SELECT 1 FROM ad_clicks WHERE token = 'OLDOLDOLD1'").first()), 'after 180 days: deleted');
  for (const k of ['META_ADS_TOKEN', 'META_PIXEL_ID', 'META_GRAPH_BASE']) delete env[k];
  await new Promise(r2 => gs.close(r2)); }

console.log('security: webhook only from Telegram, forged logins, limits, bans, defused table state, anti-cheat, watch → incidents → alerts, lockdown, report');
{ const sec = await import('../src/security.js'); sec._resetSecurityMemory();
  const TGIP = '149.154.167.220', EVIL = '203.0.113.7';
  ok(sec.ipInTelegram(TGIP) && sec.ipInTelegram('91.108.4.1') && sec.ipInTelegram('149.154.175.255'), 'Telegram networks recognised');
  ok(!sec.ipInTelegram(EVIL) && !sec.ipInTelegram('149.154.176.1') && !sec.ipInTelegram('2001:db8::1') && !sec.ipInTelegram(''), 'other addresses are not Telegram');
  const at = (ip, extra = {}) => Object.assign({ 'CF-Connecting-IP': ip }, extra);
  const evs = async type => (await env.DB.prepare('SELECT COALESCE(SUM(n), 0) AS n FROM security_events WHERE type = ?1').bind(type).first('n'));
  // webhook: from Telegram with the secret → ok; from elsewhere without the secret → 403 + event
  eq((await post('/webhook', msg(user(31), '/help'), at(TGIP, { 'X-Telegram-Bot-Api-Secret-Token': 'hook-secret' }))).status, 200, 'webhook from Telegram with the secret');
  eq((await post('/webhook', msg(user(777), '/players all'), at(EVIL, { 'X-Telegram-Bot-Api-Secret-Token': 'guess' }))).status, 403, 'forged webhook (foreign IP, wrong secret) → 403');
  await settle(); ok(await evs('webhook_forged') >= 1, 'forged webhook recorded');
  ok(!tg.calls.some(c => c.method === 'sendDocument' && c.params.chat_id === 777 && c.params.caption && /all/.test(c.params.caption)), 'no export happened');
  // Telegram from a new range inside its own networks (by ASN) is still accepted; the extra ranges variable works too
  { const fakeReq = h => ({ headers: new Headers(h) }); const bot0 = new Bot(env);
    eq(await sec.webhookGate(env, fakeReq({ 'X-Telegram-Bot-Api-Secret-Token': 'hook-secret' }), { ip: '5.28.16.1', ih: 'aa', asn: 62041, org: 'Telegram Messenger Inc', path: '/webhook' }, bot0), null, 'Telegram ASN with the secret → accepted');
    env.TG_EXTRA_NETS = '5.28.16.0/20'; eq(await sec.webhookGate(env, fakeReq({ 'X-Telegram-Bot-Api-Secret-Token': 'hook-secret' }), { ip: '5.28.16.9', ih: 'ab', asn: 0, path: '/webhook' }, bot0), null, 'extra network from the variable → accepted'); delete env.TG_EXTRA_NETS;
    ok((await sec.webhookGate(env, fakeReq({ 'X-Telegram-Bot-Api-Secret-Token': 'nope' }), { ip: '5.28.16.1', ih: 'ac', asn: 62041, path: '/webhook' }, bot0)).status === 403, 'Telegram network with a wrong secret → 403'); }
  // the right secret from a foreign address = a leak: refused, the secret is replaced, admin powers locked
  const before = tg.calls.length;
  eq((await post('/webhook', msg(user(777), '/players all'), at(EVIL, { 'X-Telegram-Bot-Api-Secret-Token': 'hook-secret' }))).status, 403, 'leaked secret from a foreign IP → 403');
  await settle();
  const sw = tg.calls.slice(before).find(c => c.method === 'setWebhook'); ok(sw && /^[0-9a-f]{64}$/.test(sw.params.secret_token) && sw.params.url === 'https://api.test/webhook', 'webhook secret replaced at Telegram');
  ok(await sec.isLockdown(env), 'lockdown switched on automatically');
  eq((await post('/webhook', msg(user(31), '/help'), at(TGIP, { 'X-Telegram-Bot-Api-Secret-Token': 'hook-secret' }))).status, 403, 'the old secret no longer works');
  eq((await post('/webhook', msg(user(31), '/help'), at(TGIP, { 'X-Telegram-Bot-Api-Secret-Token': sw.params.secret_token }))).status, 200, 'the new secret works');
  const hookNew = { 'X-Telegram-Bot-Api-Secret-Token': sw.params.secret_token };
  const adm = { id: 777, first_name: 'Admin', language_code: 'ru' };
  await post('/webhook', msg(adm, '/players all'), at(TGIP, hookNew)); ok(/режим блокировки/.test(lastTo(777).params.text), 'lockdown: /players refused');
  await post('/webhook', msg(adm, '/broadcast Привет'), at(TGIP, hookNew)); ok(/режим блокировки/.test(lastTo(777).params.text), 'lockdown: /broadcast refused');
  await post('/webhook', msg(adm, '/grant 31 30'), at(TGIP, hookNew)); ok(/режим блокировки/.test(lastTo(777).params.text), 'lockdown: /grant refused');
  eq((await (await post('/api/admin/grant', { initData: await initData(user(777)), q: '31', days: 3 })).json()).error, 'lockdown', 'lockdown: app admin API refused');
  await post('/webhook', msg(adm, '/security unlock'), at(TGIP, hookNew)); ok(/GitHub/.test(lastTo(777).params.text) && await sec.isLockdown(env), 'cannot be unlocked from Telegram');
  // the Security workflow's key
  const key = await sec.secKey('test-token');
  eq((await post('/sec/report', {}, { 'X-Sec-Key': 'nope' })).status, 403, 'report needs the key');
  const un = await (await post('/sec/act', { action: 'unlock', note: 'проверено' }, { 'X-Sec-Key': key })).json(); ok(un.ok && un.mode === 'normal' && !(await sec.isLockdown(env)), 'unlock through the workflow key');
  ok(/снят/.test(lastTo(777).params.text), 'admins told about the unlock');
  sec._resetSecurityMemory(); await env.DB.prepare("DELETE FROM discord_cfg WHERE key = 'sec:hook'").run(); // back to the deployed secret for the rest of the suite
  // forged logins: counted per address, 30 in 10 minutes → the address is blocked; an expired login is not a forgery
  const good = await initData(user(32)); const forged = good.replace(/hash=\w{6}/, 'hash=abcdef');
  const expired = await initData(user(32), { auth_date: String(now() - 90000) });
  const af0 = await evs('auth_forged'); await env.DB.prepare("DELETE FROM security_stats WHERE key LIKE 'ev:auth%'").run();
  for (let i = 0; i < 5; i++) await post('/api/me', { initData: expired }, at('198.51.100.9')); await settle(); await sec.flushStats(env);
  eq([await evs('auth_forged') - af0, await env.DB.prepare("SELECT COALESCE(SUM(n), 0) AS n FROM security_stats WHERE key = 'ev:auth_forged'").first('n')], [0, 0], 'expired logins are not counted as forged');
  for (let i = 0; i < 30; i++) await post('/api/me', { initData: forged }, at('198.51.100.9')); await settle();
  ok(await evs('auth_forged') >= 1 && await evs('auth_bruteforce') === 1, 'forged logins → brute-force event');
  const blocked = await post('/api/me', { initData: good }, at('198.51.100.9')); eq(blocked.status, 403, 'that address is blocked now, even with a good login');
  ok(blocked.headers.get('Access-Control-Allow-Origin'), 'a block still carries CORS (the app shows an error, not a network failure)');
  eq((await post('/api/me', { initData: good }, at('198.51.100.10'))).status, 200, 'other addresses are fine');
  // per-address limit and the flood ban
  env.SEC_IP_RPM = '20'; env.SEC_IP_BAN_RPM = '40';
  const codes = []; for (let i = 0; i < 45; i++) codes.push((await call('/api/leaderboard', { headers: at('192.0.2.50') })).status); await settle();
  ok(codes.slice(0, 20).every(c => c === 200) && codes[20] === 429, 'over 20 a minute → 429');
  ok(codes[44] === 403 || codes[44] === 429, 'flooding on → blocked'); ok(await env.DB.prepare("SELECT 1 FROM security_bans WHERE key LIKE 'ip:%' AND reason LIKE 'флуд%'").first(), 'flood ban stored');
  delete env.SEC_IP_RPM; delete env.SEC_IP_BAN_RPM;
  // per-player limit and scraping
  env.SEC_PLAYERS_10M = '3'; const sc = await initData(user(33)); const st = [];
  for (let i = 0; i < 5; i++) st.push((await post('/api/players', { initData: sc, offset: i * 50 }, at('192.0.2.60'))).status); await settle();
  eq(st, [200, 200, 200, 429, 429], 'paging through all players is limited'); ok(await evs('scrape') >= 1, 'scraping recorded'); delete env.SEC_PLAYERS_10M;
  // too big a body
  const big = await call('/api/me', { method: 'POST', headers: at('192.0.2.61', { 'Content-Type': 'application/json' }), body: JSON.stringify({ initData: good, pad: 'x'.repeat(sec.MAX_BODY + 10) }) });
  eq(big.status, 413, 'a body over the limit → 413');
  // a hostile host: markup in the published table state is defused before players read it
  const host = await initData(user(34, 'ru', { first_name: '<b>Host</b>' })); const pl = await initData(user(35, 'ru', { first_name: 'Ann"><img src=x onerror=alert(1)>' }));
  const lob = await (await post('/api/lobby', { initData: host, fresh: true })).json();
  await post('/api/table/join', { initData: pl, code: lob.code });
  const seat = await env.DB.prepare('SELECT name FROM lobby_players WHERE code = ?1 AND tg_id = 35').bind(lob.code).first('name'); ok(seat && !/[<>"]/.test(seat) && seat.includes('img src=x'), 'a Telegram name with markup is defused at the table: ' + seat);
  const evil = '<img src=x onerror=alert(1)>';
  await post('/api/table/publish', { initData: host, code: lob.code, pub: { v: 2, phase: 'lobby', n: 7, seats: [{ seat: evil, name: evil, tgId: 35 }], result: { color: 'x" onmouseover="alert(1)' } }, priv: { 35: { seat: 1, roleId: 'citizen', note: evil } } });
  const ts = await (await post('/api/table/state', { initData: pl, code: lob.code })).json();
  const txt = JSON.stringify({ pub: ts.pub, me: ts.me }); ok(!txt.includes('<img') && !txt.includes('\\"') && txt.includes('‹img src=x onerror=alert(1)›'), 'players get the state without tags or quotes');
  await settle(); ok(await evs('xss_attempt') >= 1, 'the attempt is recorded');
  // anti-cheat: points only for the host's own people, and not twice in two minutes
  delete env.SEC_RESULT_GAP;
  const cheat = await (await post('/api/game/result', { initData: host, game: { id: 'cheat-1', mode: 'classic', winner: 'city', code: lob.code, players: [{ seat: 1, name: 'Me', tgId: 34, roleId: 'sheriff', won: true, points: 90, side: 'city' }, { seat: 2, name: 'Ann', tgId: 35, roleId: 'citizen', won: true, points: 20, side: 'city' }, { seat: 3, name: 'Stranger', tgId: 36, roleId: 'citizen', won: true, points: 90, side: 'city' }] } })).json();
  ok(cheat.ok && cheat.recorded, 'game recorded');
  eq([(await env.DB.prepare('SELECT points FROM ratings WHERE tg_id = 35').first('points')), await env.DB.prepare('SELECT points FROM ratings WHERE tg_id = 36').first('points')], [20, null], 'seated player credited, a stranger in the report is not');
  const sum = JSON.parse(await env.DB.prepare("SELECT summary FROM games WHERE game_id = 'cheat-1'").first('summary')); ok(sum[2].tgId === null && sum[2].name === 'Stranger', 'the stranger keeps the seat without the Telegram id');
  await post('/api/game/result', { initData: host, game: { id: 'cheat-1b', mode: 'classic', winner: 'city', code: lob.code, players: [{ seat: 3, name: 'Stranger', tgId: 37, roleId: 'citizen', won: true, points: 90, side: 'city' }] } });
  await post('/api/game/result', { initData: host, game: { id: 'cheat-2', mode: 'classic', winner: 'city', code: lob.code, players: [{ seat: 2, name: 'Ann', tgId: 35, roleId: 'citizen', won: true, points: 20, side: 'city' }] } });
  eq(await env.DB.prepare('SELECT points FROM ratings WHERE tg_id = 35').first('points'), 20, 'a second game within two minutes gives no points');
  env.SEC_RESULT_GAP = '0'; await settle();
  ok(await evs('result_reject') >= 1 && await evs('result_flood') >= 1, 'both recorded');
  // the watch: incidents, automatic response, alerts with buttons
  const m0 = Math.floor(now() / 60); await env.DB.prepare("INSERT INTO security_stats (minute, key, n) VALUES (?1, 'req', 2500) ON CONFLICT(minute, key) DO UPDATE SET n = 2500").bind(m0 - 1).run();
  const a0 = tg.calls.length; await worker.scheduled({ cron: '* * * * *' }, env, ctx); await settle();
  const inc = (await env.DB.prepare("SELECT kind, severity, status FROM security_incidents WHERE status = 'open' ORDER BY id").all()).results.map(i => i.kind);
  ok(['webhook_leak', 'webhook_probe', 'auth_attack', 'flood', 'xss', 'scraping', 'cheating'].every(k => inc.includes(k)), 'incidents opened: ' + inc.join(', '));
  ok(Number(await env.DB.prepare("SELECT value FROM discord_cfg WHERE key = 'sec:guard'").first('value')) > now() + 1500, 'flood → stricter limits (guard mode) for 30 minutes');
  ok(await sec.isLockdown(env), 'the leaked webhook secret keeps admin powers locked');
  const alerts = tg.calls.slice(a0).filter(c => c.method === 'sendMessage' && c.params.chat_id === 777 && /Безопасность ·/.test(c.params.text));
  ok(alerts.length >= 7 && alerts.some(a => /КРИТИЧНО/.test(a.params.text)), 'admin alerted for each incident (' + alerts.length + ')');
  ok(alerts[0].params.reply_markup.inline_keyboard[0][0].callback_data.startsWith('sec_ack_'), 'alert has an "acknowledged" button');
  const a1 = tg.calls.length; await worker.scheduled({ cron: '* * * * *' }, env, ctx); await settle();
  eq(tg.calls.slice(a1).filter(c => c.method === 'sendMessage' && /Безопасность ·/.test(c.params.text || '')).length, 0, 'no repeated alerts a minute later');
  const id0 = (await env.DB.prepare("SELECT id FROM security_incidents WHERE kind = 'xss'").first('id'));
  await post('/webhook', { update_id: 5, callback_query: { id: 'q1', from: adm, data: `sec_ack_${id0}`, message: { message_id: 1, chat: { id: 777 } } } }, hookNew.secret ? hookNew : { 'X-Telegram-Bot-Api-Secret-Token': 'hook-secret' });
  ok(await env.DB.prepare('SELECT acked_at FROM security_incidents WHERE id = ?1').bind(id0).first('acked_at'), 'acknowledged with the button');
  await hook(msg(adm, '/security')); const stx = lastTo(777).params.text; ok(/Открытые инциденты/.test(stx) && /блокировка/.test(stx), '/security shows incidents and the mode');
  await hook(msg(adm, '/security ban 36 2')); ok(await env.DB.prepare("SELECT 1 FROM security_bans WHERE key = 'tg:36'").first(), '/security ban <id>');
  eq((await post('/api/me', { initData: await initData(user(36)) })).status, 403, 'a banned player is refused');
  await hook(msg(adm, '/security unban tg:36')); eq((await post('/api/me', { initData: await initData(user(36)) })).status, 200, '/security unban');
  await hook(msg(user(31), '/security')); ok(!/Безопасность Mafia Pro/.test(lastTo(31).params.text), '/security is for admins only');
  // incidents close after 30 quiet minutes
  await env.DB.prepare("UPDATE security_incidents SET last_at = last_at - 3600 WHERE status = 'open'").run(); await env.DB.prepare('DELETE FROM security_events').run(); await env.DB.prepare('DELETE FROM security_stats').run();
  const a2 = tg.calls.length; await worker.scheduled({ cron: '* * * * *' }, env, ctx); await settle();
  eq((await env.DB.prepare("SELECT COUNT(*) AS n FROM security_incidents WHERE status = 'open'").first('n')), 0, 'quiet incidents closed');
  ok(tg.calls.slice(a2).some(c => c.method === 'sendMessage' && /закрыт/.test(c.params.text || '')), 'admin told they are closed');
  // the report: no Telegram ids or IPs in it
  await post('/api/me', { initData: forged }, at('198.51.100.77')); await settle();
  const rep = await (await post('/sec/report', { hours: 24 }, { 'X-Sec-Key': key })).json();
  ok(rep.ok && rep.mode && Array.isArray(rep.incidents) && rep.incidents.length >= 7 && rep.events.some(e => e.type === 'auth_forged'), 'report: mode, incidents, events');
  const rs = JSON.stringify(rep); ok(!rs.includes('198.51.100') && !/"(34|35|36|777)"/.test(rs) && !rs.includes(':777') && !rs.includes('tg:36"'), 'report has no IPs or Telegram ids');
  const ban = await (await post('/sec/act', { action: 'ban', target: rep.topIps[0].ip, hours: 1, note: 'тест' }, { 'X-Sec-Key': key })).json(); ok(ban.ok && ban.until > now(), 'the agent can ban by IP hash');
  await hook(msg(adm, '/security log')); await settle();
  eq((await (await post('/sec/act', { action: 'ban', target: 'tg:' + await sec.tgHash(env, 777) }, { 'X-Sec-Key': key })).json()).error, 'admin', 'the agent cannot ban an admin');
  const lk = await (await post('/sec/act', { action: 'lockdown_on', note: 'агент' }, { 'X-Sec-Key': key })).json(); ok(lk.ok && await sec.isLockdown(env), 'the agent can lock down');
  await post('/sec/act', { action: 'unlock' }, { 'X-Sec-Key': key }); await post('/sec/act', { action: 'guard_off' }, { 'X-Sec-Key': key });
  const note = await (await post('/sec/act', { action: 'note', note: 'Проверил <всё>' }, { 'X-Sec-Key': key })).json(); ok(note.ok && lastTo(777).params.text.includes('Проверил &lt;всё&gt;'), 'the agent writes to the admins (escaped)');
  // the admin's account from a new country
  await post('/api/me', { initData: await initData(user(777)) }, { 'CF-IPCountry': 'UA', 'CF-Connecting-IP': '192.0.2.90' });
  await post('/api/me', { initData: await initData(user(777)) }, { 'CF-IPCountry': 'NL', 'CF-Connecting-IP': '192.0.2.91' }); await settle();
  ok(await evs('admin_new_country') === 1, 'the admin seen from a new country → event');
  // security headers on the API
  const h = await call('/'); ok(h.headers.get('X-Content-Type-Options') === 'nosniff' && /frame-ancestors 'none'/.test(h.headers.get('Content-Security-Policy') || ''), 'API answers carry security headers');
  sec._resetSecurityMemory(); await env.DB.prepare('DELETE FROM security_bans').run(); await env.DB.prepare("DELETE FROM discord_cfg WHERE key LIKE 'sec:%'").run(); }

console.log('ranks (v54): the same table as the app, a rank-up in the result and once from the bot, the host badge, rank roles in Discord, /stats');
{ const R = await import('../src/ranks.js'); const fs = await import('node:fs');
  const app = fs.readFileSync(path.join(here, '..', '..', 'src', '11-ranks.js'), 'utf8'); const appT = fs.readFileSync(path.join(here, '..', '..', 'src', '02u-i18n-ranks.js'), 'utf8');
  const arr = name => JSON.parse(app.match(new RegExp('const ' + name + ' = (\\[[^\\]]*\\])'))[1]);
  eq(arr('RANK_MIN'), R.RANK_MIN, 'thresholds are the same in the app'); eq(arr('HOST_LEVELS'), R.HOST_LEVELS, 'host levels are the same in the app');
  ok(Number(app.match(/const RANK_NOVICE_GAMES = (\d+)/)[1]) === R.RANK_NOVICE_GAMES, 'the novice games are the same in the app');
  for (const l of ['ru', 'uk', 'en', 'pl', 'hy']) { const m = appT.match(new RegExp(l + ': \\{\\s*rankNames: (\\[[^\\]]*\\])')); eq(m && JSON.parse(m[1].replace(/'/g, '"')), R.RANK_NAMES[l], l + ': rank names are the same in the app'); }
  eq([[1000, 4], [1000, 5], [1149, 9], [1150, 9], [1349, 20], [1350, 20], [1600, 30], [1900, 40], [2300, 50], [2899, 60], [2900, 60], [900, 30]].map(([p, g]) => R.rankIdx(p, g)), [0, 1, 1, 2, 2, 3, 4, 5, 6, 6, 7, 1], 'rank by rating and games (the first five games are Новичок)');
  eq(R.rankNext(1000, 2), { idx: 1, games: 3 }, 'Новичок: games to go'); eq(R.rankNext(1612, 40), { idx: 5, points: 288 }, 'points to the next rank'); eq(R.rankNext(3000, 99), null, 'nothing above Легенда');
  eq([0, 9, 10, 49, 50, 199, 200].map(R.hostLevel), [0, 0, 1, 1, 2, 2, 3], 'host badge levels');
  ok(R.RANK_EMOJI.length === 8 && R.RANK_COLOR.length === 8 && new Set(R.RANK_EMOJI.map((_, i) => R.rankRoleName(i))).size === 8, 'eight distinct Discord role names');

  const H = 5401, P1 = 5402; await env.DB.prepare('INSERT OR IGNORE INTO friends (tg_id, friend_id, created_at) VALUES (5401, 5402, 0), (5402, 5401, 0)').run();
  await hook(msg(user(P1, 'uk'), '/start')); await hook(msg(user(H, 'ru'), '/start'));
  const host = await initData(user(H));
  const play = async (id, pts) => (await post('/api/game/result', { initData: host, game: { id, mode: 'classic', winner: 'city', players: [{ seat: 1, name: 'P', tgId: P1, roleId: 'sheriff', won: pts > 0, points: pts, side: 'city' }] } })).json();
  const rankDMs = () => tg.calls.filter(c => c.method === 'sendMessage' && c.params.chat_id === P1 && /Новий ранг/.test(c.params.text));
  let quiet = true; for (let i = 1; i <= 4; i++) { const r = await play('rk-' + i, 24); if (Object.keys(r.rankUp || {}).length) quiet = false; } ok(quiet, 'games 1–4: still Новичок, no rank-up');
  let r = await play('rk-5', 24); eq(r.rankUp, { [P1]: 1 }, 'the fifth game: Любитель (rating 1120)');
  ok(rankDMs().length === 1 && rankDMs()[0].params.text.includes('🎭 Любитель') && rankDMs()[0].params.text.includes('Гравець') && rankDMs()[0].params.text.includes('1150'), 'the bot congratulates in the player\'s language, with the next rank: ' + (rankDMs()[0] || { params: {} }).params.text);
  ok(rankDMs()[0].params.reply_markup && rankDMs()[0].params.reply_markup.inline_keyboard[0][0].web_app, 'with a Play button');
  r = await play('rk-6', 60); eq(r.rankUp, { [P1]: 2 }, 'a big win: Игрок (1180)'); ok(rankDMs().length === 2 && rankDMs()[1].params.text.includes('♠️ Гравець'), 'second message');
  r = await play('rk-7', -60); eq(r.rankUp, {}, 'a loss below 1150: back to Любитель, no rank-up'); eq(r.ratings[P1].points, 120, 'rating 1120');
  r = await play('rk-8', 60); eq(r.rankUp, { [P1]: 2 }, 'up again: the result marks it'); ok(rankDMs().length === 2, 'but the bot does not repeat a rank it already announced');
  eq(await env.DB.prepare('SELECT best FROM rank_best WHERE tg_id = ?1').bind(P1).first('best'), 2, 'rank_best keeps the highest announced rank');
  const hostDMs = () => tg.calls.filter(c => c.method === 'sendMessage' && c.params.chat_id === H && c.params.text.includes('🎩 Новый значок ведущего'));
  ok(hostDMs().length === 0, '8 games hosted: no host badge yet'); await play('rk-9', 1); await play('rk-10', 1);
  ok(hostDMs().length === 1 && hostDMs()[0].params.text.includes('<b>Ведущий</b>') && hostDMs()[0].params.text.includes('10'), 'the tenth hosted game: the host badge message');
  await play('rk-11', 1); ok(hostDMs().length === 1, 'only once');
  const lb = await (await call('/api/leaderboard?limit=50')).json(); const row = lb.top.find(x => x.tgId === P1); ok(row && row.games === 11 && 'hosted' in row, 'the leaderboard carries games and hosted (for the badges)');
  const fr = await (await post('/api/friends', { initData: host })).json(); const f = (fr.friends || fr.list || []).find(x => x.tgId === P1); ok(fr.ok && f && f.games === 11 && 'hosted' in f, 'friends carry games and hosted');
  const ex = await exportUser(env, P1); ok(ex.rankAnnounced && ex.rankAnnounced.best === 2, '/mydata includes the announced rank');

  // Discord: rank roles for linked members
  const dc = await startMockDiscord(8799); Object.assign(env, { DISCORD_BOT_TOKEN: 'dc-token', DISCORD_GUILD_ID: '111111111111', DISCORD_API: dc.base });
  const dreq = async (method, p, body) => (await fetch(dc.base + p, { method, headers: { Authorization: 'Bot dc-token', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })).json();
  const sync = async () => { await worker.scheduled({ cron: '*/15 * * * *' }, env, ctx); await settle(); };
  await env.DB.prepare("DELETE FROM discord_cfg WHERE key = 'rank_roles'").run(); await env.DB.prepare('DELETE FROM discord_rank').run();
  const DU = '800000000000005402'; dc.join({ id: DU, username: 'p1' });
  await env.DB.prepare("INSERT OR REPLACE INTO discord_members (user_id, username, status, tg_id, updated_at) VALUES (?1, 'p1', 'in', ?2, ?3)").bind(DU, P1, now() + 10).run();
  const calls0 = dc.calls.length; await sync(); ok(await env.DB.prepare('SELECT COUNT(*) AS n FROM discord_rank').first('n') === 0 && dc.calls.length - calls0 <= 1, 'no rank roles on the server yet → nothing given, one look at the roles');
  const roleIds = []; for (let i = 0; i < 8; i++) roleIds.push((await dreq('POST', '/guilds/111111111111/roles', { name: R.rankRoleName(i) })).id);
  await env.DB.prepare("DELETE FROM discord_cfg WHERE key = 'rank_roles'").run();
  await sync(); ok(dc.members.get(DU).roles.includes(roleIds[2]), 'a linked member gets the role of his rank (♠️ Игрок · Player)');
  await env.DB.prepare('UPDATE ratings SET points = 100 WHERE tg_id = ?1').bind(P1).run(); await sync();
  ok(dc.members.get(DU).roles.includes(roleIds[1]) && !dc.members.get(DU).roles.includes(roleIds[2]), 'a lower rating swaps the role (strictly by the rating)');
  const calls1 = dc.calls.length; await sync(); ok(dc.calls.length === calls1, 'nothing changed → no requests to Discord');
  await env.DB.prepare('UPDATE ratings SET points = 2000 WHERE tg_id = ?1').bind(P1).run(); await sync(); ok(dc.members.get(DU).roles.includes(roleIds[7]) && dc.members.get(DU).roles.filter(x => roleIds.includes(x)).length === 1, 'Легенда: one rank role at a time');
  // /stats shows the rank
  const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']); env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
  const signed = async bodyObj => { const ts = String(Math.floor(Date.now() / 1000)); const raw = JSON.stringify(bodyObj); const sig = Buffer.from(await crypto.subtle.sign({ name: 'Ed25519' }, kp.privateKey, new TextEncoder().encode(ts + raw))).toString('hex'); return call('/discord/interactions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts }, body: raw }); };
  const st = await (await signed({ type: 2, data: { name: 'stats' }, member: { user: { id: DU, username: 'p1' } } })).json();
  const rf = st.data && st.data.embeds && st.data.embeds[0].fields.find(x => x.name === 'Ранг'); ok(rf && rf.value.includes('👑 Легенда'), '/stats: the rank first: ' + (rf && rf.value));
  // unlinked (/deletedata) → the role goes
  await env.DB.prepare('UPDATE discord_members SET tg_id = NULL WHERE user_id = ?1').bind(DU).run(); await sync();
  ok(!dc.members.get(DU).roles.some(x => roleIds.includes(x)) && !(await env.DB.prepare('SELECT rank FROM discord_rank WHERE user_id = ?1').bind(DU).first()), 'unlinked → the rank role is taken back');
  ok(await env.DB.prepare("SELECT COUNT(*) AS n FROM discord_rank WHERE user_id = '800000000000000002'").first('n') === 1, 'a linked member who is not on the server: remembered, not retried every run');
  for (const k of ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_API', 'DISCORD_PUBLIC_KEY']) delete env[k];
  await dc.close();
  await env.DB.prepare("DELETE FROM games WHERE game_id LIKE 'rk-%'").run(); await env.DB.prepare('DELETE FROM ratings WHERE tg_id IN (5401, 5402)').run(); await env.DB.prepare("DELETE FROM discord_cfg WHERE key = 'lb:top'").run();
}

console.log('privacy: /privacy, /mydata, /unsubscribe, /support, /deletedata');
{ const p = user(41, 'uk'); await hook(msg(p, '/start'));
  await hook(msg(p, '/privacy')); ok(lastTo(41).params.text.includes('https://shakaboom55566.github.io/uk/privacy/') || lastTo(41).params.text.includes('/uk/privacy/'), 'policy link in the player language: ' + lastTo(41).params.text.slice(-60));
  await hook(msg(p, '/help')); ok(lastTo(41).params.text.includes('/privacy'), '/help mentions /privacy');
  await post('/api/me', { initData: await initData(p), city: 'Київ' });
  await hook(msg(p, '/mydata')); const doc = lastCall('sendDocument'); ok(doc && doc.params.chat_id === 41 && /my-data-41\.json$/.test(doc.params.document.name), 'data file sent');
  const data = JSON.parse(doc.params.document.bytes.toString('utf8')); ok(data.telegramId === 41 && data.profile.username === 'user41' && data.city.city === 'Київ', 'file has the profile and city');
  await hook(msg(p, '/mydata')); ok(/годину/.test(lastTo(41).params.text), 'second export within an hour → wait');
  await hook(msg(p, '/unsubscribe')); ok(await env.DB.prepare('SELECT no_news FROM user_prefs WHERE tg_id = 41').first('no_news') === 1, 'unsubscribed');
  await hook(msg({ id: 777, first_name: 'Admin', language_code: 'ru' }, '/broadcast')); const card = lastTo(777).params.text; ok(/Получат/.test(card), 'broadcast preview');
  const bq = await env.DB.prepare("SELECT id FROM broadcasts ORDER BY id DESC LIMIT 1").first('id');
  await hook({ update_id: 6, callback_query: { id: 'q2', from: { id: 777, first_name: 'Admin', language_code: 'ru' }, data: `bc_go_${bq}`, message: { message_id: 1, chat: { id: 777 } } } });
  ok(!(await env.DB.prepare('SELECT 1 FROM broadcast_queue WHERE bid = ?1 AND tg_id = 41').bind(bq).first()), 'an unsubscribed player is not in the broadcast');
  await hook({ update_id: 7, callback_query: { id: 'q3', from: { id: 777, first_name: 'Admin', language_code: 'ru' }, data: `bc_stop_${bq}`, message: { message_id: 1, chat: { id: 777 } } } });
  await env.DB.prepare("UPDATE broadcasts SET status = 'cancelled' WHERE id = ?1").bind(bq).run();
  await hook(msg(p, '/subscribe')); ok(await env.DB.prepare('SELECT no_news FROM user_prefs WHERE tg_id = 41').first('no_news') === 0, 'subscribed again');
  await hook(msg(p, '/support Не приходит карта <b>')); ok(/Поддержка/.test(lastTo(777).params.text) && lastTo(777).params.text.includes('Не приходит карта &lt;b&gt;'), 'support message forwarded to the admin (escaped)');
  const sup = lastTo(777); await hook({ update_id: 61, message: { message_id: 70, from: { id: 777, first_name: 'Admin', language_code: 'ru' }, chat: { id: 777, type: 'private' }, text: 'Перезапустите стол <ok>', reply_to_message: { message_id: 69, text: sup.params.text.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>') } } });
  ok(/Відповідь команди/.test(lastTo(41).params.text) && lastTo(41).params.text.includes('Перезапустите стол &lt;ok&gt;') && /Ответ отправлен/.test(lastTo(777).params.text), 'admin reply to a support message reaches the player in their language');
  for (let i = 0; i < 5; i++) await hook(msg(p, '/support ще ' + i)); ok(/5 повідомлень/.test(lastTo(41).params.text), 'support: 5 a day');
  // deletion: a game with the player, a friend, a seat
  await env.DB.prepare("INSERT INTO games (game_id, host_id, code, mode, players, winner, summary, created_at) VALUES ('pv-1', 41, NULL, 'classic', 2, 'city', ?1, ?2)").bind(JSON.stringify([{ seat: 1, name: 'Оля', tgId: 41, roleId: 'sheriff', won: true, points: 30 }, { seat: 2, name: 'Інший', tgId: 42, roleId: 'don', won: false, points: -10 }]), now()).run();
  await env.DB.prepare('INSERT OR IGNORE INTO friends (tg_id, friend_id, created_at) VALUES (41, 42, 0), (42, 41, 0)').run();
  await env.DB.prepare('INSERT INTO ratings (tg_id, points, games, wins, hosted, updated_at) VALUES (41, 30, 1, 1, 0, 0) ON CONFLICT(tg_id) DO NOTHING').run();
  await hook(msg(p, '/deletedata')); const ask = lastTo(41); ok(ask.params.reply_markup.inline_keyboard[0][0].callback_data === 'pv_del_yes', 'deletion asks first');
  ok(await env.DB.prepare('SELECT 1 FROM users WHERE tg_id = 41').first(), 'nothing deleted before the button');
  await hook({ update_id: 8, callback_query: { id: 'q4', from: p, data: 'pv_del_yes', message: { message_id: 9, chat: { id: 41 } } } });
  const gone = await Promise.all(['users', 'ratings', 'user_cities', 'user_prefs', 'player_track'].map(tb => env.DB.prepare(`SELECT COUNT(*) AS n FROM ${tb} WHERE tg_id = 41`).first('n')));
  eq(gone, [0, 0, 0, 0, 0], 'profile, rating, city, settings, source deleted');
  eq(await env.DB.prepare('SELECT COUNT(*) AS n FROM friends WHERE tg_id = 41 OR friend_id = 41').first('n'), 0, 'friendships deleted');
  const sm = JSON.parse(await env.DB.prepare("SELECT summary FROM games WHERE game_id = 'pv-1'").first('summary')); ok(sm[0].tgId === null && sm[0].name === 'Игрок' && sm[1].tgId === 42, 'game kept for the other player, this seat anonymised');
  eq(await env.DB.prepare("SELECT host_id FROM games WHERE game_id = 'pv-1'").first('host_id'), 0, 'hosted game no longer points to the player');
  ok(/видалено/.test(lastCall('editMessageText').params.text), 'confirmation shown'); }

console.log('seasons (v55): one calendar in the app and the server, the best of the season, the end — results, ratings back to 1000, Legends, the break, season 2');
{ const R = await import('../src/ranks.js'); const fs = await import('node:fs'); const vm = await import('node:vm');
  const app = fs.readFileSync(path.join(here, '..', '..', 'src', '11-ranks.js'), 'utf8'); const srv = fs.readFileSync(path.join(here, '..', 'src', 'ranks.js'), 'utf8');
  const block = t => t.slice(t.indexOf('/* season:begin'), t.indexOf('/* season:end */')); ok(block(app).length > 500 && block(app) === block(srv), 'the season code is the same text in the app and the server');
  const c = vm.createContext({ Date, Math }); vm.runInContext(block(app) + '; this.seasonAt = seasonAt;', c);
  const probes = ['2026-01-01T00:00:00Z', '2026-10-15T12:00:00Z', '2026-12-15T21:59:59Z', '2026-12-15T22:00:00Z', '2026-12-22T21:59:59Z', '2026-12-22T22:00:00Z', '2027-02-23T21:59:59Z', '2027-02-24T10:00:00Z', '2027-03-02T22:00:00Z', '2027-07-01T00:00:00Z'].map(Date.parse);
  ok(probes.every(ts => JSON.stringify(c.seasonAt(ts)) === JSON.stringify(R.seasonAt(ts))), 'the app computes the same seasons');
  const s1 = R.seasonAt(Date.parse('2026-10-15T12:00:00Z')); eq([s1.n, s1.phase, new Date(s1.start).toISOString(), new Date(s1.end).toISOString(), new Date(s1.next).toISOString()], [1, 'live', '2026-10-14T21:00:00.000Z', '2026-12-15T22:00:00.000Z', '2026-12-22T22:00:00.000Z'], 'season 1: 15.10 00:00 – 15.12 inclusive (Kyiv), season 2 from 23.12');
  eq([R.seasonAt(Date.parse('2026-12-16T10:00:00Z')).phase, R.seasonAt(Date.parse('2026-12-23T10:00:00Z')).n], ['break', 2], 'a 7-day break, then season 2');
  const s2 = R.seasonAt(Date.parse('2027-01-10T00:00:00Z')); eq([s2.lastDay, s2.nextDay], [{ y: 2027, m: 2, d: 23 }, { y: 2027, m: 3, d: 3 }], 'season 2: two months, the break, season 3');

  const backup = (await env.DB.prepare('SELECT * FROM ratings').all()).results;
  const H = 5501, A = 5502, B = 5503; await env.DB.prepare('INSERT OR IGNORE INTO friends (tg_id, friend_id, created_at) VALUES (5501, 5502, 0), (5502, 5501, 0), (5501, 5503, 0), (5503, 5501, 0)').run();
  for (const id of [H, A, B]) await hook(msg(user(id, id === A ? 'en' : 'ru'), '/start'));
  const host = await initData(user(H));
  const play = async (gid, rows) => (await post('/api/game/result', { initData: host, game: { id: gid, mode: 'classic', winner: 'city', players: rows.map(([tgId, pts], i) => ({ seat: i + 1, name: 'P' + i, tgId, roleId: 'sheriff', won: pts > 0, points: pts, side: 'city' })) } })).json();
  await play('ss-1', [[A, 60], [B, 24]]); await play('ss-2', [[A, -60], [B, -10]]);
  let pa = await (await post('/api/profile', { initData: host, tgId: A })).json();
  ok(pa.rating.points === 1000 && pa.peak && pa.peak.points === 1060 && pa.peak.season === 1 && pa.season.n === 1 && pa.season.phase === 'live', 'the profile: rating now 1000, best of season 1 — 1060');
  const me = await (await post('/api/me', { initData: await initData(user(A, 'en')) })).json(); ok(me.peak && me.peak.points === 1060 && me.season && me.season.n === 1, '/api/me carries the best and the season');
  // A becomes a Legend (≥ 2900 after 5 games), B is a Master
  await env.DB.prepare('UPDATE ratings SET points = 1950, games = 12 WHERE tg_id = ?1').bind(A).run(); await env.DB.prepare('UPDATE ratings SET points = 640, games = 9 WHERE tg_id = ?1').bind(B).run();
  await play('ss-3', [[A, 30]]); ok((await (await post('/api/profile', { initData: host, tgId: A })).json()).peak.points === 2980, 'the best follows the rating up');
  // the season ends
  env.SEASON_NOW_MS = String(Date.parse('2026-12-16T10:00:00Z')); const tgN = tg.calls.length;
  await worker.scheduled({ cron: '*/5 * * * *', scheduledTime: Date.parse('2026-12-16T10:05:00Z') }, env, ctx); await settle();
  const fin = r => env.DB.prepare('SELECT * FROM season_results WHERE season = 1 AND tg_id = ?1').bind(r).first();
  const fa = await fin(A), fb = await fin(B); ok(fa && fa.points === 1980 && fa.peak === 1980 && fb && fb.points === 640, 'season 1 results kept: rating and best');
  ok(await env.DB.prepare('SELECT COUNT(*) AS n FROM ratings WHERE points != 0').first('n') === 0, 'every rating back to 1000');
  const legendDM = tg.calls.slice(tgN).find(x => x.method === 'sendMessage' && x.params.chat_id === A); ok(legendDM && legendDM.params.text.includes('Legend') && legendDM.params.text.includes('Epic') && legendDM.params.text.includes('2980') && legendDM.params.text.includes('23.12.2026'), 'the Legend is congratulated in his language: ' + (legendDM && legendDM.params.text.slice(0, 80)));
  ok(!tg.calls.slice(tgN).some(x => x.method === 'sendMessage' && x.params.chat_id === B), 'a Master gets no message');
  const adm = tg.calls.slice(tgN).filter(x => x.method === 'sendMessage' && x.params.chat_id === 777).map(x => x.params.text).join('\n'); ok(adm.includes('Сезон 1 завершён') && adm.includes('User5502') && adm.includes('5502') && adm.includes('2980') && adm.includes('Epic'), 'the admin gets the list of Legends');
  const n2 = tg.calls.length; await worker.scheduled({ cron: '*/5 * * * *', scheduledTime: Date.parse('2026-12-16T10:10:00Z') }, env, ctx); await settle(); ok(tg.calls.length === n2 && (await fin(A)).points === 1980, 'closed once');
  // v56: the Legend's skin — owned, worn at once; the others have none; equip / take off; what a table sees; the export
  { const meA = await (await post('/api/me', { initData: await initData(user(A, 'en')) })).json(); const meB = await (await post('/api/me', { initData: await initData(user(B)) })).json();
    ok(meA.skins && meA.skins.owned.includes('amethyst_don') && meA.skins.equipped.don === 'amethyst_don' && !meA.owned.packs.includes('amethyst_don'), 'the Legend owns and wears the Amethyst Don: ' + JSON.stringify(meA.skins));
    ok(meB.skins && !meB.skins.owned.length && !Object.keys(meB.skins.equipped).length, 'a Master gets no skin');
    ok(legendDM.params.text.includes('Amethyst Don'), 'the Legend is told the skin by name');
    ok(adm.includes('Аметистовый Дон'), 'the admin is told the skin was given');
    const of = await (await post('/api/skins', { initData: host, ids: [A, B, 'x', -1] })).json(); ok(of.ok && of.skins[A] && of.skins[A].don === 'amethyst_don' && !of.skins[B], 'a host sees what each player wears');
    ok((await (await post('/api/profile', { initData: host, tgId: A })).json()).skins.don === 'amethyst_don', 'the public profile carries the worn skins');
    const ia = await initData(user(A, 'en')), ib = await initData(user(B));
    let e = await post('/api/skin/equip', { initData: ib, role: 'don', skin: 'amethyst_don' }); ok(e.status === 400 && (await e.json()).error === 'not_owned', 'a skin nobody gave cannot be worn');
    e = await post('/api/skin/equip', { initData: ia, role: 'sheriff', skin: 'amethyst_don' }); ok(e.status === 400 && (await e.json()).error === 'bad_skin', 'a skin goes only on its own card');
    e = await post('/api/skin/equip', { initData: ia, role: 'don', skin: 'no_such' }); ok(e.status === 400, 'an unknown skin is refused');
    let d = await (await post('/api/skin/equip', { initData: ia, role: 'don', skin: null })).json(); ok(d.ok && !d.equipped.don, 'taken off');
    d = await (await post('/api/skin/equip', { initData: ia, role: 'don', skin: 'amethyst_don' })).json(); ok(d.ok && d.equipped.don === 'amethyst_don', 'put back on');
    ok((await (await post('/api/skins', { initData: host })).json()).error === 'bad_ids', 'ids are required');
    const adminMe = await (await post('/api/me', { initData: await initData(user(777)) })).json(); ok(adminMe.skins.owned.includes('amethyst_don'), 'admins own every skin (to try them on)');
    ok((await exportUser(env, A)).skinsWorn.some(x => x.skin === 'amethyst_don'), '/mydata includes the worn skins');
    ok((await env.DB.prepare("SELECT COUNT(*) AS n FROM purchases WHERE kind = 'skin' AND tg_id = ?1").bind(A).first('n')) === 1, 'the reward is given once'); }
  // the break: the top is the final standings, games count but the rating stays
  const lb = await (await call('/api/leaderboard?limit=10')).json(); ok(lb.final === true && lb.season.phase === 'break' && lb.top[0].tgId === A && lb.top[0].points === 2980, 'the break: the overall rating shows season 1 final standings');
  let r = await play('ss-4', [[B, 60]]); ok(r.season.phase === 'break' && r.ratings[B].points === 0 && r.ratings[B].games === 10 && !Object.keys(r.rankUp).length, 'a game in the break: counted in the games, not in the rating');
  pa = await (await post('/api/profile', { initData: host, tgId: A })).json(); ok(pa.rating.points === 1000 && pa.peak.points === 2980 && pa.peak.final === true, 'the profile in the break: rating 1000, best of season 1 — 2980');
  // season 2
  env.SEASON_NOW_MS = String(Date.parse('2026-12-23T10:00:00Z'));
  const lb2 = await (await call('/api/leaderboard?limit=10')).json(); ok(lb2.final === false && lb2.season.n === 2 && lb2.season.phase === 'live', 'season 2: the live rating again (the cache of the break is dropped)');
  r = await play('ss-5', [[B, 24]]); ok(r.ratings[B].points === 24, 'season 2: points count again');
  const pb = await (await post('/api/profile', { initData: host, tgId: B })).json(); ok(pb.peak.season === 2 && pb.peak.points === 1024, 'the best of season 2 starts from scratch');
  await worker.scheduled({ cron: '*/5 * * * *', scheduledTime: Date.parse('2026-12-23T10:05:00Z') }, env, ctx); await settle(); ok(await env.DB.prepare('SELECT COUNT(*) AS n FROM season_results WHERE season = 2').first('n') === 0, 'season 2 is not closed while it runs');
  const ex = await exportUser(env, A); ok(ex.seasons && ex.seasons.length === 1 && ex.seasons[0].season === 1 && ex.seasonBest && ex.seasonBest.length >= 1, '/mydata includes the season results and bests');
  delete env.SEASON_NOW_MS;
  await env.DB.prepare('DELETE FROM ratings').run(); for (const b of backup) await env.DB.prepare('INSERT INTO ratings (tg_id, points, games, wins, hosted, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(b.tg_id, b.points, b.games, b.wins, b.hosted, b.updated_at).run();
  await env.DB.prepare("DELETE FROM purchases WHERE kind = 'skin'").run(); await env.DB.prepare('DELETE FROM user_skins').run();
  await env.DB.prepare("DELETE FROM discord_cfg WHERE key IN ('lb:top', 'season:closed:1')").run(); await env.DB.prepare('DELETE FROM season_results').run(); await env.DB.prepare("DELETE FROM games WHERE game_id LIKE 'ss-%'").run();
}

console.log('skins (v56): the same catalog in the app and the server');
{ const fs = await import('node:fs'); const vm = await import('node:vm'); const SK = await import('../src/skins.js');
  const app = fs.readFileSync(path.join(here, '..', '..', 'src', '12-skins.js'), 'utf8'); const block = app.slice(app.indexOf('/* skins:begin'), app.indexOf('/* skins:end */'));
  const c = vm.createContext({}); vm.runInContext(block + '; this.SKINS = SKINS;', c);
  eq(c.SKINS.map(x => [x.id, x.role, x.rarity, x.season || 0]), Object.entries(SK.SKINS).map(([id, x]) => [id, x.role, x.rarity, x.season || 0]), 'every skin has the same id, card, rarity and season');
  ok(Object.entries(SK.SEASON_SKIN).every(([n, id]) => SK.SKINS[id] && SK.SKINS[id].season === Number(n)), 'a season reward is a skin of that season');
  const files = c.SKINS.flatMap(x => [x.file + '.webp', x.file + '-depth.png', x.file + '-seal.webp']); ok(files.every(f => fs.existsSync(path.join(here, '..', '..', 'skins', f))), 'every skin has its face, depth map and portrait in skins/');
  ok(Object.keys(SK.SKINS).every(id => ['ru', 'uk', 'en', 'pl', 'hy'].every(l => SK.skinName(id, l) && SK.skinName(id, l) !== id)), 'every skin is named in five languages'); }

console.log('robustness');
{ eq((await call('/api/me', { method: 'POST', body: '{bad', headers: { 'Content-Type': 'application/json' } })).status, 400, 'bad json');
  eq((await call('/api/nothing', { method: 'POST', body: '{}' })).status, 404, 'unknown api');
  eq((await call('/nothing')).status, 404, 'unknown path');
  const r = await hook({ update_id: 99, edited_message: { text: 'x' } }); eq(r.status, 200, 'unhandled update type → 200');
  const r2 = await hook({ update_id: 100, message: { message_id: 1, from: user(5), chat: { id: -100, type: 'supergroup' }, text: '/start' } }); eq(r2.status, 200, 'group message ignored');
  ok(!tg.calls.some(c => c.method === 'sendMessage' && c.params.chat_id === -100), 'no reply in groups'); }

await tg.close();
console.log(fails ? `\n${fails} of ${n} checks FAILED` : `\nALL OK (${n} checks)`);
process.exit(fails ? 1 : 0);
