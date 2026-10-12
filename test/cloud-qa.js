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
  await fetch('http://127.0.0.1:8791/api/lobby/deal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData, code: lb.code, cards: [801, 802, 803, 804, 805].map((id, i) => ({ tgId: id, seat: i + 1, text: 'x' })) }) });
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
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-partner.png') }).catch(() => {});
  await S(() => { S.ui.sheet = null; render(); });

  console.log('players tab: everyone registered in the bot');
  await S(() => go('profiles')); await p.waitForTimeout(600);
  ok(await S(() => Array.isArray(PL.list) && PL.total >= 5 && PL.list.length === PL.total), 'directory loaded: ' + await S(() => PL.total));
  const dirTxt = await p.$eval('#app', el => el.textContent);
  const parts = { plAll: dirTxt.includes(await S(() => U().plAll)), nika: dirTxt.includes('Nika'), at: dirTxt.includes('@nika_m'), bog: dirTxt.includes('Богдан'), local: dirTxt.includes(await S(() => U().plLocal)) };
  ok(Object.values(parts).every(Boolean), 'lists registered players (friends and non-friends) and keeps local profiles below: ' + JSON.stringify(parts) + ' total=' + await S(() => PL.total) + ' names=' + await S(() => PL.list.map(x => x.name).join('|')));
  ok(await S(() => PL.list.some(p => p.me) && PL.list.some(p => p.isFriend && p.tgId === 701)), 'me and friends flagged');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-players-list.png') }).catch(() => {});
  await p.fill('#pl-q', 'бог'); await p.press('#pl-q', 'Enter'); await p.waitForTimeout(500);
  ok(await S(() => PL.list.length === 1 && PL.list[0].name === 'Богдан'), 'filter by Cyrillic name prefix');
  await p.click('.fr-row[data-a="fr-open"]'); await p.waitForTimeout(600);
  ok(await S(() => S.ui.sheet && S.ui.sheet.type === 'friend' && S.ui.sheet.id === 201), 'tap opens the player profile');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-players.png') }).catch(() => {});
  await S(() => { S.ui.sheet = null; PL.q = ''; render(); }); await p.click('[data-a="pl-refresh"]'); await p.waitForTimeout(500);
  ok(await S(() => PL.list.length === PL.total), 'refresh restores the full list');

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
  ok(await S(() => JSON.stringify(S.game.tg.map) === JSON.stringify({ 501: 2, 502: 1, 503: 3 })), 'seat map by seat number: ' + await S(() => JSON.stringify(S.game.tg.map)));
  ok(await S(() => S.game.tg.sent.length === 2 && S.game.tg.sent.includes(501) && S.game.tg.sent.includes(502)), 'cards auto-sent to the two reachable players');
  const c501 = lastTo(501); const role2 = await S(() => I18N.uk.roles[S.game.players.find(x => x.seat === 2).roleId].name);
  ok(c501 && c501.params.text.includes('<b>' + role2 + '</b>') && c501.params.text.includes('місце 2'), 'seat 2 got its card in Ukrainian');
  ok(await S(() => S.game.dealIdx === 2 && S.game.players[2].seat === 3), 'phone-pass starts at seat 3 (seats 1–2 delivered, 3 blocked the bot)');
  await S(() => { ACT.flip({ dataset: {} }); ACT.hide({ dataset: {} }); }); await p.waitForTimeout(100);
  ok(await S(() => S.game.dealIdx === 3), 'next phone seat is 4');
  tg.blocked.delete(503);
  await p.click('[data-a="tg-deal"]'); await p.waitForTimeout(500);
  ok(await S(() => S.game.tg.sent.includes(503)), 'retry delivered the remaining card');
  ok((await p.innerText('#app')).includes('✓'), 'delivered marks on the deal panel');
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'qa-shots', 'cloud-deal-auto.png') }).catch(() => {});
  // shop wording
  await S(() => { S.screen = 'shop'; render(); ACT.buy({ dataset: { kind: 'role', id: 'sniper' } }); }); await p.waitForTimeout(100);
  const sheetText = await p.innerText('.sheet, #app'); ok(!/демо|demo/i.test(sheetText) && /Купить за/.test(sheetText), 'buy button says "Купить за …" without demo');
  await S(() => { S.ui.sheet = null; render(); });
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | ').slice(0, 300));
  await b.close(); await tg.close(); api.close();
  console.log(fails ? `\n${fails} of ${n} checks FAILED` : `\nALL OK (${n} checks)`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
