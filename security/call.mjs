/* The "Security" workflow's client (v44): reads the backend's security report or performs an action, prints Markdown for the commit
   comment. Inputs come from the environment (ACTION, TARGET, HOURS, NOTE, API, BOT_TOKEN) and are validated here — nothing from
   the inputs reaches a shell. The report has no personal data: Telegram ids and IPs arrive only as salted hashes. */
import crypto from 'node:crypto';

const ACTIONS = ['report', 'unlock', 'lockdown_on', 'guard_on', 'guard_off', 'ban', 'unban', 'ack', 'close', 'note', 'rotate_webhook', 'test_alert'];
const env = process.env;
const action = String(env.ACTION || 'report');
const target = String(env.TARGET || '').trim();
const hours = Number(String(env.HOURS || '').trim()) || 0;
const note = String(env.NOTE || '').slice(0, 600);
const fail = m => { console.log('::error::' + m); console.log('**Ошибка:** ' + m); process.exit(1); };
if (!ACTIONS.includes(action)) fail('unknown action ' + action);
if (['ban', 'unban'].includes(action) && !/^(ip:[0-9a-f]{12}|tg:[0-9a-f]{10})$/.test(target)) fail('target must be ip:<12 hex> or tg:<10 hex> from the report');
if (['ack', 'close'].includes(action) && !/^\d{1,9}$/.test(target)) fail('target must be an incident number');
if (action === 'note' && !note.trim()) fail('note is empty');
const key = crypto.createHash('sha256').update(String(env.BOT_TOKEN) + ':mafia-pro-security').digest('hex').slice(0, 48);
console.log('::add-mask::' + key);

