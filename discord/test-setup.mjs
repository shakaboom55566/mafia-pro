/* Runs discord/setup.mjs against the fake Discord API: the v33 server (Russian only) is migrated to v34 (five languages),
   the layout is created once, the second run changes nothing; every message respects Discord's limits.
   Run: node --no-warnings discord/test-setup.mjs */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startMockDiscord } from '../backend/test/mock-discord.js';
import { run, LAYOUT, ROLES_LAYOUT, loadApp, buildContent, buildShared, LK, LANG_CHANNELS } from './setup.mjs';
import { T, LANG_ORDER } from './texts.mjs';

let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('  FAIL', m); } };
const dc = await startMockDiscord(8795);
const stateFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mp-discord-')), 'server.json');
const env = { CARDS_BASE: 'https://shakaboom55566.github.io/mafia-pro/cards/', DISCORD_BOT_TOKEN: 'dc-token', DISCORD_GUILD_ID: '111111111111', DISCORD_API: dc.base, STATE_FILE: stateFile, TG_BOT_USERNAME: 'mafiapro_test_bot', APP_URL: 'https://shakaboom55566.github.io/mafia-pro/', API_URL: 'https://mafia-pro-api.test' };
const G = '111111111111'; const VIEW = 1n << 10n, SEND = 1n << 11n;
const dreq = async (method, p, body) => (await fetch(dc.base + p, { method, headers: { Authorization: 'Bot dc-token', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })).json();
const B = x => Buffer.byteLength(String(x || ''), 'utf8');

console.log('texts: every language has every string');
{ const keys = o => Object.keys(o).sort().join(',');
  for (const l of LANG_ORDER) { ok(keys(T[l]).replace(',catPrev', '') === keys(T.ru).replace(',catPrev', ''), `${l}: same keys as ru`); ok(keys(T[l].ch) === keys(T.ru.ch), `${l}: every channel named`); ok(T[l].rules(k => '#' + k).length === 10, `${l}: 10 server rules`); }
  const names = LANG_ORDER.flatMap(l => Object.values(T[l].ch).map(c => c[0])); ok(names.every(x => x.length <= 100 && x === x.toLowerCase() && !/\s/.test(x)), 'channel names: lower case, no spaces, ≤ 100'); }

console.log('content: Discord limits in every language');
for (const l of LANG_ORDER) {
  const app = loadApp(l); const content = buildContent(app, { ids: {}, botUsername: 'x', appUrl: 'https://a.b/', cardsBase: `https://a.b/cards/${l}/` }, l);
  ok(app.ROLES.length >= 50, `${l}: roles loaded from the app: ${app.ROLES.length}`);
  const cards = ['cardsMafia', 'cardsCity', 'cardsNeutral'].reduce((a, k) => a + content[k].reduce((b, m) => b + m.embeds.length, 0) - 1, 0); ok(cards === app.ROLES.length, `${l}: every role has a card: ${cards}/${app.ROLES.length}`);
  let bad = 0;
  for (const [k, msgs] of Object.entries(content)) msgs.forEach((m, i) => {
    const size = m.embeds.reduce((a, e) => a + B(e.title) + B(e.description) + B(e.footer && e.footer.text) + (e.fields || []).reduce((b, f) => b + B(f.name) + B(f.value), 0), 0);
    if (!(m.embeds.length >= 1 && m.embeds.length <= 10 && size <= 5600)) { bad++; console.log(`    ${l}/${k}[${i}]: ${m.embeds.length} embeds, ${size} bytes`); }
    m.embeds.forEach(e => { if (!((e.title || '').length <= 256 && (e.description || '').length <= 4096 && (e.fields || []).length <= 25 && (e.fields || []).every(f => f.name.length <= 256 && f.value.length <= 1024 && f.value.length > 0) && (!e.footer || e.footer.text.length <= 2048))) { bad++; console.log(`    ${l}/${k}: embed "${e.title}" over a limit`); } if (/undefined|NaN|\[object|function/.test(JSON.stringify(e))) { bad++; console.log(`    ${l}/${k}: undefined in "${e.title}"`); } });
  });
  ok(!bad, `${l}: every message within Discord's limits`);
  const imgs = ['cardsMafia', 'cardsCity', 'cardsNeutral'].flatMap(k => content[k].slice(1).flatMap(m => m.embeds)); ok(imgs.every(e => e.image && new RegExp(`^https://a\\.b/cards/${l}/[a-z_]+\\.png\\?v=[0-9a-f]{8}$`).test(e.image.url)), `${l}: every card has its picture in its language`);
  ok(new Set(imgs.map(e => e.image.url)).size === imgs.length, `${l}: one picture per role`);
  ok(content.cardsMafia.slice(1).some(m => m.embeds.some(e => e.title.includes(app.L.roles.don.name))), `${l}: the Don (${app.L.roles.don.name}) in the mafia cards`);
  ok(content.scenarios.some(m => m.embeds.some(e => e.title.includes(app.CLASSIC.name))) && content.scenarios.some(m => m.embeds.some(e => /📦/.test(e.title))), `${l}: scenarios: classic and the pack`);
}
{ const ru = buildContent(loadApp('ru'), { ids: {}, botUsername: 'x', appUrl: 'https://a.b/', cardsBase: '' }, 'ru'); ok(ru.cardsMafia[1].embeds.every(e => !e.image && e.footer), 'no images → lore in the footer');
  const uk = buildContent(loadApp('uk'), { ids: {}, botUsername: 'x', appUrl: 'https://a.b/', cardsBase: '' }, 'uk'); ok(uk.rules[0].embeds[0].description.includes('**1. Повага.**') && uk.howto[0].components[0].components[0].label === '▶️ Грати в Telegram', 'Ukrainian texts and buttons');
  const pl = buildContent(loadApp('pl'), { ids: {}, botUsername: 'x', appUrl: 'https://a.b/', cardsBase: '' }, 'pl'); ok(pl.cardsCity[1].embeds[0].fields[0].name === 'Drużyna' && /2 gracze|7 graczy/.test(JSON.stringify(pl.scenarios)), 'Polish fields and plurals');
  const sh = buildShared({ ids: {}, appUrl: 'https://a.b/', roleIds: { lang_ru: '1', lang_uk: '2', lang_en: '3', lang_pl: '4', lang_hy: '5', host: '6', player: '7' } });
  ok(sh.language[0].components[0].components.map(b => b.custom_id).join() === 'mp:l:ru:1,mp:l:uk:2,mp:l:en:3,mp:l:pl:4,mp:l:hy:5' && sh.language[0].components[1].components.map(b => b.custom_id).join() === 'mp:p:host:6,mp:p:player:7', 'the chooser: five language buttons and two role buttons');
  ok(sh.language[0].components.flatMap(r => r.components).every(b => b.label.length <= 80 && b.custom_id.length <= 100), 'button labels and ids within limits'); }

console.log('the v33 server (Russian only) as it is now');
// v33: the layout before languages, made by the previous setup.mjs — channels that must be found and moved, not duplicated
const own = await dreq('POST', `/guilds/${G}/channels`, { name: 'основной', type: 0 });
const v33 = {}; const mk = async (key, name, type, parent, ro) => { const b = { name, type }; if (parent) b.parent_id = v33[parent]; if (ro) b.permission_overwrites = [{ id: G, type: 0, allow: '0', deny: String(SEND) }]; v33[key] = (await dreq('POST', `/guilds/${G}/channels`, b)).id; };
await mk('catInfo', '📌 MAFIA PRO', 4); await mk('welcome', '👋・добро-пожаловать', 0, 'catInfo', 1); await mk('rules', '📜・правила-сервера', 0, 'catInfo', 1); await mk('news', '📣・новости', 0, 'catInfo', 1); await mk('howto', '📱・как-играть', 0, 'catInfo', 1);
await mk('catLib', '📚 БИБЛИОТЕКА', 4); for (const [k, nm] of [['cardsMafia', '🖤・карты-мафии'], ['cardsCity', '❤️・карты-города'], ['cardsNeutral', '🤍・нейтралы'], ['scenarios', '📚・сценарии'], ['gameRules', '⚖️・правила-игры']]) await mk(k, nm, 0, 'catLib', 1);
await mk('catGame', '🎲 ИГРА', 4); await mk('lfg', '🔎・ищу-игру', 0, 'catGame', 1); await mk('results', '🏆・результаты', 0, 'catGame', 1); await mk('chat', '💬・общий-чат', 0, 'catGame'); await mk('ideas', '💡・идеи-и-баги', 0, 'catGame'); await mk('lobby', '🔊 Лобби', 2, 'catGame'); await mk('catTables', '🎧 ИГРОВЫЕ СТОЛЫ', 4);
const oldHook = await dreq('POST', `/channels/${v33.lfg}/webhooks`, { name: 'Mafia Pro · Столы' });
await dreq('POST', `/guilds/${G}/roles`, { name: '🎩 Ведущий' });
fs.writeFileSync(stateFile, JSON.stringify({ guild: G, channels: v33, roles: {}, webhooks: {} }));
const n33 = dc.channels.size;

console.log('first run: migration to five languages');
const logs = []; const s1 = await run(env, x => logs.push(x));
const chans = [...dc.channels.values()]; const C = k => dc.channels.get(s1.channels[k]);
ok(LAYOUT.every(c => chans.some(x => x.id === s1.channels[c.key] && x.type === c.type)), 'every channel and category exists');
ok(LAYOUT.filter(c => c.parent).every(c => C(c.key).parent_id === s1.channels[c.parent]), 'channels sit in their categories');
ok(Object.keys(v33).every(k => s1.channels[k] === v33[k]), 'every v33 channel kept its id (Russian set + shared)');
ok(dc.channels.size === n33 + LAYOUT.length - Object.keys(v33).length, `new channels only for the new languages and 🌐: ${dc.channels.size - n33} new`);
ok(C('welcome').name === '👋・welcome' && C('news').name === '📣・news' && C('lobby').name === '🔊 Lobby' && C('catLib').name === '📚 БИБЛИОТЕКА · RU' && C('catGame').name === '🎲 ИГРА · RU', 'v33 names → the new names');
ok(C('rules').parent_id === s1.channels.catLib && C('howto').parent_id === s1.channels.catLib && C('lobby').parent_id === s1.channels.catInfo, 'rules and how-to moved into the Russian library, the lobby into 📌');
ok(ROLES_LAYOUT.every(r => [...dc.roles.values()].some(x => x.id === s1.roles[r.key] && x.name === r.name)) && [...dc.roles.values()].filter(r => r.name === '🎩 Ведущий').length === 1, 'roles: 🎩 🎲 and the five languages, no duplicate');
const ow = (k, id) => (C(k).permission_overwrites || []).find(o => o.id === id);
for (const l of LANG_ORDER) {
  const role = s1.roles['lang_' + l]; const keys = [LK('catLib', l), LK('catGame', l)].concat(LANG_CHANNELS.lib.map(k => LK(k, l)), LANG_CHANNELS.game.map(k => LK(k, l)));
  ok(keys.every(k => ow(k, G) && BigInt(ow(k, G).deny) & VIEW && ow(k, role) && BigInt(ow(k, role).allow) & VIEW), `${l}: hidden from @everyone, open to «${T[l].name}»`);
  ok(LANG_ORDER.filter(x => x !== l).every(x => keys.every(k => !ow(k, s1.roles['lang_' + x]))), `${l}: other languages do not see it`);
  ok(BigInt(ow(LK('rules', l), G).deny) & SEND && !(BigInt(ow(LK('chat', l), G).deny) & SEND), `${l}: library read-only, chat open for writing`);
  ok(C(LK('lfg', l)).name === T[l].ch.lfg[0] && C(LK('catLib', l)).name === T[l].cat.lib, `${l}: channels named in the language`);
}
ok(['welcome', 'language', 'news'].every(k => BigInt(ow(k, G).deny) & SEND && !(BigInt(ow(k, G).deny) & VIEW)) && !ow('lobby', G) && !ow('catTables', G), 'shared channels: visible to all, read-only; lobby and tables open');
const hooks = [...dc.webhooks.values()]; const hk = (name, key) => hooks.some(w => w.name === name && w.channel_id === s1.channels[key]);
ok(hk('Mafia Pro · Столы', 'lfg') && hk('Mafia Pro · Итоги', 'results') && hk('Mafia Pro · Stoły', 'lfg_pl') && hk('Mafia Pro · Підсумки', 'results_uk') && hk('Mafia Pro · Սեղաններ', 'lfg_hy') && hk('Mafia Pro · Новости', 'news'), 'webhooks per language + news');
ok(hooks.filter(w => w.name === 'Mafia Pro · Столы').length === 1 && hooks.some(w => w.id === oldHook.id), 'the v33 webhook is reused');
ok(dc.widget.enabled === true && dc.widget.channel_id === s1.channels.welcome, 'server widget on, its invite leads to the welcome channel');
ok(dc.guild.system_channel_id === s1.channels.welcome && dc.guild.default_message_notifications === 1, 'welcome = system channel, notifications = mentions');
const msgs = k => dc.messages.get(s1.channels[k]) || [];
const lang = msgs('language'); ok(lang.length === 1 && lang[0].components[0].components.length === 5 && lang[0].components[0].components[1].custom_id === `mp:l:uk:${s1.roles.lang_uk}` && lang[0].components[1].components[0].custom_id === `mp:p:host:${s1.roles.host}`, 'the 🌐 channel: language and role buttons with the real role ids');
ok(msgs('welcome')[0].embeds[0].description.includes('Українська') && msgs('welcome')[0].embeds[0].description.includes(`<#${s1.channels.language}>`) && msgs('welcome')[0].components[0].components[0].url === 'https://t.me/mafiapro_test_bot', 'welcome in five languages with a link to 🌐');
ok(msgs('rules_en')[0].embeds[0].description.includes('**1. Respect.**') && msgs('rules_hy')[0].embeds[0].title === '📜 Սերվերի կանոններ', 'server rules in English and Armenian');
ok(msgs('howto_pl')[0].embeds[0].fields[0].value.includes(`<#${s1.channels.rules_pl}>`) && msgs('howto_pl')[0].embeds[0].fields[2].value.includes(`<#${s1.channels.language}>`), 'links go to the same language’s channels and to 🌐');
ok(msgs('cardsMafia_uk').some(m => m.embeds.some(e => /Дон мафії/.test(e.title) && /cards\/uk\/don\.png/.test(e.image.url))), 'Ukrainian cards with Ukrainian pictures');
ok(LANG_ORDER.every(l => msgs(LK('scenarios', l)).length >= 3 && msgs(LK('gameRules', l)).length >= 1 && msgs(LK('lfg', l)).length === 1), 'library and #lfg filled in every language');
ok(dc.app.interactions_endpoint_url === 'https://mafia-pro-api.test/discord/interactions' && logs.some(l => l.includes('~ interactions endpoint')) && s1.publicKey === dc.app.verify_key, 'buttons and slash commands go to the backend, public key saved');
const an = C('analytics'); ok(an && an.parent_id === s1.channels.catAdmin && ow('analytics', G) && BigInt(ow('analytics', G).deny) & VIEW && !LANG_ORDER.some(l => ow('analytics', s1.roles['lang_' + l])) && hooks.some(w => w.name === 'Mafia Pro · Аналитика' && w.channel_id === an.id), '#аналитика: admins only (no language opens it), with its webhook');
ok(JSON.stringify(dc.commands().map(c => c.name)) === '["stats","link","invites"]' && dc.commands()[0].options[0].type === 6 && dc.commands()[2].default_member_permissions === '32', 'slash commands /stats (member option), /link, /invites (admins)');
const top = [...dc.channels.values()].filter(c => c.type === 4).sort((a, b) => a.position - b.position).map(c => c.id);
ok(top.join() === LAYOUT.filter(c => c.type === 4).map(c => s1.channels[c.key]).join(), 'categories in order: 📌, ru, uk, en, pl, hy, tables');
const lib = [...dc.channels.values()].filter(c => c.parent_id === s1.channels.catLib).sort((a, b) => a.position - b.position).map(c => c.id);
ok(lib.join() === LANG_CHANNELS.lib.map(k => s1.channels[k]).join(), 'Russian library in order: rules, how-to, cards…');
ok(!fs.readFileSync(stateFile, 'utf8').includes('tok'), 'no webhook token in the state file');
ok(dc.channels.has(own.id) && dc.channels.get(own.id).parent_id === null && !(dc.channels.get(own.id).permission_overwrites || []).length, 'the owner’s own channel is untouched');
ok(!dc.calls.some(c => c.method === 'DELETE' && /\/channels\/\d+$/.test(c.url)), 'no channel deleted');

console.log('second run: nothing new');
const before = { ch: dc.channels.size, hooks: dc.webhooks.size, roles: dc.roles.size, msgs: [...dc.messages.values()].reduce((a, l) => a + l.length, 0) }; const calls0 = dc.calls.length;
const logs2 = []; await run(env, x => logs2.push(x));
ok(dc.channels.size === before.ch && dc.webhooks.size === before.hooks && dc.roles.size === before.roles && [...dc.messages.values()].reduce((a, l) => a + l.length, 0) === before.msgs, 'same channels, webhooks, roles and messages');
ok(!dc.calls.slice(calls0).some(c => c.method !== 'GET'), 'only reads on an unchanged server: ' + dc.calls.slice(calls0).filter(c => c.method !== 'GET').map(c => c.method + ' ' + c.url).join(', '));
ok(logs2.some(l => l.includes('0 posted, 0 edited, 0 removed')), 'messages unchanged');

console.log('hand changes: renamed channel, extra overwrite, extra bot message, a role re-created');
C('chat').name = 'болталка'; C('chat_en').permission_overwrites.push({ id: '777', type: 1, allow: String(SEND), deny: '0' }); await run(env, () => {});
ok(dc.channels.size === before.ch && C('chat').name === 'болталка', 'a channel renamed by hand keeps its name, no duplicate');
ok(ow('chat_en', '777') && ow('chat_en', s1.roles.lang_en), 'a member overwrite made by hand is kept');
dc.messages.get(s1.channels.rules).push({ id: '1', channel_id: s1.channels.rules, author: dc.botUser, embeds: [{ title: 'old' }], components: [] }); await run(env, () => {}); ok(msgs('rules').length === 1, 'an extra bot message is removed');
dc.roles.delete(s1.roles.lang_pl); const s3 = await run(env, () => {}); const plRole = s3.roles.lang_pl;
ok(plRole !== s1.roles.lang_pl && ow('lfg_pl', plRole) && !ow('lfg_pl', s1.roles.lang_pl) && msgs('language')[0].components[0].components[3].custom_id === `mp:l:pl:${plRole}`, 'a deleted language role is re-created; channels and the button follow it');

console.log('the endpoint refused (backend not deployed yet): logged, nothing else breaks');
dc.app.interactions_endpoint_url = null; dc.st.endpointFail = true; const logs4 = []; await run(env, x => logs4.push(x)); dc.st.endpointFail = false;
ok(logs4.some(l => l.includes('did not accept')) && logs4.some(l => l.includes('tables category')), 'warning in the log, the run finishes');

console.log('backend role names are in sync with the app');
{ const { roleNamesSource } = await import('./gen-role-names.mjs'); ok(fs.readFileSync(new URL('../backend/src/role-names.js', import.meta.url), 'utf8') === roleNamesSource(), 'backend/src/role-names.js is up to date (node discord/gen-role-names.mjs)'); }

await dc.close();
console.log(fails ? `\n${fails} of ${n} checks FAILED` : `\nALL OK (${n} checks)`); process.exit(fails ? 1 : 0);
