/* Social media (v45): Instagram, a Facebook Page and TikTok, connected by an admin and used by the "Social" workflow
   (social/run.mjs makes a video with Veo every day and publishes it; nothing here talks to Gemini).
   - /social (admins)       status, "connect" buttons (OAuth consent screens), pause / resume, TikTok mode, /social page <id>
   - GET /social/cb/meta    Facebook Login for Business → long-lived Page token (+ the Instagram professional account linked to the Page)
   - GET /social/cb/tiktok  TikTok Login Kit → access token (24 h) + refresh token (365 days)
   - POST /social/creds     (X-Social-Key) tokens for one workflow run (TikTok refreshed first), pause, TikTok mode, admin ids
   - POST /social/report    (X-Social-Key) what one run published: ids and links per platform (for the delete button and /social)
   - POST /social/stats     (X-Social-Key) people who opened the bot through the profile links (start=ig / fb / tt), aggregated
   - callbacks sm_*         pause, resume, TikTok mode, delete a post from Instagram and Facebook (TikTok has no delete API)
   - runSocialCron          twice a day: a dead Page token or a TikTok refresh token near its end → a note to the admins
   Tokens are stored encrypted (AES-GCM, key derived from BOT_TOKEN): a new bot token means connecting the accounts again.
   Secrets (GitHub → worker, backend.yml): META_APP_ID, META_APP_SECRET, META_CONFIG_ID (optional), TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET. */
import { esc, safeEqual } from './tg.js';

const enc = s => new TextEncoder().encode(s);
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const now = () => Math.floor(Date.now() / 1000);
const adminIds = env => String(env.ADMIN_IDS || '').split(',').map(x => Number(x.trim())).filter(Boolean);
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export const GRAPH_V = 'v25.0';
const graphV = env => (/^v\d{2}\.\d$/.test(env.META_GRAPH_VERSION || '') ? env.META_GRAPH_VERSION : GRAPH_V);
const graphBase = env => String(env.META_GRAPH_BASE || 'https://graph.facebook.com').replace(/\/$/, '');
const dialogBase = env => String(env.META_DIALOG_BASE || 'https://www.facebook.com').replace(/\/$/, '');
const ttApi = env => String(env.TIKTOK_API || 'https://open.tiktokapis.com').replace(/\/$/, '');
const ttAuth = env => String(env.TIKTOK_AUTH || 'https://www.tiktok.com').replace(/\/$/, '');
const selfBase = env => String(env.SOCIAL_BASE || 'https://api.mafiapro.app').replace(/\/$/, '');
const redirectOf = (env, p) => `${selfBase(env)}/social/cb/${p}`;
export const META_SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'business_management', 'instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'instagram_manage_contents'];
const META_NEED = ['pages_manage_posts', 'instagram_content_publish']; // without these nothing gets published
export const TT_SCOPES = ['user.info.basic', 'video.upload', 'video.publish'];
const TT_MODES = { telegram: '📲 вручную: ролик приходит сюда', inbox: '📥 в черновики TikTok (публикуете в приложении)', direct: '🚀 автопубликация (после аудита TikTok)' };
const STATE_TTL = 1800;

export async function socialKey(token) { return hex(await crypto.subtle.digest('SHA-256', enc(String(token) + ':mafia-pro-social'))).slice(0, 48); }

/* ---------- encrypted vault ---------- */
async function vaultKey(env) {
  const raw = await crypto.subtle.digest('SHA-256', enc(String(env.BOT_TOKEN) + ':mafia-pro-social-vault'));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
export async function seal(env, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await vaultKey(env), enc(JSON.stringify(obj))));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return 'v1:' + b64(out);
}
export async function unseal(env, s) {
  if (!s || !String(s).startsWith('v1:')) return null;
  try { const u = unb64(String(s).slice(3)); const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.subarray(0, 12) }, await vaultKey(env), u.subarray(12)); return JSON.parse(new TextDecoder().decode(pt)); }
  catch (e) { return null; } // another bot token: connect again
}

