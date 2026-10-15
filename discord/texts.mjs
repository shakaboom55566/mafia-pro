/* Texts of the Mafia Pro Discord server in the five languages of the app (v34).
   Every language has its own library and game channels, seen only by members with that language role.
   Card / scenario / rule data comes from the app itself (loadApp(lang)); here are the server's own words.
   ch(key) → a link to that language's channel, bot → the Telegram bot's @username (or ''). */

const plRu = (n, a, b, c) => { const d = n % 10, h = n % 100; return d === 1 && h !== 11 ? a : d >= 2 && d <= 4 && (h < 12 || h > 14) ? b : c; };
const plPl = (n, a, b, c) => { if (n === 1) return a; const d = n % 10, h = n % 100; return d >= 2 && d <= 4 && (h < 12 || h > 14) ? b : c; };

export const LANG_ORDER = ['ru', 'uk', 'en', 'pl', 'hy'];

/* Mafia Pro on social media (15.10.2026): the 🔗 channel of every language shows a card per link, in this order.
   An empty link hides its card — put the TikTok profile here once the account exists and it appears in all five languages.
   The site and the Telegram app links are added by setup.mjs (the site in the channel's language, the bot with start=dc). */
export const SOCIALS = {
  channel: 'https://t.me/mafiaprof',
  chat: 'https://t.me/+3kRZICcUMyBjZDdi',
  instagram: 'https://www.instagram.com/mafiaproapp/',
  facebook: 'https://www.facebook.com/1385178954679198',
  tiktok: ''
};

