#!/usr/bin/env node
/* ============================================================
   Mafia Pro — Discord server setup through the bot (runs in GitHub Actions, workflow discord.yml).
   Idempotent: re-running updates what it created and never touches other channels.
   v34 — languages: everyone sees 📌 MAFIA PRO (welcome, 🌐 language choice, news, lobby) and the voice tables; the library and
   game text channels exist in five languages (ru, uk, en, pl, hy) and each set is visible only to its language role.
   The 🌐 channel has buttons: a language button gives / takes the language role, 🎩 / 🎲 — the game roles. Clicks reach the
   backend worker (/discord/interactions), which this script registers as the app's Interactions Endpoint URL.
   - roles: 🎩 Ведущий, 🎲 Игрок, Русский, Українська, English, Polski, Հայերեն; v54 — eight rank roles («🎯 Мастер · Master»…), placed above
     🎩 / 🎲 and the languages (the name takes the rank's color); the backend gives them to members who linked Telegram
   - categories / channels: info (welcome, server rules, news, how to play), library (mafia / city / neutral cards,
     scenarios, game rules), game (#ищу-игру, #результаты, chat, ideas, 🔊 Лобби), 🎧 ИГРОВЫЕ СТОЛЫ (voice rooms of tables)
   - 🔗 social media in every language's library (15.10.2026): a card per link (SOCIALS in texts.mjs), and a permanent invite to 🌐
     (state.invite) for links to the server from outside
   - read-only info / library / bot channels, the welcome channel as the system channel, notifications = mentions only
   - webhooks "Mafia Pro · Столы" (#ищу-игру), "Mafia Pro · Итоги" (#результаты), "Mafia Pro · Новости" (#новости)
   - messages: the bot's own messages in its channels are edited in place (content comes from the app's own data)
   Env: DISCORD_BOT_TOKEN, DISCORD_GUILD_ID (or backend/wrangler.toml), BOT_TOKEN (optional: the Telegram bot's @username),
        APP_URL, DISCORD_API (tests), STATE_FILE (default discord/server.json), LOG_FILE.
   Writes the state file (ids only, no tokens) — the workflow commits it and puts the tables category id into wrangler.toml.
   ============================================================ */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { T, LANG_ORDER, GAME_ROLES, SOCIALS } from './texts.mjs';
import { HOOKS, PERM } from '../backend/src/discord.js';
import { RANK_IDS, RANK_COLOR, rankRoleName } from '../backend/src/ranks.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- the app's own data (roles, scenarios, rules) in Russian ---------- */
export function loadApp(lang = 'ru') {
  const build = fs.readFileSync(path.join(ROOT, 'build.sh'), 'utf8');
  const files = build.match(/cat (src\/02-i18n\.js[^\n]*)/)[1].split(/\s+/).filter(f => f.endsWith('.js') && /^src\/02/.test(f));
  const ctx = { console, Math, Date, Object, Array, Set, Map, Number, String, JSON, Proxy, Intl, setTimeout, clearTimeout, setInterval, clearInterval,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, document: { querySelector: () => null, addEventListener() {}, createElement: () => ({}), body: { appendChild() {} }, documentElement: {} }, navigator: { language: lang } };
  ctx.window = { scrollTo() {} }; ctx.self = ctx; vm.createContext(ctx);
  vm.runInContext(files.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n') + `\nsetLang(${JSON.stringify(lang)}); this.APP = { L, ROLES, SCENARIOS, CLASSIC, PACKS, presetFor, MIN_PLAYERS, MAX_PLAYERS, roleArt: typeof roleArt === 'function' ? roleArt : null };`, ctx);
  return ctx.APP;
}

/* ---------- Discord REST ---------- */
function client(env, log) {
  const base = String(env.DISCORD_API || 'https://discord.com/api/v10').replace(/\/$/, '');
  let calls = 0;
  async function api(method, p, body, quiet) {
    for (let i = 0; i < 6; i++) {
      if (calls++) await sleep(env.DISCORD_API ? 0 : 250); // gentle pace: well under the per-route limits
      let r;
      try { r = await fetch(base + p, { method, headers: { Authorization: 'Bot ' + env.DISCORD_BOT_TOKEN, 'Content-Type': 'application/json', 'User-Agent': 'DiscordBot (https://github.com/shakaboom55566/mafia-pro, 1.0)', 'X-Audit-Log-Reason': 'Mafia Pro setup' }, body: body ? JSON.stringify(body) : undefined }); }
      catch (e) { if (i < 5) { await sleep(1000); continue; } throw new Error(`${method} ${p}: network`); }
      if (r.status === 204) return null;
      let d = null; try { d = await r.json(); } catch (e) {}
      if (r.status === 429) { const s = Number(d && d.retry_after) || Number(r.headers.get('retry-after')) || 1; log(`  rate limited, waiting ${s}s`); await sleep(Math.min(s, 30) * 1000 + 100); continue; }
      if (r.status >= 500 && i < 5) { await sleep(1500); continue; }
      if (!r.ok) { const err = new Error(`${method} ${p.replace(/\/webhooks\/(\d+)\/[^/]+/, '/webhooks/$1/<token>')}: ${r.status} ${(d && d.message) || ''}`); err.status = r.status; if (!quiet) log('  ! ' + err.message); throw err; }
      return d;
    }
    throw new Error(`${method} ${p}: gave up`);
  }
  return api;
}

/* ---------- content ---------- */
const COLOR = { gold: 0xd4a24c, mafia: 0x8b1e2d, city: 0xc9a24c, neutral: 0x7a7f8c, ww: 0x6b4fa0, blurple: 0x5865f2, green: 0x3ba55d, lang: 0x99aab5 };
const SOCIAL_COLOR = { channel: 0x2aabee, chat: 0x229ed9, instagram: 0xe1306c, facebook: 0x1877f2, tiktok: 0xfe2c55, site: COLOR.gold, play: COLOR.green }; // the stripe of each card in 🔗
const TEAM_ICON = { black: '🖤', red: '❤️', neutral: '🤍', ww: '🐺' };
const STARS = { role: 100, scenario: 500, pack: 1750 };
const hash8 = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }; // FNV-1a: the card image URL changes when the card does
const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
const B = s => Buffer.byteLength(String(s || ''), 'utf8'); // Discord rejects messages by their UTF-8 size (413 "message.embeds"), Cyrillic is 2 bytes a letter, Armenian 2
const embedSize = e => B(e.title) + B(e.description) + B(e.footer && e.footer.text) + (e.fields || []).reduce((a, f) => a + B(f.name) + B(f.value), 0);
/* pack embeds into messages: ≤ 10 embeds and ≤ 5000 bytes of text each */
function packEmbeds(embeds, extra = {}) {
  const out = []; let cur = [], size = 0;
  for (const e of embeds) { const s = embedSize(e); if (cur.length && (cur.length >= 10 || size + s > 5000)) { out.push(Object.assign({ embeds: cur }, extra)); cur = []; size = 0; } cur.push(e); size += s; }
  if (cur.length) out.push(Object.assign({ embeds: cur }, extra));
  return out;
}
const linkButtons = links => ({ components: [{ type: 1, components: links.filter(l => l.url).slice(0, 5).map(l => ({ type: 2, style: 5, label: l.label, url: l.url })) }] });
/* the channel key of a language: Russian keeps the original keys (and channel ids) of v33, the others get a suffix */
export const LK = (key, lang) => (lang === 'ru' ? key : `${key}_${lang}`);
export const LANG_CHANNELS = { lib: ['rules', 'howto', 'socials', 'cardsMafia', 'cardsCity', 'cardsNeutral', 'scenarios', 'gameRules'], game: ['lfg', 'results', 'chat', 'ideas'] };

