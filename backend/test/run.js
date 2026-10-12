/* End-to-end tests of the worker without Cloudflare: the module is imported directly, D1 is Node's SQLite, Telegram is a local mock.
   Run: node --no-warnings test/run.js */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { makeD1 } from './d1-shim.js';
import { startMockTelegram } from './mock-telegram.js';
import { signInitData } from '../src/tg.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const worker = (await import('../src/index.js')).default;
const tg = await startMockTelegram(8790);
const env = {
  DB: makeD1(path.join(here, '..', 'schema.sql')),
  BOT_TOKEN: 'test-token', WEBHOOK_SECRET: 'hook-secret',
  APP_URL: 'https://shakaboom55566.github.io/mafia-pro/', ALLOWED_ORIGIN: 'https://shakaboom55566.github.io',
  TELEGRAM_API: tg.base, STARS_ROLE: '100', STARS_SCENARIO: '500', STARS_PACK: '1750', ADMIN_IDS: '777'
};
const ctx = { waitUntil() {}, passThroughOnException() {} };
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
  await hook(msg(user(201, 'uk'), `/start join_${code}`)); ok(lastTo(201).params.text.includes(code) && lastTo(201).params.text.includes('за столом'), 'player 201 joined (uk)');
  ok(lastTo(100) && lastTo(100).params.text.includes('User201') && lastTo(100).params.text.includes('(всего 1)'), 'host notified about the first player (ru)');
  await hook(msg(user(202, 'en'), `/start join_${code.toLowerCase()}`)); ok(lastTo(202).params.text.includes('You are at table'), 'player 202 joined (en, lowercase code)');
  ok(lastTo(100).params.text.includes('(всего 2)'), 'host notified about the second player');
  await hook(msg(user(201, 'uk'), `/start join_${code}`)); ok(lastCall('sendMessage').params.text.includes('вже за столом'), 'joining twice → already');
  await hook(msg(user(203, 'ru'), '/start join_ZZZZZZ')); ok(lastCall('sendMessage').params.text.includes('не найден'), 'unknown table');
  const st = await (await post('/api/lobby/status', { initData: host, code })).json(); eq(st.players.map(p => p.tgId), [201, 202], 'status lists both'); eq(st.players[1].lang, 'en', 'lang kept');
  const stranger = await initData(user(999)); eq((await post('/api/lobby/status', { initData: stranger, code })).status, 404, 'not the host → 404');
  tg.blocked.add(202);
  const deal = await (await post('/api/lobby/deal', { initData: host, code, cards: [{ tgId: 201, seat: 3, text: '<b>Дон</b> — мафия' }, { tgId: 202, seat: 5, text: '<b>Sheriff</b>' }, { tgId: 777, seat: 1, text: 'x' }] })).json();
  eq(deal.sent, [201], 'card delivered to 201'); eq(deal.failed.map(f => f.tgId), [202, 777], '202 blocked, 777 not in lobby');
  const card = tg.calls.filter(c => c.method === 'sendMessage' && c.params.chat_id === 201).pop(); ok(card.params.text.includes('Ваша карта') && card.params.text.includes('<b>Дон</b>') && card.params.text.includes(`стіл ${code}, місце 3`), 'card text localized to the player (uk frame, host-provided body)');
  await hook(msg(user(204, 'ru'), `/start join_${code}`)); ok(lastCall('sendMessage').params.text.includes('закрыт'), 'closed after deal');
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
  tg.blocked.add(302);
  const inv = await (await post('/api/friends/invite', { initData: a, code: lob.code, friendIds: [301, 302, 999] })).json();
  eq(inv.sent, [301], '301 invited'); eq(inv.failed.map(f => f.error), ['Forbidden: bot was blocked by the user', 'not_friend'], '302 blocked, 999 not a friend');
  const dm = lastTo(301); ok(dm.params.text.includes('User100') && dm.params.text.includes(lob.code) && dm.params.reply_markup.inline_keyboard[0][0].url === `https://t.me/mafiapro_test_bot?start=join_${lob.code}`, 'invite DM has a join button (en)');
  eq((await post('/api/friends/invite', { initData: b, code: lob.code, friendIds: [100] })).status, 404, 'only the host can invite to a table');
  tg.blocked.delete(302);
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
  const game = { id: 'g-1', mode: 'classic', winner: 'city', players: [{ seat: 1, name: 'A', tgId: 201, roleId: 'don', won: false, points: -10 }, { seat: 2, name: 'B', tgId: 202, roleId: 'sheriff', won: true, points: 31 }, { seat: 3, name: 'C', roleId: 'citizen', won: true, points: 24 }] };
  const r = await (await post('/api/game/result', { initData: host, game })).json(); ok(r.ok && r.recorded, 'recorded');
  eq(r.ratings['202'], { points: 31, games: 1, wins: 1, hosted: 0 }, 'sheriff rating'); eq(r.ratings['201'], { points: -10, games: 1, wins: 0, hosted: 0 }, 'don rating');
  const again = await (await post('/api/game/result', { initData: host, game })).json(); ok(again.ok && !again.recorded && again.ratings['202'].points === 31, 'resend is idempotent');
  const me = await (await post('/api/me', { initData: host })).json(); eq(me.rating.hosted, 1, 'host credited');
  const lb = await (await call('/api/leaderboard?limit=5')).json(); ok(lb.ok && lb.top[0].tgId === 202 && lb.top[0].points === 1031 && lb.top[0].rank === 1, 'leaderboard'); }

