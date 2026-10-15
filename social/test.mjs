/* Tests of the Social workflow script against local fakes of Gemini (Veo), the backend, graph.facebook.com + rupload, TikTok and Telegram.
   Run: node social/test.mjs   (needs ffmpeg) */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parsePost, buildCaption } from './lib/post.mjs';
import { chunking } from './lib/tiktok.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'social-test-'));
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('  FAIL', m); } };

// a fake Veo clip: 8 s, 1080×1920, with sound
const clip = path.join(tmp, 'veo.mp4');
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=720x1280:r=24:d=8', '-f', 'lavfi', '-i', 'sine=f=330:d=8:r=48000', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', clip]);
const CLIP = fs.readFileSync(clip); const PNG = fs.readFileSync(path.join(here, '..', 'bot', 'media', 'avatar-512.png'));
const wavFile = path.join(tmp, 'voice.wav'); execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=f=600:d=5:r=24000', '-ac', '1', '-c:a', 'pcm_s16le', wavFile]); const WAV = fs.readFileSync(wavFile);
const cardFile = path.join(tmp, 'card.png'); execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=0x223355:s=510x765', '-frames:v', '1', cardFile]); const CARDPNG = fs.readFileSync(cardFile);

const S = { calls: [], creds: null, block: false, igParamError: false, igUploadFail: false, polls: {}, reports: [], ttPrivacy: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'] };
const server = http.createServer((req, res) => {
  const parts = []; req.on('data', c => parts.push(c));
  req.on('end', async () => {
    const buf = Buffer.concat(parts); const u = new URL(req.url, 'http://x'); const p = u.pathname; const ct = req.headers['content-type'] || '';
    let body = null; if (/json/.test(ct)) { try { body = JSON.parse(buf.toString('utf8')); } catch (e) {} } else if (/urlencoded/.test(ct)) body = Object.fromEntries(new URLSearchParams(buf.toString('utf8')));
    else if (/multipart/.test(ct)) { const fd = await new Response(buf, { headers: { 'content-type': ct } }).formData(); body = {}; for (const [k, v] of fd.entries()) body[k] = typeof v === 'string' ? v : { size: v.size, type: v.type }; }
    const q = Object.fromEntries(u.searchParams);
    S.calls.push({ m: req.method, p, q, body, h: req.headers, size: buf.length });
    const send = (code, o, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type }); res.end(type === 'application/json' ? JSON.stringify(o) : o); };
    // Gemini
    let m;
    if ((m = /^\/v1beta\/models\/([\w.-]+):predictLongRunning$/.exec(p))) { if (req.headers['x-goog-api-key'] !== 'gem-key') return send(403, { error: { message: 'API key not valid' } });
      const inst = body.instances[0]; const firstPic = inst.image || (inst.referenceImages && inst.referenceImages[0].image); if (S.picInline && firstPic && firstPic.bytesBase64Encoded) return send(400, { error: { message: '`bytesBase64Encoded` isn\'t supported by this model.' } }); const op = 'operations/op' + S.calls.length; S.polls[op] = { n: 0, prompt: body.instances[0].prompt }; return send(200, { name: op }); }
    if ((m = /^\/v1beta\/(operations\/op\d+)$/.exec(p))) { const o = S.polls[m[1]]; o.n++; if (o.n < 2) return send(200, { name: m[1], done: false });
      if (S.block && !/family-friendly/.test(o.prompt)) return send(200, { name: m[1], done: true, response: { generateVideoResponse: { raiMediaFilteredCount: 1, raiMediaFilteredReasons: ['Unsafe content'] } } });
      return send(200, { name: m[1], done: true, response: { generateVideoResponse: { generatedSamples: [{ video: { uri: `${base}/v1beta/files/vid:download?alt=media` } }] } } }); }
    if (p === '/v1beta/files/vid:download') { res.writeHead(200, { 'Content-Type': 'video/mp4' }); return res.end(CLIP); }
    if (p === '/cards/uk/sheriff.png') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(PNG); }
    if (/^\/cards\/uk\/(don|doctor|maniac)\.png$/.test(p)) { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(CARDPNG); }
    if (p === '/v1beta/interactions') { if (req.headers['x-goog-api-key'] !== 'gem-key') return send(403, { error: { message: 'API key not valid' } }); S.tts = body; if (S.ttsFail) return send(500, { error: { message: 'tts down' } });
      return send(200, { id: 'i1', steps: [{ type: 'model_output', content: [{ type: 'audio', data: WAV.toString('base64') }] }] }); }
    // backend
    if (p.startsWith('/social/')) { if (req.headers['x-social-key'] !== KEY) return send(403, { ok: false, error: 'forbidden' });
      if (p === '/social/creds') return send(200, S.creds);
      if (p === '/social/report') { S.reports.push(body); return send(200, { ok: true, id: body.id }); }
      if (p === '/social/stats') return send(200, { ok: true, days: 14, sources: { ig: { visitors: 5, newPlayers: 3, played: 1 }, fb: { visitors: 1, newPlayers: 0, played: 0 }, tt: { visitors: 2, newPlayers: 2, played: 1 } }, posts: [] }); }
    // Graph + rupload
    if (p === '/v25.0/1784/media') { if (S.igParamError && body.is_ai_generated) return send(400, { error: { message: '(#100) Invalid parameter is_ai_generated', code: 100 } }); return send(200, { id: 'c1', uri: `${base}/ig-api-upload/v25.0/c1` }); }
    if (p === '/ig-api-upload/v25.0/c1' || p === '/video-upload/v25.0/v77') { const good = req.headers.authorization === 'OAuth page-token-1001' && req.headers.offset === '0' && Number(req.headers.file_size) === buf.length && buf.length > 10000;
      if (S.igUploadFail && p.startsWith('/ig')) return send(400, { debug_info: { retriable: false, type: 'ProcessingFailedError', message: 'Request processing failed' } }); return send(good ? 200 : 400, good ? { success: true, message: 'Upload successful.' } : { debug_info: { message: 'bad headers' } }); }
    if (p === '/v25.0/c1') { S.igPoll = (S.igPoll || 0) + 1; return send(200, { status_code: S.igPoll < 2 ? 'IN_PROGRESS' : 'FINISHED', id: 'c1' }); }
    if (p === '/v25.0/1784/media_publish') return send(200, { id: 'm1' });
    if (p === '/v25.0/m1' && q.fields === 'permalink') return send(200, { permalink: 'https://www.instagram.com/reel/ABC/' });
    if (p === '/v25.0/m1') return send(200, { like_count: 12, comments_count: 3 });
    if (p === '/v25.0/m1/insights') return send(200, { data: [{ name: 'views', values: [{ value: 640 }] }, { name: 'reach', values: [{ value: 510 }] }, { name: 'shares', values: [{ value: 4 }] }, { name: 'saved', values: [{ value: 7 }] }] });
    if (p === '/v25.0/1001/video_reels') { if (body.upload_phase === 'start') return send(200, { video_id: 'v77', upload_url: `${base}/video-upload/v25.0/v77` }); if (body.upload_phase === 'finish') return send(200, { success: true }); }
    if (p === '/v25.0/v77') return send(200, { id: 'v77', permalink_url: '/reel/v77', status: { video_status: 'ready', publishing_phase: { status: 'complete' } } });
    // TikTok
    if (p.startsWith('/v2/post/publish/')) { if (req.headers.authorization !== 'Bearer tt-access-1') return send(401, { error: { code: 'access_token_invalid', message: 'bad token' } });
      if (p.endsWith('/creator_info/query/')) return send(200, { data: { privacy_level_options: S.ttPrivacy, creator_nickname: 'mafiapro' }, error: { code: 'ok' } });
      if (p.endsWith('/inbox/video/init/') || p.endsWith('/video/init/')) { S.ttInit = { path: p, body }; return send(200, { data: { publish_id: 'v_pub_1', upload_url: `${base}/tt-upload/1` }, error: { code: 'ok' } }); }
      if (p.endsWith('/status/fetch/')) return send(200, { data: { status: S.ttInit.path.includes('inbox') ? 'SEND_TO_USER_INBOX' : 'PUBLISH_COMPLETE', publicaly_available_post_id: S.ttInit.path.includes('inbox') ? [] : [7311] }, error: { code: 'ok' } }); }
    if (p === '/tt-upload/1') { const range = req.headers['content-range']; return send(range === `bytes 0-${buf.length - 1}/${buf.length}` && req.headers['content-type'] === 'video/mp4' ? 201 : 400, {}); }
    // Telegram
    if ((m = /^\/bot([^/]+)\/(\w+)$/.exec(p))) { if (m[1] !== 'tg-token') return send(401, { ok: false }); return send(200, { ok: true, result: { message_id: S.calls.length } }); }
    send(404, { error: { message: 'mock: no route ' + p } });
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
const KEY = (await import('node:crypto')).createHash('sha256').update('tg-token:mafia-pro-social').digest('hex').slice(0, 48);

const posts = path.join(tmp, 'posts'), pub = path.join(tmp, 'published'); fs.mkdirSync(posts); const LOG = path.join(tmp, 'log.txt');
const write = (name, body) => { const f = path.join(posts, name); fs.writeFileSync(f, body); return f; };
const GOOD = (date, extra = '') => `---\ndate: ${date}\nrubric: Роль дня\nhook: питання\ntitle: Шериф не спить\nvoice: Шериф не спить. Одна перевірка за ніч — і хтось за столом уже нервує.\n${extra}---\n## prompt\nVertical cinematic shot: a sheriff's star badge lies on a dark wooden card table lit by a single candle, slow push-in, smoke drifting, quiet jazz piano and a ticking clock.\n\n## uk\nШериф не спить. Кого б ти перевірив цієї ночі? Грай у Telegram — посилання в профілі.\n\n## en\nThe sheriff never sleeps. Who would you check tonight? Play in Telegram — link in bio.\n\n## tags\n#мафія #mafia #boardgames #telegram #настільніігри\n`;
const run = (args, extra = {}) => new Promise(resolve => { fs.writeFileSync(LOG, ''); let out = '';
  const ch = spawn(process.execPath, [path.join(here, 'run.mjs'), ...args], { env: Object.assign({}, process.env, { API: base, BOT_TOKEN: 'tg-token', GEMINI_API_KEY: 'gem-key', GEMINI_BASE: base + '/v1beta', META_GRAPH_BASE: base, TIKTOK_API: base, TELEGRAM_API: base, APP_URL: base + '/', NOW: '2026-10-15T16:00:00Z', SOCIAL_PUB_DIR: pub, SOCIAL_POSTS_DIR: posts, LOG, POLL_MS: '20', FFMPEG_PRESET: 'ultrafast', GITHUB_ACTIONS: '' }, extra) });
  ch.stdout.on('data', d => { out += d; }); ch.stderr.on('data', d => { out += d; });
  const timer = setTimeout(() => ch.kill('SIGKILL'), 240000);
  ch.on('close', code => { clearTimeout(timer); resolve({ code, out, log: fs.readFileSync(LOG, 'utf8') }); }); });
const calls = (re, m) => S.calls.filter(c => re.test(c.p) && (!m || c.m === m));
const reset = () => { S.calls = []; S.igPoll = 0; S.ttInit = null; };
const CREDS = (o = {}) => Object.assign({ ok: true, locked: false, paused: false, admins: [777], graph: 'v25.0', meta: { pageId: '1001', pageName: 'Mafia Pro', pageToken: 'page-token-1001', igId: '1784', igUsername: 'mafiapro.app' }, tiktok: { token: 'tt-access-1', openId: 'o1', scope: 'user.info.basic,video.upload', name: 'Mafia Pro' }, ttMode: 'inbox', problems: [] }, o);

console.log('post files');
{ const f = write('2026-10-15.md', GOOD('2026-10-15')); const p = parsePost(f);
  ok(!p.errors.length && p.tags.length === 5 && p.id === '2026-10-15', 'valid post'); ok(p.caption.startsWith('🇺🇦 Шериф') && p.caption.includes('\n\n🇬🇧 The sheriff') && p.caption.endsWith('AI-generated video'), 'caption: uk, en, tags, AI line');
  ok(p.model === 'veo-3.1-fast-generate-preview', 'Veo 3.1 Fast by default');
  const bad = write('bad.md', GOOD('2026-10-15').replace('#telegram', '#telegram #one #two').replace(/## en[\s\S]*?## tags/, '## en\n\n## tags').replace('Кого б ти перевірив', '<b>Кого</b> б ти перевірив'));
  const b = parsePost(bad); ok(b.errors.some(e => /Instagram allows 5/.test(e)) && b.errors.some(e => /en caption/.test(e)) && b.errors.some(e => /plain text/.test(e)), 'too many tags, missing en, HTML → errors');
  ok(parsePost(write('cyr.md', GOOD('2026-10-15').replace('Vertical cinematic shot', 'Вертикальний кадр'))).errors.some(w => /must be English/.test(w)), 'Cyrillic prompt → error');
  ok(p.subtitles.length === 2 && p.subtitles[0] === 'Шериф не спить.' && p.title === 'Шериф не спить', 'voice split into subtitles, title read');
  { const q = parsePost(write('q.md', GOOD('2026-10-15', 'refs: sheriff, don, doctor, maniac\n').replace('voice: Шериф не спить. Одна перевірка за ніч — і хтось за столом уже нервує.', 'voice: The sheriff never sleeps').replace('title: Шериф не спить', 'title: Sheriff')));
    ok(q.errors.some(e => /3 at most/.test(e)) && q.errors.some(e => /voice: must be Ukrainian/.test(e)) && q.errors.some(e => /title: must be Ukrainian/.test(e)), 'too many refs, English voice and title → errors'); fs.unlinkSync(path.join(posts, 'q.md')); }
  { const q = parsePost(write('q2.md', GOOD('2026-10-15').replace(/voice: .*\n/, ''))); ok(q.errors.some(e => /voice: is missing/.test(e)), 'voice is required'); fs.unlinkSync(path.join(posts, 'q2.md')); }
  { const q = parsePost(write('q3-test.md', GOOD('2026-10-15', 'refs: sheriff\nimage: og/uk.png\n').replace(/voice: .*\n/, 'voice: none\n'))); ok(!q.errors.length && q.voice === '' && q.refs[0] === 'sheriff' && q.warnings.some(w => /image is ignored/.test(w)), 'voice: none, refs with image → warning'); fs.unlinkSync(path.join(posts, 'q3-test.md')); }
  ok((await run(['check', bad])).code === 1 && (await run(['check', f])).code === 0, 'check: exit codes');
  fs.unlinkSync(bad); fs.unlinkSync(path.join(posts, 'cyr.md'));
  ok(chunking(8e6).count === 1 && chunking(8e6).chunk === 8e6 && chunking(200 * 1024 * 1024).count === 20, 'TikTok chunks'); }

console.log('nothing connected → no video, nothing spent');
{ reset(); S.creds = CREDS({ meta: null, tiktok: null, ttMode: 'telegram' }); const r = await run(['publish', path.join(posts, '2026-10-15.md')]);
  ok(r.code === 0 && /no account is connected/.test(r.log) && !calls(/predictLongRunning/).length, 'skipped before Veo'); }

console.log('full run: Veo → end card → Instagram, Facebook, TikTok drafts → Telegram → report');
{ reset(); S.creds = CREDS(); const r = await run(['publish', path.join(posts, '2026-10-15.md')]);
  ok(r.code === 0, 'exit 0'); if (r.code) console.log(r.out.slice(-2500));
  const v = calls(/predictLongRunning/)[0]; ok(v && /veo-3\.1-fast-generate-preview/.test(v.p) && v.body.parameters.aspectRatio === '9:16' && v.body.parameters.resolution === '1080p' && /sheriff's star/.test(v.body.instances[0].prompt), 'Veo: fast, 9:16, 1080p, the prompt');
  ok(/No spoken words/.test(v.body.instances[0].prompt), 'voice-over planned → Veo asked for no speech');
  ok(S.tts && S.tts.model === 'gemini-3.8-flash-tts' && S.tts.input[0].content[0].text === 'Шериф не спить. Одна перевірка за ніч — і хтось за столом уже нервує.' && S.tts.generation_config.speech_config[0].voice === 'Orus' && S.tts.response_format.mime_type === 'audio/wav', 'TTS: Ukrainian text, narrator voice, wav');
  ok(/voice 5 s/.test(r.log) && /title "Шериф не спить"/.test(r.log), 'voice mixed, title drawn');
  const c = calls(/\/1784\/media$/)[0]; ok(c && c.body.media_type === 'REELS' && c.body.upload_type === 'resumable' && c.body.is_ai_generated === 'true' && c.body.caption.includes('🇬🇧') && c.body.access_token === 'page-token-1001', 'Instagram container: Reel, resumable, AI label, caption');
  ok(calls(/ig-api-upload/).length === 1 && calls(/media_publish/).length === 1, 'Instagram: upload + publish');
  const fs1 = calls(/1001\/video_reels/); ok(fs1.length === 2 && fs1[1].body.video_state === 'PUBLISHED' && fs1[1].body.description.includes('🇺🇦'), 'Facebook Reel: start, finish published');
  ok(S.ttInit && S.ttInit.path.endsWith('/inbox/video/init/') && S.ttInit.body.source_info.source === 'FILE_UPLOAD' && S.ttInit.body.source_info.total_chunk_count === 1, 'TikTok: drafts, one chunk');
  const up = calls(/tt-upload/)[0]; ok(up && up.m === 'PUT' && up.size > 100000, 'TikTok: bytes uploaded');
  const tv = calls(/sendVideo/)[0]; ok(tv && tv.body.chat_id === '777' && /reel\/ABC/.test(tv.body.caption) && /reel\/v77/.test(tv.body.caption) && /в черновиках/.test(tv.body.caption) && JSON.parse(tv.body.reply_markup).inline_keyboard[0][0].callback_data === 'sm_del_2026-10-15', 'Telegram: video with links and the delete button');
  ok(Number(tv.body.duration) === 10 && tv.body.width === '1080' && tv.body.height === '1920', 'final video 1080×1920, 8 s + end card');
  ok(calls(/sendMessage/).some(x => /<pre>🇺🇦 Шериф/.test(x.body.text)), 'TikTok caption sent to copy');
  const rep = S.reports.pop(); ok(rep && rep.id === '2026-10-15' && rep.results.instagram.id === 'm1' && rep.results.facebook.id === 'v77' && rep.results.tiktok.status === 'SEND_TO_USER_INBOX', 'report to the backend');
  const j = JSON.parse(fs.readFileSync(path.join(pub, '2026-10-15.json'), 'utf8')); ok(j.results.instagram.url === 'https://www.instagram.com/reel/ABC/' && j.costUsd === 0.98 && j.seconds > 10 && j.voice.seconds === 5 && j.title === 'Шериф не спить', 'published/<id>.json: links, cost, length, voice, title');
  ok(!/page-token|tt-access|gem-key|tg-token/.test(r.log + r.out), 'no secrets in the log'); }

console.log('the same post twice, another post the same day, a date that is not today');
{ reset(); let r = await run(['publish', path.join(posts, '2026-10-15.md')]); ok(r.code === 0 && /already published/.test(r.log) && !calls(/predictLongRunning/).length, 'already published → skipped');
  write('2026-10-15-b.md', GOOD('2026-10-15')); r = await run(['publish', path.join(posts, '2026-10-15-b.md')]); ok(/one video a day/.test(r.log) && !calls(/predictLongRunning/).length, 'one video a day');
  write('2026-10-20.md', GOOD('2026-10-20')); r = await run(['publish', path.join(posts, '2026-10-20.md')]); ok(/not today/.test(r.log) && !calls(/predictLongRunning/).length, 'future date → waits'); }

console.log('pause, lockdown, Veo safety block, Instagram refuses a field, upload failure, TikTok direct before audit, preview');
{ reset(); S.creds = CREDS({ paused: true }); let r = await run(['publish', '--force', path.join(posts, '2026-10-20.md')]);
  ok(calls(/predictLongRunning/).length === 1, 'force runs even when paused (manual run)');
  reset(); r = await run(['publish', path.join(posts, '2026-10-15-b.md')]); ok(/one video a day/.test(r.log), 'still one a day');
  fs.rmSync(path.join(pub, '2026-10-20.json'), { force: true });
  reset(); S.creds = CREDS({ paused: true }); r = await run(['publish', path.join(posts, '2026-10-15-b.md'), '--preview']); ok(calls(/predictLongRunning/).length === 1 && calls(/sendVideo/).length === 1 && !calls(/1784\/media/).length && !fs.existsSync(path.join(pub, '2026-10-15-b.json')), 'preview: Veo + Telegram only');
  ok(/Пробный ролик/.test(calls(/sendVideo/)[0].body.caption) && !calls(/sendVideo/)[0].body.reply_markup, 'preview caption, no delete button');
  reset(); S.creds = CREDS({ locked: true, meta: null, tiktok: null }); r = await run(['publish', '--force', path.join(posts, '2026-10-15-b.md')]); ok(/lockdown/.test(r.log) && !calls(/predictLongRunning/).length, 'lockdown → nothing');
  fs.rmSync(path.join(pub, '2026-10-15.json'));
  reset(); S.creds = CREDS({ ttMode: 'direct' }); S.block = true; S.igParamError = true; S.ttPrivacy = ['SELF_ONLY', 'MUTUAL_FOLLOW_FRIENDS'];
  r = await run(['publish', path.join(posts, '2026-10-15.md')]);
  const prompts = calls(/predictLongRunning/).map(x => x.body.instances[0].prompt); ok(prompts.length === 2 && !/family-friendly/.test(prompts[0]) && /family-friendly/.test(prompts[1]), 'blocked by Veo → one retry with a softer prompt');
  const ig = calls(/\/1784\/media$/); ok(ig.length === 2 && !ig[1].body.is_ai_generated && /without optional fields/.test(r.log), 'Instagram refused a field → retried without it');
  ok(S.ttInit.path === '/v2/post/publish/video/init/' && S.ttInit.body.post_info.privacy_level === 'SELF_ONLY' && S.ttInit.body.post_info.is_aigc === true && S.ttInit.body.post_info.brand_organic_toggle === true, 'TikTok direct: only allowed privacy, AI label, own-brand disclosure');
  ok(/нужен аудит TikTok/.test(calls(/sendVideo/)[0].body.caption), 'admin told the post is private until the audit');
  S.block = false; S.igParamError = false; S.ttPrivacy = ['PUBLIC_TO_EVERYONE', 'SELF_ONLY']; fs.rmSync(path.join(pub, '2026-10-15.json'));
  reset(); S.creds = CREDS({ tiktok: null, ttMode: 'telegram' }); S.igUploadFail = true; r = await run(['publish', path.join(posts, '2026-10-15.md')]);
  ok(r.code === 0 && /instagram: upload/.test(r.log) && /Instagram: ⚠️/.test(calls(/sendVideo/)[0].body.caption) && /Facebook: ✅/.test(calls(/sendVideo/)[0].body.caption), 'Instagram fails, Facebook still posted');
  ok(/вручную/.test(calls(/sendVideo/)[0].body.caption) && !S.ttInit, 'TikTok not connected → posted by hand from Telegram');
  S.igUploadFail = true; fs.rmSync(path.join(pub, '2026-10-15.json')); reset(); S.creds = CREDS({ meta: Object.assign(CREDS().meta, { pageId: 'nope' }), tiktok: null, ttMode: 'telegram' });
  r = await run(['publish', path.join(posts, '2026-10-15.md')]); ok(r.code === 1, 'every platform failed → exit 1'); S.igUploadFail = false; }

console.log('first frame from a picture on the site; our characters as reference images; voice-over failure');
{ fs.rmSync(path.join(pub, '2026-10-15.json'), { force: true }); write('2026-10-15.md', GOOD('2026-10-15', 'image: cards/uk/sheriff.png\n')); reset(); S.creds = CREDS();
  let r = await run(['publish', path.join(posts, '2026-10-15.md')]); let v = calls(/predictLongRunning/)[0];
  ok(v && v.body.instances[0].image && v.body.instances[0].image.mimeType === 'image/png' && v.body.instances[0].image.bytesBase64Encoded.length > 1000 && v.body.parameters.personGeneration === 'allow_adult' && r.code === 0, 'image-to-video: first frame + allow_adult');
  fs.rmSync(path.join(pub, '2026-10-15.json'), { force: true }); write('2026-10-15.md', GOOD('2026-10-15', 'refs: don, doctor\n')); reset(); S.ttsFail = true;
  r = await run(['publish', path.join(posts, '2026-10-15.md')]); v = calls(/predictLongRunning/)[0];
  const refs = v && v.body.instances[0].referenceImages;
  ok(refs && refs.length === 2 && refs.every(x => x.referenceType === 'asset' && x.image.mimeType === 'image/png' && x.image.bytesBase64Encoded.length > 1000) && !v.body.instances[0].image && v.body.parameters.durationSeconds === 8 && v.body.parameters.personGeneration === 'allow_adult', 'our characters: card art as reference images, 8 s, allow_adult');
  ok(calls(/\/cards\/uk\/(don|doctor)\.png/).length === 2 && /references: don, doctor/.test(r.log), 'card pictures fetched from the site');
  ok(r.code === 0 && /voice-over: TTS/.test(r.log) && /no voice/.test(r.log) && calls(/sendVideo/).length === 1, 'TTS down → video still made and published, without the voice'); S.ttsFail = false;
  fs.rmSync(path.join(pub, '2026-10-15.json'), { force: true }); reset(); S.picInline = true; r = await run(['publish', path.join(posts, '2026-10-15.md')]);
  const vs = calls(/predictLongRunning/); ok(vs.length === 2 && vs[1].body.instances[0].referenceImages[0].image.inlineData && r.code === 0 && /retrying with inlineData/.test(r.log), 'picture format refused → retried with inlineData'); S.picInline = false; }

console.log('status and stats (no tokens printed)');
{ reset(); S.creds = CREDS(); let r = await run(['status']); ok(r.code === 0 && /facebook: page "Mafia Pro"/.test(r.log) && /instagram: @mafiapro\.app/.test(r.log) && /tiktok: connected/.test(r.log) && /ready: yes/.test(r.log) && !/page-token|tt-access/.test(r.log + r.out), 'status');
  r = await run(['status'], { GEMINI_API_KEY: '' }); ok(/gemini key: MISSING/.test(r.log) && /ready: no/.test(r.log), 'status: missing key');
  r = await run(['stats']); ok(r.code === 0 && /ig · 5 · 3 · 1/.test(r.log) && /2026-10-15 · Роль дня · питання · 640 \/ 510 \/ 12 \/ 3 \/ 4 \/ 7/.test(r.log), 'stats: profile links and Instagram numbers');
  r = await run(['status'], { BOT_TOKEN: 'wrong' }); ok(r.code === 1 && /forbidden/.test(r.log), 'wrong key → refused'); }

server.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `\n${fails} of ${n} checks FAILED` : `\nALL OK (${n} checks)`);
process.exit(fails ? 1 : 0);
