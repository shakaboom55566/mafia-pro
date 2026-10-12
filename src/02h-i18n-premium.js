/* ---------------- Premium roles, scenarios and shop: all languages ---------------- */
Object.assign(I18N.ru.roles, {
  arsonist: { name: 'Поджигатель', mono: 'Пж', kind: 'Активная · ночь', short: 'Каждую ночь обливает игрока бензином; один раз за игру поджигает всех облитых.',
    rules: ['Ночью показывает игрока — тот облит. Облитые ничего не замечают.', 'Вместо обливания может один раз за игру показать жест «поджечь»: все облитые, кто ещё в игре, выбывают.', 'Огонь нельзя вылечить, от него не прячут ни Равин, ни Телохранитель.', 'Просыпается с семьёй; шестой в линии старшинства.'],
    lore: 'Склад на Соляной набережной сгорел за шесть минут. Пожарные нашли только канистру и записку: «Это только начало».', tip: 'Обливайте тех, кого Доктор лечит чаще всего, — огонь он не остановит.' },
  lawyer: { name: 'Адвокат', mono: 'Ад', kind: 'Активная · день · 1 раз', short: 'Один раз за игру отменяет выгон члена семьи.',
    rules: ['Если голосованием выгоняют чёрного игрока, Адвокат может объявить защиту: выгон отменяется, никто не выбывает.', 'Работает один раз за игру и только на чёрных.', 'Адвокат раскрывает себя этим действием.', 'Просыпается с семьёй; ночью отдельных действий нет.'],
    lore: 'Его контора на площади Трёх Фонтанов не проиграла ни одного дела — потому что все свидетели исчезали до суда.', tip: 'Берегите защиту для Дона. Выгон солдата семья переживёт.' },
  hypnotist: { name: 'Гипнотизёр', mono: 'Гп', kind: 'Активная · ночь', short: 'Ночью решает, за кого завтра проголосует выбранный игрок.',
    rules: ['Ночью показывает игрока А и игрока Б.', 'На следующем голосовании голос А засчитывается за Б, что бы А ни показывал рукой.', 'Ведущий ничего не объявляет.', 'Просыпается с семьёй; седьмой в линии старшинства.'],
    lore: 'Карманные часы, тихий голос, бархатный кабинет над табачной лавкой. Люди выходят оттуда убеждёнными в том, чего никогда не думали.', tip: 'Берите голос самого громкого красного и отправляйте его на Шерифа.' },
  saboteur: { name: 'Саботажник', mono: 'Сб', kind: 'Активная · ночь', short: 'Ночью блокирует способность одного игрока.',
    rules: ['Ночью показывает игрока — этой ночью его активная способность не срабатывает.', 'Заблокированный просыпается как обычно и не узнаёт о блоке.', 'Блок не защищает от выстрелов и не ломает пассивные роли.', 'Просыпается с семьёй; восьмой в линии старшинства.'],
    lore: 'Перерезанный провод, песок в бензобаке, замок, залитый клеем. Он никогда никого не убивал — он просто всегда оказывался рядом перед самым важным делом.', tip: 'Блокируйте Доктора в ночь, когда семья стреляет в Шерифа.' },
  sniper: { name: 'Снайпер', mono: 'Сн', kind: 'Активная · ночь · 1 раз', short: 'Один выстрел за игру. Попал в красного — погибает сам.',
    rules: ['Один раз за игру ночью показывает игрока.', 'Если игрок чёрный — выстрел обычный, его можно вылечить.', 'Если игрок красный или нейтральный — пуля возвращается: Снайпер выбывает, цель жива.', 'Для проверок — красный.'],
    lore: 'Ветеран портовой войны держит винтовку на чердаке над рыбным рынком. Один патрон. Одна ошибка — и его найдут на том же чердаке.', tip: 'Стреляйте только после проверки Шерифа или сравнения Журналиста.' },
  tracker: { name: 'Следопыт', mono: 'Сл', kind: 'Активная · ночь', short: 'Ночью узнаёт, к кому ходил выбранный игрок.',
    rules: ['Ночью показывает игрока.', 'Утром ведущий тихо сообщает Следопыту, на кого этот игрок направил своё ночное действие — или что он никуда не ходил.', 'Пассивные роли всегда «никуда не ходили».', 'Для проверок — красный.'],
    lore: 'Бывший контрабандист знает каждый двор Кастельмара. Ночью он идёт за тенью и всегда знает, у чьей двери она остановилась.', tip: 'Следите за тем, кого город подозревает: ночной маршрут выдаёт Дона лучше проверки.' },
  jailer: { name: 'Тюремщик', mono: 'Тр', kind: 'Активная · ночь', short: 'Ночью запирает игрока: тот не действует, и в него нельзя попасть.',
    rules: ['Ночью показывает игрока — тот проводит ночь в камере.', 'Запертый не использует способность, а все выстрелы в него проходят мимо.', 'Одного и того же игрока нельзя запирать две ночи подряд. Себя — нельзя.', 'Для проверок — красный.'],
    lore: 'Старая тюрьма на Канатной давно закрыта, но у него остались ключи. Одна камера, одна ночь, один гость.', tip: 'Заприте того, кого хотите и защитить, и проверить: мафия в камере не стреляет.' },
  avenger: { name: 'Мститель', mono: 'Мс', kind: 'Пассивная · при выбывании', short: 'Если его убивает семья ночью, стрелявший погибает вместе с ним.',
    rules: ['Если Мститель выбывает от выстрела семьи, тот, кто показывал цель, тоже выбывает.', 'Ответный удар нельзя вылечить.', 'На выстрел Шерифа, Маньяка и на голосование не срабатывает.', 'Ночью не просыпается.'],
    lore: 'Его брата нашли в порту десять лет назад. С тех пор он носит в кармане гильзу и ждёт, когда кто-то придёт за ним.', tip: 'Ведите себя как Шериф — пусть семья захочет вас убрать.' },
  survivor: { name: 'Выживший', mono: 'Вж', kind: 'Пассивная · день', short: 'Побеждает, если дожил до конца игры, кто бы ни выиграл.',
    rules: ['Если к концу игры Выживший жив — он побеждает вместе с победившей стороной.', 'Для проверок — красный.', 'Город и семья не знают, кто он.', 'Ночью не просыпается.'],
    lore: 'Пережил три войны кланов, два пожара и одно наводнение. У него нет друзей, зато есть запасной выход из каждого бара Кастельмара.', tip: 'Не спорьте, не ведите, не лезьте в проверки. Будьте скучным.' },
  contractor: { name: 'Контрактник', mono: 'Кн', kind: 'Пассивная · день', short: 'Получает тайную цель. Побеждает, если город выгонит её голосованием.',
    rules: ['При раздаче ведущий сообщает Контрактнику цель — одного из игроков.', 'Если цель выгоняют голосованием, пока Контрактник жив, — он победил. Игра продолжается.', 'Если цель выбывает иначе, контракт сгорает.', 'Для проверок — красный.'],
    lore: 'Конверт без обратного адреса, внутри — одно имя. Он не спрашивает, кто заказчик. Он просто говорит правильные слова на площади.', tip: 'Не выгоняйте цель сами в первый день — город заметит. Готовьте почву.' },
  witch: { name: 'Ведьма', mono: 'Вд', kind: 'Активная · ночь', short: 'Перенаправляет ночное действие одного игрока на другого. Побеждает с мафией.',
    rules: ['Ночью показывает игрока А и игрока Б: что бы ни делал А этой ночью, он сделает это с Б.', 'Для проверок — красная. Семья не знает, кто она.', 'Побеждает вместе с мафией, если дожила до её победы.', 'Себя указывать нельзя.'],
    lore: 'Лавка трав в подвале на Часовой. Ей не нужны пистолеты: достаточно, чтобы Доктор этой ночью пошёл не к той двери.', tip: 'Отправьте Шерифа проверять Оборотня, а Доктора — лечить Дона.' },
  amnesiac: { name: 'Амнезиак', mono: 'Ам', kind: 'Активная · ночь · 1 раз', short: 'Один раз за игру берёт роль выбывшего игрока и играет за неё.',
    rules: ['Ночью показывает любого выбывшего игрока — и с этого момента играет его ролью.', 'Сторона, цвет и способности становятся как у новой роли. Семью он узнаёт следующей ночью.', 'Пока не вспомнил — красный и побеждает с городом.', 'Город и семья не знают, кем он стал.'],
    lore: 'Его нашли на рельсах за вокзалом без документов и без памяти. Он читает некрологи в «Кастельмар Пост», надеясь узнать себя.', tip: 'Дождитесь, пока выбудет сильная роль, и заберите её, пока город не привык к тишине.' }
});
Object.assign(I18N.ru.hooks, { arsonist: 'Поджигатель сжигает всех облитых', lawyer: 'Адвокат отменяет выгон семьи', hypnotist: 'Гипнотизёр крадёт голос', saboteur: 'Саботажник блокирует способности', sniper: 'Снайпер делает один опасный выстрел', tracker: 'Следопыт видит ночные маршруты', jailer: 'Тюремщик запирает игрока', avenger: 'Мститель забирает стрелка', survivor: 'Выживший ждёт конца', contractor: 'Контрактник ведёт цель на выгон', witch: 'Ведьма перенаправляет действия', amnesiac: 'Амнезиак берёт чужую роль' });
Object.assign(I18N.ru.e, {
  script2: {
    arsonist: 'Просыпается <b>Поджигатель</b>: показывает, кого облить, или жестом «огонь» поджигает всех облитых.',
    hypnotist: 'Просыпается <b>Гипнотизёр</b>: показывает игрока А и игрока Б — завтра голос А уйдёт за Б.',
    saboteur: 'Просыпается <b>Саботажник</b> и показывает, чью способность блокирует этой ночью.',
    sniper: 'Просыпается <b>Снайпер</b>. Один выстрел за игру: в чёрного — убивает, в красного — гибнет сам. Может пропустить.',
    tracker: 'Просыпается <b>Следопыт</b> и показывает, за кем следит. Утром узнает, к кому ходил этот игрок.',
    jailer: 'Просыпается <b>Тюремщик</b> и показывает, кого запирает на ночь.',
    witch: 'Просыпается <b>Ведьма</b>: показывает игрока А и игрока Б — всё, что А сделает этой ночью, он сделает с Б.',
    amnesiac: 'Просыпается <b>Амнезиак</b> и может показать выбывшего игрока, чью роль берёт. Может пропустить.'
  },
  modeDouse: 'Облить', modeIgnite: 'Поджечь', igniteNone: 'Облитых игроков нет.', igniteDone: 'Поджёг: {list}', dousedLog: 'Облит: {target}',
  blockedNote: 'Этой ночью способность заблокировал <b>Саботажник</b>. Игрок просыпается, но действия нет.', jailedNote: 'Игрок заперт <b>Тюремщиком</b>: просыпается, но действия нет.',
  whyJailLast: 'был в камере прошлой ночью', whyDead: 'выбывшие',
  fireHit: 'Огонь Поджигателя: {target} выбывает.', snipeBack: 'Снайпер {sniper} выстрелил в красного {target} — пуля вернулась, Снайпер выбывает.', snipeHit: 'Выстрел Снайпера в {target} — попадание.', snipeHealed: 'Выстрел Снайпера в {target} — вылечен.',
  avengeLog: 'Мститель {avenger} забрал с собой стрелка {shooter}.', jailMiss: 'Выстрел ({by}) в {target} — мимо: игрок в камере Тюремщика.',
  witchLog: 'Ведьма перенаправила действие {actor} на {target}.', trackLog: 'Следопыт: {target} ходил к {dest}.', trackNone: 'Следопыт: {target} никуда не ходил.',
  quietHypno: 'Гипнотизёр: голос {target} завтра уйдёт за {to}.',
  causeFire: 'огонь Поджигателя', causeAvenge: 'ответный удар Мстителя', causeSnipe: 'пуля Снайпера вернулась',
  rememberLog: 'Амнезиак {player} вспомнил: теперь он {role}.', contractAssigned: 'Контрактник {player}: цель — {target}.', contractWon: 'Контрактник {player} победил: цель {target} выгнана!',
  lawyerLog: 'Адвокат {player} объявил защиту: выгон {target} отменён.', survivorWon: 'Выживший {player} дожил до конца и побеждает.'
});
Object.assign(I18N.ru.ui, {
  shop: 'Магазин', shopD: 'Премиум-карты по 2 $ и сценарии по 9,99 $', premium: 'Премиум', buy: 'Купить {price}', owned: 'Куплено', locked: 'Не куплено', priceCard: '2 $', priceScen: '9,99 $',
  buyTitle: 'Покупка', buyDemo: 'Купить за {price}', buyNote: 'Оплата через Telegram Stars. Покупка привязывается к вашему аккаунту Telegram и доступна на всех ваших устройствах.', bought: 'Куплено: {name}',
  shopCards: 'Карты расширения', shopScen: 'Премиум-сценарии', scenRoles: 'Особые роли: {list}', scenPlayers: '{a}–{b} игроков', useScen: 'Создать игру', scenActive: 'Сценарий: {name}',
  lockedInComp: 'В составе есть некупленные карты: {list}', lawyerBtn: 'Адвокат {seat} объявляет защиту', contractInfo: 'Цель Контрактника {seat}: игрок {target}', extraWinners: 'Также победили: {list}',
  modGunsmith: 'Оружейник стреляет каждую ночь', modTwoFam: 'Две семьи с {n} игроков', modNoReveal: 'Карты выбывших не открываются', scenStd: 'Стандартные столы', tiltHint: 'Наклоните телефон или проведите по карте'
});
I18N.ru.scenarios = {
  arson_night: { name: 'Ночь Поджигателя', lore: 'Склады на Соляной набережной горят каждую ночь. Поджигатель против Тюремщика и Следопыта.' },
  court: { name: 'Суд Кастельмара', lore: 'Адвокат и Судья спорят за каждую голову, а Контрактник ждёт приговора.' },
  hypnosis: { name: 'Гипноз', lore: 'Голоса города принадлежат не городу. Следопыт ищет того, кто дёргает за нити.' },
  silent_killers: { name: 'Тихие убийцы', lore: 'Снайпер, Саботажник и Мститель. Каждый выстрел может оказаться последним — для стрелка.' },
  masquerade: { name: 'Карнавал масок', lore: 'Ведьма, Амнезиак и Шут: никто за столом не тот, кем кажется.' },
  clan_war: { name: 'Война кланов', lore: 'Две семьи уже с 14 игроков, и у каждой свой Адвокат.' },
  survival: { name: 'Выживание', lore: 'Оружейник стреляет каждую ночь. Побеждает тот, кто доживёт.' },
  chaos: { name: 'Полный хаос', lore: 'Все двенадцать карт расширения на одном столе.' }
};