console.log('player profile');
{ const a = await initData(user(100)); const pr = await (await post('/api/profile', { initData: a, tgId: 202 })).json();
  ok(pr.ok && pr.user.tgId === 202 && pr.user.name === 'User202' && pr.rating.points === 1031 && pr.rating.games === 1 && pr.rating.wins === 1, 'profile with rating: ' + JSON.stringify(pr.rating));
  eq(pr.roles, [{ roleId: 'sheriff', games: 1, wins: 1, points: 31 }], 'per-role stats'); ok(pr.recent.length === 1 && pr.recent[0].roleId === 'sheriff' && pr.recent[0].won === true && pr.recent[0].n === 3 && pr.recent[0].winner === 'city', 'recent games');
  ok(typeof pr.user.online === 'boolean' && typeof pr.user.seenAgo === 'number' && pr.isFriend === false && pr.grant === false, 'presence, friendship, grant flags');
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
  await post('/api/lobby/deal', { initData: hi, code: lob.code, cards: [901, 902, 903].map(id => ({ tgId: id, seat: id - 900, text: 'x' })) });
  let r2 = await (await post('/api/referrals', { initData: hi })).json(); eq(r2.qualified, 3, 'three qualified after receiving cards');
  const hostMsgs = tg.calls.filter(c => c.method === 'sendMessage' && c.params.chat_id === 900).map(c => c.params.text);
  ok(hostMsgs.filter(x => x.includes('первую партию')).length === 3, 'host told about each qualified invitee');
  ok(hostMsgs.some(x => x.includes('Награда') && x.includes('7 дн')) && hostMsgs.some(x => x.includes('30 дн')), 'milestones 1 (7 days) and 3 (30 days) paid');
  const g = await env.DB.prepare('SELECT until FROM grants WHERE tg_id = 900').first(); ok(g && g.until > now() + 36 * 86400, 'host has 37 days of full access');
  await post('/api/lobby/deal', { initData: hi, code: lob.code, cards: [{ tgId: 901, seat: 1, text: 'x' }] });
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
  const dm = lastTo(1003); ok(dm.params.text.includes(lob.code) && dm.params.reply_markup.inline_keyboard[0][0].url.includes('start=join_' + lob.code), 'online member got the table call (hy)');
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

console.log('all players directory');
{ const a = await initData(user(100)); const d = await (await post('/api/players', { initData: a })).json();
  ok(d.ok && d.total >= 10 && d.players.length === Math.min(50, d.total) && d.players.every(p => p.tgId && typeof p.online === 'boolean' && typeof p.points === 'number'), 'directory lists everyone who opened the bot: ' + d.total);
  ok(d.players.some(p => p.me) && d.players.some(p => p.isFriend), 'me and friends flagged');
  ok(d.online >= 1 && d.players[0].seenAgo <= d.players[d.players.length - 1].seenAgo, 'most recently seen first, online count');
  const pg = await (await post('/api/players', { initData: a, limit: 3, offset: 3 })).json(); ok(pg.players.length === 3 && pg.offset === 3 && pg.total === d.total, 'paging');
  const f = await (await post('/api/players', { initData: a, q: '@mar' })).json(); ok(f.total === 2 && f.players.every(p => /^mar/i.test(p.username) || /^Мар/.test(p.name)), 'prefix filter: ' + f.players.map(p => p.username).join(','));
  eq((await post('/api/players', {})).status, 401, 'auth required'); }

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
