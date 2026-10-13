/* Discord voice rooms for online tables (v33).
   The worker talks to the Discord REST API with a bot token (secret DISCORD_BOT_TOKEN) in one guild (DISCORD_GUILD_ID),
   optionally inside a category (DISCORD_CATEGORY_ID). Nothing here needs a gateway connection:
   create a voice channel, create an invite, change the user limit, delete the channel. */

// the flag of a table = the app language of its creator
const FLAGS = { ru: '🇺🇦', uk: '🇺🇦', hy: '🇦🇲', pl: '🇵🇱', en: '🇬🇧' };
export const LANGS = Object.keys(FLAGS);
export const flagOf = lang => FLAGS[lang] || FLAGS.ru;
export const discordReady = env => !!(env && env.DISCORD_BOT_TOKEN && /^\d{5,25}$/.test(String(env.DISCORD_GUILD_ID || '').trim()));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const MAX_LIMIT = 99; // Discord's ceiling for a voice channel's user limit

/* one REST call; 429 (Discord or a Cloudflare edge limit) and 5xx are retried twice */
export async function dcall(env, method, path, body) {
  const base = String(env.DISCORD_API || 'https://discord.com/api/v10').replace(/\/$/, '');
  let last = { ok: false, status: 0, error: 'network' };
  for (let i = 0; i < 3; i++) {
    let r;
    try {
      r = await fetch(base + path, { method, headers: { Authorization: 'Bot ' + env.DISCORD_BOT_TOKEN, 'Content-Type': 'application/json', 'User-Agent': 'DiscordBot (https://github.com/shakaboom55566/mafia-pro, 1.0)', 'X-Audit-Log-Reason': 'Mafia Pro table' }, body: body ? JSON.stringify(body) : undefined });
    } catch (e) { last = { ok: false, status: 0, error: 'network' }; if (i < 2) { await sleep(400); continue; } return last; }
    if (r.status === 204) return { ok: true, status: 204, data: null };
    let d = null; try { d = await r.json(); } catch (e) { d = null; }
    if (r.ok) return { ok: true, status: r.status, data: d };
    last = { ok: false, status: r.status, error: String((d && (d.message || d.code)) || ('HTTP ' + r.status)).slice(0, 160), data: d };
    if (r.status === 429 && i < 2) { const s = Number(d && d.retry_after) || Number(r.headers.get('retry-after')) || 1; await sleep(Math.min(Math.max(s, 0.2), 3) * 1000); continue; }
    if (r.status >= 500 && i < 2) { await sleep(500); continue; }
    return last;
  }
  return last;
}

export const channelName = (code, lang) => `${flagOf(lang)} Mafia · ${code}`;
/* ---------- permissions on the Mafia Pro server (v36.1): one matrix for discord/setup.mjs and the tables' voice rooms ---------- */
const bit = n => 1n << BigInt(n);
const P = { reactions: bit(6), stream: bit(9), view: bit(10), send: bit(11), tts: bit(12), embed: bit(14), attach: bit(15), history: bit(16), extEmoji: bit(18), connect: bit(20), speak: bit(21), vad: bit(25), appCmd: bit(31), pubThreads: bit(35), privThreads: bit(36), threadSend: bit(38), activities: bit(39), soundboard: bit(42), voiceMsg: bit(46), polls: bit(49) };
const or = (...k) => k.reduce((a, x) => a | P[x], 0n);
export const PERM = {
  READ: or('view', 'history'), // see a channel and its history
  WRITE: or('send', 'embed', 'attach', 'reactions', 'extEmoji', 'history', 'pubThreads', 'threadSend', 'voiceMsg', 'appCmd'), // a chat: write, attach, react, threads
  RO_DENY: or('send', 'tts', 'reactions', 'pubThreads', 'privThreads', 'threadSend', 'voiceMsg', 'polls'), // read-only: no messages, reactions, threads, voice messages, polls
  VOICE: or('view', 'connect', 'speak', 'vad', 'stream', 'activities', 'soundboard', 'history', 'send', 'embed', 'attach', 'reactions', 'appCmd'), // talk with an open mic (voice activity, no push-to-talk), camera / screen, the voice room's chat
  VIEW: P.view
};
/* a table's voice room: everyone may join and talk with an open mic, whatever the category or the server's base role says */
export const voiceOverwrites = guildId => [{ id: String(guildId), type: 0, allow: String(PERM.VOICE), deny: '0' }];
export const limitFor = seats => Math.min(MAX_LIMIT, Math.max(2, (Number(seats) || 10) + 1)); // every seat + the host

