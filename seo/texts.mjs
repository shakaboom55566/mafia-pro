/* Words of the public website (seo/build-site.mjs) in the five languages of the app.
   Card, scenario and rule data come from the app itself (loadApp(lang)); the "how a game goes" and "how to play" blocks
   are shared with the Discord server (discord/texts.mjs). Here: page titles, descriptions, headings, FAQ.
   Titles ≤ ~60 characters and descriptions ≤ ~155 where possible — that is what Google shows. */

const plRu = (n, a, b, c) => { const d = n % 10, h = n % 100; return d === 1 && h !== 11 ? a : d >= 2 && d <= 4 && (h < 12 || h > 14) ? b : c; };
const plPl = (n, a, b, c) => { if (n === 1) return a; const d = n % 10, h = n % 100; return d >= 2 && d <= 4 && (h < 12 || h > 14) ? b : c; };

export const S = {
  ru: {
    html: 'ru', og: 'ru_RU', native: 'Русский',
    nav: { home: 'Главная', roles: 'Роли', rules: 'Правила', scenarios: 'Сценарии', play: 'Играть' },
    ctaTg: 'Играть в Telegram', ctaWeb: 'Открыть веб-версию',
    home: {
      title: 'Мафия в Telegram — онлайн и за живым столом | Mafia Pro',
      desc: 'Игра «Мафия» прямо в Telegram: приложение раздаёт карты, ведёт ночь, день и голосование. 58 ролей, классика на 10, онлайн-столы с голосом в Discord. Бесплатно.',
      h1: 'Мафия в Telegram',
      lead: 'Mafia Pro — приложение для игры в мафию с друзьями: за живым столом с ведущим или онлайн, каждый со своего телефона. Без бумажных карт и без регистрации — открывается прямо в Telegram.',
      featuresH: 'Что умеет Mafia Pro',
      features: [
        ['Раздача карт', 'Роли приходят игрокам на телефоны или ведущий показывает их сам. 58 ролей, состав подбирается под число игроков от 7 до 24.'],
        ['Ведущий в кармане', 'Ночь по шагам в правильном порядке, таймер речей, выставление, голосование с переголосованием и подъёмом всех.'],
        ['Онлайн-мафия', 'Каждый ходит со своего телефона: мафия выбирает цель, роли делают ходы, все голосуют сами. Голос — в Discord-канале стола.'],
        ['Классика на 10', 'Спортивные правила: Дон, две мафии, Шериф и шесть мирных. Минутные речи, фолы, договорка в нулевую ночь.'],
        ['Рейтинг и разбор', 'После партии — разбор каждого хода, очки за победу и полезные действия, общий рейтинг, друзья и клубы.'],
        ['Пять языков', 'Русский, украинский, английский, польский и армянский — у каждого игрока свой язык.']
      ],
      formatsH: 'Два формата игры', rolesH: 'Роли в мафии', rolesLead: 'Все 58 карт с правилами и советами: от Дона и Шерифа до Маньяка и Оборотня.',
      allRoles: 'Все роли', rulesLink: 'Правила игры', scenLink: 'Сценарии и составы', faqH: 'Вопросы и ответы',
      faq: [
        ['Сколько стоит Mafia Pro?', 'Классическая мафия на 10 игроков и ролевая мафия с базовыми картами — бесплатно. Премиум-карты, сценарии и пак «Дипломатическая игра» покупаются за Telegram Stars.'],
        ['Нужно ли что-то устанавливать?', 'Нет. Mafia Pro — мини-приложение Telegram: откройте бота @mafiaprof_bot и нажмите «Играть». Есть и веб-версия в браузере.'],
        ['Сколько нужно игроков?', 'От 7 до 24. Для классики — ровно 10. Приложение само подбирает сбалансированный состав ролей, его можно поменять вручную.'],
        ['Можно ли играть в мафию онлайн?', 'Да. В онлайн-формате каждый игрок ходит со своего телефона, а ведущий может включить голосовой канал в Discord на весь стол.'],
        ['Нужен ли ведущий?', 'В живой игре ведущий ведёт партию с телефона, приложение подсказывает каждый шаг. В онлайн-игре ведущим может быть любой игрок за столом.'],
        ['На каких языках работает приложение?', 'На русском, украинском, английском, польском и армянском.']
      ]
    },
    roles: {
      title: 'Роли в мафии: все 58 карт с описанием | Mafia Pro',
      desc: 'Полный список ролей для игры в мафию: Дон, Шериф, Доктор, Маньяк, Оборотень и ещё 50 карт. Что делает каждая роль ночью и днём, советы и порядок ходов.',
      h1: 'Роли в мафии', lead: 'Все карты Mafia Pro по командам: что делает роль, когда просыпается и как за неё играть. Нажмите карту — откроется подробное описание.'
    },
    role: {
      title: n => `${n} — роль в игре Мафия | Mafia Pro`,
      desc: (n, s) => `${n} — роль в игре «Мафия». ${s} Правила роли и советы.`,
      h1: n => `${n}: роль в игре «Мафия»`,
      team: 'Команда', checks: 'Для проверок', kind: 'Тип', access: 'Доступ', free: 'бесплатно', premium: 'премиум-карта', pack: p => `пак «${p}»`,
      how: 'Как играть за роль', tip: 'Совет', story: 'История', related: 'Другие роли команды', back: 'Все роли'
    },
    rules: {
      title: 'Правила игры в мафию: классика и ролевая | Mafia Pro',
      desc: 'Как играть в мафию: команды, ночь и день, голосование, ничья и переголосование, условия победы. Спортивные правила классики на 10 игроков и онлайн-формат.',
      h1: 'Правила игры в мафию', lead: 'Как идёт партия, чем отличается спортивная классика и как играть онлайн — коротко и по делу.'
    },
    scen: {
      title: 'Мафия: роли по числу игроков и сценарии | Mafia Pro',
      desc: 'Какие роли брать на 7, 8, 10, 12 и до 24 игроков: готовые сбалансированные составы для мафии, классика на 10 и тематические сценарии.',
      h1: 'Составы и сценарии', lead: 'Сбалансированные составы для любой компании и сценарии с особыми ролями.',
      byN: 'Роли по числу игроков', players: n => `${n} ${plRu(n, 'игрок', 'игрока', 'игроков')}`, scenH: 'Сценарии', special: 'Особые роли', count: 'Игроков', classicH: 'Классика'
    },
    footer: 'Mafia Pro — игра «Мафия» в Telegram. Сделано для живых и онлайн-столов.'
  },

  uk: {
    html: 'uk', og: 'uk_UA', native: 'Українська',
    nav: { home: 'Головна', roles: 'Ролі', rules: 'Правила', scenarios: 'Сценарії', play: 'Грати' },
    ctaTg: 'Грати в Telegram', ctaWeb: 'Відкрити вебверсію',
    home: {
      title: 'Мафія в Telegram — онлайн і за живим столом | Mafia Pro',
      desc: 'Гра «Мафія» просто в Telegram: застосунок роздає карти, веде ніч, день і голосування. 58 ролей, класика на 10, онлайн-столи з голосом у Discord. Безкоштовно.',
      h1: 'Мафія в Telegram',
      lead: 'Mafia Pro — застосунок для гри в мафію з друзями: за живим столом із ведучим або онлайн, кожен зі свого телефона. Без паперових карт і без реєстрації — відкривається просто в Telegram.',
      featuresH: 'Що вміє Mafia Pro',
      features: [
        ['Роздача карт', 'Ролі приходять гравцям на телефони або ведучий показує їх сам. 58 ролей, склад добирається під кількість гравців від 7 до 24.'],
        ['Ведучий у кишені', 'Ніч крок за кроком у правильному порядку, таймер промов, виставлення, голосування з переголосуванням і підняттям усіх.'],
        ['Онлайн-мафія', 'Кожен ходить зі свого телефона: мафія обирає ціль, ролі роблять ходи, усі голосують самі. Голос — у Discord-каналі столу.'],
        ['Класика на 10', 'Спортивні правила: Дон, дві мафії, Шериф і шість мирних. Хвилинні промови, фоли, домовленість у нульову ніч.'],
        ['Рейтинг і розбір', 'Після партії — розбір кожного ходу, очки за перемогу й корисні дії, спільний рейтинг, друзі та клуби.'],
        ['П’ять мов', 'Українська, російська, англійська, польська та вірменська — у кожного гравця своя мова.']
      ],
      formatsH: 'Два формати гри', rolesH: 'Ролі в мафії', rolesLead: 'Усі 58 карт із правилами й порадами: від Дона й Шерифа до Маніяка й Перевертня.',
      allRoles: 'Усі ролі', rulesLink: 'Правила гри', scenLink: 'Сценарії та склади', faqH: 'Питання та відповіді',
      faq: [
        ['Скільки коштує Mafia Pro?', 'Класична мафія на 10 гравців і рольова мафія з базовими картами — безкоштовно. Преміум-карти, сценарії та пак «Дипломатична гра» купуються за Telegram Stars.'],
        ['Чи треба щось встановлювати?', 'Ні. Mafia Pro — мінізастосунок Telegram: відкрийте бота @mafiaprof_bot і натисніть «Грати». Є й вебверсія в браузері.'],
        ['Скільки потрібно гравців?', 'Від 7 до 24. Для класики — рівно 10. Застосунок сам добирає збалансований склад ролей, його можна змінити вручну.'],
        ['Чи можна грати в мафію онлайн?', 'Так. В онлайн-форматі кожен гравець ходить зі свого телефона, а ведучий може ввімкнути голосовий канал у Discord на весь стіл.'],
        ['Чи потрібен ведучий?', 'У живій грі ведучий веде партію з телефона, застосунок підказує кожен крок. В онлайн-грі ведучим може бути будь-хто за столом.'],
        ['Якими мовами працює застосунок?', 'Українською, російською, англійською, польською та вірменською.']
      ]
    },
    roles: {
      title: 'Ролі в мафії: усі 58 карт з описом | Mafia Pro',
      desc: 'Повний список ролей для гри в мафію: Дон, Шериф, Лікар, Маніяк, Перевертень і ще 50 карт. Що робить кожна роль уночі та вдень, поради й порядок ходів.',
      h1: 'Ролі в мафії', lead: 'Усі карти Mafia Pro за командами: що робить роль, коли прокидається і як за неї грати. Натисніть карту — відкриється детальний опис.'
    },
    role: {
      title: n => `${n} — роль у грі Мафія | Mafia Pro`,
      desc: (n, s) => `${n} — роль у грі «Мафія». ${s} Правила ролі та поради.`,
      h1: n => `${n}: роль у грі «Мафія»`,
      team: 'Команда', checks: 'Для перевірок', kind: 'Тип', access: 'Доступ', free: 'безкоштовно', premium: 'преміум-карта', pack: p => `пак «${p}»`,
      how: 'Як грати за роль', tip: 'Порада', story: 'Історія', related: 'Інші ролі команди', back: 'Усі ролі'
    },
    rules: {
      title: 'Правила гри в мафію: класика та рольова | Mafia Pro',
      desc: 'Як грати в мафію: команди, ніч і день, голосування, нічия та переголосування, умови перемоги. Спортивні правила класики на 10 гравців і онлайн-формат.',
      h1: 'Правила гри в мафію', lead: 'Як іде партія, чим відрізняється спортивна класика і як грати онлайн — коротко й по суті.'
    },
    scen: {
      title: 'Мафія: ролі за кількістю гравців і сценарії | Mafia Pro',
      desc: 'Які ролі брати на 7, 8, 10, 12 і до 24 гравців: готові збалансовані склади для мафії, класика на 10 і тематичні сценарії.',
      h1: 'Склади та сценарії', lead: 'Збалансовані склади для будь-якої компанії та сценарії з особливими ролями.',
      byN: 'Ролі за кількістю гравців', players: n => `${n} ${plRu(n, 'гравець', 'гравці', 'гравців')}`, scenH: 'Сценарії', special: 'Особливі ролі', count: 'Гравців', classicH: 'Класика'
    },
    footer: 'Mafia Pro — гра «Мафія» в Telegram. Для живих і онлайн-столів.'
  },

  en: {
    html: 'en', og: 'en_US', native: 'English',
    nav: { home: 'Home', roles: 'Roles', rules: 'Rules', scenarios: 'Setups', play: 'Play' },
    ctaTg: 'Play in Telegram', ctaWeb: 'Open the web version',
    home: {
      title: 'Mafia party game on Telegram — online & in person | Mafia Pro',
      desc: 'Play Mafia right in Telegram: the app deals the cards and runs the night, the day and the vote. 58 roles, classic 10-player Mafia, online tables with Discord voice. Free.',
      h1: 'Mafia on Telegram',
      lead: 'Mafia Pro is an app for playing Mafia (Werewolf) with friends: at a real table with a host, or online with everyone on their own phone. No paper cards, no sign-up — it opens right inside Telegram.',
      featuresH: 'What Mafia Pro does',
      features: [
        ['Card dealing', 'Roles go straight to players’ phones, or the host shows them. 58 roles, with a balanced setup for 7 to 24 players.'],
        ['A host in your pocket', 'The night step by step in the right order, speech timers, nominations, voting with re-votes and the “everyone out” vote.'],
        ['Online Mafia', 'Everyone plays from their own phone: the mafia picks a target, roles make their moves, everybody votes. Voice runs in the table’s Discord channel.'],
        ['Classic 10-player', 'Tournament rules: the Don, two mafia, the Sheriff and six citizens. One-minute speeches, fouls, the mafia’s night-zero deal.'],
        ['Rating and review', 'After the game: every move reviewed, points for the win and useful plays, a shared rating, friends and clubs.'],
        ['Five languages', 'English, Ukrainian, Russian, Polish and Armenian — every player picks their own.']
      ],
      formatsH: 'Two ways to play', rolesH: 'Mafia roles', rolesLead: 'All 58 cards with rules and tips: from the Don and the Sheriff to the Maniac and the Werewolf.',
      allRoles: 'All roles', rulesLink: 'Game rules', scenLink: 'Setups and scenarios', faqH: 'Questions and answers',
      faq: [
        ['How much does Mafia Pro cost?', 'Classic 10-player Mafia and role Mafia with the base cards are free. Premium cards, scenarios and the “Diplomatic Game” pack are bought with Telegram Stars.'],
        ['Do I need to install anything?', 'No. Mafia Pro is a Telegram Mini App: open @mafiaprof_bot and tap “Play”. There is also a web version for the browser.'],
        ['How many players do I need?', '7 to 24. Classic Mafia takes exactly 10. The app builds a balanced set of roles for you, and you can change it by hand.'],
        ['Can I play Mafia online?', 'Yes. In the online format every player moves from their own phone, and the host can switch on a Discord voice channel for the whole table.'],
        ['Do we need a host?', 'At a live table the host runs the game from a phone and the app prompts every step. Online, anyone at the table can host.'],
        ['Which languages does the app support?', 'English, Ukrainian, Russian, Polish and Armenian.']
      ]
    },
    roles: {
      title: 'Mafia game roles: all 58 cards explained | Mafia Pro',
      desc: 'The full list of Mafia party game roles: the Don, Sheriff, Doctor, Maniac, Werewolf and 50 more. What each role does at night and by day, tips and turn order.',
      h1: 'Mafia roles', lead: 'Every Mafia Pro card by team: what the role does, when it wakes up and how to play it. Tap a card for the full description.'
    },
    role: {
      title: n => `${n} — Mafia game role | Mafia Pro`,
      desc: (n, s) => `${n} — a role in the Mafia party game. ${s} Role rules and tips.`,
      h1: n => `${n}: a Mafia game role`,
      team: 'Team', checks: 'Checks as', kind: 'Type', access: 'Access', free: 'free', premium: 'premium card', pack: p => `“${p}” pack`,
      how: 'How the role plays', tip: 'Tip', story: 'Story', related: 'Other roles of the team', back: 'All roles'
    },
    rules: {
      title: 'How to play Mafia: rules of the party game | Mafia Pro',
      desc: 'How to play Mafia: teams, night and day, voting, ties and re-votes, how each side wins. Tournament rules for classic 10-player Mafia and the online format.',
      h1: 'How to play Mafia', lead: 'How a game goes, what makes classic tournament Mafia different and how to play online — short and to the point.'
    },
    scen: {
      title: 'Mafia roles by number of players & scenarios | Mafia Pro',
      desc: 'Which roles to use for 7, 8, 10, 12 and up to 24 players: ready balanced Mafia setups, the classic 10-player game and themed scenarios.',
      h1: 'Setups and scenarios', lead: 'Balanced setups for any group and scenarios with special roles.',
      byN: 'Roles by number of players', players: n => `${n} players`, scenH: 'Scenarios', special: 'Special roles', count: 'Players', classicH: 'Classic'
    },
    footer: 'Mafia Pro — the Mafia party game on Telegram. Made for live and online tables.'
  },

  pl: {
    html: 'pl', og: 'pl_PL', native: 'Polski',
    nav: { home: 'Start', roles: 'Role', rules: 'Zasady', scenarios: 'Scenariusze', play: 'Graj' },
    ctaTg: 'Graj w Telegramie', ctaWeb: 'Otwórz wersję webową',
    home: {
      title: 'Mafia w Telegramie — online i przy stole | Mafia Pro',
      desc: 'Gra w Mafię prosto w Telegramie: aplikacja rozdaje karty, prowadzi noc, dzień i głosowanie. 58 ról, klasyka na 10 osób, stoły online z głosem na Discordzie. Za darmo.',
      h1: 'Mafia w Telegramie',
      lead: 'Mafia Pro to aplikacja do gry w Mafię ze znajomymi: przy prawdziwym stole z prowadzącym albo online, każdy na swoim telefonie. Bez papierowych kart i bez rejestracji — otwiera się w Telegramie.',
      featuresH: 'Co potrafi Mafia Pro',
      features: [
        ['Rozdawanie kart', 'Role trafiają na telefony graczy albo prowadzący pokazuje je sam. 58 ról, skład dobierany do liczby graczy od 7 do 24.'],
        ['Prowadzący w kieszeni', 'Noc krok po kroku we właściwej kolejności, minutnik przemów, nominacje, głosowanie z dogrywką i podniesieniem wszystkich.'],
        ['Mafia online', 'Każdy gra na swoim telefonie: mafia wybiera cel, role wykonują ruchy, wszyscy głosują sami. Głos — na kanale Discord stołu.'],
        ['Klasyka na 10', 'Zasady turniejowe: Don, dwie mafie, Szeryf i sześciu cywilów. Minutowe przemowy, faule, umowa mafii w zerowej nocy.'],
        ['Ranking i analiza', 'Po grze: analiza każdego ruchu, punkty za wygraną i trafne zagrania, wspólny ranking, znajomi i kluby.'],
        ['Pięć języków', 'Polski, angielski, ukraiński, rosyjski i ormiański — każdy gracz wybiera swój.']
      ],
      formatsH: 'Dwa sposoby gry', rolesH: 'Role w Mafii', rolesLead: 'Wszystkie 58 kart z zasadami i poradami: od Dona i Szeryfa po Maniaka i Wilkołaka.',
      allRoles: 'Wszystkie role', rulesLink: 'Zasady gry', scenLink: 'Składy i scenariusze', faqH: 'Pytania i odpowiedzi',
      faq: [
        ['Ile kosztuje Mafia Pro?', 'Klasyczna Mafia na 10 graczy i Mafia z rolami z podstawowymi kartami są darmowe. Karty premium, scenariusze i pakiet „Gra dyplomatyczna” kupuje się za Telegram Stars.'],
        ['Czy trzeba coś instalować?', 'Nie. Mafia Pro to mini aplikacja Telegrama: otwórz @mafiaprof_bot i naciśnij „Graj”. Jest też wersja w przeglądarce.'],
        ['Ilu graczy potrzeba?', 'Od 7 do 24. Klasyka — dokładnie 10. Aplikacja sama dobiera zrównoważony skład ról, można go zmienić ręcznie.'],
        ['Czy można grać w Mafię online?', 'Tak. W formacie online każdy gracz wykonuje ruchy na swoim telefonie, a prowadzący może włączyć kanał głosowy Discord dla całego stołu.'],
        ['Czy potrzebny jest prowadzący?', 'Przy stole prowadzący kieruje grą z telefonu, a aplikacja podpowiada każdy krok. Online prowadzącym może być każdy przy stole.'],
        ['W jakich językach działa aplikacja?', 'Po polsku, angielsku, ukraińsku, rosyjsku i ormiańsku.']
      ]
    },
    roles: {
      title: 'Role w Mafii: wszystkie 58 kart z opisem | Mafia Pro',
      desc: 'Pełna lista ról do gry w Mafię: Don, Szeryf, Lekarz, Maniak, Wilkołak i 50 innych kart. Co robi każda rola w nocy i w dzień, porady i kolejność ruchów.',
      h1: 'Role w Mafii', lead: 'Wszystkie karty Mafia Pro według drużyn: co robi rola, kiedy się budzi i jak nią grać. Kliknij kartę, aby zobaczyć pełny opis.'
    },
    role: {
      title: n => `${n} — rola w grze Mafia | Mafia Pro`,
      desc: (n, s) => `${n} — rola w grze Mafia. ${s} Zasady roli i porady.`,
      h1: n => `${n}: rola w grze Mafia`,
      team: 'Drużyna', checks: 'Przy sprawdzeniu', kind: 'Typ', access: 'Dostęp', free: 'za darmo', premium: 'karta premium', pack: p => `pakiet „${p}”`,
      how: 'Jak grać tą rolą', tip: 'Porada', story: 'Historia', related: 'Inne role drużyny', back: 'Wszystkie role'
    },
    rules: {
      title: 'Zasady gry w Mafię: klasyka i role | Mafia Pro',
      desc: 'Jak grać w Mafię: drużyny, noc i dzień, głosowanie, remis i dogrywka, warunki zwycięstwa. Turniejowe zasady klasyki na 10 graczy i format online.',
      h1: 'Zasady gry w Mafię', lead: 'Przebieg gry, czym różni się turniejowa klasyka i jak grać online — krótko i konkretnie.'
    },
    scen: {
      title: 'Mafia: role według liczby graczy i scenariusze | Mafia Pro',
      desc: 'Jakie role wybrać na 7, 8, 10, 12 i do 24 graczy: gotowe zrównoważone składy do Mafii, klasyka na 10 i scenariusze tematyczne.',
      h1: 'Składy i scenariusze', lead: 'Zrównoważone składy dla każdej grupy i scenariusze ze specjalnymi rolami.',
      byN: 'Role według liczby graczy', players: n => `${n} ${plPl(n, 'gracz', 'graczy', 'graczy')}`, scenH: 'Scenariusze', special: 'Specjalne role', count: 'Graczy', classicH: 'Klasyka'
    },
    footer: 'Mafia Pro — gra Mafia w Telegramie. Dla stołów na żywo i online.'
  },

  hy: {
    html: 'hy', og: 'hy_AM', native: 'Հայերեն',
    nav: { home: 'Գլխավոր', roles: 'Դերեր', rules: 'Կանոններ', scenarios: 'Սցենարներ', play: 'Խաղալ' },
    ctaTg: 'Խաղալ Telegram-ում', ctaWeb: 'Բացել վեբ տարբերակը',
    home: {
      title: 'Մաֆիա Telegram-ում — առցանց և սեղանի շուրջ | Mafia Pro',
      desc: 'Մաֆիա խաղը հենց Telegram-ում. հավելվածը բաժանում է քարտերը, վարում գիշերը, ցերեկը և քվեարկությունը։ 58 դեր, դասական խաղ 10 հոգու համար, առցանց սեղաններ։ Անվճար։',
      h1: 'Մաֆիա Telegram-ում',
      lead: 'Mafia Pro-ն հավելված է ընկերների հետ մաֆիա խաղալու համար՝ սեղանի շուրջ վարողի հետ կամ առցանց, յուրաքանչյուրն իր հեռախոսից։ Առանց թղթե քարտերի և գրանցման՝ բացվում է հենց Telegram-ում։',
      featuresH: 'Ինչ է անում Mafia Pro-ն',
      features: [
        ['Քարտերի բաժանում', 'Դերերը գալիս են խաղացողների հեռախոսներին, կամ վարողն ինքն է ցույց տալիս։ 58 դեր, կազմը ընտրվում է 7-ից 24 խաղացողի համար։'],
        ['Վարողը գրպանում', 'Գիշերը քայլ առ քայլ ճիշտ հերթականությամբ, ելույթների ժամաչափ, թեկնածուներ, քվեարկություն և վերաքվեարկություն։'],
        ['Առցանց մաֆիա', 'Յուրաքանչյուրը խաղում է իր հեռախոսից. մաֆիան ընտրում է թիրախը, դերերը կատարում են իրենց քայլերը, բոլորը քվեարկում են։ Ձայնը՝ Discord-ում։'],
        ['Դասական խաղ 10 հոգու համար', 'Սպորտային կանոններ. Դոն, երկու մաֆիա, Շերիֆ և վեց խաղաղ բնակիչ։ Մեկ րոպեանոց ելույթներ, ֆոլեր։'],
        ['Վարկանիշ և վերլուծություն', 'Խաղից հետո՝ յուրաքանչյուր քայլի վերլուծություն, միավորներ, ընդհանուր վարկանիշ, ընկերներ և ակումբներ։'],
        ['Հինգ լեզու', 'Հայերեն, ռուսերեն, ուկրաիներեն, անգլերեն և լեհերեն՝ յուրաքանչյուր խաղացող ընտրում է իր լեզուն։']
      ],
      formatsH: 'Խաղի երկու ձևաչափ', rolesH: 'Մաֆիայի դերերը', rolesLead: 'Բոլոր 58 քարտերը կանոններով և խորհուրդներով՝ Դոնից և Շերիֆից մինչև Մոլագարն ու Գայլամարդը։',
      allRoles: 'Բոլոր դերերը', rulesLink: 'Խաղի կանոններ', scenLink: 'Կազմեր և սցենարներ', faqH: 'Հարցեր և պատասխաններ',
      faq: [
        ['Որքա՞ն արժե Mafia Pro-ն', 'Դասական մաֆիան 10 խաղացողի համար և դերային մաֆիան հիմնական քարտերով անվճար են։ Պրեմիում քարտերը, սցենարները և «Դիվանագիտական խաղ» փաթեթը գնվում են Telegram Stars-ով։'],
        ['Պե՞տք է արդյոք որևէ բան տեղադրել', 'Ոչ։ Mafia Pro-ն Telegram-ի մինի հավելված է. բացեք @mafiaprof_bot-ը և սեղմեք «Խաղալ»։ Կա նաև վեբ տարբերակ դիտարկիչի համար։'],
        ['Քանի՞ խաղացող է պետք', '7-ից 24։ Դասական խաղի համար՝ ճիշտ 10։ Հավելվածն ինքն է ընտրում հավասարակշռված կազմը, այն կարելի է փոխել ձեռքով։'],
        ['Կարելի՞ է մաֆիա խաղալ առցանց', 'Այո։ Առցանց ձևաչափում յուրաքանչյուր խաղացող խաղում է իր հեռախոսից, իսկ վարողը կարող է միացնել Discord-ի ձայնային ալիք ամբողջ սեղանի համար։'],
        ['Պե՞տք է արդյոք վարող', 'Կենդանի խաղում վարողը վարում է խաղը հեռախոսից, հավելվածը հուշում է յուրաքանչյուր քայլ։ Առցանց վարող կարող է լինել սեղանի ցանկացած մասնակից։'],
        ['Ի՞նչ լեզուներով է աշխատում հավելվածը', 'Հայերեն, ռուսերեն, ուկրաիներեն, անգլերեն և լեհերեն։']
      ]
    },
    roles: {
      title: 'Մաֆիայի դերերը. բոլոր 58 քարտերը նկարագրությամբ | Mafia Pro',
      desc: 'Մաֆիա խաղի դերերի ամբողջական ցանկը. Դոն, Շերիֆ, Բժիշկ, Մոլագար, Գայլամարդ և ևս 50 քարտ։ Ինչ է անում յուրաքանչյուր դեր գիշերը և ցերեկը, խորհուրդներ։',
      h1: 'Մաֆիայի դերերը', lead: 'Mafia Pro-ի բոլոր քարտերը ըստ թիմերի. ինչ է անում դերը, երբ է արթնանում և ինչպես խաղալ դրանով։'
    },
    role: {
      title: n => `${n} — դեր Մաֆիա խաղում | Mafia Pro`,
      desc: (n, s) => `${n} — դեր Մաֆիա խաղում։ ${s} Դերի կանոններ և խորհուրդներ։`,
      h1: n => `${n}. դեր Մաֆիա խաղում`,
      team: 'Թիմ', checks: 'Ստուգման ժամանակ', kind: 'Տեսակ', access: 'Հասանելիություն', free: 'անվճար', premium: 'պրեմիում քարտ', pack: p => `«${p}» փաթեթ`,
      how: 'Ինչպես խաղալ այս դերով', tip: 'Խորհուրդ', story: 'Պատմություն', related: 'Թիմի մյուս դերերը', back: 'Բոլոր դերերը'
    },
    rules: {
      title: 'Մաֆիա խաղի կանոնները | Mafia Pro',
      desc: 'Ինչպես խաղալ մաֆիա. թիմեր, գիշեր և ցերեկ, քվեարկություն, ոչ-ոքի և վերաքվեարկություն, հաղթանակի պայմաններ։ Դասական խաղ 10 հոգու համար և առցանց ձևաչափ։',
      h1: 'Մաֆիա խաղի կանոնները', lead: 'Ինչպես է ընթանում խաղը, ինչով է տարբերվում սպորտային դասականը և ինչպես խաղալ առցանց։'
    },
    scen: {
      title: 'Մաֆիա. դերեր ըստ խաղացողների թվի և սցենարներ | Mafia Pro',
      desc: 'Որ դերերն ընտրել 7, 8, 10, 12 և մինչև 24 խաղացողի համար. պատրաստի հավասարակշռված կազմեր, դասական խաղ և թեմատիկ սցենարներ։',
      h1: 'Կազմեր և սցենարներ', lead: 'Հավասարակշռված կազմեր ցանկացած ընկերախմբի համար և սցենարներ հատուկ դերերով։',
      byN: 'Դերեր ըստ խաղացողների թվի', players: n => `${n} խաղացող`, scenH: 'Սցենարներ', special: 'Հատուկ դերեր', count: 'Խաղացողներ', classicH: 'Դասական'
    },
    footer: 'Mafia Pro — Մաֆիա խաղը Telegram-ում։ Կենդանի և առցանց սեղանների համար։'
  }
};
