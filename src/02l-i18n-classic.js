/* Classic (sport / international) mafia: 10 players — Don, 2 Mafia, Sheriff, 6 Citizens. Citizen role texts, scenario, UI and engine strings. */
I18N.ru.roles.citizen = { name: 'Мирный житель', mono: 'Мж', kind: 'Пассивная', short: 'Без способностей. Побеждает вместе с городом — словом и голосом.',
  rules: ['Ночью не просыпается.', 'Для проверок — красный.', 'Выигрывает, когда вся мафия выбыла.'],
  lore: 'Пекарь, таксист, учительница — те, ради кого город вообще стоит. У них нет ни значка, ни пистолета. Только минута речи и один голос.',
  tip: 'Слушайте, считайте голоса, запоминайте, кто за кого голосовал. Ваша сила — в логике и в умении не поддаться давлению.' };
I18N.ru.hooks.citizen = 'мирные решают голосом';
I18N.ru.scenarios.classic = { name: 'Классическая мафия', lore: 'Спортивные правила на 10 игроков: Дон, 2 мафии, Шериф и 6 мирных. Минутные речи по кругу, выставление кандидатов в речи, голосование по порядку выставления, непроголосовавшие — за последнего. Ничья → 30 секунд оправдания → переголосование → подъём всех. Лучший ход первого убитого. Фолы: 3 — без речи, 4 — удаление.' };
Object.assign(I18N.ru.ui, {
  classicTitle: 'Классическая мафия', classicSub: '10 игроков · Дон, 2 мафии, Шериф, 6 мирных', playClassic: 'Играть в классику', classicPill: 'Классика', classicRulesTitle: 'Правила',
  classicRules: ['Ночь 0: мафия знакомится, Дон показывает себя; Шериф показывается ведущему.', 'День: речи по 60 секунд по кругу, первый спикер каждый день сдвигается на одного. В речи можно выставить одного кандидата.', 'Голосование: по порядку выставления; не проголосовавшие — за последнего. В первый день с одним кандидатом голосование не проводится.', 'Ничья: по 30 секунд оправдания, переголосование между ними; снова ничья — подъём всех (больше половины живых).', 'Ночь: мафия показывает одного игрока одновременно — разные номера значит промах. Затем Дон ищет Шерифа, затем Шериф проверяет цвет.', 'Убитый ночью говорит последнюю минуту; убитый первой ночью называет до 3 подозреваемых (лучший ход).', 'Фолы: 3 — без речи, 4 — удаление из игры.'],
  nominate: 'Выставить кандидата', nominatedSeat: 'Выставил №{seat}', nominateHint: 'В своей речи игрок может выставить одного кандидата', unnominate: 'Снять', nominatedList: 'Выставлены: {list}',
  day1OneCand: 'Первый день, один кандидат — голосование не проводится.', toNightNoVote: 'Без голосования — город засыпает',
  closeVote: 'Завершить голосование', closeVoteHint: 'Не проголосовавшие уходят за последнего кандидата, итог считается автоматически.',
  stLift: 'Подъём всех', liftTitle: 'Подъём всех', liftHint: 'Снова ничья между {list}. Кто за то, чтобы выбыли все? Нужно больше половины живых.', liftCount: 'За: {n} из {alive} · нужно {need}', liftYes: 'Поднять всех', liftNo: 'Никто не выбывает', liftDecided: 'Подъём всех', liftFailed: 'Подъём не прошёл',
  bestMove: 'Лучший ход', bestMoveHint: '{player} выбыл первой ночью и называет до 3 подозреваемых.', bestMoveSave: 'Записать', bestMoveSkip: 'Без лучшего хода', bestMoveDone: 'Лучший ход {player}: {list}',
  lastWord: 'Последняя речь', firstSpeaker: 'Речи с №{seat}',
  fouls: 'Фолы', foulAdd: '+ фол', foulRemove: '− фол', foulsN: '{n} фол.', foulNoSpeech: '3 фола — без речи', foulOut: '4 фола — удаление',
  missShot: 'Промах (разные номера)', missHint: 'Мафия показывает номер одновременно: разные номера — промах, никто не выбывает.'
});
Object.assign(I18N.ru.e, { causeLift: 'подъём всех · {n} {votes}', causeFouls: '4 фола', logLiftPass: 'Подъём всех: за {n}, нужно {need} — выбывают {list}.', logLiftFail: 'Подъём всех: за {n}, нужно {need} — никто не выбывает.', logBestMove: 'Лучший ход {player}: {list}.', logNoVoteDay1: 'Первый день, один кандидат — голосование не проводится.', logFoul: '{player}: фол {n}.', logNominate: '{player} выставляет {target}.' });

