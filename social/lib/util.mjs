/* Shared helpers for the Social workflow: a log that never prints secrets, fetch with retries, sleeping. */
import fs from 'node:fs';

const SECRETS = new Set();
export function secret(v) {
  const s = String(v || ''); if (s.length < 6 || SECRETS.has(s)) return;
  SECRETS.add(s); if (process.env.GITHUB_ACTIONS) console.log(`::add-mask::${s}`); // GitHub hides it in the run log too
}
export function clean(s) {
  let out = String(s);
  for (const v of SECRETS) out = out.split(v).join('<secret>');
  return out.replace(/bot\d{6,}:[A-Za-z0-9_-]{20,}/g, 'bot<token>').replace(/([?&](?:access_token|key|client_secret)=)[^&\s"]+/g, '$1<secret>');
}
export function log(...a) {
  const line = clean(a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
  console.log(line); if (process.env.LOG) { try { fs.appendFileSync(process.env.LOG, line + '\n'); } catch (e) {} }
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));

/* fetch → { status, json, text }; retries network errors, 429 and 5xx (not other 4xx) */
export async function http(url, init = {}, { tries = 3, wait = 4000, label = '' } = {}) {
  let last = null;
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, init); const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch (e) {}
      last = { status: r.status, json, text, headers: r.headers };
      if (r.status !== 429 && r.status < 500) return last;
    } catch (e) { last = { status: 0, json: null, text: String(e && e.message || e) }; }
    if (i < tries) { log(`  ${label || 'request'}: ${last.status || 'network'} — retry ${i}/${tries - 1}`); await sleep(wait * i); }
  }
  return last;
}
export async function binary(url, init = {}, { tries = 3 } = {}) {
  for (let i = 1; i <= tries; i++) {
    try { const r = await fetch(url, init); if (r.ok) return Buffer.from(await r.arrayBuffer()); if (r.status < 500 && r.status !== 429) throw new Error(`HTTP ${r.status}`); }
    catch (e) { if (i === tries || /HTTP 4/.test(e.message)) throw e; }
    await sleep(3000 * i);
  }
  throw new Error('download failed');
}
export const short = (s, n = 300) => { s = clean(s == null ? '' : typeof s === 'string' ? s : JSON.stringify(s)); return s.length > n ? s.slice(0, n) + '…' : s; };
