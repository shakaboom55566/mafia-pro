/* Screenshots for the in-app guide «Правила и инструкция» (v59): a real 8-player role game is played against the real worker
   (backend/src, D1 = Node SQLite, Telegram = local mock) — the host in one browser, one player (seat 3, the Sheriff) in another,
   five more players through the bot, two by passing the phone. Every screen a newcomer or a host reads about is captured,
   once per language, as <out>/<lang>/<id>.jpg. The Pages workflow runs it after build.sh into _site/guide; the app loads the
   pictures from https://mafiapro.app/guide/<lang>/<id>.jpg (src/13-guide.js, GUIDE_BASE).
   Run: node test/guide-shots.js [out dir = _site/guide] [languages = ru,uk,en,pl,hy]   (NODE_PATH=$(npm root -g) for playwright) */
const path = require('path'); const fs = require('fs'); const http = require('http');
const ROOT = path.resolve(__dirname, '..');
const LANGS = ['ru', 'uk', 'en', 'pl', 'hy'];
/* seats 1–8: Don, Mafia, Sheriff (the player in the app), Doctor, Journalist, Mayor, Bodyguard, Judge; 6 and 7 get their cards by phone */
const COMP = ['don', 'mafia', 'sheriff', 'doctor', 'journalist', 'mayor', 'bodyguard', 'judge'];
const NAMES = {
  ru: ['Анна', 'Борис', 'Нина', 'Гена', 'Дима', 'Ева', 'Женя', 'Зоя'],
  uk: ['Анна', 'Богдан', 'Ніна', 'Гена', 'Дмитро', 'Єва', 'Женя', 'Зоя'],
  en: ['Anna', 'Boris', 'Nina', 'Gene', 'Dima', 'Eva', 'Jane', 'Zoe'],
  pl: ['Anna', 'Bartek', 'Nina', 'Gienek', 'Darek', 'Ewa', 'Zosia', 'Jola'],
  hy: ['Աննա', 'Արամ', 'Նինա', 'Գևորգ', 'Դավիթ', 'Եվա', 'Ժաննա', 'Զոյա']
};
/* the classic table of 10: seat 1 the Don (the player in the app), seat 2 Mafia (a second player in the app), 3 Mafia and 4 the Sheriff through the bot, 5–8 citizens through the bot, 9 and 10 by phone */
const CNAMES = {
  ru: ['Нина', 'Борис', 'Анна', 'Гена', 'Дима', 'Ева', 'Женя', 'Зоя', 'Игорь', 'Катя'],
  uk: ['Ніна', 'Богдан', 'Анна', 'Гена', 'Дмитро', 'Єва', 'Женя', 'Зоя', 'Ігор', 'Катя'],
  en: ['Nina', 'Boris', 'Anna', 'Gene', 'Dima', 'Eva', 'Jane', 'Zoe', 'Ivan', 'Kate'],
  pl: ['Nina', 'Bartek', 'Anna', 'Gienek', 'Darek', 'Ewa', 'Zosia', 'Jola', 'Igor', 'Kasia'],
  hy: ['Նինա', 'Արամ', 'Աննա', 'Գևորգ', 'Դավիթ', 'Եվա', 'Ժաննա', 'Զոյա', 'Իգոր', 'Կատյա']
};
const HOST = { ru: 'Ведущий', uk: 'Ведучий', en: 'Host', pl: 'Prowadzący', hy: 'Վարող' };
const CHAT = { ru: 'Всем доброе утро! Я мирная — проверяйте.', uk: 'Усім доброго ранку! Я мирна — перевіряйте.', en: 'Good morning everyone! I am a citizen — check me.', pl: 'Dzień dobry wszystkim! Jestem cywilem — sprawdźcie.', hy: 'Բարի լույս բոլորին։ Ես խաղաղ եմ՝ ստուգեք։' };
/* every picture the guide refers to (src/02x-i18n-guide.js) — the smoke test checks the texts against this list */
const SHOTS = ['home', 'cards', 'role-sheet', 'setup-top', 'setup-comp', 'setup-names', 'setup-table', 'host-lobby', 'deal-online', 'deal-closed', 'deal-open', 'deal-table',
  'night0', 'night0-role', 'day0', 'night-shoot', 'night-recorded', 'night-check', 'night-result', 'night-end', 'morning', 'balagan', 'speeches', 'vote', 'vote-count', 'vote-result',
  'sheet-players', 'sheet-log', 'settings', 'end', 'end-review', 'fouls-strip', 'fouls',
  'p-invite', 'p-tables', 'p-lobby', 'p-card', 'p-night', 'p-ask', 'p-result', 'p-day', 'p-chat', 'p-vote', 'p-end',
  // the classic game (v61): the fixed line-up, the family's deal in night 0 with the Don's signs, day 1 straight to the minutes with nominations,
  // the vote by hands, a tie → defence speeches → a re-vote → lift all, the shot by hands on the count, the best move, the vote windows online, the fouls
  'c-setup', 'c-night0', 'c-night0-sheriff', 'c-day1', 'c-nominate', 'c-speech-nominated', 'c-vote', 'c-vote-close', 'c-tie', 'c-revote', 'c-lift', 'c-lift-result',
  'c-hands-host', 'c-night-don', 'c-morning', 'c-poll-ready', 'c-poll-host', 'c-vote-result', 'c-fouls',
  'c-p-deal', 'c-p-dealwatch', 'c-p-nominate', 'c-p-hands', 'c-p-hands-hit', 'c-p-poll'];