I18N.uk.roles.citizen = { name: 'Мирний житель', mono: 'Мж', kind: 'Пасивна', short: 'Без здібностей. Перемагає разом із містом — словом і голосом.',
  rules: ['Уночі не прокидається.', 'Для перевірок — червоний.', 'Виграє, коли вся мафія вибула.'],
  lore: 'Пекар, таксист, вчителька — ті, заради кого місто взагалі стоїть. У них немає ні значка, ні пістолета. Лише хвилина промови й один голос.',
  tip: 'Слухайте, рахуйте голоси, запамʼятовуйте, хто за кого голосував. Ваша сила — у логіці та вмінні не піддатися тиску.' };
I18N.uk.hooks.citizen = 'мирні вирішують голосом';
I18N.uk.scenarios.classic = { name: 'Класична мафія', lore: 'Спортивні правила на 10 гравців: Дон, 2 мафії, Шериф і 6 мирних. Хвилинні промови по колу, виставлення кандидатів у промові, голосування за порядком виставлення, ті, хто не голосував, — за останнього. Нічия → 30 секунд виправдання → переголосування → підйом усіх. Найкращий хід першого вбитого. Фоли: 3 — без промови, 4 — видалення.' };
Object.assign(I18N.uk.ui, {
  classicTitle: 'Класична мафія', classicSub: '10 гравців · Дон, 2 мафії, Шериф, 6 мирних', playClassic: 'Грати в класику', classicPill: 'Класика', classicRulesTitle: 'Правила',
  classicRules: ['Ніч 0: мафія знайомиться, Дон показує себе; Шериф показується ведучому.', 'День: промови по 60 секунд по колу, перший спікер щодня зсувається на одного. У промові можна виставити одного кандидата.', 'Голосування: за порядком виставлення; ті, хто не голосував, — за останнього. Першого дня з одним кандидатом голосування не проводиться.', 'Нічия: по 30 секунд виправдання, переголосування між ними; знову нічия — підйом усіх (більше половини живих).', 'Ніч: мафія показує одного гравця одночасно — різні номери означають промах. Потім Дон шукає Шерифа, потім Шериф перевіряє колір.', 'Убитий уночі говорить останню хвилину; вбитий першої ночі називає до 3 підозрюваних (найкращий хід).', 'Фоли: 3 — без промови, 4 — видалення з гри.'],
  nominate: 'Виставити кандидата', nominatedSeat: 'Виставив №{seat}', nominateHint: 'У своїй промові гравець може виставити одного кандидата', unnominate: 'Зняти', nominatedList: 'Виставлені: {list}',
  day1OneCand: 'Перший день, один кандидат — голосування не проводиться.', toNightNoVote: 'Без голосування — місто засинає',
  closeVote: 'Завершити голосування', closeVoteHint: 'Ті, хто не голосував, ідуть за останнього кандидата, підсумок рахується автоматично.',
  stLift: 'Підйом усіх', liftTitle: 'Підйом усіх', liftHint: 'Знову нічия між {list}. Хто за те, щоб вибули всі? Потрібно більше половини живих.', liftCount: 'За: {n} з {alive} · потрібно {need}', liftYes: 'Підняти всіх', liftNo: 'Ніхто не вибуває', liftDecided: 'Підйом усіх', liftFailed: 'Підйом не пройшов',
  bestMove: 'Найкращий хід', bestMoveHint: '{player} вибув першої ночі й називає до 3 підозрюваних.', bestMoveSave: 'Записати', bestMoveSkip: 'Без найкращого ходу', bestMoveDone: 'Найкращий хід {player}: {list}',
  lastWord: 'Остання промова', firstSpeaker: 'Промови з №{seat}',
  fouls: 'Фоли', foulAdd: '+ фол', foulRemove: '− фол', foulsN: '{n} фол.', foulNoSpeech: '3 фоли — без промови', foulOut: '4 фоли — видалення',
  missShot: 'Промах (різні номери)', missHint: 'Мафія показує номер одночасно: різні номери — промах, ніхто не вибуває.'
});
Object.assign(I18N.uk.e, { causeLift: 'підйом усіх · {n} {votes}', causeFouls: '4 фоли', logLiftPass: 'Підйом усіх: за {n}, потрібно {need} — вибувають {list}.', logLiftFail: 'Підйом усіх: за {n}, потрібно {need} — ніхто не вибуває.', logBestMove: 'Найкращий хід {player}: {list}.', logNoVoteDay1: 'Перший день, один кандидат — голосування не проводиться.', logFoul: '{player}: фол {n}.', logNominate: '{player} виставляє {target}.' });

