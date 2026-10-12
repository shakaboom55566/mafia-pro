// Balance of the classic 10-player table (Don, 2 Mafia, Sheriff, 6 Citizens) with the heuristic bots, sport flow (day 1 before night 1).
const { playGame } = require('./montecarlo.js');
const comp = ['don', 'mafia', 'mafia', 'sheriff', 'citizen', 'citizen', 'citizen', 'citizen', 'citizen', 'citizen'];
const N = +(process.argv[2] || 3000); const res = { mafia: 0, city: 0, other: 0 }; let nights = 0;
for (let i = 0; i < N; i++) { const r = playGame(10, comp, undefined, { mods: { classic: true }, firstDay: true }); res[r.side === 'mafia' ? 'mafia' : r.side === 'city' ? 'city' : 'other']++; nights += r.nights; }
console.log(`classic 10: games ${N} · mafia ${(100 * res.mafia / N).toFixed(1)}% · city ${(100 * res.city / N).toFixed(1)}% · avg nights ${(nights / N).toFixed(1)}`);
