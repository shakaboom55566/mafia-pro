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
  TELEGRAM_API: tg.base, STARS_ROLE: '100', STARS_SCENARIO: '500', STARS_PACK: '1750'
};
const ctx = { waitUntil() {}, passThroughOnException() {} };
let fails = 0, n = 0;
const ok = (cond, msg) => { n++; if (!cond) { fails++; console.log('  FAIL', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);

const call = (p, init = {}) => worker.fetch(new Request('https://api.test' + p, init), env, ctx);
const post = (p, body, headers = {}) => call(p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', 'Origin': 'https://shakaboom55566.github.io' }, headers), body: JSON.stringify(body) });
const hook = upd => post('/webhook', upd, { 'X-Telegram-Bot-Api-Secret-Token': 'hook-secret' });
const lastCall = m => [...tg.calls].reverse().find(c => c.method === m);
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
  eq(d.owned, { roles: [], scenarios: [], packs: [] }, 'nothing owned'); eq(d.rating, { points: 0, games: 0, wins: 0, hosted: 0 }, 'zero rating');
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
  await hook(msg(user(201, 'uk'), `/start join_${code}`)); ok(lastCall('sendMessage').params.text.includes(code) && lastCall('sendMessage').params.text.includes('за столом'), 'player 201 joined (uk)');
  await hook(msg(user(202, 'en'), `/start join_${code.toLowerCase()}`)); ok(lastCall('sendMessage').params.text.includes('You are at table'), 'player 202 joined (en, lowercase code)');
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

console.log('game result → ratings');
{ const host = await initData(user(100));
  const game = { id: 'g-1', mode: 'classic', winner: 'city', players: [{ seat: 1, name: 'A', tgId: 201, roleId: 'don', won: false, points: -10 }, { seat: 2, name: 'B', tgId: 202, roleId: 'sheriff', won: true, points: 31 }, { seat: 3, name: 'C', roleId: 'citizen', won: true, points: 24 }] };
  const r = await (await post('/api/game/result', { initData: host, game })).json(); ok(r.ok && r.recorded, 'recorded');
  eq(r.ratings['202'], { points: 31, games: 1, wins: 1, hosted: 0 }, 'sheriff rating'); eq(r.ratings['201'], { points: -10, games: 1, wins: 0, hosted: 0 }, 'don rating');
  const again = await (await post('/api/game/result', { initData: host, game })).json(); ok(again.ok && !again.recorded && again.ratings['202'].points === 31, 'resend is idempotent');
  const me = await (await post('/api/me', { initData: host })).json(); eq(me.rating.hosted, 1, 'host credited');
  const lb = await (await call('/api/leaderboard?limit=5')).json(); ok(lb.ok && lb.top[0].tgId === 202 && lb.top[0].points === 1031 && lb.top[0].rank === 1, 'leaderboard'); }

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