/* ---- UK ---- */
Object.assign(I18N.uk.roles, {
  arsonist: { name: 'Палій', mono: 'Пл', kind: 'Активна · ніч', short: 'Щоночі обливає гравця бензином; один раз за гру підпалює всіх облитих.',
    rules: ['Уночі показує гравця — той облитий. Облиті нічого не помічають.', 'Замість обливання може один раз за гру показати жест «підпалити»: усі облиті, хто ще в грі, вибувають.', 'Вогонь не можна вилікувати, від нього не ховають ні Рабин, ні Охоронець.', 'Прокидається із сім\'єю; шостий у лінії старшинства.'],
    lore: 'Склад на Соляній набережній згорів за шість хвилин. Пожежники знайшли лише каністру і записку: «Це тільки початок».', tip: 'Обливайте тих, кого Лікар лікує найчастіше, — вогонь він не зупинить.' },
  lawyer: { name: 'Адвокат', mono: 'Ад', kind: 'Активна · день · 1 раз', short: 'Один раз за гру скасовує вигнання члена сім\'ї.',
    rules: ['Якщо голосуванням виганяють чорного гравця, Адвокат може оголосити захист: вигнання скасовується, ніхто не вибуває.', 'Працює один раз за гру і лише на чорних.', 'Адвокат розкриває себе цією дією.', 'Прокидається із сім\'єю; вночі окремих дій немає.'],
    lore: 'Його контора на площі Трьох Фонтанів не програла жодної справи — бо всі свідки зникали до суду.', tip: 'Бережіть захист для Дона. Вигнання солдата сім\'я переживе.' },
  hypnotist: { name: 'Гіпнотизер', mono: 'Гп', kind: 'Активна · ніч', short: 'Уночі вирішує, за кого завтра проголосує обраний гравець.',
    rules: ['Уночі показує гравця А і гравця Б.', 'На наступному голосуванні голос А зараховується за Б, що б А не показував рукою.', 'Ведучий нічого не оголошує.', 'Прокидається із сім\'єю; сьомий у лінії старшинства.'],
    lore: 'Кишеньковий годинник, тихий голос, оксамитовий кабінет над тютюновою крамницею. Люди виходять звідти переконаними в тому, чого ніколи не думали.', tip: 'Беріть голос найгучнішого червоного і відправляйте його на Шерифа.' },
  saboteur: { name: 'Саботажник', mono: 'Сб', kind: 'Активна · ніч', short: 'Уночі блокує здібність одного гравця.',
    rules: ['Уночі показує гравця — цієї ночі його активна здібність не спрацьовує.', 'Заблокований прокидається як завжди і не дізнається про блок.', 'Блок не захищає від пострілів і не ламає пасивні ролі.', 'Прокидається із сім\'єю; восьмий у лінії старшинства.'],
    lore: 'Перерізаний дріт, пісок у бензобаку, замок, залитий клеєм. Він ніколи нікого не вбивав — він просто завжди опинявся поруч перед найважливішою справою.', tip: 'Блокуйте Лікаря в ніч, коли сім\'я стріляє в Шерифа.' },
  sniper: { name: 'Снайпер', mono: 'Сн', kind: 'Активна · ніч · 1 раз', short: 'Один постріл за гру. Влучив у червоного — гине сам.',
    rules: ['Один раз за гру вночі показує гравця.', 'Якщо гравець чорний — постріл звичайний, його можна вилікувати.', 'Якщо гравець червоний або нейтральний — куля повертається: Снайпер вибуває, ціль жива.', 'Для перевірок — червоний.'],
    lore: 'Ветеран портової війни тримає гвинтівку на горищі над рибним ринком. Один набій. Одна помилка — і його знайдуть на тому ж горищі.', tip: 'Стріляйте лише після перевірки Шерифа або порівняння Журналіста.' },
  tracker: { name: 'Слідопит', mono: 'Сл', kind: 'Активна · ніч', short: 'Уночі дізнається, до кого ходив обраний гравець.',
    rules: ['Уночі показує гравця.', 'Уранці ведучий тихо повідомляє Слідопиту, на кого цей гравець спрямував свою нічну дію — або що він нікуди не ходив.', 'Пасивні ролі завжди «нікуди не ходили».', 'Для перевірок — червоний.'],
    lore: 'Колишній контрабандист знає кожне подвір\'я Кастельмара. Уночі він іде за тінню і завжди знає, біля чиїх дверей вона зупинилася.', tip: 'Стежте за тим, кого місто підозрює: нічний маршрут видає Дона краще за перевірку.' },
  jailer: { name: 'Тюремник', mono: 'Тр', kind: 'Активна · ніч', short: 'Уночі замикає гравця: той не діє, і в нього не можна влучити.',
    rules: ['Уночі показує гравця — той проводить ніч у камері.', 'Замкнений не використовує здібність, а всі постріли в нього проходять повз.', 'Одного й того ж гравця не можна замикати дві ночі поспіль. Себе — не можна.', 'Для перевірок — червоний.'],
    lore: 'Стара в\'язниця на Канатній давно зачинена, але в нього лишилися ключі. Одна камера, одна ніч, один гість.', tip: 'Замкніть того, кого хочете і захистити, і перевірити: мафія в камері не стріляє.' },
  avenger: { name: 'Месник', mono: 'Мс', kind: 'Пасивна · при вибуванні', short: 'Якщо його вбиває сім\'я вночі, стрілець гине разом із ним.',
    rules: ['Якщо Месник вибуває від пострілу сім\'ї, той, хто показував ціль, теж вибуває.', 'Удар у відповідь не можна вилікувати.', 'На постріл Шерифа, Маніяка і на голосування не спрацьовує.', 'Уночі не прокидається.'],
    lore: 'Його брата знайшли в порту десять років тому. Відтоді він носить у кишені гільзу і чекає, коли хтось прийде по нього.', tip: 'Поводьтеся як Шериф — хай сім\'я захоче вас прибрати.' },
  survivor: { name: 'Той, хто вижив', mono: 'Вж', kind: 'Пасивна · день', short: 'Перемагає, якщо дожив до кінця гри, хто б не виграв.',
    rules: ['Якщо до кінця гри він живий — перемагає разом зі стороною, що виграла.', 'Для перевірок — червоний.', 'Місто і сім\'я не знають, хто він.', 'Уночі не прокидається.'],
    lore: 'Пережив три війни кланів, дві пожежі й одну повінь. Друзів у нього немає, зате є запасний вихід із кожного бару Кастельмара.', tip: 'Не сперечайтеся, не ведіть, не лізьте в перевірки. Будьте нудним.' },
  contractor: { name: 'Контрактник', mono: 'Кн', kind: 'Пасивна · день', short: 'Отримує таємну ціль. Перемагає, якщо місто вижене її голосуванням.',
    rules: ['Під час роздачі ведучий повідомляє Контрактнику ціль — одного з гравців.', 'Якщо ціль виганяють голосуванням, поки Контрактник живий, — він переміг. Гра триває.', 'Якщо ціль вибуває інакше, контракт згорає.', 'Для перевірок — червоний.'],
    lore: 'Конверт без зворотної адреси, всередині — одне ім\'я. Він не питає, хто замовник. Він просто каже правильні слова на площі.', tip: 'Не виганяйте ціль самі першого дня — місто помітить. Готуйте ґрунт.' },
  witch: { name: 'Відьма', mono: 'Вд', kind: 'Активна · ніч', short: 'Перенаправляє нічну дію одного гравця на іншого. Перемагає з мафією.',
    rules: ['Уночі показує гравця А і гравця Б: що б не робив А цієї ночі, він зробить це з Б.', 'Для перевірок — червона. Сім\'я не знає, хто вона.', 'Перемагає разом із мафією, якщо дожила до її перемоги.', 'Себе вказувати не можна.'],
    lore: 'Крамниця трав у підвалі на Годинниковій. Їй не потрібні пістолети: досить, щоб Лікар цієї ночі пішов не до тих дверей.', tip: 'Відправте Шерифа перевіряти Перевертня, а Лікаря — лікувати Дона.' },
  amnesiac: { name: 'Амнезіак', mono: 'Ам', kind: 'Активна · ніч · 1 раз', short: 'Один раз за гру бере роль гравця, що вибув, і грає за неї.',
    rules: ['Уночі показує будь-якого гравця, що вибув, — і відтоді грає його роллю.', 'Сторона, колір і здібності стають як у нової ролі. Сім\'ю він дізнається наступної ночі.', 'Поки не згадав — червоний і перемагає з містом.', 'Місто і сім\'я не знають, ким він став.'],
    lore: 'Його знайшли на рейках за вокзалом без документів і без пам\'яті. Він читає некрологи в «Кастельмар Пост», сподіваючись упізнати себе.', tip: 'Дочекайтеся, поки вибуде сильна роль, і заберіть її, поки місто не звикло до тиші.' }
});
Object.assign(I18N.uk.hooks, { arsonist: 'Палій спалює всіх облитих', lawyer: 'Адвокат скасовує вигнання сім\'ї', hypnotist: 'Гіпнотизер краде голос', saboteur: 'Саботажник блокує здібності', sniper: 'Снайпер робить один небезпечний постріл', tracker: 'Слідопит бачить нічні маршрути', jailer: 'Тюремник замикає гравця', avenger: 'Месник забирає стрільця', survivor: 'Той, хто вижив, чекає кінця', contractor: 'Контрактник веде ціль на вигнання', witch: 'Відьма перенаправляє дії', amnesiac: 'Амнезіак бере чужу роль' });
Object.assign(I18N.uk.e, {
  script2: {
    arsonist: 'Прокидається <b>Палій</b>: показує, кого облити, або жестом «вогонь» підпалює всіх облитих.',
    hypnotist: 'Прокидається <b>Гіпнотизер</b>: показує гравця А і гравця Б — завтра голос А піде за Б.',
    saboteur: 'Прокидається <b>Саботажник</b> і показує, чию здібність блокує цієї ночі.',
    sniper: 'Прокидається <b>Снайпер</b>. Один постріл за гру: у чорного — вбиває, у червоного — гине сам. Може пропустити.',
    tracker: 'Прокидається <b>Слідопит</b> і показує, за ким стежить. Уранці дізнається, до кого ходив цей гравець.',
    jailer: 'Прокидається <b>Тюремник</b> і показує, кого замикає на ніч.',
    witch: 'Прокидається <b>Відьма</b>: показує гравця А і гравця Б — усе, що А зробить цієї ночі, він зробить з Б.',
    amnesiac: 'Прокидається <b>Амнезіак</b> і може показати гравця, що вибув, чию роль бере. Може пропустити.'
  },
  modeDouse: 'Облити', modeIgnite: 'Підпалити', igniteNone: 'Облитих гравців немає.', igniteDone: 'Підпалив: {list}', dousedLog: 'Облитий: {target}',
  blockedNote: 'Цієї ночі здібність заблокував <b>Саботажник</b>. Гравець прокидається, але дії немає.', jailedNote: 'Гравець замкнений <b>Тюремником</b>: прокидається, але дії немає.',
  whyJailLast: 'був у камері минулої ночі', whyDead: 'вибулі',
  fireHit: 'Вогонь Палія: {target} вибуває.', snipeBack: 'Снайпер {sniper} вистрілив у червоного {target} — куля повернулася, Снайпер вибуває.', snipeHit: 'Постріл Снайпера у {target} — влучання.', snipeHealed: 'Постріл Снайпера у {target} — вилікуваний.',
  avengeLog: 'Месник {avenger} забрав із собою стрільця {shooter}.', jailMiss: 'Постріл ({by}) у {target} — повз: гравець у камері Тюремника.',
  witchLog: 'Відьма перенаправила дію {actor} на {target}.', trackLog: 'Слідопит: {target} ходив до {dest}.', trackNone: 'Слідопит: {target} нікуди не ходив.',
  quietHypno: 'Гіпнотизер: голос {target} завтра піде за {to}.',
  causeFire: 'вогонь Палія', causeAvenge: 'удар у відповідь Месника', causeSnipe: 'куля Снайпера повернулася',
  rememberLog: 'Амнезіак {player} згадав: тепер він {role}.', contractAssigned: 'Контрактник {player}: ціль — {target}.', contractWon: 'Контрактник {player} переміг: ціль {target} вигнано!',
  lawyerLog: 'Адвокат {player} оголосив захист: вигнання {target} скасовано.', survivorWon: 'Той, хто вижив, {player} дожив до кінця і перемагає.'
});
Object.assign(I18N.uk.ui, {
  shop: 'Магазин', shopD: 'Преміум-карти по 2 $ і сценарії по 9,99 $', premium: 'Преміум', buy: 'Купити {price}', owned: 'Куплено', locked: 'Не куплено', priceCard: '2 $', priceScen: '9,99 $',
  buyTitle: 'Покупка', buyDemo: 'Купити за {price}', buyNote: 'Оплата через Telegram Stars. Покупка прив’язується до вашого акаунта Telegram і доступна на всіх ваших пристроях.', bought: 'Куплено: {name}',
  shopCards: 'Карти розширення', shopScen: 'Преміум-сценарії', scenRoles: 'Особливі ролі: {list}', scenPlayers: '{a}–{b} гравців', useScen: 'Створити гру', scenActive: 'Сценарій: {name}',
  lockedInComp: 'У складі є некуплені карти: {list}', lawyerBtn: 'Адвокат {seat} оголошує захист', contractInfo: 'Ціль Контрактника {seat}: гравець {target}', extraWinners: 'Також перемогли: {list}',
  modGunsmith: 'Зброяр стріляє щоночі', modTwoFam: 'Дві сім\'ї з {n} гравців', modNoReveal: 'Карти вибулих не відкриваються', scenStd: 'Стандартні столи', tiltHint: 'Нахиліть телефон або проведіть по карті'
});
I18N.uk.scenarios = {
  arson_night: { name: 'Ніч Палія', lore: 'Склади на Соляній набережній горять щоночі. Палій проти Тюремника і Слідопита.' },
  court: { name: 'Суд Кастельмара', lore: 'Адвокат і Суддя сперечаються за кожну голову, а Контрактник чекає вироку.' },
  hypnosis: { name: 'Гіпноз', lore: 'Голоси міста належать не місту. Слідопит шукає того, хто смикає за нитки.' },
  silent_killers: { name: 'Тихі вбивці', lore: 'Снайпер, Саботажник і Месник. Кожен постріл може стати останнім — для стрільця.' },
  masquerade: { name: 'Карнавал масок', lore: 'Відьма, Амнезіак і Блазень: ніхто за столом не той, ким здається.' },
  clan_war: { name: 'Війна кланів', lore: 'Дві сім\'ї вже з 14 гравців, і в кожної свій Адвокат.' },
  survival: { name: 'Виживання', lore: 'Зброяр стріляє щоночі. Перемагає той, хто доживе.' },
  chaos: { name: 'Повний хаос', lore: 'Усі дванадцять карт розширення за одним столом.' }
};

