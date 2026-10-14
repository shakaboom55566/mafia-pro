/* TikTok Content Posting API with a FILE_UPLOAD.
   mode "inbox":  /v2/post/publish/inbox/video/init/ — the video lands in TikTok's drafts, the owner taps "Post" (the caption is sent to Telegram to paste)
   mode "direct": creator_info → /v2/post/publish/video/init/ — published with the caption; public only after TikTok's audit of the app
   Both: PUT the bytes to upload_url (one chunk up to 64 MB), then status/fetch until PUBLISH_COMPLETE / SEND_TO_USER_INBOX / FAILED. */
import { http, sleep, short, log } from './util.mjs';

const MB = 1024 * 1024;
export function chunking(n) {
  if (n <= 64 * MB) return { chunk: n, count: 1 };
  const chunk = 10 * MB; return { chunk, count: Math.floor(n / chunk) }; // the last chunk takes the remainder (up to 128 MB)
}
export async function tiktokPost({ api = 'https://open.tiktokapis.com', token, bytes, caption, mode = 'inbox', pollMs = 10000, timeoutMs = 5 * 60000 }) {
  api = api.replace(/\/$/, '');
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' };
  const call = (p, body) => http(`${api}${p}`, { method: 'POST', headers: H, body: JSON.stringify(body || {}) }, { tries: 2, wait: 6000, label: 'tiktok ' + p.split('/').slice(-2, -1)[0] });
  const terr = r => `${(r.json && r.json.error && (r.json.error.code + ': ' + r.json.error.message)) || 'HTTP ' + r.status}`;
  const { chunk, count } = chunking(bytes.length);
  const source_info = { source: 'FILE_UPLOAD', video_size: bytes.length, chunk_size: chunk, total_chunk_count: count };
  let init, privacy = null;
  if (mode === 'direct') {
    const ci = await call('/v2/post/publish/creator_info/query/');
    if (!(ci.json && ci.json.data && ci.json.error && ci.json.error.code === 'ok')) throw new Error('creator_info: ' + terr(ci));
    const opts = ci.json.data.privacy_level_options || [];
    privacy = opts.includes('PUBLIC_TO_EVERYONE') ? 'PUBLIC_TO_EVERYONE' : opts[0] || 'SELF_ONLY';
    if (privacy !== 'PUBLIC_TO_EVERYONE') log(`  tiktok: public posting is not allowed yet (${opts.join(', ') || '—'}) — the app needs TikTok's audit; posting as ${privacy}`);
    init = await call('/v2/post/publish/video/init/', { post_info: { title: caption.slice(0, 2200), privacy_level: privacy, disable_comment: false, disable_duet: false, disable_stitch: false,
      video_cover_timestamp_ms: 1500, brand_content_toggle: false, brand_organic_toggle: true, is_aigc: true }, source_info });
  } else init = await call('/v2/post/publish/inbox/video/init/', { source_info });
  if (!(init.json && init.json.data && init.json.data.publish_id)) throw new Error('init: ' + terr(init));
  const { publish_id, upload_url } = init.json.data;
  for (let i = 0; i < count; i++) {
    const a = i * chunk, b = i === count - 1 ? bytes.length : a + chunk; const part = bytes.subarray(a, b);
    const r = await http(upload_url, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(part.length), 'Content-Range': `bytes ${a}-${b - 1}/${bytes.length}` }, body: part }, { tries: 3, wait: 6000, label: 'tiktok upload' });
    if (r.status >= 300) throw new Error(`upload chunk ${i + 1}/${count}: HTTP ${r.status} ${short(r.text, 120)}`);
  }
  const t0 = Date.now(); let st = {};
  while (Date.now() - t0 < timeoutMs) {
    await sleep(pollMs);
    const r = await call('/v2/post/publish/status/fetch/', { publish_id }); st = (r.json && r.json.data) || {};
    if (st.status === 'FAILED') throw new Error('TikTok: ' + (st.fail_reason || 'failed'));
    if (st.status === 'PUBLISH_COMPLETE' || st.status === 'SEND_TO_USER_INBOX') break;
  }
  const post = st.publicaly_available_post_id && st.publicaly_available_post_id[0];
  return { id: post ? String(post) : publish_id, status: st.status || 'PROCESSING', privacy, url: null };
}
