// Click-through audit: in Telegram mode with the real worker, visit every screen and press every button once.
// Fails on page errors, handler exceptions, "undefined"/"NaN" in the text, or a screen that renders empty. node test/audit.js
const { chromium } = require('playwright');
const path = require('path'); const http = require('http');
(async () => {
  const { makeD1 } = await import('../backend/test/d1-shim.js');
  const { startMockTelegram } = await import('../backend/test/mock-telegram.js');
  const { signInitData } = await import('../backend/src/tg.js');
  const worker = (await import('../backend/src/index.js')).default;
  const tg = await startMockTelegram(8796);
  const env = { DB: makeD1(path.join(__dirname, '..', 'backend', 'schema.sql')), BOT_TOKEN: 'test-token', WEBHOOK_SECRET: 'hook', APP_URL: 'https://shakaboom55566.github.io/mafia-pro/', ALLOWED_ORIGIN: '*', TELEGRAM_API: tg.base, ADMIN_IDS: '100' };
  const api = http.createServer((req, res) => { let b = ''; req.on('data', c => { b += c; }); req.on('end', async () => {
    const r = await worker.fetch(new Request('http://127.0.0.1:8797' + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : b }), env, { waitUntil() {} });
    const h = {}; r.headers.forEach((v, k) => { h[k] = v; }); res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer())); }); });
  await new Promise(r => api.listen(8797, '127.0.0.1', r));
  const hook = upd => worker.fetch(new Request('http://x/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': 'hook' }, body: JSON.stringify(upd) }), env, { waitUntil() {} });
  const post = async (p, body) => (await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env, { waitUntil() {} })).json();
  const sign = u => signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), query_id: 'Q' + u.id, user: u }, 'test-token');
  const hostUser = { id: 100, first_name: 'Ведущий', username: 'host100', language_code: 'ru' };
  const initData = await sign(hostUser);
  // seed: friends, a club with members, a partner, players at a table, a recorded game
  for (const [id, name, lang] of [[201, 'Богдан', 'uk'], [202, 'Ева', 'pl'], [203, 'Guest', 'en'], [204, 'Нина', 'uk']]) await hook({ update_id: id, message: { message_id: 1, from: { id, first_name: name, language_code: lang }, chat: { id, type: 'private' }, text: '/start' } });
  const me = await post('/api/me', { initData });
  for (const id of [201, 202]) await post('/api/friends/accept', { initData: await sign({ id, first_name: 'F' + id, language_code: 'en' }), code: me.invite.code });
  await post('/api/friends/request', { initData: await sign({ id: 203, first_name: 'Guest', language_code: 'en' }), tgId: 100 });
  const cl = await post('/api/club/apply', { initData, name: 'Клуб Аудит', city: 'Київ', about: 'Тест', link: 't.me/audit' });
  await post('/api/admin/club', { initData, id: cl.id, approve: true });
  await post('/api/club/invite', { initData, q: '201' }); await post('/api/club/respond', { initData: await sign({ id: 201, first_name: 'Богдан', language_code: 'uk' }), id: cl.id, accept: true });
  await post('/api/club/join', { initData: await sign({ id: 204, first_name: 'Нина', language_code: 'uk' }), id: cl.id });
  await post('/api/club/chat/send', { initData, text: 'Привет' });
  await post('/api/partner/apply', { initData: await sign({ id: 202, first_name: 'Ева', language_code: 'pl' }), name: 'Партнёр', channel: 't.me/p', audience: '100' });
  await post('/api/game/result', { initData, game: { id: 'seed-1', mode: 'classic', winner: 'city', players: [{ seat: 1, name: 'Богдан', tgId: 201, roleId: 'sheriff', won: true, points: 31, side: 'city' }, { seat: 2, name: 'Ева', tgId: 202, roleId: 'don', won: false, points: -10, side: 'mafia' }] } });
  const lob = await post('/api/lobby', { initData, fresh: true });
  for (const [id, name, lang] of [[201, 'Богдан', 'uk'], [202, 'Ева', 'pl']]) await hook({ update_id: 500 + id, message: { message_id: 1, from: { id, first_name: name, language_code: lang }, chat: { id, type: 'private' }, text: `/start join_${lob.code}` } });
  // an open table of a friend (Богдан hosts) so the home list has an entry
  const lob201 = await post('/api/lobby', { initData: await sign({ id: 201, first_name: 'Богдан', language_code: 'uk' }), fresh: true });
  await post('/api/friends/invite', { initData: await sign({ id: 201, first_name: 'Богдан', language_code: 'uk' }), code: lob201.code, friendIds: [100] });

  const problems = []; let clicks = 0, screens = 0;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  p.on('pageerror', e => problems.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push('console: ' + m.text()); });
  await p.addInitScript(({ initData, user, api }) => {
    window.MAFIA_API = api; window.__tg = { invoices: [], links: [] }; const noop = () => {};
    window.Telegram = { WebApp: { platform: 'ios', version: '8.0', initData, initDataUnsafe: { user, auth_date: 1, hash: 'x' }, ready: noop, expand: noop, close: noop, setHeaderColor: noop, setBackgroundColor: noop, setBottomBarColor: noop, disableVerticalSwipes: noop, lockOrientation: noop, enableClosingConfirmation: noop, disableClosingConfirmation: noop, BackButton: { show: noop, hide: noop, onClick: noop }, HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop }, openInvoice: (l, cb) => { window.__tg.invoices.push(l); setTimeout(() => cb('cancelled'), 10); }, openTelegramLink: l => window.__tg.links.push(l), openLink: l => window.__tg.links.push(l) } };
    // every handler exception becomes a page error
    window.addEventListener('DOMContentLoaded', () => { const orig = window.ACT; });
  }, { initData, user: hostUser, api: 'http://127.0.0.1:8797' });
  await p.goto('file://' + path.resolve(__dirname, '..', 'mafia-pro.html')); await p.waitForTimeout(1200);
  const S = fn => p.evaluate(fn);
  // wrap every action so a thrown handler is reported with its name
  await S(() => { window.__actErrors = []; Object.keys(ACT).forEach(k => { const f = ACT[k]; ACT[k] = function (el) { try { const r = f.call(this, el); if (r && typeof r.then === 'function') r.catch(e => window.__actErrors.push(k + ': ' + (e && e.message))); return r; } catch (e) { window.__actErrors.push(k + ': ' + (e && e.message)); } }; }); });
  const textCheck = async where => { const r = await p.evaluate(() => { const txt = document.body.innerText || ''; const bad = []; if (/\bundefined\b/.test(txt)) bad.push('undefined'); if (/\bNaN\b/.test(txt)) bad.push('NaN'); if (/\[object Object\]/.test(txt)) bad.push('[object Object]'); const ph = txt.match(/\{[a-zA-Z]\w*\}/g); if (ph) bad.push('placeholders ' + [...new Set(ph)].join(',')); if (!document.querySelector('#app .screen') || document.querySelector('#app .screen').innerHTML.trim().length < 40) bad.push('empty screen'); if (document.documentElement.scrollWidth > window.innerWidth + 1) bad.push('horizontal overflow'); return bad; }); if (r.length) problems.push(`[${where}] ` + r.join('; ')); };
  const drainActErrors = async where => { const e = await S(() => { const x = window.__actErrors.slice(); window.__actErrors = []; return x; }); e.forEach(x => problems.push(`[${where}] handler ${x}`)); };
  const SKIP = new Set(['reset-confirm', 'tb-leave', 'prof-del', 'club-leave', 'club-leave-ask', 'fr-remove', 'fr-remove-from-sheet', 'fr-remove-ask', 'adm-revoke', 'adm-club', 'adm-partner', 'adm-grant', 'club-kick', 'tg-close-table', 'lang', 'deal', 'start', 'buy-confirm', 'claim-free', 'club-submit', 'pt-apply', 'prof-save', 'on-mode', 'lb-join', 'inv-respond', 'tb-confirm', 'tb-skip', 'tb-lift', 'tb-rou', 'club-call', 'fr-invite', 'fr-invite-one', 'club-join-table', 'link-share', 'fr-share', 'tg-share', 'avatar-file', 'cl-logo-file', 'seat-assign', 'seat-clear', 'scen', 'scen-use', 'new', 'continue', 'go', 'tab', 'back', 'sheet-close', 'club-open', 'clubs-open', 'table-open', 'ps-open', 'prof-open', 'prof-new', 'role', 'sheet', 'player', 'toggle-alive', 'kam', 'kam-who', 'kam-cancel', 'kam-confirm', 'finish', 'resolve', 'day0', 'night', 'next', 'prev', 'speech', 'stage', 'vote-finish', 'vote-none', 'tie-start', 'revote', 'roulette-start', 'roulette-guess', 'vote-close', 'lift-finish', 'trig-confirm', 'judge', 'lawyer', 'bailiff', 'prosecute', 'nominate', 'unnominate', 'timer-toggle', 'timer-add', 'timer-reset', 'tg-deal', 'tg-deal-done', 'tg-lobby', 'tg-seat-one', 'tg-seat-all', 'undo', 'skip', 'confirm', 'pick', 'mode', 'bm-save', 'bm-pick', 'cand', 'vote', 'vote-remove', 'vote-rest', 'voter-step', 'voter-go', 'cand-pick', 'lift-toggle', 'tie-speech', 'classic-rules', 'nom-open', 'prosecute-open', 'foul-add', 'foul-remove', 'showall', 'flip', 'hide', 'rv-toggle', 'hb', 'pf-me', 'prof-tg', 'prof-edit', 'prof-like', 'reset', 'ref-attach']);
  // actions that only change local view state are safe to press; game-flow actions are exercised by browser-qa/cloud-qa
  async function pressAll(where, restore) {
    const keys = await p.evaluate(() => [...new Set([...document.querySelectorAll('[data-a]')].map(e => e.dataset.a))]);
    for (const k of keys) {
      if (SKIP.has(k)) continue;
      const sel = `[data-a="${k}"]`;
      const el = await p.$(sel); if (!el) continue;
      const tag = await el.evaluate(e => e.tagName);
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') continue;
      try { await el.click({ timeout: 2000, force: true }); clicks++; } catch (e) { problems.push(`[${where}] cannot click ${k}: ${String(e.message).split('\n')[0]}`); continue; }
      await p.waitForTimeout(250);
      await textCheck(where + ' → ' + k); await drainActErrors(where + ' → ' + k);
      await S(restore); await p.waitForTimeout(120);
    }
  }
  const visit = async (name, enter) => {
    screens++;
    try { await S(enter); } catch (e) { const st = await S(() => S.game ? `${S.game.phase}/${S.game.dayStage}/${S.game.stepIdx}` : 'no game'); problems.push(`[${name}] enter failed (${st}): ${String(e.message).split('\n')[0]}`); return; }
    await p.waitForTimeout(900); if (process.env.VERBOSE) console.log(name, await S(() => S.screen + (S.game ? ` ${S.game.phase}/${S.game.dayStage}/${S.game.stepIdx}` : "")), [...new Set(await p.evaluate(() => [...document.querySelectorAll("[data-a]")].map(e => e.dataset.a)))].join(",")); await textCheck(name); await drainActErrors(name); await pressAll(name, enter); await textCheck(name + " (after)");
  };
  const closeSheet = () => { S.ui.sheet = null; };
  await visit('home', () => { S.ui.sheet = null; go('home'); });
  await visit('cards', () => { S.ui.sheet = null; go('cards'); });
  await visit('scenarios', () => { S.ui.sheet = null; go('scenarios'); });
  await visit('scenarios paid', () => { S.ui.sheet = null; go('scenarios'); ACT['scen-tab']({ dataset: { id: 'paid' } }); });
  await visit('shop', () => { S.ui.sheet = null; go('shop'); });
  await visit('friends', () => { S.ui.sheet = null; FR.at = 0; go('friends'); });
  await visit('friend sheet', () => { go('friends'); S.ui.sheet = { type: 'friend', id: 201 }; render(); });
  await visit('referral sheet', () => { go('friends'); S.ui.sheet = { type: 'referral' }; render(); });
  await visit('partner sheet', () => { go('friends'); S.ui.sheet = { type: 'partner' }; render(); });
  await visit('clubs', () => { S.ui.sheet = null; CL.at = 0; go('clubs'); });
  await visit('club', () => { S.ui.sheet = null; CL.id = CL.list && CL.list[0] ? CL.list[0].id : CL.id; go('club'); });
  await visit('club edit sheet', () => { go('club'); if (CL.cur) ACT['club-edit']({ dataset: { id: CL.cur.club.id } }); });
  await visit('ratings', () => { S.ui.sheet = null; CLOUD.clubs = null; go('ratings'); });
  await visit('myprofile', () => { S.ui.sheet = null; go('myprofile'); });
  await visit('profiles', () => { S.ui.sheet = null; go('profiles'); });
  await visit('pstats', () => { S.ui.sheet = null; S.ui.pstatsId = 201; go('pstats'); });
  await visit('settings (admin)', () => { S.ui.sheet = null; ADM.grants = null; ADM.partners = null; ADM.clubs = null; go('settings'); });
  await visit('setup online', () => { S.ui.sheet = null; S.game = null; ACT['scen-use']({ dataset: { id: 'classic' } }); S.setup.online = true; });
  await S(() => { if (!lobbyIsOpen()) return openTable(false); }); await p.waitForTimeout(800);
  for (const [id, name, lang] of [[201, 'Богдан', 'uk'], [202, 'Ева', 'pl']]) await hook({ update_id: 700 + id, message: { message_id: 1, from: { id, first_name: name, language_code: lang }, chat: { id, type: 'private' }, text: `/start join_${await S(() => S.lobby.code)}` } });
  await S(() => refreshTable()); await p.waitForTimeout(600);
  await visit('setup with table', () => { S.ui.sheet = null; go('setup'); });
  await visit('deal', () => { if (!S.game) { S.setup.names = ['Анна', 'Богдан', 'Нина', 'Гена', 'Дима', 'Ева', 'Женя', 'Зоя', 'Иван', 'Кира']; ACT.deal({ dataset: {} }); } S.ui.sheet = null; go('deal'); });
  await visit('deal table', () => { go('deal'); S.ui.showAll = true; render(); });
  await visit('night 0', () => { S.ui.showAll = false; if (!S.game.dealt) { ACT['tg-deal-done']({ dataset: {} }); ACT.start({ dataset: {} }); } S.ui.sheet = null; go('game'); });
  await visit('players sheet', () => { go('game'); S.ui.sheet = { type: 'players' }; render(); });
  await visit('log sheet', () => { go('game'); S.ui.sheet = { type: 'log' }; render(); });
  await visit('day 0 intro', () => { S.ui.sheet = null; const g = S.game; while (g.phase === 'night0' && g.stepIdx < g.steps.length) ACT.next({ dataset: {} }); if (g.phase === 'night0') ACT.day0({ dataset: {} }); go('game'); });
  await visit('night 1', () => { S.ui.sheet = null; const g = S.game; let guard = 40; while (g.phase === 'day0' && alive(g)[g.speechIdx] && guard--) ACT.speech({ dataset: { d: '1' } }); if (g.phase === 'day0') ACT.night({ dataset: {} }); if (g.phase === 'day') { if (g.dayStage === 'morning') ACT.stage({ dataset: { id: 'speeches' } }); if (g.dayStage === 'speeches') ACT.stage({ dataset: { id: 'vote' } }); ACT['vote-none']({ dataset: {} }); if (g.phase === 'day') ACT.night({ dataset: {} }); } go('game'); });
  await visit('day 2 morning', () => { S.ui.sheet = null; const g = S.game; if (g.phase === 'night') { while (g.stepIdx < g.steps.length) { const st = g.steps[g.stepIdx]; if (st.type === 'act' && !g.actions.find(a => a.stepId === st.id)) { const t = stepTargets(g, st).find(x => x.ok); if (t) { S.ui.pick = [t.p.id]; S.ui.mode = st.modes ? st.modes[0] : null; ACT.confirm({ dataset: {} }); } } ACT.next({ dataset: {} }); } ACT.resolve({ dataset: {} }); } go('game'); });
  await visit('day 2 speeches', () => { S.ui.sheet = null; const g = S.game; if (g.dayStage === 'morning') { if (isClassic(g) && !g.bestMove && g.nightResult && g.nightResult.removed.length) ACT['bm-save']({ dataset: { skip: '1' } }); ACT.stage({ dataset: { id: 'speeches' } }); } go('game'); });
  await visit('day 2 vote', () => { S.ui.sheet = null; const g = S.game; if (g.dayStage !== 'vote') ACT.stage({ dataset: { id: 'vote' } }); const al = alive(g); if (!g.ballot.candidates.length) { ACT.cand({ dataset: { id: al[0].id } }); ACT.cand({ dataset: { id: al[1].id } }); } go('game'); });
  await visit('end', () => { S.ui.sheet = null; finishGame(S.game, checkWin(S.game) || { side: 'city', title: 'Победа города', text: '' }); go('game'); });
  await visit('reset sheet', () => { go('game'); S.ui.sheet = { type: 'reset' }; render(); });
  // a player's screens, in a second context
  const q = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  q.on('pageerror', e => problems.push('player pageerror: ' + e.message));
  const pUser = { id: 204, first_name: 'Нина', username: 'nina_uk', language_code: 'uk' };
  await q.addInitScript(({ initData, user, api }) => { window.MAFIA_API = api; window.__tg = { links: [] }; const noop = () => {}; window.Telegram = { WebApp: { platform: 'android', version: '8.0', initData, initDataUnsafe: { user, auth_date: 1, hash: 'x' }, ready: noop, expand: noop, close: noop, setHeaderColor: noop, setBackgroundColor: noop, setBottomBarColor: noop, disableVerticalSwipes: noop, lockOrientation: noop, enableClosingConfirmation: noop, disableClosingConfirmation: noop, BackButton: { show: noop, hide: noop, onClick: noop }, HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop }, openInvoice: noop, openTelegramLink: l => window.__tg.links.push(l), openLink: noop } }; }, { initData: await sign(pUser), user: pUser, api: 'http://127.0.0.1:8797' });
  await q.goto('file://' + path.resolve(__dirname, '..', 'mafia-pro.html')); await q.waitForTimeout(1200);
  const Q = fn => q.evaluate(fn);
  await Q(() => { window.__actErrors = []; Object.keys(ACT).forEach(k => { const f = ACT[k]; ACT[k] = function (el) { try { const r = f.call(this, el); if (r && typeof r.then === 'function') r.catch(e => window.__actErrors.push(k + ': ' + (e && e.message))); return r; } catch (e) { window.__actErrors.push(k + ': ' + (e && e.message)); } }; }); });
  const qText = async where => { const r = await q.evaluate(() => { const txt = document.body.innerText || ''; const bad = []; if (/\bundefined\b/.test(txt)) bad.push('undefined'); if (/\bNaN\b/.test(txt)) bad.push('NaN'); if (!document.querySelector('#app .screen') || document.querySelector('#app .screen').innerHTML.trim().length < 40) bad.push('empty screen'); return bad; }); if (r.length) problems.push(`[player ${where}] ` + r.join('; ')); const e = await Q(() => { const x = window.__actErrors.slice(); window.__actErrors = []; return x; }); e.forEach(x => problems.push(`[player ${where}] handler ${x}`)); };
  await Q(() => go('home')); await q.waitForTimeout(900); await qText('home');
  // Нина joins Богдан's open table from the list, then opens it
  await Q(() => { LB.at = 0; loadLobbies(true); }); await q.waitForTimeout(900);
  const hasBtn = await q.$('[data-a="lb-join"][data-code]:not([data-code=""])'); if (!hasBtn) problems.push('[player home] no open table to join'); else { await hasBtn.click(); await q.waitForTimeout(1200); await qText('table after join'); if (!(await Q(() => S.screen === 'table'))) problems.push('[player] join from the list did not open the table'); }
  for (const k of ['tb-msg', 'go']) { /* inputs / nav are covered elsewhere */ }
  const pkeys = await q.evaluate(() => [...new Set([...document.querySelectorAll('[data-a]')].map(e => e.dataset.a))]);
  for (const k of pkeys) { if (SKIP.has(k)) continue; const el = await q.$(`[data-a="${k}"]`); if (!el) continue; const tag = await el.evaluate(e => e.tagName); if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) continue; try { await el.click({ timeout: 2000, force: true }); clicks++; } catch (e) { problems.push(`[player table] cannot click ${k}`); continue; } await q.waitForTimeout(250); await qText('table → ' + k); await Q(() => { S.ui.sheet = null; if (S.screen !== 'table') go('table'); }); await q.waitForTimeout(150); }
  await drainActErrors('final'); await q.close();
  await b.close(); await tg.close(); api.close();
  console.log(`screens ${screens}, clicks ${clicks}`);
  if (problems.length) { console.log('PROBLEMS:'); [...new Set(problems)].forEach(x => console.log(' - ' + x)); process.exit(1); }
  console.log('ALL OK'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
