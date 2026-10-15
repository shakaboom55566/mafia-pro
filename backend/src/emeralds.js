/* v63: emeralds — the in-game currency. Won at the weekly tournament (tournament.js), bought for Telegram Stars in the shop's
   «Emeralds» tab, spent on Epic card skins. The same catalog of packs is in the app (src/15-emeralds.js); backend/test/run.js
   checks they agree.
   - balance: emeralds (tg_id → balance) kept in step with emerald_ledger (every change: +pack, +bonus, −skin, +prize, ±admin)
   - packs: 50 Stars ≈ $1 as everywhere in the shop; 7 500 emeralds = $39.99 (the owner's anchor), bigger packs give more per dollar
   - first purchase of each pack gives a bonus: ≤ $4.99 → +100 %, ≤ $40 → +40 %, ≤ $99.99 → +20 %; later purchases of the same pack — none
   - prizes: a fund (10 000 by default) split by the number of players who played: places 1–3 ≥ 2 000, 4–10 ≥ 500, 11–15 ≥ 100 */
/* packs:begin — the same list as EM_PACKS in src/15-emeralds.js */
export const PACKS = [
  { id: 'em_s', usd: 0.99, stars: 50, emeralds: 150 },
  { id: 'em_m', usd: 1.99, stars: 100, emeralds: 320 },
  { id: 'em_l', usd: 4.99, stars: 250, emeralds: 850 },
  { id: 'em_xl', usd: 9.99, stars: 500, emeralds: 1800 },
  { id: 'em_2xl', usd: 19.99, stars: 1000, emeralds: 3700 },
  { id: 'em_3xl', usd: 39.99, stars: 2000, emeralds: 7500 },
  { id: 'em_4xl', usd: 59.99, stars: 3000, emeralds: 11600 },
  { id: 'em_5xl', usd: 99.99, stars: 5000, emeralds: 20000 }
];
/* the first purchase of a pack: the bonus share by the pack's price */
export const firstBonusPct = usd => (usd <= 4.99 ? 100 : usd <= 40 ? 40 : 20);
export const EPIC_PRICE = 7500; // an Epic skin in emeralds (overridable: EMERALDS_EPIC var)
export const PRIZE_FUND = 10000; // the weekly tournament's fund (overridable per tournament by the admin; EMERALDS_FUND var sets the default)
/* the prize of each place for n players who played, from a fund: floors first (1–3: 2 000, 4–10: 500, 11–15: 100), what is left goes
   to the top three as 50 / 30 / 20 %; a fund that cannot even cover the floors is split in the floors' proportion */
export function prizeTable(n, fund) {
  n = Math.max(0, Math.floor(Number(n) || 0)); fund = Math.max(0, Math.floor(Number(fund) || 0));
  const floors = []; for (let i = 0; i < Math.min(n, 15); i++) floors.push(i < 3 ? 2000 : i < 10 ? 500 : 100);
  if (!floors.length) return [];
  const base = floors.reduce((a, b) => a + b, 0);
  if (fund <= base) { // not enough for the floors: everything in proportion, rounded down to tens, the remainder to the first place
    const out = floors.map(f => Math.floor(fund * f / base / 10) * 10); out[0] += fund - out.reduce((a, b) => a + b, 0); return out;
  }
  const extra = fund - base; const share = [0.5, 0.3, 0.2].slice(0, Math.min(3, n)); const sum = share.reduce((a, b) => a + b, 0);
  const out = floors.slice(); let given = 0;
  share.forEach((s, i) => { const v = Math.floor(extra * s / sum / 10) * 10; out[i] += v; given += v; });
  out[0] += extra - given; // rounding remainder to the winner
  return out;
}
/* packs:end */
export const PACK = Object.fromEntries(PACKS.map(p => [p.id, p]));
export const isPack = id => typeof id === 'string' && Object.prototype.hasOwnProperty.call(PACK, id);
export function epicPrice(env) { const v = Number(env && env.EMERALDS_EPIC); return Number.isFinite(v) && v > 0 ? Math.round(v) : EPIC_PRICE; }
export function defaultFund(env) { const v = Number(env && env.EMERALDS_FUND); return Number.isFinite(v) && v > 0 ? Math.round(v) : PRIZE_FUND; }
const now = () => Math.floor(Date.now() / 1000);
const int = x => { const v = Math.trunc(Number(x)); return Number.isSafeInteger(v) ? v : 0; };

export async function balanceOf(env, tgId) {
  const r = await env.DB.prepare('SELECT balance FROM emeralds WHERE tg_id = ?1').bind(tgId).first();
  return r ? int(r.balance) : 0;
}
/* the statements of one change (the caller batches them with its own, so a purchase and its payment are one transaction);
   kind: pack | bonus | skin | prize | admin | refund; ref: the pack / skin / tournament id for the ledger */
export function changeStmts(env, tgId, delta, kind, ref, ts) {
  delta = int(delta); ts = ts || now();
  return [
    env.DB.prepare('INSERT INTO emeralds (tg_id, balance, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(tg_id) DO UPDATE SET balance = balance + ?2, updated_at = ?3').bind(tgId, delta, ts),
    env.DB.prepare('INSERT INTO emerald_ledger (tg_id, delta, kind, ref, created_at) VALUES (?1, ?2, ?3, ?4, ?5)').bind(tgId, delta, String(kind).slice(0, 16), ref == null ? null : String(ref).slice(0, 64), ts)
  ];
}
export async function addEmeralds(env, tgId, delta, kind, ref, ts) {
  await env.DB.batch(changeStmts(env, tgId, delta, kind, ref, ts));
  return balanceOf(env, tgId);
}
/* the packs this player has already bought (paid) — their first-purchase bonus is spent */
export async function boughtPacks(env, tgId) {
  const rows = (await env.DB.prepare("SELECT DISTINCT item FROM purchases WHERE tg_id = ?1 AND kind = 'emeralds' AND status = 'paid'").bind(tgId).all()).results || [];
  return rows.map(r => r.item).filter(isPack);
}
/* what a paid pack gives: the emeralds and, the first time, the bonus */
export function packGrant(pack, first) {
  const bonus = first ? Math.round(pack.emeralds * firstBonusPct(pack.usd) / 100) : 0;
  return { emeralds: pack.emeralds, bonus, total: pack.emeralds + bonus };
}
/* the last entries of the ledger for the app */
export async function ledgerOf(env, tgId, limit = 30) {
  const rows = (await env.DB.prepare('SELECT delta, kind, ref, created_at FROM emerald_ledger WHERE tg_id = ?1 ORDER BY id DESC LIMIT ?2').bind(tgId, Math.max(1, Math.min(100, limit | 0))).all()).results || [];
  return rows.map(r => ({ delta: r.delta, kind: r.kind, ref: r.ref || '', at: r.created_at * 1000 }));
}
/* the account's emeralds for /api/me: the balance, the packs already bought once (no bonus any more), the prices */
export async function emeraldsInfo(env, tgId) {
  return { balance: await balanceOf(env, tgId), bought: await boughtPacks(env, tgId), epic: epicPrice(env) };
}