I18N.en.roles.citizen = { name: 'Citizen', mono: 'Ci', kind: 'Passive', short: 'No abilities. Wins with the town — by word and by vote.',
  rules: ['Does not wake at night.', 'Reads as red.', 'Wins when the whole mafia is out.'],
  lore: 'A baker, a cab driver, a schoolteacher — the people the town exists for. No badge, no gun. Just a minute to speak and one vote.',
  tip: 'Listen, count the votes, remember who voted for whom. Your strength is logic and not caving to pressure.' };
I18N.en.hooks.citizen = 'citizens decide by vote';
I18N.en.scenarios.classic = { name: 'Classic Mafia', lore: 'Sport rules for 10 players: Don, 2 Mafia, Sheriff and 6 Citizens. One-minute speeches in a circle, nominations during speeches, voting in nomination order, non-voters go to the last candidate. Tie → 30-second defence → re-vote → lift all. Best move of the first victim. Fouls: 3 — no speech, 4 — removal.' };
Object.assign(I18N.en.ui, {
  classicTitle: 'Classic Mafia', classicSub: '10 players · Don, 2 Mafia, Sheriff, 6 Citizens', playClassic: 'Play classic', classicPill: 'Classic', classicRulesTitle: 'Rules',
  classicRules: ['Night 0: the mafia meets, the Don shows himself; the Sheriff shows himself to the host.', 'Day: 60-second speeches in a circle, the first speaker shifts by one every day. A speaker may nominate one candidate.', 'Vote: in nomination order; non-voters go to the last candidate. On day 1 a single candidate is not voted on.', 'Tie: 30 seconds of defence each, re-vote between them; tied again — lift all (more than half of the living).', 'Night: the mafia points at one player simultaneously — different numbers mean a miss. Then the Don looks for the Sheriff, then the Sheriff checks a colour.', 'The night victim gets a last minute; the first-night victim names up to 3 suspects (best move).', 'Fouls: 3 — no speech, 4 — removed from the game.'],
  nominate: 'Nominate', nominatedSeat: 'Nominated seat {seat}', nominateHint: 'A speaker may nominate one candidate during their speech', unnominate: 'Withdraw', nominatedList: 'Nominated: {list}',
  day1OneCand: 'Day 1, a single candidate — no vote is held.', toNightNoVote: 'No vote — the town sleeps',
  closeVote: 'Close the vote', closeVoteHint: 'Non-voters go to the last candidate; the result is resolved automatically.',
  stLift: 'Lift all', liftTitle: 'Lift all', liftHint: 'Tied again between {list}. Who is for all of them leaving? More than half of the living is needed.', liftCount: 'For: {n} of {alive} · need {need}', liftYes: 'Lift all', liftNo: 'Nobody leaves', liftDecided: 'All lifted', liftFailed: 'The lift failed',
  bestMove: 'Best move', bestMoveHint: '{player} died on the first night and names up to 3 suspects.', bestMoveSave: 'Record', bestMoveSkip: 'No best move', bestMoveDone: 'Best move of {player}: {list}',
  lastWord: 'Last words', firstSpeaker: 'Speeches from seat {seat}',
  fouls: 'Fouls', foulAdd: '+ foul', foulRemove: '− foul', foulsN: '{n} foul(s)', foulNoSpeech: '3 fouls — no speech', foulOut: '4 fouls — removed',
  missShot: 'Miss (different numbers)', missHint: 'The mafia shows a number simultaneously: different numbers — a miss, nobody dies.'
});
Object.assign(I18N.en.e, { causeLift: 'lift all · {n} {votes}', causeFouls: '4 fouls', logLiftPass: 'Lift all: {n} for, {need} needed — {list} leave.', logLiftFail: 'Lift all: {n} for, {need} needed — nobody leaves.', logBestMove: 'Best move of {player}: {list}.', logNoVoteDay1: 'Day 1, a single candidate — no vote is held.', logFoul: '{player}: foul {n}.', logNominate: '{player} nominates {target}.' });