/* ---- EN ---- */
Object.assign(I18N.en.roles, {
  arsonist: { name: 'Arsonist', mono: 'Ar', kind: 'Active · night', short: 'Douses a player every night; once per game ignites everyone doused.',
    rules: ['At night points to a player: that player is doused. The doused notice nothing.', 'Instead of dousing, once per game may give the "ignite" gesture: every doused player still in the game leaves.', 'Fire cannot be healed, and neither the Rabbi nor the Bodyguard can shield from it.', 'Wakes with the family; sixth in line.'],
    lore: 'The warehouse on Salt Quay burned down in six minutes. The firemen found only a canister and a note: "This is just the beginning."', tip: 'Douse the ones the Doctor heals most often; he can\'t stop fire.' },
  lawyer: { name: 'Lawyer', mono: 'Lw', kind: 'Active · day · once', short: 'Once per game cancels the expulsion of a family member.',
    rules: ['If a black player is voted out, the Lawyer may declare a defense: the expulsion is cancelled and nobody leaves.', 'Works once per game and only on black players.', 'The Lawyer reveals himself by this act.', 'Wakes with the family; no separate night action.'],
    lore: 'His office on Three Fountains Square has never lost a case, because every witness disappeared before the trial.', tip: 'Save the defense for the Don. The family will survive losing a soldier.' },
  hypnotist: { name: 'Hypnotist', mono: 'Hy', kind: 'Active · night', short: 'At night decides whom a chosen player will vote for tomorrow.',
    rules: ['At night points to player A and player B.', 'At the next vote A\'s vote counts for B, whatever A shows with his hand.', 'The host announces nothing.', 'Wakes with the family; seventh in line.'],
    lore: 'A pocket watch, a quiet voice, a velvet study above the tobacco shop. People walk out convinced of things they never thought.', tip: 'Take the loudest red player\'s vote and send it at the Sheriff.' },
  saboteur: { name: 'Saboteur', mono: 'Sb', kind: 'Active · night', short: 'At night blocks one player\'s ability.',
    rules: ['At night points to a player: that player\'s active ability does nothing tonight.', 'The blocked player wakes as usual and never learns about the block.', 'The block does not protect from shots and does not break passive roles.', 'Wakes with the family; eighth in line.'],
    lore: 'A cut wire, sand in the fuel tank, a lock filled with glue. He never killed anyone; he just always happened to be nearby before the most important job.', tip: 'Block the Doctor on the night the family shoots the Sheriff.' },
  sniper: { name: 'Sniper', mono: 'Sn', kind: 'Active · night · once', short: 'One shot per game. Hit a red player and you die yourself.',
    rules: ['Once per game at night points to a player.', 'If the player is black, it is an ordinary shot and can be healed.', 'If the player is red or neutral, the bullet comes back: the Sniper leaves, the target lives.', 'Reads as red.'],
    lore: 'A veteran of the port war keeps a rifle in the attic above the fish market. One round. One mistake, and they will find him in that same attic.', tip: 'Shoot only after a Sheriff check or a Journalist comparison.' },
  tracker: { name: 'Tracker', mono: 'Tk', kind: 'Active · night', short: 'At night learns whom the chosen player visited.',
    rules: ['At night points to a player.', 'In the morning the host quietly tells the Tracker whom that player aimed their night action at, or that they went nowhere.', 'Passive roles always "went nowhere".', 'Reads as red.'],
    lore: 'A former smuggler who knows every yard in Castelmar. At night he follows a shadow and always knows at whose door it stopped.', tip: 'Follow whoever the town suspects: a night route gives away the Don better than a check.' },
  jailer: { name: 'Jailer', mono: 'Jl', kind: 'Active · night', short: 'At night locks a player up: no action, and no shot can reach them.',
    rules: ['At night points to a player, who spends the night in a cell.', 'The jailed player uses no ability, and every shot at them misses.', 'Cannot jail the same player two nights in a row. Cannot jail himself.', 'Reads as red.'],
    lore: 'The old prison on Rope Street closed long ago, but he kept the keys. One cell, one night, one guest.', tip: 'Jail whoever you want both to protect and to test: a mafioso in a cell does not shoot.' },
  avenger: { name: 'Avenger', mono: 'Av', kind: 'Passive · on elimination', short: 'If the family kills him at night, the shooter dies with him.',
    rules: ['If the Avenger is killed by the family\'s shot, whoever pointed to the target leaves too.', 'The retaliation cannot be healed.', 'Does not trigger on the Sheriff\'s or the Maniac\'s shot, nor on a vote.', 'Does not wake at night.'],
    lore: 'His brother was found in the port ten years ago. Since then he carries a shell casing in his pocket and waits for someone to come for him.', tip: 'Act like a Sheriff so the family wants you gone.' },
  survivor: { name: 'Survivor', mono: 'Sv', kind: 'Passive · day', short: 'Wins if alive at the end of the game, whoever wins it.',
    rules: ['If the Survivor is alive when the game ends, he wins alongside the winning side.', 'Reads as red.', 'Neither the town nor the family knows who he is.', 'Does not wake at night.'],
    lore: 'He has outlived three clan wars, two fires and one flood. He has no friends, but he knows the back door of every bar in Castelmar.', tip: 'Don\'t argue, don\'t lead, stay out of checks. Be boring.' },
  contractor: { name: 'Contractor', mono: 'Ct', kind: 'Passive · day', short: 'Gets a secret target. Wins if the town votes that target out.',
    rules: ['At the deal the host tells the Contractor his target: one of the players.', 'If the target is voted out while the Contractor is alive, he wins. The game goes on.', 'If the target leaves any other way, the contract is void.', 'Reads as red.'],
    lore: 'An envelope with no return address and a single name inside. He doesn\'t ask who the client is. He just says the right words on the square.', tip: 'Don\'t push your target out on day one; the town will notice. Prepare the ground.' },
  witch: { name: 'Witch', mono: 'Wt', kind: 'Active · night', short: 'Redirects one player\'s night action onto another. Wins with the mafia.',
    rules: ['At night points to player A and player B: whatever A does tonight, A does it to B.', 'Reads as red. The family doesn\'t know who she is.', 'Wins with the mafia if she survives to their victory.', 'Cannot point to herself.'],
    lore: 'A herb shop in a basement on Clock Street. She needs no pistols: it is enough that the Doctor knocks on the wrong door tonight.', tip: 'Send the Sheriff to check the Werewolf and the Doctor to heal the Don.' },
  amnesiac: { name: 'Amnesiac', mono: 'Am', kind: 'Active · night · once', short: 'Once per game takes the role of an eliminated player and plays it.',
    rules: ['At night points to any eliminated player and from then on plays that role.', 'Side, color and abilities become those of the new role. He meets the family the next night.', 'Until he remembers, he reads red and wins with the town.', 'Neither the town nor the family knows what he became.'],
    lore: 'He was found on the rails behind the station with no papers and no memory. He reads the obituaries in the Castelmar Post hoping to recognize himself.', tip: 'Wait for a strong role to leave and take it before the town gets used to the quiet.' }
});
Object.assign(I18N.en.hooks, { arsonist: 'the Arsonist burns everyone doused', lawyer: 'the Lawyer cancels a family expulsion', hypnotist: 'the Hypnotist steals a vote', saboteur: 'the Saboteur blocks abilities', sniper: 'the Sniper takes one risky shot', tracker: 'the Tracker sees night routes', jailer: 'the Jailer locks a player up', avenger: 'the Avenger takes the shooter along', survivor: 'the Survivor waits for the end', contractor: 'the Contractor leads a target to the vote', witch: 'the Witch redirects actions', amnesiac: 'the Amnesiac takes a dead role' });
Object.assign(I18N.en.e, {
  script2: {
    arsonist: 'The <b>Arsonist</b> wakes up: points to a player to douse, or gives the "fire" gesture to ignite everyone doused.',
    hypnotist: 'The <b>Hypnotist</b> wakes up: points to player A and player B; tomorrow A\'s vote goes to B.',
    saboteur: 'The <b>Saboteur</b> wakes up and points to the player whose ability he blocks tonight.',
    sniper: 'The <b>Sniper</b> wakes up. One shot per game: a black player dies, a red one sends the bullet back. He may pass.',
    tracker: 'The <b>Tracker</b> wakes up and points to the player he follows. In the morning he learns whom that player visited.',
    jailer: 'The <b>Jailer</b> wakes up and points to the player he locks up for the night.',
    witch: 'The <b>Witch</b> wakes up: points to player A and player B; whatever A does tonight, A does to B.',
    amnesiac: 'The <b>Amnesiac</b> wakes up and may point to an eliminated player whose role he takes. He may pass.'
  },
  modeDouse: 'Douse', modeIgnite: 'Ignite', igniteNone: 'Nobody is doused.', igniteDone: 'Ignited: {list}', dousedLog: 'Doused: {target}',
  blockedNote: 'The <b>Saboteur</b> blocked the ability tonight. The player wakes up but takes no action.', jailedNote: 'The player is locked up by the <b>Jailer</b>: wakes up but takes no action.',
  whyJailLast: 'was in the cell last night', whyDead: 'eliminated',
  fireHit: 'The Arsonist\'s fire: {target} leaves.', snipeBack: 'Sniper {sniper} shot the red player {target}; the bullet came back and the Sniper leaves.', snipeHit: 'The Sniper\'s shot at {target} — hit.', snipeHealed: 'The Sniper\'s shot at {target} — healed.',
  avengeLog: 'Avenger {avenger} took shooter {shooter} along.', jailMiss: 'Shot ({by}) at {target} — missed: the player is in the Jailer\'s cell.',
  witchLog: 'The Witch redirected {actor}\'s action onto {target}.', trackLog: 'Tracker: {target} visited {dest}.', trackNone: 'Tracker: {target} went nowhere.',
  quietHypno: 'Hypnotist: {target}\'s vote goes to {to} tomorrow.',
  causeFire: 'the Arsonist\'s fire', causeAvenge: 'the Avenger\'s retaliation', causeSnipe: 'the Sniper\'s bullet came back',
  rememberLog: 'Amnesiac {player} remembered: he is now the {role}.', contractAssigned: 'Contractor {player}: target — {target}.', contractWon: 'Contractor {player} wins: target {target} was voted out!',
  lawyerLog: 'Lawyer {player} declared a defense: the expulsion of {target} is cancelled.', survivorWon: 'Survivor {player} lived to the end and wins.'
});
Object.assign(I18N.en.ui, {
  shop: 'Shop', shopD: 'Premium cards for $2 and scenarios for $9.99', premium: 'Premium', buy: 'Buy {price}', owned: 'Owned', locked: 'Not owned', priceCard: '$2', priceScen: '$9.99',
  buyTitle: 'Purchase', buyDemo: 'Buy for {price}', buyNote: 'Paid with Telegram Stars. The purchase is tied to your Telegram account and available on all your devices.', bought: 'Purchased: {name}',
  shopCards: 'Expansion cards', shopScen: 'Premium scenarios', scenRoles: 'Special roles: {list}', scenPlayers: '{a}–{b} players', useScen: 'Create game', scenActive: 'Scenario: {name}',
  lockedInComp: 'The composition contains cards you don\'t own: {list}', lawyerBtn: 'Lawyer {seat} declares a defense', contractInfo: 'Contractor {seat}\'s target: player {target}', extraWinners: 'Also won: {list}',
  modGunsmith: 'The Gunsmith shoots every night', modTwoFam: 'Two families from {n} players', modNoReveal: 'Cards of the eliminated stay hidden', scenStd: 'Standard tables', tiltHint: 'Tilt the phone or swipe across the card'
});
I18N.en.scenarios = {
  arson_night: { name: 'Night of the Arsonist', lore: 'The warehouses on Salt Quay burn every night. The Arsonist against the Jailer and the Tracker.' },
  court: { name: 'Castelmar Court', lore: 'The Lawyer and the Judge fight over every head while the Contractor waits for the verdict.' },
  hypnosis: { name: 'Hypnosis', lore: 'The town\'s votes do not belong to the town. The Tracker hunts whoever pulls the strings.' },
  silent_killers: { name: 'Silent Killers', lore: 'Sniper, Saboteur and Avenger. Every shot may be the last one, for the shooter.' },
  masquerade: { name: 'Masquerade', lore: 'Witch, Amnesiac and Jester: nobody at the table is who they seem.' },
  clan_war: { name: 'Clan War', lore: 'Two families from 14 players, each with its own Lawyer.' },
  survival: { name: 'Survival', lore: 'The Gunsmith shoots every night. Whoever lives wins.' },
  chaos: { name: 'Total Chaos', lore: 'All twelve expansion cards at one table.' }
};

