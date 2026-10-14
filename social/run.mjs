#!/usr/bin/env node
/* The "Social" workflow's script (.github/workflows/social.yml). Daily: a Veo video from social/posts/<date>.md → Instagram Reel,
   Facebook Page Reel, TikTok → a preview to the admins in Telegram with "delete everywhere" and "pause" buttons.
     node social/run.mjs check <file...>                  validate post files (no network)
     node social/run.mjs publish <file> [--force] [--preview]   --preview: the video only to the admins in Telegram, nothing is published
     node social/run.mjs today                            publish today's file if it has not been published (the evening safety run)
     node social/run.mjs status                           what is connected and what is missing (no tokens printed)
     node social/run.mjs stats                            visits from the profile links + Instagram numbers of recent Reels
   Env: API (backend; else .mafia-api-url), BOT_TOKEN, GEMINI_API_KEY, VEO_RESOLUTION (1080p), APP_URL (pictures for the first frame),
        LOG (file for the commit comment); tests: GEMINI_BASE, TELEGRAM_API, NOW. Results: social/published/<id>.json (committed). */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parsePost, PRICE } from './lib/post.mjs';
import { veoGenerate, VeoBlocked } from './lib/veo.mjs';
import { finishVideo, firstFrame, hasFfmpeg, fontFile } from './lib/video.mjs';
import { graphClient, instagramReel, facebookReel, instagramInsights } from './lib/meta.mjs';
import { tiktokPost } from './lib/tiktok.mjs';
import { log, secret, http, binary, short } from './lib/util.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)); const root = path.resolve(here, '..');
const PUB = process.env.SOCIAL_PUB_DIR || path.join(here, 'published'); const POSTS = process.env.SOCIAL_POSTS_DIR || path.join(here, 'posts');
const LOGO = path.join(root, 'bot', 'media', 'avatar-512.png');
const SAFE = ' Keep it family-friendly: no weapons pointed at anyone, no violence, no blood, no real people or brands, no text on screen.';
const env = process.env;
const API = (env.API || (fs.existsSync(path.join(root, '.mafia-api-url')) ? fs.readFileSync(path.join(root, '.mafia-api-url'), 'utf8') : '')).trim().replace(/\/$/, '');
const TG = (env.TELEGRAM_API || 'https://api.telegram.org').replace(/\/$/, '');
const RES = env.VEO_RESOLUTION === '720p' ? '720p' : '1080p';
const kyivDate = (t = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kiev', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
const nowMs = () => (env.NOW ? Date.parse(env.NOW) : Date.now());
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const key = () => crypto.createHash('sha256').update(String(env.BOT_TOKEN) + ':mafia-pro-social').digest('hex').slice(0, 48);
if (env.BOT_TOKEN) secret(env.BOT_TOKEN); if (env.GEMINI_API_KEY) secret(env.GEMINI_API_KEY);

async function backend(p, body) {
  if (!API) return { ok: false, error: 'no backend address (.mafia-api-url)' };
  if (!env.BOT_TOKEN) return { ok: false, error: 'BOT_TOKEN is not set' };
  const r = await http(`${API}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Social-Key': key() }, body: JSON.stringify(body || {}) }, { tries: 4, wait: 10000, label: p });
  return r.json || { ok: false, error: `HTTP ${r.status} ${short(r.text, 120)}` };
}
async function creds() {
  const c = await backend('/social/creds');
  if (c.meta && c.meta.pageToken) secret(c.meta.pageToken); if (c.tiktok && c.tiktok.token) secret(c.tiktok.token);
  return c;
}
async function tgCall(method, body) { const r = await http(`${TG}/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, { tries: 2, label: 'telegram ' + method }); return r.json || {}; }
async function tgVideo(chat, bytes, caption, markup, info) {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ chat_id: chat, caption, parse_mode: 'HTML', supports_streaming: 'true', width: info.width, height: info.height, duration: Math.round(info.duration || 0), reply_markup: markup ? JSON.stringify(markup) : null })) if (v != null) fd.append(k, String(v));
  fd.append('video', new Blob([bytes], { type: 'video/mp4' }), 'mafia-pro.mp4');
  const r = await http(`${TG}/bot${env.BOT_TOKEN}/sendVideo`, { method: 'POST', body: fd }, { tries: 2, label: 'telegram sendVideo' }); return r.json || {};
}
const published = () => (fs.existsSync(PUB) ? fs.readdirSync(PUB).filter(f => f.endsWith('.json')).map(f => { try { return JSON.parse(fs.readFileSync(path.join(PUB, f), 'utf8')); } catch (e) { return null; } }).filter(Boolean) : []);

