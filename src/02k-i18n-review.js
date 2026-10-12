/* Vote stepper (voter by voter), journal lines for votes, post-game review and usefulness points */
Object.assign(I18N.ru.ui, {
  addCand: 'Добавить кандидата', voterOf: 'Голосует {i} из {n}', votedFor: 'за №{seat}', voterPick: 'За кого поднял руку?', voterSkip: 'Пропустить', allVoted: 'Все проголосовали', tallyTitle: 'Счёт голосов', noVoters: 'Ещё не голосовали: {list}', votersOf: 'голосовали: {list}',
  reviewTitle: 'Разбор партии', reviewHint: 'С открытыми картами оценён каждый голос и каждое действие: что было верно, что — ошибкой, и как было бы лучше. Польза добавляется к очкам рейтинга.',
  mvp: 'MVP', ptsResult: 'результат', ptsUseful: 'польза', ptsTotal: 'очки', rvGood: 'верно', rvBad: 'ошибка', rvNeutral: 'нейтрально', rvBetter: 'Лучше: {text}', rvNoItems: 'Не голосовал и не действовал — оценивать нечего.', rvStats: '{good} верных · {bad} ошибок',
  rvDay: 'День {day}', rvNight: 'Ночь {n}', rvVote: 'Голос за',
  rEnemy: 'противник', rAlly: 'свой', rKeyRole: 'ключевая роль противника', rAllyKey: 'ключевая роль своей команды', rSaved: 'спас от выстрела', rNoShot: 'в него не стреляли', rHealedEnemy: 'защищал противника', rBlocked: 'действие было заблокировано', rProtected: 'цель была под защитой', rSnipeBack: 'выстрел в красного — погиб сам',
  rFoundBlack: 'нашёл чёрного', rConfirmedRed: 'подтвердил красного', rRepeat: 'повторная проверка той же цели', rInfo: 'получена информация', rFoundSheriff: 'нашёл Шерифа', rNeutralTarget: 'нейтральная цель', rNoWeight: 'голос не имел веса', rNothing: 'ничего не произошло',
  rBlockedEnemy: 'помешал противнику', rBlockedAlly: 'помешал своему', rRedirectedEnemy: 'перевёл удар на противника', rRedirectedAlly: 'перевёл удар на своего', rHelpedAlly: 'усилил своего', rHelpedEnemy: 'усилил противника', rSavedAlly: 'спас своего от выгона', rSavedEnemy: 'спас противника от выгона',
  rNoEnemyCand: 'среди кандидатов не было противников', bVoteFor: 'голос за {alt}', bHeal: 'защищать {alt} — в него стреляли', bCheckNew: 'проверить ещё не проверенного'
});
Object.assign(I18N.ru.e, { revotePrefix: 'Переголосование: ', logBallotRow: 'За №{seat} {player}: {voters} — {n} {votes}', logNoVoters: 'Не голосовали: {list}' });

Object.assign(I18N.uk.ui, {
  addCand: 'Додати кандидата', voterOf: 'Голосує {i} з {n}', votedFor: 'за №{seat}', voterPick: 'За кого підняв руку?', voterSkip: 'Пропустити', allVoted: 'Усі проголосували', tallyTitle: 'Підрахунок голосів', noVoters: 'Ще не голосували: {list}', votersOf: 'голосували: {list}',
  reviewTitle: 'Розбір партії', reviewHint: 'З відкритими картами оцінено кожен голос і кожну дію: що було вірно, що — помилкою, і як було б краще. Користь додається до очок рейтингу.',
  mvp: 'MVP', ptsResult: 'результат', ptsUseful: 'користь', ptsTotal: 'очки', rvGood: 'вірно', rvBad: 'помилка', rvNeutral: 'нейтрально', rvBetter: 'Краще: {text}', rvNoItems: 'Не голосував і не діяв — оцінювати нічого.', rvStats: '{good} вірних · {bad} помилок',
  rvDay: 'День {day}', rvNight: 'Ніч {n}', rvVote: 'Голос за',
  rEnemy: 'супротивник', rAlly: 'свій', rKeyRole: 'ключова роль супротивника', rAllyKey: 'ключова роль своєї команди', rSaved: 'врятував від пострілу', rNoShot: 'у нього не стріляли', rHealedEnemy: 'захищав супротивника', rBlocked: 'дію було заблоковано', rProtected: 'ціль була під захистом', rSnipeBack: 'постріл у червоного — загинув сам',
  rFoundBlack: 'знайшов чорного', rConfirmedRed: 'підтвердив червоного', rRepeat: 'повторна перевірка тієї ж цілі', rInfo: 'отримано інформацію', rFoundSheriff: 'знайшов Шерифа', rNeutralTarget: 'нейтральна ціль', rNoWeight: 'голос не мав ваги', rNothing: 'нічого не сталося',
  rBlockedEnemy: 'завадив супротивнику', rBlockedAlly: 'завадив своєму', rRedirectedEnemy: 'перевів удар на супротивника', rRedirectedAlly: 'перевів удар на свого', rHelpedAlly: 'підсилив свого', rHelpedEnemy: 'підсилив супротивника', rSavedAlly: 'врятував свого від вигнання', rSavedEnemy: 'врятував супротивника від вигнання',
  rNoEnemyCand: 'серед кандидатів не було супротивників', bVoteFor: 'голос за {alt}', bHeal: 'захищати {alt} — у нього стріляли', bCheckNew: 'перевірити ще не перевіреного'
});
Object.assign(I18N.uk.e, { revotePrefix: 'Переголосування: ', logBallotRow: 'За №{seat} {player}: {voters} — {n} {votes}', logNoVoters: 'Не голосували: {list}' });