/* a voice channel with an 8-hour invite; on any failure nothing is left behind */
export async function createVoice(env, code, lang, seats) {
  const guild = String(env.DISCORD_GUILD_ID).trim(); const parent = String(env.DISCORD_CATEGORY_ID || '').trim();
  const spec = { name: channelName(code, lang), type: 2, user_limit: limitFor(seats), permission_overwrites: voiceOverwrites(guild) };
  let ch = await dcall(env, 'POST', `/guilds/${guild}/channels`, /^\d{5,25}$/.test(parent) ? Object.assign({ parent_id: parent }, spec) : spec);
  if (!ch.ok && /^\d{5,25}$/.test(parent) && ch.status === 400) ch = await dcall(env, 'POST', `/guilds/${guild}/channels`, spec); // a wrong category id must not break the table
  if (!ch.ok || !ch.data || !ch.data.id) return { ok: false, error: ch.error || 'create_failed', status: ch.status };
  const inv = await dcall(env, 'POST', `/channels/${ch.data.id}/invites`, { max_age: 28800, max_uses: 0, temporary: false, unique: true });
  if (!inv.ok || !inv.data || !inv.data.code) { await dcall(env, 'DELETE', `/channels/${ch.data.id}`); return { ok: false, error: inv.error || 'invite_failed', status: inv.status }; }
  return { ok: true, channelId: String(ch.data.id), invite: 'https://discord.gg/' + inv.data.code, limit: spec.user_limit };
}
export async function setVoiceLimit(env, channelId, seats) { return dcall(env, 'PATCH', `/channels/${channelId}`, { user_limit: limitFor(seats) }); }
export async function deleteVoice(env, channelId) { const r = await dcall(env, 'DELETE', `/channels/${channelId}`); return r.ok || r.status === 404; } // already gone counts as done

/* ---------- webhooks of the Mafia Pro server (created by discord/setup.mjs): new online tables and game results ----------
   v34: every language has its own #ищу-игру / #результаты (seen only by members with that language role), each with its own webhook.
   A table goes to the channel of its language; if that webhook is missing, to the Russian one (with Russian texts). */
