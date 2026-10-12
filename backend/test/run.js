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
  ok((await (await post('/api/me', { initData: adm })).json()).admin === true && (await (await post('/api/me', { initData: usr })).json()).admin === false, 'admin flag in /api/me');
  eq((await post('/api/admin/grant', { initData: usr, q: '@maria_k' })).status, 403, 'non-admin forbidden');
  const g = await (await post('/api/admin/grant', { initData: adm, q: '@maria_k', days: 30 })).json();
  ok(g.ok && g.granted.tgId === 601 && g.granted.until > Date.now() + 29 * 86400000 && g.grants.length === 1, 'granted 30 days via API');
  ok(lastTo(601).params.text.includes('full access') && lastTo(601).params.text.includes('until'), 'player notified (en)');
  const me601 = await (await post('/api/me', { initData: usr })).json(); ok(me601.owned.allUntil > Date.now() + 29 * 86400000, 'me.owned.allUntil set');
  ok((await (await post('/api/invoice', { initData: usr, kind: 'role', id: 'sniper' })).json()).link, 'buying is still possible while granted (grant is temporary)');
  // bot commands
  await hook(msg(user(777, 'ru'), '/grant @marek_w 7')); ok(lastTo(777).params.text.includes('Marek') && lastTo(777).params.text.includes('до'), '/grant via bot');
  ok(lastTo(602).params.text.includes('pełny dostęp'), 'player notified (pl)');
  await hook(msg(user(777, 'ru'), '/grant 603')); ok(lastTo(777).params.text.includes('603') || lastTo(777).params.text.includes('Марія') || lastTo(777).params.text.includes('User603'), '/grant by numeric id');
  await hook(msg(user(777, 'ru'), '/grant @nobody_here')); ok(lastTo(777).params.text.includes('не найден'), 'unknown user');
  await hook(msg(user(777, 'ru'), '/grants')); ok(lastTo(777).params.text.includes('Maria') && lastTo(777).params.text.includes('Marek') && (lastTo(777).params.text.match(/•/g) || []).length === 3, '/grants lists three');
  await hook(msg(U601, '/grant @marek_w')); ok(!lastTo(601).params.text.includes('granted') && lastTo(601).params.text.includes('Open the app'), 'non-admin /grant is ignored');
  await hook(msg(user(777, 'ru'), '/revoke @marek_w')); ok(lastTo(777).params.text.includes('отозван') && lastTo(602).params.text.includes('zakończył'), '/revoke via bot');
  const rv = await (await post('/api/admin/revoke', { initData: adm, q: '601' })).json(); ok(rv.ok && rv.grants.map(x => x.tgId).join() === '603', 'revoke via API by id');
  eq((await (await post('/api/me', { initData: usr })).json()).owned.allUntil, 0, 'allUntil cleared');
  await hook(msg(user(777, 'ru'), '/help')); ok(lastTo(777).params.text.includes('/grant'), 'admin help');
  // expired grants do not count
  await env.DB.prepare('UPDATE grants SET until = ?1 WHERE tg_id = 603').bind(now() - 10).run();
  eq((await (await post('/api/admin/grants', { initData: adm })).json()).grants, [], 'expired grant not listed');
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
