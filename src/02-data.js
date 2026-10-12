/* ============================================================
   DATA: roles, lore, presets
   team: 'black' (mafia family), 'red' (city), 'neutral' (maniac), 'ww' (werewolf — dealt with mafia, counts for the city)
   color: how sheriff / journalist see the player
   side: who the player wins with
   wake: order in the active night (null = does not wake)
   ability: active night ability kind (used by the Thief and Morpheus)
   ============================================================ */

const ROLES = [
  {"id":"don","team":"black","color":"black","side":"mafia","wake":2,"ability":"shoot"},
  {"id":"gunsmith","team":"black","color":"black","side":"mafia","wake":null,"ability":null},
  {"id":"kamikaze","team":"black","color":"black","side":"mafia","wake":null,"ability":null},
  {"id":"mafia_doctor","team":"black","color":"black","side":"mafia","wake":8,"ability":"heal"},
  {"id":"balamut","team":"black","color":"black","side":"mafia","wake":9,"ability":"swap"},
  {"id":"executioner","team":"black","color":"black","side":"mafia","wake":3,"ability":"execute"},
  {"id":"spy","team":"black","color":"black","side":"mafia","wake":4,"ability":"spy"},
  {"id":"arsonist","team":"black","color":"black","side":"mafia","wake":5,"ability":"douse","premium":true},
  {"id":"hypnotist","team":"black","color":"black","side":"mafia","wake":6,"ability":"hypno","premium":true},
  {"id":"saboteur","team":"black","color":"black","side":"mafia","wake":7,"ability":"block","premium":true},
  {"id":"lawyer","team":"black","color":"black","side":"mafia","wake":null,"ability":null,"premium":true},
  {"id":"werewolf","team":"ww","color":"red","side":"city","wake":null,"ability":null},
  {"id":"mafia","team":"black","color":"black","side":"mafia","wake":null,"ability":null},
  {"id":"maniac","team":"neutral","color":"red","side":"self","wake":10,"ability":"shoot"},
  {"id":"jester","team":"neutral","color":"red","side":"self","wake":null,"ability":null},
  {"id":"witch","team":"neutral","color":"red","side":"mafia","wake":11,"ability":"control","premium":true},
  {"id":"amnesiac","team":"neutral","color":"red","side":"city","wake":12,"ability":"remember","premium":true},
  {"id":"survivor","team":"neutral","color":"red","side":"self","wake":null,"ability":null,"premium":true},
  {"id":"contractor","team":"neutral","color":"red","side":"self","wake":null,"ability":null,"premium":true},
  {"id":"jailer","team":"red","color":"red","side":"city","wake":13,"ability":"jail","premium":true},
  {"id":"thief","team":"red","color":"red","side":"city","wake":14,"ability":"steal"},
  {"id":"monk","team":"red","color":"red","side":"city","wake":15,"ability":"redirect"},
  {"id":"sheriff","team":"red","color":"red","side":"city","wake":16,"ability":"check"},
  {"id":"doctor","team":"red","color":"red","side":"city","wake":17,"ability":"heal"},
  {"id":"journalist","team":"red","color":"red","side":"city","wake":18,"ability":"compare"},
  {"id":"mayor","team":"red","color":"red","side":"city","wake":null,"ability":null},
  {"id":"drunk","team":"red","color":"red","side":"city","wake":19,"ability":"drunk"},
  {"id":"altruist","team":"red","color":"red","side":"city","wake":20,"ability":"altruist"},
  {"id":"miller","team":"red","color":"red","side":"city","wake":null,"ability":null},
  {"id":"azazel","team":"red","color":"red","side":"city","wake":null,"ability":null},
  {"id":"morpheus","team":"red","color":"red","side":"city","wake":null,"ability":null},
  {"id":"rabbi","team":"red","color":"red","side":"city","wake":21,"ability":"protect"},
  {"id":"bomb","team":"red","color":"red","side":"city","wake":null,"ability":null},
  {"id":"bodyguard","team":"red","color":"red","side":"city","wake":22,"ability":"guard"},
  {"id":"judge","team":"red","color":"red","side":"city","wake":null,"ability":null},
  {"id":"citizen","team":"red","color":"red","side":"city","wake":null,"ability":null},
  {"id":"sniper","team":"red","color":"red","side":"city","wake":23,"ability":"snipe","premium":true},
  {"id":"tracker","team":"red","color":"red","side":"city","wake":24,"ability":"track","premium":true},
  {"id":"avenger","team":"red","color":"red","side":"city","wake":null,"ability":null,"premium":true},
  {"id":"blackmailer","team":"black","color":"black","side":"mafia","wake":25,"ability":"negvote","premium":true,"pack":"diplomacy"},
  {"id":"ambassador","team":"black","color":"black","side":"mafia","wake":null,"ability":null,"premium":true,"pack":"diplomacy"},
  {"id":"provocateur","team":"black","color":"black","side":"mafia","wake":26,"ability":"provoke","premium":true,"pack":"diplomacy"},
  {"id":"treasurer","team":"black","color":"black","side":"mafia","wake":27,"ability":"stuff","premium":true,"pack":"diplomacy"},
  {"id":"chairman","team":"red","color":"red","side":"city","wake":null,"ability":null,"premium":true,"pack":"diplomacy"},
  {"id":"prosecutor","team":"red","color":"red","side":"city","wake":null,"ability":"prosecute","premium":true,"pack":"diplomacy"},
  {"id":"notary","team":"red","color":"red","side":"city","wake":28,"ability":"certify","premium":true,"pack":"diplomacy"},
  {"id":"pastor","team":"red","color":"red","side":"city","wake":29,"ability":"sanctuary","premium":true,"pack":"diplomacy"},
  {"id":"lobbyist","team":"neutral","color":"red","side":"self","wake":null,"ability":null,"premium":true,"pack":"diplomacy"},
  {"id":"gambler","team":"neutral","color":"red","side":"self","wake":30,"ability":"bet","premium":true,"pack":"diplomacy"},
  {"id":"peacemaker","team":"neutral","color":"red","side":"self","wake":31,"ability":"shield","premium":true,"pack":"diplomacy"},
  {"id":"puppeteer","team":"neutral","color":"red","side":"self","wake":32,"ability":"puppet","premium":true,"pack":"diplomacy"},
  {"id":"sapper","team":"red","color":"red","side":"city","wake":33,"ability":"defuse"},
  {"id":"bailiff","team":"red","color":"red","side":"city","wake":null,"ability":"final"},
  {"id":"auditor","team":"red","color":"red","side":"city","wake":34,"ability":"audit"},
  {"id":"thug","team":"black","color":"black","side":"mafia","wake":35,"ability":"intimidate"}
];
const PREMIUM_PRICE = 2, SCENARIO_PRICE = 9.99, PACK_PRICE = 35;
/* Localized text fields resolve through the active language pack */
['name', 'mono', 'kind', 'short', 'rules', 'lore', 'tip'].forEach(k => ROLES.forEach(r => Object.defineProperty(r, k, { get() { const p = L.roles[r.id] || I18N.ru.roles[r.id]; return p[k]; }, enumerable: true })));
const ROLE = Object.fromEntries(ROLES.map(r => [r.id, r]));
const TEAM_LABEL = new Proxy({}, { get: (_, k) => L.teams[k] });
const TEAM_SHORT = new Proxy({}, { get: (_, k) => L.teamShort[k] });
const COLOR_LABEL = new Proxy({}, { get: (_, k) => L.colors[k] });
const FAMILY_NAMES = new Proxy({}, { get: (_, k) => L.families[k] });
const ABILITY_LABEL = new Proxy({}, { get: (_, k) => L.abilities[k] });
const HOOKS = new Proxy({}, { get: (_, k) => L.hooks[k] });

