/* Cloudflare zone protection for mafiapro.app (v44) — the "edge" action of the Security workflow.
   Blocks floods before they reach the worker (requests stopped by a zone rule do not count against the Workers daily limit):
   - HTTPS only, TLS 1.2+, security level "medium";
   - a rate-limiting rule: more than 300 requests in 10 s from one address to /api/ → blocked for 10 s
     (Telegram's webhook is not under /api/, so it is never touched; a club of 20 players on one Wi-Fi makes ~20 per 10 s).
   Token: CLOUDFLARE_SECURITY_TOKEN if set, else CLOUDFLARE_API_TOKEN. It needs, for the zone mafiapro.app:
   Zone → Zone Settings: Edit and Zone → Zone WAF: Edit (rate-limiting rules). Without them the script says what is missing. */
const TOKEN = process.env.CLOUDFLARE_SECURITY_TOKEN || process.env.CLOUDFLARE_API_TOKEN || '';
const ZONE = process.env.ZONE_NAME || 'mafiapro.app';
const API = 'https://api.cloudflare.com/client/v4';
const out = []; const log = s => { out.push(s); console.log(s); };
async function cf(method, path, body) {
  try {
    const r = await fetch(API + path, { method, headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    return { status: r.status, ok: r.ok && d.success !== false, d, err: (d.errors || []).map(e => `${e.code} ${e.message}`).join('; ') };
  } catch (e) { return { status: 0, ok: false, d: {}, err: String(e && e.message || e) }; }
}
const RULE_NAME = 'mafia-pro: API flood (v44)';
const EXPRESSIONS = [ // free plans accept fewer fields: the first one Cloudflare takes is used
  '(http.host eq "api.mafiapro.app" and starts_with(http.request.uri.path, "/api/"))',
  '(starts_with(http.request.uri.path, "/api/"))',
  '(http.request.uri.path wildcard "/api/*")',
  '(http.request.uri.path contains "/api/")'
];
let missing = false;
if (!TOKEN) { log('**Нет токена Cloudflare** (секрет CLOUDFLARE_API_TOKEN или CLOUDFLARE_SECURITY_TOKEN).'); process.exit(1); }
log(`### Защита зоны ${ZONE} на Cloudflare`);
const z = await cf('GET', `/zones?name=${encodeURIComponent(ZONE)}`);
const zone = z.ok && z.d.result && z.d.result[0];
if (!zone) { log(`Зона не найдена или токену не хватает прав на чтение зоны (HTTP ${z.status} ${z.err}).`); missing = true; }
else {
  log(`Зона: ${zone.name} · тариф: ${(zone.plan && zone.plan.name) || '?'} · статус: ${zone.status}`);
  for (const [k, v, ru] of [['always_use_https', 'on', 'только HTTPS'], ['min_tls_version', '1.2', 'TLS не ниже 1.2'], ['security_level', 'medium', 'уровень защиты «средний»']]) {
    const r = await cf('PATCH', `/zones/${zone.id}/settings/${k}`, { value: v });
    if (r.ok) log(`✅ ${ru}`); else { log(`⚠️ ${ru}: не удалось (HTTP ${r.status} ${r.err})`); if (r.status === 403 || /10000|9109/.test(r.err)) missing = true; }
  }
  const cur = await cf('GET', `/zones/${zone.id}/rulesets/phases/http_ratelimit/entrypoint`);
  const others = cur.ok && cur.d.result && Array.isArray(cur.d.result.rules) ? cur.d.result.rules.filter(r => r.description !== RULE_NAME) : [];
  if (!cur.ok && cur.status === 403) missing = true;
  let done = false, lastErr = '';
  for (const expression of EXPRESSIONS) {
    const rule = { description: RULE_NAME, expression, action: 'block', ratelimit: { characteristics: ['cf.colo.id', 'ip.src'], period: 10, requests_per_period: 300, mitigation_timeout: 10 } };
    const r = await cf('PUT', `/zones/${zone.id}/rulesets/phases/http_ratelimit/entrypoint`, { rules: others.map(x => ({ id: x.id, description: x.description, expression: x.expression, action: x.action, ratelimit: x.ratelimit, enabled: x.enabled })).concat([rule]) });
    if (r.ok) { log(`✅ правило против флуда: > 300 запросов за 10 с с одного адреса к /api/ → блок на 10 с (${expression})`); done = true; break; }
    lastErr = `HTTP ${r.status} ${r.err}`; if (r.status === 403 || /10000|9109/.test(r.err)) { missing = true; break; }
  }
  if (!done) log(`⚠️ правило против флуда не создано: ${lastErr}`);
}
if (missing) log('\n**Токену не хватает прав.** Cloudflare → My Profile → API Tokens → Create Token → Custom: зона mafiapro.app, права Zone → Zone Settings: Edit и Zone → Zone WAF: Edit (и Zone → Zone: Read). Сохраните как секрет репозитория CLOUDFLARE_SECURITY_TOKEN и запустите Security → edge снова. Основной CLOUDFLARE_API_TOKEN трогать не нужно.');
