/* A fake api.telegram.org: records every call and answers like Telegram would. */
import http from 'node:http';

export function startMockTelegram(port = 8790) {
  const calls = [];
  const blocked = new Set(); // chat ids that "blocked the bot"
  const state = { member: { status: 'administrator', can_post_messages: true }, failChats: new Set() }; // channel posts: the bot's membership, chats where sending fails
  const server = http.createServer((req, res) => {
    const parts = [];
    req.on('data', c => { parts.push(c); });
    req.on('end', async () => {
      const buf = Buffer.concat(parts); const body = buf.toString('utf8'); const ctype = String(req.headers['content-type'] || '');
      const m = /^\/bot([^/]+)\/(\w+)$/.exec(req.url || '');
      const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
      if (!m) return send(404, { ok: false, description: 'Not Found' });
      const [, token, method] = m; let params = {};
      if (ctype.startsWith('multipart/form-data')) { // file uploads (sendDocument): fields as strings, files as { name, type, size, bytes }
        try { const fd = await new Response(buf, { headers: { 'content-type': ctype } }).formData();
          for (const [k, v] of fd.entries()) params[k] = typeof v === 'string' ? v : { name: v.name, type: v.type, size: v.size, bytes: Buffer.from(await v.arrayBuffer()) };
          if (params.chat_id && /^-?\d+$/.test(params.chat_id)) params.chat_id = Number(params.chat_id);
        } catch (e) {}
      } else { try { params = body ? JSON.parse(body) : {}; } catch (e) {} }
      calls.push({ token, method, params });
      if (token !== 'test-token') return send(401, { ok: false, error_code: 401, description: 'Unauthorized' });
      switch (method) {
        case 'getMe': return send(200, { ok: true, result: { id: 1, is_bot: true, first_name: 'Mafia Pro', username: 'mafiapro_test_bot' } });
        case 'sendMessage':
          if (state.failChats.has(String(params.chat_id))) return send(400, { ok: false, error_code: 400, description: 'Bad Request: need administrator rights in the channel chat' });
          if (blocked.has(Number(params.chat_id))) return send(403, { ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' });
          return send(200, { ok: true, result: { message_id: calls.length, chat: { id: params.chat_id }, text: params.text } });
        case 'sendDocument': return send(200, { ok: true, result: { message_id: calls.length, chat: { id: params.chat_id }, document: { file_name: params.document && params.document.name } } });
        case 'getChatMember': return send(200, { ok: true, result: Object.assign({ user: { id: params.user_id } }, state.member) });
        case 'createInvoiceLink': return send(200, { ok: true, result: 'https://t.me/$' + Buffer.from(params.payload).toString('base64url') });
        case 'answerPreCheckoutQuery': return send(200, { ok: true, result: true });
        case 'getWebhookInfo': return send(200, { ok: true, result: { url: 'https://api.test/webhook', pending_update_count: 0 } });
        default: return send(200, { ok: true, result: true });
      }
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ server, calls, blocked, state, base: `http://127.0.0.1:${port}`, close: () => new Promise(r => server.close(r)) })));
}
