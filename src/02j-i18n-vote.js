/* Day vote v9: no skipping, tie → defence speeches → re-vote (only between the tied), tie again → roulette (guess 1–9). */
Object.assign(I18N.ru.ui, {
  stTie: 'Оправдательные речи', stRoulette: 'Рулетка',
  revoteTitle: 'Переголосование', revoteHint2: 'Только между №{list}. Сами кандидаты не голосуют.', revoteHint3: 'Только между №{list}. Кандидаты тоже голосуют.',
  tieGo: 'Оправдательные речи и переголосование', tieSpeeches: 'Оправдательные речи', tieSpeechOf: '{i} из {n} · {s} секунд', toRevote: 'К переголосованию',
  rouletteTitle: 'Рулетка', rouletteHint: 'Загадано число от 1 до 9. Кандидаты по очереди называют число — кто угадает, тот выбывает.', rouletteTurn: 'Называет число',
  rouletteMiss: '№{seat} — мимо', rouletteHit: 'Число {n} угадал №{seat}', rouletteGo: 'Снова ничья — рулетка', rouletteDecided: 'Рулетка решила', rouletteNamed: 'Названо: {list}',
  noVotesYet: 'Голосование нельзя пропустить — отметьте, кто за кого поднял руку.', restToLast: 'Остальные — за №{seat}', noCandsNight: 'Кандидатов нет — город засыпает',
  sTie: 'Оправдательная речь', sTieD: 'При ничьей — каждому из лидеров'
});
Object.assign(I18N.ru.e, { causeRevote: 'переголосование · {n} {votes}', causeRoulette: 'рулетка · число {n}', logTie: 'Ничья: {list}. Оправдательные речи.', logRevote: 'Переголосование между {list}.', logRoulette: 'Ничья в переголосовании. Рулетка между {list}, загадано {n}.', logRouletteMiss: '{player}: {n} — мимо', logRouletteHit: '{player}: {n} — попадание' });

Object.assign(I18N.uk.ui, {
  stTie: 'Виправдальні промови', stRoulette: 'Рулетка',
  revoteTitle: 'Переголосування', revoteHint2: 'Лише між №{list}. Самі кандидати не голосують.', revoteHint3: 'Лише між №{list}. Кандидати теж голосують.',
  tieGo: 'Виправдальні промови та переголосування', tieSpeeches: 'Виправдальні промови', tieSpeechOf: '{i} з {n} · {s} секунд', toRevote: 'До переголосування',
  rouletteTitle: 'Рулетка', rouletteHint: 'Загадано число від 1 до 9. Кандидати по черзі називають число — хто вгадає, той вибуває.', rouletteTurn: 'Називає число',
  rouletteMiss: '№{seat} — повз', rouletteHit: 'Число {n} вгадав №{seat}', rouletteGo: 'Знову нічия — рулетка', rouletteDecided: 'Рулетка вирішила', rouletteNamed: 'Названо: {list}',
  noVotesYet: 'Голосування не можна пропустити — позначте, хто за кого підняв руку.', restToLast: 'Решта — за №{seat}', noCandsNight: 'Кандидатів немає — місто засинає',
  sTie: 'Виправдальна промова', sTieD: 'За нічиєї — кожному з лідерів'
});
Object.assign(I18N.uk.e, { causeRevote: 'переголосування · {n} {votes}', causeRoulette: 'рулетка · число {n}', logTie: 'Нічия: {list}. Виправдальні промови.', logRevote: 'Переголосування між {list}.', logRoulette: 'Нічия у переголосуванні. Рулетка між {list}, загадано {n}.', logRouletteMiss: '{player}: {n} — повз', logRouletteHit: '{player}: {n} — влучання' });

Object.assign(I18N.en.ui, {
  stTie: 'Defence speeches', stRoulette: 'Roulette',
  revoteTitle: 'Re-vote', revoteHint2: 'Only between seats {list}. The candidates themselves do not vote.', revoteHint3: 'Only between seats {list}. The candidates vote too.',
  tieGo: 'Defence speeches and re-vote', tieSpeeches: 'Defence speeches', tieSpeechOf: '{i} of {n} · {s} seconds', toRevote: 'To the re-vote',
  rouletteTitle: 'Roulette', rouletteHint: 'A number from 1 to 9 has been picked. The candidates name numbers in turn — whoever hits it is out.', rouletteTurn: 'Names a number',
  rouletteMiss: 'Seat {seat} — miss', rouletteHit: 'Seat {seat} hit the number {n}', rouletteGo: 'Tied again — roulette', rouletteDecided: 'Roulette decided', rouletteNamed: 'Named: {list}',
  noVotesYet: 'The vote cannot be skipped — mark who raised a hand for whom.', restToLast: 'The rest — for seat {seat}', noCandsNight: 'No candidates — the town sleeps',
  sTie: 'Defence speech', sTieD: 'On a tie — for each of the leaders'
});
Object.assign(I18N.en.e, { causeRevote: 're-vote · {n} {votes}', causeRoulette: 'roulette · number {n}', logTie: 'Tie: {list}. Defence speeches.', logRevote: 'Re-vote between {list}.', logRoulette: 'Tie in the re-vote. Roulette between {list}, the number is {n}.', logRouletteMiss: '{player}: {n} — miss', logRouletteHit: '{player}: {n} — hit' });

