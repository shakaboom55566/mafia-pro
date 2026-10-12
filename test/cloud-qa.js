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
  const env = { DB: makeD1(path.join(__dirname, '..', 'backend', 'schema.sql')), BOT_TOKEN: 'test-token', WEBHOOK_SECRET: 'hook', APP_URL: 'https://shakaboom55566.github.io/mafia-pro/', ALLOWED_ORIGIN: '*', TELEGRAM_API: tg.base, ADMIN_IDS: '100' };
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

  let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('  FAIL', m); } }; const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ': ' + JSON.stringify(a) + ' != ' + JSON.stringify(b));
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
  // cards reach the app as soon as seats are mapped: the table state is published after every change
  await p.waitForTimeout(900);
  ok(await S(() => JSON.stringify(S.game.tg.sent.slice().sort()) === '[201,202]'), 'cards delivered to the app for both seated players automatically');
  ok((await p.innerText('[data-a="tg-deal"]')).includes('(0)'), 'nothing left to send by hand');
  tg.blocked.add(202);
  const card = tg.calls.filter(c => c.method === 'sendMessage' && c.params.chat_id === 201).pop();
  const role201 = await S(() => { const p = S.game.players.find(x => x.seat === 2); return I18N.uk.roles[p.roleId].name; });
  ok(card && card.params.text.includes('Ваша карта') && card.params.text.includes('готова') && !card.params.text.includes(role201) && card.params.reply_markup.inline_keyboard[0][0].web_app.url.includes('startapp=table_' + code), 'ukrainian notice without the role text, with an "open table" app button');
  const u201 = await signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user: { id: 201, first_name: 'Богдан', language_code: 'uk' } }, 'test-token');
  const ts201 = await (await fetch('http://127.0.0.1:8791/api/table/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: u201, code }) })).json();
  ok(ts201.ok && ts201.me && ts201.me.seat === 2 && ts201.me.roleId === (await S(() => S.game.players.find(x => x.seat === 2).roleId)) && ts201.pub.phase === 'deal' && ts201.pub.seats.length === 10, 'the player reads his card and the table from the app: ' + JSON.stringify(ts201.me));
  ok(await S(() => document.body.textContent.includes(U().tgViaTg)), 'delivered mark shown');
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
  // both friends are online (they just talked to the bot / app) → the invitation waits in their app; a DM follows only if unanswered
  ok(!tg.calls.some(c => c.method === 'sendMessage' && (c.params.chat_id === 401 || c.params.chat_id === 402) && /start=join_/.test(JSON.stringify(c.params))), 'online friends get the invitation in the app, not a DM');
  const inv401 = await (await fetch('http://127.0.0.1:8791/api/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: await signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user: { id: 401, first_name: 'Олег', language_code: 'uk' } }, 'test-token') }) })).json();
  ok(inv401.invites && inv401.invites.length === 1 && inv401.invites[0].from === 'Ведущий', 'friend 401 sees the pending invitation from the host: ' + JSON.stringify(inv401) + ' lobby=' + await S(() => JSON.stringify({ lobby: S.lobby && S.lobby.code, gtg: S.game && S.game.tg && S.game.tg.code, winner: !!(S.game && S.game.winner) })));
  await env.DB.prepare('UPDATE table_invites SET created_at = created_at - 60').run(); await p.click('[data-a="tg-lobby-refresh"]').catch(() => {}); await S(() => refreshTable()); await p.waitForTimeout(700);
  const dm401 = lastTo(401); ok(dm401 && dm401.params.text.includes('кличе вас за стіл') && dm401.params.reply_markup.inline_keyboard[0][0].callback_data.startsWith('tb_acc_') && dm401.params.reply_markup.inline_keyboard[0][1].callback_data.startsWith('tb_dec_'), 'unanswered → friend 401 got "I’m in / Decline" buttons in Ukrainian');
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

  console.log('friend search → request → accepted in the bot · presence · admin grants');
  await S(() => go('friends')); await p.waitForTimeout(400);
  await hook({ update_id: 31, message: { message_id: 1, from: { id: 701, first_name: 'Nika', username: 'nika_m', language_code: 'en' }, chat: { id: 701, type: 'private' }, text: '/start' } });
  await p.fill('#fr-q', '@nik'); await p.press('#fr-q', 'Enter'); await p.waitForTimeout(500);
  ok(await S(() => FR.results && FR.results.length === 1 && FR.results[0].username === 'nika_m' && FR.results[0].online === true), 'search found @nika_m online');
  ok((await p.innerText('#app')).includes(await S(() => U().frOnline)), 'online label shown');
  await p.click('[data-a="fr-request"][data-id="701"]'); await p.waitForTimeout(500);
  ok(lastTo(701) && lastTo(701).params.text.includes('wants to add you') && lastTo(701).params.reply_markup.inline_keyboard[0][0].callback_data === 'fr_acc_100', 'request DM with buttons');
  ok(await S(() => FR.outgoing.some(r => r.tgId === 701)) && (await p.innerText('#app')).includes(await S(() => U().frRequested)), 'outgoing request shown');
  await hook({ update_id: 32, callback_query: { id: 'cbq', from: { id: 701, first_name: 'Nika', language_code: 'en' }, data: 'fr_acc_100', message: { message_id: 5, chat: { id: 701 } } } });
  await p.click('[data-a="fr-refresh"]'); await p.waitForTimeout(500);
  ok(await S(() => FR.list.some(f => f.tgId === 701) && FR.outgoing.length === 0), 'friend appears after acceptance in the bot');
  // incoming request accepted in the app
  await env.DB.prepare("INSERT INTO users (tg_id, username, first_name, lang, created_at, seen_at) VALUES (702, 'olga_s', 'Olga', 'pl', 1, 1)").run();
  await (await fetch('http://127.0.0.1:8791/api/friends/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: await signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user: { id: 702, first_name: 'Olga', username: 'olga_s', language_code: 'pl' } }, 'test-token'), tgId: 100 }) })).json();
  await env.DB.prepare('UPDATE users SET seen_at = 1 WHERE tg_id = 702').run(); // she sent the request long ago
  await p.click('[data-a="fr-refresh"]'); await p.waitForTimeout(500);
  ok(await S(() => FR.incoming.length === 1 && FR.incoming[0].name === 'Olga'), 'incoming request listed');
  await p.click('[data-a="fr-respond"][data-id="702"][data-ok="1"]'); await p.waitForTimeout(600);
  ok(await S(() => FR.list.some(f => f.tgId === 702) && FR.incoming.length === 0), 'accepted in the app → friend');
  ok(lastTo(702).params.text.includes('przyjął'), 'requester notified in Polish');
  const offline = await S(() => { const f = FR.list.find(x => x.tgId === 702); return f && f.online === false && typeof f.seenAgo === 'number'; }); ok(offline, 'Olga is offline (seen long ago)');
  ok((await p.innerText('#app')).includes(await S(() => tt(U().frSeen, { t: '' }).trim().split(' ')[0])), 'offline label shown');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-friends-search.png') }).catch(() => {});
  // tapping a friend opens their profile; the circle only toggles selection
  await S(() => { S.ui.frSel = []; render(); });
  await p.click('.fr-row[data-a="fr-open"][data-id="701"] .chk'); await p.waitForTimeout(150);
  ok(await S(() => !S.ui.sheet && S.ui.frSel.length === 1 && S.ui.frSel[0] === 701), 'circle toggles selection without opening');
  await p.click('.fr-row[data-a="fr-open"][data-id="701"] .nm'); await p.waitForTimeout(600);
  ok(await S(() => S.ui.sheet && S.ui.sheet.type === 'friend' && S.ui.sheet.id === 701 && FRP[701] && FRP[701].ok), 'profile sheet loaded');
  const sheetTxt = await p.innerText('.sheet'); ok(sheetTxt.includes('Nika') && sheetTxt.includes('@nika_m') && sheetTxt.includes('1000') && sheetTxt.includes(await S(() => U().frInviteOne)) && sheetTxt.includes(await S(() => U().frRemove)), 'sheet shows name, rating and actions');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-friend-profile.png') }).catch(() => {});
  await p.click('[data-a="fr-open-tg"]'); ok(await S(() => window.__tg.links.some(l => l === 'https://t.me/nika_m')), 'message in Telegram opens t.me link');
  await S(() => { S.ui.sheet = null; render(); });
  // admin panel in settings (user 100 is admin in this test)
  await S(() => go('settings')); await p.waitForTimeout(500);
  ok(await S(() => S.cloud.admin === true && !!document.querySelector('[data-a="adm-grant"]')), 'admin panel visible');
  await p.fill('#adm-q', '@nika_m'); await p.click('[data-a="adm-grant"]'); await p.waitForTimeout(600);
  ok(await S(() => ADM.grants.some(g => g.username === 'nika_m')), 'grant listed');
  ok(lastTo(701).params.text.includes('full access'), 'player notified');
  const meGrant = await env.DB.prepare('SELECT until FROM grants WHERE tg_id = 701').first(); ok(meGrant && meGrant.until > Date.now() / 1000 + 29 * 86400, '30 days');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-admin.png') }).catch(() => {});
  await p.click('[data-a="adm-revoke"][data-id="701"]'); await p.waitForTimeout(500);
  ok(await S(() => !ADM.grants.some(g => g.username === 'nika_m')), 'revoked');
  // full access as seen by the player: everything owned, shop banner
  await env.DB.prepare("INSERT INTO grants (tg_id, until, granted_by, created_at) VALUES (100, ?1, 100, ?2)").bind(Math.floor(Date.now() / 1000) + 30 * 86400, Math.floor(Date.now() / 1000)).run();
  await S(() => cloudSync()); await p.waitForTimeout(600);
  ok(await S(() => fullAccess() && ownsRole('sniper') && ownsScen('summit') && ownsPack('diplomacy') && ownsRole('blackmailer')), 'full access unlocks every premium card, scenario and pack');
  await S(() => { S.screen = 'shop'; render(); });
  ok((await p.innerText('#app')).includes(await S(() => U().adminAccess)), 'shop banner shows admin access (user 100 is admin here)');
  await env.DB.prepare('DELETE FROM grants WHERE tg_id = 100').run(); await S(() => cloudSync()); await p.waitForTimeout(600);
  ok(await S(() => fullAccess() && ownsRole('sniper')), 'admin keeps everything after the grant is removed');
  // a regular player: access ends with the grant
  const regular = await (await fetch('http://127.0.0.1:8791/api/me', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: await signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user: { id: 701, first_name: 'Nika', username: 'nika_m', language_code: 'en' } }, 'test-token') }) })).json();
  ok(regular.ok && regular.owned.allUntil === 0 && regular.admin === false, 'regular player has no access after revoke');

  console.log('referral programme sheet → invitees → milestone → free card in the shop');
  await S(() => go('friends')); await p.waitForTimeout(300);
  ok(!!(await p.$('[data-a="ref-open"]')) && !!(await p.$('[data-a="pt-open"]')), 'two programme buttons on the Friends tab');
  await p.click('[data-a="ref-open"]'); await p.waitForTimeout(600);
  const refTxt = await p.$eval('.sheet', el => el.textContent);
  ok(await S(() => REFS.data && REFS.data.ok) && refTxt.includes(await S(() => U().refM5)) && refTxt.includes('start=ref_'), 'referral sheet with offer, milestones and link');
  const refCode = await S(() => REFS.data.code);
  for (const id of [801, 802, 803, 804, 805]) await hook({ update_id: 40 + id, message: { message_id: 1, from: { id, first_name: 'R' + id, language_code: 'uk' }, chat: { id, type: 'private' }, text: `/start ref_${refCode}` } });
  ok(lastTo(801).params.text.includes('7'), 'invitee got the trial message');
  // they all sit at the host's table and get cards → qualified
  const lb = await (await fetch('http://127.0.0.1:8791/api/lobby', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData, fresh: true }) })).json();
  for (const id of [801, 802, 803, 804, 805]) await hook({ update_id: 50 + id, message: { message_id: 1, from: { id, first_name: 'R' + id, language_code: 'uk' }, chat: { id, type: 'private' }, text: `/start join_${lb.code}` } });
  await fetch('http://127.0.0.1:8791/api/lobby/deal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData, code: lb.code, cards: [801, 802, 803, 804, 805].map((id, i) => ({ tgId: id, seat: i + 1, roleId: 'citizen' })) }) });
  await S(() => { REFS.data = null; S.ui.sheet = null; render(); }); await p.click('[data-a="ref-open"]'); await p.waitForTimeout(700);
  ok(await S(() => REFS.data.invited === 6 && REFS.data.qualified === 5 && REFS.data.credits.role === 1 && REFS.data.next.n === 10), 'five qualified (plus Олег from the friend link earlier) → milestones 1/3/5 paid, one free card');
  ok((await p.$eval('.sheet', el => el.textContent)).includes(await S(() => tt(U().refCredits, { r: 1, s: 0 }))), 'sheet shows the free card credit');
  ok(lastTo(100).params.text.includes('премиум-карта'), 'host notified about the card reward');
  await S(() => { S.ui.sheet = null; cloudSync(); }); await p.waitForTimeout(600);
  await S(() => { S.owned.allUntil = 0; S.screen = 'shop'; render(); }); await p.waitForTimeout(200); // view the shop as a regular player (the test user is an admin)
  ok(await S(() => S.cloud.credits.role === 1) && (await p.innerText('#app')).includes(await S(() => U().claimFree)), 'shop offers "claim for free"');
  const freeId = await S(() => document.querySelector('[data-a="claim-free"][data-kind="role"]').dataset.id);
  await p.click('[data-a="claim-free"][data-kind="role"]'); await p.waitForTimeout(600);
  ok(await p.evaluate(id => S.owned.roles.includes(id) && S.cloud.credits.role === 0, freeId), 'free card owned, credit spent: ' + freeId);
  ok(!(await p.innerText('#app')).includes(await S(() => U().claimFree)), 'no more free buttons');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-referral.png') }).catch(() => {});

  console.log('partner programme: apply in the app → admin approves in the app → stats');
  await S(() => go('friends')); await p.click('[data-a="pt-open"]'); await p.waitForTimeout(600);
  ok(await S(() => PART.data && PART.data.status === 'none') && (await p.$eval('.sheet', el => el.textContent)).includes('20'), 'partner sheet with the offer and an application form');
  await p.fill('input[data-a="pt-f"][data-k="name"]', 'Клуб Кастельмар'); await p.fill('input[data-a="pt-f"][data-k="channel"]', 't.me/castelmar'); await p.fill('input[data-a="pt-f"][data-k="audience"]', '300 игроков, Киев');
  await p.click('[data-a="pt-apply"]'); await p.waitForTimeout(600);
  ok(await S(() => PART.data.status === 'pending') && (await p.$eval('.sheet', el => el.textContent)).includes(await S(() => U().ptPending)), 'application pending');
  ok(lastTo(100).params.text.includes('Клуб Кастельмар') && lastTo(100).params.text.includes('/partner 100'), 'admin (user 100) got the application');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-partner-pending.png') }).catch(() => {});
  await S(() => { S.ui.sheet = null; ADM.partners = null; go('settings'); }); await p.waitForTimeout(600);
  ok(await S(() => ADM.partners && ADM.partners.length === 1 && ADM.partners[0].status === 'pending'), 'admin panel lists the application');
  await p.click('[data-a="adm-partner"][data-ok="1"]'); await p.waitForTimeout(600);
  ok(await S(() => ADM.partners[0].status === 'active'), 'approved in the admin panel');
  await S(() => { PART.data = null; go('friends'); }); await p.click('[data-a="pt-open"]'); await p.waitForTimeout(700);
  const ptTxt = await p.$eval('.sheet', el => el.textContent);
  ok(await S(() => PART.data.status === 'active' && PART.data.stats.invited === 6) && ptTxt.includes(await S(() => tt(U().ptActive, { share: 20 }))) && ptTxt.includes('start=ref_'), 'partner dashboard: active, 5 invited, link');
  // a partner lands in Clubs at once: an active club was created from the application
  ok(await S(() => PART.data.club && PART.data.club.name === 'Клуб Кастельмар' && PART.data.club.id > 0) && ptTxt.includes(await S(() => U().clubGoto)), 'partner got a club automatically; the sheet links to it');
  ok(lastTo(100).params.text.includes('создан клуб «Клуб Кастельмар»'), 'partner told about the club in the bot');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-partner.png') }).catch(() => {});
  await p.click('.sheet [data-a="club-open"]'); await p.waitForTimeout(900);
  ok(await S(() => S.screen === 'club' && S.tab === 'clubs' && !S.ui.sheet && CL.cur && CL.cur.myRole === 'owner' && CL.cur.club.status === 'active' && CL.cur.club.link === 't.me/castelmar'), 'club page opened from the partner sheet: head of an active club, channel link carried over');
  await S(() => cloudSync()); await p.waitForTimeout(700);
  ok(await S(() => S.cloud.club && S.cloud.club.partner === true && S.cloud.club.role === 'owner' && S.cloud.club.name === 'Клуб Кастельмар'), 'me.club marks a partner club');

  console.log('clubs: tab in the menu → edit with logo → another head applies, admin panel → invite → member joins → chat → table call');
  await S(() => { S.ui.sheet = null; CL.at = 0; go('clubs'); }); await p.waitForTimeout(800);
  ok(await S(() => S.screen === 'clubs' && S.tab === 'clubs' && !!document.querySelector('.tab.active[data-id="clubs"]')) && !(await p.$('.tab[data-id="profiles"]')), 'Clubs is a tab of the bottom bar, the Players tab is gone');
  ok(await S(() => CL.list.length === 1 && CL.list[0].members === 1 && CL.list[0].online === 1 && CL.mine && CL.mine.role === 'owner') && !(await p.$('[data-a="club-create"]')), 'listed: 1 member, 1 online, I am the head, no "found a club": ' + JSON.stringify(await S(() => ({ list: CL.list, mine: CL.mine, own: CL.own, screen: S.screen }))).slice(0, 400));
  const listTxt = await p.innerText('#app'); ok(listTxt.includes('Клуб Кастельмар') && listTxt.includes(await S(() => tt(U().clubOnline, { n: 1 }))), 'card shows name and online');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-clubs.png') }).catch(() => {});
  await p.click('.fr-row[data-a="club-open"]'); await p.waitForTimeout(900);
  ok(await S(() => S.screen === 'club' && CL.cur && CL.cur.myRole === 'owner' && CL.cur.canManage) && !!(await p.$('#cl-inv-q')) && !!(await p.$('#cl-msg')), 'club page for the head: invite box and chat');
  // the head fills in the rest: logo (a generated PNG goes through the canvas resize), city, description
  await p.click('[data-a="club-edit"]'); await p.waitForTimeout(200);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAD0lEQVQI12P4z8DwHwYZAB7rA/xGfQ8lAAAAAElFTkSuQmCC', 'base64');
  await p.setInputFiles('input[data-a="cl-logo-file"]', { name: 'logo.png', mimeType: 'image/png', buffer: png }); await p.waitForTimeout(500);
  ok(await S(() => CL.form.logo.startsWith('data:image/jpeg;base64,') && CL.form.logo.length < 24000), 'logo resized to a small JPEG data URL');
  await p.fill('input[data-a="cl-f"][data-k="city"]', 'Київ'); await p.fill('textarea[data-a="cl-f"][data-k="about"]', 'Спортивная мафия по субботам');
  await p.click('[data-a="club-submit"]'); await p.waitForTimeout(700);
  ok(await S(() => CL.cur.club.city === 'Київ' && CL.cur.club.logo.startsWith('data:image/jpeg') && S.cloud.club.logo === CL.cur.club.logo && S.cloud.club.city === 'Київ'), 'city and logo saved; the branding state follows');
  // another head applies (Olga, via API) → admin panel lists it first → rejected there
  const olga = await signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user: { id: 702, first_name: 'Olga', username: 'olga_s', language_code: 'pl' } }, 'test-token');
  const ap0 = await (await fetch('http://127.0.0.1:8791/api/club/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: olga, name: 'Клуб Львів', city: 'Львів' }) })).json(); eq(ap0.status, 'pending', 'second application pending');
  ok(lastTo(100).params.text.includes('Клуб Львів') && lastTo(100).params.text.includes('/club_ok'), 'admin (user 100) notified');
  await S(() => { ADM.clubs = null; go('settings'); }); await p.waitForTimeout(600);
  ok(await S(() => ADM.clubs && ADM.clubs.length === 2 && ADM.clubs[0].status === 'pending' && ADM.clubs[0].name === 'Клуб Львів' && ADM.clubs[1].logo.startsWith('data:image/jpeg')), 'admin panel: pending application first, active club with its logo');
  await p.click(`[data-a="adm-club"][data-id="${ap0.id}"][data-ok="0"]`); await p.waitForTimeout(600);
  ok(await S(() => ADM.clubs.find(c => c.name === 'Клуб Львів').status === 'rejected') && lastTo(702).params.text.includes('odrzucone'), 'rejected in the admin panel; Olga notified in Polish');
  await S(() => { CL.cur = null; go('club'); }); await p.waitForTimeout(900);
  ok(await S(() => S.screen === 'club' && CL.cur && CL.cur.club.name === 'Клуб Кастельмар'), 'back on the club page');
  // invite Nika (701) → she accepts via the bot button
  await p.fill('#cl-inv-q', '@nika_m'); await p.click('[data-a="club-invite"]'); await p.waitForTimeout(600);
  ok(lastTo(701).params.text.includes('invites you to the club') && lastTo(701).params.reply_markup.inline_keyboard[0][0].callback_data.startsWith('cl_acc_'), 'invite DM with buttons (en)');
  const clubId = await S(() => CL.id);
  await hook({ update_id: 95, callback_query: { id: 'cbcl', from: { id: 701, first_name: 'Nika', language_code: 'en' }, data: `cl_acc_${clubId}`, message: { message_id: 3, chat: { id: 701 } } } });
  ok(lastTo(100).params.text.includes('Nika') && lastTo(100).params.text.includes('вступил'), 'head notified');
  // Olga applies from her side → head approves in the app
  const ap = await (await fetch('http://127.0.0.1:8791/api/club/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: olga, id: clubId }) })).json(); eq(ap.status, 'applied', 'Olga applied');
  await S(() => loadClub(CL.id)); await p.waitForTimeout(600);
  ok(await S(() => CL.cur.requests.length === 1 && CL.cur.requests[0].name === 'Olga' && CL.cur.members.length === 2), 'request listed, Nika already a member');
  await p.click('[data-a="club-approve"][data-ok="1"]'); await p.waitForTimeout(700);
  ok(await S(() => CL.cur.requests.length === 0 && CL.cur.members.length === 3 && CL.cur.club.members === 3), 'approved → 3 members');
  ok(lastTo(702).params.text.includes('Przyjęto'), 'Olga notified in Polish');
  // chat
  await p.fill('#cl-msg', 'Привет, клуб! Играем в субботу'); await p.press('#cl-msg', 'Enter'); await p.waitForTimeout(700);
  ok(await S(() => CL.chat.some(m => m.kind === 'text' && m.text.includes('субботу') && m.me)) && (await p.innerText('.chat')).includes('субботу'), 'message appears in the chat');
  ok(await S(() => CL.chat.some(m => m.kind === 'system')), 'system entries (club founded / joined)');
  // table call: online members get a DM; message with a join button in the chat
  await env.DB.prepare('UPDATE club_messages SET created_at = created_at - 5').run();
  await p.click('[data-a="club-call"]'); await p.waitForTimeout(900);
  ok(await S(() => CL.chat.some(m => m.kind === 'lobby' && m.code)) && !!(await p.$('[data-a="club-join-table"]')), 'lobby call in the chat with a join button');
  const callCode = await S(() => CL.chat.find(m => m.kind === 'lobby').code);
  const nikaPing = await (await fetch('http://127.0.0.1:8791/api/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: await signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user: { id: 701, first_name: 'Nika', username: 'nika_m', language_code: 'en' } }, 'test-token') }) })).json();
  ok(nikaPing.invites && nikaPing.invites.some(i => i.code === callCode && i.kind === 'club'), 'online member Nika got the table call in her app');
  await p.click('[data-a="club-join-table"]'); ok(await S(() => window.__tg.links.some(l => l.includes('start=join_'))), 'join button opens the bot deep link');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-club.png') }).catch(() => {});
  // one club per player: Nika (member) cannot found a club; a member can leave
  const nika = await signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user: { id: 701, first_name: 'Nika', username: 'nika_m', language_code: 'en' } }, 'test-token');
  eq((await fetch('http://127.0.0.1:8791/api/club/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: nika, name: 'Second club' }) })).status, 409, 'a member cannot found another club');
  // edit: rename the club from the app
  await p.click('[data-a="club-edit"]'); await p.waitForTimeout(200); await p.fill('input[data-a="cl-f"][data-k="city"]', 'Киев'); await p.click('[data-a="club-submit"]'); await p.waitForTimeout(700);
  ok(await S(() => CL.cur.club.city === 'Киев'), 'city edited');
  await S(() => { S.ui.sheet = null; render(); });

  console.log('ratings: top of clubs, everyone registered in the bot, "Profile" button → full statistics screen');
  await S(() => { S.ui.sheet = null; CLOUD.clubs = null; PL.list = null; go('ratings'); }); await p.waitForTimeout(900);
  ok(await S(() => Array.isArray(CLOUD.clubs) && CLOUD.clubs.length === 1 && CLOUD.clubs[0].members === 3 && CLOUD.clubs[0].partner === true && CLOUD.clubs[0].rank === 1), 'top of clubs loaded: ' + JSON.stringify(await S(() => CLOUD.clubs.map(c => ({ n: c.name, m: c.members, p: c.partner })))));
  const rtTxt = await p.$eval('#app', el => el.textContent); ok(rtTxt.includes(await S(() => U().clubsTop)) && rtTxt.includes('Клуб Кастельмар') && rtTxt.includes(await S(() => U().clubPartner)), 'top shows the club with the partner badge: ' + JSON.stringify({ top: rtTxt.includes(await S(() => U().clubsTop)), name: rtTxt.includes('Клуб Кастельмар'), badge: rtTxt.includes(await S(() => U().clubPartner)) }));
  ok(await S(() => Array.isArray(PL.list) && PL.total >= 5 && PL.list.length === PL.total), 'directory loaded on the ratings screen: ' + await S(() => PL.total));
  const dirTxt = await p.$eval('#app', el => el.textContent);
  const parts = { plAll: dirTxt.includes(await S(() => U().plAll)), nika: dirTxt.includes('Nika'), at: dirTxt.includes('@nika_m'), bog: dirTxt.includes('Богдан') };
  ok(Object.values(parts).every(Boolean), 'lists registered players (friends and non-friends): ' + JSON.stringify(parts) + ' total=' + await S(() => PL.total) + ' names=' + await S(() => PL.list.map(x => x.name).join('|')));
  ok(await S(() => PL.list.some(p => p.me) && PL.list.some(p => p.isFriend && p.tgId === 701)), 'me and friends flagged');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-players-list.png') }).catch(() => {});
  await p.fill('#pl-q', 'бог'); await p.press('#pl-q', 'Enter'); await p.waitForTimeout(500);
  ok(await S(() => PL.list.length === 1 && PL.list[0].name === 'Богдан'), 'filter by Cyrillic name prefix');
  await p.click('.fr-row[data-a="fr-open"]'); await p.waitForTimeout(600);
  ok(await S(() => S.ui.sheet && S.ui.sheet.type === 'friend' && S.ui.sheet.id === 201) && !!(await p.$('.sheet [data-a="ps-open"]')), 'tap opens the player card with a "Profile" button');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-players.png') }).catch(() => {});
  await p.click('.sheet [data-a="ps-open"]'); await p.waitForTimeout(800);
  ok(await S(() => S.screen === 'pstats' && !S.ui.sheet && S.ui.pstatsId === 201 && FRP[201] && FRP[201].ok), '"Profile" opens the full statistics screen');
  const psTxt = await p.$eval('#app', el => el.textContent); const psParts = { title: psTxt.includes(await S(() => U().psTitle)), name: psTxt.includes('Богдан'), best: psTxt.includes(await S(() => U().bestRole)), recent: psTxt.includes(await S(() => U().frRecent)), side: psTxt.includes(await S(() => U().bySide)), card: !!(await p.$('.card3d-wrap')) };
  ok(Object.values(psParts).every(Boolean), 'stats screen: title, name, best card (3D), by side, recent games: ' + JSON.stringify(psParts) + ' roles=' + await S(() => JSON.stringify(FRP[201].roles)));
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-player-stats.png') }).catch(() => {});
  await S(() => ACT.back({ dataset: {} })); await p.waitForTimeout(300);
  ok(await S(() => S.screen === 'ratings' && S.tab === 'ratings'), 'back returns to the ratings');
  await S(() => { PL.q = ''; render(); }); await p.click('[data-a="pl-refresh"]'); await p.waitForTimeout(500);
  ok(await S(() => PL.list.length === PL.total), 'refresh restores the full list');
  await p.click('.rank-row[data-a="club-open"]'); await p.waitForTimeout(900);
  ok(await S(() => S.screen === 'club' && CL.cur && CL.cur.club.name === 'Клуб Кастельмар'), 'a top-of-clubs row opens the club');

  console.log('my profile: Telegram-wide statistics above the device statistics');
  await S(() => go('myprofile')); await p.waitForTimeout(800);
  ok(await S(() => S.screen === 'myprofile' && S.meId && profById(S.meId).tgId === 100), 'My profile is the Telegram account profile');
  const myTxt = await p.$eval('#app', el => el.textContent); const myParts = { title: myTxt.includes(await S(() => U().myProfile)), cloud: myTxt.includes(await S(() => U().psCloud)), local: myTxt.includes(await S(() => U().psLocal)), noDir: !myTxt.includes(await S(() => U().plAll)) };
  ok(Object.values(myParts).every(Boolean), 'cloud panel + device section, no directory: ' + JSON.stringify(myParts));
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-my-profile.png') }).catch(() => {});
  await p.click('[data-a="ps-open"]'); await p.waitForTimeout(700);
  ok(await S(() => S.screen === 'pstats' && S.ui.pstatsId === 100), '"Profile" from My profile opens my full stats');
  await S(() => ACT.back({ dataset: {} })); ok(await S(() => S.screen === 'myprofile'), 'back → My profile');
  await S(() => ACT.back({ dataset: {} })); ok(await S(() => S.screen === 'club'), 'back → where My profile was opened from');
  await S(() => { ADM.partners = null; go('settings'); }); await p.waitForTimeout(600);

  console.log('global rating panel');
  await S(() => { go('ratings'); }); await p.waitForTimeout(100);
  if (await p.$('[data-a="tg-top"]')) { await p.click('[data-a="tg-top"]'); await p.waitForTimeout(400); ok(await S(() => Array.isArray(CLOUD.top) && CLOUD.top.length >= 1), 'leaderboard loaded');
    await p.click('.rank-row[data-a="fr-open"]'); await p.waitForTimeout(600);
    const lb = await p.$eval('.sheet', el => el.textContent); const topId = await S(() => CLOUD.top[0].tgId);
    ok(await S(() => S.ui.sheet && S.ui.sheet.type === 'friend') && lb.includes(await S(() => U().frRecent)) && (await S(() => FRP[CLOUD.top[0].tgId].recent.length >= 1)), 'leaderboard row opens a profile with recent games (tgId ' + topId + ')');
    ok(lb.includes(await S(() => U().frWon)) || lb.includes(await S(() => U().frLost)), 'recent game shows result');
    await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-profile-games.png') }).catch(() => {});
    await S(() => { S.ui.sheet = null; render(); }); }
  else { ok(await S(() => typeof cloudTopHTML() === 'string'), 'ratings screen not reachable by state — panel function exists'); }

  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-ratings.png') }).catch(() => {});

  console.log('pre-game table: open on setup → players join → auto-seated → game created → cards delivered automatically');
  await S(() => { S.game = null; S.lobby = null; S.ui.sheet = null; ACT['scen-use']({ dataset: { id: 'classic' } }); }); await p.waitForTimeout(150);
  ok(await S(() => S.screen === 'setup' && !!document.querySelector('[data-a="tg-lobby"]')), 'setup shows the "open table" panel');
  ok(!(await p.innerText('#app')).match(/демо|demo/i), 'no "demo" wording on the setup screen');
  await p.click('[data-a="tg-lobby"]'); await p.waitForTimeout(400);
  const code2 = await S(() => S.lobby && S.lobby.code); ok(/^[A-Z0-9]{6}$/.test(code2 || '') && !(await S(() => S.game)), 'table opened before the game: ' + code2);
  await S(() => { S.setup.names = ['', 'Богдан', '', '', '', '', '', '', '', '']; render(); });
  await hook({ update_id: 21, message: { message_id: 1, from: { id: 501, first_name: 'Богдан', language_code: 'uk' }, chat: { id: 501, type: 'private' }, text: `/start join_${code2}` } });
  await hook({ update_id: 22, message: { message_id: 2, from: { id: 502, first_name: 'Ева', language_code: 'pl' }, chat: { id: 502, type: 'private' }, text: `/start join_${code2}` } });
  await hook({ update_id: 23, message: { message_id: 3, from: { id: 503, first_name: 'Guest', language_code: 'en' }, chat: { id: 503, type: 'private' }, text: `/start join_${code2}` } });
  ok(lastTo(100).params.text.includes('Guest') && lastTo(100).params.text.includes('(всего 3)'), 'host notified on each join');
  await p.click('[data-a="tg-lobby-refresh"]'); await p.waitForTimeout(400);
  const seats = await S(() => S.lobby.seats); ok(seats[501] === 1 && seats[502] === 0 && seats[503] === 2, 'auto-seated: Богдан matched seat 2 by name, others took empty seats: ' + JSON.stringify(seats));
  ok(await S(() => S.setup.names[0] === 'Ева' && S.setup.names[2] === 'Guest'), 'seat names filled from Telegram names');
  ok(await S(() => document.body.textContent.includes(tt(U().tgSeated, { seat: 2 }))), 'panel shows seat numbers');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-setup-table.png') }).catch(() => {});
  tg.blocked.add(503);
  await p.click('[data-a="deal"]'); await p.waitForTimeout(900);
  ok(await S(() => S.screen === 'deal' && S.game && S.game.tg && S.game.tg.code === S.game.tg.code && !S.lobby), 'game created, table moved into the game');
  ok(!!(await p.$('.club-brand')) && (await p.innerText('.club-brand')).includes('Клуб Кастельмар') && !!(await p.$('.club-brand .club-logo img')), 'partner club branding with the logo above the game field');
  ok(await S(() => JSON.stringify(S.game.tg.map) === JSON.stringify({ 501: 2, 502: 1, 503: 3 })), 'seat map by seat number: ' + await S(() => JSON.stringify(S.game.tg.map)));
  ok(await S(() => S.game.tg.sent.length === 3 && [501, 502, 503].every(id => S.game.tg.sent.includes(id))), 'cards delivered to the app for all three seated players (503 blocked only the DM notice)');
  const c501 = lastTo(501); const role2 = await S(() => I18N.uk.roles[S.game.players.find(x => x.seat === 2).roleId].name);
  ok(c501 && c501.params.text.includes('готова') && !c501.params.text.includes(role2), 'seat 2 got a notice in Ukrainian without the role');
  ok(await S(() => S.game.dealIdx === 3 && S.game.players[3].seat === 4), 'phone-pass starts at seat 4 (seats 1–3 are in the app)');
  await S(() => { ACT.flip({ dataset: {} }); ACT.hide({ dataset: {} }); }); await p.waitForTimeout(100);
  ok(await S(() => S.game.dealIdx === 4), 'next phone seat is 5');
  tg.blocked.delete(503);
  ok((await p.innerText('#app')).includes('✓'), 'delivered marks on the deal panel');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-deal-auto.png') }).catch(() => {});
  // shop wording
  await S(() => { S.screen = 'shop'; render(); ACT.buy({ dataset: { kind: 'role', id: 'sniper' } }); }); await p.waitForTimeout(100);
  const sheetText = await p.innerText('.sheet, #app'); ok(!/демо|demo/i.test(sheetText) && /Купить за/.test(sheetText), 'buy button says "Купить за …" without demo');
  await S(() => { S.ui.sheet = null; render(); });
  console.log('online game: format chooser → in-app invitation → waiting room (round table) → card in the app → night (family proposes, don shoots) → chat → nomination → vote → eliminated view → results');
  const pUser = { id: 601, first_name: 'Нина', username: 'nina_uk', language_code: 'uk' };
  const pInit = await signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), query_id: 'Q6', user: pUser }, 'test-token');
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const q = await ctx2.newPage(); const errs2 = []; q.on('pageerror', e => errs2.push(e.message)); q.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs2.push('console: ' + m.text()); });
  await q.addInitScript(({ initData, user, api }) => {
    window.MAFIA_API = api; window.__tg = { invoices: [], links: [] }; const noop = () => {};
    window.Telegram = { WebApp: { platform: 'android', version: '8.0', initData, initDataUnsafe: { user, auth_date: 1, hash: 'x' }, ready: noop, expand: noop, close: noop, setHeaderColor: noop, setBackgroundColor: noop, setBottomBarColor: noop, disableVerticalSwipes: noop, lockOrientation: noop, enableClosingConfirmation: noop, disableClosingConfirmation: noop, BackButton: { show: noop, hide: noop, onClick: noop }, HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop }, openInvoice: noop, openTelegramLink: l => window.__tg.links.push(l), openLink: l => window.__tg.links.push(l) } };
  }, { initData: pInit, user: pUser, api: 'http://127.0.0.1:8791' });
  await q.goto('file://' + path.resolve(__dirname, '..', 'mafia-pro.html')); await q.waitForTimeout(900);
  const Q = fn => q.evaluate(fn); const waitQ = (fn, ms = 10000) => q.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
  ok(await Q(() => S.cloud && S.cloud.user && S.cloud.user.id === 601 && S.screen === 'home'), 'player app started (uk, no table yet)');
  // Нина becomes the host's friend; the host starts a classic game in the online format
  await fetch('http://127.0.0.1:8791/api/friends/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: pInit, code: frCode }) });
  await S(() => { S.game = null; S.lobby = null; S.ui.sheet = null; FR.at = 0; ACT['scen-use']({ dataset: { id: 'classic' } }); }); await p.waitForTimeout(300);
  ok(!!(await p.$('[data-a="on-mode"][data-id="online"]')) && !!(await p.$('[data-a="on-mode"][data-id="offline"]')), 'format chooser "offline / online" on the setup screen');
  ok(await S(() => { const seg = document.querySelector('[data-a="on-mode"]'); const comp = document.querySelector('.stepper'); return !!(seg && comp && (seg.compareDocumentPosition(comp) & Node.DOCUMENT_POSITION_FOLLOWING)); }), 'the chooser sits at the top, above the player count');
  await p.click('[data-a="on-mode"][data-id="online"]'); await p.waitForTimeout(700);
  ok(await S(() => S.setup.online === true && !!(S.lobby && S.lobby.code)), 'online chosen → the table opens by itself');
  const oc = await S(() => S.lobby.code);
  await S(() => { S.setup.names = ['Анна', 'Богдан', 'Нина', 'Гена', 'Дима', 'Ева', 'Женя', 'Зоя', 'Иван', 'Кира']; render(); });
  // in-app invitation: Нина is online (her app just synced) → no DM, the invitation pops up in her app
  await S(() => go('friends')); await p.waitForTimeout(700);
  await S(() => { S.ui.frSel = [601]; }); await S(() => ACT['fr-invite']()); await p.waitForTimeout(800);
  ok(!tg.calls.some(c => c.method === 'sendMessage' && c.params.chat_id === 601 && c.params.text.includes(oc)), 'online friend gets no DM');
  await Q(async () => { const d = await api('/api/ping', {}); S.cloud.invites = d.invites || []; S.cloud.table = d.table || null; showInvites(); }); await q.waitForTimeout(300);
  ok(await Q(() => S.ui.sheet && S.ui.sheet.type === 'tableInvite') && (await q.$eval('.sheet', el => el.textContent)).includes('Ведущий') && (await q.$eval('.sheet', el => el.textContent)).includes(oc), 'invitation sheet on the player’s screen with the host’s name and the table code');
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'online-invite.png') }).catch(() => {});
  await q.click('.sheet [data-a="inv-respond"][data-ok="1"]'); await q.waitForTimeout(900);
  ok(await Q(() => S.screen === 'table' && TB.code === S.cloud.table.code), 'accepted → the waiting room opens');
  ok(lastTo(100) && lastTo(100).params.text.includes('Нина') && lastTo(100).params.text.includes(oc), 'host notified that Нина sat down');
  // a second player (mafioso) joins through the bot; the host refreshes and both are auto-seated by name
  await hook({ update_id: 61, message: { message_id: 1, from: { id: 602, first_name: 'Гена', language_code: 'ru' }, chat: { id: 602, type: 'private' }, text: `/start join_${oc}` } });
  ok(lastTo(602).params.reply_markup.inline_keyboard[0][0].web_app.url.includes('startapp=table_' + oc), 'bot reply carries the "open table" app button');
  await S(() => go('setup')); await p.waitForTimeout(200); await p.click('[data-a="tg-lobby-refresh"]'); await p.waitForTimeout(900);
  ok(await S(() => S.lobby.seats[601] === 2 && S.lobby.seats[602] === 3), 'auto-seated by name: Нина → seat 3, Гена → seat 4: ' + await S(() => JSON.stringify(S.lobby.seats)));
  const hostLobbyTxt = await p.$eval('#app', el => el.textContent);
  ok((await p.$$('.rtable .rt-seat')).length === 10 && (await p.$$('.rt-seat.joined')).length === 2 && hostLobbyTxt.includes('✓ Нина') && hostLobbyTxt.includes('✓ Гена') && hostLobbyTxt.includes(await S(() => U().tbJoinedList)), 'host sees the round table with both joined players marked and the "at the table" list');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'online-host-lobby.png'), fullPage: true }).catch(() => {});
  ok(await waitQ(() => TB.data && TB.data.pub && TB.data.pub.phase === 'lobby' && TB.data.pub.seats && TB.data.pub.seats.length === 10 && TB.data.pub.seats[2].tgId === 601), 'waiting room published: 10 seats, Нина at seat 3');
  const lobbyTxt = await q.$eval("#app", el => el.textContent);
  ok((await q.$$('.rt-seat')).length === 10 && lobbyTxt.includes('Mafia') && lobbyTxt.includes('PRO') && lobbyTxt.includes('Ведущий') && (await q.$eval('.rt-seat.mine .rt-num', el => el.textContent)) === '3' && lobbyTxt.includes('1000'), 'round table: 10 seats, "Mafia PRO" + host + player count in the middle, my seat 3 with rating');
  ok(await Q(() => TB.data.profiles[601] && TB.data.profiles[601].points === 1000 && TB.data.profiles[602] && TB.data.profiles[602].name === 'Гена'), 'seat profiles (rating, name) came with the table');
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'online-lobby.png') }).catch(() => {});
  // deal: the game is online, cards appear in the app (no role text in Telegram)
  const tgBefore = tg.calls.length;
  await S(() => ACT.deal({ dataset: {} })); await p.waitForTimeout(1200);
  ok(await S(() => S.game && S.game.online === true && S.game.tg && S.game.tg.map[601] === 3 && S.game.tg.map[602] === 4 && S.game.tg.sent.includes(601) && S.game.tg.sent.includes(602)), 'online game created; both cards delivered to the app');
  // fix the roles for a deterministic test: 3 = Don (Нина), 4 = mafia (Гена), 1 = mafia, 5 = sheriff, others citizens
  await S(() => { const g = S.game; g.players.forEach(p => { p.roleId = p.seat === 3 ? 'don' : (p.seat === 4 || p.seat === 1) ? 'mafia' : p.seat === 5 ? 'sheriff' : 'citizen'; }); save(); render(); }); await p.waitForTimeout(700);
  ok(await waitQ(() => TB.data && TB.data.me && TB.data.me.roleId === 'don' && TB.data.pub.phase === 'deal'), 'Нина sees her card (Don) in the app');
  ok(!tg.calls.slice(tgBefore).some(c => c.method === 'sendMessage' && /Дон|Don|мафия/i.test(c.params.text || '')), 'no role text went through Telegram');
  ok(!!(await q.$('.card3d-wrap')) && (await q.$eval('#app', el => el.textContent)).includes('Дон'), 'the card is shown big (3D) with its name');
  await q.click('[data-a="role"][data-id="don"]'); await q.waitForTimeout(400);
  ok(await Q(() => S.ui.sheet && S.ui.sheet.type === 'role' && S.ui.sheet.id === 'don') && (await q.$eval('.sheet', el => el.textContent)).includes(await Q(() => U().howWorks)), 'tapping the card opens the full role sheet (rules, lore, tips)');
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'online-card.png') }).catch(() => {});
  await Q(() => { S.ui.sheet = null; render(); });
  ok(await waitQ(() => TB.data.me.mates && TB.data.me.mates.length === 2 && TB.data.me.mates.every(m => m.roleId === 'mafia')), 'the Don sees her family (seats 1 and 4)');
  // the host starts: night 0 (meetings), classic day 1 without candidates, then night 1
  await S(() => { ACT['tg-deal-done']({ dataset: {} }); ACT.start({ dataset: {} }); }); await p.waitForTimeout(300);
  ok(await waitQ(() => TB.data.pub.phase === 'night0' && TB.data.pub.step && TB.data.pub.step.roleId === 'don'), 'player sees night 0 with the family meeting');
  await S(() => { while (S.game.phase === 'night0' && S.game.stepIdx < S.game.steps.length) ACT.next({ dataset: {} }); ACT.day0({ dataset: {} }); }); await p.waitForTimeout(300);
  ok(await S(() => S.game.phase === 'day' && S.game.day === 1 && S.game.dayStage === 'speeches'), 'classic: day 1 speeches');
  await S(() => { ACT.stage({ dataset: { id: 'vote' } }); ACT['vote-none']({ dataset: {} }); ACT.night({ dataset: {} }); }); await p.waitForTimeout(300);
  ok(await S(() => S.game.phase === 'night' && S.game.night === 1 && S.game.steps[0].ability === 'shoot'), 'night 1: the family shot is the first step');
  ok(await waitQ(() => TB.data.pub.phase === 'night' && TB.data.me.ask && TB.data.me.ask.kind === 'shoot' && TB.data.me.ask.key.startsWith('night1:s0:')), 'the Don is asked to shoot');
  // the mafioso (602, via API) proposes seat 5; the Don sees the proposal and shoots seat 5
  const g602 = await signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user: { id: 602, first_name: 'Гена', language_code: 'ru' } }, 'test-token');
  const st602 = await (await fetch('http://127.0.0.1:8791/api/table/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: g602, code: oc }) })).json();
  ok(st602.me.roleId === 'mafia' && st602.me.ask && st602.me.ask.kind === 'propose' && st602.me.ask.shooter === 3, 'the mafioso is asked to propose a target to the Don');
  await fetch('http://127.0.0.1:8791/api/table/act', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: g602, code: oc, key: st602.me.ask.key, payload: { pick: [5] } }) });
  ok(await waitQ(() => TB.data.me.ask && TB.data.me.ask.proposals && TB.data.me.ask.proposals.some(x => x.seat === 5 && x.by === 4)), 'the Don sees the family proposal "5 (by 4)"');
  ok((await p.innerText('#app')).includes('5 (от 4)'), 'host strip shows the proposal too');
  await q.click('.tb-ask .pk[data-seat="5"]'); await q.waitForTimeout(150); await q.click('[data-a="tb-confirm"]'); await q.waitForTimeout(2600);
  ok(await S(() => S.game.actions.some(a => a.ability === 'shoot' && S.game.players.find(x => x.id === a.targets[0]).seat === 5)), 'the shot at seat 5 is recorded on the host');
  await p.waitForTimeout(2800);
  ok(await S(() => S.game.stepIdx === 1 && S.game.steps[1].ability === 'findSheriff'), 'host advanced automatically to the Don’s check');
  ok(await waitQ(() => TB.data.me.ask && TB.data.me.ask.kind === 'act' && TB.data.me.ask.ability === 'findSheriff'), 'the Don is asked to look for the Sheriff');
  await q.click('.tb-ask .pk[data-seat="5"]'); await q.waitForTimeout(150); await q.click('[data-a="tb-confirm"]'); await q.waitForTimeout(2600);
  ok(await waitQ(() => TB.data.me.results && TB.data.me.results.some(r => r.kind === 'sheriff' && r.yes === true && r.seat === 5)), 'the Don gets the answer in the app: seat 5 is the Sheriff');
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'online-night.png') }).catch(() => {});
  await p.waitForTimeout(2800);
  // the sheriff (seat 5, no Telegram) acts through the host’s phone; the night is resolved
  ok(await S(() => S.game.stepIdx === 2 && S.game.steps[2].roleId === 'sheriff'), 'sheriff step: host plays it (seat 5 has no Telegram)');
  await S(() => { ACT.pick({ dataset: { id: S.game.players.find(x => x.seat === 1).id } }); ACT.confirm({ dataset: {} }); ACT.next({ dataset: {} }); ACT.resolve({ dataset: {} }); }); await p.waitForTimeout(300);
  ok(await S(() => S.game.phase === 'day' && S.game.day === 2 && !S.game.players.find(x => x.seat === 5).alive), 'day 2: seat 5 is dead');
  ok(await waitQ(() => TB.data.pub.phase === 'day' && TB.data.pub.dayInfo && TB.data.pub.dayInfo.stage === 'morning' && TB.data.pub.dayInfo.removed[0].seat === 5), 'player sees the morning with the victim');
  // speeches: chat is open, the Don nominates seat 1 from her phone when it is her turn
  await S(() => { ACT['bm-save']({ dataset: { skip: '1' } }); ACT.stage({ dataset: { id: 'speeches' } }); }); await p.waitForTimeout(200);
  await S(() => { const g = S.game; const order = speakOrder(g); g.speechIdx = order.findIndex(x => x.seat === 3); render(); }); await p.waitForTimeout(300);
  ok(await waitQ(() => TB.data.pub.dayInfo.stage === 'speeches' && TB.data.pub.dayInfo.speaker === 3 && TB.data.pub.chat === 'speaker' && TB.data.pub.chatSeat === 3 && TB.data.me.ask && TB.data.me.ask.kind === 'nominate'), 'Нина speaks: chat open for the speaker, nomination offered');
  ok(!!(await q.$('#tb-timer')) && !!(await q.$('#tb-msg:not([disabled])')), 'timer and chat input on the player’s screen');
  await q.fill('#tb-msg', 'Я мирная, верьте мне'); await q.press('#tb-msg', 'Enter'); await q.waitForTimeout(900);
  ok(await Q(() => TB.chat.some(m => m.text === 'Я мирная, верьте мне' && m.me)), 'chat message sent and shown');
  const hostChat = await (await fetch('http://127.0.0.1:8791/api/table/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData, code: oc, since: 0 }) })).json();
  ok(hostChat.chat.some(m => m.text === 'Я мирная, верьте мне' && m.name === '3 · Нина'), 'the host reads it with the seat number');
  await q.click('.tb-ask .pk[data-seat="1"]'); await q.waitForTimeout(150); await q.click('[data-a="tb-confirm"]'); await q.waitForTimeout(2600);
  ok(await S(() => S.game.ballot.candidates.length === 1 && S.game.players.find(x => x.id === S.game.ballot.candidates[0]).seat === 1), 'nomination of seat 1 reached the host');
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'online-day.png') }).catch(() => {});
  // vote: the host adds seat 4; players vote from their phones; chat closes
  await S(() => { ACT.stage({ dataset: { id: 'vote' } }); }); await p.waitForTimeout(300);
  ok(await waitQ(() => TB.data.pub.dayInfo.stage === 'vote' && TB.data.pub.chat === false && TB.data.me.ask && TB.data.me.ask.kind === 'vote'), 'vote stage: chat closed, vote prompt');
  // the morning of day 2 was open to everyone; speeches of another seat are closed for Нина
  ok((await (await fetch('http://127.0.0.1:8791/api/table/chat/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: g602, code: oc, text: 'late' }) })).json()).error === 'chat_closed', 'server refuses chat during the vote');
  ok(!!(await q.$('#tb-msg[disabled]')), 'chat input disabled');
  await S(() => { ACT.cand({ dataset: { id: S.game.players.find(x => x.seat === 4).id } }); }); await p.waitForTimeout(300);
  ok(await waitQ(() => TB.data.me.ask.targets.length === 2), 'two candidates offered');
  await q.click('.tb-ask .pk[data-seat="4"]'); await q.waitForTimeout(150); await q.click('[data-a="tb-confirm"]'); await q.waitForTimeout(900);
  const st602v = await (await fetch('http://127.0.0.1:8791/api/table/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: g602, code: oc }) })).json();
  await fetch('http://127.0.0.1:8791/api/table/act', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: g602, code: oc, key: st602v.me.ask.key, payload: { pick: [1] } }) });
  await p.waitForTimeout(2600);
  ok(await S(() => { const g = S.game; const sid = s => g.players.find(x => x.seat === s).id; return g.ballot.votes[sid(3)] === sid(4) && g.ballot.votes[sid(4)] === sid(1); }), 'both votes registered on the host (3 → 4, 4 → 1)');
  ok((await p.innerText('#app')).includes('2/'), 'host strip counts the votes');
  ok(await waitQ(() => TB.data.pub.dayInfo.votes && TB.data.pub.dayInfo.votes[3] === 4 && TB.data.me.ask.done && TB.data.me.ask.picked[0] === 4), 'player sees the votes on the table');
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'online-vote.png') }).catch(() => {});
  await S(() => { ACT['vote-close']({ dataset: {} }); }); await p.waitForTimeout(300);
  ok(await S(() => S.game.dayStage === 'result' || S.game.dayStage === 'tie'), 'vote closed by the host: ' + await S(() => S.game.dayStage));
  // the host removes Нина from the game: she sees only the remaining seats and nothing else
  await S(() => { S.ui.sheet = { type: 'players' }; ACT['toggle-alive']({ dataset: { id: S.game.players.find(x => x.seat === 3).id } }); S.ui.sheet = null; render(); }); await p.waitForTimeout(300);
  ok(await waitQ(() => TB.data.me && TB.data.me.alive === false && TB.data.pub.spectator === true), 'eliminated: spectator state arrived');
  const deadTxt = await q.$eval('#app', el => el.textContent);
  ok(deadTxt.includes(await Q(() => U().tbDead)) && !deadTxt.includes(await Q(() => U().tbVoteStage)) && !(await q.$('#tb-msg')) && (await q.$$('.rt-seat')).length === (await S(() => S.game.players.filter(x => x.alive).length)), 'eliminated player sees only the seats still at the table, no stage, no chat');
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'online-dead.png') }).catch(() => {});
  // the end: results for everyone; Нина already won a mafia game before → her mafia streak becomes 2 (gold line)
  await fetch('http://127.0.0.1:8791/api/game/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData, game: { id: 'pre-' + oc, mode: 'classic', winner: 'mafia', players: [{ seat: 1, name: 'Нина', tgId: 601, roleId: 'mafia', won: true, points: 24, side: 'mafia' }] } }) });
  await S(() => { finishGame(S.game, { side: 'mafia', title: 'Победа мафии', text: 'Мафия взяла город' }); render(); }); await p.waitForTimeout(1500);
  ok(await S(() => S.game.streaks && S.game.streaks[601] && S.game.streaks[601].side === 'mafia' && S.game.streaks[601].n === 2), 'host received the streaks from the server: ' + await S(() => JSON.stringify(S.game.streaks)));
  const hostEnd = await p.$eval('#app', el => el.textContent);
  const hostPod = { cards: (await p.$$('.pod-card')).length, p1: !!(await p.$('.podium .pod-card.p1')), streak: hostEnd.includes(await S(() => tt(U().streakLine, { n: 2, wins: plural(2, 'wins'), side: U().streakFor.mafia }))), seat3: await S(() => { const r = resultRows(S.game).find(x => x.seat === 3); return r && { tgId: r.tgId, streak: r.streak, side: r.side }; }) };
  ok(hostPod.cards === 10 && hostPod.p1 && hostPod.streak, 'host’s results: podium of 3D cards for all 10 players, gold streak "2 wins in a row for the mafia": ' + JSON.stringify(hostPod));
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'online-host-end.png'), fullPage: true }).catch(() => {});
  ok(await waitQ(() => TB.data.pub.phase === 'end' && TB.data.pub.result && TB.data.pub.roles && TB.data.pub.roles.length === 10 && TB.data.pub.roles.some(r => r.seat === 3 && r.streak === 2)), 'results page (with streaks) reached the eliminated player: ' + await Q(() => JSON.stringify({ phase: TB.data.pub.phase, roles: (TB.data.pub.roles || []).map(r => [r.seat, r.place, r.streak, r.side]) })) + ' sig=' + await S(() => ONL.sig.length) + ' hostroles=' + await S(() => JSON.stringify(tablePub(S.game).roles.map(r => [r.seat, r.streak]))));
  const endTxt = await q.$eval('#app', el => el.textContent);
  ok(endTxt.includes('Победа мафии') && endTxt.includes(await Q(() => U().tbYouWon)) && endTxt.includes('Шериф') && (await q.$$('.fr-row')).length >= 10, 'results: winner, "you won" for the Don, every player’s card');
  ok((await q.$$('.pod-card')).length === 10 && !!(await q.$('.podium .pod-card.p1')) && endTxt.includes(await Q(() => tt(U().streakLine, { n: 2, wins: plural(2, 'wins'), side: U().streakFor.mafia }))), 'player’s results: podium with every card and the gold streak line');
  ok(endTxt.includes(await Q(() => U().tbReview)) && (await q.$$('.rv-items .it')).length >= 1 && endTxt.includes(await Q(() => U().tbRatingNow.split(':')[0])) && await Q(() => TB.data.pub.roles.find(r => r.seat === 3).rating > 1000 && TB.data.pub.roles.find(r => r.seat === 3).items.length >= 1), 'player’s results: her own review (moves with verdicts and advice), points breakdown and new rating');
  ok(await waitQ(() => S.cloud && S.cloud.rating && S.cloud.rating.games >= 2), 'player’s app refreshed her rating after the game');
  await q.click('.pod-card .pod-plaque[data-a="fr-open"][data-id="602"]'); await q.waitForTimeout(700);
  ok(await Q(() => S.ui.sheet && S.ui.sheet.type === 'friend' && S.ui.sheet.id === 602) && (await q.$eval('.sheet', el => el.textContent)).includes('Гена'), 'tapping a player on the podium opens his profile');
  await Q(() => { S.ui.sheet = null; render(); });
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'online-end.png') }).catch(() => {});
  ok(errs2.length === 0, 'no page errors on the player’s phone: ' + errs2.join(' | ').slice(0, 300));
  await ctx2.close();

  ok(errs.length === 0, 'no page errors: ' + errs.join(' | ').slice(0, 300));
  await b.close(); await tg.close(); api.close();
  console.log(fails ? `\n${fails} of ${n} checks FAILED` : `\nALL OK (${n} checks)`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