/* the library and game channels of one language; keys are the base keys (rules, howto, cardsMafia…) */
export function buildContent(app, ctx, lang = 'ru') {
  const { L } = app; const t = T[lang]; const R = id => (L.roles[id] || {}).name || id;
  const ch = k => { const id = ctx.ids[k === 'language' ? k : LK(k, lang)]; return id ? `<#${id}>` : `#${k}`; };
  const tgLink = ctx.botUsername ? `https://t.me/${ctx.botUsername}?start=dc` : null; // start=dc: the bot counts players who came from Discord
  const pack = app.PACKS.diplomacy; const packName = (L.ui && L.ui.packTitle) || 'Diplomacy';
  const buttons = linkButtons([{ label: t.btnTg, url: tgLink }, { label: t.btnWeb, url: ctx.appUrl }]);
  const compText = ids => { const c = {}; ids.forEach(id => { c[id] = (c[id] || 0) + 1; }); return Object.entries(c).map(([id, n]) => R(id) + (n > 1 ? ` ×${n}` : '')).join(', '); };

  // ----- role cards (names, rules, lore from the app in this language; the picture is the card rendered in this language)
  const roleEmbed = r => {
    const tr = L.roles[r.id] || {}; const inPack = pack.roles.includes(r.id);
    const rules = (tr.rules || []).map(x => '• ' + x).join('\n');
    const desc = cut([tr.kind ? `*${tr.kind}*` : '', tr.short || '', rules, tr.tip ? `💡 ${tr.tip}` : ''].filter(Boolean).join('\n\n'), 3000);
    const fields = [{ name: t.team, value: (L.teams && L.teams[r.team]) || r.team, inline: true }, { name: t.checks, value: (L.colors && L.colors[r.color]) || r.color, inline: true }];
    fields.push({ name: t.access, value: inPack ? t.pack(packName, STARS.pack) : r.premium ? t.premium(STARS.role) : t.free, inline: true });
    const e = { title: `${TEAM_ICON[r.team] || '🃏'} ${tr.name || r.id}${inPack ? ' · 📦' : r.premium ? ' · 💎' : ''}`, description: desc, color: r.team === 'black' ? COLOR.mafia : r.team === 'red' ? COLOR.city : r.team === 'ww' ? COLOR.ww : COLOR.neutral, fields };
    if (ctx.cardsBase) e.image = { url: `${ctx.cardsBase}${r.id}.png?v=${hash8(JSON.stringify([tr.name, tr.kind, tr.short, tr.lore, r.team, !!r.premium]) + (app.roleArt ? app.roleArt(r.id) : ''))}` }; // the app's own card face, rendered by discord/render-cards.js into the Pages site
    else if (tr.lore) e.footer = { text: cut(tr.lore, 200) };
    return e;
  };
  const order = r => (pack.roles.includes(r.id) ? 2 : r.premium ? 1 : 0);
  const cardsOf = teams => app.ROLES.filter(r => teams.includes(r.team)).sort((a, b) => order(a) - order(b)).map(roleEmbed);
  const cardsIntro = ([title, text], color) => ({ embeds: [{ title, description: `${text}\n\n${t.cardsNote(packName, STARS.role)}`, color }] });

  // ----- scenarios
  const sizes = [7, 8, 10, 12, 15, 20, 24].filter(n => n >= app.MIN_PLAYERS && n <= app.MAX_PLAYERS);
  const freeEmbeds = [
    { title: t.classic(app.CLASSIC.name, app.CLASSIC.comp.length || 10), description: cut(app.CLASSIC.lore, 1500), color: COLOR.gold, fields: [{ name: t.comp, value: compText(app.CLASSIC.comp) }, { name: t.format, value: t.offline, inline: true }] },
    { title: t.roleGame(`${app.MIN_PLAYERS}–${t.players(app.MAX_PLAYERS)}`), description: t.roleGameD, color: COLOR.gold, fields: sizes.map(n => ({ name: t.players(n), value: cut(compText(app.presetFor(n)), 1000) })) }
  ];
  const scenEmbed = s => ({ title: `${s.pack ? '📦' : '💎'} ${s.name}`, description: cut(s.lore, 1500), color: s.pack ? COLOR.ww : COLOR.blurple, fields: [{ name: t.special, value: cut(s.roles.map(R).join(', '), 1000) }, { name: t.count, value: `${s.min}–${s.max}`, inline: true }, { name: t.access, value: s.pack ? t.pack(packName, STARS.pack) : `${STARS.scenario} ⭐`, inline: true }] });
  const packEmbed = { title: t.packTitle(packName, STARS.pack), description: cut((L.ui && L.ui.packSub) || '', 500) || packName, color: COLOR.ww, fields: [{ name: t.rolesF, value: cut(pack.roles.map(R).join(', '), 1000) }, { name: t.scenariosF, value: cut(pack.scenarios.map(id => (app.SCENARIOS.find(s => s.id === id) || {}).name || id).join(', '), 1000) }] };

  // ----- game rules
  const ui = L.ui || {};
  const gameRules = [
    { title: t.howGame[0], color: COLOR.gold, description: t.howGame[1].join('\n\n') },
    { title: `🎯 ${app.CLASSIC.name} — ${t.sport}`, color: COLOR.gold, description: (ui.classicRules || []).map(x => '• ' + x).join('\n') },
    { title: t.online[0], color: COLOR.blurple, description: [ui.onOnlineD || '', '', t.online[1]].join('\n') },
    { title: t.openClosed, color: COLOR.neutral, description: [`**${ui.openGame || ''}.** ${ui.openGameHint || ''}`, `**${ui.closedGame || ''}.** ${ui.closedGameHint || ''}`].join('\n\n') },
    { title: t.points[0], color: COLOR.green, description: t.points[1](ch('results')) }
  ];

  // ----- server rules, start, how to play
  const rulesEmbed = { title: t.rulesTitle, color: COLOR.gold, description: t.rules(ch).map(([a, x], i) => `**${i + 1}. ${a}.** ${x}`).join('\n\n'), footer: { text: t.rulesFooter } };
  const start = { title: t.start.title, color: COLOR.gold, description: t.start.desc, fields: [
    { name: t.start.steps[0], value: t.start.steps[1](ch, ctx.botUsername) },
    { name: t.start.chans[0], value: t.start.chans[1](ch) },
    { name: t.start.langs[0], value: t.start.langs[1](ch('language')) }
  ] };
  const stars = { role: STARS.role, scenario: STARS.scenario, pack: STARS.pack, packName };
  const howto = { title: t.howto.title, color: COLOR.gold, description: t.howto.desc(ctx.botUsername), fields: t.howto.fields(ch).map(([name, v]) => ({ name, value: typeof v === 'function' ? v(stars) : v })) };

  // ----- 🔗 social media: a banner, then one card per link in the network's colour — the card's name and its «→» are the links
  const s = t.social; const site = ctx.appUrl ? ctx.appUrl.replace(/\/?$/, '/') + lang + '/' : null;
  const links = [['channel', SOCIALS.channel], ['chat', SOCIALS.chat], ['instagram', SOCIALS.instagram], ['facebook', SOCIALS.facebook], ['tiktok', SOCIALS.tiktok], ['site', site], ['play', tgLink]].filter(([, url]) => url);
  const head = { title: s.title, color: COLOR.gold, description: s.desc };
  if (ctx.appUrl) head.image = { url: ctx.appUrl.replace(/\/?$/, '/') + `og/${lang}.png` }; // the site's cover in this language
  const cards = links.map(([k, url], i) => {
    const [name, text, cta] = s[k];
    const e = { title: name, url, color: SOCIAL_COLOR[k], description: `${text}\n**[${cta} →](${url})**` };
    if (i === links.length - 1) e.footer = { text: s.footer };
    return e;
  });

  return {
    rules: [{ embeds: [rulesEmbed] }],
    howto: [Object.assign({ embeds: [start, howto] }, buttons)],
    socials: [{ embeds: [head].concat(cards) }],
    cardsMafia: [cardsIntro(t.intro.mafia, COLOR.mafia)].concat(packEmbeds(cardsOf(['black']))),
    cardsCity: [cardsIntro(t.intro.city, COLOR.city)].concat(packEmbeds(cardsOf(['red']))),
    cardsNeutral: [cardsIntro(t.intro.neutral, COLOR.neutral)].concat(packEmbeds(cardsOf(['neutral', 'ww']))),
    scenarios: [{ embeds: [{ title: t.scenIntro[0], color: COLOR.gold, description: t.scenIntro[1] }] }, { embeds: freeEmbeds }].concat(packEmbeds(app.SCENARIOS.filter(s => !s.pack).map(scenEmbed)), packEmbeds([packEmbed].concat(app.SCENARIOS.filter(s => s.pack).map(scenEmbed)))),
    gameRules: packEmbeds(gameRules),
    lfg: [Object.assign({ embeds: [{ title: t.lfg[0], color: COLOR.gold, description: t.lfg[1] }] }, buttons)],
    results: [{ embeds: [{ title: t.results[0], color: COLOR.gold, description: t.results[1] }] }],
    chat: [],
    ideas: [{ embeds: [{ title: t.ideas[0], color: COLOR.blurple, description: t.ideas[1] }] }]
  };
}

