/* ============================================================
   v53 card fixes:
   — Morpheus acts like Azazel (voted out, or killed at night → at the day's results) and takes only an active skill
     (from the mafia — the shot of whoever shoots by seniority);
   — the Corrupter buys any card; in the Corruption scenario the city wins as soon as the Corrupter is out;
   — Sapper and Bomb: only the Sapper, Citizens and 1–3 Bombs; the Bombs play for the mafia and do not know each other.
   ============================================================ */
(function () {
  const R = {};
  R.ru = {
    morpheus: {
      short: 'Уходит не с пустыми руками: если его выгнали голосованием или убили ночью, забирает у игрока активный навык до конца игры.',
      rules: ['Если Морфея выгоняют голосованием, он сразу выбирает игрока — тот теряет активный навык до конца игры.', 'Если Морфея убили ночью, на итогах следующего дня он может выбрать игрока или отказаться.', 'Работает только на активные навыки — ночные и дневные. У пассивной карты забрать нечего: выбор пропадает.', 'Из мафии навык есть у того, кто сейчас стреляет по старшинству: у него Морфей забирает выстрел, и семья не стреляет, пока он за столом.', 'Ночью не просыпается.'],
      tip: 'Выгнали или убили — заберите навык у самого опасного подозреваемого. Из мафии цельтесь в того, кто сейчас стреляет.'
    },
    corrBuy: 'Купить можно любого игрока с любой картой. В игре на две семьи купленный переходит в семью Коррупционера.',
    corrScen: 'В сценарии «Коррупция» город побеждает, как только Коррупционера выгнали или убили.',
    corruption: { buy: 'Купить можно любого игрока, с любой картой.', city: 'Город побеждает, только когда выгнал или убил Коррупционера, — сразу, даже если завербованный ещё за столом.', mafia: 'Мафия побеждает, когда её больше, чем остальных.' },
    bombHunt: ['Сапёр, мирные жители и от 1 до 3 Бомб (на 5 игроков — до 2). Бомбы играют за мафию, но друг друга не знают.', 'Ночью просыпается только Сапёр и показывает игрока. Ведущий молча отвечает: 👍 — это Бомба, она обезврежена; 👎 — нет.', 'Игроки выбывают только дневным голосованием.', 'Выгнали обезвреженную Бомбу — она просто выбывает. Выгнали необезвреженную — она взрывается и забирает двух ближайших соседей: мафия победила.', 'Город побеждает, когда все Бомбы выбыли обезвреженными.', 'Мафия побеждает, когда Бомб за столом больше, чем остальных, или когда Сапёр выбыл, а за столом есть необезвреженная Бомба.', 'Остались двое: Сапёр с Бомбой — победа города; Бомба с другим игроком — победа мафии.'],
    bombCard: {
      short: 'Играет за мафию: если её выгонят необезвреженной, она взорвётся — и мафия победит.',
      rules: ['В этой игре Бомба играет за мафию. Если Бомб несколько, друг друга они не знают.', 'Ночью не просыпается. Сапёр ищет Бомбы: на кого он показал, та обезврежена, но сама об этом не узнаёт.', 'Выгнали необезвреженную Бомбу — она взрывается и забирает двух ближайших соседей: мафия побеждает сразу.', 'Мафия побеждает и тогда, когда Бомб за столом больше, чем остальных, или когда Сапёр выбыл, а необезвреженная Бомба ещё за столом.', 'Город побеждает, когда все Бомбы выбыли обезвреженными.'],
      tip: 'Попробуйте назваться Сапёром: если город поверит вам, а не ему, настоящий Сапёр уйдёт первым.'
    },
    e: {
      logMorpheusShot: 'Морфей {actor} забрал выстрел у {target} ({role}): семья не стреляет, пока он за столом.',
      logMorpheusNone: 'Морфей {actor} выбрал {target} ({role}), но активного навыка у него нет — ничего не изменилось.',
      logMorpheusSkip: '{player} (Морфей) ничего не забрал',
      bhAllDefused: 'Все Бомбы выбыли обезвреженными — город победил.',
      bhMajority: 'Бомб за столом больше, чем остальных, — мафия победила.',
      bhExploded: '{player} — Бомба, и её не успели обезвредить: взрыв забрал двух соседей. Мафия победила.',
      bhDuelCitizen: 'Остались двое: Бомба и не Сапёр — мафия победила.',
      bhNoSapper: 'Сапёр выбыл, а за столом необезвреженная Бомба — обезвредить её больше некому. Мафия победила.',
      corrOut: 'Коррупционер {player} выбыл — город победил.',
      corrOutRecruit: 'Коррупционер {player} выбыл, пока его завербованный {recruit} был за столом, — автоматическая победа города.'
    },
    ui: {
      trigMorpheusNight: 'убит этой ночью — на итогах дня может забрать у игрока активный навык или отказаться',
      morpheusNightHint: 'Морфей №{seat} убит ночью — на итогах дня он может забрать у игрока активный навык',
      tbMorpheusNight: 'Вас убили ночью. Как Морфей вы можете забрать у игрока активный навык — или отказаться.',
      morphTook: 'Морфей забрал навык у {player}.', morphShot: 'Морфей забрал выстрел у {player}: семья не стреляет, пока он за столом.', morphNone: 'У {player} нет активного навыка — Морфей ничего не забрал.',
      bhBombs: 'Сколько Бомб', bhBombsL: ['1 Бомба', '2 Бомбы', '3 Бомбы'], bhBombsHint: 'Состав фиксированный; Бомб можно поставить от 1 до {max} — вместо мирных жителей.'
    }
  };
  R.uk = {
    morpheus: {
      short: 'Іде не з порожніми руками: якщо його вигнали голосуванням або вбили вночі, забирає в гравця активну навичку до кінця гри.',
      rules: ['Якщо Морфея виганяють голосуванням, він одразу обирає гравця — той втрачає активну навичку до кінця гри.', 'Якщо Морфея вбили вночі, на підсумках наступного дня він може обрати гравця або відмовитися.', 'Діє лише на активні навички — нічні й денні. У пасивної карти забрати нічого: вибір пропадає.', 'У мафії навичка є в того, хто зараз стріляє за старшинством: у нього Морфей забирає постріл, і сім\'я не стріляє, поки він за столом.', 'Уночі не прокидається.'],
      tip: 'Вигнали чи вбили — заберіть навичку в найнебезпечнішого підозрюваного. З мафії цільтеся в того, хто зараз стріляє.'
    },
    corrBuy: 'Купити можна будь-якого гравця з будь-якою картою. У грі на дві сім\'ї куплений переходить у сім\'ю Корупціонера.',
    corrScen: 'У сценарії «Корупція» місто перемагає, щойно Корупціонера вигнали або вбили.',
    corruption: { buy: 'Купити можна будь-якого гравця, з будь-якою картою.', city: 'Місто перемагає, лише коли вигнало або вбило Корупціонера, — одразу, навіть якщо завербований ще за столом.', mafia: 'Мафія перемагає, коли її більше, ніж решти.' },
    bombHunt: ['Сапер, мирні жителі та від 1 до 3 Бомб (на 5 гравців — до 2). Бомби грають за мафію, але одна одну не знають.', 'Уночі прокидається тільки Сапер і показує гравця. Ведучий мовчки відповідає: 👍 — це Бомба, її знешкоджено; 👎 — ні.', 'Гравці вибувають тільки денним голосуванням.', 'Вигнали знешкоджену Бомбу — вона просто вибуває. Вигнали незнешкоджену — вона вибухає й забирає двох найближчих сусідів: мафія перемогла.', 'Місто перемагає, коли всі Бомби вибули знешкодженими.', 'Мафія перемагає, коли Бомб за столом більше, ніж решти, або коли Сапер вибув, а за столом є незнешкоджена Бомба.', 'Лишилися двоє: Сапер із Бомбою — перемога міста; Бомба з іншим гравцем — перемога мафії.'],
    bombCard: {
      short: 'Грає за мафію: якщо її виженуть незнешкодженою, вона вибухне — і мафія переможе.',
      rules: ['У цій грі Бомба грає за мафію. Якщо Бомб кілька, одна одну вони не знають.', 'Уночі не прокидається. Сапер шукає Бомби: на кого він показав, ту знешкоджено, але сама вона про це не дізнається.', 'Вигнали незнешкоджену Бомбу — вона вибухає й забирає двох найближчих сусідів: мафія перемагає одразу.', 'Мафія перемагає й тоді, коли Бомб за столом більше, ніж решти, або коли Сапер вибув, а незнешкоджена Бомба ще за столом.', 'Місто перемагає, коли всі Бомби вибули знешкодженими.'],
      tip: 'Спробуйте назватися Сапером: якщо місто повірить вам, а не йому, справжній Сапер піде першим.'
    },
    e: {
      logMorpheusShot: 'Морфей {actor} забрав постріл у {target} ({role}): сім\'я не стріляє, поки він за столом.',
      logMorpheusNone: 'Морфей {actor} обрав {target} ({role}), але активної навички в нього немає — нічого не змінилося.',
      logMorpheusSkip: '{player} (Морфей) нічого не забрав',
      bhAllDefused: 'Усі Бомби вибули знешкодженими — місто перемогло.',
      bhMajority: 'Бомб за столом більше, ніж решти, — мафія перемогла.',
      bhExploded: '{player} — Бомба, і її не встигли знешкодити: вибух забрав двох сусідів. Мафія перемогла.',
      bhDuelCitizen: 'Лишилися двоє: Бомба й не Сапер — мафія перемогла.',
      bhNoSapper: 'Сапер вибув, а за столом незнешкоджена Бомба — знешкодити її більше нікому. Мафія перемогла.',
      corrOut: 'Корупціонер {player} вибув — місто перемогло.',
      corrOutRecruit: 'Корупціонер {player} вибув, поки його завербований {recruit} був за столом, — автоматична перемога міста.'
    },
    ui: {
      trigMorpheusNight: 'убитий цієї ночі — на підсумках дня може забрати в гравця активну навичку або відмовитися',
      morpheusNightHint: 'Морфея №{seat} убили вночі — на підсумках дня він може забрати в гравця активну навичку',
      tbMorpheusNight: 'Вас убили вночі. Як Морфей ви можете забрати в гравця активну навичку — або відмовитися.',
      morphTook: 'Морфей забрав навичку в {player}.', morphShot: 'Морфей забрав постріл у {player}: сім\'я не стріляє, поки він за столом.', morphNone: 'У {player} немає активної навички — Морфей нічого не забрав.',
      bhBombs: 'Скільки Бомб', bhBombsL: ['1 Бомба', '2 Бомби', '3 Бомби'], bhBombsHint: 'Склад фіксований; Бомб можна поставити від 1 до {max} — замість мирних жителів.'
    }
  };
  R.en = {
    morpheus: {
      short: 'Does not leave empty-handed: voted out or killed at night, he takes a player\'s active ability for the rest of the game.',
      rules: ['If Morpheus is voted out, he picks a player at once, who loses his active ability for the rest of the game.', 'If Morpheus is killed at night, at the next day\'s results he may pick a player or let it go.', 'Works only on active abilities, by night or by day. A passive card has nothing to take: the pick is wasted.', 'In the mafia only whoever shoots by seniority right now has an ability: Morpheus takes his shot, and the family cannot shoot while he sits at the table.', 'Does not wake at night.'],
      tip: 'Voted out or killed, take the ability of the most dangerous suspect. Among the mafia, aim at whoever shoots right now.'
    },
    corrBuy: 'He may buy any player with any card. In a two-family game the bought player joins the Corrupter\'s family.',
    corrScen: 'In the Corruption scenario the town wins as soon as the Corrupter is voted out or killed.',
    corruption: { buy: 'Any player with any card can be bought.', city: 'The town wins only by voting out or killing the Corrupter — at once, even if the recruit is still at the table.', mafia: 'The mafia wins when it outnumbers everyone else.' },
    bombHunt: ['The Sapper, Citizens and 1 to 3 Bombs (up to 2 at 5 players). The Bombs play for the mafia but do not know each other.', 'At night only the Sapper wakes and points at a player. The host answers silently: 👍 — it is a Bomb, now defused; 👎 — it is not.', 'Players leave only by the day vote.', 'A defused Bomb voted out simply leaves. An undefused one explodes and takes its two nearest neighbours: the mafia wins.', 'The town wins when every Bomb has left defused.', 'The mafia wins when the Bombs outnumber everyone else, or when the Sapper is gone while an undefused Bomb is at the table.', 'Two left: the Sapper with a Bomb — the town wins; a Bomb with anyone else — the mafia wins.'],
    bombCard: {
      short: 'Plays for the mafia: voted out undefused, it explodes — and the mafia wins.',
      rules: ['In this game the Bomb plays for the mafia. With several Bombs, they do not know each other.', 'Does not wake at night. The Sapper hunts for Bombs: the one he points at is defused, but it is never told.', 'An undefused Bomb voted out explodes and takes its two nearest neighbours: the mafia wins at once.', 'The mafia also wins when the Bombs outnumber everyone else, or when the Sapper is gone while an undefused Bomb is still at the table.', 'The town wins when every Bomb has left defused.'],
      tip: 'Try claiming to be the Sapper: if the town believes you rather than him, the real Sapper leaves first.'
    },
    e: {
      logMorpheusShot: 'Morpheus {actor} took the shot of {target} ({role}): the family cannot shoot while he sits at the table.',
      logMorpheusNone: 'Morpheus {actor} picked {target} ({role}), who has no active ability — nothing changed.',
      logMorpheusSkip: '{player} (Morpheus) took nothing',
      bhAllDefused: 'Every Bomb has left defused — the town wins.',
      bhMajority: 'The Bombs outnumber everyone else at the table — the mafia wins.',
      bhExploded: '{player} is a Bomb nobody defused in time: the blast took two neighbours. The mafia wins.',
      bhDuelCitizen: 'Two are left: a Bomb and someone who is not the Sapper — the mafia wins.',
      bhNoSapper: 'The Sapper is gone and an undefused Bomb is still at the table — nobody can defuse it. The mafia wins.',
      corrOut: 'The Corrupter {player} is out — the town wins.',
      corrOutRecruit: 'The Corrupter {player} is out while his recruit {recruit} is still at the table — an automatic win for the town.'
    },
    ui: {
      trigMorpheusNight: 'was killed last night — at the day\'s results may take a player\'s active ability, or let it go',
      morpheusNightHint: 'Morpheus (seat {seat}) was killed at night — at the day\'s results he may take a player\'s active ability',
      tbMorpheusNight: 'You were killed at night. As Morpheus you may take a player\'s active ability — or let it go.',
      morphTook: 'Morpheus took the ability of {player}.', morphShot: 'Morpheus took the shot of {player}: the family cannot shoot while he sits at the table.', morphNone: '{player} has no active ability — Morpheus took nothing.',
      bhBombs: 'How many Bombs', bhBombsL: ['1 Bomb', '2 Bombs', '3 Bombs'], bhBombsHint: 'The line-up is fixed; you can put 1 to {max} Bombs in place of Citizens.'
    }
  };
  R.pl = {
    morpheus: {
      short: 'Nie odchodzi z pustymi rękami: wyrzucony w głosowaniu albo zabity w nocy zabiera graczowi aktywną zdolność do końca gry.',
      rules: ['Jeśli Morfeusz zostaje wyrzucony w głosowaniu, od razu wybiera gracza — ten traci aktywną zdolność do końca gry.', 'Jeśli Morfeusz zginął w nocy, przy podsumowaniu następnego dnia może wybrać gracza albo zrezygnować.', 'Działa tylko na aktywne zdolności — nocne i dzienne. Karta pasywna nie ma czego stracić: wybór przepada.', 'W mafii zdolność ma tylko ten, kto teraz strzela według starszeństwa: Morfeusz zabiera mu strzał, a rodzina nie strzela, póki on siedzi przy stole.', 'W nocy się nie budzi.'],
      tip: 'Wyrzucony albo zabity — zabierz zdolność najgroźniejszemu podejrzanemu. W mafii celuj w tego, kto teraz strzela.'
    },
    corrBuy: 'Kupić można dowolnego gracza z dowolną kartą. W grze na dwie rodziny kupiony przechodzi do rodziny Korupcjonisty.',
    corrScen: 'W scenariuszu „Korupcja” miasto wygrywa, gdy tylko Korupcjonista zostanie wyrzucony albo zabity.',
    corruption: { buy: 'Kupić można dowolnego gracza, z dowolną kartą.', city: 'Miasto wygrywa tylko wtedy, gdy wyrzuci albo zabije Korupcjonistę — od razu, nawet jeśli zwerbowany wciąż siedzi przy stole.', mafia: 'Mafia wygrywa, gdy jest jej więcej niż pozostałych.' },
    bombHunt: ['Saper, mieszkańcy i od 1 do 3 Bomb (przy 5 graczach — do 2). Bomby grają dla mafii, ale się nie znają.', 'W nocy budzi się tylko Saper i wskazuje gracza. Prowadzący odpowiada bez słów: 👍 — to Bomba, rozbrojona; 👎 — nie.', 'Gracze odpadają tylko w dziennym głosowaniu.', 'Wyrzucona rozbrojona Bomba po prostu odpada. Nierozbrojona wybucha i zabiera dwóch najbliższych sąsiadów: mafia wygrywa.', 'Miasto wygrywa, gdy wszystkie Bomby odpadły rozbrojone.', 'Mafia wygrywa, gdy Bomb przy stole jest więcej niż pozostałych albo gdy Saper odpadł, a przy stole jest nierozbrojona Bomba.', 'Zostało dwoje: Saper z Bombą — wygrywa miasto; Bomba z innym graczem — wygrywa mafia.'],
    bombCard: {
      short: 'Gra dla mafii: wyrzucona nierozbrojona wybucha — i mafia wygrywa.',
      rules: ['W tej grze Bomba gra dla mafii. Jeśli Bomb jest kilka, nie znają się nawzajem.', 'W nocy się nie budzi. Saper szuka Bomb: ta, którą wskaże, jest rozbrojona, ale sama się o tym nie dowiaduje.', 'Wyrzucona nierozbrojona Bomba wybucha i zabiera dwóch najbliższych sąsiadów: mafia wygrywa od razu.', 'Mafia wygrywa też wtedy, gdy Bomb przy stole jest więcej niż pozostałych albo gdy Saper odpadł, a nierozbrojona Bomba wciąż siedzi przy stole.', 'Miasto wygrywa, gdy wszystkie Bomby odpadły rozbrojone.'],
      tip: 'Spróbuj podać się za Sapera: jeśli miasto uwierzy tobie, a nie jemu, prawdziwy Saper odpadnie pierwszy.'
    },
    e: {
      logMorpheusShot: 'Morfeusz {actor} zabrał strzał graczowi {target} ({role}): rodzina nie strzela, póki on siedzi przy stole.',
      logMorpheusNone: 'Morfeusz {actor} wybrał {target} ({role}), ale ten nie ma aktywnej zdolności — nic się nie zmieniło.',
      logMorpheusSkip: '{player} (Morfeusz) nic nie zabrał',
      bhAllDefused: 'Wszystkie Bomby odpadły rozbrojone — miasto wygrało.',
      bhMajority: 'Bomb przy stole jest więcej niż pozostałych — mafia wygrała.',
      bhExploded: '{player} to Bomba, której nie zdążono rozbroić: wybuch zabrał dwóch sąsiadów. Mafia wygrała.',
      bhDuelCitizen: 'Zostało dwoje: Bomba i ktoś, kto nie jest Saperem — mafia wygrała.',
      bhNoSapper: 'Saper odpadł, a przy stole jest nierozbrojona Bomba — nie ma jej kto rozbroić. Mafia wygrała.',
      corrOut: 'Korupcjonista {player} odpadł — miasto wygrało.',
      corrOutRecruit: 'Korupcjonista {player} odpadł, gdy jego zwerbowany {recruit} był jeszcze przy stole — automatyczne zwycięstwo miasta.'
    },
    ui: {
      trigMorpheusNight: 'zginął tej nocy — przy podsumowaniu dnia może zabrać graczowi aktywną zdolność albo zrezygnować',
      morpheusNightHint: 'Morfeusz (nr {seat}) zginął w nocy — przy podsumowaniu dnia może zabrać graczowi aktywną zdolność',
      tbMorpheusNight: 'Zginąłeś w nocy. Jako Morfeusz możesz zabrać graczowi aktywną zdolność — albo zrezygnować.',
      morphTook: 'Morfeusz zabrał zdolność graczowi {player}.', morphShot: 'Morfeusz zabrał strzał graczowi {player}: rodzina nie strzela, póki on siedzi przy stole.', morphNone: '{player} nie ma aktywnej zdolności — Morfeusz nic nie zabrał.',
      bhBombs: 'Ile Bomb', bhBombsL: ['1 Bomba', '2 Bomby', '3 Bomby'], bhBombsHint: 'Skład jest stały; Bomb można dać od 1 do {max} — zamiast mieszkańców.'
    }
  };
  R.hy = {
    morpheus: {
      short: 'Դատարկ ձեռքերով չի հեռանում. եթե նրան վռնդել են քվեարկությամբ կամ սպանել գիշերը, խաղացողից վերցնում է ակտիվ ունակությունը մինչև խաղի վերջ։',
      rules: ['Եթե Մորփեոսին վռնդում են քվեարկությամբ, նա անմիջապես ընտրում է խաղացողի. նա կորցնում է ակտիվ ունակությունը մինչև խաղի վերջ։', 'Եթե Մորփեոսին սպանել են գիշերը, հաջորդ օրվա արդյունքներում նա կարող է ընտրել խաղացողի կամ հրաժարվել։', 'Գործում է միայն ակտիվ ունակությունների վրա՝ գիշերային և ցերեկային։ Պասիվ քարտից վերցնելու բան չկա. ընտրությունը կորչում է։', 'Մաֆիայում ունակություն ունի միայն նա, ով հիմա կրակում է ավագությամբ. Մորփեոսը վերցնում է նրա կրակոցը, և ընտանիքը չի կրակում, քանի դեռ նա սեղանի շուրջ է։', 'Գիշերը չի արթնանում։'],
      tip: 'Վռնդեցին թե սպանեցին՝ վերցրե՛ք ունակությունն ամենավտանգավոր կասկածյալից։ Մաֆիայում թիրախավորե՛ք նրան, ով հիմա կրակում է։'
    },
    corrBuy: 'Կարելի է գնել ցանկացած խաղացողի՝ ցանկացած քարտով։ Երկու ընտանիքով խաղում գնվածն անցնում է Կաշառողի ընտանիք։',
    corrScen: '«Կոռուպցիա» սցենարում քաղաքը հաղթում է, հենց որ Կաշառողին վռնդում կամ սպանում են։',
    corruption: { buy: 'Կարելի է գնել ցանկացած խաղացողի՝ ցանկացած քարտով։', city: 'Քաղաքը հաղթում է միայն այն ժամանակ, երբ վռնդում կամ սպանում է Կաշառողին՝ անմիջապես, նույնիսկ եթե հավաքագրվածը դեռ սեղանի շուրջ է։', mafia: 'Մաֆիան հաղթում է, երբ նրանք ավելի շատ են, քան մնացածը։' },
    bombHunt: ['Ականազերծող, խաղաղ բնակիչներ և 1-ից 3 Ռումբ (5 խաղացողի դեպքում՝ մինչև 2)։ Ռումբերը խաղում են մաֆիայի համար, բայց միմյանց չեն ճանաչում։', 'Գիշերը արթնանում է միայն Ականազերծողը և ցույց է տալիս խաղացողի։ Վարողը լուռ պատասխանում է. 👍՝ սա Ռումբ է, այն վնասազերծված է, 👎՝ ոչ։', 'Խաղացողները դուրս են գալիս միայն ցերեկային քվեարկությամբ։', 'Վնասազերծված Ռումբը վտարելիս այն պարզապես դուրս է գալիս։ Չվնասազերծվածը պայթում է և տանում երկու մոտակա հարևաններին. մաֆիան հաղթեց։', 'Քաղաքը հաղթում է, երբ բոլոր Ռումբերը դուրս են եկել վնասազերծված։', 'Մաֆիան հաղթում է, երբ Ռումբերը սեղանի շուրջ ավելի շատ են, քան մնացածը, կամ երբ Ականազերծողը դուրս է եկել, իսկ սեղանի շուրջ կա չվնասազերծված Ռումբ։', 'Մնացել են երկուսը. Ականազերծողը Ռումբի հետ՝ քաղաքի հաղթանակ, Ռումբն այլ խաղացողի հետ՝ մաֆիայի հաղթանակ։'],
    bombCard: {
      short: 'Խաղում է մաֆիայի համար. եթե այն վտարեն չվնասազերծված, կպայթի, և մաֆիան կհաղթի։',
      rules: ['Այս խաղում Ռումբը խաղում է մաֆիայի համար։ Եթե Ռումբերը մի քանիսն են, նրանք միմյանց չեն ճանաչում։', 'Գիշերը չի արթնանում։ Ականազերծողը փնտրում է Ռումբերը. ում նա ցույց տա, այն վնասազերծված է, բայց ինքը դա չի իմանում։', 'Չվնասազերծված Ռումբը վտարելիս այն պայթում է և տանում երկու մոտակա հարևաններին. մաֆիան անմիջապես հաղթում է։', 'Մաֆիան հաղթում է նաև, երբ Ռումբերը սեղանի շուրջ ավելի շատ են, քան մնացածը, կամ երբ Ականազերծողը դուրս է եկել, իսկ չվնասազերծված Ռումբը դեռ սեղանի շուրջ է։', 'Քաղաքը հաղթում է, երբ բոլոր Ռումբերը դուրս են եկել վնասազերծված։'],
      tip: 'Փորձե՛ք ձեզ Ականազերծող հռչակել. եթե քաղաքը հավատա ձեզ, ոչ թե նրան, իսկական Ականազերծողը դուրս կգա առաջինը։'
    },
    e: {
      logMorpheusShot: 'Մորփեոս {actor}-ը վերցրեց {target}-ի ({role}) կրակոցը. ընտանիքը չի կրակում, քանի դեռ նա սեղանի շուրջ է։',
      logMorpheusNone: 'Մորփեոս {actor}-ը ընտրեց {target}-ին ({role}), բայց նա ակտիվ ունակություն չունի. ոչինչ չփոխվեց։',
      logMorpheusSkip: '{player}-ը (Մորփեոս) ոչինչ չվերցրեց',
      bhAllDefused: 'Բոլոր Ռումբերը դուրս են եկել վնասազերծված. քաղաքը հաղթեց։',
      bhMajority: 'Ռումբերը սեղանի շուրջ ավելի շատ են, քան մնացածը. մաֆիան հաղթեց։',
      bhExploded: '{player}-ը Ռումբ է, որին չհասցրին վնասազերծել. պայթյունը տարավ երկու հարևանի։ Մաֆիան հաղթեց։',
      bhDuelCitizen: 'Մնացել են երկուսը՝ Ռումբն ու մեկը, ով Ականազերծող չէ. մաֆիան հաղթեց։',
      bhNoSapper: 'Ականազերծողը դուրս է եկել, իսկ սեղանի շուրջ չվնասազերծված Ռումբ կա. այն վնասազերծող չկա։ Մաֆիան հաղթեց։',
      corrOut: 'Կաշառող {player}-ը դուրս եկավ. քաղաքը հաղթեց։',
      corrOutRecruit: 'Կաշառող {player}-ը դուրս եկավ, երբ նրա հավաքագրված {recruit}-ը դեռ սեղանի շուրջ էր. քաղաքի ավտոմատ հաղթանակ։'
    },
    ui: {
      trigMorpheusNight: 'սպանվել է այս գիշեր — օրվա արդյունքներում կարող է խաղացողից վերցնել ակտիվ ունակությունը կամ հրաժարվել',
      morpheusNightHint: 'Մորփեոսը (տեղ {seat}) սպանվել է գիշերը — օրվա արդյունքներում նա կարող է խաղացողից վերցնել ակտիվ ունակությունը',
      tbMorpheusNight: 'Ձեզ սպանել են գիշերը։ Որպես Մորփեոս՝ կարող եք խաղացողից վերցնել ակտիվ ունակությունը կամ հրաժարվել։',
      morphTook: 'Մորփեոսը վերցրեց {player}-ի ունակությունը։', morphShot: 'Մորփեոսը վերցրեց {player}-ի կրակոցը. ընտանիքը չի կրակում, քանի դեռ նա սեղանի շուրջ է։', morphNone: '{player}-ը ակտիվ ունակություն չունի. Մորփեոսը ոչինչ չվերցրեց։',
      bhBombs: 'Քանի՞ Ռումբ', bhBombsL: ['1 Ռումբ', '2 Ռումբ', '3 Ռումբ'], bhBombsHint: 'Կազմը ֆիքսված է. Ռումբերը կարելի է դնել 1-ից {max}՝ խաղաղ բնակիչների փոխարեն։'
    }
  };
  Object.keys(R).forEach(code => {
    const p = I18N[code], d = R[code]; if (!p) return;
    Object.assign(p.roles.morpheus, d.morpheus);
    // the Corrupter's card: "any card" after the recruiting rule, the Corruption win before the checks rule
    const cr = p.roles.corrupter; if (cr && Array.isArray(cr.rules) && !cr.rules.includes(d.corrBuy)) { const r = cr.rules.slice(); r.splice(2, 0, d.corrBuy); r.splice(r.length - 1, 0, d.corrScen); cr.rules = r; }
    const cs = p.mini && p.mini.corruption; if (cs && !cs.rules.includes(d.corruption.city)) cs.rules = [cs.rules[0], d.corruption.buy].concat(cs.rules.slice(1, -1), [d.corruption.city, d.corruption.mafia]);
    if (p.mini && p.mini.bomb_hunt) { p.mini.bomb_hunt.rules = d.bombHunt; p.mini.bomb_hunt.bombCard = d.bombCard; }
    Object.assign(p.e, d.e); Object.assign(p.ui, d.ui);
  });
})();