async function call(path, body) {
  let last = '';
  for (let i = 1; i <= 4; i++) { // the backend may be deploying in a parallel run
    try {
      const r = await fetch(env.API + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Sec-Key': key }, body: JSON.stringify(body) });
      const txt = await r.text(); last = `HTTP ${r.status} ${txt.slice(0, 300)}`;
      if (r.status < 500 && r.status !== 404) { let d = null; try { d = JSON.parse(txt); } catch (e) {} if (d) return d; }
    } catch (e) { last = String(e && e.message || e); }
    await new Promise(r => setTimeout(r, 20000));
  }
  fail('backend did not answer: ' + last);
}
const when = ts => ts ? new Date(ts * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '—';
const cell = s => String(s == null ? '' : s).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 160);

function render(d) {
  const out = [];
  const mode = d.mode === 'lockdown' ? `🔒 **блокировка** (с ${when(d.lockdown && d.lockdown.at)}, ${cell(d.lockdown && d.lockdown.reason)}, включил: ${cell(d.lockdown && d.lockdown.by)})` : d.mode === 'guard' ? `🛡 **усиленная защита** до ${when(d.guardUntil)}` : '🟢 обычный';
  out.push(`### Режим: ${mode}`, `Окно отчёта: ${d.hours} ч · сформирован ${d.at}${d.webhookSecretRotated ? ' · секрет вебхука заменён после утечки (до следующего деплоя)' : ''}`, '');
  const open = (d.incidents || []).filter(i => i.status === 'open'); const closed = (d.incidents || []).filter(i => i.status !== 'open');
  out.push(`### Открытые инциденты: ${open.length}`);
  if (open.length) { out.push('| # | вид | уровень | начало | последнее | событий | сводка | принят |', '|---|---|---|---|---|---|---|---|'); for (const i of open) out.push(`| ${i.id} | ${i.kind} | ${i.severity} | ${when(i.opened)} | ${when(i.last)} | ${i.count} | ${cell(i.summary)} | ${i.acked ? 'да' : 'нет'} |`); }
  out.push('', `### Закрытые за 7 дней: ${closed.length}`);
  if (closed.length) { out.push('| # | вид | уровень | начало | закрыт | событий | сводка |', '|---|---|---|---|---|---|---|'); for (const i of closed.slice(0, 20)) out.push(`| ${i.id} | ${i.kind} | ${i.severity} | ${when(i.opened)} | ${when(i.closed)} | ${i.count} | ${cell(i.summary)} |`); }
  out.push('', `### События за ${d.hours} ч`);
  if ((d.events || []).length) { out.push('| тип | уровень | событий | адресов | аккаунтов | последнее |', '|---|---|---|---|---|---|'); for (const e of d.events) out.push(`| ${e.type} | ${e.severity} | ${e.n} | ${e.ips} | ${e.accounts} | ${when(e.last)} |`); } else out.push('нет');
  const st = Object.fromEntries((d.stats || []).map(s => [s.key, s]));
  const g = k => (st[k] ? `${st[k].total} (пик ${st[k].peakPerMinute}/мин)` : '0');
  out.push('', '### Трафик', `запросов: ${g('req')} · API: ${g('req:api')} · вебхук: ${g('req:webhook')} · отклонено лимитом: ${g('rl')} · заблокировано: ${g('blocked')} · ошибок 5xx: ${g('5xx')}`);
  const hosts = (d.stats || []).filter(s => s.key.startsWith('host:')).map(s => `${s.key.slice(5)} ${s.total}`).join(' · '); if (hosts) out.push(`по адресам: ${hosts}`);
  if ((d.requestsPerDay || []).length) out.push('по дням: ' + d.requestsPerDay.map(x => `${x.day} ${x.n}`).join(' · '));
  out.push('', '### Источники событий (хэши, без адресов)');
  out.push((d.topIps || []).length ? (d.topIps || []).map(x => `\`${x.ip}\` ${x.n} · ${cell(x.types)} · ${x.country || '?'}`).join('  \n') : 'нет');
  if ((d.topAccounts || []).length) out.push('', 'Аккаунты: ' + d.topAccounts.map(x => `\`${x.account}\` ${x.n} · ${cell(x.types)}`).join('  \n'));
  if ((d.webhookSources || []).length) out.push('', '### Кто стучался в вебхук (сети серверов)', d.webhookSources.map(w => `${w.type} ×${w.n} · AS${w.asn || '?'} ${cell(w.network || '')}`).join('  \n'));
  out.push('', `### Блокировки: ${(d.bans || []).length}`); for (const b of (d.bans || []).slice(0, 20)) out.push(`- \`${b.key}\` до ${when(b.until)} — ${cell(b.reason)} (${cell(b.by)})`);
  out.push('', '### Админ-действия за 7 дней'); out.push((d.adminActions7d || []).length ? d.adminActions7d.map(a => `${a.type} ×${a.n} (последнее ${when(a.last)})`).join(' · ') : 'нет');
  out.push('', `Игроков: ${d.users ? d.users.total : '?'} · новых за сутки: ${d.users ? d.users.new24h : '?'}`);
  out.push('', '<details><summary>JSON</summary>', '', '```json', JSON.stringify(d, null, 1).slice(0, 30000), '```', '</details>');
  return out.join('\n');
}

const body = action === 'report' ? { hours: hours || 24 } : { action, target, hours: hours || undefined, minutes: action === 'guard_on' ? hours || 60 : undefined, note };
const d = await call(action === 'report' ? '/sec/report' : '/sec/act', body);
if (action === 'report') { if (!d.ok) fail('report failed: ' + JSON.stringify(d).slice(0, 300)); console.log(render(d)); }
else {
  console.log(`### ${action}${target ? ' ' + target : ''}: ${d.ok ? 'выполнено' : 'не выполнено'}`);
  console.log('```json\n' + JSON.stringify(d, null, 1).slice(0, 4000) + '\n```');
  if (!d.ok) process.exit(1);
  const r = await call('/sec/report', { hours: 24 }); if (r && r.ok) console.log('\n' + render(r)); // the state after the action
}
