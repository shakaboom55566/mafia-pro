/* A fake graph.facebook.com and open.tiktokapis.com for the social media tests: records every call. */
import http from 'node:http';

export function startMockSocial(port = 8793) {
  const calls = [];
  const state = { granted: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'business_management', 'instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'instagram_manage_contents'],
    pages: [{ id: '1001', name: 'Mafia Pro', access_token: 'page-token-1001', instagram_business_account: { id: '1784', username: 'mafiapro.app' } }, { id: '1002', name: 'Other page', access_token: 'page-token-1002' }],
    deleted: [], ttRefresh: 0, pageTokenOk: true };
  const server = http.createServer((req, res) => {
    const parts = []; req.on('data', c => parts.push(c));
    req.on('end', () => {
      const body = Buffer.concat(parts).toString('utf8'); const u = new URL(req.url, 'http://x'); const q = Object.fromEntries(u.searchParams);
      const form = /urlencoded/.test(req.headers['content-type'] || '') ? Object.fromEntries(new URLSearchParams(body)) : {};
      calls.push({ method: req.method, path: u.pathname, q, form, auth: req.headers.authorization || '' });
      const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
      const p = u.pathname.replace(/^\/v\d+\.\d+/, '');
      if (p === '/oauth/access_token') {
        if (q.grant_type === 'fb_exchange_token') return send(200, { access_token: 'long-user', token_type: 'bearer', expires_in: 5184000 });
        if (q.code === 'good-code' && q.client_secret === 'meta-secret') return send(200, { access_token: 'short-user', token_type: 'bearer', expires_in: 3600 });
        return send(400, { error: { message: 'Invalid verification code format.', code: 100 } });
      }
      if (p === '/me/permissions') return send(200, { data: state.granted.map(x => ({ permission: x, status: 'granted' })) });
      if (p === '/me/accounts') return send(200, { data: state.pages });
      if (req.method === 'DELETE') { if (/^\/9/.test(p)) return send(400, { error: { message: 'Unsupported delete request.', code: 100 } }); state.deleted.push(p.slice(1)); return send(200, { success: true }); }
      if (/^\/\d+$/.test(p) && req.method === 'GET') return state.pageTokenOk ? send(200, { id: p.slice(1), name: 'Mafia Pro' }) : send(400, { error: { message: 'Error validating access token: The session has been invalidated', code: 190 } });
      if (p === '/v2/oauth/token/') {
        if (form.grant_type === 'authorization_code' && form.code === 'tt-code' && form.client_secret === 'tt-secret') return send(200, { open_id: 'open-1', scope: 'user.info.basic,video.upload,video.publish', access_token: 'tt-access-1', expires_in: 86400, refresh_token: 'tt-refresh-1', refresh_expires_in: 31536000, token_type: 'Bearer' });
        if (form.grant_type === 'refresh_token' && /^tt-refresh-/.test(form.refresh_token)) { state.ttRefresh++; return send(200, { open_id: 'open-1', scope: 'user.info.basic,video.upload,video.publish', access_token: 'tt-access-' + (state.ttRefresh + 1), expires_in: 86400, refresh_token: 'tt-refresh-' + (state.ttRefresh + 1), refresh_expires_in: 31536000 }); }
        return send(200, { error: 'invalid_grant', error_description: 'Authorization code is expired.' });
      }
      if (p === '/v2/user/info/') return send(200, { data: { user: { open_id: 'open-1', display_name: 'Mafia Pro TT' } }, error: { code: 'ok' } });
      return send(404, { error: { message: 'not found ' + u.pathname } });
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ calls, state, base: `http://127.0.0.1:${port}`, close: () => new Promise(r => server.close(r)) })));
}
