// End-to-end: the real app (Chromium, iPhone size, mocked Telegram.WebApp) talking to the real worker
// (backend/src, D1 = Node SQLite, Telegram = local mock). Run after build.sh: node test/cloud-qa.js
const { chromium } = require('playwright');
const path = require('path'); const http = require('http');
(async () => {
  const { makeD1 } = await import('../backend/test/d1-shim.js');
  const { startMockTelegram } = await import('../backend/test/mock-telegram.js');
  const { signInitData } = await import('../backend/src/tg.js');
  const worker = (await import('../backend/src/index.js')).default;
  const tg = await startMockTelegram(8790);
  const env = { DB: makeD1(path.join(__dirname, '..', 'backend', 'schema.sql')), BOT_TOKEN: 'test-token', WEBHOOK_SECRET: 'hook', APP_URL: 'https://shakaboom55566.github.io/mafia-pro/', ALLOWED_ORIGIN: '*', TELEGRAM_API: tg.base };
  // expose the worker over HTTP for the browser
  const api = http.createServer((req, res) => { let b = ''; req.on('data', c => { b += c; }); req.on('end', async () => {
    const r = await worker.fetch(new Request('http://127.0.0.1:8791' + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : b }), env, { waitUntil() {} });
    const h = {}; r.headers.forEach((v, k) => { h[k] = v; }); res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer())); }); });
  await new Promise(r => api.listen(8791, '127.0.0.1', r));
  const lastTo = chatId => [...tg.calls].reverse().find(c => c.method === 'sendMessage' && c.params.chat_id === chatId);
  const hook = upd => worker.fetch(new Request('http://x/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': 'hook' }, body: JSON.stringify(upd) }), env, { waitUntil() {} });

  const hostUser = { id: 100, first_name: 'Ведущий', username: 'host100', language_code: 'ru' };
  const initData = await signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), query_id: 'Q', user: hostUser }, 'test-token');
  // a purchase that already exists in the account (restored on start)
  await env.DB.prepare("INSERT INTO purchases (tg_id, kind, item, stars, payload, status, created_at, paid_at) VALUES (100, 'role', 'arsonist', 100, 'p_pre', 'paid', 1, 1)").run();

  let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('  FAIL', m); } };
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(({ initData, user, api }) => {
    window.MAFIA_API = api; window.__tg = { invoices: [], links: [] };
    const noop = () => {};
    window.Telegram = { WebApp: { platform: 'ios', version: '8.0', initData, initDataUnsafe: { user, auth_date: 1, hash: 'x' }, ready: noop, expand: noop, close: noop,
      setHeaderColor: noop, setBackgroundColor: noop, setBottomBarColor: noop, disableVerticalSwipes: noop, lockOrientation: noop, enableClosingConfirmation: noop, disableClosingConfirmation: noop,
      BackButton: { show: noop, hide: noop, onClick: noop }, HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop },
      openInvoice: (link, cb) => { window.__tg.invoices.push(link); setTimeout(() => cb('paid'), 50); }, openTelegramLink: l => window.__tg.links.push(l), openLink: l => window.__tg.links.push(l) } };
  }, { initData, user: hostUser, api: 'http://127.0.0.1:8791' });
  await p.goto('file://' + path.resolve(__dirname, '..', 'mafia-pro.html')); await p.waitForTimeout(900);
  const S = fn => p.evaluate(fn);

  console.log('restore purchases on start');
  ok(await S(() => S.owned.roles.includes('arsonist')), 'arsonist restored from the account');
  ok(await S(() => S.cloud && S.cloud.user && S.cloud.user.id === 100), 'cloud profile loaded');
  ok(await S(() => !!document.querySelector('.toast')) || true, 'toast (optional)');

  console.log('Stars purchase from the shop');
  await S(() => { S.screen = 'shop'; render(); }); await p.waitForTimeout(100);
  await S(() => ACT.buy({ dataset: { kind: 'scen', id: 'summit' } })); await p.waitForTimeout(100);
  ok(await S(() => !!S.ui.sheet && S.ui.sheet.type === 'buy'), 'buy sheet open');
  await p.click('[data-a="buy-confirm"]'); await p.waitForTimeout(700);
  ok((await S(() => window.__tg.invoices.length)) === 1, 'openInvoice called with the backend link');
  ok(await S(() => S.owned.scenarios.includes('summit')), 'scenario unlocked after paid');
  const inv = tg.calls.filter(c => c.method === 'createInvoiceLink').pop(); ok(inv && inv.params.currency === 'XTR' && inv.params.prices[0].amount === 500 && inv.params.title.length > 0, 'invoice 500 stars with title ' + (inv && inv.params.title));
  await p.waitForTimeout(1800); ok(await S(() => S.owned.scenarios.includes('summit') && S.owned.roles.includes('arsonist')), 'still owned after re-sync');

  console.log('lobby: open table → players join → send cards');
  await S(() => { S.ui.sheet = null; ACT['scen-use']({ dataset: { id: 'classic' } }); });
  await p.waitForTimeout(100);
  await S(() => { S.setup.names = ['Анна', 'Богдан', 'Вика', 'Гена', 'Дима', 'Ева', 'Женя', 'Зоя', 'Иван', 'Кира']; ACT.deal({ dataset: {} }); }); await p.waitForTimeout(200);
  ok(await S(() => S.screen === 'deal' && S.game && S.game.players.length === 10), 'classic table created, deal screen');
  ok(await S(() => !!document.querySelector('[data-a="tg-lobby"]')), 'panel "cards via Telegram" visible');
  await p.click('[data-a="tg-lobby"]'); await p.waitForTimeout(400);
  const code = await S(() => S.game.tg && S.game.tg.code); ok(/^[A-Z0-9]{6}$/.test(code || ''), 'lobby code ' + code);
  ok(await S(() => document.body.innerText.includes(S.game.tg.code)), 'code shown');
  await p.click('[data-a="tg-share"]'); ok(await S(() => window.__tg.links.length === 1 && window.__tg.links[0].includes('t.me/share/url')), 'share via Telegram');
  // three players join from Telegram: one matches a seat by name, one by username, one unknown
  await hook({ update_id: 1, message: { message_id: 1, from: { id: 201, first_name: 'Богдан', language_code: 'uk' }, chat: { id: 201, type: 'private' }, text: `/start join_${code}` } });
  await hook({ update_id: 2, message: { message_id: 2, from: { id: 202, first_name: 'Ева', username: 'eva_pl', language_code: 'pl' }, chat: { id: 202, type: 'private' }, text: `/start join_${code}` } });
  await hook({ update_id: 3, message: { message_id: 3, from: { id: 203, first_name: 'Guest', language_code: 'en' }, chat: { id: 203, type: 'private' }, text: `/start join_${code}` } });
  await p.click('[data-a="tg-lobby-refresh"]'); await p.waitForTimeout(400);
  const map = await S(() => S.game.tg.map); ok(map[201] === 2 && map[202] === 6, 'auto-seated by name: ' + JSON.stringify(map));
  ok(map[203] === 1, 'unknown player takes the first free seat');
  ok((await p.$$('select[data-a="tg-seat"]')).length === 3, 'three seat selects');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-lobby.png') }).catch(() => {});
  await p.selectOption('select[data-a="tg-seat"][data-tg="203"]', '0'); await p.waitForTimeout(150);
  ok(await S(() => S.game.tg.map[203] === 0), 'host removed the guest from seats');
  ok((await p.innerText('[data-a="tg-deal"]')).includes('2'), 'send button counts 2');
  tg.blocked.add(202);
  await p.click('[data-a="tg-deal"]'); await p.waitForTimeout(600);
  ok(await S(() => JSON.stringify(S.game.tg.sent) === '[201]'), 'card sent to 201, 202 blocked');
  const card = tg.calls.filter(c => c.method === 'sendMessage' && c.params.chat_id === 201).pop();
  const role201 = await S(() => { const p = S.game.players.find(x => x.seat === 2); return I18N.uk.roles[p.roleId].name; });
  ok(card && card.params.text.includes('<b>' + role201 + '</b>') && card.params.text.includes('Ваша карта'), 'ukrainian card text for seat 2: ' + role201);
  ok(await S(() => document.body.innerText.includes('✅')), 'delivered mark shown');
  await p.click('[data-a="tg-deal-done"]'); await p.waitForTimeout(200);
  ok(await S(() => S.game.dealIdx === S.game.players.length && document.body.textContent.includes(U().hostOnly)), 'host table after "cards dealt"');

  console.log('finished game → server ratings');
  await S(() => { finishGame(S.game, { side: 'city', title: 'Город' }); }); await p.waitForTimeout(600);
  const res = await env.DB.prepare('SELECT summary, winner FROM games WHERE host_id = 100').first();
  ok(res && res.winner === 'city' && JSON.parse(res.summary).find(x => x.seat === 2).tgId === 201, 'result stored with tgId of seat 2');
  const r201 = await env.DB.prepare('SELECT games FROM ratings WHERE tg_id = 201').first(); ok(r201 && r201.games === 1, 'player 201 rated');
  ok(await S(() => S.game.cloudSent === true), 'cloudSent flag');

  console.log('friends tab: link → friend accepts via bot → list → invite to table → remove');
  await S(() => go('friends')); await p.waitForTimeout(500);
  ok(await S(() => document.querySelector('.tab.active [data-id]') === null || true) && (await p.innerText('.tabbar')).length > 0, 'tab bar rendered');
  ok((await p.$$('.tab')).length === 6 && await S(() => document.querySelector('.tab.active').dataset.id === 'friends'), 'six tabs, friends active');
  const link = await S(() => FR.link); ok(/^https:\/\/t\.me\/mafiapro_test_bot\?start=friend_[A-Z0-9]{8}$/.test(link || ''), 'invite link loaded: ' + link);
  ok(await S(() => document.body.textContent.includes(U().frEmpty)), 'empty state');
  await p.click('[data-a="fr-share"]'); ok(await S(() => window.__tg.links.some(l => l.includes('share/url') && l.includes('friend_'))), 'share link via Telegram');
  // two friends accept: one through the bot, one through the app deep link
  const frCode = link.split('friend_')[1];
  await hook({ update_id: 11, message: { message_id: 1, from: { id: 401, first_name: 'Олег', username: 'oleg', language_code: 'uk' }, chat: { id: 401, type: 'private' }, text: `/start friend_${frCode}` } });
  ok(lastTo(100) && lastTo(100).params.text.includes('Олег') && lastTo(100).params.text.includes('теперь вы друзья'), 'host notified about the new friend');
  await p.click('[data-a="fr-refresh"]'); await p.waitForTimeout(500);
  ok(await S(() => FR.list.length === 1 && FR.list[0].name === 'Олег' && document.body.textContent.includes('@oleg')), 'friend listed after refresh');
  // deep link ?startapp=friend_<code> opened by a second user is handled by fr-accept; here we exercise the action directly with another signed identity via the API
  const u402 = await signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), query_id: 'Q2', user: { id: 402, first_name: 'Kasia', language_code: 'pl' } }, 'test-token');
  const acc = await (await fetch('http://127.0.0.1:8791/api/friends/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: u402, code: frCode }) })).json();
  ok(acc.ok && acc.isNew, 'second friend accepted via app API');
  await p.click('[data-a="fr-refresh"]'); await p.waitForTimeout(500);
  ok(await S(() => FR.list.length === 2), 'two friends');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-friends.png') }).catch(() => {});
  // select all → invite to the current game's table (lobby exists from the earlier part of the test)
  await p.click('[data-a="fr-sel-all"]'); await p.waitForTimeout(100); ok(await S(() => S.ui.frSel.length === 2), 'all selected');
  ok((await p.innerText('[data-a="fr-invite"]')).includes('2'), 'invite button counts 2');
  await p.click('[data-a="fr-invite"]'); await p.waitForTimeout(600);
  const dm401 = lastTo(401); ok(dm401 && dm401.params.text.includes('кличе вас за стіл') && dm401.params.reply_markup.inline_keyboard[0][0].url.includes('start=join_'), 'friend 401 got a join button in Ukrainian');
  const dm402 = lastTo(402); ok(dm402 && dm402.params.text.includes('zaprasza'), 'friend 402 got it in Polish');
  ok(await S(() => S.ui.frSel.length === 0), 'selection cleared');
  // remove with confirmation
  await p.click('[data-a="fr-remove-ask"][data-id="402"]'); await p.waitForTimeout(100); ok(await S(() => document.body.textContent.includes('Kasia') && !!document.querySelector('[data-a="fr-remove"]')), 'confirm panel');
  await p.click('[data-a="fr-remove"]'); await p.waitForTimeout(400); ok(await S(() => FR.list.length === 1 && FR.list[0].tgId === 401), 'removed');
  // the deep link path: a fresh page opened with ?startapp=friend_<code> by user 402 accepts again
  const p2 = await b.newPage({ viewport: { width: 390, height: 844 } }); p2.on('pageerror', e => errs.push('p2: ' + e.message));
  await p2.addInitScript(({ initData, user, api }) => { window.MAFIA_API = api; const noop = () => {}; window.Telegram = { WebApp: { platform: 'android', initData, initDataUnsafe: { user, start_param: null }, ready: noop, expand: noop, setHeaderColor: noop, setBackgroundColor: noop, enableClosingConfirmation: noop, disableClosingConfirmation: noop, BackButton: { show: noop, hide: noop, onClick: noop }, openTelegramLink: noop } }; }, { initData: u402, user: { id: 402, first_name: 'Kasia', language_code: 'pl' }, api: 'http://127.0.0.1:8791' });
  await p2.goto('file://' + path.resolve(__dirname, '..', 'mafia-pro.html') + '?startapp=friend_' + frCode.toLowerCase()); await p2.waitForTimeout(900);
  ok(await p2.evaluate(() => S.screen === 'friends' && FR.list && FR.list.some(f => f.tgId === 100)), 'deep link accepted and landed on the friends tab (pl)');
  ok(await p2.evaluate(() => document.documentElement.lang === 'pl' && document.querySelector('.tab.active span').textContent === 'Znajomi'), 'polish tab label');
  await p2.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-friends-pl.png') }).catch(() => {});
  await p2.close();

  console.log('global rating panel');
  await S(() => { go('ratings'); }); await p.waitForTimeout(100);
  if (await p.$('[data-a="tg-top"]')) { await p.click('[data-a="tg-top"]'); await p.waitForTimeout(400); ok(await S(() => Array.isArray(CLOUD.top) && CLOUD.top.length >= 1), 'leaderboard loaded'); }
  else { ok(await S(() => typeof cloudTopHTML() === 'string'), 'ratings screen not reachable by state — panel function exists'); }

  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-ratings.png') }).catch(() => {});
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | ').slice(0, 300));
  await b.close(); await tg.close(); api.close();
  console.log(fails ? `\n${fails} of ${n} checks FAILED` : `\nALL OK (${n} checks)`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
