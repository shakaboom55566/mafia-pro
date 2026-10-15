/* Tests of the Ads workflow against local fakes of the Marketing API, Gemini (Veo, Imagen, TTS), our backend, the NBU rate and Telegram,
   plus unit tests of the judge (ads/lib/rules.mjs) and the brief checks. Run: node ads/test.mjs   (needs ffmpeg) */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dayHours, zonedMs, kyivParts, decide, weaknesses, baseline, metricsOf, pickBrief, DEFAULT_RULES } from './lib/rules.mjs';
import { parseBrief } from './lib/brief.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ads-test-'));
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('  FAIL', m); } };
const H = 3600000;

console.log('the judge: daytime hours, verdicts, the best one, one change at a time');
{ const t0 = Date.parse('2026-10-16T09:00:00Z'); // 12:00 Kyiv (UTC+3)
  ok(Math.abs(dayHours(t0, t0 + 6 * H) - 6) < 0.01, '12:00 → 18:00: 6 daytime hours');
  ok(Math.abs(dayHours(Date.parse('2026-10-16T18:00:00Z'), Date.parse('2026-10-17T09:00:00Z')) - 6) < 0.01, '21:00 → next day 12:00: 3 + 3 hours, the night not counted');
  ok(zonedMs('2026-10-16', 12) === t0 && zonedMs('2026-10-31', 0) === Date.parse('2026-10-30T22:00:00Z'), 'Kyiv wall time → UTC, across the winter clock change');
  ok(kyivParts(Date.parse('2026-10-19T07:30:00Z')).weekday === 'Mon', 'weekday');
  const m = (o, kind = 'video') => Object.assign(metricsOf({ impressions: o.imp, spend: o.spend, inline_link_clicks: o.clicks, actions: [{ action_type: 'video_view', value: o.v3 || 0 }, { action_type: 'landing_page_view', value: o.lpv || 0 }, { action_type: 'post_reaction', value: o.eng || 0 }] }, { newPlayers: o.p || 0 }), { kind });
  const A = m({ imp: 1500, v3: 450, clicks: 21, lpv: 15, spend: 4.5, eng: 9, p: 4 }), B = m({ imp: 1400, v3: 98, clicks: 4, lpv: 2, spend: 4.2, eng: 1 }), C = m({ imp: 1300, v3: 390, clicks: 17, lpv: 12, spend: 4.0, eng: 7, p: 3 });
  const base = baseline([A, B, C]);
  ok(Math.abs(base.ctr - 42 / 4200) < 1e-9 && base.bestHook === 0.3 && Math.abs(base.cpl - 12.7 / 29) < 1e-9, 'baseline: CTR, best 3-second view, cost per visit');
  const wb = weaknesses(B, base); ok(wb.bad && wb.codes.includes('hook') && wb.codes.includes('ctr') && wb.codes.includes('cost') && /3 с только 7,0 %/.test(wb.why[0]), 'weak: views, clicks, cost — in words');
  ok(!weaknesses(A, base).bad && !weaknesses(C, base).bad, 'good ones stay');
  const ad = (id, mm, o = {}) => Object.assign({ id, brief: 'dnp-' + id, kind: 'video', status: 'ACTIVE', created: t0 - H, first: t0, m: mm }, o);
  let d = decide({ ads: [ad('1', A), ad('2', B), ad('3', C)], now: t0 + 5 * H, target: 3 });
  ok(d.verdicts.every(v => v.verdict === 'wait') && !d.pause.length && !d.launch, '5 daytime hours: everyone waits');
  d = decide({ ads: [ad('1', A), ad('2', B), ad('3', C)], now: t0 + 7 * H, target: 3 });
  ok(d.pause.join() === '2' && d.launch === 1 && d.best === '1', '7 hours: the weak one paused, one replacement, the best marked');
  d = decide({ ads: [ad('1', A), ad('2', B), ad('3', C)], now: Date.parse('2026-10-16T23:00:00Z'), target: 3 });
  ok(!d.pause.length && /ночь/.test(d.notes.join()), 'night: no verdicts acted on');
  d = decide({ ads: [ad('1', B), ad('2', B, { brief: 'x2' }), ad('3', A)], now: t0 + 7 * H, target: 3 });
  ok(d.pause.length === 1, 'two weak ones: still one change per check');
  d = decide({ ads: [ad('1', B), ad('3', A)], now: t0 + 7 * H, target: 3 });
  ok(!d.pause.length && d.launch === 1 && /меньше 2/.test(d.notes.join()), 'only two running: the replacement first, the pause next time');
  d = decide({ ads: [ad('1', A), ad('2', B)], now: t0 + 7 * H, target: 3, rules: { min_live: 1 } });
  ok(d.pause.join() === '2', 'the best is never paused, the weak one is');
  const few = m({ imp: 120, v3: 40, clicks: 2, spend: 0.4 });
  d = decide({ ads: [ad('1', A), ad('2', few, { created: t0 - 26 * H, first: t0 - 25 * H }), ad('3', C)], now: t0 + 7 * H, target: 3 });
  ok(d.verdicts.find(v => v.id === '2').verdict === 'dead' && d.pause.join() === '2', 'Meta barely shows it for 12 daytime hours → "not going"');
  d = decide({ ads: [], now: t0, target: 3 }); ok(d.launch === 3, 'the start: three at once');
  d = decide({ ads: [ad('1', A)], now: t0 + 7 * H, target: 3, launchesToday: 4 }); ok(d.launch === 0 && /лимит/.test(d.notes.join()), 'four new ads a day at most');
  d = decide({ ads: [ad('1', A), ad('2', B, { status: 'DISAPPROVED' }), ad('3', C, { status: 'PENDING_REVIEW' })], now: t0 + 7 * H, target: 3 });
  ok(d.verdicts.find(v => v.id === '2').verdict === 'rejected' && d.launch === 1, 'rejected → replaced');
  const q = [{ id: 'q1', hook: 'без', kind: 'video' }, { id: 'q2', hook: 'питання', kind: 'image' }, { id: 'q3', hook: 'ситуація', kind: 'video' }];
  ok(pickBrief(q, { lost: [{ hook: 'без', codes: ['hook'] }], winner: { hook: 'питання', kind: 'video' } }).id === 'q3', 'weak views → another opening, the winner\'s kind');
  ok(pickBrief(q, { lost: [{ hook: 'ситуація', codes: ['ctr'] }], winner: { hook: 'питання', kind: 'image' } }).id === 'q2', 'weak clicks → the winner\'s opening');
  ok(pickBrief([], {}) === null, 'empty queue → null'); }

