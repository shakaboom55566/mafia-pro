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
export const limitFor = seats => Math.min(MAX_LIMIT, Math.max(2, (Number(seats) || 10) + 1)); // every seat + the host

/* a voice channel with an 8-hour invite; on any failure nothing is left behind */
export async function createVoice(env, code, lang, seats) {
  const guild = String(env.DISCORD_GUILD_ID).trim(); const parent = String(env.DISCORD_CATEGORY_ID || '').trim();
  const spec = { name: channelName(code, lang), type: 2, user_limit: limitFor(seats) };
  let ch = await dcall(env, 'POST', `/guilds/${guild}/channels`, /^\d{5,25}$/.test(parent) ? Object.assign({ parent_id: parent }, spec) : spec);
  if (!ch.ok && /^\d{5,25}$/.test(parent) && ch.status === 400) ch = await dcall(env, 'POST', `/guilds/${guild}/channels`, spec); // a wrong category id must not break the table
  if (!ch.ok || !ch.data || !ch.data.id) return { ok: false, error: ch.error || 'create_failed', status: ch.status };
  const inv = await dcall(env, 'POST', `/channels/${ch.data.id}/invites`, { max_age: 28800, max_uses: 0, temporary: false, unique: true });
  if (!inv.ok || !inv.data || !inv.data.code) { await dcall(env, 'DELETE', `/channels/${ch.data.id}`); return { ok: false, error: inv.error || 'invite_failed', status: inv.status }; }
  return { ok: true, channelId: String(ch.data.id), invite: 'https://discord.gg/' + inv.data.code, limit: spec.user_limit };
}
export async function setVoiceLimit(env, channelId, seats) { return dcall(env, 'PATCH', `/channels/${channelId}`, { user_limit: limitFor(seats) }); }
export async function deleteVoice(env, channelId) { const r = await dcall(env, 'DELETE', `/channels/${channelId}`); return r.ok || r.status === 404; } // already gone counts as done

/* ---------- webhooks of the Mafia Pro server (created by discord/setup.mjs): new online tables and game results ---------- */
export const HOOKS = { tables: 'Mafia Pro · Столы', results: 'Mafia Pro · Итоги' };
const HOOK_TTL = 6 * 3600, HOOK_MISS_TTL = 600;
/* the webhook's id + token, looked up by name in the guild and cached in D1 (discord_cfg) */
export async function hookOf(env, kind, fresh) {
  const key = 'hook:' + kind; const ts = Math.floor(Date.now() / 1000);
  if (!fresh) { const c = await env.DB.prepare('SELECT value, updated_at FROM discord_cfg WHERE key = ?1').bind(key).first(); if (c && ts - c.updated_at < (c.value ? HOOK_TTL : HOOK_MISS_TTL)) return c.value ? JSON.parse(c.value) : null; }
  const r = await dcall(env, 'GET', `/guilds/${String(env.DISCORD_GUILD_ID).trim()}/webhooks`);
  const w = r.ok && Array.isArray(r.data) ? r.data.find(x => x && x.name === HOOKS[kind] && x.token) : null;
  const val = w ? JSON.stringify({ id: String(w.id), token: w.token }) : '';
  await env.DB.prepare('INSERT INTO discord_cfg (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3').bind(key, val, ts).run();
  return w ? { id: String(w.id), token: w.token } : null;
}
/* post (returns the message id) or edit a webhook message; a deleted webhook is looked up again once */
export async function hookSend(env, kind, payload, messageId) {
  for (let i = 0; i < 2; i++) {
    const h = await hookOf(env, kind, i > 0); if (!h) return { ok: false, error: 'no_webhook' };
    const base = `/webhooks/${h.id}/${h.token}`;
    const r = messageId ? await dcall(env, 'PATCH', `${base}/messages/${messageId}`, payload) : await dcall(env, 'POST', `${base}?wait=true`, Object.assign({ allowed_mentions: { parse: [] } }, payload));
    if (r.ok) return { ok: true, id: r.data && r.data.id ? String(r.data.id) : messageId };
    if (r.status === 404 && messageId && i === 0) { const again = await hookOf(env, kind, true); if (again && again.id === h.id) return { ok: false, error: 'message_gone', gone: true }; continue; }
    if (r.status !== 404) return { ok: false, error: r.error };
  }
  return { ok: false, error: 'no_webhook' };
}
