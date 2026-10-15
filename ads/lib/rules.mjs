/* The judge of the hourly check (pure functions, no network): which ad has had its 6 daytime hours, which one is weak and why,
   which one to pause, how many new ones to launch, and which brief goes next. Times are milliseconds; the clock is Kyiv's.
   An ad is judged only after `day_hours` hours inside the delivery window (09:00–24:00 Kyiv) since its first impression and with
   at least `min_impressions` impressions: fewer is noise, not a signal. */

export const TZ = 'Europe/Kiev';
export const DEFAULT_RULES = {
  day_hours: 6,             // daytime hours an ad gets before it is judged
  min_impressions: 500,     // …and impressions
  dead_hours: 12,           // daytime hours after which an ad Meta barely shows counts as "not going"
  dead_impressions: 250,
  hook_floor: 0.20,         // video: 3-second views / impressions
  ctr_floor: 0.007,         // link clicks / impressions
  cost_ratio: 1.5,          // cost per landing page view vs the ad set's average
  max_swaps_per_check: 1,   // one change at a time: every new ad makes Meta re-learn
  max_launches_per_day: 4,  // Gemini spend and the learning phase
  min_live: 2               // never fewer running ads than this (the best one is never paused)
};
export const LIVE = new Set(['ACTIVE', 'PREAPPROVED']);
export const PENDING = new Set(['PENDING_REVIEW', 'IN_PROCESS']);
export const PROBLEM = new Set(['DISAPPROVED', 'WITH_ISSUES']);

export function kyivParts(ms, tz = TZ) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute), weekday: p.weekday };
}
/* the UTC milliseconds of a wall-clock time in a time zone (date 'YYYY-MM-DD', hour 0–24) */
export function zonedMs(date, hour, tz = TZ, minute = 0) {
  const [y, m, d] = date.split('-').map(Number);
  const want = Date.UTC(y, m - 1, d, hour, minute); let t = want;
  for (let i = 0; i < 3; i++) { const p = kyivParts(t, tz); const [py, pm, pd] = p.date.split('-').map(Number); t += want - Date.UTC(py, pm - 1, pd, p.hour, p.minute); }
  return t;
}
export const inWindow = (ms, [h0, h1] = [9, 24], tz = TZ) => { const h = kyivParts(ms, tz).hour; return h >= h0 && h < h1; };
/* hours inside the daily window between two moments (5-minute steps) */
export function dayHours(fromMs, toMs, win = [9, 24], tz = TZ) {
  if (!fromMs || toMs <= fromMs) return 0;
  let n = 0; for (let t = fromMs; t < toMs; t += 300000) if (inWindow(t, win, tz)) n++;
  return n / 12;
}

const act = (arr, ...types) => (arr || []).reduce((s, a) => s + (types.includes(a.action_type) ? Number(a.value) || 0 : 0), 0);
/* one row of ad-level insights (+ players from our backend) → the numbers the judge uses */
export function metricsOf(row = {}, players = {}) {
  const imp = Number(row.impressions) || 0, spend = Number(row.spend) || 0;
  const clicks = Number(row.inline_link_clicks) || act(row.actions, 'link_click');
  const lpv = act(row.actions, 'landing_page_view'); const v3 = act(row.actions, 'video_view');
  const thru = act(row.video_thruplay_watched_actions, 'video_view') || act(row.actions, 'video_thruplay_watched');
  const eng = act(row.actions, 'post_reaction', 'comment', 'post', 'onsite_conversion.post_save');
  return { imp, reach: Number(row.reach) || 0, spend, clicks, lpv, v3, thru, eng, newPlayers: players.newPlayers || 0, played: players.played || 0, starts: players.starts || 0, visits: players.visits || 0,
    hook: imp ? v3 / imp : 0, ctr: imp ? clicks / imp : 0, cpl: lpv ? spend / lpv : null, cpc: clicks ? spend / clicks : null, engRate: imp ? eng / imp * 1000 : 0, cpp: players.newPlayers ? spend / players.newPlayers : null };
}
export function baseline(ms) {
  const big = ms.filter(m => m.imp >= 300); const sum = k => big.reduce((s, m) => s + m[k], 0);
  const imp = sum('imp'), spend = sum('spend'), lpv = sum('lpv'), clicks = sum('clicks'), players = sum('newPlayers');
  const hooks = big.filter(m => m.kind === 'video').map(m => m.hook);
  return { n: big.length, ctr: imp ? clicks / imp : 0, cpl: lpv ? spend / lpv : null, cpc: clicks ? spend / clicks : null, engRate: imp ? sum('eng') / imp * 1000 : 0, bestHook: hooks.length ? Math.max(...hooks) : 0, cpp: players ? spend / players : null, withLpv: big.filter(m => m.lpv > 0).length };
}
const pct = x => `${(x * 100).toFixed(x < 0.1 ? 1 : 0).replace('.', ',')} %`;
const usd = x => `$${x.toFixed(2).replace('.', ',')}`;