/* the channels everyone sees: welcome, the language chooser (buttons), news */
export function buildShared(ctx) {
  const tgLink = ctx.botUsername ? `https://t.me/${ctx.botUsername}?start=dc` : null; const r = ctx.roleIds || {}; // start=dc: the bot counts players who came from Discord
  const lang = ctx.ids.language ? `<#${ctx.ids.language}>` : '#language';
  const line = (l, s) => `${T[l].emoji || '▫️'} **${T[l].name}** — ${s}`;
  const welcome = { title: '🎩 Mafia Pro', color: COLOR.gold, description: LANG_ORDER.map(l => line(l, T[l].hello)).join('\n\n') + `\n\n🌐 → ${lang}` };
  const chooser = { title: '🌐 ' + ['Язык', 'Мова', 'Language', 'Język', 'Լեզու'].join(' · '), color: COLOR.blurple, description: LANG_ORDER.map(l => line(l, T[l].pick)).join('\n\n') };
  const langRow = { type: 1, components: LANG_ORDER.filter(l => r['lang_' + l]).map(l => Object.assign({ type: 2, style: 2, label: T[l].name, custom_id: `mp:l:${l}:${r['lang_' + l]}` }, T[l].emoji ? { emoji: { name: T[l].emoji } } : {})) };
  const roleRow = { type: 1, components: ['host', 'player'].filter(k => r[k]).map(k => ({ type: 2, style: k === 'host' ? 1 : 2, label: `${GAME_ROLES[k].ru} · ${GAME_ROLES[k].en.replace(/^\S+ /, '')}`, custom_id: `mp:p:${k}:${r[k]}` })) };
  return {
    welcome: [Object.assign({ embeds: [welcome] }, linkButtons([{ label: '▶️ Telegram', url: tgLink }, { label: '🌐 Web', url: ctx.appUrl }]))],
    language: [{ embeds: [chooser], components: [langRow, roleRow].filter(x => x.components.length) }],
    news: [{ embeds: [{ title: '📣 Mafia Pro', color: COLOR.gold, description: LANG_ORDER.map(l => line(l, T[l].news)).join('\n') }] }]
  };
}

