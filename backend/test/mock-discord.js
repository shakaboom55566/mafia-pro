/* A fake discord.com/api/v10: voice channels, invites, user limits, deletes; failure and rate-limit switches for tests. */
import http from 'node:http';

export function startMockDiscord(port = 8792, opts = {}) {
  const token = opts.token || 'dc-token'; const guild = opts.guild || '111111111111';
  const channels = new Map(); const calls = []; let seq = 900000000000;
  const st = { fail: 0, failMsg: 'Missing Permissions', rateOnce: false, inviteFail: false };
  const server = http.createServer((req, res) => {
    let body = ''; req.on('data', c => { body += c; });
    req.on('end', () => {
      let params = {}; try { params = body ? JSON.parse(body) : {}; } catch (e) {}
      const url = (req.url || '').replace(/^\/api\/v10/, ''); calls.push({ method: req.method, url, params, auth: req.headers.authorization });
      const send = (code, obj, headers = {}) => { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, headers)); res.end(obj === null ? '' : JSON.stringify(obj)); };
      if (req.headers.authorization !== 'Bot ' + token) return send(401, { message: '401: Unauthorized', code: 0 });
      if (st.rateOnce) { st.rateOnce = false; return send(429, { message: 'You are being rate limited.', retry_after: 0.2, global: false }, { 'retry-after': '1' }); }
      if (st.fail) return send(st.fail, { message: st.failMsg, code: 50013 });
      let m;
      if (req.method === 'POST' && (m = /^\/guilds\/(\d+)\/channels$/.exec(url))) {
        if (m[1] !== guild) return send(404, { message: 'Unknown Guild', code: 10004 });
        if (params.parent_id && params.parent_id !== opts.category) return send(400, { message: 'Invalid Form Body', code: 50035 });
        const id = String(++seq); const ch = { id, guild_id: guild, name: params.name, type: params.type, user_limit: params.user_limit || 0, parent_id: params.parent_id || null };
        channels.set(id, ch); return send(201, ch);
      }
      if (req.method === 'POST' && (m = /^\/channels\/(\d+)\/invites$/.exec(url))) {
        if (!channels.has(m[1])) return send(404, { message: 'Unknown Channel', code: 10003 });
        if (st.inviteFail) return send(403, { message: 'Missing Permissions', code: 50013 });
        return send(200, { code: 'mp' + m[1].slice(-6), max_age: params.max_age, channel: { id: m[1] } });
      }
      if (req.method === 'PATCH' && (m = /^\/channels\/(\d+)$/.exec(url))) {
        const ch = channels.get(m[1]); if (!ch) return send(404, { message: 'Unknown Channel', code: 10003 });
        Object.assign(ch, params); return send(200, ch);
      }
      if (req.method === 'DELETE' && (m = /^\/channels\/(\d+)$/.exec(url))) {
        const ch = channels.get(m[1]); if (!ch) return send(404, { message: 'Unknown Channel', code: 10003 });
        channels.delete(m[1]); return send(200, ch);
      }
      return send(404, { message: '404: Not Found', code: 0 });
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ server, channels, calls, st, base: `http://127.0.0.1:${port}/api/v10`, lastId: () => String(seq), close: () => new Promise(r => server.close(r)) })));
}
