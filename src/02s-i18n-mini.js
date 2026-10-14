/* ============================================================
   SMALL TABLE (v50): scenarios for 5–6 players — "Sapper and Bomb" and "Corruption";
   two new free cards: Ninja (city, dodges one shot a night) and Corrupter (mafia, recruits instead of shooting).
   ============================================================ */
(function () {
  const R = {};
  R.ru = {
    roles: {
      ninja: { name: 'Ниндзя', mono: 'Нн', kind: 'Пассивная · ночь', short: 'Каждую ночь уворачивается от одного выстрела.', rules: ['Первый выстрел в Ниндзя за ночь — промах: он уворачивается. Второй выстрел той же ночью убивает.', 'Уворачивается каждую ночь — способность не кончается.', 'Удар Палача и огонь Поджигателя — не выстрелы: от них не увернуться.', 'Днём выбывает голосованием как обычно.', 'Ночью не просыпается. Для проверок — красный.'], lore: 'На крышах Кастельмара его никто не видел — только слышали, как пуля звякнула о черепицу там, где он стоял секунду назад.', tip: 'Не спешите раскрываться: пока мафия не знает, кто Ниндзя, её выстрел в вас пропадёт.' },
      corrupter: { name: 'Коррупционер', mono: 'Кр', kind: 'Активная · ночь', short: 'Мафия, которая не стреляет: вербует игрока за столом.', rules: ['Играет за мафию, но не стреляет.', 'В ночь знакомства просыпается и показывает игрока — тот завербован. Ведущий касается его, он открывает глаза и видит Коррупционера.', 'Завербованный остаётся со своей картой и способностями, но играет за мафию — до конца игры или пока не выбудет.', 'Завербованный не может голосовать против Коррупционера, стрелять в него и признаваться, что его купили.', 'Нового игрока Коррупционер покупает, только когда завербованный выбыл: просыпается следующей ночью и выбирает снова.', 'Для проверок — чёрный; завербованный — по своей карте.'], lore: 'Он никогда не носит оружия. Конверт во внутреннем кармане стреляет точнее.', tip: 'Покупайте того, кто громче всех защищает город: его голос и доверие к нему теперь работают на вас.' }
    },
    hooks: { ninja: 'Ниндзя уворачивается от выстрела', corrupter: 'Коррупционер перекупает игроков' },
    abilities: { recruit: 'вербовка' },
    e: {
      recruitScript0: 'Просыпается <b>Коррупционер</b> и показывает, кого вербует. Коррупционер поднимает руку; коснитесь завербованного — тот открывает глаза, видит Коррупционера, и оба засыпают.',
      recruitScript: 'Завербованный выбыл. Просыпается <b>Коррупционер</b> и показывает нового игрока. Коррупционер поднимает руку; коснитесь завербованного — тот открывает глаза и видит его.',
      recruitDone: '{target} завербован Коррупционером ({actor}): играет за мафию, не голосует против него и не стреляет в него.',
      whyRecruiter: 'это его Коррупционер', whyMafiaAlready: 'уже играет за мафию',
      ninjaDodge: '{by}: выстрел в {target} — Ниндзя уворачивается.',
      bhFound: 'Покажите Сапёру 👍: {target} — Бомба. Она обезврежена, теперь её можно выгонять.',
      bhNotFound: 'Покажите Сапёру 👎: {target} — не Бомба.',
      bhCityTitle: 'Город победил', bhBombTitle: 'Бомба взорвалась',
      bhDefusedOut: 'Город выгнал обезвреженную Бомбу — {player}.',
      bhExploded: '{player} — Бомба, и её не успели обезвредить: взрыв забрал двух соседей. Город проиграл.',
      bhDuelSapper: 'Остались Сапёр и Бомба — Сапёр её обезвредил.',
      bhDuelCitizen: 'Бомба осталась один на один с мирным — обезвредить её некому. Город проиграл.',
      bhNoSapper: 'Сапёр выбыл, а Бомба не обезврежена — обезвредить её больше некому. Город проиграл.'
    },
    ui: {
      miniMenu: 'Малый стол', miniMenuD: '5–6 игроков · Сапёр и Бомба, Коррупция', miniTitle: 'Малый стол', miniSub: 'Сценарии на 5–6 игроков',
      miniHint: 'Для маленькой компании: у каждого своя роль, партии короткие. Баланс каждого состава проверен симуляцией.',
      miniPick: 'Сколько игроков', miniPlayers: '{n} игроков', miniCards: 'Карты: {list}', miniRules: 'Правила', miniUse: 'Создать игру',
      miniSim: 'По симуляции: {line} · {nights} ночей', simBomb: 'Бомба {v}%', okSimMini: ' Сценарий «{name}». По симуляции: {line}.',
      tagRecruited: 'завербован', voteRecruitBlocked: 'Завербованный не может голосовать против своего Коррупционера.',
      tbRecruited: 'Вас завербовал Коррупционер — {seat} · {name}. Вы играете за мафию: не голосуйте против него, не стреляйте в него и не признавайтесь.',
      tbRecruits: 'Ваш завербованный: {seat} · {name}'
    },
    mini: {
      bomb_hunt: { name: 'Сапёр и Бомба', lore: 'Где-то за столом тикает. Ночью Сапёр ищет Бомбу, днём город решает, кого выгнать, — и боится ошибиться.', rules: ['Бомба играет против всех, остальные — город.', 'Ночью просыпается только Сапёр и показывает игрока. Ведущий молча отвечает: 👍 — это Бомба, она обезврежена; 👎 — нет.', 'Игроки выбывают только дневным голосованием.', 'Выгнали обезвреженную Бомбу — город победил. Выгнали необезвреженную — она взрывается и забирает двух ближайших соседей: город проиграл.', 'Остались Сапёр и Бомба — победа Сапёра. Бомба один на один с другим игроком — город проиграл.', 'Сапёр выбыл, а Бомба ещё не обезврежена — город проиграл.'] },
      corruption: { name: 'Коррупция', lore: 'В этом городе не стреляют — в этом городе покупают. Коррупционер вербует по одному, и никто не знает, кто уже взял конверт.', rules: ['Коррупционер — мафия, но не стреляет: в ночь знакомства он вербует игрока.', 'Завербованный остаётся со своей картой, но играет за мафию: не голосует против Коррупционера, не стреляет в него и не признаётся.', 'Выбыл завербованный — следующей ночью Коррупционер покупает нового.', 'Маньяк играет сам за себя; если завербовали его — стреляет за мафию.', 'На 6 игроков за столом ещё Ниндзя: каждую ночь уворачивается от одного выстрела.', 'Мафия побеждает, когда её больше, чем остальных; город — когда не осталось ни Коррупционера, ни его людей.'] }
    }
  };
  R.uk = {
    roles: {
      ninja: { name: 'Ніндзя', mono: 'Нн', kind: 'Пасивна · ніч', short: 'Щоночі ухиляється від одного пострілу.', rules: ['Перший постріл у Ніндзя за ніч — промах: він ухиляється. Другий постріл тієї ж ночі вбиває.', 'Ухиляється щоночі — здібність не закінчується.', 'Удар Ката й вогонь Палія — не постріли: від них не ухилитися.', 'Удень вибуває голосуванням як зазвичай.', 'Вночі не прокидається. Для перевірок — червоний.'], lore: 'На дахах Кастельмара його ніхто не бачив — лише чули, як куля дзенькнула об черепицю там, де він стояв секунду тому.', tip: 'Не поспішайте розкриватися: поки мафія не знає, хто Ніндзя, її постріл у вас пропаде.' },
      corrupter: { name: 'Корупціонер', mono: 'Кр', kind: 'Активна · ніч', short: 'Мафія, що не стріляє: вербує гравця за столом.', rules: ['Грає за мафію, але не стріляє.', 'У ніч знайомства прокидається й показує гравця — той завербований. Ведучий торкається його, він розплющує очі й бачить Корупціонера.', 'Завербований лишається зі своєю картою і здібностями, але грає за мафію — до кінця гри або доки не вибуде.', 'Завербований не може голосувати проти Корупціонера, стріляти в нього й зізнаватися, що його купили.', 'Нового гравця Корупціонер купує, лише коли завербований вибув: прокидається наступної ночі й обирає знову.', 'Для перевірок — чорний; завербований — за своєю картою.'], lore: 'Він ніколи не носить зброї. Конверт у внутрішній кишені стріляє влучніше.', tip: 'Купуйте того, хто найгучніше захищає місто: його голос і довіра до нього тепер працюють на вас.' }
    },
    hooks: { ninja: 'Ніндзя ухиляється від пострілу', corrupter: 'Корупціонер перекуповує гравців' },
    abilities: { recruit: 'вербування' },
    e: {
      recruitScript0: 'Прокидається <b>Корупціонер</b> і показує, кого вербує. Корупціонер піднімає руку; торкніться завербованого — той розплющує очі, бачить Корупціонера, і обоє засинають.',
      recruitScript: 'Завербований вибув. Прокидається <b>Корупціонер</b> і показує нового гравця. Корупціонер піднімає руку; торкніться завербованого — той розплющує очі й бачить його.',
      recruitDone: '{target} завербований Корупціонером ({actor}): грає за мафію, не голосує проти нього й не стріляє в нього.',
      whyRecruiter: 'це його Корупціонер', whyMafiaAlready: 'уже грає за мафію',
      ninjaDodge: '{by}: постріл у {target} — Ніндзя ухиляється.',
      bhFound: 'Покажіть Саперу 👍: {target} — Бомба. Її знешкоджено, тепер її можна виганяти.',
      bhNotFound: 'Покажіть Саперу 👎: {target} — не Бомба.',
      bhCityTitle: 'Місто перемогло', bhBombTitle: 'Бомба вибухнула',
      bhDefusedOut: 'Місто вигнало знешкоджену Бомбу — {player}.',
      bhExploded: '{player} — Бомба, і її не встигли знешкодити: вибух забрав двох сусідів. Місто програло.',
      bhDuelSapper: 'Лишилися Сапер і Бомба — Сапер її знешкодив.',
      bhDuelCitizen: 'Бомба лишилася сам на сам із мирним — знешкодити її нікому. Місто програло.',
      bhNoSapper: 'Сапер вибув, а Бомбу не знешкоджено — знешкодити її більше нікому. Місто програло.'
    },
    ui: {
      miniMenu: 'Малий стіл', miniMenuD: '5–6 гравців · Сапер і Бомба, Корупція', miniTitle: 'Малий стіл', miniSub: 'Сценарії на 5–6 гравців',
      miniHint: 'Для невеликої компанії: у кожного своя роль, партії короткі. Баланс кожного складу перевірено симуляцією.',
      miniPick: 'Скільки гравців', miniPlayers: '{n} гравців', miniCards: 'Карти: {list}', miniRules: 'Правила', miniUse: 'Створити гру',
      miniSim: 'За симуляцією: {line} · {nights} ночей', simBomb: 'Бомба {v}%', okSimMini: ' Сценарій «{name}». За симуляцією: {line}.',
      tagRecruited: 'завербований', voteRecruitBlocked: 'Завербований не може голосувати проти свого Корупціонера.',
      tbRecruited: 'Вас завербував Корупціонер — {seat} · {name}. Ви граєте за мафію: не голосуйте проти нього, не стріляйте в нього й не зізнавайтеся.',
      tbRecruits: 'Ваш завербований: {seat} · {name}'
    },
    mini: {
      bomb_hunt: { name: 'Сапер і Бомба', lore: 'Десь за столом цокає. Уночі Сапер шукає Бомбу, удень місто вирішує, кого вигнати, — і боїться помилитися.', rules: ['Бомба грає проти всіх, решта — місто.', 'Уночі прокидається тільки Сапер і показує гравця. Ведучий мовчки відповідає: 👍 — це Бомба, її знешкоджено; 👎 — ні.', 'Гравці вибувають тільки денним голосуванням.', 'Вигнали знешкоджену Бомбу — місто перемогло. Вигнали незнешкоджену — вона вибухає й забирає двох найближчих сусідів: місто програло.', 'Лишилися Сапер і Бомба — перемога Сапера. Бомба сам на сам з іншим гравцем — місто програло.', 'Сапер вибув, а Бомбу ще не знешкоджено — місто програло.'] },
      corruption: { name: 'Корупція', lore: 'У цьому місті не стріляють — у цьому місті купують. Корупціонер вербує по одному, і ніхто не знає, хто вже взяв конверт.', rules: ['Корупціонер — мафія, але не стріляє: у ніч знайомства він вербує гравця.', 'Завербований лишається зі своєю картою, але грає за мафію: не голосує проти Корупціонера, не стріляє в нього й не зізнається.', 'Вибув завербований — наступної ночі Корупціонер купує нового.', 'Маніяк грає сам за себе; якщо завербували його — стріляє за мафію.', 'На 6 гравців за столом ще Ніндзя: щоночі ухиляється від одного пострілу.', 'Мафія перемагає, коли її більше, ніж решти; місто — коли не лишилося ні Корупціонера, ні його людей.'] }
    }
  };
  R.en = {
    roles: {
      ninja: { name: 'Ninja', mono: 'Nj', kind: 'Passive · night', short: 'Dodges one shot every night.', rules: ['The first shot at the Ninja each night misses: he dodges it. A second shot the same night kills.', 'He dodges every night; the ability never runs out.', 'The Executioner’s strike and the Arsonist’s fire are not shots: they cannot be dodged.', 'By day he can be voted out as usual.', 'Does not wake at night. Checks show red.'], lore: 'Nobody has ever seen him on the roofs of Castelmar — people only hear a bullet ring off the tiles where he stood a second ago.', tip: 'Do not reveal yourself too soon: while the mafia does not know who the Ninja is, their shot at you is wasted.' },
      corrupter: { name: 'Corrupter', mono: 'Cr', kind: 'Active · night', short: 'A mafia member who never shoots: he recruits a player at the table.', rules: ['Plays for the mafia but does not shoot.', 'On the acquaintance night he wakes and points at a player — that player is recruited. The host touches them; they open their eyes and see the Corrupter.', 'The recruit keeps their card and abilities but plays for the mafia until the game ends or they leave.', 'The recruit may not vote against the Corrupter, shoot him or admit they were bought.', 'The Corrupter buys a new player only after the recruit has left: he wakes the next night and chooses again.', 'Checks show him black; the recruit shows the colour of their own card.'], lore: 'He never carries a gun. The envelope in his inside pocket hits harder.', tip: 'Buy whoever defends the town the loudest: their vote and the trust in them now work for you.' }
    },
    hooks: { ninja: 'the Ninja dodges a shot', corrupter: 'the Corrupter buys players over' },
    abilities: { recruit: 'recruitment' },
    e: {
      recruitScript0: 'The <b>Corrupter</b> wakes and points at the player he recruits. The Corrupter raises a hand; touch the recruit — they open their eyes, see the Corrupter, and both go back to sleep.',
      recruitScript: 'The recruit has left. The <b>Corrupter</b> wakes and points at a new player. The Corrupter raises a hand; touch the recruit — they open their eyes and see him.',
      recruitDone: '{target} is recruited by the Corrupter ({actor}): plays for the mafia, never votes against him or shoots him.',
      whyRecruiter: 'this is their Corrupter', whyMafiaAlready: 'already plays for the mafia',
      ninjaDodge: '{by}: a shot at {target} — the Ninja dodges it.',
      bhFound: 'Show the Sapper 👍: {target} is the Bomb. It is defused — now it can be voted out.',
      bhNotFound: 'Show the Sapper 👎: {target} is not the Bomb.',
      bhCityTitle: 'The town wins', bhBombTitle: 'The Bomb went off',
      bhDefusedOut: 'The town voted out the defused Bomb — {player}.',
      bhExploded: '{player} is the Bomb, and nobody defused it in time: the blast took both neighbours. The town lost.',
      bhDuelSapper: 'Only the Sapper and the Bomb are left — the Sapper defused it.',
      bhDuelCitizen: 'The Bomb is left alone with a townsperson — nobody can defuse it. The town lost.',
      bhNoSapper: 'The Sapper is out and the Bomb is not defused — nobody can defuse it now. The town lost.'
    },
    ui: {
      miniMenu: 'Small table', miniMenuD: '5–6 players · Sapper and Bomb, Corruption', miniTitle: 'Small table', miniSub: 'Scenarios for 5–6 players',
      miniHint: 'For a small group: everyone has a role and games are short. Each line-up was balance-checked by simulation.',
      miniPick: 'How many players', miniPlayers: '{n} players', miniCards: 'Cards: {list}', miniRules: 'Rules', miniUse: 'Create game',
      miniSim: 'Simulation: {line} · {nights} nights', simBomb: 'Bomb {v}%', okSimMini: ' Scenario “{name}”. Simulation: {line}.',
      tagRecruited: 'recruited', voteRecruitBlocked: 'A recruit cannot vote against their Corrupter.',
      tbRecruited: 'You were recruited by the Corrupter — {seat} · {name}. You play for the mafia: do not vote against him, do not shoot him and do not admit it.',
      tbRecruits: 'Your recruit: {seat} · {name}'
    },
    mini: {
      bomb_hunt: { name: 'Sapper and Bomb', lore: 'Something is ticking at the table. By night the Sapper looks for the Bomb; by day the town decides whom to vote out — and dreads getting it wrong.', rules: ['The Bomb plays against everyone; everyone else is the town.', 'At night only the Sapper wakes and points at a player. The host answers silently: 👍 — it is the Bomb, now defused; 👎 — it is not.', 'Players leave only by the day vote.', 'Vote out the defused Bomb — the town wins. Vote out a live one — it explodes and takes its two nearest neighbours: the town lost.', 'Only the Sapper and the Bomb left — the Sapper wins. The Bomb alone with anyone else — the town lost.', 'The Sapper is out and the Bomb is not defused yet — the town lost.'] },
      corruption: { name: 'Corruption', lore: 'Nobody shoots in this town — here they buy. The Corrupter recruits one player at a time, and nobody knows who has already taken the envelope.', rules: ['The Corrupter is mafia but does not shoot: on the acquaintance night he recruits a player.', 'The recruit keeps their card but plays for the mafia: never votes against the Corrupter, never shoots him and never admits it.', 'If the recruit leaves, the Corrupter buys a new one the next night.', 'The Maniac plays for himself; if he is the one recruited, he shoots for the mafia.', 'With 6 players there is also the Ninja: he dodges one shot every night.', 'The mafia wins when it outnumbers everyone else; the town wins when neither the Corrupter nor his people are left.'] }
    }
  };
  R.pl = {
    roles: {
      ninja: { name: 'Ninja', mono: 'Nj', kind: 'Pasywna · noc', short: 'Co noc unika jednego strzału.', rules: ['Pierwszy strzał w Ninję w ciągu nocy chybia: Ninja robi unik. Drugi strzał tej samej nocy zabija.', 'Robi unik każdej nocy — zdolność się nie kończy.', 'Cios Kata i ogień Podpalacza to nie strzały: przed nimi nie da się uskoczyć.', 'W dzień odpada w głosowaniu jak zwykle.', 'W nocy się nie budzi. Przy sprawdzeniu — czerwony.'], lore: 'Nikt nie widział go na dachach Castelmaru — słychać tylko, jak kula dzwoni o dachówkę tam, gdzie stał sekundę wcześniej.', tip: 'Nie ujawniaj się za wcześnie: dopóki mafia nie wie, kto jest Ninją, jej strzał w ciebie przepada.' },
      corrupter: { name: 'Korupcjonista', mono: 'Kr', kind: 'Aktywna · noc', short: 'Mafioso, który nie strzela: werbuje gracza przy stole.', rules: ['Gra dla mafii, ale nie strzela.', 'W noc zapoznania budzi się i wskazuje gracza — ten zostaje zwerbowany. Prowadzący go dotyka, gracz otwiera oczy i widzi Korupcjonistę.', 'Zwerbowany zachowuje swoją kartę i zdolności, ale gra dla mafii — do końca gry albo dopóki nie odpadnie.', 'Zwerbowany nie może głosować przeciw Korupcjoniście, strzelać do niego ani przyznać się, że go kupiono.', 'Nowego gracza Korupcjonista kupuje dopiero, gdy zwerbowany odpadł: budzi się następnej nocy i wybiera ponownie.', 'Przy sprawdzeniu — czarny; zwerbowany — według swojej karty.'], lore: 'Nigdy nie nosi broni. Koperta w wewnętrznej kieszeni trafia celniej.', tip: 'Kupuj tego, kto najgłośniej broni miasta: jego głos i zaufanie do niego pracują teraz dla ciebie.' }
    },
    hooks: { ninja: 'Ninja unika strzału', corrupter: 'Korupcjonista przekupuje graczy' },
    abilities: { recruit: 'werbunek' },
    e: {
      recruitScript0: 'Budzi się <b>Korupcjonista</b> i wskazuje, kogo werbuje. Korupcjonista podnosi rękę; dotknij zwerbowanego — otwiera oczy, widzi Korupcjonistę i obaj zasypiają.',
      recruitScript: 'Zwerbowany odpadł. Budzi się <b>Korupcjonista</b> i wskazuje nowego gracza. Korupcjonista podnosi rękę; dotknij zwerbowanego — otwiera oczy i go widzi.',
      recruitDone: '{target} zwerbowany przez Korupcjonistę ({actor}): gra dla mafii, nie głosuje przeciw niemu i do niego nie strzela.',
      whyRecruiter: 'to jego Korupcjonista', whyMafiaAlready: 'już gra dla mafii',
      ninjaDodge: '{by}: strzał w {target} — Ninja robi unik.',
      bhFound: 'Pokaż Saperowi 👍: {target} to Bomba. Rozbrojona — teraz można ją wyrzucić.',
      bhNotFound: 'Pokaż Saperowi 👎: {target} to nie Bomba.',
      bhCityTitle: 'Miasto wygrało', bhBombTitle: 'Bomba wybuchła',
      bhDefusedOut: 'Miasto wyrzuciło rozbrojoną Bombę — {player}.',
      bhExploded: '{player} to Bomba i nikt nie zdążył jej rozbroić: wybuch zabrał dwóch sąsiadów. Miasto przegrało.',
      bhDuelSapper: 'Zostali Saper i Bomba — Saper ją rozbroił.',
      bhDuelCitizen: 'Bomba została sam na sam z mieszkańcem — nie ma kto jej rozbroić. Miasto przegrało.',
      bhNoSapper: 'Saper odpadł, a Bomba nie jest rozbrojona — nikt już jej nie rozbroi. Miasto przegrało.'
    },
    ui: {
      miniMenu: 'Mały stół', miniMenuD: '5–6 graczy · Saper i Bomba, Korupcja', miniTitle: 'Mały stół', miniSub: 'Scenariusze na 5–6 graczy',
      miniHint: 'Dla małej ekipy: każdy ma swoją rolę, partie są krótkie. Balans każdego składu sprawdzono symulacją.',
      miniPick: 'Ilu graczy', miniPlayers: '{n} graczy', miniCards: 'Karty: {list}', miniRules: 'Zasady', miniUse: 'Utwórz grę',
      miniSim: 'Według symulacji: {line} · {nights} nocy', simBomb: 'Bomba {v}%', okSimMini: ' Scenariusz „{name}”. Według symulacji: {line}.',
      tagRecruited: 'zwerbowany', voteRecruitBlocked: 'Zwerbowany nie może głosować przeciw swojemu Korupcjoniście.',
      tbRecruited: 'Zwerbował cię Korupcjonista — {seat} · {name}. Grasz dla mafii: nie głosuj przeciw niemu, nie strzelaj do niego i nie przyznawaj się.',
      tbRecruits: 'Twój zwerbowany: {seat} · {name}'
    },
    mini: {
      bomb_hunt: { name: 'Saper i Bomba', lore: 'Gdzieś przy stole tyka. Nocą Saper szuka Bomby, w dzień miasto decyduje, kogo wyrzucić — i boi się pomyłki.', rules: ['Bomba gra przeciw wszystkim, reszta to miasto.', 'W nocy budzi się tylko Saper i wskazuje gracza. Prowadzący odpowiada bez słów: 👍 — to Bomba, teraz rozbrojona; 👎 — nie.', 'Gracze odpadają tylko w dziennym głosowaniu.', 'Wyrzucona rozbrojona Bomba — miasto wygrywa. Wyrzucona nierozbrojona — wybucha i zabiera dwóch najbliższych sąsiadów: miasto przegrywa.', 'Zostali Saper i Bomba — wygrywa Saper. Bomba sam na sam z kimś innym — miasto przegrywa.', 'Saper odpadł, a Bomba nie jest jeszcze rozbrojona — miasto przegrywa.'] },
      corruption: { name: 'Korupcja', lore: 'W tym mieście się nie strzela — tu się kupuje. Korupcjonista werbuje po jednym i nikt nie wie, kto już wziął kopertę.', rules: ['Korupcjonista to mafia, ale nie strzela: w noc zapoznania werbuje gracza.', 'Zwerbowany zachowuje kartę, ale gra dla mafii: nie głosuje przeciw Korupcjoniście, nie strzela do niego i się nie przyznaje.', 'Gdy zwerbowany odpadnie, następnej nocy Korupcjonista kupuje nowego.', 'Maniak gra sam dla siebie; jeśli to jego zwerbowano — strzela dla mafii.', 'Przy 6 graczach jest też Ninja: co noc unika jednego strzału.', 'Mafia wygrywa, gdy jest jej więcej niż reszty; miasto — gdy nie ma już ani Korupcjonisty, ani jego ludzi.'] }
    }
  };
  R.hy = {
    roles: {
      ninja: { name: 'Նինձա', mono: 'Նն', kind: 'Պասիվ · գիշեր', short: 'Ամեն գիշեր խուսափում է մեկ կրակոցից։', rules: ['Գիշերվա ընթացքում Նինձային ուղղված առաջին կրակոցը վրիպում է՝ նա խուսափում է։ Նույն գիշերվա երկրորդ կրակոցը սպանում է։', 'Խուսափում է ամեն գիշեր՝ կարողությունը չի սպառվում։', 'Դահիճի հարվածն ու Հրձիգի կրակը կրակոցներ չեն՝ դրանցից խուսափել չի լինի։', 'Ցերեկը դուրս է գալիս քվեարկությամբ, ինչպես միշտ։', 'Գիշերը չի արթնանում։ Ստուգման դեպքում՝ կարմիր։'], lore: 'Կաստելմարի տանիքներին նրան ոչ ոք չի տեսել՝ միայն լսել են, թե ինչպես է գնդակը զնգում կղմինդրին այնտեղ, որտեղ նա կանգնած էր մի վայրկյան առաջ։', tip: 'Մի՛ շտապեք բացահայտվել. քանի դեռ մաֆիան չգիտի, թե ով է Նինձան, ձեզ ուղղված նրա կրակոցը կորչում է։' },
      corrupter: { name: 'Կաշառող', mono: 'Կշ', kind: 'Ակտիվ · գիշեր', short: 'Մաֆիա, որը չի կրակում՝ հավաքագրում է սեղանի շուրջ նստած խաղացողի։', rules: ['Խաղում է մաֆիայի կողմից, բայց չի կրակում։', 'Ծանոթության գիշերը արթնանում է և ցույց է տալիս խաղացողի՝ նա հավաքագրված է։ Վարողը դիպչում է նրան, նա բացում է աչքերը և տեսնում Կաշառողին։', 'Հավաքագրվածը պահում է իր քարտն ու կարողությունները, բայց խաղում է մաֆիայի կողմից՝ մինչև խաղի ավարտը կամ մինչև դուրս գալը։', 'Հավաքագրվածը չի կարող քվեարկել Կաշառողի դեմ, կրակել նրա վրա և խոստովանել, որ իրեն գնել են։', 'Նոր խաղացող Կաշառողը գնում է միայն այն ժամանակ, երբ հավաքագրվածը դուրս է եկել՝ արթնանում է հաջորդ գիշերը և նորից ընտրում։', 'Ստուգման դեպքում՝ սև. հավաքագրվածը՝ ըստ իր քարտի։'], lore: 'Նա երբեք զենք չի կրում։ Ներքին գրպանի ծրարն ավելի դիպուկ է կրակում։', tip: 'Գնե՛ք նրան, ով ամենաբարձր է պաշտպանում քաղաքը. նրա ձայնն ու նրա հանդեպ վստահությունն այժմ աշխատում են ձեզ համար։' }
    },
    hooks: { ninja: 'Նինձան խուսափում է կրակոցից', corrupter: 'Կաշառողը գնում է խաղացողներին' },
    abilities: { recruit: 'հավաքագրում' },
    e: {
      recruitScript0: 'Արթնանում է <b>Կաշառողը</b> և ցույց է տալիս, ում է հավաքագրում։ Կաշառողը բարձրացնում է ձեռքը. դիպեք հավաքագրվածին՝ նա բացում է աչքերը, տեսնում Կաշառողին, և երկուսն էլ քնում են։',
      recruitScript: 'Հավաքագրվածը դուրս է եկել։ Արթնանում է <b>Կաշառողը</b> և ցույց է տալիս նոր խաղացողի։ Կաշառողը բարձրացնում է ձեռքը. դիպեք հավաքագրվածին՝ նա բացում է աչքերը և տեսնում նրան։',
      recruitDone: '{target}-ը հավաքագրված է Կաշառողի ({actor}) կողմից. խաղում է մաֆիայի համար, չի քվեարկում նրա դեմ և չի կրակում նրա վրա։',
      whyRecruiter: 'սա նրա Կաշառողն է', whyMafiaAlready: 'արդեն խաղում է մաֆիայի համար',
      ninjaDodge: '{by}. կրակոց {target}-ի վրա — Նինձան խուսափում է։',
      bhFound: 'Ցույց տվեք Ականազերծողին 👍. {target}-ը Ռումբն է։ Այն վնասազերծված է, այժմ կարելի է վտարել։',
      bhNotFound: 'Ցույց տվեք Ականազերծողին 👎. {target}-ը Ռումբը չէ։',
      bhCityTitle: 'Քաղաքը հաղթեց', bhBombTitle: 'Ռումբը պայթեց',
      bhDefusedOut: 'Քաղաքը վտարեց վնասազերծված Ռումբը՝ {player}։',
      bhExploded: '{player}-ը Ռումբն է, և այն չհասցրին վնասազերծել. պայթյունը տարավ երկու հարևանին։ Քաղաքը պարտվեց։',
      bhDuelSapper: 'Մնացել են Ականազերծողն ու Ռումբը՝ Ականազերծողը վնասազերծեց այն։',
      bhDuelCitizen: 'Ռումբը մնաց մենակ խաղաղ բնակչի հետ՝ վնասազերծող չկա։ Քաղաքը պարտվեց։',
      bhNoSapper: 'Ականազերծողը դուրս է եկել, իսկ Ռումբը վնասազերծված չէ՝ այլևս վնասազերծող չկա։ Քաղաքը պարտվեց։'
    },
    ui: {
      miniMenu: 'Փոքր սեղան', miniMenuD: '5–6 խաղացող · Ականազերծողն ու Ռումբը, Կոռուպցիա', miniTitle: 'Փոքր սեղան', miniSub: 'Սցենարներ 5–6 խաղացողի համար',
      miniHint: 'Փոքր ընկերախմբի համար. յուրաքանչյուրն ունի իր դերը, խաղերը կարճ են։ Ամեն կազմի հավասարակշռությունը ստուգված է սիմուլյացիայով։',
      miniPick: 'Քանի՞ խաղացող', miniPlayers: '{n} խաղացող', miniCards: 'Քարտեր. {list}', miniRules: 'Կանոններ', miniUse: 'Ստեղծել խաղ',
      miniSim: 'Սիմուլյացիայով. {line} · {nights} գիշեր', simBomb: 'Ռումբ {v}%', okSimMini: ' Սցենար «{name}»։ Սիմուլյացիայով. {line}։',
      tagRecruited: 'հավաքագրված', voteRecruitBlocked: 'Հավաքագրվածը չի կարող քվեարկել իր Կաշառողի դեմ։',
      tbRecruited: 'Ձեզ հավաքագրել է Կաշառողը՝ {seat} · {name}։ Դուք խաղում եք մաֆիայի համար. մի՛ քվեարկեք նրա դեմ, մի՛ կրակեք նրա վրա և մի՛ խոստովանեք։',
      tbRecruits: 'Ձեր հավաքագրվածը՝ {seat} · {name}'
    },
    mini: {
      bomb_hunt: { name: 'Ականազերծողն ու Ռումբը', lore: 'Սեղանի շուրջ ինչ-որ տեղ տկտկում է։ Գիշերը Ականազերծողը փնտրում է Ռումբը, ցերեկը քաղաքը որոշում է, ում վտարել, և վախենում է սխալվել։', rules: ['Ռումբը խաղում է բոլորի դեմ, մնացածը՝ քաղաքն են։', 'Գիշերը արթնանում է միայն Ականազերծողը և ցույց է տալիս խաղացողի։ Վարողը լուռ պատասխանում է. 👍՝ սա Ռումբն է, այժմ վնասազերծված, 👎՝ ոչ։', 'Խաղացողները դուրս են գալիս միայն ցերեկային քվեարկությամբ։', 'Վտարեցին վնասազերծված Ռումբը՝ քաղաքը հաղթեց։ Վտարեցին չվնասազերծվածը՝ այն պայթում է և տանում երկու մոտակա հարևաններին. քաղաքը պարտվեց։', 'Մնացել են Ականազերծողն ու Ռումբը՝ Ականազերծողի հաղթանակ։ Ռումբը մենակ որևէ այլ խաղացողի հետ՝ քաղաքը պարտվեց։', 'Ականազերծողը դուրս է եկել, իսկ Ռումբը դեռ վնասազերծված չէ՝ քաղաքը պարտվեց։'] },
      corruption: { name: 'Կոռուպցիա', lore: 'Այս քաղաքում չեն կրակում՝ այստեղ գնում են։ Կաշառողը հավաքագրում է մեկ առ մեկ, և ոչ ոք չգիտի, թե ով է արդեն վերցրել ծրարը։', rules: ['Կաշառողը մաֆիա է, բայց չի կրակում. ծանոթության գիշերը նա հավաքագրում է խաղացողի։', 'Հավաքագրվածը պահում է իր քարտը, բայց խաղում է մաֆիայի համար. չի քվեարկում Կաշառողի դեմ, չի կրակում նրա վրա և չի խոստովանում։', 'Եթե հավաքագրվածը դուրս է եկել, հաջորդ գիշերը Կաշառողը նորին է գնում։', 'Մոլագարը խաղում է ինքն իր համար. եթե հավաքագրել են նրան՝ կրակում է մաֆիայի համար։', '6 խաղացողի դեպքում սեղանի շուրջ կա նաև Նինձա. ամեն գիշեր խուսափում է մեկ կրակոցից։', 'Մաֆիան հաղթում է, երբ այն մնացածներից շատ է. քաղաքը՝ երբ չեն մնացել ոչ Կաշառողը, ոչ նրա մարդիկ։'] }
    }
  };
  Object.keys(R).forEach(code => {
    const p = I18N[code], d = R[code];
    Object.assign(p.roles, d.roles); Object.assign(p.hooks, d.hooks); Object.assign(p.abilities, d.abilities);
    Object.assign(p.e, d.e); Object.assign(p.ui, d.ui); p.mini = d.mini;
  });
})();
