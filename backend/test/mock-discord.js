/* A fake discord.com/api/v10: guild, roles, channels (voice / text / categories), messages, invites, webhooks;
   failure and rate-limit switches for tests. Used by backend/test/run.js, test/cloud-qa.js and discord/test-setup.mjs. */
import http from 'node:http';

export function startMockDiscord(port = 8792, opts = {}) {
  const token = opts.token || 'dc-token'; const guildId = opts.guild || '111111111111';
  const channels = new Map(); const members = new Map(); const invites = new Map(); const app = { id: '1559473078558392390', verify_key: opts.verifyKey || '0043fbf602abd13573ec140afe6ed1e9cc5978c4806e18f5068f42a951faff76', interactions_endpoint_url: null }; let commands = []; const calls = []; const webhooks = new Map(); const messages = new Map(); const roles = new Map(); let seq = 900000000000;
  const botUser = { id: '555000000000000001', username: 'MafiaProBot', bot: true };
  const guild = { id: guildId, name: opts.guildName || 'Test server', system_channel_id: null, default_message_notifications: 0, verification_level: 0, owner_id: '1' };
  roles.set(guildId, { id: guildId, name: '@everyone', permissions: '1071698660929', position: 0, color: 0, hoist: false, mentionable: false, managed: false });
  const widget = { enabled: false, channel_id: null };
  const st = { fail: 0, failMsg: 'Missing Permissions', rateOnce: false, inviteFail: false, membersFail: false, endpointFail: false };
  const id = () => String(++seq);
  const msgList = ch => { if (!messages.has(ch)) messages.set(ch, []); return messages.get(ch); };
  const server = http.createServer((req, res) => {
    let body = ''; req.on('data', c => { body += c; });
    req.on('end', () => {
      let params = {}; try { params = body ? JSON.parse(body) : {}; } catch (e) {}
      const full = (req.url || '').replace(/^\/api\/v10/, ''); const url = full.split('?')[0]; const query = new URLSearchParams(full.split('?')[1] || '');
      calls.push({ method: req.method, url, params, auth: req.headers.authorization });
      const send = (code, obj, headers = {}) => { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, headers)); res.end(obj === null ? '' : JSON.stringify(obj)); };
      let m;
      // webhook execution uses the webhook token, no bot auth
      if ((m = /^\/webhooks\/(\d+)\/([\w-]+)(?:\/messages\/(\d+))?$/.exec(url))) {
        const w = webhooks.get(m[1]); if (!w || w.token !== m[2]) return send(404, { message: 'Unknown Webhook', code: 10015 });
        const list = msgList(w.channel_id);
        if (req.method === 'POST' && !m[3]) { const msg = { id: id(), channel_id: w.channel_id, webhook_id: w.id, author: { id: w.id, username: w.name }, content: params.content || '', embeds: params.embeds || [], components: params.components || [] }; list.push(msg); return query.get('wait') === 'true' ? send(200, msg) : send(204, null); }
        if (req.method === 'PATCH' && m[3]) { const msg = list.find(x => x.id === m[3] && x.webhook_id === w.id); if (!msg) return send(404, { message: 'Unknown Message', code: 10008 }); Object.assign(msg, params); return send(200, msg); }
        return send(405, { message: '405: Method Not Allowed', code: 0 });
      }
      if (req.headers.authorization !== 'Bot ' + token) return send(401, { message: '401: Unauthorized', code: 0 });
      if (st.rateOnce) { st.rateOnce = false; return send(429, { message: 'You are being rate limited.', retry_after: 0.2, global: false }, { 'retry-after': '1' }); }
      if (st.fail) return send(st.fail, { message: st.failMsg, code: 50013 });
      if (req.method === 'GET' && url === '/users/@me') return send(200, botUser);
      if ((m = /^\/guilds\/(\d+)(\/.*)?$/.exec(url)) && m[1] !== guildId) return send(404, { message: 'Unknown Guild', code: 10004 });
      if (req.method === 'GET' && url === `/guilds/${guildId}`) return send(200, guild);
      if (req.method === 'PATCH' && url === `/guilds/${guildId}`) { Object.assign(guild, params); return send(200, guild); }
      if (req.method === 'GET' && url === `/guilds/${guildId}/roles`) return send(200, [...roles.values()]);
      if (req.method === 'POST' && url === `/guilds/${guildId}/roles`) { const r = Object.assign({ id: id(), permissions: '0', position: roles.size, managed: false }, params); roles.set(r.id, r); return send(200, r); }
      if (req.method === 'PATCH' && url === `/guilds/${guildId}/roles`) { for (const p of Array.isArray(params) ? params : []) { const r = roles.get(p.id); if (!r) return send(400, { message: 'Invalid Form Body', code: 50035 }); if (p.position !== undefined) r.position = p.position; } return send(200, [...roles.values()]); } // role positions (v54 rank roles)
      if ((m = /^\/guilds\/\d+\/roles\/(\d+)$/.exec(url)) && req.method === 'PATCH') { const r = roles.get(m[1]); if (!r) return send(404, { message: 'Unknown Role', code: 10011 }); Object.assign(r, params); return send(200, r); }
      if (req.method === 'GET' && url === `/guilds/${guildId}/channels`) return send(200, [...channels.values()]);
      if (req.method === 'PATCH' && url === `/guilds/${guildId}/channels`) { for (const p of Array.isArray(params) ? params : []) { const ch = channels.get(p.id); if (!ch) return send(400, { message: 'Invalid Form Body', code: 50035 }); if (p.position !== undefined) ch.position = p.position; if (p.parent_id !== undefined) ch.parent_id = p.parent_id; } return send(204, null); } // channel order
      if (req.method === 'GET' && url === `/guilds/${guildId}/members`) { if (st.membersFail) return send(403, { message: 'Missing Access', code: 50001 }); const after = query.get('after') || '0'; return send(200, [...members.values()].filter(x => BigInt(x.user.id) > BigInt(after)).sort((a, b) => (BigInt(a.user.id) < BigInt(b.user.id) ? -1 : 1)).slice(0, Number(query.get('limit')) || 1)); }
      if (url === `/guilds/${guildId}/widget`) { if (req.method === 'PATCH') Object.assign(widget, params); return send(200, widget); }
      if (req.method === 'GET' && url === `/guilds/${guildId}/widget.json`) { if (!widget.enabled) return send(403, { message: 'Widget Disabled', code: 50004 }); const online = [...members.values()].filter(m => m.status !== 'offline'); const vc = [...channels.values()].filter(c => c.type === 2); return send(200, { id: guildId, name: guild.name, instant_invite: widget.channel_id ? 'https://discord.com/invite/widget1' : null, presence_count: online.length, channels: vc.map(c => ({ id: c.id, name: c.name, position: 0 })), members: online.map(m => Object.assign({ id: m.user.id, username: m.user.username, status: 'online', avatar_url: 'https://cdn.discordapp.com/widget-avatars/x/' + m.user.id }, m.voice ? { channel_id: m.voice } : {})) }); }
      if (req.method === 'GET' && url === `/guilds/${guildId}/invites`) return send(200, [...invites.values()]);
      if (req.method === 'GET' && url === '/applications/@me') return send(200, app);
      if (req.method === 'PATCH' && url === '/applications/@me') { if (st.endpointFail) return send(400, { message: 'Invalid Form Body', code: 50035, errors: { interactions_endpoint_url: { _errors: [{ code: 'APPLICATION_INTERACTIONS_ENDPOINT_URL_INVALID', message: 'The specified interactions endpoint url could not be verified.' }] } } }); Object.assign(app, params); return send(200, app); }
      if ((m = /^\/guilds\/\d+\/members\/(\d+)\/roles\/(\d+)$/.exec(url)) && (req.method === 'PUT' || req.method === 'DELETE')) { // a member's role on / off (buttons in 🌐・language)
        const mem = members.get(m[1]); if (!mem) return send(404, { message: 'Unknown Member', code: 10007 }); if (!roles.has(m[2])) return send(404, { message: 'Unknown Role', code: 10011 });
        mem.roles = (mem.roles || []).filter(r => r !== m[2]).concat(req.method === 'PUT' ? [m[2]] : []); return send(204, null);
      }
      if (req.method === 'PUT' && url === `/applications/${app.id}/guilds/${guildId}/commands`) { commands = params; return send(200, params.map((c, i) => Object.assign({ id: String(700 + i) }, c))); }
      if (req.method === 'GET' && url === `/guilds/${guildId}/webhooks`) return send(200, [...webhooks.values()]);
      if (req.method === 'POST' && url === `/guilds/${guildId}/channels`) {
        if (params.parent_id && params.parent_id !== opts.category && !channels.has(params.parent_id)) return send(400, { message: 'Invalid Form Body', code: 50035 });
        const name = params.type === 0 ? String(params.name).toLowerCase().replace(/\s+/g, '-') : params.name; // Discord's text-channel name normalisation
        const ch = { id: id(), guild_id: guildId, name, type: params.type, topic: params.topic || null, user_limit: params.user_limit || 0, parent_id: params.parent_id || null, position: params.position !== undefined ? params.position : [...channels.values()].filter(c => (c.type === 4) === (params.type === 4) && c.parent_id === (params.parent_id || null)).length, permission_overwrites: params.permission_overwrites || [] };
        channels.set(ch.id, ch); return send(201, ch);
      }
      if ((m = /^\/channels\/(\d+)\/invites$/.exec(url)) && req.method === 'POST') {
        if (!channels.has(m[1])) return send(404, { message: 'Unknown Channel', code: 10003 });
        if (st.inviteFail) return send(403, { message: 'Missing Permissions', code: 50013 });
        const inv = { code: 'mp' + m[1].slice(-6) + String(invites.size), uses: 0, max_age: params.max_age, max_uses: params.max_uses || 0, inviter: botUser, channel: { id: m[1], name: channels.get(m[1]).name } };
        invites.set(inv.code, inv); return send(200, inv);
      }
      if ((m = /^\/channels\/(\d+)\/webhooks$/.exec(url))) {
        if (!channels.has(m[1])) return send(404, { message: 'Unknown Channel', code: 10003 });
        if (req.method === 'GET') return send(200, [...webhooks.values()].filter(w => w.channel_id === m[1]));
        if (req.method === 'POST') { const w = { id: id(), type: 1, guild_id: guildId, channel_id: m[1], name: params.name, token: 'tok' + seq, user: botUser }; webhooks.set(w.id, w); return send(200, w); }
      }
      if ((m = /^\/channels\/(\d+)\/messages(?:\/(\d+))?$/.exec(url))) {
        if (!channels.has(m[1])) return send(404, { message: 'Unknown Channel', code: 10003 });
        const list = msgList(m[1]);
        if (req.method === 'GET' && !m[2]) return send(200, list.slice().reverse().slice(0, Number(query.get('limit')) || 50)); // newest first, like Discord
        if (req.method === 'POST' && !m[2]) { const msg = { id: id(), channel_id: m[1], author: botUser, content: params.content || '', embeds: params.embeds || [], components: params.components || [] }; list.push(msg); return send(200, msg); }
        const msg = list.find(x => x.id === m[2]); if (!msg) return send(404, { message: 'Unknown Message', code: 10008 });
        if (req.method === 'PATCH') { Object.assign(msg, params); return send(200, msg); }
        if (req.method === 'DELETE') { list.splice(list.indexOf(msg), 1); return send(204, null); }
      }
      if ((m = /^\/channels\/(\d+)\/pins\/(\d+)$/.exec(url)) && req.method === 'PUT') return send(204, null);
      if ((m = /^\/channels\/(\d+)$/.exec(url))) {
        const ch = channels.get(m[1]); if (!ch) return send(404, { message: 'Unknown Channel', code: 10003 });
        if (req.method === 'GET') return send(200, ch);
        if (req.method === 'PATCH') { Object.assign(ch, params); return send(200, ch); }
        if (req.method === 'DELETE') { channels.delete(m[1]); return send(200, ch); }
      }
      return send(404, { message: '404: Not Found', code: 0 });
    });
  });
  const join = (user, code, at) => { members.set(user.id, { user, joined_at: new Date(at || Date.now()).toISOString(), roles: [] }); if (code && invites.has(code)) invites.get(code).uses++; };
  const leave = uid => members.delete(uid);
  const memberInvite = (inviter, code) => { const inv = { code, uses: 0, max_age: 0, max_uses: 0, inviter, channel: { id: '1', name: 'general' } }; invites.set(code, inv); return inv; };
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ server, channels, calls, st, webhooks, messages, roles, guild, botUser, members, invites, app, widget, commands: () => commands, join, leave, memberInvite, base: `http://127.0.0.1:${port}/api/v10`, lastId: () => String(seq), close: () => new Promise(r => server.close(r)) })));
}