const cfgGet = (env, k) => env.DB.prepare('SELECT value FROM discord_cfg WHERE key = ?1').bind(k).first('value');
const cfgSet = (env, k, v) => env.DB.prepare('INSERT INTO discord_cfg (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3').bind(k, String(v), now()).run();

/* account rows: public part in columns, tokens sealed in `secret` */
async function account(env, platform) {
  const r = await env.DB.prepare('SELECT * FROM social_accounts WHERE platform = ?1').bind(platform).first(); if (!r) return null;
  const s = await unseal(env, r.secret); if (!s) return Object.assign({}, r, { broken: true, info: safeJSON(r.info) });
  return Object.assign({}, r, { s, info: safeJSON(r.info) });
}
const safeJSON = s => { try { return JSON.parse(s || '{}') || {}; } catch (e) { return {}; } };
async function saveAccount(env, platform, pub, secret) {
  await env.DB.prepare(`INSERT INTO social_accounts (platform, account_id, name, info, secret, expires_at, connected_by, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
    ON CONFLICT(platform) DO UPDATE SET account_id = ?2, name = ?3, info = ?4, secret = ?5, expires_at = ?6, connected_by = ?7, updated_at = ?8`)
    .bind(platform, pub.account_id || null, pub.name || null, JSON.stringify(pub.info || {}), await seal(env, secret), pub.expires_at || null, pub.by || null, now()).run();
}

/* ---------- consent links (minted when /social is shown; one use, 30 minutes) ---------- */
const metaReady = env => !!(env.META_APP_ID && env.META_APP_SECRET);
const ttReady = env => !!(env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET);
async function mintState(env, platform, tgId) {
  const st = hex(crypto.getRandomValues(new Uint8Array(16)));
  await env.DB.prepare('DELETE FROM social_states WHERE created_at < ?1').bind(now() - 86400).run();
  await env.DB.prepare('INSERT INTO social_states (state, platform, tg_id, created_at) VALUES (?1, ?2, ?3, ?4)').bind(st, platform, tgId, now()).run();
  return st;
}
export async function connectUrl(env, platform, tgId) {
  const state = await mintState(env, platform, tgId);
  if (platform === 'meta') {
    const q = new URLSearchParams({ client_id: env.META_APP_ID, redirect_uri: redirectOf(env, 'meta'), state, response_type: 'code' });
    if (env.META_CONFIG_ID) q.set('config_id', env.META_CONFIG_ID); else q.set('scope', META_SCOPES.join(','));
    return `${dialogBase(env)}/${graphV(env)}/dialog/oauth?${q}`;
  }
  const q = new URLSearchParams({ client_key: env.TIKTOK_CLIENT_KEY, response_type: 'code', scope: (env.TIKTOK_SCOPES || TT_SCOPES.join(',')), redirect_uri: redirectOf(env, 'tiktok'), state });
  return `${ttAuth(env)}/v2/auth/authorize/?${q}`;
}
async function takeState(env, platform, state) {
  if (!/^[0-9a-f]{32}$/.test(String(state || ''))) return null;
  const r = await env.DB.prepare('SELECT * FROM social_states WHERE state = ?1 AND platform = ?2').bind(state, platform).first();
  if (!r) return null;
  await env.DB.prepare('DELETE FROM social_states WHERE state = ?1').bind(state).run();
  return now() - r.created_at <= STATE_TTL ? r : null;
}

