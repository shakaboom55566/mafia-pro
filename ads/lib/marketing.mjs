/* Meta Marketing API (Graph API v25.0) with a system user token (ads_management, ads_read): the ad account, one campaign and one ad set
   per campaign tag (traffic → landing page views, a lifetime budget, delivery 09:00–24:00 viewer's time, a radius around the city,
   Facebook + Instagram), creatives from our videos and pictures, ads, statuses and insights. Every call returns { ok, data, error }. */
import { http, short, sleep, log } from '../../social/lib/util.mjs';

const enc = v => (v != null && typeof v === 'object' ? JSON.stringify(v) : String(v));
const form = o => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, enc(v)]));
export const gerr = r => (r && r.json && r.json.error ? `${r.json.error.error_user_msg || r.json.error.message || 'error'}${r.json.error.code ? ` (#${r.json.error.code}${r.json.error.error_subcode ? '/' + r.json.error.error_subcode : ''})` : ''}` : `HTTP ${r ? r.status : 0} ${short(r && r.text, 160)}`);
const res = r => (r && r.json && !r.json.error && r.status < 400 ? { ok: true, data: r.json } : { ok: false, error: gerr(r), code: r && r.json && r.json.error && r.json.error.code, data: r && r.json });

export function client({ base = 'https://graph.facebook.com', version = 'v25.0', token, account }) {
  base = base.replace(/\/$/, ''); const act = 'act_' + String(account || '').replace(/^act_/, '');
  const g = {
    act,
    get: async (p, q = {}) => res(await http(`${base}/${version}/${p}?${form(Object.assign({ access_token: token }, q))}`, {}, { label: 'graph ' + p.split('/').pop() })),
    post: async (p, b = {}) => res(await http(`${base}/${version}/${p}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(Object.assign({ access_token: token }, b)) }, { tries: 1, label: 'graph ' + p.split('/').pop() })), // one try: a retried create could make a duplicate
    multipart: async (p, fields, file) => {
      const fd = new FormData(); fd.append('access_token', token);
      for (const [k, v] of Object.entries(fields || {})) if (v != null) fd.append(k, enc(v));
      if (file) fd.append(file.field, new Blob([file.bytes], { type: file.type }), file.name);
      return res(await http(`${base}/${version}/${p}`, { method: 'POST', body: fd }, { tries: 2, wait: 8000, label: 'graph upload' }));
    },
    /* all pages of a list (cursor paging), up to `max` rows */
    all: async (p, q = {}, max = 2000) => {
      let r = await g.get(p, Object.assign({ limit: 500 }, q)); if (!r.ok) return r; const rows = (r.data.data || []).slice();
      let next = r.data.paging && r.data.paging.next;
      while (next && rows.length < max) { const n = await http(next, {}, { label: 'graph next' }); const d = res(n); if (!d.ok) return d; rows.push(...(d.data.data || [])); next = d.data.paging && d.data.paging.next; }
      return { ok: true, data: rows };
    }
  };
  return g;
}

export const accountInfo = g => g.get(g.act, { fields: 'name,currency,timezone_name,account_status,disable_reason,spend_cap,amount_spent,business_country_code' });
export const pageIdentity = (g, pageId) => g.get(String(pageId), { fields: 'name,instagram_business_account{id,username}' });

export async function findByName(g, edge, name, fields = 'id,name,status,effective_status') {
  const r = await g.all(`${g.act}/${edge}`, { fields, filtering: [{ field: 'name', operator: 'EQUAL', value: name }] }, 200);
  if (!r.ok) return r; return { ok: true, data: r.data.find(x => x.name === name) || null };
}
export async function ensureCampaign(g, name) {
  const f = await findByName(g, 'campaigns', name); if (!f.ok) return f; if (f.data) return { ok: true, data: f.data, existed: true };
  const c = await g.post(`${g.act}/campaigns`, { name, objective: 'OUTCOME_TRAFFIC', status: 'ACTIVE', buying_type: 'AUCTION', special_ad_categories: [], is_adset_budget_sharing_enabled: false });
  return c.ok ? { ok: true, data: { id: c.data.id, name }, existed: false } : c;
}
/* targeting: a radius around a point, ages, Facebook + Instagram; the ad set: lifetime budget, end time, delivery only in the given
   hours of the viewer's day (lifetime budget is what Meta requires for a schedule) */
export const targetingOf = ({ geo, ages }) => ({
  geo_locations: { custom_locations: [{ latitude: geo.lat, longitude: geo.lng, radius: geo.radius_km, distance_unit: 'kilometer' }], location_types: ['home', 'recent'] },
  age_min: ages[0], age_max: ages[1], publisher_platforms: ['facebook', 'instagram'], targeting_automation: { advantage_audience: 0 }
});
export function adsetSpec({ campaignId, name, lifetimeMinor, startIso, endIso, geo, ages, hours, optimization, pixel }) {
  const targeting = targetingOf({ geo, ages });
  const spec = { name, campaign_id: campaignId, status: 'ACTIVE', lifetime_budget: lifetimeMinor, start_time: startIso, end_time: endIso, billing_event: 'IMPRESSIONS',
    optimization_goal: optimization, bid_strategy: 'LOWEST_COST_WITHOUT_CAP', destination_type: 'WEBSITE', pacing_type: ['day_parting'],
    adset_schedule: [{ start_minute: hours[0] * 60, end_minute: hours[1] * 60, days: [0, 1, 2, 3, 4, 5, 6], timezone_type: 'USER' }], targeting };
  if (optimization === 'OFFSITE_CONVERSIONS' && pixel) spec.promoted_object = { pixel_id: pixel, custom_event_type: 'LEAD' };
  return spec;
}
export async function ensureAdset(g, spec) {
  const f = await findByName(g, 'adsets', spec.name, 'id,name,status,effective_status,lifetime_budget,end_time,start_time,optimization_goal'); if (!f.ok) return f;
  if (f.data) return { ok: true, data: f.data, existed: true };
  let a = await g.post(`${g.act}/adsets`, spec);
  if (!a.ok && /advantage|age_max|targeting_automation/i.test(a.error || '')) { // some accounts must use Advantage+ audience: ages become a suggestion, the radius stays a hard limit
    log(`  ad set: ${a.error} — retrying with Advantage+ audience`);
    a = await g.post(`${g.act}/adsets`, Object.assign({}, spec, { targeting: Object.assign({}, spec.targeting, { targeting_automation: { advantage_audience: 1 }, age_max: 65 }) }));
  }
  return a.ok ? { ok: true, data: { id: a.data.id, name: spec.name }, existed: false } : a;
}

export async function uploadImage(g, bytes, name) {
  const r = await g.post(`${g.act}/adimages`, { bytes: bytes.toString('base64'), name });
  if (!r.ok) return r; const img = Object.values((r.data && r.data.images) || {})[0];
  return img && img.hash ? { ok: true, data: { hash: img.hash, url: img.url || null } } : { ok: false, error: 'no image hash in the answer' };
}
export async function uploadVideo(g, bytes, name, { pollMs = 10000, timeoutMs = 8 * 60000 } = {}) {
  const r = await g.multipart(`${g.act}/advideos`, { name, title: name }, { field: 'source', bytes, type: 'video/mp4', name: name.replace(/[^\w.-]+/g, '-') + '.mp4' });
  if (!r.ok) return r; const id = r.data.id; const t0 = Date.now(); let st = null;
  while (Date.now() - t0 < timeoutMs) {
    const s = await g.get(id, { fields: 'status' }); st = s.ok && s.data.status ? s.data.status.video_status : null;
    if (st === 'ready') return { ok: true, data: { id } };
    if (st === 'error') return { ok: false, error: 'video processing failed in Meta' };
    await sleep(pollMs);
  }
  return { ok: false, error: `video not ready in ${Math.round(timeoutMs / 60000)} min (${st})` };
}
/* link: the landing page; url_tags adds ad={{ad.id}} so the page (and our backend) knows which ad brought the visit */
export async function createCreative(g, { name, pageId, igId, kind, videoId, imageHash, thumbHash, text, headline, link, cta, urlTags }) {
  const call_to_action = { type: cta, value: { link } };
  const story = { page_id: pageId };
  if (igId) story.instagram_user_id = igId;
  if (kind === 'video') story.video_data = { video_id: videoId, image_hash: thumbHash, message: text, title: headline, call_to_action };
  else story.link_data = { image_hash: imageHash, link, message: text, name: headline, call_to_action };
  const body = { name, object_story_spec: story, url_tags: urlTags };
  let r = await g.post(`${g.act}/adcreatives`, body);
  if (!r.ok && igId && /instagram_user_id|instagram/i.test(r.error || '')) { // an older setup: the Page's own Instagram identity
    log(`  creative: ${r.error} — retrying without instagram_user_id`); const s2 = Object.assign({}, story); delete s2.instagram_user_id; r = await g.post(`${g.act}/adcreatives`, Object.assign({}, body, { object_story_spec: s2 }));
  }
  if (!r.ok && cta !== 'LEARN_MORE' && /call_to_action|call to action|cta/i.test(r.error || '')) {
    log(`  creative: ${r.error} — retrying with LEARN_MORE`); return createCreative(g, { name, pageId, igId, kind, videoId, imageHash, thumbHash, text, headline, link, cta: 'LEARN_MORE', urlTags });
  }
  return r.ok ? { ok: true, data: { id: r.data.id } } : r;
}
export async function createAd(g, { name, adsetId, creativeId }) {
  const r = await g.post(`${g.act}/ads`, { name, adset_id: adsetId, creative: { creative_id: creativeId }, status: 'ACTIVE' });
  return r.ok ? { ok: true, data: { id: r.data.id } } : r;
}
export const setStatus = (g, id, status) => g.post(String(id), { status });
export const listAds = (g, adsetId) => g.all(`${adsetId}/ads`, { fields: 'id,name,status,effective_status,created_time,ad_review_feedback' });
const FIELDS = 'ad_id,ad_name,impressions,reach,frequency,spend,inline_link_clicks,actions,video_thruplay_watched_actions';
export const adInsights = (g, adsetId) => g.all(`${adsetId}/insights`, { level: 'ad', fields: FIELDS, date_preset: 'maximum' });
export const adsetTotals = (g, adsetId, q = { date_preset: 'maximum' }) => g.get(`${adsetId}/insights`, Object.assign({ fields: 'impressions,reach,frequency,spend,inline_link_clicks,actions,cpm' }, q));
/* the first hour with impressions of every ad (hourly breakdown in the account's time zone) */
export async function firstImpressions(g, adsetId, since, until, zoned) {
  const r = await g.all(`${adsetId}/insights`, { level: 'ad', fields: 'ad_id,impressions', time_range: { since, until }, time_increment: 1, breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone' }, 5000);
  if (!r.ok) return r; const out = {};
  for (const row of r.data) {
    if (!(Number(row.impressions) > 0)) continue;
    const h = Number(String(row.hourly_stats_aggregated_by_advertiser_time_zone || '').slice(0, 2)); if (!Number.isFinite(h)) continue;
    const t = zoned(row.date_start, h); if (!out[row.ad_id] || t < out[row.ad_id]) out[row.ad_id] = t;
  }
  return { ok: true, data: out };
}
/* audiences to keep after the test: visitors of the landing page (pixel, URL rule) and players from the ads (Lead via the Conversions API) */
export function audienceSpec({ name, pixel, kind, urlPart, days }) {
  const filter = kind === 'leads' ? { operator: 'and', filters: [{ field: 'event', operator: 'eq', value: 'Lead' }] } : { operator: 'and', filters: [{ field: 'url', operator: 'i_contains', value: urlPart }] };
  return { name, rule: { inclusions: { operator: 'or', rules: [{ event_sources: [{ id: pixel, type: 'pixel' }], retention_seconds: days * 86400, filter }] } }, prefill: true };
}
/* people who engaged with our Instagram (ig_business_profile_all: views, likes, comments, saves, profile visits, messages) or our
   Facebook Page (page_engaged) — Meta knows them by itself, nothing of ours is uploaded; the daily Reels fill these */
export function engagementSpec({ name, kind, id, days = 365 }) {
  const src = kind === 'ig' ? { type: 'ig_business', event: 'ig_business_profile_all' } : { type: 'page', event: 'page_engaged' };
  return { name, rule: { inclusions: { operator: 'or', rules: [{ event_sources: [{ id: String(id), type: src.type }], retention_seconds: days * 86400, filter: { operator: 'and', filters: [{ field: 'event', operator: 'eq', value: src.event }] } }] } }, prefill: true };
}
/* a lookalike: the top `ratio` (0.01–0.20) of the country most similar to the seed; Meta needs ≥ 100 people in the seed. From v26 the
   country is ignored (a countryless lookalike) — where it is shown is decided by the ad set, here the city radius */
export const lookalikeSpec = ({ name, origin, ratio, country }) => ({ name, subtype: 'LOOKALIKE', origin_audience_id: String(origin), lookalike_spec: { ratio: Math.min(0.2, Math.max(0.01, Math.round(ratio * 100) / 100)), country } });
export const createAudience = (g, spec) => g.post(`${g.act}/customaudiences`, spec);
export const audienceSize = (g, id) => g.get(String(id), { fields: 'name,approximate_count_lower_bound,approximate_count_upper_bound,operation_status,delivery_status' });
/* usable in an ad set: 200 normal or 441 still filling (Meta allows ads), and delivery not "too small" (300) or blocked (400+) */
export function audienceReady(d) {
  const op = d && d.operation_status ? Number(d.operation_status.code) : 0; const del = d && d.delivery_status ? Number(d.delivery_status.code) : 200;
  return (op === 200 || op === 441) && del === 200;
}
/* lookalikes in the ad set. suggest — Advantage+ audience: Meta starts from the lookalikes and the ages but may show to other people
   when it brings players cheaper; the radius and the minimum age stay hard limits (Meta: age_min 18–25, age_max fixed at 65, the
   ages go to age_range). only — the lookalikes are a hard limit too (a small city slice: can be too narrow) */
export function lookalikeTargeting({ geo, ages, ids, mode }) {
  const t = targetingOf({ geo, ages }); t.custom_audiences = ids.map(id => ({ id: String(id) }));
  if (mode === 'suggest') Object.assign(t, { age_min: Math.min(25, Math.max(18, ages[0])), age_max: 65, age_range: [ages[0], ages[1]], targeting_automation: { advantage_audience: 1 } });
  return t;
}
export async function updateTargeting(g, adsetId, targeting) {
  let t = targeting; let r = await g.post(String(adsetId), { targeting: t });
  if (!r.ok && t.age_range && /age_range/i.test(r.error || '')) { log(`  targeting: ${r.error} — retrying without the age suggestion`); t = Object.assign({}, t); delete t.age_range; r = await g.post(String(adsetId), { targeting: t }); }
  if (!r.ok && t.targeting_automation.advantage_audience === 0 && /advantage|age_max|targeting_automation/i.test(r.error || '')) {
    log(`  targeting: ${r.error} — retrying with Advantage+ audience`); t = Object.assign({}, t, { targeting_automation: { advantage_audience: 1 }, age_max: 65 }); r = await g.post(String(adsetId), { targeting: t });
  }
  return r.ok ? { ok: true, data: { targeting: t, mode: t.targeting_automation.advantage_audience ? 'suggest' : 'only' } } : r;
}
