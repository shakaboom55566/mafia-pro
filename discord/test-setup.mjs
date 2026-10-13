/* Runs discord/setup.mjs against the fake Discord API twice: the layout is created once, the second run changes nothing;
   every message respects Discord's embed limits. Run: node --no-warnings discord/test-setup.mjs */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startMockDiscord } from '../backend/test/mock-discord.js';
import { run, LAYOUT, ROLES_LAYOUT, loadApp, buildContent } from './setup.mjs';

let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('  FAIL', m); } };
const dc = await startMockDiscord(8795);
const stateFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mp-discord-')), 'server.json');
const env = { DISCORD_BOT_TOKEN: 'dc-token', DISCORD_GUILD_ID: '111111111111', DISCORD_API: dc.base, STATE_FILE: stateFile, TG_BOT_USERNAME: 'mafiapro_test_bot', APP_URL: 'https://shakaboom55566.github.io/mafia-pro/' };
// a channel the owner made before: never touched
const own = await (await fetch(dc.base + '/guilds/111111111111/channels', { method: 'POST', headers: { Authorization: 'Bot dc-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'основной', type: 0 }) })).json();

console.log('content: Discord limits');
{ const app = loadApp('ru'); const content = buildContent(app, { ids: {}, botUsername: 'x', appUrl: 'https://a.b/' });
  ok(app.ROLES.length >= 50, 'roles loaded from the app: ' + app.ROLES.length);
  const cards = ['cardsMafia', 'cardsCity', 'cardsNeutral'].reduce((a, k) => a + content[k].reduce((b, m) => b + m.embeds.length, 0) - 1, 0); ok(cards === app.ROLES.length, `every role has a card: ${cards}/${app.ROLES.length}`);
  for (const [k, msgs] of Object.entries(content)) msgs.forEach((m, i) => {
    const B = x => Buffer.byteLength(String(x || ''), 'utf8'); const size = m.embeds.reduce((a, e) => a + B(e.title) + B(e.description) + B(e.footer && e.footer.text) + (e.fields || []).reduce((b, f) => b + B(f.name) + B(f.value), 0), 0);
    ok(m.embeds.length >= 1 && m.embeds.length <= 10 && size <= 5600, `${k}[${i}]: ${m.embeds.length} embeds, ${size} bytes (Discord refused 11332)`);
    m.embeds.forEach(e => { ok((e.title || '').length <= 256 && (e.description || '').length <= 4096 && (e.fields || []).length <= 25 && (e.fields || []).every(f => f.name.length <= 256 && f.value.length <= 1024 && f.value.length > 0) && (!e.footer || e.footer.text.length <= 2048), `${k}: embed "${(e.title || '').slice(0, 40)}" within limits`); ok(!/undefined|NaN|\[object/.test(JSON.stringify(e)), `${k}: no undefined in "${(e.title || '').slice(0, 30)}"`); });
  });
  ok(content.cardsMafia.slice(1).some(m => m.embeds.some(e => /Дон мафии/.test(e.title))) && content.cardsCity.slice(1).some(m => m.embeds.some(e => /Шериф/.test(e.title))), 'Don in the mafia cards, Sheriff in the city cards');
  ok(content.scenarios.some(m => m.embeds.some(e => /Классическая мафия/.test(e.title))) && content.scenarios.some(m => m.embeds.some(e => /📦/.test(e.title))), 'scenarios: classic and the pack'); }

console.log('first run: layout, roles, webhooks, messages');
const logs = []; const s1 = await run(env, x => logs.push(x));
const chans = [...dc.channels.values()];
ok(LAYOUT.every(c => chans.some(x => x.id === s1.channels[c.key] && x.type === c.type)), 'every channel and category exists');
ok(LAYOUT.filter(c => c.parent).every(c => dc.channels.get(s1.channels[c.key]).parent_id === s1.channels[c.parent]), 'channels sit in their categories');
const ro = LAYOUT.filter(c => c.ro).map(c => dc.channels.get(s1.channels[c.key]));
ok(ro.every(c => (c.permission_overwrites || []).some(o => o.id === '111111111111' && BigInt(o.deny) & (1n << 11n))), 'info, library and bot channels are read-only for @everyone');
ok(!(dc.channels.get(s1.channels.chat).permission_overwrites || []).length, 'the chat stays open');
ok(dc.channels.get(s1.channels.lobby).type === 2 && dc.channels.get(s1.channels.catTables).type === 4 && s1.tablesCategory === s1.channels.catTables, 'voice lobby + the category for table rooms');
ok(ROLES_LAYOUT.every(r => [...dc.roles.values()].some(x => x.id === s1.roles[r.key] && x.name === r.name)), 'roles 🎩 Ведущий and 🎲 Игрок');
const hooks = [...dc.webhooks.values()];
ok(['Mafia Pro · Столы', 'Mafia Pro · Итоги', 'Mafia Pro · Новости'].every(nm => hooks.some(w => w.name === nm)) && hooks.find(w => w.name === 'Mafia Pro · Столы').channel_id === s1.channels.lfg, 'webhooks in #ищу-игру, #результаты, #новости');
ok(dc.guild.system_channel_id === s1.channels.welcome && dc.guild.default_message_notifications === 1, 'welcome = system channel, notifications = mentions');
const msgs = k => dc.messages.get(s1.channels[k]) || [];
ok(msgs('welcome').length === 1 && msgs('welcome')[0].components[0].components[0].url === 'https://t.me/mafiapro_test_bot' && msgs('welcome')[0].embeds[0].fields[1].value.includes(`<#${s1.channels.howto}>`), 'welcome with the Telegram button and channel links');
ok(msgs('rules')[0].embeds[0].description.includes('**1. Уважение.**') && msgs('rules')[0].embeds[0].description.includes('**10.'), 'server rules 1–10');
ok(msgs('cardsMafia').length >= 2 && msgs('scenarios').length >= 3 && msgs('gameRules').length >= 1, 'library filled');
ok(!fs.readFileSync(stateFile, 'utf8').includes('tok'), 'no webhook token in the state file');
ok(dc.channels.has(own.id) && dc.channels.get(own.id).parent_id === null, 'the owner’s own channel is untouched');
ok(!dc.calls.some(c => c.method === 'DELETE' && /\/channels\/\d+$/.test(c.url)), 'no channel deleted');

console.log('second run: nothing new');
const before = { ch: dc.channels.size, hooks: dc.webhooks.size, roles: dc.roles.size, msgs: [...dc.messages.values()].reduce((a, l) => a + l.length, 0) }; const calls0 = dc.calls.length;
const logs2 = []; await run(env, x => logs2.push(x));
ok(dc.channels.size === before.ch && dc.webhooks.size === before.hooks && dc.roles.size === before.roles && [...dc.messages.values()].reduce((a, l) => a + l.length, 0) === before.msgs, 'same channels, webhooks, roles and messages');
ok(!dc.calls.slice(calls0).some(c => c.method !== 'GET'), 'only reads on an unchanged server: ' + dc.calls.slice(calls0).filter(c => c.method !== 'GET').map(c => c.method + ' ' + c.url).join(', '));
ok(logs2.some(l => l.includes('0 posted, 0 edited, 0 removed')), 'messages unchanged');

console.log('a channel renamed by hand is found by its id; the state from another server is ignored');
dc.channels.get(s1.channels.chat).name = 'болталка'; await run(env, () => {}); ok(dc.channels.size === before.ch, 'renamed channel kept, no duplicate');
dc.messages.get(s1.channels.rules).push({ id: '1', channel_id: s1.channels.rules, author: dc.botUser, embeds: [{ title: 'old' }], components: [] }); await run(env, () => {}); ok(msgs('rules').length === 1, 'an extra bot message is removed');

await dc.close();
console.log(fails ? `\n${fails} of ${n} checks FAILED` : `\nALL OK (${n} checks)`); process.exit(fails ? 1 : 0);