/* ---------- HTTP helpers ---------- */
async function getJSON(url, init) {
  let r = null, d = null; try { r = await fetch(url, init); d = await r.json(); } catch (e) { d = { error: { message: r ? `HTTP ${r.status}` : String(e && e.message || e) } }; }
  return Object.assign({ _status: r ? r.status : 0 }, d || {});
}
const graph = (env, p, params, method = 'GET') => {
  const u = new URL(`${graphBase(env)}/${graphV(env)}/${p.replace(/^\//, '')}`);
  if (method === 'GET' || method === 'DELETE') { for (const [k, v] of Object.entries(params || {})) u.searchParams.set(k, v); return getJSON(u, { method }); }
  return getJSON(u, { method, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params || {}) });
};
const gErr = d => (d && d.error ? `${d.error.message || 'error'}${d.error.code ? ` (#${d.error.code})` : ''}` : '');

/* ---------- OAuth callbacks ---------- */
async function metaConnect(env, code, by) {
  const t1 = await graph(env, 'oauth/access_token', { client_id: env.META_APP_ID, client_secret: env.META_APP_SECRET, redirect_uri: redirectOf(env, 'meta'), code });
  if (!t1.access_token) return { ok: false, why: 'обмен кода: ' + (gErr(t1) || 'нет токена') };
  const t2 = await graph(env, 'oauth/access_token', { grant_type: 'fb_exchange_token', client_id: env.META_APP_ID, client_secret: env.META_APP_SECRET, fb_exchange_token: t1.access_token });
  const user = t2.access_token || t1.access_token; // the long-lived user token gives Page tokens that do not expire
  const perms = await graph(env, 'me/permissions', { access_token: user });
  const granted = (perms.data || []).filter(p => p.status === 'granted').map(p => p.permission);
  const pg = await graph(env, 'me/accounts', { access_token: user, fields: 'id,name,access_token,instagram_business_account{id,username}', limit: '100' });
  const pages = (pg.data || []).filter(p => p && p.id && p.access_token).slice(0, 10);
  if (!pages.length) return { ok: false, why: 'Meta не вернула ни одной страницы Facebook. Нужна страница, где вы администратор, и галочка у неё на экране доступа. ' + (gErr(pg) || '') };
  const want = String(env.META_PAGE_ID || '');
  const page = pages.find(p => p.id === want) || pages.find(p => p.instagram_business_account) || pages[0];
  const list = pages.map(p => ({ id: p.id, name: String(p.name || '').slice(0, 80), ig: p.instagram_business_account ? { id: p.instagram_business_account.id, username: p.instagram_business_account.username || '' } : null, token: p.access_token }));
  const missing = META_NEED.filter(p => granted.length && !granted.includes(p));
  await saveAccount(env, 'meta', { account_id: page.id, name: String(page.name || '').slice(0, 80), by, expires_at: null,
    info: { ig: list.find(p => p.id === page.id).ig, pages: list.map(p => ({ id: p.id, name: p.name, ig: p.ig })), granted, missing } },
    { pages: list });
  return { ok: true, page: list.find(p => p.id === page.id), pages: list.length, missing };
}
async function ttToken(env, params) {
  return getJSON(`${ttApi(env)}/v2/oauth/token/`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams(Object.assign({ client_key: env.TIKTOK_CLIENT_KEY, client_secret: env.TIKTOK_CLIENT_SECRET }, params)) });
}
async function ttSave(env, t, by, keep) {
  const info = Object.assign({}, keep || {}, { scope: String(t.scope || (keep && keep.scope) || ''), open_id: t.open_id || (keep && keep.open_id) || '' });
  const ts = now();
  await saveAccount(env, 'tiktok', { account_id: info.open_id, name: info.name || '', by, info, expires_at: ts + (Number(t.refresh_expires_in) || 365 * 86400) },
    { access: t.access_token, refresh: t.refresh_token, access_exp: ts + (Number(t.expires_in) || 86400) - 60 });
}
async function tiktokConnect(env, code, by) {
  const t = await ttToken(env, { code, grant_type: 'authorization_code', redirect_uri: redirectOf(env, 'tiktok') });
  if (!t.access_token) return { ok: false, why: 'обмен кода: ' + (t.error_description || t.error || (t.error && t.error.message) || 'нет токена') };
  const me = await getJSON(`${ttApi(env)}/v2/user/info/?fields=open_id,display_name`, { headers: { Authorization: 'Bearer ' + t.access_token } });
  const name = String((me.data && me.data.user && me.data.user.display_name) || '').slice(0, 80);
  await ttSave(env, t, by, { name });
  const scope = String(t.scope || '');
  if (!(await cfgGet(env, 'social:tt_mode'))) await cfgSet(env, 'social:tt_mode', scope.includes('video.publish') ? 'inbox' : scope.includes('video.upload') ? 'inbox' : 'telegram');
  return { ok: true, name, scope };
}
/* a TikTok access token valid for at least `margin` seconds (refreshed and stored when needed) */
async function tiktokAccess(env, margin = 1800) {
  const a = await account(env, 'tiktok'); if (!a || !a.s) return { ok: false, why: a ? 'токен не читается — подключите TikTok заново' : 'не подключён' };
  if (a.s.access_exp - margin > now()) return { ok: true, token: a.s.access, open_id: a.info.open_id, scope: a.info.scope };
  const t = await ttToken(env, { grant_type: 'refresh_token', refresh_token: a.s.refresh });
  if (!t.access_token) return { ok: false, why: 'обновление токена TikTok: ' + (t.error_description || t.error || 'нет ответа') };
  await ttSave(env, t, a.connected_by, a.info); // "the returned refresh_token may be different" — keep the new one
  return { ok: true, token: t.access_token, open_id: t.open_id || a.info.open_id, scope: t.scope || a.info.scope };
}

const PAGE = (title, body, ok) => new Response(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0a0e;color:#efe7d6;font:16px/1.5 system-ui,sans-serif}main{max-width:440px;padding:28px 22px;text-align:center}
h1{font-size:22px;margin:0 0 10px;color:${ok ? '#f0cd7a' : '#ff8a7a'}}p{color:#bdb3a2;margin:8px 0}</style></head><body><main><h1>${esc(title)}</h1>${body}</main></body></html>`,
{ status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff' } });

/* GET /social/cb/meta|tiktok — the consent screen sends the browser back here */
export async function socialCallback(env, bot, url, platform, locked) {
  const p = url.searchParams;
  if (p.get('error') || p.get('error_reason')) {
    await takeState(env, platform, p.get('state'));
    return PAGE('Подключение отменено', '<p>Доступ не выдан. Можно попробовать ещё раз: /social в боте.</p>', false);
  }
  const st = await takeState(env, platform, p.get('state'));
  if (!st) return PAGE('Ссылка устарела', '<p>Откройте /social в боте и нажмите «Подключить» ещё раз — ссылка действует 30 минут и один раз.</p>', false);
  if (locked) return PAGE('Режим блокировки', '<p>Пока включена блокировка, подключать аккаунты нельзя.</p>', false);
  const code = String(p.get('code') || '').slice(0, 2048); if (!code) return PAGE('Нет кода', '<p>Попробуйте ещё раз из бота: /social.</p>', false);
  const ready = platform === 'meta' ? metaReady(env) : ttReady(env);
  if (!ready) return PAGE('Нет ключей приложения', '<p>Добавьте ключи приложения в GitHub Secrets и дождитесь деплоя.</p>', false);
  const r = platform === 'meta' ? await metaConnect(env, code, st.tg_id) : await tiktokConnect(env, code, st.tg_id);
  if (!r.ok) {
    await bot.send(st.tg_id, `⚠️ ${platform === 'meta' ? 'Instagram и Facebook' : 'TikTok'}: не подключено.\n${esc(r.why)}`);
    return PAGE('Не получилось', `<p>${esc(r.why)}</p><p>Подробности — в боте.</p>`, false);
  }
  let text;
  if (platform === 'meta') {
    const ig = r.page.ig;
    text = `✅ Подключено: страница Facebook <b>${esc(r.page.name)}</b>` + (ig ? ` и Instagram <b>@${esc(ig.username || ig.id)}</b>.` : '.\n⚠️ К этой странице не привязан профессиональный аккаунт Instagram — Instagram публиковаться не будет. Привяжите его в настройках страницы и подключите снова.')
      + (r.pages > 1 ? `\nСтраниц доступно: ${r.pages}. Сменить: /social page &lt;id&gt; (список — в /social).` : '')
      + (r.missing.length ? `\n⚠️ Не выданы права: ${esc(r.missing.join(', '))} — без них публикация не пройдёт. Подключите снова и отметьте все галочки.` : '');
  } else {
    text = `✅ TikTok подключён${r.name ? `: <b>${esc(r.name)}</b>` : ''}.\nРежим: ${TT_MODES[(await cfgGet(env, 'social:tt_mode')) || 'telegram']}. Сменить — в /social.`;
  }
  await bot.send(st.tg_id, text);
  return PAGE('Готово', `<p>${platform === 'meta' ? 'Instagram и Facebook подключены.' : 'TikTok подключён.'} Можно закрыть страницу и вернуться в Telegram.</p>`, true);
}

/* ---------- /social ---------- */
async function lastPosts(env, n = 5) { return (await env.DB.prepare('SELECT * FROM social_posts ORDER BY created_at DESC LIMIT ?1').bind(n).all()).results || []; }
const mark = (id, st) => (st === 'deleted' ? '🗑' : id ? '✅' : st ? '⚠️' : '—');
async function statusCard(env, tgId) {
  const meta = await account(env, 'meta'); const tt = await account(env, 'tiktok');
  const paused = (await cfgGet(env, 'social:paused')) === '1'; const mode = (await cfgGet(env, 'social:tt_mode')) || 'telegram';
  const ig = meta && meta.info && meta.info.ig;
  const lines = ['<b>📱 Соцсети</b>'];
  lines.push(`Instagram: ${meta && !meta.broken ? (ig ? `✅ @${esc(ig.username || ig.id)}` : '⚠️ к странице не привязан Instagram') : '⚪️ не подключён'}`);
  lines.push(`Facebook: ${meta ? (meta.broken ? '⚠️ токен не читается — подключите заново' : `✅ страница «${esc(meta.name)}» (${esc(meta.account_id)})`) : '⚪️ не подключён'}`);
  if (meta && meta.info && meta.info.missing && meta.info.missing.length) lines.push(`⚠️ Не выданы права: ${esc(meta.info.missing.join(', '))}`);
  if (meta && meta.info && (meta.info.pages || []).length > 1) lines.push('Страницы: ' + meta.info.pages.map(p => `${esc(p.name)} <code>${esc(p.id)}</code>${p.ig ? ' (IG)' : ''}`).join(', '));
  lines.push(`TikTok: ${tt ? (tt.broken ? '⚠️ токен не читается — подключите заново' : `✅ ${esc(tt.name || 'аккаунт')}`) : '⚪️ не подключён'} · ${TT_MODES[tt ? mode : 'telegram']}`);
  lines.push(paused ? '⏸ Автопубликация на паузе' : '▶️ Автопубликация включена: ролик каждый день около 19:00');
  const posts = await lastPosts(env, 5);
  if (posts.length) lines.push('', '<b>Последние</b>', ...posts.map(p => `${esc(p.id)} · ${esc(p.rubric || '')} — IG ${mark(p.ig_id, p.ig_status)} FB ${mark(p.fb_id, p.fb_status)} TT ${p.tt_status === 'PUBLISH_COMPLETE' ? '✅' : p.tt_status === 'SEND_TO_USER_INBOX' ? '📥' : p.tt_status === 'telegram' ? '📲' : p.tt_status ? '⚠️' : '—'}`));
  if (!metaReady(env) || !ttReady(env)) lines.push('', `<i>Чтобы появились кнопки подключения, нужны ключи приложений в GitHub Secrets: ${[!metaReady(env) && 'META_APP_ID, META_APP_SECRET', !ttReady(env) && 'TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET'].filter(Boolean).join('; ')}.</i>`);
  const kb = [];
  const conn = [];
  if (metaReady(env)) conn.push({ text: meta ? '🔁 Instagram + Facebook' : '🔗 Подключить Instagram + Facebook', url: await connectUrl(env, 'meta', tgId) });
  if (ttReady(env)) conn.push({ text: tt ? '🔁 TikTok' : '🔗 Подключить TikTok', url: await connectUrl(env, 'tiktok', tgId) });
  for (const c of conn) kb.push([c]);
  kb.push([paused ? { text: '▶️ Включить', callback_data: 'sm_resume' } : { text: '⏸ Пауза', callback_data: 'sm_pause' }]);
  if (tt) kb.push(Object.keys(TT_MODES).filter(m => m !== mode).map(m => ({ text: 'TikTok: ' + { telegram: 'вручную', inbox: 'черновики', direct: 'автопубликация' }[m], callback_data: 'sm_tt_' + m })));
  return { text: lines.join('\n'), extra: { reply_markup: { inline_keyboard: kb } } };
}
export async function onSocialCommand(env, bot, msg) {
  const chat = msg.chat.id; const arg = String(msg.text || '').trim().split(/\s+/).slice(1);
  if (arg[0] === 'pause' || arg[0] === 'resume') { await cfgSet(env, 'social:paused', arg[0] === 'pause' ? '1' : '0'); }
  else if (arg[0] === 'tiktok' && TT_MODES[arg[1]]) { await cfgSet(env, 'social:tt_mode', arg[1]); }
  else if (arg[0] === 'page' && /^\d{3,30}$/.test(arg[1] || '')) {
    const a = await account(env, 'meta'); const p = a && a.s && a.s.pages.find(x => x.id === arg[1]);
    if (!p) return bot.send(chat, 'Такой страницы нет среди подключённых. Список — в /social.');
    await saveAccount(env, 'meta', { account_id: p.id, name: p.name, by: msg.from.id, info: Object.assign({}, a.info, { ig: p.ig }) }, a.s);
  }
  const c = await statusCard(env, msg.from.id);
  return bot.send(chat, c.text, c.extra);
}

/* ---------- callbacks ---------- */
async function deleteEverywhere(env, p) {
  const out = [];
  const meta = await account(env, 'meta'); const page = meta && meta.s && meta.s.pages.find(x => x.id === meta.account_id);
  const token = page && page.token;
  if (p.ig_id && p.ig_status !== 'deleted') {
    const d = token ? await graph(env, p.ig_id, { access_token: token }, 'DELETE') : { error: { message: 'Instagram не подключён' } };
    const ok = d.success === true || d.success === 'true';
    if (ok) await env.DB.prepare("UPDATE social_posts SET ig_status = 'deleted' WHERE id = ?1").bind(p.id).run();
    out.push(`Instagram: ${ok ? 'удалено' : 'не удалось — ' + (gErr(d) || 'нет ответа') + '. Удалите в приложении.'}`);
  }
  if (p.fb_id && p.fb_status !== 'deleted') {
    let d = token ? await graph(env, p.fb_id, { access_token: token }, 'DELETE') : { error: { message: 'Facebook не подключён' } };
    if (!(d.success === true || d.success === 'true') && token && meta.account_id) d = await graph(env, `${meta.account_id}_${p.fb_id}`, { access_token: token }, 'DELETE'); // the reel's page post
    const ok = d.success === true || d.success === 'true';
    if (ok) await env.DB.prepare("UPDATE social_posts SET fb_status = 'deleted' WHERE id = ?1").bind(p.id).run();
    out.push(`Facebook: ${ok ? 'удалено' : 'не удалось — ' + (gErr(d) || 'нет ответа') + '. Удалите на странице.'}`);
  }
  if (p.tt_status && p.tt_status !== 'telegram') out.push('TikTok: у TikTok нет удаления через API — удалите в приложении.');
  return out.length ? out : ['Нечего удалять.'];
}
export async function onSocialCallback(env, bot, q, isAdmin) {
  const data = String(q.data || ''); if (!/^sm_/.test(data)) return false;
  const answer = (text, alert) => bot.call('answerCallbackQuery', { callback_query_id: q.id, text, show_alert: !!alert });
  if (!isAdmin((q.from || {}).id)) { await answer('Только для администраторов'); return true; }
  const chat = q.message && q.message.chat && q.message.chat.id; const mid = q.message && q.message.message_id;
  if (data === 'sm_pause' || data === 'sm_resume') {
    await cfgSet(env, 'social:paused', data === 'sm_pause' ? '1' : '0');
    await answer(data === 'sm_pause' ? 'Пауза: новые ролики не создаются и не публикуются' : 'Автопубликация включена', true);
    if (q.message && q.message.text && /Соцсети/.test(q.message.text)) { const c = await statusCard(env, q.from.id); await bot.call('editMessageText', Object.assign({ chat_id: chat, message_id: mid, text: c.text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }, c.extra)); }
    return true;
  }
  let m = /^sm_tt_(telegram|inbox|direct)$/.exec(data);
  if (m) {
    await cfgSet(env, 'social:tt_mode', m[1]);
    await answer('TikTok: ' + TT_MODES[m[1]].replace(/^\S+\s/, ''), m[1] === 'direct');
    if (q.message && q.message.text) { const c = await statusCard(env, q.from.id); await bot.call('editMessageText', Object.assign({ chat_id: chat, message_id: mid, text: c.text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }, c.extra)); }
    return true;
  }
  m = /^sm_(del|delok|keep)_([0-9A-Za-z_-]{4,40})$/.exec(data);
  if (m) {
    const p = await env.DB.prepare('SELECT * FROM social_posts WHERE id = ?1').bind(m[2]).first();
    if (!p) { await answer('Пост не найден'); return true; }
    const base = [[{ text: '🗑 Удалить везде', callback_data: `sm_del_${p.id}` }, { text: '⏸ Пауза', callback_data: 'sm_pause' }]];
    if (m[1] === 'del') {
      await bot.call('editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: { inline_keyboard: [[{ text: '✅ Да, удалить из Instagram и Facebook', callback_data: `sm_delok_${p.id}` }], [{ text: '↩️ Оставить', callback_data: `sm_keep_${p.id}` }]] } });
      await answer('Подтвердите удаление'); return true;
    }
    if (m[1] === 'keep') { await bot.call('editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: { inline_keyboard: base } }); await answer('Оставлено'); return true; }
    const res = await deleteEverywhere(env, p);
    await answer('Готово');
    await bot.call('editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: { inline_keyboard: [] } });
    await bot.send(chat, `🗑 ${esc(p.id)}\n` + res.map(esc).join('\n'), { reply_parameters: { message_id: mid, allow_sending_without_reply: true } });
    return true;
  }
  await answer(''); return true;
}

/* ---------- for the workflow (X-Social-Key) ---------- */
export async function socialCreds(env, locked) {
  const paused = (await cfgGet(env, 'social:paused')) === '1'; const mode = (await cfgGet(env, 'social:tt_mode')) || 'telegram';
  const out = { ok: true, locked: !!locked, paused, admins: adminIds(env), graph: graphV(env), apps: { meta: metaReady(env), tiktok: ttReady(env) }, meta: null, tiktok: null, ttMode: mode, problems: [] };
  if (locked) return out; // lockdown: no tokens leave the vault
  const meta = await account(env, 'meta');
  if (meta && meta.s) { const page = meta.s.pages.find(x => x.id === meta.account_id) || meta.s.pages[0]; out.meta = { pageId: page.id, pageName: page.name, pageToken: page.token, igId: page.ig ? page.ig.id : null, igUsername: page.ig ? page.ig.username : null }; }
  else if (meta) out.problems.push('meta: токен не читается — подключите заново (/social)');
  const tt = await account(env, 'tiktok');
  if (tt) { const a = await tiktokAccess(env); if (a.ok) out.tiktok = { token: a.token, openId: a.open_id, scope: a.scope, name: tt.name || '' }; else out.problems.push('tiktok: ' + a.why); }
  if (!out.tiktok && mode !== 'telegram') out.ttMode = 'telegram';
  return out;
}
const clip = (s, n) => (s == null ? null : String(s).slice(0, n));
export async function socialReport(env, b) {
  const id = String(b && b.id || ''); if (!/^[0-9A-Za-z_-]{4,40}$/.test(id)) return { ok: false, error: 'bad_id' };
  const r = (b && b.results) || {}; const ig = r.instagram || {}, fb = r.facebook || {}, tt = r.tiktok || {};
  await env.DB.prepare(`INSERT INTO social_posts (id, rubric, ig_id, ig_url, ig_status, fb_id, fb_url, fb_status, tt_id, tt_status, video_bytes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
    ON CONFLICT(id) DO UPDATE SET rubric = ?2, ig_id = COALESCE(?3, ig_id), ig_url = COALESCE(?4, ig_url), ig_status = ?5, fb_id = COALESCE(?6, fb_id), fb_url = COALESCE(?7, fb_url), fb_status = ?8, tt_id = COALESCE(?9, tt_id), tt_status = ?10, video_bytes = ?11`)
    .bind(id, clip(b.rubric, 60), clip(ig.id, 40), clip(ig.url, 300), clip(ig.status || (ig.error ? 'error' : null), 40), clip(fb.id, 40), clip(fb.url, 300), clip(fb.status || (fb.error ? 'error' : null), 40),
      clip(tt.id, 80), clip(tt.status || (tt.error ? 'error' : null), 40), Number(b.bytes) || null, now()).run();
  return { ok: true, id };
}
/* people who opened the bot through the profile links: t.me/<bot>?start=ig | fb | tt (aggregates only) */
export async function socialStats(env, days) {
  days = Math.max(1, Math.min(90, Number(days) || 14)); const from = now() - days * 86400; const out = { ok: true, days, sources: {}, posts: [] };
  for (const k of ['ig', 'fb', 'tt']) {
    const row = await env.DB.prepare(`SELECT COUNT(*) AS visitors, COALESCE(SUM(h.is_new), 0) AS newp, COALESCE(SUM(CASE WHEN h.is_new = 1 AND COALESCE(r.games, 0) + COALESCE(r.hosted, 0) > 0 THEN 1 ELSE 0 END), 0) AS played
      FROM start_hits h LEFT JOIN ratings r ON r.tg_id = h.tg_id WHERE (h.param = ?1 OR substr(h.param, 1, ?2) = ?3) AND h.last_at >= ?4`).bind(k, k.length + 1, k + '_', from).first();
    out.sources[k] = { visitors: row ? row.visitors : 0, newPlayers: row ? row.newp : 0, played: row ? row.played : 0 };
  }
  out.posts = ((await env.DB.prepare('SELECT id, rubric, ig_id, ig_url, ig_status, fb_id, fb_url, fb_status, tt_status, created_at FROM social_posts WHERE created_at >= ?1 ORDER BY created_at DESC LIMIT 60').bind(from).all()).results || []);
  return out;
}

/* ---------- cron: token health, twice a day ---------- */
export async function runSocialCron(env, bot) {
  const last = Number(await cfgGet(env, 'social:check_at')) || 0; if (now() - last < 12 * 3600) return 0;
  await cfgSet(env, 'social:check_at', now());
  const notes = [];
  const meta = await account(env, 'meta');
  if (meta && meta.s) {
    const page = meta.s.pages.find(x => x.id === meta.account_id) || meta.s.pages[0];
    const d = await graph(env, page.id, { access_token: page.token, fields: 'id,name' });
    if (d.error) notes.push(`Facebook/Instagram: токен страницы не работает (${gErr(d)}). Подключите заново: /social`);
  } else if (meta) notes.push('Facebook/Instagram: токен не читается (сменился токен бота?). Подключите заново: /social');
  const tt = await account(env, 'tiktok');
  if (tt && tt.expires_at && tt.expires_at - now() < 14 * 86400) notes.push(`TikTok: доступ закончится ${new Date(tt.expires_at * 1000).toISOString().slice(0, 10)} — подключите заново: /social`);
  if (tt && tt.s) { const a = await tiktokAccess(env, 6 * 3600); if (!a.ok) notes.push('TikTok: ' + a.why); }
  if (!notes.length) return 0;
  const key = notes.join('|'); if ((await cfgGet(env, 'social:last_note')) === key && now() - last < 3 * 86400) return 0;
  await cfgSet(env, 'social:last_note', key);
  for (const adm of adminIds(env)) await bot.send(adm, '⚠️ <b>Соцсети</b>\n' + notes.map(esc).join('\n'));
  return notes.length;
}

export const socialKeyOk = async (env, given) => !!env.BOT_TOKEN && safeEqual(String(given || ''), await socialKey(env.BOT_TOKEN));