/* ---------- server layout ---------- */
export function buildLayout() {
  const out = [
    { key: 'catInfo', type: 4, name: '📌 MAFIA PRO', ro: true },
    { key: 'welcome', type: 0, name: '👋・welcome', prev: ['👋・добро-пожаловать'], parent: 'catInfo', ro: true, topic: 'Mafia Pro — ' + LANG_ORDER.map(l => T[l].code).join(' · ') },
    { key: 'language', type: 0, name: '🌐・language', parent: 'catInfo', ro: true, topic: 'Язык · Мова · Language · Język · Լեզու — 🎩 / 🎲' },
    { key: 'news', type: 0, name: '📣・news', prev: ['📣・новости'], parent: 'catInfo', ro: true, topic: 'Mafia Pro — news · новини · новости · aktualności · նորություններ', hook: 'Mafia Pro · Новости' },
    { key: 'lobby', type: 2, name: '🔊 Lobby', prev: ['🔊 Лобби'], parent: 'catInfo', voice: true }
  ];
  for (const l of LANG_ORDER) {
    const t = T[l];
    for (const [cat, keys] of [['lib', LANG_CHANNELS.lib], ['game', LANG_CHANNELS.game]]) {
      const ck = LK(cat === 'lib' ? 'catLib' : 'catGame', l);
      out.push({ key: ck, type: 4, name: t.cat[cat], prev: (t.catPrev || {})[cat], lang: l, ro: cat === 'lib' });
      for (const k of keys) out.push({ key: LK(k, l), base: k, type: 0, name: t.ch[k][0], topic: t.ch[k][1], parent: ck, lang: l, ro: !['chat', 'ideas'].includes(k), hook: k === 'lfg' ? HOOKS.tables[l] : k === 'results' ? HOOKS.results[l] : undefined });
    }
  }
  out.push({ key: 'catTables', type: 4, name: '🎧 ИГРОВЫЕ СТОЛЫ', voice: true });
  out.push({ key: 'catAdmin', type: 4, name: '🔒 АДМИНИСТРАЦИЯ', hidden: true });
  out.push({ key: 'analytics', type: 0, name: '📊・аналитика', parent: 'catAdmin', hidden: true, topic: 'Кто пришёл и по чьему приглашению, кто ушёл — бот пишет сам. /invites — сводка', hook: 'Mafia Pro · Аналитика' });
  return out;
}
export const LAYOUT = buildLayout();
/* slash commands, answered by the backend at <api>/discord/interactions (v35) */
export const COMMANDS = [
  { name: 'stats', type: 1, description: 'Mafia Pro player statistics', description_localizations: { ru: 'Статистика игрока Mafia Pro', uk: 'Статистика гравця Mafia Pro' }, options: [{ type: 6, name: 'player', name_localizations: { ru: 'игрок', uk: 'гравець' }, description: 'A server member (yourself if empty)', description_localizations: { ru: 'Участник сервера (пусто — вы сами)', uk: 'Учасник сервера (порожньо — ви)' }, required: false }] },
  { name: 'link', type: 1, description: 'Link this Discord to your Mafia Pro account in Telegram', description_localizations: { ru: 'Привязать Discord к аккаунту Mafia Pro в Telegram', uk: 'Прив’язати Discord до акаунта Mafia Pro у Telegram' } },
  { name: 'invites', type: 1, description: 'Who brought whom to the server (admins)', description_localizations: { ru: 'Кто кого привёл на сервер (для админов)', uk: 'Хто кого привів на сервер (для адмінів)' }, default_member_permissions: '32', options: [{ type: 4, name: 'days', name_localizations: { ru: 'дней', uk: 'днів' }, description: 'Period in days (30 by default)', description_localizations: { ru: 'За сколько дней (по умолчанию 30)', uk: 'За скільки днів (типово 30)' }, required: false, min_value: 1, max_value: 365 }] }
];
export const ROLES_LAYOUT = [
  { key: 'host', name: '🎩 Ведущий', color: COLOR.gold, hoist: true, mentionable: true },
  { key: 'player', name: '🎲 Игрок', color: COLOR.blurple, hoist: false, mentionable: false }
].concat(LANG_ORDER.map(l => ({ key: 'lang_' + l, name: T[l].name, color: 0, hoist: false, mentionable: false })))
  .concat(RANK_IDS.map((id, i) => ({ key: 'rank_' + i, name: rankRoleName(i), color: RANK_COLOR[i], hoist: false, mentionable: false })));
/* v54: the rank roles sit right above 🎩 / 🎲 and the language roles (so a member's name shows the rank's color), Легенда on top;
   only roles below the bot's own role are moved, the others keep their order */