export const HOOKS = {
  tables: { ru: 'Mafia Pro · Столы', uk: 'Mafia Pro · Столи', en: 'Mafia Pro · Tables', pl: 'Mafia Pro · Stoły', hy: 'Mafia Pro · Սեղաններ' },
  results: { ru: 'Mafia Pro · Итоги', uk: 'Mafia Pro · Підсумки', en: 'Mafia Pro · Results', pl: 'Mafia Pro · Wyniki', hy: 'Mafia Pro · Արդյունքներ' },
  analytics: { ru: 'Mafia Pro · Аналитика' } // admins only, one channel
};
const HOOK_TTL = 6 * 3600, HOOK_MISS_TTL = 600;
/* the webhook's id + token, looked up by name in the guild and cached in D1 (discord_cfg) */
export async function hookOf(env, kind, fresh, lang = 'ru') {
  lang = HOOKS[kind][lang] ? lang : 'ru';
  const key = 'hook:' + kind + (lang === 'ru' ? '' : ':' + lang); const ts = Math.floor(Date.now() / 1000);
  if (!fresh) { const c = await env.DB.prepare('SELECT value, updated_at FROM discord_cfg WHERE key = ?1').bind(key).first(); if (c && ts - c.updated_at < (c.value ? HOOK_TTL : HOOK_MISS_TTL)) return c.value ? JSON.parse(c.value) : null; }
  const r = await dcall(env, 'GET', `/guilds/${String(env.DISCORD_GUILD_ID).trim()}/webhooks`);
  if (!r.ok) return null; // Discord unreachable: no cache entry, try again next time
  const w = Array.isArray(r.data) ? r.data.find(x => x && x.name === HOOKS[kind][lang] && x.token) : null;
  const val = w ? JSON.stringify({ id: String(w.id), token: w.token }) : '';
  await env.DB.prepare('INSERT INTO discord_cfg (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3').bind(key, val, ts).run();
  return w ? { id: String(w.id), token: w.token } : null;
}
/* which language's channel takes a post: the table's own if it has a webhook, else Russian */
export async function hookLang(env, kind, lang) {
  if (lang && lang !== 'ru' && HOOKS[kind][lang] && await hookOf(env, kind, false, lang)) return lang;
  return 'ru';
}
/* post (returns the message id) or edit a webhook message; a deleted webhook is looked up again once */
export async function hookSend(env, kind, payload, messageId, lang = 'ru') {
  for (let i = 0; i < 2; i++) {
    const h = await hookOf(env, kind, i > 0, lang); if (!h) return { ok: false, error: 'no_webhook' };
    const base = `/webhooks/${h.id}/${h.token}`;
    const r = messageId ? await dcall(env, 'PATCH', `${base}/messages/${messageId}`, payload) : await dcall(env, 'POST', `${base}?wait=true`, Object.assign({ allowed_mentions: { parse: [] } }, payload));
    if (r.ok) return { ok: true, id: r.data && r.data.id ? String(r.data.id) : messageId };
    if (r.status === 404 && messageId && i === 0) { const again = await hookOf(env, kind, true, lang); if (again && again.id === h.id) return { ok: false, error: 'message_gone', gone: true }; continue; }
    if (r.status !== 404) return { ok: false, error: r.error };
  }
  return { ok: false, error: 'no_webhook' };
}

/* texts of the table / result cards in the five languages */
export const CARD_T = {
  ru: { status: { open: 'набор игроков', dealt: 'раздача карт', live: 'идёт партия', finished: 'партия завершена', closed: 'стол закрыт' }, table: 'Стол', players: 'Игроки', host: 'Ведущий', host_l: 'ведущий', seekHost: 'ищут ведущего', voice: 'Голос', voiceLink: 'Войти в голосовой канал', sit: 'Сесть за стол', openTg: 'Открыть в Telegram', ended: 'Стол больше не принимает игроков.', about: 'Онлайн-мафия в приложении Mafia Pro: игроки ходят со своих телефонов, говорим в Discord.', results: 'Итоги', days: 'дней', footer: 'Mafia Pro · онлайн-мафия' },
  uk: { status: { open: 'набір гравців', dealt: 'роздача карт', live: 'йде партія', finished: 'партію завершено', closed: 'стіл закрито' }, table: 'Стіл', players: 'Гравці', host: 'Ведучий', host_l: 'ведучий', seekHost: 'шукають ведучого', voice: 'Голос', voiceLink: 'Увійти в голосовий канал', sit: 'Сісти за стіл', openTg: 'Відкрити в Telegram', ended: 'Стіл більше не приймає гравців.', about: 'Онлайн-мафія в застосунку Mafia Pro: гравці ходять зі своїх телефонів, говоримо в Discord.', results: 'Підсумки', days: 'днів', footer: 'Mafia Pro · онлайн-мафія' },
  en: { status: { open: 'seating players', dealt: 'dealing cards', live: 'game in progress', finished: 'game over', closed: 'table closed' }, table: 'Table', players: 'Players', host: 'Host', host_l: 'host', seekHost: 'looking for a host', voice: 'Voice', voiceLink: 'Join the voice channel', sit: 'Take a seat', openTg: 'Open in Telegram', ended: 'The table no longer takes players.', about: 'Online mafia in the Mafia Pro app: everyone plays from their own phone, we talk on Discord.', results: 'Results', days: 'days', footer: 'Mafia Pro · online mafia' },
  pl: { status: { open: 'zbieranie graczy', dealt: 'rozdawanie kart', live: 'trwa gra', finished: 'gra zakończona', closed: 'stół zamknięty' }, table: 'Stół', players: 'Gracze', host: 'Prowadzący', host_l: 'prowadzący', seekHost: 'szukają prowadzącego', voice: 'Głos', voiceLink: 'Wejdź na kanał głosowy', sit: 'Usiądź przy stole', openTg: 'Otwórz w Telegramie', ended: 'Stół nie przyjmuje już graczy.', about: 'Mafia online w aplikacji Mafia Pro: każdy gra ze swojego telefonu, rozmawiamy na Discordzie.', results: 'Wyniki', days: 'dni', footer: 'Mafia Pro · mafia online' },
  hy: { status: { open: 'խաղացողների հավաքագրում', dealt: 'քարտերի բաժանում', live: 'խաղն ընթանում է', finished: 'խաղն ավարտված է', closed: 'սեղանը փակ է' }, table: 'Սեղան', players: 'Խաղացողներ', host: 'Վարող', host_l: 'վարող', seekHost: 'վարող են փնտրում', voice: 'Ձայն', voiceLink: 'Մտնել ձայնային ալիք', sit: 'Նստել սեղանի շուրջ', openTg: 'Բացել Telegram-ում', ended: 'Սեղանն այլևս խաղացողներ չի ընդունում։', about: 'Առցանց մաֆիա Mafia Pro հավելվածում․ յուրաքանչյուրը խաղում է իր հեռախոսից, խոսում ենք Discord-ում։', results: 'Արդյունքներ', days: 'օր', footer: 'Mafia Pro · առցանց մաֆիա' }
};
export const cardT = lang => CARD_T[lang] || CARD_T.ru;

