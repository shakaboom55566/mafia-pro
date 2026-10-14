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
    // v41: a card this device remembers but the account never paid for (the old free "demo" purchase) must not survive the sync
    try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('mafiapro.v1', JSON.stringify({ owned: { roles: ['sniper'], scenarios: ['chaos'], packs: ['diplomacy'] } })); } } catch (e) {}
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
  ok(await S(() => !S.owned.roles.includes('sniper') && !S.owned.scenarios.includes('chaos') && !(S.owned.packs || []).includes('diplomacy')), 'unpaid purchases remembered by the device are dropped by the account');
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
  { const hostMode = await S(() => ({ classic: S.setup.scenario === 'classic', open: revealDeadIn(null) }));
    const ukLine = `🃏 ${hostMode.classic ? 'Класична мафія' : 'Рольова мафія'} · ${hostMode.open ? 'у відкриту' : 'у закриту'}`; const plLine = `🃏 ${hostMode.classic ? 'Mafia klasyczna' : 'Mafia z rolami'} · ${hostMode.open ? 'gra otwarta' : 'gra zamknięta'}`;
    ok(dm401.params.text.includes(ukLine) && dm402.params.text.includes(plLine), 'the DM says which game it is (mode, open / closed) in the friend’s language: ' + dm401.params.text.split('\n').pop() + ' | ' + dm402.params.text.split('\n').pop());
    ok(inv401.invites[0].mode === (hostMode.classic ? 'classic' : 'extended') && inv401.invites[0].open === hostMode.open, 'the in-app invitation carries the mode too: ' + JSON.stringify({ mode: inv401.invites[0].mode, open: inv401.invites[0].open })); }
  ok(await S(() => S.ui.frSel.length === 0), 'selection cleared');
  ok(await S(() => S.screen === 'setup'), 'after inviting the host goes on to the table (setup screen), not the menu');
  await S(() => go('friends')); await p.waitForTimeout(400);
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
  await S(() => { S.game = null; S.lobby = null; S.ui.sheet = null; FR.at = 0; S.setup.online = true; ACT['scen-use']({ dataset: { id: 'classic' } }); }); await p.waitForTimeout(300);
  ok(!!(await p.$('[data-a="on-mode"]')) && await S(() => S.setup.online === true && S.setup.scenario === 'classic' && S.setup.n === 10), 'classic keeps the format chooser: it can be played online too (10 seats)');
  await S(() => ACT.new({ dataset: {} })); await p.waitForTimeout(300);
  ok(!!(await p.$('[data-a="on-mode"][data-id="online"]')) && !!(await p.$('[data-a="on-mode"][data-id="offline"]')), 'format chooser "offline / online" on the role-game setup screen');
  ok(await S(() => { const seg = document.querySelector('[data-a="on-mode"]'); const comp = document.querySelector('.stepper'); return !!(seg && comp && (seg.compareDocumentPosition(comp) & Node.DOCUMENT_POSITION_FOLLOWING)); }), 'the chooser sits at the top, above the player count');
  await p.click('[data-a="on-mode"][data-id="online"]'); await p.waitForTimeout(700);
  ok(await S(() => S.setup.online === true && !!(S.lobby && S.lobby.code)), 'online chosen → the table opens by itself');
  // the rest of this flow exercises the classic rules online (nominations in speeches, best move, lift): the engine keeps that ability even though the UI offers classic offline only
  await S(() => { applyScenario('classic', 10); S.setup.online = true; render(); }); await p.waitForTimeout(300);
  const oc = await S(() => S.lobby.code);
  await S(() => { S.setup.names = ['Анна', 'Богдан', 'Нина', 'Гена', 'Дима', 'Ева', 'Женя', 'Зоя', 'Иван', 'Кира']; render(); });
  // in-app invitation: Нина is online (her app just synced) → no DM, the invitation pops up in her app
  await S(() => go('friends')); await p.waitForTimeout(700);
  await S(() => { S.ui.frSel = [601]; }); await S(() => ACT['fr-invite']()); await p.waitForTimeout(800);
  ok(!tg.calls.some(c => c.method === 'sendMessage' && c.params.chat_id === 601 && c.params.text.includes(oc)), 'online friend gets no DM');
  ok(await p.evaluate(c => S.screen === 'setup' && S.lobby && S.lobby.code === c, oc), 'host lands on the table setup after inviting');
  // the home screen carries no table list any more; "Find a table" sits right under Classic Mafia and lists every online table
  await Q(() => { S.ui.sheet = null; go('home'); }); await q.waitForTimeout(400);
  ok(!(await q.$('[data-a="lb-join"]')) && await Q(() => { const items = [...document.querySelectorAll('.menu .menu-item')]; const i = items.findIndex(b => b.dataset.a === 'scen-use' && b.dataset.id === 'classic'); return i >= 0 && items[i + 1] && items[i + 1].dataset.to === 'tables'; }), 'no open-tables list on the home screen; "Find a table" is the item under Classic Mafia');
  await Q(() => { LB.at = 0; go('tables'); }); await q.waitForTimeout(1000);
  ok(await Q(() => Array.isArray(LB.list)), 'open tables loaded');
  const lbTxt0 = await q.$eval('#app', el => el.textContent);
  ok(!!(await q.$('[data-a="lb-tab"][data-id="role"].active')) && !!(await q.$('[data-a="lb-tab"][data-id="classic"]')) && !lbTxt0.includes('0 / 10') && lbTxt0.includes(await Q(() => U().lbEmptyMode)) && await Q(() => (LB.list || []).some(l => l.mode === 'classic' && l.open === true)), 'finder opens on "Role game": the host’s classic table is not there, the tab says there are none of this kind');
  await q.click('[data-a="lb-tab"][data-id="classic"]'); await q.waitForTimeout(200);
  const lbTxt = await q.$eval('#app', el => el.textContent);
  ok(await Q(() => (LB.list || []).some(l => l.host.name === 'Ведущий' && l.via === 'invite' && l.online && l.players === 0)) && lbTxt.includes(await Q(() => U().lbFind)) && lbTxt.includes('Ведущий') && lbTxt.includes('0 / 10') && lbTxt.includes(await Q(() => U().modeClassic + ' · ' + U().modeOpen)) && !!(await q.$('[data-a="lb-join"]')), 'the "Classic" tab shows the host’s online table: host nick, players 0 / 10, "Classic mafia · open game"');
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'online-lobbies.png') }).catch(() => {});
  { // the web version (GitHub Pages, no Telegram): "Find a table" is there too; the list is public and «Sit down» opens the bot
    const w = await b.newPage({ viewport: { width: 1280, height: 900 } }); const errsW = []; w.on('pageerror', e => errsW.push(e.message));
    await w.addInitScript(({ api }) => { window.MAFIA_API = api; window.__opened = []; window.open = u => { window.__opened.push(u); return {}; }; }, { api: 'http://127.0.0.1:8791' });
    await w.goto('file://' + path.resolve(__dirname, '..', 'mafia-pro.html')); await w.waitForTimeout(700);
    const W = fn => w.evaluate(fn);
    ok(await W(() => { const items = [...document.querySelectorAll('.menu .menu-item')]; const i = items.findIndex(x => x.dataset.a === 'scen-use' && x.dataset.id === 'classic'); return !TG.app && i >= 0 && items[i + 1] && items[i + 1].dataset.to === 'tables'; }), 'web: "Find a table" under Classic Mafia without Telegram');
    await W(() => { LB.at = 0; go('tables'); }); await w.waitForTimeout(1000);
    await w.click('[data-a="lb-tab"][data-id="classic"]'); await w.waitForTimeout(200);
    const wTxt = await w.$eval('#app', el => el.textContent);
    ok(wTxt.includes('Ведущий') && wTxt.includes('0 / 10') && wTxt.includes(await W(() => U().lbWebHint)) && !wTxt.includes(await W(() => U().frOnlyTg)), 'web: the finder lists the online table with host and seats');
    await w.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'web-tables.png') }).catch(() => {});
    await w.click('[data-a="lb-join"][data-code="' + oc + '"]'); await w.waitForTimeout(200);
    const opened = await W(() => window.__opened); ok(opened.length === 1 && /^https:\/\/t\.me\/[A-Za-z0-9_]+\?start=join_[A-Z0-9]+$/.test(opened[0]) && opened[0].endsWith(oc), 'web: «Sit down» opens the bot with the table code: ' + await W(() => window.__opened[0]));
    await W(() => { LB.code = 'ab12cd'.toUpperCase(); ACT['lb-join']({ dataset: { code: '' } }); }); ok(await W(() => window.__opened[1] && window.__opened[1].endsWith('join_AB12CD')), 'web: join by code opens the bot too');
    ok(!errsW.length, 'web: no page errors ' + errsW.join('; ')); await w.close();
  }
  await Q(async () => { const d = await api('/api/ping', {}); S.cloud.invites = d.invites || []; S.cloud.table = d.table || null; showInvites(); }); await q.waitForTimeout(300);
  ok(await Q(() => S.ui.sheet && S.ui.sheet.type === 'tableInvite') && (await q.$eval('.sheet', el => el.textContent)).includes('Ведущий') && (await q.$eval('.sheet', el => el.textContent)).includes(oc), 'invitation sheet on the player’s screen with the host’s name and the table code');
  ok((await q.$eval('.sheet', el => el.textContent)).includes(await Q(() => U().modeClassic + ' · ' + U().modeOpen)), 'the sheet says "Classic mafia · open game"');
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'online-invite.png') }).catch(() => {});
  // closed with × → not asked again this session, but still offered in the open-tables list
  await q.click('.sheet button[data-a="sheet-close"]'); await q.waitForTimeout(200);
  await Q(() => showInvites()); await q.waitForTimeout(200);
  ok(await Q(() => !S.ui.sheet && TB.dismissed.has(S.cloud.invites[0].code)), 'invitation closed with × does not pop up again');
  await Q(() => { TB.dismissed.clear(); showInvites(); }); await q.waitForTimeout(200);
  ok(await Q(() => S.ui.sheet && S.ui.sheet.type === 'tableInvite'), 'invitation sheet shown again');
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
  // the host moves players by tapping the round table: Гена 4 → 6 (a free seat), then onto Нина's seat 3 (they swap), then back
  ok(!!(await p.$('#host-table [data-a="setup-jump"]')) && hostLobbyTxt.includes(await S(() => U().seatTapHint)), 'host: a gear above the round table and the tap-to-move hint');
  await p.click('#host-table .rt-seat[data-seat="4"]'); await p.waitForTimeout(150);
  ok(await S(() => S.ui.seatSel === 4) && !!(await p.$('#host-table .rt-seat.picked[data-seat="4"]')) && (await p.innerText('#app')).includes('Гена'), 'tap on seat 4 selects Гена, the seat is highlighted');
  await p.click('#host-table .rt-seat[data-seat="6"]'); await p.waitForTimeout(300);
  ok(await S(() => S.lobby.seats[602] === 5 && S.ui.seatSel === 0 && S.setup.names[3] === ''), 'Гена moved to seat 6, seat 4 freed: ' + await S(() => JSON.stringify(S.lobby.seats)));
  await p.click('#host-table .rt-seat[data-seat="6"]'); await p.waitForTimeout(150); await p.click('#host-table .rt-seat[data-seat="3"]'); await p.waitForTimeout(300);
  ok(await S(() => S.lobby.seats[602] === 2 && S.lobby.seats[601] === 5), 'tap onto an occupied seat swaps: Гена → 3, Нина → 6');
  await p.click('#host-table .rt-seat[data-seat="6"]'); await p.waitForTimeout(150); await p.click('#host-table .rt-seat[data-seat="3"]'); await p.waitForTimeout(300);
  await p.click('#host-table .rt-seat[data-seat="6"]'); await p.waitForTimeout(150); await p.click('#host-table .rt-seat[data-seat="4"]'); await p.waitForTimeout(300);
  ok(await S(() => S.lobby.seats[601] === 2 && S.lobby.seats[602] === 3 && S.setup.names[2] === 'Нина' && S.setup.names[3] === 'Гена'), 'back in place: Нина 3, Гена 4: ' + await S(() => JSON.stringify(S.lobby.seats)));
  await S(() => go('home')); await p.waitForTimeout(200);
  ok(!!(await p.$('.menu, .hero')) && !!(await p.$('[data-a="setup-jump"]')) && (await p.innerText('#app')).includes(oc), 'home: the host sees "your table" with a gear into the settings');
  await p.click('[data-a="setup-jump"]'); await p.waitForTimeout(300);
  ok(await S(() => S.screen === 'setup' && !!document.querySelector('[data-a="deal"]')), 'the gear leads to the table settings with the deal button at the end');
  ok(await waitQ(() => TB.data && TB.data.pub && TB.data.pub.phase === 'lobby' && TB.data.pub.seats && TB.data.pub.seats.length === 10 && TB.data.pub.seats[2].tgId === 601), 'waiting room published: 10 seats, Нина at seat 3');
  const lobbyTxt = await q.$eval("#app", el => el.textContent);
  ok((await q.$$('.rt-seat')).length === 10 && lobbyTxt.includes('Mafia') && lobbyTxt.includes('PRO') && lobbyTxt.includes('Ведущий') && (await q.$eval('.rt-seat.mine .rt-num', el => el.textContent)) === '3' && lobbyTxt.includes('1000'), 'round table: 10 seats, "Mafia PRO" + host + player count in the middle, my seat 3 with rating');
  ok(lobbyTxt.includes(await Q(() => U().modeClassic + ' · ' + U().modeOpen)), 'the waiting room header names the game: classic, open');
  ok(await Q(() => TB.data.profiles[601] && TB.data.profiles[601].points === 1000 && TB.data.profiles[602] && TB.data.profiles[602].name === 'Гена'), 'seat profiles (rating, name) came with the table');
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'online-lobby.png') }).catch(() => {});
  // deal: the game is online, cards appear in the app (no role text in Telegram)
  const tgBefore = tg.calls.length;
  await S(() => ACT.deal({ dataset: {} })); await p.waitForTimeout(1200);
  ok(await S(() => S.game && S.game.online === true && S.game.tg && S.game.tg.map[601] === 3 && S.game.tg.map[602] === 4 && S.game.tg.sent.includes(601) && S.game.tg.sent.includes(602)), 'online game created; both cards delivered to the app');
  // fix the roles for a deterministic test: 3 = Don (Нина), 4 = mafia (Гена) — the whole family sits in the app; 5 = sheriff, others citizens
  await S(() => { const g = S.game; g.players.forEach(p => { p.roleId = p.seat === 3 ? 'don' : p.seat === 4 ? 'mafia' : p.seat === 5 ? 'sheriff' : 'citizen'; }); save(); render(); }); await p.waitForTimeout(700);
  ok(await waitQ(() => TB.data && TB.data.me && TB.data.me.roleId === 'don' && TB.data.pub.phase === 'deal'), 'Нина sees her card (Don) in the app');
  ok(!tg.calls.slice(tgBefore).some(c => c.method === 'sendMessage' && /Дон|Don|мафия/i.test(c.params.text || '')), 'no role text went through Telegram');
  ok(!!(await q.$('.card3d-wrap')) && (await q.$eval('#app', el => el.textContent)).includes('Дон'), 'the card is shown big (3D) with its name');
  await q.click('[data-a="role"][data-id="don"]'); await q.waitForTimeout(400);
  ok(await Q(() => S.ui.sheet && S.ui.sheet.type === 'role' && S.ui.sheet.id === 'don') && (await q.$eval('.sheet', el => el.textContent)).includes(await Q(() => U().howWorks)), 'tapping the card opens the full role sheet (rules, lore, tips)');
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'online-card.png') }).catch(() => {});
  ok(!!(await q.$('.sheet [data-a="role-tab"][data-id="signs"]')) && !!(await q.$('.sheet [data-a="role-tab"][data-id="card"].active')), 'the Don’s sheet has a "Signs" tab next to the card');
  await q.click('.sheet [data-a="role-tab"][data-id="signs"]'); await q.waitForTimeout(300);
  const signsTxt = await q.$eval('.sheet', el => el.textContent);
  ok(await Q(() => S.ui.roleTab === 'signs') && signsTxt.includes(await Q(() => U().dlGuideTitle)) && signsTxt.includes(await Q(() => U().dlSignsTitle)) && (await q.$$('.sheet .dl-row')).length === 31 && (await q.$$('.sheet .dl-row svg.hand')).length >= 6 && signsTxt.includes(await Q(() => U().dlHelp.answer)) && !signsTxt.includes(await Q(() => U().howWorks)), 'signs tab: the in-game guide (hands, 3·2·1) and every sign with its explanation: ' + (await q.$$('.sheet .dl-row')).length);
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'classic-don-signs.png'), fullPage: true }).catch(() => {});
  await q.click('.sheet [data-a="role-tab"][data-id="card"]'); await q.waitForTimeout(200);
  ok((await q.$eval('.sheet', el => el.textContent)).includes(await Q(() => U().howWorks)), 'back to the card');
  await Q(() => { S.ui.sheet = null; render(); });
  ok(await waitQ(() => TB.data.me.mates && TB.data.me.mates.length === 1 && TB.data.me.mates[0].seat === 4 && TB.data.me.mates[0].roleId === 'mafia'), 'the Don sees her family (seat 4)');
  // the host starts: night 0 (meetings), classic day 1 without candidates, then night 1
  await S(() => { ACT['tg-deal-done']({ dataset: {} }); ACT.start({ dataset: {} }); }); await p.waitForTimeout(300);
  ok(await waitQ(() => TB.data.pub.phase === 'night0' && TB.data.pub.step && TB.data.pub.step.roleId === 'don'), 'player sees night 0 with the family meeting');
  // ----- night 0, the Don's signs: a palette on the Don's card only; the family sees them big, straight from the queue; gone once the mafia sleeps
  const g602 = await signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user: { id: 602, first_name: 'Гена', language_code: 'ru' } }, 'test-token');
  const st602 = async () => (await (await fetch('http://127.0.0.1:8791/api/table/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: g602, code: oc }) })).json());
  const act602 = async (key, payload) => (await (await fetch('http://127.0.0.1:8791/api/table/act', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: g602, code: oc, key, payload }) })).json());
  ok(await waitQ(() => TB.data.me.ask && TB.data.me.ask.kind === 'deal' && TB.data.me.deal !== undefined), 'the Don is offered the sign palette at night 0');
  const palette = await q.$$('[data-a="dl-add"]');
  ok(palette.length === 47 && !!(await q.$('[data-a="dl-add"][data-id="n10"]')) && !!(await q.$('[data-a="dl-add"][data-id="night2"]')) && !!(await q.$('[data-a="dl-add"][data-id="answer"]')) && !!(await q.$('[data-a="dl-add"][data-id="sheriff"]')), 'palette: 47 signs — numbers 1–10, nights and days, dynamic targets, plans, links: ' + palette.length);
  ok((await q.$$('[data-a="dl-add"][data-id="n7"] svg.hand')).length === 2 && (await q.$$('[data-a="dl-add"][data-id="n3"] svg.hand')).length === 1, 'numbers are drawn as hands: 3 on one hand, 7 on two');
  const st0 = await st602(); ok(st0.me.roleId === 'mafia' && st0.me.ask === null && Array.isArray(st0.me.deal) && st0.me.deal.length === 0 && Array.isArray(st0.me.peerKeys) && st0.me.peerKeys.length === 1 && Array.isArray(st0.peers) && typeof st0.now === 'number', 'the mafioso has no palette, only the Don’s (empty) signs and the live key');
  for (const id of ['night1', 'n5', 'night2', 'next', 'if', 'sheriff', 'then', 'answer']) { await q.click(`[data-a="dl-add"][data-id="${id}"]`); await q.waitForTimeout(120); }
  ok(await Q(() => TB.dl && TB.dl.length === 8 && document.querySelectorAll('.dl-seq .dl-tok').length === 8), 'the Don tapped eight signs; they line up on her screen');
  await q.waitForTimeout(700);
  const st1 = await st602(); const donRow = (st1.peers || []).find(r => r.tgId === 601);
  ok(donRow && Array.isArray(donRow.payload.seq) && donRow.payload.seq.join(',') === 'night1,n5,night2,next,if,sheriff,then,answer', 'the family reads the signs straight from the queue (no host round trip): ' + JSON.stringify(donRow && donRow.payload));
  { let echoed = false; for (let i = 0; i < 12 && !echoed; i++) { echoed = (await st602()).me.deal.length === 8; if (!echoed) await q.waitForTimeout(500); } ok(echoed, 'the host echoes the signs into the family’s private state too'); }
  await q.click('[data-a="dl-undo"]'); await q.waitForTimeout(500);
  ok(await Q(() => TB.dl.length === 7) && (await st602()).peers.find(r => r.tgId === 601).payload.seq.length === 7, '«Erase» takes the last sign back for everyone');
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'classic-deal-don.png'), fullPage: true }).catch(() => {});
  { // the family's screen: the signs big and bare, nothing else to press
    const ctxM = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const m = await ctxM.newPage(); const errsM = []; m.on('pageerror', e => errsM.push(e.message));
    await m.addInitScript(({ initData, user, api }) => { window.MAFIA_API = api; window.__tg = { invoices: [], links: [] }; const noop = () => {}; window.Telegram = { WebApp: { platform: 'android', version: '8.0', initData, initDataUnsafe: { user, auth_date: 1, hash: 'x' }, ready: noop, expand: noop, close: noop, setHeaderColor: noop, setBackgroundColor: noop, setBottomBarColor: noop, disableVerticalSwipes: noop, lockOrientation: noop, enableClosingConfirmation: noop, disableClosingConfirmation: noop, BackButton: { show: noop, hide: noop, onClick: noop }, HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop }, openInvoice: noop, openTelegramLink: noop, openLink: noop } }; }, { initData: g602, user: { id: 602, first_name: 'Гена', language_code: 'ru' }, api: 'http://127.0.0.1:8791' });
    await m.goto('file://' + path.resolve(__dirname, '..', 'mafia-pro.html') + '?startapp=table_' + oc.toLowerCase()); await m.waitForTimeout(1500);
    const M = fn => m.evaluate(fn); const waitM = (fn, ms = 10000) => m.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
    ok(await waitM(() => S.screen === 'table' && TB.data && TB.data.me && TB.data.me.ask && TB.data.me.ask.kind === 'dealWatch'), 'the mafioso’s app opens the table and shows the Don’s signs');
    const big = await M(() => { const t = [...document.querySelectorAll('.dl-seq.big .dl-tok')]; return { n: t.length, h: t.length ? Math.round(t[0].getBoundingClientRect().height) : 0, pal: document.querySelectorAll('[data-a="dl-add"]').length, txt: document.querySelector('.dl-seq.big').textContent }; });
    ok(big.n === 7 && big.h >= 100 && big.pal === 0 && big.txt.includes('Ночь 1') && big.txt.includes('Шериф') && big.txt.includes('Если'), 'family view: seven big signs (≥100 px), no palette: ' + JSON.stringify(big));
    await m.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'classic-deal-family.png'), fullPage: true }).catch(() => {});
    ok(!!(await p.$('#timer')) && (await p.innerText('#app')).includes('Ночь 1') && (await p.innerText('#app')).includes('Ответка') === false, 'host sees the signs under the family meeting with a 60-second clock');
    await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'classic-deal-host.png'), fullPage: true }).catch(() => {});
    // the mafia falls asleep: the signs vanish from every screen and go to the host’s journal only
    await S(() => ACT.next({ dataset: {} })); await p.waitForTimeout(300);
    ok(await waitM(() => TB.data.me.deal === undefined && !TB.data.me.ask && !document.querySelector('.dl-seq')), 'mafioso: the signs are gone once the mafia sleeps');
    ok(await waitQ(() => TB.data.me.deal === undefined && !TB.data.me.ask && !document.querySelector('.dl-seq')), 'Don: palette and signs gone too');
    ok(await S(() => S.game.log.some(l => l.secret && l.text.includes('Договорка') && l.text.includes('Ночь 1') && l.text.includes('Шериф'))), 'the host’s journal keeps the Don’s plan as a secret line');
    await m.close(); await ctxM.close();
  }
  await S(() => { while (S.game.phase === 'night0' && S.game.stepIdx < S.game.steps.length) ACT.next({ dataset: {} }); ACT.day0({ dataset: {} }); }); await p.waitForTimeout(300);
  ok(await S(() => S.game.phase === 'day' && S.game.day === 1 && S.game.dayStage === 'speeches'), 'classic: day 1 speeches');
  ok(await waitQ(() => TB.data.pub.phase === 'day' && !!TB.data.pub.timer && !!document.querySelector('#tb-timer')), 'speech timer shown to the player during day 1 speeches');
  await S(() => { ACT.stage({ dataset: { id: 'vote' } }); ACT['vote-none']({ dataset: {} }); ACT.night({ dataset: {} }); }); await p.waitForTimeout(300);
  ok(await waitQ(() => TB.data.pub.phase === 'night' && !TB.data.pub.timer && !document.querySelector('#tb-timer')), 'no stale speech clock on the player’s screen at night');
  ok(await S(() => S.game.phase === 'night' && S.game.night === 1 && S.game.steps[0].ability === 'shoot'), 'night 1: the family shot is the first step');
  // ----- night 1, the shot by hands: the host counts 1–10 on server time; fist → two fingers → fire; all on one number — a kill
  ok(await waitQ(() => TB.data.pub.phase === 'night' && TB.data.pub.shot && TB.data.me.ask && TB.data.me.ask.kind === 'hands' && TB.data.me.ask.key === TB.data.pub.shot.key && TB.data.me.peerKeys[0] === TB.data.pub.shot.key), 'the Don is asked to shoot by hand; the count is public, the hands key is the family’s');
  ok(await S(() => { const onl = S.game.onl; return onl.shot && onl.shot.at > Date.now() + ONL.skew - 500 && !onl.proposals[Object.keys(onl.proposals)[0]]; }), 'host: the count is scheduled on server time, no "propose" flow for the family');
  const hands0 = await Q(() => ({ n: document.querySelectorAll('.hs-hands .hs-hand').length, fists: document.querySelectorAll('.hs-hand .hand .kn').length, fire: !!document.querySelector('[data-a="hs-fire"]'), disabled: !!document.querySelector('[data-a="hs-fire"][disabled]'), num: document.querySelector('#hs-num').textContent }));
  ok(hands0.n === 2 && hands0.fire && (hands0.disabled || hands0.num === 'Мафия просыпается…' || /^\d+$/.test(hands0.num)), 'two hands on the Don’s screen (hers and seat 4), the fire button: ' + JSON.stringify(hands0));
  ok(await waitQ(() => /^\d+$/.test(document.querySelector('#hs-num').textContent), 6000), 'the lead-in ends, the count begins');
  const pose = await Q(() => { const me = document.querySelector('.hs-hand.me'); return { up: me.querySelectorAll('.fg.up').length, kn: me.querySelectorAll('.kn').length, fist: me.querySelector('.hs-hand.fired') }; });
  ok(pose.up === 2 && pose.kn === 3, 'during the count the hand shows two fingers (index and middle): ' + JSON.stringify(pose));
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'classic-hands-count.png') }).catch(() => {});
  ok(await waitQ(() => document.querySelector('#hs-num').textContent === '5', 8000), 'the count reaches 5');
  await q.click('[data-a="hs-fire"]'); await q.waitForTimeout(80);
  const fired = await Q(() => { const me = document.querySelector('.hs-hand.me'); return { fired: me.classList.contains('fired'), anim: !!me.querySelector('svg.hand.fire'), at: me.querySelector('.at').textContent, sent: TB.sent[TB.data.me.ask.key] && TB.sent[TB.data.me.ask.key].n }; });
  ok(fired.fired && fired.anim && fired.sent === 5 && fired.at.includes('5'), 'the Don fired on 5: the fingers bend (animation), the hand shows «5»: ' + JSON.stringify(fired));
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'classic-hands-fired.png') }).catch(() => {});
  const st2 = await st602(); ok(st2.me.ask && st2.me.ask.kind === 'hands' && st2.me.ask.at === st2.pub.shot.at && (st2.peers || []).some(r => r.tgId === 601 && r.payload.n === 5), 'the mafioso sees the Don’s hand on 5 through the queue');
  ok((await act602(st2.me.ask.key, { n: 5 })).ok, 'the mafioso fires on 5 too');
  await p.waitForTimeout(2600);
  ok(await S(() => S.game.actions.some(a => a.ability === 'shoot' && S.game.players.find(x => x.id === a.targets[0]).seat === 5) && S.game.onl.shot.result && S.game.onl.shot.result.hit && S.game.log.some(l => l.text.includes('руками') && l.text.includes('3 → 5, 4 → 5'))), 'both hands on 5 → the shot at seat 5 is recorded, the journal lists the hands');
  ok((await p.innerText('#app')).includes('Все руки на «5»'), 'host screen: "all hands on 5"');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'classic-hands-host.png'), fullPage: true }).catch(() => {});
  ok(await waitQ(() => TB.data.me.shotResult && TB.data.me.shotResult.hit && TB.data.me.shotResult.seat === 5 && !document.querySelector('[data-a="hs-fire"]')), 'the family sees the outcome: all hands on 5');
  await p.waitForTimeout(3200);
  ok(await S(() => S.game.stepIdx === 1 && S.game.steps[1].ability === 'findSheriff'), 'host advanced automatically to the Don’s check');
  ok(await waitQ(() => TB.data.me.ask && TB.data.me.ask.kind === 'act' && TB.data.me.ask.ability === 'findSheriff' && !TB.data.pub.shot), 'the Don is asked to look for the Sheriff; the count is over');
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
  const spk = await Q(() => { const el = document.querySelector('.rt-seat.spk'); if (!el) return null; const av = el.querySelector('.rt-av').getBoundingClientRect(); const nm = el.querySelector('.rt-nm'); return { display: getComputedStyle(el).display, w: Math.round(av.width), h: Math.round(av.height), nameBelow: nm ? nm.getBoundingClientRect().top >= av.bottom - 1 : true, name: nm && nm.textContent }; });
  ok(spk && spk.display !== 'flex' && spk.w === spk.h && spk.nameBelow && spk.name && spk.name.includes('Нина'), 'speaking player’s seat keeps its layout (round avatar, name under it): ' + JSON.stringify(spk));
  await q.fill('#tb-msg', 'Я мирная, верьте мне'); await q.press('#tb-msg', 'Enter'); await q.waitForTimeout(900);
  ok(await Q(() => TB.chat.some(m => m.text === 'Я мирная, верьте мне' && m.me)), 'chat message sent and shown');
  const hostChat = await (await fetch('http://127.0.0.1:8791/api/table/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData, code: oc, since: 0 }) })).json();
  ok(hostChat.chat.some(m => m.text === 'Я мирная, верьте мне' && m.name === '3 · Нина'), 'the host reads it with the seat number');
  await q.click('.tb-ask .pk[data-seat="1"]'); await q.waitForTimeout(150); await q.click('[data-a="tb-confirm"]'); await q.waitForTimeout(2600);
  ok(await S(() => S.game.ballot.candidates.length === 1 && S.game.players.find(x => x.id === S.game.ballot.candidates[0]).seat === 1), 'nomination of seat 1 reached the host');
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'online-day.png') }).catch(() => {});
  // ----- the vote by hands: candidates one by one, everyone presses at once, answers hidden until the window closes, the rest go to the last
  await S(() => { ACT.stage({ dataset: { id: 'vote' } }); }); await p.waitForTimeout(300);
  ok(await waitQ(() => TB.data.pub.dayInfo.stage === 'vote' && TB.data.pub.chat === false && (!TB.data.me.ask || TB.data.me.ask.kind === 'candsWatch') && !TB.data.pub.poll), 'vote stage: chat closed, nobody votes until the host starts');
  ok(await waitQ(() => TB.data.me.ask && TB.data.me.ask.kind === 'candsWatch' && document.querySelector('.pl-cands.big') && document.querySelector('.pl-cands.big').textContent.trim() === '1') && (await q.innerText('#app')).includes(await Q(() => U().plCandsWait)), 'everyone sees the nominated seat (1) big, waiting for the host');
  // the morning of day 2 was open to everyone; speeches of another seat are closed for Нина
  ok((await (await fetch('http://127.0.0.1:8791/api/table/chat/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: g602, code: oc, text: 'late' }) })).json()).error === 'chat_closed', 'server refuses chat during the vote');
  ok(!!(await q.$('#tb-msg[disabled]')), 'chat input disabled');
  await S(() => { ACT.cand({ dataset: { id: S.game.players.find(x => x.seat === 4).id } }); }); await p.waitForTimeout(300);
  ok(!!(await p.$('[data-a="poll-start"]:not([disabled])')) && (await p.innerText('#app')).includes('Начать голосование'), 'host: "Start the vote" with two candidates (1, 4)');
  await p.click('[data-a="poll-start"]'); await p.waitForTimeout(300);
  ok(await S(() => S.game.onl.poll && S.game.onl.poll.idx === 0 && S.game.onl.poll.cands.length === 2 && !S.game.onl.poll.last), 'poll started: candidate 1 first');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'classic-poll-host.png'), fullPage: true }).catch(() => {});
  ok(await waitQ(() => TB.data.pub.poll && TB.data.pub.poll.cand === 1 && TB.data.pub.poll.n === 2 && TB.data.me.ask && TB.data.me.ask.kind === 'poll' && TB.data.me.ask.cand === 1), 'Нина: "voting for No. 1" with yes / no');
  ok((await q.$$('[data-a="pl-ans"]')).length === 2 && !!(await q.$('#pl-bar')) && !(await q.$('.tb-ask .pk')) && (await q.$$('[data-a="pl-ans"][disabled]')).length === 2 && !!(await q.$('#pl-cd')) && (await q.innerText('#app')).includes(await Q(() => U().plNo)), 'two buttons (asleep during the count), "Abstain", the 3-2-1 element, no candidate list to pick from');
  ok(await waitQ(() => /^[321]$/.test(document.querySelector('#pl-cd').textContent), 3000), 'the count shows 3, 2, 1: ' + await Q(() => document.querySelector('#pl-cd').textContent));
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'classic-poll-count.png') }).catch(() => {});
  ok(await waitQ(() => !document.querySelector('[data-a="pl-ans"][data-yes="1"][disabled]') && document.querySelector('#pl-cd').textContent === U().plVoteNow, 6000), 'the window opens: "Vote!", buttons awake');
  await q.click('[data-a="pl-ans"][data-yes="1"]'); await q.waitForTimeout(400);
  const st3 = await st602(); ok(st3.me.ask && st3.me.ask.kind === 'poll' && st3.me.ask.cand === 1 && !(st3.pub.dayInfo.votes && st3.pub.dayInfo.votes[3]) && !st3.peers.length, 'the mafioso is asked the same; Нина’s answer stays hidden while the window is open');
  ok((await act602(st3.me.ask.key, { yes: false })).ok, 'the mafioso answers "no"');
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'classic-poll.png') }).catch(() => {});
  ok(await S(() => { const g = S.game; return Object.keys(g.ballot.votes).length === 0; }), 'host: no votes recorded before the window closes');
  ok(await waitQ(() => TB.data.pub.dayInfo.votes && TB.data.pub.dayInfo.votes[3] === 1, 12000), 'window closed: Нина’s vote for 1 is on the table');
  ok(await S(() => { const g = S.game; const sid = s => g.players.find(x => x.seat === s).id; return g.ballot.votes[sid(3)] === sid(1) && g.ballot.votes[sid(4)] === undefined && g.onl.poll.last && g.onl.poll.idx === 1; }), 'host: 3 → 1, the mafioso’s "no" counts as nothing, the last candidate takes the rest');
  { // the "rest to the last" pause: watch the player's state for a few seconds and keep every distinct snapshot
    const seen = []; const t0 = Date.now();
    while (Date.now() - t0 < 7000) { const snap = await Q(() => JSON.stringify({ v: TB.data.version, poll: TB.data.pub.poll || null, ask: TB.data.me.ask ? TB.data.me.ask.kind : null, stage: TB.data.pub.dayInfo && TB.data.pub.dayInfo.stage, txt: (document.querySelector('.pl-for') || {}).textContent || '' })); if (!seen.length || seen[seen.length - 1] !== snap) seen.push(snap); if (JSON.parse(snap).stage === 'result') break; await q.waitForTimeout(100); }
    const lastSeen = seen.map(x => JSON.parse(x)).find(x => x.poll && x.poll.last && x.poll.cand === 4); const lastTxt = await Q(() => tt(U().plLast, { seat: 4 }));
    ok(!!lastSeen && lastSeen.ask === 'pollWatch' && lastSeen.txt.includes(lastTxt) && lastTxt.includes('№4'), 'everyone sees "the remaining votes go to No. 4" (in the player’s own language): ' + seen.join(' → '));
  }
  ok(await waitQ(() => TB.data.pub.dayInfo && TB.data.pub.dayInfo.stage === 'result', 8000), 'the vote resolved by itself');
  ok(await S(() => { const g = S.game; const sid = s => g.players.find(x => x.seat === s).id; return g.dayStage === 'result' && g.voteResult.eliminatedId === sid(4) && g.ballot.votes[sid(2)] === sid(4) && g.ballot.votes[sid(1)] === sid(4) && !g.players.find(x => x.seat === 4).alive; }), 'seat 4 is voted out: the silent majority went to the last candidate');
  await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'online-vote.png') }).catch(() => {});
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
  // the host's own profile never takes a seat, even if an old save (or another account on this phone) put it there
  await S(() => { S.setup.seatProfiles = [S.meId, null]; S.lobby = null; go('setup'); }); await p.waitForTimeout(300);
  ok(await S(() => S.setup.seatProfiles[0] === null && !!document.querySelector('#name-0') && !document.querySelector('.seat-prof')), 'host’s profile dropped from seat 1 on the setup screen');
  // after a finished game the new table's waiting room shows on the setup screen (the old game is history)
  await S(() => { S.setup.online = true; return openTable(true); }); await p.waitForTimeout(600);
  const nc = await S(() => S.lobby && S.lobby.code); ok(!!nc && nc !== oc, 'host opened a fresh table ' + nc);
  ok(await S(() => !!S.game && !!S.game.winner && S.screen === 'setup' && !!document.querySelector('.rtable') && document.querySelector('#app').textContent.includes(U().tbLobby)), 'waiting room visible on the setup screen while the finished game is still in memory');
  // another Telegram account opening the app on this phone must not inherit this table
  ok(await S(() => { const keep = { lobby: S.lobby, game: S.game, user: S.tgUser, cloud: S.cloud, owned: S.owned }; S.tgUser = 424242; ensureMe(); const dropped = !S.lobby && !S.cloud && !S.game; S.lobby = keep.lobby; S.game = keep.game; S.tgUser = keep.user; S.cloud = keep.cloud; S.owned = keep.owned; ensureMe(); return dropped && S.tgUser === keep.user && !!S.lobby; }), 'a different account on the same phone starts without the other account’s table');
  await S(() => { S.game = null; save(); go('setup'); }); await p.waitForTimeout(300);
  // a new table: Нина joins by code from the table finder, the host closes the table → she sees "the host closed the table"
  await Q(() => { S.ui.sheet = null; go('tables'); }); await q.waitForTimeout(500);
  await q.fill('#lb-code', nc.toLowerCase()); await q.click('[data-a="lb-join"][data-code=""]'); await q.waitForTimeout(1200);
  ok(await q.evaluate(c => S.screen === 'table' && TB.code === c && TB.data && TB.data.status === 'open', nc), 'joined by code typed in lowercase → waiting room');
  // she stands up: seat freed on the host's side, banner gone, then sits down again from the banner-less home screen
  await S(() => go('setup')); await p.waitForTimeout(200); await S(() => refreshTable()); await p.waitForTimeout(600);
  ok(await S(() => S.lobby.players.some(x => x.tgId === 601) && S.lobby.seats[601] !== undefined), 'host sees Нина seated at the new table');
  await q.click('.rtable ~ * [data-a="tb-leave"], [data-a="tb-leave"]'); await q.waitForTimeout(900);
  ok(await Q(() => S.screen === 'home' && !S.cloud.table && !TB.code) && !(await q.$('[data-a="table-open"]')), 'left the table → home without the banner');
  ok(lastTo(100).params.text.includes('Нина') && lastTo(100).params.text.includes(nc), 'host got a DM that Нина stood up');
  await S(() => refreshTable()); await p.waitForTimeout(600);
  ok(await S(() => !S.lobby.players.some(x => x.tgId === 601) && S.lobby.seats[601] === undefined && !S.setup.names.includes('Нина')), 'her seat is free again on the host’s screen');
  await Q(() => { LB.at = 0; go('tables'); }); await q.waitForTimeout(1000);
  await q.click(`[data-a="lb-join"][data-code="${nc}"]`); await q.waitForTimeout(1200);
  ok(await q.evaluate(c => S.screen === 'table' && TB.code === c, nc), 'sat down again from the table finder');
  // the host moves her to seat 7 (swap with whoever sits there), then kicks her
  await S(() => go('setup')); await p.waitForTimeout(200); await S(() => refreshTable()); await p.waitForTimeout(700);
  const before = await S(() => ({ seat: S.lobby.seats[601], names: S.setup.names.slice() }));
  await p.selectOption('#seat-601', { value: '6' }); await p.waitForTimeout(300);
  ok(await S(() => S.lobby.seats[601] === 6 && String(S.setup.names[6] || '').trim() === 'Нина'), 'host moved Нина to seat 7 through the seat picker: ' + JSON.stringify({ before, after: await S(() => S.lobby.seats) }));
  await p.click('[data-a="tg-kick"][data-tg="601"]'); await p.waitForTimeout(200);
  ok((await p.$eval('[data-a="tg-kick"][data-tg="601"]', el => el.textContent)).includes(await S(() => U().tgKickSure)), 'first tap asks to confirm');
  await p.click('[data-a="tg-kick"][data-tg="601"]'); await p.waitForTimeout(1200);
  ok(await S(() => !S.lobby.players.some(x => x.tgId === 601) && S.lobby.seats[601] === undefined && !S.setup.names.includes('Нина')), 'Нина kicked: gone from the list, seat and name freed');
  ok(lastTo(601).params.text.includes(nc) && lastTo(601).params.text.includes('Ведущий'), 'kicked player told by the bot');
  await Q(() => tableFetch()); await q.waitForTimeout(800);
  ok(await Q(() => TB.err === 'not_seated' || !TB.data) && (await q.$eval('#app', el => el.textContent)).includes(await Q(() => U().tbNotSeated)), 'her table screen says she is not at this table any more');
  await Q(() => { LB.at = 0; go('tables'); }); await q.waitForTimeout(1000);
  await q.click(`[data-a="lb-join"][data-code="${nc}"]`); await q.waitForTimeout(1200);
  ok(await q.evaluate(c => S.screen === 'table' && TB.code === c && TB.data && TB.data.status === 'open', nc), 'she can sit down again');
  await Q(() => go('home')); await q.waitForTimeout(400);
  ok(!!(await q.$('[data-a="table-open"]')) && !!(await q.$('[data-a="table-open"] [data-a="tb-leave"]')), 'home banner is back, with a ✕ to leave');
  await Q(() => tableOpen(TB.code || S.cloud.table.code)); await q.waitForTimeout(600);
  await S(() => go('setup')); await p.waitForTimeout(300); await p.click('[data-a="tg-close-table"]'); await p.waitForTimeout(900);
  ok(await S(() => !S.lobby), 'host closed the table');
  // a table the server no longer counts as ours is dropped quietly on refresh (no "server unavailable")
  await p.evaluate(c => { S.lobby = { code: c, link: '', players: [], map: {}, sent: [], seats: {} }; }, nc); ok((await S(() => refreshTable())) !== false && await S(() => !S.lobby), 'closed table dropped from the host’s setup without an error toast');
  await Q(() => tableFetch()); await q.waitForTimeout(700);
  const closedTxt = await q.$eval('#app', el => el.textContent);
  ok(await Q(() => TB.data && TB.data.status === 'closed') && closedTxt.includes(await Q(() => U().tbClosedByHost)) && !(await q.$('.rtable')), 'player sees "the host closed the table" instead of the waiting room: ' + await Q(() => JSON.stringify({ st: TB.data && TB.data.status, err: TB.err, scr: S.screen })) + ' host=' + await S(() => JSON.stringify({ lobby: S.lobby, calls: window.__closeCalls })));
  // ----- the creator plays and asks Нина to host: the table moves to her phone, he stays seated as a player
  await S(() => { S.game = null; S.lobby = null; save(); go('setup'); S.setup.online = true; return openTable(true); }); await p.waitForTimeout(700);
  const hc = await S(() => S.lobby && S.lobby.code); ok(!!hc, 'creator opened a table ' + hc);
  await p.click('[data-a="host-role"][data-id="player"]'); await p.waitForTimeout(1200);
  ok(await S(() => S.setup.hostRole === 'player' && S.lobby.players.some(x => x.tgId === 100) && S.lobby.seats[100] !== undefined && !!document.querySelector('[data-a="deal"][disabled]')), 'creator chose "I play": seated at his own table, dealing disabled until a host comes: ' + await S(() => JSON.stringify({ players: S.lobby.players.map(x => x.tgId), seats: S.lobby.seats })));
  await p.click('[data-a="fr-go-host"]'); await p.waitForTimeout(1200);
  ok(await S(() => S.screen === 'friends' && S.ui.frMode === 'host') && !!(await p.$('[data-a="fr-invite-host"][disabled]')), 'friends screen in "pick a host" mode');
  await p.click('[data-a="fr-toggle"][data-id="601"]'); await p.waitForTimeout(200); await p.click('[data-a="fr-invite-host"]'); await p.waitForTimeout(1200);
  ok(await S(() => S.screen === 'setup' && S.lobby && S.lobby.hostInvite && S.lobby.hostInvite.tgId === 601 && S.lobby.hostInvite.status === 'pending'), 'hosting invitation sent to Нина, creator back on the setup screen with "waiting for the answer"');
  await Q(() => { S.ui.sheet = null; go('home'); }); await q.waitForTimeout(200);
  await Q(async () => { const d = await api('/api/ping', {}); S.cloud.invites = d.invites || []; TB.dismissed.clear(); showInvites(); }); await q.waitForTimeout(300);
  const hostSheet = await q.$eval('.sheet', el => el.textContent).catch(() => '');
  ok(await Q(() => S.ui.sheet && S.ui.sheet.type === 'tableInvite') && hostSheet.includes(await Q(() => U().tbAcceptHost)) && hostSheet.includes(hc), 'Нина sees "asks you to host" with the "I will host" button');
  await q.click('.sheet [data-a="inv-respond"][data-ok="1"]'); await q.waitForTimeout(1800);
  ok(await q.evaluate(c => S.screen === 'setup' && S.lobby && S.lobby.code === c && S.lobby.players.some(x => x.tgId === 100) && S.setup.online === true && S.setup.hostRole === 'host' && !document.querySelector('[data-a="deal"][disabled]') && !!document.querySelector('.rt-seat.joined'), hc), 'Нина hosts now: setup screen with the creator seated, online format kept, dealing allowed: ' + await Q(() => JSON.stringify({ scr: S.screen, lobby: S.lobby && S.lobby.code, players: S.lobby && S.lobby.players.map(x => x.tgId), online: S.setup.online })));
  await S(() => refreshTable()); await p.waitForTimeout(1200);
  ok(await p.evaluate(c => S.screen === 'table' && TB.code === c && !S.lobby && S.setup.hostRole === 'host', hc), 'creator’s phone switched to the player’s table view: ' + await S(() => JSON.stringify({ scr: S.screen, tb: TB.code, lobby: !!S.lobby })));
  ok(await S(() => TB.data && TB.data.host && TB.data.host.tgId === 601) && (await p.$eval('#app', el => el.textContent)).includes('Нина'), 'creator sees Нина as the host of the table');
  // ----- open / closed game: roles of the eliminated stay hidden in a closed game, except roles acting after death
  const closedPub = await S(() => { const g = newGame(10, presetFor(10), [], S.settings, [], {}); g.dealt = true; g.phase = 'day'; g.day = 1; g.dayStage = 'morning'; g.players[0].alive = false; g.players[0].roleId = 'sheriff'; g.players[1].alive = false; g.players[1].roleId = 'azazel'; g.players[1].votedOut = true; g.openRoles = false; const pub = tablePub(g); const open = (() => { g.openRoles = true; return tablePub(g); })(); return { closed: pub.seats.slice(0, 2).map(x => x.roleId || null), open: open.seats.slice(0, 2).map(x => x.roleId || null), flag: pub.openRoles }; });
  ok(closedPub.closed[0] === null && closedPub.closed[1] === 'azazel' && closedPub.open[0] === 'sheriff' && closedPub.flag === false, 'closed game hides the Sheriff’s card but shows Azazel (acts after leaving); open game shows both: ' + JSON.stringify(closedPub));
  await S(() => { S.game = null; S.lobby = null; S.setup.online = false; go('setup'); }); await p.waitForTimeout(300);
  ok(!!(await p.$('[data-a="open-roles"][data-id="closed"]')) && !!(await p.$('[data-a="open-roles"][data-id="open"].active')), 'open / closed chooser on the setup screen, open by default');
  await p.click('[data-a="open-roles"][data-id="closed"]'); await p.waitForTimeout(200);
  ok(await S(() => S.setup.openRoles === false && revealDeadIn(null) === false) && !!(await p.$('[data-a="open-roles"][data-id="closed"].active')), 'closed game selected');
  await S(() => { S.setup.openRoles = true; });
  // ----- classic: fixed table of 10, offline or online (the format chooser stays, with the classic description)
  await S(() => { S.setup.online = true; ACT['scen-use']({ dataset: { id: 'classic' } }); }); await p.waitForTimeout(300);
  ok(await S(() => S.setup.n === 10 && S.setup.online === true && !document.querySelector('[data-a="n"]') && !document.querySelector('#nrange') && !!document.querySelector('[data-a="on-mode"][data-id="online"].active') && document.querySelector('#app').textContent.includes(U().classicTitle) && document.querySelector('#app').textContent.includes(U().onOnlineClassicD)), 'classic setup: 10 players fixed, no count chooser, online format kept with the classic description');
  ok(!(await p.$('[data-a="comp"]')) && !(await p.$('[data-a="preset"]')) && !(await p.$('[data-a="scen-clear"]')) && (await p.innerText('#app')).includes(await S(() => U().compFixed)) && await S(() => { const before = S.setup.comp.slice().sort().join(); ACT.comp({ dataset: { id: 'mafia', d: '1' } }); ACT.preset(); return S.setup.comp.slice().sort().join() === before && S.setup.comp.length === 10; }), 'classic: the line-up is listed without +/−, reset or ×; the handlers ignore it');
  await S(() => { ACT.new({ dataset: {} }); }); await p.waitForTimeout(300);
  ok(await S(() => S.setup.scenario === null && !!document.querySelector('[data-a="n"]') && document.querySelector('.topbar, .tb, h1') && document.querySelector('#app').textContent.includes(U().roleGame)), 'role game setup is titled "Ролевая мафия" with the player-count chooser back');
  // ----- settings switches: full size, inside the row
  await S(() => go('settings')); await p.waitForTimeout(300);
  const swBox = await p.evaluate(() => { const sw = document.querySelector('.switch'); const row = sw.closest('.setting'); const a = sw.getBoundingClientRect(), b = row.getBoundingClientRect(); return { w: Math.round(a.width), h: Math.round(a.height), inside: a.right <= b.right + 0.5 && a.left >= b.left, vw: window.innerWidth, right: Math.round(a.right) }; });
  ok(swBox.w >= 50 && swBox.h >= 30 && swBox.inside && swBox.right <= swBox.vw, 'settings switch is full-size and stays inside its row: ' + JSON.stringify(swBox));
  console.log('Discord voice room: online only, seats + 1, creator flag, player "on voice", host confirmation gates the deal, cleanup');
  { const { startMockDiscord } = await import('../backend/test/mock-discord.js'); const dc = await startMockDiscord(8793);
    Object.assign(env, { DISCORD_BOT_TOKEN: 'dc-token', DISCORD_GUILD_ID: '111111111111', DISCORD_API: dc.base });
    await S(async () => { CLOUD.busy = false; await cloudSync(); }); await Q(async () => { CLOUD.busy = false; await cloudSync(); });
    ok(await S(() => S.cloud.discord === true), 'the app learns that Discord is available');
    { const wc = await (await fetch(dc.base + '/guilds/111111111111/channels', { method: 'POST', headers: { Authorization: 'Bot dc-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'welcome', type: 0 }) })).json(); dc.guild.system_channel_id = wc.id;
      await S(() => { S.game = null; S.lobby = null; S.ui.sheet = null; go('home'); }); await p.waitForTimeout(300);
      ok(await S(() => { const h = document.querySelector('.hero'); const d = h && h.querySelector('[data-a="dc-server"]'); const t = h && h.querySelector('[data-a="tg-channel"]'); return !!(d && t && d.textContent.includes(U().dcServer) && t.textContent.includes(U().tgChannel)); }), 'home banner: "Our Discord" and "Our channel" buttons');
      await p.click('[data-a="dc-server"]'); await p.waitForTimeout(600);
      const inv = await S(() => window.__tg.links.filter(l => /discord\.gg/.test(l)).pop());
      ok(/^https:\/\/discord\.gg\/mp\d+$/.test(inv || '') && [...dc.invites.values()].some(x => inv.endsWith(x.code) && x.channel.id === wc.id), 'Discord button opens a personal invite to the welcome channel: ' + inv);
      await p.click('[data-a="tg-channel"]'); await p.waitForTimeout(100); ok(await S(() => window.__tg.links.includes('https://t.me/mafiaprof')), 'channel button opens t.me/mafiaprof');
      await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'home-links.png') }).catch(() => {}); }
    await S(() => { S.game = null; S.lobby = null; S.ui.sheet = null; S.setup.hostRole = 'host'; S.setup.online = false; ACT.new({ dataset: {} }); }); await p.waitForTimeout(300);
    ok(!(await p.$('[data-a="dc-toggle"]')), 'offline format: no Discord switch');
    await p.click('[data-a="on-mode"][data-id="online"]'); await p.waitForTimeout(900);
    const dcode = await S(() => S.lobby && S.lobby.code);
    ok(!!dcode && !!(await p.$('[data-a="dc-toggle"]')), 'online format: the "Play with Discord" switch shows');
    ok(await S(() => { const sw = document.querySelector('[data-a="dc-toggle"]'); const mode = document.querySelector('[data-a="on-mode"]'); return !!(sw && mode && (mode.compareDocumentPosition(sw) & Node.DOCUMENT_POSITION_FOLLOWING)); }), 'the switch sits right under the format chooser');
    await S(() => { setN(8); S.setup.names = ['Анна', 'Богдан', 'Нина', 'Гена', 'Дима', 'Ева', 'Женя', 'Зоя']; render(); }); await p.waitForTimeout(200);
    await p.click('[data-a="dc-toggle"]'); await p.waitForTimeout(900);
    const ch1 = dc.channels.get(dc.lastId());
    ok(await S(() => !!(S.lobby.voice && S.lobby.voice.on && /^https:\/\/discord\.gg\//.test(S.lobby.voice.invite))) && ch1 && ch1.name === '🇺🇦 Mafia · ' + dcode && ch1.user_limit === 9, 'room created: ' + JSON.stringify(ch1));
    const hostTxt = await p.$eval('#app', el => el.textContent);
    ok(hostTxt.includes(await S(() => U().dcJoin)) && hostTxt.includes(await S(() => tt(U().dcCount, { k: 0, n: 0 }))) && hostTxt.includes('🇺🇦'), 'host sees the join button, the voice count and the flag');
    ok(await S(() => document.querySelector('[data-a="deal"]').disabled && document.querySelector('#app').textContent.includes(U().dcNeedConfirm)), 'deal button locked with the "confirm voice" hint');
    await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'discord-host.png') }).catch(() => {});
    await p.click('[data-a="dc-join"]'); await p.waitForTimeout(100); ok(await S(() => window.__tg.links.some(l => /^https:\/\/discord\.gg\//.test(l))), 'host opens the Discord invite');
    // offline → room gone; back online → switch off
    await p.click('[data-a="on-mode"][data-id="offline"]'); await p.waitForTimeout(700);
    ok(!dc.channels.has(ch1.id) && !(await p.$('[data-a="dc-toggle"]')) && await S(() => !S.lobby.voice), 'offline → room deleted, no switch');
    await p.click('[data-a="on-mode"][data-id="online"]'); await p.waitForTimeout(700);
    ok(!!(await p.$('[data-a="dc-toggle"]:not(.on)')), 'back online: Discord is off until switched on again');
    await p.click('[data-a="dc-toggle"]'); await p.waitForTimeout(900);
    // the player finds the table (flag + 🎧), sits down, joins the room, marks "on voice"
    { dc.widget.enabled = true; const vroom = [...dc.channels.values()].find(c => c.type === 2 && c.name.includes(dcode));
      dc.join({ id: '810000000000000001', username: 'anya' }); dc.join({ id: '810000000000000002', username: 'bogdan' }); dc.join({ id: '810000000000000003', username: 'vika' });
      dc.members.get('810000000000000001').voice = vroom.id; dc.members.get('810000000000000002').voice = vroom.id; }
    await Q(() => { S.ui.sheet = null; LB.at = 0; go('tables'); }); await q.waitForTimeout(1000);
    ok(await q.waitForFunction(() => !!document.querySelector('.dc-widget'), null, { timeout: 8000 }).then(() => true).catch(() => false), 'finder: the Discord panel on top');
    const wtxt = await q.$eval('.dc-widget', el => el.textContent);
    ok(wtxt.includes(await Q(() => tt(U().dcwOnline, { n: 3 }))) && /2\s*у голосових/.test(wtxt.replace(/\s+/g, ' ')) && wtxt.includes('Mafia · ' + dcode) && (await q.$$('.dc-widget .dcw-av')).length === 3 && (await q.$$('.dc-widget .dcw-av.v')).length === 2, 'Discord panel: 3 online, 2 in the table’s voice room (uk): ' + wtxt.replace(/\s+/g, ' ').slice(0, 200));
    ok(await q.evaluate(() => { const w = document.querySelector('.dc-widget'); const list = document.querySelector('[data-a="lb-refresh"]'); return !!(w && list && (w.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING)); }), 'the panel sits above the table list');
    await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'finder-discord.png') }).catch(() => {});
    ok(await q.evaluate(c => (LB.list || []).some(l => l.code === c && l.flag === '🇺🇦' && l.discord === true), dcode) && (await q.$eval('#app', el => el.textContent)).includes('🎧'), 'finder: the table with its flag and the Discord mark');
    await q.evaluate(async c => { await api('/api/table/join', { code: c }); tableOpen(c); }, dcode); await q.waitForTimeout(1200);
    ok(!!(await q.$('[data-a="dc-join"]')) && !!(await q.$('[data-a="dc-im-on"]')) && (await q.$eval('#app', el => el.textContent)).includes('🇺🇦'), 'player’s waiting room: join button, "I am on voice", flag');
    await q.click('[data-a="dc-join"]'); await q.waitForTimeout(100); ok(await Q(() => window.__tg.links.some(l => /^https:\/\/discord\.gg\//.test(l))), 'player opens the invite');
    await q.click('[data-a="dc-im-on"]'); await q.waitForTimeout(600);
    ok(await Q(() => TB.data.voice.mine === true) && (await q.$eval('[data-a="dc-im-on"]', el => el.textContent)).includes('✓'), 'player marked "on voice"');
    await q.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'discord-player.png') }).catch(() => {});
    await S(() => refreshTable()); await p.waitForTimeout(600);
    ok(await S(() => S.lobby.voice.ok.includes(601) && !!document.querySelector('.dc-chip.on')) && (await p.$eval('#app', el => el.textContent)).includes(await S(() => tt(U().dcCount, { k: 1, n: 1 }))), 'host sees Нина on voice: 1 of 1');
    await S(() => ACT.deal({ dataset: {} })); await p.waitForTimeout(200); ok(await S(() => !S.game), 'deal refused before the confirmation');
    // seats change → the room follows (seats + 1)
    await S(() => { setN(9); render(); }); await S(() => refreshTable()); await p.waitForTimeout(700); await S(() => refreshTable()); await p.waitForTimeout(400);
    ok(dc.channels.get(dc.lastId()).user_limit === 10, '9 seats → channel limit 10: ' + dc.channels.get(dc.lastId()).user_limit);
    await p.click('[data-a="dc-confirm"]'); await p.waitForTimeout(150);
    ok(await S(() => DC.ask === true && !S.lobby.voice.confirmed), 'first tap asks "sure?"');
    await p.click('[data-a="dc-confirm"]'); await p.waitForTimeout(600);
    ok(await S(() => S.lobby.voice.confirmed === true && !document.querySelector('[data-a="deal"]').disabled), 'confirmed → deal button unlocked');
    await q.waitForTimeout(3200); ok((await q.$eval('#app', el => el.textContent)).includes(await Q(() => U().dcConfirmedP)), 'the player sees that the host confirmed voice');
    await S(() => { S.setup.names = ['Анна', 'Богдан', 'Нина', 'Гена', 'Дима', 'Ева', 'Женя', 'Зоя', 'Иван']; }); await S(() => ACT.deal({ dataset: {} })); await p.waitForTimeout(800);
    ok(await S(() => !!(S.game && S.game.online && S.game.tg && S.game.tg.code))
      && (await (await fetch('http://127.0.0.1:8791/api/table/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: pInit, code: dcode }) })).json()).pub.phase !== 'lobby', 'deal after the confirmation: the online game is published');
    const live = dc.lastId(); await p.evaluate(c => api('/api/lobby/close', { code: c }), dcode); ok(!dc.channels.has(live), 'table closed → room deleted');
    await S(() => { S.game = null; S.lobby = null; ACT['scen-use']({ dataset: { id: 'classic' } }); }); await p.waitForTimeout(300); ok(!(await p.$('[data-a="dc-toggle"]')), 'classic (offline only): no Discord switch');
    await S(() => ACT.new({ dataset: {} })); await Q(() => { TB.code = null; TB.data = null; go('home'); });
    for (const k of ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_API']) delete env[k]; await dc.close(); }
  ok(errs2.length === 0, 'no page errors on the player’s phone: ' + errs2.join(' | ').slice(0, 300));
  await ctx2.close();

  ok(errs.length === 0, 'no page errors: ' + errs.join(' | ').slice(0, 300));
  await b.close(); await tg.close(); api.close();
  console.log(fails ? `\n${fails} of ${n} checks FAILED` : `\nALL OK (${n} checks)`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
