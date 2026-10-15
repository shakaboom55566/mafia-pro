/* ============================================================
   v54 ranks: eight game titles by the rating, the host's top hat, the wreath of the top three (texts; logic — 11-ranks.js)
   ============================================================ */
(function () {
  const R = {
    ru: {
      rankNames: ['Новичок', 'Любитель', 'Игрок', 'Знаток', 'Мастер', 'Эксперт', 'Гроссмейстер', 'Легенда'],
      hostNames: ['Ведущий', 'Опытный ведущий', 'Ведущий-легенда'],
      forms: { points: ['очко', 'очка', 'очков'], games: ['партия', 'партии', 'партий'] },
      rkTitle: 'Ранги', rkAll: 'Все ранги',
      rkHint: 'Ранг считается по общему рейтингу. Победа приносит +24…+44, поражение отнимает 10, ещё добавляются очки за полезные ходы. Рейтинг опустился ниже порога — ранг тоже становится ниже.',
      rkNovice: 'первые {n} партий', rkBelow: 'до {n}', rkFrom: 'от {n}', rkYou: 'вы здесь',
      rkNextPts: 'До ранга «{rank}» — ещё {n} {pts}', rkNextGames: 'Ещё {n} {games} — и появится настоящий ранг', rkMax: 'Высший ранг — выше только №1 в общем рейтинге',
      rkPlace: '№{n} в общем рейтинге',
      rkWreath: 'Венок', rkWreathHint: 'Золотой, серебряный и бронзовый венок вокруг значка — у №1, №2 и №3 общего рейтинга. Меняется вместе с рейтингом.',
      rkHost: 'Значок ведущего', rkHostHint: 'Цилиндр рядом со значком ранга — за проведённые партии: бронзовый, серебряный, золотой.', rkHostRule: 'от {n} проведённых партий', rkHosted: 'провёл(а) партий: {n}',
      rkUp: 'Новый ранг: {rank}', rkUpShort: 'новый ранг'
    },
    uk: {
      rankNames: ['Новачок', 'Любитель', 'Гравець', 'Знавець', 'Майстер', 'Експерт', 'Гросмейстер', 'Легенда'],
      hostNames: ['Ведучий', 'Досвідчений ведучий', 'Ведучий-легенда'],
      forms: { points: ['очко', 'очки', 'очок'], games: ['партія', 'партії', 'партій'] },
      rkTitle: 'Ранги', rkAll: 'Усі ранги',
      rkHint: 'Ранг рахується за загальним рейтингом. Перемога дає +24…+44, поразка забирає 10, ще додаються очки за корисні ходи. Рейтинг опустився нижче порогу — ранг теж стає нижчим.',
      rkNovice: 'перші {n} партій', rkBelow: 'до {n}', rkFrom: 'від {n}', rkYou: 'ви тут',
      rkNextPts: 'До рангу «{rank}» — ще {n} {pts}', rkNextGames: 'Ще {n} {games} — і з’явиться справжній ранг', rkMax: 'Найвищий ранг — вище лише №1 у загальному рейтингу',
      rkPlace: '№{n} у загальному рейтингу',
      rkWreath: 'Вінок', rkWreathHint: 'Золотий, срібний і бронзовий вінок навколо значка — у №1, №2 і №3 загального рейтингу. Змінюється разом із рейтингом.',
      rkHost: 'Значок ведучого', rkHostHint: 'Циліндр поруч зі значком рангу — за проведені партії: бронзовий, срібний, золотий.', rkHostRule: 'від {n} проведених партій', rkHosted: 'провів(ла) партій: {n}',
      rkUp: 'Новий ранг: {rank}', rkUpShort: 'новий ранг'
    },
    en: {
      rankNames: ['Rookie', 'Amateur', 'Player', 'Adept', 'Master', 'Expert', 'Grandmaster', 'Legend'],
      hostNames: ['Host', 'Seasoned host', 'Legendary host'],
      forms: { points: ['point', 'points'], games: ['game', 'games'] },
      rkTitle: 'Ranks', rkAll: 'All ranks',
      rkHint: 'Your rank follows the overall rating. A win brings +24…+44, a loss takes 10, and useful moves add points. If the rating drops below a threshold, the rank drops too.',
      rkNovice: 'first {n} games', rkBelow: 'below {n}', rkFrom: 'from {n}', rkYou: 'you are here',
      rkNextPts: '{n} more {pts} to «{rank}»', rkNextGames: '{n} more {games} — then you get a real rank', rkMax: 'The top rank — only №1 of the overall rating is higher',
      rkPlace: '№{n} in the overall rating',
      rkWreath: 'Wreath', rkWreathHint: 'A gold, silver and bronze wreath around the badge belongs to №1, №2 and №3 of the overall rating. It moves with the rating.',
      rkHost: 'Host badge', rkHostHint: 'The top hat next to the rank badge is for games hosted: bronze, silver, gold.', rkHostRule: 'from {n} games hosted', rkHosted: 'games hosted: {n}',
      rkUp: 'New rank: {rank}', rkUpShort: 'new rank'
    },
    pl: {
      rankNames: ['Nowicjusz', 'Amator', 'Gracz', 'Znawca', 'Mistrz', 'Ekspert', 'Arcymistrz', 'Legenda'],
      hostNames: ['Prowadzący', 'Doświadczony prowadzący', 'Legendarny prowadzący'],
      forms: { points: ['punkt', 'punkty', 'punktów'], games: ['partia', 'partie', 'partii'] },
      rkTitle: 'Rangi', rkAll: 'Wszystkie rangi',
      rkHint: 'Ranga zależy od ogólnego rankingu. Wygrana daje +24…+44, przegrana odbiera 10, a pożyteczne ruchy dodają punkty. Gdy ranking spadnie poniżej progu, ranga też spada.',
      rkNovice: 'pierwsze {n} partii', rkBelow: 'poniżej {n}', rkFrom: 'od {n}', rkYou: 'tu jesteś',
      rkNextPts: 'Do rangi «{rank}» — jeszcze {n} {pts}', rkNextGames: 'Jeszcze {n} {games} — i pojawi się prawdziwa ranga', rkMax: 'Najwyższa ranga — wyżej jest tylko №1 ogólnego rankingu',
      rkPlace: '№{n} w ogólnym rankingu',
      rkWreath: 'Wieniec', rkWreathHint: 'Złoty, srebrny i brązowy wieniec wokół odznaki mają №1, №2 i №3 ogólnego rankingu. Zmienia się razem z rankingiem.',
      rkHost: 'Odznaka prowadzącego', rkHostHint: 'Cylinder obok odznaki rangi — za poprowadzone partie: brązowy, srebrny, złoty.', rkHostRule: 'od {n} poprowadzonych partii', rkHosted: 'poprowadzone partie: {n}',
      rkUp: 'Nowa ranga: {rank}', rkUpShort: 'nowa ranga'
    },
    hy: {
      rankNames: ['Սկսնակ', 'Սիրող', 'Խաղացող', 'Գիտակ', 'Վարպետ', 'Փորձագետ', 'Գրոսմայստեր', 'Լեգենդ'],
      hostNames: ['Վարող', 'Փորձառու վարող', 'Լեգենդար վարող'],
      forms: { points: ['միավոր'], games: ['խաղ'] },
      rkTitle: 'Կոչումներ', rkAll: 'Բոլոր կոչումները',
      rkHint: 'Կոչումը հաշվվում է ընդհանուր վարկանիշով։ Հաղթանակը տալիս է +24…+44, պարտությունը հանում է 10, իսկ օգտակար քայլերը ավելացնում են միավորներ։ Եթե վարկանիշն իջնի շեմից ցածր, կոչումն էլ կիջնի։',
      rkNovice: 'առաջին {n} խաղերը', rkBelow: 'մինչև {n}', rkFrom: '{n}-ից', rkYou: 'դուք այստեղ եք',
      rkNextPts: 'Մինչև «{rank}» կոչումը՝ ևս {n} {pts}', rkNextGames: 'Եվս {n} {games}, և կհայտնվի իսկական կոչում', rkMax: 'Բարձրագույն կոչումը․ ավելի բարձր է միայն ընդհանուր վարկանիշի №1-ը',
      rkPlace: '№{n} ընդհանուր վարկանիշում',
      rkWreath: 'Դափնեպսակ', rkWreathHint: 'Ոսկե, արծաթե և բրոնզե դափնեպսակը կրծքանշանի շուրջ ունեն ընդհանուր վարկանիշի №1, №2 և №3-ը։ Փոխվում է վարկանիշի հետ։',
      rkHost: 'Վարողի կրծքանշան', rkHostHint: 'Գլխարկը կոչման կրծքանշանի կողքին՝ անցկացված խաղերի համար. բրոնզե, արծաթե, ոսկե։', rkHostRule: '{n} անցկացված խաղից', rkHosted: 'անցկացրած խաղեր՝ {n}',
      rkUp: 'Նոր կոչում՝ {rank}', rkUpShort: 'նոր կոչում'
    }
  };
  Object.keys(R).forEach(code => {
    const p = I18N[code]; if (!p) return; const d = Object.assign({}, R[code]); const forms = d.forms; delete d.forms;
    Object.assign(p.forms = p.forms || {}, forms); Object.assign(p.ui, d);
  });
})();
/* v55: the Ranks tab on the ratings screen, seasons, the best rating of the season */
(function () {
  const R = {
    ru: {
      rtTabRating: 'Рейтинг', rtTabRanks: 'Ранги',
      ssTitle: 'Сезон {n}', ssDates: '{from} — {to}', ssLeft: 'до конца сезона — {n} {days}',
      ssBreakTitle: 'Межсезонье', ssBreakText: 'Сезон {n} завершён, рейтинг всех игроков сброшен до 1000. Партии идут и попадают в статистику, но рейтинг не меняется.', ssNext: 'Сезон {n} начнётся {date}',
      ssRewardTitle: 'Награда сезона {n}: Epic-скин', ssReward: 'Все игроки, которые достигнут ранга «{rank}» и сохранят его до конца сезона {n} ({date}), получат Epic-скин.', ssRewardDone: 'Сезон {n} завершён: все, кто закончил его в ранге «{rank}», получают Epic-скин.',
      rkMine: 'Ваш ранг', rkHowTitle: 'Как получить ранг',
      rkHow: ['Победа — +24 очка, победа в одиночку (за нейтрала) — +40.', 'Дожили до конца партии и победили — ещё +4.', 'Поражение — −10.', 'Полезные ходы по разбору партии — от −20 до +25.', 'В общий рейтинг идут партии, которые ведущий провёл в Mafia Pro, а вы сидели за его столом через Telegram.', 'Первые 5 партий — «Новичок», дальше ранг зависит только от рейтинга.'],
      rkLadder: 'Все ранги', rkSeasonTitle: 'Как устроен сезон',
      rkSeasonRules: ['Сезон длится 2 месяца.', 'В конце сезона итоги сохраняются, а рейтинг всех игроков сбрасывается до 1000.', 'Потом 7 дней межсезонья: партии идут и попадают в статистику, но рейтинг не меняется.', 'Затем стартует новый сезон — и снова борьба за ранги.', 'В профиле видно рейтинг сейчас и лучший рейтинг сезона.'],
      rkLegendsNow: 'Легенды сейчас', rkLegendsNone: 'Пока никого — станьте первой Легендой сезона.', rkFinalTop: 'Итоги сезона {n}',
      rkNowShort: 'рейтинг сейчас', rkPeakShort: 'максимум сезона {n}', ssBreakNote: 'Межсезонье: до начала сезона {n} партии не меняют рейтинг.'
    },
    uk: {
      rtTabRating: 'Рейтинг', rtTabRanks: 'Ранги',
      ssTitle: 'Сезон {n}', ssDates: '{from} — {to}', ssLeft: 'до кінця сезону — {n} {days}',
      ssBreakTitle: 'Міжсезоння', ssBreakText: 'Сезон {n} завершено, рейтинг усіх гравців скинуто до 1000. Партії йдуть і потрапляють у статистику, але рейтинг не змінюється.', ssNext: 'Сезон {n} почнеться {date}',
      ssRewardTitle: 'Нагорода сезону {n}: Epic-скін', ssReward: 'Усі гравці, які досягнуть рангу «{rank}» і збережуть його до кінця сезону {n} ({date}), отримають Epic-скін.', ssRewardDone: 'Сезон {n} завершено: усі, хто закінчив його в ранзі «{rank}», отримують Epic-скін.',
      rkMine: 'Ваш ранг', rkHowTitle: 'Як отримати ранг',
      rkHow: ['Перемога — +24 очки, перемога наодинці (за нейтрала) — +40.', 'Дожили до кінця партії й перемогли — ще +4.', 'Поразка — −10.', 'Корисні ходи за розбором партії — від −20 до +25.', 'У загальний рейтинг ідуть партії, які ведучий провів у Mafia Pro, а ви сиділи за його столом через Telegram.', 'Перші 5 партій — «Новачок», далі ранг залежить лише від рейтингу.'],
      rkLadder: 'Усі ранги', rkSeasonTitle: 'Як влаштований сезон',
      rkSeasonRules: ['Сезон триває 2 місяці.', 'Наприкінці сезону підсумки зберігаються, а рейтинг усіх гравців скидається до 1000.', 'Потім 7 днів міжсезоння: партії йдуть і потрапляють у статистику, але рейтинг не змінюється.', 'Далі стартує новий сезон — і знову боротьба за ранги.', 'У профілі видно рейтинг зараз і найкращий рейтинг сезону.'],
      rkLegendsNow: 'Легенди зараз', rkLegendsNone: 'Поки нікого — станьте першою Легендою сезону.', rkFinalTop: 'Підсумки сезону {n}',
      rkNowShort: 'рейтинг зараз', rkPeakShort: 'максимум сезону {n}', ssBreakNote: 'Міжсезоння: до початку сезону {n} партії не змінюють рейтинг.'
    },
    en: {
      rtTabRating: 'Rating', rtTabRanks: 'Ranks',
      ssTitle: 'Season {n}', ssDates: '{from} — {to}', ssLeft: '{n} {days} to the end of the season',
      ssBreakTitle: 'Off-season', ssBreakText: 'Season {n} is over, everyone\'s rating is back to 1000. Games go on and count in the statistics, but the rating does not move.', ssNext: 'Season {n} starts on {date}',
      ssRewardTitle: 'Season {n} reward: an Epic skin', ssReward: 'Every player who reaches the «{rank}» rank and keeps it until the end of season {n} ({date}) gets an Epic skin.', ssRewardDone: 'Season {n} is over: everyone who finished it as «{rank}» gets an Epic skin.',
      rkMine: 'Your rank', rkHowTitle: 'How to get a rank',
      rkHow: ['A win — +24 points, a solo win (as a neutral) — +40.', 'Alive at the end of a won game — +4 more.', 'A loss — −10.', 'Useful moves in the game review — from −20 to +25.', 'The overall rating counts games the host ran in Mafia Pro while you sat at the table through Telegram.', 'The first 5 games — «Rookie»; after that the rank depends only on the rating.'],
      rkLadder: 'All ranks', rkSeasonTitle: 'How a season works',
      rkSeasonRules: ['A season lasts 2 months.', 'At the end the standings are kept and everyone\'s rating goes back to 1000.', 'Then 7 days of off-season: games go on and count in the statistics, but the rating does not move.', 'Then a new season starts — and the race for ranks again.', 'Your profile shows your rating now and your best rating of the season.'],
      rkLegendsNow: 'Legends now', rkLegendsNone: 'Nobody yet — become the first Legend of the season.', rkFinalTop: 'Season {n} standings',
      rkNowShort: 'rating now', rkPeakShort: 'best of season {n}', ssBreakNote: 'Off-season: games do not change the rating until season {n} starts.'
    },
    pl: {
      rtTabRating: 'Ranking', rtTabRanks: 'Rangi',
      ssTitle: 'Sezon {n}', ssDates: '{from} — {to}', ssLeft: 'do końca sezonu — {n} {days}',
      ssBreakTitle: 'Przerwa między sezonami', ssBreakText: 'Sezon {n} zakończony, ranking wszystkich graczy wrócił do 1000. Partie trwają i wliczają się do statystyk, ale ranking się nie zmienia.', ssNext: 'Sezon {n} startuje {date}',
      ssRewardTitle: 'Nagroda sezonu {n}: skórka Epic', ssReward: 'Wszyscy gracze, którzy zdobędą rangę «{rank}» i utrzymają ją do końca sezonu {n} ({date}), dostaną skórkę Epic.', ssRewardDone: 'Sezon {n} zakończony: wszyscy, którzy skończyli go z rangą «{rank}», dostają skórkę Epic.',
      rkMine: 'Twoja ranga', rkHowTitle: 'Jak zdobyć rangę',
      rkHow: ['Wygrana — +24 punkty, wygrana w pojedynkę (jako neutralny) — +40.', 'Przetrwałeś do końca wygranej partii — jeszcze +4.', 'Przegrana — −10.', 'Pożyteczne ruchy w analizie partii — od −20 do +25.', 'Do ogólnego rankingu liczą się partie, które prowadzący poprowadził w Mafia Pro, a Ty siedziałeś przy jego stole przez Telegram.', 'Pierwsze 5 partii — «Nowicjusz», potem ranga zależy tylko od rankingu.'],
      rkLadder: 'Wszystkie rangi', rkSeasonTitle: 'Jak działa sezon',
      rkSeasonRules: ['Sezon trwa 2 miesiące.', 'Na koniec sezonu wyniki są zapisywane, a ranking wszystkich graczy wraca do 1000.', 'Potem 7 dni przerwy: partie trwają i wliczają się do statystyk, ale ranking się nie zmienia.', 'Następnie startuje nowy sezon — i znowu walka o rangi.', 'W profilu widać ranking teraz i najlepszy ranking sezonu.'],
      rkLegendsNow: 'Legendy teraz', rkLegendsNone: 'Na razie nikt — zostań pierwszą Legendą sezonu.', rkFinalTop: 'Wyniki sezonu {n}',
      rkNowShort: 'ranking teraz', rkPeakShort: 'najlepszy w sezonie {n}', ssBreakNote: 'Przerwa: do startu sezonu {n} partie nie zmieniają rankingu.'
    },
    hy: {
      rtTabRating: 'Վարկանիշ', rtTabRanks: 'Կոչումներ',
      ssTitle: 'Սեզոն {n}', ssDates: '{from} — {to}', ssLeft: 'մինչև սեզոնի ավարտը՝ {n} {days}',
      ssBreakTitle: 'Միջսեզոն', ssBreakText: 'Սեզոն {n}-ն ավարտվեց, բոլոր խաղացողների վարկանիշը վերադարձավ 1000-ի։ Խաղերը շարունակվում են և մտնում են վիճակագրության մեջ, բայց վարկանիշը չի փոխվում։', ssNext: 'Սեզոն {n}-ը կսկսվի {date}',
      ssRewardTitle: 'Սեզոն {n}-ի պարգևը՝ Epic սքին', ssReward: 'Բոլոր խաղացողները, ովքեր կհասնեն «{rank}» կոչմանը և կպահեն այն մինչև սեզոն {n}-ի ավարտը ({date}), կստանան Epic սքին։', ssRewardDone: 'Սեզոն {n}-ն ավարտվեց. բոլոր նրանք, ովքեր այն ավարտեցին «{rank}» կոչմամբ, ստանում են Epic սքին։',
      rkMine: 'Ձեր կոչումը', rkHowTitle: 'Ինչպես ստանալ կոչում',
      rkHow: ['Հաղթանակ՝ +24 միավոր, միայնակ հաղթանակ (չեզոքի համար)՝ +40։', 'Ողջ մնացել եք մինչև հաղթած խաղի ավարտը՝ ևս +4։', 'Պարտություն՝ −10։', 'Օգտակար քայլեր խաղի վերլուծությամբ՝ −20-ից +25։', 'Ընդհանուր վարկանիշում հաշվվում են այն խաղերը, որոնք վարողն անցկացրել է Mafia Pro-ում, իսկ դուք նստած եք եղել նրա սեղանի շուրջ Telegram-ով։', 'Առաջին 5 խաղերը՝ «Սկսնակ», հետո կոչումը կախված է միայն վարկանիշից։'],
      rkLadder: 'Բոլոր կոչումները', rkSeasonTitle: 'Ինչպես է կառուցված սեզոնը',
      rkSeasonRules: ['Սեզոնը տևում է 2 ամիս։', 'Սեզոնի վերջում արդյունքները պահպանվում են, իսկ բոլոր խաղացողների վարկանիշը վերադառնում է 1000-ի։', 'Հետո 7 օր միջսեզոն՝ խաղերը շարունակվում են և մտնում են վիճակագրության մեջ, բայց վարկանիշը չի փոխվում։', 'Ապա սկսվում է նոր սեզոն՝ և կրկին պայքար կոչումների համար։', 'Պրոֆիլում երևում են ընթացիկ վարկանիշը և սեզոնի լավագույն վարկանիշը։'],
      rkLegendsNow: 'Լեգենդներն այժմ', rkLegendsNone: 'Դեռ ոչ ոք․ դարձեք սեզոնի առաջին Լեգենդը։', rkFinalTop: 'Սեզոն {n}-ի արդյունքները',
      rkNowShort: 'վարկանիշն այժմ', rkPeakShort: 'սեզոն {n}-ի առավելագույնը', ssBreakNote: 'Միջսեզոն. մինչև սեզոն {n}-ի մեկնարկը խաղերը չեն փոխում վարկանիշը։'
    }
  };
  Object.keys(R).forEach(code => { const p = I18N[code]; if (p) Object.assign(p.ui, R[code]); });
})();
