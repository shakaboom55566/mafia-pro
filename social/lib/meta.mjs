/* Instagram Reels and Facebook Page Reels with the Page token (Instagram API with Facebook Login for Business).
   Instagram: container (REELS, resumable) → bytes to rupload → status FINISHED → media_publish → permalink.
   Facebook:  video_reels start → bytes to rupload → finish (PUBLISHED) → status. */
import { http, log, sleep, short } from './util.mjs';

const form = o => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)]));
const gerr = r => (r && r.json && r.json.error ? `${r.json.error.message || 'error'}${r.json.error.code ? ` (#${r.json.error.code}${r.json.error.error_subcode ? '/' + r.json.error.error_subcode : ''})` : ''}` : `HTTP ${r ? r.status : 0} ${short(r && r.text, 160)}`);

export function graphClient({ base = 'https://graph.facebook.com', version = 'v25.0', token }) {
  base = base.replace(/\/$/, '');
  return {
    get: (p, q = {}) => http(`${base}/${version}/${p}?${form(Object.assign({ access_token: token }, q))}`, {}, { label: 'graph ' + p.split('/')[0] }),
    post: (p, b = {}) => http(`${base}/${version}/${p}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(Object.assign({ access_token: token }, b)) }, { tries: 2, label: 'graph ' + p.split('/').pop() }),
    upload: (url, bytes) => http(url, { method: 'POST', headers: { Authorization: `OAuth ${token}`, offset: '0', file_size: String(bytes.length), 'Content-Type': 'application/octet-stream' }, body: bytes }, { tries: 3, wait: 8000, label: 'rupload' })
  };
}

export async function instagramReel({ g, igId, bytes, caption, version = 'v25.0', pollMs = 15000, timeoutMs = 8 * 60000 }) {
  const extra = { share_to_feed: 'true', is_ai_generated: 'true', thumb_offset: '1500' };
  let c = await g.post(`${igId}/media`, Object.assign({ media_type: 'REELS', upload_type: 'resumable', caption }, extra));
  if (!(c.json && c.json.id) && c.json && c.json.error && /param|parameter/i.test(c.json.error.message || '')) { // an optional field refused: try without them
    log(`  instagram: ${gerr(c)} — retrying without optional fields`);
    c = await g.post(`${igId}/media`, { media_type: 'REELS', upload_type: 'resumable', caption });
  }
  if (!(c.json && c.json.id)) throw new Error('container: ' + gerr(c));
  const id = c.json.id; const uri = c.json.uri || `https://rupload.facebook.com/ig-api-upload/${version}/${id}`;
  const up = await g.upload(uri, bytes);
  if (!(up.json && (up.json.success === true || up.json.success === 'true'))) throw new Error('upload: ' + gerr(up));
  const t0 = Date.now(); let st = null;
  while (Date.now() - t0 < timeoutMs) {
    await sleep(pollMs);
    const s = await g.get(id, { fields: 'status_code,status' }); st = s.json || {};
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') throw new Error(`processing: ${st.status_code} ${short(st.status)}`);
  }
  if (!st || st.status_code !== 'FINISHED') throw new Error(`processing did not finish in ${Math.round(timeoutMs / 60000)} min (${st && st.status_code})`);
  let pub = null;
  for (let i = 0; i < 4; i++) { pub = await g.post(`${igId}/media_publish`, { creation_id: id }); if (pub.json && pub.json.id) break; await sleep(pollMs); } // 9007: not ready yet
  if (!(pub.json && pub.json.id)) throw new Error('publish: ' + gerr(pub));
  const mediaId = pub.json.id; const pl = await g.get(mediaId, { fields: 'permalink' });
  return { id: mediaId, url: (pl.json && pl.json.permalink) || null, status: 'published' };
}

export async function facebookReel({ g, pageId, bytes, description, version = 'v25.0', pollMs = 15000, timeoutMs = 6 * 60000 }) {
  const s = await g.post(`${pageId}/video_reels`, { upload_phase: 'start' });
  if (!(s.json && s.json.video_id)) throw new Error('start: ' + gerr(s));
  const vid = s.json.video_id; const url = s.json.upload_url || `https://rupload.facebook.com/video-upload/${version}/${vid}`;
  const up = await g.upload(url, bytes);
  if (!(up.json && (up.json.success === true || up.json.success === 'true'))) throw new Error('upload: ' + gerr(up));
  const fin = await g.post(`${pageId}/video_reels`, { upload_phase: 'finish', video_id: vid, video_state: 'PUBLISHED', description });
  if (!(fin.json && (fin.json.success === true || fin.json.success === 'true'))) throw new Error('finish: ' + gerr(fin));
  const t0 = Date.now(); let st = {}, link = null;
  while (Date.now() - t0 < timeoutMs) {
    await sleep(pollMs);
    const r = await g.get(vid, { fields: 'status,permalink_url' }); const d = r.json || {}; st = d.status || {}; if (d.permalink_url) link = d.permalink_url;
    if (st.video_status === 'error' || (st.processing_phase && st.processing_phase.status === 'error') || (st.publishing_phase && st.publishing_phase.status === 'error')) throw new Error('processing: ' + short(st));
    if (st.publishing_phase && st.publishing_phase.status === 'complete') break;
  }
  const done = st.publishing_phase && st.publishing_phase.status === 'complete';
  const full = link ? (/^https?:/.test(link) ? link : 'https://www.facebook.com' + link) : `https://www.facebook.com/reel/${vid}`;
  return { id: vid, url: full, status: done ? 'published' : 'processing' };
}

/* stats for the agent: views, reach, likes, comments, shares, saves of recent Reels (instagram_manage_insights) */
export async function instagramInsights({ g, ids }) {
  const out = {};
  for (const id of ids) {
    const m = await g.get(id, { fields: 'like_count,comments_count,permalink,timestamp' });
    const i = await g.get(`${id}/insights`, { metric: 'views,reach,shares,saved,ig_reels_avg_watch_time' });
    const row = { likes: m.json && m.json.like_count, comments: m.json && m.json.comments_count };
    for (const x of (i.json && i.json.data) || []) row[x.name] = x.values && x.values[0] ? x.values[0].value : x.total_value && x.total_value.value;
    if (i.json && i.json.error) row.error = short(i.json.error.message, 80);
    out[id] = row;
  }
  return out;
}