Object.assign(I18N.pl.ui, {
  stTie: 'Mowy obrończe', stRoulette: 'Ruletka',
  revoteTitle: 'Ponowne głosowanie', revoteHint2: 'Tylko między nr {list}. Sami kandydaci nie głosują.', revoteHint3: 'Tylko między nr {list}. Kandydaci też głosują.',
  tieGo: 'Mowy obrończe i ponowne głosowanie', tieSpeeches: 'Mowy obrończe', tieSpeechOf: '{i} z {n} · {s} sekund', toRevote: 'Do ponownego głosowania',
  rouletteTitle: 'Ruletka', rouletteHint: 'Wylosowano liczbę od 1 do 9. Kandydaci po kolei podają liczbę — kto trafi, ten odpada.', rouletteTurn: 'Podaje liczbę',
  rouletteMiss: 'Nr {seat} — pudło', rouletteHit: 'Liczbę {n} trafił nr {seat}', rouletteGo: 'Znów remis — ruletka', rouletteDecided: 'Ruletka zdecydowała', rouletteNamed: 'Podane: {list}',
  noVotesYet: 'Głosowania nie można pominąć — zaznacz, kto za kogo podniósł rękę.', restToLast: 'Pozostali — za nr {seat}', noCandsNight: 'Brak kandydatów — miasto zasypia',
  sTie: 'Mowa obrończa', sTieD: 'Przy remisie — dla każdego z liderów'
});
Object.assign(I18N.pl.e, { causeRevote: 'ponowne głosowanie · {n} {votes}', causeRoulette: 'ruletka · liczba {n}', logTie: 'Remis: {list}. Mowy obrończe.', logRevote: 'Ponowne głosowanie między {list}.', logRoulette: 'Remis w ponownym głosowaniu. Ruletka między {list}, wylosowano {n}.', logRouletteMiss: '{player}: {n} — pudło', logRouletteHit: '{player}: {n} — trafienie' });

