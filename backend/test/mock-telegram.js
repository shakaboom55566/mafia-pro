/* A fake api.telegram.org: records every call and answers like Telegram would. */
import http from 'node:http';

export function startMockTelegram(port = 8790) {
  const calls = [];
  const blocked = new Set(); // chat ids that "blocked the bot"
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const m = /^\/bot([^/]+)\/(\w+)$/.exec(req.url || '');
      const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
      if (!m) return send(404, { ok: false, description: 'Not Found' });
      const [, token, method] = m; let params = {}; try { params = body ? JSON.parse(body) : {}; } catch (e) {}
      calls.push({ token, method, params });
      if (token !== 'test-token') return send(401, { ok: false, error_code: 401, description: 'Unauthorized' });
      switch (method) {
        case 'getMe': return send(200, { ok: true, result: { id: 1, is_bot: true, first_name: 'Mafia Pro', username: 'mafiapro_test_bot' } });
        case 'sendMessage':
          if (blocked.has(Number(params.chat_id))) return send(403, { ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' });
          return send(200, { ok: true, result: { message_id: calls.length, chat: { id: params.chat_id }, text: params.text } });
        case 'createInvoiceLink': return send(200, { ok: true, result: 'https://t.me/$' + Buffer.from(params.payload).toString('base64url') });
        case 'answerPreCheckoutQuery': return send(200, { ok: true, result: true });
        default: return send(200, { ok: true, result: true });
      }
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ server, calls, blocked, base: `http://127.0.0.1:${port}`, close: () => new Promise(r => server.close(r)) })));
}
