#!/usr/bin/env node
/* ============================================================
   Mafia Pro — Discord server setup through the bot (runs in GitHub Actions, workflow discord.yml).
   Idempotent: re-running updates what it created and never touches other channels.
   - roles: 🎩 Ведущий, 🎲 Игрок
   - categories / channels: info (welcome, server rules, news, how to play), library (mafia / city / neutral cards,
     scenarios, game rules), game (#ищу-игру, #результаты, chat, ideas, 🔊 Лобби), 🎧 ИГРОВЫЕ СТОЛЫ (voice rooms of tables)
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
const COLOR = { gold: 0xd4a24c, mafia: 0x8b1e2d, city: 0xc9a24c, neutral: 0x7a7f8c, ww: 0x6b4fa0, blurple: 0x5865f2, green: 0x3ba55d };
const TEAM_ICON = { black: '🖤', red: '❤️', neutral: '🤍', ww: '🐺' };
const STARS = { role: 100, scenario: 500, pack: 1750 };
const players = n => { const d = n % 10, h = n % 100; return `${n} ${d === 1 && h !== 11 ? 'игрок' : d >= 2 && d <= 4 && (h < 12 || h > 14) ? 'игрока' : 'игроков'}`; };
const hash8 = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }; // FNV-1a: the card image URL changes when the card does
const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
const B = s => Buffer.byteLength(String(s || ''), 'utf8'); // Discord rejects messages by their UTF-8 size (413 "message.embeds"), Cyrillic is 2 bytes a letter
const embedSize = e => B(e.title) + B(e.description) + B(e.footer && e.footer.text) + (e.fields || []).reduce((a, f) => a + B(f.name) + B(f.value), 0);
/* pack embeds into messages: ≤ 10 embeds and ≤ 5000 bytes of text each */
function packEmbeds(embeds, extra = {}) {
  const out = []; let cur = [], size = 0;
  for (const e of embeds) { const s = embedSize(e); if (cur.length && (cur.length >= 10 || size + s > 5000)) { out.push(Object.assign({ embeds: cur }, extra)); cur = []; size = 0; } cur.push(e); size += s; }
  if (cur.length) out.push(Object.assign({ embeds: cur }, extra));
  return out;
}
const linkButtons = links => ({ components: [{ type: 1, components: links.filter(l => l.url).slice(0, 5).map(l => ({ type: 2, style: 5, label: l.label, url: l.url })) }] });