I18N.pl.roles.citizen = { name: 'Mieszkaniec', mono: 'Mi', kind: 'Pasywna', short: 'Bez zdolności. Wygrywa razem z miastem — słowem i głosem.',
  rules: ['Nie budzi się w nocy.', 'Przy sprawdzeniu — czerwony.', 'Wygrywa, gdy cała mafia odpadnie.'],
  lore: 'Piekarz, taksówkarz, nauczycielka — ci, dla których miasto w ogóle istnieje. Bez odznaki, bez pistoletu. Tylko minuta mowy i jeden głos.',
  tip: 'Słuchaj, licz głosy, pamiętaj, kto na kogo głosował. Twoja siła to logika i odporność na presję.' };
I18N.pl.hooks.citizen = 'mieszkańcy decydują głosem';
I18N.pl.scenarios.classic = { name: 'Mafia klasyczna', lore: 'Zasady sportowe na 10 graczy: Don, 2 mafiosów, Szeryf i 6 mieszkańców. Minutowe mowy po kolei, zgłaszanie kandydatów w mowie, głosowanie w kolejności zgłoszeń, niegłosujący — na ostatniego. Remis → 30 sekund obrony → ponowne głosowanie → podniesienie wszystkich. Najlepszy ruch pierwszej ofiary. Faule: 3 — bez mowy, 4 — usunięcie.' };
Object.assign(I18N.pl.ui, {
  classicTitle: 'Mafia klasyczna', classicSub: '10 graczy · Don, 2 mafiosów, Szeryf, 6 mieszkańców', playClassic: 'Graj w klasykę', classicPill: 'Klasyka', classicRulesTitle: 'Zasady',
  classicRules: ['Noc 0: mafia się poznaje, Don pokazuje siebie; Szeryf pokazuje się prowadzącemu.', 'Dzień: mowy po 60 sekund po kolei, pierwszy mówca przesuwa się co dzień o jednego. W mowie można zgłosić jednego kandydata.', 'Głosowanie: w kolejności zgłoszeń; niegłosujący — na ostatniego. Pierwszego dnia przy jednym kandydacie głosowania nie ma.', 'Remis: po 30 sekund obrony, ponowne głosowanie między nimi; znów remis — podniesienie wszystkich (więcej niż połowa żywych).', 'Noc: mafia wskazuje jednego gracza jednocześnie — różne numery to pudło. Potem Don szuka Szeryfa, potem Szeryf sprawdza kolor.', 'Zabity w nocy ma ostatnią minutę; zabity pierwszej nocy wskazuje do 3 podejrzanych (najlepszy ruch).', 'Faule: 3 — bez mowy, 4 — usunięcie z gry.'],
  nominate: 'Zgłoś kandydata', nominatedSeat: 'Zgłosił nr {seat}', nominateHint: 'W swojej mowie gracz może zgłosić jednego kandydata', unnominate: 'Wycofaj', nominatedList: 'Zgłoszeni: {list}',
  day1OneCand: 'Pierwszy dzień, jeden kandydat — głosowania nie ma.', toNightNoVote: 'Bez głosowania — miasto zasypia',
  closeVote: 'Zakończ głosowanie', closeVoteHint: 'Niegłosujący idą na ostatniego kandydata, wynik liczy się automatycznie.',
  stLift: 'Podniesienie wszystkich', liftTitle: 'Podniesienie wszystkich', liftHint: 'Znów remis między {list}. Kto jest za tym, by odpadli wszyscy? Potrzeba więcej niż połowy żywych.', liftCount: 'Za: {n} z {alive} · potrzeba {need}', liftYes: 'Podnieść wszystkich', liftNo: 'Nikt nie odpada', liftDecided: 'Podniesiono wszystkich', liftFailed: 'Podniesienie nie przeszło',
  bestMove: 'Najlepszy ruch', bestMoveHint: '{player} odpadł pierwszej nocy i wskazuje do 3 podejrzanych.', bestMoveSave: 'Zapisz', bestMoveSkip: 'Bez najlepszego ruchu', bestMoveDone: 'Najlepszy ruch {player}: {list}',
  lastWord: 'Ostatnia mowa', firstSpeaker: 'Mowy od nr {seat}',
  fouls: 'Faule', foulAdd: '+ faul', foulRemove: '− faul', foulsN: '{n} faul.', foulNoSpeech: '3 faule — bez mowy', foulOut: '4 faule — usunięcie',
  missShot: 'Pudło (różne numery)', missHint: 'Mafia pokazuje numer jednocześnie: różne numery — pudło, nikt nie ginie.'
});
Object.assign(I18N.pl.e, { causeLift: 'podniesienie wszystkich · {n} {votes}', causeFouls: '4 faule', logLiftPass: 'Podniesienie wszystkich: za {n}, potrzeba {need} — odpadają {list}.', logLiftFail: 'Podniesienie wszystkich: za {n}, potrzeba {need} — nikt nie odpada.', logBestMove: 'Najlepszy ruch {player}: {list}.', logNoVoteDay1: 'Pierwszy dzień, jeden kandydat — głosowania nie ma.', logFoul: '{player}: faul {n}.', logNominate: '{player} zgłasza {target}.' });