Object.assign(I18N.en.ui, {
  addCand: 'Add a candidate', voterOf: 'Voter {i} of {n}', votedFor: 'for seat {seat}', voterPick: 'Whom did they vote for?', voterSkip: 'Skip', allVoted: 'Everyone has voted', tallyTitle: 'Vote count', noVoters: 'Not voted yet: {list}', votersOf: 'voted: {list}',
  reviewTitle: 'Game review', reviewHint: 'With all cards open, every vote and every action is rated: what was right, what was a mistake, and what would have been better. Usefulness is added to the rating points.',
  mvp: 'MVP', ptsResult: 'result', ptsUseful: 'usefulness', ptsTotal: 'points', rvGood: 'right', rvBad: 'mistake', rvNeutral: 'neutral', rvBetter: 'Better: {text}', rvNoItems: 'Neither voted nor acted — nothing to rate.', rvStats: '{good} right · {bad} mistakes',
  rvDay: 'Day {day}', rvNight: 'Night {n}', rvVote: 'Vote for',
  rEnemy: 'an enemy', rAlly: 'an ally', rKeyRole: 'a key enemy role', rAllyKey: 'a key role of their own team', rSaved: 'saved from the shot', rNoShot: 'nobody shot at them', rHealedEnemy: 'protected an enemy', rBlocked: 'the action was blocked', rProtected: 'the target was protected', rSnipeBack: 'shot a red — died themselves',
  rFoundBlack: 'found a black', rConfirmedRed: 'confirmed a red', rRepeat: 'repeat check of the same target', rInfo: 'information gained', rFoundSheriff: 'found the Sheriff', rNeutralTarget: 'a neutral target', rNoWeight: 'the vote had no weight', rNothing: 'nothing happened',
  rBlockedEnemy: 'hindered an enemy', rBlockedAlly: 'hindered an ally', rRedirectedEnemy: 'redirected the hit to an enemy', rRedirectedAlly: 'redirected the hit to an ally', rHelpedAlly: 'strengthened an ally', rHelpedEnemy: 'strengthened an enemy', rSavedAlly: 'saved an ally from expulsion', rSavedEnemy: 'saved an enemy from expulsion',
  rNoEnemyCand: 'no enemies among the candidates', bVoteFor: 'a vote for {alt}', bHeal: 'protect {alt} — they were shot at', bCheckNew: 'check someone not yet checked'
});
Object.assign(I18N.en.e, { revotePrefix: 'Re-vote: ', logBallotRow: 'For seat {seat} {player}: {voters} — {n} {votes}', logNoVoters: 'Did not vote: {list}' });

Object.assign(I18N.pl.ui, {
  addCand: 'Dodaj kandydata', voterOf: 'Głosuje {i} z {n}', votedFor: 'za nr {seat}', voterPick: 'Za kogo podniósł rękę?', voterSkip: 'Pomiń', allVoted: 'Wszyscy zagłosowali', tallyTitle: 'Liczenie głosów', noVoters: 'Jeszcze nie głosowali: {list}', votersOf: 'głosowali: {list}',
  reviewTitle: 'Analiza partii', reviewHint: 'Przy odkrytych kartach oceniono każdy głos i każdą akcję: co było słuszne, co — błędem, i jak byłoby lepiej. Użyteczność dolicza się do punktów rankingu.',
  mvp: 'MVP', ptsResult: 'wynik', ptsUseful: 'użyteczność', ptsTotal: 'punkty', rvGood: 'słusznie', rvBad: 'błąd', rvNeutral: 'neutralnie', rvBetter: 'Lepiej: {text}', rvNoItems: 'Nie głosował i nie działał — nie ma czego oceniać.', rvStats: '{good} słusznych · {bad} błędów',
  rvDay: 'Dzień {day}', rvNight: 'Noc {n}', rvVote: 'Głos na',
  rEnemy: 'przeciwnik', rAlly: 'swój', rKeyRole: 'kluczowa rola przeciwnika', rAllyKey: 'kluczowa rola własnej drużyny', rSaved: 'uratował przed strzałem', rNoShot: 'nikt do niego nie strzelał', rHealedEnemy: 'chronił przeciwnika', rBlocked: 'akcja została zablokowana', rProtected: 'cel był chroniony', rSnipeBack: 'strzał w czerwonego — sam zginął',
  rFoundBlack: 'znalazł czarnego', rConfirmedRed: 'potwierdził czerwonego', rRepeat: 'ponowne sprawdzenie tego samego celu', rInfo: 'zdobyto informację', rFoundSheriff: 'znalazł Szeryfa', rNeutralTarget: 'neutralny cel', rNoWeight: 'głos nie miał wagi', rNothing: 'nic się nie stało',
  rBlockedEnemy: 'przeszkodził przeciwnikowi', rBlockedAlly: 'przeszkodził swojemu', rRedirectedEnemy: 'przekierował cios na przeciwnika', rRedirectedAlly: 'przekierował cios na swojego', rHelpedAlly: 'wzmocnił swojego', rHelpedEnemy: 'wzmocnił przeciwnika', rSavedAlly: 'uratował swojego przed wykluczeniem', rSavedEnemy: 'uratował przeciwnika przed wykluczeniem',
  rNoEnemyCand: 'wśród kandydatów nie było przeciwników', bVoteFor: 'głos na {alt}', bHeal: 'chronić {alt} — do niego strzelano', bCheckNew: 'sprawdzić jeszcze niesprawdzonego'
});
Object.assign(I18N.pl.e, { revotePrefix: 'Ponowne głosowanie: ', logBallotRow: 'Za nr {seat} {player}: {voters} — {n} {votes}', logNoVoters: 'Nie głosowali: {list}' });