export function buildContent(app, ctx) {
  const { L } = app; const R = id => (L.roles[id] || {}).name || id; const ch = k => ctx.ids[k] ? `<#${ctx.ids[k]}>` : `#${k}`;
  const tgLink = ctx.botUsername ? `https://t.me/${ctx.botUsername}` : null; const play = tgLink || ctx.appUrl;
  const pack = app.PACKS.diplomacy; const packName = (L.ui && L.ui.packTitle) || 'Дипломатическая игра';
  const buttons = linkButtons([{ label: '▶️ Играть в Telegram', url: tgLink }, { label: '🌐 Веб-версия', url: ctx.appUrl }]);
  const compText = ids => { const c = {}; ids.forEach(id => { c[id] = (c[id] || 0) + 1; }); return Object.entries(c).map(([id, n]) => R(id) + (n > 1 ? ` ×${n}` : '')).join(', '); };

  // ----- role cards
  const roleEmbed = r => {
    const t = L.roles[r.id] || {}; const inPack = pack.roles.includes(r.id);
    const rules = (t.rules || []).map(x => '• ' + x).join('\n');
    const desc = cut([t.kind ? `*${t.kind}*` : '', t.short || '', rules, t.tip ? `💡 ${t.tip}` : ''].filter(Boolean).join('\n\n'), 3000);
    const fields = [{ name: 'Команда', value: (L.teams && L.teams[r.team]) || r.team, inline: true }, { name: 'Для проверок', value: (L.colors && L.colors[r.color]) || r.color, inline: true }];
    if (inPack) fields.push({ name: 'Доступ', value: `📦 пак «${packName}» · ${STARS.pack} ⭐`, inline: true });
    else if (r.premium) fields.push({ name: 'Доступ', value: `💎 премиум · ${STARS.role} ⭐`, inline: true });
    else fields.push({ name: 'Доступ', value: 'бесплатно', inline: true });
    const e = { title: `${TEAM_ICON[r.team] || '🃏'} ${t.name || r.id}${inPack ? ' · 📦' : r.premium ? ' · 💎' : ''}`, description: desc, color: r.team === 'black' ? COLOR.mafia : r.team === 'red' ? COLOR.city : r.team === 'ww' ? COLOR.ww : COLOR.neutral, fields };
    if (ctx.cardsBase) e.image = { url: `${ctx.cardsBase}${r.id}.png?v=${hash8(JSON.stringify([t.name, t.kind, t.short, t.lore, r.team, !!r.premium]) + (app.roleArt ? app.roleArt(r.id) : ''))}` }; // the app's own card face (art, name, rule, lore), rendered by discord/render-cards.js into the Pages site
    else if (t.lore) e.footer = { text: cut(t.lore, 200) };
    return e;
  };
  const order = r => (pack.roles.includes(r.id) ? 2 : r.premium ? 1 : 0);
  const cardsOf = teams => app.ROLES.filter(r => teams.includes(r.team)).sort((a, b) => order(a) - order(b)).map(roleEmbed);
  const cardsIntro = (title, text, color) => ({ embeds: [{ title, description: `${text}\n\nБесплатные карты идут первыми, затем 💎 премиум (${STARS.role} ⭐ за карту) и 📦 карты пака «${packName}». Купить — в магазине приложения Mafia Pro.`, color }] });

  // ----- scenarios
  const sizes = [7, 8, 10, 12, 15, 20, 24].filter(n => n >= app.MIN_PLAYERS && n <= app.MAX_PLAYERS);
  const freeEmbeds = [
    { title: `🎯 ${app.CLASSIC.name} · 10 игроков · бесплатно`, description: cut(app.CLASSIC.lore, 1500), color: COLOR.gold, fields: [{ name: 'Состав', value: compText(app.CLASSIC.comp) }, { name: 'Формат', value: 'за живым столом с ведущим (оффлайн)', inline: true }] },
    { title: `🎭 Ролевая мафия · ${app.MIN_PLAYERS}–${players(app.MAX_PLAYERS)} · бесплатно`, description: 'Сбалансированные составы под любое число игроков: приложение подбирает роли, их можно менять вручную. Играется оффлайн (ведущий раздаёт карты с телефона) и онлайн (каждый ходит со своего телефона, голос — в Discord).', color: COLOR.gold, fields: sizes.map(n => ({ name: players(n), value: cut(compText(app.presetFor(n)), 1000) })) }
  ];
  const scenEmbed = s => ({ title: `${s.pack ? '📦' : '💎'} ${s.name}`, description: cut(s.lore, 1500), color: s.pack ? COLOR.ww : COLOR.blurple, fields: [{ name: 'Особые роли', value: cut(s.roles.map(R).join(', '), 1000) }, { name: 'Игроков', value: `${s.min}–${s.max}`, inline: true }, { name: 'Доступ', value: s.pack ? `пак «${packName}» · ${STARS.pack} ⭐` : `${STARS.scenario} ⭐`, inline: true }] });
  const packEmbed = { title: `📦 Пак «${packName}» · ${STARS.pack} ⭐`, description: cut((L.ui && L.ui.packSub) || '12 ролей и 4 сценария', 500), color: COLOR.ww, fields: [{ name: 'Роли', value: cut(pack.roles.map(R).join(', '), 1000) }, { name: 'Сценарии', value: cut(pack.scenarios.map(id => (app.SCENARIOS.find(s => s.id === id) || {}).name || id).join(', '), 1000) }] };

  // ----- game rules
  const ui = L.ui || {};
  const gameRules = [
    { title: '🌗 Как идёт партия', color: COLOR.gold, description: [
      '**Команды.** Мафия (чёрные карты) знает друг друга и ночью убивает; мирный город (красные) ищет мафию днём; нейтралы играют сами за себя; Оборотень приходит к мафии, но считается за город.',
      '**Ночь.** Ведущий будит роли по порядку: семья мафии выбирает цель (Дон решает), затем просыпаются активные роли со своими способностями. Порядок указан в приложении у каждой карты.',
      '**День.** Утром ведущий объявляет итоги ночи. Дальше — речи по кругу, выставление кандидатов и голосование. Ничья → оправдательные речи → переголосование.',
      '**Победа.** Город — когда в игре не осталось мафии. Мафия — когда её не меньше, чем мирных. У нейтралов свои условия (написаны на карте).',
      '**Выбывшие** не разговаривают о партии до конца игры и не подсказывают живым.'
    ].join('\n\n') },
    { title: `🎯 ${ui.classicRulesTitle || 'Классическая мафия — спортивные правила'}`, color: COLOR.gold, description: (ui.classicRules || []).map(x => '• ' + x).join('\n') },
    { title: '📱 Онлайн-формат', color: COLOR.blurple, description: [ui.onOnlineD || '', '', '**С Discord:** ведущий включает «Игра с Discord», бот создаёт голосовой канал стола на все места + ведущий в категории «🎧 Игровые столы». Игроки заходят по кнопке в приложении и жмут «Я на связи». Карты раздаются только после того, как ведущий подтвердит, что все на связи. После игры канал удаляется сам.'].join('\n') },
    { title: '👁 Открытая и закрытая игра', color: COLOR.neutral, description: [`**${ui.openGame || 'Открытая игра'}.** ${ui.openGameHint || ''}`, `**${ui.closedGame || 'Закрытая игра'}.** ${ui.closedGameHint || ''}`].join('\n\n') },
    { title: '🏅 Очки и рейтинг', color: COLOR.green, description: 'После партии приложение начисляет очки: за победу своей команды и за полезные ходы (верные проверки, спасения, точные выстрелы), разбор показывает каждый ход. Рейтинг общий для всех столов Mafia Pro, лучшие игроки — в разделе «Рейтинг» и в ' + ch('results') + '.' }
  ];

  // ----- server rules
  const serverRules = [
    ['Уважение', 'Никаких оскорблений, травли, угроз и дискриминации. Спорим об игре, а не о людях.'],
    ['Честная игра', 'Не раскрывайте свою роль иначе, чем позволяет игра. Никаких подсказок через ЛС, другие чаты и звонки во время партии (метагейм). Не пересказывайте закрытые роли после выбывания.'],
    ['Выбывшие молчат', 'Выбыли — выключите микрофон до конца партии. Слушать можно, подсказывать — нет.'],
    ['Голосовой канал', 'Говорите в свою речь и не перебивайте. Шумный микрофон — на кнопку. Ведущий может заглушить игрока на время речи другого.'],
    ['Слово ведущего', 'Во время партии решение ведущего окончательно. Спорные моменты — после игры, в ' + ch('ideas') + ' или ведущему в личку.'],
    ['Ник', 'Ник в Discord должен совпадать с ником в Telegram-приложении (или быть понятным), чтобы ведущий и игроки вас узнавали.'],
    ['Без спама и рекламы', 'Реклама, ссылки на другие серверы и продажа чего-либо — только с разрешения администрации.'],
    ['Контент', 'Без NSFW, шок-контента и политических споров.'],
    ['Санкции', 'Предупреждение → мут → бан. При грубых нарушениях администрация действует сразу.'],
    ['Правила Discord', 'Действуют [Условия использования](https://discord.com/terms) и [Принципы сообщества Discord](https://discord.com/guidelines).']
  ];
  const rulesEmbed = { title: '📜 Правила сервера', color: COLOR.gold, description: serverRules.map(([t, x], i) => `**${i + 1}. ${t}.** ${x}`).join('\n\n'), footer: { text: 'Заходя на сервер, вы соглашаетесь с правилами.' } };

  // ----- welcome / how to play
  const welcome = { title: '🎩 Добро пожаловать в Mafia Pro', color: COLOR.gold, description: 'Сервер для онлайн-мафии с голосом. Сама игра — в Telegram-приложении **Mafia Pro**: карты, ночные ходы, голосование и рейтинг. Здесь — голосовые каналы столов, библиотека карт и сценариев и итоги партий.', fields: [
    { name: 'С чего начать', value: [`1. Прочитайте ${ch('rules')}.`, `2. Откройте Mafia Pro в Telegram${ctx.botUsername ? ` — @${ctx.botUsername}` : ''} → «Играть».`, `3. «Поиск стола» → садитесь за онлайн-стол (столы появляются и в ${ch('lfg')}).`, '4. Ведущий включил Discord — в приложении жмите «Войти в голосовой», затем «Я на связи».'].join('\n') },
    { name: 'Каналы', value: [`${ch('howto')} — как устроено приложение`, `${ch('cardsMafia')} ${ch('cardsCity')} ${ch('cardsNeutral')} — все карты ролей`, `${ch('scenarios')} — сценарии и составы`, `${ch('gameRules')} — правила игры`, `${ch('results')} — итоги партий`, `${ch('chat')} — общение`].join('\n') },
    { name: 'Языки столов', value: 'Флаг у стола — язык ведущего: 🇺🇦 русский / украинский, 🇦🇲 армянский, 🇵🇱 польский, 🇬🇧 английский.' }
  ] };
  const howto = [
    { title: '📱 Как играть в Mafia Pro', color: COLOR.gold, description: `Приложение открывается в Telegram${ctx.botUsername ? ` у бота @${ctx.botUsername}` : ''}. Есть два формата.` , fields: [
      { name: '🃏 Оффлайн (живой стол)', value: 'Все сидят вместе, ведущий ведёт партию со своего телефона: раздаёт карты (или отправляет их в приложение игрокам), будит роли ночью, ведёт таймер речей и голосование.' },
      { name: '🌐 Онлайн', value: 'Каждый ходит со своего телефона: мафия предлагает цель, Дон решает, роли выбирают игрока, все голосуют сами. Чат стола открыт утром и в балаган, в речах — только говорящему.' },
      { name: '🔎 Поиск стола', value: `В главном меню «Поиск стола» показывает все онлайн-столы: флаг языка, ведущий, сколько мест занято, 🎧 — стол с Discord. Новые столы публикуются и в ${ch('lfg')}.` },
      { name: '🎧 Голос в Discord', value: 'Ведущий включает «Игра с Discord» — бот создаёт канал стола (места + ведущий). Заходите по кнопке «Войти в голосовой» и жмите «Я на связи». Ведущий раздаёт карты, когда подтвердит, что все на связи.' },
      { name: '🎩 Свой стол', value: '«Ролевая мафия» → «Онлайн игра» → пригласите друзей или клуб. Можно и самому играть — тогда пригласите ведущего («Я — игрок» → «Пригласить ведущего»).' },
      { name: '🏆 Рейтинг, друзья, клубы', value: 'Очки за победы и полезные ходы, общий рейтинг, серии побед, друзья и клубы со своим чатом и приглашениями к столу.' },
      { name: '💎 Магазин', value: `Премиум-карта — ${STARS.role} ⭐, сценарий — ${STARS.scenario} ⭐, пак «${packName}» — ${STARS.pack} ⭐ (Telegram Stars).` }
    ] }
  ];

  return {
    welcome: [Object.assign({ embeds: [welcome] }, buttons)],
    rules: [{ embeds: [rulesEmbed] }],
    news: [{ embeds: [{ title: '📣 Новости Mafia Pro', color: COLOR.gold, description: 'Обновления приложения, турниры и вечера игры. Включите уведомления канала, чтобы не пропустить.' }] }],
    howto: [Object.assign({ embeds: howto }, buttons)],
    cardsMafia: [cardsIntro('🖤 Карты мафии', 'Семья мафии: знают друг друга, ночью выбирают жертву, днём прикрывают своих. Для проверок Шерифа — чёрные.', COLOR.mafia)].concat(packEmbeds(cardsOf(['black']))),
    cardsCity: [cardsIntro('❤️ Карты мирного города', 'Город не знает, кто есть кто: ищет мафию проверками, защитой и голосованием. Для проверок — красные.', COLOR.city)].concat(packEmbeds(cardsOf(['red']))),
    cardsNeutral: [cardsIntro('🤍 Нейтралы и Оборотень', 'Нейтралы играют за себя и побеждают по своим условиям. Оборотень раздаётся вместе с мафией, но считается за город.', COLOR.neutral)].concat(packEmbeds(cardsOf(['neutral', 'ww']))),
    scenarios: [{ embeds: [{ title: '📚 Сценарии и составы', color: COLOR.gold, description: 'Бесплатные режимы, премиум-сценарии и пак. Всё запускается в приложении: «Сценарии» на главном экране.' }] }, { embeds: freeEmbeds }].concat(packEmbeds(app.SCENARIOS.filter(s => !s.pack).map(scenEmbed)), packEmbeds([packEmbed].concat(app.SCENARIOS.filter(s => s.pack).map(scenEmbed)))),
    gameRules: packEmbeds(gameRules),
    lfg: [Object.assign({ embeds: [{ title: '🔎 Ищу игру', color: COLOR.gold, description: 'Сюда бот сам публикует онлайн-столы: флаг языка, ведущий, сколько мест занято, ссылка «Сесть за стол» и голосовой канал. Карточка обновляется, пока идёт набор, и закрывается, когда стол стартует или закрыт.' }] }, buttons)],
    results: [{ embeds: [{ title: '🏆 Результаты', color: COLOR.gold, description: 'Итоги онлайн-партий: кто победил, роли игроков, места и очки. Публикуются автоматически после каждой партии.' }] }],
    chat: [], ideas: [{ embeds: [{ title: '💡 Идеи и баги', color: COLOR.blurple, description: 'Нашли ошибку или есть идея? Напишите: что делали, что ожидали, что получилось, скриншот. Укажите телефон и язык приложения.' }] }]
  };
}