export const T = {
  ru: {
    code: 'RU', name: 'Русский', emoji: '',
    cat: { lib: '📚 БИБЛИОТЕКА · RU', game: '🎲 ИГРА · RU' }, catPrev: { lib: ['📚 БИБЛИОТЕКА'], game: ['🎲 ИГРА'] },
    ch: {
      rules: ['📜・правила-сервера', 'Правила сервера'], howto: ['📱・как-играть', 'С чего начать и как устроено приложение Mafia Pro'],
      socials: ['🔗・наши-соцсети', 'Все соцсети и ссылки Mafia Pro в одном месте'],
      cardsMafia: ['🖤・карты-мафии', 'Все карты мафии: способности, порядок, советы'], cardsCity: ['❤️・карты-города', 'Все карты мирного города'], cardsNeutral: ['🤍・нейтралы', 'Нейтралы и Оборотень'],
      scenarios: ['📚・сценарии', 'Бесплатные составы, премиум-сценарии и пак'], gameRules: ['⚖️・правила-игры', 'Как идёт партия, классика, онлайн-формат, очки'],
      lfg: ['🔎・ищу-игру', 'Открытые онлайн-столы — бот публикует сам'], results: ['🏆・результаты', 'Итоги онлайн-партий'], chat: ['💬・общий-чат', 'Общение об игре и не только'], ideas: ['💡・идеи-и-баги', 'Предложения и ошибки приложения']
    },
    btnTg: '▶️ Играть в Telegram', btnWeb: '🌐 Веб-версия',
    team: 'Команда', checks: 'Для проверок', access: 'Доступ', free: 'бесплатно', premium: s => `💎 премиум · ${s} ⭐`, pack: (p, s) => `📦 пак «${p}» · ${s} ⭐`,
    cardsNote: (p, s) => `Бесплатные карты идут первыми, затем 💎 премиум (${s} ⭐ за карту) и 📦 карты пака «${p}». Купить — в магазине приложения Mafia Pro.`,
    intro: {
      mafia: ['🖤 Карты мафии', 'Семья мафии: знают друг друга, ночью выбирают жертву, днём прикрывают своих. Для проверок Шерифа — чёрные.'],
      city: ['❤️ Карты мирного города', 'Город не знает, кто есть кто: ищет мафию проверками, защитой и голосованием. Для проверок — красные.'],
      neutral: ['🤍 Нейтралы и Оборотень', 'Нейтралы играют за себя и побеждают по своим условиям. Оборотень раздаётся вместе с мафией, но считается за город.']
    },
    players: n => `${n} ${plRu(n, 'игрок', 'игрока', 'игроков')}`,
    classic: (name, n) => `🎯 ${name} · ${n} игроков · бесплатно`, comp: 'Состав', format: 'Формат', offline: 'за живым столом с ведущим (оффлайн)',
    roleGame: (range) => `🎭 Ролевая мафия · ${range} · бесплатно`,
    roleGameD: 'Сбалансированные составы под любое число игроков: приложение подбирает роли, их можно менять вручную. Играется оффлайн (ведущий раздаёт карты с телефона) и онлайн (каждый ходит со своего телефона, голос — в Discord).',
    special: 'Особые роли', count: 'Игроков', packTitle: (p, s) => `📦 Пак «${p}» · ${s} ⭐`, rolesF: 'Роли', scenariosF: 'Сценарии',
    scenIntro: ['📚 Сценарии и составы', 'Бесплатные режимы, премиум-сценарии и пак. Всё запускается в приложении: «Сценарии» на главном экране.'],
    howGame: ['🌗 Как идёт партия', [
      '**Команды.** Мафия (чёрные карты) знает друг друга и ночью убивает; мирный город (красные) ищет мафию днём; нейтралы играют сами за себя; Оборотень приходит к мафии, но считается за город.',
      '**Ночь.** Ведущий будит роли по порядку: семья мафии выбирает цель (Дон решает), затем просыпаются активные роли со своими способностями. Порядок указан в приложении у каждой карты.',
      '**День.** Утром ведущий объявляет итоги ночи. Дальше — речи по кругу, выставление кандидатов и голосование. Ничья → оправдательные речи → переголосование.',
      '**Победа.** Город — когда в игре не осталось мафии. Мафия — когда её не меньше, чем мирных. У нейтралов свои условия (написаны на карте).',
      '**Выбывшие** не разговаривают о партии до конца игры и не подсказывают живым.']],
    sport: 'спортивные правила',
    online: ['📱 Онлайн-формат', '**С Discord:** ведущий включает «Игра с Discord», бот создаёт голосовой канал стола на все места + ведущий в категории «🎧 Игровые столы». Игроки заходят по кнопке в приложении и жмут «Я на связи». Карты раздаются только после того, как ведущий подтвердит, что все на связи. После игры канал удаляется сам.'],
    openClosed: '👁 Открытая и закрытая игра',
    points: ['🏅 Очки и рейтинг', r => `После партии приложение начисляет очки: за победу своей команды и за полезные ходы (верные проверки, спасения, точные выстрелы), разбор показывает каждый ход. Рейтинг общий для всех столов Mafia Pro, лучшие игроки — в разделе «Рейтинг» и в ${r}.`],
    rulesTitle: '📜 Правила сервера', rulesFooter: 'Заходя на сервер, вы соглашаетесь с правилами.',
    rules: ch => [
      ['Уважение', 'Никаких оскорблений, травли, угроз и дискриминации. Спорим об игре, а не о людях.'],
      ['Честная игра', 'Не раскрывайте свою роль иначе, чем позволяет игра. Никаких подсказок через ЛС, другие чаты и звонки во время партии (метагейм). Не пересказывайте закрытые роли после выбывания.'],
      ['Выбывшие молчат', 'Выбыли — выключите микрофон до конца партии. Слушать можно, подсказывать — нет.'],
      ['Голосовой канал', 'Говорите в свою речь и не перебивайте. Шумный микрофон — на кнопку. Ведущий может заглушить игрока на время речи другого.'],
      ['Слово ведущего', `Во время партии решение ведущего окончательно. Спорные моменты — после игры, в ${ch('ideas')} или ведущему в личку.`],
      ['Ник', 'Ник в Discord должен совпадать с ником в Telegram-приложении (или быть понятным), чтобы ведущий и игроки вас узнавали.'],
      ['Без спама и рекламы', 'Реклама, ссылки на другие серверы и продажа чего-либо — только с разрешения администрации.'],
      ['Контент', 'Без NSFW, шок-контента и политических споров.'],
      ['Санкции', 'Предупреждение → мут → бан. При грубых нарушениях администрация действует сразу.'],
      ['Правила Discord', 'Действуют [Условия использования](https://discord.com/terms) и [Принципы сообщества Discord](https://discord.com/guidelines).']],
    start: {
      title: '🎩 Добро пожаловать в Mafia Pro', desc: 'Сервер для онлайн-мафии с голосом. Сама игра — в Telegram-приложении **Mafia Pro**: карты, ночные ходы, голосование и рейтинг. Здесь — голосовые каналы столов, библиотека карт и сценариев и итоги партий.',
      steps: ['С чего начать', (ch, bot) => [`1. Прочитайте ${ch('rules')}.`, `2. Откройте Mafia Pro в Telegram${bot ? ` — @${bot}` : ''} → «Играть».`, `3. «Поиск стола» → садитесь за онлайн-стол (столы на русском появляются и в ${ch('lfg')}).`, '4. Ведущий включил Discord — в приложении жмите «Войти в голосовой», затем «Я на связи».'].join('\n')],
      chans: ['Каналы', ch => [`${ch('cardsMafia')} ${ch('cardsCity')} ${ch('cardsNeutral')} — все карты ролей`, `${ch('scenarios')} — сценарии и составы`, `${ch('gameRules')} — правила игры`, `${ch('results')} — итоги партий`, `${ch('chat')} — общение`, `${ch('socials')} — наши соцсети`].join('\n')],
      langs: ['Языки', l => `Флаг у стола — язык ведущего: 🇺🇦 русский / украинский, 🇦🇲 армянский, 🇵🇱 польский, 🇬🇧 английский. Другие языки и роли 🎩 Ведущий / 🎲 Игрок — в ${l}.`]
    },
    howto: { title: '📱 Как играть в Mafia Pro', desc: bot => `Приложение открывается в Telegram${bot ? ` у бота @${bot}` : ''}. Есть два формата.`, fields: ch => [
      ['🃏 Оффлайн (живой стол)', 'Все сидят вместе, ведущий ведёт партию со своего телефона: раздаёт карты (или отправляет их в приложение игрокам), будит роли ночью, ведёт таймер речей и голосование.'],
      ['🌐 Онлайн', 'Каждый ходит со своего телефона: мафия предлагает цель, Дон решает, роли выбирают игрока, все голосуют сами. Чат стола открыт утром и в балаган, в речах — только говорящему.'],
      ['🔎 Поиск стола', `В главном меню «Поиск стола» показывает все онлайн-столы: флаг языка, ведущий, сколько мест занято, 🎧 — стол с Discord. Новые столы на русском публикуются и в ${ch('lfg')}.`],
      ['🎧 Голос в Discord', 'Ведущий включает «Игра с Discord» — бот создаёт канал стола (места + ведущий). Заходите по кнопке «Войти в голосовой» и жмите «Я на связи». Ведущий раздаёт карты, когда подтвердит, что все на связи.'],
      ['🎩 Свой стол', '«Ролевая мафия» → «Онлайн игра» → пригласите друзей или клуб. Можно и самому играть — тогда пригласите ведущего («Я — игрок» → «Пригласить ведущего»).'],
      ['🏆 Рейтинг, друзья, клубы', 'Очки за победы и полезные ходы, общий рейтинг, серии побед, друзья и клубы со своим чатом и приглашениями к столу.'],
      ['💎 Магазин', (s) => `Премиум-карта — ${s.role} ⭐, сценарий — ${s.scenario} ⭐, пак «${s.packName}» — ${s.pack} ⭐ (Telegram Stars).`]] },
    lfg: ['🔎 Ищу игру', 'Сюда бот сам публикует онлайн-столы на русском: флаг, ведущий, сколько мест занято, ссылка «Сесть за стол» и голосовой канал. Карточка обновляется, пока идёт набор, и закрывается, когда стол стартует или закрыт.'],
    results: ['🏆 Результаты', 'Итоги онлайн-партий на русском: кто победил, роли игроков, места и очки. Публикуются автоматически после каждой партии.'],
    ideas: ['💡 Идеи и баги', 'Нашли ошибку или есть идея? Напишите: что делали, что ожидали, что получилось, скриншот. Укажите телефон и язык приложения.'],
    hello: 'Сервер онлайн-мафии с голосом. Игра — в Telegram-приложении Mafia Pro, здесь — голосовые столы, карты и итоги.',
    pick: 'Нажмите свой язык — откроются каналы на нём. Можно выбрать несколько, повторное нажатие скрывает язык. 🎩 / 🎲 — роль на сервере.',
    news: 'Обновления приложения, турниры и вечера игры.',
    social: {
      title: '🔗 Mafia Pro в соцсетях', footer: 'Подписывайтесь и зовите друзей за стол 🎩',
      desc: 'Мафия, в которую играют с телефонов: за живым столом и онлайн.\nНажмите на название — откроется нужная соцсеть 👇',
      channel: ['📣 Telegram-канал', 'Новости, роль дня, игровые ситуации и обновления приложения.', 'Подписаться'],
      chat: ['💬 Чат игроков', 'Ищем стол, обсуждаем партии и правила, зовём друзей.', 'Вступить в чат'],
      instagram: ['📸 Instagram', 'Короткие ролики о мафии и её ролях.', 'Смотреть'],
      facebook: ['📘 Facebook', 'Ролики и новости Mafia Pro.', 'Открыть страницу'],
      tiktok: ['🎵 TikTok', 'Короткие ролики о мафии.', 'Смотреть'],
      site: ['🌐 mafiapro.app', 'Правила, все роли и составы от 7 до 24 игроков.', 'Открыть сайт'],
      play: ['🎲 Играть в Telegram', 'Само приложение: карты, ночь и голосование прямо на телефонах.', 'Открыть приложение']
    }
  },

  uk: {
    code: 'UA', name: 'Українська', emoji: '🇺🇦',
    cat: { lib: '📚 БІБЛІОТЕКА · UA', game: '🎲 ГРА · UA' },
    ch: {
      rules: ['📜・правила-сервера', 'Правила сервера'], howto: ['📱・як-грати', 'З чого почати і як влаштований застосунок Mafia Pro'],
      socials: ['🔗・наші-соцмережі', 'Усі соцмережі та посилання Mafia Pro в одному місці'],
      cardsMafia: ['🖤・карти-мафії', 'Усі карти мафії: здібності, порядок, поради'], cardsCity: ['❤️・карти-міста', 'Усі карти мирного міста'], cardsNeutral: ['🤍・нейтрали', 'Нейтрали та Перевертень'],
      scenarios: ['📚・сценарії', 'Безкоштовні склади, преміум-сценарії та пак'], gameRules: ['⚖️・правила-гри', 'Як іде партія, класика, онлайн-формат, бали'],
      lfg: ['🔎・шукаю-гру', 'Відкриті онлайн-столи — бот публікує сам'], results: ['🏆・результати', 'Підсумки онлайн-партій'], chat: ['💬・загальний-чат', 'Спілкування про гру й не тільки'], ideas: ['💡・ідеї-та-баги', 'Пропозиції та помилки застосунку']
    },
    btnTg: '▶️ Грати в Telegram', btnWeb: '🌐 Веб-версія',
    team: 'Команда', checks: 'Для перевірок', access: 'Доступ', free: 'безкоштовно', premium: s => `💎 преміум · ${s} ⭐`, pack: (p, s) => `📦 пак «${p}» · ${s} ⭐`,
    cardsNote: (p, s) => `Спочатку безкоштовні карти, потім 💎 преміум (${s} ⭐ за карту) і 📦 карти паку «${p}». Купити — в магазині застосунку Mafia Pro.`,
    intro: {
      mafia: ['🖤 Карти мафії', 'Родина мафії: знають одне одного, вночі обирають жертву, вдень прикривають своїх. Для перевірок Шерифа — чорні.'],
      city: ['❤️ Карти мирного міста', 'Місто не знає, хто є хто: шукає мафію перевірками, захистом і голосуванням. Для перевірок — червоні.'],
      neutral: ['🤍 Нейтрали та Перевертень', 'Нейтрали грають самі за себе й перемагають за своїми умовами. Перевертень роздається разом із мафією, але рахується за місто.']
    },
    players: n => `${n} ${plRu(n, 'гравець', 'гравці', 'гравців')}`,
    classic: (name, n) => `🎯 ${name} · ${n} гравців · безкоштовно`, comp: 'Склад', format: 'Формат', offline: 'за живим столом із ведучим (офлайн)',
    roleGame: (range) => `🎭 Рольова мафія · ${range} · безкоштовно`,
    roleGameD: 'Збалансовані склади під будь-яку кількість гравців: застосунок підбирає ролі, їх можна змінювати вручну. Грається офлайн (ведучий роздає карти з телефона) і онлайн (кожен ходить зі свого телефона, голос — у Discord).',
    special: 'Особливі ролі', count: 'Гравців', packTitle: (p, s) => `📦 Пак «${p}» · ${s} ⭐`, rolesF: 'Ролі', scenariosF: 'Сценарії',
    scenIntro: ['📚 Сценарії та склади', 'Безкоштовні режими, преміум-сценарії та пак. Усе запускається в застосунку: «Сценарії» на головному екрані.'],
    howGame: ['🌗 Як іде партія', [
      '**Команди.** Мафія (чорні карти) знає одне одного й уночі вбиває; мирне місто (червоні) шукає мафію вдень; нейтрали грають самі за себе; Перевертень приходить до мафії, але рахується за місто.',
      '**Ніч.** Ведучий будить ролі по черзі: родина мафії обирає ціль (вирішує Дон), потім прокидаються активні ролі зі своїми здібностями. Порядок указано в застосунку на кожній карті.',
      '**День.** Зранку ведучий оголошує підсумки ночі. Далі — промови по колу, висування кандидатів і голосування. Нічия → виправдувальні промови → переголосування.',
      '**Перемога.** Місто — коли в грі не залишилося мафії. Мафія — коли її не менше, ніж мирних. У нейтралів свої умови (написані на карті).',
      '**Ті, хто вибув,** не говорять про партію до кінця гри й не підказують живим.']],
    sport: 'спортивні правила',
    online: ['📱 Онлайн-формат', '**З Discord:** ведучий вмикає «Гра з Discord», бот створює голосовий канал столу на всі місця + ведучий у категорії «🎧 Ігрові столи». Гравці заходять за кнопкою в застосунку й тиснуть «Я на зв’язку». Карти роздаються лише після того, як ведучий підтвердить, що всі на зв’язку. Після гри канал видаляється сам.'],
    openClosed: '👁 Відкрита та закрита гра',
    points: ['🏅 Бали та рейтинг', r => `Після партії застосунок нараховує бали: за перемогу своєї команди й за корисні ходи (правильні перевірки, порятунки, влучні постріли), розбір показує кожен хід. Рейтинг спільний для всіх столів Mafia Pro, найкращі гравці — в розділі «Рейтинг» і в ${r}.`],
    rulesTitle: '📜 Правила сервера', rulesFooter: 'Заходячи на сервер, ви погоджуєтеся з правилами.',
    rules: ch => [
      ['Повага', 'Жодних образ, цькування, погроз і дискримінації. Сперечаємося про гру, а не про людей.'],
      ['Чесна гра', 'Не розкривайте свою роль інакше, ніж дозволяє гра. Жодних підказок через особисті повідомлення, інші чати й дзвінки під час партії (метагейм). Не переказуйте закриті ролі після вибування.'],
      ['Ті, хто вибув, мовчать', 'Вибули — вимкніть мікрофон до кінця партії. Слухати можна, підказувати — ні.'],
      ['Голосовий канал', 'Говоріть у свою промову й не перебивайте. Шумний мікрофон — на кнопку. Ведучий може заглушити гравця на час промови іншого.'],
      ['Слово ведучого', `Під час партії рішення ведучого остаточне. Спірні моменти — після гри, в ${ch('ideas')} або ведучому в особисті.`],
      ['Нік', 'Нік у Discord має збігатися з ніком у Telegram-застосунку (або бути зрозумілим), щоб ведучий і гравці вас упізнавали.'],
      ['Без спаму й реклами', 'Реклама, посилання на інші сервери й продаж чого-небудь — лише з дозволу адміністрації.'],
      ['Контент', 'Без NSFW, шок-контенту й політичних суперечок.'],
      ['Санкції', 'Попередження → мут → бан. За грубих порушень адміністрація діє одразу.'],
      ['Правила Discord', 'Діють [Умови використання](https://discord.com/terms) і [Принципи спільноти Discord](https://discord.com/guidelines).']],
    start: {
      title: '🎩 Ласкаво просимо до Mafia Pro', desc: 'Сервер для онлайн-мафії з голосом. Сама гра — у Telegram-застосунку **Mafia Pro**: карти, нічні ходи, голосування й рейтинг. Тут — голосові канали столів, бібліотека карт і сценаріїв та підсумки партій.',
      steps: ['З чого почати', (ch, bot) => [`1. Прочитайте ${ch('rules')}.`, `2. Відкрийте Mafia Pro в Telegram${bot ? ` — @${bot}` : ''} → «Грати».`, `3. «Пошук столу» → сідайте за онлайн-стіл (столи українською з’являються й у ${ch('lfg')}).`, '4. Ведучий увімкнув Discord — у застосунку тисніть «Увійти в голосовий», потім «Я на зв’язку».'].join('\n')],
      chans: ['Канали', ch => [`${ch('cardsMafia')} ${ch('cardsCity')} ${ch('cardsNeutral')} — усі карти ролей`, `${ch('scenarios')} — сценарії та склади`, `${ch('gameRules')} — правила гри`, `${ch('results')} — підсумки партій`, `${ch('chat')} — спілкування`, `${ch('socials')} — наші соцмережі`].join('\n')],
      langs: ['Мови', l => `Прапор біля столу — мова ведучого: 🇺🇦 українська / російська, 🇦🇲 вірменська, 🇵🇱 польська, 🇬🇧 англійська. Інші мови й ролі 🎩 Ведучий / 🎲 Гравець — у ${l}.`]
    },
    howto: { title: '📱 Як грати в Mafia Pro', desc: bot => `Застосунок відкривається в Telegram${bot ? ` у бота @${bot}` : ''}. Є два формати.`, fields: ch => [
      ['🃏 Офлайн (живий стіл)', 'Усі сидять разом, ведучий веде партію зі свого телефона: роздає карти (або надсилає їх гравцям у застосунок), будить ролі вночі, веде таймер промов і голосування.'],
      ['🌐 Онлайн', 'Кожен ходить зі свого телефона: мафія пропонує ціль, Дон вирішує, ролі обирають гравця, усі голосують самі. Чат столу відкритий зранку та в балаган, під час промов — лише тому, хто говорить.'],
      ['🔎 Пошук столу', `У головному меню «Пошук столу» показує всі онлайн-столи: прапор мови, ведучий, скільки місць зайнято, 🎧 — стіл із Discord. Нові столи українською публікуються й у ${ch('lfg')}.`],
      ['🎧 Голос у Discord', 'Ведучий вмикає «Гра з Discord» — бот створює канал столу (місця + ведучий). Заходьте за кнопкою «Увійти в голосовий» і тисніть «Я на зв’язку». Ведучий роздає карти, коли підтвердить, що всі на зв’язку.'],
      ['🎩 Свій стіл', '«Рольова мафія» → «Онлайн гра» → запросіть друзів або клуб. Можна й самому грати — тоді запросіть ведучого («Я — гравець» → «Запросити ведучого»).'],
      ['🏆 Рейтинг, друзі, клуби', 'Бали за перемоги й корисні ходи, спільний рейтинг, серії перемог, друзі та клуби зі своїм чатом і запрошеннями до столу.'],
      ['💎 Магазин', (s) => `Преміум-карта — ${s.role} ⭐, сценарій — ${s.scenario} ⭐, пак «${s.packName}» — ${s.pack} ⭐ (Telegram Stars).`]] },
    lfg: ['🔎 Шукаю гру', 'Сюди бот сам публікує онлайн-столи українською: прапор, ведучий, скільки місць зайнято, посилання «Сісти за стіл» і голосовий канал. Картка оновлюється, поки йде набір, і закривається, коли стіл стартує або закритий.'],
    results: ['🏆 Результати', 'Підсумки онлайн-партій українською: хто переміг, ролі гравців, місця й бали. Публікуються автоматично після кожної партії.'],
    ideas: ['💡 Ідеї та баги', 'Знайшли помилку чи маєте ідею? Напишіть: що робили, що очікували, що вийшло, скриншот. Вкажіть телефон і мову застосунку.'],
    hello: 'Сервер онлайн-мафії з голосом. Гра — у Telegram-застосунку Mafia Pro, тут — голосові столи, карти й підсумки.',
    pick: 'Натисніть свою мову — відкриються канали нею. Можна обрати кілька, повторне натискання ховає мову. 🎩 / 🎲 — роль на сервері.',
    news: 'Оновлення застосунку, турніри й ігрові вечори.',
    social: {
      title: '🔗 Mafia Pro у соцмережах', footer: 'Підписуйтеся та кличте друзів за стіл 🎩',
      desc: 'Мафія, у яку грають із телефонів: за живим столом і онлайн.\nНатисніть на назву — відкриється потрібна соцмережа 👇',
      channel: ['📣 Telegram-канал', 'Новини, роль дня, ігрові ситуації та оновлення застосунку.', 'Підписатися'],
      chat: ['💬 Чат гравців', 'Шукаємо стіл, обговорюємо партії й правила, кличемо друзів.', 'Приєднатися до чату'],
      instagram: ['📸 Instagram', 'Короткі ролики про мафію та її ролі.', 'Дивитися'],
      facebook: ['📘 Facebook', 'Ролики й новини Mafia Pro.', 'Відкрити сторінку'],
      tiktok: ['🎵 TikTok', 'Короткі ролики про мафію.', 'Дивитися'],
      site: ['🌐 mafiapro.app', 'Правила, усі ролі та склади від 7 до 24 гравців.', 'Відкрити сайт'],
      play: ['🎲 Грати в Telegram', 'Сам застосунок: карти, ніч і голосування просто на телефонах.', 'Відкрити застосунок']
    }
  },

  en: {
    code: 'EN', name: 'English', emoji: '🇬🇧',
    cat: { lib: '📚 LIBRARY · EN', game: '🎲 GAME · EN' },
    ch: {
      rules: ['📜・server-rules', 'Server rules'], howto: ['📱・how-to-play', 'Getting started and how the Mafia Pro app works'],
      socials: ['🔗・our-socials', 'All Mafia Pro social media and links in one place'],
      cardsMafia: ['🖤・mafia-cards', 'All mafia cards: abilities, night order, tips'], cardsCity: ['❤️・town-cards', 'All town cards'], cardsNeutral: ['🤍・neutrals', 'Neutrals and the Werewolf'],
      scenarios: ['📚・scenarios', 'Free line-ups, premium scenarios and the pack'], gameRules: ['⚖️・game-rules', 'How a game goes, classic, online format, points'],
      lfg: ['🔎・looking-for-game', 'Open online tables — posted by the bot'], results: ['🏆・results', 'Results of online games'], chat: ['💬・general-chat', 'Talk about the game and more'], ideas: ['💡・ideas-and-bugs', 'Suggestions and bug reports']
    },
    btnTg: '▶️ Play in Telegram', btnWeb: '🌐 Web version',
    team: 'Team', checks: 'Shows on checks as', access: 'Access', free: 'free', premium: s => `💎 premium · ${s} ⭐`, pack: (p, s) => `📦 “${p}” pack · ${s} ⭐`,
    cardsNote: (p, s) => `Free cards come first, then 💎 premium (${s} ⭐ per card) and 📦 cards of the “${p}” pack. Buy them in the Mafia Pro app shop.`,
    intro: {
      mafia: ['🖤 Mafia cards', 'The mafia family: they know each other, pick a victim at night and cover for each other by day. Black for the Sheriff’s checks.'],
      city: ['❤️ Town cards', 'The town doesn’t know who is who: it hunts the mafia with checks, protection and votes. Red for checks.'],
      neutral: ['🤍 Neutrals and the Werewolf', 'Neutrals play for themselves and win on their own terms. The Werewolf is dealt with the mafia but counts as town.']
    },
    players: n => `${n} ${n === 1 ? 'player' : 'players'}`,
    classic: (name, n) => `🎯 ${name} · ${n} players · free`, comp: 'Line-up', format: 'Format', offline: 'at a real table with a host (offline)',
    roleGame: (range) => `🎭 Role mafia · ${range} · free`,
    roleGameD: 'Balanced line-ups for any number of players: the app picks the roles and you can change them by hand. Play offline (the host deals cards from a phone) or online (everyone plays from their own phone, voice on Discord).',
    special: 'Special roles', count: 'Players', packTitle: (p, s) => `📦 “${p}” pack · ${s} ⭐`, rolesF: 'Roles', scenariosF: 'Scenarios',
    scenIntro: ['📚 Scenarios and line-ups', 'Free modes, premium scenarios and the pack. Everything starts in the app: “Scenarios” on the home screen.'],
    howGame: ['🌗 How a game goes', [
      '**Teams.** The mafia (black cards) know each other and kill at night; the town (red) hunts the mafia by day; neutrals play for themselves; the Werewolf joins the mafia but counts as town.',
      '**Night.** The host wakes the roles in order: the mafia family picks a target (the Don decides), then the active roles use their abilities. The order is shown on every card in the app.',
      '**Day.** In the morning the host announces what happened at night. Then speeches in turn, nominations and the vote. A tie → defence speeches → a re-vote.',
      '**Victory.** The town wins when no mafia is left. The mafia wins when they are at least as many as the town. Neutrals have their own conditions (written on the card).',
      '**Eliminated players** don’t talk about the game until it ends and don’t hint to the living.']],
    sport: 'sport rules',
    online: ['📱 Online format', '**With Discord:** the host turns on “Play with Discord”, the bot creates a voice channel for the table (every seat + the host) in the “🎧 Game tables” category. Players join with the button in the app and tap “I’m connected”. Cards are dealt only after the host confirms everyone is connected. The channel is removed after the game.'],
    openClosed: '👁 Open and closed game',
    points: ['🏅 Points and rating', r => `After a game the app awards points: for your team’s win and for useful moves (correct checks, saves, accurate shots); the review shows every move. The rating is shared by all Mafia Pro tables; the best players are in “Rating” and in ${r}.`],
    rulesTitle: '📜 Server rules', rulesFooter: 'By joining the server you agree to the rules.',
    rules: ch => [
      ['Respect', 'No insults, harassment, threats or discrimination. Argue about the game, not about people.'],
      ['Fair play', 'Don’t reveal your role other than the game allows. No hints through DMs, other chats or calls during a game (metagaming). Don’t retell hidden roles after you are out.'],
      ['The eliminated stay silent', 'Out of the game — mute your mic until it ends. You may listen, not hint.'],
      ['Voice channel', 'Speak in your own turn and don’t interrupt. Noisy mic — use push-to-talk. The host may mute a player during someone else’s speech.'],
      ['The host’s word', `During a game the host’s decision is final. Disputes — after the game, in ${ch('ideas')} or in a DM to the host.`],
      ['Nickname', 'Your Discord nickname should match your name in the Telegram app (or be recognisable) so the host and players know you.'],
      ['No spam or ads', 'Ads, links to other servers and selling anything — only with the admins’ permission.'],
      ['Content', 'No NSFW, shock content or political arguments.'],
      ['Sanctions', 'Warning → mute → ban. For serious violations the admins act at once.'],
      ['Discord rules', 'Discord’s [Terms of Service](https://discord.com/terms) and [Community Guidelines](https://discord.com/guidelines) apply.']],
    start: {
      title: '🎩 Welcome to Mafia Pro', desc: 'A server for online mafia with voice. The game itself runs in the **Mafia Pro** Telegram app: cards, night moves, voting and rating. Here you find the tables’ voice channels, the card and scenario library and game results.',
      steps: ['Getting started', (ch, bot) => [`1. Read ${ch('rules')}.`, `2. Open Mafia Pro in Telegram${bot ? ` — @${bot}` : ''} → “Play”.`, `3. “Find a table” → sit at an online table (English tables also appear in ${ch('lfg')}).`, '4. The host turned on Discord — tap “Join voice” in the app, then “I’m connected”.'].join('\n')],
      chans: ['Channels', ch => [`${ch('cardsMafia')} ${ch('cardsCity')} ${ch('cardsNeutral')} — every role card`, `${ch('scenarios')} — scenarios and line-ups`, `${ch('gameRules')} — game rules`, `${ch('results')} — game results`, `${ch('chat')} — chat`, `${ch('socials')} — our social media`].join('\n')],
      langs: ['Languages', l => `A table’s flag is its host’s language: 🇺🇦 Ukrainian / Russian, 🇦🇲 Armenian, 🇵🇱 Polish, 🇬🇧 English. Other languages and the 🎩 Host / 🎲 Player roles — in ${l}.`]
    },
    howto: { title: '📱 How to play Mafia Pro', desc: bot => `The app opens in Telegram${bot ? ` via @${bot}` : ''}. There are two formats.`, fields: ch => [
      ['🃏 Offline (real table)', 'Everyone sits together and the host runs the game from a phone: deals the cards (or sends them to players’ apps), wakes the roles at night, runs the speech timer and the vote.'],
      ['🌐 Online', 'Everyone plays from their own phone: the mafia proposes a target, the Don decides, roles pick a player, everyone votes. The table chat is open in the morning and during free talk; during speeches only the speaker writes.'],
      ['🔎 Find a table', `“Find a table” in the main menu lists every online table: language flag, host, seats taken, 🎧 — a table with Discord. New English tables are also posted in ${ch('lfg')}.`],
      ['🎧 Voice on Discord', 'The host turns on “Play with Discord” — the bot creates the table’s channel (seats + host). Join with “Join voice” and tap “I’m connected”. The host deals once they confirm everyone is connected.'],
      ['🎩 Your own table', '“Role mafia” → “Online game” → invite friends or a club. You can play yourself too — then invite a host (“I’m a player” → “Invite a host”).'],
      ['🏆 Rating, friends, clubs', 'Points for wins and useful moves, a shared rating, win streaks, friends and clubs with their own chat and table invites.'],
      ['💎 Shop', (s) => `Premium card — ${s.role} ⭐, scenario — ${s.scenario} ⭐, “${s.packName}” pack — ${s.pack} ⭐ (Telegram Stars).`]] },
    lfg: ['🔎 Looking for a game', 'The bot posts online tables in English here: flag, host, seats taken, a “Take a seat” link and the voice channel. The card updates while seats fill and closes when the game starts or the table closes.'],
    results: ['🏆 Results', 'Results of online games in English: who won, players’ roles, places and points. Posted automatically after every game.'],
    ideas: ['💡 Ideas and bugs', 'Found a bug or have an idea? Write what you did, what you expected, what happened, and add a screenshot. Mention your phone and app language.'],
    hello: 'A server for online mafia with voice. The game runs in the Mafia Pro Telegram app; here are voice tables, cards and results.',
    pick: 'Tap your language to open its channels. You can pick several; tap again to hide a language. 🎩 / 🎲 — your server role.',
    news: 'App updates, tournaments and game nights.',
    social: {
      title: '🔗 Mafia Pro on social media', footer: 'Follow us and bring your friends to the table 🎩',
      desc: 'Mafia you play on your phones — at a real table or online.\nTap a name to open it 👇',
      channel: ['📣 Telegram channel', 'News, role of the day, game situations and app updates (posts in Ukrainian and Russian).', 'Subscribe'],
      chat: ['💬 Players’ chat', 'Find a table, talk about games and rules, invite friends.', 'Join the chat'],
      instagram: ['📸 Instagram', 'Short videos about mafia and its roles.', 'Watch'],
      facebook: ['📘 Facebook', 'Videos and Mafia Pro news.', 'Open the page'],
      tiktok: ['🎵 TikTok', 'Short videos about mafia.', 'Watch'],
      site: ['🌐 mafiapro.app', 'Rules, every role and line-ups for 7 to 24 players.', 'Open the website'],
      play: ['🎲 Play in Telegram', 'The app itself: cards, night and voting right on your phones.', 'Open the app']
    }
  },

  pl: {
    code: 'PL', name: 'Polski', emoji: '🇵🇱',
    cat: { lib: '📚 BIBLIOTEKA · PL', game: '🎲 GRA · PL' },
    ch: {
      rules: ['📜・zasady-serwera', 'Zasady serwera'], howto: ['📱・jak-grać', 'Jak zacząć i jak działa aplikacja Mafia Pro'],
      socials: ['🔗・nasze-media-społecznościowe', 'Wszystkie media społecznościowe i linki Mafia Pro w jednym miejscu'],
      cardsMafia: ['🖤・karty-mafii', 'Wszystkie karty mafii: zdolności, kolejność, porady'], cardsCity: ['❤️・karty-miasta', 'Wszystkie karty miasta'], cardsNeutral: ['🤍・neutralni', 'Neutralni i Wilkołak'],
      scenarios: ['📚・scenariusze', 'Darmowe składy, scenariusze premium i pakiet'], gameRules: ['⚖️・zasady-gry', 'Przebieg gry, klasyka, tryb online, punkty'],
      lfg: ['🔎・szukam-gry', 'Otwarte stoły online — publikuje je bot'], results: ['🏆・wyniki', 'Wyniki gier online'], chat: ['💬・czat-ogólny', 'Rozmowy o grze i nie tylko'], ideas: ['💡・pomysły-i-błędy', 'Propozycje i błędy aplikacji']
    },
    btnTg: '▶️ Graj w Telegramie', btnWeb: '🌐 Wersja webowa',
    team: 'Drużyna', checks: 'Przy sprawdzeniu', access: 'Dostęp', free: 'za darmo', premium: s => `💎 premium · ${s} ⭐`, pack: (p, s) => `📦 pakiet „${p}” · ${s} ⭐`,
    cardsNote: (p, s) => `Najpierw karty darmowe, potem 💎 premium (${s} ⭐ za kartę) i 📦 karty pakietu „${p}”. Kupisz je w sklepie aplikacji Mafia Pro.`,
    intro: {
      mafia: ['🖤 Karty mafii', 'Rodzina mafii: znają się nawzajem, nocą wybierają ofiarę, w dzień kryją swoich. Przy sprawdzeniu Szeryfa — czarne.'],
      city: ['❤️ Karty miasta', 'Miasto nie wie, kto jest kim: szuka mafii sprawdzeniami, ochroną i głosowaniem. Przy sprawdzeniu — czerwone.'],
      neutral: ['🤍 Neutralni i Wilkołak', 'Neutralni grają dla siebie i wygrywają na własnych warunkach. Wilkołak trafia do mafii, ale liczy się jako miasto.']
    },
    players: n => `${n} ${plPl(n, 'gracz', 'gracze', 'graczy')}`,
    classic: (name, n) => `🎯 ${name} · ${n} graczy · za darmo`, comp: 'Skład', format: 'Tryb', offline: 'przy prawdziwym stole z prowadzącym (offline)',
    roleGame: (range) => `🎭 Mafia z rolami · ${range} · za darmo`,
    roleGameD: 'Zbalansowane składy na dowolną liczbę graczy: aplikacja dobiera role, można je zmieniać ręcznie. Gra się offline (prowadzący rozdaje karty z telefonu) i online (każdy gra ze swojego telefonu, głos — na Discordzie).',
    special: 'Specjalne role', count: 'Graczy', packTitle: (p, s) => `📦 Pakiet „${p}” · ${s} ⭐`, rolesF: 'Role', scenariosF: 'Scenariusze',
    scenIntro: ['📚 Scenariusze i składy', 'Darmowe tryby, scenariusze premium i pakiet. Wszystko uruchamiasz w aplikacji: „Scenariusze” na ekranie głównym.'],
    howGame: ['🌗 Przebieg gry', [
      '**Drużyny.** Mafia (czarne karty) zna się nawzajem i nocą zabija; miasto (czerwone) szuka mafii w dzień; neutralni grają dla siebie; Wilkołak przychodzi do mafii, ale liczy się jako miasto.',
      '**Noc.** Prowadzący budzi role po kolei: rodzina mafii wybiera cel (decyduje Don), potem budzą się aktywne role ze swoimi zdolnościami. Kolejność jest podana w aplikacji na każdej karcie.',
      '**Dzień.** Rano prowadzący ogłasza wyniki nocy. Dalej — przemowy po kolei, zgłaszanie kandydatów i głosowanie. Remis → przemowy obronne → ponowne głosowanie.',
      '**Zwycięstwo.** Miasto — gdy w grze nie ma już mafii. Mafia — gdy jest jej nie mniej niż mieszkańców. Neutralni mają własne warunki (zapisane na karcie).',
      '**Wyeliminowani** nie rozmawiają o grze do jej końca i nie podpowiadają żywym.']],
    sport: 'zasady sportowe',
    online: ['📱 Tryb online', '**Z Discordem:** prowadzący włącza „Gra z Discordem”, bot tworzy kanał głosowy stołu na wszystkie miejsca + prowadzący w kategorii „🎧 Stoły do gry”. Gracze wchodzą przyciskiem w aplikacji i klikają „Jestem na łączach”. Karty są rozdawane dopiero, gdy prowadzący potwierdzi, że wszyscy są na łączach. Po grze kanał znika sam.'],
    openClosed: '👁 Gra otwarta i zamknięta',
    points: ['🏅 Punkty i ranking', r => `Po grze aplikacja przyznaje punkty: za zwycięstwo drużyny i za przydatne ruchy (trafne sprawdzenia, uratowania, celne strzały), analiza pokazuje każdy ruch. Ranking jest wspólny dla wszystkich stołów Mafia Pro, najlepsi gracze — w zakładce „Ranking” i na ${r}.`],
    rulesTitle: '📜 Zasady serwera', rulesFooter: 'Wchodząc na serwer, akceptujesz zasady.',
    rules: ch => [
      ['Szacunek', 'Żadnych obelg, nękania, gróźb i dyskryminacji. Spieramy się o grę, nie o ludzi.'],
      ['Uczciwa gra', 'Nie ujawniaj swojej roli inaczej, niż pozwala gra. Żadnych podpowiedzi przez DM, inne czaty i rozmowy w trakcie gry (metagaming). Nie zdradzaj ukrytych ról po odpadnięciu.'],
      ['Wyeliminowani milczą', 'Odpadłeś — wycisz mikrofon do końca gry. Słuchać można, podpowiadać — nie.'],
      ['Kanał głosowy', 'Mów w swojej przemowie i nie przerywaj. Szumiący mikrofon — na przycisk. Prowadzący może wyciszyć gracza w czasie przemowy innego.'],
      ['Słowo prowadzącego', `W trakcie gry decyzja prowadzącego jest ostateczna. Sporne sytuacje — po grze, na ${ch('ideas')} lub w wiadomości do prowadzącego.`],
      ['Nick', 'Nick na Discordzie powinien zgadzać się z nickiem w aplikacji w Telegramie (albo być zrozumiały), żeby prowadzący i gracze cię rozpoznawali.'],
      ['Bez spamu i reklam', 'Reklamy, linki do innych serwerów i sprzedaż czegokolwiek — tylko za zgodą administracji.'],
      ['Treści', 'Bez NSFW, drastycznych treści i sporów politycznych.'],
      ['Kary', 'Ostrzeżenie → wyciszenie → ban. Przy poważnych naruszeniach administracja działa od razu.'],
      ['Zasady Discorda', 'Obowiązują [Warunki korzystania](https://discord.com/terms) i [Wytyczne dla społeczności Discorda](https://discord.com/guidelines).']],
    start: {
      title: '🎩 Witaj w Mafia Pro', desc: 'Serwer do mafii online z głosem. Sama gra toczy się w aplikacji **Mafia Pro** w Telegramie: karty, ruchy nocne, głosowanie i ranking. Tutaj — kanały głosowe stołów, biblioteka kart i scenariuszy oraz wyniki gier.',
      steps: ['Jak zacząć', (ch, bot) => [`1. Przeczytaj ${ch('rules')}.`, `2. Otwórz Mafia Pro w Telegramie${bot ? ` — @${bot}` : ''} → „Graj”.`, `3. „Szukaj stołu” → usiądź przy stole online (polskie stoły pojawiają się też na ${ch('lfg')}).`, '4. Prowadzący włączył Discorda — w aplikacji kliknij „Wejdź na kanał głosowy”, potem „Jestem na łączach”.'].join('\n')],
      chans: ['Kanały', ch => [`${ch('cardsMafia')} ${ch('cardsCity')} ${ch('cardsNeutral')} — wszystkie karty ról`, `${ch('scenarios')} — scenariusze i składy`, `${ch('gameRules')} — zasady gry`, `${ch('results')} — wyniki gier`, `${ch('chat')} — rozmowy`, `${ch('socials')} — nasze media społecznościowe`].join('\n')],
      langs: ['Języki', l => `Flaga stołu to język prowadzącego: 🇺🇦 ukraiński / rosyjski, 🇦🇲 ormiański, 🇵🇱 polski, 🇬🇧 angielski. Inne języki i role 🎩 Prowadzący / 🎲 Gracz — na ${l}.`]
    },
    howto: { title: '📱 Jak grać w Mafia Pro', desc: bot => `Aplikacja otwiera się w Telegramie${bot ? ` u bota @${bot}` : ''}. Są dwa tryby.`, fields: ch => [
      ['🃏 Offline (prawdziwy stół)', 'Wszyscy siedzą razem, prowadzący prowadzi grę ze swojego telefonu: rozdaje karty (lub wysyła je graczom do aplikacji), budzi role nocą, pilnuje czasu przemów i głosowania.'],
      ['🌐 Online', 'Każdy gra ze swojego telefonu: mafia proponuje cel, Don decyduje, role wybierają gracza, wszyscy głosują sami. Czat stołu jest otwarty rano i w czasie wolnej rozmowy, podczas przemów pisze tylko mówiący.'],
      ['🔎 Szukaj stołu', `„Szukaj stołu” w menu głównym pokazuje wszystkie stoły online: flagę języka, prowadzącego, zajęte miejsca, 🎧 — stół z Discordem. Nowe polskie stoły publikujemy też na ${ch('lfg')}.`],
      ['🎧 Głos na Discordzie', 'Prowadzący włącza „Gra z Discordem” — bot tworzy kanał stołu (miejsca + prowadzący). Wejdź przyciskiem „Wejdź na kanał głosowy” i kliknij „Jestem na łączach”. Prowadzący rozdaje karty, gdy potwierdzi, że wszyscy są na łączach.'],
      ['🎩 Własny stół', '„Mafia z rolami” → „Gra online” → zaproś znajomych lub klub. Możesz też grać sam — wtedy zaproś prowadzącego („Jestem graczem” → „Zaproś prowadzącego”).'],
      ['🏆 Ranking, znajomi, kluby', 'Punkty za zwycięstwa i przydatne ruchy, wspólny ranking, serie zwycięstw, znajomi i kluby z własnym czatem i zaproszeniami do stołu.'],
      ['💎 Sklep', (s) => `Karta premium — ${s.role} ⭐, scenariusz — ${s.scenario} ⭐, pakiet „${s.packName}” — ${s.pack} ⭐ (Telegram Stars).`]] },
    lfg: ['🔎 Szukam gry', 'Tutaj bot sam publikuje polskie stoły online: flaga, prowadzący, zajęte miejsca, link „Usiądź przy stole” i kanał głosowy. Karta aktualizuje się w trakcie zbierania graczy i zamyka, gdy gra rusza albo stół zostaje zamknięty.'],
    results: ['🏆 Wyniki', 'Wyniki polskich gier online: kto wygrał, role graczy, miejsca i punkty. Publikowane automatycznie po każdej grze.'],
    ideas: ['💡 Pomysły i błędy', 'Znalazłeś błąd albo masz pomysł? Napisz: co robiłeś, czego oczekiwałeś, co się stało, dodaj zrzut ekranu. Podaj telefon i język aplikacji.'],
    hello: 'Serwer mafii online z głosem. Gra działa w aplikacji Mafia Pro w Telegramie, tutaj — stoły głosowe, karty i wyniki.',
    pick: 'Kliknij swój język — otworzą się kanały w tym języku. Możesz wybrać kilka, ponowne kliknięcie ukrywa język. 🎩 / 🎲 — rola na serwerze.',
    news: 'Aktualizacje aplikacji, turnieje i wieczory gier.',
    social: {
      title: '🔗 Mafia Pro w mediach społecznościowych', footer: 'Obserwuj nas i zaproś znajomych do stołu 🎩',
      desc: 'Mafia, w którą gra się na telefonach — przy prawdziwym stole i online.\nKliknij nazwę, żeby ją otworzyć 👇',
      channel: ['📣 Kanał na Telegramie', 'Nowości, rola dnia, sytuacje z gry i aktualizacje aplikacji (posty po ukraińsku i rosyjsku).', 'Subskrybuj'],
      chat: ['💬 Czat graczy', 'Szukamy stołu, rozmawiamy o grach i zasadach, zapraszamy znajomych.', 'Dołącz do czatu'],
      instagram: ['📸 Instagram', 'Krótkie filmy o mafii i jej rolach.', 'Oglądaj'],
      facebook: ['📘 Facebook', 'Filmy i nowości Mafia Pro.', 'Otwórz stronę'],
      tiktok: ['🎵 TikTok', 'Krótkie filmy o mafii.', 'Oglądaj'],
      site: ['🌐 mafiapro.app', 'Zasady, wszystkie role i składy od 7 do 24 graczy.', 'Wejdź na stronę'],
      play: ['🎲 Graj w Telegramie', 'Sama aplikacja: karty, noc i głosowanie prosto na telefonach.', 'Otwórz aplikację']
    }
  },

  hy: {
    code: 'HY', name: 'Հայերեն', emoji: '🇦🇲',
    cat: { lib: '📚 ԳՐԱԴԱՐԱՆ · HY', game: '🎲 ԽԱՂ · HY' },
    ch: {
      rules: ['📜・սերվերի-կանոններ', 'Սերվերի կանոններ'], howto: ['📱・ինչպես-խաղալ', 'Ինչից սկսել և ինչպես է աշխատում Mafia Pro հավելվածը'],
      socials: ['🔗・մեր-սոցցանցերը', 'Mafia Pro-ի բոլոր սոցցանցերն ու հղումները մեկ տեղում'],
      cardsMafia: ['🖤・մաֆիայի-քարտեր', 'Մաֆիայի բոլոր քարտերը՝ ունակություններ, հերթականություն, խորհուրդներ'], cardsCity: ['❤️・քաղաքի-քարտեր', 'Խաղաղ քաղաքի բոլոր քարտերը'], cardsNeutral: ['🤍・չեզոքներ', 'Չեզոքներ և Գայլամարդ'],
      scenarios: ['📚・սցենարներ', 'Անվճար կազմեր, պրեմիում սցենարներ և փաթեթ'], gameRules: ['⚖️・խաղի-կանոններ', 'Խաղի ընթացքը, դասական, առցանց ձևաչափ, միավորներ'],
      lfg: ['🔎・փնտրում-եմ-խաղ', 'Բաց առցանց սեղաններ — հրապարակում է բոտը'], results: ['🏆・արդյունքներ', 'Առցանց խաղերի արդյունքները'], chat: ['💬・ընդհանուր-զրույց', 'Զրույց խաղի և ոչ միայն մասին'], ideas: ['💡・գաղափարներ-և-սխալներ', 'Առաջարկներ և հավելվածի սխալներ']
    },
    btnTg: '▶️ Խաղալ Telegram-ում', btnWeb: '🌐 Վեբ տարբերակ',
    team: 'Թիմ', checks: 'Ստուգման ժամանակ', access: 'Հասանելիություն', free: 'անվճար', premium: s => `💎 պրեմիում · ${s} ⭐`, pack: (p, s) => `📦 «${p}» փաթեթ · ${s} ⭐`,
    cardsNote: (p, s) => `Սկզբում անվճար քարտերն են, հետո 💎 պրեմիումները (${s} ⭐ մեկ քարտի համար) և 📦 «${p}» փաթեթի քարտերը։ Գնել կարող եք Mafia Pro հավելվածի խանութում։`,
    intro: {
      mafia: ['🖤 Մաֆիայի քարտեր', 'Մաֆիայի ընտանիքը․ ճանաչում են միմյանց, գիշերը զոհ են ընտրում, ցերեկը պաշտպանում են յուրայիններին։ Շերիֆի ստուգման ժամանակ՝ սև։'],
      city: ['❤️ Խաղաղ քաղաքի քարտեր', 'Քաղաքը չգիտի՝ ով ով է․ մաֆիային փնտրում է ստուգումներով, պաշտպանությամբ և քվեարկությամբ։ Ստուգման ժամանակ՝ կարմիր։'],
      neutral: ['🤍 Չեզոքներ և Գայլամարդ', 'Չեզոքները խաղում են իրենց համար և հաղթում են իրենց պայմաններով։ Գայլամարդը բաժանվում է մաֆիայի հետ, բայց համարվում է քաղաքի կողմից։']
    },
    players: n => `${n} խաղացող`,
    classic: (name, n) => `🎯 ${name} · ${n} խաղացող · անվճար`, comp: 'Կազմ', format: 'Ձևաչափ', offline: 'կենդանի սեղանի շուրջ՝ վարողի հետ (օֆլայն)',
    roleGame: (range) => `🎭 Դերային մաֆիա · ${range} · անվճար`,
    roleGameD: 'Հավասարակշռված կազմեր ցանկացած թվով խաղացողների համար․ հավելվածն ընտրում է դերերը, դրանք կարելի է փոխել ձեռքով։ Խաղում են օֆլայն (վարողը քարտերը բաժանում է հեռախոսից) և առցանց (յուրաքանչյուրը խաղում է իր հեռախոսից, ձայնը՝ Discord-ում)։',
    special: 'Հատուկ դերեր', count: 'Խաղացողներ', packTitle: (p, s) => `📦 «${p}» փաթեթ · ${s} ⭐`, rolesF: 'Դերեր', scenariosF: 'Սցենարներ',
    scenIntro: ['📚 Սցենարներ և կազմեր', 'Անվճար ռեժիմներ, պրեմիում սցենարներ և փաթեթ։ Ամեն ինչ գործարկվում է հավելվածում՝ «Սցենարներ» գլխավոր էկրանին։'],
    howGame: ['🌗 Ինչպես է ընթանում խաղը', [
      '**Թիմեր։** Մաֆիան (սև քարտեր) ճանաչում է միմյանց և գիշերը սպանում է․ խաղաղ քաղաքը (կարմիր) ցերեկը փնտրում է մաֆիային․ չեզոքները խաղում են իրենց համար․ Գայլամարդը գալիս է մաֆիայի մոտ, բայց համարվում է քաղաքի կողմից։',
      '**Գիշեր։** Վարողը հերթով արթնացնում է դերերին․ մաֆիայի ընտանիքն ընտրում է թիրախ (որոշում է Դոնը), հետո արթնանում են ակտիվ դերերն իրենց ունակություններով։ Հերթականությունը նշված է հավելվածում յուրաքանչյուր քարտի վրա։',
      '**Ցերեկ։** Առավոտյան վարողը հայտարարում է գիշերվա արդյունքները։ Հետո՝ ելույթներ հերթով, թեկնածուների առաջադրում և քվեարկություն։ Հավասար ձայներ → արդարացման ելույթներ → կրկնակի քվեարկություն։',
      '**Հաղթանակ։** Քաղաքը՝ երբ խաղում մաֆիա չի մնացել։ Մաֆիան՝ երբ այն քաղաքացիներից քիչ չէ։ Չեզոքներն ունեն իրենց պայմանները (գրված են քարտի վրա)։',
      '**Դուրս մնացածները** մինչև խաղի ավարտը չեն խոսում խաղի մասին և չեն հուշում կենդանիներին։']],
    sport: 'սպորտային կանոններ',
    online: ['📱 Առցանց ձևաչափ', '**Discord-ով․** վարողը միացնում է «Խաղ Discord-ով», բոտը ստեղծում է սեղանի ձայնային ալիք բոլոր տեղերի + վարողի համար «🎧 Խաղային սեղաններ» կատեգորիայում։ Խաղացողները մտնում են հավելվածի կոճակով և սեղմում «Կապի մեջ եմ»։ Քարտերը բաժանվում են միայն այն բանից հետո, երբ վարողը հաստատում է, որ բոլորը կապի մեջ են։ Խաղից հետո ալիքն ինքնաբերաբար ջնջվում է։'],
    openClosed: '👁 Բաց և փակ խաղ',
    points: ['🏅 Միավորներ և վարկանիշ', r => `Խաղից հետո հավելվածը միավորներ է հաշվում՝ թիմի հաղթանակի և օգտակար քայլերի համար (ճիշտ ստուգումներ, փրկություններ, դիպուկ կրակոցներ), վերլուծությունը ցույց է տալիս յուրաքանչյուր քայլ։ Վարկանիշն ընդհանուր է Mafia Pro-ի բոլոր սեղանների համար, լավագույն խաղացողները՝ «Վարկանիշ» բաժնում և ${r}-ում։`],
    rulesTitle: '📜 Սերվերի կանոններ', rulesFooter: 'Մտնելով սերվեր՝ դուք համաձայնում եք կանոններին։',
    rules: ch => [
      ['Հարգանք', 'Ոչ մի վիրավորանք, հետապնդում, սպառնալիք կամ խտրականություն։ Վիճում ենք խաղի, ոչ թե մարդկանց մասին։'],
      ['Ազնիվ խաղ', 'Մի բացահայտեք ձեր դերն այլ կերպ, քան թույլ է տալիս խաղը։ Ոչ մի հուշում անձնական նամակներով, այլ զրուցարաններով կամ զանգերով խաղի ընթացքում (մետախաղ)։ Դուրս գալուց հետո մի պատմեք փակ դերերի մասին։'],
      ['Դուրս մնացածները լռում են', 'Դուրս եք մնացել՝ անջատեք խոսափողը մինչև խաղի ավարտը։ Լսել կարելի է, հուշել՝ ոչ։'],
      ['Ձայնային ալիք', 'Խոսեք ձեր ելույթի ժամանակ և մի ընդհատեք։ Աղմկոտ խոսափող՝ կոճակով։ Վարողը կարող է լռեցնել խաղացողին մեկ ուրիշի ելույթի ժամանակ։'],
      ['Վարողի խոսքը', `Խաղի ընթացքում վարողի որոշումը վերջնական է։ Վիճելի պահերը՝ խաղից հետո, ${ch('ideas')}-ում կամ վարողին անձնական նամակով։`],
      ['Մականուն', 'Discord-ի մականունը պետք է համընկնի Telegram հավելվածի մականվան հետ (կամ լինի հասկանալի), որպեսզի վարողն ու խաղացողները ձեզ ճանաչեն։'],
      ['Առանց սպամի և գովազդի', 'Գովազդ, այլ սերվերների հղումներ և որևէ բանի վաճառք՝ միայն ադմինիստրացիայի թույլտվությամբ։'],
      ['Բովանդակություն', 'Առանց NSFW-ի, ցնցող բովանդակության և քաղաքական վեճերի։'],
      ['Պատժամիջոցներ', 'Զգուշացում → լռեցում → արգելափակում։ Կոպիտ խախտումների դեպքում ադմինիստրացիան գործում է անմիջապես։'],
      ['Discord-ի կանոններ', 'Գործում են Discord-ի [Օգտագործման պայմանները](https://discord.com/terms) և [Համայնքի սկզբունքները](https://discord.com/guidelines)։']],
    start: {
      title: '🎩 Բարի գալուստ Mafia Pro', desc: 'Սերվեր առցանց մաֆիայի համար՝ ձայնով։ Խաղն ինքնին ընթանում է **Mafia Pro** Telegram հավելվածում՝ քարտեր, գիշերային քայլեր, քվեարկություն և վարկանիշ։ Այստեղ են սեղանների ձայնային ալիքները, քարտերի և սցենարների գրադարանը և խաղերի արդյունքները։',
      steps: ['Ինչից սկսել', (ch, bot) => [`1. Կարդացեք ${ch('rules')}-ը։`, `2. Բացեք Mafia Pro-ն Telegram-ում${bot ? ` — @${bot}` : ''} → «Խաղալ»։`, `3. «Սեղանի որոնում» → նստեք առցանց սեղանի շուրջ (հայերեն սեղանները հայտնվում են նաև ${ch('lfg')}-ում)։`, '4. Վարողը միացրել է Discord-ը՝ հավելվածում սեղմեք «Մտնել ձայնային ալիք», հետո՝ «Կապի մեջ եմ»։'].join('\n')],
      chans: ['Ալիքներ', ch => [`${ch('cardsMafia')} ${ch('cardsCity')} ${ch('cardsNeutral')} — դերերի բոլոր քարտերը`, `${ch('scenarios')} — սցենարներ և կազմեր`, `${ch('gameRules')} — խաղի կանոններ`, `${ch('results')} — խաղերի արդյունքներ`, `${ch('chat')} — զրույց`, `${ch('socials')} — մեր սոցցանցերը`].join('\n')],
      langs: ['Լեզուներ', l => `Սեղանի դրոշը վարողի լեզուն է՝ 🇺🇦 ուկրաիներեն / ռուսերեն, 🇦🇲 հայերեն, 🇵🇱 լեհերեն, 🇬🇧 անգլերեն։ Այլ լեզուներ և 🎩 Վարող / 🎲 Խաղացող դերերը՝ ${l}-ում։`]
    },
    howto: { title: '📱 Ինչպես խաղալ Mafia Pro', desc: bot => `Հավելվածը բացվում է Telegram-ում${bot ? `՝ @${bot} բոտի մոտ` : ''}։ Կա երկու ձևաչափ։`, fields: ch => [
      ['🃏 Օֆլայն (կենդանի սեղան)', 'Բոլորը նստած են միասին, վարողը խաղը վարում է իր հեռախոսից․ բաժանում է քարտերը (կամ ուղարկում խաղացողների հավելված), գիշերը արթնացնում դերերին, հետևում է ելույթների ժամանակին և քվեարկությանը։'],
      ['🌐 Առցանց', 'Յուրաքանչյուրը խաղում է իր հեռախոսից․ մաֆիան թիրախ է առաջարկում, Դոնը որոշում է, դերերն ընտրում են խաղացողին, բոլորը քվեարկում են ինքնուրույն։ Սեղանի զրուցարանը բաց է առավոտյան և ազատ զրույցի ժամանակ, ելույթների ժամանակ գրում է միայն խոսողը։'],
      ['🔎 Սեղանի որոնում', `Գլխավոր մենյուի «Սեղանի որոնում»-ը ցույց է տալիս բոլոր առցանց սեղանները՝ լեզվի դրոշ, վարող, զբաղված տեղեր, 🎧՝ սեղան Discord-ով։ Նոր հայերեն սեղանները հրապարակվում են նաև ${ch('lfg')}-ում։`],
      ['🎧 Ձայն Discord-ում', 'Վարողը միացնում է «Խաղ Discord-ով»՝ բոտը ստեղծում է սեղանի ալիքը (տեղեր + վարող)։ Մտեք «Մտնել ձայնային ալիք» կոճակով և սեղմեք «Կապի մեջ եմ»։ Վարողը քարտերը բաժանում է, երբ հաստատում է, որ բոլորը կապի մեջ են։'],
      ['🎩 Ձեր սեղանը', '«Դերային մաֆիա» → «Առցանց խաղ» → հրավիրեք ընկերներին կամ ակումբին։ Կարող եք նաև ինքներդ խաղալ՝ այդ դեպքում հրավիրեք վարողին («Ես խաղացող եմ» → «Հրավիրել վարողին»)։'],
      ['🏆 Վարկանիշ, ընկերներ, ակումբներ', 'Միավորներ հաղթանակների և օգտակար քայլերի համար, ընդհանուր վարկանիշ, հաղթանակների շարքեր, ընկերներ և ակումբներ՝ իրենց զրուցարանով և սեղանի հրավերներով։'],
      ['💎 Խանութ', (s) => `Պրեմիում քարտ՝ ${s.role} ⭐, սցենար՝ ${s.scenario} ⭐, «${s.packName}» փաթեթ՝ ${s.pack} ⭐ (Telegram Stars)։`]] },
    lfg: ['🔎 Փնտրում եմ խաղ', 'Այստեղ բոտն ինքն է հրապարակում հայերեն առցանց սեղանները՝ դրոշ, վարող, զբաղված տեղեր, «Նստել սեղանի շուրջ» հղում և ձայնային ալիք։ Քարտը թարմացվում է հավաքագրման ընթացքում և փակվում, երբ խաղը սկսվում է կամ սեղանը փակվում է։'],
    results: ['🏆 Արդյունքներ', 'Հայերեն առցանց խաղերի արդյունքները՝ ով հաղթեց, խաղացողների դերերը, տեղերն ու միավորները։ Հրապարակվում են ավտոմատ յուրաքանչյուր խաղից հետո։'],
    ideas: ['💡 Գաղափարներ և սխալներ', 'Գտե՞լ եք սխալ կամ ունե՞ք գաղափար։ Գրեք՝ ինչ էիք անում, ինչ էիք սպասում, ինչ ստացվեց, կցեք սքրինշոթ։ Նշեք հեռախոսը և հավելվածի լեզուն։'],
    hello: 'Առցանց մաֆիայի սերվեր՝ ձայնով։ Խաղը Mafia Pro Telegram հավելվածում է, այստեղ՝ ձայնային սեղաններ, քարտեր և արդյունքներ։',
    pick: 'Սեղմեք ձեր լեզուն՝ կբացվեն այդ լեզվով ալիքները։ Կարելի է ընտրել մի քանիսը, կրկնակի սեղմումը թաքցնում է լեզուն։ 🎩 / 🎲՝ դերը սերվերում։',
    news: 'Հավելվածի թարմացումներ, մրցաշարեր և խաղային երեկոներ։',
    social: {
      title: '🔗 Mafia Pro-ն սոցցանցերում', footer: 'Հետևեք մեզ և հրավիրեք ընկերներին խաղի 🎩',
      desc: 'Մաֆիա, որը խաղում են հեռախոսներով՝ իրական սեղանի շուրջ և առցանց։\nՍեղմեք անվան վրա՝ այն բացելու համար 👇',
      channel: ['📣 Telegram ալիք', 'Նորություններ, օրվա դերը, խաղային իրավիճակներ և հավելվածի թարմացումներ (գրառումները ուկրաիներեն և ռուսերեն են)։', 'Բաժանորդագրվել'],
      chat: ['💬 Խաղացողների չատ', 'Սեղան ենք փնտրում, քննարկում ենք խաղերն ու կանոնները, հրավիրում ենք ընկերներին։', 'Միանալ չատին'],
      instagram: ['📸 Instagram', 'Կարճ տեսանյութեր մաֆիայի և նրա դերերի մասին։', 'Դիտել'],
      facebook: ['📘 Facebook', 'Mafia Pro-ի տեսանյութեր և նորություններ։', 'Բացել էջը'],
      tiktok: ['🎵 TikTok', 'Կարճ տեսանյութեր մաֆիայի մասին։', 'Դիտել'],
      site: ['🌐 mafiapro.app', 'Կանոններ, բոլոր դերերը և կազմեր 7-ից 24 խաղացողի համար։', 'Բացել կայքը'],
      play: ['🎲 Խաղալ Telegram-ում', 'Հավելվածը՝ քարտեր, գիշեր և քվեարկություն հենց հեռախոսներում։', 'Բացել հավելվածը']
    }
  }
};

/* the game roles on the server (button labels in the chooser) */
export const GAME_ROLES = {
  host: { ru: '🎩 Ведущий', uk: '🎩 Ведучий', en: '🎩 Host', pl: '🎩 Prowadzący', hy: '🎩 Վարող' },
  player: { ru: '🎲 Игрок', uk: '🎲 Гравець', en: '🎲 Player', pl: '🎲 Gracz', hy: '🎲 Խաղացող' }
};