/* ---- PL ---- */
Object.assign(I18N.pl.roles, {
  arsonist: { name: 'Podpalacz', mono: 'Pd', kind: 'Aktywna · noc', short: 'Co noc oblewa gracza benzyną; raz na grę podpala wszystkich oblanych.',
    rules: ['W nocy wskazuje gracza — ten jest oblany. Oblani niczego nie zauważają.', 'Zamiast oblewać, raz na grę może pokazać gest „podpal”: wszyscy oblani, którzy są jeszcze w grze, odpadają.', 'Ognia nie da się wyleczyć; nie chroni przed nim ani Rabin, ani Ochroniarz.', 'Budzi się z rodziną; szósty w kolejności.'],
    lore: 'Magazyn na Solnym Nabrzeżu spłonął w sześć minut. Strażacy znaleźli tylko kanister i kartkę: „To dopiero początek”.', tip: 'Oblewaj tych, których Lekarz leczy najczęściej — ognia nie zatrzyma.' },
  lawyer: { name: 'Adwokat', mono: 'Ad', kind: 'Aktywna · dzień · 1 raz', short: 'Raz na grę unieważnia wyrzucenie członka rodziny.',
    rules: ['Jeśli w głosowaniu wyrzucany jest czarny gracz, Adwokat może ogłosić obronę: wyrzucenie zostaje unieważnione, nikt nie odpada.', 'Działa raz na grę i tylko na czarnych.', 'Adwokat ujawnia się tym działaniem.', 'Budzi się z rodziną; w nocy nie ma osobnych działań.'],
    lore: 'Jego kancelaria przy placu Trzech Fontann nie przegrała żadnej sprawy — bo wszyscy świadkowie znikali przed procesem.', tip: 'Zachowaj obronę dla Dona. Wyrzucenie żołnierza rodzina przeżyje.' },
  hypnotist: { name: 'Hipnotyzer', mono: 'Hp', kind: 'Aktywna · noc', short: 'W nocy decyduje, na kogo jutro zagłosuje wybrany gracz.',
    rules: ['W nocy wskazuje gracza A i gracza B.', 'W następnym głosowaniu głos A liczy się na B, cokolwiek A pokaże ręką.', 'Prowadzący nic nie ogłasza.', 'Budzi się z rodziną; siódmy w kolejności.'],
    lore: 'Zegarek kieszonkowy, cichy głos, aksamitny gabinet nad sklepem z tytoniem. Ludzie wychodzą stamtąd przekonani o rzeczach, o których nigdy nie myśleli.', tip: 'Zabierz głos najgłośniejszemu czerwonemu i wyślij go na Szeryfa.' },
  saboteur: { name: 'Sabotażysta', mono: 'Sb', kind: 'Aktywna · noc', short: 'W nocy blokuje zdolność jednego gracza.',
    rules: ['W nocy wskazuje gracza — tej nocy jego aktywna zdolność nie działa.', 'Zablokowany budzi się jak zwykle i nie dowiaduje się o blokadzie.', 'Blokada nie chroni przed strzałami i nie psuje ról pasywnych.', 'Budzi się z rodziną; ósmy w kolejności.'],
    lore: 'Przecięty kabel, piasek w baku, zamek zalany klejem. Nigdy nikogo nie zabił — po prostu zawsze był w pobliżu przed najważniejszą robotą.', tip: 'Blokuj Lekarza w noc, gdy rodzina strzela do Szeryfa.' },
  sniper: { name: 'Snajper', mono: 'Sn', kind: 'Aktywna · noc · 1 raz', short: 'Jeden strzał na grę. Trafisz czerwonego — giniesz sam.',
    rules: ['Raz na grę w nocy wskazuje gracza.', 'Jeśli gracz jest czarny — strzał zwykły, można go wyleczyć.', 'Jeśli gracz jest czerwony lub neutralny — kula wraca: Snajper odpada, cel żyje.', 'Dla sprawdzeń — czerwony.'],
    lore: 'Weteran wojny portowej trzyma karabin na strychu nad targiem rybnym. Jeden nabój. Jeden błąd — i znajdą go na tym samym strychu.', tip: 'Strzelaj tylko po sprawdzeniu Szeryfa lub porównaniu Dziennikarza.' },
  tracker: { name: 'Tropiciel', mono: 'Tp', kind: 'Aktywna · noc', short: 'W nocy dowiaduje się, do kogo poszedł wybrany gracz.',
    rules: ['W nocy wskazuje gracza.', 'Rano prowadzący po cichu mówi Tropicielowi, na kogo ten gracz skierował swoje nocne działanie — albo że nigdzie nie poszedł.', 'Role pasywne zawsze „nigdzie nie poszły”.', 'Dla sprawdzeń — czerwony.'],
    lore: 'Były przemytnik zna każde podwórko Castelmar. W nocy idzie za cieniem i zawsze wie, przy czyich drzwiach się zatrzymał.', tip: 'Śledź tego, kogo miasto podejrzewa: nocna trasa zdradza Dona lepiej niż sprawdzenie.' },
  jailer: { name: 'Strażnik', mono: 'St', kind: 'Aktywna · noc', short: 'W nocy zamyka gracza: ten nie działa i nie da się w niego trafić.',
    rules: ['W nocy wskazuje gracza — ten spędza noc w celi.', 'Zamknięty nie używa zdolności, a wszystkie strzały w niego chybiają.', 'Tego samego gracza nie można zamykać dwie noce z rzędu. Siebie — nie można.', 'Dla sprawdzeń — czerwony.'],
    lore: 'Stare więzienie przy Powroźniczej dawno zamknięto, ale jemu zostały klucze. Jedna cela, jedna noc, jeden gość.', tip: 'Zamknij tego, kogo chcesz i chronić, i sprawdzić: mafia w celi nie strzela.' },
  avenger: { name: 'Mściciel', mono: 'Mś', kind: 'Pasywna · przy odpadnięciu', short: 'Jeśli rodzina zabije go w nocy, strzelec ginie razem z nim.',
    rules: ['Jeśli Mściciel odpada od strzału rodziny, ten, kto wskazał cel, też odpada.', 'Odwetu nie da się wyleczyć.', 'Nie działa na strzał Szeryfa, Maniaka ani na głosowanie.', 'W nocy się nie budzi.'],
    lore: 'Jego brata znaleziono w porcie dziesięć lat temu. Od tamtej pory nosi w kieszeni łuskę i czeka, aż ktoś po niego przyjdzie.', tip: 'Zachowuj się jak Szeryf — niech rodzina chce cię usunąć.' },
  survivor: { name: 'Ocalały', mono: 'Oc', kind: 'Pasywna · dzień', short: 'Wygrywa, jeśli dożyje końca gry, kto by nie wygrał.',
    rules: ['Jeśli na koniec gry Ocalały żyje — wygrywa razem ze zwycięską stroną.', 'Dla sprawdzeń — czerwony.', 'Miasto i rodzina nie wiedzą, kim jest.', 'W nocy się nie budzi.'],
    lore: 'Przeżył trzy wojny klanów, dwa pożary i jedną powódź. Nie ma przyjaciół, za to zna tylne wyjście z każdego baru w Castelmar.', tip: 'Nie kłóć się, nie prowadź, nie pchaj się w sprawdzenia. Bądź nudny.' },
  contractor: { name: 'Zleceniobiorca', mono: 'Zl', kind: 'Pasywna · dzień', short: 'Dostaje tajny cel. Wygrywa, jeśli miasto wyrzuci go w głosowaniu.',
    rules: ['Przy rozdaniu prowadzący podaje Zleceniobiorcy cel — jednego z graczy.', 'Jeśli cel zostanie wyrzucony w głosowaniu, póki Zleceniobiorca żyje — wygrał. Gra trwa.', 'Jeśli cel odpadnie inaczej, zlecenie przepada.', 'Dla sprawdzeń — czerwony.'],
    lore: 'Koperta bez adresu zwrotnego, w środku jedno nazwisko. Nie pyta, kto zleca. Po prostu mówi właściwe słowa na placu.', tip: 'Nie wyrzucaj celu sam pierwszego dnia — miasto zauważy. Przygotuj grunt.' },
  witch: { name: 'Wiedźma', mono: 'Wd', kind: 'Aktywna · noc', short: 'Przekierowuje nocne działanie jednego gracza na innego. Wygrywa z mafią.',
    rules: ['W nocy wskazuje gracza A i gracza B: cokolwiek A zrobi tej nocy, zrobi to z B.', 'Dla sprawdzeń — czerwona. Rodzina nie wie, kim jest.', 'Wygrywa razem z mafią, jeśli dożyje jej zwycięstwa.', 'Siebie wskazać nie można.'],
    lore: 'Sklep z ziołami w piwnicy przy Zegarowej. Nie potrzebuje pistoletów: wystarczy, by Lekarz tej nocy poszedł pod niewłaściwe drzwi.', tip: 'Wyślij Szeryfa sprawdzać Wilkołaka, a Lekarza leczyć Dona.' },
  amnesiac: { name: 'Amnezjak', mono: 'Am', kind: 'Aktywna · noc · 1 raz', short: 'Raz na grę przejmuje rolę gracza, który odpadł, i gra nią.',
    rules: ['W nocy wskazuje dowolnego gracza, który odpadł — i od tej chwili gra jego rolą.', 'Strona, kolor i zdolności stają się jak u nowej roli. Rodzinę poznaje następnej nocy.', 'Dopóki nie przypomni sobie — jest czerwony i wygrywa z miastem.', 'Miasto i rodzina nie wiedzą, kim się stał.'],
    lore: 'Znaleziono go na torach za dworcem bez dokumentów i bez pamięci. Czyta nekrologi w „Castelmar Post”, licząc, że rozpozna siebie.', tip: 'Poczekaj, aż odpadnie silna rola, i przejmij ją, zanim miasto przywyknie do ciszy.' }
});
Object.assign(I18N.pl.hooks, { arsonist: 'Podpalacz pali wszystkich oblanych', lawyer: 'Adwokat unieważnia wyrzucenie rodziny', hypnotist: 'Hipnotyzer kradnie głos', saboteur: 'Sabotażysta blokuje zdolności', sniper: 'Snajper oddaje jeden ryzykowny strzał', tracker: 'Tropiciel widzi nocne trasy', jailer: 'Strażnik zamyka gracza', avenger: 'Mściciel zabiera strzelca', survivor: 'Ocalały czeka na koniec', contractor: 'Zleceniobiorca prowadzi cel na wyrzucenie', witch: 'Wiedźma przekierowuje działania', amnesiac: 'Amnezjak przejmuje cudzą rolę' });
Object.assign(I18N.pl.e, {
  script2: {
    arsonist: 'Budzi się <b>Podpalacz</b>: wskazuje, kogo oblać, albo gestem „ogień” podpala wszystkich oblanych.',
    hypnotist: 'Budzi się <b>Hipnotyzer</b>: wskazuje gracza A i gracza B — jutro głos A pójdzie na B.',
    saboteur: 'Budzi się <b>Sabotażysta</b> i wskazuje, czyją zdolność blokuje tej nocy.',
    sniper: 'Budzi się <b>Snajper</b>. Jeden strzał na grę: w czarnego — zabija, w czerwonego — ginie sam. Może spasować.',
    tracker: 'Budzi się <b>Tropiciel</b> i wskazuje, kogo śledzi. Rano dowie się, do kogo poszedł ten gracz.',
    jailer: 'Budzi się <b>Strażnik</b> i wskazuje, kogo zamyka na noc.',
    witch: 'Budzi się <b>Wiedźma</b>: wskazuje gracza A i gracza B — cokolwiek A zrobi tej nocy, zrobi to z B.',
    amnesiac: 'Budzi się <b>Amnezjak</b> i może wskazać gracza, który odpadł, którego rolę przejmuje. Może spasować.'
  },
  modeDouse: 'Oblać', modeIgnite: 'Podpalić', igniteNone: 'Nikt nie jest oblany.', igniteDone: 'Podpalił: {list}', dousedLog: 'Oblany: {target}',
  blockedNote: 'Tej nocy zdolność zablokował <b>Sabotażysta</b>. Gracz się budzi, ale nie działa.', jailedNote: 'Gracz zamknięty przez <b>Strażnika</b>: budzi się, ale nie działa.',
  whyJailLast: 'był w celi poprzedniej nocy', whyDead: 'którzy odpadli',
  fireHit: 'Ogień Podpalacza: {target} odpada.', snipeBack: 'Snajper {sniper} strzelił do czerwonego {target} — kula wróciła, Snajper odpada.', snipeHit: 'Strzał Snajpera w {target} — trafienie.', snipeHealed: 'Strzał Snajpera w {target} — wyleczony.',
  avengeLog: 'Mściciel {avenger} zabrał ze sobą strzelca {shooter}.', jailMiss: 'Strzał ({by}) w {target} — chybił: gracz w celi Strażnika.',
  witchLog: 'Wiedźma przekierowała działanie {actor} na {target}.', trackLog: 'Tropiciel: {target} poszedł do {dest}.', trackNone: 'Tropiciel: {target} nigdzie nie poszedł.',
  quietHypno: 'Hipnotyzer: głos {target} jutro pójdzie na {to}.',
  causeFire: 'ogień Podpalacza', causeAvenge: 'odwet Mściciela', causeSnipe: 'kula Snajpera wróciła',
  rememberLog: 'Amnezjak {player} przypomniał sobie: teraz jest {role}.', contractAssigned: 'Zleceniobiorca {player}: cel — {target}.', contractWon: 'Zleceniobiorca {player} wygrał: cel {target} wyrzucony!',
  lawyerLog: 'Adwokat {player} ogłosił obronę: wyrzucenie {target} unieważnione.', survivorWon: 'Ocalały {player} dożył końca i wygrywa.'
});
Object.assign(I18N.pl.ui, {
  shop: 'Sklep', shopD: 'Karty premium po 2 $ i scenariusze po 9,99 $', premium: 'Premium', buy: 'Kup {price}', owned: 'Kupione', locked: 'Nie kupione', priceCard: '2 $', priceScen: '9,99 $',
  buyTitle: 'Zakup', buyDemo: 'Kup za {price}', buyNote: 'Płatność przez Telegram Stars. Zakup jest powiązany z Twoim kontem Telegram i dostępny na wszystkich Twoich urządzeniach.', bought: 'Kupiono: {name}',
  shopCards: 'Karty rozszerzenia', shopScen: 'Scenariusze premium', scenRoles: 'Role specjalne: {list}', scenPlayers: '{a}–{b} graczy', useScen: 'Utwórz grę', scenActive: 'Scenariusz: {name}',
  lockedInComp: 'W składzie są niekupione karty: {list}', lawyerBtn: 'Adwokat {seat} ogłasza obronę', contractInfo: 'Cel Zleceniobiorcy {seat}: gracz {target}', extraWinners: 'Wygrali też: {list}',
  modGunsmith: 'Rusznikarz strzela co noc', modTwoFam: 'Dwie rodziny od {n} graczy', modNoReveal: 'Karty wyeliminowanych pozostają zakryte', scenStd: 'Stoły standardowe', tiltHint: 'Przechyl telefon lub przesuń po karcie'
});
I18N.pl.scenarios = {
  arson_night: { name: 'Noc Podpalacza', lore: 'Magazyny na Solnym Nabrzeżu płoną co noc. Podpalacz przeciw Strażnikowi i Tropicielowi.' },
  court: { name: 'Sąd w Castelmar', lore: 'Adwokat i Sędzia spierają się o każdą głowę, a Zleceniobiorca czeka na wyrok.' },
  hypnosis: { name: 'Hipnoza', lore: 'Głosy miasta nie należą do miasta. Tropiciel szuka tego, kto pociąga za sznurki.' },
  silent_killers: { name: 'Cisi zabójcy', lore: 'Snajper, Sabotażysta i Mściciel. Każdy strzał może być ostatnim — dla strzelca.' },
  masquerade: { name: 'Karnawał masek', lore: 'Wiedźma, Amnezjak i Błazen: nikt przy stole nie jest tym, kim się wydaje.' },
  clan_war: { name: 'Wojna klanów', lore: 'Dwie rodziny już od 14 graczy, każda ze swoim Adwokatem.' },
  survival: { name: 'Przetrwanie', lore: 'Rusznikarz strzela co noc. Wygrywa ten, kto dożyje.' },
  chaos: { name: 'Pełny chaos', lore: 'Wszystkie dwanaście kart rozszerzenia przy jednym stole.' }
};

