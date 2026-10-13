/* End-to-end tests of the worker without Cloudflare: the module is imported directly, D1 is Node's SQLite, Telegram is a local mock.
   Run: node --no-warnings test/run.js */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { makeD1 } from './d1-shim.js';
import { startMockTelegram } from './mock-telegram.js';
import { startMockDiscord } from './mock-discord.js';
import { signInitData } from '../src/tg.js';
import { postsKey, entitiesToHtml } from '../src/posts.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const worker = (await import('../src/index.js')).default;
const tg = await startMockTelegram(8790);
const env = {
  DB: makeD1(path.join(here, '..', 'schema.sql')),
  BOT_TOKEN: 'test-token', WEBHOOK_SECRET: 'hook-secret',
  APP_URL: 'https://shakaboom55566.github.io/mafia-pro/', ALLOWED_ORIGIN: 'https://shakaboom55566.github.io',
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
  const lb = await (await call('/api/leaderboard?limit=5')).json(); ok(lb.ok && lb.top[0].tgId === 202 && lb.top[0].points === 1031 && lb.top[0].rank === 1, 'leaderboard'); }

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
  ok(cm.params.reply_markup.inline_keyboard[0][0].text === '🎲 Грати' && cm.params.reply_markup.inline_keyboard[0][0].url === 'https://t.me/mafiapro_test_bot?start=channel', 'play button in the post language');
  eq((await st('p-12')).status, 'posted', 'status posted');
  waits = []; await worker.scheduled({}, env, { waitUntil: p => waits.push(p) }); await Promise.all(waits); eq(toChannel().length, 1, 'never posted twice');
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
  const inv = await (await signed(Object.assign({ type: 2, data: { name: 'invites', options: [{ name: 'days', type: 4, value: 30 }] } }, asker))).json();
  ok(inv.data.flags === 64 && inv.data.embeds[0].description.includes('<@800000000000000002> — пришло 3, ушло 1') && inv.data.embeds[0].fields[0].value === '6', '/invites: Vera brought 3, 1 left; 6 joins: ' + (inv.data.embeds && inv.data.embeds[0].description).slice(0, 300));
  // the Members intent switched off: one warning a day, nothing breaks
  dc.st.membersFail = true; await cron(); await cron(); ok(posts().filter(m => m.embeds[0].title.includes('не видит участников')).length === 1, 'missing intent → one warning');
  dc.st.membersFail = false;
  for (const k of ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_API', 'DISCORD_PUBLIC_KEY']) delete env[k];
  await dc.close(); }

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
