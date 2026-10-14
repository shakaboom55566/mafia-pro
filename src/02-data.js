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
  {"id":"thug","team":"black","color":"black","side":"mafia","wake":35,"ability":"intimidate"},
  {"id":"ninja","team":"red","color":"red","side":"city","wake":null,"ability":null},
  {"id":"corrupter","team":"black","color":"black","side":"mafia","wake":36,"ability":"recruit"}
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
const NIGHT0_ORDER = ['maniac', 'jester', 'witch', 'amnesiac', 'survivor', 'contractor', 'jailer', 'thief', 'monk', 'sheriff', 'doctor', 'journalist', 'mayor', 'drunk', 'altruist', 'miller', 'azazel', 'morpheus', 'rabbi', 'bomb', 'bodyguard', 'judge', 'sniper', 'tracker', 'avenger', 'chairman', 'prosecutor', 'notary', 'pastor', 'lobbyist', 'gambler', 'peacemaker', 'puppeteer', 'sapper', 'bailiff', 'auditor', 'ninja'];

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
  9: { mafia: 47.8, city: 52.2, maniac: 0, games: 4000, nights: 2.9, before: 43.8, weak: 54.5, strong: 46 },
  10: { mafia: 52.8, city: 43.2, maniac: 4.1, games: 2000, nights: 2.5, before: 55.7, weak: 56.5, strong: 45.1 },
  11: { mafia: 47.2, city: 47.2, maniac: 5.7, games: 2000, nights: 2.8, before: 40.7, weak: 52.3, strong: 40.5 },
  12: { mafia: 46.8, city: 53.2, maniac: 0, games: 4000, nights: 3.6, before: 52.9, weak: 59.6, strong: 46.8 },
  13: { mafia: 47, city: 49.3, maniac: 3.8, games: 2000, nights: 3, before: 57.9, weak: 50.8, strong: 40 },
  14: { mafia: 49.2, city: 48.8, maniac: 2, games: 2000, nights: 3.4, before: 33.1, weak: 51.1, strong: 43.9 },
  15: { mafia: 47.1, city: 50.6, maniac: 2.3, games: 4000, nights: 3.4, before: 57.7, weak: 56.5, strong: 44.5 },
  16: { mafia: 52.1, city: 47.9, maniac: 0, games: 2000, nights: 4.3, before: 54.6, weak: 58.3, strong: 50.3 },
  17: { mafia: 47.9, city: 51, maniac: 1.1, games: 4000, nights: 4, before: 35.9, weak: 55.5, strong: 45.4 },
  18: { mafia: 53.7, city: 46.3, maniac: 0, games: 2000, nights: 4.6, before: 65.7, weak: 55.9, strong: 46.6 },
  19: { mafia: 46.5, city: 52.4, maniac: 1.1, games: 4000, nights: 4.5, before: 48.9, weak: 52.8, strong: 41.5 },
  20: { mafia: 48.9, city: 51.2, maniac: 0, games: 4000, nights: 5.7, before: 40.7, weak: 58.4, strong: 38.5 },
  21: { mafia: 49.7, city: 48, maniac: 2.3, games: 4000, nights: 5, before: 36.3, weak: 59.5, strong: 42.6 },
  22: { mafia: 50.8, city: 47.2, maniac: 2, games: 4000, nights: 5.4, before: 45.5, weak: 57.9, strong: 41.6 },
  23: { mafia: 46.7, city: 51.2, maniac: 2.1, games: 4000, nights: 5.7, before: 49.7, weak: 53.9, strong: 40.9 },
  24: { mafia: 51.2, city: 47.4, maniac: 1.4, games: 4000, nights: 5.7, before: 53.2, weak: 58.4, strong: 43 },
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
  don: ['sheriff', 'doctor', 'bodyguard', 'rabbi', 'jailer', 'thief', 'avenger', 'monk', 'ninja'], gunsmith: ['doctor', 'rabbi', 'bodyguard', 'jailer', 'thief'], kamikaze: ['sapper', 'thug', 'sheriff', 'sniper'],
  mafia_doctor: ['jailer', 'thief', 'tracker', 'sheriff'], balamut: ['journalist', 'tracker', 'jailer', 'thief'], executioner: ['rabbi', 'jailer', 'bodyguard', 'thief'], spy: ['thief', 'jailer', 'monk', 'tracker'],
  arsonist: ['sapper', 'jailer', 'tracker', 'thief'], hypnotist: ['notary', 'tracker', 'jailer', 'thief'], saboteur: ['jailer', 'thief', 'tracker'], lawyer: ['bailiff', 'sheriff', 'sniper'], werewolf: ['spy', 'don'],
  mafia: ['sheriff', 'doctor', 'journalist', 'tracker'], blackmailer: ['auditor', 'notary', 'tracker', 'jailer', 'thief'], ambassador: ['bailiff', 'sheriff', 'sniper'], provocateur: ['pastor', 'miller', 'tracker', 'jailer', 'thief'],
  treasurer: ['auditor', 'pastor', 'miller', 'jailer', 'thief', 'tracker'], thug: ['jailer', 'thief', 'tracker', 'sheriff'],
  jailer: ['saboteur', 'spy', 'witch'], thief: ['saboteur', 'witch', 'spy'], monk: ['saboteur', 'witch', 'spy', 'gunsmith'], sheriff: ['don', 'spy', 'balamut', 'saboteur', 'corrupter'], doctor: ['executioner', 'arsonist', 'saboteur', 'spy', 'witch'],
  journalist: ['balamut', 'saboteur', 'spy'], mayor: ['hypnotist', 'blackmailer', 'puppeteer', 'kamikaze'], drunk: ['notary', 'saboteur', 'witch'], altruist: ['blackmailer', 'hypnotist', 'saboteur'], miller: ['provocateur', 'treasurer', 'kamikaze'],
  azazel: ['don', 'kamikaze', 'sniper', 'maniac'], morpheus: ['don', 'kamikaze', 'sniper', 'maniac'], rabbi: ['arsonist', 'gunsmith', 'saboteur', 'witch'], bomb: ['sapper', 'spy'], bodyguard: ['executioner', 'arsonist', 'saboteur', 'witch'],
  judge: ['thug', 'kamikaze', 'don', 'spy'], sniper: ['witch', 'mafia_doctor', 'saboteur'], tracker: ['saboteur', 'witch', 'spy'], avenger: ['executioner', 'arsonist', 'spy'], chairman: ['hypnotist', 'puppeteer', 'blackmailer', 'kamikaze'],
  prosecutor: ['thug', 'lawyer', 'ambassador', 'kamikaze'], notary: ['saboteur', 'witch', 'spy'], pastor: ['saboteur', 'witch', 'spy'], sapper: ['saboteur', 'witch', 'spy'], bailiff: ['thug', 'kamikaze', 'spy'], auditor: ['saboteur', 'witch', 'spy'], citizen: ['don', 'mafia'],
  maniac: ['jailer', 'thief', 'doctor', 'rabbi', 'bodyguard', 'tracker', 'ninja'], jester: ['judge', 'peacemaker', 'pastor', 'kamikaze', 'don'], witch: ['jailer', 'thief', 'spy', 'tracker'], amnesiac: ['jailer', 'thief', 'spy', 'kamikaze'],
  survivor: ['kamikaze', 'don', 'maniac', 'executioner'], contractor: ['pastor', 'peacemaker', 'judge', 'lawyer'], lobbyist: ['judge', 'lawyer', 'ambassador', 'peacemaker', 'pastor', 'drunk'], gambler: ['judge', 'lawyer', 'ambassador', 'peacemaker', 'pastor', 'drunk'],
  peacemaker: ['bailiff', 'kamikaze', 'don', 'saboteur', 'witch'], puppeteer: ['notary', 'drunk', 'saboteur', 'witch', 'tracker', 'jailer'],
  ninja: ['executioner', 'arsonist', 'kamikaze', 'gunsmith'], corrupter: ['sheriff', 'tracker', 'journalist']
};
const COUNTERED_BY = {}; Object.keys(COUNTERS).forEach(id => COUNTERS[id].forEach(c => { (COUNTERED_BY[c] = COUNTERED_BY[c] || []).push(id); }));
/* ---------- Small table (v50): free scenarios for 5–6 players, a fixed line-up per table size (home menu → «Малый стол»).
   Line-ups picked and checked by test/montecarlo.js (4000 games each): sim = [city %, the other side %, maniac %, average nights]. ---------- */
