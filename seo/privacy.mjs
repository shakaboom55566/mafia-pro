/* Privacy policy of Mafia Pro (v44) in five languages — the pages <lang>/privacy/ of the website (seo/build-site.mjs).
   Every statement here must stay true to the code: what backend/src stores, backend/src/privacy.js (/mydata, /deletedata,
   /unsubscribe, /support) and backend/src/security.js (IP hashes, 30 / 14 / 90 days). Change the code → change this text.
   Paragraphs use the site's markdown: **bold**, [text](https://link). */
export const UPDATED = { ru: '16 октября 2026 г.', uk: '16 жовтня 2026 р.', en: '16 October 2026', pl: '16 października 2026 r.', hy: '2026 թ. հոկտեմբերի 16' };

export const PRIVACY = {
  ru: {
    label: 'Политика конфиденциальности',
    title: 'Политика конфиденциальности Mafia Pro',
    desc: 'Какие данные собирает Mafia Pro — бот, приложение и сайт для игры в мафию, — зачем, кто их видит, сколько хранятся и как получить или удалить свои данные.',
    h1: 'Политика конфиденциальности',
    lead: 'Коротко: мы храним только то, что нужно для игры, не продаём данные и не показываем рекламу в игре. Свои данные можно получить файлом командой /mydata и удалить командой /deletedata в боте.',
    updatedLabel: 'Действует с',
    sections: [
      { h: '1. Кто мы', p: ['Mafia Pro — это Telegram-бот [@mafiaprof_bot](https://t.me/mafiaprof_bot), мини-приложение в Telegram, сайт [mafiapro.app](https://mafiapro.app/), канал [@mafiaprof](https://t.me/mafiaprof) и сервер Discord «Mafia Pro» для игры в мафию за столом и онлайн. Оператор данных — команда проекта Mafia Pro (далее — «мы»).', 'Связаться с нами по любому вопросу о данных: команда **/support** с текстом в боте [@mafiaprof_bot](https://t.me/mafiaprof_bot). Отвечаем там же, в течение 30 дней, обычно быстрее.'] },
      { h: '2. Какие данные мы собираем', p: ['**Данные Telegram.** Когда вы пишете боту или открываете приложение, Telegram передаёт нам ваш Telegram id, имя и фамилию, @ник, язык интерфейса и ссылку на фото профиля. Номер телефона, контакты и переписку Telegram нам не передаёт.'], ul: [
        '**Игра:** столы, которые вы открываете или за которые садитесь, место, роль, ходы и ответы в онлайн-партии, сообщения в чате стола, итоги партий, очки, рейтинг, ранг, лучший рейтинг и итог каждого сезона, статистика и серии побед, имя, под которым вы играли.',
        '**Друзья и клубы:** список друзей и заявки, ваш код приглашения и кого вы пригласили, клубы (название, город, описание, ссылка, логотип), членство и сообщения в чате клуба, заявка партнёра (имя, канал, аудитория).',
        '**Профиль:** город, если вы укажете его в профиле приложения.',
        '**Покупки:** что куплено за Telegram Stars, сумма, номер платежа Telegram. Данных карты мы не получаем — оплату проводит Telegram.',
        '**Изумруды и турниры:** баланс игровой валюты (изумруды) и история его изменений (покупка пака, приз турнира, покупка скина), участие в еженедельных турнирах — роль, стол, очки, место и приз.',
        '**Скины карт:** какие скины у вас есть (награды сезонов) и какой скин вы надели на какую карту, а у номерных скинов — номер вашего экземпляра; скин и номер видят игроки за вашим столом и в вашем профиле.',
        '**Откуда вы пришли:** метка ссылки, по которой вы впервые открыли бота (пост в канале, реклама, сайт, Discord, Instagram, Facebook, TikTok, приглашение), и время первого входа.',
        '**Реклама в Instagram и Facebook:** если вы пришли по нашей рекламе, страница [mafiapro.app/uk/dnipro/](https://mafiapro.app/uk/dnipro/) запоминает метку перехода Meta (fbclid), cookie пикселя Meta, IP-адрес и браузер. Если вы откроете с неё бота, мы свяжем переход с вашим Telegram id — так мы считаем, сколько игроков привела реклама. IP, браузер и метки Meta стираются через 7 дней.',
        '**Discord** (если вы на нашем сервере): id, имя пользователя и отображаемое имя, когда вошли и вышли, по какому приглашению пришли; привязка к Telegram — только если вы сами связали аккаунты командой /link или личным приглашением из приложения.',
        '**Безопасность:** ваш IP-адрес обрабатывает Cloudflare, чтобы доставлять запросы. Мы не храним IP-адрес — только его необратимый хэш с «солью», и только вместе с событиями безопасности (поддельные запросы, флуд, блокировки): тип события, страна, раздел, время. А также счётчики запросов без привязки к людям.',
        '**На вашем устройстве:** приложение хранит в памяти браузера настройки, локальные профили игроков (имена и аватары, которые вы добавили) и текущую партию. Это остаётся на устройстве; на сервер уходит только перечисленное выше (например, итог партии, который отправляет ведущий).'
      ], after: ['Мы **не собираем** номер телефона, e-mail, геолокацию и данные карт. Пиксель Meta есть только на рекламной странице mafiapro.app/uk/dnipro/; в боте, приложении и на остальном сайте рекламных и аналитических трекеров третьих сторон нет.'] },
      { h: '3. Зачем мы используем данные', ul: [
        '**Чтобы работала игра** (исполнение договора — правил пользования сервисом): вход, столы и раздача карт, онлайн-партии, чаты, рейтинг, друзья, клубы, уведомления о вашей игре.',
        '**Покупки** (договор и обязанность вести учёт): выдать купленное, вернуть платёж при необходимости.',
        '**Безопасность и честная игра** (законный интерес): отражать атаки и флуд, блокировать злоупотребления, не давать накручивать рейтинг.',
        '**Развитие сервиса** (законный интерес): понимать, какие каналы и посты приводят игроков, — в сводных цифрах.',
        '**Измерение рекламы** (законный интерес): сообщаем Meta, что человек, пришедший по рекламе, впервые открыл бота, — чтобы реклама показывалась тем, кому игра интересна, и бюджет не уходил впустую. Meta получает хэш Telegram id (без имени и самого id), метки перехода, IP и браузер.',
        '**Новости в боте** (законный интерес): изредка рассылаем новости и приглашения. Отказаться — команда /unsubscribe, вернуть — /subscribe.',
        '**Discord** (ваше действие): выдача языковых ролей, роль ранга по рейтингу (если вы привязали Telegram), карточки столов и итогов, /stats.'
      ] },
      { h: '4. Кто видит ваши данные', ul: [
        '**Другие игроки:** ваше имя, @ник, фото, рейтинг и статистику, онлайн ли вы, ваш клуб; за столом — то, что показывает игра; сообщения в чате стола и клуба. В общем рейтинге видны имя, @ник, фото и очки. Вас можно найти по @нику или имени в поиске игроков.',
        '**Discord:** карточки онлайн-столов с именем ведущего и итоги партий с именами игроков и ролями в каналах сервера; /stats показывает вашу статистику, если Discord привязан.',
        '**Администраторы Mafia Pro:** для поддержки, модерации, выплат партнёрам и отчётов о притоке игроков.',
        '**Обработчики, без которых сервис не работает:** Telegram (мессенджер и платежи), Cloudflare (хостинг, база данных, защита сети), Discord (если вы им пользуетесь), Google Fonts (шрифты сайта и приложения получают ваш IP при загрузке). GitHub хранит код и старый адрес сайта, данных игроков там нет.',
        'Мы **не продаём** данные. Meta (Instagram и Facebook) получает данные только о тех, кто пришёл по нашей рекламе: пиксель на рекламной странице и событие «впервые открыл бота» (раздел 3). Органам власти — только когда этого требует закон.'
      ] },
      { h: '5. Сколько мы храним', ul: [
        'Аккаунт и игровые данные — пока вы пользуетесь сервисом. Удалить их можно в любой момент (раздел 6).',
        'События безопасности — 30 дней, счётчики запросов — 14 дней, блокировки — до 90 дней.',
        'Переходы по рекламе: IP, браузер и метки Meta — 7 дней; сама запись о переходе — до 180 дней.',
        'Записи об оплатах — столько, сколько требует закон о бухгалтерском учёте.',
        'Данные на устройстве — пока вы их не очистите (настройки браузера или Telegram).'
      ] },
      { h: '6. Ваши права', p: ['Всё делается в боте [@mafiaprof_bot](https://t.me/mafiaprof_bot):'], ul: [
        '**/mydata** — файл со всеми данными о вас (раз в час).',
        '**/deletedata** — удалить ваши данные. Удаляются профиль, рейтинг и статистика, друзья, членство в клубах и сообщения, места и чат за столами, приглашения, источник прихода, привязка Discord, настройки. В итогах прошлых партий ваше место остаётся как «Игрок» без Telegram id. Записи об оплатах сохраняются для учёта, купленное и выданный доступ после удаления пропадают.',
        '**Исправление:** имя, @ник и фото обновляются из Telegram сами; город меняется в профиле приложения.',
        '**/unsubscribe** — не получать рассылки; **/subscribe** — вернуть.',
        '**Возражение, ограничение обработки, другие вопросы** — **/support** с текстом.',
        '**Жалоба в надзорный орган:** в Украине — Уполномоченный Верховной Рады по правам человека; в Польше — Prezes UODO; в других странах ЕС — местный орган по защите данных; в Армении — Агентство по защите персональных данных Министерства юстиции.'
      ] },
      { h: '7. Как мы защищаем данные', ul: [
        'Всё соединение — только по HTTPS; каждый запрос приложения проверяется по подписи Telegram, подделать вход за другого игрока нельзя.',
        'Бот принимает обновления только с серверов Telegram и только с секретным ключом.',
        'Лимиты запросов и автоматическая блокировка источников флуда; защита сети Cloudflare от DDoS.',
        'Круглосуточный контроль: подозрительные события сразу приходят администраторам, опасные действия админ-аккаунта можно заблокировать, а снять блокировку — только через отдельный защищённый канал.',
        'Ключи и пароли не хранятся в коде; IP-адреса — только в виде хэша.',
        'Если утечка затронет ваши данные, мы сообщим вам через бота и, где это требует закон, надзорному органу в течение 72 часов.'
      ] },
      { h: '8. Передача за границу', p: ['Telegram и Cloudflare обрабатывают данные на серверах в разных странах, в том числе за пределами Украины и ЕС. Cloudflare применяет стандартные договорные условия ЕС и другие гарантии защиты данных.'] },
      { h: '9. Дети', p: ['Сервис рассчитан на пользователей от 16 лет. Если вам меньше, пользуйтесь им с согласия родителей. Если мы узнаем, что данные ребёнка младше 13 лет попали к нам без такого согласия, мы их удалим.'] },
      { h: '10. Cookies и память браузера', p: ['Приложение, бот и сайт не ставят рекламных и аналитических cookies — кроме рекламной страницы mafiapro.app/uk/dnipro/: на ней пиксель Meta ставит cookie _fbp (до 90 дней), по которой Meta понимает, что вы пришли по рекламе. Память браузера (localStorage) используется только для работы приложения. Cloudflare может ставить технические cookies защиты от ботов.'] },
      { h: '11. Изменения', p: ['Если мы изменим политику, новая версия появится на этой странице с новой датой; о важных изменениях расскажем в боте или канале [@mafiaprof](https://t.me/mafiaprof).'] }
    ]
  },
  uk: {
    label: 'Політика конфіденційності',
    title: 'Політика конфіденційності Mafia Pro',
    desc: 'Які дані збирає Mafia Pro — бот, застосунок і сайт для гри в мафію, — навіщо, хто їх бачить, скільки зберігаються і як отримати чи видалити свої дані.',
    h1: 'Політика конфіденційності',
    lead: 'Коротко: ми зберігаємо лише те, що потрібно для гри, не продаємо дані й не показуємо рекламу в грі. Свої дані можна отримати файлом командою /mydata і видалити командою /deletedata у боті.',
    updatedLabel: 'Чинна з',
    sections: [
      { h: '1. Хто ми', p: ['Mafia Pro — це Telegram-бот [@mafiaprof_bot](https://t.me/mafiaprof_bot), міні-застосунок у Telegram, сайт [mafiapro.app](https://mafiapro.app/), канал [@mafiaprof](https://t.me/mafiaprof) і сервер Discord «Mafia Pro» для гри в мафію за столом і онлайн. Оператор даних — команда проєкту Mafia Pro (далі — «ми»).', 'Зв’язатися з нами з будь-якого питання про дані: команда **/support** з текстом у боті [@mafiaprof_bot](https://t.me/mafiaprof_bot). Відповідаємо там само, протягом 30 днів, зазвичай швидше.'] },
      { h: '2. Які дані ми збираємо', p: ['**Дані Telegram.** Коли ви пишете боту або відкриваєте застосунок, Telegram передає нам ваш Telegram id, ім’я та прізвище, @нік, мову інтерфейсу й посилання на фото профілю. Номер телефону, контакти й листування Telegram нам не передає.'], ul: [
        '**Гра:** столи, які ви відкриваєте або за які сідаєте, місце, роль, ходи й відповіді в онлайн-партії, повідомлення в чаті столу, підсумки партій, очки, рейтинг, ранг, найкращий рейтинг і підсумок кожного сезону, статистика й серії перемог, ім’я, під яким ви грали.',
        '**Друзі й клуби:** список друзів і заявки, ваш код запрошення і кого ви запросили, клуби (назва, місто, опис, посилання, логотип), членство й повідомлення в чаті клубу, заявка партнера (ім’я, канал, аудиторія).',
        '**Профіль:** місто, якщо ви вкажете його в профілі застосунку.',
        '**Покупки:** що придбано за Telegram Stars, сума, номер платежу Telegram. Даних картки ми не отримуємо — оплату проводить Telegram.',
        '**Смарагди і турніри:** баланс ігрової валюти (смарагди) та історія його змін (покупка паку, приз турніру, покупка скіна), участь у щотижневих турнірах — роль, стіл, очки, місце і приз.',
        '**Скіни карт:** які скіни у вас є (нагороди сезонів) і який скін ви вдягли на яку карту, а в номерних скінів — номер вашого примірника; скін і номер бачать гравці за вашим столом і у вашому профілі.',
        '**Звідки ви прийшли:** мітка посилання, за яким ви вперше відкрили бота (пост у каналі, реклама, сайт, Discord, Instagram, Facebook, TikTok, запрошення), і час першого входу.',
        '**Реклама в Instagram і Facebook:** якщо ви прийшли за нашою рекламою, сторінка [mafiapro.app/uk/dnipro/](https://mafiapro.app/uk/dnipro/) запам’ятовує мітку переходу Meta (fbclid), cookie пікселя Meta, IP-адресу й браузер. Якщо ви відкриєте з неї бота, ми пов’яжемо перехід із вашим Telegram id — так ми рахуємо, скільки гравців привела реклама. IP, браузер і мітки Meta стираються через 7 днів.',
        '**Discord** (якщо ви на нашому сервері): id, ім’я користувача й відображуване ім’я, коли увійшли й вийшли, за яким запрошенням прийшли; прив’язка до Telegram — лише якщо ви самі пов’язали акаунти командою /link або особистим запрошенням із застосунку.',
        '**Безпека:** вашу IP-адресу обробляє Cloudflare, щоб доставляти запити. Ми не зберігаємо IP-адресу — лише її незворотний хеш із «сіллю», і тільки разом із подіями безпеки (підроблені запити, флуд, блокування): тип події, країна, розділ, час. А також лічильники запитів без прив’язки до людей.',
        '**На вашому пристрої:** застосунок зберігає в пам’яті браузера налаштування, локальні профілі гравців (імена й аватари, які ви додали) і поточну партію. Це залишається на пристрої; на сервер іде лише перелічене вище (наприклад, підсумок партії, який надсилає ведучий).'
      ], after: ['Ми **не збираємо** номер телефону, e-mail, геолокацію й дані карток. Піксель Meta є лише на рекламній сторінці mafiapro.app/uk/dnipro/; у боті, застосунку й на решті сайту рекламних та аналітичних трекерів третіх сторін немає.'] },
      { h: '3. Навіщо ми використовуємо дані', ul: [
        '**Щоб працювала гра** (виконання договору — правил користування сервісом): вхід, столи й роздача карт, онлайн-партії, чати, рейтинг, друзі, клуби, сповіщення про вашу гру.',
        '**Покупки** (договір і обов’язок вести облік): видати придбане, повернути платіж за потреби.',
        '**Безпека й чесна гра** (законний інтерес): відбивати атаки й флуд, блокувати зловживання, не давати накручувати рейтинг.',
        '**Розвиток сервісу** (законний інтерес): розуміти, які канали й пости приводять гравців, — у зведених цифрах.',
        '**Вимірювання реклами** (законний інтерес): повідомляємо Meta, що людина, яка прийшла з реклами, уперше відкрила бота, — щоб реклама показувалася тим, кому гра цікава, і бюджет не витрачався даремно. Meta отримує хеш Telegram id (без імені й самого id), мітки переходу, IP і браузер.',
        '**Новини в боті** (законний інтерес): зрідка надсилаємо новини й запрошення. Відмовитися — команда /unsubscribe, повернути — /subscribe.',
        '**Discord** (ваша дія): мовні ролі, роль рангу за рейтингом (якщо ви прив’язали Telegram), картки столів і підсумків, /stats.'
      ] },
      { h: '4. Хто бачить ваші дані', ul: [
        '**Інші гравці:** ваше ім’я, @нік, фото, рейтинг і статистику, чи ви онлайн, ваш клуб; за столом — те, що показує гра; повідомлення в чаті столу й клубу. У загальному рейтингу видно ім’я, @нік, фото й очки. Вас можна знайти за @ніком або ім’ям у пошуку гравців.',
        '**Discord:** картки онлайн-столів з ім’ям ведучого й підсумки партій з іменами гравців і ролями в каналах сервера; /stats показує вашу статистику, якщо Discord прив’язано.',
        '**Адміністратори Mafia Pro:** для підтримки, модерації, виплат партнерам і звітів про приплив гравців.',
        '**Обробники, без яких сервіс не працює:** Telegram (месенджер і платежі), Cloudflare (хостинг, база даних, захист мережі), Discord (якщо ви ним користуєтеся), Google Fonts (шрифти сайту й застосунку отримують вашу IP під час завантаження). GitHub зберігає код і стару адресу сайту, даних гравців там немає.',
        'Ми **не продаємо** дані. Meta (Instagram і Facebook) отримує дані лише про тих, хто прийшов з нашої реклами: піксель на рекламній сторінці й подію «уперше відкрив бота» (розділ 3). Органам влади — лише коли цього вимагає закон.'
      ] },
      { h: '5. Скільки ми зберігаємо', ul: [
        'Акаунт та ігрові дані — поки ви користуєтеся сервісом. Видалити їх можна будь-коли (розділ 6).',
        'Події безпеки — 30 днів, лічильники запитів — 14 днів, блокування — до 90 днів.',
        'Переходи з реклами: IP, браузер і мітки Meta — 7 днів; сам запис про перехід — до 180 днів.',
        'Записи про оплати — стільки, скільки вимагає закон про бухгалтерський облік.',
        'Дані на пристрої — доки ви їх не очистите (налаштування браузера або Telegram).'
      ] },
      { h: '6. Ваші права', p: ['Усе робиться в боті [@mafiaprof_bot](https://t.me/mafiaprof_bot):'], ul: [
        '**/mydata** — файл з усіма даними про вас (раз на годину).',
        '**/deletedata** — видалити ваші дані. Видаляються профіль, рейтинг і статистика, друзі, членство в клубах і повідомлення, місця й чат за столами, запрошення, джерело приходу, прив’язка Discord, налаштування. У підсумках минулих партій ваше місце залишається як «Гравець» без Telegram id. Записи про оплати зберігаються для обліку, придбане й наданий доступ після видалення зникають.',
        '**Виправлення:** ім’я, @нік і фото оновлюються з Telegram самі; місто змінюється в профілі застосунку.',
        '**/unsubscribe** — не отримувати розсилки; **/subscribe** — повернути.',
        '**Заперечення, обмеження обробки, інші питання** — **/support** з текстом.',
        '**Скарга до наглядового органу:** в Україні — Уповноважений Верховної Ради України з прав людини; у Польщі — Prezes UODO; в інших країнах ЄС — місцевий орган із захисту даних; у Вірменії — Агентство із захисту персональних даних Міністерства юстиції.'
      ] },
      { h: '7. Як ми захищаємо дані', ul: [
        'Усе з’єднання — лише через HTTPS; кожен запит застосунку перевіряється за підписом Telegram, підробити вхід за іншого гравця неможливо.',
        'Бот приймає оновлення лише із серверів Telegram і лише із секретним ключем.',
        'Ліміти запитів і автоматичне блокування джерел флуду; захист мережі Cloudflare від DDoS.',
        'Цілодобовий контроль: підозрілі події одразу надходять адміністраторам, небезпечні дії адмін-акаунта можна заблокувати, а зняти блокування — лише через окремий захищений канал.',
        'Ключі й паролі не зберігаються в коді; IP-адреси — лише у вигляді хешу.',
        'Якщо витік торкнеться ваших даних, ми повідомимо вас через бота й, де цього вимагає закон, наглядовий орган протягом 72 годин.'
      ] },
      { h: '8. Передавання за кордон', p: ['Telegram і Cloudflare обробляють дані на серверах у різних країнах, зокрема за межами України та ЄС. Cloudflare застосовує стандартні договірні умови ЄС та інші гарантії захисту даних.'] },
      { h: '9. Діти', p: ['Сервіс розрахований на користувачів від 16 років. Якщо вам менше, користуйтеся ним за згодою батьків. Якщо ми дізнаємося, що дані дитини, молодшої за 13 років, потрапили до нас без такої згоди, ми їх видалимо.'] },
      { h: '10. Cookies і пам’ять браузера', p: ['Застосунок, бот і сайт не встановлюють рекламних та аналітичних cookies — крім рекламної сторінки mafiapro.app/uk/dnipro/: на ній піксель Meta встановлює cookie _fbp (до 90 днів), за якою Meta розуміє, що ви прийшли з реклами. Пам’ять браузера (localStorage) використовується лише для роботи застосунку. Cloudflare може встановлювати технічні cookies захисту від ботів.'] },
      { h: '11. Зміни', p: ['Якщо ми змінимо політику, нова версія з’явиться на цій сторінці з новою датою; про важливі зміни розповімо в боті або каналі [@mafiaprof](https://t.me/mafiaprof).'] }
    ]
  },
  en: {
    label: 'Privacy policy',
    title: 'Mafia Pro privacy policy',
    desc: 'What data Mafia Pro — the bot, app and website for playing mafia — collects, why, who sees it, how long it is kept and how to get or delete your data.',
    h1: 'Privacy policy',
    lead: 'In short: we keep only what the game needs, we never sell data and show no ads in the game. You can get your data as a file with /mydata and delete it with /deletedata in the bot.',
    updatedLabel: 'Effective from',
    sections: [
      { h: '1. Who we are', p: ['Mafia Pro is the Telegram bot [@mafiaprof_bot](https://t.me/mafiaprof_bot), the Telegram mini app, the website [mafiapro.app](https://mafiapro.app/), the channel [@mafiaprof](https://t.me/mafiaprof) and the “Mafia Pro” Discord server for playing mafia at the table and online. The data controller is the Mafia Pro project team (“we”).', 'To contact us about your data: send **/support** with your message to the bot [@mafiaprof_bot](https://t.me/mafiaprof_bot). We reply there within 30 days, usually much sooner.'] },
      { h: '2. What data we collect', p: ['**Telegram data.** When you message the bot or open the app, Telegram gives us your Telegram id, first and last name, @username, interface language and a link to your profile photo. Telegram does not give us your phone number, contacts or chats.'], ul: [
        '**The game:** tables you open or join, your seat, role, moves and answers in online games, table chat messages, game results, points, rating, rank, the best rating and the final standing of each season, statistics and win streaks, the name you played under.',
        '**Friends and clubs:** your friends and friend requests, your invite code and whom you invited, clubs (name, city, description, link, logo), club memberships and club chat messages, partner applications (name, channel, audience).',
        '**Profile:** your city, if you add it to your profile in the app.',
        '**Purchases:** what you bought with Telegram Stars, the amount and the Telegram payment id. We never get card details — Telegram handles the payment.',
        '**Emeralds and tournaments:** the balance of the in-game currency (emeralds) and its history (pack purchases, tournament prizes, skin purchases), your part in the weekly tournaments — role, table, points, place and prize.',
        '**Card skins:** which skins you have (season rewards) and which skin you put on which card and, for numbered skins, the number of your copy; the players at your table and on your profile see the skin and the number.',
        '**Where you came from:** the tag of the link you first opened the bot with (a channel post, an ad, the website, Discord, Instagram, Facebook, TikTok, an invitation) and the time of your first visit.',
        '**Ads in Instagram and Facebook:** if you came through our ad, the page [mafiapro.app/uk/dnipro/](https://mafiapro.app/uk/dnipro/) keeps Meta’s click tag (fbclid), the Meta pixel cookie, your IP address and browser. If you open the bot from it, we link the click to your Telegram id — that is how we count how many players an ad brought. The IP, browser and Meta tags are erased after 7 days.',
        '**Discord** (if you are on our server): your id, username and display name, when you joined and left, which invitation brought you; a link to your Telegram account only if you connected them yourself with /link or a personal invitation from the app.',
        '**Security:** Cloudflare processes your IP address to deliver requests. We do not store IP addresses — only an irreversible salted hash, and only with security events (forged requests, floods, blocks): the event type, country, section and time. Plus request counters that are not linked to anyone.',
        '**On your device:** the app keeps settings, local player profiles (names and avatars you added) and the current game in browser storage. That stays on your device; only what is listed above reaches our server (for example, a game result sent by the host).'
      ], after: ['We **do not collect** phone numbers, e-mail addresses, location or card data. The Meta pixel is only on the ad page mafiapro.app/uk/dnipro/; the bot, the app and the rest of the website contain no third-party advertising or analytics trackers.'] },
      { h: '3. Why we use the data', ul: [
        '**To run the game** (performance of the contract — the terms of using the service): sign-in, tables and dealing cards, online games, chats, rating, friends, clubs, notifications about your game.',
        '**Purchases** (contract and accounting obligations): to deliver what you bought and refund a payment if needed.',
        '**Security and fair play** (legitimate interest): to fend off attacks and floods, block abuse and prevent rating manipulation.',
        '**Improving the service** (legitimate interest): to understand which channels and posts bring players — as aggregate numbers.',
        '**Measuring ads** (legitimate interest): we tell Meta that a person who came through an ad opened the bot for the first time, so ads are shown to people who like the game and the budget is not wasted. Meta receives a hash of the Telegram id (not your name or the id itself), the click tags, IP and browser.',
        '**News in the bot** (legitimate interest): we occasionally send news and invitations. To opt out — /unsubscribe; to opt back in — /subscribe.',
        '**Discord** (your action): language roles, the role of your rank by the rating (if you linked Telegram), table and result cards, /stats.'
      ] },
      { h: '4. Who sees your data', ul: [
        '**Other players:** your name, @username, photo, rating and statistics, whether you are online, your club; at a table — what the game shows; messages in table and club chats. The public leaderboard shows name, @username, photo and points. You can be found by @username or name in the player search.',
        '**Discord:** online table cards with the host’s name and game results with player names and roles in the server’s channels; /stats shows your statistics if your Discord is linked.',
        '**Mafia Pro administrators:** for support, moderation, partner payouts and reports on new players.',
        '**Processors the service cannot work without:** Telegram (messenger and payments), Cloudflare (hosting, database, network protection), Discord (if you use it), Google Fonts (the fonts of the website and app receive your IP when they load). GitHub hosts the code and the old website address; it holds no player data.',
        'We **never sell** data. Meta (Instagram and Facebook) receives data only about people who came through our ads: the pixel on the ad page and the event “opened the bot for the first time” (section 3). To authorities — only when the law requires it.'
      ] },
      { h: '5. How long we keep it', ul: [
        'Account and game data — while you use the service. You can delete them at any time (section 6).',
        'Security events — 30 days, request counters — 14 days, blocks — up to 90 days.',
        'Ad clicks: IP, browser and Meta tags — 7 days; the record of the click itself — up to 180 days.',
        'Payment records — as long as accounting law requires.',
        'Data on your device — until you clear it (browser or Telegram settings).'
      ] },
      { h: '6. Your rights', p: ['Everything is done in the bot [@mafiaprof_bot](https://t.me/mafiaprof_bot):'], ul: [
        '**/mydata** — a file with all the data we hold about you (once an hour).',
        '**/deletedata** — delete your data. We delete your profile, rating and statistics, friends, club memberships and messages, table seats and table chat, invitations, where you came from, your Discord link and settings. In past game results your seat stays as “Player” without a Telegram id. Payment records are kept for accounting; purchased items and granted access are gone after deletion.',
        '**Correction:** your name, @username and photo update from Telegram automatically; your city is changed in your profile in the app.',
        '**/unsubscribe** — no broadcast messages; **/subscribe** — turn them back on.',
        '**Objection, restriction of processing, other questions** — **/support** with your message.',
        '**Complaints to a supervisory authority:** in Ukraine — the Ukrainian Parliament Commissioner for Human Rights; in Poland — the President of UODO; elsewhere in the EU — your national data protection authority; in Armenia — the Personal Data Protection Agency of the Ministry of Justice.'
      ] },
      { h: '7. How we protect data', ul: [
        'HTTPS only; every request from the app is checked against Telegram’s signature, so nobody can sign in as another player.',
        'The bot accepts updates only from Telegram’s servers and only with a secret key.',
        'Request limits and automatic blocking of flood sources; Cloudflare’s network DDoS protection.',
        'Round-the-clock monitoring: suspicious events reach the administrators at once; dangerous admin actions can be locked, and the lock can only be lifted through a separate protected channel.',
        'Keys and passwords are never stored in the code; IP addresses only as hashes.',
        'If a breach affects your data, we will tell you through the bot and, where the law requires it, the supervisory authority within 72 hours.'
      ] },
      { h: '8. International transfers', p: ['Telegram and Cloudflare process data on servers in different countries, including outside Ukraine and the EU. Cloudflare uses the EU Standard Contractual Clauses and other data protection safeguards.'] },
      { h: '9. Children', p: ['The service is meant for people aged 16 and over. If you are younger, use it with your parents’ consent. If we learn that data of a child under 13 reached us without such consent, we will delete it.'] },
      { h: '10. Cookies and browser storage', p: ['The app, bot and website set no advertising or analytics cookies — except the ad page mafiapro.app/uk/dnipro/: there the Meta pixel sets the _fbp cookie (up to 90 days), which tells Meta you came through an ad. Browser storage (localStorage) is used only to make the app work. Cloudflare may set technical bot-protection cookies.'] },
      { h: '11. Changes', p: ['If we change this policy, the new version will appear on this page with a new date; we will announce important changes in the bot or the channel [@mafiaprof](https://t.me/mafiaprof).'] }
    ]
  },
  pl: {
    label: 'Polityka prywatności',
    title: 'Polityka prywatności Mafia Pro',
    desc: 'Jakie dane zbiera Mafia Pro — bot, aplikacja i strona do gry w mafię — w jakim celu, kto je widzi, jak długo są przechowywane i jak pobrać lub usunąć swoje dane.',
    h1: 'Polityka prywatności',
    lead: 'W skrócie: przechowujemy tylko to, czego potrzebuje gra, nie sprzedajemy danych i nie wyświetlamy reklam w grze. Swoje dane pobierzesz jako plik komendą /mydata, a usuniesz komendą /deletedata w bocie.',
    updatedLabel: 'Obowiązuje od',
    sections: [
      { h: '1. Kim jesteśmy', p: ['Mafia Pro to bot Telegram [@mafiaprof_bot](https://t.me/mafiaprof_bot), miniaplikacja w Telegramie, strona [mafiapro.app](https://mafiapro.app/), kanał [@mafiaprof](https://t.me/mafiaprof) i serwer Discord „Mafia Pro” do gry w mafię przy stole i online. Administratorem danych jest zespół projektu Mafia Pro („my”).', 'Kontakt w sprawie danych: wyślij **/support** z wiadomością do bota [@mafiaprof_bot](https://t.me/mafiaprof_bot). Odpowiadamy tam w ciągu 30 dni, zwykle znacznie szybciej.'] },
      { h: '2. Jakie dane zbieramy', p: ['**Dane z Telegrama.** Gdy piszesz do bota lub otwierasz aplikację, Telegram przekazuje nam Twój Telegram id, imię i nazwisko, @nazwę użytkownika, język interfejsu i link do zdjęcia profilowego. Telegram nie przekazuje nam numeru telefonu, kontaktów ani rozmów.'], ul: [
        '**Gra:** stoły, które otwierasz lub do których dołączasz, miejsce, rola, ruchy i odpowiedzi w grach online, wiadomości na czacie stołu, wyniki gier, punkty, ranking, ranga, najlepszy ranking i wynik każdego sezonu, statystyki i serie zwycięstw, imię, pod którym grałeś.',
        '**Znajomi i kluby:** lista znajomych i zaproszenia, Twój kod zaproszenia i kogo zaprosiłeś, kluby (nazwa, miasto, opis, link, logo), członkostwo i wiadomości na czacie klubu, zgłoszenie partnera (imię, kanał, odbiorcy).',
        '**Profil:** miasto, jeśli podasz je w profilu aplikacji.',
        '**Zakupy:** co kupiłeś za Telegram Stars, kwota i numer płatności Telegrama. Danych karty nie otrzymujemy — płatność obsługuje Telegram.',
        '**Szmaragdy i turnieje:** saldo waluty w grze (szmaragdy) i historia jego zmian (zakup pakietu, nagroda turniejowa, zakup skórki), udział w cotygodniowych turniejach — rola, stół, punkty, miejsce i nagroda.',
        '**Skórki kart:** jakie skórki masz (nagrody sezonów) i którą skórkę założyłeś na którą kartę, a przy skórkach numerowanych — numer twojego egzemplarza; skórkę i numer widzą gracze przy twoim stole i w twoim profilu.',
        '**Skąd przyszedłeś:** znacznik linku, przez który pierwszy raz otworzyłeś bota (post na kanale, reklama, strona, Discord, Instagram, Facebook, TikTok, zaproszenie), i czas pierwszej wizyty.',
        '**Reklama na Instagramie i Facebooku:** jeśli trafiłeś przez naszą reklamę, strona [mafiapro.app/uk/dnipro/](https://mafiapro.app/uk/dnipro/) zapamiętuje znacznik kliknięcia Meta (fbclid), plik cookie piksela Meta, adres IP i przeglądarkę. Jeśli otworzysz z niej bota, powiążemy kliknięcie z Twoim Telegram id — tak liczymy, ilu graczy przyprowadziła reklama. IP, przeglądarka i znaczniki Meta są usuwane po 7 dniach.',
        '**Discord** (jeśli jesteś na naszym serwerze): id, nazwa użytkownika i nazwa wyświetlana, kiedy dołączyłeś i wyszedłeś, przez jakie zaproszenie; powiązanie z Telegramem — tylko jeśli sam połączyłeś konta komendą /link lub osobistym zaproszeniem z aplikacji.',
        '**Bezpieczeństwo:** Twój adres IP przetwarza Cloudflare, aby dostarczać żądania. Nie przechowujemy adresów IP — tylko ich nieodwracalny skrót z „solą”, i tylko razem ze zdarzeniami bezpieczeństwa (sfałszowane żądania, flood, blokady): rodzaj zdarzenia, kraj, sekcja, czas. Do tego liczniki żądań niepowiązane z osobami.',
        '**Na Twoim urządzeniu:** aplikacja przechowuje w pamięci przeglądarki ustawienia, lokalne profile graczy (imiona i awatary, które dodałeś) i bieżącą grę. To zostaje na urządzeniu; na serwer trafia tylko to, co wymieniono wyżej (np. wynik gry wysłany przez prowadzącego).'
      ], after: ['**Nie zbieramy** numeru telefonu, e-maila, lokalizacji ani danych kart. Piksel Meta jest tylko na stronie reklamowej mafiapro.app/uk/dnipro/; w bocie, aplikacji i na pozostałej części strony nie ma reklamowych ani analitycznych trackerów podmiotów trzecich.'] },
      { h: '3. W jakim celu używamy danych', ul: [
        '**Działanie gry** (wykonanie umowy — zasad korzystania z serwisu): logowanie, stoły i rozdawanie kart, gry online, czaty, ranking, znajomi, kluby, powiadomienia o Twojej grze.',
        '**Zakupy** (umowa i obowiązki księgowe): wydanie zakupionych rzeczy, zwrot płatności w razie potrzeby.',
        '**Bezpieczeństwo i uczciwa gra** (prawnie uzasadniony interes): odpieranie ataków i floodu, blokowanie nadużyć, ochrona rankingu przed oszustwami.',
        '**Rozwój serwisu** (prawnie uzasadniony interes): zrozumienie, które kanały i posty przyprowadzają graczy — w zbiorczych liczbach.',
        '**Pomiar reklam** (prawnie uzasadniony interes): informujemy Meta, że osoba, która przyszła z reklamy, po raz pierwszy otworzyła bota — aby reklama trafiała do osób zainteresowanych grą, a budżet nie był marnowany. Meta otrzymuje hash Telegram id (bez imienia i samego id), znaczniki kliknięcia, IP i przeglądarkę.',
        '**Aktualności w bocie** (prawnie uzasadniony interes): od czasu do czasu wysyłamy nowości i zaproszenia. Rezygnacja — /unsubscribe, powrót — /subscribe.',
        '**Discord** (Twoje działanie): role językowe, rola rangi według rankingu (jeśli powiązałeś Telegram), karty stołów i wyników, /stats.'
      ] },
      { h: '4. Kto widzi Twoje dane', ul: [
        '**Inni gracze:** Twoje imię, @nazwę, zdjęcie, ranking i statystyki, czy jesteś online, Twój klub; przy stole — to, co pokazuje gra; wiadomości na czacie stołu i klubu. W rankingu ogólnym widać imię, @nazwę, zdjęcie i punkty. Można Cię znaleźć po @nazwie lub imieniu w wyszukiwarce graczy.',
        '**Discord:** karty stołów online z imieniem prowadzącego i wyniki gier z imionami graczy i rolami w kanałach serwera; /stats pokazuje Twoje statystyki, jeśli Discord jest powiązany.',
        '**Administratorzy Mafia Pro:** w celu wsparcia, moderacji, wypłat dla partnerów i raportów o nowych graczach.',
        '**Podmioty przetwarzające, bez których serwis nie działa:** Telegram (komunikator i płatności), Cloudflare (hosting, baza danych, ochrona sieci), Discord (jeśli z niego korzystasz), Google Fonts (czcionki strony i aplikacji otrzymują Twój IP przy ładowaniu). GitHub przechowuje kod i stary adres strony, nie ma tam danych graczy.',
        '**Nie sprzedajemy** danych. Meta (Instagram i Facebook) otrzymuje dane tylko o osobach, które przyszły z naszej reklamy: piksel na stronie reklamowej i zdarzenie „pierwsze otwarcie bota” (sekcja 3). Organom władzy — tylko gdy wymaga tego prawo.'
      ] },
      { h: '5. Jak długo przechowujemy dane', ul: [
        'Konto i dane gry — dopóki korzystasz z serwisu. Możesz je usunąć w każdej chwili (punkt 6).',
        'Zdarzenia bezpieczeństwa — 30 dni, liczniki żądań — 14 dni, blokady — do 90 dni.',
        'Kliknięcia reklam: IP, przeglądarka i znaczniki Meta — 7 dni; sam zapis o kliknięciu — do 180 dni.',
        'Zapisy płatności — tak długo, jak wymagają przepisy o rachunkowości.',
        'Dane na urządzeniu — dopóki ich nie wyczyścisz (ustawienia przeglądarki lub Telegrama).'
      ] },
      { h: '6. Twoje prawa', p: ['Wszystko robisz w bocie [@mafiaprof_bot](https://t.me/mafiaprof_bot):'], ul: [
        '**/mydata** — plik ze wszystkimi danymi o Tobie (raz na godzinę).',
        '**/deletedata** — usunięcie Twoich danych. Usuwamy profil, ranking i statystyki, znajomych, członkostwo w klubach i wiadomości, miejsca i czat przy stołach, zaproszenia, źródło wejścia, powiązanie z Discordem i ustawienia. W wynikach dawnych gier Twoje miejsce zostaje jako „Gracz” bez Telegram id. Zapisy płatności przechowujemy do celów księgowych; zakupione rzeczy i przyznany dostęp po usunięciu znikają.',
        '**Sprostowanie:** imię, @nazwa i zdjęcie aktualizują się z Telegrama automatycznie; miasto zmienisz w profilu aplikacji.',
        '**/unsubscribe** — bez wiadomości masowych; **/subscribe** — włącz ponownie.',
        '**Sprzeciw, ograniczenie przetwarzania, inne pytania** — **/support** z wiadomością.',
        '**Skarga do organu nadzorczego:** w Polsce — Prezes Urzędu Ochrony Danych Osobowych (UODO); w innych krajach UE — krajowy organ ochrony danych; w Ukrainie — Rzecznik Praw Człowieka Rady Najwyższej; w Armenii — Agencja Ochrony Danych Osobowych Ministerstwa Sprawiedliwości.'
      ] },
      { h: '7. Jak chronimy dane', ul: [
        'Tylko HTTPS; każde żądanie aplikacji jest sprawdzane podpisem Telegrama, więc nikt nie zaloguje się jako inny gracz.',
        'Bot przyjmuje aktualizacje tylko z serwerów Telegrama i tylko z tajnym kluczem.',
        'Limity żądań i automatyczne blokowanie źródeł floodu; ochrona sieci Cloudflare przed DDoS.',
        'Całodobowy nadzór: podejrzane zdarzenia od razu trafiają do administratorów, niebezpieczne działania konta administratora można zablokować, a blokadę zdjąć tylko przez osobny chroniony kanał.',
        'Klucze i hasła nie są przechowywane w kodzie; adresy IP — tylko jako skróty.',
        'Jeśli naruszenie dotknie Twoich danych, poinformujemy Cię przez bota oraz, gdy wymaga tego prawo, organ nadzorczy w ciągu 72 godzin.'
      ] },
      { h: '8. Przekazywanie poza kraj', p: ['Telegram i Cloudflare przetwarzają dane na serwerach w różnych krajach, także poza Ukrainą i UE. Cloudflare stosuje standardowe klauzule umowne UE i inne zabezpieczenia ochrony danych.'] },
      { h: '9. Dzieci', p: ['Serwis jest przeznaczony dla osób od 16 lat. Jeśli jesteś młodszy, korzystaj z niego za zgodą rodziców. Jeśli dowiemy się, że dane dziecka poniżej 13 lat trafiły do nas bez takiej zgody, usuniemy je.'] },
      { h: '10. Cookies i pamięć przeglądarki', p: ['Aplikacja, bot i strona nie ustawiają reklamowych ani analitycznych plików cookies — poza stroną reklamową mafiapro.app/uk/dnipro/: tam piksel Meta ustawia plik cookie _fbp (do 90 dni), dzięki któremu Meta wie, że przyszedłeś z reklamy. Pamięć przeglądarki (localStorage) służy wyłącznie do działania aplikacji. Cloudflare może ustawiać techniczne pliki cookies ochrony przed botami.'] },
      { h: '11. Zmiany', p: ['Jeśli zmienimy politykę, nowa wersja pojawi się na tej stronie z nową datą; o ważnych zmianach poinformujemy w bocie lub na kanale [@mafiaprof](https://t.me/mafiaprof).'] }
    ]
  },
  hy: {
    label: 'Գաղտնիության քաղաքականություն',
    title: 'Mafia Pro-ի գաղտնիության քաղաքականություն',
    desc: 'Ինչ տվյալներ է հավաքում Mafia Pro-ն՝ մաֆիա խաղալու բոտը, հավելվածը և կայքը, ինչ նպատակով, ով է տեսնում դրանք, որքան են պահվում և ինչպես ստանալ կամ ջնջել ձեր տվյալները։',
    h1: 'Գաղտնիության քաղաքականություն',
    lead: 'Կարճ՝ մենք պահում ենք միայն այն, ինչ պետք է խաղի համար, չենք վաճառում տվյալները և խաղում գովազդ չենք ցուցադրում։ Ձեր տվյալները կարող եք ստանալ ֆայլով՝ /mydata հրամանով, և ջնջել՝ /deletedata հրամանով բոտում։',
    updatedLabel: 'Գործում է',
    sections: [
      { h: '1. Ովքեր ենք մենք', p: ['Mafia Pro-ն Telegram-բոտ է՝ [@mafiaprof_bot](https://t.me/mafiaprof_bot), Telegram-ի մինի-հավելված, [mafiapro.app](https://mafiapro.app/) կայք, [@mafiaprof](https://t.me/mafiaprof) ալիք և «Mafia Pro» Discord սերվեր՝ սեղանի շուրջ և առցանց մաֆիա խաղալու համար։ Տվյալների օպերատորը Mafia Pro նախագծի թիմն է («մենք»)։', 'Տվյալների վերաբերյալ ցանկացած հարցով կապվեք մեզ հետ՝ բոտում [@mafiaprof_bot](https://t.me/mafiaprof_bot) ուղարկեք **/support** և ձեր տեքստը։ Պատասխանում ենք այնտեղ՝ 30 օրվա ընթացքում, սովորաբար ավելի արագ։'] },
      { h: '2. Ինչ տվյալներ ենք հավաքում', p: ['**Telegram-ի տվյալներ.** Երբ գրում եք բոտին կամ բացում եք հավելվածը, Telegram-ը մեզ է փոխանցում ձեր Telegram id-ն, անունն ու ազգանունը, @օգտանունը, ինտերֆեյսի լեզուն և պրոֆիլի լուսանկարի հղումը։ Հեռախոսահամարը, կոնտակտները և նամակագրությունը Telegram-ը մեզ չի փոխանցում։'], ul: [
        '**Խաղ.** սեղանները, որոնք բացում եք կամ որոնց շուրջ նստում եք, տեղը, դերը, քայլերն ու պատասխանները առցանց խաղում, սեղանի չաթի հաղորդագրությունները, խաղերի արդյունքները, միավորները, վարկանիշը, կոչումը, յուրաքանչյուր սեզոնի լավագույն վարկանիշն ու արդյունքը, վիճակագրությունը և հաղթանակների շարքերը, այն անունը, որով խաղացել եք։',
        '**Ընկերներ և ակումբներ.** ընկերների ցանկն ու հայտերը, ձեր հրավերի կոդը և ում եք հրավիրել, ակումբները (անուն, քաղաք, նկարագրություն, հղում, լոգո), անդամակցությունն ու ակումբի չաթի հաղորդագրությունները, գործընկերոջ հայտը (անուն, ալիք, լսարան)։',
        '**Պրոֆիլ.** քաղաքը, եթե այն նշեք հավելվածի պրոֆիլում։',
        '**Գնումներ.** ինչ եք գնել Telegram Stars-ով, գումարը և Telegram-ի վճարման համարը։ Քարտի տվյալներ մենք չենք ստանում. վճարումն իրականացնում է Telegram-ը։',
        '**Զմրուխտներ և մրցաշարեր.** խաղային արժույթի (զմրուխտների) հաշվեկշիռը և դրա փոփոխությունների պատմությունը (փաթեթի գնում, մրցաշարի մրցանակ, սքինի գնում), մասնակցությունը շաբաթական մրցաշարերին՝ դեր, սեղան, միավորներ, տեղ և մրցանակ։',
        '**Քարտերի սքիններ.** ինչ սքիններ ունեք (սեզոնների պարգևներ) և որ սքինն եք հագցրել որ քարտին, իսկ համարակալված սքինների դեպքում՝ ձեր օրինակի համարը․ սքինն ու համարը տեսնում են ձեր սեղանի խաղացողները և ձեր պրոֆիլում։',
        '**Որտեղից եք եկել.** այն հղման պիտակը, որով առաջին անգամ բացել եք բոտը (ալիքի գրառում, գովազդ, կայք, Discord, Instagram, Facebook, TikTok, հրավեր), և առաջին այցի ժամը։',
        '**Գովազդ Instagram-ում և Facebook-ում.** եթե եկել եք մեր գովազդով, [mafiapro.app/uk/dnipro/](https://mafiapro.app/uk/dnipro/) էջը պահում է Meta-ի անցման պիտակը (fbclid), Meta պիքսելի cookie-ն, IP հասցեն և դիտարկիչը։ Եթե այդ էջից բացեք բոտը, անցումը կկապենք ձեր Telegram id-ի հետ. այսպես ենք հաշվում, թե քանի խաղացող է բերել գովազդը։ IP-ն, դիտարկիչը և Meta-ի պիտակները ջնջվում են 7 օր հետո։',
        '**Discord** (եթե մեր սերվերում եք). id, օգտանուն և ցուցադրվող անուն, երբ եք մտել և դուրս եկել, որ հրավերով եք եկել. կապը Telegram-ի հետ՝ միայն եթե ինքներդ եք կապել հաշիվները /link հրամանով կամ հավելվածի անձնական հրավերով։',
        '**Անվտանգություն.** ձեր IP հասցեն մշակում է Cloudflare-ը՝ հարցումները հասցնելու համար։ Մենք IP հասցե չենք պահում՝ միայն դրա անշրջելի «աղով» հեշը, և միայն անվտանգության իրադարձությունների հետ (կեղծ հարցումներ, ֆլուդ, արգելափակումներ)՝ իրադարձության տեսակը, երկիրը, բաժինը, ժամը։ Ինչպես նաև հարցումների հաշվիչներ՝ առանց մարդկանց հետ կապի։',
        '**Ձեր սարքում.** հավելվածը դիտարկիչի հիշողության մեջ պահում է կարգավորումները, խաղացողների տեղային պրոֆիլները (ձեր ավելացրած անուններն ու ավատարները) և ընթացիկ խաղը։ Սա մնում է սարքում. սերվեր է գնում միայն վերը թվարկվածը (օրինակ՝ խաղի արդյունքը, որը ուղարկում է վարողը)։'
      ], after: ['Մենք **չենք հավաքում** հեռախոսահամար, էլ. փոստ, աշխարհագրական դիրք և քարտերի տվյալներ։ Meta պիքսելը կա միայն mafiapro.app/uk/dnipro/ գովազդային էջում. բոտում, հավելվածում և կայքի մնացած մասում չկան երրորդ կողմի գովազդային և վերլուծական թրեքերներ։'] },
      { h: '3. Ինչի համար ենք օգտագործում տվյալները', ul: [
        '**Որպեսզի խաղն աշխատի** (պայմանագրի կատարում՝ ծառայության օգտագործման կանոններ). մուտք, սեղաններ և քարտերի բաժանում, առցանց խաղեր, չաթեր, վարկանիշ, ընկերներ, ակումբներ, ծանուցումներ ձեր խաղի մասին։',
        '**Գնումներ** (պայմանագիր և հաշվառման պարտավորություն). տրամադրել գնվածը, անհրաժեշտության դեպքում վերադարձնել վճարումը։',
        '**Անվտանգություն և ազնիվ խաղ** (օրինական շահ). հետ մղել հարձակումներն ու ֆլուդը, արգելափակել չարաշահումները, թույլ չտալ վարկանիշի արհեստական բարձրացում։',
        '**Ծառայության զարգացում** (օրինական շահ). հասկանալ, թե որ ալիքներն ու գրառումներն են բերում խաղացողներ՝ ամփոփ թվերով։',
        '**Գովազդի չափում** (օրինական շահ). Meta-ին հայտնում ենք, որ գովազդով եկած մարդը առաջին անգամ բացել է բոտը, որպեսզի գովազդը ցուցադրվի նրանց, ում հետաքրքիր է խաղը, և բյուջեն չվատնվի։ Meta-ն ստանում է Telegram id-ի հեշը (առանց անվան և հենց id-ի), անցման պիտակները, IP-ն և դիտարկիչը։',
        '**Նորություններ բոտում** (օրինական շահ). երբեմն ուղարկում ենք նորություններ և հրավերներ։ Հրաժարվել՝ /unsubscribe, վերադարձնել՝ /subscribe։',
        '**Discord** (ձեր գործողությամբ). լեզվային դերեր, կոչման դեր՝ ըստ վարկանիշի (եթե կապել եք Telegram-ը), սեղանների և արդյունքների քարտեր, /stats։'
      ] },
      { h: '4. Ով է տեսնում ձեր տվյալները', ul: [
        '**Մյուս խաղացողները.** ձեր անունը, @օգտանունը, լուսանկարը, վարկանիշն ու վիճակագրությունը, առցանց լինելը, ձեր ակումբը. սեղանի շուրջ՝ այն, ինչ ցույց է տալիս խաղը. սեղանի և ակումբի չաթի հաղորդագրությունները։ Ընդհանուր վարկանիշում երևում են անունը, @օգտանունը, լուսանկարը և միավորները։ Ձեզ կարելի է գտնել @օգտանունով կամ անունով խաղացողների որոնման մեջ։',
        '**Discord.** առցանց սեղանների քարտերը՝ վարողի անունով, և խաղերի արդյունքները՝ խաղացողների անուններով և դերերով սերվերի ալիքներում. /stats-ը ցույց է տալիս ձեր վիճակագրությունը, եթե Discord-ը կապված է։',
        '**Mafia Pro-ի ադմինիստրատորները.** աջակցության, մոդերացիայի, գործընկերներին վճարումների և նոր խաղացողների մասին հաշվետվությունների համար։',
        '**Մշակողներ, առանց որոնց ծառայությունը չի աշխատում.** Telegram (մեսենջեր և վճարումներ), Cloudflare (հոսթինգ, տվյալների բազա, ցանցի պաշտպանություն), Discord (եթե օգտվում եք), Google Fonts (կայքի և հավելվածի տառատեսակները բեռնման ժամանակ ստանում են ձեր IP-ն)։ GitHub-ը պահում է կոդը և կայքի հին հասցեն, այնտեղ խաղացողների տվյալներ չկան։',
        'Մենք **չենք վաճառում** տվյալները։ Meta-ն (Instagram և Facebook) տվյալներ է ստանում միայն մեր գովազդով եկածների մասին. պիքսելը գովազդային էջում և «առաջին անգամ բացել է բոտը» իրադարձությունը (բաժին 3)։ Իշխանության մարմիններին՝ միայն երբ դա պահանջում է օրենքը։'
      ] },
      { h: '5. Որքան ենք պահում', ul: [
        'Հաշիվը և խաղային տվյալները՝ քանի դեռ օգտվում եք ծառայությունից։ Կարող եք ջնջել դրանք ցանկացած պահի (բաժին 6)։',
        'Անվտանգության իրադարձությունները՝ 30 օր, հարցումների հաշվիչները՝ 14 օր, արգելափակումները՝ մինչև 90 օր։',
        'Գովազդային անցումներ. IP-ն, դիտարկիչը և Meta-ի պիտակները՝ 7 օր, անցման գրառումը՝ մինչև 180 օր։',
        'Վճարումների գրառումները՝ այնքան, որքան պահանջում է հաշվապահական հաշվառման օրենքը։',
        'Սարքի տվյալները՝ մինչև դուք չմաքրեք դրանք (դիտարկիչի կամ Telegram-ի կարգավորումներ)։'
      ] },
      { h: '6. Ձեր իրավունքները', p: ['Ամեն ինչ արվում է [@mafiaprof_bot](https://t.me/mafiaprof_bot) բոտում.'], ul: [
        '**/mydata** — ֆայլ ձեր մասին բոլոր տվյալներով (ժամը մեկ անգամ)։',
        '**/deletedata** — ջնջել ձեր տվյալները։ Ջնջվում են պրոֆիլը, վարկանիշն ու վիճակագրությունը, ընկերները, ակումբների անդամակցությունն ու հաղորդագրությունները, սեղանների տեղերն ու չաթը, հրավերները, թե որտեղից եք եկել, Discord-ի կապը, կարգավորումները։ Նախկին խաղերի արդյունքներում ձեր տեղը մնում է որպես «Խաղացող»՝ առանց Telegram id-ի։ Վճարումների գրառումները պահվում են հաշվառման համար. գնվածը և տրված հասանելիությունը ջնջումից հետո վերանում են։',
        '**Ուղղում.** անունը, @օգտանունը և լուսանկարը ինքնաբերաբար թարմացվում են Telegram-ից. քաղաքը փոխվում է հավելվածի պրոֆիլում։',
        '**/unsubscribe** — չստանալ զանգվածային հաղորդագրություններ. **/subscribe** — վերադարձնել։',
        '**Առարկություն, մշակման սահմանափակում, այլ հարցեր** — **/support** և ձեր տեքստը։',
        '**Բողոք վերահսկող մարմնին.** Հայաստանում՝ Արդարադատության նախարարության Անձնական տվյալների պաշտպանության գործակալություն. Ուկրաինայում՝ Գերագույն Ռադայի մարդու իրավունքների հանձնակատար. Լեհաստանում՝ Prezes UODO. ԵՄ այլ երկրներում՝ տվյալների պաշտպանության ազգային մարմինը։'
      ] },
      { h: '7. Ինչպես ենք պաշտպանում տվյալները', ul: [
        'Միայն HTTPS. հավելվածի յուրաքանչյուր հարցում ստուգվում է Telegram-ի ստորագրությամբ, ուրիշ խաղացողի անունից մուտք գործել հնարավոր չէ։',
        'Բոտն ընդունում է թարմացումներ միայն Telegram-ի սերվերներից և միայն գաղտնի բանալիով։',
        'Հարցումների սահմանաչափեր և ֆլուդի աղբյուրների ավտոմատ արգելափակում. Cloudflare-ի ցանցային պաշտպանություն DDoS-ից։',
        'Շուրջօրյա վերահսկողություն. կասկածելի իրադարձությունները անմիջապես հասնում են ադմինիստրատորներին, ադմին-հաշվի վտանգավոր գործողությունները կարելի է արգելափակել, իսկ արգելափակումը հանել՝ միայն առանձին պաշտպանված ալիքով։',
        'Բանալիներն ու գաղտնաբառերը կոդում չեն պահվում. IP հասցեները՝ միայն հեշի տեսքով։',
        'Եթե արտահոսքը վերաբերի ձեր տվյալներին, կտեղեկացնենք ձեզ բոտի միջոցով և, որտեղ դա պահանջում է օրենքը, վերահսկող մարմնին՝ 72 ժամվա ընթացքում։'
      ] },
      { h: '8. Փոխանցում արտերկիր', p: ['Telegram-ը և Cloudflare-ը մշակում են տվյալները տարբեր երկրների սերվերներում, այդ թվում՝ Հայաստանից, Ուկրաինայից և ԵՄ-ից դուրս։ Cloudflare-ը կիրառում է ԵՄ ստանդարտ պայմանագրային դրույթները և տվյալների պաշտպանության այլ երաշխիքներ։'] },
      { h: '9. Երեխաներ', p: ['Ծառայությունը նախատեսված է 16 տարեկանից բարձր օգտատերերի համար։ Եթե ավելի փոքր եք, օգտվեք ծնողների համաձայնությամբ։ Եթե իմանանք, որ 13 տարեկանից փոքր երեխայի տվյալները մեզ են հասել առանց նման համաձայնության, մենք դրանք կջնջենք։'] },
      { h: '10. Cookies և դիտարկիչի հիշողություն', p: ['Հավելվածը, բոտը և կայքը չեն տեղադրում գովազդային և վերլուծական cookies, բացի mafiapro.app/uk/dnipro/ գովազդային էջից. այնտեղ Meta պիքսելը տեղադրում է _fbp cookie (մինչև 90 օր), որով Meta-ն իմանում է, որ եկել եք գովազդով։ Դիտարկիչի հիշողությունը (localStorage) օգտագործվում է միայն հավելվածի աշխատանքի համար։ Cloudflare-ը կարող է տեղադրել բոտերից պաշտպանության տեխնիկական cookies։'] },
      { h: '11. Փոփոխություններ', p: ['Եթե փոխենք քաղաքականությունը, նոր տարբերակը կհայտնվի այս էջում՝ նոր ամսաթվով. կարևոր փոփոխությունների մասին կպատմենք բոտում կամ [@mafiaprof](https://t.me/mafiaprof) ալիքում։'] }
    ]
  }
};