function summary(p, res, cost, preview, mode) {
  const line = (name, r) => !r ? null : r.error ? `${name}: ⚠️ ${esc(short(r.error, 160))}` : r.url ? `${name}: ✅ <a href="${esc(r.url)}">открыть</a>${r.status === 'processing' ? ' (обрабатывается)' : ''}` : `${name}: ✅ ${esc(r.status || '')}`;
  const tt = res.tiktok;
  const ttLine = !tt ? null : tt.error ? `TikTok: ⚠️ ${esc(short(tt.error, 160))} — опубликуйте вручную, текст ниже`
    : tt.status === 'telegram' ? 'TikTok: 📲 сохраните ролик и опубликуйте вручную — текст ниже' : tt.status === 'SEND_TO_USER_INBOX' ? 'TikTok: 📥 в черновиках — откройте TikTok, вставьте текст ниже и опубликуйте'
    : tt.status === 'PUBLISH_COMPLETE' ? `TikTok: ✅ опубликовано${tt.privacy && tt.privacy !== 'PUBLIC_TO_EVERYONE' ? ' (видно только вам — нужен аудит TikTok)' : ''}` : `TikTok: ⏳ ${esc(tt.status || '')}`;
  return [`🎬 <b>${preview ? 'Пробный ролик' : 'Ролик дня'}</b> · ${esc(p.date)}${p.rubric ? ' · ' + esc(p.rubric) : ''}`, ...(preview ? ['Нигде не опубликован — только для просмотра.'] : [line('Instagram', res.instagram), line('Facebook', res.facebook), ttLine].filter(Boolean)),
    `<i>Veo 3.1 ${esc(p.modelKey)} · ${RES} · ≈ $${cost.toFixed(2)}</i>`].join('\n').slice(0, 1000);
}

