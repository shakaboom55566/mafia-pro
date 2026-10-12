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
