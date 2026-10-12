/* ============================================================
   I18N core. Packs: ru (base), uk, en, pl, hy. L = active pack.
   ============================================================ */
const I18N = {};
let L = null;
const LANGS = [['ru', 'Русский'], ['uk', 'Українська'], ['en', 'English'], ['pl', 'Polski'], ['hy', 'Հայերեն']];
function tt(str, p) { return p ? String(str).replace(/\{(\w+)\}/g, (_, k) => (p[k] !== undefined ? p[k] : '{' + k + '}')) : str; }
function setLang(code) {
  L = I18N[code] || I18N.ru;
  try { document.documentElement.lang = L.code; } catch (e) {}
}
/* plural(n, formsKey): forms are arrays in the pack; rule picks the index */
function plural(n, key) {
  const forms = L.forms[key]; const m = Math.abs(n) % 10, h = Math.abs(n) % 100;
  let i = 0;
  if (L.pluralRule === 'slavic') i = (m === 1 && h !== 11) ? 0 : (m >= 2 && m <= 4 && (h < 10 || h >= 20)) ? 1 : 2;
  else if (L.pluralRule === 'en') i = n === 1 ? 0 : 1;
  else i = 0;
  return forms[Math.min(i, forms.length - 1)];
}
function detectLang() {
  const cands = [];
  try { const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe; if (tg && tg.user && tg.user.language_code) cands.push(tg.user.language_code); } catch (e) {}
  try { (navigator.languages || [navigator.language]).forEach(l => cands.push(l)); } catch (e) {}
  for (const c of cands) { const k = String(c || '').toLowerCase().slice(0, 2); if (I18N[k]) return k; }
  return 'ru';
}

