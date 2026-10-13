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
