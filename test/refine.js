// Second pass: refine the tables that are still more than 3 points from 50/50.
const fs = require('fs');
const { evaluate, E } = require('./montecarlo.js');
const m = require('module');
const code = fs.readFileSync(__dirname + '/tune.js', 'utf8').replace('if (require.main === module)', 'if (false)') + '\nmodule.exports={neighbors,valid,dist,changes};';
const M = new m.Module('tune-x'); M.paths = module.paths; M._compile(code, __dirname + '/tune-x.js');
const { neighbors, dist, changes } = M.exports;
const all = [].concat(JSON.parse(fs.readFileSync(__dirname + '/tuned-7-15.json')), JSON.parse(fs.readFileSync(__dirname + '/tuned-16-24.json')));
const todo = all.filter(x => Math.abs(x.result.mafia - 50) > 3);
console.log('refining:', todo.map(x => x.n).join(', '));
for (const item of todo) {
  const n = item.n; let cur = item.comp, curR = item.result;
  for (let it = 0; it < 3 && Math.abs(curR.mafia - 50) > 2; it++) {
    const nb = neighbors(cur, n);
    const scored = nb.map(c => ({ c, r: evaluate(n, c, 350) }));
    scored.sort((a, b) => dist(a.r) - dist(b.r) || changes(item.base, a.c) - changes(item.base, b.c));
    const top = scored.slice(0, 5).map(s => ({ c: s.c, r: evaluate(n, s.c, 1500) }));
    top.sort((a, b) => dist(a.r) - dist(b.r));
    if (dist(top[0].r) < dist(curR) - 0.3) { cur = top[0].c; curR = top[0].r; console.log(`N=${n} refine ${it + 1}: mafia ${curR.mafia}% city ${curR.city}% maniac ${curR.maniac}%`); } else { console.log(`N=${n} refine ${it + 1}: no improvement`); break; }
  }
  const finalR = evaluate(n, cur, 3000);
  console.log(`N=${n} FINAL: mafia ${finalR.mafia}% city ${finalR.city}% maniac ${finalR.maniac}% :: ${cur.join(',')}`);
  item.comp = cur; item.result = finalR;
}
fs.writeFileSync(__dirname + '/tuned-all.json', JSON.stringify(all, null, 1));
console.log('saved tuned-all.json');