async function publish(file, { force = false, preview = false } = {}) {
  const p = parsePost(file);
  for (const w of p.warnings || []) log(`::warning::${file}: ${w}`);
  if (p.errors.length) { for (const e of p.errors) log(`::error::${file}: ${e}`); return 1; }
  log(`## ${p.id} · ${p.rubric || '—'} · hook ${p.hook || '—'} · ${p.modelKey} ${RES}${preview ? ' · PREVIEW' : ''}`);
  const out = path.join(PUB, p.id + '.json'); const today = kyivDate(nowMs()); const yesterday = kyivDate(nowMs() - 86400000);
  if (!preview && !force) {
    if (fs.existsSync(out)) { log('already published — skipped (force: true to post again)'); return 0; }
    if (p.date !== today && p.date !== yesterday) { log(`date ${p.date} is not today (${today}) — skipped; the evening run publishes it on its day`); return 0; }
    const same = published().find(x => x.date === p.date && x.id !== p.id); if (same) { log(`one video a day: ${same.id} is already out for ${p.date} — skipped`); return 0; }
  }
  const c = await creds();
  if (!c.ok) { log(`::error::backend: ${c.error || 'no answer'}`); return 1; }
  for (const x of c.problems || []) log(`::warning::${x}`);
  if (c.locked) { log('security lockdown is on — nothing is published'); return 0; }
  if (c.paused && !force && !preview) { log('paused in the bot (/social) — nothing generated'); return 0; }
  const ig = c.meta && c.meta.igId ? c.meta : null; const fb = c.meta || null; const ttMode = c.tiktok ? c.ttMode : 'telegram';
  if (!preview && !c.meta && !c.tiktok) { log('no account is connected yet (/social in the bot) — no video generated, nothing spent'); return 0; }
  if (!env.GEMINI_API_KEY) { log('::error::GEMINI_API_KEY is not set (GitHub → Settings → Secrets and variables → Actions)'); return 1; }
  if (!hasFfmpeg()) { log('::error::ffmpeg is missing'); return 1; }
  let image = null;
  if (p.image) {
    const base = (env.APP_URL || 'https://mafiapro.app/').replace(/\/?$/, '/');
    try { image = firstFrame(await binary(base + p.image)); log(`  first frame: ${p.image}`); } catch (e) { log(`::warning::first frame ${p.image}: ${e.message} — text only`); }
  }
  let raw = null, tries = 0; const cost1 = (PRICE[p.modelKey] || PRICE.fast)[RES] * 8;
  for (const prompt of [p.prompt, p.prompt + SAFE]) {
    tries++;
    try { raw = await veoGenerate({ apiKey: env.GEMINI_API_KEY, base: env.GEMINI_BASE, model: p.model, prompt, image, resolution: RES, pollMs: Number(env.POLL_MS) || 10000 }); break; }
    catch (e) { if (e instanceof VeoBlocked && tries === 1) { log(`  ${e.message} — retrying with a softer prompt (a blocked video is not charged)`); continue; } log(`::error::${e.message}`);
      for (const a of c.admins || []) await tgCall('sendMessage', { chat_id: a, parse_mode: 'HTML', text: `⚠️ <b>Ролик ${esc(p.id)} не создан</b>\n${esc(short(e.message, 400))}\n\nПоправьте social/posts/${esc(p.id)}.md или ничего не делайте — завтра будет новый.` });
      return 1; }
  }
  const fin = finishVideo(raw, { logo: LOGO });
  log(`  video: ${fin.info.width}×${fin.info.height}, ${fin.info.duration.toFixed(1)} s, ${(fin.bytes.length / 1e6).toFixed(1)} MB, sound ${fin.info.audio ? 'yes' : 'no'}${fin.font ? '' : ', end card without text (no font)'}`);
  const res = {}; const poll = Number(env.POLL_MS) || undefined;
  if (!preview) {
    const g = c.meta ? graphClient({ base: env.META_GRAPH_BASE, version: c.graph, token: c.meta.pageToken }) : null;
    if (ig) { try { res.instagram = await instagramReel({ g, igId: ig.igId, bytes: fin.bytes, caption: p.caption, version: c.graph, pollMs: poll }); log(`  instagram: ✅ ${res.instagram.url || res.instagram.id}`); } catch (e) { res.instagram = { error: e.message }; log(`::warning::instagram: ${e.message}`); } }
    else if (c.meta) log('::warning::instagram: no professional Instagram account is linked to the Page');
    if (fb) { try { res.facebook = await facebookReel({ g, pageId: fb.pageId, bytes: fin.bytes, description: p.caption, version: c.graph, pollMs: poll }); log(`  facebook: ✅ ${res.facebook.url} (${res.facebook.status})`); } catch (e) { res.facebook = { error: e.message }; log(`::warning::facebook: ${e.message}`); } }
    if (ttMode === 'inbox' || ttMode === 'direct') { try { res.tiktok = await tiktokPost({ api: env.TIKTOK_API, token: c.tiktok.token, bytes: fin.bytes, caption: p.caption, mode: ttMode, pollMs: poll }); log(`  tiktok (${ttMode}): ✅ ${res.tiktok.status}`); } catch (e) { res.tiktok = { error: e.message }; log(`::warning::tiktok: ${e.message}`); } }
    else res.tiktok = { status: 'telegram' };
  }
  const cost = cost1 * tries; // a blocked try is not charged, so this is an upper bound
  if (!preview) {
    fs.mkdirSync(PUB, { recursive: true });
    fs.writeFileSync(out, JSON.stringify({ id: p.id, date: p.date, rubric: p.rubric, hook: p.hook, model: p.model, resolution: RES, image: p.image || null, costUsd: Number(cost1.toFixed(2)),
      seconds: Number(fin.info.duration.toFixed(1)), bytes: fin.bytes.length, at: new Date(nowMs()).toISOString(), results: res }, null, 2) + '\n');
    const rep = await backend('/social/report', { id: p.id, rubric: p.rubric, bytes: fin.bytes.length, results: res }); if (!rep.ok) log(`::warning::report: ${rep.error || 'no answer'}`);
  }
  const markup = preview ? null : { inline_keyboard: [[{ text: '🗑 Удалить везде', callback_data: `sm_del_${p.id}` }, { text: '⏸ Пауза', callback_data: 'sm_pause' }]] };
  const cap = summary(p, res, cost1, preview, ttMode); let sent = 0;
  for (const a of c.admins || []) {
    const r = await tgVideo(a, fin.bytes, cap, markup, fin.info); if (r.ok) sent++; else log(`::warning::telegram video to ${a}: ${short(r.description || r, 120)}`);
    if (preview || (res.tiktok && res.tiktok.status !== 'PUBLISH_COMPLETE')) await tgCall('sendMessage', { chat_id: a, parse_mode: 'HTML', text: `📋 Текст для TikTok (нажмите, чтобы скопировать):\n<pre>${esc(p.caption)}</pre>` });
  }
  log(`  telegram: video sent to ${sent} admin(s)`);
  const tried = ['instagram', 'facebook', 'tiktok'].filter(k => res[k] && res[k].status !== 'telegram');
  const okCount = tried.filter(k => !res[k].error).length;
  log(`result: ${preview ? 'preview' : `${okCount} of ${tried.length} platforms`} · ≈ $${cost1.toFixed(2)}`);
  return preview || !tried.length || okCount ? 0 : 1;
}