/* the reasons an ad that had its hours is weak (empty = fine) */
export function weaknesses(m, base, r = DEFAULT_RULES) {
  const why = []; const codes = new Set();
  if (m.kind === 'video') {
    if (m.hook < r.hook_floor) { why.push(`досматривают первые 3 с только ${pct(m.hook)} (порог ${pct(r.hook_floor)})`); codes.add('hook'); }
    else if (base.bestHook && m.hook < 0.6 * base.bestHook) { why.push(`досмотр 3 с ${pct(m.hook)} — у лучшего ${pct(base.bestHook)}`); codes.add('hook'); }
  }
  if (m.ctr < r.ctr_floor) { why.push(`кликают ${pct(m.ctr)} (порог ${pct(r.ctr_floor)})`); codes.add('ctr'); }
  else if (base.n >= 2 && base.ctr && m.ctr < 0.6 * base.ctr) { why.push(`кликают ${pct(m.ctr)} при среднем ${pct(base.ctr)}`); codes.add('ctr'); }
  if (base.withLpv >= 2 && base.cpl) {
    if (m.lpv && m.cpl > r.cost_ratio * base.cpl) { why.push(`переход ${usd(m.cpl)} при среднем ${usd(base.cpl)}`); codes.add('cost'); }
    else if (!m.lpv && m.spend >= 2 * base.cpl) { why.push(`ни одного перехода за ${usd(m.spend)}`); codes.add('cost'); }
  }
  if (base.n >= 2 && base.engRate > 0 && m.engRate < 0.5 * base.engRate) { why.push(`почти нет реакций (${m.engRate.toFixed(1).replace('.', ',')} на 1000 показов)`); codes.add('eng'); }
  if (base.cpp && m.spend >= 2.5 * base.cpp && !m.newPlayers) { why.push(`ни одного игрока за ${usd(m.spend)} (в среднем игрок ${usd(base.cpp)})`); codes.add('players'); }
  const severe = (m.kind === 'video' && m.hook < 0.10) || m.ctr < r.ctr_floor / 2 || (codes.has('players') && codes.size >= 2);
  return { why, codes: [...codes], bad: codes.size >= 2 || severe };
}

/* ads: [{ id, name, status, created (ms), first (ms of the first impression or null), kind, brief, hook, angle, m (metricsOf) }]
   → { verdicts, best, pause: [id], launch: n, notes } */