/* ---------------- RUSSIAN ---------------- */
I18N.ru = {
  code: 'ru', name: 'Русский', pluralRule: 'slavic', city: 'Кастельмар',
  forms: { players: ['игрок', 'игрока', 'игроков'], hands: ['рука', 'руки', 'рук'], days: ['день', 'дня', 'дней'], nights: ['ночь', 'ночи', 'ночей'], votes: ['голос', 'голоса', 'голосов'], roles: ['роль', 'роли', 'ролей'] },
  teams: { black: 'Мафия', red: 'Мирный город', neutral: 'Нейтрал', ww: 'Оборотень' },
  teamShort: { black: 'Мафия', red: 'Город', neutral: 'Нейтрал', ww: 'Оборотень' },
  colors: { black: 'Чёрный', red: 'Красный' },
  families: { A: 'Корвино', B: 'Бранди' },
  abilities: { shoot: 'выстрел', heal: 'лечение', check: 'проверка', compare: 'сравнение', swap: 'переворот цвета', redirect: 'отвод', steal: 'кража', drunk: 'похмелье', altruist: '+1 голос', protect: 'община', execute: 'удар Палача', spy: 'карта игрока', guard: 'охрана' },
  kinds: { activeNight: 'Активная · ночь', passiveNight: 'Пассивная · ночь', activeDay: 'Активная · день', passiveDay: 'Пассивная · день', special: 'Особая · ночь и день', onElim: 'Пассивная · при выбывании', activeNightOnce: 'Активная · ночь · 1 раз', activeDayOnce: 'Активная · день · 1 раз' },
  e: {
    player: 'Игрок {n}', family: 'Семья', familyOf: 'Семья {name}', familyLc: 'семья', familyOfLc: 'семья {name}',
    ph: { n0: 'Н0', d0: 'Д0', n: 'Н{n}', d: 'Д{n}' },
    night0Family: 'Просыпается <b>{family}</b>. Игроки знакомятся друг с другом, запоминают лица. Оборотень, если он есть, просыпается вместе с семьёй.',
    night0Role: 'Просыпается <b>{role}</b>. Ведущий запоминает игрока. {tail}', night0Active: 'Этой ночью действий нет.', night0Passive: 'Роль пассивная: ночью больше не просыпается.',
    famWake: 'Просыпается <b>{family}</b> и обсуждает жестами цель. Потом засыпает.',
    shotTitle: 'Выстрел · {family}', shotNoteSucc: 'Дон выбыл — цель показывает {role} ({player}).', shotNoteTwo: 'Ночь Оружейника: два выстрела.',
    shotScript: 'Отдельно просыпается <b>{role}</b>{tail}.', shotTwo: ' и показывает <b>две цели</b>', shotOne: ' и показывает цель',
    script: {
      executioner: 'Просыпается <b>Палач</b>. Один раз за игру может нанести удар, который нельзя вылечить. Может пропустить.',
      spy: 'Просыпается <b>Шпион</b> и показывает игрока — покажите ему карту этого игрока.',
      mafia_doctor: 'Просыпается <b>Доктор мафии</b> и показывает, кого из семьи лечит.',
      balamut: 'Просыпается <b>Баламут</b> и показывает игрока, чей цвет этой ночью перевёрнут для проверок.',
      maniac: 'Просыпается <b>Маньяк</b> и показывает, кого убирает.',
      thief: 'Просыпается <b>Вор</b>: первым показывает у кого крадёт (А), вторым — к кому применяет (Б).',
      monk: 'Просыпается <b>Монах</b> и показывает, на кого отвести первое действие, направленное в него.',
      sheriff: 'Просыпается <b>Шериф</b>. Один палец — проверка, два — выстрел.',
      doctor: 'Просыпается <b>Доктор</b> и показывает, кого лечит.',
      journalist: 'Просыпается <b>Журналист</b> и показывает двух игроков для сравнения.',
      drunk: 'Просыпается <b>Пьяница</b> и показывает, с кем пьёт. Утром голос этого игрока не считается — молча.',
      altruist: 'Просыпается <b>Альтруист</b> и показывает, чей голос завтра усилить.',
      rabbi: 'Просыпается <b>Равин</b> и берёт в общину двух новых игроков.',
      bodyguard: 'Просыпается <b>Телохранитель</b> и показывает, кого закрывает собой этой ночью.'
    },
    why: { self: 'себя нельзя', family: 'лечит только свою семью', healedLast: 'лечил прошлой ночью', rabbiLast: 'был в общине прошлой ночью' },
    thiefNone: 'У {victim} нет активной ночной способности. Ночь Вора прошла впустую.',
    thiefStole: 'Украдено: {ability} у {victim}. Применится к {target} при подведении итогов ночи.',
    logThief: 'Вор {actor} крадёт у {victim} ({ability}) → {target}', nothing: 'ничего',
    logAction: '{role} {actor}: {ability} → {targets}', eqColor: ' = {color}', eqSame: ' = один цвет', eqDiff: ' = разные', and: ' и ',
    eliminated: 'Выбывает {player} ({role}) — {cause}',
    causeBomb: 'взрыв Бомбы ({player})', causeShot: 'ночной выстрел', causeVote: 'голосование ({n} {votes})', causeAzazel: 'Азазель {player} забрал с собой', causeKamikaze: 'Камикадзе {player}', causeHost: 'решение ведущего',
    noteThief: 'Вор применил «{ability}» к {target}.', noteMonk: 'Монах отвёл «{ability}» на {target}.',
    guardLog: 'Телохранитель {guard} закрыл собой {target}.', byThief: 'Вор', byExec: 'Палач',
    shotMiss: 'Выстрел ({by}) в {target} — мимо: игрок в общине Равина.',
    shotRabbiHealed: 'Выстрел ({by}) в Равина {target} — вылечен, община спасена.',
    shotRabbi: 'Выстрел ({by}) в Равина {target} — выбывает вся община.',
    shotHealed: 'Выстрел ({by}) в {target} — вылечен.',
    shotHit: 'Выстрел ({by}) в {target} — попадание.', execHit: 'Удар Палача в {target} — попадание{tail}.', execHealTail: ', лечение не помогло',
    quietDrunk: 'Пьяница: голос {target} завтра не считается.', quietAltruist: 'Альтруист: голос {target} завтра считается за 2.',
    winManiac: 'Победа Маньяка', winManiacText: '{player} остался один на один с городом.',
    winCity: 'Победа города', winCityManiac: 'Мафия уничтожена. Маньяк разделяет победу с городом.', winCityText: 'Все члены семьи выбыли из игры.',
    winMafia: 'Победа мафии', winMafiaText: 'Семья Корвино сравнялась с городом по численности.',
    winFamily: 'Победа семьи {name}', famControl: 'Семья {name} контролирует стол.', famStronger: 'Город пал. {a} сильнее {b} за столом.', famDon: 'Город пал. Семьи равны по числу — решил живой Дон.',
    winBoth: 'Победа обеих семей', winBothText: 'Город пал, а семьи равны. Кастельмар поделён пополам.',
    logNight0: 'Ознакомительная ночь. Город засыпает.', logDay0: 'Город просыпается. Минутки знакомства.', logNight: 'Ночь {n}. Город засыпает.', logDay: 'День {n}. Город просыпается.',
    logJester: 'Шут {player} выгнан голосованием — Шут победил!', logNoVote: 'Голосование: никто не выбыл.',
    logMorpheus: 'Морфей {actor} забрал навык у {target} ({role}) до конца игры.', logJudge: 'Судья {player} отменяет голосование: сегодня никто не выбывает.',
    logKamikaze: 'Камикадзе {player} раскрывает карту!', logSkip: '{role} {player}: пропуск хода', logReturn: 'Ведущий вернул в игру {player}', logEnd: 'Игра окончена: {title}'
  },
  ui: {
    tabGame: 'Игра', tabCards: 'Карты', tabScen: 'Сценарии', tabSettings: 'Настройки', back: 'Назад', close: 'Закрыть', cancel: 'Отмена', confirm: 'Подтвердить', next: 'Дальше', skip: 'Пропустить',
    heroEyebrow: 'Кастельмар · ролевая мафия', heroTag: 'Ведущий создаёт игру, приложение раздаёт карты, ведёт ночь, день и голосование.',
    continueGame: 'Продолжить игру', aliveOf: '{alive} живых из {n}', newGame: 'Новая игра', newGameD: 'От 7 до 24 игроков, с 20 — две семьи',
    cardsTitle: 'Карты ролей', cardsD: '{n} {roles}: механика, лор, советы', scenTitle: 'Сценарии баланса', scenD: 'Готовый состав на каждое число игроков',
    tgTitle: 'Живая игра через Telegram', tgText: 'В полной версии бот присылает каждому игроку его карту в личные сообщения, а ведущий видит стол на этом экране. В прототипе карты раздаются передачей телефона по кругу.',
    setupSub: 'Состав и места', groupFamily: 'Семья', groupWW: 'Оборотень', groupNeutral: 'Нейтралы', groupCity: 'Город', remove: 'Убрать', add: 'Добавить',
    warnCount: 'В составе {total} карт, а игроков {n}. {verb} {diff}.', addVerb: 'Добавьте', removeVerb: 'Уберите',
    warnTwoDons: 'С {n} игроков играют две семьи — нужно ровно два Дона.', warnOneDon: 'В одной семье должен быть ровно один Дон.', warnShare: 'Чёрных {pct}% — баланс смещён. Обычно 25–35%.',
    okComp: 'Состав собран: {black} чёрных{ww}{maniac}, {red} красных. {note}', okWW: ', Оборотень', okManiac: ', Маньяк', okSim: ' По симуляции: мафия {m}%, город {c}%{x}.', okSimManiac: ', маньяк {v}%', okChanged: ' Состав изменён — баланс не проверен симуляцией.',
    players: 'Игроков', twoFamilies: 'Две семьи: Корвино и Бранди', oneFamily: 'Одна семья', less: 'Меньше', more: 'Больше', playerCount: 'Число игроков',
    mBlack: 'чёрных · {pct}%', mCity: 'за город', mActive: 'активных ролей', composition: 'Состав', resetPreset: 'Сбросить к рекомендованному', names: 'Имена игроков', namesHint: 'По порядку мест за столом. Можно оставить пустыми — останутся номера.', dealCards: 'Раздать карты',
    dealTitle: 'Раздача карт', hostTable: 'Таблица ведущего', allDealt: 'Все карты розданы', hostOnly: 'Только для ведущего', startNight0: 'Начать ознакомительную ночь', hideTable: 'Скрыть таблицу',
    playerOf: 'Игрок {i} из {n}', passPhone: 'Передайте телефон', seatHint: 'Место № {seat}. Пусть игрок откроет карту сам, а потом скроет её.', tapToOpen: 'нажми, чтобы открыть', hidePass: 'Скрыть и передать дальше', openCard: 'Открыть карту', seatTag: '№ {seat}',
    tagNoSkill: 'без навыка', tagRevealed: 'раскрыт', tagVetoUsed: 'отмена использована', tagExecUsed: 'удар использован',
    phNight0: 'Ознакомительная ночь', phDay0: 'Минутки знакомства', phNight: 'Ночь {n}', phDay: 'День {n} · {st}', stMorning: 'Утро', stBalagan: 'Балаган', stSpeeches: 'Минутки', stVote: 'Голосование', stResult: 'Итоги голосования',
    night0Label: 'Ночь 0', day0Label: 'День 0', nightLabel: 'Ночь {n}', dayLabel: 'День {n}',
    stBlack: 'чёрных', stCity: 'за город', stAlive: 'живых', stOut: 'выбыло', aliveShort: '{n} живых',
    btnPlayers: 'Игроки', btnLog: 'Журнал', btnEnd: 'Завершить',
    allMet: 'Все познакомились', canWake: 'Можно будить город', allActed: 'Все роли сделали ход', resolveHint: 'Подведите итоги ночи', cityWakes: 'Город просыпается', resolveNight: 'Подвести итоги ночи', backStep: 'Назад к предыдущему шагу',
    sleepNext: 'Засыпает · дальше', meetRoles: 'Знакомство ролей', activePhase: 'Активная фаза', stepOf: 'Шаг {i} из {n}',
    disabledNote: 'Навык забрал <b>Морфей</b>. Разбудите игрока для вида и уложите спать.', stolenNote: 'Этой ночью способность украл <b>Вор</b> ({player}). Игрок просыпается, но действия нет.',
    recorded: 'Записано: {ability} → {targets}', changePick: 'Изменить выбор', modeCheck: 'Проверка · 1 палец', modeShoot: 'Выстрел · 2 пальца',
    pickThief: 'Первый — у кого крадёт (А), второй — к кому применяет (Б).', pickTwo: 'Выберите двух игроков.', pickOne: 'Выберите игрока.', markA: 'А', markB: 'Б',
    hostAnswer: 'Ответ ведущего', showRed: 'Покажите: игрок красный', showBlack: 'Покажите: игрок чёрный', playerCard: 'Карта игрока · {player}', showSpy: '{team} · покажите карту Шпиону',
    sameColor: 'Один цвет', diffColor: 'Разные цвета', gestureSame: 'Жест: большой палец вверх', gestureDiff: 'Жест: один палец вверх, другой вниз',
    allIntroduced: 'Все представились', citySleeps: 'Город засыпает', sleepNight1: 'Город засыпает · ночь 1', introOf: '{i} из {n}', secIntro: '{s} секунд на знакомство', nextPlayer: 'Следующий игрок', finishIntro: 'Завершить знакомство',
    kamReveals: 'Камикадзе раскрывается', kamWho: '{player} показывает карту и забирает одного игрока. Кого?', kamTake: 'Забрать', kamBtn: 'Камикадзе {seat} раскрывается',
    morning: 'Утро', outN: 'Выбыло: {n}', noLoss: 'Без потерь', noDeaths: 'Этой ночью никто не выбыл. Город проснулся в полном составе.', hostSecret: 'Только ведущему · не объявлять', gameOver: 'Игра окончена · {title}', toBalagan: 'К балагану',
    balagan: 'Балаган', freeTalk: 'Свободное обсуждение', toSpeeches: 'К минуткам', speechesDone: 'Минутки закончены', goVote: 'Переходите к голосованию', toVote: 'К голосованию', speeches: 'Минутки', seconds: '{s} секунд', nextOne: 'Следующий', skipSpeeches: 'Пропустить минутки',
    voteRemove: 'снять', nominated: 'Выставленные на голосование:', capMiller: 'Фрезеровщик {seat}: лимит {cap}', capMayor: 'Мэр {seat}: 1.5 голоса', capDrunk: '{seat} пил с Пьяницей: голос не считается', capAltruist: '{seat} усилен Альтруистом: голос за 2',
    judgeBtn: 'Судья {seat} отменяет голосование', nobodyOut: 'Никто не выбывает', nobody: 'Никто', expel: 'Выгнать {seat} · {v}', expelShort: 'Выгнать {seat}', tie: 'Ничья · {list}', tieHint: 'Переголосуйте между лидерами вживую и выберите итог:',
    voteTitle: 'Голосование', millerToday: 'Лимит Фрезеровщика сегодня: {cap}', hostOnlyShort: 'Только ведущему', noMods: 'Особых поправок сегодня нет.', voteHint: 'Нажмите на кандидата и отметьте, кто за него поднял руку. Веса считаются автоматически.', addCands: 'Добавьте кандидатов, выставленных в минутках.',
    trigAzazel: 'выбирает, кого забрать с собой из игры', trigMorpheus: 'выбирает, чей активный навык забрать до конца игры', attention: 'Внимание', jesterWon: 'Шут победил', jesterText: 'Город выгнал Шута. Для остальных игра продолжается.',
    judgeVetoed: 'Судья отменил голосование', cityDecided: 'Город решил', nobodyLeft: 'Никто не выбыл', leaves: 'Выбывает {seat}', sleepNightN: 'Город засыпает · ночь {n}',
    endTitle: 'Игра окончена', winner: 'Победитель', jesterAlso: 'Шут {player} тоже победил: его выгнали голосованием.', table: 'Стол', gameLog: 'Журнал партии',
    cardsSub: '{n} ролей · у каждой есть активная или пассивная способность', fAll: 'Все', fMafia: 'Мафия', fCity: 'Город', fNeutral: 'Нейтралы',
    side: 'Сторона', forChecks: 'Для проверок', type: 'Тип', order: 'Порядок', wakeN: '{n}-й в ночи', wakeFamily: 'с семьёй', wakeNever: 'не просыпается', howWorks: 'Как работает', lore: 'Лор', tip: 'Совет игроку',
    scenSub: 'Рекомендованный состав для каждого стола', scenIntro: 'Составы подобраны симуляцией так, чтобы мафия и город побеждали примерно поровну. {note} Нажмите на строку, чтобы создать игру с этим составом.',
    balanceNote: 'Доли побед — по 3000 симулированных партий на стол с ботами за каждую роль (одна модель поведения, средний уровень города).',
    scenRow: '{black} чёрных{ww}{maniac} · {red} за город{two}', scenWW: ' + Оборотень', scenManiac: ' + Маньяк', scenTwo: ' · две семьи', simMafia: 'мафия {v}%', simCity: 'город {v}%', simManiac: 'маньяк {v}%', simNights: '{v} ночей',
    settingsSub: 'Таймеры и правила стола', language: 'Язык', sIntro: 'Знакомство', sIntroD: 'Секунд на игрока в день 0', sSpeech: 'Минутка', sSpeechD: 'Секунд на речь игрока', sBalagan: 'Балаган', sBalaganD: 'Свободное обсуждение', sReveal: 'Открывать карты выбывших', sRevealD: 'Ведущий объявляет роль выбывшего игрока', sSound: 'Звук таймера', sSoundD: 'Сигнал по окончании времени', sec: 'с',
    about: 'О прототипе', aboutText: 'Mafia Pro · прототип ведущего. Данные хранятся только на этом устройстве. Полная версия: Telegram Mini App с ботом-раздачей карт, онлайн-режимом с чатом и голосом.',
    playersSheet: 'Игроки', playersHint: 'Нажмите на игрока, чтобы вручную вернуть или убрать его из игры.', inGame: 'в игре', outGame: 'выбыл', removePlayer: 'Убрать из игры', returnPlayer: 'Вернуть в игру',
    logSheet: 'Журнал', logHint: 'Записи с пометкой · только для ведущего.', logEmpty: 'Пока пусто.', resetTitle: 'Завершить партию?', resetText: 'Текущая игра будет удалена с устройства. Журнал можно посмотреть до этого.', resetBtn: 'Завершить',
    toastPreset: 'Состав сброшен', toastOut: 'Выбыл: {list}', pause: 'Пауза', start: 'Старт', plus30: '+30 с', reset: 'Сброс',
    noteBlack: '{n} чёрных', noteManiac: ' и Маньяк', noteWW: ', Оборотень знает семью', noteTwo: ', две семьи', noteCity: 'У города — {list}.'
  }
};