Object.assign(I18N.hy.ui, {
  stTie: 'Արդարացման խոսքեր', stRoulette: 'Ռուլետկա',
  revoteTitle: 'Կրկնական քվեարկություն', revoteHint2: 'Միայն {list} տեղերի միջև։ Թեկնածուներն իրենք չեն քվեարկում։', revoteHint3: 'Միայն {list} տեղերի միջև։ Թեկնածուները նույնպես քվեարկում են։',
  tieGo: 'Արդարացման խոսքեր և կրկնական քվեարկություն', tieSpeeches: 'Արդարացման խոսքեր', tieSpeechOf: '{i}/{n} · {s} վայրկյան', toRevote: 'Դեպի կրկնական քվեարկություն',
  rouletteTitle: 'Ռուլետկա', rouletteHint: 'Մտապահված է թիվ 1-ից 9։ Թեկնածուները հերթով թիվ են ասում. ով գուշակի՝ դուրս է գալիս։', rouletteTurn: 'Թիվ է ասում',
  rouletteMiss: 'Տեղ {seat} — վրիպում', rouletteHit: '{n} թիվը գուշակեց տեղ {seat}-ը', rouletteGo: 'Նորից հավասար — ռուլետկա', rouletteDecided: 'Ռուլետկան որոշեց', rouletteNamed: 'Ասված են՝ {list}',
  noVotesYet: 'Քվեարկությունը չի կարելի բաց թողնել — նշեք, թե ով ում օգտին ձեռք բարձրացրեց։', restToLast: 'Մնացածը — տեղ {seat}-ի դեմ', noCandsNight: 'Թեկնածուներ չկան — քաղաքը քնում է',
  sTie: 'Արդարացման խոսք', sTieD: 'Հավասար ձայների դեպքում՝ առաջատարներից յուրաքանչյուրին'
});
Object.assign(I18N.hy.e, { causeRevote: 'կրկնական քվեարկություն · {n} {votes}', causeRoulette: 'ռուլետկա · թիվ {n}', logTie: 'Հավասար ձայներ՝ {list}։ Արդարացման խոսքեր։', logRevote: 'Կրկնական քվեարկություն {list}-ի միջև։', logRoulette: 'Հավասար ձայներ կրկնական քվեարկությունում։ Ռուլետկա {list}-ի միջև, մտապահված է {n}։', logRouletteMiss: '{player}՝ {n} — վրիպում', logRouletteHit: '{player}՝ {n} — դիպուկ' });
/* v46: Back over a finished night / day / vote; Azazel killed at night takes a player at the day's results */
Object.assign(I18N.ru.ui, {
  undoToNight: 'Назад к ночи', undoToDay: 'Назад ко дню', undoToVote: 'Назад к голосованию', undoDone: 'Вернулись на шаг назад',
  trigAzazelNight: 'убит этой ночью — на итогах дня может забрать с собой любого игрока или отказаться', trigSkip: 'Не забирать',
  azazelNightHint: 'Азазель №{seat} убит ночью — на итогах дня он может забрать с собой любого игрока',
  tbAzazelNight: 'Вас убили ночью. Как Азазель вы можете забрать с собой любого игрока — или отказаться.'
});
Object.assign(I18N.ru.e, { logAzazelSkip: '{player} (Азазель) никого не забрал', logUndo: 'Ведущий вернул игру назад: {what}' });
Object.assign(I18N.uk.ui, {
  undoToNight: 'Назад до ночі', undoToDay: 'Назад до дня', undoToVote: 'Назад до голосування', undoDone: 'Повернулися на крок назад',
  trigAzazelNight: 'убитий цієї ночі — на підсумках дня може забрати із собою будь-якого гравця або відмовитися', trigSkip: 'Не забирати',
  azazelNightHint: 'Азазеля №{seat} убили вночі — на підсумках дня він може забрати із собою будь-якого гравця',
  tbAzazelNight: 'Вас убили вночі. Як Азазель ви можете забрати із собою будь-якого гравця — або відмовитися.'
});
Object.assign(I18N.uk.e, { logAzazelSkip: '{player} (Азазель) нікого не забрав', logUndo: 'Ведучий повернув гру назад: {what}' });
Object.assign(I18N.en.ui, {
  undoToNight: 'Back to the night', undoToDay: 'Back to the day', undoToVote: 'Back to the vote', undoDone: 'Went one step back',
  trigAzazelNight: 'was killed last night — at the day\'s results may take any player along, or let it go', trigSkip: 'Take no one',
  azazelNightHint: 'Azazel (seat {seat}) was killed at night — at the day\'s results he may take any player along',
  tbAzazelNight: 'You were killed at night. As Azazel you may take any player along — or let it go.'
});
Object.assign(I18N.en.e, { logAzazelSkip: '{player} (Azazel) took no one', logUndo: 'The host turned the game back: {what}' });
Object.assign(I18N.pl.ui, {
  undoToNight: 'Wróć do nocy', undoToDay: 'Wróć do dnia', undoToVote: 'Wróć do głosowania', undoDone: 'Cofnięto o krok',
  trigAzazelNight: 'zginął tej nocy — przy podsumowaniu dnia może zabrać ze sobą dowolnego gracza albo zrezygnować', trigSkip: 'Nikogo nie zabierać',
  azazelNightHint: 'Azazel (nr {seat}) zginął w nocy — przy podsumowaniu dnia może zabrać ze sobą dowolnego gracza',
  tbAzazelNight: 'Zginąłeś w nocy. Jako Azazel możesz zabrać ze sobą dowolnego gracza — albo zrezygnować.'
});
Object.assign(I18N.pl.e, { logAzazelSkip: '{player} (Azazel) nikogo nie zabrał', logUndo: 'Prowadzący cofnął grę: {what}' });
Object.assign(I18N.hy.ui, {
  undoToNight: 'Հետ՝ գիշերին', undoToDay: 'Հետ՝ ցերեկին', undoToVote: 'Հետ՝ քվեարկությանը', undoDone: 'Վերադարձանք մեկ քայլ հետ',
  trigAzazelNight: 'սպանվել է այս գիշեր — օրվա արդյունքներում կարող է իր հետ տանել ցանկացած խաղացողի կամ հրաժարվել', trigSkip: 'Ոչ ոքի չտանել',
  azazelNightHint: 'Ազազելը (տեղ {seat}) սպանվել է գիշերը — օրվա արդյունքներում նա կարող է իր հետ տանել ցանկացած խաղացողի',
  tbAzazelNight: 'Ձեզ սպանել են գիշերը։ Որպես Ազազել՝ կարող եք ձեզ հետ տանել ցանկացած խաղացողի կամ հրաժարվել։'
});
Object.assign(I18N.hy.e, { logAzazelSkip: '{player}-ը (Ազազել) ոչ ոքի չտարավ', logUndo: 'Վարողը խաղը հետ վերադարձրեց՝ {what}' });
/* v47: the host's voting table — "Player 1 votes → picks a player", row by row */
Object.assign(I18N.ru.ui, { vtTitle: 'Кто за кого голосует', vtHint: 'Идите по списку: отметьте, за кого голосует каждый игрок.', vtHintFree: 'Идите по списку: каждый игрок называет, за кого голосует, — отметьте его выбор. Кандидаты появятся сами.', vtOther: 'Другой игрок', vtPick: 'Выбрать' });
Object.assign(I18N.uk.ui, { vtTitle: 'Хто за кого голосує', vtHint: 'Ідіть за списком: позначте, за кого голосує кожен гравець.', vtHintFree: 'Ідіть за списком: кожен гравець називає, за кого голосує, — позначте його вибір. Кандидати з’являться самі.', vtOther: 'Інший гравець', vtPick: 'Обрати' });
Object.assign(I18N.en.ui, { vtTitle: 'Who votes for whom', vtHint: 'Go down the list and mark whom each player votes for.', vtHintFree: 'Go down the list: each player names whom they vote for — mark the choice. Candidates appear by themselves.', vtOther: 'Another player', vtPick: 'Pick' });
Object.assign(I18N.pl.ui, { vtTitle: 'Kto na kogo głosuje', vtHint: 'Idź po liście i zaznacz, na kogo głosuje każdy gracz.', vtHintFree: 'Idź po liście: każdy gracz mówi, na kogo głosuje — zaznacz jego wybór. Kandydaci pojawią się sami.', vtOther: 'Inny gracz', vtPick: 'Wybierz' });
Object.assign(I18N.hy.ui, { vtTitle: 'Ով ում օգտին է քվեարկում', vtHint: 'Անցեք ցուցակով և նշեք, թե ում օգտին է քվեարկում յուրաքանչյուր խաղացող։', vtHintFree: 'Անցեք ցուցակով․ յուրաքանչյուր խաղացող ասում է, թե ում օգտին է քվեարկում, — նշեք նրա ընտրությունը։ Թեկնածուները կհայտնվեն ինքնըստինքյան։', vtOther: 'Այլ խաղացող', vtPick: 'Ընտրել' });
/* v48: re-seating before the deal — new numbers for everybody first, then "Seat them" moves all at once */
Object.assign(I18N.ru.ui, { rsOpen: 'Пересадить игроков', rsTitle: 'Пересадка', rsHint: 'Поставьте каждому новый номер места — пока вы меняете, никто не двигается. «Посадить» пересадит всех разом.', rsPick: 'Новое место', rsDup: '№{seat} выбран у нескольких: {list}', rsMoved: 'Пересядут: {n}', rsSame: 'Номера пока не менялись', rsApply: 'Посадить', rsDone: 'Игроки пересажены' });
Object.assign(I18N.uk.ui, { rsOpen: 'Пересадити гравців', rsTitle: 'Пересадка', rsHint: 'Поставте кожному новий номер місця — поки ви змінюєте, ніхто не рухається. «Посадити» пересадить усіх разом.', rsPick: 'Нове місце', rsDup: '№{seat} обрано в кількох: {list}', rsMoved: 'Пересядуть: {n}', rsSame: 'Номери ще не змінювалися', rsApply: 'Посадити', rsDone: 'Гравців пересаджено' });
Object.assign(I18N.en.ui, { rsOpen: 'Re-seat players', rsTitle: 'Re-seating', rsHint: 'Give everyone a new seat number — nobody moves while you edit. "Seat them" moves everyone at once.', rsPick: 'New seat', rsDup: 'Seat {seat} is chosen more than once: {list}', rsMoved: 'Will move: {n}', rsSame: 'No numbers changed yet', rsApply: 'Seat them', rsDone: 'Players re-seated' });
Object.assign(I18N.pl.ui, { rsOpen: 'Przesadź graczy', rsTitle: 'Przesadzanie', rsHint: 'Daj każdemu nowy numer miejsca — w trakcie zmian nikt się nie przesiada. „Posadź” przesadzi wszystkich naraz.', rsPick: 'Nowe miejsce', rsDup: 'Nr {seat} wybrany kilka razy: {list}', rsMoved: 'Przesiądzie się: {n}', rsSame: 'Numery jeszcze się nie zmieniły', rsApply: 'Posadź', rsDone: 'Gracze przesadzeni' });
Object.assign(I18N.hy.ui, { rsOpen: 'Վերանստեցնել խաղացողներին', rsTitle: 'Վերանստեցում', rsHint: 'Յուրաքանչյուրին տվեք տեղի նոր համար․ մինչ փոխում եք, ոչ ոք չի շարժվում։ «Նստեցնել»-ը բոլորին միանգամից կտեղափոխի։', rsPick: 'Նոր տեղ', rsDup: 'Տեղ {seat}-ն ընտրված է մի քանի անգամ՝ {list}', rsMoved: 'Կտեղափոխվեն՝ {n}', rsSame: 'Համարները դեռ չեն փոխվել', rsApply: 'Նստեցնել', rsDone: 'Խաղացողները վերանստեցված են' });