const APP_PORT = 8795, TG_PORT = 8794;

async function main() {
  const { chromium } = require('playwright');
  const out = path.resolve(process.argv[2] || path.join(ROOT, '_site', 'guide'));
  const langs = (process.argv[3] || LANGS.join(',')).split(',').map(s => s.trim()).filter(l => LANGS.includes(l));
  const { makeD1 } = await import('../backend/test/d1-shim.js');
  const { startMockTelegram } = await import('../backend/test/mock-telegram.js');
  const { signInitData } = await import('../backend/src/tg.js');
  const worker = (await import('../backend/src/index.js')).default;
  const tg = await startMockTelegram(TG_PORT);
  let env = null;
  const api = http.createServer((req, res) => { let b = ''; req.on('data', c => { b += c; }); req.on('end', async () => {
    const r = await worker.fetch(new Request(`http://127.0.0.1:${APP_PORT}` + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : b }), env, { waitUntil() {} });
    const h = {}; r.headers.forEach((v, k) => { h[k] = v; }); res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer())); }); });
  await new Promise(r => api.listen(APP_PORT, '127.0.0.1', r));
  const hook = upd => worker.fetch(new Request('http://x/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': 'hook' }, body: JSON.stringify(upd) }), env, { waitUntil() {} });
  const sign = u => signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), query_id: 'Q' + u.id, user: u }, 'test-token');
  const appFile = 'file://' + path.join(ROOT, 'mafia-pro.html');
  const b = await chromium.launch(); const problems = []; let total = 0;
  const STILL = '*, *::before, *::after { animation: none !important; transition: none !important; } .toast { display: none !important; }';
  const tgInit = ({ initData, user, api }) => {
    window.MAFIA_API = api; window.__tg = { invoices: [], links: [] }; const noop = () => {};
    window.Telegram = { WebApp: { platform: 'ios', version: '8.0', initData, initDataUnsafe: { user, auth_date: 1, hash: 'x' }, ready: noop, expand: noop, close: noop, setHeaderColor: noop, setBackgroundColor: noop, setBottomBarColor: noop, disableVerticalSwipes: noop, lockOrientation: noop, enableClosingConfirmation: noop, disableClosingConfirmation: noop, BackButton: { show: noop, hide: noop, onClick: noop }, HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop }, openInvoice: noop, openTelegramLink: l => window.__tg.links.push(l), openLink: l => window.__tg.links.push(l) } };
  };
  /* a classic game of 10, online: the host, the Don (seat 1) and one mafioso (seat 2) in the app, the rest through the bot and by phone */
  async function classicFlow(lang) {
    const dir = path.join(out, lang); const names = CNAMES[lang];
    env = { DB: makeD1(path.join(ROOT, 'backend', 'schema.sql')), BOT_TOKEN: 'test-token', WEBHOOK_SECRET: 'hook', APP_URL: 'https://mafiapro.app/', ALLOWED_ORIGIN: '*', TELEGRAM_API: tg.base, ADMIN_IDS: '1', SEC_RESULT_GAP: '0' };
    const hostUser = { id: 100, first_name: HOST[lang], username: 'mafia_host', language_code: lang };
    const donUser = { id: 601, first_name: names[0], username: 'nina', language_code: lang };
    const mafUser = { id: 602, first_name: names[1], username: 'boris', language_code: lang };
    const bots = [[703, names[2]], [704, names[3]], [705, names[4]], [706, names[5]], [707, names[6]], [708, names[7]]]; // seats 3–8 through the bot
    const mk = async () => { const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: lang }); return [c, await c.newPage()]; };
    const [ctxH, p] = await mk(), [ctxD, q] = await mk(), [ctxM, m] = await mk();
    const errs = []; [p, q, m].forEach(pg => pg.on('pageerror', e => errs.push(e.message)));
    await p.addInitScript(tgInit, { initData: await sign(hostUser), user: hostUser, api: `http://127.0.0.1:${APP_PORT}` });
    await q.addInitScript(tgInit, { initData: await sign(donUser), user: donUser, api: `http://127.0.0.1:${APP_PORT}` });
    await m.addInitScript(tgInit, { initData: await sign(mafUser), user: mafUser, api: `http://127.0.0.1:${APP_PORT}` });
    await p.goto(appFile); await q.goto(appFile); await m.goto(appFile); await p.waitForTimeout(900);
    for (const pg of [p, q, m]) { await pg.addStyleTag({ content: STILL }); try { await pg.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {} }
    const S = fn => p.evaluate(fn), Q = fn => q.evaluate(fn), M = fn => m.evaluate(fn);
    const waitS = (fn, ms = 15000) => p.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
    const waitQ = (fn, ms = 15000) => q.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
    const waitM = (fn, ms = 15000) => m.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
    const shot = async (pg, id, sel, off = 66) => {
      await pg.evaluate(([sel, off]) => { document.querySelectorAll('.toast').forEach(t => t.remove()); if (!sel) { window.scrollTo(0, 0); return; } const el = document.querySelector(sel); if (el) window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - off)); }, [sel || '', off]);
      await pg.waitForTimeout(120);
      await pg.screenshot({ path: path.join(dir, id + '.jpg'), type: 'jpeg', quality: 82 }); total++;
    };
    const seatId = (seat) => `S.game.players.find(x => x.seat === ${seat}).id`;
    for (const [pg, l] of [[p, lang], [q, lang], [m, lang]]) await pg.evaluate(l => { S.settings.lang = l; setLang(l); S.settings.revealDead = true; S.setup.openRoles = true; go('home'); }, l);
    await p.waitForTimeout(300);
    // ----- the classic table online: the fixed line-up, names by seat, the table
    await S(() => { ACT['scen-use']({ dataset: { id: 'classic' } }); }); await p.waitForTimeout(200);
    await p.evaluate(names => { S.setup.names = names.slice(); S.setup.online = false; S.setup.hostRole = 'host'; render(); }, names);
    await p.click('[data-a="on-mode"][data-id="online"]'); await waitS(() => S.lobby && S.lobby.code);
    const code = await S(() => S.lobby.code);
    for (const [id, name] of bots) await hook({ update_id: id, message: { message_id: 1, from: { id, first_name: name, language_code: lang }, chat: { id, type: 'private' }, text: `/start join_${code}` } });
    for (const [pg, u] of [[q, donUser], [m, mafUser]]) {
      await hook({ update_id: u.id, message: { message_id: 1, from: { id: u.id, first_name: u.first_name, username: u.username, language_code: lang }, chat: { id: u.id, type: 'private' }, text: `/start join_${code}` } });
      await pg.evaluate(async () => { const d = await api('/api/ping', {}); S.cloud.table = d.table || null; }); await pg.evaluate(code => tableOpen(code), code);
    }
    await S(() => refreshTable()); await p.waitForTimeout(700);
    await waitS(() => S.lobby && S.lobby.seats && S.lobby.seats[601] === 0 && S.lobby.seats[602] === 1 && Object.keys(S.lobby.seats).length === 8);
    await shot(p, 'c-setup', '.meter', 70);
    // ----- the deal (the shuffle's 9 draws keep the seat order), two cards by phone, the introductory night
    await S(() => { const mr = Math.random; let k = 0; Math.random = () => (k++ < 9 ? 0.999999 : mr()); ACT.deal({ dataset: {} }); Math.random = mr; });
    await waitS(() => S.screen === 'deal' && S.game && S.game.tg && S.game.tg.sent && S.game.tg.sent.length >= 8); await p.waitForTimeout(300);
    await S(() => { ACT.flip({ dataset: {} }); ACT.hide({ dataset: {} }); ACT.flip({ dataset: {} }); ACT.hide({ dataset: {} }); if (S.game.dealIdx < S.game.players.length) ACT['tg-deal-done']({ dataset: {} }); ACT.start({ dataset: {} }); });
    await waitQ(() => TB.data && TB.data.me && TB.data.me.roleId === 'don' && TB.data.me.ask && TB.data.me.ask.kind === 'deal');
    for (const id of ['night1', 'n5', 'then', 'night2', 'n9']) { await q.click(`[data-a="dl-add"][data-id="${id}"]`); await q.waitForTimeout(120); }
    await q.waitForTimeout(600); await shot(q, 'c-p-deal', '.tb-ask, .panel.raised', 70);
    await waitM(() => { const d = TB.data; const rows = d && Array.isArray(d.peers) ? d.peers.filter(r => Array.isArray(r.payload && r.payload.seq) && r.payload.seq.length >= 5) : []; return rows.length > 0; });
    await m.waitForTimeout(500); await shot(m, 'c-p-dealwatch', '.panel.raised', 70);
    await waitS(() => S.game.onl && Array.isArray(S.game.onl.deal) && S.game.onl.deal.length >= 5); await p.waitForTimeout(300); await shot(p, 'c-night0');
    await S(() => ACT.next({ dataset: {} })); await p.waitForTimeout(300); await shot(p, 'c-night0-sheriff');
    await S(() => { const g = S.game; while (g.phase === 'night0' && g.stepIdx < g.steps.length) ACT.next({ dataset: {} }); ACT.day0({ dataset: {} }); }); await p.waitForTimeout(500);
    // ----- day 1 straight to the minutes: the Don (seat 1) nominates from the app, the host nominates for seat 2
    await shot(p, 'c-day1');
    await waitQ(() => TB.data && TB.data.me && TB.data.me.ask && TB.data.me.ask.kind === 'nominate' && !TB.data.me.ask.done); await q.waitForTimeout(300);
    await q.click('.tb-ask [data-a="tb-pick"][data-seat="5"]'); await q.waitForTimeout(200); await shot(q, 'c-p-nominate', '.tb-ask', 120);
    await q.click('[data-a="tb-confirm"]'); await waitS(() => S.game.ballot && S.game.ballot.candidates.length === 1);
    await S(() => { ACT.speech({ dataset: { d: '1' } }); const g = S.game; ACT['nom-open']({ dataset: { id: g.players.find(x => x.seat === 2).id } }); }); await p.waitForTimeout(300); await shot(p, 'c-nominate', '.picker', 150);
    await S(() => { const g = S.game; ACT.nominate({ dataset: { id: g.players.find(x => x.seat === 2).id, t: g.players.find(x => x.seat === 6).id } }); }); await p.waitForTimeout(300); await shot(p, 'c-speech-nominated');
    // ----- the vote by hands (the host marks): 5 : 5 → defence speeches → a re-vote 4 : 4 → lift all
    await S(() => { ACT.stage({ dataset: { id: 'vote' } }); ACT['poll-stop'](); }); await p.waitForTimeout(300);
    await p.evaluate(() => { const g = S.game; const id = s => g.players.find(x => x.seat === s).id; [1, 2, 3, 4, 5].forEach(s => ACT.vote({ dataset: { v: id(s), c: id(6) } })); [6, 7, 8, 9, 10].forEach(s => ACT.vote({ dataset: { v: id(s), c: id(5) } })); });
    await p.waitForTimeout(300); await shot(p, 'c-vote', '.cand-strip', 70);
    await shot(p, 'c-vote-close', '[data-a="vote-close"]', 560);
    await S(() => ACT['vote-close']()); await p.waitForTimeout(300); await shot(p, 'c-tie');
    await S(() => { ACT['tie-speech']({ dataset: { d: '1' } }); ACT['tie-speech']({ dataset: { d: '1' } }); }); await p.waitForTimeout(300);
    await p.evaluate(() => { const g = S.game; const id = s => g.players.find(x => x.seat === s).id; [1, 2, 3, 4].forEach(s => ACT.vote({ dataset: { v: id(s), c: id(6) } })); [7, 8, 9, 10].forEach(s => ACT.vote({ dataset: { v: id(s), c: id(5) } })); });
    await p.waitForTimeout(300); await shot(p, 'c-revote');
    await S(() => ACT['vote-close']()); await p.waitForTimeout(300);
    await p.evaluate(() => { const g = S.game; const id = s => g.players.find(x => x.seat === s).id; [1, 2, 3, 4, 7, 8].forEach(s => ACT['lift-toggle']({ dataset: { id: id(s) } })); }); await p.waitForTimeout(300); await shot(p, 'c-lift');
    await S(() => ACT['lift-finish']()); await p.waitForTimeout(400); await shot(p, 'c-lift-result');
    // ----- night 1: the family shoots by hands on the count — the Don and seat 2 from their phones at «5», seat 3 through the API
    await S(() => { HS.SHOW = 60000; ACT.night({ dataset: {} }); }); await p.waitForTimeout(300);
    const shotKey = await S(() => { const onl = S.game.onl; return onl && onl.shot ? onl.shot.key : null; });
    if (!shotKey) throw new Error('no hands shot key');
    await waitQ(() => !!document.querySelector('#hs-num')); await waitM(() => !!document.querySelector('#hs-num'));
    const atDigit = pg => pg.waitForFunction(() => { const el = document.querySelector('#hs-num'); return !!el && /^[0-9]+$/.test(el.textContent.trim()); }, null, { timeout: 15000 }).then(() => true).catch(() => false);
    await atDigit(p); await shot(p, 'c-hands-host', '.hs', 80);
    await waitQ(() => { const el = document.querySelector('#hs-num'); return !!el && el.textContent.trim() === '3'; }); await shot(q, 'c-p-hands', '.hs', 80);
    const fireAt7 = pg => pg.waitForFunction(() => { const el = document.querySelector('#hs-num'); return !!el && el.textContent.trim() === '7'; }, null, { timeout: 15000 }).then(() => pg.click('[data-a="hs-fire"]')).catch(() => false);
    const seat3 = await sign({ id: 703, first_name: names[2], language_code: lang });
    await Promise.all([fireAt7(q), fireAt7(m), fetch(`http://127.0.0.1:${APP_PORT}/api/table/act`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: seat3, code, key: shotKey, payload: { n: 7 } }) })]);
    if (!(await waitQ(() => TB.data && TB.data.me && TB.data.me.shotResult && TB.data.me.shotResult.hit))) problems.push(`${lang}: classic — the hands did not meet on 7`);
    await q.waitForTimeout(400); await shot(q, 'c-p-hands-hit', '.hs', 80);
    await S(() => { const g = S.game; if (!g.actions.find(a => a.stepId === g.steps[g.stepIdx].id)) { const t = g.players.find(x => x.seat === 7); ACT.pick({ dataset: { id: t.id } }); ACT.confirm({ dataset: {} }); } ACT.next({ dataset: {} }); const t4 = g.players.find(x => x.seat === 4); ACT.pick({ dataset: { id: t4.id } }); ACT.confirm({ dataset: {} }); });
    await p.waitForTimeout(300); await shot(p, 'c-night-don', '.result', 160);
    await S(() => { ACT.next({ dataset: {} }); const g = S.game; const t1 = g.players.find(x => x.seat === 1); ACT.pick({ dataset: { id: t1.id } }); ACT.confirm({ dataset: {} }); ACT.next({ dataset: {} }); let guard = 6; while (g.phase === 'night' && g.stepIdx < g.steps.length && guard--) ACT.next({ dataset: {} }); ACT.resolve({ dataset: {} }); });
    await p.waitForTimeout(500); await shot(p, 'c-morning');
    // ----- day 2: the vote windows online — the host starts, the players answer «I vote» inside the window
    await S(() => { const g = S.game; const id = s => g.players.find(x => x.seat === s).id; ACT['bm-save']({ dataset: { skip: '1' } }); ACT.stage({ dataset: { id: 'speeches' } }); const order = speakOrder(g); ACT.nominate({ dataset: { id: order[0].id, t: id(3) } }); ACT.speech({ dataset: { d: '1' } }); ACT.nominate({ dataset: { id: order[1].id, t: id(9) } }); ACT.stage({ dataset: { id: 'vote' } }); });
    await p.waitForTimeout(300); await shot(p, 'c-poll-ready');
    await S(() => { PLC.DUR = 6000; ACT['poll-start'](); }); await p.waitForTimeout(200);
    const atGo = pg => pg.waitForFunction(() => { const el = document.querySelector('#pl-cd'); return !!el && el.classList.contains('go'); }, null, { timeout: 15000 }).then(() => true).catch(() => false);
    await atGo(p); await shot(p, 'c-poll-host');
    await atGo(q); await shot(q, 'c-p-poll', '.pl-cands', 90);
    await q.click('[data-a="pl-ans"][data-yes="1"]').catch(() => {});
    await waitS(() => S.game.dayStage === 'result', 30000); await p.waitForTimeout(400); await shot(p, 'c-vote-result');
    // ----- the fouls of a player
    await S(() => { const g = S.game; const id = g.players.find(x => x.seat === 8).id; ACT['foul-give']({ dataset: { id, k: '3' } }); ACT['foul-give']({ dataset: { id: g.players.find(x => x.seat === 6).id, k: '1' } }); ACT['foul-open']({ dataset: { id } }); });
    await p.waitForTimeout(300); await shot(p, 'c-fouls');
    if (errs.length) problems.push(`${lang}: classic page errors — ${errs.join(' | ')}`);
    await ctxH.close(); await ctxD.close(); await ctxM.close();
  }
  for (const lang of langs) {
    const dir = path.join(out, lang); fs.mkdirSync(dir, { recursive: true });
    env = { DB: makeD1(path.join(ROOT, 'backend', 'schema.sql')), BOT_TOKEN: 'test-token', WEBHOOK_SECRET: 'hook', APP_URL: 'https://mafiapro.app/', ALLOWED_ORIGIN: '*', TELEGRAM_API: tg.base, ADMIN_IDS: '1', SEC_RESULT_GAP: '0' };
    const names = NAMES[lang];
    const hostUser = { id: 100, first_name: HOST[lang], username: 'mafia_host', language_code: lang };
    const playerUser = { id: 601, first_name: names[2], username: 'nina', language_code: lang };
    const bots = [[701, names[0]], [702, names[1]], [704, names[3]], [705, names[4]], [708, names[7]]]; // seats 1, 2, 4, 5, 8 through the bot
    const ctxH = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: lang });
    const ctxP = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: lang });
    const p = await ctxH.newPage(), q = await ctxP.newPage();
    const errs = []; [p, q].forEach(pg => pg.on('pageerror', e => errs.push(e.message)));
    await p.addInitScript(tgInit, { initData: await sign(hostUser), user: hostUser, api: `http://127.0.0.1:${APP_PORT}` });
    await q.addInitScript(tgInit, { initData: await sign(playerUser), user: playerUser, api: `http://127.0.0.1:${APP_PORT}` });
    await p.goto(appFile); await q.goto(appFile); await p.waitForTimeout(900);
    for (const pg of [p, q]) { await pg.addStyleTag({ content: STILL }); try { await pg.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {} }
    const S = fn => p.evaluate(fn), Q = fn => q.evaluate(fn);
    const waitS = (fn, ms = 12000) => p.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
    const waitQ = (fn, ms = 12000) => q.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
    const shot = async (pg, id, sel, off = 66) => {
      await pg.evaluate(([sel, off]) => { document.querySelectorAll('.toast').forEach(t => t.remove()); if (!sel) { window.scrollTo(0, 0); return; } const el = document.querySelector(sel); if (el) window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - off)); }, [sel || '', off]);
      await pg.waitForTimeout(120);
      await pg.screenshot({ path: path.join(dir, id + '.jpg'), type: 'jpeg', quality: 82 }); total++;
    };
    await p.evaluate(lang => { S.settings.lang = lang; setLang(lang); S.settings.revealDead = true; S.setup.openRoles = true; go('home'); }, lang);
    await q.evaluate(lang => { S.settings.lang = lang; setLang(lang); go('home'); }, lang);
    await p.waitForTimeout(300);
    // ----- the home screen, the cards and one role
    await shot(p, 'home');
    await S(() => { S.ui.cardFilter = 'all'; go('cards'); }); await p.waitForTimeout(400); await shot(p, 'cards');
    await S(() => { S.ui.sheet = { type: 'role', id: 'sheriff' }; render(); }); await p.waitForTimeout(500); await shot(p, 'role-sheet');
    await S(() => { S.ui.sheet = null; render(); });
    // ----- the setup of a role game: 8 players, a fixed line-up (the deal keeps the seat order), names
    await S(() => { ACT.new({ dataset: {} }); }); await p.waitForTimeout(200);
    await p.evaluate(({ names, comp }) => { S.setup.n = 8; S.setup.comp = comp.slice(); S.setup.names = names.slice(); S.setup.online = false; S.setup.hostRole = 'host'; render(); }, { names, comp: COMP });
    await p.waitForTimeout(200);
    await shot(p, 'setup-top');
    await shot(p, 'setup-comp', '.meter', 70);
    await shot(p, 'setup-names', '.names', 150);
    // ----- the online format: the table opens, five players come through the bot, the sixth (seat 3) in the app
    await p.click('[data-a="on-mode"][data-id="online"]'); await waitS(() => S.lobby && S.lobby.code);
    const code = await S(() => S.lobby.code);
    for (const [id, name] of bots) await hook({ update_id: id, message: { message_id: 1, from: { id, first_name: name, language_code: lang }, chat: { id, type: 'private' }, text: `/start join_${code}` } });
    // the player: the invitation sheet (as a friend's invitation looks), the table finder, then she sits down through the bot and opens the table
    await q.evaluate(({ code, host }) => { S.cloud = S.cloud || {}; S.cloud.invites = [{ code, from: host, kind: 'friend', mode: 'extended', open: true }]; TB.dismissed.clear(); showInvites(); }, { code, host: HOST[lang] });
    await q.waitForTimeout(300); await shot(q, 'p-invite');
    await Q(() => { S.ui.sheet = null; S.cloud.invites = []; LB.at = 0; go('tables'); }); await waitQ(() => Array.isArray(LB.list) && LB.list.length > 0); await q.waitForTimeout(300); await shot(q, 'p-tables');
    await hook({ update_id: 601, message: { message_id: 1, from: { id: 601, first_name: names[2], username: 'nina', language_code: lang }, chat: { id: 601, type: 'private' }, text: `/start join_${code}` } });
    await Q(async () => { const d = await api('/api/ping', {}); S.cloud.table = d.table || null; }); await q.evaluate(code => tableOpen(code), code);
    await waitQ(() => TB.data && TB.data.pub && TB.data.pub.phase === 'lobby');
    await S(() => refreshTable()); await p.waitForTimeout(700);
    await waitQ(() => TB.data && TB.data.pub && TB.data.pub.seats && TB.data.pub.seats[2].tgId === 601);
    await q.waitForTimeout(300); await shot(q, 'p-lobby');
    await shot(p, 'setup-table', '[data-a="tg-share"]', 110);
    await shot(p, 'host-lobby', '#host-table');
    // ----- the deal: six cards go to the apps, two by phone
    // the deal keeps the seat order of the line-up: the shuffle's n−1 draws of Math.random get 0.999…, everything after is random again
    await S(() => { const mr = Math.random; let k = 0; Math.random = () => (k++ < 7 ? 0.999999 : mr()); ACT.deal({ dataset: {} }); Math.random = mr; });
    await waitS(() => S.screen === 'deal' && S.game && S.game.tg && S.game.tg.sent && S.game.tg.sent.length >= 6); await p.waitForTimeout(500);
    await shot(p, 'deal-online');
    await shot(p, 'deal-closed', '.panel.raised', 90);
    await S(() => ACT.flip({ dataset: {} })); await p.waitForTimeout(500); await shot(p, 'deal-open', '.card-wrap', 90);
    await waitQ(() => TB.data && TB.data.me && TB.data.me.roleId === 'sheriff'); await Q(() => { TB.chat = []; render(); }); await q.waitForTimeout(600); await shot(q, 'p-card', '.tb-card, .panel .card3d-wrap', 90);
    await S(() => { ACT.hide({ dataset: {} }); ACT.flip({ dataset: {} }); ACT.hide({ dataset: {} }); }); await p.waitForTimeout(300);
    await S(() => { if (S.game.dealIdx < S.game.players.length) ACT['tg-deal-done']({ dataset: {} }); render(); }); await p.waitForTimeout(300); await shot(p, 'deal-table');
    // ----- night 0 and day 0
    await S(() => ACT.start({ dataset: {} })); await p.waitForTimeout(500); await shot(p, 'night0');
    await S(() => { ACT.next({ dataset: {} }); }); await p.waitForTimeout(300); await shot(p, 'night0-role');
    await S(() => { const g = S.game; while (g.phase === 'night0' && g.stepIdx < g.steps.length) ACT.next({ dataset: {} }); ACT.day0({ dataset: {} }); }); await p.waitForTimeout(400); await shot(p, 'day0');
    await S(() => { const g = S.game; let guard = 20; while (g.phase === 'day0' && alive(g)[g.speechIdx] && guard--) ACT.speech({ dataset: { d: '1' } }); ACT.night({ dataset: {} }); }); await p.waitForTimeout(500);
    // ----- night 1: the family shoots (the host picks for the players who are not in the app), the Don looks for the Sheriff, the Sheriff (in the app) checks
    await S(() => { scheduleAdvance = () => {}; }); // the host's screen stays on a step after the player's answer, for the picture
    await shot(p, 'night-shoot');
    await S(() => { const g = S.game; const t = g.players.find(x => x.seat === 6); ACT.pick({ dataset: { id: t.id } }); ACT.confirm({ dataset: {} }); }); await p.waitForTimeout(300); await shot(p, 'night-recorded');
    await S(() => { ACT.next({ dataset: {} }); const g = S.game; const t = g.players.find(x => x.seat === 4); ACT.pick({ dataset: { id: t.id } }); ACT.confirm({ dataset: {} }); ACT.next({ dataset: {} }); }); await p.waitForTimeout(300);
    await S(() => { ONL.sig = ''; schedulePublish(); }); await waitQ(() => TB.data && TB.data.me && TB.data.me.ask && !TB.data.me.ask.done && TB.data.me.ask.kind === 'act');
    await q.waitForTimeout(300); await shot(q, 'p-night');
    await shot(p, 'night-check');
    await q.click('.tb-ask [data-a="tb-pick"][data-seat="1"]'); await q.waitForTimeout(200); await shot(q, 'p-ask', '.tb-ask', 120);
    await q.click('[data-a="tb-confirm"]'); await waitS(() => { const g = S.game; const st = g.steps[g.stepIdx]; return st && st.roleId === 'sheriff' && !!g.actions.find(a => a.stepId === st.id); });
    await p.waitForTimeout(300); await shot(p, 'night-result', '.result', 160);
    await S(() => { ACT.next({ dataset: {} }); const g = S.game; const pick = seat => ACT.pick({ dataset: { id: g.players.find(x => x.seat === seat).id } });
      let guard = 12; while (g.phase === 'night' && g.stepIdx < g.steps.length && guard--) { const st = g.steps[g.stepIdx]; if (st.type !== 'act' || g.actions.find(a => a.stepId === st.id)) { ACT.next({ dataset: {} }); continue; }
        if (st.roleId === 'doctor') pick(3); else if (st.roleId === 'journalist') { pick(1); pick(2); } else pick(3); ACT.confirm({ dataset: {} }); ACT.next({ dataset: {} }); } });
    await p.waitForTimeout(300); await shot(p, 'night-end');
    // ----- the morning: seat 6 fell, the player sees her check and writes to the chat
    await S(() => ACT.resolve({ dataset: {} })); await p.waitForTimeout(500); await shot(p, 'morning');
    await waitQ(() => TB.data && TB.data.pub && TB.data.pub.phase === 'day'); await q.waitForTimeout(300);
    await shot(q, 'p-result', '.result', 160);
    await S(() => { let k = 4; while (lastWordsNow(S.game) && k--) ACT['lw-next']({ dataset: {} }); }); // v62: the last words end, the morning chat opens
    await waitQ(() => TB.data && TB.data.pub && TB.data.pub.chat === 'all'); await q.waitForTimeout(200);
    await q.evaluate(text => { TB.msg = text; }, CHAT[lang]); await Q(() => ACT['tb-send']()); await waitQ(() => TB.chat.length > 0); await q.waitForTimeout(400); await shot(q, 'p-day');
    await shot(q, 'p-chat', '#tb-chat', 150);
    await S(() => ACT.stage({ dataset: { id: 'balagan' } })); await p.waitForTimeout(400); await shot(p, 'balagan');
    await S(() => ACT.stage({ dataset: { id: 'speeches' } })); await p.waitForTimeout(400); await shot(p, 'speeches');
    await S(() => { const g = S.game; const id = s => g.players.find(x => x.seat === s).id; ACT['foul-give']({ dataset: { id: id(5), k: '1' } }); ACT['foul-give']({ dataset: { id: id(7), k: '3' } }); ACT['foul-give']({ dataset: { id: id(8), k: '2' } }); });
    await p.waitForTimeout(300); await shot(p, 'fouls-strip', '.fl-strip', 60);
    await S(() => { const g = S.game; ACT['foul-open']({ dataset: { id: g.players.find(x => x.seat === 8).id } }); }); await p.waitForTimeout(400); await shot(p, 'fouls');
    await S(() => { S.ui.sheet = null; ACT['foul-undo'](); ACT['foul-undo'](); ACT['foul-undo'](); });
    // ----- the vote: two candidates, the player votes from her phone, the host marks the rest
    await S(() => { ACT.stage({ dataset: { id: 'vote' } }); const g = S.game; ACT.cand({ dataset: { id: g.players.find(x => x.seat === 2).id } }); ACT.cand({ dataset: { id: g.players.find(x => x.seat === 4).id } }); });
    await waitQ(() => TB.data && TB.data.me && TB.data.me.ask && TB.data.me.ask.kind === 'vote' && !TB.data.me.ask.done); await q.waitForTimeout(300);
    await q.click('.tb-ask [data-a="tb-pick"][data-seat="2"]'); await q.waitForTimeout(200); await shot(q, 'p-vote', '.tb-ask', 120);
    await q.click('[data-a="tb-confirm"]'); await waitS(() => { const g = S.game; return !!g.ballot.votes[g.players.find(x => x.seat === 3).id]; });
    await S(() => { const g = S.game; const c2 = g.players.find(x => x.seat === 2).id, c4 = g.players.find(x => x.seat === 4).id; [[1, c4], [5, c2], [7, c2], [8, c2]].forEach(([s, c]) => ACT['vt-pick']({ dataset: { v: g.players.find(x => x.seat === s).id, c } })); });
    await p.waitForTimeout(300); await shot(p, 'vote', '.vote-table', 80);
    await shot(p, 'vote-count', '.tally', 130);
    await S(() => { const g = S.game; ACT['vote-finish']({ dataset: { id: g.players.find(x => x.seat === 2).id } }); }); await p.waitForTimeout(400); await shot(p, 'vote-result');
    // ----- the host's sheets and the settings
    await S(() => { S.ui.sheet = { type: 'players' }; render(); }); await p.waitForTimeout(300); await shot(p, 'sheet-players');
    await S(() => { S.ui.sheet = { type: 'log' }; render(); }); await p.waitForTimeout(300); await shot(p, 'sheet-log');
    await S(() => { S.ui.sheet = null; go('settings'); }); await p.waitForTimeout(300); await shot(p, 'settings', '.setting', 90);
    // ----- the end: the Don is taken out by the host (the city wins), the results reach the player
    await S(() => { go('game'); const g = S.game; ACT['toggle-alive']({ dataset: { id: g.players.find(x => x.seat === 1).id } }); S.ui.sheet = null; ACT.finish({ dataset: {} }); }); await p.waitForTimeout(600);
    await shot(p, 'end');
    await S(() => { const g = S.game; ACT['rv-toggle']({ dataset: { id: g.players.find(x => x.seat === 3).id } }); }); await p.waitForTimeout(300); await shot(p, 'end-review', '.rv-list', 120);
    await waitQ(() => TB.data && TB.data.pub && TB.data.pub.phase === 'end'); await q.waitForTimeout(500); await shot(q, 'p-end');
    if (errs.length) problems.push(`${lang}: page errors — ${errs.join(' | ')}`);
    await ctxH.close(); await ctxP.close();
    try { await classicFlow(lang); } catch (e) { problems.push(`${lang}: classic — ${e && e.message}`); }
    const made = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).map(f => f.replace(/\.jpg$/, ''));
    const missing = SHOTS.filter(id => !made.includes(id)); if (missing.length) problems.push(`${lang}: missing ${missing.join(', ')}`);
    console.log(`${lang}: ${made.length} pictures`);
  }
  await b.close(); await tg.close(); api.close();
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log(`guide shots: ${total} pictures → ${out}`);
}
module.exports = { SHOTS, LANGS };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