export function decide({ ads, now, rules = DEFAULT_RULES, win = [9, 24], tz = TZ, target = 3, launchesToday = 0, history = [] }) {
  const r = Object.assign({}, DEFAULT_RULES, rules || {});
  const live = ads.filter(a => LIVE.has(a.status)); const pending = ads.filter(a => PENDING.has(a.status)); const problem = ads.filter(a => PROBLEM.has(a.status));
  const base = baseline(ads.concat(history).filter(a => a.m).map(a => Object.assign({ kind: a.kind }, a.m)));
  const daytime = inWindow(now, win, tz);
  const verdicts = [];
  for (const a of live) {
    const m = Object.assign({ kind: a.kind }, a.m || metricsOf());
    const hrs = dayHours(a.first || a.created, now, win, tz); const since = dayHours(a.created, now, win, tz);
    const v = { id: a.id, brief: a.brief, kind: a.kind, hours: Number(hrs.toFixed(1)), m, why: [], codes: [] };
    if (!a.first && since >= r.dead_hours) Object.assign(v, { verdict: 'dead', why: [`Meta не показывает его ${Math.round(since)} дневных часов`], codes: ['dead'] });
    else if (since >= r.dead_hours && m.imp < r.dead_impressions && hrs >= r.day_hours) Object.assign(v, { verdict: 'dead', why: [`всего ${m.imp} показов за ${Math.round(hrs)} дневных часов — Meta почти не показывает`], codes: ['dead'] });
    else if (hrs < r.day_hours) Object.assign(v, { verdict: 'wait', why: [`${v.hours} из ${r.day_hours} дневных часов`] });
    else if (m.imp < r.min_impressions) Object.assign(v, { verdict: 'wait', why: [`${m.imp} из ${r.min_impressions} показов`] });
    else { const w = weaknesses(m, base, r); Object.assign(v, { verdict: w.bad ? 'bad' : 'ok', why: w.why, codes: w.codes }); }
    verdicts.push(v);
  }
  for (const a of pending) verdicts.push({ id: a.id, brief: a.brief, kind: a.kind, verdict: 'pending', why: ['на проверке Meta'], codes: [], m: a.m || metricsOf() });
  for (const a of problem) verdicts.push({ id: a.id, brief: a.brief, kind: a.kind, verdict: 'rejected', why: [a.reason || 'Meta отклонила объявление'], codes: ['rejected'], m: a.m || metricsOf() });
  // the best running ad (cheapest landing page view, then most clicks per impression): never paused
  const scored = verdicts.filter(v => (v.verdict === 'ok' || v.verdict === 'bad' || v.verdict === 'wait') && v.m.imp >= 300);
  const best = scored.slice().sort((x, y) => (x.m.cpl == null) - (y.m.cpl == null) || (x.m.cpl || 0) - (y.m.cpl || 0) || y.m.ctr - x.m.ctr)[0] || null;
  if (best) best.best = true;
  const notes = [];
  let pause = [];
  if (daytime) {
    const cand = verdicts.filter(v => (v.verdict === 'bad' || v.verdict === 'dead') && !v.best)
      .sort((x, y) => (y.verdict === 'dead') - (x.verdict === 'dead') || y.codes.length - x.codes.length || (y.m.cpl || 99) - (x.m.cpl || 99));
    const running = verdicts.filter(v => ['ok', 'bad', 'wait', 'dead'].includes(v.verdict)).length;
    for (const v of cand) {
      if (pause.length >= r.max_swaps_per_check) break;
      if (running - pause.length - 1 < r.min_live && v.verdict !== 'dead') { notes.push(`${v.brief}: слабое, но останется меньше ${r.min_live} объявлений — сначала дождусь замены`); continue; }
      pause.push(v.id);
    }
  } else notes.push('ночь: объявления не оцениваю, только поддерживаю их число');
  const after = verdicts.filter(v => ['ok', 'bad', 'wait', 'dead', 'pending'].includes(v.verdict) && !pause.includes(v.id)).length;
  const room = Math.max(0, r.max_launches_per_day - launchesToday);
  const first = !ads.length; // the start: the whole first set at once
  let launch = Math.min(Math.max(0, target - after), first ? target : 1, room);
  // a weak one waiting for its replacement: launch the replacement now so it can be paused next time
  if (!launch && daytime && !pause.length && verdicts.some(v => (v.verdict === 'bad' || v.verdict === 'dead') && !v.best) && !pending.length && room > 0 && after < target + 1) launch = 1;
  if (room === 0 && target > after) notes.push(`лимит ${r.max_launches_per_day} новых объявлений в сутки — следующие завтра`);
  return { verdicts, best: best ? best.id : null, pause, launch, notes, base, daytime };
}

/* which brief next: the queue in file order, scored by what failed (a different opening after weak views, the winner's hook after weak
   clicks, the kind that works), hook types that keep losing pushed back. Empty queue → null (the caller makes a new take of the best). */
export function pickBrief(queue, { lost = [], winner = null } = {}) {
  if (!queue.length) return null;
  const lostHooks = {}; for (const l of lost) lostHooks[l.hook] = (lostHooks[l.hook] || 0) + 1;
  const last = lost[lost.length - 1] || null; const codes = new Set(last ? last.codes || [] : []);
  const score = b => {
    let s = 0;
    if (last && (codes.has('hook') || codes.has('dead')) && b.hook && b.hook !== last.hook) s += 2;
    if (winner && (codes.has('ctr') || codes.has('cost') || codes.has('players')) && b.hook === winner.hook) s += 2;
    if (winner && b.kind === winner.kind) s += 1;
    if ((lostHooks[b.hook] || 0) >= 2) s -= 3;
    return s;
  };
  return queue.map((b, i) => ({ b, s: score(b), i })).sort((x, y) => y.s - x.s || x.i - y.i)[0].b;
}

export const fmt = { pct, usd };