console.log('briefs');
{ const f = path.join(tmp, 'dnp-901.md');
  fs.writeFileSync(f, '---\nid: dnp-901\ntag: dnp\nkind: video\nhook: питання\ntitle: Это очень длинный заголовок для рекламы на экране\nvoice: none\nheadline: Мафия\n---\n## prompt\nA man with a gun in a casino.\n## text\nПривет\n');
  const b = parseBrief(f);
  ok(b.errors.some(e => /title: \d+ characters/.test(e)) && b.errors.some(e => /Russian letters/.test(e)) && b.errors.some(e => /no weapons/.test(e)), 'long title, Russian letters, a weapon → errors');
  for (const file of fs.readdirSync(path.join(here, 'creatives')).filter(x => x.endsWith('.md'))) { const x = parseBrief(path.join(here, 'creatives', file)); ok(!x.errors.length, `${file}: ${x.errors.join('; ')}`); } }

/* ---------- fakes ---------- */
const clip = path.join(tmp, 'veo.mp4');
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=720x1280:r=24:d=8', '-f', 'lavfi', '-i', 'sine=f=330:d=8:r=48000', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', clip]);
const CLIP = fs.readFileSync(clip);
const png = path.join(tmp, 'img.png'); execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=0x334455:s=768x1408', '-frames:v', '1', png]); const PNG = fs.readFileSync(png);
const wavF = path.join(tmp, 'v.wav'); execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=f=600:d=4:r=24000', '-ac', '1', '-c:a', 'pcm_s16le', wavF]); const WAV = fs.readFileSync(wavF);
const S = { calls: [], account: null, campaigns: [], adsets: [], ads: [], insights: [], hourly: [], totals: {}, creds: null, stats: { ok: true, ads: {}, sources: {}, plain: {} }, n: 0, block: false, audiences: [], adsetError: null };
const KEY = crypto.createHash('sha256').update('tg-token:mafia-pro-ads').digest('hex').slice(0, 48);
const SKEY = crypto.createHash('sha256').update('tg-token:mafia-pro-social').digest('hex').slice(0, 48);
const server = http.createServer((req, res) => {
  const parts = []; req.on('data', c => parts.push(c));
  req.on('end', async () => {
    const buf = Buffer.concat(parts); const u = new URL(req.url, 'http://x'); const p = u.pathname; const ct = req.headers['content-type'] || '';
    let body = {}; if (/json/.test(ct)) { try { body = JSON.parse(buf.toString('utf8')); } catch (e) {} } else if (/urlencoded/.test(ct)) body = Object.fromEntries(new URLSearchParams(buf.toString('utf8')));
    else if (/multipart/.test(ct)) { const fd = await new Response(buf, { headers: { 'content-type': ct } }).formData(); for (const [k, v] of fd.entries()) body[k] = typeof v === 'string' ? v : { size: v.size, type: v.type }; }
    const q = Object.fromEntries(u.searchParams); S.calls.push({ m: req.method, p, q, body, size: buf.length });
    const send = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    const J = v => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { return v; } };
    let m;
    // Gemini
    if ((m = /^\/v1beta\/models\/([\w.-]+):predictLongRunning$/.exec(p))) { if (req.headers['x-goog-api-key'] !== 'gem-key') return send(403, {}); const op = 'operations/op' + (++S.n); S[op] = { k: 0, prompt: body.instances[0].prompt }; return send(200, { name: op }); }
    if ((m = /^\/v1beta\/(operations\/op\d+)$/.exec(p))) { const o = S[m[1]]; if (++o.k < 2) return send(200, { done: false });
      if (S.block && !/family-friendly/.test(o.prompt)) return send(200, { done: true, response: { generateVideoResponse: { raiMediaFilteredReasons: ['unsafe'] } } });
      return send(200, { done: true, response: { generateVideoResponse: { generatedSamples: [{ video: { uri: `${base}/v1beta/files/v:download` } }] } } }); }
    if (p === '/v1beta/files/v:download') { res.writeHead(200, { 'Content-Type': 'video/mp4' }); return res.end(CLIP); }
    if (p === '/v1beta/models/imagen-4.0-fast-generate-001:predict') return send(200, { predictions: [{ bytesBase64Encoded: PNG.toString('base64'), mimeType: 'image/png' }] });
    if (p === '/v1beta/interactions') return send(200, { steps: [{ type: 'model_output', content: [{ type: 'audio', data: WAV.toString('base64') }] }] });
    if (/^\/cards\/uk\/\w+\.png$/.test(p)) { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(PNG); }
    // backend
    if (p === '/ads/creds' || p === '/ads/stats') { if (req.headers['x-ads-key'] !== KEY) return send(403, { ok: false, error: 'forbidden' }); return send(200, p === '/ads/creds' ? S.creds : S.stats); }
    if (p === '/social/creds') { if (req.headers['x-social-key'] !== SKEY) return send(403, { ok: false }); return send(200, { ok: true, meta: { pageId: '1001', pageName: 'Mafia Pro', igId: '1784' } }); }
    if (p === '/nbu') return send(200, [{ cc: q.valcode, rate: q.valcode === 'USD' ? 41.5 : 48.2 }]);
    if ((m = /^\/bot([^/]+)\/(\w+)$/.exec(p))) return send(m[1] === 'tg-token' ? 200 : 401, { ok: m[1] === 'tg-token', result: {} });
    // Marketing API
    if (!p.startsWith('/v25.0/')) return send(404, { error: { message: 'no route ' + p } });
    const g = p.slice(7); const tok = q.access_token || body.access_token; if (tok !== 'ads-token') return send(400, { error: { message: 'Invalid OAuth access token', code: 190 } });
    if (g === 'act_123' && req.method === 'GET') return send(200, S.account);
    if (g === 'act_123/campaigns') { if (req.method === 'GET') return send(200, { data: S.campaigns.filter(c => !q.filtering || c.name === J(q.filtering)[0].value) }); const c = { id: '120' + (++S.n), name: body.name, status: 'ACTIVE', body }; S.campaigns.push(c); return send(200, { id: c.id }); }
    if (g === 'act_123/adsets') { if (req.method === 'GET') return send(200, { data: S.adsets.filter(c => !q.filtering || c.name === J(q.filtering)[0].value) });
      if (S.adsetError && J(body.targeting).targeting_automation.advantage_audience === 0) return send(400, { error: { message: 'Advantage audience must be enabled for this objective', code: 100 } });
      const a = { id: '230' + (++S.n), name: body.name, body }; S.adsets.push(a); return send(200, { id: a.id }); }
    if (g === 'act_123/adimages') return send(200, { images: { [body.name || 'x']: { hash: 'hash' + (++S.n), url: 'https://img' } } });
    if (g === 'act_123/advideos') return send(200, { id: 'vid' + (++S.n) });
    if (/^vid\d+$/.test(g)) return send(200, { id: g, status: { video_status: 'ready' } });
    if (g === 'act_123/adcreatives') return send(200, { id: 'cr' + (++S.n) });
    if (g === 'act_123/ads') { const a = { id: '9' + String(++S.n).padStart(5, '0'), name: body.name, effective_status: 'PENDING_REVIEW', status: 'ACTIVE', created_time: new Date(Date.parse(S.now)).toISOString() }; S.ads.push(a); return send(200, { id: a.id }); }
    if (g === 'act_123/customaudiences') { const a = { id: 'aud' + (++S.n), body }; S.audiences.push(a); return send(200, { id: a.id }); }
    if (/^aud\d+$/.test(g)) return send(200, { approximate_count_lower_bound: 1200 });
    if (g === '1001') return send(200, { name: 'Mafia Pro', instagram_business_account: { id: '1784' } });
    if ((m = /^(\d+)\/ads$/.exec(g))) return send(200, { data: S.ads });
    if ((m = /^(\d+)\/insights$/.exec(g))) { if (q.breakdowns) return send(200, { data: S.hourly }); if (q.level === 'ad') return send(200, { data: S.insights }); return send(200, { data: [S.totals] }); }
    if (/^\d+$/.test(g) && req.method === 'POST') { const ad = S.ads.find(a => a.id === g); if (ad && body.status) ad.effective_status = body.status; const c = S.campaigns.find(c => c.id === g); if (c && body.status) c.status = body.status; return send(200, { success: true }); }
    send(404, { error: { message: 'mock: no route ' + p } });
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;

const DIR = path.join(tmp, 'ads'); fs.mkdirSync(path.join(DIR, 'creatives'), { recursive: true });
fs.copyFileSync(path.join(here, 'config.json'), path.join(DIR, 'config.json'));
for (const f of fs.readdirSync(path.join(here, 'creatives'))) fs.copyFileSync(path.join(here, 'creatives', f), path.join(DIR, 'creatives', f));
const LOG = path.join(tmp, 'log.txt'), CH = path.join(tmp, 'changed');
const KEYS = { META_ADS_TOKEN: 'ads-token', META_AD_ACCOUNT_ID: '123', META_PIXEL_ID: '555666777888', GEMINI_API_KEY: 'gem-key' };
const run = (args, now, extra = {}) => new Promise(resolve => { fs.writeFileSync(LOG, ''); try { fs.unlinkSync(CH); } catch (e) {} S.now = now; let out = '';
  const ch = spawn(process.execPath, [path.join(here, 'run.mjs'), ...args], { env: Object.assign({}, process.env, { API: base, BOT_TOKEN: 'tg-token', META_GRAPH_BASE: base, GEMINI_BASE: base + '/v1beta', TELEGRAM_API: base, APP_URL: base + '/', NBU_API: base + '/nbu', NOW: now, ADS_DIR: DIR, LOG, CHANGED: CH, POLL_MS: '20', FFMPEG_PRESET: 'ultrafast', GITHUB_ACTIONS: '', META_PAGE_ID: '' }, KEYS, extra) });
  ch.stdout.on('data', d => { out += d; }); ch.stderr.on('data', d => { out += d; });
  const timer = setTimeout(() => ch.kill('SIGKILL'), 300000);
  ch.on('close', code => { clearTimeout(timer); resolve({ code, out, log: fs.readFileSync(LOG, 'utf8'), changed: fs.existsSync(CH) }); }); });
const calls = (re, meth) => S.calls.filter(c => re.test(c.p) && (!meth || c.m === meth));
const tgTexts = () => calls(/\/bottg-token\/(sendMessage|sendVideo|sendPhoto)$/).map(c => c.body.text || c.body.caption || '');
const reset = () => { S.calls = []; };
const state = () => JSON.parse(fs.readFileSync(path.join(DIR, 'state', 'dnp.json'), 'utf8'));
const CREDS = (o = {}) => Object.assign({ ok: true, locked: false, paused: false, muted: false, admins: [777], capi: true }, o);
const ACC = (o = {}) => Object.assign({ id: 'act_123', name: 'Mafia Pro', currency: 'USD', timezone_name: 'Europe/Kiev', account_status: 1, spend_cap: '18000', amount_spent: '0' }, o);
const T1 = '2026-10-16T09:00:00Z'; // Thursday 12:00 Kyiv

console.log('not ready: no keys → nothing; no spending limit → one warning, nothing created');
{ reset(); S.creds = CREDS(); S.account = ACC();
  let r = await run(['check'], T1, { META_ADS_TOKEN: '', META_AD_ACCOUNT_ID: '' }); ok(r.code === 0 && /not ready: META_ADS_TOKEN/.test(r.log) && !calls(/^\/v25/).length && !r.changed, 'no keys: quiet, no calls');
  S.account = ACC({ spend_cap: '0' }); reset(); r = await run(['check'], T1);
  ok(r.code === 0 && /no account spending limit/.test(r.log) && !calls(/act_123\/campaigns/, 'POST').length, 'no limit: nothing created');
  ok(tgTexts().some(t => /лимит|limit/.test(t)), 'the admin is told'); reset(); r = await run(['check'], T1); ok(!tgTexts().length, 'told once (12 h)');
  S.creds = CREDS({ locked: true }); S.account = ACC(); reset(); r = await run(['check'], T1); ok(/lockdown/.test(r.log) && !calls(/act_123\/(campaigns|adsets|ads)$/, 'POST').length, 'lockdown: no changes'); }

console.log('the start: campaign, ad set (budget, schedule, radius, ages), three ads from the queue, notes to the admin');
{ S.creds = CREDS(); S.account = ACC(); fs.rmSync(path.join(DIR, 'state'), { recursive: true, force: true }); reset();
  const r = await run(['check'], T1); ok(r.code === 0, 'exit 0'); if (r.code) console.log(r.out.slice(-3000));
  const c = calls(/act_123\/campaigns$/, 'POST')[0]; ok(c && c.body.objective === 'OUTCOME_TRAFFIC' && c.body.special_ad_categories === '[]' && c.body.is_adset_budget_sharing_enabled === 'false' && c.body.name === 'Mafia Pro · Дніпро', 'campaign: traffic, no special category, no budget sharing');
  const a = calls(/act_123\/adsets$/, 'POST')[0]; const tg = a && JSON.parse(a.body.targeting); const sch = a && JSON.parse(a.body.adset_schedule)[0];
  ok(a && a.body.lifetime_budget === '17857' && a.body.optimization_goal === 'LANDING_PAGE_VIEWS' && a.body.billing_event === 'IMPRESSIONS' && a.body.destination_type === 'WEBSITE', 'ad set: $178.57 for 15 days ($100 a week with VAT), landing page views');
  ok(a && a.body.pacing_type === '["day_parting"]' && sch.start_minute === 540 && sch.end_minute === 1440 && sch.days.length === 7 && sch.timezone_type === 'USER', 'schedule: 09:00–24:00 every day, viewer\'s time');
  ok(a && a.body.end_time === '2026-10-30T22:00:00.000Z' && a.body.start_time === '2026-10-16T09:00:00.000Z', 'ends after 15 days at midnight Kyiv');
  ok(tg && tg.geo_locations.custom_locations[0].radius === 15 && tg.geo_locations.custom_locations[0].latitude === 48.4647 && tg.age_min === 18 && tg.age_max === 45 && tg.publisher_platforms.join() === 'facebook,instagram', 'targeting: Dnipro + 15 km, 18–45, Facebook + Instagram');
  ok(calls(/predictLongRunning/).length === 3 && calls(/advideos/).length === 3 && calls(/act_123\/ads$/, 'POST').length === 3, 'three videos made, uploaded, three ads');
  const cr = calls(/adcreatives/)[0]; const st = cr && JSON.parse(cr.body.object_story_spec);
  ok(st && st.page_id === '1001' && st.instagram_user_id === '1784' && st.video_data.call_to_action.type === 'PLAY_GAME' && st.video_data.call_to_action.value.link === 'https://mafiapro.app/uk/dnipro/' && /^hash/.test(st.video_data.image_hash) && /Мафія|друз/i.test(st.video_data.message), 'creative: Page + Instagram, play button to the landing page, thumbnail, Ukrainian text');
  ok(cr && /ad=\{\{ad\.id\}\}/.test(cr.body.url_tags) && /utm_campaign=dnp/.test(cr.body.url_tags), 'url_tags: ad id for our counting');
  const ad0 = calls(/act_123\/ads$/, 'POST')[0]; ok(ad0 && ad0.body.status === 'ACTIVE' && /^dnp · dnp-001 · video$/.test(ad0.body.name), 'ad named by its brief');
  ok(/sheriff/.test(calls(/cards\/uk/).map(x => x.p).join()) && calls(/predictLongRunning/)[2].body.instances[0].referenceImages, 'the sheriff brief: card art as a reference');
  const texts = tgTexts(); ok(/Реклама · Днепр запущена/.test(texts[0]) && /\$178,57 на 15 дн/.test(texts[0]) && texts.filter(t => /новое объявление/.test(t)).length === 3 && calls(/sendVideo/).length === 3, 'admin: the start + three new ads with their videos');
  const s = state(); ok(s.adsetId && Object.keys(s.ads).length === 3 && s.used.join() === 'dnp-001,dnp-002,dnp-003' && s.launches.length === 3, 'state saved');
  ok(calls(/\/ads\/creds/).some(x => x.body.campaigns && x.body.campaigns[0] === s.campaignId), 'the campaign id goes to the backend (/ads pause button)');
  ok(r.changed && !/ads-token|gem-key|tg-token/.test(r.log + r.out), 'changed flag; no secrets in the log'); }

const ids = () => Object.keys(state().ads);
const row = (id, o) => ({ ad_id: id, impressions: String(o.imp), reach: String(Math.round(o.imp * 0.7)), spend: String(o.spend), inline_link_clicks: String(o.clicks), actions: [{ action_type: 'video_view', value: String(o.v3) }, { action_type: 'landing_page_view', value: String(o.lpv) }, { action_type: 'post_reaction', value: String(o.eng || 0) }] });

console.log('6 daytime hours later: the weak one paused, a replacement chosen by what failed, the admin told why');
{ const [a1, a2, a3] = ids(); for (const a of S.ads) a.effective_status = 'ACTIVE';
  S.hourly = [a1, a2, a3].map(id => ({ ad_id: id, impressions: '40', date_start: '2026-10-16', hourly_stats_aggregated_by_advertiser_time_zone: '12:00:00 - 12:59:59' }));
  S.insights = [row(a1, { imp: 1500, v3: 450, clicks: 21, lpv: 15, spend: 4.5, eng: 9 }), row(a2, { imp: 1400, v3: 98, clicks: 4, lpv: 2, spend: 4.2, eng: 1 }), row(a3, { imp: 1300, v3: 390, clicks: 17, lpv: 12, spend: 4.0, eng: 7 })];
  S.stats = { ok: true, ads: { [a1]: { visits: 15, starts: 5, newPlayers: 4, played: 1 }, [a3]: { visits: 12, starts: 3, newPlayers: 3, played: 1 } }, sources: { dnp: { visits: 27, starts: 8, newPlayers: 7, played: 2, leads: 7 } }, plain: {} };
  reset(); let r = await run(['check'], '2026-10-16T14:00:00Z'); // 17:00 Kyiv: 5 daytime hours
  ok(!calls(/^\/v25\.0\/9\d+$/, 'POST').length && !calls(/act_123\/ads$/, 'POST').length, '5 hours: nothing changes');
  reset(); r = await run(['check'], '2026-10-16T16:30:00Z'); // 19:30 Kyiv: 7.5 hours
  const p = calls(/^\/v25\.0\/9\d+$/, 'POST'); ok(p.length === 1 && p[0].p.endsWith(a2) && p[0].body.status === 'PAUSED', 'the weak one (dnp-002) paused');
  const na = calls(/act_123\/ads$/, 'POST'); ok(na.length === 1 && /dnp-004/.test(na[0].body.name), 'replacement: another opening, the winner\'s kind (dnp-004)');
  const sw = tgTexts().find(t => /На паузе/.test(t)) || ''; ok(/dnp-002/.test(sw) && /3 с только 7,0 %/.test(sw) && /Вместо него/.test(sw) && /dnp-004/.test(sw) && /Лучшее сейчас/.test(sw), 'swap note: what, why, instead of it, the best');
  ok(calls(/sendVideo/).length === 1, 'the new video comes with the note');
  const s = state(); ok(s.ads[a2].status === 'paused' && s.ads[a2].codes.includes('hook') && s.swaps.length === 1 && s.ads[a1].status === 'live', 'state: paused with its reasons, the others live'); }

console.log('night, muted notices, a rejected ad, the pause switch of /ads');
{ const [a1, , a3, a4] = ids(); S.ads.find(a => a.id === a4).effective_status = 'ACTIVE';
  S.insights.push(row(a4, { imp: 900, v3: 270, clicks: 12, lpv: 9, spend: 3 }));
  S.insights = S.insights.map(x => (x.ad_id === a3 ? row(a3, { imp: 2600, v3: 210, clicks: 6, lpv: 4, spend: 8, eng: 1 }) : x));
  reset(); let r = await run(['check'], '2026-10-16T23:30:00Z'); // 02:30 Kyiv
  ok(!calls(/^\/v25\.0\/9\d+$/, 'POST').length && /ночь/.test(r.log), 'night: weak one not touched');
  S.creds = CREDS({ muted: true }); reset(); r = await run(['check'], '2026-10-17T08:00:00Z'); // 11:00 Kyiv
  ok(calls(/^\/v25\.0\/9\d+$/, 'POST').some(x => x.p.endsWith(a3) && x.body.status === 'PAUSED') && !tgTexts().length, 'muted: the swap happens, no notes');
  S.creds = CREDS(); const newest = S.ads[S.ads.length - 1]; newest.effective_status = 'DISAPPROVED'; newest.ad_review_feedback = { global: { 'Неприйнятна мова': 'Текст порушує правила' } };
  reset(); r = await run(['check'], '2026-10-17T09:00:00Z');
  ok(tgTexts().some(t => /отклонила/.test(t) && /правила/.test(t)) && calls(/act_123\/ads$/, 'POST').length === 1 && state().ads[newest.id].status === 'rejected', 'rejected: the admin told, replaced');
  S.creds = CREDS({ paused: true }); reset(); r = await run(['check'], '2026-10-17T10:00:00Z');
  ok(calls(/^\/v25\.0\/120\d+$/, 'POST').some(x => x.body.status === 'PAUSED') && state().pausedByUs === true && !calls(/act_123\/ads$/, 'POST').length, '/ads pause: the campaign paused, nothing launched');
  S.creds = CREDS(); reset(); r = await run(['check'], '2026-10-17T11:00:00Z');
  ok(calls(/^\/v25\.0\/120\d+$/, 'POST').some(x => x.body.status === 'ACTIVE') && state().pausedByUs === false, 'resume: the campaign active again'); }

console.log('Monday report, audiences after day 3, the end of the test');
{ S.totals = { impressions: '16000', reach: '9100', frequency: '1.76', spend: '41.2', inline_link_clicks: '190', actions: [{ action_type: 'landing_page_view', value: '120' }] };
  for (const a of S.ads) if (a.effective_status === 'PENDING_REVIEW') a.effective_status = 'ACTIVE';
  reset(); let r = await run(['check'], '2026-10-19T07:30:00Z'); // Monday 10:30 Kyiv (UTC+3 until 25.10)
  const rep = tgTexts().find(t => /📊/.test(t)) || '';
  ok(/неделя, день 3 из 15/.test(rep) && /Потрачено: \$41,20 \+ НДС ≈ \$49,44 из \$178,57/.test(rep) && /новые игроки 7/.test(rep) && /Лучшее/.test(rep), 'weekly report: spend with VAT, players, the best ad');
  ok(fs.readdirSync(path.join(DIR, 'reports')).some(f => /2026-10-19-dnp\.md/.test(f)), 'report kept in ads/reports');
  reset(); r = await run(['check'], '2026-10-19T08:30:00Z'); ok(!tgTexts().some(t => /📊/.test(t)), 'once a week');
  reset(); r = await run(['check'], '2026-10-20T09:00:00Z');
  const au = calls(/customaudiences/, 'POST'); ok(au.length === 2 && /Lead/.test(au.map(x => x.body.rule).join()) && /\/uk\/dnipro\//.test(au.map(x => x.body.rule).join()) && /555666777888/.test(au[0].body.rule), 'audiences: landing page visitors and players (pixel)');
  reset(); r = await run(['check'], '2026-10-21T09:00:00Z'); ok(!calls(/customaudiences/, 'POST').length, 'audiences made once');
  reset(); r = await run(['check'], '2026-10-31T08:00:00Z');
  const fin = tgTexts().find(t => /итог 15 дней/.test(t)) || ''; ok(fin && /Итог: /.test(fin) && !calls(/act_123\/ads$/, 'POST').length, 'the end: final report with the verdict, nothing launched');
  reset(); r = await run(['check'], '2026-10-31T09:00:00Z'); ok(!tgTexts().length, 'final report once'); }

console.log('stats for the agent, status, preview, launch by hand, a hryvnia account, a blocked video');
{ reset(); let r = await run(['stats'], '2026-10-20T09:00:00Z');
  ok(r.code === 0 && /brief · kind · hook/.test(r.log) && /dnp-002 · video · без · ведучий · PAUSED/.test(r.log) && /swap /.test(r.log), 'stats: every ad, its hook and angle, swaps');
  reset(); r = await run(['status'], '2026-10-20T09:00:00Z'); ok(/ready: yes/.test(r.log) && /dnp \(Днепр\): enabled · ad set/.test(r.log) && /queue \d+ briefs/.test(r.log), 'status: ready, the campaign, the queue');
  r = await run(['status'], '2026-10-20T09:00:00Z', { GEMINI_API_KEY: '' }); ok(/gemini key: MISSING/.test(r.log) && /ready: no/.test(r.log), 'status: no Gemini key → not ready');
  reset(); r = await run(['preview', 'dnp-006'], T1); ok(r.code === 0 && calls(/imagen-4\.0-fast/).length === 1 && calls(/sendPhoto/).length === 1 && !calls(/^\/v25/).length && /Пробное объявление/.test(tgTexts()[0]), 'preview: Imagen picture to the admin only');
  reset(); r = await run(['launch', 'dnp-007'], '2026-10-20T10:00:00Z'); const im = calls(/adcreatives/)[0]; const st = im && JSON.parse(im.body.object_story_spec);
  ok(r.code === 0 && calls(/adimages/).length === 1 && st && st.link_data && st.link_data.link === 'https://mafiapro.app/uk/dnipro/' && st.link_data.name === 'Мафія без карт і паперу', 'launch by hand: a picture ad with its headline');
  // a fresh account in hryvnias; Advantage+ audience forced; a video blocked once
  fs.rmSync(path.join(DIR, 'state'), { recursive: true, force: true }); S.campaigns = []; S.adsets = []; S.ads = []; S.account = ACC({ currency: 'UAH', spend_cap: '900000' }); S.adsetError = true; S.block = true; reset();
  r = await run(['check'], T1);
  const as = calls(/act_123\/adsets$/, 'POST'); ok(as.length === 2 && as[1].body.lifetime_budget === String(Math.round(100 / 1.2 * 15 / 7 * 41.5 * 100)) && JSON.parse(as[1].body.targeting).targeting_automation.advantage_audience === 1, 'UAH: budget by the NBU rate; Advantage+ audience when required');
  const pr = calls(/predictLongRunning/).map(x => x.body.instances[0].prompt); ok(pr.length >= 2 && !/family-friendly/.test(pr[0]) && /family-friendly/.test(pr[1]), 'Veo blocked → softer prompt');
  S.block = false; S.adsetError = null; }

server.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `\n${fails} of ${n} checks FAILED` : `\nALL OK (${n} checks)`);
process.exit(fails ? 1 : 0);