/* ---------- slash commands (HTTP interactions): Ed25519 signature of timestamp + body with the application's public key ---------- */
const hexBytes = h => new Uint8Array(String(h).match(/../g).map(x => parseInt(x, 16)));
let keyCache = null;
export async function verifyInteraction(env, sigHex, timestamp, body) {
  const pk = String(env.DISCORD_PUBLIC_KEY || '').trim(); if (!/^[0-9a-f]{64}$/i.test(pk) || !/^[0-9a-f]{128}$/i.test(String(sigHex || '')) || !timestamp) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false; // replayed
  try {
    if (!keyCache || keyCache.pk !== pk) {
      let key; try { key = await crypto.subtle.importKey('raw', hexBytes(pk), { name: 'Ed25519' }, false, ['verify']); }
      catch (e) { key = await crypto.subtle.importKey('raw', hexBytes(pk), { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' }, false, ['verify']); } // older Workers runtimes
      keyCache = { pk, key, alg: key.algorithm && key.algorithm.name === 'NODE-ED25519' ? { name: 'NODE-ED25519' } : { name: 'Ed25519' } };
    }
    return await crypto.subtle.verify(keyCache.alg, keyCache.key, hexBytes(sigHex), new TextEncoder().encode(String(timestamp) + body));
  } catch (e) { console.error('ed25519', e); return false; }
}
/* when a Discord account was created (from its snowflake) */
export const snowflakeTime = id => { try { return Number((BigInt(id) >> 22n) + 1420070400000n); } catch (e) { return 0; } };

/* ---------- buttons on the server (v34): the bot's messages carry buttons that give / take a role ----------
   Discord sends a click as an HTTP interaction (type 3) to /discord/interactions, the same endpoint as the slash commands
   (signature checked by verifyInteraction). */
/* replies to a button: in the chosen language (language buttons) or in the user's Discord language */
const LANG_NAMES = { ru: 'Русский', uk: 'Українська', en: 'English', pl: 'Polski', hy: 'Հայերեն' };
const ROLE_NAMES = { host: { ru: '🎩 Ведущий', uk: '🎩 Ведучий', en: '🎩 Host', pl: '🎩 Prowadzący', hy: '🎩 Վարող' }, player: { ru: '🎲 Игрок', uk: '🎲 Гравець', en: '🎲 Player', pl: '🎲 Gracz', hy: '🎲 Խաղացող' } };
const IX_T = {
  ru: { langOn: n => `✅ ${n}: каналы на этом языке открыты — смотрите список каналов слева.`, langOff: n => `➖ ${n}: каналы на этом языке скрыты.`, roleOn: n => `✅ Роль ${n} выдана.`, roleOff: n => `➖ Роль ${n} снята.`, fail: 'Не получилось изменить роль — попробуйте ещё раз через минуту.' },
  uk: { langOn: n => `✅ ${n}: канали цією мовою відкрито — дивіться список каналів ліворуч.`, langOff: n => `➖ ${n}: канали цією мовою приховано.`, roleOn: n => `✅ Роль ${n} видано.`, roleOff: n => `➖ Роль ${n} знято.`, fail: 'Не вдалося змінити роль — спробуйте ще раз за хвилину.' },
  en: { langOn: n => `✅ ${n}: channels in this language are now open — see the channel list on the left.`, langOff: n => `➖ ${n}: channels in this language are hidden.`, roleOn: n => `✅ You now have the ${n} role.`, roleOff: n => `➖ The ${n} role was removed.`, fail: 'Could not change the role — please try again in a minute.' },
  pl: { langOn: n => `✅ ${n}: kanały w tym języku są otwarte — zobacz listę kanałów po lewej.`, langOff: n => `➖ ${n}: kanały w tym języku są ukryte.`, roleOn: n => `✅ Masz rolę ${n}.`, roleOff: n => `➖ Rola ${n} została zdjęta.`, fail: 'Nie udało się zmienić roli — spróbuj ponownie za minutę.' },
  hy: { langOn: n => `✅ ${n}․ այս լեզվով ալիքները բաց են — տեսեք ալիքների ցանկը ձախ կողմում։`, langOff: n => `➖ ${n}․ այս լեզվով ալիքները թաքցված են։`, roleOn: n => `✅ Դուք ստացաք ${n} դերը։`, roleOff: n => `➖ ${n} դերը հանված է։`, fail: 'Չհաջողվեց փոխել դերը — փորձեք մեկ րոպեից։' }
};
export const localeLang = loc => { const l = String(loc || '').slice(0, 2).toLowerCase(); return IX_T[l] ? l : l === 'be' ? 'ru' : 'en'; };
const reply = (text, flags = 64) => ({ type: 4, data: { content: text, flags, allowed_mentions: { parse: [] } } });

/* one interaction → the JSON answer. custom_id: "mp:l:<lang>:<roleId>" (language), "mp:p:<host|player>:<roleId>" (game role) */
export async function handleButton(env, it) {
  const guild = String(env.DISCORD_GUILD_ID || '').trim();
  const m = /^mp:([lp]):([a-z]{2,6}):(\d{5,25})$/.exec(String((it.data && it.data.custom_id) || ''));
  const userId = it.member && it.member.user && it.member.user.id;
  const ui = localeLang(it.locale);
  if (!m || !userId || String(it.guild_id || '') !== guild) return reply(IX_T[ui].fail);
  const [, kind, what, roleId] = m;
  if (kind === 'l' && !LANG_NAMES[what]) return reply(IX_T[ui].fail);
  if (kind === 'p' && !ROLE_NAMES[what]) return reply(IX_T[ui].fail);
  const has = (it.member.roles || []).map(String).includes(roleId);
  const r = await dcall(env, has ? 'DELETE' : 'PUT', `/guilds/${guild}/members/${userId}/roles/${roleId}`);
  const lang = kind === 'l' ? what : ui; const T = IX_T[lang];
  if (!r.ok) { console.error('discord role', r.status, r.error); return reply(T.fail); }
  const name = kind === 'l' ? LANG_NAMES[what] : ROLE_NAMES[what][lang];
  return reply(kind === 'l' ? (has ? T.langOff(name) : T.langOn(name)) : (has ? T.roleOff(name) : T.roleOn(name)));
}
