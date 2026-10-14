#!/usr/bin/env node
/* Checks ops/usage.mjs without network: GraphQL rows → totals, thresholds once a day, the pace forecast, messages,
   a token without analytics access, nothing numeric in the log. Run: node ops/test-usage.mjs */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; process.stdout.write('✗ ' + m + '\n'); } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-usage-'));
Object.assign(process.env, { CLOUDFLARE_API_TOKEN: 'cf', CLOUDFLARE_ACCOUNT_ID: 'acc', BOT_TOKEN: 'bt', STATE_FILE: path.join(tmp, 's.json'), CF_GRAPHQL: 'http://cf/graphql', TG_API: 'http://tg' });
const U = await import('./usage.mjs');
const now = Date.UTC(2026, 9, 14, 15, 13); const day = Date.UTC(2026, 9, 14);
let hours = { api: [], site: [] }; let d1 = { rowsRead: 1000, rowsWritten: 50 }; let denied = false; const sent = []; const logs = [];
const H = h => new Date(day + h * 36e5).toISOString();
globalThis.fetch = async (url, o) => {
  const b = JSON.parse(o.body);
  if (url.startsWith('http://tg')) { sent.push(b); return { ok: true, status: 200, json: async () => ({ ok: true }) }; }
  if (denied) return { ok: true, status: 200, json: async () => ({ data: null, errors: [{ message: 'not authorized for that account' }] }) };
  if (/workersInvocationsAdaptive/.test(b.query)) { ok(b.variables.acc === 'acc' && b.variables.from.startsWith('2026-10-'), 'variables'); const rows = []; for (const [s, arr] of Object.entries(hours)) arr.forEach((n, h) => n && rows.push({ sum: { requests: n, errors: s === 'api' ? 1 : 0 }, dimensions: { scriptName: 'mafia-pro-' + s, datetimeHour: H(h) } })); return { ok: true, json: async () => ({ data: { viewer: { accounts: [{ workersInvocationsAdaptive: rows }] } } }) }; }
  return { ok: true, json: async () => ({ data: { viewer: { accounts: [{ d1AnalyticsAdaptiveGroups: [{ sum: d1, dimensions: { date: '2026-10-14' } }] }] } } }) };
};
const origLog = console.log; console.log = s => logs.push(String(s));
// quiet day: 15 h × 2 000 = 30 000 (30 %), pace far from the limit
hours.api = Array(15).fill(1800); hours.site = Array(15).fill(200);
let r = await U.run('check', now); ok(r === 'ok' && !sent.length, 'quiet day: no message');
// busy: 75 % → one 70 % alert; again an hour later → nothing new
hours.api = Array(15).fill(4800); hours.site = Array(15).fill(200);
r = await U.run('check', now); ok(r === 'alert' && sent.length === 1 && /75 %/.test(sent[0].text) && /из 100 000/.test(sent[0].text) && sent[0].chat_id === '6462266188', '70 % alert to the admin: ' + (sent[0] && sent[0].text.split('\n')[2]));
ok(/закончится раньше сброса/.test(sent[0].text), 'pace forecast in the same message (5 000/h × ~8.8 h left)');
r = await U.run('check', now + 36e5); ok(r === 'ok' && sent.length === 1, 'the same threshold is not repeated the same day');
// 92 % → the 90 % alert; D1 writes over 70 % too
hours.api = Array(15).fill(5933); d1 = { rowsRead: 1000, rowsWritten: 80000 };
r = await U.run('check', now + 2 * 36e5); ok(r === 'alert' && sent.length === 2 && /92 %/.test(sent[1].text) && /Записей строк D1: 80 000/.test(sent[1].text), '90 % + D1 writes 80 %');
// next day: state starts again
hours.api = Array(15).fill(4800); d1 = { rowsRead: 1000, rowsWritten: 50 };
r = await U.run('check', now + 24 * 36e5); ok(r === 'alert' && sent.length === 3, 'a new day alerts again');
// status and weekly
r = await U.run('status', now); ok(r === 'status' && /Cloudflare сегодня/.test(sent[3].text) && /mafia-pro-api/.test(sent[3].text) && /Ошибки воркеров: 15/.test(sent[3].text), 'status message');
hours.api = Array(24).fill(1000); hours.site = Array(24).fill(100);
r = await U.run('weekly', now); ok(r === 'weekly' && /за неделю/.test(sent[4].text) && (sent[4].text.match(/ — 26 400 \(26 %\)/g) || []).length === 7, 'weekly: 7 days, 26 400 a day');
// a token without the analytics permission: says what to add, sends nothing
denied = true; r = await U.run('check', now + 48 * 36e5); ok(r === 'error' && sent.length === 5 && logs.some(l => /Account Analytics → Read/.test(l)), 'missing permission explained');
// the public log never carries numbers of use
ok(!logs.some(l => /\d{3}/.test(l.replace(/\d+ admin/, ''))), 'no numbers in the log: ' + logs.join(' | '));
console.log = origLog;
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`usage: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