/* Line of succession for the family shot */
const SHOOTER_ORDER = ['don', 'gunsmith', 'executioner', 'spy', 'arsonist', 'hypnotist', 'saboteur', 'lawyer', 'mafia_doctor', 'balamut', 'blackmailer', 'provocateur', 'treasurer', 'ambassador', 'thug', 'mafia'];

/* Wake order on the acquaintance night: the family together, then everyone else one by one */
const NIGHT0_ORDER = ['maniac', 'jester', 'witch', 'amnesiac', 'survivor', 'contractor', 'jailer', 'thief', 'monk', 'sheriff', 'doctor', 'journalist', 'mayor', 'drunk', 'altruist', 'miller', 'azazel', 'morpheus', 'rabbi', 'bomb', 'bodyguard', 'judge', 'sniper', 'tracker', 'avenger', 'chairman', 'prosecutor', 'notary', 'pastor', 'lobbyist', 'gambler', 'peacemaker', 'puppeteer', 'sapper', 'bailiff', 'auditor'];

/* ---------- Balance presets by player count ---------- */
const PRESETS = {
  7: ['don', 'mafia', 'sheriff', 'doctor', 'drunk', 'bomb', 'bodyguard'],
  8: ['don', 'gunsmith', 'sheriff', 'doctor', 'mayor', 'miller', 'bomb', 'bodyguard'],
  9: ['don', 'mafia_doctor', 'mafia', 'sheriff', 'doctor', 'journalist', 'mayor', 'azazel', 'judge'],
  10: ['don', 'gunsmith', 'balamut', 'maniac', 'sheriff', 'doctor', 'journalist', 'thief', 'miller', 'rabbi'],
  11: ['don', 'gunsmith', 'mafia', 'maniac', 'sheriff', 'doctor', 'journalist', 'mayor', 'altruist', 'bodyguard', 'judge'],
  12: ['don', 'executioner', 'mafia_doctor', 'balamut', 'sheriff', 'doctor', 'journalist', 'mayor', 'thief', 'monk', 'azazel', 'rabbi'],
  13: ['don', 'gunsmith', 'kamikaze', 'mafia', 'maniac', 'sheriff', 'doctor', 'journalist', 'thief', 'drunk', 'miller', 'rabbi', 'bomb'],
  14: ['don', 'gunsmith', 'kamikaze', 'mafia_doctor', 'maniac', 'werewolf', 'sheriff', 'doctor', 'mayor', 'thief', 'altruist', 'morpheus', 'rabbi', 'judge'],
  15: ['don', 'kamikaze', 'spy', 'balamut', 'mafia', 'maniac', 'sheriff', 'doctor', 'journalist', 'mayor', 'thief', 'monk', 'drunk', 'azazel', 'bomb'],
  16: ['don', 'gunsmith', 'executioner', 'mafia_doctor', 'balamut', 'werewolf', 'sheriff', 'doctor', 'journalist', 'mayor', 'thief', 'monk', 'altruist', 'miller', 'morpheus', 'rabbi'],
  17: ['don', 'gunsmith', 'kamikaze', 'mafia_doctor', 'mafia', 'mafia', 'maniac', 'sheriff', 'doctor', 'journalist', 'mayor', 'thief', 'monk', 'drunk', 'altruist', 'azazel', 'rabbi'],
  18: ['don', 'gunsmith', 'kamikaze', 'mafia_doctor', 'mafia', 'mafia', 'werewolf', 'sheriff', 'doctor', 'journalist', 'mayor', 'thief', 'monk', 'drunk', 'altruist', 'miller', 'morpheus', 'bomb'],
  19: ['don', 'gunsmith', 'kamikaze', 'mafia_doctor', 'balamut', 'mafia', 'maniac', 'werewolf', 'sheriff', 'doctor', 'journalist', 'mayor', 'thief', 'monk', 'drunk', 'altruist', 'miller', 'azazel', 'rabbi'],
  20: ['don', 'don', 'gunsmith', 'kamikaze', 'executioner', 'mafia_doctor', 'balamut', 'sheriff', 'doctor', 'journalist', 'mayor', 'thief', 'monk', 'drunk', 'altruist', 'miller', 'azazel', 'morpheus', 'rabbi', 'bomb'],
  21: ['don', 'don', 'gunsmith', 'kamikaze', 'spy', 'mafia_doctor', 'balamut', 'maniac', 'werewolf', 'sheriff', 'doctor', 'journalist', 'mayor', 'thief', 'monk', 'altruist', 'miller', 'azazel', 'morpheus', 'rabbi', 'bomb'],
  22: ['don', 'don', 'kamikaze', 'executioner', 'mafia_doctor', 'balamut', 'mafia', 'mafia', 'maniac', 'werewolf', 'sheriff', 'doctor', 'journalist', 'mayor', 'thief', 'monk', 'altruist', 'miller', 'azazel', 'morpheus', 'rabbi', 'bomb'],
  23: ['don', 'don', 'gunsmith', 'kamikaze', 'mafia_doctor', 'balamut', 'mafia', 'mafia', 'maniac', 'werewolf', 'sheriff', 'doctor', 'journalist', 'mayor', 'thief', 'monk', 'drunk', 'altruist', 'miller', 'azazel', 'morpheus', 'rabbi', 'bomb'],
  24: ['don', 'don', 'gunsmith', 'executioner', 'mafia_doctor', 'balamut', 'mafia', 'mafia', 'mafia', 'maniac', 'werewolf', 'sheriff', 'doctor', 'journalist', 'mayor', 'thief', 'monk', 'drunk', 'altruist', 'miller', 'azazel', 'morpheus', 'rabbi', 'bomb'],
};
const BALANCE = {
  7: { mafia: 52, city: 48.1, maniac: 0, games: 2000, nights: 2, before: 40.3, weak: 54.4, strong: 47.4 },
  8: { mafia: 47.3, city: 52.8, maniac: 0, games: 2000, nights: 2.1, before: 39.3, weak: 48, strong: 41.9 },
  9: { mafia: 52, city: 48, maniac: 0, games: 2000, nights: 2.9, before: 43.8, weak: 54.5, strong: 46 },
  10: { mafia: 52.8, city: 43.2, maniac: 4.1, games: 2000, nights: 2.5, before: 55.7, weak: 56.5, strong: 45.1 },
  11: { mafia: 47.2, city: 47.2, maniac: 5.7, games: 2000, nights: 2.8, before: 40.7, weak: 52.3, strong: 40.5 },
  12: { mafia: 50, city: 50, maniac: 0, games: 3000, nights: 3.6, before: 52.9, weak: 59.6, strong: 46.8 },
  13: { mafia: 47, city: 49.3, maniac: 3.8, games: 2000, nights: 3, before: 57.9, weak: 50.8, strong: 40 },
  14: { mafia: 49.2, city: 48.8, maniac: 2, games: 2000, nights: 3.4, before: 33.1, weak: 51.1, strong: 43.9 },
  15: { mafia: 49.7, city: 47.9, maniac: 2.4, games: 2000, nights: 3.4, before: 57.7, weak: 56.5, strong: 44.5 },
  16: { mafia: 52.1, city: 47.9, maniac: 0, games: 2000, nights: 4.3, before: 54.6, weak: 58.3, strong: 50.3 },
  17: { mafia: 51.4, city: 47.6, maniac: 1.1, games: 2000, nights: 4.1, before: 35.9, weak: 55.5, strong: 45.4 },
  18: { mafia: 53.7, city: 46.3, maniac: 0, games: 2000, nights: 4.6, before: 65.7, weak: 55.9, strong: 46.6 },
  19: { mafia: 47.5, city: 51.4, maniac: 1.1, games: 2000, nights: 4.6, before: 48.9, weak: 52.8, strong: 41.5 },
  20: { mafia: 50.1, city: 50, maniac: 0, games: 2000, nights: 5.8, before: 40.7, weak: 58.4, strong: 38.5 },
  21: { mafia: 50.7, city: 46.8, maniac: 2.5, games: 2000, nights: 5.1, before: 36.3, weak: 59.5, strong: 42.6 },
  22: { mafia: 51.9, city: 46.1, maniac: 2.1, games: 2000, nights: 5.4, before: 45.5, weak: 57.9, strong: 41.6 },
  23: { mafia: 47.4, city: 50.6, maniac: 2.1, games: 2000, nights: 5.8, before: 49.7, weak: 53.9, strong: 40.9 },
  24: { mafia: 51.3, city: 47.1, maniac: 1.6, games: 2000, nights: 5.8, before: 53.2, weak: 58.4, strong: 43 },
};