async function status() {
  log('## status');
  log(`gemini key: ${env.GEMINI_API_KEY ? 'set' : 'MISSING — add GEMINI_API_KEY (Google AI Studio key with billing) to GitHub secrets'}`);
  log(`ffmpeg: ${hasFfmpeg() ? 'ok' : 'missing'} · font for the end card: ${fontFile() ? 'ok' : 'missing'}`);
  const c = await creds();
  if (!c.ok) { log(`backend: ${c.error || 'no answer'}`); return 1; }
  log(`backend: ok${c.locked ? ' · LOCKDOWN (nothing is published)' : ''}${c.paused ? ' · PAUSED in the bot' : ''}`);
  if (c.apps) log(`app keys in the backend: Meta ${c.apps.meta ? 'yes' : 'NO (secrets META_APP_ID, META_APP_SECRET → run "Deploy backend")'} · TikTok ${c.apps.tiktok ? 'yes' : 'NO (secrets TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET → run "Deploy backend")'}`);
  log(`facebook: ${c.meta ? `page "${c.meta.pageName}" (${c.meta.pageId})` : 'not connected (/social in the bot)'}`);
  log(`instagram: ${c.meta ? (c.meta.igId ? '@' + (c.meta.igUsername || c.meta.igId) : 'no professional account linked to the Page') : 'not connected'}`);
  log(`tiktok: ${c.tiktok ? `connected (${c.tiktok.name || 'account'}), scope ${c.tiktok.scope}` : 'not connected'} · mode ${c.ttMode}`);
  for (const x of c.problems || []) log(`problem: ${x}`);
  const pub = published().sort((a, b) => (a.id < b.id ? 1 : -1));
  log(`published: ${pub.length}${pub[0] ? `, last ${pub[0].id} (${pub[0].rubric || '—'})` : ''}`);
  const ready = !!env.GEMINI_API_KEY && !!(c.meta || c.tiktok) && !c.locked && !c.paused;
  log(`ready: ${ready ? 'yes' : 'no'}`);
  return 0;
}

async function stats() {
  log('## stats');
  const s = await backend('/social/stats', { days: 14 });
  if (s.ok) { log('profile links (14 days): source · opened the bot · of them new · new who played'); for (const [k, v] of Object.entries(s.sources)) log(`  ${k} · ${v.visitors} · ${v.newPlayers} · ${v.played}`); }
  else log(`backend stats: ${s.error || 'no answer'}`);
  const pub = published().sort((a, b) => (a.id < b.id ? 1 : -1)).slice(0, 14);
  const c = await creds(); const g = c.ok && c.meta ? graphClient({ base: env.META_GRAPH_BASE, version: c.graph, token: c.meta.pageToken }) : null;
  const ids = pub.map(x => x.results && x.results.instagram && x.results.instagram.id).filter(Boolean);
  const ins = g && ids.length ? await instagramInsights({ g, ids }) : {};
  log('recent videos: id · rubric · hook · IG views / reach / likes / comments / shares / saves · FB · TikTok');
  for (const x of pub) {
    const r = x.results || {}; const i = r.instagram && r.instagram.id ? ins[r.instagram.id] || {} : null;
    log(`  ${x.id} · ${x.rubric || '—'} · ${x.hook || '—'} · ${i ? [i.views, i.reach, i.likes, i.comments, i.shares, i.saved].map(v => (v == null ? '?' : v)).join(' / ') : (r.instagram && r.instagram.error ? 'error' : '—')} · ${r.facebook ? (r.facebook.error ? 'error' : 'ok') : '—'} · ${r.tiktok ? r.tiktok.status || 'error' : '—'}`);
  }
  if (!pub.length) log('  (nothing published yet)');
  return 0;
}

const [cmd, ...rest] = process.argv.slice(2); const flags = new Set(rest.filter(a => a.startsWith('--'))); const files = rest.filter(a => !a.startsWith('--'));
let code = 0;
try {
  if (cmd === 'check') { for (const f of files) { const p = parsePost(f); for (const w of p.warnings) log(`::warning::${f}: ${w}`); for (const e of p.errors) log(`::error::${f}: ${e}`); if (p.errors.length) code = 1; else log(`${f}: ok (${p.caption.length} characters, ${p.tags.length} tags)`); } }
  else if (cmd === 'publish') { for (const f of files) code = Math.max(code, await publish(f, { force: flags.has('--force'), preview: flags.has('--preview') })); }
  else if (cmd === 'today') { const f = path.join(POSTS, kyivDate(nowMs()) + '.md'); if (fs.existsSync(f)) code = await publish(f); else log(`no post for today (${path.relative(root, f)})`); }
  else if (cmd === 'status') code = await status();
  else if (cmd === 'stats') code = await stats();
  else { console.log('usage: node social/run.mjs check|publish|today|status|stats …'); code = 2; }
} catch (e) { log(`::error::${e && e.stack || e}`); code = 1; }
process.exit(code);