Object.assign(I18N.hy.ui, {
  addCand: 'Ավելացնել թեկնածու', voterOf: 'Քվեարկում է {i}/{n}', votedFor: 'տեղ {seat}-ի դեմ', voterPick: 'Ո՞ւմ դեմ է ձեռք բարձրացրել', voterSkip: 'Բաց թողնել', allVoted: 'Բոլորը քվեարկել են', tallyTitle: 'Ձայների հաշվարկ', noVoters: 'Դեռ չեն քվեարկել՝ {list}', votersOf: 'քվեարկել են՝ {list}',
  reviewTitle: 'Խաղի վերլուծություն', reviewHint: 'Բաց քարտերով գնահատված է յուրաքանչյուր ձայն և գործողություն՝ ինչն էր ճիշտ, ինչը՝ սխալ, և ինչպես կլիներ ավելի լավ։ Օգտակարությունն ավելանում է վարկանիշի միավորներին։',
  mvp: 'MVP', ptsResult: 'արդյունք', ptsUseful: 'օգտակարություն', ptsTotal: 'միավոր', rvGood: 'ճիշտ', rvBad: 'սխալ', rvNeutral: 'չեզոք', rvBetter: 'Ավելի լավ՝ {text}', rvNoItems: 'Չի քվեարկել և չի գործել — գնահատելու բան չկա։', rvStats: '{good} ճիշտ · {bad} սխալ',
  rvDay: 'Օր {day}', rvNight: 'Գիշեր {n}', rvVote: 'Ձայն ընդդեմ',
  rEnemy: 'հակառակորդ', rAlly: 'յուրային', rKeyRole: 'հակառակորդի առանցքային դեր', rAllyKey: 'սեփական թիմի առանցքային դեր', rSaved: 'փրկեց կրակոցից', rNoShot: 'նրան չեն կրակել', rHealedEnemy: 'պաշտպանեց հակառակորդին', rBlocked: 'գործողությունն արգելափակվել էր', rProtected: 'թիրախը պաշտպանված էր', rSnipeBack: 'կրակեց կարմիրին — ինքը զոհվեց',
  rFoundBlack: 'գտավ սևին', rConfirmedRed: 'հաստատեց կարմիրին', rRepeat: 'նույն թիրախի կրկնակի ստուգում', rInfo: 'տեղեկություն ստացվեց', rFoundSheriff: 'գտավ Շերիֆին', rNeutralTarget: 'չեզոք թիրախ', rNoWeight: 'ձայնը կշիռ չուներ', rNothing: 'ոչինչ չպատահեց',
  rBlockedEnemy: 'խանգարեց հակառակորդին', rBlockedAlly: 'խանգարեց յուրայինին', rRedirectedEnemy: 'հարվածն ուղղեց հակառակորդին', rRedirectedAlly: 'հարվածն ուղղեց յուրայինին', rHelpedAlly: 'ուժեղացրեց յուրայինին', rHelpedEnemy: 'ուժեղացրեց հակառակորդին', rSavedAlly: 'փրկեց յուրայինին վտարումից', rSavedEnemy: 'փրկեց հակառակորդին վտարումից',
  rNoEnemyCand: 'թեկնածուների մեջ հակառակորդ չկար', bVoteFor: 'ձայն {alt}-ի դեմ', bHeal: 'պաշտպանել {alt}-ին — նրան կրակել են', bCheckNew: 'ստուգել դեռ չստուգվածին'
});
Object.assign(I18N.hy.e, { revotePrefix: 'Կրկնական քվեարկություն՝ ', logBallotRow: 'Տեղ {seat} {player}-ի դեմ՝ {voters} — {n} {votes}', logNoVoters: 'Չեն քվեարկել՝ {list}' });