const MIN_PLAYERS = 7, MAX_PLAYERS = 24, TWO_FAMILIES_FROM = 20;
function presetNote(n) {
  const c = presetFor(n); const st = compositionStats(c);
  const pick = ids => ids.filter(id => c.includes(id)).slice(0, 2).map(id => HOOKS[id]);
  const black = pick(['gunsmith', 'executioner', 'kamikaze', 'spy', 'balamut', 'mafia_doctor']);
  const city = pick(['rabbi', 'judge', 'bodyguard', 'bomb', 'azazel', 'thief', 'monk', 'morpheus', 'journalist', 'miller', 'drunk', 'altruist', 'mayor']);
  const sides = [tt(L.ui.noteBlack, { n: st.black }) + (c.includes('maniac') ? L.ui.noteManiac : '') + (c.includes('werewolf') ? L.ui.noteWW : '') + (n >= TWO_FAMILIES_FROM ? L.ui.noteTwo : '')];
  if (black.length) sides.push(black.join(', '));
  return sides.join(': ') + '. ' + (city.length ? tt(L.ui.noteCity, { list: city.join(', ') }) : '');
}
const PRESET_NOTES = new Proxy({}, { get: (_, k) => presetNote(+k) });
function presetFor(n) {
  return (PRESETS[n] || PRESETS[MAX_PLAYERS]).slice();
}

