/* Telegram Bot API client + Mini App initData verification (Web Crypto, no dependencies). */
const enc = s => new TextEncoder().encode(s);
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function hmac(keyBytes, data) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', key, enc(data));
}
function safeEqual(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

/* https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   Returns { user, authDate, startParam, raw } or null. */
export async function verifyInitData(initData, botToken, maxAgeSec = 86400) {
  if (!initData || typeof initData !== 'string' || initData.length > 4096) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash'); if (!hash) return null;
  params.delete('hash');
  const dcs = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = await hmac(enc('WebAppData'), botToken);
  const sig = hex(await hmac(secret, dcs));
  if (!safeEqual(sig, hash.toLowerCase())) return null;
  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Math.abs(Date.now() / 1000 - authDate) > maxAgeSec) return null;
  let user = null; try { user = JSON.parse(params.get('user') || 'null'); } catch (e) { return null; }
  if (!user || !user.id) return null;
  return { user, authDate, startParam: params.get('start_param') || null, raw: params };
}

/* Build an initData string signed with the bot token — used by the test-suite to impersonate the Mini App. */
export async function signInitData(fields, botToken) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) params.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  const dcs = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = await hmac(enc('WebAppData'), botToken);
  params.set('hash', hex(await hmac(secret, dcs)));
  return params.toString();
}

export class Bot {
  constructor(env) { this.token = env.BOT_TOKEN; this.base = (env.TELEGRAM_API || 'https://api.telegram.org').replace(/\/$/, ''); }
  async call(method, body) {
    const r = await fetch(`${this.base}/bot${this.token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    let d = null; try { d = await r.json(); } catch (e) { d = { ok: false, description: `HTTP ${r.status}` }; }
    return d;
  }
  /* multipart upload (sendDocument and the like): fields + one file */
  async upload(method, fields, field, filename, bytes, mime) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields || {})) if (v != null) fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    fd.append(field, new Blob([bytes], { type: mime || 'application/octet-stream' }), filename);
    const r = await fetch(`${this.base}/bot${this.token}/${method}`, { method: 'POST', body: fd });
    let d = null; try { d = await r.json(); } catch (e) { d = { ok: false, description: `HTTP ${r.status}` }; }
    return d;
  }
  sendDocument(chatId, filename, bytes, caption, mime) { return this.upload('sendDocument', { chat_id: chatId, caption: caption || null, parse_mode: caption ? 'HTML' : null }, 'document', filename, bytes, mime); }
  send(chatId, text, extra) { return this.call('sendMessage', Object.assign({ chat_id: chatId, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }, extra || {})); }
  playButton(label, url) { return { reply_markup: { inline_keyboard: [[{ text: label, web_app: { url } }]] } }; }
}
export const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
