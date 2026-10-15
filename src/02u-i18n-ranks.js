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