/* ---------- server layout ---------- */
const DENY_SEND = String((1n << 11n) | (1n << 35n) | (1n << 36n) | (1n << 38n)); // send messages, create public / private threads, send in threads
export const LAYOUT = [
  { key: 'catInfo', type: 4, name: '📌 MAFIA PRO' },
  { key: 'welcome', type: 0, name: '👋・добро-пожаловать', parent: 'catInfo', ro: true, topic: 'Что это за сервер и с чего начать' },
  { key: 'rules', type: 0, name: '📜・правила-сервера', parent: 'catInfo', ro: true, topic: 'Правила сервера' },
  { key: 'news', type: 0, name: '📣・новости', parent: 'catInfo', ro: true, topic: 'Обновления Mafia Pro, турниры и вечера игры', hook: 'Mafia Pro · Новости' },
  { key: 'howto', type: 0, name: '📱・как-играть', parent: 'catInfo', ro: true, topic: 'Как устроено приложение Mafia Pro: оффлайн, онлайн, Discord' },
  { key: 'catLib', type: 4, name: '📚 БИБЛИОТЕКА' },
  { key: 'cardsMafia', type: 0, name: '🖤・карты-мафии', parent: 'catLib', ro: true, topic: 'Все карты мафии: способности, порядок, советы' },
  { key: 'cardsCity', type: 0, name: '❤️・карты-города', parent: 'catLib', ro: true, topic: 'Все карты мирного города' },
  { key: 'cardsNeutral', type: 0, name: '🤍・нейтралы', parent: 'catLib', ro: true, topic: 'Нейтралы и Оборотень' },
  { key: 'scenarios', type: 0, name: '📚・сценарии', parent: 'catLib', ro: true, topic: 'Бесплатные составы, премиум-сценарии и пак' },
  { key: 'gameRules', type: 0, name: '⚖️・правила-игры', parent: 'catLib', ro: true, topic: 'Как идёт партия, классика, онлайн-формат, очки' },
  { key: 'catGame', type: 4, name: '🎲 ИГРА' },
  { key: 'lfg', type: 0, name: '🔎・ищу-игру', parent: 'catGame', ro: true, topic: 'Открытые онлайн-столы — бот публикует сам', hook: 'Mafia Pro · Столы' },
  { key: 'results', type: 0, name: '🏆・результаты', parent: 'catGame', ro: true, topic: 'Итоги онлайн-партий', hook: 'Mafia Pro · Итоги' },
  { key: 'chat', type: 0, name: '💬・общий-чат', parent: 'catGame', topic: 'Общение об игре и не только' },
  { key: 'ideas', type: 0, name: '💡・идеи-и-баги', parent: 'catGame', topic: 'Предложения и ошибки приложения' },
  { key: 'lobby', type: 2, name: '🔊 Лобби', parent: 'catGame' },
  { key: 'catTables', type: 4, name: '🎧 ИГРОВЫЕ СТОЛЫ' }
];
export const ROLES_LAYOUT = [
  { key: 'host', name: '🎩 Ведущий', color: COLOR.gold, hoist: true, mentionable: true },
  { key: 'player', name: '🎲 Игрок', color: COLOR.blurple, hoist: false, mentionable: false }
];
const norm = (s, type) => (type === 0 ? String(s).toLowerCase().replace(/\s+/g, '-') : String(s)).trim();

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

  // roles
  const roles = await api('GET', `/guilds/${guildId}/roles`);
  for (const r of ROLES_LAYOUT) {
    let cur = roles.find(x => x.id === state.roles[r.key]) || roles.find(x => x.name === r.name);
    const spec = { name: r.name, color: r.color, hoist: r.hoist, mentionable: r.mentionable };
    if (!cur) { cur = await api('POST', `/guilds/${guildId}/roles`, Object.assign({ permissions: '0' }, spec)); log(`+ role ${r.name}`); }
    else if (cur.name !== spec.name || cur.color !== spec.color || cur.hoist !== spec.hoist || cur.mentionable !== spec.mentionable) { await api('PATCH', `/guilds/${guildId}/roles/${cur.id}`, spec); log(`~ role ${r.name}`); }
    state.roles[r.key] = cur.id;
  }

  // categories and channels (matched by the saved id, then by name; never deleted)
  let existing = await api('GET', `/guilds/${guildId}/channels`);
  const maxPos = existing.reduce((a, c) => Math.max(a, c.position || 0), 0); let pos = maxPos + 1;
  for (const c of LAYOUT) {
    const parent = c.parent ? state.channels[c.parent] : null;
    const overwrites = c.ro ? [{ id: guildId, type: 0, allow: '0', deny: DENY_SEND }] : undefined;
    let cur = existing.find(x => x.id === state.channels[c.key]) || existing.find(x => x.type === c.type && norm(x.name, c.type) === norm(c.name, c.type));
    if (!cur) {
      const body = { name: c.name, type: c.type }; if (parent) body.parent_id = parent; if (c.topic) body.topic = c.topic; if (overwrites) body.permission_overwrites = overwrites; if (c.type === 4) body.position = pos++;
      cur = await api('POST', `/guilds/${guildId}/channels`, body); existing.push(cur); log(`+ ${c.type === 4 ? 'category' : c.type === 2 ? 'voice' : 'channel'} ${c.name}`);
    } else {
      const patch = {};
      if (parent && cur.parent_id !== parent) patch.parent_id = parent;
      if (c.topic && cur.topic !== c.topic) patch.topic = c.topic;
      if (overwrites) { const ow = (cur.permission_overwrites || []).find(o => o.id === guildId); if (!ow || ow.deny !== DENY_SEND) patch.permission_overwrites = (cur.permission_overwrites || []).filter(o => o.id !== guildId).concat(overwrites); }
      if (Object.keys(patch).length) { await api('PATCH', `/channels/${cur.id}`, patch); log(`~ ${c.name}: ${Object.keys(patch).join(', ')}`); }
    }
    state.channels[c.key] = cur.id;
  }

  // webhooks (the backend finds them by name; tokens are never written to the state file)
  for (const c of LAYOUT.filter(x => x.hook)) {
    const list = await api('GET', `/channels/${state.channels[c.key]}/webhooks`);
    let w = list.find(x => x.name === c.hook);
    if (!w) { w = await api('POST', `/channels/${state.channels[c.key]}/webhooks`, { name: c.hook }); log(`+ webhook ${c.hook}`); }
    state.webhooks[c.key] = { id: w.id, name: c.hook, channel: state.channels[c.key] };
  }

  // guild settings: the welcome channel greets newcomers, notifications only for mentions
  const gpatch = {}; if (guild.system_channel_id !== state.channels.welcome) gpatch.system_channel_id = state.channels.welcome; if (guild.default_message_notifications !== 1) gpatch.default_message_notifications = 1;
  if (Object.keys(gpatch).length) { await api('PATCH', `/guilds/${guildId}`, gpatch); log(`~ server: ${Object.keys(gpatch).join(', ')}`); }

  // messages: the bot's own messages in each channel are edited in place, extras removed
  const appUrl = env.APP_URL || 'https://shakaboom55566.github.io/mafia-pro/';
  let cardsBase = env.CARDS_BASE !== undefined ? env.CARDS_BASE : appUrl.replace(/\/?$/, '/') + 'cards/';
  if (cardsBase && !env.DISCORD_API) { // the Pages workflow renders the images on the same push: wait for them (up to 8 minutes)
    let ok = false; for (let i = 0; i < 24 && !ok; i++) { try { ok = (await fetch(cardsBase + 'don.png', { method: 'HEAD' })).ok; } catch (e) {} if (!ok) { if (!i) log('waiting for the card images on Pages…'); await sleep(20000); } }
    if (!ok) { log('card images not found — cards go without pictures this time'); cardsBase = ''; } else log('card images: ' + cardsBase);
  }
  const content = buildContent(loadApp('ru'), { ids: state.channels, botUsername, appUrl, cardsBase });
  let posted = 0, edited = 0, removed = 0;
  for (const [key, msgs] of Object.entries(content)) {
    const chId = state.channels[key]; if (!chId) continue;
    const mine = (await api('GET', `/channels/${chId}/messages?limit=100`)).filter(m => m.author && m.author.id === me.id && !m.webhook_id).reverse(); // oldest first
    for (let i = 0; i < msgs.length; i++) {
      const body = Object.assign({ content: '', components: [] }, msgs[i], { allowed_mentions: { parse: [] } });
      if (mine[i]) {
        const same = JSON.stringify(mine[i].embeds || []).length > 0 && JSON.stringify((mine[i].embeds || []).map(e => [e.title, e.description, (e.fields || []).map(f => f.value), e.image ? e.image.url : null])) === JSON.stringify(body.embeds.map(e => [e.title, e.description, (e.fields || []).map(f => f.value), e.image ? e.image.url : null])) && JSON.stringify((mine[i].components || []).length) === JSON.stringify(body.components.length);
        if (!same) { await api('PATCH', `/channels/${chId}/messages/${mine[i].id}`, body); edited++; }
      } else { await api('POST', `/channels/${chId}/messages`, body); posted++; }
    }
    for (const m of mine.slice(msgs.length)) { await api('DELETE', `/channels/${chId}/messages/${m.id}`); removed++; }
  }
  log(`messages: ${posted} posted, ${edited} edited, ${removed} removed`);

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