/* ---- HY ---- */
Object.assign(I18N.hy.roles, {
  arsonist: { name: 'Հրձիգ', mono: 'Հր', kind: 'Ակտիվ · գիշեր', short: 'Ամեն գիշեր խաղացողին բենզին է լցնում. խաղի ընթացքում մեկ անգամ վառում է բոլոր լցվածներին։',
    rules: ['Գիշերը ցույց է տալիս խաղացողի. նա բենզինով լցված է։ Լցվածները ոչինչ չեն նկատում։', 'Լցնելու փոխարեն խաղի ընթացքում մեկ անգամ կարող է ցույց տալ «վառել» ժեստը. բոլոր լցվածները, ովքեր դեռ խաղում են, դուրս են գալիս։', 'Կրակը բուժել հնարավոր չէ, դրանից չեն պաշտպանում ո՛չ Ռաբբին, ո՛չ Թիկնապահը։', 'Արթնանում է ընտանիքի հետ. ավագության շարքում վեցերորդն է։'],
    lore: 'Աղի առափնյա պահեստն այրվեց վեց րոպեում։ Հրշեջները գտան միայն մի տարա և գրություն. «Սա միայն սկիզբն է»։', tip: 'Լցրե՛ք նրանց, ում Բժիշկն ամենից հաճախ է բուժում. կրակը նա չի կանգնեցնի։' },
  lawyer: { name: 'Փաստաբան', mono: 'Փ', kind: 'Ակտիվ · ցերեկ · 1 անգամ', short: 'Խաղի ընթացքում մեկ անգամ չեղարկում է ընտանիքի անդամի վռնդումը։',
    rules: ['Եթե քվեարկությամբ վռնդում են սև խաղացողի, Փաստաբանը կարող է պաշտպանություն հայտարարել. վռնդումը չեղարկվում է, ոչ ոք դուրս չի գալիս։', 'Գործում է խաղի ընթացքում մեկ անգամ և միայն սևերի վրա։', 'Փաստաբանն այս գործողությամբ բացում է իրեն։', 'Արթնանում է ընտանիքի հետ. գիշերն առանձին գործողություն չունի։'],
    lore: 'Երեք շատրվանների հրապարակի նրա գրասենյակը ոչ մի գործ չի պարտվել, որովհետև բոլոր վկաները անհետանում էին մինչև դատը։', tip: 'Պաշտպանությունը պահե՛ք Դոնի համար։ Զինվորի վռնդումն ընտանիքը կվերապրի։' },
  hypnotist: { name: 'Հիպնոսացնող', mono: 'Հպ', kind: 'Ակտիվ · գիշեր', short: 'Գիշերը որոշում է, թե ընտրված խաղացողը վաղը ում օգտին կքվեարկի։',
    rules: ['Գիշերը ցույց է տալիս Ա և Բ խաղացողներին։', 'Հաջորդ քվեարկության ժամանակ Ա-ի ձայնը հաշվվում է Բ-ի օգտին, ինչ էլ Ա-ն ձեռքով ցույց տա։', 'Վարողը ոչինչ չի հայտարարում։', 'Արթնանում է ընտանիքի հետ. ավագության շարքում յոթերորդն է։'],
    lore: 'Գրպանի ժամացույց, հանդարտ ձայն, թավշյա աշխատասենյակ ծխախոտի խանութի վերևում։ Մարդիկ այնտեղից դուրս են գալիս համոզված այն բանում, ինչի մասին երբեք չեն մտածել։', tip: 'Վերցրե՛ք ամենաբարձրաձայն կարմիրի ձայնը և ուղարկե՛ք Շերիֆի վրա։' },
  saboteur: { name: 'Դիվերսանտ', mono: 'Դվ', kind: 'Ակտիվ · գիշեր', short: 'Գիշերն արգելափակում է մեկ խաղացողի ունակությունը։',
    rules: ['Գիշերը ցույց է տալիս խաղացողի. այդ գիշեր նրա ակտիվ ունակությունը չի գործում։', 'Արգելափակվածն արթնանում է ինչպես միշտ և արգելափակման մասին չի իմանում։', 'Արգելափակումը չի պաշտպանում կրակոցներից և չի խանգարում պասիվ դերերին։', 'Արթնանում է ընտանիքի հետ. ավագության շարքում ութերորդն է։'],
    lore: 'Կտրված լար, ավազ բենզաբաքում, սոսնձով լցված փական։ Նա երբեք ոչ մեկին չի սպանել. նա պարզապես միշտ մոտակայքում էր ամենակարևոր գործից առաջ։', tip: 'Արգելափակե՛ք Բժշկին այն գիշեր, երբ ընտանիքը կրակում է Շերիֆին։' },
  sniper: { name: 'Դիպուկահար', mono: 'Դպ', kind: 'Ակտիվ · գիշեր · 1 անգամ', short: 'Մեկ կրակոց խաղի ընթացքում։ Կարմիրին դիպչելու դեպքում ինքն է մահանում։',
    rules: ['Խաղի ընթացքում մեկ անգամ գիշերը ցույց է տալիս խաղացողի։', 'Եթե խաղացողը սև է, կրակոցը սովորական է, այն կարելի է բուժել։', 'Եթե խաղացողը կարմիր է կամ չեզոք, գնդակը վերադառնում է. Դիպուկահարը դուրս է գալիս, թիրախը ողջ է։', 'Ստուգման համար՝ կարմիր։'],
    lore: 'Նավահանգստի պատերազմի վետերանը հրացանը պահում է ձկան շուկայի վերևի ձեղնահարկում։ Մեկ փամփուշտ։ Մեկ սխալ, և նրան կգտնեն նույն ձեղնահարկում։', tip: 'Կրակե՛ք միայն Շերիֆի ստուգումից կամ Լրագրողի համեմատությունից հետո։' },
  tracker: { name: 'Հետախույզ', mono: 'Հխ', kind: 'Ակտիվ · գիշեր', short: 'Գիշերն իմանում է, թե ընտրված խաղացողն ում մոտ է գնացել։',
    rules: ['Գիշերը ցույց է տալիս խաղացողի։', 'Առավոտյան վարողը լուռ հայտնում է Հետախույզին, թե այդ խաղացողն ում վրա է ուղղել իր գիշերային գործողությունը, կամ որ ոչ մի տեղ չի գնացել։', 'Պասիվ դերերը միշտ «ոչ մի տեղ չեն գնացել»։', 'Ստուգման համար՝ կարմիր։'],
    lore: 'Նախկին մաքսանենգը գիտի Կաստելմարի յուրաքանչյուր բակը։ Գիշերը նա հետևում է ստվերին և միշտ գիտի, թե ում դռան մոտ է այն կանգ առել։', tip: 'Հետևե՛ք նրան, ում քաղաքը կասկածում է. գիշերային երթուղին Դոնին մատնում է ավելի լավ, քան ստուգումը։' },
  jailer: { name: 'Բանտապահ', mono: 'Բն', kind: 'Ակտիվ · գիշեր', short: 'Գիշերը փակում է խաղացողին. նա չի գործում, և նրան խփել հնարավոր չէ։',
    rules: ['Գիշերը ցույց է տալիս խաղացողի. նա գիշերն անցկացնում է խցում։', 'Փակվածն ունակություն չի օգտագործում, իսկ նրան ուղղված բոլոր կրակոցները վրիպում են։', 'Նույն խաղացողին երկու գիշեր անընդմեջ փակել չի կարելի։ Իրեն՝ չի կարելի։', 'Ստուգման համար՝ կարմիր։'],
    lore: 'Պարանի փողոցի հին բանտը վաղուց փակ է, բայց բանալիները նրա մոտ են մնացել։ Մեկ խուց, մեկ գիշեր, մեկ հյուր։', tip: 'Փակե՛ք նրան, ում ուզում եք և՛ պաշտպանել, և՛ ստուգել. մաֆիան խցում չի կրակում։' },
  avenger: { name: 'Վրիժառու', mono: 'Վր', kind: 'Պասիվ · դուրս գալիս', short: 'Եթե նրան գիշերը սպանում է ընտանիքը, կրակողը մահանում է նրա հետ։',
    rules: ['Եթե Վրիժառուն դուրս է գալիս ընտանիքի կրակոցից, թիրախը ցույց տվողը նույնպես դուրս է գալիս։', 'Պատասխան հարվածը բուժել հնարավոր չէ։', 'Շերիֆի, Մոլագարի կրակոցի և քվեարկության դեպքում չի գործում։', 'Գիշերը չի արթնանում։'],
    lore: 'Նրա եղբորը գտան նավահանգստում տասը տարի առաջ։ Այդ ժամանակից նա գրպանում պարկուճ է կրում և սպասում, թե երբ կգան իր հետևից։', tip: 'Ձեզ պահե՛ք Շերիֆի պես. թող ընտանիքը ցանկանա ձեզ հանել։' },
  survivor: { name: 'Վերապրած', mono: 'Վպ', kind: 'Պասիվ · ցերեկ', short: 'Հաղթում է, եթե ապրել է մինչև խաղի վերջ, ով էլ հաղթի։',
    rules: ['Եթե խաղի վերջում Վերապրածը ողջ է, նա հաղթում է հաղթող կողմի հետ։', 'Ստուգման համար՝ կարմիր։', 'Քաղաքն ու ընտանիքը չգիտեն, թե ով է նա։', 'Գիշերը չի արթնանում։'],
    lore: 'Վերապրել է երեք կլանային պատերազմ, երկու հրդեհ և մեկ ջրհեղեղ։ Ընկերներ չունի, բայց գիտի Կաստելմարի յուրաքանչյուր բարի հետևի ելքը։', tip: 'Մի՛ վիճեք, մի՛ առաջնորդեք, ստուգումների մեջ մի՛ մտեք։ Եղե՛ք ձանձրալի։' },
  contractor: { name: 'Պայմանագրային', mono: 'Պգ', kind: 'Պասիվ · ցերեկ', short: 'Ստանում է գաղտնի թիրախ։ Հաղթում է, եթե քաղաքը նրան վռնդի քվեարկությամբ։',
    rules: ['Բաժանման ժամանակ վարողը Պայմանագրայինին հայտնում է թիրախը՝ խաղացողներից մեկին։', 'Եթե թիրախին վռնդում են քվեարկությամբ, քանի դեռ Պայմանագրայինն ողջ է, նա հաղթել է։ Խաղը շարունակվում է։', 'Եթե թիրախն այլ կերպ է դուրս գալիս, պայմանագիրն այրվում է։', 'Ստուգման համար՝ կարմիր։'],
    lore: 'Ծրար առանց հետադարձ հասցեի, ներսում՝ մեկ անուն։ Նա չի հարցնում, թե ով է պատվիրատուն։ Նա պարզապես ճիշտ խոսքեր է ասում հրապարակում։', tip: 'Առաջին օրն ինքներդ թիրախին մի՛ վռնդեք. քաղաքը կնկատի։ Հող պատրաստե՛ք։' },
  witch: { name: 'Վհուկ', mono: 'Վհ', kind: 'Ակտիվ · գիշեր', short: 'Մեկ խաղացողի գիշերային գործողությունն ուղղում է մեկ ուրիշի վրա։ Հաղթում է մաֆիայի հետ։',
    rules: ['Գիշերը ցույց է տալիս Ա և Բ խաղացողներին. ինչ էլ Ա-ն անի այդ գիշեր, կանի Բ-ի հետ։', 'Ստուգման համար՝ կարմիր։ Ընտանիքը չգիտի, թե ով է նա։', 'Հաղթում է մաֆիայի հետ, եթե ապրել է մինչև նրա հաղթանակը։', 'Իրեն ցույց տալ չի կարելի։'],
    lore: 'Խոտաբույսերի խանութ Ժամացույցի փողոցի նկուղում։ Նրան ատրճանակներ պետք չեն. բավական է, որ Բժիշկն այդ գիշեր սխալ դուռ թակի։', tip: 'Ուղարկե՛ք Շերիֆին ստուգելու Գայլամարդին, իսկ Բժշկին՝ բուժելու Դոնին։' },
  amnesiac: { name: 'Հիշողությունը կորցրած', mono: 'Հկ', kind: 'Ակտիվ · գիշեր · 1 անգամ', short: 'Խաղի ընթացքում մեկ անգամ վերցնում է դուրս եկած խաղացողի դերը և խաղում նրա փոխարեն։',
    rules: ['Գիշերը ցույց է տալիս ցանկացած դուրս եկած խաղացողի և այդ պահից խաղում է նրա դերով։', 'Կողմը, գույնը և ունակությունները դառնում են նոր դերինը։ Ընտանիքին ծանոթանում է հաջորդ գիշեր։', 'Քանի դեռ չի հիշել, կարմիր է և հաղթում է քաղաքի հետ։', 'Քաղաքն ու ընտանիքը չգիտեն, թե ով է դարձել։'],
    lore: 'Նրան գտան կայարանի հետևի ռելսերի վրա՝ առանց փաստաթղթերի և հիշողության։ Նա կարդում է «Կաստելմար Պոստ»-ի մահախոսականները՝ հույսով ճանաչել իրեն։', tip: 'Սպասե՛ք, մինչև ուժեղ դերը դուրս գա, և վերցրե՛ք այն, քանի դեռ քաղաքը լռությանը չի սովորել։' }
});
Object.assign(I18N.hy.hooks, { arsonist: 'Հրձիգն այրում է բոլոր լցվածներին', lawyer: 'Փաստաբանը չեղարկում է ընտանիքի վռնդումը', hypnotist: 'Հիպնոսացնողը գողանում է ձայնը', saboteur: 'Դիվերսանտն արգելափակում է ունակությունները', sniper: 'Դիպուկահարը մեկ վտանգավոր կրակոց է անում', tracker: 'Հետախույզը տեսնում է գիշերային երթուղիները', jailer: 'Բանտապահը փակում է խաղացողին', avenger: 'Վրիժառուն տանում է կրակողին', survivor: 'Վերապրածը սպասում է վերջին', contractor: 'Պայմանագրայինը թիրախին տանում է վռնդման', witch: 'Վհուկն ուղղում է գործողությունները', amnesiac: 'Հիշողությունը կորցրածը վերցնում է ուրիշի դերը' });
Object.assign(I18N.hy.e, {
  script2: {
    arsonist: 'Արթնանում է <b>Հրձիգը</b>. ցույց է տալիս, թե ում լցնել, կամ «կրակ» ժեստով վառում է բոլոր լցվածներին։',
    hypnotist: 'Արթնանում է <b>Հիպնոսացնողը</b>. ցույց է տալիս Ա և Բ խաղացողներին. վաղը Ա-ի ձայնը կգնա Բ-ին։',
    saboteur: 'Արթնանում է <b>Դիվերսանտը</b> և ցույց է տալիս, թե ում ունակությունն է այս գիշեր արգելափակում։',
    sniper: 'Արթնանում է <b>Դիպուկահարը</b>։ Մեկ կրակոց խաղի ընթացքում. սևին՝ սպանում է, կարմիրին՝ ինքն է մահանում։ Կարող է բաց թողնել։',
    tracker: 'Արթնանում է <b>Հետախույզը</b> և ցույց է տալիս, թե ում է հետևում։ Առավոտյան կիմանա, թե այդ խաղացողն ում մոտ է գնացել։',
    jailer: 'Արթնանում է <b>Բանտապահը</b> և ցույց է տալիս, թե ում է փակում գիշերով։',
    witch: 'Արթնանում է <b>Վհուկը</b>. ցույց է տալիս Ա և Բ խաղացողներին. այն, ինչ Ա-ն կանի այս գիշեր, կանի Բ-ի հետ։',
    amnesiac: 'Արթնանում է <b>Հիշողությունը կորցրածը</b> և կարող է ցույց տալ դուրս եկած խաղացողի, ում դերը վերցնում է։ Կարող է բաց թողնել։'
  },
  modeDouse: 'Լցնել', modeIgnite: 'Վառել', igniteNone: 'Լցված խաղացողներ չկան։', igniteDone: 'Վառեց. {list}', dousedLog: 'Լցված է. {target}',
  blockedNote: 'Այս գիշեր ունակությունն արգելափակել է <b>Դիվերսանտը</b>։ Խաղացողն արթնանում է, բայց գործողություն չկա։', jailedNote: 'Խաղացողը փակված է <b>Բանտապահի</b> կողմից. արթնանում է, բայց գործողություն չկա։',
  whyJailLast: 'նախորդ գիշեր խցում էր', whyDead: 'դուրս եկածներ',
  fireHit: 'Հրձիգի կրակը. {target}-ը դուրս է գալիս։', snipeBack: 'Դիպուկահար {sniper}-ը կրակեց կարմիր {target}-ին. գնդակը վերադարձավ, Դիպուկահարը դուրս է գալիս։', snipeHit: 'Դիպուկահարի կրակոցը {target}-ի վրա — դիպավ։', snipeHealed: 'Դիպուկահարի կրակոցը {target}-ի վրա — բուժված է։',
  avengeLog: 'Վրիժառու {avenger}-ը իր հետ տարավ կրակող {shooter}-ին։', jailMiss: 'Կրակոց ({by}) {target}-ի վրա — վրիպեց. խաղացողը Բանտապահի խցում է։',
  witchLog: 'Վհուկը {actor}-ի գործողությունն ուղղեց {target}-ի վրա։', trackLog: 'Հետախույզ. {target}-ը գնացել է {dest}-ի մոտ։', trackNone: 'Հետախույզ. {target}-ը ոչ մի տեղ չի գնացել։',
  quietHypno: 'Հիպնոսացնող. {target}-ի ձայնը վաղը կգնա {to}-ին։',
  causeFire: 'Հրձիգի կրակ', causeAvenge: 'Վրիժառուի պատասխան հարված', causeSnipe: 'Դիպուկահարի գնդակը վերադարձավ',
  rememberLog: 'Հիշողությունը կորցրած {player}-ը հիշեց. այժմ նա {role} է։', contractAssigned: 'Պայմանագրային {player}. թիրախը՝ {target}։', contractWon: 'Պայմանագրային {player}-ը հաղթեց. թիրախ {target}-ը վռնդվեց։',
  lawyerLog: 'Փաստաբան {player}-ը պաշտպանություն հայտարարեց. {target}-ի վռնդումը չեղարկված է։', survivorWon: 'Վերապրած {player}-ն ապրեց մինչև վերջ և հաղթում է։'
});
Object.assign(I18N.hy.ui, {
  shop: 'Խանութ', shopD: 'Պրեմիում քարտեր՝ 2 $, սցենարներ՝ 9,99 $', premium: 'Պրեմիում', buy: 'Գնել {price}', owned: 'Գնված է', locked: 'Գնված չէ', priceCard: '2 $', priceScen: '9,99 $',
  buyTitle: 'Գնում', buyDemo: 'Գնել {price}-ով', buyNote: 'Վճարում Telegram Stars-ով։ Գնումը կապվում է ձեր Telegram հաշվին և հասանելի է ձեր բոլոր սարքերում։', bought: 'Գնված է. {name}',
  shopCards: 'Ընդլայնման քարտեր', shopScen: 'Պրեմիում սցենարներ', scenRoles: 'Հատուկ դերեր. {list}', scenPlayers: '{a}–{b} խաղացող', useScen: 'Ստեղծել խաղ', scenActive: 'Սցենար. {name}',
  lockedInComp: 'Կազմում կան չգնված քարտեր. {list}', lawyerBtn: 'Փաստաբան {seat}-ը պաշտպանություն է հայտարարում', contractInfo: 'Պայմանագրային {seat}-ի թիրախը. խաղացող {target}', extraWinners: 'Նաև հաղթեցին. {list}',
  modGunsmith: 'Զինագործը կրակում է ամեն գիշեր', modTwoFam: 'Երկու ընտանիք {n} խաղացողից', modNoReveal: 'Դուրս եկածների քարտերը չեն բացվում', scenStd: 'Ստանդարտ սեղաններ', tiltHint: 'Թեքե՛ք հեռախոսը կամ սահեցրե՛ք քարտի վրայով'
});
I18N.hy.scenarios = {
  arson_night: { name: 'Հրձիգի գիշեր', lore: 'Աղի առափնյա պահեստներն այրվում են ամեն գիշեր։ Հրձիգն ընդդեմ Բանտապահի և Հետախույզի։' },
  court: { name: 'Կաստելմարի դատարան', lore: 'Փաստաբանն ու Դատավորը վիճում են յուրաքանչյուր գլխի համար, իսկ Պայմանագրայինը սպասում է դատավճռին։' },
  hypnosis: { name: 'Հիպնոս', lore: 'Քաղաքի ձայները քաղաքինը չեն։ Հետախույզը փնտրում է նրան, ով քաշում է թելերը։' },
  silent_killers: { name: 'Լուռ մարդասպաններ', lore: 'Դիպուկահար, Դիվերսանտ և Վրիժառու։ Ամեն կրակոց կարող է վերջինը լինել՝ կրակողի համար։' },
  masquerade: { name: 'Դիմակների կառնավալ', lore: 'Վհուկ, Հիշողությունը կորցրած և Ծաղրածու. սեղանի շուրջ ոչ ոք այն չէ, ինչ թվում է։' },
  clan_war: { name: 'Կլանների պատերազմ', lore: 'Երկու ընտանիք արդեն 14 խաղացողից, և յուրաքանչյուրն իր Փաստաբանով։' },
  survival: { name: 'Գոյատևում', lore: 'Զինագործը կրակում է ամեն գիշեր։ Հաղթում է նա, ով կապրի։' },
  chaos: { name: 'Լիակատար քաոս', lore: 'Ընդլայնման բոլոր տասներկու քարտերը մեկ սեղանի շուրջ։' }
};
Object.assign(I18N.ru.abilities, { douse: 'бензин', ignite: 'поджог', hypno: 'гипноз', block: 'блок', snipe: 'выстрел Снайпера', track: 'слежка', jail: 'камера', control: 'перенаправление', remember: 'память' });
Object.assign(I18N.uk.abilities, { douse: 'бензин', ignite: 'підпал', hypno: 'гіпноз', block: 'блок', snipe: 'постріл Снайпера', track: 'стеження', jail: 'камера', control: 'перенаправлення', remember: 'пам\'ять' });
Object.assign(I18N.en.abilities, { douse: 'douse', ignite: 'ignite', hypno: 'hypnosis', block: 'block', snipe: 'Sniper\'s shot', track: 'tracking', jail: 'jail', control: 'redirect', remember: 'memory' });
Object.assign(I18N.pl.abilities, { douse: 'benzyna', ignite: 'podpalenie', hypno: 'hipnoza', block: 'blokada', snipe: 'strzał Snajpera', track: 'śledzenie', jail: 'cela', control: 'przekierowanie', remember: 'pamięć' });
Object.assign(I18N.hy.abilities, { douse: 'բենզին', ignite: 'հրդեհում', hypno: 'հիպնոս', block: 'արգելափակում', snipe: 'Դիպուկահարի կրակոց', track: 'հետևում', jail: 'խուց', control: 'ուղղորդում', remember: 'հիշողություն' });