I18N.hy.roles.citizen = { name: 'Խաղաղ բնակիչ', mono: 'Խբ', kind: 'Պասիվ', short: 'Առանց կարողությունների։ Հաղթում է քաղաքի հետ՝ խոսքով և ձայնով։',
  rules: ['Գիշերը չի արթնանում։', 'Ստուգումների համար՝ կարմիր։', 'Հաղթում է, երբ ողջ մաֆիան դուրս է եկել։'],
  lore: 'Հացթուխ, տաքսու վարորդ, ուսուցչուհի՝ նրանք, ում համար քաղաքն ընդհանրապես կա։ Ոչ կրծքանշան, ոչ ատրճանակ։ Միայն մեկ րոպե խոսք և մեկ ձայն։',
  tip: 'Լսեք, հաշվեք ձայները, հիշեք, թե ով ում դեմ է քվեարկել։ Ձեր ուժը տրամաբանությունն է և ճնշմանը չտրվելը։' };
I18N.hy.hooks.citizen = 'խաղաղները որոշում են ձայնով';
I18N.hy.scenarios.classic = { name: 'Դասական մաֆիա', lore: 'Սպորտային կանոններ 10 խաղացողի համար՝ Դոն, 2 մաֆիա, Շերիֆ և 6 խաղաղ։ Մեկ րոպեանոց խոսքեր շրջանով, թեկնածուների առաջադրում խոսքի մեջ, քվեարկություն առաջադրման հերթականությամբ, չքվեարկածները՝ վերջինի դեմ։ Հավասար → 30 վայրկյան արդարացում → կրկնական քվեարկություն → բոլորի հանում։ Առաջին զոհի լավագույն քայլ։ Ֆոլեր՝ 3 — առանց խոսքի, 4 — հեռացում։' };
Object.assign(I18N.hy.ui, {
  classicTitle: 'Դասական մաֆիա', classicSub: '10 խաղացող · Դոն, 2 մաֆիա, Շերիֆ, 6 խաղաղ', playClassic: 'Խաղալ դասական', classicPill: 'Դասական', classicRulesTitle: 'Կանոններ',
  classicRules: ['Գիշեր 0. մաֆիան ծանոթանում է, Դոնը ցույց է տալիս իրեն; Շերիֆը ցույց է տալիս իրեն վարողին։', 'Ցերեկ. 60 վայրկյանանոց խոսքեր շրջանով, առաջին խոսողը ամեն օր տեղաշարժվում է մեկով։ Խոսքի մեջ կարելի է առաջադրել մեկ թեկնածու։', 'Քվեարկություն. առաջադրման հերթականությամբ; չքվեարկածները՝ վերջինի դեմ։ Առաջին օրը մեկ թեկնածուի դեպքում քվեարկություն չի անցկացվում։', 'Հավասար ձայներ. յուրաքանչյուրին 30 վայրկյան արդարացում, կրկնական քվեարկություն նրանց միջև; նորից հավասար — բոլորի հանում (ողջերի կեսից ավելին)։', 'Գիշեր. մաֆիան միաժամանակ ցույց է տալիս մեկ խաղացողի — տարբեր համարները վրիպում են։ Հետո Դոնը փնտրում է Շերիֆին, հետո Շերիֆը ստուգում է գույնը։', 'Գիշերը սպանվածն ունի վերջին րոպե; առաջին գիշերը սպանվածը նշում է մինչև 3 կասկածյալ (լավագույն քայլ)։', 'Ֆոլեր. 3 — առանց խոսքի, 4 — հեռացում խաղից։'],
  nominate: 'Առաջադրել թեկնածու', nominatedSeat: 'Առաջադրեց տեղ {seat}', nominateHint: 'Իր խոսքում խաղացողը կարող է առաջադրել մեկ թեկնածու', unnominate: 'Հանել', nominatedList: 'Առաջադրված են՝ {list}',
  day1OneCand: 'Առաջին օր, մեկ թեկնածու — քվեարկություն չի անցկացվում։', toNightNoVote: 'Առանց քվեարկության — քաղաքը քնում է',
  closeVote: 'Ավարտել քվեարկությունը', closeVoteHint: 'Չքվեարկածները գնում են վերջին թեկնածուի դեմ, արդյունքը հաշվվում է ավտոմատ։',
  stLift: 'Բոլորի հանում', liftTitle: 'Բոլորի հանում', liftHint: 'Նորից հավասար {list}-ի միջև։ Ո՞վ է կողմ, որ բոլորը դուրս գան։ Անհրաժեշտ է ողջերի կեսից ավելին։', liftCount: 'Կողմ՝ {n}/{alive} · անհրաժեշտ է {need}', liftYes: 'Հանել բոլորին', liftNo: 'Ոչ ոք դուրս չի գալիս', liftDecided: 'Բոլորը հանվեցին', liftFailed: 'Հանումը չանցավ',
  bestMove: 'Լավագույն քայլ', bestMoveHint: '{player}-ը դուրս եկավ առաջին գիշերը և նշում է մինչև 3 կասկածյալ։', bestMoveSave: 'Գրանցել', bestMoveSkip: 'Առանց լավագույն քայլի', bestMoveDone: '{player}-ի լավագույն քայլը՝ {list}',
  lastWord: 'Վերջին խոսք', firstSpeaker: 'Խոսքերը տեղ {seat}-ից',
  fouls: 'Ֆոլեր', foulAdd: '+ ֆոլ', foulRemove: '− ֆոլ', foulsN: '{n} ֆոլ', foulNoSpeech: '3 ֆոլ — առանց խոսքի', foulOut: '4 ֆոլ — հեռացում',
  missShot: 'Վրիպում (տարբեր համարներ)', missHint: 'Մաֆիան միաժամանակ ցույց է տալիս համար. տարբեր համարներ — վրիպում, ոչ ոք չի մահանում։'
});
Object.assign(I18N.hy.e, { causeLift: 'բոլորի հանում · {n} {votes}', causeFouls: '4 ֆոլ', logLiftPass: 'Բոլորի հանում. կողմ {n}, անհրաժեշտ {need} — դուրս են գալիս {list}։', logLiftFail: 'Բոլորի հանում. կողմ {n}, անհրաժեշտ {need} — ոչ ոք դուրս չի գալիս։', logBestMove: '{player}-ի լավագույն քայլը՝ {list}։', logNoVoteDay1: 'Առաջին օր, մեկ թեկնածու — քվեարկություն չի անցկացվում։', logFoul: '{player}՝ ֆոլ {n}։', logNominate: '{player}-ն առաջադրում է {target}-ին։' });