function compositionStats(ids) {
  const s = { total: ids.length, black: 0, red: 0, neutral: 0, ww: 0, active: 0, shots: 0 };
  ids.forEach(id => {
    const r = ROLE[id]; if (!r) return;
    s[r.team]++;
    if (r.wake || r.id === 'kamikaze' || r.id === 'judge') s.active++;
  });
  s.shots = ids.filter(id => id === 'don').length + (ids.includes('maniac') ? 1 : 0);
  s.blackShare = s.total ? Math.round(100 * s.black / s.total) : 0;
  return s;
}

/* ---------- Premium scenarios (9.99 $ each) ---------- */
const SCENARIOS = [
  { id: 'arson_night', roles: ['arsonist', 'jailer', 'tracker'], min: 9, max: 16, mods: {} },
  { id: 'court', roles: ['lawyer', 'judge', 'contractor'], min: 9, max: 16, mods: {} },
  { id: 'hypnosis', roles: ['hypnotist', 'tracker', 'survivor'], min: 9, max: 16, mods: {} },
  { id: 'silent_killers', roles: ['sniper', 'saboteur', 'avenger'], min: 10, max: 18, mods: {} },
  { id: 'masquerade', roles: ['witch', 'amnesiac', 'jester'], min: 10, max: 18, mods: {} },
  { id: 'clan_war', roles: ['lawyer', 'lawyer', 'sniper'], min: 14, max: 24, mods: { twoFamiliesFrom: 14 } },
  { id: 'survival', roles: ['survivor', 'contractor', 'sniper', 'gunsmith'], min: 10, max: 18, mods: { gunsmithEveryNight: true } },
  { id: 'chaos', roles: ['arsonist', 'hypnotist', 'saboteur', 'lawyer', 'sniper', 'tracker', 'jailer', 'avenger', 'witch', 'amnesiac', 'survivor', 'contractor'], min: 12, max: 24, mods: {} },
  /* Diplomacy pack scenarios (sold with the pack, may include free roles) */
  { id: 'summit', pack: 'diplomacy', roles: ['ambassador', 'chairman', 'notary', 'lobbyist', 'mayor'], min: 10, max: 16, mods: {} },
  { id: 'bought_votes', pack: 'diplomacy', roles: ['treasurer', 'blackmailer', 'prosecutor', 'notary', 'gambler', 'journalist'], min: 10, max: 18, mods: {} },
  { id: 'quiet_revolution', pack: 'diplomacy', roles: ['provocateur', 'pastor', 'puppeteer', 'peacemaker', 'judge', 'mayor'], min: 12, max: 20, mods: {} },
  { id: 'big_politics', pack: 'diplomacy', roles: ['blackmailer', 'ambassador', 'provocateur', 'treasurer', 'puppeteer', 'peacemaker', 'lobbyist', 'gambler', 'chairman', 'prosecutor', 'notary', 'pastor', 'mayor'], min: 16, max: 24, mods: {} }
];
const PACKS = { diplomacy: { id: 'diplomacy', price: PACK_PRICE, roles: ['blackmailer', 'ambassador', 'provocateur', 'treasurer', 'chairman', 'prosecutor', 'notary', 'pastor', 'lobbyist', 'gambler', 'peacemaker', 'puppeteer'], scenarios: ['summit', 'bought_votes', 'quiet_revolution', 'big_politics'] } };
const SCENARIO = Object.fromEntries(SCENARIOS.map(s => [s.id, s]));
/* Classic sport mafia — free, fixed table of 10: Don, 2 Mafia, Sheriff, 6 Citizens */
const CLASSIC = { id: 'classic', free: true, roles: ['don', 'mafia', 'sheriff', 'citizen'], comp: ['don', 'mafia', 'mafia', 'sheriff', 'citizen', 'citizen', 'citizen', 'citizen', 'citizen', 'citizen'], min: 10, max: 10, mods: { classic: true } };
['name', 'lore'].forEach(k => Object.defineProperty(CLASSIC, k, { get() { const p = (L.scenarios && L.scenarios.classic) || I18N.ru.scenarios.classic; return p[k]; }, enumerable: true }));
SCENARIO.classic = CLASSIC;
['name', 'lore'].forEach(k => SCENARIOS.forEach(sc => Object.defineProperty(sc, k, { get() { const p = (L.scenarios && L.scenarios[sc.id]) || I18N.ru.scenarios[sc.id]; return p[k]; }, enumerable: true })));
const REPLACEABLE = { black: ['mafia', 'balamut', 'mafia_doctor', 'spy', 'executioner', 'kamikaze', 'gunsmith', 'thug'], red: ['drunk', 'altruist', 'miller', 'morpheus', 'azazel', 'monk', 'thief', 'bomb', 'rabbi', 'bodyguard', 'judge', 'journalist', 'mayor', 'werewolf', 'maniac', 'sapper', 'bailiff', 'auditor'] };
/* Counter-picks: which cards answer each card (the reverse map — whom a card counters — is derived) */
const COUNTERS = {
  don: ['sheriff', 'doctor', 'bodyguard', 'rabbi', 'jailer', 'thief', 'avenger', 'monk'], gunsmith: ['doctor', 'rabbi', 'bodyguard', 'jailer', 'thief'], kamikaze: ['sapper', 'thug', 'sheriff', 'sniper'],
  mafia_doctor: ['jailer', 'thief', 'tracker', 'sheriff'], balamut: ['journalist', 'tracker', 'jailer', 'thief'], executioner: ['rabbi', 'jailer', 'bodyguard', 'thief'], spy: ['thief', 'jailer', 'monk', 'tracker'],
  arsonist: ['sapper', 'jailer', 'tracker', 'thief'], hypnotist: ['notary', 'tracker', 'jailer', 'thief'], saboteur: ['jailer', 'thief', 'tracker'], lawyer: ['bailiff', 'sheriff', 'sniper'], werewolf: ['spy', 'don'],
  mafia: ['sheriff', 'doctor', 'journalist', 'tracker'], blackmailer: ['auditor', 'notary', 'tracker', 'jailer', 'thief'], ambassador: ['bailiff', 'sheriff', 'sniper'], provocateur: ['pastor', 'miller', 'tracker', 'jailer', 'thief'],
  treasurer: ['auditor', 'pastor', 'miller', 'jailer', 'thief', 'tracker'], thug: ['jailer', 'thief', 'tracker', 'sheriff'],
  jailer: ['saboteur', 'spy', 'witch'], thief: ['saboteur', 'witch', 'spy'], monk: ['saboteur', 'witch', 'spy', 'gunsmith'], sheriff: ['don', 'spy', 'balamut', 'saboteur'], doctor: ['executioner', 'arsonist', 'saboteur', 'spy', 'witch'],
  journalist: ['balamut', 'saboteur', 'spy'], mayor: ['hypnotist', 'blackmailer', 'puppeteer', 'kamikaze'], drunk: ['notary', 'saboteur', 'witch'], altruist: ['blackmailer', 'hypnotist', 'saboteur'], miller: ['provocateur', 'treasurer', 'kamikaze'],
  azazel: ['don', 'kamikaze', 'sniper', 'maniac'], morpheus: ['don', 'kamikaze', 'sniper', 'maniac'], rabbi: ['arsonist', 'gunsmith', 'saboteur', 'witch'], bomb: ['sapper', 'spy'], bodyguard: ['executioner', 'arsonist', 'saboteur', 'witch'],
  judge: ['thug', 'kamikaze', 'don', 'spy'], sniper: ['witch', 'mafia_doctor', 'saboteur'], tracker: ['saboteur', 'witch', 'spy'], avenger: ['executioner', 'arsonist', 'spy'], chairman: ['hypnotist', 'puppeteer', 'blackmailer', 'kamikaze'],
  prosecutor: ['thug', 'lawyer', 'ambassador', 'kamikaze'], notary: ['saboteur', 'witch', 'spy'], pastor: ['saboteur', 'witch', 'spy'], sapper: ['saboteur', 'witch', 'spy'], bailiff: ['thug', 'kamikaze', 'spy'], auditor: ['saboteur', 'witch', 'spy'], citizen: ['don', 'mafia'],
  maniac: ['jailer', 'thief', 'doctor', 'rabbi', 'bodyguard', 'tracker'], jester: ['judge', 'peacemaker', 'pastor', 'kamikaze', 'don'], witch: ['jailer', 'thief', 'spy', 'tracker'], amnesiac: ['jailer', 'thief', 'spy', 'kamikaze'],
  survivor: ['kamikaze', 'don', 'maniac', 'executioner'], contractor: ['pastor', 'peacemaker', 'judge', 'lawyer'], lobbyist: ['judge', 'lawyer', 'ambassador', 'peacemaker', 'pastor', 'drunk'], gambler: ['judge', 'lawyer', 'ambassador', 'peacemaker', 'pastor', 'drunk'],
  peacemaker: ['bailiff', 'kamikaze', 'don', 'saboteur', 'witch'], puppeteer: ['notary', 'drunk', 'saboteur', 'witch', 'tracker', 'jailer']
};
const COUNTERED_BY = {}; Object.keys(COUNTERS).forEach(id => COUNTERS[id].forEach(c => { (COUNTERED_BY[c] = COUNTERED_BY[c] || []).push(id); }));
/* Build a scenario composition for n players from the balanced preset, swapping scenario roles in by team */
function scenarioComp(sc, n) {
  if (sc.comp) return sc.comp.slice();
  n = Math.max(sc.min, Math.min(sc.max, n));
  const comp = presetFor(n);
  const twoFam = n >= (sc.mods.twoFamiliesFrom || TWO_FAMILIES_FROM);
  if (twoFam && comp.filter(x => x === 'don').length < 2) { const i = comp.findIndex(x => REPLACEABLE.black.includes(x)); if (i >= 0) comp[i] = 'don'; else comp[comp.findIndex(x => REPLACEABLE.red.includes(x))] = 'don'; }
  sc.roles.forEach(rid => {
    if (comp.includes(rid) && rid !== 'lawyer') return;
    const team = ROLE[rid].team;
    const pool = team === 'black' ? REPLACEABLE.black : REPLACEABLE.red;
    let i = -1;
    for (const cand of pool) { i = comp.findIndex((x, j) => x === cand && !sc.roles.includes(x)); if (i >= 0) break; }
    if (i >= 0) comp[i] = rid;
  });
  return comp;
}
