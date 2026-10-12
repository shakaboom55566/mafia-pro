// Greedy composition search: for each table size, finds a composition with mafia win rate close to 50%.
const fs = require('fs');
const { evaluate, E } = require('./montecarlo.js');
const BLACK_POOL = ['gunsmith', 'kamikaze', 'executioner', 'spy', 'mafia_doctor', 'balamut', 'mafia'];
const RED_POOL = ['journalist', 'mayor', 'thief', 'monk', 'drunk', 'altruist', 'miller', 'azazel', 'morpheus', 'rabbi', 'bomb', 'bodyguard', 'judge'];
const FIXED = ['don', 'sheriff', 'doctor'];
const isB = id => E.ROLE[id].team === 'black';
const isR = id => E.ROLE[id].team === 'red';
function valid(c, n) {
  if (c.length !== n) return false;
  const dons = c.filter(x => x === 'don').length;
  if (n >= E.TWO_FAMILIES_FROM ? dons !== 2 : dons !== 1) return false;
  const counts = {}; c.forEach(x => counts[x] = (counts[x] || 0) + 1);
  if (Object.keys(counts).some(k => counts[k] > 1 && k !== 'mafia' && k !== 'don')) return false;
  const black = c.filter(isB).length;
  if (black / n < 0.2 || black / n > 0.46) return false;
  if (!c.includes('sheriff') || !c.includes('doctor')) return false;
  return true;
}
function neighbors(c, n) {
  const out = []; const seen = new Set([c.slice().sort().join()]);
  const push = x => { const k = x.slice().sort().join(); if (!seen.has(k) && valid(x, n)) { seen.add(k); out.push(x); } };
  const rep = (i, r) => { const x = c.slice(); x[i] = r; return x; };
  c.forEach((id, i) => {
    if (FIXED.includes(id)) return;
    const team = E.ROLE[id].team;
    if (team === 'black') { RED_POOL.forEach(r => push(rep(i, r))); BLACK_POOL.forEach(b => push(rep(i, b))); push(rep(i, 'werewolf')); push(rep(i, 'maniac')); }
    if (team === 'red') { BLACK_POOL.forEach(b => push(rep(i, b))); RED_POOL.forEach(r => push(rep(i, r))); push(rep(i, 'maniac')); push(rep(i, 'jester')); push(rep(i, 'werewolf')); }
    if (team === 'neutral' || team === 'ww') { RED_POOL.forEach(r => push(rep(i, r))); BLACK_POOL.forEach(b => push(rep(i, b))); if (id !== 'maniac') push(rep(i, 'maniac')); }
  });
  return out;
}
const dist = r => Math.abs(r.mafia - 50) + 0.2 * r.maniac + 0.3 * r.jester;
function changes(a, b) { const x = a.slice(); let d = 0; b.forEach(id => { const i = x.indexOf(id); if (i >= 0) x.splice(i, 1); else d++; }); return d; }

const RED13 = ['sheriff', 'doctor', 'journalist', 'mayor', 'thief', 'monk', 'drunk', 'altruist', 'miller', 'azazel', 'morpheus', 'rabbi', 'bomb'];
const SEED = {
  20: ['don', 'gunsmith', 'kamikaze', 'executioner', 'don', 'mafia_doctor', 'balamut', 'spy', ...RED13.slice(0, 12)],
  21: ['don', 'gunsmith', 'kamikaze', 'executioner', 'don', 'mafia_doctor', 'balamut', 'spy', 'maniac', ...RED13.slice(0, 12)],
  22: ['don', 'gunsmith', 'kamikaze', 'executioner', 'don', 'mafia_doctor', 'balamut', 'spy', 'maniac', 'werewolf', ...RED13.slice(0, 12)],
  23: ['don', 'gunsmith', 'kamikaze', 'executioner', 'mafia', 'don', 'mafia_doctor', 'balamut', 'spy', 'maniac', 'werewolf', ...RED13.slice(0, 12)],
  24: ['don', 'gunsmith', 'kamikaze', 'executioner', 'mafia', 'don', 'mafia_doctor', 'balamut', 'spy', 'maniac', 'werewolf', ...RED13]
};
function tune(n, log = console.log) {
  const base = E.presetFor(n);
  let cur = base, curR = evaluate(n, cur, 1200); const baseR = curR;
  log(`N=${n} base: mafia ${curR.mafia}% city ${curR.city}% maniac ${curR.maniac}%`);
  const maxIter = n >= 20 ? 6 : 4;
  for (let it = 0; it < maxIter && dist(curR) > 2.5; it++) {
    const nb = neighbors(cur, n);
    const scored = nb.map(c => ({ c, r: evaluate(n, c, 250) }));
    scored.sort((a, b) => dist(a.r) - dist(b.r) || changes(base, a.c) - changes(base, b.c));
    const top = scored.slice(0, 6).map(s => ({ c: s.c, r: evaluate(n, s.c, 900) }));
    top.sort((a, b) => dist(a.r) - dist(b.r) || changes(base, a.c) - changes(base, b.c));
    if (dist(top[0].r) < dist(curR) - 0.5) { cur = top[0].c; curR = top[0].r; log(`N=${n} iter ${it + 1}: mafia ${curR.mafia}% city ${curR.city}% maniac ${curR.maniac}% (${nb.length} neighbors)`); }
    else { log(`N=${n} iter ${it + 1}: no improvement`); break; }
  }
  const finalR = evaluate(n, cur, 3000);
  log(`N=${n} FINAL: mafia ${finalR.mafia}% city ${finalR.city}% maniac ${finalR.maniac}% jester ${finalR.jester}% nights ${finalR.avgNights} :: ${cur.join(',')}`);
  return { n, comp: cur, result: finalR, base, baseResult: baseR };
}

if (require.main === module) {
  const from = +process.argv[2], to = +process.argv[3];
  const out = [];
  for (let n = from; n <= to; n++) {
    const t0 = Date.now();
    const r = tune(n, m => { console.log(m); });
    r.seconds = Math.round((Date.now() - t0) / 1000);
    out.push(r);
    fs.writeFileSync(__dirname + `/tuned-${from}-${to}.json`, JSON.stringify(out, null, 1));
  }
  console.log('done');
}