const MINI_MIN = 5, MINI_MAX = 6;
const MINI = [
  { id: 'bomb_hunt', free: true, mini: true, min: 5, max: 6, mods: { bombHunt: true }, other: 'bomb',
    comps: { 5: ['bomb', 'sapper', 'judge', 'azazel', 'morpheus'], 6: ['bomb', 'sapper', 'mayor', 'judge', 'azazel', 'morpheus'] },
    sim: { 5: [50.5, 49.5, 0, 2], 6: [51.6, 48.5, 0, 2.4] } },
  { id: 'corruption', free: true, mini: true, min: 5, max: 6, mods: { corruption: true, mafiaMajority: true }, other: 'mafia',
    comps: { 5: ['corrupter', 'sheriff', 'doctor', 'mayor', 'maniac'], 6: ['corrupter', 'sheriff', 'doctor', 'mayor', 'maniac', 'ninja'] },
    sim: { 5: [19.6, 68.4, 12, 1.6], 6: [37.8, 49.8, 12.5, 2.4] } }
];
MINI.forEach(sc => {
  ['name', 'lore', 'rules'].forEach(k => Object.defineProperty(sc, k, { get() { const p = (L.mini && L.mini[sc.id]) || I18N.ru.mini[sc.id]; return p[k]; }, enumerable: true }));
  SCENARIO[sc.id] = sc;
});
/* Build a scenario composition for n players from the balanced preset, swapping scenario roles in by team */
function scenarioComp(sc, n) {
  if (sc.comps) return (sc.comps[n] || sc.comps[sc.min]).slice();
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

/* ---------- Intro scenarios for beginners (v43): free cards only, no Citizen card — every seat is a role.
   Five themes per table 7–24, compositions picked by simulation (test/montecarlo.js bots) and each checked on a
   fresh 1000 games: [theme, composition, mafia %, city %, maniac %, average nights]. ---------- */
const INTRO_THEMES = ['first', 'detective', 'guard', 'trumps', 'third'];
const INTRO = {
  7: [
    ['first', 'don,mafia,sheriff,doctor,bodyguard,judge,bomb', 50.2, 49.8, 0, 2.1],
    ['detective', 'don,gunsmith,sheriff,journalist,miller,doctor,thief', 49.7, 50.3, 0, 2.1],
    ['guard', 'don,kamikaze,sheriff,bodyguard,bomb,rabbi,judge', 51.4, 48.6, 0, 2],
    ['trumps', 'don,gunsmith,sheriff,doctor,bodyguard,judge,bomb', 56, 44, 0, 2],
    ['third', 'don,mafia,sheriff,maniac,doctor,mayor,bomb', 43.8, 44.5, 11.7, 1.6]
  ],
  8: [
    ['first', 'don,gunsmith,sheriff,doctor,mayor,bodyguard,journalist,judge', 46.9, 53.1, 0, 2.4],
    ['detective', 'don,gunsmith,sheriff,journalist,miller,judge,drunk,thief', 51.2, 48.8, 0, 2.2],
    ['guard', 'don,kamikaze,sheriff,bodyguard,bomb,doctor,judge,altruist', 47.2, 52.8, 0, 2.2],
    ['trumps', 'don,gunsmith,sheriff,doctor,mayor,bodyguard,bomb,miller', 48.8, 51.2, 0, 2.1],
    ['third', 'don,gunsmith,sheriff,maniac,mayor,journalist,bomb,miller', 47.8, 43.8, 8.4, 1.7]
  ],
  9: [
    ['first', 'don,mafia,mafia,sheriff,doctor,bodyguard,journalist,judge,rabbi', 47.6, 52.4, 0, 2.9],
    ['detective', 'don,mafia,mafia,sheriff,journalist,miller,judge,doctor,drunk', 53.4, 46.6, 0, 2.9],
    ['guard', 'don,mafia,mafia,sheriff,bodyguard,bomb,doctor,rabbi,mayor', 46.8, 53.2, 0, 2.7],
    ['trumps', 'don,gunsmith,mafia,sheriff,doctor,journalist,judge,bomb,rabbi', 52.9, 47.1, 0, 2.5],
    ['third', 'don,gunsmith,sheriff,maniac,mayor,bodyguard,judge,miller,rabbi', 43.2, 49.8, 7, 2.2]
  ],
  10: [
    ['first', 'don,gunsmith,mafia,sheriff,doctor,bodyguard,judge,bomb,rabbi,drunk', 48.7, 51.3, 0, 2.9],
    ['detective', 'don,gunsmith,mafia,sheriff,journalist,miller,judge,doctor,thief,bodyguard', 50.5, 49.5, 0, 2.8],
    ['guard', 'don,executioner,mafia,sheriff,bodyguard,bomb,doctor,altruist,mayor,journalist', 48.8, 51.2, 0, 2.8],
    ['trumps', 'don,gunsmith,mafia,sheriff,doctor,bodyguard,journalist,bomb,miller,rabbi', 47.9, 52.1, 0, 2.8],
    ['third', 'don,mafia,mafia,sheriff,maniac,doctor,mayor,bodyguard,journalist,miller', 45.2, 46.4, 8.4, 2.7]
  ],
  11: [
    ['first', 'don,mafia,mafia,mafia,sheriff,doctor,journalist,judge,bomb,rabbi,drunk', 48.7, 51.3, 0, 3.5],
    ['detective', 'don,gunsmith,balamut,sheriff,journalist,miller,mayor,drunk,thief,bomb,rabbi', 50.6, 49.4, 0, 3],
    ['guard', 'don,kamikaze,executioner,sheriff,bodyguard,bomb,rabbi,judge,altruist,journalist,drunk', 47.3, 52.7, 0, 3.1],
    ['trumps', 'don,gunsmith,kamikaze,sheriff,journalist,judge,bomb,miller,rabbi,drunk,altruist', 49.2, 50.8, 0, 2.9],
    ['third', 'don,gunsmith,mafia,sheriff,maniac,doctor,mayor,journalist,judge,miller,drunk', 44.2, 51.1, 4.7, 2.9]
  ],
  12: [
    ['first', 'don,mafia,mafia,mafia,sheriff,bodyguard,judge,bomb,miller,rabbi,drunk,altruist', 49.2, 50.8, 0, 3.6],
    ['detective', 'don,gunsmith,balamut,sheriff,journalist,miller,judge,mayor,drunk,bomb,rabbi,altruist', 48.9, 51.1, 0, 3.5],
    ['guard', 'don,executioner,mafia,mafia,sheriff,bodyguard,bomb,doctor,rabbi,altruist,journalist,miller', 51.6, 48.4, 0, 3.5],
    ['trumps', 'don,gunsmith,mafia,mafia,sheriff,doctor,mayor,journalist,bomb,miller,rabbi,drunk', 51, 49, 0, 3.4],
    ['third', 'don,mafia,mafia,mafia,sheriff,maniac,doctor,mayor,bodyguard,miller,rabbi,drunk', 48.6, 47.2, 4.2, 3.1]
  ],
  13: [
    ['first', 'don,gunsmith,mafia,mafia,sheriff,doctor,mayor,bodyguard,journalist,bomb,miller,altruist,thief', 46.7, 53.3, 0, 3.4],
    ['detective', 'don,balamut,spy,mafia,sheriff,journalist,miller,judge,mayor,drunk,bomb,rabbi,altruist', 50.3, 49.7, 0, 4.1],
    ['guard', 'don,kamikaze,mafia,mafia,sheriff,bodyguard,bomb,doctor,rabbi,judge,altruist,mayor,journalist', 46.7, 53.3, 0, 3.9],
    ['trumps', 'don,gunsmith,executioner,mafia,sheriff,doctor,mayor,bodyguard,journalist,judge,miller,rabbi,altruist', 50.3, 49.7, 0, 3.8],
    ['third', 'don,gunsmith,mafia,mafia,sheriff,maniac,werewolf,doctor,mayor,bodyguard,journalist,miller,rabbi', 46.2, 50.3, 3.5, 3.2]
  ],
  14: [
    ['first', 'don,gunsmith,mafia,mafia,sheriff,mayor,bodyguard,journalist,judge,bomb,miller,drunk,altruist,thief', 48.4, 51.6, 0, 3.7],
    ['detective', 'don,gunsmith,mafia,mafia,mafia,sheriff,journalist,miller,doctor,mayor,thief,bomb,rabbi,altruist', 47.9, 52.1, 0, 3.8],
    ['guard', 'don,mafia,mafia,mafia,mafia,sheriff,bodyguard,bomb,doctor,rabbi,altruist,mayor,journalist,drunk', 48, 52, 0, 4.2],
    ['trumps', 'don,gunsmith,mafia,mafia,mafia,sheriff,doctor,mayor,journalist,judge,rabbi,drunk,altruist,thief', 48.7, 51.3, 0, 4.1],
    ['third', 'don,mafia,mafia,mafia,mafia,sheriff,maniac,doctor,mayor,journalist,judge,bomb,miller,rabbi', 50.1, 46.5, 3.4, 3.5]
  ],
  15: [
    ['first', 'don,gunsmith,mafia,mafia,mafia,sheriff,doctor,mayor,bodyguard,judge,bomb,rabbi,drunk,altruist,thief', 48.8, 51.2, 0, 4.1],
    ['detective', 'don,balamut,spy,mafia,mafia,sheriff,journalist,miller,judge,doctor,mayor,drunk,bomb,rabbi,altruist', 50.7, 49.3, 0, 5],
    ['guard', 'don,kamikaze,executioner,mafia,mafia,sheriff,bodyguard,bomb,doctor,rabbi,judge,altruist,miller,thief,monk', 49, 51, 0, 4.1],
    ['trumps', 'don,gunsmith,kamikaze,mafia_doctor,spy,sheriff,doctor,bodyguard,journalist,judge,rabbi,drunk,altruist,thief,monk', 50.1, 49.9, 0, 4.1],
    ['third', 'don,mafia,mafia,mafia,mafia,sheriff,maniac,mayor,bodyguard,journalist,judge,bomb,miller,rabbi,thief', 47.9, 49, 3.1, 3.5]
  ],
  16: [
    ['first', 'don,gunsmith,mafia,mafia,mafia,mafia,sheriff,doctor,mayor,bodyguard,journalist,rabbi,drunk,altruist,thief,monk', 52.5, 47.5, 0, 4.2],
    ['detective', 'don,gunsmith,balamut,mafia,mafia,sheriff,journalist,miller,judge,doctor,drunk,thief,bomb,rabbi,bodyguard,azazel', 50.3, 49.7, 0, 4.5],
    ['guard', 'don,kamikaze,executioner,gunsmith,mafia,sheriff,bodyguard,bomb,doctor,rabbi,altruist,mayor,journalist,drunk,thief,azazel', 48.1, 52, 0, 4],
    ['trumps', 'don,gunsmith,kamikaze,mafia_doctor,executioner,sheriff,doctor,bodyguard,journalist,judge,bomb,miller,rabbi,altruist,thief,monk', 48.5, 51.5, 0, 4.1],
    ['third', 'don,gunsmith,mafia,mafia,mafia,sheriff,maniac,werewolf,mayor,journalist,judge,miller,rabbi,drunk,altruist,thief', 46.6, 51.3, 2.1, 3.7]
  ],
  17: [
    ['first', 'don,gunsmith,mafia,mafia,mafia,mafia,sheriff,doctor,bodyguard,journalist,bomb,miller,rabbi,drunk,altruist,monk,azazel', 48.8, 51.2, 0, 4.5],
    ['detective', 'don,gunsmith,mafia,mafia,mafia,mafia,sheriff,journalist,miller,judge,doctor,mayor,drunk,thief,bodyguard,altruist,monk', 48.5, 51.5, 0, 4.6],
    ['guard', 'don,kamikaze,mafia,mafia,mafia,mafia,sheriff,bodyguard,bomb,doctor,altruist,mayor,journalist,miller,drunk,thief,azazel', 52, 48.1, 0, 4.4],
    ['trumps', 'don,gunsmith,mafia_doctor,mafia,mafia,mafia,sheriff,doctor,mayor,bodyguard,journalist,judge,bomb,miller,rabbi,drunk,thief', 53.4, 46.6, 0, 4.6],
    ['third', 'don,gunsmith,mafia,mafia,mafia,sheriff,maniac,jester,werewolf,doctor,mayor,bodyguard,judge,bomb,rabbi,drunk,altruist', 46.2, 51.4, 2.4, 4.1]
  ],
  18: [
    ['first', 'don,mafia,mafia,mafia,mafia,mafia,mafia,sheriff,doctor,mayor,journalist,judge,bomb,miller,rabbi,drunk,altruist,monk', 47.1, 52.9, 0, 5.5],
    ['detective', 'don,mafia,mafia,mafia,mafia,mafia,mafia,sheriff,journalist,miller,judge,doctor,mayor,drunk,thief,bomb,monk,azazel', 50.7, 49.3, 0, 4.8],
    ['guard', 'don,executioner,gunsmith,mafia,mafia,mafia,sheriff,bodyguard,bomb,doctor,rabbi,judge,mayor,journalist,miller,thief,azazel,morpheus', 47.8, 52.3, 0, 4.7],
    ['trumps', 'don,gunsmith,spy,mafia,mafia,mafia,sheriff,mayor,bodyguard,journalist,judge,bomb,miller,rabbi,drunk,thief,azazel,morpheus', 48.4, 51.6, 0, 4.7],
    ['third', 'don,gunsmith,mafia,mafia,mafia,mafia,sheriff,maniac,doctor,mayor,bodyguard,journalist,judge,bomb,miller,altruist,monk,azazel', 48.3, 50.2, 1.5, 4]
  ],
  19: [
    ['first', 'don,gunsmith,mafia,mafia,mafia,mafia,mafia,sheriff,doctor,mayor,bodyguard,journalist,bomb,rabbi,drunk,altruist,thief,monk,azazel', 48.6, 51.4, 0, 4.9],
    ['detective', 'don,gunsmith,mafia,mafia,mafia,mafia,mafia,sheriff,journalist,miller,judge,doctor,mayor,drunk,thief,bodyguard,rabbi,altruist,monk', 47, 53, 0, 5.3],
    ['guard', 'don,kamikaze,gunsmith,mafia,mafia,mafia,sheriff,bodyguard,bomb,doctor,judge,altruist,mayor,journalist,miller,drunk,thief,azazel,morpheus', 49.8, 50.2, 0, 5],
    ['trumps', 'don,gunsmith,spy,mafia,mafia,mafia,mafia,sheriff,doctor,bodyguard,journalist,bomb,miller,rabbi,drunk,altruist,thief,monk,azazel', 48.7, 51.3, 0, 4.8],
    ['third', 'don,mafia,mafia,mafia,mafia,mafia,mafia,sheriff,maniac,doctor,mayor,bodyguard,journalist,judge,bomb,rabbi,altruist,thief,azazel', 46.1, 52.1, 1.8, 4.5]
  ],
  20: [
    ['first', 'don,don,mafia,mafia,mafia,mafia,mafia,mafia,sheriff,doctor,mayor,bodyguard,journalist,bomb,miller,rabbi,drunk,thief,azazel,morpheus', 49, 51, 0, 6.2],
    ['detective', 'don,don,balamut,spy,mafia,mafia,mafia,sheriff,journalist,miller,judge,doctor,drunk,bodyguard,bomb,rabbi,altruist,monk,azazel,morpheus', 47.8, 52.2, 0, 6.8],
    ['guard', 'don,don,executioner,mafia,mafia,mafia,mafia,mafia,sheriff,bodyguard,bomb,doctor,rabbi,judge,altruist,journalist,miller,thief,monk,azazel', 48.2, 51.9, 0, 5.9],
    ['trumps', 'don,don,gunsmith,executioner,mafia,mafia,mafia,mafia,sheriff,doctor,journalist,judge,bomb,miller,rabbi,drunk,altruist,thief,monk,azazel', 47, 53.1, 0, 5.8],
    ['third', 'don,don,gunsmith,mafia,mafia,mafia,mafia,sheriff,maniac,doctor,mayor,bodyguard,journalist,judge,rabbi,drunk,altruist,thief,azazel,morpheus', 46.5, 50.7, 2.8, 5.2]
  ],
  21: [
    ['first', 'don,don,gunsmith,mafia,mafia,mafia,mafia,mafia,sheriff,doctor,mayor,bodyguard,journalist,judge,bomb,miller,rabbi,drunk,altruist,thief,azazel', 48.2, 51.8, 0, 6.3],
    ['detective', 'don,don,gunsmith,mafia,mafia,mafia,mafia,mafia,sheriff,journalist,miller,judge,doctor,mayor,drunk,thief,bodyguard,bomb,altruist,monk,azazel', 50, 50, 0, 5.8],
    ['guard', 'don,don,gunsmith,mafia,mafia,mafia,mafia,mafia,sheriff,bodyguard,bomb,doctor,rabbi,judge,altruist,mayor,miller,drunk,thief,azazel,morpheus', 49.7, 50.4, 0, 6.3],
    ['trumps', 'don,don,gunsmith,spy,mafia,mafia,mafia,mafia,sheriff,doctor,mayor,bodyguard,journalist,judge,bomb,miller,rabbi,altruist,thief,monk,azazel', 49.7, 50.4, 0, 6.2],
    ['third', 'don,don,gunsmith,mafia,mafia,mafia,mafia,mafia,sheriff,maniac,doctor,bodyguard,journalist,judge,bomb,miller,rabbi,thief,monk,azazel,morpheus', 50, 48, 2, 5]
  ],
  22: [
    ['first', 'don,don,gunsmith,mafia,mafia,mafia,mafia,mafia,mafia,sheriff,doctor,mayor,bodyguard,journalist,judge,miller,rabbi,drunk,altruist,thief,monk,azazel', 51.6, 48.4, 0, 6.4],
    ['detective', 'don,don,spy,mafia,mafia,mafia,mafia,mafia,mafia,sheriff,journalist,miller,judge,doctor,mayor,drunk,thief,bomb,altruist,monk,azazel,morpheus', 52.1, 47.9, 0, 6.6],
    ['guard', 'don,don,mafia,mafia,mafia,mafia,mafia,mafia,mafia,sheriff,bodyguard,bomb,doctor,rabbi,judge,altruist,mayor,miller,drunk,thief,monk,azazel', 49.1, 50.9, 0, 6.8],
    ['trumps', 'don,don,gunsmith,mafia_doctor,executioner,mafia,mafia,mafia,mafia,sheriff,doctor,mayor,journalist,judge,bomb,miller,rabbi,drunk,altruist,thief,monk,azazel', 48.1, 51.9, 0, 6.5],
    ['third', 'don,don,gunsmith,mafia,mafia,mafia,mafia,mafia,sheriff,maniac,werewolf,doctor,mayor,journalist,judge,bomb,miller,drunk,thief,monk,azazel,morpheus', 45.7, 52.1, 2.2, 5.3]
  ],
  23: [
    ['first', 'don,don,mafia,mafia,mafia,mafia,mafia,mafia,mafia,mafia,sheriff,doctor,mayor,judge,bomb,miller,rabbi,drunk,altruist,thief,monk,azazel,morpheus', 49.9, 50.1, 0, 7.4],
    ['detective', 'don,don,balamut,mafia,mafia,mafia,mafia,mafia,mafia,sheriff,journalist,miller,judge,doctor,mayor,drunk,thief,bodyguard,bomb,rabbi,altruist,monk,azazel', 48.3, 51.7, 0, 7.2],
    ['guard', 'don,don,gunsmith,mafia,mafia,mafia,mafia,mafia,mafia,sheriff,bodyguard,bomb,doctor,rabbi,judge,altruist,mayor,journalist,miller,drunk,thief,azazel,morpheus', 49.5, 50.6, 0, 6.9],
    ['trumps', 'don,don,gunsmith,mafia_doctor,executioner,mafia,mafia,mafia,mafia,sheriff,doctor,mayor,bodyguard,journalist,judge,bomb,miller,rabbi,drunk,thief,monk,azazel,morpheus', 47.9, 52.1, 0, 6.6],
    ['third', 'don,don,mafia,mafia,mafia,mafia,mafia,mafia,mafia,sheriff,maniac,werewolf,doctor,mayor,bodyguard,journalist,miller,rabbi,drunk,altruist,thief,monk,morpheus', 48.5, 49.6, 1.9, 6.2]
  ],
  24: [
    ['first', 'don,don,mafia,mafia,mafia,mafia,mafia,mafia,mafia,mafia,sheriff,doctor,mayor,bodyguard,journalist,judge,bomb,miller,rabbi,drunk,altruist,thief,azazel,morpheus', 49.4, 50.6, 0, 7.8],
    ['detective', 'don,don,mafia,mafia,mafia,mafia,mafia,mafia,mafia,mafia,sheriff,journalist,miller,doctor,mayor,drunk,thief,bodyguard,bomb,rabbi,altruist,monk,azazel,morpheus', 47.8, 52.3, 0, 7.5],
    ['guard', 'don,don,kamikaze,executioner,gunsmith,mafia,mafia,mafia,mafia,sheriff,bodyguard,bomb,doctor,rabbi,judge,altruist,mayor,journalist,miller,drunk,thief,monk,azazel,morpheus', 48.3, 51.7, 0, 6.9],
    ['trumps', 'don,don,gunsmith,kamikaze,mafia_doctor,executioner,mafia,mafia,mafia,sheriff,doctor,mayor,bodyguard,journalist,judge,bomb,miller,rabbi,drunk,altruist,thief,monk,azazel,morpheus', 48.4, 51.6, 0, 6.9],
    ['third', 'don,don,mafia,mafia,mafia,mafia,mafia,mafia,mafia,sheriff,maniac,werewolf,bodyguard,journalist,judge,bomb,miller,rabbi,drunk,altruist,thief,monk,azazel,morpheus', 45.4, 52.3, 2.4, 6]
  ]
};
const introText = theme => (L.intro && L.intro[theme]) || I18N.ru.intro[theme];
function introFor(n) {
  return (INTRO[n] || []).map(([id, comp, mafia, city, maniac, nights]) => ({
    id, n, comp: comp.split(','), mafia, city, maniac, nights,
    get name() { return introText(id).name; }, get lore() { return introText(id).lore; }
  }));
}
/* the intro scenario whose composition is exactly this one (order-free), or null */
function introMatch(n, comp) { const k = comp.slice().sort().join(); return introFor(n).find(s => s.comp.slice().sort().join() === k) || null; }