export async function placeRankRoles(api, guildId, botId, state, log) {
  const all = await api('GET', `/guilds/${guildId}/roles`); const rankIds = RANK_IDS.map((_, i) => state.roles['rank_' + i]).filter(Boolean);
  const own = all.filter(r => r.managed && r.tags && String(r.tags.bot_id) === String(botId)); const botTop = own.length ? Math.max(...own.map(r => r.position)) : Infinity;
  const below = all.filter(r => r.id !== guildId && r.position < botTop).sort((a, b) => a.position - b.position || (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
  const ranks = rankIds.map(id => below.find(r => r.id === id));
  if (ranks.some(r => !r)) { log('rank roles: some are above the bot\'s role — move the bot\'s role to the top in Server Settings → Roles'); return false; }
  const rest = below.filter(r => !rankIds.includes(r.id)); const anchors = ['host', 'player'].concat(LANG_ORDER.map(l => 'lang_' + l)).map(k => state.roles[k]);
  let at = -1; rest.forEach((r, i) => { if (anchors.includes(r.id)) at = i; });
  const want = rest.slice(0, at + 1).concat(ranks, rest.slice(at + 1)); const base = below.length ? Math.min(...below.map(r => r.position)) : 1;
  const pos = want.map((r, i) => ({ id: r.id, position: Math.max(1, base) + i }));
  if (pos.every((p, i) => want[i].position === p.position)) return true;
  await api('PATCH', `/guilds/${guildId}/roles`, pos); log(`rank roles: placed above 🎩 / 🎲 and the languages`);
  return true;
}
const norm = (s, type) => (type === 0 ? String(s).toLowerCase().replace(/\s+/g, '-') : String(s)).trim();
/* the permission overwrites a channel should have (v36.1 — one explicit matrix, so the server's base role does not matter):
   - read-only (info, library, bot channels): readers get view + history; nobody may write, react, open threads, send voice messages
     or polls — @everyone AND every role of ours (🎩, 🎲, the five languages) get an explicit deny (v36.2), so it shows in Discord too
   - chat (общий-чат, идеи-и-баги): readers may write, attach, react, use threads
   - voice (lobby, the tables' category — the rooms made by the backend get the same, see voiceOverwrites): view, connect, speak with an
     open mic (voice activity), camera / screen share, the room's chat
   - language → hidden from @everyone, the rights above go to its language role; admin → hidden from everyone but the admins
   Overwrites of other roles / members (made by hand) are kept — in read-only channels with the writing rights taken out (see mergeOverwrites). */
export const OUR_ROLES = ['host', 'player'].concat(LANG_ORDER.map(l => 'lang_' + l));
export function wantOverwrites(c, guildId, roleIds) {
  if (c.hidden) return [{ id: guildId, type: 0, allow: '0', deny: String(PERM.VIEW) }];
  if (c.voice) return [{ id: guildId, type: 0, allow: String(PERM.VOICE), deny: '0' }];
  const give = c.ro ? PERM.READ : (PERM.READ | PERM.WRITE); const deny = c.ro ? PERM.RO_DENY : 0n;
  const langRole = c.lang ? roleIds['lang_' + c.lang] : null;
  const out = [{ id: guildId, type: 0, allow: c.lang ? '0' : String(give), deny: String(c.lang ? deny | PERM.VIEW : deny) }];
  if (c.ro) { for (const k of OUR_ROLES) if (roleIds[k]) out.push({ id: roleIds[k], type: 0, allow: roleIds[k] === langRole ? String(give) : '0', deny: String(deny) }); }
  else if (langRole) out.push({ id: langRole, type: 0, allow: String(give), deny: '0' });
  return out;
}
/* what a member with no roles (and a member with a language role) may do in a channel — for the audit in the log */
export function effective(base, overwrites, guildId, roleIds = []) {
  let p = BigInt(base || 0); const ow = overwrites || []; const e = ow.find(o => String(o.id) === String(guildId));
  if (e) p = (p & ~BigInt(e.deny)) | BigInt(e.allow);
  let a = 0n, d = 0n; for (const o of ow) if (o.type === 0 && roleIds.includes(String(o.id))) { a |= BigInt(o.allow); d |= BigInt(o.deny); }
  return (p & ~d) | a;
}
/* our overwrites replace the managed ids' ones; the rest is kept. In a read-only channel (ro) the kept ones lose the writing rights
   (allow − RO_DENY, deny + RO_DENY) unless they belong to an exempt id (the bot, integration roles, administrators). null = nothing to change. */
function mergeOverwrites(cur, want, managed, ro, exempt = new Set()) {
  const key = list => list.map(o => `${o.id}:${o.type}:${o.allow}:${o.deny}`).sort().join('|');
  const kept = (cur || []).filter(o => !managed.has(String(o.id))).map(o => (!ro || exempt.has(String(o.id)) ? o : Object.assign({}, o, { allow: String(BigInt(o.allow) & ~PERM.RO_DENY), deny: String(BigInt(o.deny) | PERM.RO_DENY) })));
  const next = kept.concat(want);
  return key(cur || []) === key(next) ? null : next;
}
const compKey = comps => JSON.stringify((comps || []).map(row => (row.components || []).map(b => [b.type, b.style || null, b.label || null, b.url || null, b.custom_id || null, b.emoji && b.emoji.name ? b.emoji.name : null])));
const embKey = embeds => JSON.stringify((embeds || []).map(e => [e.title, e.url || null, e.description, (e.fields || []).map(f => [f.name, f.value]), e.image ? e.image.url : null, e.footer ? e.footer.text : null]));

export async function run(env, log = console.log) {
  const api = client(env, log); const guildId = String(env.DISCORD_GUILD_ID || '').trim();
  if (!env.DISCORD_BOT_TOKEN || !/^\d{5,25}$/.test(guildId)) throw new Error('DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are required');
  const stateFile = env.STATE_FILE || path.join(ROOT, 'discord', 'server.json');
  let state = {}; try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch (e) {}
  if (state.guild && state.guild !== guildId) state = {}; // another server: start over
  state.guild = guildId; state.channels = state.channels || {}; state.roles = state.roles || {}; state.webhooks = state.webhooks || {};

  const me = await api('GET', '/users/@me'); const guild = await api('GET', `/guilds/${guildId}`);
  log(`bot ${me.username} (${me.id}) on "${guild.name}"`);
  let botUsername = env.TG_BOT_USERNAME || '';
  if (!botUsername && env.BOT_TOKEN) { try { const r = await (await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getMe`)).json(); if (r && r.ok) botUsername = r.result.username; } catch (e) {} }
  log(`telegram bot: ${botUsername ? '@' + botUsername : '(unknown — links go to the web app)'}`);

  // roles: game roles + one role per language
  const roles = await api('GET', `/guilds/${guildId}/roles`); const oldLangRoles = LANG_ORDER.map(l => state.roles['lang_' + l]).filter(Boolean);
  for (const r of ROLES_LAYOUT) {
    let cur = roles.find(x => x.id === state.roles[r.key]) || roles.find(x => x.name === r.name);
    const spec = { name: r.name, color: r.color, hoist: r.hoist, mentionable: r.mentionable };
    if (!cur) { cur = await api('POST', `/guilds/${guildId}/roles`, Object.assign({ permissions: '0' }, spec)); log(`+ role ${r.name}`); }
    else if (cur.name !== spec.name || cur.color !== spec.color || cur.hoist !== spec.hoist || cur.mentionable !== spec.mentionable) { await api('PATCH', `/guilds/${guildId}/roles/${cur.id}`, spec); log(`~ role ${r.name}`); }
    state.roles[r.key] = cur.id;
  }
  await placeRankRoles(api, guildId, me.id, state, log);
  const managed = new Set([guildId].concat(oldLangRoles, OUR_ROLES.map(k => state.roles[k]).filter(Boolean))); // a language role deleted by hand and re-created: its old overwrites go too
  const ADMIN = 1n << 3n; const rolesNow = await api('GET', `/guilds/${guildId}/roles`);
  const exempt = new Set([String(me.id)].concat(rolesNow.filter(r => r.id !== guildId && (r.managed || (BigInt(r.permissions || 0) & ADMIN))).map(r => String(r.id)))); // the bot, integrations, administrators

  // categories and channels (matched by the saved id, then by name — also the v33 name; never deleted)
  let existing = await api('GET', `/guilds/${guildId}/channels`);
  const claimed = new Set(LAYOUT.map(c => state.channels[c.key]).filter(Boolean));
  for (const c of LAYOUT) {
    const parent = c.parent ? state.channels[c.parent] : null;
    const names = [c.name].concat(c.prev || []).map(n => norm(n, c.type));
    let cur = existing.find(x => x.id === state.channels[c.key]);
    if (!cur) { const cands = existing.filter(x => x.type === c.type && !claimed.has(x.id) && names.includes(norm(x.name, c.type))); cur = cands.find(x => (x.parent_id || null) === parent) || cands[0]; }
    const overwrites = wantOverwrites(c, guildId, state.roles);
    if (!cur) {
      const body = { name: c.name, type: c.type }; if (parent) body.parent_id = parent; if (c.topic) body.topic = c.topic; if (overwrites.length) body.permission_overwrites = overwrites;
      cur = await api('POST', `/guilds/${guildId}/channels`, body); existing.push(cur); log(`+ ${c.type === 4 ? 'category' : c.type === 2 ? 'voice' : 'channel'} ${c.name}`);
    } else {
      const patch = {};
      if (norm(cur.name, c.type) !== norm(c.name, c.type) && (c.prev || []).some(n => norm(n, c.type) === norm(cur.name, c.type))) patch.name = c.name; // the v33 name → the new one (a name changed by hand stays)
      if (parent && cur.parent_id !== parent) patch.parent_id = parent;
      if (c.topic && cur.topic !== c.topic) patch.topic = c.topic;
      const ow = mergeOverwrites(cur.permission_overwrites, overwrites, managed, !!c.ro, exempt); if (ow) patch.permission_overwrites = ow;
      if (Object.keys(patch).length) { const upd = await api('PATCH', `/channels/${cur.id}`, patch); Object.assign(cur, upd || patch); log(`~ ${c.name}: ${Object.keys(patch).join(', ')}`); }
    }
    state.channels[c.key] = cur.id; claimed.add(cur.id);
  }

  // order: our categories in layout order (other categories after them), our channels in layout order inside each category
  existing = await api('GET', `/guilds/${guildId}/channels`);
  const byPos = (a, b) => (a.position || 0) - (b.position || 0) || (BigInt(a.id) < BigInt(b.id) ? -1 : 1);
  const moves = [];
  const reorder = (list, wantIds) => { const cur = list.slice().sort(byPos).map(x => x.id); const want = wantIds.filter(id => cur.includes(id)).concat(cur.filter(id => !wantIds.includes(id))); if (cur.join() !== want.join()) want.forEach((id, i) => moves.push({ id, position: i })); };
  reorder(existing.filter(x => x.type === 4), LAYOUT.filter(c => c.type === 4).map(c => state.channels[c.key]));
  for (const cat of LAYOUT.filter(c => c.type === 4)) { const catId = state.channels[cat.key]; reorder(existing.filter(x => x.parent_id === catId && x.type !== 2), LAYOUT.filter(c => c.parent === cat.key && c.type !== 2).map(c => state.channels[c.key])); }
  if (moves.length) { await api('PATCH', `/guilds/${guildId}/channels`, moves); log(`~ order: ${moves.length} positions`); }

  // permissions audit (v36.1): what a newcomer and each language role really may do, channel by channel. Our channels must match the
  // matrix; any other voice channel that people can see gets the voice rights too (a hidden one stays hidden); the rest is only reported.
  {
    const allRoles = await api('GET', `/guilds/${guildId}/roles`); const base = (allRoles.find(r => r.id === guildId) || {}).permissions || '0';
    const chans = await api('GET', `/guilds/${guildId}/channels`); const mine = new Map(LAYOUT.map(c => [state.channels[c.key], c]));
    const has = (p, b) => (p & b) === b; const langIds = l => [state.roles['lang_' + l]].filter(Boolean);
    const problems = []; let fixed = 0, checked = 0;
    for (const ch of chans.slice().sort((a, b) => (a.position || 0) - (b.position || 0))) {
      const spec = mine.get(ch.id); const guest = effective(base, ch.permission_overwrites, guildId); checked++;
      if (!spec && ch.type === 2 && has(guest, PERM.VIEW) && !has(guest, PERM.VOICE)) { // someone else's voice channel (or a table room made before v36.1)
        const ow = mergeOverwrites(ch.permission_overwrites, [{ id: guildId, type: 0, allow: String(PERM.VOICE), deny: '0' }], new Set([guildId]));
        if (ow) { await api('PATCH', `/channels/${ch.id}`, { permission_overwrites: ow }); fixed++; log(`~ voice rights: ${ch.name}`); }
        continue;
      }
      if (!spec) { if (ch.type !== 4) log(`  · not managed: ${ch.name} — ${has(guest, PERM.VIEW) ? 'everyone sees it' : 'hidden'}${has(guest, PERM.VIEW) && ch.type === 0 ? has(guest, 1n << 11n) ? ', may write' : ', read-only' : ''}`); continue; }
      const who = spec.lang ? effective(base, ch.permission_overwrites, guildId, langIds(spec.lang)) : guest;
      const bad = [];
      if (spec.hidden) { if (has(guest, PERM.VIEW)) bad.push('visible to everyone'); }
      else if (spec.voice) { if (!has(who, PERM.VOICE)) bad.push('cannot talk'); }
      else {
        if (!has(who, PERM.READ)) bad.push('cannot read');
        if (spec.ro && (who & PERM.RO_DENY)) bad.push('can write');
        if (spec.ro) for (const r of allRoles) { // every role on the server, alone and together with the channel's language
          if (r.id === guildId || exempt.has(String(r.id))) continue;
          const p = effective(BigInt(base) | BigInt(r.permissions || 0), ch.permission_overwrites, guildId, [String(r.id)].concat(spec.lang ? langIds(spec.lang) : []));
          if (has(p, PERM.VIEW) && (p & PERM.RO_DENY)) bad.push(`role «${r.name}» can write`);
        }
        if (spec.ro) for (const o of ch.permission_overwrites || []) if (o.type === 1 && !exempt.has(String(o.id)) && (BigInt(o.allow) & PERM.RO_DENY)) bad.push(`member ${o.id} can write`);
        if (!spec.ro && !has(who, PERM.WRITE)) bad.push('cannot write');
        if (spec.lang && has(guest, PERM.VIEW)) bad.push('visible without the language');
        if (spec.lang) for (const l of LANG_ORDER) if (l !== spec.lang && has(effective(base, ch.permission_overwrites, guildId, langIds(l)), PERM.VIEW) && !has(guest, PERM.VIEW)) bad.push(`visible to ${l}`);
      }
      if (bad.length) problems.push(`${ch.name}: ${bad.join(', ')}`);
    }
    const admins = allRoles.filter(r => r.id !== guildId && !r.managed && (BigInt(r.permissions || 0) & ADMIN)).map(r => r.name);
    log(`read-only channels: nobody writes — no role, no language, 🎩 / 🎲 included; only the owner${admins.length ? ' and administrator roles (' + admins.join(', ') + ')' : ''} can, by Discord's rules`);
    log(`permissions: ${checked} channels checked${fixed ? `, voice opened in ${fixed}` : ''} — ${problems.length ? 'PROBLEMS:' : 'all as intended (read-only info, open chats, voice with an open mic)'}`);
    for (const x of problems) log('  ! ' + x);
    state.permissions = { checked, problems: problems.length };
  }

  // webhooks (the backend finds them by name; tokens are never written to the state file)
  for (const c of LAYOUT.filter(x => x.hook)) {
    const list = await api('GET', `/channels/${state.channels[c.key]}/webhooks`);
    let w = list.find(x => x.name === c.hook);
    if (!w) { w = await api('POST', `/channels/${state.channels[c.key]}/webhooks`, { name: c.hook }); log(`+ webhook ${c.hook}`); }
    state.webhooks[c.key] = { id: w.id, name: c.hook, channel: state.channels[c.key] };
  }

  // a permanent invite to 🌐 (15.10.2026) — the server link for the Telegram channel and the socials: a newcomer lands on the language
  // choice first. Made by the bot, so the analytics names it «ссылка бота (#🌐・language)», apart from the personal links of the app.
  {
    let invs = null; try { invs = await api('GET', `/guilds/${guildId}/invites`) || []; } catch (e) { log('! cannot list invites: ' + e.message); } // not listed → no new one (no duplicates)
    const ours = inv => inv && inv.inviter && String(inv.inviter.id) === String(me.id) && inv.channel && inv.channel.id === state.channels.language && !inv.max_age && !inv.max_uses;
    let inv = (invs || []).find(x => ours(x) && x.code === state.invite) || (invs || []).find(ours);
    if (!inv && invs) { try { inv = await api('POST', `/channels/${state.channels.language}/invites`, { max_age: 0, max_uses: 0, unique: true }); log(`+ invite https://discord.gg/${inv.code} → 🌐`); } catch (e) { log('! cannot create the invite: ' + e.message); } }
    if (inv) { if (state.invite !== inv.code) log(`invite: https://discord.gg/${inv.code} (permanent, → 🌐)`); state.invite = inv.code; }
  }

  // guild settings: the welcome channel greets newcomers, notifications only for mentions
  const gpatch = {}; if (guild.system_channel_id !== state.channels.welcome) gpatch.system_channel_id = state.channels.welcome; if (guild.default_message_notifications !== 1) gpatch.default_message_notifications = 1;
  if (Object.keys(gpatch).length) { await api('PATCH', `/guilds/${guildId}`, gpatch); log(`~ server: ${Object.keys(gpatch).join(', ')}`); }

  // the server widget: the app's «Find a table» shows who is online and who sits in the tables' voice rooms
  const widget = await api('GET', `/guilds/${guildId}/widget`);
  if (!widget.enabled || widget.channel_id !== state.channels.welcome) { await api('PATCH', `/guilds/${guildId}/widget`, { enabled: true, channel_id: state.channels.welcome }); log('~ server widget on (invite → welcome)'); }

  // messages: the bot's own messages in each channel are edited in place, extras removed
  const appUrl = env.APP_URL || 'https://mafiapro.app/';
  let cardsBase = env.CARDS_BASE !== undefined ? env.CARDS_BASE : appUrl.replace(/\/?$/, '/') + 'cards/';
  if (cardsBase && !env.DISCORD_API) { // the Pages workflow renders the images (cards/<lang>/<role>.png) on the same push: wait for them (up to 8 minutes)
    let ok = false; for (let i = 0; i < 24 && !ok; i++) { try { ok = (await fetch(cardsBase + 'hy/don.png', { method: 'HEAD' })).ok; } catch (e) {} if (!ok) { if (!i) log('waiting for the card images on Pages…'); await sleep(20000); } }
    if (!ok) { log('card images not found — cards go without pictures this time'); cardsBase = ''; } else log('card images: ' + cardsBase + '<lang>/');
  }
  const content = {};
  for (const [k, v] of Object.entries(buildShared({ ids: state.channels, botUsername, appUrl, roleIds: state.roles }))) content[k] = v;
  for (const l of LANG_ORDER) {
    const c = buildContent(loadApp(l), { ids: state.channels, botUsername, appUrl, cardsBase: cardsBase ? cardsBase + l + '/' : '' }, l);
    for (const [k, v] of Object.entries(c)) content[LK(k, l)] = v;
  }
  let posted = 0, edited = 0, removed = 0;
  for (const [key, msgs] of Object.entries(content)) {
    const chId = state.channels[key]; if (!chId) continue;
    const mine = (await api('GET', `/channels/${chId}/messages?limit=100`)).filter(m => m.author && m.author.id === me.id && !m.webhook_id).reverse(); // oldest first
    for (let i = 0; i < msgs.length; i++) {
      const body = Object.assign({ content: '', components: [] }, msgs[i], { allowed_mentions: { parse: [] } });
      if (mine[i]) { if (embKey(mine[i].embeds) !== embKey(body.embeds) || compKey(mine[i].components) !== compKey(body.components)) { await api('PATCH', `/channels/${chId}/messages/${mine[i].id}`, body); edited++; } }
      else { await api('POST', `/channels/${chId}/messages`, body); posted++; }
    }
    for (const m of mine.slice(msgs.length)) { await api('DELETE', `/channels/${chId}/messages/${m.id}`); removed++; }
  }
  log(`messages: ${posted} posted, ${edited} edited, ${removed} removed`);

  // slash commands (/stats, /link, /invites) and the endpoint that answers them and the 🌐 buttons
  const app = await api('GET', '/applications/@me'); state.application = app.id; state.publicKey = app.verify_key;
  const cmdHash = hash8(JSON.stringify(COMMANDS));
  if (state.commandsHash !== cmdHash) { await api('PUT', `/applications/${app.id}/guilds/${guildId}/commands`, COMMANDS); state.commandsHash = cmdHash; log(`~ slash commands: ${COMMANDS.map(c => '/' + c.name).join(' ')}`); }
  const apiUrl = String(env.API_URL || (() => { try { return fs.readFileSync(path.join(ROOT, '.mafia-api-url'), 'utf8'); } catch (e) { return ''; } })()).trim().replace(/\/$/, '');
  const endpoint = apiUrl ? apiUrl + '/discord/interactions' : '';
  if (endpoint && app.interactions_endpoint_url !== endpoint) {
    let ready = !!env.DISCORD_API; // the backend must answer Discord's PING with this application's key before the URL is saved
    for (let i = 0; i < 20 && !ready; i++) { try { const h = await (await fetch(apiUrl + '/')).json(); ready = !!(h && h.interactions && (!h.pk || h.pk === String(app.verify_key).slice(0, 8))); } catch (e) {} if (!ready) { if (!i) log('waiting for the backend with the interactions endpoint…'); await sleep(15000); } }
    if (!ready) log('! the backend is not ready for slash commands yet — re-run this workflow after the backend deploy');
    else { try { await api('PATCH', '/applications/@me', { interactions_endpoint_url: endpoint }, true); log(`~ interactions endpoint: ${endpoint}`); } catch (e) { log('! Discord did not accept the interactions endpoint: ' + e.message); } }
  } else if (endpoint) log('interactions endpoint: ' + endpoint + ' (slash commands + 🌐 buttons)');

  state.tablesCategory = state.channels.catTables; state.updatedAt = new Date().toISOString(); state.bot = { id: me.id, username: me.username }; state.telegramBot = botUsername || null;
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');
  log(`tables category: ${state.tablesCategory}`);
  return state;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = Object.assign({}, process.env);
  if (!env.DISCORD_GUILD_ID) { try { const m = fs.readFileSync(path.join(ROOT, 'backend', 'wrangler.toml'), 'utf8').match(/^DISCORD_GUILD_ID = "(\d+)"/m); if (m) env.DISCORD_GUILD_ID = m[1]; } catch (e) {} }
  const lines = []; const log = s => { console.log(s); lines.push(s); };
  run(env, log).then(() => { if (env.LOG_FILE) fs.writeFileSync(env.LOG_FILE, lines.join('\n') + '\n'); })
    .catch(e => { log('ERROR ' + (e && e.message || e)); if (env.LOG_FILE) fs.writeFileSync(env.LOG_FILE, lines.join('\n') + '\n'); process.exit(1); });
}
